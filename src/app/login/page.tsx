import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import EmailLinkForm from "@/components/EmailLinkForm";

export const metadata: Metadata = { title: "Log in · Clouta" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Welcome back</h1>
      <p className="mt-1.5 text-[15px] text-body">Log in to your Clouta account.</p>
      {error === "link" && (
        <p role="alert" className="mt-5 rounded-[12px] bg-err-bg px-4 py-3 text-sm font-semibold text-err">
          That login link has expired or was opened in a different browser. Request a new one below.
        </p>
      )}
      <div className="mt-6">
        <EmailLinkForm mode="login" next={next} />
      </div>
      <p className="mt-6 border-t border-black/[.06] pt-5 text-center text-sm text-body">
        New to Clouta?{" "}
        <Link href="/signup" className="font-semibold text-violet-deep">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
