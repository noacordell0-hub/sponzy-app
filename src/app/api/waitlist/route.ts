import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

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
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!CODE_RE.test(code)) return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  const status = await statusFor(code);
  if (!status) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real people never fill this hidden field.
  if (typeof body.company === "string" && body.company.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "brand" ? "brand" : "creator";
  const ref = typeof body.ref === "string" && CODE_RE.test(body.ref) ? body.ref : null;

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

  // Already on the list? Return their existing place and link instead of an error.
  const { data: existing } = await supabase.from("waitlist").select("referral_code").eq("email", email).maybeSingle();
  if (existing?.referral_code) {
    const status = await statusFor(existing.referral_code);
    return NextResponse.json({ ok: true, returning: true, ...status });
  }

  let referredBy: number | null = null;
  if (ref) {
    const { data: referrer } = await supabase.from("waitlist").select("id").eq("referral_code", ref).maybeSingle();
    referredBy = referrer?.id ?? null;
  }

  // Retry on the (very unlikely) chance of a duplicate invite code.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode();
    const { error } = await supabase
      .from("waitlist")
      .insert({ email, role, source: ref ? "referral" : "landing", referral_code: code, referred_by: referredBy });

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
      console.error("[waitlist] insert failed:", error.message);
      break;
    }
  }
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
