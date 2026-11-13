import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logError, scrub } from "@/lib/log";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const EVENTS = new Set([
  "landing_view", "cta_click", "nav_click", "faq_opened", "waitlist_submit", "waitlist_success", "waitlist_error",
  "invite_link_copied", "invite_link_shared", "referral_signup", "earnings_calculator_used", "browse_view", "login_view",
  "signup_view", "stripe_onboard_start", "stripe_onboard_success", "stripe_onboard_error", "checkout_start",
  "review_submitted", "dispute_opened",
]);

function cleanProps(v: unknown) {
  const out: Record<string, string | number | boolean | null> = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 12)) {
    const key = k.replace(/[^a-z0-9_]/gi, "").slice(0, 40);
    if (!key) continue;
    if (typeof val === "string") out[key] = scrub(val).slice(0, 100);
    else if (typeof val === "number" && Number.isFinite(val)) out[key] = val;
    else if (typeof val === "boolean" || val === null) out[key] = val;
  }
  return out;
}

/**
 * Receives analytics events and browser errors from the site.
 * Events are stored in analytics_events when that table exists (pending approval); errors go to error_events.
 */
export async function POST(request: Request) {
  if (!rateLimit(`ev:${clientIp(request)}`, 120, 60_000).ok) return new NextResponse(null, { status: 429 });
  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object") return new NextResponse(null, { status: 400 });
  const path = typeof b.path === "string" ? b.path.slice(0, 200) : null;

  if (b.type === "error") {
    if (!rateLimit(`err:${clientIp(request)}`, 10, 60_000).ok) return new NextResponse(null, { status: 429 });
    await logError(String(b.message ?? "Unknown browser error"), { level: "client", route: path ?? undefined, stack: typeof b.stack === "string" ? b.stack.slice(0, 2000) : undefined });
    return new NextResponse(null, { status: 204 });
  }

  if (b.type !== "event" || !EVENTS.has(b.name)) return new NextResponse(null, { status: 400 });
  // Skip headless browsers and known bots so test runs and crawlers don't skew the funnel.
  if (/headless|bot|crawl|spider|playwright|puppeteer|lighthouse/i.test(request.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const admin = getSupabaseAdmin();
  if (admin) {
    const utm = cleanProps(b.utm);
    await admin.from("analytics_events").insert({
      name: b.name, props: cleanProps(b.props), path,
      visitor_id: typeof b.vid === "string" ? b.vid.replace(/[^a-z0-9]/gi, "").slice(0, 20) : null,
      utm_source: (utm.utm_source as string) ?? null, utm_medium: (utm.utm_medium as string) ?? null, utm_campaign: (utm.utm_campaign as string) ?? null,
    }).then(() => null, () => null); // table may not exist yet; analytics must never error
  }
  return new NextResponse(null, { status: 204 });
}
