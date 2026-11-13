import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { THEMES, initials } from "@/lib/look";
import { formatFollowers } from "@/lib/platforms";
import { money } from "@/lib/format";

export const alt = "A creator's shop on Clouta: prices, reach, and payment held until the work is approved.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const LOGO = (
  <svg width="44" height="44" viewBox="0 0 44 44">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6C47FF" />
        <stop offset="1" stopColor="#9B5CFF" />
      </linearGradient>
    </defs>
    <path d="M22 3C32 3 40 10 40 20s-8 17-18 17h-2l-8 6v-8C7 32 4 27 4 20 4 10 12 3 22 3z" fill="url(#g)" />
    <path d="M27.5 14.5A8 8 0 1 0 27.5 25.5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

/**
 * The card people see when a creator shares their shop link (Instagram, iMessage, X...).
 * Uses the public (anon) key, so it only ever shows what the public shop page shows.
 */
export default async function CreatorShareImage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: c } = await sb.from("profiles").select("id, display_name, handle, tagline, theme").eq("handle", handle.toLowerCase()).eq("role", "creator").maybeSingle();
  let services: { name: string; price_cents: number }[] = [];
  let reach = 0;
  if (c) {
    const [{ data: post }, { data: socials }] = await Promise.all([
      sb.from("posts").select("id, published").eq("creator_id", c.id).maybeSingle(),
      sb.from("social_accounts").select("followers, verified").eq("profile_id", c.id),
    ]);
    reach = (socials ?? []).filter((s) => s.verified).reduce((n, s) => n + (s.followers ?? 0), 0);
    if (post?.published) {
      const { data: sv } = await sb.from("services").select("name, price_cents").eq("post_id", post.id).order("position").order("id").limit(3);
      services = sv ?? [];
    }
  }
  const theme = THEMES[(c?.theme as keyof typeof THEMES) ?? "violet"] ?? THEMES.violet;
  const name = c?.display_name ?? "Creator";
  const from = services.length ? Math.min(...services.map((s) => s.price_cents)) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f7f4ee", fontFamily: "sans-serif", color: "#15131f", padding: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#fff", borderRadius: 28, border: "2px solid rgba(21,19,31,0.10)", overflow: "hidden" }}>
          <div style={{ display: "flex", height: 150, background: theme.banner }} />
          <div style={{ display: "flex", flex: 1, padding: "0 56px 44px", gap: 48 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", width: 132, height: 132, marginTop: -66, borderRadius: 999, border: "6px solid #fff", background: theme.button, color: theme.text, alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 800 }}>
                {initials(name)}
              </div>
              <div style={{ display: "flex", fontSize: 60, fontWeight: 800, letterSpacing: -2, marginTop: 18, lineHeight: 1.05 }}>{name.slice(0, 28)}</div>
              <div style={{ display: "flex", fontSize: 28, color: "#6b6b7b", marginTop: 8 }}>
                @{c?.handle ?? handle}
                {reach > 0 ? `  ·  ${formatFollowers(reach)} verified followers` : ""}
              </div>
              {c?.tagline && <div style={{ display: "flex", fontSize: 28, color: "#4b4b5a", marginTop: 18, lineHeight: 1.35, maxWidth: 560 }}>{c.tagline.slice(0, 90)}</div>}
              <div style={{ display: "flex", flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {LOGO}
                <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#4b4b5a" }}>Book on Clouta · payment held until approved</div>
              </div>
            </div>
            {services.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", width: 420, marginTop: 40, gap: 14 }}>
                <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: "#6b6b7b", letterSpacing: 2 }}>{from !== null ? `FROM ${money(from)}` : "SERVICES"}</div>
                {services.map((s) => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderRadius: 16, border: "2px solid rgba(21,19,31,0.10)", background: "#faf8f3", fontSize: 26 }}>
                    <span style={{ display: "flex", fontWeight: 700, maxWidth: 260 }}>{s.name.slice(0, 22)}</span>
                    <span style={{ display: "flex", fontWeight: 800, color: "#5B3DF5" }}>{money(s.price_cents)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
