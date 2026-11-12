import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { Order } from "@/lib/orders";
import { openDispute, respondDispute, withdrawDispute, UserError, type Dispute } from "@/lib/disputes";

/** Order parties: open a dispute, respond to one, or withdraw your own. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const { data: order } = await admin.from("orders").select("*").eq("id", Number(id)).maybeSingle<Order>();
  if (!order || ![order.brand_id, order.creator_id].includes(user.id)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  try {
    if (b.action === "open") {
      await openDispute(admin, order, user.id, { reason: String(b.reason ?? ""), statement: String(b.statement ?? ""), evidence: b.evidence });
    } else {
      const { data: dispute } = await admin.from("disputes").select("*").eq("order_id", order.id).eq("status", "open").maybeSingle<Dispute>();
      if (!dispute) return NextResponse.json({ error: "There's no open dispute on this order." }, { status: 404 });
      if (b.action === "respond") await respondDispute(admin, order, dispute, user.id, { response: String(b.response ?? ""), evidence: b.evidence });
      else if (b.action === "withdraw") await withdrawDispute(admin, order, dispute, user.id);
      else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof UserError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[dispute]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
