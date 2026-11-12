# Clouta optimization report (pass 1)

Branch: `optimize-pass-1` (not merged; the live site is unchanged until you merge it).
Date: November 12, 2026. Everything here was done in Stripe **test mode**; no production data was changed or deleted. The only database changes are the three you approved: waitlist source columns, `error_events` and `analytics_events`.

---

## 1. Executive summary (plain English)

- **The site was already in good shape.** It loads fast, nothing jumps around while it loads, accessibility scored 100 on most pages, and nothing secret is exposed.
- **The Stripe payout bug was already fixed** before this pass, by moving payout setup to Stripe Accounts v2. It was tested end to end in test mode, including a $90 payout and a full refund.
- **You can now see what's happening.**
  - Vercel Analytics and Speed Insights are installed.
  - Every important click and form step sends an event.
  - Each signup records where it came from (TikTok, an invite link, Instagram and so on).
  - Server and browser errors are saved for good. Vercel's own logs vanish after 1 hour.
  - A new **Admin → Metrics** page shows signups per day, sources, referrals, top inviters, Founding spots left and recent errors.
- **Real bugs found:**
  1. **High:** "each friend moves you up 5 spots" actually moves people up only **4** when there's a tie. A fix is ready and needs your approval.
  2. **Medium:** with JavaScript off, the signup form put the email address in the page address and saved nothing. Fixed.
  3. **Critical (security):** Next.js 15.5.9 had known security problems. Upgraded to 15.5.29.
- **Safer:**
  - Rate limits on signup, login, login emails, Stripe and checkout.
  - Security headers that block clickjacking and limit what can load.
  - A full scan for leaked keys found nothing, so no keys need changing.
- **Faster:** the landing page loads **38% less JavaScript** (182 KB → 112 KB).
- **Search and sharing:**
  - Your own favicon and app icons (it was showing the Next.js default).
  - A designed 1200×630 share image.
  - Sitemap, robots file, canonical links and FAQ structured data for Google.
- **Accessibility:** 0 serious or critical problems on every public page. Tap targets are now at least 44px and every element shows a keyboard focus outline.
- **Tests:** 150 automated browser tests pass on desktop, iPhone and Android screen sizes. Run them with `npm run test:e2e`.
- **Data so far:** only 3 waitlist signups (likely your own tests), so there are no trends yet. The tracking above will start filling in once this branch is merged and Analytics is switched on.

---

## 2. Every issue found (most important first)

Status: **Fixed** (on the branch) · **Needs approval** (ready, waiting for you) · **Recommended** (later or optional) · **You** (only you can do it)

| # | Severity | Area | What's wrong | Where | Status |
|---|---|---|---|---|---|
| 1 | Critical | Security | Next.js 15.5.9 had published critical advisories (cache poisoning, middleware bypass, DoS, SSRF) | `package.json` | **Fixed**: 15.5.29 |
| 2 | High | Payments | Stripe Accounts v1 blocked creator payout setup | `src/lib/stripe-v2.ts`, `src/app/api/stripe/onboard/route.ts` | **Fixed** (before this pass, tested in test mode) |
| 3 | High | Waitlist | One invite moves you up 4 spots, not the promised 5, because ties go to the earlier signup. Tested: #13 → #9 instead of #8. "Exactly once" works: a duplicate email is blocked | `waitlist_status()`; fix in `supabase/migrations/0023_waitlist_rank_fix.sql` | **Fixed** (approved and applied; re-tested: #13 → #8 → #3) |
| 4 | High | Analytics | No traffic data at all (Analytics was off) | `src/app/layout.tsx` | **Fixed** in code; **You**: click Enable in Vercel (section 6) |
| 5 | High | Legal | Terms of Use cover only the waitlist, but checkout, payouts, disputes and reviews now exist | `src/app/terms/page.tsx` | **You** + lawyer, before the beta |
| 6 | High | Legal | Privacy Policy says "When payments launch, Stripe will process…", which is out of date | `src/app/privacy/page.tsx:63` | **You** + lawyer (update with the Terms) |
| 7 | Medium | Monitoring | Server errors disappear after 1 hour on Vercel Hobby | new `src/lib/log.ts`, `src/instrumentation.ts`, `error_events` | **Fixed** |
| 8 | Medium | Waitlist | With JavaScript off, submitting put the email in the URL and saved nothing | `src/components/WaitlistForm.tsx`, `src/app/api/waitlist/route.ts` | **Fixed** (form posts properly, server redirects back) |
| 9 | Medium | Security | No rate limits on waitlist, password login, login emails, Stripe or checkout | `src/lib/rate-limit.ts` + routes | **Fixed** |
| 10 | Medium | Security | No security headers (CSP, frame-ancestors, HSTS, referrer and permissions policies) | `next.config.ts` | **Fixed** |
| 11 | Medium | Performance | Landing page loaded the whole Supabase library just to choose between "Log in" and "Open Clouta" | `src/components/LandingAuthLinks.tsx` | **Fixed**: 182 → 112 KB JavaScript |
| 12 | Medium | Security | `waitlist` and `app_config` still have Supabase's default table permissions. Row-level security blocks everything today (checked: visitors get an empty list), but a future rule mistake could expose emails | `supabase/migrations/0024_revoke_default_grants.sql` | **Fixed** (approved and applied) |
| 13 | Medium | Auth | Leaked-password protection is off in Supabase | Supabase dashboard | **You**: Authentication → Sign In / Providers → Email → turn on leaked password protection |
| 14 | Medium | Testing | Preview deployments have no Supabase or Stripe settings, so database features can't be tested before merging | Vercel → Settings → Environment Variables | **Recommended**: add Preview values (Stripe **test** keys only) |
| 15 | Medium | Promise | "Invite 3 friends to get into the first beta wave": nothing invites people automatically yet. The Metrics page shows who has 3+ invites | `src/components/WaitlistForm.tsx` | **You**: invite those people by hand when the beta opens |
| 16 | Medium | Conversion | Brands have no way to join the waitlist (the form is creator-only) | `src/app/page.tsx` | **Recommended** (CRO idea 6) |
| 17 | Low | Honesty | The hero "Maya Rivera" storefront is example data but wasn't visibly labelled | `src/app/page.tsx` | **Fixed**: visible "Example" tag |
| 18 | Low | Transparency | FAQ didn't mention the brand's 3% + 30¢ processing fee | `src/app/page.tsx` (FAQ "How do brands pay?") | **Fixed** |
| 19 | Low | SEO | Favicon was the Next.js default; no share image, sitemap, robots, canonical links or structured data | `src/app/*` | **Fixed** |
| 20 | Low | Accessibility | Tap targets under 44px (logo 33px, sliders 16px, footer links ~36px) | `src/app/page.tsx`, `EarningsCalculator.tsx` | **Fixed** |
| 21 | Low | Accessibility | Browse follower-tier labels had low contrast (3.85:1, needs 4.5:1) | `src/app/browse/BrowseFilters.tsx` | **Fixed** |
| 22 | Low | Performance | Avatar images had no size (could shift layout) and weren't lazy-loaded | `src/components/Avatar.tsx` | **Fixed** |
| 23 | Low | Security | `postcss` advisory inside Next.js (build-time only, not reachable by visitors). Fix requires Next 16 | dependency | **Recommended** (upgrade later) |
| 24 | Low | Database | 37 row-level security rules re-check `auth.uid()` for every row (slow at scale), and 17 foreign keys have no index | Supabase performance advisor | **Recommended** before you have thousands of rows |
| 25 | Low | Config | Founding spots: the landing page reads `NEXT_PUBLIC_FOUNDING_SPOTS`, but onboarding has 1000 written into the database function. Change one and they disagree | `src/lib/site.ts`, `complete_onboarding()` | **Recommended**: keep both at 1000, or make the database read one setting |
| 26 | Low | Rate limits | Limits are kept in each server's memory (best effort). Signups also have a database-wide burst guard | `src/lib/rate-limit.ts` | **Recommended** if abused: Cloudflare Turnstile or Upstash |
| 27 | Info | Naming | The Vercel project is still named "sponzy-app" | Vercel | Noted. Not renamed (your call) |
| 28 | Info | Performance | The intro animation (you asked for it) delays the "fully drawn" moment, which lowers Lighthouse's Speed Index | `src/components/Intro.tsx` | Kept. Option: show once per browser instead of once per visit |

Checked and fine:
- **Stripe webhooks:**
  - Signatures are checked (both secrets).
  - Repeat deliveries are safe: an order is only marked paid if it was still waiting for payment, and refunds are skipped if the order is already refunded.
  - Transfers and refunds have idempotency keys, so a retry never pays or refunds twice.
  - Errors return 500, so Stripe retries.
- **Other checks:**
  - No secret keys in the code or git history.
  - Only public `NEXT_PUBLIC_` values reach the browser.
  - Admin pages are checked on the server.
  - No hydration errors or blocked resources on any public page.

---

## 3. Lighthouse and accessibility scores

Scores are performance / accessibility / best practices / SEO.
- **Before:** the live site, measured through this sandbox's network.
- **After:** the branch running locally.

Local runs have no Vercel CDN, so compare the scores, not the loading seconds. Measure again on the live site after merging (Speed Insights will also show real visitors).

| Page | Mobile before | Mobile after | Desktop before | Desktop after |
|---|---|---|---|---|
| `/` | 83–93 / 100 / 100 / 100 | 93 / 100 / 96* / 100 | 98 / 100 / 100 / 100 | 99 / 100 / 96* / 100 |
| `/browse` | 93 / 100 / 100 / 100 | 94 / 100 / 96* / 100 | 96 / **96** / 100 / 100 | 98 / **100** / 96* / 100 |
| `/login` | 96 | 97 | 97 | 99 |
| `/signup` | 94 | 97 | 94 | 99 |
| `/terms` | 97 | 98 | 98 | 99 |
| `/privacy` | 98 | 98 | 98 | 99 |
| `/leaderboard` | 96 | 96 | 95 | 97 |

\*Best practices shows 96 only locally, because Vercel's analytics scripts don't exist off Vercel. On the live site it stays 100.

- **Speed metrics:**
  - Layout shift (CLS): 0 on every page, before and after (target under 0.1).
  - Main content shows up (LCP) in 1.2–2.3 s on mobile for the live site (target under 2.5 s).
  - Landing-page JavaScript blocking time on mobile: 250–450 ms before, 230 ms after.
- **Accessibility (axe, WCAG 2.1 AA):**
  - 0 serious or critical issues on all 7 public pages, at desktop, iPhone and Android sizes.
  - Keyboard: every focusable element shows a focus outline, and the sliders and FAQ work with the keyboard.
  - Every page has exactly one h1 with no skipped heading levels, and all images have alt text.
  - Logged-in pages weren't scanned, because that needs test accounts in your live database.

---

## 4. Analytics events added

Every event goes to **Vercel Web Analytics** and to your own **`analytics_events`** table. Vercel shows custom events only on paid plans (as far as I know), so your table keeps the funnel visible for free. No emails or names are ever sent.

| Event | When | Extra details |
|---|---|---|
| `landing_view` | Landing page opened | source (UTM) |
| `cta_click` | Any "Join / Claim my spot" button | `location`: nav / founding / sticky_mobile, plus `target` |
| `nav_click` | Header and footer links | `target`: how / trust / faq / browse / login / terms / privacy |
| `faq_opened` | An FAQ answer opened | `question`: free / launch / payments / problems / move_up / young |
| `waitlist_submit` | Signup button pressed | `location`: hero / footer, `referred` |
| `waitlist_success` | Signup saved | `location`, `returning` (already on the list), `referred` |
| `waitlist_error` | Signup failed | `reason`: empty / invalid_email_client / invalid_email / rate_limited / network / http_5xx |
| `referral_signup` | Someone signed up through an invite link | `referrer` (invite code, not an email) |
| `invite_link_copied` / `invite_link_shared` | Invite link copied or shared | `method` |
| `earnings_calculator_used` | Sliders stopped moving for ~1 second | price, deals, yearly (grouped into ranges) |
| `browse_view`, `login_view`, `signup_view` | Those pages opened | browse: filtered, results, signed_in |
| `stripe_onboard_start` / `_success` / `_error` | Creator payout setup | resume, stage (active / pending_review / incomplete / link_expired), status |
| `checkout_start`, `review_submitted`, `dispute_opened` | Key app actions | from, role, rating, reason |

- **Where visitors come from:** saved on the first visit (kept for 90 days) and attached to every event and waitlist signup:
  - `utm_source` / `utm_medium` / `utm_campaign` if your link has them,
  - otherwise "invite / referral" for invite links,
  - otherwise the site that linked to you (for example instagram.com).
- **Tip:** tag links you share, for example `https://clouta.vercel.app/?utm_source=tiktok&utm_medium=bio&utm_campaign=launch`.
- **Errors:** server crashes, API errors and browser errors go to `error_events`, with secrets and emails removed. They show at the bottom of Admin → Metrics.
- **Uptime check:** `/api/health` reports whether the app and database are up, with no secrets.

---

## 5. Data findings (read-only)

- **Waitlist:**
  - 3 signups (Nov 11: 2, Nov 12: 1), all creators, all Gmail, all straight from the landing page.
  - 0 invites used, and nobody has 3 invites yet.
  - 0 duplicates, 0 invalid or disposable emails, no bursts. These are most likely your own tests.
- **Accounts:** 3 signed-up users (2 creators, 1 brand), all finished onboarding. 0 published shops, 0 orders.
- **Drop-off:** not measurable yet, because there were no events before this branch. The funnel on Admin → Metrics will show it after merge:
  landing view → CTA click → waitlist submit → success → invite copied → referral signup.
- **Missing data, now being collected:** traffic and devices (Vercel Analytics), signup source (UTM), funnel steps.
- **Still missing:** a way for brands to show interest (see CRO idea 6).
- **Database:**
  - 27 tables, all with row-level security on.
  - Private tables (waitlist, errors, analytics, reports, orders and so on) are unreadable to visitors; checked with read-only requests.
  - Supabase security advisor: leaked-password protection is off (issue 13). The rest is intended: functions that check permissions themselves, and private tables with no access rules.
  - Supabase performance advisor: see issue 24.

---

## 6. How to check this yourself

**Turn on analytics (2 minutes, after merging):**
1. Go to vercel.com and open the **sponzy-app** project.
2. Click the **Analytics** tab, then **Enable**. You'll see visitors, pages, countries, devices and referrers.
3. Click the **Speed Insights** tab, then **Enable**. You'll see real-visitor loading speed for each page.
4. Under Analytics → **Events** (paid plans) you'll see the custom events. On the free plan, use Admin → Metrics instead.

**Your own dashboard:**
- Log in at https://clouta.vercel.app, open your profile menu, choose **Admin → Metrics**.

**Raw data in Supabase:**
- Go to supabase.com, open your project, then **Table Editor**:
  - `waitlist`: each signup with its `utm_source` / `utm_medium` / `utm_campaign`.
  - `analytics_events`: every funnel event.
  - `error_events`: saved errors.

**Errors as they happen:**
- Vercel → sponzy-app → **Logs**. These are kept 1 hour on the free plan; the saved copies are in `error_events`.

**Is the site up?**
- Open https://clouta.vercel.app/api/health. It should show `"ok": true`.

**Run the tests:**
```bash
npm run build
```
```bash
npm run test:e2e
```

**Merge the branch:**
- On GitHub, open a pull request from `optimize-pass-1` into `main`, check the Vercel preview, then merge. Vercel deploys automatically.

---

## 7. Conversion ideas (CRO)

**As a skeptical creator:**
- "Is this real? It's a waitlist with an example profile." The example is now labelled.
- "What's the fee?" Half of what?
- "When do I actually get in?"
- "Who are the brands?" There's no brand logo or count yet.
- "Why give my email?"

**As a skeptical brand:**
- "Where do I sign up?" Brands only see "Browse creators".
- "What does it cost me?" The 3% + 30¢ fee is now in the FAQ.
- "How do I know creators are real?" Verified socials and trust scores exist but are only explained low on the page.

| # | Idea | Hypothesis | Metric (event) | How to measure |
|---|---|---|---|---|
| 1 | **Sticky "Claim my Founding spot" bar on phones** (built, **off**) | Phone visitors who scroll past the hero lose the form; a sticky bar brings them back | `waitlist_submit` ÷ `landing_view` on mobile; `cta_click` with location=sticky_mobile | A/B test `sticky_mobile_cta`, 50/50, about 2 weeks or 300+ phone visitors per side |
| 2 | **Live "X Founding spots left" counter** from real data (built, **off**) | Real scarcity increases urgency without fake numbers | `waitlist_success` ÷ `landing_view` | A/B test `live_spots_counter`, 50/50 |
| 3 | Put the fee in numbers: "10% → **5%** for Founding Creators" | "Half fees" is vague; a number is more convincing | `waitlist_submit` rate; fewer `faq_opened` (free) | A/B test on the hero sub-line |
| 4 | Show the invite reward right after signup, with share buttons (WhatsApp, Instagram, copy) | More invites means cheaper growth | `invite_link_copied` + `invite_link_shared` ÷ `waitlist_success`; `referral_signup` | Before/after comparison |
| 5 | Shorter hero copy (one sentence + 3 bullets) | Less reading means more signups on mobile | `waitlist_submit` ÷ `landing_view` | A/B test |
| 6 | A **brand** call to action ("I'm a brand: get early access"), saving `role=brand` | Brands are half the marketplace and have no way in today | waitlist signups with role=brand | New button + `cta_click` location=brand |
| 7 | Move "verified socials + trust score" higher, next to the hero | Trust is the main worry for both sides | `waitlist_submit` rate; scroll depth (via `cta_click` founding) | A/B test |
| 8 | A launch-timing line ("Beta invites start in [month]") once you know the date | Uncertainty lowers signups | `waitlist_submit` rate; `faq_opened` (launch) | Before/after |

- **A/B testing setup:** `src/lib/experiments.ts`.
  - Each browser is assigned once and keeps its variant.
  - The variant is added to every event as `exp_<name>`.
  - Both tests are **off** (`enabled: false`).
- **Preview a variant:** add `?exp_preview=sticky_mobile_cta:b` or `?exp_preview=live_spots_counter:b` to the URL.
- **Start a test (after you approve):** set `enabled: true` and redeploy.

**Copy consistency check:**
- **Consistent:** creator fee 10%, Founding 5% ("half fees for life"); 3-day review window (matches the code); 13+ for creators with a guardian handling payouts under 18; 18+ for brand accounts; "Payments processed by Stripe"; disputes decided by people (admin panel).
- **Not true yet or needs action:** issues 5, 6, 15 and 25 above.

---

## 8. Age policy (13+): please confirm with a lawyer

The site says creators can join from age 13, with a parent or guardian handling payouts under 18. This is a legal decision for you and your lawyer, not me. What it involves:

- **COPPA (US, under 13):**
  - You must not knowingly collect data from children under 13 without verified parental consent.
  - Today the onboarding asks for a birth date and blocks under-13s. Waitlist signup only asks the visitor to confirm they're 13+, so an under-13 could still join the waitlist with an email address.
  - If you learn an account belongs to someone under 13, you must delete their data.
- **Ages 13–17:**
  - State laws (for example California's CCPA/CPRA and age-appropriate design codes, plus newer state laws on minors' social and marketplace accounts) can require parental consent, default privacy settings, limits on profiling, and no selling or sharing of minors' data.
  - Some require age verification.
- **Stripe:**
  - Connected-account owners generally must be 18+, so for minors the parent or guardian must be the account holder.
  - The app already uses the guardian's email for minors' payout setup.
  - Payouts then go to the guardian, so who reports the income (1099 forms) is a tax question.
- **Brands:** contracts with minors can be cancelled by the minor (voidability). Brand terms may need a guardian co-signature.
- **Safety:** messaging between adult brands and minors needs care. The app shows a "young creator" notice, and reporting and blocking exist.

**My recommendation:** require **18+ for the beta**, and add 13–17 later with proper parental consent once a lawyer has reviewed it. That removes most of the risk while you validate the product. This is not legal advice.

---

## 9. Open questions and decisions for you

1. ~~Approve migration 0023~~ Done: applied.
2. ~~Approve migration 0024~~ Done: applied.
3. **Merge `optimize-pass-1` into `main`?** After merging, enable Analytics and Speed Insights in Vercel.
4. **Turn on leaked-password protection** in Supabase (issue 13).
5. **Age rule:** keep 13+ or require 18+ for the beta? (section 8, lawyer)
6. **Terms and Privacy:** update for payments, payouts, disputes and reviews before inviting beta users (issues 5 and 6, lawyer).
7. **A/B tests:** which (if any) to switch on first? I'd start with the sticky mobile bar.
8. **Brand waitlist** (CRO idea 6): want me to build it?
9. **Preview environment variables** (issue 14): add Supabase settings and Stripe *test* keys to Vercel "Preview" so branches can be tested before merging?
10. **Vercel project name** "sponzy-app": rename to "clouta"? It doesn't affect the site address.

**Files to know:**
- `src/lib/analytics.ts`: events.
- `src/lib/experiments.ts`: A/B tests.
- `src/lib/log.ts`: error saving.
- `src/lib/rate-limit.ts`: rate limits.
- `next.config.ts`: security headers.
- `tests/e2e/`: tests.
- `src/app/admin/metrics/page.tsx`: dashboard.
