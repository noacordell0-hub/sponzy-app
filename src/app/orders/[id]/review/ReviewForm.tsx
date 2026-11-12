"use client";

import { track } from "@/lib/analytics";
import { useState } from "react";
import { useRouter } from "next/navigation";

function StarInput({ id, label, value, onChange, big = false }: { id: string; label: string; value: number; onChange: (n: number) => void; big?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className={`${big ? "mb-2 text-sm" : "w-36 text-sm"} font-semibold`}>{label}</legend>
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={id} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={`${n} star${n > 1 ? "s" : ""}`} />
            <svg viewBox="0 0 20 20" width={big ? 34 : 22} height={big ? 34 : 22} aria-hidden="true">
              <path fill={n <= shown ? "#F5B400" : "#E3DFEE"} d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.8z" />
            </svg>
          </label>
        ))}
      </div>
      {big && shown > 0 && <span className="text-sm font-semibold text-ink-2">{words[shown]}</span>}
    </fieldset>
  );
}

export default function ReviewForm({ orderId, otherName, reviewingCreator, tags, closes }: { orderId: number; otherName: string; reviewingCreator: boolean; tags: string[]; closes: string }) {
  const router = useRouter();
  const [overall, setOverall] = useState(0);
  const [cats, setCats] = useState({ quality: 0, communication: 0, timeliness: 0, value: 0 });
  const [picked, setPicked] = useState<string[]>([]);
  const [rehire, setRehire] = useState<boolean | null>(null);
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const catLabels: [keyof typeof cats, string][] = reviewingCreator
    ? [["quality", "Content quality"], ["communication", "Communication"], ["timeliness", "On time"], ["value", "Value for money"]]
    : [["quality", "Brief clarity"], ["communication", "Communication"], ["timeliness", "Approval speed"], ["value", "Fair to work with"]];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!overall) return setErr("Choose an overall star rating.");
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/orders/${orderId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overall, ...Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, v || null])), tags: picked, would_rehire: rehire, body, private_note: note }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error ?? "Couldn't save your review.");
    track("review_submitted", { role: reviewingCreator ? "brand" : "creator", overall, revealed: Boolean(data.revealed) });
    router.push(`/orders/${orderId}?reviewed=${data.revealed ? "revealed" : "hidden"}`);
    router.refresh();
  }

  const closesOn = new Date(closes).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <form onSubmit={submit} className="mt-6 flex max-w-2xl flex-col gap-5">
      <div className="panel flex items-start gap-3 bg-[#F7F5FF] p-4 text-sm text-violet-deep">
        <span aria-hidden="true">🙈</span>
        <p>
          <b>Double-blind.</b> {otherName} won&apos;t see your review until they&apos;ve left theirs (or 14 days pass), so you can be honest. Reviews can&apos;t be edited after you post. Open until {closesOn}.
        </p>
      </div>

      <section className="panel flex flex-col gap-4 p-6">
        <StarInput id="overall" label={`Overall, how was working with ${otherName}?`} value={overall} onChange={setOverall} big />
        <div className="flex flex-col gap-2 border-t border-black/[.06] pt-4">
          <p className="text-sm font-bold text-ink-2">Optional details</p>
          {catLabels.map(([k, l]) => (
            <StarInput key={k} id={k} label={l} value={cats[k]} onChange={(n) => setCats((c) => ({ ...c, [k]: n }))} />
          ))}
        </div>
      </section>

      <section className="panel flex flex-col gap-4 p-6">
        <fieldset>
          <legend className="text-sm font-semibold">What stood out? (pick any)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = picked.includes(t);
              return (
                <button key={t} type="button" aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== t) : [...p, t]))}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-violet/50 bg-[#F3F0FF] text-violet-deep" : "border-black/10 text-body hover:text-ink"}`}>
                  {t}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">Would you work with {otherName} again?</legend>
          <div className="mt-2 flex gap-2">
            {[[true, "Yes"], [false, "No"]].map(([v, l]) => (
              <button key={String(v)} type="button" aria-pressed={rehire === v} onClick={() => setRehire(v as boolean)}
                className={`min-w-20 rounded-xl border px-4 py-2 text-sm font-semibold ${rehire === v ? "border-violet/50 bg-[#F3F0FF] text-violet-deep" : "border-black/10 text-body"}`}>
                {l as string}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-body" className="text-sm font-semibold">
            Your review (public)
          </label>
          <textarea id="r-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={5} className="input" placeholder="What went well? What should others know?" />
          <span className="self-end text-xs text-ink-2">{body.length}/2000</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-note" className="text-sm font-semibold">
            Private note to Clouta (optional)
          </label>
          <textarea id="r-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} className="input" placeholder="Only the Clouta team sees this." />
        </div>
      </section>

      {err && <p role="alert" className="rounded-xl bg-err-bg px-4 py-3 text-sm font-semibold text-err">{err}</p>}
      <button type="submit" disabled={busy} className="btn min-h-12 self-start px-6 text-base">
        {busy ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
