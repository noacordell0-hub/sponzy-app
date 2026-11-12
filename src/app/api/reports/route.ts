import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { REPORT_REASONS } from "@/lib/safety-labels";

/** Report a profile, review, comment or message to the Clouta team, optionally blocking the person too. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to report." }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const b = await request.json().catch(() => ({}));
  const type = String(b.target_type ?? "");
  const targetId = String(b.target_id ?? "").slice(0, 64);
  if (!REPORT_REASONS[b.reason]) return NextResponse.json({ error: "Choose a reason." }, { status: 400 });
  const details = typeof b.details === "string" ? b.details.trim().slice(0, 1000) : "";
  const shot = typeof b.screenshot_url === "string" ? b.screenshot_url.trim() : "";
  if (shot && !/^https:\/\/\S+$/i.test(shot)) return NextResponse.json({ error: "The screenshot link must start with https://" }, { status: 400 });

  // Work out whose content this is (and that the reporter can see it).
  let owner: string | null = null;
  if (type === "profile") {
    const { data } = await admin.from("profiles").select("id").eq("id", targetId).maybeSingle();
    owner = data?.id ?? null;
  } else if (type === "review") {
    const { data } = await admin.from("reviews").select("author_id, revealed_at").eq("id", Number(targetId)).maybeSingle();
    owner = data?.revealed_at ? data.author_id : null;
  } else if (type === "message") {
    const { data } = await admin.from("messages").select("sender_id, threads!inner(a_id, b_id)").eq("id", Number(targetId)).maybeSingle();
    const t = data?.threads as unknown as { a_id: string; b_id: string } | undefined;
    owner = t && [t.a_id, t.b_id].includes(user.id) ? data!.sender_id : null;
  } else if (type === "comment") {
    const { data } = await admin.from("comments").select("author_id").eq("id", Number(targetId)).maybeSingle();
    owner = data?.author_id ?? null;
  } else {
    return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
  }
  if (!owner) return NextResponse.json({ error: "We couldn't find that." }, { status: 404 });
  if (owner === user.id) return NextResponse.json({ error: "You can't report yourself." }, { status: 400 });

  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 10) return NextResponse.json({ error: "You've sent a lot of reports today. Please try again tomorrow." }, { status: 429 });

  const { error } = await admin.from("reports").insert({
    reporter_id: user.id, target_type: type, target_id: targetId, target_profile_id: owner, reason: b.reason,
    details: details || null, screenshot_url: shot || null,
  });
  if (error && error.code !== "23505") return NextResponse.json({ error: "Couldn't send your report." }, { status: 500 });
  if (b.block) await admin.from("blocks").upsert({ blocker_id: user.id, blocked_id: owner }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  return NextResponse.json({ ok: true, already: error?.code === "23505" });
}
