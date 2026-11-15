import { describe, expect, it } from "vitest";
import {
  describeRecurrence,
  lastWeekdayOfMonth,
  nextOccurrence,
  nthWeekdayOfMonth,
  occurrencesBetween,
  previousOccurrence,
  type Recurring,
} from "@/lib/recurrence";

const base = (overrides: Partial<Recurring>): Recurring => ({
  startDate: "2026-11-10",
  recurrence: "none",
  repeatUntil: null,
  skipDates: [],
  ...overrides,
});

describe("calendar helpers", () => {
  it("finds the nth weekday of a month", () => {
    expect(nthWeekdayOfMonth(2026, 11, 2, 2)).toBe("2026-11-10"); // 2nd Tuesday
    expect(nthWeekdayOfMonth(2027, 2, 1, 1)).toBe("2027-02-01"); // 1st Monday
    expect(nthWeekdayOfMonth(2026, 11, 2, 5)).toBeNull(); // no 5th Tuesday
  });

  it("finds the last weekday of a month", () => {
    expect(lastWeekdayOfMonth(2027, 5, 1)).toBe("2027-05-31"); // Memorial Day 2027
    expect(lastWeekdayOfMonth(2026, 11, 0)).toBe("2026-11-29");
  });
});

describe("occurrencesBetween", () => {
  it("returns a one-time event only inside the range", () => {
    const event = base({});
    expect(occurrencesBetween(event, "2026-11-01", "2026-11-30")).toEqual(["2026-11-10"]);
    expect(occurrencesBetween(event, "2026-11-11", "2026-12-31")).toEqual([]);
  });

  it("repeats weekly from the start date, never before it", () => {
    const event = base({ recurrence: "weekly" });
    expect(occurrencesBetween(event, "2026-11-01", "2026-12-01")).toEqual([
      "2026-11-10",
      "2026-11-17",
      "2026-11-24",
      "2026-12-01",
    ]);
  });

  it("keeps its rhythm when the range starts long after the first date", () => {
    const event = base({ recurrence: "biweekly" });
    expect(occurrencesBetween(event, "2027-03-01", "2027-03-31")).toEqual(["2027-03-02", "2027-03-16", "2027-03-30"]);
  });

  it("repeats on the same nth weekday each month", () => {
    const event = base({ recurrence: "monthly_nth" }); // 2nd Tuesday
    expect(occurrencesBetween(event, "2026-11-01", "2027-02-28")).toEqual([
      "2026-11-10",
      "2026-12-08",
      "2027-01-12",
      "2027-02-09",
    ]);
  });

  it("skips months that have no 5th weekday", () => {
    const event = base({ startDate: "2026-12-29", recurrence: "monthly_nth" }); // 5th Tuesday
    expect(occurrencesBetween(event, "2026-12-01", "2027-04-30")).toEqual(["2026-12-29", "2027-03-30"]);
  });

  it("repeats on the last weekday of each month", () => {
    const event = base({ startDate: "2026-11-29", recurrence: "monthly_last" }); // last Sunday
    expect(occurrencesBetween(event, "2026-11-01", "2027-01-31")).toEqual(["2026-11-29", "2026-12-27", "2027-01-31"]);
  });

  it("repeats yearly and skips Feb 29 outside leap years", () => {
    expect(occurrencesBetween(base({ startDate: "2026-12-07", recurrence: "yearly" }), "2026-01-01", "2028-12-31")).toEqual([
      "2026-12-07",
      "2027-12-07",
      "2028-12-07",
    ]);
    expect(occurrencesBetween(base({ startDate: "2028-02-29", recurrence: "yearly" }), "2028-01-01", "2032-12-31")).toEqual([
      "2028-02-29",
      "2032-02-29",
    ]);
  });

  it("honors the end date and skipped dates", () => {
    const event = base({ recurrence: "weekly", repeatUntil: "2026-11-24", skipDates: ["2026-11-17"] });
    expect(occurrencesBetween(event, "2026-11-01", "2026-12-31")).toEqual(["2026-11-10", "2026-11-24"]);
  });
});

describe("next / previous occurrence", () => {
  it("finds the next and the most recent date", () => {
    const event = base({ recurrence: "monthly_nth" });
    expect(nextOccurrence(event, "2026-11-11")).toBe("2026-12-08");
    expect(nextOccurrence(event, "2026-11-10")).toBe("2026-11-10");
    expect(previousOccurrence(event, "2026-12-08")).toBe("2026-11-10");
  });

  it("returns null once a one-time event has passed", () => {
    expect(nextOccurrence(base({}), "2026-11-11")).toBeNull();
    expect(previousOccurrence(base({}), "2026-11-11")).toBe("2026-11-10");
  });
});

describe("describeRecurrence", () => {
  it("describes patterns in plain language", () => {
    expect(describeRecurrence(base({}))).toBe("");
    expect(describeRecurrence(base({ recurrence: "weekly" }))).toBe("Every Tuesday");
    expect(describeRecurrence(base({ recurrence: "monthly_nth" }))).toBe("Monthly on the 2nd Tuesday");
    expect(describeRecurrence(base({ startDate: "2026-11-29", recurrence: "monthly_last" }))).toBe(
      "Monthly on the last Sunday",
    );
  });
});
