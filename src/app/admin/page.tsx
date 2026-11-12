import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AppShell } from "@/components/AppShell";
import { AdminHeader } from "./AdminNav";

export const metadata: Metadata = { title: "Admin · Clouta", robots: { index: false } };

export default async function AdminHome() {
  const { profile } = await requireProfile();
  if (!profile.is_admin) notFound();
  const admin = getSupabaseAdmin();
  if (!admin) notFound();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [reports, disputes, verifications, users, activeOrders] = await Promise.all([
    count(admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    count(admin.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open")),
    count(admin.from("social_accounts").select("id", { count: "exact", head: true }).eq("verified", false).not("verify_requested_at", "is", null)),
    count(admin.from("profiles").select("id", { count: "exact", head: true }).not("onboarded_at", "is", null)),
    count(admin.from("orders").select("id", { count: "exact", head: true }).in("status", ["funded", "in_progress", "proof_submitted", "revision_requested", "disputed"])),
  ]);
  const cards = [
    { label: "Open reports", value: reports, href: "/admin/reports", urgent: reports > 0 },
    { label: "Open disputes", value: disputes, href: "/admin/disputes", urgent: disputes > 0 },
    { label: "Verifications waiting", value: verifications, href: "/admin/verifications", urgent: verifications > 0 },
    { label: "Active orders", value: activeOrders, href: null, urgent: false },
    { label: "Members", value: users, href: null, urgent: false },
  ];
  return (
    <AppShell profile={profile} active="admin">
      <AdminHeader title="Admin" active="overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => {
          const inner = (
            <>
              <p className="text-sm font-bold text-ink">{c.label}</p>
              <p className={`mt-1 text-4xl font-extrabold tracking-[-0.03em] ${c.urgent ? "text-err" : ""}`}>{c.value}</p>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="panel p-5 hover:shadow-lg">{inner}</Link>
          ) : (
            <div key={c.label} className="panel p-5">{inner}</div>
          );
        })}
      </div>
    </AppShell>
  );
}
