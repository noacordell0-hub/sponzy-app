"use client";

import { useEffect } from "react";
import { captureUtm, track, type EventName } from "@/lib/analytics";

/**
 * Site-wide listeners, mounted once in the root layout:
 * - remembers how the visitor first arrived (UTM tags, invite link, referring site)
 * - tracks clicks on any element with data-track="event_name" (extra props from data-track-* attributes),
 *   so server-rendered pages need no client code for click tracking
 * - tracks FAQ items opened (<details data-faq="id">)
 * - reports uncaught browser errors (a few per page at most) to /api/events
 */
export default function AnalyticsProvider() {
  useEffect(() => {
    captureUtm();

    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track]") as HTMLElement | null;
      if (!el) return;
      const props: Record<string, string> = {};
      for (const [k, v] of Object.entries(el.dataset)) {
        if (k.startsWith("track") && k !== "track" && v) props[k.slice(5).toLowerCase()] = v.slice(0, 80);
      }
      track(el.dataset.track as EventName, props);
    };
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d?.tagName === "DETAILS" && d.open && d.dataset.faq) track("faq_opened", { question: d.dataset.faq });
    };

    let sent = 0;
    const report = (message: string, stack?: string) => {
      if (sent >= 5 || !message) return;
      sent++;
      const body = JSON.stringify({ type: "error", message: message.slice(0, 500), stack: stack?.slice(0, 2000), path: location.pathname });
      fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    };
    const onError = (e: ErrorEvent) => report(e.message, e.error?.stack);
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
    };

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("toggle", onToggle, { capture: true });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("toggle", onToggle, { capture: true });
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
