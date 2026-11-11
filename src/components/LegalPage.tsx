import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/site";

export function ContactLink() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-violet-deep underline underline-offset-2">
      {CONTACT_EMAIL}
    </a>
  ) : (
    <span className="font-semibold">the contact email we will post on this page shortly</span>
  );
}

/** Shared shell for the Privacy and Terms pages. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="relative z-[1] min-h-screen bg-[#fbfaff]">
      <header className="border-b border-black/[.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[820px] items-center gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.03em]">
            <LogoMark size={28} />
            Clouta
          </Link>
          <div className="flex-1" />
          <Link href="/" className="py-3 text-sm font-semibold text-body hover:text-ink">
            ← Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[820px] px-4 py-14 sm:px-8 sm:py-20">
        <h1 className="text-[clamp(32px,5vw,44px)] font-extrabold tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 text-sm text-ink-2">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 text-[17px] leading-relaxed text-body">{intro}</p>
        <div className="legal mt-10">{children}</div>
      </main>
    </div>
  );
}
