import { nowIso, query, transaction } from "./db";

/**
 * Editable site content. Each key is a field in Admin > Site content.
 * `draft` values are starter copy the public site shows until leadership replaces them.
 * Keys with no `draft` are facts we must not invent; the public site hides them until filled in.
 */
export type ContentField = {
  key: string;
  label: string;
  group: string;
  help: string;
  multiline?: boolean;
  draft?: string;
  fact?: boolean;
};

export const CONTENT_FIELDS: ContentField[] = [
  // Contact facts
  { key: "contact_phone", label: "Phone number", group: "Contact details", help: "Verified Post phone number.", fact: true },
  { key: "contact_email", label: "Email address", group: "Contact details", help: "Verified Post email address.", fact: true },
  { key: "office_hours", label: "Office or hall hours", group: "Contact details", help: "One line per entry, for example: Tuesday 6 to 8 pm", multiline: true, fact: true },
  { key: "social_facebook", label: "Facebook page address", group: "Contact details", help: "Full https:// address.", fact: true },
  { key: "social_instagram", label: "Instagram address", group: "Contact details", help: "Full https:// address.", fact: true },
  { key: "social_other", label: "Other social profile", group: "Contact details", help: "Full https:// address.", fact: true },
  { key: "response_time", label: "Expected reply time", group: "Contact details", help: "Shown after someone sends a form, for example: within 5 business days", fact: true },

  // Home
  {
    key: "mission_summary",
    label: "Mission summary (home page)",
    group: "Home page",
    help: "Two or three short sentences. Draft copy until approved.",
    multiline: true,
    draft:
      "Post 186 is a home for veterans, their families, and neighbors who believe in service. We honor those who served, look after one another, and show up for Hammonton.\n\nWhether you served yesterday or decades ago, there is a seat for you here.",
  },

  // About
  { key: "about_history", label: "History of Post 186", group: "About the Post", help: "Founding, milestones, and the hall. Do not guess dates.", multiline: true, fact: true },
  { key: "about_namesake", label: "Frank M. Calletta and the Post's name", group: "About the Post", help: "Who Frank M. Calletta was and why the Post carries his name.", multiline: true, fact: true },
  {
    key: "about_mission",
    label: "Mission and community service",
    group: "About the Post",
    help: "What the Post does today. Draft copy until approved.",
    multiline: true,
    draft:
      "The American Legion was founded on four pillars: veterans affairs and rehabilitation, national security, Americanism, and children and youth. Post 186 lives those pillars locally.\n\n- Supporting veterans and their families in Hammonton and neighboring towns\n- Honoring the fallen at ceremonies throughout the year\n- Opening our hall to community groups, families, and nonprofits\n- Partnering with local schools, youth programs, and civic organizations",
  },
  { key: "about_officers", label: "Current officers and leadership", group: "About the Post", help: "One per line, for example: Commander: Name", multiline: true, fact: true },
  { key: "about_timeline", label: "Historical timeline", group: "About the Post", help: "One milestone per line, starting with the year, for example: 1946 - Post chartered", multiline: true, fact: true },

  // Membership
  {
    key: "membership_overview",
    label: "Why join (overview)",
    group: "Membership",
    help: "Draft copy until approved.",
    multiline: true,
    draft:
      "Joining Post 186 connects you with people who understand where you have been. Members find fellowship at the hall, a voice on veterans' issues, and practical help navigating benefits.\n\n- Fellowship with veterans of every era\n- Help with VA claims and benefits through Legion service officers\n- A say in how the Post serves Hammonton\n- Ceremonies, socials, and volunteer opportunities year-round\n- Legion Family programs for spouses, children, and supporters",
  },
  { key: "membership_dues", label: "Annual dues", group: "Membership", help: "Current dues amount, if leadership wants it published.", fact: true },
  { key: "membership_meeting", label: "Regular meeting schedule", group: "Membership", help: "For example: Second Tuesday of each month at 7 pm", fact: true },

  // Hall rentals
  {
    key: "rental_overview",
    label: "Hall overview",
    group: "Hall rentals",
    help: "Draft copy until approved.",
    multiline: true,
    draft:
      "Our hall on French Street hosts family celebrations, community meetings, memorial gatherings, and nonprofit events. Renting the hall also supports the Post's work for local veterans.",
  },
  { key: "rental_capacity", label: "Capacity", group: "Hall rentals", help: "For example: up to 120 seated", fact: true },
  { key: "rental_accessibility", label: "Accessibility", group: "Hall rentals", help: "Entrances, restrooms, parking.", fact: true },
  { key: "rental_parking", label: "Parking", group: "Hall rentals", help: "", fact: true },
  { key: "rental_tables_chairs", label: "Tables and chairs", group: "Hall rentals", help: "", fact: true },
  { key: "rental_kitchen", label: "Kitchen", group: "Hall rentals", help: "", fact: true },
  { key: "rental_bar", label: "Bar", group: "Hall rentals", help: "", fact: true },
  { key: "rental_av", label: "Audio and visual equipment", group: "Hall rentals", help: "", fact: true },
  { key: "rental_setup", label: "Setup rules", group: "Hall rentals", help: "", multiline: true, fact: true },
  { key: "rental_cleanup", label: "Cleanup rules", group: "Hall rentals", help: "", multiline: true, fact: true },
  { key: "rental_alcohol", label: "Alcohol policy", group: "Hall rentals", help: "", multiline: true, fact: true },
  { key: "rental_insurance", label: "Insurance requirements", group: "Hall rentals", help: "", multiline: true, fact: true },
  { key: "rental_deposit", label: "Deposit", group: "Hall rentals", help: "", fact: true },
  { key: "rental_rates", label: "Rates", group: "Hall rentals", help: "", multiline: true, fact: true },
  { key: "rental_windows", label: "Available rental windows", group: "Hall rentals", help: "Days and hours the hall can be booked.", multiline: true, fact: true },
  { key: "rental_event_types", label: "Permitted event types", group: "Hall rentals", help: "One per line. Only list uses leadership has approved.", multiline: true, fact: true },

  // Privacy and accessibility
  { key: "privacy_retention", label: "How long inquiries are kept", group: "Privacy and accessibility", help: "For example: 12 months after the inquiry is closed", fact: true },
  { key: "privacy_contact", label: "Privacy contact", group: "Privacy and accessibility", help: "Who handles deletion or correction requests (name or role, plus email).", fact: true },
  { key: "accessibility_contact", label: "Accessibility contact", group: "Privacy and accessibility", help: "Who to reach about an accessibility problem (name or role, plus email or phone).", fact: true },
];

const FIELD_MAP = new Map(CONTENT_FIELDS.map((f) => [f.key, f]));

export type SiteContent = Record<string, string>;

/** Returns every content value; drafts fill in blanks so the public site never shows raw placeholders. */
export async function getSiteContent(): Promise<SiteContent> {
  const stored = await getStoredContent();
  const out: SiteContent = {};
  for (const f of CONTENT_FIELDS) {
    const v = (stored[f.key] ?? "").trim();
    out[f.key] = v !== "" ? v : (f.draft ?? "");
  }
  return out;
}

/** Raw stored values for the admin editor (blank when nothing has been saved yet). */
export async function getStoredContent(): Promise<SiteContent> {
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM site_content");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveSiteContent(values: Record<string, string>): Promise<void> {
  const entries = Object.entries(values).filter(([key]) => FIELD_MAP.has(key));
  if (entries.length === 0) return;
  const now = nowIso();
  await transaction(async (client) => {
    for (const [key, value] of entries) {
      await client.query(
        "INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at",
        [key, value.trim().slice(0, 20000), now],
      );
    }
  });
}

/** Keys that still hold no verified value: drives the content checklist in admin. */
export async function missingFacts(): Promise<ContentField[]> {
  const stored = await getStoredContent();
  return CONTENT_FIELDS.filter((f) => f.fact && !(stored[f.key] ?? "").trim());
}

export function contentGroups(): string[] {
  return Array.from(new Set(CONTENT_FIELDS.map((f) => f.group)));
}
