import type { PlatformKey } from "@/lib/platforms";

/** One row from the search_creators() database function. */
export type CreatorResult = {
  id: string;
  handle: string;
  display_name: string;
  tagline: string | null;
  niches: string[];
  theme: "violet" | "sunset" | "ocean" | "gold" | "midnight";
  avatar_source: "auto" | "pattern" | "upload";
  avatar_pattern: number;
  avatar_url: string | null;
  is_founding: boolean;
  young_tag: boolean;
  taking_bookings: boolean;
  min_price_cents: number;
  service_count: number;
  platforms: PlatformKey[];
  verified_followers: number;
  total_followers: number;
  has_verified: boolean;
  main_platform: PlatformKey | null;
  published_at: string;
  avg_rating: number | null;
  review_count: number;
  badges: string[];
};

export type Service = {
  id: number;
  post_id: number;
  name: string;
  includes: string | null;
  price_cents: number;
  turnaround_days: number;
  revisions: number;
  is_bundle: boolean;
  position: number;
};

export type Post = {
  id: number;
  creator_id: string;
  bio: string | null;
  platforms: PlatformKey[];
  published: boolean;
};
