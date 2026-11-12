import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AppShell } from "@/components/AppShell";
import { money } from "@/lib/format";
import { DISPUTE_REASONS } from "@/lib/dispute-labels";
import type { Dispute } from "@/lib/disputes";
import type { Order } from "@/lib/orders";
import { AdminHeader } from "../../AdminNav";
import DecisionForm from "./DecisionForm";

export const metadata: Metadata = { title: "Dispute · Clouta Admin", robots: { index: false } };

function Links({ links }: { links: string[] }) {
  return links.length ? (
    <ul className="mt-2 flex flex-col gap-1">
      {links.map((l) => (
        <li key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-sm font-semibold text-violet-deep underline">{l} ↗</a></li>
      ))}
    </ul>
  ) : null;
}

export default async function AdminDispute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireProfile();
  if (!profile.is_admin) notFound();
  const admin = getSupabaseAdmin();
  if (!admin) notFound();
  const { data: d } = await admin.from("disputes").select("*").eq("id", Number(id)).maybeSingle<Dispute>();
  if (!d) notFound();
  const { data: o } = await admin.from("orders").select("*").eq("id", d.order_id).single<Order>();
  if (!o) notFound();
  const [{ data: people }, { data: events }, { data: msgs }] = await Promise.all([
    admin.from("profiles").select("id, display_name, handle, role").in("id", [o.brand_id, o.creator_id].filter(Boolean) as string[]),
    admin.from("order_events").select("note, created_at").eq("order_id", o.id).order("created_at"),
    o.thread_id ? admin.from("messages").select("sender_id, kind, body, created_at").eq("thread_id", o.thread_id).order("created_at", { ascending: false }).limit(60) : Promise.resolve({ data: [] }),
  ]);
  const who = (pid: string | null) => (people ?? []).find((p) => p.id === pid);
  const brand = who(o.brand_id);
  const creator = who(o.creator_id);
  const opener = d.opener_role === "brand" ? brand : creator;
  const other = d.opener_role === "brand" ? creator : brand;
  const payout = o.price_cents - o.creator_fee_cents;

  return (
    <AppShell profile={profile} active="admin" wide>
      <AdminHeader title={`Dispute on order #${o.id}`} active="disputes" />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <section className="panel p-6">
            <p className="eyebrow">Opened by the {d.opener_role}: {opener?.display_name} · {DISPUTE_REASONS[d.reason]?.label ?? d.reason}</p>
            <p className="mt-3 whitespace-pre-line text-[15px] text-ink">{d.statement}</p>
            <Links links={d.evidence} />
            <p className="mt-3 text-xs text-ink-2">{new Date(d.created_at).toLocaleString()}</p>
          </section>
          <section className="panel p-6">
            <p className="eyebrow">Response from {other?.display_name ?? "the other side"}</p>
            {d.response ? (
              <>
                <p className="mt-3 whitespace-pre-line text-[15px] text-ink">{d.response}</p>
                <Links links={d.response_evidence} />
              </>
            ) : (
              <p className="mt-3 text-sm text-body">No response yet. Deadline {new Date(d.respond_by).toLocaleString()}.</p>
            )}
          </section>
          <section className="panel p-6">
            <p className="eyebrow">Order</p>
            <p className="mt-2 font-bold">{o.title} · {money(o.price_cents)} (brand paid {money(o.total_cents)})</p>
            <p className="mt-1 text-sm text-body"><b>Brief:</b> {o.brief}</p>
            <p className="mt-1 text-sm text-body"><b>Post by:</b> {o.post_by} · <b>Before dispute:</b> {d.prev_status}</p>
            {o.proof_links.length > 0 && (<><p className="mt-3 text-sm font-semibold">Proof submitted</p><Links links={o.proof_links} /></>)}
            {o.proof_note && <p className="mt-1 text-sm text-body">{o.proof_note}</p>}
            <p className="mt-4 text-sm">
              Brand: <Link className="font-semibold text-violet-deep" href={`/b/${brand?.handle}`}>{brand?.display_name}</Link> · Creator: <Link className="font-semibold text-violet-deep" href={`/c/${creator?.handle}`}>{creator?.display_name}</Link>
            </p>
          </section>
          <section className="panel p-6">
            <p className="eyebrow">Conversation (latest 60, newest first)</p>
            <ul className="mt-3 flex flex-col gap-2">
              {(msgs ?? []).map((m, i) => (
                <li key={i} className={`rounded-lg px-3 py-2 text-sm ${m.kind === "system" ? "bg-black/[.03] text-ink-2" : "bg-[#F7F5FF]"}`}>
                  <span className="text-xs font-bold">{m.kind === "system" ? "Clouta" : who(m.sender_id)?.display_name ?? "?"}</span>{" "}
                  <span className="text-xs text-ink-2">{new Date(m.created_at).toLocaleString()}</span>
                  <p className="whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel p-6">
            <p className="eyebrow">Order history</p>
            <ol className="mt-3 flex flex-col gap-2 text-sm">
              {(events ?? []).map((e, i) => <li key={i}>{e.note} <span className="text-xs text-ink-2">{new Date(e.created_at).toLocaleString()}</span></li>)}
            </ol>
          </section>
        </div>
        <aside className="lg:sticky lg:top-24">
          {d.status === "open" ? (
            <DecisionForm disputeId={d.id} payoutCents={payout} priceCents={o.price_cents} totalCents={o.total_cents} creatorName={creator?.display_name ?? "Creator"} brandName={brand?.display_name ?? "Brand"} />
          ) : (
            <section className="panel p-6">
              <p className="eyebrow">Outcome</p>
              <p className="mt-2 font-bold">{d.status === "withdrawn" ? "Withdrawn by the opener" : `${d.decision}${d.decision === "split" ? ` · ${d.split_pct}% to creator` : ""}`}</p>
              {d.status === "resolved" && <p className="mt-1 text-sm text-body">Creator {money(d.payout_cents ?? 0)} · Brand refund {money(d.refund_cents ?? 0)}</p>}
              {d.decision_note && <p className="mt-2 text-sm text-body">&ldquo;{d.decision_note}&rdquo;</p>}
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
