"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/orders";

/** The next step for whoever is looking at the order, with the actions they're allowed to take. */
export default function OrderActions({ order, isBrand, otherName }: { order: Order; isBrand: boolean; otherName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [note, setNote] = useState("");
  const [extendOpen, setExtendOpen] = useState(false);
  const [newDate, setNewDate] = useState("");

  async function act(action: string, extra: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/orders/${order.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (!res?.ok) return setError(json.error || "Something went wrong.");
    if (json.url) return (window.location.href = json.url);
    setRevisionOpen(false);
    setExtendOpen(false);
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);
  const pastDue = order.post_by < today;
  const s = order.status;
  const revisionsLeft = order.revisions_allowed - order.revisions_used;

  let title = "";
  let body = "";
  const buttons: React.ReactNode[] = [];
  const btn = (key: string, label: string, onClick: () => void, ghost = false, danger = false) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={busy !== null}
      className={danger ? "min-h-11 rounded-[12px] px-4 text-sm font-semibold text-err hover:bg-err-bg" : `btn min-h-11 px-5 text-sm ${ghost ? "btn-ghost" : ""}`}
    >
      {busy === key ? "Working…" : label}
    </button>
  );

  if (isBrand) {
    if (s === "awaiting_payment") {
      title = "Finish paying to place this order";
      body = "Your checkout is still open. Nothing has been charged.";
      buttons.push(btn("resume_checkout", "Continue to payment", () => act("resume_checkout")), btn("cancel", "Cancel", () => act("cancel"), true));
    } else if (s === "funded" || s === "in_progress") {
      title = s === "funded" ? `Waiting for ${otherName} to start` : `${otherName} is working on it`;
      body = pastDue ? "The post-by date has passed without proof. You can cancel for a full refund or give more time." : "Your payment is held safely. You'll be asked to review once proof is submitted.";
      if (s === "funded") buttons.push(btn("cancel", "Cancel and refund", () => act("cancel", {}, "Cancel this order and get a full refund?"), false, true));
      if (pastDue && s === "in_progress") buttons.push(btn("cancel", "Cancel and refund", () => act("cancel", {}, "Cancel this order and get a full refund?"), false, true));
      buttons.push(btn("extend_open", "Change post-by date", () => setExtendOpen((o) => !o), true));
    } else if (s === "revision_requested") {
      title = `Waiting for ${otherName}'s revision`;
      body = "They'll resubmit proof, and you'll get a new review window.";
      if (pastDue) buttons.push(btn("cancel", "Cancel and refund", () => act("cancel", {}, "The date has passed. Cancel and get a full refund?"), false, true));
      buttons.push(btn("extend_open", "Change post-by date", () => setExtendOpen((o) => !o), true));
    } else if (s === "proof_submitted") {
      title = "Review the delivery";
      body = `Check the links below. Approving releases the payment to ${otherName}. If you don't respond, it's approved automatically after 3 days.`;
      buttons.push(btn("approve", "Approve and release payment", () => act("approve", {}, `Release the payment to ${otherName}? This can't be undone.`)));
      if (revisionsLeft > 0) buttons.push(btn("rev_open", `Request a revision (${revisionsLeft} left)`, () => setRevisionOpen((o) => !o), true));
    } else if (s === "approved" || s === "paid") {
      title = "Order complete";
      body = s === "paid" ? `You approved the work and ${otherName} has been paid.` : `You approved the work. ${otherName} will be paid as soon as their payout setup is finished.`;
    }
  } else {
    if (s === "funded") {
      title = "New order: you're booked!";
      body = "The brand has paid and the money is held by Clouta. Start when you're ready, then submit links to the live post.";
      buttons.push(btn("start", "Start work", () => act("start")));
      buttons.push(
        <Link key="deliver" href={`/orders/${order.id}/deliver`} className="btn btn-ghost min-h-11 px-5 text-sm">
          Submit proof
        </Link>,
      );
      buttons.push(btn("cancel", "Decline and refund", () => act("cancel", {}, "Decline this order? The brand will be refunded in full."), false, true));
    } else if (s === "in_progress" || s === "revision_requested") {
      title = s === "revision_requested" ? "The brand asked for a revision" : "In progress";
      body = s === "revision_requested" ? `"${order.revision_note ?? ""}" Update the post, then resubmit your links.` : "When the post is live, submit the links so the brand can approve and you get paid.";
      buttons.push(
        <Link key="deliver" href={`/orders/${order.id}/deliver`} className="btn min-h-11 px-5 text-sm">
          {s === "revision_requested" ? "Resubmit proof" : "Submit proof"}
        </Link>,
      );
    } else if (s === "proof_submitted") {
      title = "Waiting for the brand to approve";
      body = "You'll be paid when they approve, or automatically when the 3-day review window ends.";
    } else if (s === "approved") {
      title = "Approved! Finish payout setup to get paid";
      body = "Your payment is ready. Set up payouts on the Earnings page and it's sent automatically.";
      buttons.push(
        <Link key="earn" href="/earnings" className="btn min-h-11 px-5 text-sm">
          Go to Earnings
        </Link>,
      );
    } else if (s === "paid") {
      title = "Paid! 🎉";
      body = "The money is on its way to your bank on Stripe's payout schedule.";
    }
  }
  if (s === "cancelled") {
    title = "Order cancelled";
    body = "This order was cancelled before payment. Nothing was charged.";
  } else if (s === "refunded") {
    title = "Order refunded";
    body = "This order was cancelled and the brand was refunded in full.";
  }

  return (
    <section className="panel flex flex-col gap-4 p-6" aria-labelledby="next-t">
      <div>
        <h2 id="next-t" className="text-lg font-bold">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-body">{body}</p>
      </div>
      {buttons.length > 0 && <div className="flex flex-wrap items-center gap-2">{buttons}</div>}
      {revisionOpen && (
        <div className="flex flex-col gap-2 rounded-xl bg-[#FBFAFF] p-4">
          <label htmlFor="rev-note" className="text-sm font-semibold">
            What should they change?
          </label>
          <textarea id="rev-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="input" />
          <div>
            {btn("revision", "Send revision request", () => act("revision", { note }))}
          </div>
        </div>
      )}
      {extendOpen && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-[#FBFAFF] p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="new-date" className="text-sm font-semibold">
              New post-by date
            </label>
            <input id="new-date" type="date" min={today > order.post_by ? today : order.post_by} value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input" />
          </div>
          {btn("extend", "Save date", () => act("extend", { post_by: newDate }))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-err">
          {error}
        </p>
      )}
    </section>
  );
}
