import type { Metadata } from "next";
import Link from "next/link";
import { getOptionalProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { LEVELS } from "@/lib/trust";

export const metadata: Metadata = { title: "Leaderboard · Clouta", description: "Top rated creators, longest on-time streaks and rising stars on Clouta.", alternates: { canonical: "/leaderboard" } };

const BOARDS = {
  top_rated: { label: "Top rated", blurb: "Highest average rating. Minimum 5 reviews.", unit: (v: number, d: number) => `★ ${v.toFixed(2)} · ${d} review${d === 1 ? "" : "s"}` },
  streak: { label: "Longest streak", blurb: "Orders in a row delivered on time with no dispute.", unit: (v: number) => `🔥 ${v} in a row` },
  rising: { label: "Rising stars", blurb: "Accounts under 90 days old, ranked by orbit points earned.", unit: (v: number, d: number) => `${v} pts · ${d} collab${d === 1 ? "" : "s"}` },
} as const;
const PERIODS = { week: "This week", season: "This season", all: "All time" } as const;
type Board = keyof typeof BOARDS;
type Period = keyof typeof PERIODS;

type Row = { rank: number; id: string; handle: string; display_name: string; avatar_source: "auto" | "pattern" | "upload"; avatar_pattern: number; avatar_url: string | null; value: number; detail: number; level: string };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string; period?: string }> }) {
  const sp = await searchParams;
  const board: Board = sp.board && sp.board in BOARDS ? (sp.board as Board) : "top_rated";
  const period: Period = board === "streak" ? "all" : sp.period && sp.period in PERIODS ? (sp.period as Period) : "all";
  const { supabase, user, profile } = await getOptionalProfile();
  const { data } = await supabase.rpc("leaderboard", { p_board: board, p_period: period, p_limit: 50 });
  const rows = (data as Row[]) ?? [];
  const mine = user ? rows.find((r) => r.id === user.id) : null;
  const href = (b: Board, p: Period) => `/leaderboard?board=${b}${p !== "all" && b !== "streak" ? `&period=${p}` : ""}`;
  const medal = ["🥇", "🥈", "🥉"];

  return (
    <AppShell profile={profile} active="browse">
      <h1 className="on-bg text-3xl font-extrabold tracking-[-0.03em]">Leaderboard</h1>
      <p className="on-bg-muted mt-1.5 text-[15px] text-body">Earned only from completed, paid orders and real reviews.</p>

      <nav aria-label="Boards" className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(BOARDS) as Board[]).map((b) => (
          <Link key={b} href={href(b, period)} aria-current={b === board ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${b === board ? "bg-violet-deep text-white" : "bg-white text-body shadow-sm hover:text-ink"}`}>
            {BOARDS[b].label}
          </Link>
        ))}
      </nav>
      {board !== "streak" && (
        <nav aria-label="Period" className="mt-3 flex gap-4 text-sm font-semibold">
          {(Object.keys(PERIODS) as Period[]).map((p) => (
            <Link key={p} href={href(board, p)} aria-current={p === period ? "page" : undefined} className={p === period ? "text-violet-deep underline underline-offset-4" : "on-bg-muted text-ink-2 hover:text-ink"}>
              {PERIODS[p]}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <section className="panel overflow-hidden" aria-label={BOARDS[board].label}>
          <p className="border-b border-black/[.06] px-5 py-3 text-xs text-ink-2">{BOARDS[board].blurb}</p>
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-body">No one on this board yet. Complete paid collabs to get ranked!</p>
          ) : (
            <ol className="divide-y divide-black/[.06]">
              {rows.map((r) => (
                <li key={r.id} className={r.id === user?.id ? "bg-[#F7F5FF]" : ""}>
                  <Link href={`/c/${r.handle}`} className="flex items-center gap-4 px-5 py-3 hover:bg-black/[.02]">
                    <span className="w-8 text-center text-lg font-extrabold">{r.rank <= 3 ? medal[r.rank - 1] : r.rank}</span>
                    <Avatar name={r.display_name} source={r.avatar_source} pattern={r.avatar_pattern} url={r.avatar_url} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{r.display_name}</span>
                      <span className="block text-xs text-ink-2">@{r.handle} · {LEVELS.find((l) => l.key === r.level)?.name ?? "Comet"}</span>
                    </span>
                    <span className="text-sm font-semibold">{BOARDS[board].unit(Number(r.value), r.detail)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
        <aside className="flex flex-col gap-4">
          {mine && <div className="panel p-5 text-sm"><b>You&apos;re #{mine.rank}</b> on this board. Keep going!</div>}
          <section className="panel p-5">
            <h2 className="eyebrow">Orbit levels</h2>
            <p className="mt-2 text-xs text-ink-2">10 points per completed collab, +5 if on time, +5 for each 5-star review.</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {LEVELS.map((l) => <li key={l.key} className="flex justify-between"><span className="font-semibold">{l.name}</span><span className="text-ink-2">{l.min}+ pts</span></li>)}
            </ul>
          </section>
          <p className="text-xs text-ink-2">Creators can hide themselves from the leaderboard in Settings.</p>
        </aside>
      </div>
    </AppShell>
  );
}
