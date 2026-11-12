"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";

type Item = { href: string; label: string; icon: IconName };

/** Profile picture button that opens a menu: public profile, account, settings, admin and sign out. */
export default function AccountMenu({
  name,
  subtitle,
  profileHref,
  items,
  children,
}: {
  name: string;
  subtitle: string;
  profileHref: string;
  items: Item[];
  children: React.ReactNode; // the avatar
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-black/[.04]"
      >
        {children}
        <span className="on-bg-muted text-ink-2">
          <Icon name="chevron" size={16} />
        </span>
      </button>
      {open && (
        <div role="menu" className="menu-pop absolute right-0 top-[calc(100%+8px)] z-30 w-64 overflow-hidden rounded-2xl border border-black/[.08] bg-white py-2 shadow-[0_18px_50px_rgba(21,19,31,.16)]">
          <Link href={profileHref} role="menuitem" className="block border-b border-black/[.06] px-4 pb-3 pt-1.5 hover:bg-black/[.02]">
            <span className="block truncate font-bold text-ink">{name}</span>
            <span className="block text-xs text-ink-2">{subtitle} · View public profile</span>
          </Link>
          <div className="py-1">
            {items.map((it) => (
              <Link key={it.href} href={it.href} role="menuitem" className="flex min-h-11 items-center gap-3 px-4 text-sm font-semibold text-body hover:bg-[#F7F5FF] hover:text-ink">
                <Icon name={it.icon} size={18} />
                {it.label}
              </Link>
            ))}
          </div>
          <form action="/auth/signout" method="post" className="border-t border-black/[.06] pt-1">
            <button type="submit" role="menuitem" className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-semibold text-err hover:bg-err-bg">
              <Icon name="logout" size={18} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
