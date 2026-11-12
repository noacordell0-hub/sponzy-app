import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { payCreator, type Order } from "@/lib/orders";
import { accountStatus } from "@/lib/stripe-v2";

/**
 * Read a creator's payout account status from Stripe, save it, and pay any approved orders
 * that were waiting for payout setup.
 */
export async function syncAccount(admin: SupabaseClient, accountId: string) {
  const { data: priv } = await admin.from("profile_private").select("id").eq("stripe_account_id", accountId).maybeSingle();
  if (!priv) return null;
  const status = await accountStatus(accountId);
  await admin.from("profile_private").update({ payouts_enabled: status.ready, details_submitted: status.detailsSubmitted }).eq("id", priv.id);
  await admin.from("profiles").update({ payouts_ready: status.ready }).eq("id", priv.id);

  if (status.ready) {
    const { data: waiting } = await admin.from("orders").select("*").eq("creator_id", priv.id).eq("status", "approved").is("stripe_transfer", null);
    for (const o of (waiting as Order[]) ?? []) await payCreator(admin, o, null).catch(() => null);
  }
  return status;
}
