/** Avatar patterns and profile themes, shared by the account page and (later) public profiles. */
export const AVATAR_PATTERNS = [
  "radial-gradient(circle at 78% 22%, rgba(255,255,255,.5) 0 13%, transparent 14%), linear-gradient(135deg,#6C47FF,#C04FD8)",
  "radial-gradient(circle, transparent 0 28%, rgba(255,255,255,.35) 29% 35%, transparent 36%), linear-gradient(135deg,#00A99D,#4DC9FF)",
  "repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 7px, transparent 7px 14px), linear-gradient(135deg,#FF8A4C,#F5B000)",
  "radial-gradient(rgba(255,255,255,.4) 2px, transparent 3px) 0 0/12px 12px, linear-gradient(135deg,#1B1446,#6C47FF)",
  "radial-gradient(circle at 22% 78%, rgba(255,255,255,.5) 0 17%, transparent 18%), linear-gradient(135deg,#1E9E62,#5BD88A)",
  "conic-gradient(from 45deg, #E8508A, #F5B000, #6C47FF, #E8508A)",
];

export const THEMES = {
  violet: { label: "Violet", banner: "linear-gradient(120deg,#2A1B6E,#6C47FF 60%,#9B5CFF)", button: "linear-gradient(180deg,#7655FF,#5B3DF5)", text: "#fff" },
  sunset: { label: "Sunset", banner: "linear-gradient(120deg,#FF8A4C,#E8508A)", button: "linear-gradient(180deg,#E8590C,#C2410C)", text: "#fff" },
  ocean: { label: "Ocean", banner: "linear-gradient(120deg,#0B3C5D,#00A99D)", button: "linear-gradient(180deg,#0E8F86,#0B6F68)", text: "#fff" },
  gold: { label: "Gold", banner: "linear-gradient(120deg,#F5C24B,#C98A00)", button: "linear-gradient(180deg,#FFD76A,#F0A500)", text: "#3A2600" },
  midnight: { label: "Midnight", banner: "linear-gradient(120deg,#0E0E16,#3A26A8)", button: "linear-gradient(180deg,#2A2A3C,#14141F)", text: "#fff" },
} as const;
export type ThemeKey = keyof typeof THEMES;

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "C") + (parts[1]?.[0] ?? "")).toUpperCase();
}
