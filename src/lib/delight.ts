"use client";

/**
 * Small "feels good" helpers: confetti, toasts and a tiny vibration on phones.
 * Everything respects "reduce motion" and never throws: delight must never break the page.
 */

export function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

/** A tiny buzz on Android (iPhone browsers ignore it). */
export function buzz(ms: number | number[] = 12) {
  try {
    if (!reducedMotion()) navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

export type ToastKind = "success" | "error" | "info";
/** Show a small message in the corner. Rendered by <Toaster /> in the root layout. */
export function toast(text: string, kind: ToastKind = "success") {
  try {
    window.dispatchEvent(new CustomEvent("clouta-toast", { detail: { text, kind } }));
  } catch {
    /* ignore */
  }
}

const COLORS = ["#5B3DF5", "#9B5CFF", "#FFC83D", "#18794E", "#E8508A", "#4DC9FF"];

/** A short confetti burst from a point (default: top centre). One small canvas, removed when done. */
export function confetti({ x, y, count = 120 }: { x?: number; y?: number; count?: number } = {}) {
  if (typeof window === "undefined" || reducedMotion()) return;
  try {
    const canvas = document.createElement("canvas");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "9999" });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const ox = x ?? w / 2;
    const oy = y ?? h * 0.3;
    const parts = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 7;
      return {
        x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5,
        s: 5 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        c: COLORS[(Math.random() * COLORS.length) | 0], round: Math.random() < 0.3,
      };
    });
    const start = performance.now();
    const frame = (t: number) => {
      const age = t - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, 1 - age / 1800);
      for (const p of parts) {
        p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.4, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (age < 1800) requestAnimationFrame(frame);
      else canvas.remove();
    };
    requestAnimationFrame(frame);
  } catch {
    /* ignore */
  }
}

/** Celebrate once per key (per browser), e.g. "paid:42", so a refresh doesn't replay it. */
export function celebrateOnce(key: string, run: () => void) {
  try {
    const k = `clouta-celebrated:${key}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
  } catch {
    /* private mode: still celebrate */
  }
  run();
}
