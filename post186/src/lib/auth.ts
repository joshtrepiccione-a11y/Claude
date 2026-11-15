import "server-only";

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { query, run } from "./db";
import { nowIso } from "./dates";
import type { AdminUser } from "./types";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

const COOKIE_NAME = "p186_admin";
const SESSION_DAYS = 14;
export const MIN_PASSWORD_LENGTH = 10;

// ───────────────────────── Passwords ─────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * The very first sign-in. Until an administrator exists in the database, the
 * site accepts the ADMIN_EMAIL / ADMIN_PASSWORD pair from the environment and
 * turns it into the first account. After that these variables are ignored.
 */
export function bootstrapCredentials(): { email: string; password: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) return { email, password };
  if (process.env.NODE_ENV !== "production") {
    return { email: "admin@post186.test", password: "post186-local-dev" };
  }
  return null;
}

// ───────────────────────── Sessions ─────────────────────────

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
  await run(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [hashToken(token), userId, expiresAt, nowIso()],
  );
  await run("DELETE FROM sessions WHERE expires_at < ?", [Date.now()]);

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await run("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
  jar.delete(COOKIE_NAME);
}

/** The signed-in administrator, or null. Looked up once per request. */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  // Sessions are checked against the clock, so this must run for each real request,
  // never ahead of time.
  await connection();
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const rows = await query(
    `SELECT u.id, u.email, u.name, u.created_at
       FROM sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
    [hashToken(token), Date.now()],
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    email: String(r.email),
    name: String(r.name ?? ""),
    createdAt: String(r.created_at),
  };
});

/**
 * Call at the top of every admin page and every admin action.
 * Layouts are not re-run on each navigation, so a check there is not enough.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
