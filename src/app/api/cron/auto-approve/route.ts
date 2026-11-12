import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { autoApproveDue } from "@/lib/orders";
import { refreshPendingPayouts } from "@/lib/payouts";

/** Daily job (vercel.json): approve orders whose 3-day review window has passed, re-check pending payout setups, reveal due reviews and refresh trust scores. Protected by CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const approved = await autoApproveDue(admin);
  const payoutsConfirmed = await refreshPendingPayouts(admin);
  // Reveal reviews whose 14-day window passed, then recompute every trust score (streaks, badges, levels).
  const { data: revealed } = await admin.rpc("reveal_due_reviews");
  const { data: refreshed } = await admin.rpc("refresh_all_trust");
  return NextResponse.json({ approved, payoutsConfirmed, revealed, refreshed });
}
