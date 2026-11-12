"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
/**
 * Landing page header buttons: "Log in" for visitors, "Open Clouta" for people already signed in.
 * Checks for Supabase's login cookie instead of loading the Supabase library, which keeps
 * about 75 KB of JavaScript off the landing page. (If the cookie is stale, /browse still works for visitors.)
 */
export default function LandingAuthLinks() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setSignedIn(/(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/.test(document.cookie));
  }, []);

  if (signedIn) {
    return (
      <Link href="/browse" data-track="cta_click" data-track-location="nav" data-track-target="open_app" className="btn min-h-10 px-4 text-sm">
        Open Clouta
      </Link>
    );
  }
  return (
    <>
      <Link href="/login" data-track="nav_click" data-track-target="login" className="px-2 py-3 text-[15px] font-semibold text-body hover:text-ink">
        Log in
      </Link>
      <a href="#join" data-track="cta_click" data-track-location="nav" className="btn min-h-10 px-4 text-sm">
        Join the waitlist
      </a>
    </>
  );
}
