import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { logOrder, type Order } from "@/lib/orders";
import { syncAccount } from "@/lib/payouts";
import { money } from "@/lib/format";

/**
 * Stripe → Clouta notifications. The signature is checked with STRIPE_WEBHOOK_SECRET before anything happens.
 * Handles: payment completed or expired, refunds, and creator payout-account updates.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  // Two endpoints in Stripe: platform events (payments, refunds) and Connect events (creator accounts).
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  if (!stripe || !admin || secrets.length === 0) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
      break;
    } catch {
      /* try the next secret */
    }
  }
  if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") break;
        const orderId = Number(session.metadata?.order_id);
        const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        let charge: string | null = null;
        if (pi) {
          const intent = await stripe.paymentIntents.retrieve(pi);
          charge = typeof intent.latest_charge === "string" ? intent.latest_charge : (intent.latest_charge?.id ?? null);
        }
        const { data: order } = await admin
          .from("orders")
          .update({ status: "funded", funded_at: new Date().toISOString(), stripe_payment_intent: pi, stripe_charge: charge })
          .eq("id", orderId)
          .eq("status", "awaiting_payment")
          .select()
          .single<Order>();
        if (order) {
          await logOrder(admin, order, "funded", order.brand_id, `Paid ${money(order.total_cents)}.`,
            `New order: "${order.title}" for ${money(order.price_cents)}. The payment is held by Clouta until the work is approved. Post by ${new Date(order.post_by + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`);
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await admin.from("orders").update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", Number(session.metadata?.order_id)).eq("status", "awaiting_payment");
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (!charge.refunded) break;
        const { data: order } = await admin.from("orders").select("*").eq("stripe_charge", charge.id).maybeSingle<Order>();
        if (order && order.status !== "refunded") {
          const now = new Date().toISOString();
          await admin.from("orders").update({ status: "refunded", refunded_at: now, cancelled_at: order.cancelled_at ?? now }).eq("id", order.id);
          await logOrder(admin, order, "refunded", null, "Refunded through Stripe.");
        }
        break;
      }
      case "account.updated": {
        await syncAccount(admin, event.data.object as Stripe.Account);
        break;
      }
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
