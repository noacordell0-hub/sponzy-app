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

/**
 * Re-check a creator's payout status with Stripe if Clouta still thinks setup isn't finished.
 * Stripe's newer accounts don't send the "account.updated" webhook, so this is the safety net.
 */
export async function refreshCreatorPayouts(admin: SupabaseClient, creatorId: string) {
  const { data: priv } = await admin.from("profile_private").select("stripe_account_id, payouts_enabled").eq("id", creatorId).maybeSingle();
  if (!priv?.stripe_account_id) return false;
  if (priv.payouts_enabled) return true;
  const status = await syncAccount(admin, priv.stripe_account_id).catch(() => null);
  return Boolean(status?.ready);
}

/** Daily: re-check every creator who started payout setup but isn't confirmed yet. */
export async function refreshPendingPayouts(admin: SupabaseClient) {
  const { data } = await admin.from("profile_private").select("stripe_account_id").not("stripe_account_id", "is", null).eq("payouts_enabled", false).limit(200);
  let ready = 0;
  for (const row of data ?? []) {
    const status = await syncAccount(admin, row.stripe_account_id as string).catch(() => null);
    if (status?.ready) ready++;
  }
  return ready;
}
