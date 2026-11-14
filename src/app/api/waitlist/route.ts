import { logError } from "@/lib/log";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isDisposableEmail, normalizeEmail } from "@/lib/fraud";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CODE_RE = /^[a-z0-9]{6,12}$/;

function newCode() {
  // 8 lowercase base-36 characters, e.g. "k3x9q2ma"
  return Array.from(randomBytes(8), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
}

type Status = { code: string; position: number; referrals: number; total: number };

async function statusFor(code: string): Promise<Status | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("waitlist_status", { p_code: code });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return null;
  return { code, position: Number(row.position_in_line), referrals: Number(row.referrals), total: Number(row.total) };
}

/** GET /api/waitlist?code=abc123 → place in line for a saved invite code. */
export async function GET(request: Request) {
  if (!rateLimit(`wlget:${clientIp(request)}`, 30, 60_000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!CODE_RE.test(code)) return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  const status = await statusFor(code);
  if (!status) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  // A person joins once; 5 tries a minute per visitor is plenty and stops scripted floods.
  const lim = rateLimit(`wl:${clientIp(request)}`, 5, 60_000);
  if (!lim.ok) return NextResponse.json({ error: "Too many tries. Please wait a minute and try again." }, { status: 429, headers: { "Retry-After": String(lim.retryAfter) } });
  let body: Record<string, unknown>;
  // Without JavaScript the browser posts a normal form; answer with a redirect back to the page instead of JSON.
  const isForm = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  try {
    body = isForm ? Object.fromEntries((await request.formData()).entries()) : await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (isForm) {
    const res = await handleSignup(body);
    const json = await res.json().catch(() => ({}));
    const back = new URL("/", request.url);
    if (json.code) back.searchParams.set("joined", json.code);
    else back.searchParams.set("waitlist_error", "1");
    back.hash = "join";
    return NextResponse.redirect(back, 303);
  }
  return handleSignup(body);
}

async function handleSignup(body: Record<string, unknown>) {

  // Honeypot: real people never fill this hidden field.
  if (typeof body.company === "string" && body.company.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "brand" ? "brand" : "creator";
  const ref = typeof body.ref === "string" && CODE_RE.test(body.ref) ? body.ref : null;

  // Where they came from (first visit). Plain text only, trimmed; never trusted for anything but reporting.
  const tag = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().replace(/[^\w.\-/ ]/g, "").slice(0, 100) || null : null);
  const attribution = { utm_source: tag(body.utm_source), utm_medium: tag(body.utm_medium), utm_campaign: tag(body.utm_campaign), landing_page: tag(body.landing_page) };

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[waitlist] Supabase not configured; signup not saved:", email);
      return NextResponse.json({ ok: true, demo: true, code: "demo1234", position: 42, referrals: 0, total: 120 });
    }
    return NextResponse.json({ error: "Signups are temporarily unavailable." }, { status: 503 });
  }

  // Throwaway inboxes are how people fake signups to climb the list.
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use your real email address. Temporary inboxes can't join." }, { status: 400 });
  }

  // Already on the list? Return their existing place and link instead of an error.
  // "Same inbox, different spelling" (joe+2@gmail.com, j.o.e@gmail.com) counts as already on the list.
  const normalized = normalizeEmail(email);
  const { data: exact } = await supabase.from("waitlist").select("referral_code").eq("email", email).maybeSingle();
  const { data: alias } = exact ? { data: null } : await supabase.from("waitlist").select("referral_code").eq("email_normalized", normalized).limit(1).maybeSingle();
  const existing = exact ?? alias;
  if (existing?.referral_code) {
    const status = await statusFor(existing.referral_code);
    return NextResponse.json({ ok: true, returning: true, ...status });
  }

  // Burst guard across all servers: an unusual flood of new signups in one minute is almost always a bot.
  const { count: lastMinute } = await supabase.from("waitlist").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((lastMinute ?? 0) >= 60) {
    await logError("Waitlist burst guard triggered", { route: "POST /api/waitlist", level: "warn", lastMinute });
    return NextResponse.json({ error: "Lots of people are joining right now. Please try again in a minute." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let referredBy: number | null = null;
  if (ref) {
    const { data: referrer } = await supabase.from("waitlist").select("id, email").eq("referral_code", ref).maybeSingle();
    // Referring yourself (another spelling of your own inbox) earns nothing.
    referredBy = referrer && normalizeEmail(referrer.email) !== normalized ? referrer.id : null;
  }

  // Retry on the (very unlikely) chance of a duplicate invite code.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode();
    const { error } = await supabase
      .from("waitlist")
      .insert({ email, role, source: ref ? "referral" : "landing", referral_code: code, referred_by: referredBy, ...attribution });

    if (!error) {
      const status = await statusFor(code);
      return NextResponse.json({ ok: true, ...status });
    }
    if (error.code === "23505" && error.message.includes("email")) {
      // Lost a race with a duplicate signup for the same email.
      const { data: row } = await supabase.from("waitlist").select("referral_code").eq("email", email).maybeSingle();
      const status = row ? await statusFor(row.referral_code) : null;
      return NextResponse.json({ ok: true, returning: true, ...status });
    }
    if (error.code !== "23505") {
      await logError(error.message, { route: "POST /api/waitlist", code: error.code });
      break;
    }
  }
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
