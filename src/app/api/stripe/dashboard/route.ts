import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";

/** Creators: one-time link into their Stripe Express dashboard (bank details, payout history). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const lim = rateLimit(`stripe-dash:${user.id}`, 10, 60000);
  if (!lim.ok) return NextResponse.json({ error: "Please wait a moment before trying again." }, { status: 429, headers: { "Retry-After": String(lim.retryAfter) } });
  const admin = getSupabaseAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return NextResponse.json({ error: "Payouts aren't available yet." }, { status: 503 });
  const { data: priv } = await admin.from("profile_private").select("stripe_account_id").eq("id", user.id).single();
  if (!priv?.stripe_account_id) return NextResponse.json({ error: "Set up payouts first." }, { status: 400 });
  const link = await stripe.accounts.createLoginLink(priv.stripe_account_id);
  return NextResponse.json({ url: link.url });
}
