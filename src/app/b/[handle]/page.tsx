import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalProfile, type Profile, type Social } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { THEMES } from "@/lib/look";
import { PLATFORMS, formatFollowers, profileUrl } from "@/lib/platforms";

type Params = { params: Promise<{ handle: string }> };

async function load(handle: string) {
  const ctx = await getOptionalProfile();
  const { data: brand } = await ctx.supabase.from("profiles").select("*").eq("handle", handle.toLowerCase()).eq("role", "brand").maybeSingle<Profile>();
  return { ...ctx, brand };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const { brand } = await load(handle);
  return brand ? { title: `${brand.display_name} · Brand on Clouta`, description: brand.tagline ?? undefined } : { title: "Brand not found · Clouta" };
}

export default async function BrandPage({ params }: Params) {
  const { handle } = await params;
  const { supabase, user, profile: viewer, brand } = await load(handle);
  if (!brand || !brand.onboarded_at) notFound();
  const isOwner = user?.id === brand.id;
  const { data: socialsData } = await supabase.from("social_accounts").select("*").eq("profile_id", brand.id).order("followers", { ascending: false });
  const socials = (socialsData as Social[]) ?? [];
  const theme = THEMES[brand.theme] ?? THEMES.violet;
  let site: string | null = null;
  try {
    site = brand.website ? new URL(brand.website).host.replace(/^www\./, "") : null;
  } catch {
    site = null;
  }

  return (
    <AppShell profile={viewer} active="browse">
      <section className="panel overflow-hidden">
        <div className="h-32" style={{ background: theme.banner }} />
        <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
          <span className="-mt-12 self-start rounded-[26px] border-[5px] border-white">
            <Avatar name={brand.display_name} source={brand.avatar_source} pattern={brand.avatar_pattern} url={brand.avatar_url} size={92} rounded={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-[-0.03em]">{brand.display_name}</h1>
            <p className="text-sm text-ink-2">
              @{brand.handle}
              {site && (
                <>
                  {" · "}
                  <a href={brand.website!} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-violet-deep">
                    {site} ↗
                  </a>
                </>
              )}
              {brand.budget ? ` · Typical budget ${brand.budget}` : ""}
            </p>
            {brand.tagline && <p className="mt-2 max-w-2xl text-[15px] text-body">{brand.tagline}</p>}
          </div>
          {isOwner ? (
            <Link href="/settings/account" className="btn btn-ghost min-h-11 px-4 text-sm">
              Edit profile
            </Link>
          ) : (
            <span className="btn min-h-11 cursor-not-allowed px-4 text-sm opacity-60" aria-disabled="true" title="Messaging opens soon" style={{ background: theme.button, color: theme.text }}>
              Message
            </span>
          )}
        </div>
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
            {brand.audience && (
              <p className="mt-4 text-sm text-body">
                <b className="text-ink">Wants to reach:</b> {brand.audience}
              </p>
            )}
          </section>
          <section className="panel p-6" aria-labelledby="b-reviews">
            <h2 id="b-reviews" className="eyebrow">
              What creators say
            </h2>
            <p className="mt-3 text-sm text-body">Reviews appear here after this brand completes paid collabs on Clouta.</p>
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <section className="panel p-6" aria-labelledby="b-trust">
            <h2 id="b-trust" className="eyebrow">
              Brand trust score
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <b className="text-3xl tracking-[-0.03em]">New</b>
              <span className="badge-violet rounded-full px-2.5 py-1 text-xs font-semibold">No orders yet</span>
            </div>
            <p className="mt-2 text-xs text-ink-2">Scores start after 3 completed orders, from paying on time, approval speed and disputes.</p>
          </section>
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
        </div>
      </div>
    </AppShell>
  );
}
