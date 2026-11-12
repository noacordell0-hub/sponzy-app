"use client";

import { useEffect } from "react";
import { track, type EventName } from "@/lib/analytics";

/** Fires one analytics event when a page is shown. Drop into any server page: <TrackView name="browse_view" />. */
export default function TrackView({ name, props }: { name: EventName; props?: Record<string, string | number | boolean | null> }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    track(name, JSON.parse(key));
  }, [name, key]);
  return null;
}
