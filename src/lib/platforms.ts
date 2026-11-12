export const PLATFORMS = {
  tiktok: { label: "TikTok", short: "TT", color: "#15131F" },
  instagram: { label: "Instagram", short: "IG", color: "#C13584" },
  youtube: { label: "YouTube", short: "YT", color: "#C4302B" },
  x: { label: "X", short: "X", color: "#15131F" },
  twitch: { label: "Twitch", short: "TW", color: "#7A3FE4" },
  facebook: { label: "Facebook", short: "FB", color: "#1877F2" },
} as const;

export function profileUrl(platform: PlatformKey, handle: string) {
  const h = encodeURIComponent(handle);
  return {
    tiktok: `https://www.tiktok.com/@${h}`,
    instagram: `https://www.instagram.com/${h}/`,
    youtube: `https://www.youtube.com/@${h}`,
    x: `https://x.com/${h}`,
    twitch: `https://www.twitch.tv/${h}`,
    facebook: `https://www.facebook.com/${h}`,
  }[platform];
}

export type PlatformKey = keyof typeof PLATFORMS;
export const PLATFORM_KEYS = Object.keys(PLATFORMS) as PlatformKey[];

export function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** "12.5k", "1,200", "3m" -> number. Returns null when it can't be read. */
export function parseFollowers(input: string): number | null {
  const m = input.trim().toLowerCase().replace(/,/g, "").match(/^(\d+(?:\.\d+)?)\s*([km])?$/);
  if (!m) return null;
  const n = parseFloat(m[1]) * (m[2] === "m" ? 1_000_000 : m[2] === "k" ? 1_000 : 1);
  return Number.isFinite(n) ? Math.round(n) : null;
}
