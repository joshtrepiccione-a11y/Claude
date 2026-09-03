import { describe, expect, it } from "vitest";
import { formatEventWhen, monthGrid, parseMonthParam, utcToLocalInput, zonedToUtc } from "@/lib/time";

describe("timezone conversion", () => {
  it("converts Eastern daylight time to UTC", () => {
    expect(zonedToUtc("2026-07-04T19:00", "America/New_York").toISOString()).toBe("2026-07-04T23:00:00.000Z");
  });
  it("converts Eastern standard time to UTC", () => {
    expect(zonedToUtc("2026-12-15T19:00", "America/New_York").toISOString()).toBe("2026-12-16T00:00:00.000Z");
  });
  it("round-trips through the datetime-local format", () => {
    const iso = zonedToUtc("2026-03-08T02:30", "America/New_York").toISOString();
    expect(utcToLocalInput(iso, "America/New_York")).toBe("2026-03-08T03:30");
  });
  it("formats a same-day range", () => {
    const start = zonedToUtc("2026-09-12T08:00", "America/New_York").toISOString();
    const end = zonedToUtc("2026-09-12T11:00", "America/New_York").toISOString();
    expect(formatEventWhen(start, end, false, "America/New_York")).toBe("Saturday, September 12, 2026, 8 AM to 11 AM");
  });
});

describe("month grid", () => {
  it("starts on Sunday and covers the whole month", () => {
    const grid = monthGrid(2026, 9);
    expect(grid[0][0].date).toBe("2026-08-30");
    expect(grid.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });
  it("falls back to the current month for bad params", () => {
    const { year, month } = parseMonthParam("nonsense");
    expect(year).toBeGreaterThan(2000);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(parseMonthParam("2027-02")).toEqual({ year: 2027, month: 2 });
  });
});
