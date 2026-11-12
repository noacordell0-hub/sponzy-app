"use client";

import { track as vercelTrack } from "@vercel/analytics";

/**
 * One place for every analytics event, so names stay consistent.
 * Each event goes to Vercel Web Analytics (custom events need a paid Vercel plan) and to
 * Clouta's own /api/events endpoint, so the funnel is also visible on the free plan.
 * Never put emails, names or other personal details in event properties.
 */
export type EventName =
  | "landing_view" | "cta_click" | "nav_click" | "faq_opened"
  | "waitlist_submit" | "waitlist_success" | "waitlist_error"
  | "invite_link_copied" | "invite_link_shared" | "referral_signup"
  | "earnings_calculator_used"
  | "browse_view" | "login_view" | "signup_view"
  | "stripe_onboard_start" | "stripe_onboard_success" | "stripe_onboard_error"
  | "checkout_start" | "review_submitted" | "dispute_opened";

type Props = Record<string, string | number | boolean | null>;

const UTM_KEY = "clouta-utm";
const VISITOR_KEY = "clouta-vid";

/** Anonymous random id per browser, so we can count unique visitors in our own data. */
function visitorId() {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = Math.random().toString(36).slice(2, 12);
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

export function track(name: EventName, props: Props = {}) {
  try {
    vercelTrack(name, props);
  } catch {
    /* analytics must never break the page */
  }
  try {
    const body = JSON.stringify({ type: "event", name, props, path: location.pathname, vid: visitorId(), utm: getUtm() });
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
      fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export type Utm = { utm_source?: string; utm_medium?: string; utm_campaign?: string; landing_page?: string; referrer?: string };

/** First-touch attribution: remember how someone first arrived (kept for 90 days). */
export function captureUtm() {
  try {
    const existing = localStorage.getItem(UTM_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed.t && Date.now() - parsed.t < 90 * 864e5) return;
    }
    const p = new URLSearchParams(location.search);
    const clip = (v: string | null) => (v ? v.slice(0, 100) : undefined);
    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : "";
      referrer = host && host !== location.hostname ? host.slice(0, 100) : undefined;
    } catch {
      referrer = undefined;
    }
    // No UTM tags: fall back to the invite link, then the site that linked here (e.g. instagram.com).
    const utm = {
      utm_source: clip(p.get("utm_source")) ?? (p.get("ref") ? "invite" : referrer),
      utm_medium: clip(p.get("utm_medium")) ?? (p.get("ref") ? "referral" : referrer ? "referring_site" : undefined),
      utm_campaign: clip(p.get("utm_campaign")),
      landing_page: location.pathname.slice(0, 100),
      referrer,
      t: Date.now(),
    };
    localStorage.setItem(UTM_KEY, JSON.stringify(utm));
  } catch {
    /* private mode */
  }
}

export function getUtm(): Utm {
  try {
    const { t: _t, ...rest } = JSON.parse(localStorage.getItem(UTM_KEY) ?? "{}");
    void _t;
    return rest;
  } catch {
    return {};
  }
}

/** Group exact numbers into ranges so events stay useful without being too detailed. */
export function bucket(n: number, edges: number[]) {
  for (let i = 0; i < edges.length; i++) if (n < edges[i]) return i === 0 ? `<${edges[0]}` : `${edges[i - 1]}-${edges[i] - 1}`;
  return `${edges[edges.length - 1]}+`;
}
