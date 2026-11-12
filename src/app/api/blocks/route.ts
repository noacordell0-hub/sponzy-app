import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Block or unblock someone. Blocked people can't message each other. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const other = String(b.profile_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(other) || other === user.id) return NextResponse.json({ error: "Invalid person." }, { status: 400 });
  const { error } = b.block
    ? await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: other })
    : await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", other);
  if (error && error.code !== "23505") return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
