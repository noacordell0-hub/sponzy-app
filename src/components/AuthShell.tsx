import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { ShootingStars } from "@/components/Backdrop";

/** Centered card layout for login, sign-up and onboarding. */
export function AuthShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <ShootingStars />
      <div className="relative z-[1] flex min-h-screen flex-col">
        <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.03em]">
            <LogoMark size={28} />
            Clouta
          </Link>
        </header>
        <main className="auth-main flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
          <div className={`panel w-full ${wide ? "max-w-[560px]" : "max-w-[440px]"} p-6 sm:p-9`}>{children}</div>
        </main>
      </div>
    </>
  );
}
