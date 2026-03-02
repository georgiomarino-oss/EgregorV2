import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, subscriptionConfig } from "../site-config";

export const metadata: Metadata = {
  title: "Subscription Terms",
  description:
    "Subscription pricing and renewal terms for Egregor premium plans."
};

export default function SubscriptionsPage() {
  return (
    <article className="doc-shell">
      <header className="doc-header">
        <span className="kicker-pill">Billing and Compliance</span>
        <h1>Subscription Terms</h1>
        <p className="policy-meta">
          Last updated: {subscriptionConfig.updatedOn}. These terms cover
          auto-renewable subscriptions offered through Apple App Store and Google
          Play.
        </p>
        <div className="link-row">
          <Link href="/terms" className="chip">
            Terms
          </Link>
          <Link href="/privacy" className="chip">
            Privacy
          </Link>
          <Link href="/support" className="chip">
            Support
          </Link>
        </div>
      </header>

      <section className="policy-section">
        <h2>Available Plans</h2>
        <div className="plan-grid">
          {subscriptionConfig.plans.map((plan) => (
            <article key={plan.productId} className="plan-card">
              <p className="step-number">{plan.period}</p>
              <h3>{plan.title}</h3>
              <p>{plan.fullPrice}</p>
              <p>{plan.billedAs}</p>
            </article>
          ))}
        </div>
        <p className="inline-note">
          {subscriptionConfig.pricingDisclosure}
        </p>
      </section>

      <section className="policy-section">
        <h2>Billing and Renewal</h2>
        <ul>
          <li>
            Payment is charged to your Apple ID or Google Play account at
            purchase confirmation.
          </li>
          <li>
            Subscriptions renew automatically unless canceled at least 24
            hours before the current period ends.
          </li>
          <li>
            Renewal charges occur within 24 hours before the next billing
            period.
          </li>
          <li>
            You can manage and cancel subscriptions in your Apple or Google
            account settings.
          </li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Trials and Price Changes</h2>
        <ul>
          <li>{subscriptionConfig.trialDisclosure}</li>
          <li>
            If prices change, notice and consent flow are handled by the
            platform according to its billing rules.
          </li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Legal References</h2>
        <div className="link-row">
          <Link href="/terms" className="chip">
            Terms of Service
          </Link>
          <Link href="/privacy" className="chip">
            Privacy Policy
          </Link>
          <a
            href={siteConfig.appleStandardEulaUrl}
            className="chip"
            target="_blank"
            rel="noreferrer"
          >
            Apple Standard EULA
          </a>
          <Link href="/support" className="chip">
            Support
          </Link>
        </div>
      </section>

      <section className="policy-section">
        <h2>Questions</h2>
        <p>
          Subscription questions can be sent to {siteConfig.supportEmail}. For
          legal questions, contact {siteConfig.legalEmail}.
        </p>
      </section>
    </article>
  );
}
