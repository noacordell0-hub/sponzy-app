import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { emailEnabled, emailMember } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Called by the chat after a message is sent. Emails the other person, but only for the first unread message
 * since they last opened the conversation, so a burst of messages sends one email, not ten.
 */
export async function POST(request: Request) {
  if (!emailEnabled()) return new NextResponse(null, { status: 204 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  if (!rateLimit(`notify:${user.id}`, 30, 60_000).ok) return new NextResponse(null, { status: 429 });
  const admin = getSupabaseAdmin();
  if (!admin) return new NextResponse(null, { status: 204 });

  const b = await request.json().catch(() => ({}));
  const threadId = Number(b.thread_id);
  const { data: t } = await admin.from("threads").select("id, a_id, b_id").eq("id", threadId).maybeSingle();
  if (!t || ![t.a_id, t.b_id].includes(user.id)) return new NextResponse(null, { status: 404 });
  const to = t.a_id === user.id ? t.b_id : t.a_id;

  const { data: read } = await admin.from("thread_reads").select("last_read_at").eq("thread_id", threadId).eq("profile_id", to).maybeSingle();
  let q = admin.from("messages").select("id", { count: "exact", head: true }).eq("thread_id", threadId).eq("sender_id", user.id);
  if (read?.last_read_at) q = q.gt("created_at", read.last_read_at);
  const { count } = await q;
  if ((count ?? 0) !== 1) return new NextResponse(null, { status: 204 }); // they already have an unread email for this chat

  const { data: me } = await admin.from("profiles").select("display_name").eq("id", user.id).single();
  const who = me?.display_name ?? "Someone";
  await emailMember(admin, to, "messages", {
    subject: `New message from ${who}`,
    heading: `${who} sent you a message`,
    lines: ["Reply on Clouta to keep everything (and your payment protection) in one place. Quick replies also help your trust score."],
    cta: { label: "Read and reply", path: `/messages?t=${threadId}` },
  });
  return new NextResponse(null, { status: 204 });
}
