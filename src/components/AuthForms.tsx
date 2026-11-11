"use client";

import { useState } from "react";
import Link from "next/link";
import EmailLinkForm from "@/components/EmailLinkForm";

/** Password (default) or email-link sign-in, switchable with tabs. */
export default function AuthForms({ mode, next }: { mode: "signup" | "login"; next?: string }) {
  const [tab, setTab] = useState<"password" | "link">("password");
  return (
    <div>
      <div role="tablist" aria-label="Sign-in method" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-black/[.05] p-1">
        {(
          [
            ["password", "Password"],
            ["link", "Email link"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-10 rounded-lg text-sm font-semibold transition ${tab === k ? "bg-white text-ink shadow-sm" : "text-body"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "password" ? <PasswordForm mode={mode} next={next} /> : <EmailLinkForm mode={mode} next={next} />}
    </div>
  );
}

function PasswordForm({ mode, next }: { mode: "signup" | "login"; next?: string }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; waitlist?: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, email: f.get("email"), password: f.get("password") }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setBusy(false);
      return setError({ text: json.error || "Something went wrong. Please try again.", waitlist: json.waitlist });
    }
    const safeNext = next && /^\/[a-z0-9/_-]*$/i.test(next) ? next : null;
    window.location.href = json.next ?? safeNext ?? "/settings/account";
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor="pw-email" className="text-sm font-semibold">
        Email
      </label>
      <input id="pw-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input" />
      <div className="flex items-center justify-between">
        <label htmlFor="pw-password" className="text-sm font-semibold">
          {mode === "signup" ? "Create a password" : "Password"}
        </label>
        <button type="button" onClick={() => setShow((s) => !s)} className="min-h-8 text-xs font-semibold text-violet-deep">
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <input
        id="pw-password"
        name="password"
        type={show ? "text" : "password"}
        required
        minLength={8}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        className="input"
      />
      {mode === "signup" && <p className="-mt-1 text-xs text-ink-2">At least 8 characters.</p>}
      <button type="submit" className="btn mt-1 min-h-12 text-base" disabled={busy}>
        {busy ? "One moment…" : mode === "signup" ? "Create my account" : "Log in"}
      </button>
      {error && (
        <p role="alert" className="rounded-[12px] bg-err-bg px-4 py-3 text-sm font-semibold text-err">
          {error.text}{" "}
          {error.waitlist && (
            <Link href="/#join" className="underline underline-offset-2">
              Join the waitlist
            </Link>
          )}
        </p>
      )}
    </form>
  );
}
