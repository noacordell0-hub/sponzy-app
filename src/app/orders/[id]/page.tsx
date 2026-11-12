import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { money } from "@/lib/format";
import { autoApproveDue, type Order } from "@/lib/orders";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/order-status";
import OrderActions from "./OrderActions";
import { REVIEW_WINDOW_DAYS } from "@/lib/trust";

export const metadata: Metadata = { title: "Order · Clouta" };

const STEPS = [
  { key: "funded", label: "Paid" },
  { key: "in_progress", label: "In progress" },
  { key: "proof_submitted", label: "Proof submitted" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid out" },
];
const RANK: Record<string, number> = { awaiting_payment: -1, funded: 0, in_progress: 1, revision_requested: 1, proof_submitted: 2, approved: 3, paid: 4 };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; checkout?: string; reviewed?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, profile } = await requireProfile();

  // If the review window has passed, approve now rather than waiting for the daily job.
  const admin = getSupabaseAdmin();
  if (admin) await autoApproveDue(admin, Number(id)).catch(() => 0);

  const { data: order } = await supabase.from("orders").select("*").eq("id", Number(id)).maybeSingle<Order>();
  if (!order) notFound();
  const isBrand = user.id === order.brand_id;
  const otherId = isBrand ? order.creator_id : order.brand_id;
  const [{ data: other }, { data: events }] = await Promise.all([
    otherId ? supabase.from("profiles").select("display_name, handle, role, avatar_source, avatar_pattern, avatar_url").eq("id", otherId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("order_events").select("kind, note, created_at").eq("order_id", order.id).order("created_at"),
  ]);
  const rank = RANK[order.status] ?? -1;

  // Review prompt (double-blind): what I've written, and whether the other side has reviewed (not what they wrote).
  let reviewState: null | { mine: boolean; theirs: boolean; revealed: boolean; open: boolean; closes: Date } = null;
  if (["approved", "paid"].includes(order.status) && order.approved_at && admin) {
    const { data: rs } = await admin.from("reviews").select("author_id, revealed_at").eq("order_id", order.id);
    const closes = new Date(new Date(order.approved_at).getTime() + REVIEW_WINDOW_DAYS * 864e5);
    const mine = (rs ?? []).find((r) => r.author_id === user.id);
    reviewState = {
      mine: Boolean(mine),
      theirs: (rs ?? []).some((r) => r.author_id !== user.id),
      revealed: Boolean(mine?.revealed_at),
      open: Date.now() < closes.getTime(),
      closes,
    };
  }
  const closed = ["cancelled", "refunded", "disputed"].includes(order.status);
  const payout = order.price_cents - order.creator_fee_cents;
  const fmtDate = (d: string) => new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppShell profile={profile} active="orders">
      {sp.paid && order.status === "awaiting_payment" && (
        <p role="status" className="mb-5 rounded-2xl bg-[#F3F0FF] px-5 py-4 text-sm font-semibold text-violet-deep">
          Payment received by Stripe. Confirming… refresh in a few seconds if this doesn&apos;t update.
        </p>
      )}
      {sp.paid && order.status !== "awaiting_payment" && !closed && (
        <p role="status" className="mb-5 rounded-2xl bg-ok-bg px-5 py-4 text-sm font-semibold text-ok">
          Paid! Your money is held by Clouta until you approve the work.
        </p>
      )}
      {sp.reviewed && (
        <p role="status" className="mb-5 rounded-2xl bg-ok-bg px-5 py-4 text-sm font-semibold text-ok">
          {sp.reviewed === "revealed" ? "Thanks! Both reviews are now public." : "Thanks! Your review is saved and stays hidden until the other side leaves theirs."}
        </p>
      )}
      {sp.checkout === "cancelled" && order.status === "awaiting_payment" && (
        <p className="mb-5 rounded-2xl bg-[#FFF4D6] px-5 py-4 text-sm font-semibold text-[#7A5200]">Checkout was cancelled. You haven&apos;t been charged.</p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/orders" className="on-bg-muted text-sm font-semibold text-body">
          ← Orders
        </Link>
        <h1 className="on-bg flex-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
          {order.title} <span className="text-ink-2">#{order.id}</span>
        </h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
      </div>

      {!closed && rank >= 0 && (
        <ol className="panel mb-6 grid grid-cols-5 gap-1 p-4" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex flex-col items-center gap-1.5 text-center" aria-current={i === rank ? "step" : undefined}>
              <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${i <= rank ? "bg-violet-deep text-white" : "bg-black/[.06] text-ink-2"}`}>{i < rank ? "✓" : i + 1}</span>
              <span className={`text-[11px] font-semibold sm:text-xs ${i <= rank ? "text-ink" : "text-ink-2"}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <OrderActions order={order} isBrand={isBrand} otherName={other?.display_name ?? "the other side"} />

          {reviewState && (reviewState.open || reviewState.mine) && (
            <section className="panel flex flex-col gap-3 border-[#F2D58A] p-6 sm:flex-row sm:items-center" aria-labelledby="rev-t">
              <div className="flex-1">
                <h2 id="rev-t" className="text-lg font-bold">
                  {!reviewState.mine ? `How was working with ${other?.display_name ?? "them"}?` : reviewState.revealed ? "Reviews are public" : "Your review is in"}
                </h2>
                <p className="mt-1 text-sm text-body">
                  {!reviewState.mine
                    ? reviewState.theirs
                      ? `${other?.display_name ?? "They"} already left a review. Leave yours and both go public.`
                      : `Reviews are double-blind: neither of you sees the other's until both are in. Open until ${fmtDate(reviewState.closes.toISOString())}.`
                    : reviewState.revealed
                      ? "Both reviews are visible on your profiles."
                      : `It stays hidden until ${other?.display_name ?? "they"} reviews you, or until ${fmtDate(reviewState.closes.toISOString())}.`}
                </p>
              </div>
              {!reviewState.mine ? (
                <Link href={`/orders/${order.id}/review`} className="btn min-h-11 px-5 text-sm">
                  ⭐ Leave a review
                </Link>
              ) : reviewState.revealed && other ? (
                <Link href={other.role === "brand" ? `/b/${other.handle}/reviews` : `/c/${other.handle}/reviews`} className="btn btn-ghost min-h-11 px-5 text-sm">
                  See reviews
                </Link>
              ) : null}
            </section>
          )}

          {order.proof_links.length > 0 && (
            <section className="panel p-6" aria-labelledby="proof-t">
              <h2 id="proof-t" className="eyebrow">
                Proof of delivery
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {order.proof_links.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-sm font-semibold text-violet-deep underline underline-offset-2">
                      {l} ↗
                    </a>
                  </li>
                ))}
              </ul>
              {order.proof_note && <p className="mt-3 whitespace-pre-wrap text-sm text-body">{order.proof_note}</p>}
            </section>
          )}

          <section className="panel p-6" aria-labelledby="brief-t">
            <h2 id="brief-t" className="eyebrow">
              Brief
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-body">{order.brief}</p>
            {order.tag && (
              <p className="mt-3 text-sm">
                <b>Tag:</b> {order.tag}
              </p>
            )}
            {order.includes && (
              <p className="mt-3 text-sm text-body">
                <b className="text-ink">Includes:</b> {order.includes}
              </p>
            )}
          </section>

          {(events ?? []).length > 0 && (
            <section className="panel p-6" aria-labelledby="hist-t">
              <h2 id="hist-t" className="eyebrow">
                History
              </h2>
              <ol className="mt-3 flex flex-col gap-3 border-l-2 border-black/[.06] pl-4">
                {(events ?? []).map((e, i) => (
                  <li key={i}>
                    <p className="text-sm text-ink">{e.note}</p>
                    <p className="text-xs text-ink-2">{new Date(e.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          {other && (
            <section className="panel flex items-center gap-3 p-5">
              <Avatar name={other.display_name} source={other.avatar_source} pattern={other.avatar_pattern} url={other.avatar_url} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{other.display_name}</p>
                <Link href={other.role === "brand" ? `/b/${other.handle}` : `/c/${other.handle}`} className="text-xs font-semibold text-violet-deep">
                  View profile
                </Link>
              </div>
              <Link href={order.thread_id ? `/messages?t=${order.thread_id}` : `/messages/new?to=${other.handle}`} className="btn btn-ghost min-h-10 px-3 text-sm">
                Message
              </Link>
            </section>
          )}
          <section className="panel p-5" aria-labelledby="money-t">
            <h2 id="money-t" className="eyebrow">
              Payment
            </h2>
            <dl className="mt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-body">Price</dt>
                <dd className="font-semibold">{money(order.price_cents)}</dd>
              </div>
              {isBrand ? (
                <>
                  <div className="flex justify-between">
                    <dt className="text-body">Payment processing</dt>
                    <dd className="font-semibold">{money(order.brand_fee_cents)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-black/[.06] pt-1.5">
                    <dt className="font-bold">You paid</dt>
                    <dd className="font-extrabold">{money(order.total_cents)}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <dt className="text-body">Clouta fee ({Math.round(Number(order.fee_rate) * 100)}%)</dt>
                    <dd className="font-semibold">−{money(order.creator_fee_cents)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-black/[.06] pt-1.5">
                    <dt className="font-bold">You receive</dt>
                    <dd className="font-extrabold">{money(payout)}</dd>
                  </div>
                </>
              )}
            </dl>
            <dl className="mt-4 flex flex-col gap-1 border-t border-black/[.06] pt-3 text-xs text-body">
              <div className="flex justify-between">
                <dt>Post by</dt>
                <dd className="font-semibold text-ink">{fmtDate(order.post_by)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Revisions</dt>
                <dd className="font-semibold text-ink">
                  {order.revisions_used} of {order.revisions_allowed} used
                </dd>
              </div>
              {order.auto_approve_at && order.status === "proof_submitted" && (
                <div className="flex justify-between">
                  <dt>Auto-approves</dt>
                  <dd className="font-semibold text-ink">{fmtDate(order.auto_approve_at)}</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
