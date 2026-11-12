import "server-only";

/**
 * Minimal client for Stripe's Accounts v2 API, which Stripe requires for new Connect platforms.
 * Creator payout accounts are v2 Accounts with the "recipient" configuration (they receive transfers).
 */
const VERSION = "2025-12-15.clover";

function key() {
  return process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_key || "";
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", "Stripe-Version": VERSION },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
  return json as T;
}

type V2Account = {
  id: string;
  configuration?: {
    recipient?: { capabilities?: { stripe_balance?: { stripe_transfers?: { status?: string }; payouts?: { status?: string } } } };
  } | null;
  requirements?: { entries?: unknown[] } | null;
};

export async function createRecipientAccount(opts: { email: string; name: string; profileId: string; url: string }) {
  return call<V2Account>("POST", "/v2/core/accounts", {
    contact_email: opts.email,
    display_name: opts.name,
    dashboard: "express",
    identity: { country: "us", entity_type: "individual" },
    defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
    configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
    metadata: { profile_id: opts.profileId, profile_url: opts.url },
  });
}

export async function onboardingLink(accountId: string, origin: string) {
  return call<{ url: string }>("POST", "/v2/core/account_links", {
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: `${origin}/earnings?setup=retry`,
        return_url: `${origin}/earnings?setup=done`,
      },
    },
  });
}

/** Whether the account can receive transfers, and whether onboarding details have been submitted. */
export async function accountStatus(accountId: string) {
  const a = await call<V2Account>("GET", `/v2/core/accounts/${accountId}?include=configuration.recipient&include=requirements`);
  const transfers = a.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  const payouts = a.configuration?.recipient?.capabilities?.stripe_balance?.payouts?.status;
  const ready = transfers === "active";
  const pending = (a.requirements?.entries ?? []).length;
  return { ready, transfers, payouts, detailsSubmitted: ready || pending === 0 };
}
