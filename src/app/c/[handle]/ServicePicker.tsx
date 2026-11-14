"use client";

import { useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import type { Service } from "@/lib/market";

type Props = {
  services: Service[];
  creatorId: string;
  creatorName: string;
  handle: string;
  bookable: boolean;
  takingBookings: boolean;
  isOwner: boolean;
  button: { background: string; color: string };
};

/** The sticky "packages" card on a creator's shop: pick a service, see exactly what's included, then book. */
export default function ServicePicker({ services, creatorId, creatorName, handle, bookable, takingBookings, isOwner, button }: Props) {
  const [i, setI] = useState(0);
  const s = services[i];

  if (!s)
    return (
      <div className="panel p-6 text-sm text-body">
        {isOwner ? (
          <>
            You haven&apos;t added any services yet.{" "}
            <Link href="/post/edit" className="font-semibold text-violet-deep">
              Add one →
            </Link>
          </>
        ) : (
          <>
            <p>{creatorName} hasn&apos;t listed services yet. You can still ask about a custom collab.</p>
            <Link href={`/messages/new?to=${handle}`} data-track="profile_message_click" data-track-creator={creatorId} className="btn btn-ghost mt-4 min-h-11 w-full text-sm">
              Message {creatorName.split(" ")[0]}
            </Link>
          </>
        )}
      </div>
    );

  return (
    <div className="panel overflow-hidden">
      {services.length > 1 && (
        <div role="tablist" aria-label="Services" className="flex border-b border-black/[.08]">
          {services.map((x, n) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={n === i}
              title={x.name}
              onClick={() => setI(n)}
              className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center border-b-2 px-2 py-2 transition-colors ${n === i ? "border-[#5B3DF5] bg-[#5B3DF5]/[.04] text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              <span className="w-full truncate text-center text-[13px] font-semibold">{x.name}</span>
              <span className="tabular text-xs">{money(x.price_cents)}</span>
            </button>
          ))}
        </div>
      )}
      <div role="tabpanel" className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-bold leading-snug">{s.name}</h3>
            {s.is_bundle && <span className="badge-violet mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold">Bundle</span>}
          </div>
          <p className="tabular flex-none text-2xl font-extrabold tracking-[-0.02em]">{money(s.price_cents)}</p>
        </div>
        {s.includes && <p className="whitespace-pre-line text-sm leading-relaxed text-body">{s.includes}</p>}
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2.5">
            <Clock />
            <span>
              <b>{s.turnaround_days}-day</b> delivery
            </span>
          </li>
          <li className="flex items-center gap-2.5">
            <Loop />
            <span>{s.revisions === 0 ? "No revisions" : <><b>{s.revisions}</b> revision{s.revisions > 1 ? "s" : ""} included</>}</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Shield />
            <span>Payment held until you approve</span>
          </li>
        </ul>
        {isOwner ? (
          <Link href="/post/edit" className="btn btn-ghost min-h-12">
            Edit services
          </Link>
        ) : bookable ? (
          <Link
            href={`/checkout/${s.id}`}
            data-track="book_click"
            data-track-creator={creatorId}
            data-track-service={String(s.id)}
            className="btn min-h-12 text-base"
            style={button}
          >
            Continue · {money(s.price_cents)}
          </Link>
        ) : (
          <button type="button" disabled className="btn min-h-12" title={takingBookings ? "This creator hasn't finished payout setup yet" : "Fully booked right now"}>
            {takingBookings ? "Booking opens soon" : "Fully booked"}
          </button>
        )}
        {!isOwner && (
          <Link href={`/messages/new?to=${handle}`} data-track="profile_message_click" data-track-creator={creatorId} className="btn btn-ghost min-h-11 text-sm">
            Message {creatorName.split(" ")[0]}
          </Link>
        )}
      </div>
    </div>
  );
}

const ic = "size-[18px] flex-none text-ink-2";
function Clock() {
  return (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function Loop() {
  return (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />
    </svg>
  );
}
function Shield() {
  return (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
