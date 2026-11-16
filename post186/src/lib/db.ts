import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Database access.
 *
 * Where the data lives depends on where the site runs:
 *
 * - Live site on Netlify or Vercel: a hosted libSQL database (Turso).
 *   Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.
 * - Your own computer, or a server with a disk: one SQLite file at
 *   ./data/post186.db, created automatically. Nothing to install.
 * - Netlify or Vercel with no database configured yet: PREVIEW MODE. The site
 *   runs on a temporary database filled with sample content so it can be
 *   looked at straight away. Nothing entered is kept. See isPreviewDatabase().
 *
 * Tables are created on first use, so a brand-new database just works.
 *
 * The file database uses Node's built-in SQLite, so there is no native add-on
 * to compile or ship; the hosted database is reached over HTTPS.
 */

export type SqlValue = string | number | bigint | null;
export type Row = Record<string, unknown>;
export type Statement = { sql: string; args?: SqlValue[] };

type Driver = {
  all(sql: string, args: SqlValue[]): Promise<Row[]>;
  run(sql: string, args: SqlValue[]): Promise<{ lastInsertId: number; changes: number }>;
  /** Runs every statement, or none of them. */
  batch(statements: Statement[]): Promise<void>;
};

type Config =
  | { kind: "remote"; url: string; authToken?: string; preview: false }
  | { kind: "file"; file: string; preview: boolean };

const globalForDb = globalThis as unknown as {
  __post186Db?: Promise<Driver>;
  __post186DbConfig?: Config;
};

/** True on hosts that give each request a short-lived machine with no disk of its own. */
function onServerlessHost(): boolean {
  const env = process.env;
  return Boolean(env.NETLIFY || env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.LAMBDA_TASK_ROOT);
}

function resolveConfig(): Config {
  if (globalForDb.__post186DbConfig) return globalForDb.__post186DbConfig;

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;
  const previewFile = path.join(os.tmpdir(), "post186-preview.db");

  let config: Config;
  if (url && !url.startsWith("file:")) {
    config = { kind: "remote", url, authToken, preview: false };
  } else if (url) {
    config = { kind: "file", file: url.slice("file:".length), preview: false };
  } else if (onServerlessHost()) {
    config = { kind: "file", file: previewFile, preview: true };
  } else {
    try {
      const dir = path.join(process.cwd(), "data");
      fs.mkdirSync(dir, { recursive: true });
      config = { kind: "file", file: path.join(dir, "post186.db"), preview: false };
    } catch {
      // No writable disk here either: fall back to the temporary preview database.
      config = { kind: "file", file: previewFile, preview: true };
    }
  }
  globalForDb.__post186DbConfig = config;
  return config;
}

/**
 * Preview mode: the site is running without a permanent database, on sample
 * content, and nothing entered is kept. The public pages show a banner, and
 * adding the database settings turns it into the real site.
 */
export function isPreviewDatabase(): boolean {
  return resolveConfig().preview;
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

async function openFile(file: string): Promise<Driver> {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(file);
  // Several build workers can open the file at once; wait instead of failing.
  db.exec("PRAGMA busy_timeout = 8000");
  db.exec("PRAGMA journal_mode = WAL");

  return {
    async all(sql, args) {
      return db.prepare(sql).all(...args) as Row[];
    },
    async run(sql, args) {
      const result = db.prepare(sql).run(...args);
      return { lastInsertId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    async batch(statements) {
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const statement of statements) db.prepare(statement.sql).run(...(statement.args ?? []));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

async function openRemote(url: string, authToken?: string): Promise<Driver> {
  // The "web" client talks to the database over HTTPS only, which is what
  // short-lived serverless functions need.
  const { createClient } = await import("@libsql/client/web");
  const client = createClient({ url, authToken });

  return {
    async all(sql, args) {
      const result = await client.execute({ sql, args });
      return result.rows as unknown as Row[];
    },
    async run(sql, args) {
      const result = await client.execute({ sql, args });
      return { lastInsertId: Number(result.lastInsertRowid ?? 0), changes: result.rowsAffected };
    },
    async batch(statements) {
      await client.batch(
        statements.map((statement) => ({ sql: statement.sql, args: statement.args ?? [] })),
        "write",
      );
    },
  };
}

const isDuplicate = (error: unknown) => /UNIQUE|constraint/i.test(String((error as Error)?.message ?? error));

async function open(): Promise<Driver> {
  const config = resolveConfig();
  const driver =
    config.kind === "remote" ? await openRemote(config.url, config.authToken) : await openFile(config.file);

  await driver.batch(SCHEMA.map((sql) => ({ sql })));

  const { seedStarterContent, demoContentStatements } = await import("./seed");
  await seedStarterContent(driver.batch);

  if (config.preview) {
    // Fill the temporary database with sample content, once.
    try {
      await driver.batch([
        { sql: "INSERT INTO kv (key, value) VALUES ('preview_seeded', '1')" },
        ...demoContentStatements(),
      ]);
    } catch (error) {
      if (!isDuplicate(error)) throw error;
    }
  }
  return driver;
}

function db(): Promise<Driver> {
  if (!globalForDb.__post186Db) {
    globalForDb.__post186Db = open().catch((error) => {
      // Let the next request retry instead of caching a failed start-up forever.
      globalForDb.__post186Db = undefined;
      throw error;
    });
  }
  return globalForDb.__post186Db;
}

export async function query(sql: string, args: SqlValue[] = []): Promise<Row[]> {
  return (await db()).all(sql, args);
}

export async function run(
  sql: string,
  args: SqlValue[] = [],
): Promise<{ lastInsertId: number; changes: number }> {
  return (await db()).run(sql, args);
}

/** Runs several statements as one all-or-nothing transaction. */
export async function transaction(statements: Statement[]): Promise<void> {
  await (await db()).batch(statements);
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
