import type { Metadata } from "next";
import { ContactLink, LegalPage } from "@/components/LegalPage";
import { FOUNDING_SPOTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use · Clouta",
  description: "The terms for using the Clouta website and waitlist.",
};

export default function TermsPage() {
  const spots = FOUNDING_SPOTS.toLocaleString();
  return (
    <LegalPage
      title="Terms of Use"
      intro="These terms cover the Clouta website and waitlist during our pre-launch stage. By using the site or joining the waitlist, you agree to them. Please read them, along with our Privacy Policy."
    >
      <h2>1. What Clouta is today</h2>
      <p>
        Clouta is not yet open. Right now the site lets you learn about Clouta and join a waitlist. There are no accounts,
        listings, orders or payments yet. When the marketplace launches, we will ask you to agree to separate terms that
        cover accounts, orders, fees, payouts and disputes, and those terms will apply to the marketplace.
      </p>

      <h2>2. Who can join</h2>
      <p>
        You must be at least 13 years old to join the waitlist. If you are under 18, you confirm that a parent or guardian
        has agreed to you joining. You agree to give a real email address that you control.
      </p>

      <h2>3. The waitlist and referrals</h2>
      <ul>
        <li>
          Your place in line is an estimate. It can change as other people join and refer friends, and it does not guarantee
          access by any particular date.
        </li>
        <li>Each person who joins using your invite link moves you up 5 places.</li>
        <li>
          Inviting 3 people who join gets you into the first wave of beta invites. We decide the timing and size of each
          wave.
        </li>
        <li>
          Referrals must be real people who choose to join. Signing yourself up with extra email addresses, using bots, or
          buying or trading signups is not allowed. We may remove fake signups, discount referrals, or remove anyone who
          tries to game the waitlist.
        </li>
      </ul>

      <h2>4. Founding Creator perks</h2>
      <p>
        The first {spots} creators on the waitlist who go on to open a Clouta creator account are Founding Creators. They
        receive:
      </p>
      <ul>
        <li>
          <strong>Half the standard Clouta fee, for life.</strong> On every order, Founding Creators pay half of the standard
          Clouta platform fee in effect at the time of that order. Fees charged by third parties, such as payment processing,
          may still apply as described in the marketplace terms.
        </li>
        <li>Early access to the beta.</li>
        <li>A permanent Founding Creator badge on their profile.</li>
      </ul>
      <p>
        Perks are personal and cannot be sold or transferred. We may remove them from accounts that break our rules, for
        example through fraud, fake signups or a ban.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use bots, scripts or fake details to join the waitlist or create referrals,</li>
        <li>try to access data or systems you are not allowed to, or disrupt the site,</li>
        <li>impersonate another person or brand, or</li>
        <li>use the site for anything unlawful.</li>
      </ul>

      <h2>6. Our content</h2>
      <p>
        The Clouta name, logo, design and site content belong to Clouta. You may share links to the site, but please do not
        copy our branding or present yourself as Clouta.
      </p>

      <h2>7. No warranty</h2>
      <p>
        The site is provided &quot;as is&quot; while Clouta is in development. Features, perks and launch timing described on
        the site may change before launch. We will tell waitlist members about significant changes to perks.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, Clouta is not liable for indirect or consequential losses arising from your use
        of the site or the waitlist. Nothing in these terms limits any rights you have that cannot be limited by law.
      </p>

      <h2>9. Changes and ending</h2>
      <p>
        We may update these terms; we&apos;ll change the date at the top of this page and tell waitlist members about
        significant changes. You can leave the waitlist at any time by emailing us. We may close the waitlist or remove
        entries that break these terms.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of the United States and of the state in which Clouta is established, without
        regard to conflict-of-law rules.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms: <ContactLink />.
      </p>
    </LegalPage>
  );
}
