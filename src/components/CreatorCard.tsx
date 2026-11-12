import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import SaveButton from "@/components/SaveButton";
import { THEMES } from "@/lib/look";
import { PLATFORMS, formatFollowers } from "@/lib/platforms";
import { money } from "@/lib/format";
import type { CreatorResult } from "@/lib/market";

/** Browse result card: banner in the creator's theme, avatar, badges, niches, platforms and starting price. */
export function CreatorCard({ c, saved, viewerId }: { c: CreatorResult; saved: boolean; viewerId: string | null }) {
  return (
    <Link href={`/c/${c.handle}`} className="panel group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(91,61,245,.14)]">
      <div className="h-16" style={{ background: THEMES[c.theme]?.banner ?? THEMES.violet.banner }} />
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <div className="-mt-7 flex items-end justify-between gap-2">
          <span className="rounded-[18px] border-4 border-white">
            <Avatar name={c.display_name} source={c.avatar_source} pattern={c.avatar_pattern} url={c.avatar_url} size={56} rounded={14} />
          </span>
          <SaveButton creatorId={c.id} initialSaved={saved} viewerId={viewerId} compact />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold group-hover:text-violet-deep">{c.display_name}</p>
          <p className="truncate text-[13px] text-ink-2">
            @{c.handle}
            {c.review_count > 0 && (
              <span className="ml-1.5 font-semibold text-ink">
                <span className="text-[#F5B400]" aria-hidden="true">★</span> {Number(c.avg_rating).toFixed(1)}
                <span className="font-normal text-ink-2"> ({c.review_count})</span>
              </span>
            )}
          </p>
        </div>
        {c.tagline && <p className="line-clamp-2 text-sm leading-relaxed text-body">{c.tagline}</p>}
        <div className="flex flex-wrap gap-1.5">
          {c.badges?.includes("top_rated") && <span className="badge-gold rounded-md px-2 py-0.5 text-[11px] font-semibold">♛ Top Rated</span>}
          {c.badges?.includes("on_time_pro") && <span className="rounded-md bg-ok-bg px-2 py-0.5 text-[11px] font-semibold text-ok">⏱ On-Time Pro</span>}
          {c.is_founding && <span className="badge-gold rounded-md px-2 py-0.5 text-[11px] font-semibold">Founding</span>}
          {c.has_verified && <span className="rounded-md bg-ok-bg px-2 py-0.5 text-[11px] font-semibold text-ok">✓ Verified</span>}
          {c.young_tag && <span className="badge-violet rounded-md px-2 py-0.5 text-[11px] font-semibold">Young entrepreneur</span>}
          {c.niches.slice(0, 2).map((n) => (
            <span key={n} className="rounded-md bg-black/[.05] px-2 py-0.5 text-[11px] font-semibold text-body">
              {n}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-black/[.06] pt-3">
          <div className="flex items-center gap-1">
            {c.platforms.slice(0, 4).map((p) => (
              <span key={p} title={PLATFORMS[p].label} className="grid size-6 place-items-center rounded-md text-[9px] font-extrabold text-white" style={{ background: PLATFORMS[p].color }}>
                {PLATFORMS[p].short}
              </span>
            ))}
            {c.verified_followers > 0 && <span className="ml-1.5 text-xs font-semibold text-body">{formatFollowers(c.verified_followers)} verified</span>}
          </div>
          <p className="text-sm text-body">
            from <b className="text-ink">{money(c.min_price_cents)}</b>
          </p>
        </div>
        {!c.taking_bookings && <p className="-mt-1 text-xs font-semibold text-[#7A5200]">Fully booked right now</p>}
      </div>
    </Link>
  );
}
