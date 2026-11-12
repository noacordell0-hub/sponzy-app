import { logError } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { createRecipientAccount, onboardingLink } from "@/lib/stripe-v2";

/** Creators: create (or reuse) a Stripe payout account and get a link to Stripe's hosted setup. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin || !getStripe()) return NextResponse.json({ error: "Payouts aren't available yet." }, { status: 503 });

  const { data: profile } = await admin.from("profiles").select("role, display_name, handle").eq("id", user.id).single();
  if (profile?.role !== "creator") return NextResponse.json({ error: "Only creators set up payouts." }, { status: 403 });

  const { data: priv } = await admin.from("profile_private").select("stripe_account_id, is_minor, guardian_email").eq("id", user.id).single();
  let accountId = priv?.stripe_account_id as string | null;

  try {
    if (!accountId) {
      const account = await createRecipientAccount({
        // Minors: the parent or guardian owns the payout account, so use their email.
        email: (priv?.is_minor && priv.guardian_email) || user.email || "",
        name: profile.display_name ?? profile.handle ?? "Clouta creator",
        profileId: user.id,
        url: `https://clouta.vercel.app/c/${profile.handle}`,
      });
      accountId = account.id;
      await admin.from("profile_private").update({ stripe_account_id: accountId }).eq("id", user.id);
    }
    const link = await onboardingLink(accountId, new URL(request.url).origin);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    await logError(err, { route: "POST /api/stripe/onboard", userId: user.id });
    return NextResponse.json({ error: "Couldn't reach Stripe. Please try again." }, { status: 502 });
  }
}
