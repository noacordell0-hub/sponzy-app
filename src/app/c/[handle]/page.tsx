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
import { CountUp } from "@/components/Delight";
import Comments, { type CommentRow } from "@/components/Comments";
import TrackView from "@/components/TrackView";
import { Stars } from "@/components/Stars";
import ServicePicker from "./ServicePicker";

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
  const title = `${creator.display_name} (@${creator.handle}) · Clouta`;
  const description = creator.tagline ?? `Book ${creator.display_name} for brand collabs on Clouta.`;
  return {
    title,
    description,
    alternates: { canonical: `/c/${creator.handle}` },
    openGraph: { type: "profile", title, description, url: `/c/${creator.handle}` },
    twitter: { card: "summary_large_image", title, description },
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
  // Community comments (hidden if the creator switched them off).
  let comments: CommentRow[] = [];
  let liked: number[] = [];
  if (creator.show_comments) {
    const { data: cs } = await supabase.from("comments").select("id, parent_id, author_id, body, like_count, created_at, author:profiles!comments_author_id_fkey(display_name, handle, role, avatar_source, avatar_pattern, avatar_url)").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(100);
    comments = (cs as unknown as CommentRow[]) ?? [];
    if (user && comments.length) {
      const { data: ls } = await supabase.from("comment_likes").select("comment_id").eq("profile_id", user.id).in("comment_id", comments.map((c) => c.id));
      liked = (ls ?? []).map((l) => l.comment_id as number);
    }
  }
  const shownBadges = creator.show_badges ? badges : badges.filter((b) => b === "verified_socials");
  const services = (servicesData as Service[]) ?? [];
  // Visitors only ever see verified accounts (the database enforces this too); the owner sees all of theirs.
  const socials = ((socialsData as Social[]) ?? []).filter((s) => isOwner || s.verified);
  const main = socials.find((s) => s.is_main) ?? socials[0];
  const verifiedFollowers = socials.filter((s) => s.verified).reduce((n, s) => n + s.followers, 0);
  const theme = THEMES[creator.theme] ?? THEMES.violet;
  const published = Boolean(post?.published);
  const about = post?.bio || creator.bio;

  const bookable = Boolean(creator.payouts_ready && creator.taking_bookings);
  const joined = creator.onboarded_at ? new Date(creator.onboarded_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;
  const fromPrice = services.length ? Math.min(...services.map((s) => s.price_cents)) : null;
  const stats: { label: string; value: string }[] = [
    { label: "Verified reach", value: verifiedFollowers > 0 ? formatFollowers(verifiedFollowers) : "—" },
    { label: "Orders completed", value: String(trust?.completed ?? 0) },
    { label: "On-time delivery", value: trust?.on_time_rate != null && (trust?.completed ?? 0) > 0 ? `${Math.round(Number(trust.on_time_rate) * 100)}%` : "—" },
    { label: "Rating", value: trust && trust.review_count > 0 ? `${Number(trust.avg_rating).toFixed(1)} (${trust.review_count})` : "New" },
  ];
  const sections = [
    { id: "overview", label: "Overview" },
    ...(socials.length ? [{ id: "socials", label: "Platforms" }] : []),
    { id: "reviews", label: "Reviews" },
    ...(creator.show_comments ? [{ id: "community", label: "Community" }] : []),
  ];

  return (
    <AppShell profile={viewer} active="browse" wide>
      {/* Counts toward the creator's shop stats (the owner's own visits don't count). */}
      {!isOwner && published && <TrackView name="profile_view" props={{ creator: creator.id }} />}
      {isOwner && !published && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F2D58A] bg-[#FFF9E8] px-5 py-4 text-[#6B4700]">
          <p className="text-sm font-semibold">Your shop is a draft. Only you can see this page until you publish it.</p>
          <Link href="/post/edit" className="btn min-h-10 px-4 text-sm">
            Edit my shop
          </Link>
        </div>
      )}

      <nav aria-label="Breadcrumb" className="on-bg-muted mb-4 text-sm text-ink-2">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/browse" className="hover:text-ink">
              Creators
            </Link>
          </li>
          {creator.niches[0] && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/browse?niche=${encodeURIComponent(creator.niches[0])}`} className="hover:text-ink">
                  {creator.niches[0]}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-ink">
            {creator.display_name}
          </li>
        </ol>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Profile header */}
          <section className="panel overflow-hidden">
            <div className="h-20 sm:h-24" style={{ background: theme.banner }} />
            <div className="px-5 pb-6 sm:px-7">
              <div className="flex items-end justify-between gap-3">
                <span className="-mt-10 rounded-[26px] border-[5px] border-white bg-white">
                  <Avatar name={creator.display_name} source={creator.avatar_source} pattern={creator.avatar_pattern} url={creator.avatar_url} mainPlatform={main?.platform} size={92} rounded={22} />
                </span>
                <div className="flex gap-2 pt-3">
                  {isOwner ? (
                    <Link href="/settings/account" className="btn btn-ghost min-h-10 px-4 text-sm">
                      Edit profile
                    </Link>
                  ) : (
                    <SaveButton creatorId={creator.id} initialSaved={Boolean(savedRow)} viewerId={user?.id ?? null} />
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-[28px]">{creator.display_name}</h1>
                {verifiedFollowers > 0 && (
                  <span title="Social accounts verified by Clouta" className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok">
                    <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden="true">
                      <path d="M10 1.5l2.1 1.6 2.6-.2.9 2.5 2.3 1.3-.6 2.6.6 2.6-2.3 1.3-.9 2.5-2.6-.2L10 18.5l-2.1-1.6-2.6.2-.9-2.5-2.3-1.3.6-2.6-.6-2.6 2.3-1.3.9-2.5 2.6.2L10 1.5zm-1.2 11.3l5-5-1.1-1.1-3.9 3.9-1.8-1.8-1.1 1.1 2.9 2.9z" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-ink-2">
                @{creator.handle}
                {creator.location ? ` · ${creator.location}` : ""}
                {joined ? ` · On Clouta since ${joined}` : ""}
              </p>
              {creator.tagline && <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-body">{creator.tagline}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <BadgeRow codes={shownBadges.filter((b) => b !== "verified_socials")} />
                {creator.young_tag && <span className="badge-violet rounded-md px-2 py-0.5 text-xs font-semibold">Young entrepreneur</span>}
                {!creator.taking_bookings && <span className="rounded-md bg-[#FFF4D6] px-2 py-0.5 text-xs font-semibold text-[#7A5200]">Fully booked</span>}
              </div>
            </div>
            {/* Key numbers, like any marketplace seller page */}
            <dl className="grid grid-cols-2 border-t border-black/[.08] sm:grid-cols-4">
              {stats.map((s, n) => (
                <div key={s.label} className={`px-5 py-4 sm:px-7 ${n % 2 ? "border-l" : ""} ${n > 1 ? "border-t sm:border-t-0" : ""} ${n === 2 ? "sm:border-l" : ""} border-black/[.08]`}>
                  <dt className="text-xs font-semibold text-ink-2">{s.label}</dt>
                  <dd className="tabular mt-0.5 text-lg font-extrabold tracking-[-0.02em]">
                    <CountUp value={s.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Services on small screens, right under the header (the sticky card is in the sidebar on desktop) */}
          <div className="scroll-mt-36 lg:hidden" id="services">
            <ServicePicker services={services} creatorId={creator.id} creatorName={creator.display_name ?? "this creator"} handle={creator.handle ?? ""} bookable={bookable} takingBookings={creator.taking_bookings} isOwner={isOwner} button={{ background: theme.button, color: theme.text }} />
          </div>

          {/* Section tabs */}
          <nav aria-label="Profile sections" className="panel sticky top-[72px] z-10 flex gap-1 overflow-x-auto px-2">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="min-h-12 whitespace-nowrap px-3 py-3.5 text-sm font-semibold text-ink-2 hover:text-ink">
                {s.label}
              </a>
            ))}
          </nav>

          {/* Overview */}
          <section id="overview" className="panel scroll-mt-36 p-6 sm:p-7" aria-labelledby="about-title">
            <h2 id="about-title" className="text-lg font-bold">
              About {creator.display_name}
            </h2>
            {about ? (
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-body">{about}</p>
            ) : (
              <p className="mt-3 text-sm text-ink-2">{isOwner ? "Add a short pitch in My shop so brands know what you make." : "No description yet."}</p>
            )}
            {(creator.niches.length > 0 || (creator.show_audience && (creator.audience || main))) && (
              <dl className="mt-6 grid gap-5 border-t border-black/[.08] pt-5 sm:grid-cols-3">
                {creator.niches.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-ink-2">Categories</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {creator.niches.map((n) => (
                        <Link key={n} href={`/browse?niche=${encodeURIComponent(n)}`} className="rounded-md border border-black/10 px-2 py-0.5 text-xs font-semibold text-body hover:border-black/25 hover:text-ink">
                          {n}
                        </Link>
                      ))}
                    </dd>
                  </div>
                )}
                {creator.show_audience && creator.audience && (
                  <div>
                    <dt className="text-xs font-semibold text-ink-2">Audience</dt>
                    <dd className="mt-1 text-sm font-semibold">{creator.audience}</dd>
                  </div>
                )}
                {creator.show_audience && main && (
                  <div>
                    <dt className="text-xs font-semibold text-ink-2">Main platform</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {PLATFORMS[main.platform].label} · {formatFollowers(main.followers)}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          <TrustPanel trust={trust} role="creator" reviewsHref={`/c/${creator.handle}/reviews`} />

          {socials.length > 0 && (
            <section id="socials" className="panel scroll-mt-36 p-6 sm:p-7" aria-labelledby="soc-title">
              <h2 id="soc-title" className="text-lg font-bold">
                Platforms
              </h2>
              <p className="mt-1 text-sm text-ink-2">Follower counts are checked by the Clouta team.</p>
              <ul className="mt-4 divide-y divide-black/[.08] border-y border-black/[.08]">
                {socials.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3.5">
                    <span className="grid size-9 flex-none place-items-center rounded-lg text-xs font-extrabold text-white" style={{ background: PLATFORMS[s.platform].color }}>
                      {PLATFORMS[s.platform].short}
                    </span>
                    <a href={profileUrl(s.platform, s.handle)} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold hover:text-violet-deep">@{s.handle}</span>
                      <span className="block text-xs text-ink-2">{PLATFORMS[s.platform].label}</span>
                    </a>
                    <span className="tabular text-sm font-bold">{formatFollowers(s.followers)}</span>
                    {s.verified ? (
                      <span className="rounded-md bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok">✓ Verified</span>
                    ) : (
                      <span className="rounded-md bg-black/[.05] px-2 py-0.5 text-xs font-semibold text-ink-2" title="Brands can't see this account until it's verified">
                        Not verified · only you see this
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="reviews" className="panel scroll-mt-36 p-6 sm:p-7" aria-labelledby="rev-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="rev-title" className="text-lg font-bold">
                Reviews from brands
                {trust && trust.review_count > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1.5 align-middle text-sm font-semibold">
                    <Stars value={Number(trust.avg_rating)} /> {Number(trust.avg_rating).toFixed(1)}
                    <span className="font-normal text-ink-2">({trust.review_count})</span>
                  </span>
                )}
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

          {creator.show_comments && (
            <div id="community" className="scroll-mt-36">
              <Comments creatorId={creator.id} creatorName={creator.display_name ?? "this creator"} viewerId={user?.id ?? null} initial={comments} liked={liked} />
            </div>
          )}
        </div>

        {/* Sidebar: services and booking, always in view on desktop */}
        <aside className="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex" aria-label="Services and booking">
          {fromPrice !== null && (
            <p className="on-bg-muted text-sm text-ink-2">
              Services from <b className="text-ink">{money(fromPrice)}</b>
            </p>
          )}
          <ServicePicker services={services} creatorId={creator.id} creatorName={creator.display_name ?? "this creator"} handle={creator.handle ?? ""} bookable={bookable} takingBookings={creator.taking_bookings} isOwner={isOwner} button={{ background: theme.button, color: theme.text }} />
          <div className="panel flex flex-col gap-3 p-5 text-sm">
            <p className="font-bold">Every booking is protected</p>
            <ul className="flex flex-col gap-2 text-body">
              <li>✓ You pay up front; Clouta holds the money</li>
              <li>✓ The creator is paid only after you approve</li>
              <li>✓ Free revisions and dispute support</li>
            </ul>
          </div>
          {!isOwner && (
            <div className="flex justify-center">
              <ReportButton targetType="profile" targetId={creator.id} ownerId={creator.id} ownerName={creator.display_name} viewerId={user?.id ?? null} blocked={Boolean(blockRow)} />
            </div>
          )}
        </aside>
        {!isOwner && (
          <div className="flex justify-center lg:hidden">
            <ReportButton targetType="profile" targetId={creator.id} ownerId={creator.id} ownerName={creator.display_name} viewerId={user?.id ?? null} blocked={Boolean(blockRow)} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
