"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import ReportButton from "@/components/ReportButton";

export type CommentRow = {
  id: number;
  parent_id: number | null;
  author_id: string;
  body: string;
  like_count: number;
  created_at: string;
  author: { display_name: string | null; handle: string | null; role: string; avatar_source: "auto" | "pattern" | "upload"; avatar_pattern: number; avatar_url: string | null } | null;
};

function ago(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Community comments on a creator's page: post, reply (one level), like, delete, report. */
export default function Comments({ creatorId, creatorName, viewerId, initial, liked }: { creatorId: string; creatorName: string; viewerId: string | null; initial: CommentRow[]; liked: number[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [likes, setLikes] = useState<Set<number>>(new Set(liked));
  const [counts, setCounts] = useState<Record<number, number>>(Object.fromEntries(initial.map((c) => [c.id, c.like_count])));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const top = initial.filter((c) => !c.parent_id);
  const replies = (id: number) => initial.filter((c) => c.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const isCreator = viewerId === creatorId;

  async function post(body: string, parent: number | null) {
    if (!viewerId) return router.push("/login");
    if (!body.trim()) return;
    setBusy(true);
    setErr("");
    const { error } = await supabase.from("comments").insert({ creator_id: creatorId, author_id: viewerId, parent_id: parent, body });
    setBusy(false);
    if (error) return setErr(error.message.includes("row-level security") ? "You can't comment here." : error.message);
    setText("");
    setReplyText("");
    setReplyTo(null);
    router.refresh();
  }
  async function toggleLike(id: number) {
    if (!viewerId) return router.push("/login");
    const on = !likes.has(id);
    const next = new Set(likes);
    if (on) next.add(id);
    else next.delete(id);
    setLikes(next);
    setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + (on ? 1 : -1) }));
    const { error } = on
      ? await supabase.from("comment_likes").insert({ comment_id: id, profile_id: viewerId })
      : await supabase.from("comment_likes").delete().eq("comment_id", id).eq("profile_id", viewerId);
    if (error && error.code !== "23505") router.refresh();
  }
  async function remove(id: number) {
    if (!window.confirm("Delete this comment?")) return;
    await supabase.from("comments").delete().eq("id", id);
    router.refresh();
  }

  function One({ c, isReply }: { c: CommentRow; isReply?: boolean }) {
    const a = c.author;
    const href = a ? (a.role === "brand" ? `/b/${a.handle}` : `/c/${a.handle}`) : "#";
    return (
      <div className={`flex gap-3 ${isReply ? "mt-3" : ""}`}>
        <Avatar name={a?.display_name ?? "?"} source={a?.avatar_source ?? "auto"} pattern={a?.avatar_pattern ?? 0} url={a?.avatar_url ?? null} size={isReply ? 28 : 36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Link href={href} className="font-bold hover:text-violet-deep">{a?.display_name ?? "Former member"}</Link>
            {c.author_id === creatorId && <span className="badge-violet ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold">Creator</span>}
            {a?.role === "brand" && <span className="ml-1.5 rounded bg-black/[.05] px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">Brand</span>}
            <span className="ml-1.5 text-xs text-ink-2">{ago(c.created_at)}</span>
          </p>
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-body">{c.body}</p>
          <div className="mt-1 flex items-center gap-4 text-xs font-semibold text-ink-2">
            <button type="button" onClick={() => toggleLike(c.id)} aria-pressed={likes.has(c.id)} className={likes.has(c.id) ? "text-[#C2185B]" : "hover:text-ink"}>
              ♥ {counts[c.id] > 0 ? counts[c.id] : "Like"}
            </button>
            {!isReply && viewerId && <button type="button" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="hover:text-ink">Reply</button>}
            {(viewerId === c.author_id || isCreator) && <button type="button" onClick={() => remove(c.id)} className="hover:text-err">Delete</button>}
            {viewerId !== c.author_id && <ReportButton targetType="comment" targetId={c.id} ownerId={c.author_id} ownerName={a?.display_name} viewerId={viewerId} />}
          </div>
          {!isReply && replies(c.id).map((r) => <One key={r.id} c={r} isReply />)}
          {replyTo === c.id && (
            <form onSubmit={(e) => { e.preventDefault(); post(replyText, c.id); }} className="mt-2 flex gap-2">
              <label htmlFor={`rep-${c.id}`} className="sr-only">Reply</label>
              <input id={`rep-${c.id}`} value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={500} className="input flex-1 py-2 text-sm" placeholder="Write a reply…" autoFocus />
              <button type="submit" disabled={busy || !replyText.trim()} className="btn min-h-10 px-4 text-sm">Reply</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="panel p-6" aria-labelledby="com-t">
      <h2 id="com-t" className="eyebrow">
        Community · {initial.length} comment{initial.length === 1 ? "" : "s"}
      </h2>
      {viewerId ? (
        <form onSubmit={(e) => { e.preventDefault(); post(text, null); }} className="mt-3 flex flex-col gap-2">
          <label htmlFor="com-new" className="sr-only">Write a comment</label>
          <textarea id="com-new" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={2} className="input text-sm" placeholder={isCreator ? "Post an update for your community…" : `Say something nice to ${creatorName}…`} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-2">{text.length}/500 · Be kind. No contact details or payment requests.</span>
            <button type="submit" disabled={busy || !text.trim()} className="btn min-h-10 px-4 text-sm">Post</button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-body"><Link href="/login" className="font-semibold text-violet-deep">Log in</Link> to join the conversation.</p>
      )}
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-err">{err}</p>}
      <div className="mt-5 flex flex-col gap-5">
        {top.length === 0 ? <p className="text-sm text-ink-2">No comments yet. Be the first!</p> : top.map((c) => <One key={c.id} c={c} />)}
      </div>
    </section>
  );
}
