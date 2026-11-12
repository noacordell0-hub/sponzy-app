import { logError } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { moderate, type ModAction } from "@/lib/moderation";

const ACTIONS: ModAction[] = ["warning", "suspension", "ban", "unban", "dismiss", "hide_content", "restore_content", "unflag"];

/** Admins only: dismiss reports, warn, suspend, ban or unban accounts, hide or restore content. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const b = await request.json().catch(() => ({}));
  if (!ACTIONS.includes(b.action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const profileId = typeof b.profile_id === "string" ? b.profile_id : null;
  if (["warning", "suspension", "ban", "unban", "unflag"].includes(b.action) && !profileId) return NextResponse.json({ error: "Choose an account." }, { status: 400 });
  if (profileId === user.id && ["suspension", "ban"].includes(b.action)) return NextResponse.json({ error: "You can't ban yourself." }, { status: 400 });
  if (b.action === "warning" && !(b.note ?? "").trim()) return NextResponse.json({ error: "Write the warning the person will see." }, { status: 400 });
  try {
    const r = await moderate(admin, user.id, {
      action: b.action, profileId, reportIds: (Array.isArray(b.report_ids) ? b.report_ids : []).map(Number).filter(Boolean),
      days: Number(b.days) || undefined, reason: typeof b.reason === "string" ? b.reason : undefined, note: b.note,
      reviewId: Number(b.review_id) || undefined, commentId: Number(b.comment_id) || undefined,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    await logError(err, { route: "POST /api/admin/moderation", userId: user.id, action: b.action });
    return NextResponse.json({ error: "Couldn't complete that action." }, { status: 500 });
  }
}
