import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe, FEES } from "@/lib/stripe";
import { money } from "@/lib/format";
import { refreshOrderTrust } from "@/lib/reviews";

export type OrderStatus =
  | "awaiting_payment" | "funded" | "in_progress" | "proof_submitted" | "revision_requested"
  | "approved" | "paid" | "cancelled" | "refunded" | "disputed";

export type Order = {
  id: number;
  brand_id: string | null;
  creator_id: string | null;
  service_id: number | null;
  offer_message_id: number | null;
  thread_id: number | null;
  title: string;
  includes: string | null;
  price_cents: number;
  fee_rate: number;
  creator_fee_cents: number;
  brand_fee_cents: number;
  total_cents: number;
  turnaround_days: number;
  revisions_allowed: number;
  revisions_used: number;
  brief: string;
  tag: string | null;
  post_by: string;
  status: OrderStatus;
  stripe_checkout_session: string | null;
  stripe_payment_intent: string | null;
  stripe_charge: string | null;
  stripe_transfer: string | null;
  proof_links: string[];
  proof_note: string | null;
  revision_note: string | null;
  funded_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  auto_approve_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  created_at: string;
  payout_cents: number | null;
  refunded_cents: number | null;
};

/** Record an order event and post a system message into the brand-creator conversation. */
export async function logOrder(admin: SupabaseClient, order: Pick<Order, "id" | "brand_id" | "creator_id" | "thread_id" | "title">, kind: string, actorId: string | null, note: string, chatText?: string) {
  await admin.from("order_events").insert({ order_id: order.id, actor_id: actorId, kind, note });
  if (!chatText) return;
  const threadId = order.thread_id ?? (await ensureThread(admin, order));
  if (threadId) await admin.from("messages").insert({ thread_id: threadId, sender_id: null, kind: "system", body: chatText, order_id: order.id });
}

/** Find or create the conversation between the brand and creator of an order. */
export async function ensureThread(admin: SupabaseClient, order: Pick<Order, "id" | "brand_id" | "creator_id">) {
  if (!order.brand_id || !order.creator_id) return null;
  const [a, b] = [order.brand_id, order.creator_id].sort();
  await admin.from("threads").upsert({ a_id: a, b_id: b }, { onConflict: "a_id,b_id", ignoreDuplicates: true });
  const { data } = await admin.from("threads").select("id").eq("a_id", a).eq("b_id", b).single();
  if (data?.id) await admin.from("orders").update({ thread_id: data.id }).eq("id", order.id);
  return (data?.id as number) ?? null;
}

/**
 * Release money to the creator: transfer price minus Clouta's fee to their Stripe account.
 * If they haven't finished payout setup, the order stays "approved" and is paid when they do.
 */
export async function payCreator(admin: SupabaseClient, order: Order, actorId: string | null) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Payments are not configured.");
  if (order.stripe_transfer) return { paid: true };

  const { data: priv } = await admin.from("profile_private").select("stripe_account_id, payouts_enabled").eq("id", order.creator_id).single();
  if (!priv?.stripe_account_id || !priv.payouts_enabled) {
    await logOrder(admin, order, "payout_waiting", actorId, "Approved; waiting for the creator to finish payout setup.",
      "Payment approved. The creator will receive it as soon as they finish payout setup on the Earnings page.");
    return { paid: false };
  }

  // A dispute split sets payout_cents; otherwise the creator gets the price minus Clouta's fee.
  const amount = order.payout_cents ?? order.price_cents - order.creator_fee_cents;
  if (amount <= 0) return { paid: true };
  const transfer = await stripe.transfers.create(
    {
      amount,
      currency: "usd",
      destination: priv.stripe_account_id,
      transfer_group: `order_${order.id}`,
      ...(order.stripe_charge ? { source_transaction: order.stripe_charge } : {}),
      metadata: { order_id: String(order.id) },
    },
    { idempotencyKey: `order-${order.id}-transfer` },
  );
  await admin.from("orders").update({ status: "paid", stripe_transfer: transfer.id, paid_at: new Date().toISOString() }).eq("id", order.id);
  await logOrder(admin, order, "paid", actorId, `Transferred ${money(amount)} to the creator.`,
    `${money(amount)} has been released to the creator. It reaches their bank on Stripe's payout schedule.`);
  return { paid: true };
}

/** Approve delivered work (by the brand, or automatically after the review window) and pay the creator. */
export async function approveOrder(admin: SupabaseClient, order: Order, actorId: string | null, auto = false) {
  const { data: updated } = await admin
    .from("orders")
    .update({ status: "approved", approved_at: new Date().toISOString(), auto_approve_at: null })
    .eq("id", order.id)
    .eq("status", "proof_submitted")
    .select()
    .single<Order>();
  if (!updated) return { ok: false };
  await logOrder(admin, updated, auto ? "auto_approved" : "approved", actorId,
    auto ? `No response within ${FEES.reviewWindowDays} days, so the work was approved automatically.` : "The brand approved the work.",
    (auto ? `The ${FEES.reviewWindowDays}-day review window ended, so the work was approved automatically.` : "The brand approved the work. 🎉") +
      ` You can both leave a review from the order page within 14 days. Reviews stay hidden until you've both left one.`);
  await payCreator(admin, updated, actorId);
  await refreshOrderTrust(admin, updated);
  return { ok: true };
}

/** Refund the brand in full. */
export async function refundOrder(admin: SupabaseClient, order: Order, actorId: string | null, reason: string) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Payments are not configured.");
  if (order.stripe_payment_intent) {
    await stripe.refunds.create({ payment_intent: order.stripe_payment_intent, metadata: { order_id: String(order.id) } }, { idempotencyKey: `order-${order.id}-refund` });
  }
  const now = new Date().toISOString();
  await admin.from("orders").update({ status: "refunded", refunded_at: now, cancelled_at: now, auto_approve_at: null }).eq("id", order.id);
  await logOrder(admin, order, "refunded", actorId, reason, `Order cancelled: ${reason} The brand has been refunded in full.`);
}

/** Approve any orders whose review window has passed. Used by the daily job and when an order is viewed. */
export async function autoApproveDue(admin: SupabaseClient, orderId?: number) {
  let q = admin.from("orders").select("*").eq("status", "proof_submitted").lte("auto_approve_at", new Date().toISOString());
  if (orderId) q = q.eq("id", orderId);
  const { data } = await q.limit(50);
  let count = 0;
  for (const o of (data as Order[]) ?? []) {
    const r = await approveOrder(admin, o, null, true).catch(() => ({ ok: false }));
    if (r.ok) count++;
  }
  return count;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  funded: "Paid · ready to start",
  in_progress: "In progress",
  proof_submitted: "Proof submitted",
  revision_requested: "Revision requested",
  approved: "Approved",
  paid: "Paid out",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "In dispute",
};
