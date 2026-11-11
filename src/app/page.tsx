import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import { LogoMark } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icons";
import { HeroPlanets, ShootingStars } from "@/components/Backdrop";
import EarningsCalculator from "@/components/EarningsCalculator";

const FOUNDING_SPOTS = Number(process.env.NEXT_PUBLIC_FOUNDING_SPOTS) || 1000;

const steps: { icon: IconName; title: string; body: string }[] = [
  { icon: "link", title: "Share your Clouta link", body: "Set up your storefront with your services and prices, then put one link in your bio." },
  { icon: "cash", title: "A brand books and pays", body: "Brands pick a service, send a brief and pay up front. Clouta holds the money." },
  { icon: "check", title: "You deliver", body: "Post the content and submit the live link as proof. Chat with the brand in one place." },
  { icon: "star", title: "You get paid", body: "The brand approves, or it auto-approves after 3 days, and the money goes to your bank." },
];

const perks: { icon: IconName; title: string; body: string }[] = [
  { icon: "cash", title: "Half fees, for life", body: "Founding Creators pay half the standard Clouta fee on every collab, permanently." },
  { icon: "bolt", title: "First into the beta", body: "Waitlist members get invited before anyone else. Invite 3 friends to join the first wave." },
  { icon: "star", title: "Founding Creator badge", body: "A permanent badge on your profile that brands see. It can never be earned after launch." },
];

const proof: { icon: IconName; label: string }[] = [
  { icon: "lock", label: "Payments processed by Stripe" },
  { icon: "cash", label: "Funds held until approval" },
  { icon: "clock", label: "3-day review window" },
  { icon: "flag", label: "Disputes reviewed by people" },
];

const badges: { name: string; tier: string; tip: string; icon: IconName; c1?: string; c2?: string; locked?: boolean }[] = [
  { name: "Founding Creator", tier: "Waitlist only", tip: "Joined before launch. Never earnable again.", icon: "star", c1: "#F5C24B", c2: "#C98A00" },
  { name: "Top Rated", tier: "Earned", tip: "4.8 stars or higher across 10+ reviews.", icon: "trophy", c1: "#8A6BFF", c2: "#5B3DF5" },
  { name: "On-Time Pro", tier: "Earned", tip: "10 on-time deliveries in a row.", icon: "clock", c1: "#4DA3FF", c2: "#2563EB" },
  { name: "Verified Socials", tier: "Earned", tip: "All linked accounts confirmed.", icon: "check", c1: "#34C77B", c2: "#12905A" },
  { name: "Elite", tier: "40 collabs", tip: "Reach 40 completed collabs to unlock.", icon: "bolt", locked: true },
];

const trust: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "lock",
    title: "Money held until approved",
    body: "Brands pay up front and creators are paid on approval. Missed deadlines and disputes follow clear refund rules.",
  },
  { icon: "star", title: "Reviews from paid orders only", body: "Only the two sides of a completed collab can review each other, so ratings reflect real work." },
  {
    icon: "trophy",
    title: "Trust scores for both sides",
    body: "Creators and brands each earn a score from on-time delivery, payment history, ratings and disputes.",
  },
  { icon: "flag", title: "Reporting and moderation", body: "Report fake accounts, scams or harassment. Our team reviews every report by hand." },
];

const faqs = [
  {
    q: "Is it free to join?",
    a: "Yes. Joining the waitlist and listing your services are free. Clouta only takes a fee when a paid collab is completed.",
  },
  { q: "When does Clouta launch?", a: "We're opening a private beta soon. Waitlist members are invited first." },
  {
    q: "How do brands pay?",
    a: "Brands pay inside Clouta through Stripe. The money is held and released after the creator delivers and the brand approves.",
  },
  {
    q: "What if there is a problem with an order?",
    a: "Either side can open a dispute before approval. Our team reviews both sides and decides on a refund, a payout or a split.",
  },
  {
    q: "How do I move up the waitlist?",
    a: "After you join you get a personal invite link. Every friend who signs up with it moves you up 5 spots, and inviting 3 friends gets you into the first beta wave.",
  },
  {
    q: "Can young creators join?",
    a: "Yes, creators aged 13 and up are welcome. For creators under 18, a parent or guardian manages payouts.",
  },
];

const wrap = "relative mx-auto w-full max-w-[1200px] px-4 sm:px-8";
const h2 = "text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.12] tracking-[-0.03em]";
const lead = "text-[17px] leading-[1.6] text-body";

export default function Home() {
  const spots = FOUNDING_SPOTS.toLocaleString();
  return (
    <>
      <ShootingStars />
      <header className="sticky top-0 z-20 border-b border-black/[.06] bg-[#fbfaff]/80 backdrop-blur-md">
        <div className={`${wrap} flex h-16 items-center gap-6`}>
          <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.03em]">
            <LogoMark size={30} />
            Clouta
          </Link>
          <div className="flex-1" />
          <nav aria-label="Page sections" className="hidden items-center gap-7 md:flex">
            {[
              ["#how", "How it works"],
              ["#trust", "Trust & safety"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="py-3 text-[15px] font-medium text-body hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <a href="#join" className="btn min-h-10 px-4 text-sm">
            Join the waitlist
          </a>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div className="hero-bg" aria-hidden="true" />
        <HeroPlanets />

        {/* Hero */}
        <section className={`${wrap} grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-24`}>
          <div className="rise flex flex-col gap-6">
            <span className="badge-violet self-start rounded-full px-3 py-1 text-[13px] font-semibold">
              Private beta · {spots} Founding Creator spots
            </span>
            <h1 className="text-[clamp(40px,6vw,64px)] font-extrabold leading-[1.04] tracking-[-0.04em]">
              Sell brand deals from <span className="text-violet-deep">one link.</span>
            </h1>
            <p className={`${lead} max-w-[540px] sm:text-lg`}>
              Clouta is the storefront for creator sponsorships. Set your prices, brands book and pay up front, and you get paid
              as soon as the work is approved. No DMs, no invoices, no chasing.
            </p>
            <div id="join" className="scroll-mt-24">
              <WaitlistForm id="email-hero" />
            </div>
            <p className="text-sm text-ink-2">Free to join. The first {spots} creators get half fees for life.</p>
          </div>

          {/* Product preview */}
          <div className="rise rise-2 relative mx-auto w-full max-w-[440px]" aria-label="Example creator storefront">
            <div className="panel overflow-hidden">
              <div className="h-24 bg-[linear-gradient(120deg,#2A1B6E,#6C47FF_60%,#9B5CFF)]" />
              <div className="flex flex-col gap-4 px-6 pb-6">
                <div className="-mt-5 flex items-end gap-3">
                  <div
                    aria-hidden="true"
                    className="grid size-16 place-items-center rounded-2xl border-4 border-white bg-[linear-gradient(135deg,#6C47FF,#C04FD8)] text-xl font-extrabold text-white"
                  >
                    MR
                  </div>
                  <div className="pb-0.5">
                    <p className="text-[17px] font-bold">Maya Rivera</p>
                    <p className="text-[13px] text-ink-2">Fitness · 48K followers</p>
                  </div>
                  <div className="ml-auto pb-1 text-right">
                    <p className="text-[17px] font-extrabold">94</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ok">Trust score</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge-gold rounded-md px-2 py-0.5 text-xs font-semibold">Founding Creator</span>
                  <span className="badge-violet rounded-md px-2 py-0.5 text-xs font-semibold">Top Rated</span>
                  <span className="badge-violet rounded-md px-2 py-0.5 text-xs font-semibold">On-Time Pro</span>
                </div>
                <div className="divide-y divide-black/[.06] rounded-xl border border-black/[.08]">
                  {[
                    ["TikTok video", "5-day turnaround · 1 revision", "$120"],
                    ["Story shoutout", "2-day turnaround", "$45"],
                    ["Video + shoutout bundle", "6-day turnaround", "$150"],
                  ].map(([name, meta, price]) => (
                    <div key={name} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-ink-2">{meta}</p>
                      </div>
                      <p className="text-sm font-bold">{price}</p>
                    </div>
                  ))}
                </div>
                <p className="flex items-center gap-2 rounded-lg bg-ok-bg px-3.5 py-2.5 text-[13px] font-semibold text-ok">
                  <Icon name="lock" size={16} />
                  Payment held by Clouta until delivery is approved
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Proof strip */}
        <section aria-label="Protections" className="relative border-y border-black/[.06] bg-white">
          <ul className={`${wrap} grid grid-cols-2 gap-x-6 gap-y-4 py-6 md:grid-cols-4`}>
            {proof.map((p) => (
              <li key={p.label} className="flex items-center gap-2.5 text-sm font-semibold text-body">
                <span className="text-violet-deep">
                  <Icon name={p.icon} size={18} />
                </span>
                {p.label}
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className={`${wrap} scroll-mt-20 py-20 lg:py-28`}>
          <div className="max-w-[640px]">
            <p className="eyebrow">How it works</p>
            <h2 className={`${h2} mt-3`}>From link in bio to money in the bank</h2>
          </div>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="panel relative flex flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#F3F0FF] text-violet-deep">
                    <Icon name={s.icon} />
                  </span>
                  <span className="text-sm font-bold text-ink-2">Step {i + 1}</span>
                </div>
                <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-body">{s.body}</p>
                {i < steps.length - 1 && (
                  <span aria-hidden="true" className="absolute -right-3.5 top-1/2 z-[1] hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-black/[.08] bg-white text-ink-2 lg:grid">
                    <Icon name="arrow" size={14} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Earnings calculator */}
        <section className="relative border-y border-black/[.06] bg-white">
          <div className={`${wrap} py-20 lg:py-28`}>
            <div className="max-w-[640px]">
              <p className="eyebrow">Earnings</p>
              <h2 className={`${h2} mt-3`}>See what your sponsorships are worth</h2>
              <p className={`${lead} mt-4`}>Move the sliders to estimate a year of brand deals on Clouta.</p>
            </div>
            <div className="mt-10">
              <EarningsCalculator />
            </div>
          </div>
        </section>

        {/* Founding perks */}
        <section className={`${wrap} py-20 lg:py-28`}>
          <div className="max-w-[640px]">
            <p className="eyebrow">Founding Creators</p>
            <h2 className={`${h2} mt-3`}>Join early, keep the perks forever</h2>
            <p className={`${lead} mt-4`}>The first {spots} creators on the waitlist lock in these benefits for life.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {perks.map((p) => (
              <div key={p.title} className="panel flex flex-col gap-3 p-7">
                <span className="grid size-11 place-items-center rounded-xl bg-[#FFF4D6] text-[#7A5200]">
                  <Icon name={p.icon} />
                </span>
                <h3 className="mt-1 text-lg font-bold">{p.title}</h3>
                <p className="text-[15px] leading-relaxed text-body">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <a href="#join" className="btn px-6 text-base">
              Claim my spot
              <Icon name="arrow" size={18} />
            </a>
          </div>
        </section>

        {/* Reputation */}
        <section className="relative border-y border-black/[.06] bg-white">
          <div className={`${wrap} grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28`}>
            <div className="flex flex-col gap-4">
              <p className="eyebrow">Reputation</p>
              <h2 className={h2}>A track record brands can see</h2>
              <p className={lead}>
                Badges are earned from real orders: on-time deliveries, strong reviews and repeat brands. Founding Creator is the
                only one you can&apos;t earn later. It goes to waitlist members.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-8 rounded-2xl bg-[#F7F5FF] px-4 py-10">
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
        <section id="trust" className={`${wrap} scroll-mt-20 py-20 lg:py-28`}>
          <div className="max-w-[640px]">
            <p className="eyebrow">Trust & safety</p>
            <h2 className={`${h2} mt-3`}>Built so both sides can trust the deal</h2>
          </div>
          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {trust.map((t) => (
              <div key={t.title} className="flex items-start gap-4">
                <span className="grid size-11 flex-none place-items-center rounded-xl bg-[#F3F0FF] text-violet-deep">
                  <Icon name={t.icon} />
                </span>
                <div>
                  <h3 className="text-lg font-bold">{t.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-body">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative border-t border-black/[.06] bg-white">
          <div className={`${wrap} grid gap-10 py-20 lg:grid-cols-[1fr_2fr] lg:py-28`}>
            <div>
              <p className="eyebrow">FAQ</p>
              <h2 className={`${h2} mt-3`}>Questions</h2>
            </div>
            <div className="border-t border-black/10">
              {faqs.map((f) => (
                <details key={f.q} className="faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className={`${wrap} py-20 lg:py-24`}>
          <div className="flex flex-col gap-5 rounded-3xl bg-[linear-gradient(135deg,#1B1446,#3A26A8)] px-6 py-12 text-white sm:px-14 sm:py-16">
            <h2 className="max-w-[640px] text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
              Claim your Founding Creator spot
            </h2>
            <p className="max-w-[540px] text-[17px] leading-relaxed text-[#D9D3FF]">
              Join the waitlist for early access, half fees for life and the Founding Creator badge. Invite friends to move up the line.
            </p>
            <WaitlistForm id="email-bottom" dark />
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[.06]">
        <div className={`${wrap} flex flex-wrap items-center gap-x-6 gap-y-3 py-8 text-sm text-ink-2`}>
          <span className="flex items-center gap-2 font-semibold text-ink">
            <LogoMark size={20} />
            Clouta
          </span>
          <span>© {new Date().getFullYear()}</span>
          <div className="flex-1" />
          <span>Terms (coming soon)</span>
          <span>Privacy (coming soon)</span>
        </div>
      </footer>
    </>
  );
}
