"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { profileId: string; name: string; reportIds: number[]; flagged: boolean; banned: boolean; reviewIds: number[]; commentIds: number[]; warnings: number; compact?: boolean };

/** Admin actions for one reported account. Ladder: warning, then suspension, then ban (scams and impersonation can skip to a ban). */
export default function ModerationPanel({ profileId, name, reportIds, flagged, banned, reviewIds, commentIds, warnings, compact }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function act(action: string, extra: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setMsg("");
    const res = await fetch("/api/admin/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, profile_id: profileId, report_ids: reportIds, note, days, ...extra }) });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return setMsg(data.error ?? "Failed.");
    setMsg(data.affectedOrders ? `Done. ${data.affectedOrders} active order(s) refunded or cancelled.` : "Done.");
    router.refresh();
  }
  const b = (key: string, label: string, onClick: () => void, danger = false) => (
    <button key={key} type="button" disabled={Boolean(busy)} onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${danger ? "border-err/30 text-err hover:bg-err-bg" : "border-black/10 hover:bg-black/[.03]"}`}>
      {busy === key ? "…" : label}
    </button>
  );

  if (compact) return b("unban", "Lift ban", () => act("unban", {}, `Restore ${name}'s account?`));

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-[#FBFAFF] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-2">Actions · {warnings} earlier warning{warnings === 1 ? "" : "s"}</p>
      <div className="flex flex-wrap gap-2">
        {b("dismiss", "Dismiss reports", () => act("dismiss"))}
        {flagged && b("unflag", "Show in Browse again", () => act("unflag"))}
        {reviewIds.map((id) => b(`r${id}`, reviewIds.length > 1 ? `Hide review #${id}` : "Hide review", () => act("hide_content", { review_id: id })))}
        {commentIds.map((id) => b(`c${id}`, commentIds.length > 1 ? `Hide comment #${id}` : "Hide comment", () => act("hide_content", { comment_id: id })))}
      </div>
      <label htmlFor={`note-${profileId}`} className="text-xs font-semibold">Message to {name} (shown with a warning) / internal note</label>
      <textarea id={`note-${profileId}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} className="input text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        {b("warning", "Send warning", () => act("warning"))}
        <select aria-label="Suspension length" value={days} onChange={(e) => setDays(Number(e.target.value))} className="input w-auto py-1.5 text-sm">
          <option value={3}>3 days</option>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
        </select>
        {!banned && b("suspension", "Suspend", () => act("suspension", {}, `Suspend ${name} for ${days} days? Their active orders will be refunded.`), true)}
        {!banned && b("ban", "Ban", () => act("ban", {}, `Permanently ban ${name}? Active orders are refunded and their email and socials are blocked from signing up again.`), true)}
        {banned && b("unban", "Lift ban", () => act("unban", {}, `Restore ${name}'s account?`))}
      </div>
      {msg && <p className="text-sm font-semibold text-violet-deep">{msg}</p>}
    </div>
  );
}
