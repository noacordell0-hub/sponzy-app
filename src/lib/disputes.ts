import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe, FEES } from "@/lib/stripe";
import { money } from "@/lib/format";
import { logOrder, payCreator, refundOrder, type Order } from "@/lib/orders";
import { refreshOrderTrust } from "@/lib/reviews";

export type Dispute = {
  id: number;
  order_id: number;
  opened_by: string | null;
  opener_role: "brand" | "creator";
  reason: string;
  statement: string;
  evidence: string[];
  response: string | null;
  response_evidence: string[];
  responded_at: string | null;
  respond_by: string;
  prev_status: string;
  status: "open" | "resolved" | "withdrawn";
  decision: "refund" | "pay" | "split" | null;
  split_pct: number | null;
  refund_cents: number | null;
  payout_cents: number | null;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

export const DISPUTABLE = ["funded", "in_progress", "proof_submitted", "revision_requested"];
export const RESPONSE_HOURS = 48;

function cleanLinks(v: unknown) {
  return (Array.isArray(v) ? v : [])
    .map((l) => String(l).trim())
    .filter((l) => /^https:\/\/[^\s]+\.[^\s]+$/i.test(l) && l.length <= 500)
    .slice(0, 5);
}

export async function openDispute(admin: SupabaseClient, order: Order, userId: string, input: { reason: string; statement: string; evidence?: unknown }) {
  if (!DISPUTABLE.includes(order.status)) throw new UserError("Disputes can only be opened before the work is approved.");
  const role = order.brand_id === userId ? "brand" : "creator";
  const statement = (input.statement ?? "").trim();
  if (statement.length < 20 || statement.length > 3000) throw new UserError("Explain what happened in at least 20 characters.");
  const respondBy = new Date(Date.now() + RESPONSE_HOURS * 3600e3).toISOString();
  const { error } = await admin.from("disputes").insert({
    order_id: order.id, opened_by: userId, opener_role: role, reason: input.reason, statement,
    evidence: cleanLinks(input.evidence), respond_by: respondBy, prev_status: order.status,
  });
  if (error) throw error.code === "23505" ? new UserError("There's already an open dispute on this order.") : error.code === "23514" ? new UserError("Choose a reason.") : error;
  // Pause the order (and the auto-approve timer) until it's resolved.
  await admin.from("orders").update({ status: "disputed", auto_approve_at: null }).eq("id", order.id).eq("status", order.status);
  await logOrder(admin, order, "dispute_opened", userId, `The ${role} opened a dispute.`,
    `The ${role} opened a dispute, so this order is paused and the money stays held by Clouta. The other side has ${RESPONSE_HOURS} hours to respond on the order page, then the Clouta team decides.`);
}

export async function respondDispute(admin: SupabaseClient, order: Order, dispute: Dispute, userId: string, input: { response: string; evidence?: unknown }) {
  if (dispute.status !== "open") throw new UserError("This dispute is closed.");
  if (dispute.opened_by === userId) throw new UserError("The other side responds to your dispute.");
  if (dispute.responded_at) throw new UserError("You've already responded.");
  const response = (input.response ?? "").trim();
  if (response.length < 10 || response.length > 3000) throw new UserError("Write your side in at least 10 characters.");
  await admin.from("disputes").update({ response, response_evidence: cleanLinks(input.evidence), responded_at: new Date().toISOString() }).eq("id", dispute.id);
  const role = order.brand_id === userId ? "brand" : "creator";
  await logOrder(admin, order, "dispute_response", userId, `The ${role} responded to the dispute.`, `The ${role} responded to the dispute. The Clouta team will review both sides and decide.`);
}

export async function withdrawDispute(admin: SupabaseClient, order: Order, dispute: Dispute, userId: string) {
  if (dispute.status !== "open" || dispute.opened_by !== userId) throw new UserError("Only the person who opened the dispute can withdraw it.");
  await admin.from("disputes").update({ status: "withdrawn", decided_at: new Date().toISOString() }).eq("id", dispute.id);
  // Resume where it was; a delivered order gets a fresh review window.
  const resume: Record<string, unknown> = { status: dispute.prev_status };
  if (dispute.prev_status === "proof_submitted") resume.auto_approve_at = new Date(Date.now() + FEES.reviewWindowDays * 864e5).toISOString();
  await admin.from("orders").update(resume).eq("id", order.id).eq("status", "disputed");
  await logOrder(admin, order, "dispute_withdrawn", userId, "The dispute was withdrawn.", "The dispute was withdrawn and the order is back on track.");
}

/**
 * Admin decision. refund: brand gets everything back. pay: creator is paid in full.
 * split: creator gets split_pct% of their payout; the brand gets the rest of the price back.
 */
export async function decideDispute(admin: SupabaseClient, order: Order, dispute: Dispute, adminId: string, decision: "refund" | "pay" | "split", splitPct: number, note: string) {
  if (dispute.status !== "open" || order.status !== "disputed") throw new UserError("This dispute is already closed.");
  const stripe = getStripe();
  if (!stripe) throw new Error("Payments are not configured.");
  const pct = decision === "refund" ? 0 : decision === "pay" ? 100 : Math.round(splitPct);
  if (decision === "split" && (pct <= 0 || pct >= 100)) throw new UserError("For a split, choose a creator share between 1% and 99%.");
  const fullPayout = order.price_cents - order.creator_fee_cents;
  const payout = Math.round((fullPayout * pct) / 100);
  const refund = decision === "refund" ? order.total_cents : decision === "split" ? Math.round((order.price_cents * (100 - pct)) / 100) : 0;
  const now = new Date().toISOString();

  // Claim the dispute first so two admins can't decide it twice.
  const { data: claimed } = await admin.from("disputes")
    .update({ status: "resolved", decision, split_pct: pct, refund_cents: refund, payout_cents: payout, decision_note: note.trim().slice(0, 2000) || null, decided_by: adminId, decided_at: now })
    .eq("id", dispute.id).eq("status", "open").select("id").maybeSingle();
  if (!claimed) throw new UserError("This dispute was just decided by someone else.");

  const why = note.trim() ? ` Note from Clouta: "${note.trim().slice(0, 300)}"` : "";
  if (decision === "refund") {
    await refundOrder(admin, order, adminId, `The Clouta team resolved the dispute with a full refund.${why}`);
  } else {
    if (refund > 0 && order.stripe_payment_intent) {
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent, amount: refund, metadata: { order_id: String(order.id), dispute_id: String(dispute.id) } }, { idempotencyKey: `dispute-${dispute.id}-refund` });
    }
    const { data: updated } = await admin.from("orders")
      .update({ status: "approved", approved_at: now, payout_cents: payout, refunded_cents: refund || null })
      .eq("id", order.id).eq("status", "disputed").select().single<Order>();
    if (updated) {
      await logOrder(admin, updated, "dispute_resolved", adminId,
        decision === "pay" ? "Dispute resolved: creator paid in full." : `Dispute resolved: split ${pct}% to the creator (${money(payout)}), ${money(refund)} refunded to the brand.`,
        (decision === "pay"
          ? "The Clouta team resolved the dispute in the creator's favour, so the payment is being released."
          : `The Clouta team resolved the dispute with a split: ${money(payout)} goes to the creator and ${money(refund)} is refunded to the brand.`) + why);
      await payCreator(admin, updated, adminId);
    }
  }
  await refreshOrderTrust(admin, order);
}

/** A message that's safe to show the user. */
export class UserError extends Error {}
