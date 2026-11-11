import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Intro } from "@/components/Intro";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Clouta · Sell brand collabs from one post",
  description:
    "Creators list their collab prices in one shop-window post. Brands pay up front, and Clouta holds the money until the work is approved.",
};

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
        {children}
      </body>
    </html>
  );
}
