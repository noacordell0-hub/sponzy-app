import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { HeroPlanets, ShootingStars } from "@/components/Backdrop";

/** Full-page message (not found, errors) on the same paper, grid and starfield as the landing page. */
export function SpacePage({ code, title, children, actions }: { code: string; title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <ShootingStars />
      <HeroPlanets />
      <div className="hero-bg" aria-hidden="true" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center px-5 py-5">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.03em]" aria-label="Clouta home">
          <LogoMark size={28} />
          Clouta
        </Link>
      </header>
      <main className="relative z-10 mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 pb-16 text-center">
        <p className="rise tabular font-display text-[7rem] leading-none text-[#5B3DF5] opacity-90 sm:text-[9rem]" aria-hidden="true">
          {code}
        </p>
        <h1 className="rise rise-2 font-display mt-2 text-4xl sm:text-5xl">{title}</h1>
        <div className="rise rise-2 mt-4 max-w-md text-[17px] text-body">{children}</div>
        <div className="rise rise-2 mt-8 flex flex-wrap justify-center gap-3">
          {actions ?? (
            <>
              <Link href="/" className="btn min-h-11 px-5">Go to the homepage</Link>
              <Link href="/browse" className="btn btn-ghost min-h-11 px-5">Browse creators</Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
