export const siteConfig = {
  appName: "Egregor",
  tagline:
    "A shared space where intention becomes action and action becomes meaningful change.",
  baseUrl: "https://egregor.world",
  supportEmail: "support@egregor.co.uk",
  legalEmail: "legal@egregor.co.uk",
  supportPhone: "+44 7470 412207",
  companyName: "EGREGOR.WORLD LTD",
  companyAddress: "167-169 Great Portland Street, Fifth Floor, London, W1W 5PF",
  supportHours: "Monday-Friday, 9:00 AM-5:00 PM UK time",
  accountDeletionPath:
    "Profile -> Account -> Delete account",
  appleSubscriptionTermsUrl: "/subscriptions",
  appleStandardEulaUrl:
    "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
} as const;

export const subscriptionConfig = {
  updatedOn: "February 25, 2026",
  plans: [
    {
      productId: "egregor_circle_monthly",
      title: "Egregor Circle Monthly",
      period: "1 month",
      fullPrice: "£9.99",
      billedAs: "Billed every month"
    },
    {
      productId: "egregor_circle_annual",
      title: "Egregor Circle Annual",
      period: "12 months",
      fullPrice: "£69.99",
      billedAs: "Billed every year"
    }
  ],
  pricingDisclosure:
    "Prices shown are your base GBP prices. Apple App Store and Google Play may localize currency and apply taxes by region.",
  trialDisclosure:
    "Any free trial or introductory offer, if available, is shown in the purchase flow before confirmation."
} as const;

export const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/#experience", label: "Experience" },
  { href: "/#mission", label: "Mission" },
  { href: "/#meaning", label: "Why Egregor" },
  { href: "/support", label: "Support" },
  { href: "/subscriptions", label: "Pricing" }
] as const;

export const policyLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/subscriptions", label: "Subscription Terms" },
  { href: "/account-deletion", label: "Account Deletion" }
] as const;


