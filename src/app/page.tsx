import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import { Blip, SpaceLayer } from "@/components/SpaceLayer";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const revalidate = 60;

const FOUNDING_SPOTS = Number(process.env.NEXT_PUBLIC_FOUNDING_SPOTS) || 1000;

async function getSignupCount(): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("waitlist_count");
  if (error) return null;
  return Number(data);
}

const services = [
  { name: "Instagram Reel", meta: "3-day turnaround · 1 revision", price: "$350" },
  { name: "TikTok video", meta: "4-day turnaround · 1 revision", price: "$300" },
  { name: "Reel + TikTok bundle", meta: "Save 15%", price: "$550" },
];

const steps = [
  {
    n: "1",
    title: "Post your shop window",
    body: "Link your socials and list every collab you offer with a fixed price. One post, one link for your bio.",
  },
  {
    n: "2",
    title: "Brands book and pay up front",
    body: "A brand picks a service, writes a brief, and pays. Sponzy holds the money safely while you work.",
  },
  {
    n: "3",
    title: "Deliver and get paid",
    body: "Share the live post links. When the brand approves, or 3 days pass, the money goes to your bank.",
  },
];

export default async function Home() {
  const count = await getSignupCount();
  const spotsLeft = count === null ? null : Math.max(FOUNDING_SPOTS - count, 0);
  const pct = count === null ? 0 : Math.min((count / FOUNDING_SPOTS) * 100, 100);

  return (
    <>
      <SpaceLayer />
      <Blip message="Psst… founding spots go fast 👽" />

      <div className="relative z-[1]">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            Sponzy<span className="text-violet">.</span>
          </Link>
          <a href="#waitlist-hero" className="btn btn-ghost min-h-11 px-4 text-sm">
            Join the waitlist
          </a>
        </header>

        <main className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Hero */}
          <section className="grid items-center gap-10 pb-16 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-12">
            <div className="rise">
              <span className="chip-pop inline-flex items-center gap-2 rounded-full bg-gold/25 px-3 py-1 text-sm font-bold text-gold-ink">
                ★ Founding Creator spots are open
              </span>
              <h1 className="mt-4 text-[clamp(36px,6vw,60px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
                Sell brand collabs from <span className="text-violet">one post.</span>
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-body">
                List your collab prices in one shop-window post. Brands pay up front, and Sponzy holds the money
                until your work is approved. No chasing invoices.
              </p>
              <div className="card mt-7 max-w-xl p-5 sm:p-6">
                <WaitlistForm id="waitlist-hero" />
              </div>
            </div>

            {/* Shop-window post preview */}
            <div className="rise rise-2 mx-auto w-full max-w-md" aria-label="Example creator post">
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#ff5f8f] to-violet text-xl font-extrabold text-white"
                  >
                    M
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold">Maya Rivers</p>
                    <p className="text-sm text-ink-2">@mayarivers · 84K followers · Lifestyle</p>
                  </div>
                  <span className="rainbow ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-gold-ink">
                    Founding
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-body">
                  Slow mornings, small-batch coffee, and honest reviews. Booking collabs for spring.
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {services.map((s) => (
                    <li key={s.name} className="flex items-center justify-between rounded-[14px] bg-[#f6f4ff] px-4 py-3">
                      <div>
                        <p className="font-bold">{s.name}</p>
                        <p className="text-xs text-ink-2">{s.meta}</p>
                      </div>
                      <p className="font-extrabold text-violet-deep">{s.price}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-ok-bg px-4 py-3 text-sm font-bold text-ok">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-current">
                    <path d="M10 1 3 4v5c0 4.4 3 8.4 7 9.5 4-1.1 7-5.1 7-9.5V4l-7-3zm-1.2 13L5 10.2l1.4-1.4 2.4 2.4 4.8-4.8L15 7.8 8.8 14z" />
                  </svg>
                  Payment held by Sponzy until approved
                </div>
              </div>
            </div>
          </section>

          {/* Founding spots */}
          <section className="rainbow rounded-[20px] p-6 sm:p-8" aria-labelledby="founding-title">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 id="founding-title" className="text-2xl font-extrabold tracking-tight">
                  Be a Founding Creator
                </h2>
                <p className="mt-2 leading-relaxed text-body">
                  The first {FOUNDING_SPOTS.toLocaleString()} creators on the waitlist get the Founding Creator badge
                  for life, early access to the beta, and a say in what we build next.
                </p>
              </div>
              <div className="w-full md:max-w-xs">
                {spotsLeft !== null ? (
                  <>
                    <p className="text-sm font-bold text-gold-ink">
                      {spotsLeft.toLocaleString()} of {FOUNDING_SPOTS.toLocaleString()} spots left
                    </p>
                    <div
                      className="mt-2 h-3 overflow-hidden rounded-full bg-black/5"
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Founding Creator spots claimed"
                    >
                      <div className="h-full rounded-full bg-gradient-to-r from-gold to-[#ff9f3d]" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-bold text-gold-ink">{FOUNDING_SPOTS.toLocaleString()} spots available</p>
                )}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="py-16" aria-labelledby="how-title">
            <h2 id="how-title" className="text-xs font-bold uppercase tracking-[0.1em] text-ink-2">
              How it works
            </h2>
            <ol className="mt-4 grid gap-4 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="card p-6">
                  <span className="grid size-10 place-items-center rounded-[12px] bg-violet/10 font-extrabold text-violet-deep">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-body">{s.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Creators / brands */}
          <section className="grid gap-4 md:grid-cols-2" aria-label="Who Sponzy is for">
            <div className="card p-6 sm:p-8">
              <h2 className="text-xl font-extrabold">For creators</h2>
              <ul className="mt-4 flex flex-col gap-3 text-body">
                <li>✦ Set your own prices, turnaround, and revisions</li>
                <li>✦ Money is secured before you start work</li>
                <li>✦ Earn reviews, badges, and streaks that prove you deliver</li>
                <li>✦ Climb the leaderboard and get found by brands</li>
              </ul>
            </div>
            <div className="card p-6 sm:p-8">
              <h2 className="text-xl font-extrabold">For brands</h2>
              <ul className="mt-4 flex flex-col gap-3 text-body">
                <li>✦ Browse creators by niche, platform, price, and trust score</li>
                <li>✦ Clear prices, no back-and-forth to get a quote</li>
                <li>✦ Pay securely; approve the work before the creator is paid</li>
                <li>✦ Disputes reviewed by a real person</li>
              </ul>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-16" aria-labelledby="cta-title">
            <div className="card mx-auto max-w-2xl p-6 text-center sm:p-10">
              <h2 id="cta-title" className="text-3xl font-extrabold tracking-tight">
                Get paid for collabs, safely.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-body">
                Join the waitlist now. Beta invites go out to Founding Creators first.
              </p>
              <div className="mx-auto mt-6 max-w-lg text-left">
                <WaitlistForm id="waitlist-bottom" />
              </div>
            </div>
          </section>
        </main>

        <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm text-ink-2 sm:px-6">
          © {new Date().getFullYear()} Sponzy. Payments are processed by Stripe; Sponzy never sees your card number.
        </footer>
      </div>
    </>
  );
}
