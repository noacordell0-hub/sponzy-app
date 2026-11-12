import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { ShootingStars } from "@/components/Backdrop";
import type { Profile } from "@/lib/auth";

type Tab = { href: string; label: string; key: string };

function tabsFor(profile: Profile | null): Tab[] {
  const tabs: Tab[] = [{ href: "/browse", label: "Browse", key: "browse" }];
  if (!profile) return tabs;
  if (profile.role === "creator") tabs.push({ href: "/post/edit", label: "My shop", key: "shop" });
  if (profile.role === "brand") tabs.push({ href: "/brand", label: "Dashboard", key: "dashboard" });
  tabs.push({ href: "/settings/account", label: "Account", key: "account" }, { href: "/settings", label: "Settings", key: "settings" });
  if (profile.is_admin) tabs.push({ href: "/admin/verifications", label: "Admin", key: "admin" });
  return tabs;
}

/** Header and background for app pages. Works for visitors (profile = null) and signed-in users. */
export function AppShell({
  profile,
  active,
  children,
  wide = false,
}: {
  profile: Profile | null;
  active: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const tabs = tabsFor(profile);
  const width = wide ? "max-w-[1200px]" : "max-w-[1100px]";
  return (
    <div className={profile?.deep_space ? "deep-space" : ""}>
      <ShootingStars />
      <div className="relative z-[1] min-h-screen">
        <header className="app-header sticky top-0 z-20 border-b border-black/[.06] bg-white/80 backdrop-blur-md">
          <div className={`mx-auto flex h-16 ${width} items-center gap-3 px-4 sm:px-8`}>
            <Link href="/" className="flex flex-none items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.03em]">
              <LogoMark size={28} />
              <span className="hidden sm:inline">Clouta</span>
            </Link>
            <nav aria-label="Main" className="no-scrollbar ml-1 flex min-w-0 gap-1 overflow-x-auto">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  aria-current={active === t.key ? "page" : undefined}
                  className={`flex-none rounded-lg px-3 py-2.5 text-sm font-semibold ${active === t.key ? "bg-[#F3F0FF] text-violet-deep" : "text-body hover:text-ink"}`}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <div className="flex-1" />
            {profile ? (
              <Link
                href={profile.role === "brand" ? `/b/${profile.handle}` : `/c/${profile.handle}`}
                className="flex flex-none items-center gap-2"
                aria-label="View your public profile"
              >
                <span className="on-bg-muted hidden text-sm font-semibold text-body md:inline">{profile.display_name}</span>
                <Avatar name={profile.display_name} source={profile.avatar_source} pattern={profile.avatar_pattern} url={profile.avatar_url} size={34} />
              </Link>
            ) : (
              <div className="flex flex-none items-center gap-1">
                <Link href="/login" className="px-2 py-2.5 text-sm font-semibold text-body hover:text-ink">
                  Log in
                </Link>
                <Link href="/#join" className="btn min-h-10 px-3 text-sm">
                  Join
                </Link>
              </div>
            )}
          </div>
        </header>
        <main className={`mx-auto ${width} px-4 py-10 sm:px-8`}>{children}</main>
      </div>
    </div>
  );
}
