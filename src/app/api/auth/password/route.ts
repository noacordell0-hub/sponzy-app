import { logError } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * POST { mode: "signup" | "login", email, password } → signs in with a password, no email needed.
 * Sign-up creates the account server-side (already confirmed) for waitlist emails during the beta.
 * An existing account that has never signed in and hasn't finished onboarding may set one here.
 * NOTE: password sign-up does not prove email ownership; verify email before enabling payouts.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const mode = body.mode === "signup" ? "signup" : "login";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Passwords need at least 8 characters." }, { status: 400 });
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: "Sign-up is unavailable right now." }, { status: 503 });

    if (process.env.BETA_OPEN !== "true") {
      const { data } = await admin.from("waitlist").select("id").eq("email", email).maybeSingle();
      if (!data) {
        return NextResponse.json(
          { error: "Clouta is in private beta. Join the waitlist first, and we'll invite you soon.", waitlist: true },
          { status: 403 },
        );
      }
    }

    const { data: rows } = await admin.rpc("auth_user_status", { p_email: email });
    const existing = Array.isArray(rows) ? rows[0] : null;

    if (existing) {
      if (existing.ever_signed_in || existing.onboarded) {
        return NextResponse.json({ error: "An account with this email already exists. Log in instead." }, { status: 409 });
      }
      // Account that has never signed in (e.g. email link never worked) and has no profile yet: let them set a password.
      const { error } = await admin.auth.admin.updateUserById(existing.user_id, { password, email_confirm: true });
      if (error) return NextResponse.json({ error: "Couldn't set up your account. Please try again." }, { status: 500 });
    } else {
      const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) {
        await logError(error.message, { route: "POST /api/auth/password", step: "createUser" });
        return NextResponse.json({ error: "Couldn't create your account. Please try again." }, { status: 500 });
      }
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
    return NextResponse.json(
      { error: mode === "login" ? "Wrong email or password. No password yet? Use the email link tab." : "Couldn't sign you in." },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true, next: mode === "signup" ? "/onboarding" : null });
}
