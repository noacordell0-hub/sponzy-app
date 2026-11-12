"use client";

import { useEffect, useState } from "react";

/**
 * Tiny A/B testing helper. Each experiment has an `enabled` switch; while it's false everyone sees
 * the control ("a") and nothing is recorded. When enabled, each browser is assigned once (kept in
 * localStorage) and the variant is attached to every analytics event as exp_<name>.
 * Turn a test on by setting enabled: true here (after it's approved) and redeploying.
 */
export const EXPERIMENTS = {
  // Hypothesis: a sticky "Claim my spot" bar on phones raises waitlist_submit per landing_view.
  sticky_mobile_cta: { enabled: false, variants: ["a", "b"] as const, split: 0.5 },
  // Hypothesis: showing the real number of Founding spots left raises waitlist_success.
  live_spots_counter: { enabled: false, variants: ["a", "b"] as const, split: 0.5 },
} as const;

export type ExperimentName = keyof typeof EXPERIMENTS;
const KEY = "clouta-exp";

function read(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Preview a variant before a test is switched on: ?exp_preview=sticky_mobile_cta:b (this page view only). */
function previewed(name: ExperimentName): "a" | "b" | null {
  try {
    const p = new URLSearchParams(location.search).get("exp_preview");
    const [n, v] = (p ?? "").split(":");
    return n === name && (v === "a" || v === "b") ? v : null;
  } catch {
    return null;
  }
}

export function assignedVariant(name: ExperimentName): "a" | "b" {
  const preview = previewed(name);
  if (preview) return preview;
  const exp = EXPERIMENTS[name];
  if (!exp.enabled) return "a";
  const all = read();
  if (all[name] === "a" || all[name] === "b") return all[name] as "a" | "b";
  const v = Math.random() < exp.split ? "b" : "a";
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...all, [name]: v }));
  } catch {}
  return v;
}

/** Variants of enabled experiments, for analytics events. */
export function activeExperiments(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of Object.keys(EXPERIMENTS) as ExperimentName[]) if (EXPERIMENTS[name].enabled) out[`exp_${name}`] = assignedVariant(name);
  return out;
}

/** React hook: "a" on the server and first render (no layout flash), then the assigned variant. */
export function useVariant(name: ExperimentName): "a" | "b" {
  const [v, setV] = useState<"a" | "b">("a");
  useEffect(() => setV(assignedVariant(name)), [name]);
  return v;
}
