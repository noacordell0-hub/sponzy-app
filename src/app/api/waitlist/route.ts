import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real people never fill this hidden field. Pretend success for bots.
  if (typeof body.company === "string" && body.company.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "brand" ? "brand" : "creator";
  const handle =
    typeof body.handle === "string" ? body.handle.trim().replace(/^@/, "").slice(0, 60) || null : null;

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[waitlist] Supabase not configured; signup not saved:", email);
      return NextResponse.json({ ok: true, demo: true });
    }
    return NextResponse.json({ error: "Signups are temporarily unavailable." }, { status: 503 });
  }

  // ignoreDuplicates: signing up twice is not an error, and we never reveal
  // whether an email is already on the list.
  const { error } = await supabase
    .from("waitlist")
    .upsert({ email, role, handle, source: "landing" }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error("[waitlist] insert failed:", error.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
