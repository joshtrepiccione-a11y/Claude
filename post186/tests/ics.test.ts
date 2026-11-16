import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, foldLine, googleCalendarUrl } from "@/lib/ics";
import type { EventRecord } from "@/lib/types";

const event = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  id: 7,
  slug: "monthly-meeting",
  title: "Monthly Meeting; all members",
  summary: "Post business, reports and fellowship.",
  description: "",
  category: "meeting",
  location: "Post 186 Hall, 101 French Street, Hammonton",
  startDate: "2026-11-10",
  startTime: "19:00",
  endTime: "20:30",
  recurrence: "monthly_nth",
  repeatUntil: null,
  skipDates: ["2026-12-08"],
  audience: "members",
  usesHall: true,
  featured: false,
  published: true,
  cancelled: false,
  isDemo: false,
  updatedAt: "2026-11-01T12:00:00.000Z",
  ...overrides,
});

describe("calendar feed", () => {
  const ics = buildCalendar([event()], { name: "Post 186 Events", baseUrl: "https://post186.example" });

  it("is a well-formed calendar with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VTIMEZONE");
  });

  it("writes local times with the post's time zone and a recurrence rule", () => {
    expect(ics).toContain("DTSTART;TZID=America/New_York:20261110T190000");
    expect(ics).toContain("DTEND;TZID=America/New_York:20261110T203000");
    expect(ics).toContain("RRULE:FREQ=MONTHLY;BYDAY=2TU");
    expect(ics).toContain("EXDATE;TZID=America/New_York:20261208T190000");
    expect(ics).toContain("UID:event-7@post186.example");
  });

  it("escapes punctuation that has meaning in the format", () => {
    expect(ics).toContain(String.raw`SUMMARY:Monthly Meeting\; all members`);
    expect(escapeText("a,b;c\nd")).toBe(String.raw`a\,b\;c\nd`);
  });

  it("writes all-day events as dates", () => {
    const allDay = buildCalendar([event({ startTime: null, endTime: null, recurrence: "none", skipDates: [] })], {
      name: "x",
      baseUrl: "https://post186.example",
    });
    expect(allDay).toContain("DTSTART;VALUE=DATE:20261110");
    expect(allDay).toContain("DTEND;VALUE=DATE:20261111");
    const vevent = allDay.slice(allDay.indexOf("BEGIN:VEVENT"));
    expect(vevent).not.toContain("RRULE");
  });

  it("folds long lines at 75 bytes", () => {
    const folded = foldLine(`DESCRIPTION:${"x".repeat(200)}`);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(`DESCRIPTION:${"x".repeat(200)}`);
  });

  it("builds a Google Calendar link for one date", () => {
    const url = new URL(googleCalendarUrl(event(), "2026-12-08", "https://post186.example"));
    expect(url.searchParams.get("dates")).toBe("20261208T190000/20261208T203000");
    expect(url.searchParams.get("ctz")).toBe("America/New_York");
  });
});
