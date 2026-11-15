/**
 * Site settings: everything about the post that an officer can change from
 * Admin → Settings without touching code. The values below are the starting
 * point used until someone saves the settings form.
 */

export type HallRate = { label: string; amount: string; note: string };

export type SiteSettings = {
  orgName: string; // "The American Legion"
  postName: string; // "Frank M. Calletta Post 186"
  postNumber: string; // "186"
  city: string;
  state: string; // "NJ"
  stateName: string; // "New Jersey"
  street: string;
  zip: string;
  mailingAddress: string;
  phone: string;
  email: string;
  facebookUrl: string;
  /** Free text, e.g. "Second Tuesday of each month at 7:00 PM". */
  meetingSchedule: string;
  /** Free text, e.g. canteen or office hours. Hidden when empty. */
  hours: string;
  announcement: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkUrl: string;
  };
  /** Where booking requests and contact-form messages are emailed. */
  notifyEmail: string;
  hall: {
    name: string;
    capacity: number;
    intro: string;
    amenities: string[];
    rates: HallRate[];
    ratesNote: string;
    policies: string[];
    /** Earliest and latest times a rental can run. */
    openTime: string;
    closeTime: string;
    /** How many days ahead a request must be made. */
    minNoticeDays: number;
    /** How far into the future requests are accepted. */
    maxAdvanceMonths: number;
    /** e.g. "We reply to every request within 2 business days." */
    responseTime: string;
  };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  orgName: "The American Legion",
  postName: "Frank M. Calletta Post 186",
  postNumber: "186",
  city: "Hammonton",
  state: "NJ",
  stateName: "New Jersey",
  street: "101 French Street",
  zip: "08037",
  mailingAddress: "P.O. Box 223, Hammonton, NJ 08037",
  phone: "(609) 567-4748",
  email: "",
  facebookUrl: "https://www.facebook.com/p/Hammonton-American-Legion-Post-186-61561087720417/",
  meetingSchedule:
    "Membership meetings are held monthly at the post. Call us for this month's date and time.",
  hours: "",
  announcement: { enabled: false, text: "", linkLabel: "", linkUrl: "" },
  notifyEmail: "",
  hall: {
    name: "Post 186 Hall",
    capacity: 80,
    intro:
      "Our newly renovated hall is a warm, affordable place for birthdays, showers, receptions, repasts and community gatherings. Every rental helps Post 186 support local veterans and their families.",
    amenities: [
      "Seating for up to 80 guests",
      "Renovated hall with new floors",
      "Kitchen",
      "Updated restrooms",
      "On-site parking",
      "Outdoor lawn area",
    ],
    rates: [],
    ratesNote: "",
    policies: [
      "A date is reserved only after the post confirms your request and receives a signed rental agreement.",
      "The renter is responsible for guests and for leaving the hall clean and undamaged.",
      "Tell us in advance if alcohol will be served or if you plan to use outside caterers or entertainment.",
      "Legion Family events and post functions take priority on the calendar.",
    ],
    openTime: "09:00",
    closeTime: "23:00",
    minNoticeDays: 7,
    maxAdvanceMonths: 18,
    responseTime: "We reply to every request within two business days.",
  },
};

/** Fills any missing keys from the defaults so old saved settings keep working. */
export function mergeSettings(saved: unknown): SiteSettings {
  const s = (saved && typeof saved === "object" ? saved : {}) as Partial<SiteSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    announcement: { ...DEFAULT_SETTINGS.announcement, ...(s.announcement ?? {}) },
    hall: { ...DEFAULT_SETTINGS.hall, ...(s.hall ?? {}) },
  };
}

export function fullPostName(s: SiteSettings): string {
  return `${s.orgName} ${s.postName}`;
}

export function addressLine(s: SiteSettings): string {
  return `${s.street}, ${s.city}, ${s.state} ${s.zip}`;
}

export function directionsUrl(s: SiteSettings): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${fullPostName(s)}, ${addressLine(s)}`,
  )}`;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return `tel:+${digits.length === 10 ? "1" : ""}${digits}`;
}

/** "Label | $400 | Note" lines ⇄ structured rates, for the settings form. */
export function parseRates(text: string): HallRate[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = "", amount = "", note = ""] = line.split("|").map((p) => p.trim());
      return { label, amount, note };
    })
    .filter((r) => r.label);
}

export function formatRates(rates: HallRate[]): string {
  return rates
    .map((r) => [r.label, r.amount, r.note].filter((p, i) => i < 2 || p).join(" | "))
    .join("\n");
}

export function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
