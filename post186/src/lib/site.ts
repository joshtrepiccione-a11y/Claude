/** Verified, stable facts about the Post. Everything else lives in editable site content. */
export const SITE = {
  name: "Frank M. Calletta American Legion Post 186",
  shortName: "Post 186",
  streetAddress: "101 French Street",
  city: "Hammonton",
  region: "NJ",
  postalCode: "08037",
  get fullAddress() {
    return `${this.streetAddress}, ${this.city}, ${this.region} ${this.postalCode}`;
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("101 French Street, Hammonton, NJ 08037"),
  /** Official eligibility page, linked rather than paraphrased so requirements never go stale here. */
  legionEligibilityUrl: "https://www.legion.org/join",
};

export function siteUrl(): string {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const NAV_LINKS = [
  { href: "/about", label: "About the Post" },
  { href: "/membership", label: "Membership" },
  { href: "/hall-rentals", label: "Hall Rentals" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "News" },
  { href: "/contact", label: "Contact" },
] as const;
