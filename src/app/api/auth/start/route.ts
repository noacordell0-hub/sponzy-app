import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * POST { email, mode: "signup" | "login", next? } → emails a one-time login link.
 * During the private beta, new accounts are limited to people on the waitlist
 * (set BETA_OPEN=true in Vercel to open sign-up to everyone).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const mode = body.mode === "signup" ? "signup" : "login";
  const next = typeof body.next === "string" && /^\/[a-z0-9/_-]*$/i.test(body.next) ? body.next : null;

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (mode === "signup" && process.env.BETA_OPEN !== "true") {
    const admin = getSupabaseAdmin();
    if (admin) {
      const { data } = await admin.from("waitlist").select("id").eq("email", email).maybeSingle();
      if (!data) {
        return NextResponse.json(
          { error: "Clouta is in private beta. Join the waitlist first, and we'll invite you soon.", waitlist: true },
          { status: 403 },
        );
      }
    }
  }

  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: mode === "signup",
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next ?? (mode === "signup" ? "/onboarding" : "/settings/account"))}`,
    },
  });

  if (error) {
    if (mode === "login" && /signups not allowed|not found/i.test(error.message)) {
      return NextResponse.json({ error: "We couldn't find an account with that email. Try signing up." }, { status: 404 });
    }
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      return NextResponse.json({ error: "Too many login emails were sent. Please wait a few minutes and try again." }, { status: 429 });
    }
    console.error("[auth/start]", error.message);
    return NextResponse.json({ error: "We couldn't send the email. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
