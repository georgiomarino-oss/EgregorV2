import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "../cms";
import { siteConfig } from "../site-config";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Contact Egregor support for account, billing, technical, legal, and partnership help."
};

export const revalidate = 300;

export default async function SupportPage() {
  const content = await getSiteContent();

  return (
    <article className="doc-shell">
      <header className="doc-header">
        <span className="kicker-pill">Support Portal</span>
        <h1>{content.support.title}</h1>
        <p className="policy-meta">{content.support.intro}</p>
        <div className="link-row">
          <Link href="/privacy" className="chip">
            Privacy
          </Link>
          <Link href="/terms" className="chip">
            Terms
          </Link>
          <Link href="/subscriptions" className="chip">
            Subscription Terms
          </Link>
          <Link href="/account-deletion" className="chip">
            Account Deletion
          </Link>
        </div>
      </header>

      <section className="support-overview-grid">
        <article className="support-card policy-section">
          <h2>Direct Contact</h2>
          <ul>
            <li>Email: {siteConfig.supportEmail}</li>
            <li>Phone: {siteConfig.supportPhone}</li>
            <li>Hours: {siteConfig.supportHours}</li>
            <li>Address: {siteConfig.companyAddress}</li>
          </ul>
        </article>

        <article className="support-card policy-section">
          <h2>Response Commitment</h2>
          <ul>
            <li>Priority incidents: same day during support hours.</li>
            <li>Billing and account queries: usually within one business day.</li>
            <li>Legal or compliance requests: routed to the right contact quickly.</li>
            <li>Account deletion requests: verification-first workflow.</li>
          </ul>
        </article>
      </section>

      <section className="policy-section support-card">
        <h2>Account Deletion Help</h2>
        <ul>
          <li>
            Primary path: open {siteConfig.accountDeletionPath} in the app and
            request full account deletion.
          </li>
          <li>
            If you cannot access the app, submit this support form with topic{" "}
            <strong>Account deletion</strong> or email {siteConfig.supportEmail}.
          </li>
          <li>
            We review each request and may ask for identity verification before
            completion.
          </li>
        </ul>
      </section>

      <section className="surface-panel support-form-block">
        <h2>{content.support.formTitle}</h2>
        <p>{content.support.formDescription}</p>
        <ContactForm topics={content.support.topics} />
      </section>

      <section className="policy-section support-card">
        <h2>Subscription and Refund Help</h2>
        <ul>
          <li>
            Apple subscriptions are managed in Apple ID settings; refund
            requests can be submitted through Apple&apos;s report-a-problem flow.
          </li>
          <li>
            Google Play subscriptions are managed in Play subscriptions
            settings; refund handling depends on Google Play policy.
          </li>
        </ul>
      </section>

      <section className="policy-section support-card">
        <h2>Compliance Links</h2>
        <div className="link-row">
          <Link href="/privacy" className="chip">
            Privacy Policy
          </Link>
          <Link href="/terms" className="chip">
            Terms of Service
          </Link>
          <Link href="/subscriptions" className="chip">
            Subscription Terms
          </Link>
          <Link href="/account-deletion" className="chip">
            Account Deletion
          </Link>
        </div>
      </section>
    </article>
  );
}
