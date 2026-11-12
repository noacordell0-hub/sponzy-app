import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { CreatorCard } from "@/components/CreatorCard";
import type { CreatorResult } from "@/lib/market";

export const metadata: Metadata = { title: "Brand dashboard · Clouta" };

export default async function BrandDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  if (profile.role !== "brand") redirect("/post/edit");

  const { data: savedRows } = await supabase
    .from("saved_creators")
    .select("creator_id, created_at, profiles:creator_id(handle, display_name, avatar_source, avatar_pattern, avatar_url)")
    .eq("brand_id", user.id)
    .order("created_at", { ascending: false });
  type SavedRow = { creator_id: string; profiles: { handle: string; display_name: string; avatar_source: "auto" | "pattern" | "upload"; avatar_pattern: number; avatar_url: string | null } | null };
  const saved = ((savedRows as unknown as SavedRow[]) ?? []).filter((r) => r.profiles);

  // Recommendations: creators in the brand's niches first, then everyone.
  let recs: CreatorResult[] = [];
  for (const niche of profile.niches.slice(0, 3)) {
    const { data } = await supabase.rpc("search_creators", { p_niche: niche, p_limit: 6 });
    recs.push(...(((data as CreatorResult[]) ?? []).filter((c) => !recs.some((r) => r.id === c.id))));
  }
  if (recs.length < 3) {
    const { data } = await supabase.rpc("search_creators", { p_limit: 6 });
    recs.push(...(((data as CreatorResult[]) ?? []).filter((c) => !recs.some((r) => r.id === c.id))));
  }
  recs = recs.slice(0, 3);
  const savedIds = new Set(saved.map((s) => s.creator_id));

  const stats = [
    { label: "Active orders", value: "0", note: "Booking opens with payments" },
    { label: "Completed collabs", value: "0", note: "" },
    { label: "Saved creators", value: String(saved.length), note: "" },
  ];

  return (
    <AppShell profile={profile} active="dashboard">
      {welcome && (
        <div role="status" className="chip-pop mb-6 rounded-2xl border border-black/[.06] bg-ok-bg px-5 py-4 text-ok">
          <p className="font-bold">Welcome to Clouta, {profile.display_name}!</p>
          <p className="text-sm">Browse creators, save the ones you like, and book them as soon as payments launch.</p>
        </div>
      )}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Avatar name={profile.display_name} source={profile.avatar_source} pattern={profile.avatar_pattern} url={profile.avatar_url} size={52} rounded={16} />
        <div className="flex-1">
          <h1 className="on-bg text-3xl font-extrabold tracking-[-0.03em]">{profile.display_name}</h1>
          <p className="on-bg-muted text-sm text-body">Brand dashboard</p>
        </div>
        <Link href="/browse" className="btn min-h-12 px-6 text-base">
          Find creators
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-2">{s.label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-[-0.03em]">{s.value}</p>
            {s.note && <p className="text-xs text-ink-2">{s.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="recs-title">
          <h2 id="recs-title" className="eyebrow on-bg-muted mb-3">
            Recommended for you
          </h2>
          {recs.length === 0 ? (
            <div className="panel p-6 text-sm text-body">Creators are setting up their shops during the beta. Check back soon, or add niches to your profile for better matches.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recs.map((c) => (
                <CreatorCard key={c.id} c={c} saved={savedIds.has(c.id)} viewerId={user.id} />
              ))}
            </div>
          )}
        </section>
        <div className="flex flex-col gap-6">
          <section className="panel p-6" aria-labelledby="saved-title">
            <h2 id="saved-title" className="eyebrow">
              Saved creators
            </h2>
            {saved.length === 0 ? (
              <p className="mt-3 text-sm text-body">Tap the heart on any creator to save them here.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {saved.map((s) => (
                  <li key={s.creator_id}>
                    <Link href={`/c/${s.profiles!.handle}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-black/[.03]">
                      <Avatar name={s.profiles!.display_name} source={s.profiles!.avatar_source} pattern={s.profiles!.avatar_pattern} url={s.profiles!.avatar_url} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{s.profiles!.display_name}</span>
                        <span className="block text-xs text-ink-2">@{s.profiles!.handle}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel p-6" aria-labelledby="trust-title">
            <h2 id="trust-title" className="eyebrow">
              Your brand trust score
            </h2>
            <p className="mt-2 text-2xl font-extrabold">New</p>
            <p className="mt-1 text-xs text-ink-2">Creators see this before accepting offers. It starts after 3 completed orders.</p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
