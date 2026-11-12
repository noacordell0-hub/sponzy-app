import { ImageResponse } from "next/og";
import { FOUNDING_SPOTS } from "@/lib/site";

export const alt = "Clouta: sell brand deals from one link. Brands pay up front and Clouta holds the money until the work is approved.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Same design as opengraph-image, for Twitter/X cards. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#15131f",
          background: "#f7f4ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 44 44">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#6C47FF" />
                <stop offset="1" stopColor="#9B5CFF" />
              </linearGradient>
            </defs>
            <path d="M22 3C32 3 40 10 40 20s-8 17-18 17h-2l-8 6v-8C7 32 4 27 4 20 4 10 12 3 22 3z" fill="url(#g)" />
            <path d="M27.5 14.5A8 8 0 1 0 27.5 25.5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.5 }}>Clouta</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 82, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3, display: "flex", flexWrap: "wrap" }}>
            <span>Sell brand deals from&nbsp;</span>
            <span style={{ color: "#5B3DF5", borderBottom: "8px solid #5B3DF5", paddingBottom: 4 }}>one link.</span>
          </div>
          <div style={{ fontSize: 32, color: "#4b4b5a", lineHeight: 1.35, maxWidth: 940 }}>
            Set your prices. Brands pay up front. Clouta holds the money until the work is approved.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[`${FOUNDING_SPOTS.toLocaleString()} Founding Creator spots`, "Half fees for life", "Payments by Stripe"].map((t) => (
            <div key={t} style={{ display: "flex", padding: "12px 22px", borderRadius: 999, background: "#ffffff", border: "2px solid rgba(21,19,31,0.18)", fontSize: 26, fontWeight: 700 }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
