import type { Hm, Ymd } from "./dates";
import type { Recurrence } from "./recurrence";

export const EVENT_CATEGORIES = [
  { value: "meeting", label: "Meeting" },
  { value: "ceremony", label: "Ceremony & Remembrance" },
  { value: "community", label: "Community" },
  { value: "social", label: "Social" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "youth", label: "Youth & Scholarships" },
  { value: "service", label: "Veteran Services" },
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number]["value"];

export function categoryLabel(value: string): string {
  return EVENT_CATEGORIES.find((c) => c.value === value)?.label ?? "Event";
}

export type EventRecord = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: EventCategory;
  location: string;
  startDate: Ymd;
  startTime: Hm | null; // null = all day
  endTime: Hm | null;
  recurrence: Recurrence;
  repeatUntil: Ymd | null;
  skipDates: Ymd[];
  audience: "public" | "members";
  usesHall: boolean;
  featured: boolean;
  published: boolean;
  cancelled: boolean;
  isDemo: boolean;
  updatedAt: string;
};

/** One dated instance of an event (recurring events produce many). */
export type Occurrence = {
  date: Ymd;
  event: EventRecord;
};

export const OFFICER_GROUPS = [
  { value: "officer", label: "Post Officers" },
  { value: "committee", label: "Committee Chairs" },
  { value: "family", label: "Legion Family" },
] as const;

export type OfficerGroup = (typeof OFFICER_GROUPS)[number]["value"];

export type Officer = {
  id: number;
  name: string;
  title: string;
  group: OfficerGroup;
  email: string;
  phone: string;
  showEmail: boolean;
  showPhone: boolean;
  acceptsMessages: boolean;
  bio: string;
  photoUrl: string;
  sortOrder: number;
  isDemo: boolean;
};

/** What the public site is allowed to know about an officer. */
export type PublicOfficer = {
  id: number;
  name: string;
  title: string;
  group: OfficerGroup;
  email: string | null;
  phone: string | null;
  acceptsMessages: boolean;
  bio: string;
  photoUrl: string;
};

export const BOOKING_STATUSES = ["pending", "approved", "declined", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_EVENT_TYPES = [
  "Birthday party",
  "Baby or bridal shower",
  "Wedding or reception",
  "Anniversary",
  "Graduation party",
  "Repast / memorial gathering",
  "Meeting or training",
  "Fundraiser or benefit",
  "Other",
] as const;

export type Booking = {
  id: number;
  reference: string;
  status: BookingStatus;
  eventDate: Ymd;
  startTime: Hm;
  endTime: Hm;
  eventType: string;
  guestCount: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  organization: string;
  isMember: boolean;
  alcohol: boolean;
  kitchen: boolean;
  notes: string;
  adminNotes: string;
  declineReason: string;
  quotedAmount: string;
  depositPaid: boolean;
  source: "web" | "admin";
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
};

export type BlockedDate = {
  id: number;
  date: Ymd;
  reason: string;
};

export type Message = {
  id: number;
  name: string;
  email: string;
  phone: string;
  topic: string;
  officerId: number | null;
  officerName: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  createdAt: string;
};

/** Why a date can't be requested on the public hall calendar. */
export type DayStatus = "booked" | "post" | "closed" | "pending";

export type HallAvailability = {
  today: Ymd;
  firstBookable: Ymd;
  lastBookable: Ymd;
  /** Only dates with something on them are listed; everything else is open. */
  days: Record<Ymd, DayStatus>;
};
