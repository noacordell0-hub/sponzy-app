import TrackView from "@/components/TrackView";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getOptionalProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { CreatorCard } from "@/components/CreatorCard";
import BrowseFilters from "./BrowseFilters";
import type { CreatorResult } from "@/lib/market";

export const metadata: Metadata = {
  title: "Browse creators · Clouta",
  description: "Find creators with clear prices, verified reach and protected payments.",
  alternates: { canonical: "/browse" },
};

type SP = Record<string, string | undefined>;
const PAGE = 24;

function dollarsToCents(v?: string) {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getOptionalProfile();
  const page = Math.max(1, Number(sp.page) || 1);

  const { data, error } = await supabase.rpc("search_creators", {
    p_q: sp.q?.slice(0, 80) || null,
    p_niche: sp.niche || null,
    p_platform: sp.platform || null,
    p_min_price: dollarsToCents(sp.min),
    p_max_price: dollarsToCents(sp.max),
    p_tier: sp.tier || null,
    p_verified_only: sp.verified === "1",
    p_founding_only: sp.founding === "1",
    p_young_only: sp.young === "1",
    p_bookable_only: sp.bookable === "1",
    p_sort: sp.sort || "recommended",
    p_top_rated: sp.top === "1",
    p_on_time_pro: sp.ontime === "1",
    p_limit: PAGE + 1,
    p_offset: (page - 1) * PAGE,
  });
  const rows = ((data as CreatorResult[]) ?? []).slice(0, PAGE);
  const hasMore = ((data as CreatorResult[]) ?? []).length > PAGE;

  let savedIds = new Set<string>();
  if (user && rows.length) {
    const { data: saved } = await supabase.from("saved_creators").select("creator_id").in("creator_id", rows.map((r) => r.id));
    savedIds = new Set((saved ?? []).map((s) => s.creator_id as string));
  }

  const filtered = Object.entries(sp).some(([k, v]) => v && !["sort", "page"].includes(k));
  const pageHref = (n: number) => {
    const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    qs.set("page", String(n));
    return `/browse?${qs}`;
  };

  return (
    <AppShell profile={profile} active="browse" wide>
      <TrackView name="browse_view" props={{ filtered, results: rows.length, signed_in: Boolean(user) }} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="on-bg text-3xl font-extrabold tracking-[-0.03em]">Discover creators</h1>
          <p className="on-bg-muted mt-1.5 text-[15px] text-body">Clear prices, verified reach, and payment held until the work is approved.</p>
        </div>
        <Link href="/leaderboard" className="btn btn-ghost min-h-10 px-4 text-sm">🏆 Leaderboard</Link>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <Suspense fallback={<div className="panel h-40" />}>
          <BrowseFilters />
        </Suspense>
        <div>
          {error ? (
            <div className="panel p-8 text-center text-sm text-err">We couldn&apos;t load creators right now. Please refresh the page.</div>
          ) : rows.length === 0 ? (
            <div className="panel flex flex-col items-center gap-2 p-10 text-center">
              <p className="text-lg font-bold">{filtered ? "No creators match those filters" : "No creators have published yet"}</p>
              <p className="max-w-md text-sm text-body">
                {filtered
                  ? "Try removing a filter or searching for something broader. Follower filters only count verified accounts."
                  : "Creators are setting up their shops during the private beta. Check back soon."}
              </p>
              {filtered && (
                <Link href="/browse" className="btn btn-ghost mt-2 min-h-11 px-5 text-sm">
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <>
              <p className="on-bg-muted mb-3 text-sm text-body">
                {rows.length}
                {hasMore ? "+" : ""} creator{rows.length === 1 ? "" : "s"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((c) => (
                  <CreatorCard key={c.id} c={c} saved={savedIds.has(c.id)} viewerId={user?.id ?? null} />
                ))}
              </div>
              {(page > 1 || hasMore) && (
                <nav aria-label="Pages" className="mt-8 flex justify-center gap-3">
                  {page > 1 && (
                    <Link href={pageHref(page - 1)} className="btn btn-ghost min-h-11 px-5 text-sm">
                      ← Previous
                    </Link>
                  )}
                  {hasMore && (
                    <Link href={pageHref(page + 1)} className="btn btn-ghost min-h-11 px-5 text-sm">
                      Next →
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
