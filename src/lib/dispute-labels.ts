/** Client-safe dispute labels. */
export const DISPUTE_REASONS: Record<string, { label: string; who: "brand" | "creator" | "both" }> = {
  not_delivered: { label: "The work wasn't delivered", who: "brand" },
  not_as_agreed: { label: "The work doesn't match what we agreed", who: "brand" },
  late: { label: "It was posted late", who: "brand" },
  unresponsive: { label: "They stopped responding", who: "both" },
  unfair_request: { label: "The brand is asking for more than we agreed", who: "creator" },
  other: { label: "Something else", who: "both" },
};
