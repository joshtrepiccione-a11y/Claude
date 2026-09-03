import { Pool, types, type PoolClient } from "pg";
import { DEFAULT_CATEGORIES, SCHEMA_SQL } from "./schema";

/**
 * Postgres access layer.
 *
 * The site runs on Vercel, where the filesystem is read-only and every request may land in a
 * fresh instance, so content lives in a managed Postgres database (Vercel Storage / Neon).
 * The connection string arrives as DATABASE_URL or POSTGRES_URL; Vercel sets both when you
 * attach a database to the project.
 */

// COUNT(*) and other bigint columns come back as strings by default. Everything we count here
// fits comfortably in a JS number, so parse int8 eagerly and keep call sites free of Number().
types.setTypeParser(20, (v) => Number(v));

type Globals = { __post186Pool?: Pool; __post186Ready?: Promise<void> };
const globalForDb = globalThis as unknown as Globals;

export function connectionString(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    "";
  if (!url) {
    throw new Error(
      "No database connection string. Set DATABASE_URL (or POSTGRES_URL) — on Vercel, attach a Postgres database under Storage and it is set for you.",
    );
  }
  return url;
}

/** `require` verifies the server certificate, `no-verify` skips verification, `disable` turns TLS off. */
function sslOption(url: string): { rejectUnauthorized: boolean } | false {
  const mode = (process.env.DATABASE_SSL?.trim() || "").toLowerCase();
  if (mode === "disable") return false;
  if (mode === "no-verify") return { rejectUnauthorized: false };
  if (mode === "require") return { rejectUnauthorized: true };
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* fall through to the default below */
  }
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isLocal || /sslmode=disable/.test(url)) return false;
  return { rejectUnauthorized: true };
}

function getPool(): Pool {
  if (globalForDb.__post186Pool) return globalForDb.__post186Pool;
  const url = connectionString();
  const pool = new Pool({
    connectionString: url,
    ssl: sslOption(url),
    // Serverless instances are short-lived and handle one request at a time; a small pool that
    // releases idle sockets quickly keeps us well under the database's connection limit.
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
  });
  // Without a listener, a socket dropped by the provider crashes the process.
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  globalForDb.__post186Pool = pool;
  return pool;
}

/** Creates tables and default categories. Idempotent, and safe to run from several instances at once. */
export async function migrate(): Promise<void> {
  const client = await getPool().connect();
  try {
    // Concurrent cold starts running CREATE TABLE IF NOT EXISTS can collide in the system
    // catalog, so serialize the whole bootstrap behind an advisory lock.
    await client.query("SELECT pg_advisory_lock($1)", [186186186]);
    try {
      await client.query(SCHEMA_SQL);
      for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
        await client.query(
          "INSERT INTO categories (kind, name, slug, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT (kind, slug) DO NOTHING",
          [c.kind, c.name, c.slug, i],
        );
      }
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [186186186]);
    }
  } finally {
    client.release();
  }
}

/** Runs the schema bootstrap once per process. Set DATABASE_AUTO_MIGRATE=0 to manage it yourself. */
function ready(): Promise<void> {
  if (process.env.DATABASE_AUTO_MIGRATE === "0") return Promise.resolve();
  if (!globalForDb.__post186Ready) {
    globalForDb.__post186Ready = migrate().catch((err) => {
      // Let the next request retry rather than caching a failed bootstrap forever.
      globalForDb.__post186Ready = undefined;
      throw err;
    });
  }
  return globalForDb.__post186Ready;
}

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const result = await getPool().query(text, params as unknown[]);
  return result.rows as T[];
}

export async function queryOne<T>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

export async function execute(text: string, params: unknown[] = []): Promise<number> {
  await ready();
  const result = await getPool().query(text, params as unknown[]);
  return result.rowCount ?? 0;
}

/** Runs `fn` inside a transaction, rolling back if it throws. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Closes the pool. Only needed by one-off scripts so the process can exit. */
export async function closeDb(): Promise<void> {
  const pool = globalForDb.__post186Pool;
  globalForDb.__post186Pool = undefined;
  globalForDb.__post186Ready = undefined;
  if (pool) await pool.end();
}

export function nowIso(): string {
  return new Date().toISOString();
}
