"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Landing page header buttons: "Log in" for visitors, "Open Clouta" for people already signed in. */
export default function LandingAuthLinks() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Reads the saved session locally; no network request needed.
    createClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
      .catch(() => setSignedIn(false));
  }, []);

  if (signedIn) {
    return (
      <Link href="/browse" className="btn min-h-10 px-4 text-sm">
        Open Clouta
      </Link>
    );
  }
  return (
    <>
      <Link href="/login" className="px-2 py-3 text-[15px] font-semibold text-body hover:text-ink">
        Log in
      </Link>
      <a href="#join" className="btn min-h-10 px-4 text-sm">
        Join the waitlist
      </a>
    </>
  );
}
