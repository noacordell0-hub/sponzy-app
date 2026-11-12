"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/Icons";
import { getUtm, track } from "@/lib/analytics";

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

/** Where on the page this form sits, for analytics. */
function location_(id: string) {
  return id.includes("bottom") ? "footer" : id.includes("hero") ? "hero" : id;
}

/** Waitlist signup. After joining, shows place in line and a personal invite link. */
export default function WaitlistForm({ id, dark = false }: { id: string; dark?: boolean }) {
  const [form, setForm] = useState<FormState>({ kind: "idle" });
  const [status, setStatus] = useState<Status | null>(null);

  // Returning visitor on the same device: show their current place in line.
  // (Also picks up ?joined=CODE after a signup made without JavaScript.)
  useEffect(() => {
    let joined: string | null = null;
    try {
      joined = new URLSearchParams(location.search).get("joined");
    } catch {}
    if (joined && /^[a-z0-9]{6,12}$/.test(joined)) save(joined);
    const code = readSaved();
    if (!code) return;
    fetch(`/api/waitlist?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Status | null) => s && setStatus(s))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.kind === "loading") return; // ignore double clicks while saving
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const ref = refFromUrl();
    track("waitlist_submit", { location: location_(id), referred: Boolean(ref) });
    // Quick check in the browser for instant feedback; the server checks again.
    if (!email) {
      track("waitlist_error", { reason: "empty" });
      return setForm({ kind: "error", message: "Enter your email to claim your spot." });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      track("waitlist_error", { reason: "invalid_email_client" });
      return setForm({ kind: "error", message: "Please enter a valid email address." });
    }
    setForm({ kind: "loading" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company: data.get("company"), role: "creator", ref, ...getUtm() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        track("waitlist_error", { reason: res.status === 429 ? "rate_limited" : res.status === 400 ? "invalid_email" : `http_${res.status}` });
        throw new Error(json.error || "Something went wrong. Please try again.");
      }
      track("waitlist_success", { location: location_(id), returning: Boolean(json.returning), referred: Boolean(ref) });
      if (ref && !json.returning) track("referral_signup", { referrer: ref });
      if (json.code) {
        save(json.code);
        setStatus({ code: json.code, position: json.position, referrals: json.referrals, total: json.total });
      }
      setForm({ kind: "idle" });
    } catch (err) {
      if (!(err instanceof Error) || err.message === "Failed to fetch") track("waitlist_error", { reason: "network" });
      setForm({ kind: "error", message: err instanceof Error && err.message !== "Failed to fetch" ? err.message : "We couldn't reach Clouta. Check your connection and try again." });
    }
  }

  if (status) return <ReferralCard status={status} dark={dark} />;

  return (
    <form onSubmit={onSubmit} method="post" action="/api/waitlist" noValidate className="flex max-w-[560px] flex-col gap-2">
      <input type="hidden" name="role" value="creator" />
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
      <p className={`text-xs ${dark ? "text-[#D9D3FF]" : "text-ink-2"}`}>
        By joining, you agree to our{" "}
        <a href="/terms" className="underline underline-offset-2">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </a>
        . You must be 13 or older.
      </p>
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
      track("invite_link_copied", { referrals: status.referrals });
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
      track("invite_link_shared", { method: "native_share" });
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
          onCopy={() => track("invite_link_copied", { referrals: status.referrals, method: "manual" })}
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
