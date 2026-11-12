import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import VerificationQueue from "./VerificationQueue";

export const metadata: Metadata = { title: "Verifications · Clouta Admin", robots: { index: false } };

type Pending = {
  id: number;
  platform: "tiktok" | "instagram" | "youtube" | "x" | "twitch" | "facebook";
  handle: string;
  followers: number;
  verify_code: string;
  verify_requested_at: string;
  display_name: string | null;
  profile_handle: string | null;
  is_minor: boolean;
};

export default async function AdminVerificationsPage() {
  const { supabase, profile } = await requireProfile();
  if (!profile.is_admin) notFound(); // checked again in the database for every action
  const { data } = await supabase.rpc("admin_pending_verifications");

  return (
    <AppShell profile={profile} active="admin">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="on-bg text-3xl font-extrabold tracking-[-0.03em]">Social verifications</h1>
        <span className="rounded-full bg-err-bg px-3 py-1 text-xs font-semibold text-err">Team only</span>
      </div>
      <VerificationQueue initial={(data as Pending[]) ?? []} />
    </AppShell>
  );
}
