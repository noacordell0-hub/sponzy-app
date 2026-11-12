import { refreshCreatorPayouts } from "@/lib/payouts";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getStripe, priceBreakdown } from "@/lib/stripe";

type Body = { service_id?: number; offer_message_id?: number; brief?: string; post_by?: string; tag?: string };

/**
 * Brands: create an order from a listed service or an accepted offer, then send them to Stripe Checkout.
 * Card details are collected only on Stripe's hosted page. The money is held on the platform until approval.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to book." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return NextResponse.json({ error: "Booking isn't available yet." }, { status: 503 });

  const { data: brand } = await admin.from("profiles").select("id, role, banned_at, onboarded_at").eq("id", user.id).single();
  if (brand?.role !== "brand" || brand.banned_at || !brand.onboarded_at) {
    return NextResponse.json({ error: "Only brand accounts can book creators." }, { status: 403 });
  }

  const brief = (body.brief ?? "").trim();
  const tag = (body.tag ?? "").trim().slice(0, 80) || null;
  if (brief.length < 10) return NextResponse.json({ error: "Write a brief of at least 10 characters." }, { status: 400 });
  if (brief.length > 4000) return NextResponse.json({ error: "Keep the brief under 4,000 characters." }, { status: 400 });

  // Work out what is being bought.
  let item: { creatorId: string; title: string; includes: string | null; price: number; days: number; revisions: number; serviceId: number | null; offerId: number | null; threadId: number | null };
  if (body.service_id) {
    const { data: svc } = await admin.from("services").select("id, name, includes, price_cents, turnaround_days, revisions, posts!inner(creator_id, published)").eq("id", body.service_id).single();
    const post = (svc as unknown as { posts: { creator_id: string; published: boolean } } | null)?.posts;
    if (!svc || !post?.published) return NextResponse.json({ error: "That service isn't available." }, { status: 404 });
    item = { creatorId: post.creator_id, title: svc.name, includes: svc.includes, price: svc.price_cents, days: svc.turnaround_days, revisions: svc.revisions, serviceId: svc.id, offerId: null, threadId: null };
  } else if (body.offer_message_id) {
    const { data: msg } = await admin.from("messages").select("id, thread_id, sender_id, kind, offer, offer_status, threads!inner(a_id, b_id)").eq("id", body.offer_message_id).single();
    const t = (msg as unknown as { threads: { a_id: string; b_id: string } } | null)?.threads;
    if (!msg || msg.kind !== "offer" || !t || ![t.a_id, t.b_id].includes(user.id)) return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    if (msg.offer_status !== "accepted") return NextResponse.json({ error: "This offer hasn't been accepted." }, { status: 400 });
    const o = msg.offer as { title: string; price_cents: number; turnaround_days: number; revisions: number; includes: string | null };
    item = { creatorId: t.a_id === user.id ? t.b_id : t.a_id, title: o.title, includes: o.includes, price: o.price_cents, days: o.turnaround_days, revisions: o.revisions, serviceId: null, offerId: msg.id, threadId: msg.thread_id };
  } else {
    return NextResponse.json({ error: "Choose a service." }, { status: 400 });
  }

  const { data: creator } = await admin.from("profiles").select("id, role, display_name, is_founding, taking_bookings, payouts_ready, banned_at").eq("id", item.creatorId).single();
  if (!creator || creator.role !== "creator" || creator.banned_at) return NextResponse.json({ error: "That creator isn't available." }, { status: 404 });
  if (!creator.taking_bookings) return NextResponse.json({ error: `${creator.display_name} isn't taking bookings right now.` }, { status: 409 });
  if (!creator.payouts_ready && (await refreshCreatorPayouts(admin, creator.id))) creator.payouts_ready = true;
  if (!creator.payouts_ready) return NextResponse.json({ error: `${creator.display_name} hasn't finished payout setup yet, so they can't be booked. Message them to let them know!` }, { status: 409 });

  const minDate = new Date();
  minDate.setUTCDate(minDate.getUTCDate() + 1);
  const postBy = new Date(`${body.post_by}T00:00:00Z`);
  const maxDate = new Date();
  maxDate.setUTCDate(maxDate.getUTCDate() + 180);
  if (Number.isNaN(postBy.getTime()) || postBy < new Date(minDate.toISOString().slice(0, 10)) || postBy > maxDate) {
    return NextResponse.json({ error: "Choose a post-by date from tomorrow up to 6 months ahead." }, { status: 400 });
  }

  const p = priceBreakdown(item.price, creator.is_founding);
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      brand_id: user.id,
      creator_id: creator.id,
      service_id: item.serviceId,
      offer_message_id: item.offerId,
      thread_id: item.threadId,
      title: item.title,
      includes: item.includes,
      price_cents: item.price,
      fee_rate: p.feeRate,
      creator_fee_cents: p.creatorFeeCents,
      brand_fee_cents: p.brandFeeCents,
      total_cents: p.totalCents,
      turnaround_days: item.days,
      revisions_allowed: item.revisions,
      brief,
      tag,
      post_by: body.post_by,
    })
    .select("id")
    .single();
  if (error || !order) {
    if (error?.code === "23505") return NextResponse.json({ error: "This offer already has an order." }, { status: 409 });
    console.error("[checkout] insert", error?.message);
    return NextResponse.json({ error: "Couldn't create the order." }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      { quantity: 1, price_data: { currency: "usd", unit_amount: item.price, product_data: { name: `${item.title} · ${creator.display_name}` } } },
      { quantity: 1, price_data: { currency: "usd", unit_amount: p.brandFeeCents, product_data: { name: "Payment processing" } } },
    ],
    payment_intent_data: { transfer_group: `order_${order.id}`, metadata: { order_id: String(order.id) }, description: `Clouta order #${order.id}` },
    metadata: { order_id: String(order.id) },
    success_url: `${origin}/orders/${order.id}?paid=1`,
    cancel_url: `${origin}/orders/${order.id}?checkout=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  });
  await admin.from("orders").update({ stripe_checkout_session: session.id }).eq("id", order.id);
  return NextResponse.json({ url: session.url, order_id: order.id });
}
