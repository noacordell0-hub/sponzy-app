import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AppShell } from "@/components/AppShell";
import { REPORT_REASONS } from "@/lib/safety-labels";
import { AdminHeader } from "../AdminNav";
import ModerationPanel from "./ModerationPanel";

export const metadata: Metadata = { title: "Reports · Clouta Admin", robots: { index: false } };

type Report = { id: number; reporter_id: string | null; target_type: string; target_id: string; target_profile_id: string; reason: string; details: string | null; screenshot_url: string | null; created_at: string };

export default async function AdminReports() {
  const { profile } = await requireProfile();
  if (!profile.is_admin) notFound();
  const admin = getSupabaseAdmin();
  if (!admin) notFound();

  const { data: open } = await admin.from("reports").select("*").eq("status", "open").order("created_at").limit(300);
  const reports = (open as Report[]) ?? [];
  const targetIds = [...new Set(reports.map((r) => r.target_profile_id))];
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))] as string[];
  const reviewIds = reports.filter((r) => r.target_type === "review").map((r) => Number(r.target_id));
  const messageIds = reports.filter((r) => r.target_type === "message").map((r) => Number(r.target_id));
  const commentIds = reports.filter((r) => r.target_type === "comment").map((r) => Number(r.target_id));
  const [{ data: people }, { data: reviews }, { data: msgs }, { data: comments }, { data: history }, { data: removed }] = await Promise.all([
    admin.from("profiles").select("id, display_name, handle, role, banned_at, ban_until, browse_hidden_at").in("id", [...targetIds, ...reporterIds]),
    reviewIds.length ? admin.from("reviews").select("id, body, overall, hidden_at").in("id", reviewIds) : Promise.resolve({ data: [] }),
    messageIds.length ? admin.from("messages").select("id, body").in("id", messageIds) : Promise.resolve({ data: [] }),
    commentIds.length ? admin.from("comments").select("id, body, hidden_at").in("id", commentIds) : Promise.resolve({ data: [] }),
    targetIds.length ? admin.from("moderation_actions").select("profile_id, action, note, until, created_at").in("profile_id", targetIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    admin.from("profiles").select("id, display_name, handle, role, ban_until, banned_at").not("banned_at", "is", null).order("banned_at", { ascending: false }).limit(50),
  ]);
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  const content = new Map<string, { text: string; hidden: boolean }>();
  for (const r of reviews ?? []) content.set(`review:${r.id}`, { text: `${r.overall}★ ${r.body ?? ""}`, hidden: Boolean(r.hidden_at) });
  for (const m of msgs ?? []) content.set(`message:${m.id}`, { text: m.body ?? "", hidden: false });
  for (const c of comments ?? []) content.set(`comment:${c.id}`, { text: c.body ?? "", hidden: Boolean(c.hidden_at) });

  // One card per reported account: auto-flagged first, then most reports.
  const groups = targetIds
    .map((id) => ({ id, p: person.get(id), list: reports.filter((r) => r.target_profile_id === id), reporters: new Set(reports.filter((r) => r.target_profile_id === id).map((r) => r.reporter_id)).size }))
    .sort((a, b) => Number(Boolean(b.p?.browse_hidden_at)) - Number(Boolean(a.p?.browse_hidden_at)) || b.reporters - a.reporters);

  return (
    <AppShell profile={profile} active="admin" wide>
      <AdminHeader title="Reports" active="reports" />
      {groups.length === 0 && <p className="panel p-6 text-sm text-body">No open reports. 🎉</p>}
      <div className="flex flex-col gap-6">
        {groups.map((g) => {
          const p = g.p;
          const href = p ? (p.role === "brand" ? `/b/${p.handle}` : `/c/${p.handle}`) : "#";
          const past = (history ?? []).filter((h) => h.profile_id === g.id);
          return (
            <section key={g.id} className={`panel grid gap-5 p-6 lg:grid-cols-[1fr_320px] ${p?.browse_hidden_at ? "border-err/40" : ""}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={href} className="text-lg font-bold hover:text-violet-deep">{p?.display_name ?? "Unknown"}</Link>
                  <span className="text-sm text-ink-2">@{p?.handle} · {p?.role}</span>
                  <span className="rounded-full bg-black/[.05] px-2 py-0.5 text-xs font-semibold">{g.list.length} report{g.list.length > 1 ? "s" : ""} from {g.reporters} {g.reporters > 1 ? "people" : "person"}</span>
                  {p?.browse_hidden_at && <span className="rounded-full bg-err-bg px-2 py-0.5 text-xs font-semibold text-err">Auto-hidden from Browse</span>}
                  {p?.banned_at && <span className="rounded-full bg-err-bg px-2 py-0.5 text-xs font-semibold text-err">{p.ban_until ? "Suspended" : "Banned"}</span>}
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  {g.list.map((r) => {
                    const c = content.get(`${r.target_type}:${r.target_id}`);
                    return (
                      <li key={r.id} className="rounded-xl bg-black/[.03] p-3 text-sm">
                        <p className="font-semibold">{REPORT_REASONS[r.reason] ?? r.reason} <span className="font-normal text-ink-2">· {r.target_type} · by {r.reporter_id ? (person.get(r.reporter_id)?.display_name ?? "someone") : "Clouta (automatic)"} · {new Date(r.created_at).toLocaleDateString()}</span></p>
                        {r.details && <p className="mt-1 whitespace-pre-line text-body">{r.details}</p>}
                        {r.screenshot_url && <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 block break-all text-xs font-semibold text-violet-deep underline">Screenshot ↗</a>}
                        {c && <p className="mt-2 rounded-lg border border-black/[.06] bg-white px-3 py-2 text-body">&ldquo;{c.text.slice(0, 400)}&rdquo;{c.hidden && <span className="ml-2 text-xs font-semibold text-err">(hidden)</span>}</p>}
                      </li>
                    );
                  })}
                </ul>
                {past.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-bold text-ink-2">History</p>
                    <ul className="mt-1 text-xs text-body">
                      {past.map((h, i) => <li key={i}>{new Date(h.created_at).toLocaleDateString()} · {h.action}{h.until ? ` until ${new Date(h.until).toLocaleDateString()}` : ""}{h.note ? `: ${h.note}` : ""}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <ModerationPanel
                profileId={g.id}
                name={p?.display_name ?? "this account"}
                reportIds={g.list.map((r) => r.id)}
                flagged={Boolean(p?.browse_hidden_at)}
                banned={Boolean(p?.banned_at)}
                reviewIds={g.list.filter((r) => r.target_type === "review").map((r) => Number(r.target_id))}
                commentIds={g.list.filter((r) => r.target_type === "comment").map((r) => Number(r.target_id))}
                warnings={past.filter((h) => h.action === "warning").length}
              />
            </section>
          );
        })}
      </div>

      {(removed ?? []).length > 0 && (
        <section className="panel mt-8 p-6">
          <h2 className="eyebrow">Suspended and banned accounts</h2>
          <ul className="mt-3 divide-y divide-black/[.06]">
            {(removed ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="flex-1 font-semibold">{p.display_name} <span className="font-normal text-ink-2">@{p.handle} · {p.ban_until ? `suspended until ${new Date(p.ban_until).toLocaleDateString()}` : "banned"}</span></span>
                <ModerationPanel profileId={p.id} name={p.display_name ?? "this account"} reportIds={[]} flagged={false} banned reviewIds={[]} commentIds={[]} warnings={0} compact />
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
