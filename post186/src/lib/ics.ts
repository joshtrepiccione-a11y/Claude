import { POST_TIME_ZONE, addDays, weekdayOf, type Ymd } from "./dates";
import { nthWeekdayIndex } from "./recurrence";
import type { EventRecord } from "./types";

/**
 * iCalendar (RFC 5545) output, so members can subscribe to the post calendar
 * from Google Calendar, Apple Calendar or Outlook, or add a single event.
 */

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// US Eastern rules since 2007. Included so calendar apps convert times correctly.
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${POST_TIME_ZONE}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 bytes must be folded with CRLF + space. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const max = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (currentBytes + size > max) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  if (current) parts.push(current);
  return parts.join("\r\n ");
}

const compactDate = (ymd: Ymd) => ymd.replace(/-/g, "");
const compactTime = (hm: string) => `${hm.replace(":", "")}00`;

function utcStamp(iso: string): string {
  const d = new Date(iso);
  const safe = Number.isNaN(d.getTime()) ? new Date(0) : d;
  return safe.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function rrule(event: EventRecord): string | null {
  const day = DAY_CODES[weekdayOf(event.startDate)];
  let rule: string;
  switch (event.recurrence) {
    case "none":
      return null;
    case "weekly":
      rule = `FREQ=WEEKLY;BYDAY=${day}`;
      break;
    case "biweekly":
      rule = `FREQ=WEEKLY;INTERVAL=2;BYDAY=${day}`;
      break;
    case "monthly_nth":
      rule = `FREQ=MONTHLY;BYDAY=${nthWeekdayIndex(event.startDate)}${day}`;
      break;
    case "monthly_last":
      rule = `FREQ=MONTHLY;BYDAY=-1${day}`;
      break;
    case "yearly":
      rule = "FREQ=YEARLY";
      break;
  }
  if (event.repeatUntil) {
    rule += event.startTime
      ? // UNTIL must be UTC for timed events; the end of that day Eastern is always before 05:00Z the next day.
        `;UNTIL=${compactDate(addDays(event.repeatUntil, 1))}T045959Z`
      : `;UNTIL=${compactDate(event.repeatUntil)}`;
  }
  return `RRULE:${rule}`;
}

function vevent(event: EventRecord, baseUrl: string, host: string): string[] {
  const lines = ["BEGIN:VEVENT", `UID:event-${event.id}@${host}`, `DTSTAMP:${utcStamp(event.updatedAt)}`];

  if (event.startTime) {
    lines.push(`DTSTART;TZID=${POST_TIME_ZONE}:${compactDate(event.startDate)}T${compactTime(event.startTime)}`);
    if (event.endTime && event.endTime > event.startTime) {
      lines.push(`DTEND;TZID=${POST_TIME_ZONE}:${compactDate(event.startDate)}T${compactTime(event.endTime)}`);
    }
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(event.startDate, 1))}`);
  }

  const rule = rrule(event);
  if (rule) {
    lines.push(rule);
    for (const skip of event.skipDates) {
      lines.push(
        event.startTime
          ? `EXDATE;TZID=${POST_TIME_ZONE}:${compactDate(skip)}T${compactTime(event.startTime)}`
          : `EXDATE;VALUE=DATE:${compactDate(skip)}`,
      );
    }
  }

  const url = `${baseUrl}/events/${event.slug}`;
  const description = [event.summary, event.description, url].filter(Boolean).join("\n\n");
  lines.push(`SUMMARY:${escapeText((event.cancelled ? "CANCELLED: " : "") + event.title)}`);
  lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  lines.push(`URL:${url}`);
  if (event.cancelled) lines.push("STATUS:CANCELLED");
  lines.push("END:VEVENT");
  return lines;
}

export function buildCalendar(events: EventRecord[], options: { name: string; baseUrl: string }): string {
  let host = "post186";
  try {
    host = new URL(options.baseUrl).hostname;
  } catch {
    // keep the fallback host for UIDs
  }
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//American Legion Post 186//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.name)}`,
    `X-WR-TIMEZONE:${POST_TIME_ZONE}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE,
    ...events.flatMap((event) => vevent(event, options.baseUrl, host)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** "Add to Google Calendar" link for one dated occurrence. */
export function googleCalendarUrl(event: EventRecord, date: Ymd, baseUrl: string): string {
  const dates = event.startTime
    ? `${compactDate(date)}T${compactTime(event.startTime)}/${compactDate(date)}T${compactTime(
        event.endTime && event.endTime > event.startTime ? event.endTime : event.startTime,
      )}`
    : `${compactDate(date)}/${compactDate(addDays(date, 1))}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    ctz: POST_TIME_ZONE,
    details: [event.summary, `${baseUrl}/events/${event.slug}`].filter(Boolean).join("\n\n"),
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
