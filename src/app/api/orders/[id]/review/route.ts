import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logOrder, type Order } from "@/lib/orders";
import { reviewEligibility, refreshOrderTrust } from "@/lib/reviews";
import { TAGS_FOR_BRAND, TAGS_FOR_CREATOR } from "@/lib/trust";

const star = (v: unknown, required = false) => {
  if (v === null || v === undefined || v === "") return required ? NaN : null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : NaN;
};

/** Leave a double-blind review on an approved order. Hidden until both sides review or 14 days pass. */
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
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const elig = await reviewEligibility(admin, order, user.id);
  if (!elig.ok) return NextResponse.json({ error: elig.reason }, { status: 409 });

  const b = await request.json().catch(() => ({}));
  const overall = star(b.overall, true);
  const cats = { quality: star(b.quality), communication: star(b.communication), timeliness: star(b.timeliness), value: star(b.value) };
  if (Number.isNaN(overall) || Object.values(cats).some((v) => Number.isNaN(v))) return NextResponse.json({ error: "Pick a star rating." }, { status: 400 });
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 2000) : "";
  const privateNote = typeof b.private_note === "string" ? b.private_note.trim().slice(0, 1000) : "";
  const allowed = elig.role === "brand" ? TAGS_FOR_CREATOR : TAGS_FOR_BRAND;
  const tags = Array.isArray(b.tags) ? [...new Set(b.tags.filter((t: unknown) => typeof t === "string" && allowed.includes(t)))].slice(0, 8) : [];
  const wouldRehire = typeof b.would_rehire === "boolean" ? b.would_rehire : null;

  const { data: inserted, error } = await admin
    .from("reviews")
    .insert({
      order_id: order.id, author_id: user.id, subject_id: elig.subjectId, author_role: elig.role, overall, ...cats,
      body: body || null, tags, would_rehire: wouldRehire, private_note: privateNote || null,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    if (error?.code === "23505") return NextResponse.json({ error: "You've already reviewed this order." }, { status: 409 });
    return NextResponse.json({ error: "Couldn't save your review. Please try again." }, { status: 500 });
  }

  // Double-blind: once both sides have reviewed, reveal both.
  const { data: both } = await admin.from("reviews").select("id").eq("order_id", order.id);
  const revealed = (both ?? []).length >= 2;
  if (revealed) {
    await admin.from("reviews").update({ revealed_at: new Date().toISOString() }).eq("order_id", order.id).is("revealed_at", null);
    await refreshOrderTrust(admin, order);
    await logOrder(admin, order, "reviews_revealed", null, "Both reviews are now public.", "Both of you left a review, so they're now public on your profiles. ⭐");
  } else {
    await logOrder(admin, order, "reviewed", user.id, `The ${elig.role} left a review (hidden until both sides review).`,
      `The ${elig.role} left a review. It stays hidden until you leave yours, or for 14 days.`);
  }
  return NextResponse.json({ ok: true, revealed });
}
