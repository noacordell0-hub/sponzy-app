import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { autoApproveDue } from "@/lib/orders";
import { refreshPendingPayouts } from "@/lib/payouts";

/** Daily job (vercel.json): approve orders whose 3-day review window has passed, and re-check pending payout setups. Protected by CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const approved = await autoApproveDue(admin);
  const payoutsConfirmed = await refreshPendingPayouts(admin);
  return NextResponse.json({ approved, payoutsConfirmed });
}
