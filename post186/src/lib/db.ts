import "server-only";

import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type InStatement, type InValue, type Row } from "@libsql/client";

/**
 * Database access.
 *
 * - Local development and self-hosting: a single SQLite file at ./data/post186.db
 *   (created automatically — there is nothing to install or configure).
 * - Vercel / Netlify / any serverless host: a hosted libSQL database (Turso).
 *   Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.
 *
 * Tables are created on first use, so a brand-new database just works.
 */

type DbState = { client: Client; ready: Promise<void> };

const globalForDb = globalThis as unknown as { __post186Db?: DbState };

function resolveConfig(): { url: string; authToken?: string; isFile: boolean } {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;
  if (url) return { url, authToken, isFile: url.startsWith("file:") };

  if (process.env.VERCEL || process.env.NETLIFY) {
    throw new Error(
      "No database configured. This host has no permanent disk, so the site needs a hosted database: " +
        "create a free Turso database and set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. See post186/README.md.",
    );
  }

  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return { url: `file:${path.join(dir, "post186.db")}`, isFile: true };
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS kv (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     slug TEXT NOT NULL UNIQUE,
     title TEXT NOT NULL,
     summary TEXT NOT NULL DEFAULT '',
     description TEXT NOT NULL DEFAULT '',
     category TEXT NOT NULL DEFAULT 'community',
     location TEXT NOT NULL DEFAULT '',
     start_date TEXT NOT NULL,
     start_time TEXT,
     end_time TEXT,
     recurrence TEXT NOT NULL DEFAULT 'none',
     repeat_until TEXT,
     skip_dates TEXT NOT NULL DEFAULT '',
     audience TEXT NOT NULL DEFAULT 'public',
     uses_hall INTEGER NOT NULL DEFAULT 0,
     featured INTEGER NOT NULL DEFAULT 0,
     published INTEGER NOT NULL DEFAULT 1,
     cancelled INTEGER NOT NULL DEFAULT 0,
     is_demo INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS events_start_date ON events (start_date)`,
  `CREATE TABLE IF NOT EXISTS officers (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     title TEXT NOT NULL,
     grp TEXT NOT NULL DEFAULT 'officer',
     email TEXT NOT NULL DEFAULT '',
     phone TEXT NOT NULL DEFAULT '',
     show_email INTEGER NOT NULL DEFAULT 0,
     show_phone INTEGER NOT NULL DEFAULT 0,
     accepts_messages INTEGER NOT NULL DEFAULT 1,
     bio TEXT NOT NULL DEFAULT '',
     photo_url TEXT NOT NULL DEFAULT '',
     sort_order INTEGER NOT NULL DEFAULT 0,
     is_demo INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS bookings (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     reference TEXT NOT NULL UNIQUE,
     status TEXT NOT NULL DEFAULT 'pending',
     event_date TEXT NOT NULL,
     start_time TEXT NOT NULL,
     end_time TEXT NOT NULL,
     event_type TEXT NOT NULL,
     guest_count INTEGER NOT NULL,
     contact_name TEXT NOT NULL,
     contact_email TEXT NOT NULL,
     contact_phone TEXT NOT NULL,
     organization TEXT NOT NULL DEFAULT '',
     is_member INTEGER NOT NULL DEFAULT 0,
     alcohol INTEGER NOT NULL DEFAULT 0,
     kitchen INTEGER NOT NULL DEFAULT 0,
     notes TEXT NOT NULL DEFAULT '',
     admin_notes TEXT NOT NULL DEFAULT '',
     decline_reason TEXT NOT NULL DEFAULT '',
     quoted_amount TEXT NOT NULL DEFAULT '',
     deposit_paid INTEGER NOT NULL DEFAULT 0,
     source TEXT NOT NULL DEFAULT 'web',
     is_demo INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     decided_at TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS bookings_event_date ON bookings (event_date)`,
  `CREATE INDEX IF NOT EXISTS bookings_status ON bookings (status)`,
  `CREATE TABLE IF NOT EXISTS blocked_dates (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     date TEXT NOT NULL UNIQUE,
     reason TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS messages (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     email TEXT NOT NULL,
     phone TEXT NOT NULL DEFAULT '',
     topic TEXT NOT NULL DEFAULT '',
     officer_id INTEGER,
     officer_name TEXT,
     body TEXT NOT NULL,
     is_read INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS admin_users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL DEFAULT '',
     password_hash TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL,
     expires_at INTEGER NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
     key TEXT PRIMARY KEY,
     count INTEGER NOT NULL,
     window_start INTEGER NOT NULL
   )`,
];

async function initialize(client: Client, isFile: boolean): Promise<void> {
  if (isFile) {
    // Several build workers can open the file at once; wait instead of failing.
    await client.execute("PRAGMA busy_timeout = 8000");
    await client.execute("PRAGMA journal_mode = WAL");
  }
  await client.batch(SCHEMA, "write");

  const { seedStarterContent } = await import("./seed");
  await seedStarterContent(client);
}

function state(): DbState {
  if (!globalForDb.__post186Db) {
    const { url, authToken, isFile } = resolveConfig();
    const client = createClient({ url, authToken });
    const ready = initialize(client, isFile).catch((error) => {
      // Let the next request retry instead of caching a failed start-up forever.
      globalForDb.__post186Db = undefined;
      throw error;
    });
    globalForDb.__post186Db = { client, ready };
  }
  return globalForDb.__post186Db;
}

export type { Row, InValue };

export async function query(sql: string, args: InValue[] = []): Promise<Row[]> {
  const { client, ready } = state();
  await ready;
  const result = await client.execute({ sql, args });
  return result.rows;
}

export async function run(
  sql: string,
  args: InValue[] = [],
): Promise<{ lastInsertId: number; changes: number }> {
  const { client, ready } = state();
  await ready;
  const result = await client.execute({ sql, args });
  return {
    lastInsertId: Number(result.lastInsertRowid ?? 0),
    changes: result.rowsAffected,
  };
}

/** Runs several statements as one all-or-nothing transaction. */
export async function transaction(statements: InStatement[]): Promise<void> {
  const { client, ready } = state();
  await ready;
  await client.batch(statements, "write");
}

export async function getKv(key: string): Promise<string | null> {
  const rows = await query("SELECT value FROM kv WHERE key = ?", [key]);
  return rows.length ? String(rows[0].value) : null;
}

export async function setKv(key: string, value: string): Promise<void> {
  await run(
    "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}
