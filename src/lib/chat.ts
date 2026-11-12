export type Offer = { title: string; price_cents: number; turnaround_days: number; revisions: number; includes: string | null };

export type Message = {
  id: number;
  thread_id: number;
  sender_id: string | null;
  kind: "text" | "offer" | "system";
  body: string;
  offer: Offer | null;
  offer_status: "pending" | "accepted" | "declined" | "withdrawn" | null;
  created_at: string;
};

export type InboxRow = {
  thread_id: number;
  other_id: string;
  other_name: string | null;
  other_handle: string | null;
  other_role: "creator" | "brand" | "admin" | null;
  other_avatar_source: "auto" | "pattern" | "upload";
  other_avatar_pattern: number;
  other_avatar_url: string | null;
  last_body: string | null;
  last_kind: "text" | "offer" | "system" | null;
  last_sender: string | null;
  last_message_at: string;
  unread: number;
};

/** Spots contact details or links, so we can remind people that off-platform payments aren't protected. */
export function hasContactInfo(text: string) {
  return (
    /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text) ||
    /(\+?\d[\d\s().-]{7,}\d)/.test(text) ||
    /\b(https?:\/\/|www\.)\S+/i.test(text) ||
    /\b(venmo|cash ?app|paypal|zelle|whatsapp|telegram)\b/i.test(text)
  );
}

export function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" });
}
