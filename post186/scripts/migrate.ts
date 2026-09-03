/**
 * Creates the tables and default categories in the database named by DATABASE_URL.
 * Run with: npm run db:setup
 *
 * The app also does this automatically on first use, so this script is mainly for
 * setting up a fresh database (or verifying credentials) before the first deploy.
 */
import { closeDb, connectionString, migrate } from "../src/lib/db";

async function main() {
  const host = new URL(connectionString()).host;
  await migrate();
  console.log(`Schema is up to date on ${host}.`);
  await closeDb();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
