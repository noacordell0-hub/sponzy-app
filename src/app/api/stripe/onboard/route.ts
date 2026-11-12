import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";

/** Creators: create (or reuse) a Stripe Express account and get a link to Stripe's hosted payout setup. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return NextResponse.json({ error: "Payouts aren't available yet." }, { status: 503 });

  const { data: profile } = await admin.from("profiles").select("role, display_name, handle").eq("id", user.id).single();
  if (profile?.role !== "creator") return NextResponse.json({ error: "Only creators set up payouts." }, { status: 403 });

  const { data: priv } = await admin.from("profile_private").select("stripe_account_id, is_minor, guardian_email").eq("id", user.id).single();
  let accountId = priv?.stripe_account_id as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      // Minors: the parent or guardian owns the payout account, so prefill their email.
      email: priv?.is_minor && priv.guardian_email ? priv.guardian_email : user.email,
      business_type: "individual",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_profile: { product_description: "Sponsored social media content sold on Clouta", url: `https://clouta.vercel.app/c/${profile.handle}` },
      metadata: { profile_id: user.id },
    });
    accountId = account.id;
    await admin.from("profile_private").update({ stripe_account_id: accountId }).eq("id", user.id);
  }

  const origin = new URL(request.url).origin;
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${origin}/earnings?setup=retry`,
    return_url: `${origin}/earnings?setup=done`,
  });
  return NextResponse.json({ url: link.url });
}
