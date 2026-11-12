import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { syncAccount } from "@/lib/payouts";
import { AppShell } from "@/components/AppShell";
import { money } from "@/lib/format";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/order-status";
import type { Order } from "@/lib/orders";
import PayoutButtons from "./PayoutButtons";
import TrackView from "@/components/TrackView";

export const metadata: Metadata = { title: "Earnings · Clouta" };

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const { setup } = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  if (profile.role !== "creator") redirect("/orders");

  // Refresh payout status from Stripe (covers returning from Stripe's setup page before the webhook lands).
  const admin = getSupabaseAdmin();
  const stripe = getStripe();
  const { data: priv } = await supabase.from("profile_private").select("stripe_account_id, payouts_enabled, details_submitted, is_minor").eq("id", user.id).single();
  let payoutsEnabled = Boolean(priv?.payouts_enabled);
  let detailsSubmitted = Boolean(priv?.details_submitted);
  if (admin && stripe && priv?.stripe_account_id) {
    const status = await syncAccount(admin, priv.stripe_account_id).catch(() => null);
    if (status) {
      payoutsEnabled = status.ready;
      detailsSubmitted = status.detailsSubmitted;
    }
  }

  const { data } = await supabase.from("orders").select("*").eq("creator_id", user.id).not("status", "in", "(awaiting_payment,cancelled)").order("created_at", { ascending: false });
  const orders = (data as Order[]) ?? [];
  const net = (o: Order) => o.price_cents - o.creator_fee_cents;
  const held = orders.filter((o) => ["funded", "in_progress", "proof_submitted", "revision_requested", "approved"].includes(o.status)).reduce((n, o) => n + net(o), 0);
  const paid = orders.filter((o) => o.status === "paid").reduce((n, o) => n + net(o), 0);
  const fees = orders.filter((o) => o.status === "paid").reduce((n, o) => n + o.creator_fee_cents, 0);
  const configured = Boolean(stripe);

  return (
    <AppShell profile={profile} active="earnings">
      <h1 className="on-bg mb-8 text-3xl font-extrabold tracking-[-0.03em]">Earnings</h1>
      {setup === "done" && <TrackView name={payoutsEnabled ? "stripe_onboard_success" : "stripe_onboard_error"} props={{ stage: payoutsEnabled ? "active" : detailsSubmitted ? "pending_review" : "incomplete" }} />}
      {setup === "retry" && <TrackView name="stripe_onboard_error" props={{ stage: "link_expired" }} />}

      {/* Payout setup */}
      <section className={`panel mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center ${payoutsEnabled ? "" : "border-[#F2D58A]"}`} aria-labelledby="payout-t">
        <div className="flex-1">
          <h2 id="payout-t" className="text-lg font-bold">
            {payoutsEnabled ? "✓ Payouts are set up" : detailsSubmitted ? "Stripe is checking your details" : "Set up payouts to get booked"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-body">
            {payoutsEnabled
              ? "Brands can book you, and approved payments go straight to your bank through Stripe."
              : detailsSubmitted
                ? "This usually takes a few minutes. Brands can book you once Stripe confirms your account."
                : "Clouta pays creators through Stripe, our payments partner. Add your bank details on Stripe's secure page. It takes about 5 minutes, and brands can't book you until it's done."}
          </p>
          {priv?.is_minor && !payoutsEnabled && (
            <p className="mt-2 rounded-lg bg-[#FFF9E8] px-3 py-2 text-sm text-[#6B4700]">
              Because you&apos;re under 18, your parent or guardian needs to complete this step with their own details.
            </p>
          )}
          {setup === "retry" && <p className="mt-2 text-sm font-semibold text-err">That setup link expired. Start again below.</p>}
        </div>
        {configured ? (
          <PayoutButtons hasAccount={Boolean(priv?.stripe_account_id)} payoutsEnabled={payoutsEnabled} />
        ) : (
          <p className="text-sm font-semibold text-ink-2">Payouts open soon.</p>
        )}
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Held for you", money(held), "Paid by brands, released on approval"],
          ["Paid out", money(paid), "Sent to your Stripe account"],
          ["Clouta fees", money(fees), profile.is_founding ? "5% Founding Creator rate" : "10% of each order"],
        ].map(([l, v, n]) => (
          <div key={l} className="panel p-5">
            <p className="text-sm font-bold text-ink">{l}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-[-0.03em]">{v}</p>
            <p className="text-xs text-ink-2">{n}</p>
          </div>
        ))}
      </div>

      <section className="panel overflow-hidden" aria-labelledby="hist">
        <h2 id="hist" className="eyebrow px-5 pt-5">
          Orders
        </h2>
        {orders.length === 0 ? (
          <p className="p-5 text-sm text-body">No paid orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-2">
                  <th className="px-5 py-3 font-bold">Order</th>
                  <th className="px-3 py-3 font-bold">Price</th>
                  <th className="px-3 py-3 font-bold">Fee</th>
                  <th className="px-3 py-3 font-bold">You get</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.06]">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3">
                      <Link href={`/orders/${o.id}`} className="font-semibold hover:text-violet-deep">
                        {o.title}
                      </Link>
                      <span className="block text-xs text-ink-2">#{o.id}</span>
                    </td>
                    <td className="px-3 py-3">{money(o.price_cents)}</td>
                    <td className="px-3 py-3 text-ink-2">−{money(o.creator_fee_cents)}</td>
                    <td className="px-3 py-3 font-bold">{money(net(o))}</td>
                    <td className="px-5 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
