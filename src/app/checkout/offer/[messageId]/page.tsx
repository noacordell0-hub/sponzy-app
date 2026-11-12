import { getSupabaseAdmin } from "@/lib/supabase-server";
import { refreshCreatorPayouts } from "@/lib/payouts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import CheckoutForm from "@/components/CheckoutForm";
import { priceBreakdown } from "@/lib/stripe";
import type { Offer } from "@/lib/chat";

export const metadata: Metadata = { title: "Checkout · Clouta" };

export default async function OfferCheckout({ params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const { supabase, user, profile } = await requireProfile();
  const { data: msg } = await supabase.from("messages").select("*, threads!inner(a_id, b_id)").eq("id", Number(messageId)).maybeSingle();
  if (!msg || msg.kind !== "offer") notFound();
  const t = (msg as { threads: { a_id: string; b_id: string } }).threads;
  const otherId = t.a_id === user.id ? t.b_id : t.a_id;
  const { data: creator } = await supabase.from("profiles").select("*").eq("id", otherId).single();
  if (!creator) notFound();
  const offer = msg.offer as Offer;
  // Stripe may have confirmed their payout setup since Clouta last checked.
  if (!creator.payouts_ready) {
    const admin = getSupabaseAdmin();
    if (admin && (await refreshCreatorPayouts(admin, creator.id))) creator.payouts_ready = true;
  }
  const p = priceBreakdown(offer.price_cents, creator.is_founding);

  let blocked = "";
  if (profile.role !== "brand" || creator.role !== "creator") blocked = "Only the brand in this conversation can pay for the offer.";
  else if (msg.offer_status !== "accepted") blocked = "This offer hasn't been accepted.";
  else if (!creator.payouts_ready) blocked = `${creator.display_name} hasn't finished payout setup yet. Let them know in your conversation.`;

  return (
    <AppShell profile={profile} active="messages">
      <div className="mb-8 flex items-center gap-4">
        <Avatar name={creator.display_name} source={creator.avatar_source} pattern={creator.avatar_pattern} url={creator.avatar_url} size={52} rounded={16} />
        <h1 className="on-bg text-2xl font-extrabold tracking-[-0.03em]">Check out: offer from {creator.display_name}</h1>
      </div>
      <CheckoutForm
        offerMessageId={msg.id}
        title={offer.title}
        includes={offer.includes}
        priceCents={offer.price_cents}
        brandFeeCents={p.brandFeeCents}
        turnaroundDays={offer.turnaround_days}
        revisions={offer.revisions}
        creatorName={creator.display_name}
        canBook={!blocked}
        blockedReason={blocked}
      />
    </AppShell>
  );
}
