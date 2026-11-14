/**
 * Shared anti-scam checks. Pure functions, safe on the server and in the browser.
 * See SECURITY notes in OPTIMIZATION_REPORT.md ("Scam review") for the threats each one covers.
 */

/** Same inbox, different spelling: lower-case, drop "+tags", and for Gmail drop dots (j.o.e+brand@gmail.com → joe@gmail.com). */
export function normalizeEmail(email: string) {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  const d = domain === "googlemail.com" ? "gmail.com" : domain;
  let l = local.split("+")[0];
  if (d === "gmail.com") l = l.replace(/\./g, "");
  return `${l}@${d}`;
}

/** Throwaway inbox services used to fake signups and referrals. Not exhaustive: the common ones. */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "10minutemail.net", "tempmail.com",
  "temp-mail.org", "tempmail.net", "tempmailo.com", "yopmail.com", "yopmail.net", "trashmail.com", "getnada.com", "nada.email",
  "dispostable.com", "maildrop.cc", "mintemail.com", "throwawaymail.com", "fakeinbox.com", "emailondeck.com", "moakt.com",
  "mohmal.com", "mailnesia.com", "mytemp.email", "tempr.email", "discard.email", "spamgourmet.com", "burnermail.io", "mail.tm",
  "inboxkitten.com", "1secmail.com", "1secmail.org", "1secmail.net", "emailfake.com", "fakemail.net", "tmpmail.org", "tmpmail.net",
  "minuteinbox.com", "luxusmail.org", "byom.de", "trbvm.com", "spam4.me", "grr.la", "pokemail.net", "dropmail.me",
]);
export function isDisposableEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return DISPOSABLE.has(domain) || [...DISPOSABLE].some((d) => domain.endsWith(`.${d}`));
}

/** Paying outside Clouta (no protection) — the #1 marketplace scam. Mirrors the database auto-flag in migration 0027. */
const OFF_PLATFORM = /\b(venmo|cash ?app|cashtag|paypal(\.me)?|zelle|wise\.com|western union|moneygram|apple ?pay me|(pay|send)( me| you)? (in |with )?(crypto|bitcoin|btc|usdt|eth)|gift ?cards?|wire (me|the money|transfer))\b|\$[a-z][a-z0-9_]{2,}/i;
/** Common phishing/account-takeover lines ("verify your account", fake support, login links). */
const PHISHING = /\b(verify (your )?(account|identity|payment)|confirm (your )?(payment|account|card)|(log ?in|sign ?in) (here|at|with)|(clouta|stripe) (support|team|security|verification)|send (me )?(the|your) (code|otp|password)|(bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly|rb\.gy|shorturl\.at)\/)/i;

export function messageRisk(text: string): { offPlatform: boolean; phishing: boolean } {
  return { offPlatform: OFF_PLATFORM.test(text), phishing: PHISHING.test(text) };
}

/** Where proof of a sponsored post may live. Anything else (random sites, file hosts, look-alike domains) is refused. */
const PROOF_HOSTS: Record<string, string> = {
  "tiktok.com": "tiktok", "vm.tiktok.com": "tiktok", "vt.tiktok.com": "tiktok",
  "instagram.com": "instagram", "instagr.am": "instagram",
  "youtube.com": "youtube", "youtu.be": "youtube", "m.youtube.com": "youtube",
  "x.com": "x", "twitter.com": "x",
  "twitch.tv": "twitch", "clips.twitch.tv": "twitch",
  "facebook.com": "facebook", "fb.watch": "facebook", "m.facebook.com": "facebook",
  "threads.net": "instagram", "snapchat.com": "snapchat", "pinterest.com": "pinterest", "linkedin.com": "linkedin",
};

/**
 * Checks proof links: real https links on a social platform, and when the link names an account
 * (tiktok.com/@name, youtube.com/@name, x.com/name, instagram.com/name, twitch.tv/name) it must be one of the creator's verified accounts.
 * Returns an error message, or null when the links are fine.
 */
export function checkProofLinks(links: string[], verified: { platform: string; handle: string }[]): string | null {
  const mine = new Set(verified.map((v) => `${v.platform}:${v.handle.toLowerCase().replace(/^@/, "")}`));
  for (const raw of links) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return "Links must be full https:// addresses.";
    }
    if (u.protocol !== "https:" || u.username || u.password) return "Links must be full https:// addresses.";
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const platform = PROOF_HOSTS[host];
    if (!platform) return `"${host}" isn't a social platform. Link to the live post itself (TikTok, Instagram, YouTube, X…).`;
    const seg = u.pathname.split("/").filter(Boolean);
    let named: string | null = null;
    if ((platform === "tiktok" || platform === "youtube") && seg[0]?.startsWith("@")) named = seg[0].slice(1);
    else if (platform === "x" && seg[1] === "status") named = seg[0];
    else if (platform === "instagram" && seg[0] && !["p", "reel", "reels", "stories", "tv", "s"].includes(seg[0]) && host !== "threads.net") named = seg[0];
    else if (platform === "instagram" && seg[0] === "stories" && seg[1]) named = seg[1];
    else if (platform === "twitch" && seg[0] && !["videos", "clip"].includes(seg[0])) named = seg[0];
    if (named && !mine.has(`${platform}:${named.toLowerCase()}`)) {
      return `That post is on @${named}, which isn't one of your verified accounts. Post from your verified account, or verify @${named} first.`;
    }
  }
  return null;
}

/** Names and handles nobody may take: they'd let a scammer pose as Clouta staff. Mirrors migration 0027. */
export const RESERVED_HANDLE = /^(clouta|admin|administrator|support|help|helpdesk|official|staff|moderator|mod|team|security|billing|payments?|stripe|verify|verification|trust|safety)(_|$)/i;
export const RESERVED_NAME = /\b(clouta|administrator|admin|moderator|support team|customer support|customer service|trust ?& ?safety|verification team)\b/i;
