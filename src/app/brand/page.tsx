import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { CreatorCard } from "@/components/CreatorCard";
import type { CreatorResult } from "@/lib/market";
import { ActionList, Checklist, Stat, type ChecklistItem } from "@/components/DashboardBits";
import { TrustPanel } from "@/components/TrustPanel";
import { loadTrust } from "@/lib/review-data";
import { money } from "@/lib/format";
import type { Order } from "@/lib/orders";

export const metadata: Metadata = { title: "Brand dashboard · Clouta" };

export default async function BrandDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  if (profile.role !== "brand") redirect("/post/edit");

  const { data: savedRows } = await supabase
    .from("saved_creators")
    .select("creator_id, created_at, profiles:creator_id(handle, display_name, avatar_source, avatar_pattern, avatar_url)")
    .eq("brand_id", user.id)
    .order("created_at", { ascending: false });
  type SavedRow = { creator_id: string; profiles: { handle: string; display_name: string; avatar_source: "auto" | "pattern" | "upload"; avatar_pattern: number; avatar_url: string | null } | null };
  const saved = ((savedRows as unknown as SavedRow[]) ?? []).filter((r) => r.profiles);

  // Recommendations: creators in the brand's niches first, then everyone.
  let recs: CreatorResult[] = [];
  for (const niche of profile.niches.slice(0, 3)) {
    const { data } = await supabase.rpc("search_creators", { p_niche: niche, p_limit: 6 });
    recs.push(...(((data as CreatorResult[]) ?? []).filter((c) => !recs.some((r) => r.id === c.id))));
  }
  if (recs.length < 3) {
    const { data } = await supabase.rpc("search_creators", { p_limit: 6 });
    recs.push(...(((data as CreatorResult[]) ?? []).filter((c) => !recs.some((r) => r.id === c.id))));
  }
  recs = recs.slice(0, 3);
  const savedIds = new Set(saved.map((s) => s.creator_id));

  // Real numbers from this brand's orders.
  const [{ data: ordersData }, { trust }, { count: threadCount }, { data: unreadData }] = await Promise.all([
    supabase.from("orders").select("*").eq("brand_id", user.id).order("created_at", { ascending: false }).limit(300),
    loadTrust(supabase, user.id),
    supabase.from("threads").select("id", { count: "exact", head: true }),
    supabase.rpc("unread_total"),
  ]);
  const orders = (ordersData as Order[]) ?? [];
  const ACTIVE = ["funded", "in_progress", "proof_submitted", "revision_requested", "disputed"];
  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => ["approved", "paid"].includes(o.status));
  const spentOn = (o: Order) => (o.funded_at && o.status !== "refunded" ? o.total_cents - (o.refunded_cents ?? 0) : 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();
  const spentThisMonth = orders.filter((o) => o.funded_at && new Date(o.funded_at).getTime() >= monthStart).reduce((a, o) => a + spentOn(o), 0);
  const spentLastMonth = orders.filter((o) => o.funded_at && new Date(o.funded_at).getTime() >= lastMonthStart && new Date(o.funded_at).getTime() < monthStart).reduce((a, o) => a + spentOn(o), 0);
  const spentTotal = orders.reduce((a, o) => a + spentOn(o), 0);
  const creatorsHired = new Set(done.map((o) => o.creator_id)).size;
  const onTime = done.filter((o) => o.submitted_at && o.submitted_at.slice(0, 10) <= o.post_by).length;
  const unread = Number(unreadData) || 0;
  const fmt = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const actions = [
    ...orders.filter((o) => o.status === "disputed").map((o) => ({ href: `/orders/${o.id}`, title: `Dispute open: ${o.title}`, detail: "Check the latest and add anything the team should know.", urgent: true })),
    ...orders.filter((o) => o.status === "proof_submitted").map((o) => ({ href: `/orders/${o.id}`, title: `Review the post: ${o.title}`, detail: o.auto_approve_at ? `Approve or ask for a revision by ${fmt(o.auto_approve_at)}, or it's approved automatically.` : "Approve it or ask for a revision.", urgent: true })),
    ...orders.filter((o) => o.status === "awaiting_payment").map((o) => ({ href: `/orders/${o.id}`, title: `Finish paying: ${o.title}`, detail: "Your checkout is still open. Nothing has been charged.", urgent: false })),
    ...(unread > 0 ? [{ href: "/messages", title: `${unread} unread message${unread === 1 ? "" : "s"}`, detail: "Creators reply faster when you do.", urgent: false }] : []),
  ];
  const upcoming = active.filter((o) => ["funded", "in_progress", "revision_requested"].includes(o.status)).sort((a, b) => a.post_by.localeCompare(b.post_by)).slice(0, 5);

  const checklist: ChecklistItem[] = [
    { done: profile.avatar_source === "upload" || Boolean(profile.website), title: "Add your logo and website", why: "Creators accept offers from brands they recognise.", href: "/settings/account", cta: "Edit profile" },
    { done: profile.niches.length > 0, title: "Pick the niches you work in", why: "We use them to recommend the right creators.", href: "/settings/account", cta: "Choose niches" },
    { done: saved.length > 0, title: "Save a creator you like", why: "Tap the heart on any creator to keep a shortlist.", href: "/browse", cta: "Browse" },
    { done: (threadCount ?? 0) > 0, title: "Message a creator", why: "Ask about ideas, dates or a custom offer.", href: "/browse", cta: "Find someone" },
    { done: orders.some((o) => o.funded_at), title: "Book your first collab", why: "You pay up front and the money is held until you approve the post.", href: "/browse", cta: "Book" },
  ];
  return (
    <AppShell profile={profile} active="dashboard">
      {welcome && (
        <div role="status" className="chip-pop mb-6 rounded-2xl border border-black/[.06] bg-ok-bg px-5 py-4 text-ok">
          <p className="font-bold">Welcome to Clouta, {profile.display_name}!</p>
          <p className="text-sm">Follow the steps below: find creators you like, message them, and book your first collab.</p>
        </div>
      )}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Avatar name={profile.display_name} source={profile.avatar_source} pattern={profile.avatar_pattern} url={profile.avatar_url} size={52} rounded={16} />
        <div className="flex-1">
          <h1 className="on-bg text-3xl font-extrabold tracking-[-0.03em]">{profile.display_name}</h1>
          <p className="on-bg-muted text-sm text-body">Brand dashboard</p>
        </div>
        <Link href="/browse" className="btn min-h-12 px-6 text-base">
          Find creators
        </Link>
      </div>

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <Checklist items={checklist} />
        <ActionList items={actions} empty="Nothing waiting on you. New deliveries to review will show up here." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Spent this month" value={spentThisMonth} prev={spentLastMonth} format={(n) => money(n)} note={`${money(spentTotal)} in total`} />
        <Stat label="Active orders" value={active.length} note={upcoming[0] ? `Next post due ${fmt(upcoming[0].post_by)}` : "In progress right now"} />
        <Stat label="Completed collabs" value={done.length} note={done.length ? `${Math.round((onTime / done.length) * 100)}% posted on time` : "Approved and paid"} />
        <Stat label="Creators hired" value={creatorsHired} note={`${saved.length} saved for later`} />
      </div>

      {upcoming.length > 0 && (
        <section className="panel mt-6 p-6" aria-labelledby="upcoming-t">
          <h2 id="upcoming-t" className="eyebrow">Coming up</h2>
          <ul className="mt-3 divide-y divide-black/[.06]">
            {upcoming.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-3 py-3 text-sm hover:text-violet-deep">
                  <span className="tabular w-16 flex-none font-bold">{fmt(o.post_by)}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{o.title}</span>
                  <span className="text-xs text-ink-2">{o.status === "funded" ? "Not started" : o.status === "revision_requested" ? "Revising" : "In progress"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="recs-title">
          <h2 id="recs-title" className="eyebrow on-bg-muted mb-3">
            Recommended for you
          </h2>
          {recs.length === 0 ? (
            <div className="panel p-6 text-sm text-body">Creators are setting up their shops during the beta. Check back soon, or add niches to your profile for better matches.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recs.map((c) => (
                <CreatorCard key={c.id} c={c} saved={savedIds.has(c.id)} viewerId={user.id} />
              ))}
            </div>
          )}
        </section>
        <div className="flex flex-col gap-6">
          <section className="panel p-6" aria-labelledby="saved-title">
            <h2 id="saved-title" className="eyebrow">
              Saved creators
            </h2>
            {saved.length === 0 ? (
              <p className="mt-3 text-sm text-body">Tap the heart on any creator to save them here.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {saved.map((s) => (
                  <li key={s.creator_id}>
                    <Link href={`/c/${s.profiles!.handle}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-black/[.03]">
                      <Avatar name={s.profiles!.display_name} source={s.profiles!.avatar_source} pattern={s.profiles!.avatar_pattern} url={s.profiles!.avatar_url} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{s.profiles!.display_name}</span>
                        <span className="block text-xs text-ink-2">@{s.profiles!.handle}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <TrustPanel trust={trust} role="brand" reviewsHref={`/b/${profile.handle}/reviews`} />
        </div>
      </div>
    </AppShell>
  );
}
