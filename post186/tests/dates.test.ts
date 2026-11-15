import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  formatDateLong,
  formatTime,
  formatTimeRange,
  isHm,
  isYmd,
  todayInPostTz,
  weekdayOf,
} from "@/lib/dates";

describe("dates", () => {
  it("validates dates and times", () => {
    expect(isYmd("2026-02-28")).toBe(true);
    expect(isYmd("2026-02-30")).toBe(false);
    expect(isYmd("2026-2-3")).toBe(false);
    expect(isHm("19:00")).toBe(true);
    expect(isHm("24:00")).toBe(false);
  });

  it("uses the post's time zone for today, not the server's", () => {
    // 03:30 UTC on Nov 16 is still the evening of Nov 15 in New Jersey.
    expect(todayInPostTz(new Date("2026-11-16T03:30:00Z"))).toBe("2026-11-15");
    expect(todayInPostTz(new Date("2026-11-16T05:30:00Z"))).toBe("2026-11-16");
  });

  it("does date arithmetic without time-zone drift", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 7)).toBe("2026-11-08"); // across the end of daylight saving time
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(weekdayOf("2026-11-15")).toBe(0);
  });

  it("formats for people", () => {
    expect(formatDateLong("2026-11-17")).toBe("Tuesday, November 17, 2026");
    expect(formatTime("00:30")).toBe("12:30 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTimeRange("19:00", "20:30")).toBe("7:00 PM – 8:30 PM");
    expect(formatTimeRange(null, null)).toBe("All day");
  });
});
