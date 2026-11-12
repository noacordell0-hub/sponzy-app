"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stars } from "@/components/Stars";
import type { Review } from "@/lib/trust";
import ReportButton from "@/components/ReportButton";

type Props = {
  review: Review;
  authorName: string;
  reply: { body: string; created_at: string } | null;
  subjectName: string | null;
  viewerId: string | null;
  votedInitially: boolean;
};

/** One public review: stars, tags, text, helpful votes, and the reviewed person's single reply. */
export default function ReviewCard({ review, authorName, reply, subjectName, viewerId, votedInitially }: Props) {
  const router = useRouter();
  const [voted, setVoted] = useState(votedInitially);
  const [count, setCount] = useState(review.helpful_count);
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isSubject = viewerId === review.subject_id;
  const canVote = viewerId && !isSubject && viewerId !== review.author_id;

  async function post(body: object) {
    const res = await fetch(`/api/reviews/${review.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }
  async function vote() {
    if (!viewerId) return router.push("/login");
    const next = !voted;
    setVoted(next);
    setCount((c) => c + (next ? 1 : -1));
    const r = await post({ action: next ? "helpful" : "unhelpful" });
    if (!r.ok) {
      setVoted(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  }
  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await post({ action: "reply", body: text });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? "Couldn't post your reply.");
    setReplying(false);
    router.refresh();
  }

  const cats = [
    ["Quality", review.quality],
    ["Communication", review.communication],
    ["Timeliness", review.timeliness],
    ["Value", review.value],
  ].filter(([, v]) => v) as [string, number][];
  const date = new Date(review.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <article className="flex flex-col gap-3 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.overall} size={16} />
        <span className="text-sm font-bold">{authorName}</span>
        <span className="text-xs text-ink-2">
          {review.author_role === "brand" ? "Brand" : "Creator"} · {date}
        </span>
        {review.would_rehire && <span className="ml-auto rounded-md bg-ok-bg px-2 py-0.5 text-[11px] font-semibold text-ok">Would work together again</span>}
      </div>
      {review.body && <p className="whitespace-pre-line text-[15px] leading-relaxed text-body">{review.body}</p>}
      {review.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {review.tags.map((t) => (
            <li key={t} className="rounded-md bg-black/[.05] px-2 py-0.5 text-xs font-semibold text-body">
              {t}
            </li>
          ))}
        </ul>
      )}
      {cats.length > 0 && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {cats.map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <dt>{k}</dt>
              <dd className="font-bold text-ink">{v}/5</dd>
            </div>
          ))}
        </dl>
      )}

      {reply && (
        <div className="ml-4 rounded-xl border-l-2 border-violet/40 bg-[#F7F5FF] px-4 py-3">
          <p className="text-xs font-bold text-violet-deep">Reply from {subjectName ?? "them"}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-body">{reply.body}</p>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs">
        {canVote || !viewerId ? (
          <button type="button" onClick={vote} aria-pressed={voted} className={`rounded-full border px-3 py-1 font-semibold ${voted ? "border-violet/40 bg-[#F3F0FF] text-violet-deep" : "border-black/10 text-body hover:text-ink"}`}>
            👍 Helpful{count > 0 ? ` · ${count}` : ""}
          </button>
        ) : (
          count > 0 && <span className="text-ink-2">{count} found this helpful</span>
        )}
        <span className="ml-auto">
          <ReportButton targetType="review" targetId={review.id} ownerId={review.author_id} ownerName={authorName} viewerId={viewerId} />
        </span>
        {isSubject && !reply && !replying && (
          <button type="button" onClick={() => setReplying(true)} className="font-semibold text-violet-deep">
            Reply publicly
          </button>
        )}
      </div>

      {replying && (
        <form onSubmit={sendReply} className="flex flex-col gap-2">
          <label htmlFor={`reply-${review.id}`} className="text-xs font-semibold">
            Your public reply (you can reply once, and it can&apos;t be edited)
          </label>
          <textarea id={`reply-${review.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} className="input" required />
          {err && <p className="text-sm text-err">{err}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !text.trim()} className="btn min-h-10 px-4 text-sm">
              Post reply
            </button>
            <button type="button" onClick={() => setReplying(false)} className="btn btn-ghost min-h-10 px-4 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
