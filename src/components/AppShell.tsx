import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { ShootingStars } from "@/components/Backdrop";
import type { Profile } from "@/lib/auth";

/** Header and background for signed-in pages. Deep space mode is a saved per-user setting. */
export function AppShell({ profile, active, children }: { profile: Profile; active: "account" | "settings"; children: React.ReactNode }) {
  const tabs = [
    { href: "/settings/account", label: "Account", key: "account" },
    { href: "/settings", label: "Settings", key: "settings" },
  ] as const;
  return (
    <div className={profile.deep_space ? "deep-space" : ""}>
      <ShootingStars />
      <div className="relative z-[1] min-h-screen">
        <header className="app-header sticky top-0 z-20 border-b border-black/[.06] bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-4 px-4 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.03em]">
              <LogoMark size={28} />
              <span className="hidden sm:inline">Clouta</span>
            </Link>
            <nav aria-label="Account" className="ml-2 flex gap-1">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  aria-current={active === t.key ? "page" : undefined}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${active === t.key ? "bg-[#F3F0FF] text-violet-deep" : "text-body hover:text-ink"}`}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <div className="flex-1" />
            <span className="on-bg-muted hidden text-sm font-semibold text-body sm:inline">{profile.display_name}</span>
            <Avatar name={profile.display_name} source={profile.avatar_source} pattern={profile.avatar_pattern} url={profile.avatar_url} size={34} />
          </div>
        </header>
        <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
