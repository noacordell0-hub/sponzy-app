import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** /messages/new?to=handle → opens (or creates) the conversation with that account. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const handle = (url.searchParams.get("to") ?? "").toLowerCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/messages/new?to=${handle}`)}`, url.origin));

  const { data: other } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (!other) return NextResponse.redirect(new URL("/messages?error=notfound", url.origin));

  const { data: threadId, error } = await supabase.rpc("start_thread", { p_other: other.id });
  if (error || !threadId) return NextResponse.redirect(new URL(`/messages?error=${encodeURIComponent(error?.message ?? "failed")}`, url.origin));
  return NextResponse.redirect(new URL(`/messages?t=${threadId}`, url.origin));
}
