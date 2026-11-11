import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import OnboardingFlow from "./OnboardingFlow";

export const metadata: Metadata = { title: "Set up your account · Clouta" };

export default async function OnboardingPage() {
  const { user, profile } = await requireProfile({ allowUnonboarded: true });
  if (profile.onboarded_at) redirect("/settings/account");
  return (
    <AuthShell wide>
      <OnboardingFlow userId={user.id} email={user.email ?? ""} />
    </AuthShell>
  );
}
