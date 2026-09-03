import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionToken, verifySessionToken } from "./session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  // Colon separators, not dollar signs: environment files expand $NAME, which would mangle the hash.
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [algo, salt, hash] = stored.trim().replace(/^"|"$/g, "").split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET);
}

export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const a = Buffer.from(username);
  const b = Buffer.from(expectedUser);
  const userOk = a.length === b.length && timingSafeEqual(a, b);
  const passOk = verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);
  return userOk && passOk && Boolean(process.env.SESSION_SECRET);
}

export async function startSession(): Promise<void> {
  const token = await createSessionToken(process.env.SESSION_SECRET as string);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/admin", maxAge: 0 });
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
}

/** Call at the top of every admin page and server action. Redirects when not signed in. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
