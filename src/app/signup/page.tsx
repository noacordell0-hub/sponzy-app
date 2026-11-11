import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import EmailLinkForm from "@/components/EmailLinkForm";

export const metadata: Metadata = { title: "Sign up · Clouta" };

export default function SignupPage() {
  return (
    <AuthShell>
      <span className="badge-violet inline-block rounded-full px-3 py-1 text-xs font-semibold">Private beta</span>
      <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.03em]">Create your Clouta account</h1>
      <p className="mt-1.5 text-[15px] text-body">
        Use the email you joined the waitlist with. You&apos;ll choose creator or brand next.
      </p>
      <div className="mt-6">
        <EmailLinkForm mode="signup" />
      </div>
      <p className="mt-4 text-center text-xs text-ink-2">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-6 border-t border-black/[.06] pt-5 text-center text-sm text-body">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-violet-deep">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
