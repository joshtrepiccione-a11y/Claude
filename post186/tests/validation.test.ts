import { describe, expect, it } from "vitest";
import { formatRates, mergeSettings, parseLines, parseRates } from "@/lib/settings";
import { bookingRequestSchema, contactSchema, eventSchema, fieldErrors, statusLookupSchema } from "@/lib/validation";

const booking = {
  eventDate: "2026-12-12",
  startTime: "13:00",
  endTime: "17:00",
  eventType: "Birthday party",
  guestCount: "45",
  contactName: "Pat Example",
  contactEmail: "Pat@Example.com",
  contactPhone: "(609) 555-0100",
  agree: "on",
};

describe("hall request form", () => {
  it("accepts a complete request and tidies the values", () => {
    const parsed = bookingRequestSchema.safeParse(booking);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.guestCount).toBe(45);
      expect(parsed.data.contactEmail).toBe("pat@example.com");
      expect(parsed.data.kitchen).toBe(false);
      expect(parsed.data.notes).toBe("");
    }
  });

  it("explains each problem next to its field", () => {
    const parsed = bookingRequestSchema.safeParse({
      ...booking,
      eventDate: "",
      contactEmail: "not-an-email",
      contactPhone: "555",
      guestCount: "",
      agree: undefined,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error);
      expect(Object.keys(errors).sort()).toEqual(["agree", "contactEmail", "contactPhone", "eventDate", "guestCount"]);
    }
  });

  it("requires at least an hour between start and end", () => {
    const parsed = bookingRequestSchema.safeParse({ ...booking, startTime: "13:00", endTime: "13:30" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(fieldErrors(parsed.error).endTime).toMatch(/one hour/);
  });
});

describe("other forms", () => {
  it("normalizes a status lookup", () => {
    const parsed = statusLookupSchema.safeParse({ reference: " p186-ab12cd ", email: "A@B.co" });
    expect(parsed.success && parsed.data).toEqual({ reference: "P186-AB12CD", email: "a@b.co" });
  });

  it("validates a contact message", () => {
    expect(
      contactSchema.safeParse({ name: "Pat", email: "pat@example.com", topic: "Hall rental", body: "Is the hall free in May?" })
        .success,
    ).toBe(true);
    expect(contactSchema.safeParse({ name: "Pat", email: "pat@example.com", topic: "Nope", body: "hi" }).success).toBe(false);
  });

  it("needs a start time unless the event is all day", () => {
    const fields = {
      title: "Flag Retirement",
      category: "ceremony",
      startDate: "2027-06-14",
      startTime: "",
      endTime: "",
      recurrence: "none",
      repeatUntil: "",
      skipDates: "",
      audience: "public",
      published: "on",
    };
    expect(eventSchema.safeParse(fields).success).toBe(false);
    expect(eventSchema.safeParse({ ...fields, allDay: "on" }).success).toBe(true);
    const timed = eventSchema.safeParse({ ...fields, startTime: "17:00", endTime: "17:30", skipDates: "2027-07-04, 2027-12-25" });
    expect(timed.success && timed.data.skipDates).toEqual(["2027-07-04", "2027-12-25"]);
  });
});

describe("settings helpers", () => {
  it("round-trips rates typed one per line", () => {
    const rates = parseRates("Hall, 5 hours | $400 | Tables included\nDeposit | $100\n\n");
    expect(rates).toEqual([
      { label: "Hall, 5 hours", amount: "$400", note: "Tables included" },
      { label: "Deposit", amount: "$100", note: "" },
    ]);
    expect(parseRates(formatRates(rates))).toEqual(rates);
    expect(parseLines(" a \n\n b ")).toEqual(["a", "b"]);
  });

  it("fills in defaults for settings saved by an older version", () => {
    const merged = mergeSettings({ phone: "(609) 555-0199", hall: { capacity: 120 } });
    expect(merged.phone).toBe("(609) 555-0199");
    expect(merged.hall.capacity).toBe(120);
    expect(merged.hall.minNoticeDays).toBe(7);
    expect(merged.postNumber).toBe("186");
  });
});
