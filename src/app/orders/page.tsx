import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { money } from "@/lib/format";
import { ACTIVE_STATUSES, STATUS_LABEL, STATUS_STYLE } from "@/lib/order-status";
import type { Order } from "@/lib/orders";

export const metadata: Metadata = { title: "Orders · Clouta" };

type Row = Order & { other: { display_name: string | null; handle: string | null; avatar_source: "auto" | "pattern" | "upload"; avatar_pattern: number; avatar_url: string | null } | null };

export default async function OrdersPage() {
  const { supabase, user, profile } = await requireProfile();
  const isBrand = profile.role === "brand";
  const { data } = await supabase
    .from("orders")
    .select(`*, other:${isBrand ? "creator_id" : "brand_id"}(display_name, handle, avatar_source, avatar_pattern, avatar_url)`)
    .or(`brand_id.eq.${user.id},creator_id.eq.${user.id}`)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = ((data as unknown as Row[]) ?? []).filter((o) => o.status !== "awaiting_payment" || isBrand);
  const active = rows.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const done = rows.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  const list = (items: Row[]) => (
    <ul className="divide-y divide-black/[.06]">
      {items.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-black/[.02]">
            <Avatar name={o.other?.display_name ?? "?"} source={o.other?.avatar_source ?? "pattern"} pattern={o.other?.avatar_pattern ?? 0} url={o.other?.avatar_url ?? null} size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {o.title} <span className="font-normal text-ink-2">· {o.other?.display_name ?? "Deleted account"}</span>
              </p>
              <p className="text-xs text-ink-2">
                #{o.id} · post by {new Date(o.post_by + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <p className="font-bold">{money(isBrand ? o.total_cents : o.price_cents - o.creator_fee_cents)}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <AppShell profile={profile} active="orders">
      <h1 className="on-bg mb-8 text-3xl font-extrabold tracking-[-0.03em]">Orders</h1>
      {rows.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-lg font-bold">No orders yet</p>
          <p className="max-w-md text-sm text-body">
            {isBrand ? "Book a creator from Browse, or check out an accepted offer in Messages." : "When a brand books one of your services, the order shows up here."}
          </p>
          <Link href={isBrand ? "/browse" : "/post/edit"} className="btn btn-ghost mt-2 min-h-11 px-5 text-sm">
            {isBrand ? "Find creators" : "Edit my shop"}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section className="panel overflow-hidden" aria-labelledby="act">
              <h2 id="act" className="eyebrow px-5 pt-5">
                Active
              </h2>
              {list(active)}
            </section>
          )}
          {done.length > 0 && (
            <section className="panel overflow-hidden" aria-labelledby="past">
              <h2 id="past" className="eyebrow px-5 pt-5">
                Completed and refunded
              </h2>
              {list(done)}
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
