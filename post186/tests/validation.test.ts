import { describe, expect, it } from "vitest";
import { generalSchema, issuesToErrors, membershipSchema, rentalSchema } from "@/lib/validation";

const base = { name: "Pat Example", email: "PAT@example.com", phone: "", contact_method: "email", consent: "on", website: "" };

describe("membership inquiry validation", () => {
  it("accepts a minimal valid inquiry and lowercases email", () => {
    const r = membershipSchema.safeParse({ ...base, service_connection: "veteran", service_area: "", interest: "join", message: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("pat@example.com");
  });
  it("rejects a message containing a Social Security number pattern", () => {
    const r = membershipSchema.safeParse({ ...base, service_connection: "veteran", interest: "join", message: "My SSN is 123-45-6789" });
    expect(r.success).toBe(false);
    if (!r.success) expect(issuesToErrors(r.error).message).toMatch(/Social Security/);
  });
  it("requires consent", () => {
    const r = membershipSchema.safeParse({ ...base, consent: undefined, service_connection: "veteran", interest: "join" });
    expect(r.success).toBe(false);
    if (!r.success) expect(issuesToErrors(r.error).consent).toBeTruthy();
  });
  it("rejects a filled honeypot", () => {
    const r = membershipSchema.safeParse({ ...base, website: "http://spam", service_connection: "veteran", interest: "join" });
    expect(r.success).toBe(false);
  });
});

describe("rental inquiry validation", () => {
  const rental = { ...base, event_type: "Birthday party", preferred_date: "2026-11-14", start_time: "13:00", end_time: "17:00", guest_count: "60", alcohol: "no", description: "A family birthday gathering." };
  it("accepts a valid rental inquiry and coerces guest count", () => {
    const r = rentalSchema.safeParse(rental);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.guest_count).toBe(60);
  });
  it("rejects an end time before the start time", () => {
    const r = rentalSchema.safeParse({ ...rental, end_time: "12:00" });
    expect(r.success).toBe(false);
    if (!r.success) expect(issuesToErrors(r.error).end_time).toMatch(/after the start/);
  });
});

describe("general inquiry validation", () => {
  it("rejects a bad email with a friendly message", () => {
    const r = generalSchema.safeParse({ ...base, email: "nope", message: "Hello there" });
    expect(r.success).toBe(false);
    if (!r.success) expect(issuesToErrors(r.error).email).toMatch(/valid email/);
  });
});
