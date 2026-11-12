"use client";

import { useEffect, useState } from "react";
import { useVariant } from "@/lib/experiments";

/** Variant B of "live_spots_counter": the real number of Founding spots left, from the database. */
export function SpotsLeft({ fallback }: { fallback: string }) {
  const v = useVariant("live_spots_counter");
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (v !== "b") return;
    fetch("/api/waitlist/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && typeof d.left === "number" && setLeft(d.left))
      .catch(() => {});
  }, [v]);
  if (v === "b" && left !== null) return <>Private beta · {left.toLocaleString()} Founding Creator spots left</>;
  return <>{fallback}</>;
}

/** Variant B of "sticky_mobile_cta": a bar pinned to the bottom of phone screens that jumps to the signup form. */
export function StickyMobileCta() {
  const v = useVariant("sticky_mobile_cta");
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (v !== "b") return;
    const form = document.getElementById("join");
    if (!form) return;
    // Hide the bar while the hero form is on screen.
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(form);
    return () => io.disconnect();
  }, [v]);
  if (v !== "b" || !show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[.08] bg-white/95 p-3 backdrop-blur md:hidden">
      <a href="#join" data-track="cta_click" data-track-location="sticky_mobile" className="btn min-h-12 w-full text-base">
        Claim my Founding spot
      </a>
    </div>
  );
}
