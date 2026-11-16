import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_CACHE } from "@/lib/cache";
import { addDays, addMonths, todayInPostTz, type Hm, type Ymd } from "./dates";
import { occurrencesBetween, nextOccurrence, previousOccurrence } from "./recurrence";
import {
  listBlockedDates,
  listBookingsFrom,
  listEvents,
  listOfficers,
  readSettings,
} from "./repo";
import type { SiteSettings } from "./settings";
import type {
  DayStatus,
  EventCategory,
  EventRecord,
  HallAvailability,
  Occurrence,
  PublicOfficer,
} from "./types";

/**
 * Cached reads for the public site.
 *
 * Each function is tagged, and the matching admin action clears that tag the
 * moment an officer saves a change, so edits show up immediately. In between,
 * pages are served from cache and stay fast even on the smallest hosting plan.
 *
 * Tags: "settings", "events", "officers", "bookings".
 */

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("settings");
  return readSettings();
}

async function publishedEvents(): Promise<EventRecord[]> {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("events");
  return listEvents({ publishedOnly: true });
}

function byDateThenTime(a: Occurrence, b: Occurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return (a.event.startTime ?? "").localeCompare(b.event.startTime ?? "");
}

function expand(events: EventRecord[], from: Ymd, to: Ymd): Occurrence[] {
  const out: Occurrence[] = [];
  for (const event of events) {
    for (const date of occurrencesBetween(event, from, to)) out.push({ date, event });
  }
  return out.sort(byDateThenTime);
}

/** The next few things happening at the post, for the home page. */
export async function getUpcomingOccurrences(limit: number): Promise<Occurrence[]> {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("events");
  const today = todayInPostTz();
  const events = await publishedEvents();
  return expand(events, today, addDays(today, 180))
    .filter((o) => !o.event.cancelled)
    .slice(0, limit);
}

/** A trimmed-down occurrence that is safe and small enough to send to the browser. */
export type CalendarEntry = {
  date: Ymd;
  slug: string;
  title: string;
  startTime: Hm | null;
  endTime: Hm | null;
  category: EventCategory;
  cancelled: boolean;
};

export type EventsPageData = {
  today: Ymd;
  upcoming: Occurrence[];
  past: Occurrence[];
  calendar: CalendarEntry[];
};

export async function getEventsPageData(): Promise<EventsPageData> {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("events");
  const today = todayInPostTz();
  const events = await publishedEvents();

  // The list covers about ten weeks; the month view reaches a year ahead.
  const upcoming = expand(events, today, addDays(today, 70)).slice(0, 40);
  const past = expand(events, addDays(today, -365), addDays(today, -1))
    .reverse()
    .slice(0, 12);
  const monthStart = `${today.slice(0, 7)}-01`;
  const calendar = expand(events, monthStart, addMonths(monthStart, 13)).map((o) => ({
    date: o.date,
    slug: o.event.slug,
    title: o.event.title,
    startTime: o.event.startTime,
    endTime: o.event.endTime,
    category: o.event.category,
    cancelled: o.event.cancelled,
  }));

  return { today, upcoming, past, calendar };
}

export type EventDetail = {
  event: EventRecord;
  today: Ymd;
  /** The date to feature: the next occurrence, or the most recent one if it's over. */
  displayDate: Ymd;
  isPast: boolean;
  upcomingDates: Ymd[];
};

export async function getEventDetail(slug: string): Promise<EventDetail | null> {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("events");
  const events = await publishedEvents();
  const event = events.find((e) => e.slug === slug);
  if (!event) return null;

  const today = todayInPostTz();
  const next = nextOccurrence(event, today);
  const displayDate = next ?? previousOccurrence(event, today) ?? event.startDate;
  const upcomingDates =
    event.recurrence === "none" ? [] : occurrencesBetween(event, today, addDays(today, 366), 6);

  return { event, today, displayDate, isPast: !next, upcomingDates };
}

export async function getEventSlugs(): Promise<string[]> {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("events");
  return (await publishedEvents()).map((e) => e.slug);
}

/** All published events, for the calendar subscription feed and the sitemap. */
export async function getFeedEvents(): Promise<EventRecord[]> {
  return publishedEvents();
}

/** Officers as the public may see them: contact details only when the officer opted in. */
export async function getPublicOfficers(): Promise<PublicOfficer[]> {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("officers");
  const officers = await listOfficers();
  return officers.map((o) => ({
    id: o.id,
    name: o.name,
    title: o.title,
    group: o.group,
    email: o.showEmail && o.email ? o.email : null,
    phone: o.showPhone && o.phone ? o.phone : null,
    acceptsMessages: o.acceptsMessages,
    bio: o.bio,
    photoUrl: o.photoUrl,
  }));
}

/**
 * Which dates the hall calendar should show as taken. Renter names and
 * details never leave the server — only a status per date.
 */
export async function getHallAvailability(): Promise<HallAvailability> {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("bookings", "events", "settings");

  const settings = await readSettings();
  const today = todayInPostTz();
  const firstBookable = addDays(today, Math.max(0, settings.hall.minNoticeDays));
  const lastBookable = addMonths(today, Math.max(1, settings.hall.maxAdvanceMonths));

  const [bookings, blocked, events] = await Promise.all([
    listBookingsFrom(today),
    listBlockedDates(today),
    listEvents({ publishedOnly: true }),
  ]);

  const days: Record<Ymd, DayStatus> = {};
  for (const b of bookings) {
    if (b.status === "pending" && !days[b.eventDate]) days[b.eventDate] = "pending";
  }
  for (const event of events) {
    if (!event.usesHall || event.cancelled) continue;
    for (const date of occurrencesBetween(event, today, lastBookable)) days[date] = "post";
  }
  for (const b of bookings) {
    if (b.status === "approved") days[b.eventDate] = "booked";
  }
  for (const b of blocked) days[b.date] = "closed";

  return { today, firstBookable, lastBookable, days };
}
