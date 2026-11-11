"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, PLATFORM_KEYS, formatFollowers, parseFollowers, type PlatformKey } from "@/lib/platforms";
import type { Social } from "@/lib/auth";

/** Add, edit and remove linked social accounts. Saves straight to the database. */
export default function SocialsEditor({ userId, initial }: { userId: string; initial: Social[] }) {
  const [socials, setSocials] = useState<Social[]>(initial);
  const [platform, setPlatform] = useState<PlatformKey>(PLATFORM_KEYS.find((k) => !initial.some((s) => s.platform === k)) ?? "tiktok");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function reload() {
    const { data } = await supabase.from("social_accounts").select("*").eq("profile_id", userId).order("followers", { ascending: false });
    setSocials((data as Social[]) ?? []);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const h = handle.trim().replace(/^@/, "");
    const n = parseFollowers(followers || "0");
    if (!/^[A-Za-z0-9_.]{1,40}$/.test(h)) return setError("Enter your handle without spaces, like mayamoves.");
    if (n === null) return setError("Enter followers as a number, like 12500 or 12.5k.");
    setBusy(true);
    const { error } = await supabase.from("social_accounts").insert({ profile_id: userId, platform, handle: h, followers: n });
    setBusy(false);
    if (error) return setError(error.code === "23505" ? `You've already linked ${PLATFORMS[platform].label}.` : "Couldn't save that account.");
    setHandle("");
    setFollowers("");
    await reload();
    const nextFree = PLATFORM_KEYS.find((k) => k !== platform && !socials.some((s) => s.platform === k));
    if (nextFree) setPlatform(nextFree);
  }

  async function remove(id: number) {
    await supabase.from("social_accounts").delete().eq("id", id);
    await reload();
  }

  return (
    <div className="flex flex-col gap-4">
      {socials.length > 0 && (
        <ul className="divide-y divide-black/[.06] rounded-xl border border-black/[.08]">
          {socials.map((s) => {
            const p = PLATFORMS[s.platform];
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-9 flex-none place-items-center rounded-lg text-xs font-extrabold text-white" style={{ background: p.color }}>
                  {p.short}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">@{s.handle}</p>
                  <p className="text-xs text-ink-2">
                    {p.label} · {formatFollowers(s.followers)} followers
                  </p>
                </div>
                {s.is_main && <span className="badge-gold rounded-md px-2 py-0.5 text-xs font-semibold">Main</span>}
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${s.verified ? "bg-ok-bg text-ok" : "bg-black/[.05] text-ink-2"}`}>
                  {s.verified ? "Verified" : "Unverified"}
                </span>
                <button type="button" onClick={() => remove(s.id)} className="min-h-11 px-2 text-sm font-semibold text-err" aria-label={`Remove ${p.label}`}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[130px_1fr_110px_auto]">
        <label className="sr-only" htmlFor="soc-platform">
          Platform
        </label>
        <select
          id="soc-platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as PlatformKey)}
          className="min-h-11 rounded-[10px] border border-black/12 bg-white px-3 text-sm font-medium"
        >
          {PLATFORM_KEYS.map((k) => (
            <option key={k} value={k} disabled={socials.some((s) => s.platform === k)}>
              {PLATFORMS[k].label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="soc-handle">
          Handle
        </label>
        <input
          id="soc-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle"
          className="min-h-11 rounded-[10px] border border-black/12 bg-white px-3 text-sm"
        />
        <label className="sr-only" htmlFor="soc-followers">
          Followers
        </label>
        <input
          id="soc-followers"
          value={followers}
          onChange={(e) => setFollowers(e.target.value)}
          placeholder="Followers"
          inputMode="decimal"
          className="min-h-11 rounded-[10px] border border-black/12 bg-white px-3 text-sm"
        />
        <button type="submit" className="btn min-h-11 px-4 text-sm" disabled={busy || socials.length >= PLATFORM_KEYS.length}>
          {busy ? "Adding…" : "Add"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-semibold text-err">
          {error}
        </p>
      )}
      <p className="text-xs text-ink-2">
        Your account with the most followers becomes your main one. Accounts show as unverified until we confirm them; automatic
        verification is coming soon.
      </p>
    </div>
  );
}
