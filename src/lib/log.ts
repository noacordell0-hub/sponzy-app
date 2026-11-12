import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type Ctx = { route?: string; userId?: string | null; digest?: string; level?: "error" | "warn" | "client"; [k: string]: unknown };

const SECRET_KEY = /(pass(word)?|secret|token|key|authorization|cookie|signature|card|ssn|email)/i;
// Stripe keys, webhook secrets, JWTs and bearer tokens look like these; never store them.
const SECRET_VALUE = /(sk|rk|pk)_(live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|Bearer\s+\S+/g;

export function scrub(text: string) {
  return text.replace(SECRET_VALUE, "[redacted]").replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]");
}

function scrubObject(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj).slice(0, 30)) {
    if (SECRET_KEY.test(k)) out[k] = "[redacted]";
    else if (typeof v === "string") out[k] = scrub(v).slice(0, 500);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (v && typeof v === "object" && depth < 2) out[k] = scrubObject(v as Record<string, unknown>, depth + 1);
  }
  return out;
}

/**
 * Log a server error to Vercel's logs and keep a copy in the error_events table
 * (Vercel Hobby keeps logs for 1 hour). Never throws; secrets and emails are removed first.
 */
export async function logError(err: unknown, ctx: Ctx = {}) {
  const { route, userId, digest, level = "error", ...rest } = ctx;
  const message = scrub(err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err ?? "Unknown error")).slice(0, 2000);
  const stack = err instanceof Error && err.stack ? scrub(err.stack).slice(0, 8000) : null;
  console.error(`[${level}] ${route ?? "?"}: ${message}`);
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return;
    await admin.from("error_events").insert({
      level, route: route?.slice(0, 300) ?? null, message, stack, user_id: userId ?? null,
      digest: digest?.slice(0, 100) ?? null, context: scrubObject(rest),
    });
  } catch {
    /* logging must never cause another error */
  }
}
