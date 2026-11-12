"use client";

import { track } from "@/lib/analytics";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISPUTE_REASONS } from "@/lib/dispute-labels";
import { money } from "@/lib/format";

type D = {
  id: number; opened_by: string | null; opener_role: "brand" | "creator"; reason: string; statement: string; evidence: string[];
  response: string | null; response_evidence: string[]; responded_at: string | null; respond_by: string;
  status: "open" | "resolved" | "withdrawn"; decision: "refund" | "pay" | "split" | null; split_pct: number | null;
  refund_cents: number | null; payout_cents: number | null; decision_note: string | null; created_at: string;
};

const fmt = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Links({ links }: { links: string[] }) {
  if (!links.length) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {links.map((l) => (
        <li key={l}>
          <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-sm font-semibold text-violet-deep underline underline-offset-2">
            {l} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Open, answer, or follow a dispute on an order. Money stays held until it's resolved. */
export default function DisputePanel({ orderId, dispute, viewerId, myRole, otherName, canOpen }: { orderId: number; dispute: D | null; viewerId: string; myRole: "brand" | "creator"; otherName: string; canOpen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [links, setLinks] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(body: object, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/orders/${orderId}/dispute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error ?? "Something went wrong.");
    if ((body as { action?: string }).action === "open") track("dispute_opened", { role: myRole, reason: (body as { reason?: string }).reason ?? "" });
    setOpen(false);
    setText("");
    setLinks("");
    router.refresh();
  }
  const evidence = () => links.split(/\s+/).map((l) => l.trim()).filter(Boolean);

  const active = dispute && dispute.status === "open" ? dispute : null;
  const iOpened = active?.opened_by === viewerId;

  if (!active && dispute?.status === "resolved") {
    const d = dispute;
    return (
      <section className="panel border-[#D9D2FF] p-6" aria-labelledby="disp-t">
        <h2 id="disp-t" className="text-lg font-bold">Dispute resolved</h2>
        <p className="mt-1 text-sm text-body">
          {d.decision === "refund" && "The Clouta team refunded the brand in full."}
          {d.decision === "pay" && "The Clouta team released the full payment to the creator."}
          {d.decision === "split" && `The Clouta team split the payment: ${money(d.payout_cents ?? 0)} to the creator and ${money(d.refund_cents ?? 0)} refunded to the brand.`}
        </p>
        {d.decision_note && <p className="mt-2 rounded-xl bg-[#F7F5FF] px-4 py-3 text-sm text-body">&ldquo;{d.decision_note}&rdquo;</p>}
      </section>
    );
  }

  if (active) {
    const canRespond = !iOpened && !active.responded_at;
    return (
      <section className="panel flex flex-col gap-4 border-[#F2B8C6] p-6" aria-labelledby="disp-t">
        <div>
          <h2 id="disp-t" className="text-lg font-bold">Dispute open · order paused</h2>
          <p className="mt-1 text-sm text-body">
            The money stays held by Clouta until the team decides. {active.responded_at ? "Both sides have given their side; the Clouta team will decide soon." : `${iOpened ? otherName : "You"} can respond until ${fmt(active.respond_by)}. After that, the team decides either way.`}
          </p>
        </div>
        <div className="rounded-xl bg-[#FFF5F7] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#A3134A]">
            {iOpened ? "Your dispute" : `${otherName}'s dispute`} · {DISPUTE_REASONS[active.reason]?.label ?? active.reason}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm text-ink">{active.statement}</p>
          <Links links={active.evidence} />
        </div>
        {active.response && (
          <div className="rounded-xl bg-[#F7F5FF] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-violet-deep">{iOpened ? `${otherName}'s response` : "Your response"}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-ink">{active.response}</p>
            <Links links={active.response_evidence} />
          </div>
        )}
        {canRespond && (
          <form onSubmit={(e) => { e.preventDefault(); send({ action: "respond", response: text, evidence: evidence() }); }} className="flex flex-col gap-2">
            <label htmlFor="d-resp" className="text-sm font-semibold">Your side of the story</label>
            <textarea id="d-resp" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={3000} className="input" required minLength={10} />
            <label htmlFor="d-rlinks" className="text-sm font-semibold">Evidence links (optional, one per line)</label>
            <textarea id="d-rlinks" value={links} onChange={(e) => setLinks(e.target.value)} rows={2} className="input" placeholder="https://…" />
            <button type="submit" disabled={busy} className="btn min-h-11 self-start px-5 text-sm">{busy ? "Sending…" : "Send response"}</button>
          </form>
        )}
        {iOpened && (
          <button type="button" disabled={busy} onClick={() => send({ action: "withdraw" }, "Withdraw your dispute? The order will continue where it left off.")} className="self-start text-sm font-semibold text-violet-deep">
            Withdraw dispute
          </button>
        )}
        {err && <p role="alert" className="text-sm font-semibold text-err">{err}</p>}
      </section>
    );
  }

  if (!canOpen) return null;
  const reasons = Object.entries(DISPUTE_REASONS).filter(([, r]) => r.who === "both" || r.who === myRole);
  return (
    <section className="flex flex-col gap-3" aria-label="Report a problem">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="self-start text-sm font-semibold text-ink-2 underline underline-offset-2 hover:text-err">
          Problem with this order? Open a dispute
        </button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send({ action: "open", reason, statement: text, evidence: evidence() }); }} className="panel flex flex-col gap-3 border-[#F2B8C6] p-6">
          <h2 className="text-lg font-bold">Open a dispute</h2>
          <p className="text-sm text-body">
            Try messaging {otherName} first. A dispute pauses the order and keeps the money held. {otherName} gets 48 hours to respond, then the Clouta team decides on a refund, payment, or a split.
          </p>
          <label htmlFor="d-reason" className="text-sm font-semibold">What went wrong?</label>
          <select id="d-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input" required>
            <option value="">Choose a reason</option>
            {reasons.map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select>
          <label htmlFor="d-stmt" className="text-sm font-semibold">Explain what happened</label>
          <textarea id="d-stmt" value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={3000} minLength={20} className="input" required placeholder="Be specific: what was agreed, what happened, and what you'd like." />
          <label htmlFor="d-links" className="text-sm font-semibold">Evidence links (optional, one per line)</label>
          <textarea id="d-links" value={links} onChange={(e) => setLinks(e.target.value)} rows={2} className="input" placeholder="https://… (screenshots, posts)" />
          {err && <p role="alert" className="text-sm font-semibold text-err">{err}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn min-h-11 px-5 text-sm">{busy ? "Opening…" : "Open dispute"}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost min-h-11 px-5 text-sm">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
