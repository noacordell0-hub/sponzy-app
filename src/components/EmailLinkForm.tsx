"use client";

import Link from "next/link";
import { useState } from "react";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string; waitlist?: boolean };

/** Email-only login: we email a one-time link instead of using passwords. */
export default function EmailLinkForm({ mode, next }: { mode: "signup" | "login"; next?: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setState({ kind: "sending" });
    const res = await fetch("/api/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mode, next }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) setState({ kind: "sent", email });
    else setState({ kind: "error", message: json.error || "Something went wrong. Please try again.", waitlist: json.waitlist });
  }

  if (state.kind === "sent") {
    return (
      <div role="status" className="chip-pop flex flex-col gap-3 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#F3F0FF] text-2xl">✉️</div>
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="text-[15px] leading-relaxed text-body">
          We sent a login link to <b className="text-ink">{state.email}</b>. Open it on this device to continue. It expires in
          1 hour.
        </p>
        <button type="button" onClick={() => setState({ kind: "idle" })} className="mx-auto mt-1 min-h-11 text-sm font-semibold text-violet-deep">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor="auth-email" className="text-sm font-semibold">
        Email
      </label>
      <input
        id="auth-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
        placeholder="you@example.com"
        className="min-h-12 rounded-[12px] border border-black/12 bg-white px-4 text-base focus:border-violet focus:shadow-[0_0_0_4px_rgba(108,71,255,.16)] focus:outline-none"
      />
      <button type="submit" className="btn mt-1 min-h-12 text-base" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Sending…" : mode === "signup" ? "Create my account" : "Email me a login link"}
      </button>
      {state.kind === "error" && (
        <p role="alert" className="rounded-[12px] bg-err-bg px-4 py-3 text-sm font-semibold text-err">
          {state.message}{" "}
          {state.waitlist && (
            <Link href="/#join" className="underline underline-offset-2">
              Join the waitlist
            </Link>
          )}
        </p>
      )}
      <p className="text-center text-xs text-ink-2">No password needed. We&apos;ll email you a secure one-time link.</p>
    </form>
  );
}
