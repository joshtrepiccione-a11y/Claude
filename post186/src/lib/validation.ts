import { z } from "zod";
import { isHm, isYmd, minutesOf } from "./dates";
import { RECURRENCE_VALUES } from "./recurrence";
import { BOOKING_EVENT_TYPES, EVENT_CATEGORIES } from "./types";

/** The shape every form action returns, so forms can show errors next to fields. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
  /** What the visitor typed, so a failed submit doesn't wipe the form. */
  values?: Record<string, string>;
  /** Extra details for a success screen (for example a booking reference). */
  data?: Record<string, string>;
};

export const IDLE: FormState = { status: "idle" };

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Text fields from a submitted form (files and passwords are left out). */
export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.toLowerCase().includes("password") && !key.startsWith("$")) {
      out[key] = value;
    }
  }
  return out;
}

const text = (max: number) => z.string().trim().max(max, `Please keep this under ${max} characters.`);
const required = (label: string, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `Please keep this under ${max} characters.`);

const email = z
  .string({ error: "Email address is required." })
  .trim()
  .toLowerCase()
  .min(1, "Email address is required.")
  .max(200, "That email address is too long.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address, like name@example.com.");

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address.");

const phone = z
  .string({ error: "Phone number is required." })
  .trim()
  .max(40, "That phone number is too long.")
  .refine((v) => {
    const digits = v.replace(/\D/g, "").length;
    return digits >= 10 && digits <= 15;
  }, "Enter a phone number with area code, like (609) 555-0100.");

const optionalPhone = z
  .string()
  .trim()
  .max(40)
  .refine((v) => {
    if (v === "") return true;
    const digits = v.replace(/\D/g, "").length;
    return digits >= 10 && digits <= 15;
  }, "Enter a phone number with area code, or leave this blank.");

const ymd = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .min(1, `${label} is required.`)
    .refine((v) => v === "" || isYmd(v), `Choose a valid ${label.toLowerCase()}.`);
const optionalYmd = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || isYmd(v), "Choose a valid date.")
  .transform((v) => (v === "" ? null : v));
const hm = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .min(1, `${label} is required.`)
    .refine((v) => v === "" || isHm(v), `Choose a valid ${label.toLowerCase()}.`);
const optionalHm = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || isHm(v), "Choose a valid time.")
  .transform((v) => (v === "" ? null : v));

// An unticked checkbox is simply missing from a submitted form.
const checkbox = z
  .string()
  .default("")
  .transform((v) => v === "on" || v === "true" || v === "1");

// ───────────────────────── Hall booking ─────────────────────────

const bookingCore = z.object({
  eventDate: ymd("Event date"),
  startTime: hm("Start time"),
  endTime: hm("End time"),
  eventType: z.enum(BOOKING_EVENT_TYPES, { error: "Choose the type of event." }),
  guestCount: z.coerce
    .number({ error: "Enter the number of guests." })
    .int("Enter a whole number of guests.")
    .min(1, "Enter the number of guests."),
  contactName: required("Your name", 100),
  contactEmail: email,
  contactPhone: phone,
  organization: text(120).default(""),
  isMember: checkbox,
  alcohol: checkbox,
  kitchen: checkbox,
  notes: text(2000).default(""),
});

const endAfterStart = (v: { startTime: string; endTime: string }) =>
  !isHm(v.startTime) || !isHm(v.endTime) || minutesOf(v.endTime) - minutesOf(v.startTime) >= 60;

export const bookingRequestSchema = bookingCore
  .extend({
    agree: checkbox.refine((v) => v, "Please confirm you have read the rental policies."),
  })
  .refine(endAfterStart, {
    path: ["endTime"],
    message: "The end time must be at least one hour after the start time.",
  });

export const adminBookingSchema = bookingCore
  .extend({
    // Bookings taken by phone may not have every detail yet.
    contactEmail: optionalEmail,
    contactPhone: optionalPhone,
    adminNotes: text(4000).default(""),
    quotedAmount: text(60).default(""),
    depositPaid: checkbox,
  })
  .refine(endAfterStart, {
    path: ["endTime"],
    message: "The end time must be at least one hour after the start time.",
  });

export const REFERENCE_RE = /^P186-[A-Z0-9]{5,6}$/;

export const statusLookupSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(REFERENCE_RE, "Enter the reference from your confirmation, like P186-AB12CD."),
  email,
});

// ───────────────────────── Contact form ─────────────────────────

export const CONTACT_TOPICS = [
  "General question",
  "Joining Post 186",
  "Hall rental",
  "Help for a veteran",
  "Events & volunteering",
  "Donations & sponsorship",
] as const;

export const contactSchema = z.object({
  name: required("Your name", 100),
  email,
  phone: optionalPhone.default(""),
  topic: z.enum(CONTACT_TOPICS, { error: "Choose a topic." }),
  officerId: z
    .string()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : null)),
  body: z
    .string({ error: "Please write a message." })
    .trim()
    .min(10, "Please write a few words so we know how to help.")
    .max(4000, "Please keep your message under 4,000 characters."),
});

// ───────────────────────── Admin: events ─────────────────────────

export const eventSchema = z
  .object({
    title: required("Event name", 120),
    summary: text(200).default(""),
    description: text(6000).default(""),
    category: z.enum(
      EVENT_CATEGORIES.map((c) => c.value) as [string, ...string[]],
      { error: "Choose a category." },
    ),
    location: text(160).default(""),
    startDate: ymd("Date"),
    allDay: checkbox,
    startTime: optionalHm,
    endTime: optionalHm,
    recurrence: z.enum(RECURRENCE_VALUES, { error: "Choose how often this repeats." }),
    repeatUntil: optionalYmd,
    skipDates: z
      .string()
      .default("")
      .transform((v) =>
        v
          .split(/[\s,;]+/)
          .map((d) => d.trim())
          .filter(Boolean),
      )
      .refine((list) => list.every(isYmd), "Use dates like 2026-12-25, separated by commas."),
    audience: z.enum(["public", "members"]),
    usesHall: checkbox,
    featured: checkbox,
    published: checkbox,
    cancelled: checkbox,
  })
  .refine((v) => v.allDay || v.startTime !== null, {
    path: ["startTime"],
    message: "Enter a start time, or tick “All day”.",
  })
  .refine((v) => v.allDay || !v.startTime || !v.endTime || v.endTime > v.startTime, {
    path: ["endTime"],
    message: "The end time must be after the start time.",
  })
  .refine((v) => !v.repeatUntil || v.repeatUntil >= v.startDate, {
    path: ["repeatUntil"],
    message: "This must be on or after the event date.",
  });

// ───────────────────────── Admin: officers ─────────────────────────

export const officerSchema = z.object({
  name: required("Name", 100),
  title: required("Office or title", 100),
  group: z.enum(["officer", "committee", "family"]),
  email: optionalEmail.default(""),
  phone: optionalPhone.default(""),
  showEmail: checkbox,
  showPhone: checkbox,
  acceptsMessages: checkbox,
  bio: text(1200).default(""),
  photoUrl: z
    .string()
    .trim()
    .max(300)
    .default("")
    .refine(
      (v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v),
      "Use a path like /photos/officers/name.jpg or a full https:// address.",
    ),
});

// ───────────────────────── Admin: settings ─────────────────────────

const url = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v),
    "Use a full address starting with https:// (or a page on this site starting with /).",
  );

export const settingsSchema = z
  .object({
    orgName: required("Organization name", 80),
    postName: required("Post name", 80),
    postNumber: required("Post number", 10),
    street: required("Street address", 120),
    city: required("City", 60),
    state: required("State", 2),
    stateName: required("State name", 40),
    zip: required("ZIP code", 10),
    mailingAddress: text(160).default(""),
    phone: optionalPhone.default(""),
    email: optionalEmail.default(""),
    facebookUrl: url.default(""),
    meetingSchedule: text(300).default(""),
    hours: text(300).default(""),
    notifyEmail: optionalEmail.default(""),
    announcementEnabled: checkbox,
    announcementText: text(200).default(""),
    announcementLinkLabel: text(40).default(""),
    announcementLinkUrl: url.default(""),
    hallName: required("Hall name", 80),
    hallCapacity: z.coerce
      .number({ error: "Enter the hall capacity." })
      .int()
      .min(1, "Enter the hall capacity.")
      .max(2000),
    hallIntro: text(800).default(""),
    hallAmenities: text(2000).default(""),
    hallRates: text(2000).default(""),
    hallRatesNote: text(400).default(""),
    hallPolicies: text(4000).default(""),
    hallOpenTime: hm("Earliest start time"),
    hallCloseTime: hm("Latest end time"),
    hallMinNoticeDays: z.coerce.number().int().min(0).max(365),
    hallMaxAdvanceMonths: z.coerce.number().int().min(1).max(36),
    hallResponseTime: text(200).default(""),
  })
  .refine((v) => v.hallCloseTime > v.hallOpenTime, {
    path: ["hallCloseTime"],
    message: "The latest end time must be after the earliest start time.",
  })
  .refine((v) => !v.announcementEnabled || v.announcementText.length > 0, {
    path: ["announcementText"],
    message: "Write the announcement, or switch it off.",
  });

// ───────────────────────── Admin: accounts ─────────────────────────

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Enter your password." }).min(1, "Enter your password."),
});

export const passwordSchema = (minLength: number) =>
  z
    .string({ error: "Enter a password." })
    .min(minLength, `Use at least ${minLength} characters.`)
    .max(200, "That password is too long.");
