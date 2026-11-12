"use client";

import { useState } from "react";
import { money } from "@/lib/format";

type Props = {
  serviceId?: number;
  offerMessageId?: number;
  title: string;
  includes: string | null;
  priceCents: number;
  brandFeeCents: number;
  turnaroundDays: number;
  revisions: number;
  creatorName: string;
  canBook: boolean;
  blockedReason?: string;
};

/** Brief, post-by date and order summary, then off to Stripe's secure payment page. */
export default function CheckoutForm(p: Props) {
  const minDate = new Date(Date.now() + Math.max(1, p.turnaroundDays) * 86400000).toISOString().slice(0, 10);
  const [brief, setBrief] = useState("");
  const [postBy, setPostBy] = useState(minDate);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (brief.trim().length < 10) return setError("Write a brief of at least 10 characters so the creator knows what you need.");
    setBusy(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: p.serviceId, offer_message_id: p.offerMessageId, brief, post_by: postBy, tag }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !json.url) {
      setBusy(false);
      return setError(json.error || "Couldn't start checkout. Please try again.");
    }
    window.location.href = json.url;
  }

  return (
    <form onSubmit={pay} className="grid items-start gap-6 lg:grid-cols-[1fr_380px]" noValidate>
      <section className="panel flex flex-col gap-4 p-6" aria-labelledby="brief-title">
        <h2 id="brief-title" className="eyebrow">
          Your brief
        </h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="co-brief" className="text-sm font-semibold">
            What should {p.creatorName} make?
          </label>
          <textarea
            id="co-brief"
            value={brief}
            maxLength={4000}
            onChange={(e) => setBrief(e.target.value)}
            className="input min-h-[160px]"
            placeholder="What should the content show? Key talking points, links, hashtags, anything to avoid."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="co-date" className="text-sm font-semibold">
              Post by
            </label>
            <input id="co-date" type="date" value={postBy} min={minDate} onChange={(e) => setPostBy(e.target.value)} className="input" />
            <p className="text-xs text-ink-2">At least {p.turnaroundDays} day{p.turnaroundDays === 1 ? "" : "s"} away, the creator&apos;s turnaround.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="co-tag" className="text-sm font-semibold">
              Tag or mention (optional)
            </label>
            <input id="co-tag" value={tag} maxLength={80} onChange={(e) => setTag(e.target.value)} className="input" placeholder="@yourbrand" />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <section className="panel flex flex-col gap-3 p-6" aria-labelledby="sum-title">
          <h2 id="sum-title" className="eyebrow">
            Order summary
          </h2>
          <div>
            <p className="font-bold">{p.title}</p>
            <p className="text-xs text-ink-2">
              {p.turnaroundDays}-day turnaround · {p.revisions} revision{p.revisions === 1 ? "" : "s"}
            </p>
            {p.includes && <p className="mt-1 text-sm text-body">{p.includes}</p>}
          </div>
          <dl className="flex flex-col gap-1.5 border-t border-black/[.06] pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-body">Price</dt>
              <dd className="font-semibold">{money(p.priceCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Payment processing</dt>
              <dd className="font-semibold">{money(p.brandFeeCents)}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-black/[.06] pt-2 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-extrabold">{money(p.priceCents + p.brandFeeCents)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel flex flex-col gap-3 bg-[#F7F5FF] p-6" aria-labelledby="prot-title">
          <h2 id="prot-title" className="eyebrow">
            How your money is protected
          </h2>
          {[
            ["You pay now", `Clouta holds the money. ${p.creatorName} can see it's secured.`],
            ["They deliver", "They submit links to the live post."],
            ["You approve", "Money is released. No reply in 3 days approves it automatically. Not delivered by the date? Full refund."],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-3">
              <span className="grid size-6 flex-none place-items-center rounded-full bg-white text-xs font-extrabold text-violet-deep">{i + 1}</span>
              <div>
                <p className="text-sm font-bold">{t}</p>
                <p className="text-xs leading-relaxed text-body">{d}</p>
              </div>
            </div>
          ))}
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-err-bg px-4 py-3 text-sm font-semibold text-err">
            {error}
          </p>
        )}
        {p.canBook ? (
          <button type="submit" disabled={busy} className="btn min-h-12 text-base">
            {busy ? "Opening secure checkout…" : `Pay ${money(p.priceCents + p.brandFeeCents)}`}
          </button>
        ) : (
          <p className="rounded-xl bg-[#FFF4D6] px-4 py-3 text-sm font-semibold text-[#7A5200]">{p.blockedReason}</p>
        )}
        <p className="text-center text-xs text-ink-2">🔒 Card details are entered on Stripe&apos;s secure page. Clouta never sees your card number.</p>
      </div>
    </form>
  );
}
