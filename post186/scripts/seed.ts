/**
 * Seeds a small amount of clearly labeled demonstration content so the preview shows
 * how events and posts render. Run with: npm run seed
 * Everything it creates is marked "[Demo]" and should be deleted before launch.
 */
import { closeDb, execute, nowIso, queryOne } from "../src/lib/db";
import { zonedToUtc } from "../src/lib/time";

function nextWeekday(dayOfWeek: number, weeksAhead: number): string {
  const d = new Date();
  const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff + weeksAhead * 7);
  return d.toISOString().slice(0, 10);
}

const now = nowIso();
const EVENT_COLUMNS = [
  "title", "slug", "summary", "description", "start_at", "end_at", "all_day", "location", "is_public",
  "category", "organizer", "cost", "accessibility_notes", "recurrence", "status", "is_featured",
] as const;

const events = [
  {
    title: "[Demo] Monthly Post meeting",
    slug: "demo-monthly-post-meeting",
    summary: "Demonstration event showing how a recurring public meeting appears. Replace with the real schedule.",
    description: "This is placeholder content created to show the events system. Delete it once real events are entered.\n\n- Members and prospective members welcome\n- Agenda and minutes are handled by the Post",
    start_at: zonedToUtc(`${nextWeekday(2, 0)}T19:00`).toISOString(),
    end_at: zonedToUtc(`${nextWeekday(2, 0)}T20:30`).toISOString(),
    all_day: 0,
    location: "",
    is_public: 1,
    category: "meetings",
    organizer: "",
    cost: "Free",
    accessibility_notes: "",
    recurrence: "Demonstration only",
    status: "scheduled",
    is_featured: 0,
  },
  {
    title: "[Demo] Community pancake breakfast",
    slug: "demo-community-pancake-breakfast",
    summary: "Demonstration fundraiser showing cost, organizer, and add-to-calendar features.",
    description: "Placeholder event. Shows how a fundraiser with a cost and organizer renders on the site.",
    start_at: zonedToUtc(`${nextWeekday(6, 1)}T08:00`).toISOString(),
    end_at: zonedToUtc(`${nextWeekday(6, 1)}T11:00`).toISOString(),
    all_day: 0,
    location: "",
    is_public: 1,
    category: "fundraisers",
    organizer: "Post 186 (demo)",
    cost: "$10 suggested donation (demo)",
    accessibility_notes: "Demo note: step-free entrance on French Street.",
    recurrence: "",
    status: "scheduled",
    is_featured: 1,
  },
  {
    title: "[Demo] Postponed workshop",
    slug: "demo-postponed-workshop",
    summary: "Demonstration of how a postponed event is shown.",
    description: "Placeholder showing the postponed state.",
    start_at: zonedToUtc(`${nextWeekday(4, 2)}T18:00`).toISOString(),
    end_at: zonedToUtc(`${nextWeekday(4, 2)}T19:30`).toISOString(),
    all_day: 0,
    location: "Hammonton (demo location)",
    is_public: 1,
    category: "veteran-resources",
    organizer: "",
    cost: "",
    accessibility_notes: "",
    recurrence: "",
    status: "postponed",
    is_featured: 0,
  },
  {
    title: "[Demo] Private hall rental (should never appear publicly)",
    slug: "demo-private-rental",
    summary: "Private booking. is_public is 0, so this is only visible in the admin area.",
    description: "",
    start_at: zonedToUtc(`${nextWeekday(6, 2)}T14:00`).toISOString(),
    end_at: zonedToUtc(`${nextWeekday(6, 2)}T20:00`).toISOString(),
    all_day: 0,
    location: "",
    is_public: 0,
    category: "",
    organizer: "",
    cost: "",
    accessibility_notes: "",
    recurrence: "",
    status: "scheduled",
    is_featured: 0,
  },
  {
    title: "[Demo] Past ceremony",
    slug: "demo-past-ceremony",
    summary: "Demonstration of the past-events archive.",
    description: "Placeholder past event.",
    start_at: zonedToUtc("2026-05-25T10:00").toISOString(),
    end_at: zonedToUtc("2026-05-25T11:00").toISOString(),
    all_day: 0,
    location: "",
    is_public: 1,
    category: "ceremonies",
    organizer: "",
    cost: "",
    accessibility_notes: "",
    recurrence: "",
    status: "scheduled",
    is_featured: 0,
  },
];
const POST_COLUMNS = [
  "title", "slug", "excerpt", "body", "author", "category", "status", "is_featured", "publish_at",
] as const;
const posts = [
  {
    title: "[Demo] Welcome to the new Post 186 website",
    slug: "demo-welcome",
    excerpt: "Demonstration article. It shows how a featured post looks on the News page and the home page.",
    body: "This is placeholder text so the site has something to display during review. Replace it with a real first post.\n\n## What you can do here\n\n- Ask about membership\n- Inquire about renting the hall\n- See upcoming events and add them to your calendar\n\nQuestions? Use the [contact page](/contact).",
    author: "Post 186 (demo)",
    category: "post-news",
    status: "published",
    is_featured: 1,
    publish_at: zonedToUtc("2026-08-20T09:00").toISOString(),
  },
  {
    title: "[Demo] Veteran resources roundup",
    slug: "demo-veteran-resources",
    excerpt: "Demonstration article in the Veteran Resources category.",
    body: "Placeholder article body. Real resources for veterans and families will be posted here.",
    author: "",
    category: "veteran-resources",
    status: "published",
    is_featured: 0,
    publish_at: zonedToUtc("2026-08-10T09:00").toISOString(),
  },
  {
    title: "[Demo] Draft post (hidden from the public site)",
    slug: "demo-draft",
    excerpt: "",
    body: "This draft only appears in the admin area.",
    author: "",
    category: "",
    status: "draft",
    is_featured: 0,
    publish_at: zonedToUtc("2026-09-15T09:00").toISOString(),
  },
];

async function insertRow(table: string, columns: readonly string[], row: Record<string, unknown>) {
  const cols = [...columns, "created_at", "updated_at"];
  const values = [...columns.map((c) => row[c]), now, now];
  await execute(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
    values,
  );
}

async function main() {
  const existing = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM events WHERE title LIKE '[Demo]%'",
  );
  if ((existing?.n ?? 0) > 0) {
    console.log("Demo content already present; nothing to do.");
    await closeDb();
    return;
  }
  for (const e of events) await insertRow("events", EVENT_COLUMNS, e as unknown as Record<string, unknown>);
  for (const p of posts) await insertRow("posts", POST_COLUMNS, p as unknown as Record<string, unknown>);
  console.log(
    `Seeded ${events.length} demo events and ${posts.length} demo posts. Delete them from the admin area before launch.`,
  );
  await closeDb();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
