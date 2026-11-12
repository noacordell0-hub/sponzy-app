/** Client-safe trust labels: badges, orbit levels, tiers, review tags. Numbers come from the trust_scores table. */

export type Trust = {
  profile_id: string;
  score: number;
  tier: "new" | "trusted" | "highly_trusted";
  completed: number;
  on_time_rate: number | null;
  avg_rating: number | null;
  review_count: number;
  rehire_rate: number | null;
  repeat_partners: number;
  streak: number;
  best_streak: number;
  disputes_lost: number;
  points: number;
  level: string;
};

export type BadgeCode = "founding" | "verified_socials" | "top_rated" | "on_time_pro" | "hot_streak" | "cosmic_collab" | "elite" | "fifty_collabs";

export const BADGES: Record<BadgeCode, { name: string; desc: string; icon: string; tone: "gold" | "violet" | "ok" }> = {
  founding: { name: "Founding Creator", desc: "Joined before Clouta launched", icon: "★", tone: "gold" },
  verified_socials: { name: "Verified socials", desc: "Follower counts checked by Clouta", icon: "✓", tone: "ok" },
  top_rated: { name: "Top Rated", desc: "4.8+ stars over 10 or more reviews", icon: "♛", tone: "gold" },
  on_time_pro: { name: "On-Time Pro", desc: "10 orders in a row delivered on time", icon: "⏱", tone: "ok" },
  hot_streak: { name: "Hot Streak", desc: "5 orders in a row delivered on time", icon: "🔥", tone: "violet" },
  cosmic_collab: { name: "Cosmic Collab", desc: "Completed a first paid collab on Clouta", icon: "✦", tone: "violet" },
  elite: { name: "Elite", desc: "40 completed collabs", icon: "◆", tone: "gold" },
  fifty_collabs: { name: "50 Collabs", desc: "50 completed collabs", icon: "50", tone: "gold" },
};
export const BADGE_ORDER: BadgeCode[] = ["top_rated", "on_time_pro", "hot_streak", "elite", "fifty_collabs", "verified_socials", "founding", "cosmic_collab"];

export const LEVELS = [
  { key: "comet", name: "Comet", min: 0 },
  { key: "meteor", name: "Meteor", min: 50 },
  { key: "moon", name: "Moon", min: 150 },
  { key: "planet", name: "Planet", min: 400 },
  { key: "star", name: "Star", min: 1000 },
  { key: "supernova", name: "Supernova", min: 2500 },
] as const;

export function levelInfo(points: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].min) i++;
  const next = LEVELS[i + 1];
  return { level: LEVELS[i], next, toNext: next ? next.min - points : 0, pct: next ? (points - LEVELS[i].min) / (next.min - LEVELS[i].min) : 1 };
}

export const TIER_LABEL: Record<Trust["tier"], string> = { new: "New", trusted: "Trusted", highly_trusted: "Highly trusted" };

/** "New" until 3 completed orders, per the spec. */
export function showScore(t: Trust | null | undefined) {
  return Boolean(t && t.completed >= 3);
}

// Quick tags. Brands review creators; creators review brands.
export const TAGS_FOR_CREATOR = ["Followed the brief", "Great communicator", "Creative", "On time", "High engagement", "Professional", "Easy to work with", "Exceeded expectations"];
export const TAGS_FOR_BRAND = ["Clear brief", "Fast approval", "Friendly", "Fair expectations", "Creative freedom", "Responsive", "Great product", "Would work again"];

export const REVIEW_WINDOW_DAYS = 14;

export type Review = {
  id: number;
  order_id: number;
  author_id: string | null;
  subject_id: string;
  author_role: "brand" | "creator";
  overall: number;
  quality: number | null;
  communication: number | null;
  timeliness: number | null;
  value: number | null;
  body: string | null;
  tags: string[];
  would_rehire: boolean | null;
  helpful_count: number;
  revealed_at: string | null;
  created_at: string;
};
