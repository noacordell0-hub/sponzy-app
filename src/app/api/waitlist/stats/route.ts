import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { FOUNDING_SPOTS } from "@/lib/site";

export const revalidate = 300; // cache for 5 minutes; a real count, never a made-up one

/** Public: how many Founding Creator spots are left (based on creator waitlist signups). No personal data. */
export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const { count, error } = await admin.from("waitlist").select("id", { count: "exact", head: true }).eq("role", "creator");
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  return NextResponse.json({ total: FOUNDING_SPOTS, left: Math.max(0, FOUNDING_SPOTS - (count ?? 0)) });
}
