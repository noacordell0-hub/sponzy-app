"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_REASONS } from "@/lib/safety-labels";

type Props = {
  targetType: "profile" | "review" | "comment" | "message";
  targetId: string | number;
  /** Person behind the content, for the block option. */
  ownerId?: string | null;
  ownerName?: string | null;
  viewerId: string | null;
  blocked?: boolean;
  variant?: "button" | "link";
};

/** "Report" control: reason, details, optional screenshot link, and an option to block the person. */
export default function ReportButton({ targetType, targetId, ownerId, ownerName: ownerNameIn, viewerId, blocked = false, variant = "link" }: Props) {
  const ownerName = ownerNameIn ?? "them";
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [shot, setShot] = useState("");
  const [block, setBlock] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [isBlocked, setIsBlocked] = useState(blocked);
  useEffect(() => setIsBlocked(blocked), [blocked]);

  if (viewerId && ownerId && viewerId === ownerId) return null;

  function openIt() {
    if (!viewerId) return router.push("/login");
    setDone(false);
    setErr("");
    dialog.current?.showModal();
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return setErr("Choose a reason.");
    setBusy(true);
    setErr("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: targetType, target_id: String(targetId), reason, details, screenshot_url: shot, block }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error ?? "Couldn't send your report.");
    if (block) setIsBlocked(true);
    setDone(true);
  }
  async function unblock() {
    const res = await fetch("/api/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: ownerId, block: false }) });
    if (res.ok) {
      setIsBlocked(false);
      router.refresh();
    }
  }

  const label = targetType === "profile" ? "Report account" : targetType === "review" ? "Report review" : targetType === "comment" ? "Report comment" : "Report message";
  return (
    <>
      <span className="inline-flex items-center gap-3">
        <button type="button" onClick={openIt} className={variant === "button" ? "btn btn-ghost min-h-11 px-4 text-sm" : "text-xs font-semibold text-ink-2 hover:text-err"}>
          {variant === "button" ? "Report" : label}
        </button>
        {isBlocked && ownerId && (
          <button type="button" onClick={unblock} className="text-xs font-semibold text-violet-deep">
            Unblock
          </button>
        )}
      </span>
      <dialog ref={dialog} className="m-auto w-[min(92vw,460px)] rounded-2xl p-0 backdrop:bg-black/40" aria-labelledby="rep-title" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        {done ? (
          <div className="flex flex-col gap-3 p-6">
            <h2 id="rep-title" className="text-lg font-bold">Thanks for telling us</h2>
            <p className="text-sm text-body">The Clouta team reviews every report by hand. We don&apos;t tell the person who reported them.{block ? ` You've blocked ${ownerName}, so you won't get messages from each other.` : ""}</p>
            <button type="button" onClick={() => dialog.current?.close()} className="btn min-h-11 self-start px-5 text-sm">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3 p-6">
            <h2 id="rep-title" className="text-lg font-bold">{label}</h2>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-sm font-semibold">What&apos;s wrong?</legend>
              {Object.entries(REPORT_REASONS).map(([k, l]) => (
                <label key={k} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm ${reason === k ? "border-violet/50 bg-[#F3F0FF]" : "border-black/10"}`}>
                  <input type="radio" name="reason" value={k} checked={reason === k} onChange={() => setReason(k)} />
                  {l}
                </label>
              ))}
            </fieldset>
            <label htmlFor={`rep-d-${targetId}`} className="text-sm font-semibold">Details (optional)</label>
            <textarea id={`rep-d-${targetId}`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} className="input" />
            <label htmlFor={`rep-s-${targetId}`} className="text-sm font-semibold">Screenshot link (optional)</label>
            <input id={`rep-s-${targetId}`} value={shot} onChange={(e) => setShot(e.target.value)} className="input" placeholder="https://…" />
            {ownerId && !isBlocked && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} />
                Also block {ownerName}
              </label>
            )}
            {err && <p role="alert" className="text-sm font-semibold text-err">{err}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn min-h-11 px-5 text-sm">{busy ? "Sending…" : "Send report"}</button>
              <button type="button" onClick={() => dialog.current?.close()} className="btn btn-ghost min-h-11 px-5 text-sm">Cancel</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
