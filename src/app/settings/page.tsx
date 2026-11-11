import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = { title: "Settings · Clouta" };

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireProfile();
  const { data: priv } = await supabase.from("profile_private").select("email_prefs, is_minor, guardian_email").eq("id", user.id).maybeSingle();
  const prefs = (priv?.email_prefs as { orders: boolean; messages: boolean; product: boolean } | undefined) ?? { orders: true, messages: true, product: true };

  return (
    <AppShell profile={profile} active="settings">
      <h1 className="on-bg mb-8 text-3xl font-extrabold tracking-[-0.03em]">Settings</h1>
      <SettingsForm
        userId={user.id}
        email={user.email ?? ""}
        deepSpace={profile.deep_space}
        prefs={prefs}
        guardianEmail={priv?.is_minor ? (priv.guardian_email ?? null) : null}
      />
    </AppShell>
  );
}
