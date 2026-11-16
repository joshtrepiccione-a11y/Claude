/** The public address of the site, used for links in emails, the sitemap and calendar feeds. */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  if (process.env.URL) return process.env.URL.replace(/\/+$/, ""); // Netlify
  return "http://localhost:3000";
}

/**
 * National topics live on legion.org, not here. This site covers Post 186;
 * the footer links out to the national organization for everything else.
 * Edit these two lists to change the footer's national links.
 */
export const NATIONAL_ISSUES = [
  { label: "The American Legion (National)", href: "https://www.legion.org/" },
  { label: "Advocacy & National Issues", href: "https://www.legion.org/advocacy" },
  { label: "Legislative Priorities", href: "https://www.legion.org/advocacy/legislative" },
  { label: "Contact Congress", href: "https://www.votervoice.net/AmericanLegion/home" },
  { label: "Be The One: Veteran Suicide Prevention", href: "https://www.legion.org/advocacy/be-the-one" },
  { label: "National News", href: "https://www.legion.org/information-center" },
] as const;

export const NATIONAL_SERVICES = [
  { label: "Join The American Legion", href: "https://www.legion.org/join" },
  { label: "Renew Your Membership", href: "https://www.legion.org/renew" },
  { label: "MyLegion.org", href: "https://mylegion.org/" },
  { label: "Veterans Benefits & Services", href: "https://www.legion.org/member-services/veterans-services" },
  {
    label: "Find a Service Officer",
    href: "https://www.legion.org/member-services/veterans-services/veterans-benefits/find-a-veteran-service-officer",
  },
  { label: "Veterans Crisis Line: Dial 988, Press 1", href: "https://www.veteranscrisisline.net/" },
] as const;
