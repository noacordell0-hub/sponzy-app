/** Site-wide settings. Set NEXT_PUBLIC_CONTACT_EMAIL in Vercel to show the real address. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
export const FOUNDING_SPOTS = Number(process.env.NEXT_PUBLIC_FOUNDING_SPOTS) || 1000;
export const LEGAL_UPDATED = "November 11, 2026";
/** Canonical address of the site (used for share links, canonical URLs and the sitemap). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://clouta.vercel.app").replace(/\/$/, "");
