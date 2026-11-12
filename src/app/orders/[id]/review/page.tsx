import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AppShell } from "@/components/AppShell";
import { reviewEligibility } from "@/lib/reviews";
import type { Order } from "@/lib/orders";
import { TAGS_FOR_BRAND, TAGS_FOR_CREATOR } from "@/lib/trust";
import ReviewForm from "./ReviewForm";

export const metadata: Metadata = { title: "Leave a review · Clouta" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireProfile();
  const { data: order } = await supabase.from("orders").select("*").eq("id", Number(id)).maybeSingle<Order>();
  if (!order) notFound();
  const admin = getSupabaseAdmin();
  if (!admin) redirect(`/orders/${order.id}`);
  const elig = await reviewEligibility(admin, order, user.id);
  const isBrand = order.brand_id === user.id;
  const otherId = isBrand ? order.creator_id : order.brand_id;
  const { data: other } = otherId ? await supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle() : { data: null };
  const name = other?.display_name ?? "them";

  return (
    <AppShell profile={profile} active="orders">
      <Link href={`/orders/${order.id}`} className="on-bg-muted text-sm font-semibold text-body">
        ← Back to order
      </Link>
      <h1 className="on-bg mt-3 text-3xl font-extrabold tracking-[-0.03em]">Review {name}</h1>
      <p className="on-bg-muted mt-1 text-sm text-ink-2">
        {order.title} · #{order.id}
      </p>
      {elig.ok ? (
        <ReviewForm
          orderId={order.id}
          otherName={name}
          reviewingCreator={isBrand}
          tags={isBrand ? TAGS_FOR_CREATOR : TAGS_FOR_BRAND}
          closes={elig.closes.toISOString()}
        />
      ) : (
        <div className="panel mt-6 max-w-2xl p-6">
          <p className="font-semibold">{elig.reason}</p>
          {"already" in elig && elig.already && !elig.revealed && (
            <p className="mt-2 text-sm text-body">Your review stays hidden until {name} leaves theirs, or 14 days after approval.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
