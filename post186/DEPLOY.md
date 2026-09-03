# Deploying the Post 186 website

The site is a Next.js application that stores its content in Postgres. This guide covers the
intended setup: **GitHub for the code, Vercel for the hosting, and a Vercel-managed Postgres
database for the content.**

Everything below is done once. After that, deploying is just pushing to the branch Vercel watches,
and editing content is done in the admin area with no deploy at all.

## What lives where

| Thing | Where it lives |
| --- | --- |
| Code | GitHub, in the `post186/` directory of this repository |
| Hosting | Vercel project with **Root Directory** set to `post186` |
| Events, news, inquiries, site content | Vercel Postgres |
| Admin password | An environment variable holding a hash, never the password itself |
| Uploaded brand files | `post186/public/brand`, committed with the code |

This repository also holds an unrelated project at its root (the LD8 election map), which has its
own `vercel.json` and its own Vercel project. That is why the Root Directory setting matters: it is
what keeps the two deployments apart.

## 1. Push the code to GitHub

The code is already in this repository under `post186/`. Push your branch as usual; nothing about
the deployment depends on which branch you work on, only on which branch you point Vercel at.

## 2. Create the Vercel project

1. In Vercel, choose **Add New, Project** and import this GitHub repository.
2. **Set the Root Directory to `post186`.** This is the one setting that is easy to miss and it will
   not work without it — Vercel would otherwise build the project at the repository root.
3. Leave the framework preset as **Next.js**. Build command, output directory, and install command
   are all handled by `post186/vercel.json`.
4. Do not deploy yet. Add the database and the environment variables first, so the first deploy
   comes up complete.

This is a **second, separate** Vercel project on the same repository. The LD8 map keeps its own
project, its own domains, and its own environment variables; nothing is shared between them except
the Git history. The Root Directory setting is what tells each project which half of the repository
it owns.

### Stop the two projects rebuilding each other

Both projects watch the same repository, so out of the box *every* push builds *both* of them — a
change to a map component would redeploy the Post 186 site, and a fixed typo in a news template
would redeploy the map. The deploys are harmless (each still builds only its own Root Directory)
but they waste build minutes and put a confusing second preview on every pull request.

Fix it on **both** projects, under **Settings, Git, Ignored Build Step**. Choose the option to run a
command, and use:

```
git diff --quiet HEAD^ HEAD -- .
```

The command runs from the project's Root Directory. It exits 0 when that directory is unchanged,
which tells Vercel to skip the build, and exits 1 when there are changes, which lets the build
proceed. Set it on the LD8 project too, or that one will still rebuild on every Post 186 change.

Newer Vercel dashboards may offer this as a checkbox worded roughly as "only build if there are
changes in the Root Directory". Either form does the same job.

### If you would rather they were fully separate

Two projects on one repository is the normal arrangement and it is what this guide assumes. If you
want genuine separation — separate history, separate issues, separate access — move `post186/` into
a repository of its own and point a Vercel project at that instead. Nothing in the code depends on
living in this repository; the Root Directory setting would simply become the repository root, and
the Ignored Build Step above would no longer be needed.

## 3. Attach a Postgres database

1. Open the project's **Storage** tab and create a **Postgres** database (Vercel's managed Postgres,
   provided by Neon).
2. Connect it to the project, for the Production, Preview, and Development environments.

Vercel then sets the connection variables on the project automatically, including `DATABASE_URL` and
`POSTGRES_URL`. The site reads `DATABASE_URL` first and falls back to `POSTGRES_URL`, so either one
being present is enough. You do not need to copy or paste a connection string anywhere.

One thing worth deciding now: pick a database **region** close to the project's function region
(`iad1`, Washington D.C., is the default for new Vercel projects and a sensible match for a New
Jersey audience). Every page reads from the database on each request, so a database on the other
side of the country adds latency to every visit.

### Preview deployments share the production database

Connecting the database to all three environments means a preview deployment reads and writes the
same content as the live site. That is usually what a small site wants — previews show real content.
If you would rather keep them apart, create a second database, connect it to Preview and Development
only, and connect the first to Production only.

## 4. Set the remaining environment variables

Under **Settings, Environment Variables**, add these for Production (and Preview, if you use it):

| Variable | Value |
| --- | --- |
| `SITE_URL` | The site's real address, with no trailing slash, for example `https://post186.org` |
| `SITE_TIMEZONE` | `America/New_York` |
| `ADMIN_USERNAME` | The admin username |
| `ADMIN_PASSWORD_HASH` | Output of `npm run hash-password -- "a long passphrase"` — the whole `scrypt:...` line |
| `SESSION_SECRET` | 32+ random characters, from `openssl rand -hex 32` |

Generate the two secrets on your own machine, inside `post186/`:

```
npm run hash-password -- "a long passphrase you will remember"
openssl rand -hex 32
```

The password itself is never stored anywhere — only the hash. Do not wrap values in quotes, and
avoid dollar signs: environment files expand `$NAME`, which is why the hash uses colons as
separators.

Optional variables (`NOTIFY_EMAIL_TO`, `SMTP_*`, `DATABASE_SSL`, `DATABASE_POOL_MAX`,
`DATABASE_AUTO_MIGRATE`) are described in the README's environment table. None are needed to launch.

## 5. Deploy

Deploy the project. The build does not touch the database, so it succeeds even before the database
has any tables in it.

The first time a page queries the database, the site creates its tables and the default event and
news categories. That is idempotent and safe to run repeatedly, and it is safe when several
instances start at once. If you would rather do it explicitly, run it from your own machine with the
database's connection string:

```
cd post186
DATABASE_URL="postgres://..." npm run db:setup
```

Copy that connection string from Vercel: **Storage**, the database, then the `.env.local` tab.

## 6. Check it over

Visit the deployed address and confirm:

- The home page, events, and news all load.
- `/admin` redirects to a sign-in page, and your username and password work.
- Saving something in **Site content** shows up on the public site straight away.
- A test message through the contact form lands in the **Inquiries** queue. Delete it afterwards.

Optionally load demonstration content while the Post reviews the site:

```
cd post186
DATABASE_URL="postgres://..." npm run seed
```

Everything it creates is prefixed with `[Demo]`. Delete those items from the admin area before
launch.

## 7. Point the domain at it

Add the Post's domain under **Settings, Domains** and follow the DNS instructions Vercel gives you.
Then update `SITE_URL` to that address and redeploy, so canonical links, the sitemap, and calendar
files use the real domain.

## Day-to-day

- **Editing content** never needs a deploy. Every page that reads content is rendered per request,
  so admin edits are live immediately.
- **Deploying code** is a push to the branch Vercel watches.
- **Backups** are the database provider's job. Vercel-managed Postgres keeps point-in-time restore;
  you can also take your own snapshot at any time with `pg_dump "$DATABASE_URL" > backup.sql`.
- **Rolling back** a bad deploy is instant from the Vercel dashboard's deployment list. Note that a
  rollback returns the *code*, not the content — content lives in the database.

## Troubleshooting

**"No database connection string."** — The database is not connected to the environment being
deployed. Check Storage, and confirm `DATABASE_URL` or `POSTGRES_URL` appears under Settings,
Environment Variables for that environment. Redeploy after connecting it; environment variables are
read at deploy time.

**Signing in bounces back to the login page.** — `SESSION_SECRET` must be at least 16 characters
(use 32+), and it must be the same on every instance. If sign-in fails outright, re-check
`ADMIN_PASSWORD_HASH`: it should be the complete `scrypt:salt:hash` line, unquoted.

**A TLS error connecting to the database.** — The default is verified TLS, which is right for
Vercel Postgres. If you moved to a provider with a self-signed certificate, set `DATABASE_SSL` to
`no-verify`.

**"Too many connections."** — Lower `DATABASE_POOL_MAX` (the default is 3 per instance), or use the
pooled connection string your provider offers. Vercel's Postgres connection strings are pooled
already.

**The build fails after switching Vercel projects around.** — Confirm the Root Directory is
`post186`. Without it, Vercel builds the LD8 map at the repository root instead.
