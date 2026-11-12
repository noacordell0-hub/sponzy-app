"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** A warning from the Clouta team, shown until the person marks it as read. */
export default function WarningNotice({ id, note }: { id: number; note: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#F2D58A] bg-[#FFF9E8] px-5 py-4 text-sm text-[#6B4700] sm:flex-row sm:items-center">
      <p className="flex-1">
        <b>A warning from the Clouta team:</b> {note ?? "Please review the community rules."} Repeated problems can lead to a suspension or ban.
      </p>
      <button
        type="button"
        onClick={async () => {
          setHidden(true);
          await supabase.from("moderation_actions").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
        }}
        className="btn min-h-10 px-4 text-sm"
      >
        I understand
      </button>
    </div>
  );
}
