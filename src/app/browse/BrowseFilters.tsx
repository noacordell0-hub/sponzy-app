"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NICHES, TIERS } from "@/lib/format";
import { PLATFORMS, PLATFORM_KEYS } from "@/lib/platforms";

/** Search, filters and sort for Browse. Everything lives in the URL so results can be shared and bookmarked. */
export default function BrowseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const [open, setOpen] = useState(false);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }

  // Debounce typing in search and price boxes.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q || (params.get("min") ?? "") !== min || (params.get("max") ?? "") !== max) {
        update({ q: q.trim() || null, min: min || null, max: max || null });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, min, max]);

  const toggle = (key: string, value: string) => update({ [key]: params.get(key) === value ? null : value });
  const flag = (key: string) => params.get(key) === "1";
  const active = Array.from(params.keys()).some((k) => !["sort", "page"].includes(k));

  const chip = (on: boolean) =>
    `min-h-9 rounded-full border px-3 text-[13px] font-semibold transition ${on ? "border-violet-deep bg-[#F3F0FF] text-violet-deep" : "border-black/10 bg-white text-body hover:text-ink"}`;

  const body = (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="f-q" className="sr-only">
          Search creators
        </label>
        <input id="f-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, handle or niche" className="input" type="search" />
      </div>

      <div>
        <label htmlFor="f-sort" className="text-xs font-bold uppercase tracking-[0.08em] text-ink-2">
          Sort by
        </label>
        <select id="f-sort" value={params.get("sort") ?? "recommended"} onChange={(e) => update({ sort: e.target.value === "recommended" ? null : e.target.value })} className="input mt-2">
          <option value="recommended">Recommended</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rating">Highest rated</option>
          <option value="followers">Most verified followers</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-[0.08em] text-ink-2">Niche</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {NICHES.map((n) => (
            <button key={n} type="button" aria-pressed={params.get("niche") === n} onClick={() => toggle("niche", n)} className={chip(params.get("niche") === n)}>
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-[0.08em] text-ink-2">Platform</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PLATFORM_KEYS.map((p) => (
            <button key={p} type="button" aria-pressed={params.get("platform") === p} onClick={() => toggle("platform", p)} className={chip(params.get("platform") === p)}>
              {PLATFORMS[p].label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-[0.08em] text-ink-2">Starting price (USD)</legend>
        <div className="mt-2 flex items-center gap-2">
          <label htmlFor="f-min" className="sr-only">
            Minimum price
          </label>
          <input id="f-min" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d]/g, ""))} placeholder="Min" inputMode="numeric" className="input" />
          <span className="text-ink-2">–</span>
          <label htmlFor="f-max" className="sr-only">
            Maximum price
          </label>
          <input id="f-max" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ""))} placeholder="Max" inputMode="numeric" className="input" />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-[0.08em] text-ink-2">Verified followers</legend>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {TIERS.map((t) => (
            <button key={t.key} type="button" aria-pressed={params.get("tier") === t.key} onClick={() => toggle("tier", t.key)} className={`${chip(params.get("tier") === t.key)} !rounded-xl py-1.5 text-left`}>
              <span className="block">{t.label}</span>
              <span className="block text-[11px] font-medium">{t.range}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-ink-2">Badges</legend>
        {(
          [
            ["top", "Top Rated (4.8+, 10+ reviews)"],
            ["ontime", "On-Time Pro"],
            ["verified", "Verified socials"],
            ["founding", "Founding Creator"],
            ["young", "Young entrepreneur"],
            ["bookable", "Taking bookings now"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={flag(k)} onChange={() => update({ [k]: flag(k) ? null : "1" })} className="size-[18px] accent-[#5B3DF5]" />
            {label}
          </label>
        ))}
        <p className="mt-1 text-xs text-ink-2">Top Rated, On-Time Pro and ratings arrive once reviews launch.</p>
      </fieldset>

      {active && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setMin("");
            setMax("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="btn btn-ghost min-h-11 text-sm"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <aside aria-label="Filters" className={`panel p-5 lg:sticky lg:top-24 ${pending ? "opacity-70" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="filters-body"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between font-bold lg:hidden"
      >
        Search and filters{active ? " (on)" : ""}
        <span className={`text-ink-2 transition ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      <div id="filters-body" className={open ? "mt-4 lg:mt-0" : "hidden lg:block"}>
        {body}
      </div>
    </aside>
  );
}
