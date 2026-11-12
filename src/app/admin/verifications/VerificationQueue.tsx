"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, formatFollowers, parseFollowers, profileUrl, type PlatformKey } from "@/lib/platforms";

type Pending = {
  id: number;
  platform: PlatformKey;
  handle: string;
  followers: number;
  verify_code: string;
  verify_requested_at: string;
  display_name: string | null;
  profile_handle: string | null;
  is_minor: boolean;
};

export default function VerificationQueue({ initial }: { initial: Pending[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initial);
  const [counts, setCounts] = useState<Record<number, string>>(Object.fromEntries(initial.map((i) => [i.id, String(i.followers)])));
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  async function review(item: Pending, approve: boolean) {
    const n = approve ? parseFollowers(counts[item.id] ?? "") : null;
    if (approve && n === null) return setErrors((e) => ({ ...e, [item.id]: "Enter the follower count shown on the profile." }));
    setBusy(item.id);
    const { error } = await supabase.rpc("admin_review_social", { p_social_id: item.id, p_approve: approve, p_followers: n });
    setBusy(null);
    if (error) return setErrors((e) => ({ ...e, [item.id]: error.message }));
    setItems((list) => list.filter((i) => i.id !== item.id));
  }

  if (items.length === 0) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-lg font-bold">All caught up</p>
        <p className="mt-1 text-sm text-body">No accounts are waiting for verification.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-5 text-sm leading-relaxed text-body">
        <b className="text-ink">How to check:</b> open the profile, confirm the code is in the bio, then enter the follower count you
        see there and approve. Reject if the code is missing or the account looks fake.
      </div>
      {items.map((i) => {
        const p = PLATFORMS[i.platform];
        return (
          <div key={i.id} className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-11 flex-none place-items-center rounded-xl text-sm font-extrabold text-white" style={{ background: p.color }}>
                {p.short}
              </span>
              <div className="min-w-0">
                <a href={profileUrl(i.platform, i.handle)} target="_blank" rel="noopener noreferrer" className="font-bold text-violet-deep underline underline-offset-2">
                  @{i.handle} on {p.label} ↗
                </a>
                <p className="text-sm text-body">
                  Look for <b className="font-mono text-ink">{i.verify_code}</b> · claims {formatFollowers(i.followers)} followers
                </p>
                <p className="text-xs text-ink-2">
                  {i.display_name} (@{i.profile_handle}) · requested {new Date(i.verify_requested_at).toLocaleString()}
                  {i.is_minor && " · under 18"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor={`fc-${i.id}`} className="text-xs font-semibold">
                  Real followers
                </label>
                <input
                  id={`fc-${i.id}`}
                  value={counts[i.id] ?? ""}
                  onChange={(e) => setCounts((c) => ({ ...c, [i.id]: e.target.value }))}
                  inputMode="decimal"
                  className="min-h-11 w-32 rounded-[10px] border border-black/12 px-3 text-sm"
                />
              </div>
              <button type="button" onClick={() => review(i, false)} disabled={busy === i.id} className="btn btn-ghost min-h-11 px-4 text-sm">
                Reject
              </button>
              <button type="button" onClick={() => review(i, true)} disabled={busy === i.id} className="btn min-h-11 px-4 text-sm">
                {busy === i.id ? "Saving…" : "Approve"}
              </button>
            </div>
            {errors[i.id] && (
              <p role="alert" className="text-sm font-semibold text-err md:basis-full">
                {errors[i.id]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
