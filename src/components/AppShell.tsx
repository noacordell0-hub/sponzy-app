import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { ShootingStars } from "@/components/Backdrop";
import { Icon, type IconName } from "@/components/Icons";
import AccountMenu from "@/components/AccountMenu";
import type { Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import WarningNotice from "@/components/WarningNotice";

type Tab = { href: string; label: string; short: string; key: string; icon: IconName };

/** Main destinations. Account, Settings and Admin live in the profile menu instead. */
function tabsFor(profile: Profile | null): Tab[] {
  const tabs: Tab[] = [{ href: "/browse", label: "Browse", short: "Browse", key: "browse", icon: "search" }];
  if (!profile) return tabs;
  if (profile.role === "creator") tabs.unshift({ href: "/dashboard", label: "Home", short: "Home", key: "home", icon: "grid" });
  if (profile.role === "creator") tabs.push({ href: "/post/edit", label: "My shop", short: "Shop", key: "shop", icon: "store" });
  if (profile.role === "brand") tabs.push({ href: "/brand", label: "Dashboard", short: "Home", key: "dashboard", icon: "grid" });
  tabs.push(
    { href: "/messages", label: "Messages", short: "Inbox", key: "messages", icon: "chat" },
    { href: "/orders", label: "Orders", short: "Orders", key: "orders", icon: "bag" },
  );
  if (profile.role === "creator") tabs.push({ href: "/earnings", label: "Earnings", short: "Earnings", key: "earnings", icon: "wallet" });
  return tabs;
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="grid min-w-[18px] place-items-center rounded-full bg-[#E5484D] px-1 text-[10px] font-bold leading-[18px] text-white" aria-label={`${count} unread`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Header, phone tab bar and background for app pages. Works for visitors (profile = null) and signed-in users. */
export async function AppShell({
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
  let unread = 0;
  let warning: { id: number; note: string | null; created_at: string } | null = null;
  if (profile) {
    const supabase = await createClient();
    const [{ data }, { data: warn }] = await Promise.all([
      supabase.rpc("unread_total"),
      supabase.from("moderation_actions").select("id, note, created_at").eq("profile_id", profile.id).eq("action", "warning").is("acknowledged_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    unread = Number(data) || 0;
    warning = warn;
  }
  const until = profile?.ban_until ? new Date(profile.ban_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
  const width = wide ? "max-w-[1200px]" : "max-w-[1100px]";
  const menuItems: { href: string; label: string; icon: IconName }[] = [
    { href: "/settings/account", label: "Account and profile", icon: "user" },
    { href: "/settings", label: "Settings", icon: "settings" },
    ...(profile?.is_admin ? [{ href: "/admin", label: "Admin", icon: "shield" as IconName }] : []),
  ];

  return (
    <div className={profile?.deep_space ? "deep-space" : ""}>
      <ShootingStars />
      <div className="relative z-[1] min-h-screen">
        <div className="hero-bg !h-[520px]" aria-hidden="true" />
        <header className="app-header sticky top-0 z-20 border-b border-black/[.12] bg-[#f7f4ee]/85 backdrop-blur-md">
          <div className={`mx-auto flex h-16 ${width} items-center gap-2 px-4 sm:px-8`}>
            <Link href={profile ? "/home" : "/"} className="mr-2 flex flex-none items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.03em]" aria-label={profile ? "Clouta, go to your home page" : "Clouta home"}>
              <LogoMark size={28} />
              <span>Clouta</span>
            </Link>
            <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
              {tabs.map((t) => {
                const on = active === t.key;
                return (
                  <Link
                    key={t.key}
                    href={t.href}
                    aria-current={on ? "page" : undefined}
                    className={`relative flex h-16 items-center gap-2 px-3 text-sm font-semibold transition-colors ${on ? "text-ink" : "text-ink-2 hover:text-ink"}`}
                  >
                    <Icon name={t.icon} size={18} />
                    {t.label}
                    {t.key === "messages" && <Badge count={unread} />}
                    {on && <span className="absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-violet-deep" aria-hidden="true" />}
                  </Link>
                );
              })}
            </nav>
            <div className="flex-1" />
            {profile ? (
              <AccountMenu
                name={profile.display_name ?? "Your account"}
                subtitle={profile.role === "brand" ? "Brand" : "Creator"}
                profileHref={profile.role === "brand" ? `/b/${profile.handle}` : `/c/${profile.handle}`}
                items={menuItems}
              >
                <Avatar name={profile.display_name} source={profile.avatar_source} pattern={profile.avatar_pattern} url={profile.avatar_url} size={34} />
              </AccountMenu>
            ) : (
              <div className="flex flex-none items-center gap-1">
                <Link href="/login" className="px-3 py-2.5 text-sm font-semibold text-body hover:text-ink">
                  Log in
                </Link>
                <Link href="/#join" className="btn min-h-10 px-4 text-sm">
                  Join the waitlist
                </Link>
              </div>
            )}
          </div>
        </header>

        <main className={`app-main page-in relative mx-auto ${width} px-4 pb-28 pt-8 sm:px-8 md:pb-12 md:pt-10`}>
          {profile?.banned_at && (
            <div role="alert" className="mb-6 rounded-2xl border border-[#F2B8C6] bg-[#FFF5F7] px-5 py-4 text-sm text-[#7A1236]">
              <b>{until ? `Your account is suspended until ${until}.` : "Your account has been removed from Clouta."}</b>{" "}
              Your profile is hidden and you can&apos;t message, book or sell{until ? " until then" : ""}. Any active orders were refunded. If you think this is a mistake, contact the Clouta team.
            </div>
          )}
          {warning && !profile?.banned_at && <WarningNotice id={warning.id} note={warning.note} />}
          {children}
        </main>

        {/* Phone tab bar */}
        {profile && (
          <nav aria-label="Main" className="app-header fixed inset-x-0 bottom-0 z-20 border-t border-black/[.12] bg-[#f7f4ee]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
            <ul className="mx-auto flex max-w-md">
              {tabs.map((t) => {
                const on = active === t.key;
                return (
                  <li key={t.key} className="flex-1">
                    <Link href={t.href} aria-current={on ? "page" : undefined} className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? "text-violet-deep" : "text-ink-2"}`}>
                      <span className="relative">
                        <Icon name={t.icon} size={22} />
                        {t.key === "messages" && unread > 0 && (
                          <span className="absolute -right-2 -top-1">
                            <Badge count={unread} />
                          </span>
                        )}
                      </span>
                      {t.short}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
