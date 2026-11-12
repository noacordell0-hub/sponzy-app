import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Server-only Stripe client. Returns null until STRIPE_SECRET_KEY is set. */
export function getStripe(): Stripe | null {
  // Accept the lowercase name too (that's how it was first saved in Vercel).
  const key = process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_key;
  if (!key) return null;
  client ??= new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    appInfo: { name: "Clouta" },
    httpClient: Stripe.createFetchHttpClient(), // fetch works everywhere (Vercel, proxies)
  });
  return client;
}

/** Fees, in one place. Creator fee: 10% (5% for Founding Creators). Brand pays processing: 3% + 30¢. */
export const FEES = {
  creatorRate: 0.1,
  foundingRate: 0.05,
  brandRate: 0.03,
  brandFixedCents: 30,
  reviewWindowDays: 3,
} as const;

export function priceBreakdown(priceCents: number, founding: boolean) {
  const feeRate = founding ? FEES.foundingRate : FEES.creatorRate;
  const creatorFee = Math.round(priceCents * feeRate);
  const brandFee = Math.round(priceCents * FEES.brandRate) + FEES.brandFixedCents;
  return {
    feeRate,
    creatorFeeCents: creatorFee,
    brandFeeCents: brandFee,
    totalCents: priceCents + brandFee,
    creatorPayoutCents: priceCents - creatorFee,
  };
}
