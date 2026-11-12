"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin progress bar at the top of the screen. It starts the instant someone clicks an internal link
 * (or submits a form that navigates) and finishes when the new page arrives, so slow loads feel quick.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (timer.current) clearInterval(timer.current);
    if (safety.current) clearTimeout(safety.current);
    timer.current = null;
    safety.current = null;
  }

  function start() {
    clearTimers();
    setVisible(true);
    setProgress(12);
    // Ease toward 90% while waiting; never reaches 100 until the page lands.
    timer.current = setInterval(() => setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p)), 180);
    safety.current = setTimeout(done, 12000);
  }

  function done() {
    clearTimers();
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
  }

  // A new page (or new search params) arrived.
  useEffect(() => {
    if (visible) done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (form.method?.toLowerCase() === "post" && form.action && !e.defaultPrevented) start();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div
        className="h-full rounded-r-full bg-[linear-gradient(90deg,#7655FF,#C04FD8)] shadow-[0_0_10px_rgba(118,85,255,.6)]"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0, transition: `width ${progress === 100 ? 200 : 400}ms ease, opacity 250ms ease` }}
      />
    </div>
  );
}
