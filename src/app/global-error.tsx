"use client";

import { useEffect } from "react";

/** Last-resort fallback if the whole app (including the layout) crashes. Plain styles, no dependencies. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "error", message: `[global] ${error.message}${error.digest ? ` (digest ${error.digest})` : ""}`, stack: error.stack, path: location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#fbfaff", color: "#15131f" }}>
        <main style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p>Sorry about that. We&apos;ve been notified. Please try again.</p>
          <button type="button" onClick={reset} style={{ marginTop: 12, padding: "12px 20px", borderRadius: 12, border: 0, background: "#5B3DF5", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
