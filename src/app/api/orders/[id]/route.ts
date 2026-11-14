import { logError } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripe, FEES } from "@/lib/stripe";
import { approveOrder, logOrder, refundOrder, type Order } from "@/lib/orders";
import { checkProofLinks } from "@/lib/fraud";

type Action =
  | { action: "start" }
  | { action: "submit"; links: string[]; note?: string; keep_live?: boolean }
  | { action: "revision"; note: string }
  | { action: "approve" }
  | { action: "cancel"; reason?: string }
  | { action: "extend"; post_by: string }
  | { action: "resume_checkout" };

const today = () => new Date().toISOString().slice(0, 10);

/** Every order status change goes through here, checked against who is asking and the order's current state. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Action;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Orders aren't available right now." }, { status: 503 });

  const { data: order } = await admin.from("orders").select("*").eq("id", Number(id)).single<Order>();
  if (!order || ![order.brand_id, order.creator_id].includes(user.id)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const isBrand = user.id === order.brand_id;
  const isCreator = user.id === order.creator_id;
  const fail = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
  const now = new Date().toISOString();

  try {
    switch (body.action) {
      case "start": {
        if (!isCreator || order.status !== "funded") return fail("This order can't be started.");
        await admin.from("orders").update({ status: "in_progress", started_at: now }).eq("id", order.id);
        await logOrder(admin, order, "started", user.id, "The creator started work.", "The creator has started working on this order.");
        break;
      }
      case "submit": {
        if (!isCreator || !["funded", "in_progress", "revision_requested"].includes(order.status)) return fail("You can't submit proof right now.");
        const links = (Array.isArray(body.links) ? body.links : []).map((l) => String(l).trim()).filter(Boolean).slice(0, 5);
        if (links.length === 0) return fail("Add at least one link to the live post.");
        if (links.some((l) => !/^https:\/\/[^\s]+\.[^\s]+$/i.test(l) || l.length > 500)) return fail("Links must be full https:// addresses.");
        // Proof must be a real post on a social platform, and if the link names an account it must be one of the creator's verified ones
        // (stops "here's someone else's post" and links to look-alike or phishing sites).
        const { data: verified } = await admin.from("social_accounts").select("platform, handle").eq("profile_id", user.id).eq("verified", true);
        const linkError = checkProofLinks(links, (verified ?? []) as { platform: string; handle: string }[]);
        if (linkError) return fail(linkError);
        if (!body.keep_live) return fail("Confirm you'll keep the post up for at least 30 days.");
        const note = (body.note ?? "").trim().slice(0, 1000) || null;
        const autoAt = new Date(Date.now() + FEES.reviewWindowDays * 86400000).toISOString();
        await admin.from("orders").update({ status: "proof_submitted", proof_links: links, proof_note: note, submitted_at: now, auto_approve_at: autoAt, started_at: order.started_at ?? now }).eq("id", order.id);
        await logOrder(admin, order, "proof_submitted", user.id, `Submitted ${links.length} link(s). Creator agreed to keep the post up for 30 days.`,
          `The creator submitted proof. The brand has ${FEES.reviewWindowDays} days to approve or request a revision, after which it's approved automatically.`);
        break;
      }
      case "revision": {
        if (!isBrand || order.status !== "proof_submitted") return fail("You can't request a revision right now.");
        if (order.revisions_used >= order.revisions_allowed) return fail(order.revisions_allowed === 0 ? "This order doesn't include revisions." : "All included revisions have been used.");
        const note = (body.note ?? "").trim();
        if (note.length < 5) return fail("Tell the creator what to change.");
        await admin.from("orders").update({ status: "revision_requested", revisions_used: order.revisions_used + 1, revision_note: note.slice(0, 1000), auto_approve_at: null }).eq("id", order.id);
        await logOrder(admin, order, "revision_requested", user.id, note.slice(0, 1000), `The brand requested a revision: "${note.slice(0, 300)}"`);
        break;
      }
      case "approve": {
        if (!isBrand || order.status !== "proof_submitted") return fail("This order can't be approved right now.");
        await approveOrder(admin, order, user.id);
        break;
      }
      case "cancel": {
        if (order.status === "awaiting_payment") {
          if (!isBrand) return fail("Only the brand can cancel an unpaid order.");
          const stripe = getStripe();
          if (stripe && order.stripe_checkout_session) await stripe.checkout.sessions.expire(order.stripe_checkout_session).catch(() => null);
          await admin.from("orders").update({ status: "cancelled", cancelled_at: now }).eq("id", order.id);
          break;
        }
        const missedDeadline = order.post_by < today() && ["funded", "in_progress", "revision_requested"].includes(order.status);
        if (order.status === "funded") {
          await refundOrder(admin, order, user.id, isBrand ? "The brand cancelled before work started." : "The creator declined the order before starting.");
        } else if (isBrand && missedDeadline) {
          await refundOrder(admin, order, user.id, "The post-by date passed without proof.");
        } else {
          return fail(order.status === "in_progress" ? "Work has started. You can cancel if the post-by date passes without proof." : "This order can't be cancelled now.");
        }
        break;
      }
      case "extend": {
        if (!isBrand || !["funded", "in_progress", "revision_requested"].includes(order.status)) return fail("You can't change the date now.");
        if (!body.post_by || body.post_by <= order.post_by || body.post_by <= today()) return fail("Choose a later date.");
        await admin.from("orders").update({ post_by: body.post_by }).eq("id", order.id);
        await logOrder(admin, order, "extended", user.id, `New post-by date ${body.post_by}.`, `The brand moved the post-by date to ${new Date(body.post_by + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`);
        break;
      }
      case "resume_checkout": {
        if (!isBrand || order.status !== "awaiting_payment" || !order.stripe_checkout_session) return fail("Nothing to pay.");
        const stripe = getStripe();
        const session = stripe ? await stripe.checkout.sessions.retrieve(order.stripe_checkout_session) : null;
        if (!session?.url || session.status !== "open") return fail("This checkout expired. Start a new booking.");
        return NextResponse.json({ url: session.url });
      }
      default:
        return fail("Unknown action.");
    }
  } catch (err) {
    await logError(err, { route: "POST /api/orders/[id]", userId: user.id, orderId: order.id, action: body.action });
    return fail("Something went wrong with the payment provider. Please try again.", 502);
  }
  return NextResponse.json({ ok: true });
}
