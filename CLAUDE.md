# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repository holds several independent projects. Each app has its own `package.json`; there is no
root-level build.

| Path | What it is | Stack |
|------|------------|-------|
| `v2/` | NJ LD8 campaign intelligence dashboard (deployed production site) | React + TypeScript + Vite |
| `v3-clerk/` | 2026 Atlantic County Clerk scenario model | React + TypeScript + Vite + Tailwind |
| `index.html`, `app.js`, `style.css`, `data/`, `scripts/` | v1 legacy LD8 precinct map and its data build scripts | Vanilla JS + Leaflet, Python |
| `post186/` | Website for The American Legion Frank M. Calletta Post 186 (Hammonton, NJ) | Next.js 16 + TypeScript + Tailwind 4 + libSQL |

The root `README.md` documents the election apps. The root `vercel.json`, `netlify.toml` and
`.github/workflows/pages.yml` deploy **only** the election apps — do not point them at `post186/`.

## Election apps (`v2/`, `v3-clerk/`)

```
cd v2 && npm install && npm run dev      # http://localhost:5173
cd v2 && npm run build                   # → v2/dist
cd v2 && npm test                        # vitest
cd v3-clerk && npm install && npm run dev
cd v3-clerk && npm run build             # → v3-clerk/dist
```

## Post 186 website (`post186/`)

```
cd post186 && npm install
npm run dev                              # http://localhost:3000 (creates ./data/post186.db on first run)
npm run build && npm start               # production
npm test                                 # vitest (unit tests in post186/tests)
npx vitest run tests/recurrence.test.ts  # a single test file
npm run lint && npm run typecheck
```

Local admin sign-in (development only): `/admin` with `admin@post186.test` / `post186-local-dev`.

Things to know before changing it:

- **Read `post186/AGENTS.md` first.** It uses Next.js 16 with Cache Components, which differs from earlier
  Next.js versions; the reference docs are in `post186/node_modules/next/dist/docs/`.
- **Scope is deliberately local.** The public site is Home, Events, Hall Rental and Officers & Contact.
  National American Legion topics are footer links only (`src/lib/site.ts`), not pages.
- **Caching.** Public pages read through `"use cache"` functions in `src/lib/data.ts`, tagged
  `settings` / `events` / `officers` / `bookings`. Every admin mutation in `src/lib/actions/admin.ts` must
  call `updateTag(...)` for what it changed, or the public site will show stale data for up to an hour.
- **Auth.** Every admin page and every admin server action calls `requireAdmin()` (`src/lib/auth.ts`).
  Admin pages export `instant = false`.
- **Dates and times** are wall-clock strings (`YYYY-MM-DD`, `HH:MM`) in the post's time zone and are never
  converted; use the helpers in `src/lib/dates.ts` rather than `Date` arithmetic.
- **Database.** All SQL lives in `src/lib/repo.ts`; `src/lib/db.ts` creates the tables and picks the
  database: Turso over HTTPS when `TURSO_DATABASE_URL` is set, otherwise a local file via Node's built-in
  `node:sqlite` (Node 22.13+). On Netlify or Vercel with no database set it runs in preview mode on a
  temporary database with sample content and a banner.
- **Netlify.** The Post 186 site is its own Netlify site with Base directory `post186`, configured by
  `post186/netlify.toml`. The root `netlify.toml` is for the v3-clerk site.
- **Branding.** Do not add, redraw or alter The American Legion emblem. The official brandmark is supplied
  by the post as files in `post186/public/brand/` (see `post186/README.md`).

## Branch conventions

Development for automated Claude Code sessions happens on branches named `claude/<purpose>-<suffix>` (e.g., `claude/initial-setup-SjVdw`). Push work to the branch specified for the current session; do not push to `main` without explicit instruction.
