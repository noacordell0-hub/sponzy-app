import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import { LogoMark } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icons";
import { HeroPlanets, ShootingStars } from "@/components/Backdrop";
import EarningsCalculator from "@/components/EarningsCalculator";

import { FOUNDING_SPOTS } from "@/lib/site";
import LandingAuthLinks from "@/components/LandingAuthLinks";
import TrackView from "@/components/TrackView";
import { SpotsLeft, StickyMobileCta } from "@/components/LandingExperiments";
import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" }, openGraph: { url: "/" } };

const steps: { title: string; body: string }[] = [
  { title: "Put your prices on one page", body: "List what you offer, like a TikTok, a story or a bundle, with your price and turnaround. Then add the link to your bio." },
  { title: "A brand books you and pays first", body: "They pick a deal and send a brief. The money comes to Clouta before you lift a finger." },
  { title: "You post and send the link", body: "Make the content the way you normally would, then paste the live link as proof. All the chat stays in one thread." },
  { title: "The money lands in your bank", body: "Once the brand approves, we pay you. If they don't answer within 3 days, it's approved for you." },
];

const perks: { title: string; body: string }[] = [
  { title: "Half the fee, forever", body: "Founding Creators pay 5% instead of the standard 10% on every collab. It never goes back up." },
  { title: "First in the door", body: "You're invited to the beta before anyone else. Bring 3 friends and you're in the very first wave." },
  { title: "The Founding badge", body: "It sits on your profile for brands to see, and nobody can get it after launch." },
];

const proof = ["Payments run on Stripe", "Money held until the work is approved", "3 days to review, then auto-approved", "Disputes decided by a real person"];

const badges: { name: string; tier: string; tip: string; icon: IconName; c1?: string; c2?: string; locked?: boolean }[] = [
  { name: "Founding Creator", tier: "Waitlist only", tip: "Joined before launch. Never earnable again.", icon: "star", c1: "#F5C24B", c2: "#C98A00" },
  { name: "Top Rated", tier: "Earned", tip: "4.8 stars or higher across 10+ reviews.", icon: "trophy", c1: "#8A6BFF", c2: "#5B3DF5" },
  { name: "On-Time Pro", tier: "Earned", tip: "10 on-time deliveries in a row.", icon: "clock", c1: "#4DA3FF", c2: "#2563EB" },
  { name: "Verified Socials", tier: "Earned", tip: "All linked accounts confirmed.", icon: "check", c1: "#34C77B", c2: "#12905A" },
  { name: "Elite", tier: "40 collabs", tip: "Reach 40 completed collabs to unlock.", icon: "bolt", locked: true },
];

const trust: { title: string; body: string }[] = [
  { title: "Nobody gets paid for work that didn't happen", body: "Brands pay up front and creators are paid on approval. Missed deadlines and disputes follow written refund rules." },
  { title: "Reviews only come from real, paid orders", body: "Only the brand and creator on a finished collab can review each other, so you can't buy your way to five stars." },
  { title: "Both sides have a track record", body: "Creators and brands each build a score from on-time delivery, how they pay, their ratings and their disputes." },
  { title: "Reports are read by a person", body: "Flag a fake account, a scam or harassment and someone on our team looks at it. No bots deciding." },
];

const faqs: { id: string; q: string; a: string }[] = [
  {
    id: "free",
    q: "Is it free to join?",
    a: "Yes. Joining the waitlist and listing your services are free. Clouta only takes a fee when a paid collab is completed.",
  },
  { id: "launch", q: "When does Clouta launch?", a: "We're opening a private beta soon. Waitlist members are invited first." },
  {
    id: "payments",
    q: "How do brands pay?",
    a: "Brands pay inside Clouta through Stripe, plus a payment processing fee of 3% + 30¢ shown at checkout. The money is held and released after the creator delivers and the brand approves.",
  },
  {
    id: "problems",
    q: "What if there is a problem with an order?",
    a: "Either side can open a dispute before approval. Our team reviews both sides and decides on a refund, a payout or a split.",
  },
  {
    id: "move_up",
    q: "How do I move up the waitlist?",
    a: "After you join you get a personal invite link. Every friend who signs up with it moves you up 5 spots, and inviting 3 friends gets you into the first beta wave.",
  },
  {
    id: "young",
    q: "Can young creators join?",
    a: "Yes, creators aged 13 and up are welcome. For creators under 18, a parent or guardian manages payouts.",
  },
];

const wrap = "relative mx-auto w-full max-w-[1200px] px-4 sm:px-8";
const h2 = "font-display text-[clamp(36px,5vw,56px)] leading-[1.02]";
const lead = "text-[17px] leading-[1.65] text-body";

/** A loose, hand-drawn underline for one headline word. */
function Scribble() {
  return (
    <svg viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3 11 C 40 4, 80 4, 118 8 S 175 13, 197 5" fill="none" stroke="#5B3DF5" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const spots = FOUNDING_SPOTS.toLocaleString();
  return (
    <div className="paper grain">
      <TrackView name="landing_view" />
      {/* Structured data so search engines understand the brand, the site and the FAQ. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            { "@context": "https://schema.org", "@type": "Organization", name: "Clouta", url: SITE_URL, logo: `${SITE_URL}/apple-icon.png`, description: "A storefront for creator sponsorships: brands pay up front and Clouta holds the money until the work is approved." },
            { "@context": "https://schema.org", "@type": "WebSite", name: "Clouta", url: SITE_URL },
            { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
          ]).replace(/</g, "\\u003c"),
        }}
      />
      <ShootingStars />
      <header className="sticky top-0 z-20 border-b rule bg-[#f7f4ee]/85 backdrop-blur-md">
        <div className={`${wrap} flex h-16 items-center gap-6`}>
          <Link href="/" className="flex min-h-11 items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.03em]">
            <LogoMark size={30} />
            Clouta
          </Link>
          <div className="flex-1" />
          <nav aria-label="Page sections" className="hidden items-center gap-7 md:flex">
            {[
              ["/browse", "Browse creators"],
              ["#how", "How it works"],
              ["#trust", "Trust & safety"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} data-track="nav_click" data-track-target={href.replace("#", "").replace("/", "")} className="py-3 text-[15px] font-medium text-body hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <LandingAuthLinks />
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div className="hero-bg" aria-hidden="true" />
        <HeroPlanets />

        {/* Hero */}
        <section className={`${wrap} grid items-center gap-14 pb-16 pt-12 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:pb-24 lg:pt-20`}>
          <div className="rise flex flex-col gap-6">
            <span className="self-start rounded-full border rule bg-white px-3 py-1 text-[13px] font-semibold text-ink">
              <span className="mr-1.5 inline-block size-2 rounded-full bg-[#5B3DF5] align-middle" aria-hidden="true" />
              <SpotsLeft fallback={`Private beta · ${spots} Founding Creator spots`} />
            </span>
            <h1 className="font-display text-[clamp(52px,8vw,92px)] leading-[0.95]">
              Sell brand deals from <em className="scribble">one link.<Scribble /></em>
            </h1>
            <p className={`${lead} max-w-[520px] sm:text-lg`}>
              Put your prices on one page and share it. Brands pick what they want and pay before you start. We hold the money and send it to you once
              they approve the post.
            </p>
            <div id="join" className="scroll-mt-24">
              <WaitlistForm id="email-hero" />
            </div>
            <p className="text-sm text-ink-2">Free to join. The first {spots} creators pay half the usual fee, for good.</p>
          </div>

          {/* Product preview: what a creator's shop looks like (example data, labelled as such) */}
          <div className="rise rise-2 relative mx-auto w-full max-w-[400px] lg:mr-0" aria-label="Example creator storefront">
            <span className="sticker absolute -left-3 -top-4 z-[2] rounded-md bg-[#FFC83D] px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-wide text-ink shadow-[0_2px_0_rgba(21,19,31,.25)]">
              Example
            </span>
            <div className="relative rotate-[1.5deg] rounded-[28px] border-[6px] border-ink bg-white p-5 shadow-[10px_12px_0_rgba(21,19,31,.08)]">
              <div className="flex items-center gap-3">
                <div aria-hidden="true" className="grid size-14 place-items-center rounded-2xl bg-[#5B3DF5] text-lg font-extrabold text-white">
                  MR
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold">Maya Rivera</p>
                  <p className="text-[13px] text-ink-2">Fitness · 48K followers</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[30px] leading-none">94</p>
                  <p className="text-[11px] font-semibold text-ok">trust score</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="badge-gold rounded-md px-2 py-0.5 text-xs font-semibold">Founding Creator</span>
                <span className="badge-violet rounded-md px-2 py-0.5 text-xs font-semibold">Top Rated</span>
                <span className="badge-violet rounded-md px-2 py-0.5 text-xs font-semibold">On-Time Pro</span>
              </div>
              <ul className="mt-4 divide-y divide-black/10 border-y border-black/10">
                {[
                  ["TikTok video", "5 days · 1 revision", "$120"],
                  ["Story shoutout", "2 days", "$45"],
                  ["Video + shoutout", "6 days", "$150"],
                ].map(([name, meta, price]) => (
                  <li key={name} className="flex items-baseline gap-3 py-3">
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{name}</span>
                      <span className="block text-xs text-ink-2">{meta}</span>
                    </span>
                    <span className="font-display text-[22px] leading-none">{price}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-ok">
                <Icon name="lock" size={15} />
                Paid up front. Held until approved.
              </p>
            </div>
          </div>
        </section>

        {/* Proof line */}
        <section aria-label="Protections" className="relative border-y rule bg-white/60">
          <ul className={`${wrap} grid grid-cols-1 gap-y-2 py-5 text-[15px] font-medium text-body sm:flex sm:flex-wrap sm:items-center sm:gap-x-3`}>
            {proof.map((p, i) => (
              <li key={p} className="reveal flex items-center gap-3">
                {i > 0 && <span aria-hidden="true" className="hidden text-ink-2 sm:inline">/</span>}
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* Where the money goes: the escrow promise, shown step by step */}
        <section aria-labelledby="flow-t" className={`${wrap} reveal relative pt-16 lg:pt-24`}>
          <h2 id="flow-t" className="text-sm font-bold text-ink-2">Where the money goes on a $120 deal</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["Brand pays", "$120", "plus card processing, before you start"],
              ["Clouta holds it", "$120", "safe while you make the post"],
              ["Brand approves", "3 days", "or it's approved for them"],
              ["You get paid", "$114", "as a Founding Creator (5% fee)"],
            ].map(([label, big, note], i) => (
              <li key={label} className="flow-step lift relative rounded-2xl border border-black/[.14] bg-white p-4">
                <span className="text-xs font-semibold text-ink-2">
                  {i + 1}. {label}
                </span>
                <span className="font-display tabular mt-1 block text-[40px] leading-none">{big}</span>
                <span className="mt-1 block text-[13px] leading-snug text-body">{note}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* How it works */}
        <section id="how" className={`${wrap} scroll-mt-20 grid gap-10 py-20 lg:grid-cols-[0.9fr_1.4fr] lg:py-28`}>
          <div className="reveal lg:sticky lg:top-28 lg:self-start">
            <h2 className={h2}>How a deal works</h2>
            <p className={`${lead} mt-4 max-w-[380px]`}>Four steps, no invoices to chase. You can see where every order is at any time.</p>
          </div>
          <ol className="border-t rule">
            {steps.map((s, i) => (
              <li key={s.title} className="reveal grid grid-cols-[64px_1fr] gap-4 border-b rule py-7 sm:grid-cols-[96px_1fr]">
                <span className="font-display text-[48px] leading-none text-[#5B3DF5] sm:text-[64px]" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.01em]">{s.title}</h3>
                  <p className="mt-1.5 max-w-[520px] text-[16px] leading-relaxed text-body">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Earnings calculator */}
        <section className="relative border-y rule bg-white/60">
          <div className="grid-fade" aria-hidden="true" />
          <div className={`${wrap} py-20 lg:py-28`}>
            <div className="reveal max-w-[640px]">
              <h2 className={h2}>What could your posts earn?</h2>
              <p className={`${lead} mt-4`}>Drag the sliders. It&apos;s rough maths for a year of brand deals, before fees.</p>
            </div>
            <div className="reveal mt-10">
              <EarningsCalculator />
            </div>
          </div>
        </section>

        {/* Founding offer: one ticket instead of three cards */}
        <section className={`${wrap} relative py-20 lg:py-28`}>
          <div className="grid-fade" aria-hidden="true" />
          <div className="ticket reveal relative grid gap-10 p-7 sm:p-10 lg:grid-cols-[1fr_1.3fr] lg:gap-14">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-bold text-[#7A5200]">★ Founding Creator · first {spots} only</p>
              <h2 className={h2}>Get in early and keep the better deal</h2>
              <p className={lead}>The first {spots} creators on the waitlist lock these in for as long as they use Clouta.</p>
              <div className="mt-2">
                <a href="#join" data-track="cta_click" data-track-location="founding" className="btn px-6 text-base">
                  Claim my spot
                  <Icon name="arrow" size={18} />
                </a>
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-dashed divide-black/20 border-t border-dashed border-black/20 lg:border-t-0">
              {perks.map((p) => (
                <li key={p.title} className="py-5 first:pt-5 lg:first:pt-0">
                  <h3 className="text-lg font-bold">{p.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-body">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Reputation */}
        <section className="relative border-y rule bg-white/60">
          <div className={`${wrap} grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28`}>
            <div className="flex flex-col gap-4">
              <h2 className={h2}>Badges you earn, not buy</h2>
              <p className={lead}>
                Every badge comes from real orders: posting on time, good reviews, brands coming back. Founding Creator is the only one you can&apos;t
                earn later. It goes to people on the waitlist.
              </p>
            </div>
            <div className="reveal flex flex-wrap justify-center gap-x-2 gap-y-8 rounded-2xl border rule bg-white px-4 py-10">
              {badges.map((b) => (
                <div key={b.name} className={`bgd ${b.locked ? "lk" : ""}`} tabIndex={0}>
                  <div className="hx" style={b.c1 ? ({ "--c1": b.c1, "--c2": b.c2 } as React.CSSProperties) : undefined}>
                    <Icon name={b.icon} size={24} />
                  </div>
                  <div className="bn">{b.name}</div>
                  <div className="bt">{b.tier}</div>
                  <div className="tip" role="tooltip">
                    {b.tip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className={`${wrap} relative scroll-mt-20 py-20 lg:py-28`}>
          <div className="grid-fade" aria-hidden="true" />
          <h2 className={`reveal relative ${h2} max-w-[720px]`}>What keeps it fair for both sides</h2>
          <div className="relative mt-12 grid gap-x-14 md:grid-cols-2">
            {trust.map((t) => (
              <div key={t.title} className="reveal border-t rule py-6">
                <h3 className="text-lg font-bold">{t.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-body">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative border-t rule bg-white/60">
          <div className={`${wrap} grid gap-10 py-20 lg:grid-cols-[1fr_2fr] lg:py-28`}>
            <div>
              <h2 className={h2}>Questions</h2>
              <p className={`${lead} mt-4`}>Anything else? Ask us once you&apos;re on the list.</p>
            </div>
            <div className="border-t border-black/10">
              {faqs.map((f) => (
                <details key={f.id} className="faq reveal" data-faq={f.id}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className={`${wrap} py-20 lg:py-24`}>
          <div className="reveal relative flex flex-col gap-5 overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white sm:px-14 sm:py-16">
            <div className="grid-fade grid-fade-dark" aria-hidden="true" />
            <div className="relative flex flex-col gap-5">
            <h2 className="font-display max-w-[720px] text-[clamp(40px,6vw,64px)] leading-[1]">
              Save your <em className="text-[#B9A6FF]">Founding</em> spot
            </h2>
            <p className="max-w-[540px] text-[17px] leading-relaxed text-[#D9D3FF]">
              Early access, half the usual fee for good, and the Founding badge. Every friend you invite moves you up the line.
            </p>
            <WaitlistForm id="email-bottom" dark />
            </div>
          </div>
        </section>
      </main>

      <StickyMobileCta />
      <footer className="relative border-t rule">
        <div className={`${wrap} grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-lg font-extrabold text-ink">
              <LogoMark size={24} />
              Clouta
            </span>
            <p className="max-w-[300px] text-sm leading-relaxed text-body">
              The storefront for creator sponsorships. Brands pay first, creators get paid on approval.
            </p>
          </div>
          {[
            { title: "Product", links: [["/browse", "Browse creators", "browse"], ["/leaderboard", "Leaderboard", "leaderboard"], ["/#how", "How it works", "how"]] },
            { title: "Clouta", links: [["/#join", "Join the waitlist", "join"], ["/login", "Log in", "login"], ["/#faq", "FAQ", "faq"]] },
            { title: "Legal", links: [["/terms", "Terms", "terms"], ["/privacy", "Privacy", "privacy"], ["/#trust", "Trust & safety", "trust"]] },
          ].map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col">
              <p className="mb-1 text-sm font-bold text-ink">{col.title}</p>
              {col.links.map(([href, label, target]) => (
                <Link key={href} href={href} data-track="nav_click" data-track-target={target} className="inline-flex min-h-11 items-center text-sm text-body hover:text-ink">
                  {label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className={wrap}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t rule py-6 text-sm text-ink-2">
            <span>© {new Date().getFullYear()} Clouta</span>
            <span>Made for creators who&apos;d rather post than chase invoices.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
