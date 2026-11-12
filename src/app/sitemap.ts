import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600; // rebuild the sitemap at most once an hour

/** Public pages plus every published creator shop. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/browse`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return pages;
  try {
    // Public data only (the publishable key + Row Level Security): published shops of active creators.
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase.from("posts").select("updated_at, profiles!inner(handle, role)").eq("published", true).eq("profiles.role", "creator").limit(5000);
    for (const row of (data ?? []) as unknown as { updated_at: string; profiles: { handle: string } }[]) {
      if (row.profiles?.handle) pages.push({ url: `${SITE_URL}/c/${row.profiles.handle}`, lastModified: new Date(row.updated_at), changeFrequency: "weekly", priority: 0.7 });
    }
  } catch {
    /* sitemap still lists the main pages */
  }
  return pages;
}
