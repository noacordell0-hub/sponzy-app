import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import SaveButton from "@/components/SaveButton";
import { THEMES } from "@/lib/look";
import { PLATFORMS, formatFollowers } from "@/lib/platforms";
import { money } from "@/lib/format";
import type { CreatorResult } from "@/lib/market";

/** Browse result card, marketplace style: who they are, proof (rating, verified reach), and a clear starting price. */
export function CreatorCard({ c, saved, viewerId }: { c: CreatorResult; saved: boolean; viewerId: string | null }) {
  const tags = [
    c.badges?.includes("top_rated") && { label: "Top Rated", cls: "badge-gold" },
    c.badges?.includes("on_time_pro") && { label: "On-Time Pro", cls: "bg-ok-bg text-ok" },
    c.is_founding && { label: "Founding", cls: "badge-gold" },
    c.young_tag && { label: "Young entrepreneur", cls: "badge-violet" },
    ...c.niches.slice(0, 2).map((n) => ({ label: n, cls: "border border-black/10 text-body" })),
  ].filter(Boolean) as { label: string; cls: string }[];

  return (
    <Link href={`/c/${c.handle}`} className="panel lift group relative flex flex-col overflow-hidden">
      <div className="h-1" style={{ background: THEMES[c.theme]?.banner ?? THEMES.violet.banner }} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Avatar name={c.display_name} source={c.avatar_source} pattern={c.avatar_pattern} url={c.avatar_url} size={52} rounded={14} />
          <div className="min-w-0 flex-1">
            <p className="flex items-start gap-1.5">
              <span className="line-clamp-2 break-words text-[16px] font-bold leading-snug group-hover:text-violet-deep">{c.display_name}</span>
              {c.has_verified && (
                <svg viewBox="0 0 20 20" className="mt-[3px] size-4 flex-none text-ok" fill="currentColor" role="img" aria-label="Verified">
                  <path d="M10 1.5l2.1 1.6 2.6-.2.9 2.5 2.3 1.3-.6 2.6.6 2.6-2.3 1.3-.9 2.5-2.6-.2L10 18.5l-2.1-1.6-2.6.2-.9-2.5-2.3-1.3.6-2.6-.6-2.6 2.3-1.3.9-2.5 2.6.2L10 1.5zm-1.2 11.3l5-5-1.1-1.1-3.9 3.9-1.8-1.8-1.1 1.1 2.9 2.9z" />
                </svg>
              )}
            </p>
            <p className="truncate text-[13px] text-ink-2">@{c.handle}</p>
            <p className="mt-0.5 text-[13px]">
              {c.review_count > 0 ? (
                <>
                  <span className="text-[#E5A100]" aria-hidden="true">★</span> <b>{Number(c.avg_rating).toFixed(1)}</b>
                  <span className="text-ink-2"> ({c.review_count})</span>
                </>
              ) : (
                <span className="text-ink-2">New on Clouta</span>
              )}
            </p>
          </div>
          <SaveButton creatorId={c.id} initialSaved={saved} viewerId={viewerId} compact />
        </div>
        {c.tagline && <p className="line-clamp-2 text-sm leading-relaxed text-body">{c.tagline}</p>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((t) => (
              <span key={t.label} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${t.cls}`}>
                {t.label}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/[.08] pt-3">
          <div className="flex min-w-0 items-center gap-1">
            {c.platforms.slice(0, 4).map((p) => (
              <span key={p} title={PLATFORMS[p].label} className="grid size-6 place-items-center rounded-md text-[9px] font-extrabold text-white" style={{ background: PLATFORMS[p].color }}>
                {PLATFORMS[p].short}
              </span>
            ))}
            {c.verified_followers > 0 && <span className="ml-1.5 truncate text-xs font-semibold text-body">{formatFollowers(c.verified_followers)} followers</span>}
          </div>
          <p className="flex-none text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-2">From</span>
            <b className="tabular text-[17px] leading-none">{money(c.min_price_cents)}</b>
          </p>
        </div>
        {!c.taking_bookings && <p className="-mt-1 text-xs font-semibold text-[#7A5200]">Fully booked right now</p>}
      </div>
    </Link>
  );
}
