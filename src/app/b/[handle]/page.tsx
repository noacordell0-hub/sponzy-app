import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalProfile, type Profile, type Social } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { THEMES } from "@/lib/look";
import { PLATFORMS, formatFollowers, profileUrl } from "@/lib/platforms";
import { loadReviews, loadTrust } from "@/lib/review-data";
import { TrustPanel } from "@/components/TrustPanel";
import ReviewCard from "@/components/ReviewCard";
import ReportButton from "@/components/ReportButton";
import { CountUp } from "@/components/Delight";

type Params = { params: Promise<{ handle: string }> };

async function load(handle: string) {
  const ctx = await getOptionalProfile();
  const { data: brand } = await ctx.supabase.from("profiles").select("*").eq("handle", handle.toLowerCase()).eq("role", "brand").maybeSingle<Profile>();
  return { ...ctx, brand };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const { brand } = await load(handle);
  if (!brand) return { title: "Brand not found · Clouta" };
  const title = `${brand.display_name} · Brand on Clouta`;
  const description = brand.tagline ?? `${brand.display_name} works with creators on Clouta.`;
  return { title, description, alternates: { canonical: `/b/${brand.handle}` }, openGraph: { title, description, url: `/b/${brand.handle}` } };
}

export default async function BrandPage({ params }: Params) {
  const { handle } = await params;
  const { supabase, user, profile: viewer, brand } = await load(handle);
  if (!brand || !brand.onboarded_at) notFound();
  const isOwner = user?.id === brand.id;
  const { data: socialsData } = await supabase.from("social_accounts").select("*").eq("profile_id", brand.id).order("followers", { ascending: false });
  const socials = (socialsData as Social[]) ?? [];
  const { data: blockRow } = user && !isOwner ? await supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", brand.id).maybeSingle() : { data: null };
  const [{ trust }, reviews] = await Promise.all([loadTrust(supabase, brand.id), loadReviews(supabase, brand.id, user?.id ?? null, 5)]);
  const theme = THEMES[brand.theme] ?? THEMES.violet;
  let site: string | null = null;
  try {
    site = brand.website ? new URL(brand.website).host.replace(/^www\./, "") : null;
  } catch {
    site = null;
  }

  const joined = brand.onboarded_at ? new Date(brand.onboarded_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;
  const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(Number(n) * 100)}%`);
  const stats = [
    { label: "Collabs completed", value: String(trust?.completed ?? 0) },
    { label: "Repeat creators", value: String(trust?.repeat_partners ?? 0) },
    { label: "Creators would rehire", value: (trust?.completed ?? 0) > 0 ? pct(trust?.rehire_rate) : "—" },
    { label: "Rating", value: trust && trust.review_count > 0 ? `${Number(trust.avg_rating).toFixed(1)} (${trust.review_count})` : "New" },
  ];

  return (
    <AppShell profile={viewer} active="browse">
      <nav aria-label="Breadcrumb" className="on-bg-muted mb-4 text-sm text-ink-2">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>Brands</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-ink">
            {brand.display_name}
          </li>
        </ol>
      </nav>
      <section className="panel overflow-hidden">
        <div className="h-20 sm:h-24" style={{ background: theme.banner }} />
        <div className="px-5 pb-6 sm:px-7">
          <div className="flex items-end justify-between gap-3">
            <span className="-mt-10 rounded-[26px] border-[5px] border-white bg-white">
              <Avatar name={brand.display_name} source={brand.avatar_source} pattern={brand.avatar_pattern} url={brand.avatar_url} size={92} rounded={22} />
            </span>
            <div className="flex gap-2 pt-3">
              {isOwner ? (
                <Link href="/settings/account" className="btn btn-ghost min-h-10 px-4 text-sm">
                  Edit profile
                </Link>
              ) : (
                <Link href={`/messages/new?to=${brand.handle}`} className="btn min-h-10 px-4 text-sm" style={{ background: theme.button, color: theme.text }}>
                  Message
                </Link>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-[28px]">{brand.display_name}</h1>
            <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs font-semibold text-ink-2">Brand</span>
          </div>
          <p className="mt-0.5 text-sm text-ink-2">
            @{brand.handle}
            {site && (
              <>
                {" · "}
                <a href={brand.website!} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-violet-deep">
                  {site} ↗
                </a>
              </>
            )}
            {joined ? ` · On Clouta since ${joined}` : ""}
          </p>
          {brand.tagline && <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-body">{brand.tagline}</p>}
        </div>
        <dl className="grid grid-cols-2 border-t border-black/[.08] sm:grid-cols-4">
          {stats.map((s, n) => (
            <div key={s.label} className={`border-black/[.08] px-5 py-4 sm:px-7 ${n % 2 ? "border-l" : ""} ${n > 1 ? "border-t sm:border-t-0" : ""} ${n === 2 ? "sm:border-l" : ""}`}>
              <dt className="text-xs font-semibold text-ink-2">{s.label}</dt>
              <dd className="tabular mt-0.5 text-lg font-extrabold tracking-[-0.02em]">
                    <CountUp value={s.value} />
                  </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section className="panel p-6" aria-labelledby="b-about">
            <h2 id="b-about" className="eyebrow">
              About
            </h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-body">{brand.bio || `${brand.display_name} hasn't added a description yet.`}</p>
            {brand.niches.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {brand.niches.map((n) => (
                  <span key={n} className="badge-violet rounded-md px-2.5 py-1 text-xs font-semibold">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </section>
          <section className="panel p-6" aria-labelledby="b-reviews">
            <div className="flex items-center justify-between">
              <h2 id="b-reviews" className="eyebrow">
                What creators say
              </h2>
              {trust && trust.review_count > 5 && (
                <Link href={`/b/${brand.handle}/reviews`} className="text-sm font-semibold text-violet-deep">
                  See all {trust.review_count} →
                </Link>
              )}
            </div>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-body">Reviews appear here after this brand completes paid collabs on Clouta.</p>
            ) : (
              <div className="divide-y divide-black/[.06]">
                {reviews.map((r) => (
                  <ReviewCard key={r.review.id} review={r.review} authorName={r.authorName} reply={r.reply} subjectName={brand.display_name} viewerId={user?.id ?? null} votedInitially={r.voted} />
                ))}
              </div>
            )}
          </section>
        </div>
        <div className="flex flex-col gap-6">
          {(brand.budget || brand.audience) && (
            <section className="panel p-6 text-sm" aria-labelledby="b-work">
              <h2 id="b-work" className="eyebrow">
                Working with {brand.display_name}
              </h2>
              <dl className="mt-3 flex flex-col gap-3">
                {brand.budget && (
                  <div>
                    <dt className="text-xs font-semibold text-ink-2">Typical budget</dt>
                    <dd className="font-semibold">{brand.budget}</dd>
                  </div>
                )}
                {brand.audience && (
                  <div>
                    <dt className="text-xs font-semibold text-ink-2">Wants to reach</dt>
                    <dd className="font-semibold">{brand.audience}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
          <TrustPanel trust={trust} role="brand" reviewsHref={`/b/${brand.handle}/reviews`} />
          {socials.length > 0 && (
            <section className="panel p-6" aria-labelledby="b-socials">
              <h2 id="b-socials" className="eyebrow">
                Socials
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {socials.map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <span className="grid size-8 flex-none place-items-center rounded-lg text-[10px] font-extrabold text-white" style={{ background: PLATFORMS[s.platform].color }}>
                      {PLATFORMS[s.platform].short}
                    </span>
                    <a href={profileUrl(s.platform, s.handle)} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-violet-deep">
                      @{s.handle}
                    </a>
                    <span className="text-xs text-ink-2">{formatFollowers(s.followers)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!isOwner && (
            <div className="flex justify-center">
              <ReportButton targetType="profile" targetId={brand.id} ownerId={brand.id} ownerName={brand.display_name} viewerId={user?.id ?? null} blocked={Boolean(blockRow)} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
