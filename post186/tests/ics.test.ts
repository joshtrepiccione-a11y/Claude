import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl } from "@/lib/ics";

const event = {
  uid: "event-1@post186",
  title: "Pancake breakfast; all welcome, bring friends",
  description: "Line one\nLine two",
  location: "101 French Street, Hammonton, NJ 08037",
  url: "https://example.org/events/pancakes",
  startIso: "2026-09-12T12:00:00.000Z",
  endIso: "2026-09-12T15:00:00.000Z",
  allDay: false,
  status: "scheduled" as const,
  updatedIso: "2026-09-01T00:00:00.000Z",
};

describe("ics", () => {
  it("builds a valid VCALENDAR with escaped text and CRLF line endings", () => {
    const ics = buildIcs(event);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20260912T120000Z");
    expect(ics).toContain("SUMMARY:Pancake breakfast\\; all welcome\\, bring friends");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("marks cancelled events", () => {
    expect(buildIcs({ ...event, status: "cancelled" })).toContain("STATUS:CANCELLED");
  });
  it("folds long lines at 75 octets", () => {
    const ics = buildIcs({ ...event, description: "x".repeat(200) });
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });
  it("uses DATE values for all-day events", () => {
    const ics = buildIcs({ ...event, allDay: true, startIso: "2026-09-12T04:00:00.000Z", endIso: "2026-09-13T03:59:00.000Z" }, { localDate: (iso, shift = 0) => (shift ? "20260913" : "20260912") });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260912");
    expect(ics).toContain("DTEND;VALUE=DATE:20260913");
  });
  it("builds a Google Calendar link", () => {
    const url = googleCalendarUrl(event);
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("dates=20260912T120000Z%2F20260912T150000Z");
  });
});
