"use client";

import { useMemo, useState } from "react";

const PRESETS: { label: string; source: string; medium: string }[] = [
  { label: "TikTok bio", source: "tiktok", medium: "bio" },
  { label: "TikTok video", source: "tiktok", medium: "video" },
  { label: "Instagram bio", source: "instagram", medium: "bio" },
  { label: "Instagram story", source: "instagram", medium: "story" },
  { label: "YouTube", source: "youtube", medium: "description" },
  { label: "X / Twitter", source: "x", medium: "post" },
  { label: "DM to a creator", source: "dm", medium: "outreach" },
  { label: "Email", source: "email", medium: "email" },
  { label: "Discord / group chat", source: "community", medium: "chat" },
];

const clean = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** Makes tagged links (UTM) so Metrics can show which place each signup came from. */
export default function LinkBuilder({ siteUrl }: { siteUrl: string }) {
  const [source, setSource] = useState("tiktok");
  const [medium, setMedium] = useState("bio");
  const [campaign, setCampaign] = useState("");
  const [page, setPage] = useState("/");
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    const u = new URL(page || "/", siteUrl);
    if (clean(source)) u.searchParams.set("utm_source", clean(source));
    if (clean(medium)) u.searchParams.set("utm_medium", clean(medium));
    if (clean(campaign)) u.searchParams.set("utm_campaign", clean(campaign));
    return u.toString();
  }, [source, medium, campaign, page, siteUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the link is visible and selectable */
    }
  }

  return (
    <section className="panel mt-6 p-6" aria-labelledby="lb-t">
      <h2 id="lb-t" className="eyebrow">Link builder</h2>
      <p className="mt-1 text-sm text-body">
        Use a different link for each place you share Clouta. Signups from it show up under <b>Signups by source</b> and <b>Campaigns</b> above.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const on = p.source === source && p.medium === medium;
          return (
            <button key={p.label} type="button" aria-pressed={on} onClick={() => { setSource(p.source); setMedium(p.medium); }}
              className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${on ? "border-violet/50 bg-[#F3F0FF] text-violet-deep" : "border-black/12 bg-white text-body hover:text-ink"}`}>
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ["lb-source", "Source (where)", source, setSource, "tiktok"],
          ["lb-medium", "Medium (how)", medium, setMedium, "bio"],
          ["lb-campaign", "Campaign (optional)", campaign, setCampaign, "launch-week"],
          ["lb-page", "Page", page, setPage, "/"],
        ].map(([id, label, value, set, ph]) => (
          <div key={id as string} className="flex flex-col gap-1">
            <label htmlFor={id as string} className="text-sm font-semibold">{label as string}</label>
            <input id={id as string} value={value as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} placeholder={ph as string} className="input" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="lb-out" className="sr-only">Your tagged link</label>
        <input id="lb-out" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input flex-1 bg-[#FAF8F3] font-mono text-sm" />
        <button type="button" onClick={copy} className="btn min-h-12 px-5 text-sm">{copied ? "Copied!" : "Copy link"}</button>
      </div>
      <p className="mt-2 text-xs text-ink-2">Tip: give each video or post its own campaign name (for example <code>nov-tutorial</code>) to see which one worked best.</p>
    </section>
  );
}
