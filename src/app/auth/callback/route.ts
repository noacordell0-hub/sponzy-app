import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** The login link in the email lands here: swap the one-time code for a session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/home";
  const next = /^\/[a-z0-9/_-]*$/i.test(nextParam) ? nextParam : "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
