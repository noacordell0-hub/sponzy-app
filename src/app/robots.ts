import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Search engines may crawl public pages; private, admin and API routes stay out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/settings", "/onboarding", "/messages", "/orders", "/checkout", "/earnings", "/post", "/brand", "/auth"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
