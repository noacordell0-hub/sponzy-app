"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHECKS = ["The post is live and public", "It follows the brand's brief", "The brand is tagged or mentioned as asked"];

export default function DeliverForm({ orderId, initialLinks, revisionNote }: { orderId: number; initialLinks: string[]; revisionNote: string | null }) {
  const router = useRouter();
  const [links, setLinks] = useState<string[]>(initialLinks.length ? initialLinks : [""]);
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = links.map((l) => l.trim()).filter(Boolean).map((l) => (/^https?:\/\//i.test(l) ? l.replace(/^http:/i, "https:") : `https://${l}`));
    if (clean.length === 0) return setError("Add at least one link to the live post.");
    if (!checked.every(Boolean)) return setError("Tick each item to confirm before submitting.");
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", links: clean, note }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setError(json.error || "Couldn't submit. Please try again.");
    router.push(`/orders/${orderId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel flex max-w-[720px] flex-col gap-5 p-6" noValidate>
      {revisionNote && (
        <div className="rounded-xl bg-[#FFF4D6] p-4 text-sm text-[#6B4700]">
          <b>Revision requested:</b> {revisionNote}
        </div>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">Links to the live post(s)</legend>
        {links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <label htmlFor={`link-${i}`} className="sr-only">
              Link {i + 1}
            </label>
            <input
              id={`link-${i}`}
              value={l}
              onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))}
              className="input"
              placeholder="https://www.tiktok.com/@you/video/…"
              inputMode="url"
            />
            {links.length > 1 && (
              <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))} className="min-h-11 px-3 text-sm font-semibold text-err" aria-label={`Remove link ${i + 1}`}>
                Remove
              </button>
            )}
          </div>
        ))}
        {links.length < 5 && (
          <button type="button" onClick={() => setLinks([...links, ""])} className="min-h-10 self-start text-sm font-semibold text-violet-deep">
            + Add another link
          </button>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">Before you submit</legend>
        {CHECKS.map((c, i) => (
          <label key={c} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={checked[i]} onChange={() => setChecked(checked.map((v, j) => (j === i ? !v : v)))} className="size-[18px] accent-[#5B3DF5]" />
            {c}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="d-note" className="text-sm font-semibold">
          Note for the brand (optional)
        </label>
        <textarea id="d-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="input" placeholder="Anything they should know, like stats so far." />
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-err-bg px-4 py-3 text-sm font-semibold text-err">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn min-h-12 self-start px-6 text-base">
        {busy ? "Submitting…" : "Submit proof"}
      </button>
      <p className="text-xs text-ink-2">The brand then has 3 days to approve or request a revision. After that it&apos;s approved automatically and you&apos;re paid.</p>
    </form>
  );
}
