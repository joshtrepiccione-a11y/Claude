# Frank M. Calletta American Legion Post 186 website

A small, accessible website for Post 186 in Hammonton, New Jersey. It handles four jobs: membership inquiries, hall rental inquiries, news posts, and a public events calendar. Volunteers manage everything through a simple admin area. There is no third-party content management system to learn and no monthly platform fee.

Built with Next.js 15 (App Router), React 19, TypeScript, and Postgres. Styling is plain CSS with custom properties, so there is no build tooling to learn beyond Node. The site is deployed on Vercel with a Vercel-managed Postgres database; see [DEPLOY.md](DEPLOY.md).

## Requirements

- Node.js 20 or newer (developed on Node 22)
- npm

## Getting it running locally

1. Install dependencies:

   ```
   npm install
   ```

2. Create your environment file:

   ```
   cp .env.example .env.local
   ```

   Set `DATABASE_URL` to a Postgres connection string. The simplest option is the same database the deployed site uses: copy its connection string from the Vercel dashboard (Storage, then the database, then `.env.local`). If you would rather keep local work separate, run any Postgres you like and point `DATABASE_URL` at it, for example `postgres://localhost:5432/post186` — add `DATABASE_SSL=disable` for a local server without TLS.

3. Generate an admin password hash and paste it into `.env.local`:

   ```
   npm run hash-password -- "a long passphrase you will remember"
   ```

   Copy the whole line it prints (it starts with `scrypt:`) into `ADMIN_PASSWORD_HASH`. The plain password is never stored anywhere.

4. Generate a session secret and paste it into `SESSION_SECRET`:

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Create the tables:

   ```
   npm run db:setup
   ```

   The app also does this by itself the first time it queries an empty database, so this step is mostly a way to check the connection string before you go further.

6. Optionally load a few clearly labeled demonstration events and posts so the site has something to show during review:

   ```
   npm run seed
   ```

   Everything it creates is prefixed with `[Demo]`. Delete those items from the admin area before launch.

7. Start the development server:

   ```
   npm run dev
   ```

   The public site is at http://localhost:3000 and the admin area is at http://localhost:3000/admin.

## Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `SITE_URL` | Yes in production | Full public address, used for links in sitemaps, calendar files, and structured data. |
| `SITE_TIMEZONE` | No | Defaults to `America/New_York`. All event times are entered and displayed in this zone. |
| `DATABASE_URL` | Yes | Postgres connection string. Vercel sets this when you attach a database; `POSTGRES_URL` is used as a fallback. |
| `DATABASE_SSL` | No | `require` (verified TLS), `no-verify`, or `disable`. Blank means verified TLS for remote hosts and plain TCP for localhost. |
| `DATABASE_POOL_MAX` | No | Connections per instance, default 3. Raise only if your database plan allows it. |
| `DATABASE_AUTO_MIGRATE` | No | Set to `0` to stop the app creating tables on first use and run `npm run db:setup` yourself. |
| `ADMIN_USERNAME` | Yes | The single admin username. |
| `ADMIN_PASSWORD_HASH` | Yes | Output of `npm run hash-password`. |
| `SESSION_SECRET` | Yes | Random string of at least 32 characters. Changing it signs everyone out. |
| `NOTIFY_EMAIL_TO` | No | Where new-inquiry notifications should go once email sending is wired up (see below). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | No | Placeholders for your mail provider. |

Do not wrap values in quotes and do not use dollar signs in them. Environment files expand `$NAME` as a variable, which is why the password hash uses colons as separators.

## Managing content

Everything is under `/admin`:

- **Dashboard**: counts of new inquiries and quick links.
- **Events**: add, edit, cancel, postpone, archive, or delete events. An event stays private until you tick "Show on the public calendar", so private hall bookings can be tracked without publishing them. Times are entered in Eastern time and stored in universal time, so daylight saving is handled for you.
- **News**: draft, schedule, or publish posts. A scheduled post appears by itself once its publish date and time arrive. Drafts and future posts return a 404 to the public.
- **Inquiries**: three separate queues (membership, hall rentals, general). Each item can be marked new, in progress, contacted, closed, or spam, and carries internal notes that are never shown to the sender. Each queue exports to a CSV file for spreadsheets.
- **Categories**: rename or add categories for events and news. Renaming updates every item using it.
- **Site content**: phone number, email, hours, hall details, history, officers, and the response-time wording used in form confirmations. Fields marked as facts stay hidden on the public site until you fill them in, so the site never shows invented information.
- **Content needed**: a live checklist of what is still blank, including the brand files.

Body text for posts and event descriptions accepts light Markdown: `##` headings, `-` bullet lists, `**bold**`, `*italic*`, and `[links](https://example.org)`. Everything else is escaped, so pasted text cannot break the page or inject scripts.

## How the forms work

All three public forms post to server actions. Each submission is:

1. Checked against a hidden honeypot field that real people never see. If it is filled, the site shows a normal thank-you message and quietly discards the submission.
2. Rate limited per visitor (five submissions in fifteen minutes, and eight sign-in attempts in fifteen minutes).
3. Validated on the server with Zod. Errors come back as a summary at the top of the form plus a message on each field, and the visitor's answers are preserved.
4. Screened for anything shaped like a Social Security number, which is rejected with an explanation. The forms never ask for Social Security numbers, discharge paperwork, or medical documents.
5. Stored in Postgres and shown in the matching admin queue.

The hall rental form states plainly, above the submit button and again in the confirmation, that submitting does not reserve or confirm a date.

### Email notifications

Out of the box, a new inquiry is recorded and logged to the server console. No mail transport is bundled, so nothing is emailed yet. To turn on notifications, set `NOTIFY_EMAIL_TO` and the `SMTP_` values, then add your provider's client inside `src/lib/notify.ts`, where the send function is stubbed with a comment showing exactly where the code goes. Nodemailer or a provider software development kit such as Resend or Postmark all drop in at that one spot.

## Testing and checks

```
npm run typecheck   # TypeScript
npm test            # unit tests (Vitest)
npm run check       # both of the above
npm run build       # production build
```

The unit tests cover form validation, calendar file generation, the Markdown renderer, slug creation, session tokens, rate limiting, timezone conversion including both daylight saving transitions, and CSV escaping.

## Accessibility

The site targets WCAG 2.2 level AA. Automated scans with axe-core across every public page, in both a desktop and a 390-pixel mobile viewport, report zero violations. That covers roughly a third of the standard, so a manual pass is still worth doing before launch. What has been done deliberately:

- A skip link to the main content, and one `main` landmark per page.
- Visible focus outlines everywhere, and a keyboard-reachable, labelled scroll region for the month calendar.
- Errors announced in a summary that receives focus, with each error linked to its field.
- Text contrast checked against Emblem Blue and Poppy Red backgrounds.
- Standalone links and buttons sized to at least 24 by 24 pixels.
- Motion respects the reduced-motion setting.
- The calendar is a real table with proper headers, and dates carry full text for screen readers rather than relying on the visual date block.

## Brand compliance

The site never draws, recreates, alters, or generates an American Legion mark. Drop the official files into `public/brand` using the names listed in `public/brand/README.md` and they will be displayed untouched at a size that preserves the required clear space. If a file is missing, the header and footer fall back to the Post name set in Inter. The emblem is not used anywhere; only the brandmark is, per the current guidelines. Colors are limited to Emblem Blue (#00467F), Poppy Red (#B5121B, used sparingly for genuine emphasis), Light Blue (#F5F8FA), and Light Gray (#F5F5F5). Inter is self-hosted, so no external font service is contacted. Rexton is not used anywhere.

## Deploying

The site runs on **Vercel** with a **Vercel-managed Postgres database**. Every page that reads content is rendered per request, so an edit in the admin area is live immediately, and the production build needs no database connection at all.

[DEPLOY.md](DEPLOY.md) has the full walkthrough — pushing to GitHub, importing the project, attaching the database, and the environment variables to set. In short:

1. Import the repository into Vercel and set the project's **Root Directory** to `post186`.
2. Under **Storage**, create a Postgres database and connect it to the project. That sets `DATABASE_URL` and `POSTGRES_URL` for you.
3. Add `SITE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` under **Settings, Environment Variables**.
4. Deploy. The tables are created the first time a page queries the database.

Backups are your database provider's job rather than a file you copy: Vercel-managed Postgres keeps point-in-time restore, and you can take your own snapshot at any time with `pg_dump "$DATABASE_URL" > backup.sql`.

Nothing ties the site to Vercel. It is a standard Next.js application talking to Postgres over a connection string, so any Node host and any Postgres provider will run it.

Security headers are set in two places. `next.config.ts` holds the static ones (no content-type sniffing, referrer policy, frame options, permissions policy). `src/middleware.ts` builds a content security policy with a fresh nonce per response, which is why the site has no inline scripts of its own. Sessions are HTTP-only cookies scoped to `/admin` and are marked secure automatically in production, so the site must be served over HTTPS.

## Project layout

```
src/app          pages, server actions, sitemap, robots, calendar file route
src/components   shared UI, forms, admin forms
src/lib          database, validation, time, calendar files, auth, content
scripts          schema setup, password hashing, demonstration seed data
tests            unit tests
public/brand     official brandmark files go here
```

## Known limitations

- Images are referenced by path or address; there is no upload screen yet. Put files in `public/images` and reference them as `/images/name.jpg`.
- Recurring events are described in text, not generated automatically. Each occurrence is entered separately.
- Rate limiting lives in memory, so it resets on restart and counts per server instance. On Vercel each instance keeps its own counters, which makes the limit looser than it looks; treat it as friction against casual abuse and lean on the platform's protection for anything stronger.
- Email notifications need a transport wired in, as described above.
- There is one admin account rather than per-volunteer logins.
- Sessions are stateless signed tokens with an eight-hour life. Signing out clears the cookie but does not invalidate a token that was already copied elsewhere. If you ever suspect a session was stolen, change `SESSION_SECRET` and restart, which signs everyone out immediately.
- The rate limiter identifies visitors by the forwarded-for header, which a determined attacker can spoof. Treat it as friction against casual abuse, not as a hard control, and lean on your host's protection for anything stronger.
- ESLint is skipped during builds and no lint configuration is included. TypeScript and the test suite are the checks that actually run.
