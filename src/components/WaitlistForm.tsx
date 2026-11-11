"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/Icons";

type Status = { code: string; position: number; referrals: number; total: number };
type FormState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };

const STORAGE_KEY = "clouta-waitlist-code";
export const REFERRAL_GOAL = 3;

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function save(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode: fine, status just won't persist */
  }
}
function refFromUrl(): string | null {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    return ref && /^[a-z0-9]{6,12}$/.test(ref) ? ref : null;
  } catch {
    return null;
  }
}

/** Waitlist signup. After joining, shows place in line and a personal invite link. */
export default function WaitlistForm({ id, dark = false }: { id: string; dark?: boolean }) {
  const [form, setForm] = useState<FormState>({ kind: "idle" });
  const [status, setStatus] = useState<Status | null>(null);

  // Returning visitor on the same device: show their current place in line.
  useEffect(() => {
    const code = readSaved();
    if (!code) return;
    fetch(`/api/waitlist?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Status | null) => s && setStatus(s))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setForm({ kind: "loading" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), company: data.get("company"), role: "creator", ref: refFromUrl() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
      if (json.code) {
        save(json.code);
        setStatus({ code: json.code, position: json.position, referrals: json.referrals, total: json.total });
      }
      setForm({ kind: "idle" });
    } catch (err) {
      setForm({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  if (status) return <ReferralCard status={status} dark={dark} />;

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-[560px] flex-col gap-2">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          Your email
        </label>
        <input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email"
          className="min-h-[52px] flex-1 rounded-[12px] border border-black/12 bg-white px-4 text-base font-medium text-ink shadow-[inset_0_1px_2px_rgba(21,19,31,.04)] placeholder:text-ink-2 focus:border-violet focus:shadow-[0_0_0_4px_rgba(108,71,255,.16)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={form.kind === "loading"}
          className={`btn min-h-[52px] whitespace-nowrap px-6 text-base ${dark ? "![background:#fff] !text-[#4A2FD0] !shadow-none" : ""}`}
        >
          {form.kind === "loading" ? "Saving…" : "Claim my spot"}
        </button>
      </div>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {form.kind === "error" && (
        <p role="alert" className="rounded-[14px] bg-err-bg px-4 py-3 text-sm font-bold text-err">
          {form.message}
        </p>
      )}
    </form>
  );
}

function ReferralCard({ status, dark }: { status: Status; dark: boolean }) {
  const [copied, setCopied] = useState(false);
  const linkId = useId();
  const [origin, setOrigin] = useState("https://clouta.vercel.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/?ref=${status.code}`;
  const done = Math.min(status.referrals, REFERRAL_GOAL);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is visible and selectable */
    }
  }
  async function share() {
    try {
      await navigator.share({
        title: "Join me on Clouta",
        text: "Clouta lets creators sell brand deals from one link, with payment held until the work is approved. Join the waitlist:",
        url: link,
      });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div
      role="status"
      className={`chip-pop max-w-[560px] rounded-2xl p-5 ${dark ? "bg-white text-ink" : "border border-black/[.08] bg-white shadow-[0_8px_24px_rgba(21,19,31,.06)]"}`}
    >
      <p className="text-sm font-semibold text-ok">You&apos;re on the list. Your Founding Creator spot is saved.</p>
      <p className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
        You&apos;re #{status.position.toLocaleString()} <span className="text-lg font-semibold text-ink-2">in line</span>
      </p>
      <p className="mt-1 text-sm text-body">Each friend who joins with your link moves you up 5 spots.</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={linkId} className="sr-only">
          Your invite link
        </label>
        <input
          id={linkId}
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 flex-1 rounded-[10px] border border-black/12 bg-[#F7F5FF] px-3 text-sm font-medium text-ink"
        />
        <button type="button" onClick={copy} className="btn min-h-11 px-4 text-sm">
          <Icon name="copy" size={16} />
          {copied ? "Copied!" : "Copy link"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="btn btn-ghost min-h-11 px-4 text-sm">
            <Icon name="share" size={16} />
            Share
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">
            Invite {REFERRAL_GOAL} friends to get into the first beta wave
          </span>
          <span className="font-bold text-violet-deep">
            {done}/{REFERRAL_GOAL}
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-black/[.06]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={REFERRAL_GOAL}
          aria-valuenow={done}
          aria-label="Friends invited"
        >
          <div className="h-full rounded-full bg-violet-deep transition-all" style={{ width: `${(done / REFERRAL_GOAL) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
