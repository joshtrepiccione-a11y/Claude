import "server-only";

import type { Ymd } from "./dates";
import { occurrencesBetween } from "./recurrence";
import { listBlockedDates, listBookingsFrom, listEvents } from "./repo";
import type { DayStatus } from "./types";

/**
 * A fresh (uncached) check of one date, used right before a request is saved
 * so two people can never be told the same date is open.
 */
export async function liveDayStatus(date: Ymd): Promise<DayStatus | null> {
  const [blocked, bookings, events] = await Promise.all([
    listBlockedDates(date),
    listBookingsFrom(date),
    listEvents({ publishedOnly: true }),
  ]);

  if (blocked.some((b) => b.date === date)) return "closed";
  const sameDay = bookings.filter((b) => b.eventDate === date);
  if (sameDay.some((b) => b.status === "approved")) return "booked";
  const postEvent = events.some(
    (e) => e.usesHall && !e.cancelled && occurrencesBetween(e, date, date).length > 0,
  );
  if (postEvent) return "post";
  if (sameDay.some((b) => b.status === "pending")) return "pending";
  return null;
}
