"use client";

import { useEffect, useRef, useState } from "react";
import { buzz, celebrateOnce, confetti, reducedMotion, toast, type ToastKind } from "@/lib/delight";

/** Corner messages ("Profile saved"). Mounted once in the root layout; call toast() from anywhere. */
export function Toaster() {
  const [items, setItems] = useState<{ id: number; text: string; kind: ToastKind }[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const { text, kind } = (e as CustomEvent).detail as { text: string; kind: ToastKind };
      const id = ++n;
      setItems((xs) => [...xs.slice(-2), { id, text, kind }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
    };
    window.addEventListener("clouta-toast", on);
    return () => window.removeEventListener("clouta-toast", on);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[76px] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={`toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-[0_12px_32px_rgba(21,19,31,.18)] ${t.kind === "error" ? "bg-err text-white" : "bg-ink text-white"}`}
        >
          {t.kind === "success" && <Check className="size-5 text-[#7CE3AE]" />}
          {t.kind === "error" && <span aria-hidden="true">!</span>}
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** A check mark that draws itself in. */
export function Check({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className="draw-check" d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/**
 * Counts the first number in a formatted value up from zero when it scrolls into view
 * ("$1,240" → $0 … $1,240). Keeps the exact text for screen readers and without JavaScript.
 */
export function CountUp({ value, duration = 900 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    setShown(value);
    const m = value.match(/(\d[\d,]*\.?\d*)/);
    const el = ref.current;
    if (!m || !el || reducedMotion()) return;
    const target = parseFloat(m[1].replace(/,/g, ""));
    if (!target) return;
    const decimals = (m[1].split(".")[1] ?? "").length;
    const fmt = (n: number) => value.replace(m[1], n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setShown(fmt(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        run();
      }
    }, { threshold: 0.4 });
    setShown(fmt(0));
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  return (
    <span ref={ref} className="tabular">
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}

/** Drop-in for server pages: fires confetti + a toast once per key when it first renders. */
export function Celebrate({ id, message, burst = true }: { id: string; message?: string; burst?: boolean }) {
  useEffect(() => {
    celebrateOnce(id, () => {
      if (burst) setTimeout(() => confetti(), 250);
      if (message) toast(message);
      buzz([10, 40, 10]);
    });
  }, [id, message, burst]);
  return null;
}
