/** Client-safe order status labels and colours. */
export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  funded: "Paid · ready to start",
  in_progress: "In progress",
  proof_submitted: "Proof submitted",
  revision_requested: "Revision requested",
  approved: "Approved",
  paid: "Paid out",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "In dispute",
};

export const STATUS_STYLE: Record<string, string> = {
  awaiting_payment: "bg-black/[.06] text-ink-2",
  funded: "bg-[#F3F0FF] text-violet-deep",
  in_progress: "bg-[#F3F0FF] text-violet-deep",
  proof_submitted: "bg-[#FFF4D6] text-[#7A5200]",
  revision_requested: "bg-[#FFF4D6] text-[#7A5200]",
  approved: "bg-ok-bg text-ok",
  paid: "bg-ok-bg text-ok",
  cancelled: "bg-black/[.06] text-ink-2",
  refunded: "bg-black/[.06] text-ink-2",
  disputed: "bg-err-bg text-err",
};

export const ACTIVE_STATUSES = ["awaiting_payment", "funded", "in_progress", "proof_submitted", "revision_requested", "approved", "disputed"];
