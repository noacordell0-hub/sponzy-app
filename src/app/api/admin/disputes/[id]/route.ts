import { logError } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { Order } from "@/lib/orders";
import { decideDispute, UserError, type Dispute } from "@/lib/disputes";

/** Admins only: decide a dispute with a refund, full payment, or a split. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: dispute } = await admin.from("disputes").select("*").eq("id", Number(id)).maybeSingle<Dispute>();
  if (!dispute) return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
  const { data: order } = await admin.from("orders").select("*").eq("id", dispute.order_id).single<Order>();
  const b = await request.json().catch(() => ({}));
  if (!["refund", "pay", "split"].includes(b.decision)) return NextResponse.json({ error: "Choose refund, pay, or split." }, { status: 400 });
  try {
    await decideDispute(admin, order!, dispute, user.id, b.decision, Number(b.split_pct ?? 50), String(b.note ?? ""));
  } catch (err) {
    if (err instanceof UserError) return NextResponse.json({ error: err.message }, { status: 409 });
    await logError(err, { route: "POST /api/admin/disputes/[id]", userId: user.id, disputeId: dispute.id, decision: b.decision });
    return NextResponse.json({ error: "Couldn't complete the decision. Check Stripe and try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
