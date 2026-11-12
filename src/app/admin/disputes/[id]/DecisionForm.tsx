"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

/** Refund / pay / split control. Amounts are previewed before anything moves. */
export default function DecisionForm({ disputeId, payoutCents, priceCents, totalCents, creatorName, brandName }: { disputeId: number; payoutCents: number; priceCents: number; totalCents: number; creatorName: string; brandName: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"refund" | "pay" | "split">("split");
  const [pct, setPct] = useState(50);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const p = decision === "refund" ? 0 : decision === "pay" ? 100 : pct;
  const toCreator = Math.round((payoutCents * p) / 100);
  const toBrand = decision === "refund" ? totalCents : decision === "split" ? Math.round((priceCents * (100 - p)) / 100) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Confirm: ${creatorName} gets ${money(toCreator)}, ${brandName} gets ${money(toBrand)} back. Money moves immediately and can't be undone.`)) return;
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/admin/disputes/${disputeId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, split_pct: pct, note }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error ?? "Something went wrong.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-4 p-6">
      <p className="eyebrow">Decision</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Outcome</legend>
        {([["refund", `Refund ${brandName} in full`], ["pay", `Pay ${creatorName} in full`], ["split", "Split the payment"]] as const).map(([k, l]) => (
          <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${decision === k ? "border-violet/50 bg-[#F3F0FF]" : "border-black/10"}`}>
            <input type="radio" name="decision" value={k} checked={decision === k} onChange={() => setDecision(k)} />
            {l}
          </label>
        ))}
      </fieldset>
      {decision === "split" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="pct" className="text-sm font-semibold">Creator&apos;s share: {pct}%</label>
          <input id="pct" type="range" min={5} max={95} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
        </div>
      )}
      <dl className="rounded-xl bg-black/[.03] p-4 text-sm">
        <div className="flex justify-between"><dt>{creatorName} receives</dt><dd className="font-bold">{money(toCreator)}</dd></div>
        <div className="flex justify-between"><dt>{brandName} refunded</dt><dd className="font-bold">{money(toBrand)}</dd></div>
      </dl>
      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-semibold">Note to both sides (shown on the order)</label>
        <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} className="input" placeholder="Why you decided this." />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-err">{err}</p>}
      <button type="submit" disabled={busy} className="btn min-h-11 text-sm">{busy ? "Working…" : "Confirm decision"}</button>
    </form>
  );
}
