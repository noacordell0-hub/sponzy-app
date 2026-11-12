import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Intro } from "@/components/Intro";
import NavProgress from "@/components/NavProgress";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AnalyticsProvider from "@/components/AnalyticsProvider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const DESCRIPTION =
  "Creators list their collab prices in one shop-window post. Brands pay up front, and Clouta holds the money until the work is approved.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Clouta · Sell brand collabs from one post",
  description: DESCRIPTION,
  applicationName: "Clouta",
  openGraph: { type: "website", siteName: "Clouta", locale: "en_US", title: "Clouta · Sell brand deals from one link", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "Clouta · Sell brand deals from one link", description: DESCRIPTION },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#5B3DF5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Show the intro once per visit: skip it on later page views in the same tab session. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(sessionStorage.getItem('clouta-intro')){document.documentElement.classList.add('no-intro')}else{sessionStorage.setItem('clouta-intro','1')}}catch(e){}",
          }}
        />
      </head>
      <body className={`${jakarta.variable} antialiased`}>
        <Intro />
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
        <AnalyticsProvider />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
