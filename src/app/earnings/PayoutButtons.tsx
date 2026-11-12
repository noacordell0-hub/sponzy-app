"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export default function PayoutButtons({ hasAccount, payoutsEnabled }: { hasAccount: boolean; payoutsEnabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string) {
    setBusy(true);
    setError(null);
    const onboarding = path.endsWith("/onboard");
    if (onboarding) track("stripe_onboard_start", { resume: hasAccount });
    const res = await fetch(path, { method: "POST" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !json.url) {
      setBusy(false);
      if (onboarding) track("stripe_onboard_error", { status: res?.status ?? 0 });
      return setError(json.error || "Couldn't reach Stripe. Check your connection and try again.");
    }
    window.location.href = json.url;
  }

  return (
    <div className="flex flex-none flex-col items-stretch gap-2 sm:items-end">
      {payoutsEnabled ? (
        <button type="button" onClick={() => go("/api/stripe/dashboard")} disabled={busy} className="btn btn-ghost min-h-11 px-5 text-sm">
          {busy ? "Opening…" : "Open Stripe dashboard"}
        </button>
      ) : (
        <button type="button" onClick={() => go("/api/stripe/onboard")} disabled={busy} className="btn min-h-11 px-5 text-sm">
          {busy ? "Opening Stripe…" : hasAccount ? "Continue payout setup" : "Set up payouts"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-err">
          {error}
        </p>
      )}
    </div>
  );
}
