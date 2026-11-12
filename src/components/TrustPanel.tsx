import Link from "next/link";
import { Stars } from "@/components/Stars";
import { BADGES, BADGE_ORDER, TIER_LABEL, levelInfo, showScore, type BadgeCode, type Trust } from "@/lib/trust";

const TONE = { gold: "badge-gold", violet: "badge-violet", ok: "bg-ok-bg text-ok border border-ok/20" } as const;

/** Badge chips (hexagon icon + name). */
export function BadgeRow({ codes, max }: { codes: string[]; max?: number }) {
  const list = BADGE_ORDER.filter((c) => codes.includes(c)).slice(0, max);
  if (list.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {list.map((c) => {
        const b = BADGES[c as BadgeCode];
        return (
          <li key={c} title={b.desc} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${TONE[b.tone]}`}>
            <span aria-hidden="true" className="hex grid size-4 place-items-center text-[9px] leading-none">
              {b.icon}
            </span>
            {b.name}
          </li>
        );
      })}
    </ul>
  );
}

/** Trust score card for creator and brand profiles. */
export function TrustPanel({ trust, role, reviewsHref }: { trust: Trust | null; role: "creator" | "brand"; reviewsHref: string }) {
  const scored = showScore(trust);
  const lvl = levelInfo(trust?.points ?? 0);
  const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(Number(n) * 100)}%`);
  return (
    <section className="panel p-6" aria-labelledby="trust-t">
      <h2 id="trust-t" className="eyebrow">
        {role === "brand" ? "Brand trust score" : "Trust score"}
      </h2>
      <div className="mt-3 flex items-end gap-3">
        <b className="text-4xl leading-none tracking-[-0.03em]">{scored ? trust!.score : "New"}</b>
        {scored && <span className="pb-1 text-sm text-ink-2">/ 100</span>}
        <span className={`mb-0.5 ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${trust?.tier === "highly_trusted" ? "bg-ok-bg text-ok" : "badge-violet"}`}>
          {scored ? TIER_LABEL[trust!.tier] : trust?.completed ? `${trust.completed} of 3 orders` : "No orders yet"}
        </span>
      </div>
      {!scored && <p className="mt-2 text-xs text-ink-2">Scores start after 3 completed orders on Clouta.</p>}

      {trust && trust.review_count > 0 && (
        <Link href={reviewsHref} className="mt-4 flex items-center gap-2 text-sm font-semibold hover:text-violet-deep">
          <Stars value={Number(trust.avg_rating)} />
          {Number(trust.avg_rating).toFixed(1)} · {trust.review_count} review{trust.review_count === 1 ? "" : "s"} →
        </Link>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-black/[.06] pt-4 text-sm">
        <div>
          <dt className="text-xs text-ink-2">Completed</dt>
          <dd className="font-bold">{trust?.completed ?? 0}</dd>
        </div>
        {role === "creator" ? (
          <>
            <div>
              <dt className="text-xs text-ink-2">On time</dt>
              <dd className="font-bold">{pct(trust?.on_time_rate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">Current streak</dt>
              <dd className="font-bold">{trust?.streak ? `🔥 ${trust.streak}` : 0}</dd>
            </div>
          </>
        ) : (
          <div>
            <dt className="text-xs text-ink-2">Repeat creators</dt>
            <dd className="font-bold">{trust?.repeat_partners ?? 0}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-ink-2">Would rehire</dt>
          <dd className="font-bold">{pct(trust?.rehire_rate)}</dd>
        </div>
      </dl>

      {role === "creator" && (
        <div className="mt-4 border-t border-black/[.06] pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-violet-deep">Orbit level · {lvl.level.name}</span>
            <span className="text-ink-2">{lvl.next ? `${lvl.toNext} pts to ${lvl.next.name}` : "Max level"}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[.06]" role="progressbar" aria-valuenow={Math.round(lvl.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next orbit level">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7B5CFF] to-[#C04CFF]" style={{ width: `${Math.max(4, lvl.pct * 100)}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}
