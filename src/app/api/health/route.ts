import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** Uptime check: is the app running and can it reach the database? Shows no secrets. */
export async function GET() {
  const started = Date.now();
  let db: "ok" | "error" | "not_configured" = "not_configured";
  const admin = getSupabaseAdmin();
  if (admin) {
    const { error } = await admin.from("app_config").select("id", { head: true, count: "exact" });
    db = error ? "error" : "ok";
  }
  const ok = db === "ok";
  return NextResponse.json(
    {
      ok,
      db,
      payments: Boolean(process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_key) ? "configured" : "not_configured",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      ms: Date.now() - started,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
