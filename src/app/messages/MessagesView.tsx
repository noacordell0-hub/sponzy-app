"use client";

import ReportButton from "@/components/ReportButton";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { money } from "@/lib/format";
import { hasContactInfo, timeLabel, type InboxRow, type Message } from "@/lib/chat";
import { messageRisk } from "@/lib/fraud";

type Other = {
  id: string;
  display_name: string | null;
  handle: string | null;
  role: "creator" | "brand" | "admin" | null;
  avatar_source: "auto" | "pattern" | "upload";
  avatar_pattern: number;
  avatar_url: string | null;
  young_tag: boolean;
} | null;

export default function MessagesView(props: { me: string; myName: string; inbox: InboxRow[]; threadId: number | null; initialMessages: Message[]; other: Other }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [inbox, setInbox] = useState(props.inbox);
  const [messages, setMessages] = useState(props.initialMessages);
  const { threadId, other, me } = props;

  useEffect(() => setInbox(props.inbox), [props.inbox]);
  useEffect(() => setMessages(props.initialMessages), [props.initialMessages, threadId]);

  const refreshInbox = useCallback(async () => {
    const { data } = await supabase.rpc("inbox");
    if (data) setInbox(data as InboxRow[]);
  }, [supabase]);

  // Mark the open thread as read, and refresh the header's unread badge if it changed.
  const lastMarked = useRef<string>("");
  useEffect(() => {
    if (!threadId) return;
    const key = `${threadId}:${messages.length}`;
    if (lastMarked.current === key) return;
    lastMarked.current = key;
    const hadUnread = inbox.find((t) => t.thread_id === threadId)?.unread ?? 0;
    supabase.rpc("mark_thread_read", { p_thread: threadId }).then(() => {
      refreshInbox();
      if (hadUnread > 0) router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, messages.length]);

  // Live updates: new messages and offer status changes. RLS only delivers rows from my threads.
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if (m.thread_id === threadId) setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        refreshInbox();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if (m.thread_id === threadId) setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, me, threadId, refreshInbox]);

  const showThread = Boolean(threadId && other);

  return (
    <div className="panel grid h-[calc(100dvh-11.5rem)] min-h-[460px] md:h-[calc(100vh-9rem)] md:min-h-[520px] grid-cols-1 overflow-hidden md:grid-cols-[320px_minmax(0,1fr)]">
      {/* Inbox */}
      <section aria-label="Conversations" className={`min-h-0 min-w-0 flex-col border-r border-black/[.06] ${showThread ? "hidden md:flex" : "flex"}`}>
        <div className="border-b border-black/[.06] px-5 py-4">
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">Messages</h2>
        </div>
        {inbox.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="font-bold">No conversations yet</p>
            <p className="text-sm text-body">Open a creator or brand profile and tap Message to start one.</p>
            <Link href="/browse" className="btn btn-ghost mt-2 min-h-11 px-5 text-sm">
              Browse creators
            </Link>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {inbox.map((t) => (
              <li key={t.thread_id}>
                <Link
                  href={`/messages?t=${t.thread_id}`}
                  aria-current={t.thread_id === threadId ? "page" : undefined}
                  className={`flex items-center gap-3 border-b border-black/[.04] px-4 py-3 ${t.thread_id === threadId ? "bg-[#F3F0FF]" : "hover:bg-black/[.02]"}`}
                >
                  <Avatar name={t.other_name} source={t.other_avatar_source} pattern={t.other_avatar_pattern} url={t.other_avatar_url} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${t.unread ? "font-extrabold" : "font-semibold"}`}>{t.other_name}</span>
                      <span className="flex-none text-[11px] text-ink-2">{timeLabel(t.last_message_at)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${t.unread ? "font-semibold text-ink" : "text-ink-2"}`}>
                        {t.last_kind === "offer" ? "📄 Offer" : `${t.last_sender === me ? "You: " : ""}${t.last_body ?? ""}`}
                      </span>
                      {t.unread > 0 && (
                        <span className="grid min-w-5 flex-none place-items-center rounded-full bg-violet-deep px-1.5 text-[11px] font-bold text-white" aria-label={`${t.unread} unread`}>
                          {t.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Conversation */}
      <section aria-label="Conversation" className={`min-h-0 min-w-0 flex-col ${showThread ? "flex" : "hidden md:flex"}`}>
        {showThread && other ? (
          <Conversation key={threadId} me={me} threadId={threadId!} other={other} messages={messages} setMessages={setMessages} onBack={() => router.push("/messages")} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-body">Choose a conversation to read it.</div>
        )}
      </section>
    </div>
  );
}

function Conversation({
  me,
  threadId,
  other,
  messages,
  setMessages,
  onBack,
}: {
  me: string;
  threadId: number;
  other: NonNullable<Other>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onBack: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase.from("messages").insert({ thread_id: threadId, sender_id: me, kind: "text", body }).select().single<Message>();
    // Let the other person know by email (the server sends at most one per unread burst).
    if (!error) fetch("/api/notify/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thread_id: threadId }), keepalive: true }).catch(() => {});
    setSending(false);
    if (error) return setError(error.message || "Couldn't send that message.");
    setText("");
    if (data) setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
  }

  const profileHref = other.role === "brand" ? `/b/${other.handle}` : `/c/${other.handle}`;

  return (
    <>
      <header className="flex items-center gap-3 border-b border-black/[.06] px-4 py-3">
        <button type="button" onClick={onBack} className="grid size-10 place-items-center rounded-lg text-xl text-ink-2 hover:bg-black/[.05] md:hidden" aria-label="Back to conversations">
          ←
        </button>
        <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={other.display_name} source={other.avatar_source} pattern={other.avatar_pattern} url={other.avatar_url} size={40} />
          <span className="min-w-0">
            <span className="block truncate font-bold">{other.display_name}</span>
            <span className="block text-xs text-ink-2">
              <span className="capitalize">{other.role}</span> · @{other.handle}
            </span>
          </span>
        </Link>
        <ReportButton targetType="profile" targetId={other.id} ownerId={other.id} ownerName={other.display_name ?? "them"} viewerId={me} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3] px-4 py-5" aria-live="polite">
        <div className="mx-auto mb-5 max-w-md rounded-xl border border-black/[.06] bg-white px-4 py-3 text-center text-xs leading-relaxed text-body">
          🔒 Keep payments on Clouta. Money is only held and protected when the order is paid through Clouta.
          {other.young_tag && (
            <span className="mt-1 block font-semibold text-[#7A5200]">This is a young creator. Keep things professional; their parent or guardian is involved in orders.</span>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          {messages.map((m) => (
            <Bubble key={m.id} m={m} me={me} iAmBrand={other.role === "creator"} />
          ))}
        </div>
        <div ref={endRef} />
      </div>

      {offerOpen && <OfferForm threadId={threadId} me={me} onClose={() => setOfferOpen(false)} onSent={(m) => setMessages((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))} />}

      <form onSubmit={send} className="border-t border-black/[.06] p-3">
        {hasContactInfo(text) && (
          <p className="mb-2 rounded-lg bg-[#FFF9E8] px-3 py-2 text-xs text-[#6B4700]">
            Sharing contact details is fine, but payments made outside Clouta aren&apos;t protected.
          </p>
        )}
        {error && (
          <p role="alert" className="mb-2 text-sm font-semibold text-err">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => setOfferOpen((o) => !o)} className="btn btn-ghost min-h-11 flex-none px-3 text-sm" aria-expanded={offerOpen}>
            + Offer
          </button>
          <label htmlFor="msg-input" className="sr-only">
            Message
          </label>
          <textarea
            id="msg-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Write a message…"
            className="max-h-36 min-h-11 flex-1 resize-none rounded-[12px] border border-black/12 bg-white px-3.5 py-2.5 text-[15px] focus:border-violet focus:shadow-[0_0_0_4px_rgba(108,71,255,.16)] focus:outline-none"
          />
          <button type="submit" disabled={!text.trim() || sending} className="btn min-h-11 flex-none px-4 text-sm">
            Send
          </button>
        </div>
      </form>
    </>
  );
}

function Bubble({ m, me, iAmBrand }: { m: Message; me: string; iAmBrand: boolean }) {
  if (m.kind === "system") {
    return <p className="mx-auto max-w-md rounded-full bg-ok-bg px-3 py-1.5 text-center text-xs font-semibold text-ok">{m.body}</p>;
  }
  const mine = m.sender_id === me;
  if (m.kind === "offer" && m.offer) return <OfferCard m={m} mine={mine} iAmBrand={iAmBrand} />;
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <p
        className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
          mine ? "rounded-br-md bg-[#5B3DF5] text-white" : "rounded-bl-md bg-white text-ink ring-1 ring-black/[.06]"
        }`}
      >
        {m.body}
      </p>
      {!mine && <RiskNote text={m.body ?? ""} />}
      <span className="mt-0.5 px-1 text-[11px] text-ink-2">{timeLabel(m.created_at)}</span>
    </div>
  );
}

/** Warns the reader (not the sender) when a message asks to pay outside Clouta or looks like phishing. */
function RiskNote({ text }: { text: string }) {
  const r = messageRisk(text);
  if (!r.offPlatform && !r.phishing) return null;
  return (
    <p role="note" className="mt-1.5 max-w-[78%] rounded-xl border border-[#F2B8C6] bg-[#FFF5F7] px-3 py-2 text-xs leading-relaxed text-[#8A1538]">
      <b>⚠ Be careful.</b>{" "}
      {r.phishing
        ? "Clouta staff never message you here and never ask for codes, passwords or card details. Don't click links asking you to log in."
        : "Paying outside Clouta (Venmo, PayPal, Cash App, gift cards, crypto…) means no refund if the work never arrives. Always book through Clouta."}{" "}
      If something feels off, use Report at the top of this chat.
    </p>
  );
}

function OfferCard({ m, mine, iAmBrand }: { m: Message; mine: boolean; iAmBrand: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const o = m.offer!;
  const statusStyle: Record<string, string> = {
    pending: "bg-[#FFF4D6] text-[#7A5200]",
    accepted: "bg-ok-bg text-ok",
    declined: "bg-black/[.06] text-ink-2",
    withdrawn: "bg-black/[.06] text-ink-2",
  };

  async function act(action: "accept" | "decline" | "withdraw") {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("respond_offer", { p_message: m.id, p_action: action });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className={`flex min-w-0 ${mine ? "justify-end" : "justify-start"}`}>
      <div className="w-full min-w-0 max-w-sm rounded-2xl border border-black/[.08] bg-white p-4 shadow-[0_4px_16px_rgba(21,19,31,.06)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-violet-deep">{mine ? "Your offer" : "Offer"}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyle[m.offer_status ?? "pending"]}`}>{m.offer_status}</span>
        </div>
        <p className="mt-2 font-bold">{o.title}</p>
        <p className="text-2xl font-extrabold tracking-[-0.02em]">{money(o.price_cents)}</p>
        <p className="text-xs text-ink-2">
          {o.turnaround_days}-day turnaround · {o.revisions} revision{o.revisions === 1 ? "" : "s"}
        </p>
        {o.includes && <p className="mt-2 whitespace-pre-wrap text-sm text-body">{o.includes}</p>}
        {m.offer_status === "pending" && (
          <div className="mt-3 flex gap-2">
            {mine ? (
              <button type="button" onClick={() => act("withdraw")} disabled={busy} className="btn btn-ghost min-h-10 flex-1 text-sm">
                Withdraw
              </button>
            ) : (
              <>
                <button type="button" onClick={() => act("decline")} disabled={busy} className="btn btn-ghost min-h-10 flex-1 text-sm">
                  Decline
                </button>
                <button type="button" onClick={() => act("accept")} disabled={busy} className="btn min-h-10 flex-1 text-sm">
                  Accept
                </button>
              </>
            )}
          </div>
        )}
        {m.offer_status === "accepted" &&
          (iAmBrand ? (
            <Link href={`/checkout/offer/${m.id}`} className="btn mt-3 min-h-10 w-full text-sm">
              Check out · {money(o.price_cents)}
            </Link>
          ) : (
            <p className="mt-3 rounded-lg bg-ok-bg px-3 py-2 text-xs font-semibold text-ok">Accepted. The brand can now check out, and you&apos;ll see the order in Orders.</p>
          ))}
        {error && (
          <p role="alert" className="mt-2 text-xs font-semibold text-err">
            {error}
          </p>
        )}
        <p className="mt-2 text-right text-[11px] text-ink-2">{timeLabel(m.created_at)}</p>
      </div>
    </div>
  );
}

function OfferForm({ threadId, me, onClose, onSent }: { threadId: number; me: string; onClose: () => void; onSent: (m: Message) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("5");
  const [revisions, setRevisions] = useState(1);
  const [includes, setIncludes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = Math.round(Number(price) * 100);
    if (!title.trim()) return setError("Give the offer a title.");
    if (!Number.isFinite(cents) || cents < 500) return setError("Offers start at $5.");
    setBusy(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: me,
        kind: "offer",
        body: `Offer: ${title.trim()} for ${money(cents)}`,
        offer: { title: title.trim(), price_cents: cents, turnaround_days: Number(days), revisions, includes: includes.trim() || null },
      })
      .select()
      .single<Message>();
    setBusy(false);
    if (error) return setError(error.message);
    fetch("/api/notify/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thread_id: threadId }), keepalive: true }).catch(() => {});
    if (data) onSent(data);
    onClose();
  }

  return (
    <form onSubmit={submit} className="border-t border-black/[.06] bg-white p-4" aria-label="Make an offer">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold">Make an offer</p>
        <button type="button" onClick={onClose} className="min-h-9 px-2 text-sm font-semibold text-ink-2">
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_110px_130px]">
        <div className="flex flex-col gap-1">
          <label htmlFor="of-title" className="text-xs font-semibold">
            What&apos;s included
          </label>
          <input id="of-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className="input !min-h-11" placeholder="2 TikTok videos" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="of-price" className="text-xs font-semibold">
            Price (USD)
          </label>
          <input id="of-price" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="input !min-h-11" placeholder="200" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="of-days" className="text-xs font-semibold">
            Days
          </label>
          <input id="of-days" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="input !min-h-11" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="of-rev" className="text-xs font-semibold">
            Revisions
          </label>
          <select id="of-rev" value={revisions} onChange={(e) => setRevisions(Number(e.target.value))} className="input !min-h-11">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <label htmlFor="of-inc" className="text-xs font-semibold">
          Details (optional)
        </label>
        <textarea id="of-inc" value={includes} maxLength={600} onChange={(e) => setIncludes(e.target.value)} className="input !min-h-16" placeholder="Posting dates, hashtags, usage rights…" />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-err">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn mt-3 min-h-11 px-5 text-sm">
        {busy ? "Sending…" : "Send offer"}
      </button>
    </form>
  );
}
