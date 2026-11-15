# American Legion Frank M. Calletta Post 186 — Website

The website for **The American Legion Frank M. Calletta Post 186**, 101 French Street, Hammonton, NJ.

It is deliberately small and local. The public site has four pages:

| Page | What it is for |
|------|----------------|
| **Home** (`/`) | Who we are, what is coming up, and where to find us |
| **Events** (`/events`) | Post calendar — list and month views, plus a feed people can subscribe to |
| **Hall Rental** (`/hall-rental`) | Hall details, a live availability calendar and an online request form |
| **Officers & Contact** (`/officers`) | Post officers and a contact form |

National topics (advocacy, legislation, membership eligibility, benefits, the Veterans Crisis Line)
are **not** duplicated here. The footer on every page links out to legion.org for them.
To change those links, edit the two short lists in `src/lib/site.ts`.

The look follows the national site, legion.org: the same navy, blue and red, and the same
typefaces (Archivo for headlines, Inter for text).

---

## For post officers: everyday updates

Go to **`/admin`** on the website (there is also an “Officer sign-in” link at the bottom of every page).
Nothing below needs a developer, and every change appears on the site immediately.

| I want to… | Where |
|------------|-------|
| Add a meeting or event | **Events → Add an Event** |
| Set up a monthly meeting once | Add the first date, then choose **Repeating → Every month, same week and weekday** |
| Cancel one night of a repeating event | Edit the event → **Skip these dates** |
| Cancel an event but keep it visible | Edit the event → tick **Mark as cancelled** |
| Answer a hall request | **Hall Bookings** → open the request → **Approve** or **Decline** |
| Record a rental taken by phone | **Hall Bookings → Add a Booking** |
| Close the hall for a day | **Hall Bookings → Blocked Dates** |
| Update officers after an election | **Officers** (use the arrows to change the order) |
| Read messages from the contact form | **Messages** |
| Change the phone, meeting night, hall rates or policies | **Settings** |
| Put a notice across the top of every page | **Settings → Announcement banner** |
| Give another officer access, or remove it | **Account** |

How hall booking works:

1. A visitor picks an open date on the calendar and sends a request. Nothing is charged online.
2. The request appears under **Hall Bookings → Waiting for review** (and is emailed to the post if email is set up).
3. An officer approves or declines it. Approved dates show as booked on the public calendar straight away,
   and two approved bookings can't overlap by accident.
4. The renter can check on their request at `/hall-rental/status` using the reference they were given.

Post events marked **“This event uses the hall”** block the hall on those dates automatically.

Officers’ phone numbers and email addresses stay private unless **“show on the website”** is ticked.
Visitors can still write to an officer through the contact form without seeing the address.

---

## Before the site goes live

- [ ] **Confirm the officer list.** The site starts with the Commander, Adjutant and Chaplain as reported in
      local news coverage in June 2026, by name and title only. Check them and add the rest in **Admin → Officers**.
- [ ] **Confirm the hall details** in **Admin → Settings**: capacity (starts at 80), what the hall offers,
      rental hours, policies. Rates are blank until you add them; until then the page says “contact us for a quote”.
- [ ] **Set the meeting schedule** in **Admin → Settings**, and add the meeting as a repeating event.
- [ ] **Add the email address** that should receive hall requests and messages (**Settings → Notifications**).
- [ ] **Remove sample content** if you added any (**Dashboard → Sample content**).
- [ ] **Add the official brandmark** (see below) and, if you have them, photos of the hall.

### Official brandmark

Until a brandmark file is added, the header and footer show the post’s name as plain text.
The site never shows a redrawn or altered version of the emblem.

1. An officer downloads the brandmark from National Headquarters:
   <https://www.legion.org/about/organization/the-emblem/emblem-and-brand-mark-download>.
   You will be asked to confirm that you comply with the emblem use policy. Posts may use the emblem and
   brandmark for legitimate post business.
2. Save two files in `public/brand/` with exactly these names:
   - `brandmark-white.png` (or `.svg`) — the one-color **white** version, for the navy header
   - `brandmark.png` (or `.svg`) — the full-color version, for the white footer
3. Publish the site again. They appear beside “Post 186 · Hammonton, New Jersey”.

Do not recolor, crop, stretch or redraw the artwork. Brand guidelines:
<https://www.legion.org/about/media-toolkits/brand-marks-guidelines>.

### Photos

Add image files (JPG, PNG or WebP, about 1600 px wide) and publish again — no code changes.

| File | Where it shows |
|------|----------------|
| `public/photos/hero.jpg` | Top of the home page (otherwise the stars-and-stripes artwork is shown) |
| `public/photos/hall/*.jpg` | Gallery on the Hall Rental page, in file-name order (`01-main-room.jpg`, `02-kitchen.jpg`…). The file name becomes the description for screen readers. |
| `public/photos/officers/*.jpg` | Officer portraits. Enter the path (for example `/photos/officers/commander.jpg`) in **Admin → Officers**. |

Only use photos the post has the right to publish.

---

## Putting it online

The site needs a host that runs Node.js and a small database. Two good options:

### Option A — Vercel + Turso (free for a site this size)

1. Create a free database at <https://turso.tech>. Copy its **URL** and an **auth token**.
2. At <https://vercel.com>, **Add New → Project**, import this repository and set
   **Root Directory** to `post186`.
3. Under **Environment Variables**, add:

   | Name | Value |
   |------|-------|
   | `TURSO_DATABASE_URL` | the database URL from step 1 (`libsql://…`) |
   | `TURSO_AUTH_TOKEN` | the token from step 1 |
   | `ADMIN_EMAIL` | the email you will sign in with |
   | `ADMIN_PASSWORD` | a password of at least 10 characters |
   | `SITE_URL` | the site’s address, for example `https://www.post186.org` |

4. Deploy. Open `/admin`, sign in with that email and password, and work through the checklist above.
   After the first sign-in, passwords are managed in **Admin → Account** and the two `ADMIN_` variables are ignored.
5. Add your domain name under **Settings → Domains**.

### Option B — any server with a disk

```bash
cd post186
npm ci
ADMIN_EMAIL=you@example.org ADMIN_PASSWORD='choose-a-long-one' SITE_URL=https://www.post186.org npm run build
ADMIN_EMAIL=you@example.org ADMIN_PASSWORD='choose-a-long-one' SITE_URL=https://www.post186.org npm start
```

With no database variables set, everything is stored in one file, `data/post186.db`.
**Back that file up** — it holds the events, bookings, messages and sign-ins. Serve the site over HTTPS.

### Email notifications (optional)

Without email, requests and messages still arrive in the admin area; they just aren’t emailed.
To turn email on, create a free account at <https://resend.com>, verify your domain, and add:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | your Resend API key |
| `EMAIL_FROM` | for example `American Legion Post 186 <notices@post186.org>` |

The post is then emailed each new hall request and message, and renters are emailed a confirmation and
the decision on their request.

---

## For developers

```bash
cd post186
npm install
npm run dev          # http://localhost:3000
```

A local database is created on first run. In development you can sign in at `/admin` with
`admin@post186.test` / `post186-local-dev` (shown on the sign-in page; never available in production).
**Dashboard → Add Sample Content** fills the site with sample events and bookings.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (dates, repeating events, calendar feed, form validation) |
| `npx vitest run tests/recurrence.test.ts` | Run a single test file |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

**Stack.** Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4,
libSQL/SQLite, Zod. No client-side data fetching and no third-party scripts, fonts or trackers.

**How it fits together**

- `src/app/(site)/` — the four public pages, plus `/privacy`, `/hall-rental/status`, event detail pages and
  the calendar feed at `/events/calendar.ics`.
- `src/app/admin/` — the officer area. Every page and every action calls `requireAdmin()`.
- `src/lib/repo.ts` — all database reads and writes. `src/lib/db.ts` creates the tables on first use.
- `src/lib/data.ts` — cached reads for the public site, tagged `settings`, `events`, `officers`, `bookings`.
  Public pages are prerendered and served static; an admin save calls `updateTag(...)`, so changes are live at once.
- `src/lib/actions/` — server actions for the public forms (`public.ts`) and the admin area (`admin.ts`).
- `src/lib/recurrence.ts`, `dates.ts`, `ics.ts` — repeating events, time handling and the calendar feed.
  All dates and times are stored as wall-clock values in the post’s time zone (`America/New_York`) and are
  never converted, so 7:00 PM is always 7:00 PM.
- `src/lib/settings.ts` — the post details an officer can edit, and their starting values.
- `src/components/forms/Form.tsx` — one form kit for every form: labelled fields, inline errors, values kept
  after a failed submit, and forms that work without JavaScript.
- `src/app/globals.css` — design tokens (colors and type matched to legion.org) and shared component classes.

**Security and privacy.** Passwords are hashed with scrypt; sessions are random tokens stored hashed, in an
HTTP-only cookie. Public forms are validated on the server, rate-limited and protected by a honeypot field.
The public calendar exposes only a status per date, never renter details. There are no cookies, analytics
or third-party requests on the public pages.

**Accessibility.** Built to WCAG 2.1 AA: semantic landmarks and headings, a skip link, visible focus,
labelled form fields with errors tied to their inputs, keyboard-operable calendars and menus, sufficient
contrast, large tap targets, and reduced motion when the device asks for it.

**Notes for this Next.js version.** Read `AGENTS.md` first: Next.js 16 with Cache Components differs from
earlier versions, and the guides in `node_modules/next/dist/docs/` are the reference. In short — public data
is read through `"use cache"` functions; anything that reads cookies, the URL or the clock sits behind
`<Suspense>`; admin pages export `instant = false`.

**Not included (yet).** Online payments or deposits, photo uploads from the admin area (photos are files in
`public/`), multi-day events, and a members-only area.
