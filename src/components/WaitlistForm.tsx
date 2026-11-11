"use client";

import { useState } from "react";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "ok" } | { kind: "error"; message: string };

/** Email-only waitlist form, matching the prototype's "Join the waitlist" row. */
export default function WaitlistForm({ id, dark = false }: { id: string; dark?: boolean }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), company: form.get("company"), role: "creator" }),
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
      <div role="status" className="chip-pop max-w-[560px] rounded-[14px] bg-ok-bg px-5 py-4 text-ok">
        <p className="font-extrabold">You&apos;re on the list. Your Founding Creator spot is saved.</p>
        <p className="mt-1 text-sm font-medium">We&apos;ll email you when your beta invite is ready.</p>
      </div>
    );
  }

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
          className="min-h-[54px] flex-1 rounded-[12px] border border-black/12 bg-white px-4 text-base font-medium text-ink shadow-[inset_0_1px_2px_rgba(21,19,31,.04)] placeholder:text-ink-2 focus:border-violet focus:shadow-[0_0_0_4px_rgba(108,71,255,.16)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={status.kind === "loading"}
          className={`btn min-h-[54px] whitespace-nowrap px-6 text-base ${dark ? "![background:#fff] !text-[#4A2FD0] !shadow-none" : ""}`}
        >
          {status.kind === "loading" ? "Saving…" : "Join the waitlist"}
        </button>
      </div>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {status.kind === "error" && (
        <p role="alert" className="rounded-[14px] bg-err-bg px-4 py-3 text-sm font-bold text-err">
          {status.message}
        </p>
      )}
    </form>
  );
}
