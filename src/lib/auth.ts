import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "creator" | "brand" | "admin" | null;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
  tagline: string | null;
  audience: string | null;
  niches: string[];
  location: string | null;
  theme: "violet" | "sunset" | "ocean" | "gold" | "midnight";
  avatar_source: "auto" | "pattern" | "upload";
  avatar_pattern: number;
  avatar_url: string | null;
  taking_bookings: boolean;
  deep_space: boolean;
  show_badges: boolean;
  show_audience: boolean;
  show_comments: boolean;
  show_rank: boolean;
  young_tag: boolean;
  is_founding: boolean;
  is_admin: boolean;
  onboarded_at: string | null;
  website: string | null;
  budget: string | null;
  payouts_ready: boolean;
  banned_at: string | null;
  ban_until: string | null;
};

export type Social = {
  id: number;
  platform: "tiktok" | "instagram" | "youtube" | "x" | "twitch" | "facebook";
  handle: string;
  followers: number;
  verified: boolean;
  is_main: boolean;
  verify_code: string | null;
  verify_requested_at: string | null;
};

/** Signed-in user plus profile. Redirects to login, or to onboarding if it isn't finished. */
export async function requireProfile({ allowUnonboarded = false } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login");
  if (!profile.onboarded_at && !allowUnonboarded) redirect("/onboarding");

  return { supabase, user, profile };
}

/** Signed-in, onboarded profile if there is one; null for visitors. Never redirects. */
export async function getOptionalProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { supabase, user, profile: profile?.onboarded_at ? profile : null };
}
