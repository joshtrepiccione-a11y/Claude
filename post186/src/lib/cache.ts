/**
 * How long the public site may reuse what it read from the database.
 *
 * Admin edits clear the cache instantly (see the tags in src/lib/data.ts), so
 * this window only matters for lists that depend on today's date and for the
 * first minutes after a fresh deploy.
 */
export const CONTENT_CACHE = {
  stale: 300, // a visitor's browser may reuse a page for 5 minutes
  revalidate: 600, // refresh in the background every 10 minutes
  expire: 3600, // never serve anything more than an hour old
} as const;
