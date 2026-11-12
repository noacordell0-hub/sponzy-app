import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { payCreator, type Order } from "@/lib/orders";

/** Save a creator's Stripe account status, and pay any approved orders that were waiting on payout setup. */
export async function syncAccount(admin: SupabaseClient, account: Stripe.Account) {
  const { data: priv } = await admin.from("profile_private").select("id").eq("stripe_account_id", account.id).maybeSingle();
  if (!priv) return;
  const payoutsEnabled = Boolean(account.payouts_enabled && account.charges_enabled !== false);
  await admin
    .from("profile_private")
    .update({ payouts_enabled: Boolean(account.payouts_enabled), details_submitted: Boolean(account.details_submitted) })
    .eq("id", priv.id);
  await admin.from("profiles").update({ payouts_ready: Boolean(account.details_submitted && account.payouts_enabled) }).eq("id", priv.id);

  if (payoutsEnabled) {
    const { data: waiting } = await admin.from("orders").select("*").eq("creator_id", priv.id).eq("status", "approved").is("stripe_transfer", null);
    for (const o of (waiting as Order[]) ?? []) await payCreator(admin, o, null).catch(() => null);
  }
}
