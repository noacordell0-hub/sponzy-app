import type { Metadata } from "next";
import { ContactLink, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · Clouta",
  description: "How Clouta collects, uses and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Clouta is in its waitlist stage. This policy explains what we collect while you're on the waitlist, why, and the choices you have. In short: we collect very little, we never sell it, and you can ask us to delete it at any time."
    >
      <h2>1. Who we are</h2>
      <p>
        Clouta (&quot;Clouta&quot;, &quot;we&quot;, &quot;us&quot;) is building a marketplace where creators sell brand
        collaborations and brands pay securely. We are based in the United States. You can reach us at <ContactLink />.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li>
          <strong>Your email address</strong>, when you join the waitlist.
        </li>
        <li>
          <strong>Waitlist details</strong>: when you joined, your personal invite code, and who invited you if you joined
          through someone&apos;s link.
        </li>
        <li>
          <strong>Basic technical data</strong> that our hosting provider records automatically to run and secure the site,
          such as IP address, browser type and the pages requested.
        </li>
      </ul>
      <p>
        We do not use advertising cookies or third-party trackers. Your browser stores two small items: your invite code,
        so the site can show your place in line when you come back, and a note that you&apos;ve already seen the intro
        animation. You can clear them at any time in your browser settings.
      </p>

      <h2>3. How we use it</h2>
      <ul>
        <li>To manage the waitlist, work out your place in line and credit your referrals.</li>
        <li>To email you about your beta invite, the launch, and your Founding Creator perks.</li>
        <li>To keep the site secure and prevent fake or automated signups.</li>
      </ul>
      <p>
        Every email we send includes a way to unsubscribe. If you unsubscribe, we&apos;ll stop sending updates but may keep
        your waitlist entry unless you ask us to delete it.
      </p>

      <h2>4. Who we share it with</h2>
      <p>
        <strong>We do not sell or rent your personal information</strong>, and we do not share it for advertising. We use a
        small number of service providers who handle data on our behalf, only to run Clouta:
      </p>
      <ul>
        <li>Supabase, which hosts our database.</li>
        <li>Vercel, which hosts the website.</li>
      </ul>
      <p>
        When payments launch, Stripe will process payments and payouts, and its own privacy policy will apply to the payment
        details you give it. We may also disclose information if required by law, or to protect the safety of our users.
      </p>

      <h2>5. Children and young creators</h2>
      <p>
        Clouta is not directed to children under 13, and we do not knowingly collect personal information from anyone
        under 13. If you are under 13, please do not join. If we learn that we have collected information from a child
        under 13, we will delete it. Parents or guardians who believe this has happened can contact us at <ContactLink />.
      </p>
      <p>
        Creators aged 13 to 17 are welcome to join the waitlist with a parent or guardian&apos;s permission. When accounts
        launch, we will ask for a date of birth, and a parent or guardian will need to manage payouts for creators under
        18.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We keep your waitlist information until you ask us to delete it, or until it&apos;s no longer needed for the
        waitlist and launch. If Clouta does not launch, we will delete waitlist data.
      </p>

      <h2>7. Your choices and rights</h2>
      <p>You can ask us at any time to:</p>
      <ul>
        <li>tell you what information we hold about you,</li>
        <li>correct it, or</li>
        <li>delete it and remove you from the waitlist.</li>
      </ul>
      <p>
        Email <ContactLink /> from the address you signed up with, and we&apos;ll respond within 30 days. Residents of
        California and other states with privacy laws have these rights too; we do not sell or share personal information
        as those laws define it.
      </p>

      <h2>8. Security</h2>
      <p>
        The site uses encrypted connections (HTTPS), and access to our database is restricted so that waitlist emails can
        only be read by our team. No system is perfectly secure, but we work to protect your information.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We will update this policy as Clouta grows, especially when accounts and payments launch. We&apos;ll change the
        date at the top of this page, and tell waitlist members by email about significant changes.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions or requests: <ContactLink />.
      </p>
    </LegalPage>
  );
}
