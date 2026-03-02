import Link from "next/link";
import { getSiteContent } from "./cms";
import { policyLinks, siteConfig } from "./site-config";

export const revalidate = 300;

export default async function HomePage() {
  const content = await getSiteContent();

  return (
    <>
      <section className="hero-cosmos">
        <div className="hero-grid">
          <div className="hero-content stack">
            <span className="kicker-pill">{content.hero.kicker}</span>
            <h1>{content.hero.title}</h1>
            <p className="hero-lead">{content.hero.lead}</p>
            <p>{content.hero.body}</p>
            <div className="hero-actions">
              <Link href="/#experience" className="btn-primary">
                Explore the experience
              </Link>
              <Link href="/support" className="btn-ghost">
                Speak with support
              </Link>
            </div>
            <ul className="orbital-tags">
              {content.hero.beliefBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>

          <aside className="hero-orbit">
            <p className="signal-label">Live field model</p>
            <h2>{content.hero.beliefTitle}</h2>
            <p>
              Egregor connects solo and collective practice with a live command
              surface designed for high clarity on every device.
            </p>
            <ul className="signal-list">
              {[
                "Live globe markers for events happening now.",
                "Solo ritual flow with atmospheric visual grounding.",
                "Reactive room ambiance for joined participants."
              ].map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="pulse-band" aria-hidden>
              <span className="pulse-dot pulse-dot-live" />
              <span className="pulse-dot pulse-dot-news" />
              <span className="pulse-dot pulse-dot-solo" />
            </div>
          </aside>
        </div>

        <ul className="stat-grid">
          {content.hero.metrics.map((metric) => (
            <li key={metric.id}>
              <span>{metric.id}</span>
              {metric.label}
            </li>
          ))}
        </ul>
      </section>

      <section id="experience" className="surface-panel">
        <div className="section-heading stack">
          <p className="section-kicker">Product Experience</p>
          <h2>One ecosystem for solo focus and collective global healing.</h2>
          <p>
            This website mirrors the app architecture so users understand the
            full journey before installation.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <p className="feature-eyebrow">Live Globe</p>
            <h3>Events visible in real time across Earth.</h3>
            <p>
              Discover active intention events by region and enter synchronized
              circles with one tap.
            </p>
          </article>
          <article className="feature-card">
            <p className="feature-eyebrow">Solo Ritual</p>
            <h3>Guided personal practice with a calm cinematic rhythm.</h3>
            <p>
              Move from intention to action through focused solo sessions with
              dynamic spiritual visuals.
            </p>
          </article>
          <article className="feature-card">
            <p className="feature-eyebrow">Reactive Rooms</p>
            <h3>Shared event backgrounds respond as people join.</h3>
            <p>
              Live atmosphere increases coherence and presence, making each room
              feel alive and connected.
            </p>
          </article>
        </div>
      </section>

      <section id="mission" className="surface-panel">
        <div className="section-heading stack">
          <p className="section-kicker">Mission</p>
          <h2>{content.mission.title}</h2>
        </div>
        <div className="split-layout">
          <p>{content.mission.paragraphOne}</p>
          <p>{content.mission.paragraphTwo}</p>
        </div>
        <div className="pillar-grid">
          {content.mission.pillars.map((pillar) => (
            <article key={pillar.title} className="pillar-card">
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="meaning" className="surface-panel">
        <div className="section-heading stack">
          <p className="section-kicker">The Name</p>
          <h2>{content.meaning.title}</h2>
        </div>
        <div className="meaning-grid">
          <article className="meaning-card stack">
            <h3>{content.meaning.meaningTitle}</h3>
            <p>{content.meaning.meaningBody}</p>
          </article>
          <article className="meaning-card stack">
            <h3>{content.meaning.fitTitle}</h3>
            <p>{content.meaning.fitBody}</p>
          </article>
        </div>
      </section>

      <section className="surface-panel">
        <div className="section-heading stack">
          <p className="section-kicker">Daily Loop</p>
          <h2>{content.experience.title}</h2>
        </div>
        <div className="journey-grid">
          {content.experience.steps.map((item, index) => (
            <article key={`${item.step}-${index}`} className="journey-step">
              <p className="step-number">0{index + 1}</p>
              <h3>{item.step}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-panel">
        <div className="section-heading stack">
          <p className="section-kicker">Trust</p>
          <h2>{content.trust.title}</h2>
        </div>
        <p>{content.trust.intro}</p>
        <div className="trust-grid">
          {policyLinks.map((link, index) => (
            <article key={link.href} className="trust-card">
              <h3>{link.label}</h3>
              <p>
                {content.trust.cards[index]?.body ??
                  "Clear, public information aligned with Apple App Store and Google Play expectations."}
              </p>
              <Link href={link.href} className="trust-link">
                Open page
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-signal stack">
        <h2>{content.finalCta.title}</h2>
        <p>{content.finalCta.body}</p>
        <div className="hero-actions">
          <Link href="/support" className="btn-primary">
            Contact Support
          </Link>
          <a href={`mailto:${siteConfig.supportEmail}`} className="btn-ghost">
            Email Team
          </a>
        </div>
      </section>
    </>
  );
}
