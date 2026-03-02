import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Sora } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";
import { policyLinks, primaryLinks, siteConfig } from "./site-config";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  weight: ["600", "700"]
});

const bodyFont = Sora({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: `${siteConfig.appName} | Live Globe and Solo Ritual Platform`,
    template: `%s | ${siteConfig.appName}`
  },
  description:
    "Egregor unifies live global events, solo ritual sessions, and trust-first support into one cross-platform experience for collective healing.",
  openGraph: {
    type: "website",
    siteName: siteConfig.appName,
    title: `${siteConfig.appName} | Live Globe and Solo Ritual Platform`,
    description:
      "A full product website for Egregor covering live events, solo ritual, support, and compliance.",
    images: [
      {
        url: "/brand/egregor-v1-splash-mark-live-2048.png",
        width: 2048,
        height: 2048,
        alt: "Egregor"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.appName} | Live Globe and Solo Ritual Platform`,
    description:
      "A full product website for Egregor covering live events, solo ritual, support, and compliance.",
    images: ["/brand/egregor-v1-splash-mark-live-2048.png"]
  },
  icons: {
    icon: [
      { url: "/brand/egregor-v1-favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/egregor-v1-icon-still-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: "/brand/egregor-v1-favicon-48.png",
    apple: [
      {
        url: "/brand/egregor-v1-icon-still-192.png",
        sizes: "192x192",
        type: "image/png"
      }
    ]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#081729" },
    { media: "(prefers-color-scheme: dark)", color: "#081729" }
  ]
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const supportPhoneHref = `tel:${siteConfig.supportPhone.replace(/[^+\d]/g, "")}`;
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="site-shell">
          <p className="site-banner">
            Live globe events, solo ritual flow, and trust-first support for global healing.
          </p>

          <header className="site-header">
            <Link href="/" className="brand-mark">
              <span className="brand-glyph" aria-hidden>
                <img src="/brand/egregor-v1-live-animated.svg" alt="" width={42} height={42} />
              </span>
              <span className="brand-copy">
                <span className="brand-name">{siteConfig.appName}</span>
                <span className="brand-sub">Divine light in collective action</span>
              </span>
            </Link>

            <nav className="top-nav" aria-label="Primary">
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} className="nav-link">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="header-actions">
              <a href={`mailto:${siteConfig.supportEmail}`} className="nav-link nav-link-muted">
                Email
              </a>
              <Link href="/support" className="header-cta">
                Contact Support
              </Link>
            </div>
          </header>

          <main id="main-content" className="page-content">
            {children}
          </main>

          <footer className="site-footer">
            <section className="footer-brand">
              <div className="footer-brand-top">
                <span className="footer-logo" aria-hidden>
                  <img src="/brand/egregor-v1-still-master.svg" alt="" width={34} height={34} />
                </span>
                <p className="footer-title">{siteConfig.companyName}</p>
              </div>
              <p className="footer-text">{siteConfig.tagline}</p>
              <p className="footer-text">{siteConfig.companyAddress}</p>
              <p className="footer-text">
                <a href={`mailto:${siteConfig.supportEmail}`} className="footer-inline-link">
                  {siteConfig.supportEmail}
                </a>
              </p>
              <p className="footer-text">
                <a href={supportPhoneHref} className="footer-inline-link">
                  {siteConfig.supportPhone}
                </a>
              </p>
            </section>

            <nav className="footer-group" aria-label="Explore">
              <p className="footer-heading">Explore</p>
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} className="footer-link">
                  {link.label}
                </Link>
              ))}
            </nav>

            <nav className="footer-group" aria-label="Legal">
              <p className="footer-heading">Legal</p>
              {policyLinks.map((link) => (
                <Link key={link.href} href={link.href} className="footer-link">
                  {link.label}
                </Link>
              ))}
            </nav>
          </footer>
        </div>
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('config', '${gaMeasurementId}', { anonymize_ip: true });`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
