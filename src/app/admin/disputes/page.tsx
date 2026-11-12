import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AppShell } from "@/components/AppShell";
import { money } from "@/lib/format";
import { DISPUTE_REASONS } from "@/lib/dispute-labels";
import type { Dispute } from "@/lib/disputes";
import { AdminHeader } from "../AdminNav";

export const metadata: Metadata = { title: "Disputes · Clouta Admin", robots: { index: false } };

export default async function AdminDisputes({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const { profile } = await requireProfile();
  if (!profile.is_admin) notFound();
  const admin = getSupabaseAdmin();
  if (!admin) notFound();
  const closed = show === "closed";
  let q = admin.from("disputes").select("*, orders!inner(id, title, price_cents, brand_id, creator_id)").order("created_at", { ascending: !closed }).limit(100);
  q = closed ? q.neq("status", "open") : q.eq("status", "open");
  const { data } = await q;
  const rows = (data ?? []) as (Dispute & { orders: { id: number; title: string; price_cents: number } })[];

  return (
    <AppShell profile={profile} active="admin">
      <AdminHeader title="Disputes" active="disputes" />
      <div className="mb-4 flex gap-3 text-sm font-semibold">
        <Link href="/admin/disputes" className={closed ? "text-ink-2" : "text-violet-deep"}>Open</Link>
        <Link href="/admin/disputes?show=closed" className={closed ? "text-violet-deep" : "text-ink-2"}>Closed</Link>
      </div>
      {rows.length === 0 ? (
        <p className="panel p-6 text-sm text-body">{closed ? "No closed disputes yet." : "No open disputes. 🎉"}</p>
      ) : (
        <ul className="panel divide-y divide-black/[.06]">
          {rows.map((d) => {
            const ready = d.responded_at || new Date(d.respond_by) < new Date();
            return (
              <li key={d.id}>
                <Link href={`/admin/disputes/${d.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-black/[.02]">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">#{d.orders.id} {d.orders.title} · {money(d.orders.price_cents)}</p>
                    <p className="text-xs text-ink-2">
                      Opened by the {d.opener_role} · {DISPUTE_REASONS[d.reason]?.label ?? d.reason} · {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {d.status === "open" ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-err-bg text-err" : "bg-[#FFF4D6] text-[#7A5200]"}`}>
                      {d.responded_at ? "Ready to decide" : ready ? "No response · ready" : `Waiting for reply until ${new Date(d.respond_by).toLocaleString()}`}
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/[.05] px-2.5 py-1 text-xs font-semibold text-ink-2">{d.status === "withdrawn" ? "Withdrawn" : `Resolved: ${d.decision}${d.decision === "split" ? ` ${d.split_pct}%` : ""}`}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
