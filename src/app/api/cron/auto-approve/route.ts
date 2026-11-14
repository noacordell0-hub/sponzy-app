import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { autoApproveDue, logOrder, type Order } from "@/lib/orders";
import { refreshPendingPayouts } from "@/lib/payouts";

/** Daily job (vercel.json): approve orders whose 3-day review window has passed, re-check pending payout setups, reveal due reviews and refresh trust scores. Protected by CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const reminded = await remindBeforeAutoApprove(admin);
  const approved = await autoApproveDue(admin);
  const payoutsConfirmed = await refreshPendingPayouts(admin);
  // Reveal reviews whose 14-day window passed, then recompute every trust score (streaks, badges, levels).
  const { data: revealed } = await admin.rpc("reveal_due_reviews");
  const { data: refreshed } = await admin.rpc("refresh_all_trust");
  const { data: unsuspended } = await admin.rpc("lift_expired_suspensions");
  return NextResponse.json({ reminded, approved, payoutsConfirmed, revealed, refreshed, unsuspended });
}

/**
 * Brands get one reminder (chat + email) when a post will be approved automatically within the next 36 hours,
 * so weak or wrong proof can't slip through just because nobody looked.
 */
async function remindBeforeAutoApprove(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const soon = new Date(Date.now() + 36 * 3600_000).toISOString();
  const { data: due } = await admin.from("orders").select("*").eq("status", "proof_submitted").lte("auto_approve_at", soon).gt("auto_approve_at", new Date().toISOString());
  let n = 0;
  for (const o of (due as Order[]) ?? []) {
    const { count } = await admin.from("order_events").select("id", { count: "exact", head: true }).eq("order_id", o.id).eq("kind", "review_reminder").gte("created_at", o.submitted_at ?? o.created_at);
    if (count) continue;
    const when = new Date(o.auto_approve_at!).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    await logOrder(admin, o, "review_reminder", null, `Reminder sent: auto-approves ${when}.`,
      `Reminder for the brand: this post will be approved automatically on ${when}. Check the link is live, on the creator's account and matches the brief. Ask for a revision or open a dispute if it doesn't.`);
    n++;
  }
  return n;
}
