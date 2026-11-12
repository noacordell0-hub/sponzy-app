import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalProfile, type Profile, type Social } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import SaveButton from "@/components/SaveButton";
import { THEMES } from "@/lib/look";
import { PLATFORMS, formatFollowers, profileUrl } from "@/lib/platforms";
import { money } from "@/lib/format";
import type { Post, Service } from "@/lib/market";
import { loadReviews, loadTrust } from "@/lib/review-data";
import { BadgeRow, TrustPanel } from "@/components/TrustPanel";
import ReviewCard from "@/components/ReviewCard";
import ReportButton from "@/components/ReportButton";
import { Stars } from "@/components/Stars";

type Params = { params: Promise<{ handle: string }> };

async function load(handle: string) {
  const ctx = await getOptionalProfile();
  const { data: creator } = await ctx.supabase.from("profiles").select("*").eq("handle", handle.toLowerCase()).eq("role", "creator").maybeSingle<Profile>();
  return { ...ctx, creator };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const { creator } = await load(handle);
  if (!creator) return { title: "Creator not found · Clouta" };
  return {
    title: `${creator.display_name} (@${creator.handle}) · Clouta`,
    description: creator.tagline ?? `Book ${creator.display_name} for brand collabs on Clouta.`,
  };
}

export default async function CreatorPage({ params }: Params) {
  const { handle } = await params;
  const { supabase, user, profile: viewer, creator } = await load(handle);
  if (!creator || !creator.onboarded_at) notFound();

  const isOwner = user?.id === creator.id;
  const [{ data: post }, { data: socialsData }, { data: savedRow }] = await Promise.all([
    supabase.from("posts").select("*").eq("creator_id", creator.id).maybeSingle<Post>(),
    supabase.from("social_accounts").select("*").eq("profile_id", creator.id).order("followers", { ascending: false }),
    user ? supabase.from("saved_creators").select("creator_id").eq("brand_id", user.id).eq("creator_id", creator.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: servicesData } = post
    ? await supabase.from("services").select("*").eq("post_id", post.id).order("position").order("id")
    : { data: [] as Service[] };

  const [{ trust, badges }, reviews] = await Promise.all([loadTrust(supabase, creator.id), loadReviews(supabase, creator.id, user?.id ?? null, 3)]);
  const { data: blockRow } = user && !isOwner ? await supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", creator.id).maybeSingle() : { data: null };
  const shownBadges = creator.show_badges ? badges : badges.filter((b) => b === "verified_socials");
  const services = (servicesData as Service[]) ?? [];
  const socials = (socialsData as Social[]) ?? [];
  const main = socials.find((s) => s.is_main);
  const verifiedFollowers = socials.filter((s) => s.verified).reduce((n, s) => n + s.followers, 0);
  const theme = THEMES[creator.theme] ?? THEMES.violet;
  const published = Boolean(post?.published);
  const about = post?.bio || creator.bio;

  return (
    <AppShell profile={viewer} active="browse" wide>
      {isOwner && !published && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F2D58A] bg-[#FFF9E8] px-5 py-4 text-[#6B4700]">
          <p className="text-sm font-semibold">Your shop is a draft. Only you can see this page until you publish it.</p>
          <Link href="/post/edit" className="btn min-h-10 px-4 text-sm">
            Edit my shop
          </Link>
        </div>
      )}

      {/* Header */}
      <section className="panel overflow-hidden">
        <div className="h-32 sm:h-40" style={{ background: theme.banner }} />
        <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
          <span className="-mt-12 self-start rounded-[30px] border-[5px] border-white sm:-mt-14">
            <Avatar name={creator.display_name} source={creator.avatar_source} pattern={creator.avatar_pattern} url={creator.avatar_url} mainPlatform={main?.platform} size={104} rounded={26} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">{creator.display_name}</h1>
            <p className="text-sm text-ink-2">
              @{creator.handle}
              {creator.location ? ` · ${creator.location}` : ""}
            </p>
            {trust && trust.review_count > 0 && (
              <Link href={`/c/${creator.handle}/reviews`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-violet-deep">
                <Stars value={Number(trust.avg_rating)} />
                {Number(trust.avg_rating).toFixed(1)} <span className="font-normal text-ink-2">({trust.review_count})</span>
              </Link>
            )}
            {creator.tagline && <p className="mt-2 max-w-2xl text-[15px] text-body">{creator.tagline}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <BadgeRow codes={shownBadges} />
              {verifiedFollowers > 0 && !shownBadges.includes("verified_socials") && <span className="rounded-md bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok">✓ Verified socials</span>}
              {creator.young_tag && <span className="badge-violet rounded-md px-2 py-0.5 text-xs font-semibold">Young entrepreneur</span>}
              {!creator.taking_bookings && <span className="rounded-md bg-[#FFF4D6] px-2 py-0.5 text-xs font-semibold text-[#7A5200]">Fully booked</span>}
            </div>
          </div>
          <div className="flex flex-none gap-2">
            {isOwner ? (
              <Link href="/settings/account" className="btn btn-ghost min-h-11 px-4 text-sm">
                Edit profile
              </Link>
            ) : (
              <>
                <SaveButton creatorId={creator.id} initialSaved={Boolean(savedRow)} viewerId={user?.id ?? null} />
                <Link href={`/messages/new?to=${creator.handle}`} className="btn min-h-11 px-4 text-sm" style={{ background: theme.button, color: theme.text }}>
                  Message
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {!isOwner && (
        <div className="mt-2 flex justify-end">
          <ReportButton targetType="profile" targetId={creator.id} ownerId={creator.id} ownerName={creator.display_name} viewerId={user?.id ?? null} blocked={Boolean(blockRow)} />
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_400px]">
        {/* Services */}
        <section aria-labelledby="services-title" className="flex flex-col gap-4 lg:order-2">
          <h2 id="services-title" className="eyebrow on-bg-muted">
            Services
          </h2>
          {services.length === 0 ? (
            <div className="panel p-6 text-sm text-body">{isOwner ? "You haven't added any services yet." : `${creator.display_name} hasn't listed services yet.`}</div>
          ) : (
            services.map((s) => (
              <div key={s.id} className="panel flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{s.name}</p>
                    <p className="text-xs text-ink-2">
                      {s.turnaround_days}-day turnaround · {s.revisions === 0 ? "No revisions" : `${s.revisions} revision${s.revisions > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <p className="text-lg font-extrabold">{money(s.price_cents)}</p>
                </div>
                {s.is_bundle && <span className="badge-violet self-start rounded-md px-2 py-0.5 text-[11px] font-semibold">Bundle</span>}
                {s.includes && <p className="text-sm leading-relaxed text-body">{s.includes}</p>}
                {isOwner ? null : creator.payouts_ready && creator.taking_bookings ? (
                  <Link href={`/checkout/${s.id}`} className="btn min-h-11 text-sm" style={{ background: theme.button, color: theme.text }}>
                    Book · {money(s.price_cents)}
                  </Link>
                ) : (
                  <button type="button" disabled className="btn min-h-11 text-sm" title={creator.taking_bookings ? "This creator hasn't finished payout setup yet" : "Fully booked right now"}>
                    {creator.taking_bookings ? "Booking opens soon" : "Fully booked"}
                  </button>
                )}
              </div>
            ))
          )}
          <div className="panel flex items-start gap-3 bg-ok-bg/60 p-4 text-sm text-ok">
            <span aria-hidden="true">🔒</span>
            <p>
              <b>Payment held by Clouta.</b> Brands pay up front and the creator is paid once the work is approved.
            </p>
          </div>
        </section>

        {/* About, audience, socials */}
        <div className="flex flex-col gap-6 lg:order-1">
          <TrustPanel trust={trust} role="creator" reviewsHref={`/c/${creator.handle}/reviews`} />
          {about && (
            <section className="panel p-6" aria-labelledby="about-title">
              <h2 id="about-title" className="eyebrow">
                About
              </h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-body">{about}</p>
              {creator.niches.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {creator.niches.map((n) => (
                    <Link key={n} href={`/browse?niche=${encodeURIComponent(n)}`} className="rounded-md bg-black/[.05] px-2.5 py-1 text-xs font-semibold text-body hover:text-ink">
                      {n}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {creator.show_audience && (creator.audience || main) && (
            <section className="panel p-6" aria-labelledby="aud-title">
              <h2 id="aud-title" className="eyebrow">
                Audience snapshot
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                {creator.audience && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-ink-2">Who watches</dt>
                    <dd className="mt-0.5 text-sm font-semibold">{creator.audience}</dd>
                  </div>
                )}
                {main && (
                  <div>
                    <dt className="text-xs font-semibold text-ink-2">Best platform</dt>
                    <dd className="mt-0.5 text-sm font-semibold">
                      {PLATFORMS[main.platform].label} · {formatFollowers(main.followers)}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {socials.length > 0 && (
            <section className="panel p-6" aria-labelledby="soc-title">
              <h2 id="soc-title" className="eyebrow">
                Socials
              </h2>
              <ul className="mt-3 divide-y divide-black/[.06]">
                {socials.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-9 flex-none place-items-center rounded-lg text-xs font-extrabold text-white" style={{ background: PLATFORMS[s.platform].color }}>
                      {PLATFORMS[s.platform].short}
                    </span>
                    <a href={profileUrl(s.platform, s.handle)} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold hover:text-violet-deep">@{s.handle}</span>
                      <span className="block text-xs text-ink-2">
                        {PLATFORMS[s.platform].label} · {formatFollowers(s.followers)} followers
                      </span>
                    </a>
                    {s.verified ? (
                      <span className="rounded-md bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok">✓ Verified</span>
                    ) : (
                      <span className="rounded-md bg-black/[.05] px-2 py-0.5 text-xs font-semibold text-ink-2" title="Follower count is self-reported">
                        Unverified
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel p-6" aria-labelledby="rev-title">
            <div className="flex items-center justify-between">
              <h2 id="rev-title" className="eyebrow">
                Reviews from brands
              </h2>
              {trust && trust.review_count > 3 && (
                <Link href={`/c/${creator.handle}/reviews`} className="text-sm font-semibold text-violet-deep">
                  See all {trust.review_count} →
                </Link>
              )}
            </div>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-body">No reviews yet. Reviews appear after paid collabs, once both sides have left one.</p>
            ) : (
              <div className="divide-y divide-black/[.06]">
                {reviews.map((r) => (
                  <ReviewCard key={r.review.id} review={r.review} authorName={r.authorName} reply={r.reply} subjectName={creator.display_name} viewerId={user?.id ?? null} votedInitially={r.voted} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
