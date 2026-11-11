import type { Metadata } from "next";
import { requireProfile, type Social } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import AccountForm from "./AccountForm";

export const metadata: Metadata = { title: "Account · Clouta" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  const [{ data: socials }, { data: priv }] = await Promise.all([
    supabase.from("social_accounts").select("*").eq("profile_id", user.id).order("followers", { ascending: false }),
    supabase.from("profile_private").select("is_minor").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <AppShell profile={profile} active="account">
      {welcome && (
        <div role="status" className="chip-pop mb-6 rounded-2xl border border-black/[.06] bg-ok-bg px-5 py-4 text-ok">
          <p className="font-bold">Welcome to Clouta, {profile.display_name}!</p>
          <p className="text-sm">Your account is set up. Make your profile yours below.</p>
        </div>
      )}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="on-bg text-3xl font-extrabold tracking-[-0.03em]">Make your profile yours</h1>
        {profile.is_founding && <span className="badge-gold rounded-full px-3 py-1 text-xs font-semibold">Founding Creator</span>}
        <span className="badge-violet rounded-full px-3 py-1 text-xs font-semibold capitalize">{profile.role}</span>
      </div>
      <AccountForm profile={profile} socials={(socials as Social[]) ?? []} isMinor={Boolean(priv?.is_minor)} />
    </AppShell>
  );
}
