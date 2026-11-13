"use client";

import { useEffect, useId, useRef, useState } from "react";
import { bucket, track } from "@/lib/analytics";

/** Slider calculator: what a creator could earn from sponsored posts in a year. */
export default function EarningsCalculator() {
  const [price, setPrice] = useState(120);
  const [perMonth, setPerMonth] = useState(2);
  const priceId = useId();
  const countId = useId();
  const yearly = price * perMonth * 12;

  // Count a "use" once the visitor stops moving the sliders for a moment (not on every pixel).
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) return;
    const t = setTimeout(() => track("earnings_calculator_used", { price: bucket(price, [50, 100, 250, 500]), deals: bucket(perMonth, [2, 4, 7]), yearly: bucket(yearly, [1000, 5000, 20000, 50000]) }), 1200);
    return () => clearTimeout(t);
  }, [price, perMonth, yearly]);

  return (
    <div className="grid gap-8 rounded-2xl border border-black/[.14] bg-white p-6 sm:p-8 md:grid-cols-[1.2fr_1fr] md:items-center">
      <div className="flex flex-col gap-7">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={priceId} className="text-sm font-semibold text-body">
              Your price per sponsored post
            </label>
            <span className="text-lg font-extrabold">${price.toLocaleString()}</span>
          </div>
          <input
            id={priceId}
            type="range"
            min={25}
            max={1000}
            step={5}
            value={price}
            onChange={(e) => { touched.current = true; setPrice(Number(e.target.value)); }}
            className="mt-1 h-11 w-full cursor-pointer accent-[#5B3DF5]"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={countId} className="text-sm font-semibold text-body">
              Brand deals per month
            </label>
            <span className="text-lg font-extrabold">{perMonth}</span>
          </div>
          <input
            id={countId}
            type="range"
            min={1}
            max={12}
            step={1}
            value={perMonth}
            onChange={(e) => { touched.current = true; setPerMonth(Number(e.target.value)); }}
            className="mt-1 h-11 w-full cursor-pointer accent-[#5B3DF5]"
          />
        </div>
      </div>
      <div className="rounded-2xl bg-ink p-6 text-white" aria-live="polite">
        <p className="text-sm font-semibold text-[#D9D3FF]">You could earn</p>
        <p className="font-display mt-1 text-[clamp(48px,7vw,64px)] leading-none">
          ${yearly.toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-[#D9D3FF]">a year from brand deals, before fees</p>
        <dl className="mt-4 grid gap-1.5 border-t border-white/15 pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[#E9E5FF]">You keep as a Founding Creator (5% fee)</dt>
            <dd className="font-bold text-white">${Math.round(yearly * 0.95).toLocaleString()}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#D9D3FF]">At the standard 10% fee</dt>
            <dd className="text-[#D9D3FF]">${Math.round(yearly * 0.9).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
