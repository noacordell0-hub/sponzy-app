import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Overview", key: "overview" },
  { href: "/admin/metrics", label: "Metrics", key: "metrics" },
  { href: "/admin/reports", label: "Reports", key: "reports" },
  { href: "/admin/disputes", label: "Disputes", key: "disputes" },
  { href: "/admin/verifications", label: "Verifications", key: "verifications" },
] as const;

/** Header and tabs for the team-only admin panel. */
export function AdminHeader({ title, active }: { title: string; active: (typeof TABS)[number]["key"] | string }) {
  return (
    <div className="mb-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="on-bg text-3xl font-extrabold tracking-[-0.03em]">{title}</h1>
        <span className="rounded-full bg-err-bg px-3 py-1 text-xs font-semibold text-err">Team only</span>
      </div>
      <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} aria-current={active === t.key ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${active === t.key ? "bg-violet-deep text-white" : "bg-white text-body shadow-sm hover:text-ink"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
