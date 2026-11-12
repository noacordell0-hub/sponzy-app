import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalProfile, type Profile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import ReviewCard from "@/components/ReviewCard";
import { BadgeRow, TrustPanel } from "@/components/TrustPanel";
import { loadReviews, loadTrust } from "@/lib/review-data";

/** Full reviews list and trust breakdown for a creator (/c/[handle]/reviews) or brand (/b/[handle]/reviews). */
export async function ReviewsPage({ handle, role }: { handle: string; role: "creator" | "brand" }) {
  const { supabase, user, profile: viewer } = await getOptionalProfile();
  const { data: subject } = await supabase.from("profiles").select("*").eq("handle", handle.toLowerCase()).eq("role", role).maybeSingle<Profile>();
  if (!subject || !subject.onboarded_at) notFound();
  const [{ trust, badges }, reviews] = await Promise.all([loadTrust(supabase, subject.id), loadReviews(supabase, subject.id, user?.id ?? null, 200)]);
  const base = role === "creator" ? `/c/${subject.handle}` : `/b/${subject.handle}`;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.review.overall === n).length }));
  const max = Math.max(1, ...dist.map((d) => d.c));

  return (
    <AppShell profile={viewer} active="browse">
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={subject.display_name} source={subject.avatar_source} pattern={subject.avatar_pattern} url={subject.avatar_url} size={52} rounded={16} />
        <div className="min-w-0 flex-1">
          <h1 className="on-bg text-2xl font-extrabold tracking-[-0.03em]">Reviews for {subject.display_name}</h1>
          <Link href={base} className="on-bg-muted text-sm font-semibold text-violet-deep">
            ← Back to profile
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <section className="panel px-6 py-2" aria-label="Reviews">
          {reviews.length === 0 ? (
            <p className="py-5 text-sm text-body">No public reviews yet. Reviews appear after paid collabs, once both sides have left one (or 14 days pass).</p>
          ) : (
            <div className="divide-y divide-black/[.06]">
              {reviews.map((r) => (
                <ReviewCard key={r.review.id} review={r.review} authorName={r.authorName} reply={r.reply} subjectName={subject.display_name} viewerId={user?.id ?? null} votedInitially={r.voted} />
              ))}
            </div>
          )}
        </section>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          {reviews.length > 0 && (
            <section className="panel p-6" aria-labelledby="dist-t">
              <h2 id="dist-t" className="eyebrow">
                Ratings
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <b className="text-3xl tracking-[-0.03em]">{Number(trust?.avg_rating ?? 0).toFixed(1)}</b>
                <Stars value={Number(trust?.avg_rating ?? 0)} size={18} />
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {dist.map((d) => (
                  <li key={d.n} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-ink-2">{d.n} ★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/[.06]">
                      <span className="block h-full rounded-full bg-[#F5B400]" style={{ width: `${(d.c / max) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right text-ink-2">{d.c}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <TrustPanel trust={trust} role={role} reviewsHref={`${base}/reviews`} />
          {badges.length > 0 && subject.show_badges && (
            <section className="panel p-6" aria-labelledby="bdg-t">
              <h2 id="bdg-t" className="eyebrow mb-3">
                Badges
              </h2>
              <BadgeRow codes={badges} />
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
