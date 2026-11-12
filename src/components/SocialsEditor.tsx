"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, PLATFORM_KEYS, formatFollowers, parseFollowers, profileUrl, type PlatformKey } from "@/lib/platforms";
import type { Social } from "@/lib/auth";

/** Add, edit and remove linked social accounts. Saves straight to the database. */
export default function SocialsEditor({ userId, initial, onChange }: { userId: string; initial: Social[]; onChange?: () => void }) {
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
    onChange?.();
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

  async function verify(id: number) {
    setError(null);
    const { error } = await supabase.rpc("request_social_verification", { p_social_id: id });
    if (error) return setError(error.message);
    await reload();
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
            const pending = !s.verified && s.verify_requested_at && s.verify_code;
            return (
              <li key={s.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
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
                  {s.verified ? (
                    <span className="rounded-md bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok">✓ Verified</span>
                  ) : pending ? (
                    <span className="rounded-md bg-[#FFF4D6] px-2 py-0.5 text-xs font-semibold text-[#7A5200]">Pending review</span>
                  ) : (
                    <button type="button" onClick={() => verify(s.id)} className="min-h-9 rounded-lg border border-violet-deep px-3 text-xs font-semibold text-violet-deep">
                      Verify
                    </button>
                  )}
                  <button type="button" onClick={() => remove(s.id)} className="min-h-11 px-2 text-sm font-semibold text-err" aria-label={`Remove ${p.label}`}>
                    Remove
                  </button>
                </div>
                {pending && (
                  <div className="mt-3 rounded-xl bg-[#F7F5FF] p-3 text-sm text-body">
                    Add <b className="rounded bg-white px-1.5 py-0.5 font-mono text-ink">{s.verify_code}</b> anywhere in your{" "}
                    <a href={profileUrl(s.platform, s.handle)} target="_blank" rel="noopener noreferrer" className="font-semibold text-violet-deep underline underline-offset-2">
                      {p.label} bio
                    </a>
                    . We&apos;ll check it and confirm your follower count, usually within a day. You can remove the code once you see ✓ Verified.
                  </div>
                )}
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
        Your account with the most followers becomes your main one. Tap Verify to prove an account is yours. Verified accounts get a ✓
        that brands see, and changing a verified account&apos;s handle or followers removes the ✓ until it&apos;s checked again.
      </p>
    </div>
  );
}
