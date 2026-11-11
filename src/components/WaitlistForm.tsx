"use client";

import { useState } from "react";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "ok" } | { kind: "error"; message: string };

export default function WaitlistForm({ id = "waitlist" }: { id?: string }) {
  const [role, setRole] = useState<"creator" | "brand">("creator");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          handle: form.get("handle"),
          company: form.get("company"),
          role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setStatus({ kind: "ok" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  if (status.kind === "ok") {
    return (
      <div role="status" className="chip-pop rounded-[14px] bg-ok-bg p-5 text-ok">
        <p className="text-lg font-extrabold">You&apos;re on the list.</p>
        <p className="mt-1 font-medium">
          {role === "creator"
            ? "We'll email you when your Founding Creator spot opens."
            : "We'll email you when brands can start booking creators."}
        </p>
      </div>
    );
  }

  return (
    <form id={id} onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <fieldset className="flex gap-2">
        <legend className="sr-only">I am a</legend>
        {(["creator", "brand"] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={role === r}
            onClick={() => setRole(r)}
            className={`min-h-11 rounded-full px-4 text-sm font-bold transition-colors ${
              role === r ? "bg-violet-deep text-white" : "border border-black/10 bg-white text-body hover:text-ink"
            }`}
          >
            {r === "creator" ? "I'm a creator" : "I'm a brand"}
          </button>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`${id}-email`}>
          Email address
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="min-h-12 flex-1 rounded-[12px] border border-black/15 bg-white px-4 text-base font-medium placeholder:text-ink-2"
        />
        <button type="submit" className="btn" disabled={status.kind === "loading"}>
          {status.kind === "loading" ? "Joining…" : role === "creator" ? "Claim my spot" : "Join as a brand"}
        </button>
      </div>

      {role === "creator" && (
        <>
          <label className="sr-only" htmlFor={`${id}-handle`}>
            Main social handle (optional)
          </label>
          <input
            id={`${id}-handle`}
            name="handle"
            type="text"
            maxLength={60}
            placeholder="@yourhandle (optional)"
            className="min-h-12 rounded-[12px] border border-black/15 bg-white px-4 text-base font-medium placeholder:text-ink-2"
          />
        </>
      )}

      {/* Honeypot for bots: hidden from people and screen readers */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {status.kind === "error" && (
        <p role="alert" className="rounded-[14px] bg-err-bg px-4 py-3 text-sm font-bold text-err">
          {status.message}
        </p>
      )}
      <p className="text-sm text-ink-2">No spam. One email when it&apos;s your turn.</p>
    </form>
  );
}
