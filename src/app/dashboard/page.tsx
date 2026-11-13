import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AppShell } from "@/components/AppShell";
import { ActionList, Checklist, DailyBars, Stat, dayKeys, dayOf, type ChecklistItem } from "@/components/DashboardBits";
import { TrustPanel } from "@/components/TrustPanel";
import { loadTrust } from "@/lib/review-data";
import { money } from "@/lib/format";
import type { Order } from "@/lib/orders";
import type { Post, Service } from "@/lib/market";
import ShareShop from "./ShareShop";

export const metadata: Metadata = { title: "Home · Clouta" };
export const dynamic = "force-dynamic";

const DAYS = 30;
type Ev = { name: string; visitor_id: string | null; created_at: string; utm_source: string | null; props: Record<string, string> };

/** Creator home: what to do next, what needs attention, and how the shop is doing. */
export default async function CreatorHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  if (profile.role !== "creator") redirect("/brand");

  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - 2 * DAYS * 864e5).toISOString();
  const [{ data: post }, { data: socials }, { data: priv }, { data: ordersData }, { data: unreadData }, { trust }, evRes] = await Promise.all([
    supabase.from("posts").select("*").eq("creator_id", user.id).maybeSingle<Post>(),
    supabase.from("social_accounts").select("verified").eq("profile_id", user.id),
    supabase.from("profile_private").select("payouts_enabled").eq("id", user.id).single(),
    supabase.from("orders").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }).limit(200),
    supabase.rpc("unread_total"),
    loadTrust(supabase, user.id),
    // Shop stats are stored privately; read them with the server key, filtered to this creator only.
    admin
      ? admin.from("analytics_events").select("name, visitor_id, created_at, utm_source, props").eq("props->>creator", user.id).gte("created_at", since).limit(20000)
      : Promise.resolve({ data: [] as Ev[] }),
  ]);
  const { data: servicesData } = post ? await supabase.from("services").select("*").eq("post_id", post.id).order("position") : { data: [] as Service[] };
  const services = (servicesData as Service[]) ?? [];
  const orders = (ordersData as Order[]) ?? [];
  const events = ((evRes as { data: Ev[] | null }).data ?? []) as Ev[];
  const unread = Number(unreadData) || 0;

  // ---- Checklist ----
  const shopViewsEver = events.filter((e) => e.name === "profile_view").length;
  const checklist: ChecklistItem[] = [
    { done: profile.avatar_source === "upload" || Boolean(profile.bio?.trim()), title: "Add a photo and a short bio", why: "Brands book people they can picture.", href: "/settings/account", cta: "Edit profile" },
    { done: (socials ?? []).length > 0, title: "Add your social accounts", why: "Brands want to see where you post and how many people follow you.", href: "/settings/account", cta: "Add socials" },
    { done: (socials ?? []).some((s) => s.verified), title: "Verify a social account", why: "A ✓ next to your followers makes brands trust the numbers.", href: "/settings/account", cta: "Verify" },
    { done: services.length > 0, title: "Add your first service and price", why: "For example: one TikTok video, $120, 5-day turnaround.", href: "/post/edit", cta: "Add a service" },
    { done: Boolean(post?.published), title: "Publish your shop", why: "Until then, brands can't find you in Browse.", href: "/post/edit", cta: "Publish" },
    { done: Boolean(priv?.payouts_enabled), title: "Set up payouts", why: "Brands can only book you once Stripe can pay you.", href: "/earnings", cta: "Set up" },
    { done: shopViewsEver > 0, title: "Share your shop link", why: "Put it in your bio so brands can find your prices.", href: `/c/${profile.handle}`, cta: "View shop" },
  ];

  // ---- Needs attention ----
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const actions = [
    ...orders.filter((o) => o.status === "disputed").map((o) => ({ href: `/orders/${o.id}`, title: `Dispute open: ${o.title}`, detail: "Add your side so the Clouta team can decide.", urgent: true })),
    ...orders.filter((o) => o.status === "revision_requested").map((o) => ({ href: `/orders/${o.id}`, title: `Revision requested: ${o.title}`, detail: o.revision_note ? `"${o.revision_note.slice(0, 80)}"` : "Update the post and resubmit your link.", urgent: true })),
    ...orders.filter((o) => o.status === "funded").map((o) => ({ href: `/orders/${o.id}`, title: `New order: ${o.title}`, detail: `${money(o.price_cents - o.creator_fee_cents)} for you · post by ${fmt(o.post_by)}`, urgent: false })),
    ...orders.filter((o) => o.status === "in_progress" && o.post_by <= soon).map((o) => ({ href: `/orders/${o.id}/deliver`, title: `Due ${o.post_by < today ? "now (late)" : fmt(o.post_by)}: ${o.title}`, detail: "Post it, then submit the live link.", urgent: o.post_by < today })),
    ...orders.filter((o) => o.status === "approved").map((o) => ({ href: "/earnings", title: `Approved, waiting to pay you: ${o.title}`, detail: "Finish payout setup to receive it.", urgent: true })),
    ...(unread > 0 ? [{ href: "/messages", title: `${unread} unread message${unread === 1 ? "" : "s"}`, detail: "Quick replies help your trust score.", urgent: false }] : []),
  ];

  // ---- Shop stats (last 30 days vs the 30 before) ----
  const cutoff = Date.now() - DAYS * 864e5;
  const cur = events.filter((e) => new Date(e.created_at).getTime() >= cutoff);
  const prev = events.filter((e) => new Date(e.created_at).getTime() < cutoff);
  const uniq = (list: Ev[], name: string) => new Set(list.filter((e) => e.name === name).map((e) => e.visitor_id ?? e.created_at)).size;
  const count = (list: Ev[], name: string) => list.filter((e) => e.name === name).length;
  const inPeriod = (iso: string | null, from: number, to: number) => (iso ? new Date(iso).getTime() >= from && new Date(iso).getTime() < to : false);
  const ordersCur = orders.filter((o) => inPeriod(o.funded_at, cutoff, Date.now())).length;
  const ordersPrev = orders.filter((o) => inPeriod(o.funded_at, cutoff - DAYS * 864e5, cutoff)).length;
  const net = (o: Order) => o.payout_cents ?? o.price_cents - o.creator_fee_cents;
  const earnedCur = orders.filter((o) => o.status === "paid" && inPeriod(o.paid_at, cutoff, Date.now())).reduce((a, o) => a + net(o), 0);
  const earnedPrev = orders.filter((o) => o.status === "paid" && inPeriod(o.paid_at, cutoff - DAYS * 864e5, cutoff)).reduce((a, o) => a + net(o), 0);
  const visitors = uniq(cur, "profile_view");
  const conversion = visitors ? (ordersCur / visitors) * 100 : 0;

  const days = dayKeys(DAYS).map((d) => ({ d, n: cur.filter((e) => e.name === "profile_view" && dayOf(e.created_at) === d).length }));

  const sources = new Map<string, number>();
  for (const e of cur.filter((e) => e.name === "profile_view")) {
    const k = e.utm_source ?? "Direct or unknown";
    sources.set(k, (sources.get(k) ?? 0) + 1);
  }
  const topSources = [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const svcStats = services.map((s) => ({
    s,
    clicks: cur.filter((e) => e.name === "book_click" && e.props?.service === String(s.id)).length,
    orders: orders.filter((o) => o.service_id === s.id && o.funded_at).length,
  }));

  return (
    <AppShell profile={profile} active="home">
      {welcome && (
        <div role="status" className="chip-pop mb-6 rounded-2xl border border-black/[.08] bg-ok-bg px-5 py-4 text-ok">
          <p className="font-bold">Welcome to Clouta, {profile.display_name}!</p>
          <p className="text-sm">Follow the steps below to get your shop ready for brands.</p>
        </div>
      )}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="on-bg">Hi, {profile.display_name?.split(" ")[0] ?? "there"}</h1>
          <p className="on-bg-muted mt-1 text-[15px] text-body">Here&apos;s what needs doing and how your shop is going.</p>
        </div>
        <ShareShop handle={profile.handle ?? ""} published={Boolean(post?.published)} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Checklist items={checklist} />
          <ActionList items={actions} empty="You're all caught up. New orders and messages will show up here." />

          <section aria-labelledby="stats-t">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="stats-t" className="eyebrow on-bg-muted">Your shop, last {DAYS} days</h2>
              <span className="on-bg-muted text-xs text-ink-2">Compared with the {DAYS} days before</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Stat label="Shop views" value={count(cur, "profile_view")} prev={count(prev, "profile_view")} note="Times your shop page was opened" />
              <Stat label="Visitors" value={visitors} prev={uniq(prev, "profile_view")} note="Different people who looked" />
              <Stat label="Book clicks" value={count(cur, "book_click")} prev={count(prev, "book_click")} note="Brands who tapped Book on a service" />
              <Stat label="Message clicks" value={count(cur, "profile_message_click")} prev={count(prev, "profile_message_click")} note="Brands who tapped Message" />
              <Stat label="Orders" value={ordersCur} prev={ordersPrev} note={visitors ? `${conversion.toFixed(1)}% of visitors booked` : "Paid orders"} />
              <Stat label="Earned" value={earnedCur} prev={earnedPrev} format={(n) => money(n)} note="Paid out to you" />
            </div>
          </section>

          <section className="panel p-6" aria-labelledby="views-t">
            <h2 id="views-t" className="eyebrow">Shop views per day</h2>
            <p className="mt-1 text-xs text-ink-2">Hover a bar for the exact number. Your own visits aren&apos;t counted.</p>
            <div className="mt-4">
              <DailyBars days={days} label="Shop views per day" />
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="panel p-6" aria-labelledby="src-t">
              <h2 id="src-t" className="eyebrow">Where visitors came from</h2>
              {topSources.length === 0 ? (
                <p className="mt-2 text-sm text-body">No visits yet. Share your shop link in your bio to start seeing this.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {topSources.map(([k, n]) => (
                    <li key={k} className="flex items-center gap-3">
                      <span className="w-32 truncate font-semibold">{k}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/[.06]">
                        <span className="block h-full rounded-full bg-[#5B3DF5]" style={{ width: `${(n / topSources[0][1]) * 100}%` }} />
                      </span>
                      <span className="tabular w-8 text-right">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="panel p-6" aria-labelledby="svc-t">
              <h2 id="svc-t" className="eyebrow">How your services are doing</h2>
              {svcStats.length === 0 ? (
                <p className="mt-2 text-sm text-body">
                  No services yet. <Link href="/post/edit" className="font-semibold text-violet-deep">Add your first one</Link>.
                </p>
              ) : (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-2">
                      <th className="pb-2 font-semibold">Service</th>
                      <th className="pb-2 text-right font-semibold">Book clicks</th>
                      <th className="pb-2 text-right font-semibold">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[.06]">
                    {svcStats.map(({ s, clicks, orders: n }) => (
                      <tr key={s.id}>
                        <td className="py-2">
                          <span className="font-semibold">{s.name}</span> <span className="text-xs text-ink-2">{money(s.price_cents)}</span>
                        </td>
                        <td className="tabular py-2 text-right">{clicks}</td>
                        <td className="tabular py-2 text-right">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <TrustPanel trust={trust} role="creator" reviewsHref={`/c/${profile.handle}/reviews`} />
          <section className="panel p-6" aria-labelledby="tips-t">
            <h2 id="tips-t" className="eyebrow">Tips that help you get booked</h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-body">
              <li>Start with 2–3 services at different prices, like a story, a video and a bundle.</li>
              <li>Reply to messages within a day. It raises your trust score.</li>
              <li>Post on time. Ten on-time orders in a row earns the On-Time Pro badge.</li>
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
