/**
 * Postgres schema. Applied once per process by `getDb()` and by `npm run db:setup`.
 * Every statement is idempotent, so running it against an existing database is a no-op.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('post','event')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (kind, slug)
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  featured_image TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published')),
  is_featured INTEGER NOT NULL DEFAULT 0,
  publish_at TEXT NOT NULL,
  seo_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_public ON posts (status, publish_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  featured_image TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  organizer TEXT NOT NULL DEFAULT '',
  cost TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  link_label TEXT NOT NULL DEFAULT '',
  accessibility_notes TEXT NOT NULL DEFAULT '',
  recurrence TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','postponed','cancelled')),
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_public ON events (is_public, start_at);

CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('membership','rental','general')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','contacted','closed','spam')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  contact_method TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '{}',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inquiries_queue ON inquiries (type, status, created_at DESC);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
`;

export const DEFAULT_CATEGORIES: Array<{ kind: "post" | "event"; name: string; slug: string }> = [
  { kind: "post", name: "Post News", slug: "post-news" },
  { kind: "post", name: "Community Service", slug: "community-service" },
  { kind: "post", name: "Veteran Resources", slug: "veteran-resources" },
  { kind: "post", name: "Ceremonies", slug: "ceremonies" },
  { kind: "post", name: "Events", slug: "events" },
  { kind: "post", name: "Member Stories", slug: "member-stories" },
  { kind: "event", name: "Ceremonies", slug: "ceremonies" },
  { kind: "event", name: "Meetings", slug: "meetings" },
  { kind: "event", name: "Fundraisers", slug: "fundraisers" },
  { kind: "event", name: "Community Service", slug: "community-service" },
  { kind: "event", name: "Social Events", slug: "social-events" },
  { kind: "event", name: "Veteran Resources", slug: "veteran-resources" },
];
