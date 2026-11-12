import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order } from "@/lib/orders";
import { REVIEW_WINDOW_DAYS } from "@/lib/trust";

/** Whether this user can still review this order: a party to an approved order, within 14 days, once. */
export async function reviewEligibility(admin: SupabaseClient, order: Order, userId: string) {
  const isBrand = order.brand_id === userId;
  const isCreator = order.creator_id === userId;
  if (!isBrand && !isCreator) return { ok: false as const, reason: "Only the brand and creator on this order can review it." };
  if (!["approved", "paid"].includes(order.status) || !order.approved_at) return { ok: false as const, reason: "You can review once the work is approved." };
  const closes = new Date(new Date(order.approved_at).getTime() + REVIEW_WINDOW_DAYS * 864e5);
  const { data: mine } = await admin.from("reviews").select("id, revealed_at").eq("order_id", order.id).eq("author_id", userId).maybeSingle();
  if (mine) return { ok: false as const, reason: "You've already reviewed this order.", already: true, revealed: Boolean(mine.revealed_at), closes };
  if (Date.now() > closes.getTime()) return { ok: false as const, reason: "The 14-day review window has closed.", closes };
  return {
    ok: true as const,
    closes,
    role: (isBrand ? "brand" : "creator") as "brand" | "creator",
    subjectId: (isBrand ? order.creator_id : order.brand_id) as string,
  };
}

/** Recompute trust for both people on an order (after approval or a review). Never throws. */
export async function refreshOrderTrust(admin: SupabaseClient, order: Pick<Order, "brand_id" | "creator_id">) {
  for (const id of [order.brand_id, order.creator_id]) {
    if (id) await admin.rpc("refresh_trust", { p_id: id }).then(() => null, () => null);
  }
}
