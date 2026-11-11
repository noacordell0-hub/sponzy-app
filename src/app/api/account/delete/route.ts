import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

/** Permanently deletes the signed-in user's account, profile, socials, avatar and waitlist entry. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Account deletion is unavailable right now." }, { status: 503 });

  const { data: files } = await admin.storage.from("avatars").list(user.id);
  if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  if (user.email) await admin.from("waitlist").delete().eq("email", user.email.toLowerCase());

  const { error } = await admin.auth.admin.deleteUser(user.id); // cascades to profile and socials
  if (error) {
    console.error("[account/delete]", error.message);
    return NextResponse.json({ error: "We couldn't delete your account. Please contact us." }, { status: 500 });
  }
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
