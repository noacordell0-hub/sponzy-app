"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SpacePage } from "@/components/SpacePage";

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
    <SpacePage
      code="Oops"
      title="Something went wrong"
      actions={
        <>
          <button type="button" onClick={reset} className="btn min-h-11 px-5">
            Try again
          </button>
          <Link href="/" className="btn btn-ghost min-h-11 px-5">
            Go home
          </Link>
        </>
      }
    >
      <p>Sorry about that. We&apos;ve been notified. Try again, or head back to the start.</p>
      {error.digest && <p className="mt-2 text-xs text-ink-2">Reference: {error.digest}</p>}
    </SpacePage>
  );
}
