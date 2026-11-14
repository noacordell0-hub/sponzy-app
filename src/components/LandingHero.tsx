"use client";

import { useEffect, useState } from "react";
import WaitlistForm from "@/components/WaitlistForm";
import { track } from "@/lib/analytics";

type Audience = "creator" | "brand";

function Scribble() {
  return (
    <svg viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3 11 C 40 4, 80 4, 118 8 S 175 13, 197 5" fill="none" stroke="#5B3DF5" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Homepage hero with a "For creators / For brands" switch: each side gets its own headline, pitch, form and preview.
 * A marketplace needs both sides, and brands were only offered a small link before.
 * Linkable: /?for=brands opens the brand version (use it in brand-facing posts and ads so the page matches the message).
 */
export default function LandingHero({ creatorBadge, spots, creatorVisual, brandVisual }: { creatorBadge: React.ReactNode; spots: string; creatorVisual: React.ReactNode; brandVisual: React.ReactNode }) {
  const [aud, setAud] = useState<Audience>("creator");

  useEffect(() => {
    try {
      const p = new URLSearchParams(location.search).get("for");
      if (p === "brands" || p === "brand") setAud("brand");
    } catch {
      /* ignore */
    }
  }, []);

  function choose(next: Audience, source: "tab" | "form") {
    if (next === aud) return;
    setAud(next);
    if (source === "tab") track("cta_click", { location: "hero", target: `audience_${next}` });
    try {
      const u = new URL(location.href);
      if (next === "brand") u.searchParams.set("for", "brands");
      else u.searchParams.delete("for");
      history.replaceState(null, "", u.toString());
    } catch {
      /* ignore */
    }
  }

  const creator = aud === "creator";
  return (
    <section className="relative mx-auto grid w-full max-w-[1200px] items-center gap-14 px-4 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:pb-24 lg:pt-16">
      <div className="rise flex flex-col gap-6">
        <div role="tablist" aria-label="Who is this for?" className="inline-flex self-start rounded-full border rule bg-white p-1 shadow-[0_1px_0_rgba(21,19,31,.04)]">
          {(["creator", "brand"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aud === a}
              onClick={() => choose(a, "tab")}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${aud === a ? "bg-ink text-white" : "text-body hover:text-ink"}`}
            >
              {a === "creator" ? "For creators" : "For brands"}
            </button>
          ))}
        </div>

        <div key={aud} className="swap-in flex flex-col gap-6">
          {creator ? (
            <span className="self-start rounded-full border rule bg-white px-3 py-1 text-[13px] font-semibold text-ink">
              <span className="mr-1.5 inline-block size-2 rounded-full bg-[#5B3DF5] align-middle" aria-hidden="true" />
              {creatorBadge}
            </span>
          ) : (
            <span className="self-start rounded-full border rule bg-white px-3 py-1 text-[13px] font-semibold text-ink">
              <span className="mr-1.5 inline-block size-2 rounded-full bg-ok align-middle" aria-hidden="true" />
              Early access · no platform fee for brands
            </span>
          )}
          <h1 className="font-display text-[clamp(52px,8vw,92px)] leading-[0.95]">
            {creator ? (
              <>
                Sell brand deals from{" "}
                <em className="scribble">
                  one link.
                  <Scribble />
                </em>
              </>
            ) : (
              <>
                Book creators at{" "}
                <em className="scribble">
                  clear prices.
                  <Scribble />
                </em>
              </>
            )}
          </h1>
          <p className="max-w-[520px] text-[17px] leading-[1.65] text-body sm:text-lg">
            {creator
              ? "Put your prices on one page and share it. Brands pick what they want and pay before you start. We hold the money and send it to you once they approve the post."
              : "See exactly what each creator charges, with follower counts we've verified. Pay up front, and the money is only released when you approve the post. No agency, no minimums, no chasing."}
          </p>
        </div>

        <div id="join" className="scroll-mt-24">
          <WaitlistForm id="email-hero" role={aud} onRoleChange={(r) => choose(r, "form")} />
        </div>
        <p className="text-sm text-ink-2">
          {creator
            ? `Free to join. The first ${spots} creators pay half the usual fee, for good.`
            : "Free to join. Brands pay no platform fee, just 3% + 30¢ card processing at checkout."}
        </p>
      </div>

      <div key={`v-${aud}`} className="swap-in relative mx-auto w-full max-w-[400px] lg:mr-0">
        {creator ? creatorVisual : brandVisual}
      </div>
    </section>
  );
}
