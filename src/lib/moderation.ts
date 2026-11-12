import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { logOrder, refundOrder, type Order } from "@/lib/orders";

export type ModAction = "warning" | "suspension" | "ban" | "unban" | "dismiss" | "hide_content" | "restore_content" | "unflag";

const ACTIVE = ["funded", "in_progress", "proof_submitted", "revision_requested"];

/** Close the reports an action was taken on. */
async function closeReports(admin: SupabaseClient, ids: number[], adminId: string, status: "dismissed" | "actioned") {
  if (ids.length) await admin.from("reports").update({ status, handled_by: adminId, handled_at: new Date().toISOString() }).in("id", ids).eq("status", "open");
}

/**
 * Suspend (until a date) or permanently ban an account. Active orders are refunded to the brand and both sides told.
 * Permanent bans also record the email and linked social handles so they can't sign up again.
 */
export async function banProfile(admin: SupabaseClient, profileId: string, adminId: string, opts: { until: Date | null; reason: string; note: string }) {
  const now = new Date().toISOString();
  await admin.from("profiles").update({ banned_at: now, ban_until: opts.until?.toISOString() ?? null, taking_bookings: false }).eq("id", profileId);

  const { data: orders } = await admin.from("orders").select("*").or(`brand_id.eq.${profileId},creator_id.eq.${profileId}`)
    .in("status", [...ACTIVE, "awaiting_payment"]);
  const stripe = getStripe();
  for (const o of (orders as Order[]) ?? []) {
    try {
      if (o.status === "awaiting_payment") {
        if (stripe && o.stripe_checkout_session) await stripe.checkout.sessions.expire(o.stripe_checkout_session).catch(() => null);
        await admin.from("orders").update({ status: "cancelled", cancelled_at: now }).eq("id", o.id);
        await logOrder(admin, o, "cancelled", adminId, "Cancelled because an account was removed from Clouta.");
      } else {
        await refundOrder(admin, o, adminId, "One of the accounts on this order was removed from Clouta for breaking the rules.");
      }
    } catch (err) {
      console.error("[ban] order", o.id, err);
    }
  }

  if (!opts.until) {
    const { data: u } = await admin.auth.admin.getUserById(profileId);
    const { data: socials } = await admin.from("social_accounts").select("platform, handle").eq("profile_id", profileId);
    const rows = [
      ...(u?.user?.email ? [{ kind: "email", value: u.user.email.toLowerCase(), profile_id: profileId }] : []),
      ...((socials ?? []) as { platform: string; handle: string }[]).map((s) => ({ kind: "social", value: `${s.platform}:${s.handle.toLowerCase()}`, profile_id: profileId })),
    ];
    if (rows.length) await admin.from("banned_identities").upsert(rows, { onConflict: "kind,value", ignoreDuplicates: true });
  }
  return (orders ?? []).length;
}

/** Apply an admin action to an account and/or a piece of content, and close the related reports. */
export async function moderate(
  admin: SupabaseClient,
  adminId: string,
  input: { action: ModAction; profileId: string | null; reportIds: number[]; days?: number; reason?: string; note?: string; reviewId?: number; commentId?: number },
) {
  const { action, profileId, reportIds } = input;
  const note = (input.note ?? "").trim().slice(0, 2000) || null;
  const reason = input.reason ?? null;
  let until: Date | null = null;
  let affectedOrders = 0;

  switch (action) {
    case "dismiss":
      await closeReports(admin, reportIds, adminId, "dismissed");
      break;
    case "unflag":
      if (profileId) await admin.from("profiles").update({ browse_hidden_at: null }).eq("id", profileId);
      await closeReports(admin, reportIds, adminId, "dismissed");
      break;
    case "warning":
      await closeReports(admin, reportIds, adminId, "actioned");
      break;
    case "suspension": {
      const days = Math.min(365, Math.max(1, Math.round(input.days ?? 7)));
      until = new Date(Date.now() + days * 864e5);
      affectedOrders = await banProfile(admin, profileId!, adminId, { until, reason: reason ?? "", note: note ?? "" });
      await closeReports(admin, reportIds, adminId, "actioned");
      break;
    }
    case "ban":
      affectedOrders = await banProfile(admin, profileId!, adminId, { until: null, reason: reason ?? "", note: note ?? "" });
      await closeReports(admin, reportIds, adminId, "actioned");
      break;
    case "unban":
      await admin.from("profiles").update({ banned_at: null, ban_until: null }).eq("id", profileId!);
      await admin.from("banned_identities").delete().eq("profile_id", profileId!);
      break;
    case "hide_content":
    case "restore_content": {
      const hidden = action === "hide_content" ? new Date().toISOString() : null;
      if (input.reviewId) {
        const { data: r } = await admin.from("reviews").update({ hidden_at: hidden }).eq("id", input.reviewId).select("subject_id").maybeSingle();
        if (r?.subject_id) await admin.rpc("refresh_trust", { p_id: r.subject_id });
      }
      if (input.commentId) await admin.from("comments").update({ hidden_at: hidden }).eq("id", input.commentId);
      if (action === "hide_content") await closeReports(admin, reportIds, adminId, "actioned");
      break;
    }
  }

  if (profileId && action !== "dismiss") {
    await admin.from("moderation_actions").insert({ profile_id: profileId, action, reason, note, until: until?.toISOString() ?? null, report_ids: reportIds, admin_id: adminId });
  }
  return { affectedOrders };
}
