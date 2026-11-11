import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import { Blip, LogoMark, SpaceLayer } from "@/components/SpaceLayer";
import { Icon, type IconName } from "@/components/Icons";

const FOUNDING_SPOTS = Number(process.env.NEXT_PUBLIC_FOUNDING_SPOTS) || 1000;

const steps: { icon: IconName; title: string; body: string }[] = [
  { icon: "user", title: "Build your shop window", body: "Link your socials, add your bio and audience, then list your services with prices." },
  { icon: "cash", title: "Brands pay, Sponzy holds it", body: "A brand buys with one tap. The money is held safely until the work is delivered." },
  {
    icon: "check",
    title: "Deliver and get paid",
    body: "Submit your proof. The brand approves, or it auto-approves after a short review window, and you get paid.",
  },
];

const badges: { name: string; tier: string; tip: string; icon: IconName; c1?: string; c2?: string; legendary?: boolean; locked?: boolean }[] = [
  { name: "Founding Creator", tier: "Legendary", tip: "Joined before launch. Never earnable again.", icon: "star", legendary: true },
  { name: "Top Rated", tier: "Epic", tip: "4.8 stars or higher across 10+ reviews.", icon: "trophy", c1: "#8A6BFF", c2: "#FF5F8F" },
  { name: "Cosmic Collab", tier: "Epic", tip: "10 collabs with repeat brands.", icon: "ufo", c1: "#7CF4E0", c2: "#6C47FF" },
  { name: "On-Time Pro", tier: "Rare", tip: "10 on-time deliveries in a row.", icon: "clock", c1: "#4DC9FF", c2: "#2563EB" },
  { name: "Verified Socials", tier: "Rare", tip: "All linked accounts confirmed.", icon: "check", c1: "#5BE584", c2: "#12905A" },
  { name: "Elite", tier: "Locked", tip: "Reach 40 collabs to unlock.", icon: "bolt", locked: true },
];

const trust: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "lock",
    title: "Money held until approved",
    body: "Brands pay up front, creators get paid when the work is approved. If something goes wrong, a refund rule applies.",
  },
  { icon: "star", title: "Reviews only from paid orders", body: "You can only review a collab that really happened, so ratings mean something." },
  {
    icon: "trophy",
    title: "Streaks and leaderboards",
    body: "Deliver on time to build a streak and climb boards for top rated, longest streak, and rising stars.",
  },
  { icon: "flag", title: "Reports and bans", body: "Report fake accounts, scams, or harassment. Our team reviews every report." },
];

const invites = [
  { n: "Invite 3", title: "Shiny avatar frame", body: "A glowing frame around your profile picture." },
  { n: "Invite 10", title: "Animated badge glow", body: "Your Founding Creator badge gets an extra shimmer." },
  { n: "Invite 25", title: "Early access", body: "Be first in line when Sponzy opens." },
];

const faqs = [
  { q: "Is it free to join the waitlist?", a: "Yes. Joining the waitlist is free, and so is listing your services. Sponzy only takes a fee when a paid collab is completed." },
  { q: "When does Sponzy launch?", a: "We're opening a private beta soon. Waitlist members get in first." },
  {
    q: "How do brands pay?",
    a: "Brands pay inside Sponzy through Stripe. The money is held and released after you deliver and the brand approves.",
  },
  {
    q: "What if there is a problem with an order?",
    a: "Either side can open a dispute. Our team reviews it and decides on a refund, a payout, or a split.",
  },
];

function HexBadge({ b, showLabel = true }: { b: (typeof badges)[number]; showLabel?: boolean }) {
  return (
    <div className={`bgd ${b.locked ? "lk" : ""}`} tabIndex={showLabel ? 0 : -1}>
      <div className="hw">
        <div
          className={`hx ${b.legendary ? "lg" : ""}`}
          style={b.c1 ? ({ "--c1": b.c1, "--c2": b.c2 } as React.CSSProperties) : undefined}
        >
          <span className="hi">
            <Icon name={b.icon} size={28} />
          </span>
        </div>
      </div>
      {showLabel && (
        <>
          <div className="bn">{b.name}</div>
          <div className="bt">{b.tier}</div>
          <div className="tip" role="tooltip">
            {b.tip}
          </div>
        </>
      )}
    </div>
  );
}

const h2 = "text-[clamp(28px,4.5vw,38px)] font-extrabold leading-[1.1] tracking-[-0.03em]";
const lead = "text-[17px] leading-[1.55] text-body sm:text-lg";
const sec = "relative z-[1] mx-auto flex max-w-[1280px] flex-col gap-9 px-4 pt-20 sm:px-10 lg:px-20 lg:pt-[90px]";

export default function Home() {
  const spots = FOUNDING_SPOTS.toLocaleString();
  return (
    <>
      <SpaceLayer />
      <Blip message="Grab your badge before they're gone!" />

      <header className="relative z-[2] mx-auto flex max-w-[1280px] items-center gap-6 px-4 py-5 sm:px-10 lg:gap-9 lg:px-20">
        <Link href="/" className="flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.04em]">
          <LogoMark size={46} />
          Sponzy
        </Link>
        <div className="flex-1" />
        <nav aria-label="Page sections" className="hidden items-center gap-6 md:flex">
          {[
            ["#how", "How it works"],
            ["#badges", "Badges"],
            ["#faq", "FAQ"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="px-1.5 py-3 text-[15px] font-bold text-body hover:text-violet">
              {label}
            </a>
          ))}
        </nav>
        <a href="#join" className="btn min-h-11 px-4 text-sm">
          Claim your badge
        </a>
      </header>

      <main>
        {/* Hero */}
        <section className={`${sec} !pt-8 lg:!pt-[50px] lg:flex-row lg:items-center lg:gap-[60px]`}>
          <div className="rise flex flex-1 flex-col gap-6">
            <span className="badge-gold self-start rounded-full px-3 py-1.5 text-xs font-bold">
              Launching soon · Founding Creator spots are limited
            </span>
            <h1 className="text-[clamp(40px,7vw,68px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Get paid for your collabs. <span className="text-violet">Skip the chasing.</span>
            </h1>
            <p className={lead}>
              Sponzy is a shop window for creators. List your services, brands pay securely, and the money is yours once the
              work is approved.
            </p>
            <div id="join" className="scroll-mt-24">
              <WaitlistForm id="email-hero" />
            </div>
            <p className="text-[13px] font-semibold text-ink-2">
              Free to join. Only the first {spots} creators get the Founding Creator badge.
            </p>
            <ul className="flex flex-wrap gap-x-[22px] gap-y-2">
              {["Payment held securely", "Reviews from real orders only", "Reports and bans keep it safe"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-[#1F9D63]">
                    <Icon name="check" size={18} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Example profile card */}
          <div className="rise rise-2 relative mx-auto w-full max-w-[420px] lg:w-[420px]" aria-label="Example creator shop window">
            <div className="rb">
              <div className="lc overflow-hidden !gap-0 !p-0">
                <div className="h-[100px] bg-[radial-gradient(circle_at_82%_25%,rgba(255,200,61,.55),transparent_38%),linear-gradient(120deg,#241660,#6C47FF_58%,#FF5F8F)]" />
                <div className="flex flex-col gap-3 px-[22px] pb-[22px]">
                  <div className="-mt-6 flex items-end gap-3">
                    <div
                      aria-hidden="true"
                      className="grid size-[68px] place-items-center rounded-[20px] border-[3px] border-white bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,.5)_0_13%,transparent_14%),linear-gradient(135deg,#6C47FF,#FF5F8F)] text-[22px] font-extrabold text-white shadow-[0_6px_14px_rgba(27,27,38,.14)]"
                    >
                      MR
                    </div>
                    <div className="pb-1">
                      <p className="text-lg font-bold">Maya Rivera</p>
                      <p className="text-xs font-semibold text-ink-2">Fitness · 4.9 ★ · 12-order streak</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge-gold rounded-full px-2 py-0.5 text-[11px] font-bold">Founding Creator</span>
                    <span className="badge-violet rounded-full px-2 py-0.5 text-[11px] font-bold">Top Rated</span>
                    <span className="badge-violet rounded-full px-2 py-0.5 text-[11px] font-bold">On-Time Pro</span>
                  </div>
                  {[
                    ["TikTok video", "5 day turnaround", "$120"],
                    ["Story shoutout", "2 day turnaround", "$45"],
                  ].map(([name, meta, price]) => (
                    <div key={name} className="flex items-center gap-2.5 rounded-[12px] bg-black/[.03] px-3 py-2.5">
                      <div className="flex-1">
                        <p className="text-sm font-bold">{name}</p>
                        <p className="text-[11px] text-ink-2">{meta}</p>
                      </div>
                      <b>{price}</b>
                      <span aria-hidden="true" className="btn !min-h-9 px-3.5 text-[13px]">
                        Pay
                      </span>
                    </div>
                  ))}
                  <p className="rounded-[12px] bg-ok-bg px-3.5 py-2.5 text-xs font-bold text-[#1F7A55]">
                    Payment held securely until delivery is approved
                  </p>
                </div>
              </div>
            </div>
            <div className="float absolute -right-2 -top-11 sm:-right-[34px]" aria-hidden="true">
              <HexBadge b={badges[0]} showLabel={false} />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className={`${sec} scroll-mt-4`}>
          <h2 className={h2}>How Sponzy works</h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="lc">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-[14px] bg-[#F0ECFF] text-[#4A2FD0]">
                    <Icon name={s.icon} />
                  </span>
                  <b className="text-[13px] tracking-[.08em] text-ink-2">STEP {i + 1}</b>
                </div>
                <h3 className="text-xl font-extrabold tracking-[-0.02em]">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-body">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Badges */}
        <section id="badges" className={`${sec} scroll-mt-4 lg:flex-row lg:items-center lg:gap-[60px]`}>
          <div className="flex flex-1 flex-col gap-[18px]">
            <h2 className={h2}>Earn your place. Show it off.</h2>
            <p className={lead}>
              Every badge comes from real behavior: on-time deliveries, great reviews, repeat brands. Founding Creator is the
              one badge you can never earn later.
            </p>
            <span className="badge-gold self-start rounded-full px-3 py-1.5 text-xs font-bold">
              Waitlist members get it permanently
            </span>
          </div>
          <div className="lc flex-[1.1] !px-5 !py-[34px]">
            <div className="flex flex-wrap justify-center gap-x-1 gap-y-[26px] pt-10">
              {badges.map((b) => (
                <HexBadge key={b.name} b={b} />
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className={sec}>
          <h2 className={h2}>Built so everyone can trust the deal</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {trust.map((t) => (
              <div key={t.title} className="lc !flex-row items-start !gap-4">
                <span className="grid size-12 flex-none place-items-center rounded-[14px] bg-[#F0ECFF] text-[#4A2FD0]">
                  <Icon name={t.icon} />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold tracking-[-0.02em]">{t.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.55] text-body">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Invites */}
        <section className={sec}>
          <div className="flex flex-col gap-4">
            <h2 className={h2}>Invite friends, move up the list</h2>
            <p className={`${lead} max-w-[640px]`}>
              Every friend who joins with your link moves you closer to the front and unlocks extras. Invite links arrive in
              your welcome email.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {invites.map((v, i) => (
              <div key={v.n} className={`lc ${i === 0 ? "!border-[1.5px] !border-violet" : ""}`}>
                <p className="text-[13px] font-extrabold uppercase tracking-[.08em] text-ink-2">{v.n}</p>
                <h3 className="text-[19px] font-extrabold tracking-[-0.02em]">{v.title}</h3>
                <p className="text-sm leading-[1.55] text-body">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`${sec} scroll-mt-4`}>
          <h2 className={h2}>Questions</h2>
          <div className="flex max-w-[820px] flex-col gap-3">
            {faqs.map((f) => (
              <details key={f.q} className="faq">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={`${sec} pb-12`}>
          <div className="flex flex-col justify-center gap-5 rounded-[28px] bg-[radial-gradient(circle_at_85%_20%,rgba(255,95,143,.45),transparent_40%),radial-gradient(1.5px_1.5px_at_15%_25%,#fff,transparent_100%),radial-gradient(1.5px_1.5px_at_40%_75%,#fff,transparent_100%),radial-gradient(1.5px_1.5px_at_62%_30%,#fff,transparent_100%),linear-gradient(130deg,#1C1250,#4B2FD0)] px-6 py-10 text-white sm:px-[60px] sm:py-[50px]">
            <h2 className="text-[clamp(30px,5vw,44px)] font-extrabold leading-[1.1] tracking-[-0.03em]">
              Claim your Founding Creator badge
            </h2>
            <p className="max-w-[560px] text-lg leading-[1.55] text-[#E4DEFF]">
              Join the waitlist and keep the rarest badge on Sponzy forever.
            </p>
            <WaitlistForm id="email-bottom" dark />
          </div>
        </section>
      </main>

      <footer className="relative z-[1] mx-auto flex max-w-[1280px] flex-wrap gap-x-6 gap-y-2 px-4 pb-9 pt-5 text-[13px] font-semibold text-ink-2 sm:px-10 lg:px-20">
        <span>Sponzy · {new Date().getFullYear()}</span>
        <div className="flex-1" />
        <span>Terms (coming soon)</span>
        <span>Privacy (coming soon)</span>
      </footer>
    </>
  );
}
