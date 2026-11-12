export function money(cents: number | null | undefined) {
  if (cents == null) return "";
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toLocaleString()}` : `$${dollars.toFixed(2)}`;
}

export const NICHES = [
  "Fitness", "Wellness", "Food", "Beauty", "Fashion", "Gaming", "Tech", "Travel",
  "Lifestyle", "Parenting", "Finance", "Education", "Music", "Comedy", "Sports", "Pets",
];

export const TIERS = [
  { key: "nano", label: "Nano", range: "1K–10K" },
  { key: "micro", label: "Micro", range: "10K–100K" },
  { key: "mid", label: "Mid", range: "100K–500K" },
  { key: "macro", label: "Macro", range: "500K+" },
] as const;
