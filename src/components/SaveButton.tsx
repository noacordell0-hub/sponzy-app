"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buzz, toast } from "@/lib/delight";

/** Heart toggle that saves a creator to the signed-in user's list. Visitors are sent to log in. */
export default function SaveButton({
  creatorId,
  initialSaved,
  viewerId,
  compact = false,
}: {
  creatorId: string;
  initialSaved: boolean;
  viewerId: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [popKey, setPopKey] = useState(0);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!viewerId) return router.push("/login");
    if (viewerId === creatorId) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    setPopKey((k) => k + 1);
    buzz();
    const { error } = next
      ? await supabase.from("saved_creators").insert({ brand_id: viewerId, creator_id: creatorId })
      : await supabase.from("saved_creators").delete().eq("brand_id", viewerId).eq("creator_id", creatorId);
    if (error && error.code !== "23505") {
      setSaved(!next);
      toast("Couldn't update your saved creators. Try again.", "error");
    } else if (next) toast("Saved. Find them on your dashboard.");
    setBusy(false);
  }

  if (viewerId === creatorId) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved creators" : "Save creator"}
      className={`flex flex-none items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition ${
        saved ? "border-[#F2B8C6] bg-[#FFF0F4] text-[#C2185B]" : "border-black/10 bg-white text-body hover:text-ink"
      } ${compact ? "size-10" : "min-h-11 px-4"}`}
    >
      <svg key={popKey} className={popKey ? "pop" : undefined} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 20s-7-4.4-9.2-8.6C1.4 8.7 3 5 6.6 5c2 0 3.4 1.1 4.4 2.6C12 6.1 13.4 5 15.4 5 19 5 20.6 8.7 19.2 11.4 17 15.6 12 20 12 20z" />
      </svg>
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}
