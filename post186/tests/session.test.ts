import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";
import { slugify, uniqueSlug } from "@/lib/slug";
import { inquiriesToCsv } from "@/lib/inquiries";

const secret = "a-very-long-test-secret-value-1234567890";

describe("session tokens", () => {
  it("verifies a freshly created token", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token, secret)).toBe(true);
  });
  it("rejects tampering, wrong secrets, and expiry", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token + "0", secret)).toBe(false);
    expect(await verifySessionToken(token, "another-long-secret-value-0987654321")).toBe(false);
    const expired = await createSessionToken(secret, -1000);
    expect(await verifySessionToken(expired, secret)).toBe(false);
    expect(await verifySessionToken(undefined, secret)).toBe(false);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit then blocks", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i += 1) expect(checkRateLimit("k", 3, 1000, 0).ok).toBe(true);
    const blocked = checkRateLimit("k", 3, 1000, 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(checkRateLimit("k", 3, 1000, 2000).ok).toBe(true);
  });
});

describe("slugs", () => {
  it("slugifies titles", () => {
    expect(slugify("Memorial Day Ceremony, 2026!")).toBe("memorial-day-ceremony-2026");
  });
  it("finds a unique slug", () => {
    const taken = new Set(["fish-fry", "fish-fry-2"]);
    expect(uniqueSlug("fish-fry", (s) => taken.has(s))).toBe("fish-fry-3");
  });
});

describe("csv export", () => {
  it("neutralizes spreadsheet formulas typed into public forms", () => {
    const csv = inquiriesToCsv([
      {
        id: 1, type: "general", status: "new", name: "=cmd|'/c calc'!A1", email: "a@example.com", phone: "", contact_method: "email",
        organization: "", subject: "+1234", message: "@SUM(1+1)", details: "{}", admin_notes: "-2+3", created_at: "x", updated_at: "x",
      },
    ]);
    const row = csv.split("\r\n")[1];
    expect(row).toContain("'=cmd|'/c calc'!A1");
    expect(row).toContain("'+1234");
    expect(row).toContain("'@SUM(1+1)");
    expect(row).toContain("'-2+3");
  });
  it("quotes commas, quotes, and newlines", () => {
    const csv = inquiriesToCsv([
      {
        id: 1, type: "general", status: "new", name: 'Pat "PJ" Example', email: "pat@example.com", phone: "", contact_method: "email",
        organization: "", subject: "Hello, there", message: "Line 1\nLine 2", details: "{}", admin_notes: "", created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z",
      },
    ]);
    expect(csv).toContain('"Pat ""PJ"" Example"');
    expect(csv).toContain('"Hello, there"');
    expect(csv).toContain('"Line 1\nLine 2"');
  });
});
