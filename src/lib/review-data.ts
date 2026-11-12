import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review, Trust } from "@/lib/trust";

/** Public reviews about a person, with author names, replies, and which ones the viewer marked helpful. */
export async function loadReviews(supabase: SupabaseClient, subjectId: string, viewerId: string | null, limit = 50) {
  const { data } = await supabase
    .from("reviews")
    .select("id, order_id, author_id, subject_id, author_role, overall, quality, communication, timeliness, value, body, tags, would_rehire, helpful_count, revealed_at, created_at")
    .eq("subject_id", subjectId)
    .not("revealed_at", "is", null)
    .is("hidden_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  const reviews = (data as Review[]) ?? [];
  const ids = reviews.map((r) => r.id);
  const authorIds = [...new Set(reviews.map((r) => r.author_id).filter(Boolean))] as string[];
  const [{ data: authors }, { data: replies }, { data: votes }] = await Promise.all([
    authorIds.length ? supabase.from("profiles").select("id, display_name").in("id", authorIds) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("review_replies").select("review_id, body, created_at").in("review_id", ids) : Promise.resolve({ data: [] }),
    ids.length && viewerId ? supabase.from("review_votes").select("review_id").eq("voter_id", viewerId).in("review_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((authors ?? []).map((a: { id: string; display_name: string }) => [a.id, a.display_name]));
  const replyMap = new Map((replies ?? []).map((r: { review_id: number; body: string; created_at: string }) => [r.review_id, r]));
  const voted = new Set((votes ?? []).map((v: { review_id: number }) => v.review_id));
  return reviews.map((r) => ({
    review: r,
    authorName: (r.author_id && names.get(r.author_id)) || "Former Clouta member",
    reply: replyMap.get(r.id) ?? null,
    voted: voted.has(r.id),
  }));
}

export async function loadTrust(supabase: SupabaseClient, profileId: string) {
  const [{ data: trust }, { data: badges }] = await Promise.all([
    supabase.from("trust_scores").select("*").eq("profile_id", profileId).maybeSingle<Trust>(),
    supabase.from("profile_badges").select("code").eq("profile_id", profileId),
  ]);
  return { trust: trust ?? null, badges: (badges ?? []).map((b: { code: string }) => b.code) };
}
