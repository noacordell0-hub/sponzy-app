"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { buzz, toast } from "@/lib/delight";
import { Check } from "@/components/Delight";

/** Copy-your-shop-link button for the creator Home. */
export default function ShareShop({ handle, published }: { handle: string; published: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!handle) return null;
  const link = `${typeof window === "undefined" ? "https://clouta.vercel.app" : window.location.origin}/c/${handle}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/c/${handle}`} className="btn btn-ghost min-h-11 px-4 text-sm">
        View my shop
      </Link>
      <button
        type="button"
        disabled={!published}
        title={published ? undefined : "Publish your shop first"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            buzz();
            toast("Shop link copied. Paste it in your bio!");
            track("shop_link_copied", {});
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard blocked */
          }
        }}
        className="btn min-h-11 px-4 text-sm"
      >
        {copied ? (
          <>
            <Check className="size-4" /> Copied
          </>
        ) : published ? (
          "Copy shop link"
        ) : (
          "Publish to share"
        )}
      </button>
    </div>
  );
}
