import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import type { Order } from "@/lib/orders";
import DeliverForm from "./DeliverForm";

export const metadata: Metadata = { title: "Submit proof · Clouta" };

export default async function DeliverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireProfile();
  const { data: order } = await supabase.from("orders").select("*").eq("id", Number(id)).maybeSingle<Order>();
  if (!order) notFound();
  if (order.creator_id !== user.id || !["funded", "in_progress", "revision_requested"].includes(order.status)) redirect(`/orders/${order.id}`);

  return (
    <AppShell profile={profile} active="orders">
      <Link href={`/orders/${order.id}`} className="on-bg-muted text-sm font-semibold text-body">
        ← Back to order
      </Link>
      <h1 className="on-bg mb-2 mt-3 text-3xl font-extrabold tracking-[-0.03em]">Submit proof</h1>
      <p className="on-bg-muted mb-8 text-[15px] text-body">
        {order.title} · #{order.id}
      </p>
      <DeliverForm orderId={order.id} initialLinks={order.proof_links} revisionNote={order.status === "revision_requested" ? order.revision_note : null} />
    </AppShell>
  );
}
