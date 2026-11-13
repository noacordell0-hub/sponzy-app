import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

/** After logging in, send people to the right place: finish setup, the creator Home, or the brand dashboard. */
export default async function HomeRedirect() {
  const { profile } = await requireProfile();
  if (!profile.onboarded_at) redirect("/onboarding");
  redirect(profile.role === "brand" ? "/brand" : "/dashboard");
}
