import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../site-config";

export const metadata: Metadata = {
  title: "Account Deletion",
  description:
    "Instructions for deleting your Egregor account and associated personal data."
};

export default function AccountDeletionPage() {
  return (
    <article className="doc-shell">
      <header className="doc-header">
        <span className="kicker-pill">Account and Retention</span>
        <h1>Account Deletion</h1>
        <p className="policy-meta">
          You can request full account deletion in the app. If you cannot
          access the app, you can submit the same request through support on
          this website.
        </p>
        <div className="link-row">
          <Link href="/privacy" className="chip">
            Privacy Policy
          </Link>
          <Link href="/support" className="chip">
            Support
          </Link>
          <a href={`mailto:${siteConfig.supportEmail}`} className="chip">
            Email deletion request
          </a>
        </div>
      </header>

      <section className="policy-section">
        <h2>Start Deletion In The App (Primary Path)</h2>
        <ul>
          <li>Sign in to your account in the mobile app.</li>
          <li>Open {siteConfig.accountDeletionPath}.</li>
          <li>Select <strong>Request full account deletion</strong> and confirm.</li>
          <li>
            Track request status in-app while support reviews and completes the
            request.
          </li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Web Request Path (If You Cannot Access The App)</h2>
        <ul>
          <li>
            Open <Link href="/support">Support</Link> and choose topic{" "}
            <strong>Account deletion</strong>.
          </li>
          <li>
            Or send an email to {siteConfig.supportEmail} with subject:
            &quot;Account Deletion Request&quot;.
          </li>
          <li>
            Include the email tied to your account and a short message
            confirming your request.
          </li>
          <li>
            We will verify account ownership before completion.
          </li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>What This Request Does</h2>
        <p>
          This requests <strong>full account deletion</strong>. It is not a
          pause or deactivation mode.
        </p>
      </section>

      <section className="policy-section">
        <h2>What Is Deleted</h2>
        <ul>
          <li>Account profile data and sign-in-linked account records.</li>
          <li>
            User-submitted content and account-linked activity where legally
            permitted.
          </li>
          <li>Push tokens and personalized preferences.</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>What May Be Retained</h2>
        <ul>
          <li>
            Records required for legal, tax, audit, billing, fraud prevention,
            or security obligations.
          </li>
          <li>
            Minimal logs retained temporarily for security and abuse
            investigations.
          </li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>Review and Timeline</h2>
        <p>
          Requests are support-reviewed. We target completion within 7 business
          days after verification, unless local law requires a shorter period.
        </p>
      </section>
    </article>
  );
}
