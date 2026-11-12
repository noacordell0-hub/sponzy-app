"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Friendly fallback when a page crashes. The error is already logged on the server; browser errors are reported here. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "error", message: `${error.message}${error.digest ? ` (digest ${error.digest})` : ""}`, stack: error.stack, path: location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Something went wrong</h1>
      <p className="text-body">Sorry about that. We&apos;ve been notified. Try again, or head back to the start.</p>
      {error.digest && <p className="text-xs text-ink-2">Reference: {error.digest}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="btn min-h-11 px-5">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost min-h-11 px-5">
          Go home
        </Link>
      </div>
    </main>
  );
}
