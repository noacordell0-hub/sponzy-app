import Link from "next/link";

export type ChecklistItem = { done: boolean; title: string; why: string; href: string; cta: string };

/** "Getting started" list: what's done, and the single next thing to do. Hidden once everything is done. */
export function Checklist({ items, title = "Getting started" }: { items: ChecklistItem[]; title?: string }) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  const next = items.find((i) => !i.done)!;
  return (
    <section className="panel p-6" aria-labelledby="checklist-t">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="checklist-t" className="eyebrow">{title}</h2>
        <span className="text-sm font-semibold text-ink-2">
          {done} of {items.length} done
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[.06]" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-label="Setup progress">
        <div className="h-full rounded-full bg-[#5B3DF5]" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ol className="mt-4 flex flex-col divide-y divide-black/[.08]">
        {items.map((i) => {
          const isNext = i === next;
          return (
            <li key={i.title} className="flex items-center gap-3 py-3">
              <span
                aria-hidden="true"
                className={`grid size-7 flex-none place-items-center rounded-full text-xs font-bold ${i.done ? "bg-ok text-white" : isNext ? "bg-[#5B3DF5] text-white" : "border border-black/20 text-ink-2"}`}
              >
                {i.done ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${i.done ? "text-ink-2 line-through" : ""}`}>{i.title}</span>
                {!i.done && <span className="block text-xs text-body">{i.why}</span>}
              </span>
              {!i.done && (
                <Link href={i.href} className={`btn min-h-10 flex-none px-4 text-sm ${isNext ? "" : "btn-ghost"}`}>
                  {i.cta}
                </Link>
              )}
              {i.done && <span className="sr-only">Done</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** One number with a label, an optional comparison to the previous period, and a plain-English note. */
export function Stat({ label, value, prev, note, format = (n: number) => n.toLocaleString() }: { label: string; value: number; prev?: number; note?: string; format?: (n: number) => string }) {
  const change = prev === undefined ? null : prev === 0 ? (value > 0 ? "new" : null) : Math.round(((value - prev) / prev) * 100);
  return (
    <div className="panel p-5">
      <p className="text-sm font-bold text-ink">{label}</p>
      <p className="tabular mt-1 text-3xl font-extrabold tracking-[-0.03em]">{format(value)}</p>
      <p className="mt-0.5 text-xs text-ink-2">
        {change === "new" ? <span className="font-semibold text-ok">New this period · </span> : change !== null && change !== 0 ? (
          <span className={`font-semibold ${change > 0 ? "text-ok" : "text-err"}`}>{change > 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous · </span>
        ) : null}
        {note}
      </p>
    </div>
  );
}

/** Small single-series bar chart (one value per day) with a hover label and a text summary for screen readers. */
export function DailyBars({ days, label }: { days: { d: string; n: number }[]; label: string }) {
  const max = Math.max(1, ...days.map((x) => x.n));
  const total = days.reduce((a, x) => a + x.n, 0);
  if (total === 0)
    return <p className="rounded-xl bg-[#FAF8F3] px-4 py-6 text-center text-sm text-body">No views in the last {days.length} days yet. Share your shop link and they&apos;ll show up here.</p>;
  return (
    <div>
      <div className="flex h-28 items-end gap-[2px] border-b border-black/10" role="img" aria-label={`${label}: ${total} in the last ${days.length} days, best day ${max}`}>
        {days.map((x) => (
          <div key={x.d} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t-[4px] bg-[#5B3DF5]" style={{ height: `${(x.n / max) * 100}%`, minHeight: x.n ? 2 : 0 }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {new Date(x.d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}: {x.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-2">
        <span>{new Date(days[0].d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Things that need the person's attention right now, most urgent first. */
export function ActionList({ items, empty }: { items: { href: string; title: string; detail: string; urgent?: boolean }[]; empty: string }) {
  return (
    <section className="panel p-6" aria-labelledby="actions-t">
      <h2 id="actions-t" className="eyebrow">Needs your attention</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-body">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((a) => (
            <li key={a.href + a.title}>
              <Link href={a.href} className={`flex items-center gap-3 rounded-xl border px-4 py-3 hover:bg-black/[.02] ${a.urgent ? "border-[#F2B8C6] bg-[#FFF5F7]" : "border-black/10"}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{a.title}</span>
                  <span className="block text-xs text-body">{a.detail}</span>
                </span>
                <span aria-hidden="true" className="text-ink-2">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function dayKeys(n: number) {
  const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return Array.from({ length: n }, (_, i) => key(new Date(Date.now() - (n - 1 - i) * 864e5)));
}
export const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
