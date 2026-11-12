import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import CheckoutForm from "@/components/CheckoutForm";
import { priceBreakdown } from "@/lib/stripe";

export const metadata: Metadata = { title: "Checkout · Clouta" };

export default async function ServiceCheckout({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const { supabase, profile } = await requireProfile();
  const { data: svc } = await supabase.from("services").select("*, posts!inner(creator_id, published)").eq("id", Number(serviceId)).maybeSingle();
  if (!svc) notFound();
  const creatorId = (svc as { posts: { creator_id: string } }).posts.creator_id;
  const { data: creator } = await supabase.from("profiles").select("*").eq("id", creatorId).single();
  if (!creator) notFound();

  const p = priceBreakdown(svc.price_cents, creator.is_founding);
  let blocked = "";
  if (profile.role !== "brand") blocked = "Only brand accounts can book creators.";
  else if (!creator.taking_bookings) blocked = `${creator.display_name} isn't taking bookings right now.`;
  else if (!creator.payouts_ready) blocked = `${creator.display_name} hasn't finished payout setup yet, so they can't be booked. Send them a message to let them know you're interested.`;

  return (
    <AppShell profile={profile} active="browse">
      <div className="mb-8 flex items-center gap-4">
        <Avatar name={creator.display_name} source={creator.avatar_source} pattern={creator.avatar_pattern} url={creator.avatar_url} size={52} rounded={16} />
        <div>
          <h1 className="on-bg text-2xl font-extrabold tracking-[-0.03em]">Book {creator.display_name}</h1>
          <Link href={`/c/${creator.handle}`} className="on-bg-muted text-sm font-semibold text-violet-deep">
            View profile
          </Link>
        </div>
      </div>
      <CheckoutForm
        serviceId={svc.id}
        title={svc.name}
        includes={svc.includes}
        priceCents={svc.price_cents}
        brandFeeCents={p.brandFeeCents}
        turnaroundDays={svc.turnaround_days}
        revisions={svc.revisions}
        creatorName={creator.display_name}
        canBook={!blocked}
        blockedReason={blocked}
      />
    </AppShell>
  );
}
