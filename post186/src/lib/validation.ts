import { z } from "zod";

const SSN_PATTERN = /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/;
const trimmed = (max: number, min = 0) => z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

function noSensitiveNumbers(field: string) {
  return (value: string, ctx: z.RefinementCtx) => {
    if (SSN_PATTERN.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: `Please remove anything that looks like a Social Security number from the ${field}. We never need it to reply.`,
      });
    }
  };
}

export const CONTACT_METHODS = ["email", "phone", "either"] as const;
export const SERVICE_CONNECTIONS = [
  "veteran",
  "active_duty",
  "guard_reserve",
  "family",
  "community",
  "other",
  "prefer_not_to_say",
] as const;
export const MEMBERSHIP_INTERESTS = ["join", "transfer", "learn_more", "volunteer", "other"] as const;
export const ALCOHOL_OPTIONS = ["no", "yes", "not_sure"] as const;

export const SERVICE_CONNECTION_LABELS: Record<(typeof SERVICE_CONNECTIONS)[number], string> = {
  veteran: "I am a veteran",
  active_duty: "I am currently serving on active duty",
  guard_reserve: "I serve or served in the National Guard or Reserve",
  family: "I am a family member of someone who served",
  community: "I am a community member",
  other: "Other",
  prefer_not_to_say: "I prefer not to say yet",
};
export const MEMBERSHIP_INTEREST_LABELS: Record<(typeof MEMBERSHIP_INTERESTS)[number], string> = {
  join: "I would like to join Post 186",
  transfer: "I am a Legion member and want to transfer to Post 186",
  learn_more: "I want to learn more before deciding",
  volunteer: "I want to volunteer or support the Post",
  other: "Something else",
};
export const CONTACT_METHOD_LABELS: Record<(typeof CONTACT_METHODS)[number], string> = {
  email: "Email",
  phone: "Phone",
  either: "Either is fine",
};
export const ALCOHOL_LABELS: Record<(typeof ALCOHOL_OPTIONS)[number], string> = {
  no: "No alcohol",
  yes: "Yes, we would like alcohol service",
  not_sure: "Not sure yet",
};

const baseContact = {
  name: trimmed(120, 2),
  email: z.string().trim().toLowerCase().email("Enter a valid email address, like name@example.com.").max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .default("")
    .refine((v) => v === "" || /^[0-9+()\-.\s]{7,40}$/.test(v), "Enter a phone number using digits, spaces, dashes, or parentheses."),
  contact_method: z.enum(CONTACT_METHODS, { message: "Choose how you would like us to reach you." }),
  consent: z.literal("on", { message: "Please check the box so we know we may contact you." }),
  website: z.string().max(0, "Spam check failed.").optional().default(""),
};

export const membershipSchema = z.object({
  ...baseContact,
  service_connection: z.enum(SERVICE_CONNECTIONS, { message: "Choose the option that best describes you." }),
  service_area: optionalText(200),
  interest: z.enum(MEMBERSHIP_INTERESTS, { message: "Tell us what you are interested in." }),
  message: optionalText(3000).superRefine(noSensitiveNumbers("message")),
});

export const rentalSchema = z
  .object({
    ...baseContact,
    organization: optionalText(160),
    event_type: trimmed(120, 2),
    preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a first-choice date."),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time."),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Choose an end time."),
    alternate_date: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use the date picker for the alternate date."),
    guest_count: z.coerce.number({ message: "Enter an estimated number of guests." }).int().min(1, "Enter at least 1 guest.").max(5000, "Enter a realistic guest count."),
    accessibility_needs: optionalText(1000),
    alcohol: z.enum(ALCOHOL_OPTIONS, { message: "Let us know whether alcohol service is planned." }),
    description: trimmed(3000, 5).superRefine(noSensitiveNumbers("event description")),
    notes: optionalText(2000),
  })
  .refine((v) => v.end_time > v.start_time, { message: "End time must be after the start time.", path: ["end_time"] });

export const generalSchema = z.object({
  ...baseContact,
  subject: optionalText(160),
  message: trimmed(3000, 5).superRefine(noSensitiveNumbers("message")),
});

export type MembershipInput = z.infer<typeof membershipSchema>;
export type RentalInput = z.infer<typeof rentalSchema>;
export type GeneralInput = z.infer<typeof generalSchema>;

/** Flatten zod issues into { field: message } for form display. */
export function issuesToErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = friendlyMessage(key, issue.message);
  }
  return out;
}

function friendlyMessage(field: string, message: string): string {
  if (/too small|at least 2|>=2/i.test(message) && field === "name") return "Enter your full name.";
  if (/too small/i.test(message)) return "This field is required.";
  if (/too big/i.test(message)) return "This is a little too long. Please shorten it.";
  if (/invalid option|invalid enum|Invalid input/i.test(message)) return "Choose one of the options.";
  return message;
}

/** Admin-side schemas. */
export const POST_STATUSES = ["draft", "scheduled", "published"] as const;
export const EVENT_STATUSES = ["scheduled", "postponed", "cancelled"] as const;
export const INQUIRY_STATUSES = ["new", "in_progress", "contacted", "closed", "spam"] as const;
export const INQUIRY_STATUS_LABELS: Record<(typeof INQUIRY_STATUSES)[number], string> = {
  new: "New",
  in_progress: "In progress",
  contacted: "Contacted",
  closed: "Closed",
  spam: "Spam",
};

const imagePath = z
  .string()
  .trim()
  .max(300)
  .optional()
  .default("")
  .refine((v) => v === "" || v.startsWith("/images/") || /^https:\/\//.test(v), "Use a path under /images/ or a full https:// address.");

export const postSchema = z.object({
  title: trimmed(200, 2),
  slug: z.string().trim().max(80).optional().default(""),
  excerpt: optionalText(400),
  body: trimmed(50000, 1),
  author: optionalText(120),
  category: optionalText(80),
  featured_image: imagePath,
  image_alt: optionalText(300),
  status: z.enum(POST_STATUSES),
  is_featured: z.string().optional().default(""),
  publish_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a publish date and time."),
  seo_title: optionalText(70),
  meta_description: optionalText(160),
});

export const eventSchema = z
  .object({
    title: trimmed(200, 2),
    slug: z.string().trim().max(80).optional().default(""),
    summary: optionalText(300),
    description: optionalText(20000),
    start_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a start date and time."),
    end_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose an end date and time."),
    all_day: z.string().optional().default(""),
    location: optionalText(200),
    is_public: z.string().optional().default(""),
    category: optionalText(80),
    featured_image: imagePath,
    image_alt: optionalText(300),
    organizer: optionalText(200),
    cost: optionalText(120),
    link_url: z
      .string()
      .trim()
      .max(500)
      .optional()
      .default("")
      .refine((v) => v === "" || /^https?:\/\//.test(v), "Enter a full web address starting with https://"),
    link_label: optionalText(80),
    accessibility_notes: optionalText(1000),
    recurrence: optionalText(200),
    status: z.enum(EVENT_STATUSES),
    is_featured: z.string().optional().default(""),
    is_archived: z.string().optional().default(""),
  })
  .refine((v) => v.end_at >= v.start_at, { message: "End must be at or after the start.", path: ["end_at"] });

export const categorySchema = z.object({
  kind: z.enum(["post", "event"]),
  name: trimmed(60, 2),
});

export const loginSchema = z.object({
  username: trimmed(100, 1),
  password: z.string().min(1).max(500),
});
