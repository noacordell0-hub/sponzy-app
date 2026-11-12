import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

/** Review actions: the reviewed person replies once publicly; anyone else marks it helpful (or undoes that). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const reviewId = Number(id);

  if (b.action === "helpful" || b.action === "unhelpful") {
    // RLS checks the review is public and not the voter's own.
    const { error } = b.action === "helpful"
      ? await supabase.from("review_votes").insert({ review_id: reviewId, voter_id: user.id })
      : await supabase.from("review_votes").delete().eq("review_id", reviewId).eq("voter_id", user.id);
    if (error && error.code !== "23505") return NextResponse.json({ error: "You can't vote on this review." }, { status: 403 });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "reply") {
    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
    const body = typeof b.body === "string" ? b.body.trim() : "";
    if (body.length < 1 || body.length > 1000) return NextResponse.json({ error: "Write a reply of up to 1,000 characters." }, { status: 400 });
    const { data: review } = await admin.from("reviews").select("subject_id, revealed_at, hidden_at").eq("id", reviewId).maybeSingle();
    if (!review || review.subject_id !== user.id || !review.revealed_at || review.hidden_at)
      return NextResponse.json({ error: "Only the person reviewed can reply, once the review is public." }, { status: 403 });
    const { error } = await admin.from("review_replies").insert({ review_id: reviewId, author_id: user.id, body });
    if (error?.code === "23505") return NextResponse.json({ error: "You've already replied to this review." }, { status: 409 });
    if (error) return NextResponse.json({ error: "Couldn't save your reply." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
