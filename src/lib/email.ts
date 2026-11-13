import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/log";
import { money } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

/**
 * Transactional email through Resend (https://resend.com), sent with a plain fetch.
 * Switched off until RESEND_API_KEY and EMAIL_FROM (for example "Clouta <hello@getclouta.com>") are set in Vercel.
 * Every email respects the person's settings (Settings → Emails) and has a link to change them.
 */
type Kind = "orders" | "messages" | "product";
type Content = { subject: string; heading: string; lines: string[]; cta?: { label: string; path: string } };

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderEmail(c: Content) {
  const cta = c.cta ? `${SITE_URL}${c.cta.path}` : null;
  const html = `<!doctype html><html><body style="margin:0;background:#f7f4ee;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#15131f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ee;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3ded4;border-radius:16px">
<tr><td style="padding:28px 28px 8px"><span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#5b3df5">Clouta</span></td></tr>
<tr><td style="padding:8px 28px 0"><h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800">${esc(c.heading)}</h1></td></tr>
<tr><td style="padding:12px 28px 4px;font-size:16px;line-height:1.6;color:#4b4b5a">${c.lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")}</td></tr>
${cta ? `<tr><td style="padding:8px 28px 28px"><a href="${esc(cta)}" style="display:inline-block;background:#5b3df5;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${esc(c.cta!.label)}</a></td></tr>` : ""}
</table>
<p style="max-width:520px;font-size:12px;line-height:1.5;color:#6b6b7b;margin:16px auto 0">You're getting this because you have a Clouta account. <a href="${SITE_URL}/settings" style="color:#6b6b7b">Change which emails you get</a>.</p>
</td></tr></table></body></html>`;
  const text = `${c.heading}\n\n${c.lines.join("\n\n")}${cta ? `\n\n${c.cta!.label}: ${cta}` : ""}\n\n---\nChange which emails you get: ${SITE_URL}/settings`;
  return { html, text };
}

/** Send one email to a Clouta member, if they want this kind of email. Never throws. */
export async function emailMember(admin: SupabaseClient, profileId: string | null, kind: Kind, content: Content) {
  if (!profileId || !emailEnabled()) return { skipped: true };
  try {
    const [{ data: u }, { data: priv }] = await Promise.all([
      admin.auth.admin.getUserById(profileId),
      admin.from("profile_private").select("email_prefs, is_minor, guardian_email").eq("id", profileId).maybeSingle(),
    ]);
    const prefs = (priv?.email_prefs ?? {}) as Partial<Record<Kind, boolean>>;
    if (prefs[kind] === false) return { skipped: true };
    const to = u?.user?.email;
    if (!to) return { skipped: true };
    // Under-18 creators: their parent or guardian is copied on order emails.
    const cc = kind === "orders" && priv?.is_minor && priv.guardian_email ? [priv.guardian_email] : undefined;
    const { html, text } = renderEmail(content);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        cc,
        subject: content.subject,
        html,
        text,
        headers: { "List-Unsubscribe": `<${SITE_URL}/settings>` },
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return { sent: true };
  } catch (err) {
    await logError(err, { route: "emailMember", kind, subject: content.subject });
    return { failed: true };
  }
}

type OrderRow = {
  id: number; title: string; brand_id: string | null; creator_id: string | null; price_cents: number; creator_fee_cents: number;
  total_cents: number; payout_cents: number | null; post_by: string; auto_approve_at: string | null; revision_note: string | null;
};

const day = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/**
 * Emails for order events (called from logOrder). Each event goes to the person who needs to act or know,
 * never to the person who just did it.
 */
export async function emailOrderEvent(admin: SupabaseClient, orderId: number, kind: string, actorId: string | null) {
  if (!emailEnabled()) return;
  const { data: o } = await admin.from("orders").select("id, title, brand_id, creator_id, price_cents, creator_fee_cents, total_cents, payout_cents, post_by, auto_approve_at, revision_note").eq("id", orderId).maybeSingle<OrderRow>();
  if (!o) return;
  const { data: people } = await admin.from("profiles").select("id, display_name").in("id", [o.brand_id, o.creator_id].filter(Boolean) as string[]);
  const name = (id: string | null) => (people ?? []).find((p) => p.id === id)?.display_name ?? (id === o.brand_id ? "The brand" : "The creator");
  const brand = name(o.brand_id);
  const creator = name(o.creator_id);
  const net = money(o.payout_cents ?? o.price_cents - o.creator_fee_cents);
  const path = `/orders/${o.id}`;
  const out: { to: string | null; c: Content }[] = [];
  const other = (id: string | null) => (id === o.brand_id ? o.creator_id : o.brand_id);

  switch (kind) {
    case "funded":
      out.push({ to: o.creator_id, c: { subject: `New order: ${o.title}`, heading: "You've been booked!", lines: [`${brand} booked "${o.title}" and paid up front. Clouta is holding the money.`, `You'll get ${net} once they approve the post. Post by ${day(o.post_by)}.`], cta: { label: "Open the order", path } } });
      out.push({ to: o.brand_id, c: { subject: `Order placed: ${o.title}`, heading: "Your order is placed", lines: [`You paid ${money(o.total_cents)}. Clouta holds it until you approve ${creator}'s post.`, `Post-by date: ${day(o.post_by)}. We'll email you when it's ready to review.`], cta: { label: "View the order", path } } });
      break;
    case "started":
      out.push({ to: o.brand_id, c: { subject: `${creator} started "${o.title}"`, heading: "Work has started", lines: [`${creator} is working on "${o.title}". It's due by ${day(o.post_by)}.`], cta: { label: "View the order", path } } });
      break;
    case "proof_submitted":
      out.push({ to: o.brand_id, c: { subject: `Ready to review: ${o.title}`, heading: "The post is live. Please review it.", lines: [`${creator} submitted the link to the live post.`, o.auto_approve_at ? `Approve it, or ask for a revision, by ${day(o.auto_approve_at)}. If you don't respond, it's approved automatically and ${creator} is paid.` : "Approve it or ask for a revision."], cta: { label: "Review the post", path } } });
      break;
    case "revision_requested":
      out.push({ to: o.creator_id, c: { subject: `Revision requested: ${o.title}`, heading: "The brand asked for a change", lines: [o.revision_note ? `"${o.revision_note}"` : "Open the order to see what they'd like changed.", "Update the post, then resubmit your link."], cta: { label: "See the request", path } } });
      break;
    case "approved":
    case "auto_approved":
      out.push({ to: o.creator_id, c: { subject: `Approved: ${o.title}`, heading: "Your post was approved 🎉", lines: [kind === "auto_approved" ? "The 3-day review window ended, so it was approved automatically." : `${brand} approved your post.`, `${net} is being released to you. Don't forget to leave ${brand} a review.`], cta: { label: "Leave a review", path: `${path}/review` } } });
      if (kind === "auto_approved") out.push({ to: o.brand_id, c: { subject: `Approved automatically: ${o.title}`, heading: "Your order was approved automatically", lines: ["The 3-day review window ended without a response, so the post was approved and the creator paid.", `How did ${creator} do? Leave a review.`], cta: { label: "Leave a review", path: `${path}/review` } } });
      else out.push({ to: o.brand_id, c: { subject: `How was ${creator}?`, heading: "Leave a quick review", lines: [`Thanks for approving "${o.title}". A short review helps other brands, and ${creator} can't see it until they review you too.`], cta: { label: "Leave a review", path: `${path}/review` } } });
      break;
    case "paid":
      out.push({ to: o.creator_id, c: { subject: `${net} is on its way`, heading: "You've been paid", lines: [`${net} for "${o.title}" was sent to your Stripe account. It reaches your bank on Stripe's payout schedule.`], cta: { label: "See your earnings", path: "/earnings" } } });
      break;
    case "payout_waiting":
      out.push({ to: o.creator_id, c: { subject: `Finish payout setup to get ${net}`, heading: "Your money is waiting", lines: [`"${o.title}" was approved, but we can't send ${net} until your payout setup is finished. It takes about 5 minutes.`], cta: { label: "Set up payouts", path: "/earnings" } } });
      break;
    case "refunded":
    case "cancelled":
      out.push({ to: o.brand_id, c: { subject: `${kind === "refunded" ? "Refunded" : "Cancelled"}: ${o.title}`, heading: kind === "refunded" ? "Your order was refunded" : "Your order was cancelled", lines: [kind === "refunded" ? "The money goes back to your card. Banks usually show it within 5–10 days." : "Nothing was charged."], cta: { label: "View the order", path } } });
      out.push({ to: o.creator_id, c: { subject: `Order cancelled: ${o.title}`, heading: "This order was cancelled", lines: [`"${o.title}" with ${brand} was cancelled${kind === "refunded" ? " and refunded" : ""}.`], cta: { label: "View the order", path } } });
      break;
    case "extended":
      out.push({ to: other(actorId), c: { subject: `New post-by date: ${o.title}`, heading: "The post-by date changed", lines: [`"${o.title}" is now due by ${day(o.post_by)}.`], cta: { label: "View the order", path } } });
      break;
    case "dispute_opened":
      out.push({ to: other(actorId), c: { subject: `Dispute opened: ${o.title}`, heading: "A dispute needs your reply", lines: [`A dispute was opened on "${o.title}". The money stays held while the Clouta team looks at it.`, "Add your side within 48 hours so we can make a fair decision."], cta: { label: "Respond", path } } });
      break;
    case "dispute_response":
      out.push({ to: other(actorId), c: { subject: `Reply to your dispute: ${o.title}`, heading: "They responded to your dispute", lines: ["The Clouta team will review both sides and decide soon."], cta: { label: "Read the reply", path } } });
      break;
    case "dispute_withdrawn":
      out.push({ to: other(actorId), c: { subject: `Dispute withdrawn: ${o.title}`, heading: "The dispute was withdrawn", lines: ["The order is back on track."], cta: { label: "View the order", path } } });
      break;
    case "dispute_resolved":
      for (const to of [o.brand_id, o.creator_id]) out.push({ to, c: { subject: `Dispute decided: ${o.title}`, heading: "The Clouta team made a decision", lines: ["Open the order to see the outcome and any money that moved."], cta: { label: "See the decision", path } } });
      break;
    case "reviewed":
      out.push({ to: other(actorId), c: { subject: `You got a review for "${o.title}"`, heading: "Leave yours to see it", lines: ["Reviews stay hidden until you both leave one (or 14 days pass). Leave yours and both go public."], cta: { label: "Leave a review", path: `${path}/review` } } });
      break;
  }
  for (const e of out) if (e.to && e.to !== actorId) await emailMember(admin, e.to, "orders", e.c);
}
