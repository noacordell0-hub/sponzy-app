import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AppShell } from "@/components/AppShell";
import { FOUNDING_SPOTS } from "@/lib/site";
import { AdminHeader } from "../AdminNav";

export const metadata: Metadata = { title: "Metrics · Clouta Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

type Row = { id: number; role: string; source: string | null; created_at: string; referral_code: string; referred_by: number | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null };

const DAYS = 30;

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-bold text-ink">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-[-0.03em]">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-2">{note}</p>}
    </div>
  );
}

function Table({ title, head, rows, empty }: { title: string; head: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <section className="panel overflow-hidden">
      <h2 className="eyebrow px-5 pt-5">{title}</h2>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-body">{empty}</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-2">
              {head.map((h, i) => <th key={h} className={`px-5 py-2 font-bold ${i ? "text-right" : ""}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.06]">
            {rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className={`px-5 py-2 ${j ? "text-right tabular-nums" : "font-semibold"}`}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Private growth dashboard: waitlist signups, sources, referrals, funnel events and recent errors. Admins only. */
export default async function MetricsPage() {
  const { profile } = await requireProfile();
  if (!profile.is_admin) notFound();
  const admin = getSupabaseAdmin();
  if (!admin) notFound();

  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const [{ data: wl }, { data: errors }, events, { count: members }] = await Promise.all([
    admin.from("waitlist").select("id, role, source, created_at, referral_code, referred_by, utm_source, utm_medium, utm_campaign").order("created_at").limit(20000),
    admin.from("error_events").select("created_at, level, route, message").order("created_at", { ascending: false }).limit(15),
    admin.from("analytics_events").select("name, visitor_id").gte("created_at", since).limit(50000).then((r) => r, () => ({ data: null, error: true })),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("onboarded_at", "is", null),
  ]);
  const rows = (wl as Row[]) ?? [];
  const creators = rows.filter((r) => r.role === "creator").length;
  const referred = rows.filter((r) => r.referred_by).length;
  const spotsLeft = Math.max(0, FOUNDING_SPOTS - creators);

  // Signups per day for the last 30 days (Pacific time, the business's day).
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const days = Array.from({ length: DAYS }, (_, i) => dayKey(new Date(Date.now() - (DAYS - 1 - i) * 864e5)));
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const r of rows) {
    const k = dayKey(new Date(r.created_at));
    if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const series = days.map((d) => ({ d, n: perDay.get(d) ?? 0 }));
  const max = Math.max(1, ...series.map((s) => s.n));
  const last7 = series.slice(-7).reduce((n, s) => n + s.n, 0);

  // Sources: UTM source/medium when present, otherwise the older "source" column.
  const bySource = new Map<string, number>();
  for (const r of rows) {
    const k = r.utm_source ? `${r.utm_source}${r.utm_medium ? ` / ${r.utm_medium}` : ""}` : r.source === "referral" ? "invite / referral" : "direct or unknown";
    bySource.set(k, (bySource.get(k) ?? 0) + 1);
  }
  const campaigns = new Map<string, number>();
  for (const r of rows) if (r.utm_campaign) campaigns.set(r.utm_campaign, (campaigns.get(r.utm_campaign) ?? 0) + 1);

  // Referrals: who invited the most people, and how invites are spread.
  const invites = new Map<number, number>();
  for (const r of rows) if (r.referred_by) invites.set(r.referred_by, (invites.get(r.referred_by) ?? 0) + 1);
  const codeById = new Map(rows.map((r) => [r.id, r.referral_code]));
  const top = [...invites.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const dist = [0, 1, 2, 3].map((n) => ({ n, c: rows.filter((r) => (invites.get(r.id) ?? 0) === n || (n === 3 && (invites.get(r.id) ?? 0) >= 3)).length }));
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  // First-party funnel (only once the analytics_events table exists).
  const ev = (events as { data: { name: string; visitor_id: string | null }[] | null }).data;
  const uniq = (name: string) => (ev ? new Set(ev.filter((e) => e.name === name).map((e) => e.visitor_id ?? Math.random())).size : 0);
  const funnel = ev ? ["landing_view", "cta_click", "waitlist_submit", "waitlist_success", "invite_link_copied", "referral_signup"].map((n) => ({ n, v: uniq(n) })) : null;

  return (
    <AppShell profile={profile} active="admin" wide>
      <AdminHeader title="Metrics" active="metrics" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Waitlist signups" value={rows.length.toLocaleString()} note={`${creators} creators · ${rows.length - creators} brands`} />
        <Tile label="Last 7 days" value={last7.toLocaleString()} />
        <Tile label="From invites" value={pct(referred, rows.length)} note={`${referred} of ${rows.length}`} />
        <Tile label="Founding spots left" value={spotsLeft.toLocaleString()} note={`of ${FOUNDING_SPOTS.toLocaleString()}`} />
        <Tile label="App members" value={(members ?? 0).toLocaleString()} note="finished onboarding" />
      </div>

      <section className="panel mt-6 p-6" aria-labelledby="daily-t">
        <div className="flex items-baseline justify-between">
          <h2 id="daily-t" className="eyebrow">Signups per day · last {DAYS} days</h2>
          <span className="text-xs text-ink-2">Peak {max}</span>
        </div>
        <div className="mt-4 flex h-40 items-end gap-[2px] border-b border-black/10" role="img" aria-label={`Daily waitlist signups for the last ${DAYS} days, peak ${max}`}>
          {series.map((s) => (
            <div key={s.d} className="group relative flex h-full flex-1 items-end">
              <div className="w-full rounded-t-[4px] bg-[#5B3DF5]" style={{ height: `${(s.n / max) * 100}%`, minHeight: s.n ? 2 : 0 }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white group-hover:block">
                {s.d}: {s.n}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-2">
          <span>{series[0].d}</span>
          <span>{series[series.length - 1].d}</span>
        </div>
        <details className="mt-3 text-xs text-ink-2">
          <summary className="cursor-pointer">Show as table</summary>
          <p className="mt-2 leading-relaxed">{series.filter((s) => s.n).map((s) => `${s.d}: ${s.n}`).join(" · ") || "No signups in this period."}</p>
        </details>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Table title="Signups by source" head={["Source", "Signups", "Share"]} rows={[...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, pct(v, rows.length)])} empty="No signups yet." />
        <Table title="Campaigns (utm_campaign)" head={["Campaign", "Signups"]} rows={[...campaigns.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v])} empty="No tagged campaigns yet. Add ?utm_source=…&utm_campaign=… to links you share." />
        <Table title="Top referrers" head={["Invite code", "Friends joined"]} rows={top.map(([id, n]) => [codeById.get(id) ?? `#${id}`, n])} empty="No one has invited a friend yet." />
        <Table title="Invites per person" head={["Friends invited", "People", "Share"]} rows={dist.map((d) => [d.n === 3 ? "3+ (first beta wave)" : String(d.n), d.c, pct(d.c, rows.length)])} empty="No signups yet." />
      </div>

      <section className="panel mt-6 p-6" aria-labelledby="funnel-t">
        <h2 id="funnel-t" className="eyebrow">Landing funnel · unique visitors, last {DAYS} days</h2>
        {funnel ? (
          <ol className="mt-3 flex flex-col gap-2">
            {funnel.map((f, i) => (
              <li key={f.n} className="flex items-center gap-3 text-sm">
                <span className="w-44 font-semibold">{f.n}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/[.06]">
                  <span className="block h-full rounded-full bg-[#5B3DF5]" style={{ width: `${(f.v / Math.max(1, funnel[0].v)) * 100}%` }} />
                </span>
                <span className="w-24 text-right tabular-nums">{f.v}{i > 0 ? ` · ${pct(f.v, funnel[i - 1].v)}` : ""}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-body">Funnel events are sent to Vercel Analytics now. To also see them here, the analytics_events table needs to be created (waiting for approval).</p>
        )}
      </section>

      <section className="panel mt-6 overflow-hidden" aria-labelledby="err-t">
        <h2 id="err-t" className="eyebrow px-5 pt-5">Recent errors</h2>
        {(errors ?? []).length === 0 ? (
          <p className="p-5 text-sm text-body">No errors recorded. 🎉</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/[.06] text-sm">
            {(errors ?? []).map((e, i) => (
              <li key={i} className="px-5 py-2.5">
                <span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] font-bold ${e.level === "client" ? "bg-[#FFF4D6] text-[#7A5200]" : "bg-err-bg text-err"}`}>{e.level}</span>
                <span className="font-semibold">{e.route ?? "?"}</span>
                <span className="ml-2 text-xs text-ink-2">{new Date(e.created_at).toLocaleString()}</span>
                <p className="mt-0.5 break-words text-body">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
