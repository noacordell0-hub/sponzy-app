# Clouta Build Spec v1

> **Name change (Nov 2026):** the product was renamed from Sponzy to **Clouta** after a legal check found "Sponzy" was taken. Use "Clouta" in all user-facing text. The prototype files in `design/prototype/` still say Sponzy; ignore that. Some infrastructure names (GitHub repo `sponzy-app`, Vercel project/team, the sponzy-app.vercel.app address) still use the old name until they are renamed.

Nov 11, 2026 · @noah

## Progress

- [x] Layer 0 code: Next.js app, waitlist landing page, `waitlist` table migration (`supabase/migrations/0001_waitlist.sql`), `/api/waitlist` route.
- [x] Layer 0 deploy: live at https://clouta.vercel.app (old address sponzy-app.vercel.app still works; Vercel project `sponzy-app`, team `sponzy`), Supabase project `izsdilnqktjrdiknrkge`. Migrations 0001 and 0002 applied. Signups verified end to end. Migration 0003 adds waitlist referrals: each signup gets a referral_code, ?ref=CODE links credit the referrer, each referral moves them up 5 places, inviting 3 = first beta wave. Place in line comes from waitlist_status() (server only).
- [x] Legal pages (waitlist stage, US): `/privacy` and `/terms`. Drafts written for the waitlist only; get a lawyer to review, and replace with full marketplace terms before Layer 4 payments. Contact email comes from `NEXT_PUBLIC_CONTACT_EMAIL` (not set yet; a placeholder sentence shows until it is).
  Commitments these pages make, which later layers must honour: every marketing email has an unsubscribe link; data access/correction/deletion requests answered within 30 days; no selling or ad-sharing of personal data; delete waitlist data if Clouta does not launch; ask for date of birth at account signup (13+, guardian for payouts under 18); notify waitlist by email of significant policy or perk changes.
- [ ] Layers 1 to 5 (see Build order).

Working notes for Claude Code:
- Prototype screens live in `design/prototype/` (10 of 25 so far, including Landing). Use them as the visual reference. The logo is in `src/components/Logo.tsx`, the space backdrop in `src/components/Backdrop.tsx`, icons into `src/components/Icons.tsx`. The landing page matches `Landing.html`; its Deep space toggle comes in Layer 1 as a saved per-user setting.
- The Checkout prototype shows card fields, but per this spec card details are collected only on Stripe's hosted Checkout page: build /checkout/[service] as the service, brief and summary form, then redirect to Stripe.
- Server-only code uses `src/lib/supabase-server.ts`. Never import secrets into client components.
- Database changes go in numbered files under `supabase/migrations/`, each enabling Row Level Security.

## Overview

Clouta is a web app where creators sell brand collabs from one shop-window post, brands pay up front, and Clouta holds the money until the work is approved.

- Creators: link socials, list services with prices, deliver, get paid, build trust (reviews, badges, streaks, leaderboard).
- Brands: find creators, pay securely, approve work, review creators.
- Clouta: holds payments, takes a fee, handles reports and disputes.

MVP goal: a working beta for 20 to 30 creators and a few brands, running real paid collabs, on free-tier tools for about $20 a month (Claude Pro only). Desktop web first, usable on phones.

The clickable prototype (25 screens) is the visual reference for every screen named below.

## Decisions to make before coding

Three answers are still open; the build uses the placeholders until you fill them in.

| Decision | Placeholder | Suggested default |
|---|---|---|
| Clouta fee and who pays it | [YOUR FEE] | 10% from the creator plus a small brand fee, so small orders still cover card costs |
| Can under-18 creators join? | **Decided: yes.** Brands should be able to promote young entrepreneurs. | Ages 13+ can join (birth date at sign-up; under 13 blocked, per COPPA and the social platforms). Ages 13-17: a parent or guardian owns the Stripe payout account (Stripe requires an adult) and is copied on order emails. Optional public "Young entrepreneur" tag. Never show a minor's exact age or location publicly. Get legal review before public launch. |
| Founding Creator spots | [1,000] | First 500 to 1,000 waitlist signups. **Promised publicly: Founding Creators pay half the standard Clouta fee, for life.** Honour this in Layer 4 fee logic (profiles.is_founding). |
| App address | clouta.vercel.app (live) | Free subdomain now; buy a domain at public launch |

The review window (3 days), included revision (1), and double-blind reveal (14 days) are set below and can change.

## Tech stack and setup

Everything runs on free tiers except Claude Pro ($20/month).

| Piece | Tool | Cost to start |
|---|---|---|
| Coding | Claude Code (Claude Pro) | $20/month |
| App framework | Next.js + TypeScript + Tailwind CSS | $0 |
| Database, logins, file storage | Supabase Free (Postgres, Auth, Storage, Row Level Security) | $0 |
| Payments and payouts | Stripe Connect (Express accounts, hosted Checkout and onboarding) | $0/month, fees per order |
| Hosting | Vercel Hobby | $0 |
| Code storage | GitHub | $0 |
| Email (login links, alerts) | Supabase Auth emails to start | $0 |

Setup checklist
- [ ] Install Node.js (LTS) and Git on your computer
- [ ] Create free GitHub, Supabase, Vercel, and Stripe accounts
- [ ] Turn on Stripe test mode; do not use real money until the beta
- [ ] Install Claude Code and log in with your Claude Pro account
- [ ] Keep all keys in a .env.local file that is never committed to GitHub

Never handle card numbers in Clouta's own code: Stripe's hosted pages collect them.

## Data model

Twelve Supabase tables cover the MVP; every table uses Row Level Security so users only see what they should.

| Table | Key fields |
|---|---|
| profiles | id, role (creator/brand/admin), display_name, handle, bio, tagline, audience, niches[], theme, avatar_source, avatar_url, location, taking_bookings, is_founding, banned_at |
| social_accounts | profile_id, platform, handle, followers, verified, is_main (most followers = photo source) |
| posts | creator_id, bio, platforms[], published (one per creator) |
| services | post_id, name, price_cents, turnaround_days, includes, revisions, is_bundle |
| orders | brand_id, creator_id, service_id, price_cents, fee_cents, brief, post_by, status, stripe_payment_intent, proof_links[], submitted_at, approved_at, auto_approve_at |
| messages | order_id or thread_id, sender_id, body, kind (text/offer/system), created_at |
| reviews | order_id, author_id, subject_id, overall, quality, communication, timeliness, value, body, tags[], would_rehire, private_note, revealed_at |
| review_replies, review_votes | review_id, author_id, body / voter_id |
| comments | creator_id, author_id, parent_id, body, likes |
| badges, profile_badges | code, name, tier / profile_id, badge_id, earned_at |
| reports | reporter_id, target_id, reason, details, screenshot_url, status |
| disputes | order_id, opened_by, reason, statement, evidence[], response, decision, split_pct, decided_by |

Trust score, streaks, and leaderboard ranks are computed from orders and reviews (a database view or nightly job), not typed in.

## Order flow and money rules

Every order moves through fixed statuses, and money only leaves Clouta's Stripe balance on approval or a dispute decision.

1. Ordered: brand picks a service, writes a brief, sets a post-by date.
2. Funded: brand pays through Stripe Checkout; funds are held on the platform (separate charges and transfers).
3. In progress: creator works; chat stays attached to the order.
4. Proof submitted: creator adds live-post links and checks off deliverables; auto_approve_at = now + 3 days.
5. Approved: brand approves, or the timer passes; Clouta transfers price minus fee to the creator's Connect account.
6. Paid: payout reaches the creator's bank on Stripe's schedule; both sides are asked for a review.

Branches
- Revision: brand can request 1 included revision before approving; the timer restarts on resubmission.
- Missed deadline: no proof by the post-by date lets the brand cancel for a full refund or extend.
- Dispute: either side opens one before approval; the timer pauses, the other side has 48 hours to respond, then an admin refunds, pays, or splits.
- Cancel before work starts: full refund to the brand.

All status changes happen in server code (Next.js route handlers and Stripe webhooks), never in the browser.

## Trust system

Trust comes only from completed, paid orders, and both creators and brands are scored.

Reviews
- Only the two sides of an approved order can review each other, once each.
- Double-blind: a review stays hidden until both submit, or 14 days pass.
- Overall stars plus category stars, quick tags, would-rehire, optional private note to Clouta.
- The subject can reply publicly but cannot edit or delete a review; anyone can mark one helpful or report it.

Trust score (0 to 100), starting weights to tune later

| Signal | Weight |
|---|---|
| On-time delivery rate (creators) or paid-on-time rate (brands) | 30% |
| Average rating | 30% |
| Disputes lost (fewer is better) | 15% |
| Repeat partners | 10% |
| Reply time | 10% |
| Identity and socials verified | 5% |

Tiers: under 50 New, 50 to 79 Trusted, 80+ Highly trusted. Show "New" until 3 completed orders.

Badges, streaks, leaderboard
- Badges are awarded by rules (Founding Creator at signup before launch; Verified Socials; Top Rated 4.8+ over 10 reviews; On-Time Pro 10 on time in a row; Hot Streak; Cosmic Collab; Elite at 40 collabs; 50 Collabs).
- Streak = consecutive orders approved on time with no dispute; a late or disputed order resets it.
- Leaderboard boards: Top rated (minimum 5 reviews), Longest streak, Rising stars (accounts under 90 days); week, season, all time. Orbit levels Comet to Supernova come from points earned per completed order.

## Safety, disputes, and admin

At launch you review every report and dispute by hand in a team-only admin panel.

- Report: on profiles, posts, reviews, comments, and messages; reasons: spam or fake, scam or non-payment, harassment, fake reviews, impersonation, other; optional details, screenshot, and block.
- Auto-flag, never auto-ban: 3+ reports from different users within 7 days hides the account from Browse and moves it to the top of the queue.
- Consequences: warning, then temporary suspension, then permanent ban; scams and impersonation skip straight to a ban.
- Banned mid-order: active orders are refunded to the brand and the other side is told.
- Ban evasion: block re-signup with the same email, phone, or linked social handles.
- Admin panel: report queue, open disputes with both statements, chat and proof, a refund / pay / split control, and ban tools. Only role = admin can open it, enforced on the server.
- Messages: contact details are allowed, but a gentle notice reminds users that payments outside Clouta are not protected.

## Screens

Each page below matches a screen in the prototype; build them in the layer shown.

| Route | Prototype screen | Layer |
|---|---|---|
| / | Waitlist landing page | 0 |
| /signup, /login, /onboarding | Sign up, Log in, Connect socials | 1 |
| /browse | Browse + Search filters | 2 |
| /c/[handle] | Creator profile (incl. community comments) | 2 |
| /post/edit | Create post | 2 |
| /settings/account, /settings | Account and avatar, Settings | 1 |
| /b/[handle], /brand | Brand public profile, Brand dashboard | 2 |
| /messages | Messages | 3 |
| /checkout/[service] | Brand checkout | 4 |
| /orders/[id], /orders/[id]/deliver | Order status, Submit proof | 4 |
| /earnings | Earnings and payouts | 4 |
| /orders/[id]/review, /c/[handle]/reviews | Leave a review, Reviews and trust score | 5 |
| /leaderboard | Leaderboard | 5 |
| /report, dispute dialog | Report and dispute | 5 |
| /admin | Admin panel (team only) | 5 |
| (shared) | Empty and error states | all |

Every page must work at phone width, following the two phone screens.

## Style guide

Clean and professional, with a light cosmic touch in the background. The prototype screens are more playful than the product should be: follow their layout and content, but use this calmer style.

| Token | Value |
|---|---|
| Background (light) | Lavender gradient #FAF8FF to #F2F0FB with faint violet, pink, and blue glows |
| Background (deep space) | #0B0A1E to #14103A with brighter stars; a saved per-user setting |
| Text | #15131F; secondary #6B6B7B; body #4B4B5A |
| Primary | Violet #6C47FF; buttons #7655FF to #5B3DF5 |
| Reward accent | Gold #FFC83D (text on light: #7A5200) |
| Success / error | #18794E on #E8F8F0 / #B3262B on #FDECEC |
| Font | Plus Jakarta Sans 500, 700, 800 |
| Radius | Cards 20px, inner rows 14px, buttons 12px |
| Cards | White at 90% opacity, 1px hairline border, soft two-layer shadow |

- **Design direction (updated Nov 2026): professional first.** Clean SaaS layout: white and near-white (#FBFAFF) sections divided by hairlines, 16px card radius, restrained shadows, violet as the single accent, eyebrow labels over section headings. No mascots or cartoon elements.
- Motion: subtle page rise-in and hover lifts only; all off under reduced motion.
- Space layer: a page-wide twinkling starfield and frequent shooting stars (`src/components/Backdrop.tsx`), with low-opacity planets (about 15-25%) in the hero. Light sections use translucent white (bg-white/70) so the stars show through.
- Intro screen: a 2-second branded load-in (`src/components/Intro.tsx`), pure CSS, shown once per browser session and skipped under reduced motion. Never behind checkout, money or dispute controls. Blip the alien and the UFO have been removed and should not be added back.
- Badges: flat hexagons with static gradients; no spinning rainbow outlines.
- Accessibility: 4.5:1 text contrast, 44px touch targets, visible focus outlines, real buttons and labels.

## Build order

Build one layer at a time, test it, commit to GitHub, then start the next.

- [x] Layer 0, project and waitlist: "Read CLAUDE.md. Create a Next.js + TypeScript + Tailwind app connected to Supabase. Build the waitlist landing page from the prototype, saving emails to a waitlist table, and deploy it to Vercel. Explain each step as you go."
- [ ] Layer 1, accounts: "Add Supabase Auth sign up and log in, the onboarding flow, profiles and social_accounts tables with Row Level Security, and the Account and Settings pages."
- [ ] Layer 2, marketplace: "Add posts and services, the creator profile, brand profiles and dashboard, and Browse with search and filters."
- [ ] Layer 3, messages: "Add order and direct message threads using Supabase Realtime, with offer and system messages."
- [ ] Layer 4, payments: "Add Stripe Connect Express onboarding, Checkout with funds held on the platform, the order statuses, Submit proof, a 3-day auto-approve job, transfers on approval, refunds, and the Earnings page. Use Stripe test mode and webhooks with signature checks."
- [ ] Layer 5, trust and safety: "Add double-blind reviews, trust score, badges, streaks, leaderboard, community comments, reports, disputes, and the admin panel."
- [ ] Before the beta: ask Claude Code to review security and Row Level Security on every table, test every flow in Stripe test mode, then switch to live keys.

The prototype is the visual reference: share the prototype link or screenshots with Claude Code when building each screen.
