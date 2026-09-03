import { execute, nowIso, query, queryOne } from "./db";
import { slugify, uniqueSlugAsync } from "./slug";
import { monthBoundsUtc, zonedToUtc } from "./time";
import type { z } from "zod";
import type { eventSchema } from "./validation";

export type Event = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  description: string;
  start_at: string;
  end_at: string;
  all_day: number;
  location: string;
  is_public: number;
  category: string;
  featured_image: string;
  image_alt: string;
  organizer: string;
  cost: string;
  link_url: string;
  link_label: string;
  accessibility_notes: string;
  recurrence: string;
  status: "scheduled" | "postponed" | "cancelled";
  is_featured: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

const PUBLIC_WHERE = "is_public = 1 AND is_archived = 0";

export async function listUpcomingEvents(
  opts: { limit?: number; category?: string; includeCancelled?: boolean } = {},
): Promise<Event[]> {
  const params: unknown[] = [nowIso()];
  let where = `${PUBLIC_WHERE} AND end_at >= $1`;
  if (!opts.includeCancelled) where += " AND status <> 'cancelled'";
  if (opts.category) {
    params.push(opts.category);
    where += ` AND category = $${params.length}`;
  }
  let sql = `SELECT * FROM events WHERE ${where} ORDER BY start_at ASC`;
  if (opts.limit) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  return query<Event>(sql, params);
}

export async function listPastEvents(opts: { limit?: number; category?: string } = {}): Promise<Event[]> {
  const params: unknown[] = [nowIso()];
  let where = `${PUBLIC_WHERE} AND end_at < $1`;
  if (opts.category) {
    params.push(opts.category);
    where += ` AND category = $${params.length}`;
  }
  let sql = `SELECT * FROM events WHERE ${where} ORDER BY start_at DESC`;
  if (opts.limit) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  return query<Event>(sql, params);
}

export async function listEventsInMonth(year: number, month: number, category?: string): Promise<Event[]> {
  const { start, end } = monthBoundsUtc(year, month);
  const params: unknown[] = [end, start];
  let where = `${PUBLIC_WHERE} AND start_at < $1 AND end_at >= $2`;
  if (category) {
    params.push(category);
    where += ` AND category = $${params.length}`;
  }
  return query<Event>(`SELECT * FROM events WHERE ${where} ORDER BY start_at ASC`, params);
}

export async function getPublicEvent(slug: string): Promise<Event | undefined> {
  return queryOne<Event>(`SELECT * FROM events WHERE slug = $1 AND ${PUBLIC_WHERE}`, [slug]);
}

export async function listAllPublicEvents(): Promise<Event[]> {
  return query<Event>(`SELECT * FROM events WHERE ${PUBLIC_WHERE} ORDER BY start_at DESC`);
}

/** Admin */
export async function listAllEvents(opts: { archived?: boolean } = {}): Promise<Event[]> {
  return query<Event>("SELECT * FROM events WHERE is_archived = $1 ORDER BY start_at DESC", [
    opts.archived ? 1 : 0,
  ]);
}

export async function getEventById(id: number): Promise<Event | undefined> {
  return queryOne<Event>("SELECT * FROM events WHERE id = $1", [id]);
}

type EventInput = z.infer<typeof eventSchema>;

async function toRow(input: EventInput, existingId?: number) {
  const base = slugify(input.slug || input.title);
  const slug = await uniqueSlugAsync(base, async (candidate) => {
    const row = await queryOne<{ id: number }>("SELECT id FROM events WHERE slug = $1", [candidate]);
    return Boolean(row && row.id !== existingId);
  });
  const allDay = input.all_day ? 1 : 0;
  const start = allDay ? `${input.start_at.slice(0, 10)}T00:00` : input.start_at;
  const end = allDay ? `${input.end_at.slice(0, 10)}T23:59` : input.end_at;
  return {
    title: input.title,
    slug,
    summary: input.summary,
    description: input.description,
    start_at: zonedToUtc(start).toISOString(),
    end_at: zonedToUtc(end).toISOString(),
    all_day: allDay,
    location: input.location,
    is_public: input.is_public ? 1 : 0,
    category: input.category,
    featured_image: input.featured_image,
    image_alt: input.image_alt,
    organizer: input.organizer,
    cost: input.cost,
    link_url: input.link_url,
    link_label: input.link_label,
    accessibility_notes: input.accessibility_notes,
    recurrence: input.recurrence,
    status: input.status,
    is_featured: input.is_featured ? 1 : 0,
    is_archived: input.is_archived ? 1 : 0,
  };
}

const COLUMNS = [
  "title", "slug", "summary", "description", "start_at", "end_at", "all_day", "location", "is_public", "category",
  "featured_image", "image_alt", "organizer", "cost", "link_url", "link_label", "accessibility_notes", "recurrence",
  "status", "is_featured", "is_archived",
];

export async function createEvent(input: EventInput): Promise<number> {
  const row = (await toRow(input)) as Record<string, unknown>;
  const now = nowIso();
  const cols = [...COLUMNS, "created_at", "updated_at"];
  const values = [...COLUMNS.map((c) => row[c]), now, now];
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO events (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
    values,
  );
  return inserted!.id;
}

export async function updateEvent(id: number, input: EventInput): Promise<void> {
  const row = (await toRow(input, id)) as Record<string, unknown>;
  const cols = [...COLUMNS, "updated_at"];
  const values = [...COLUMNS.map((c) => row[c]), nowIso(), id];
  const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  await execute(`UPDATE events SET ${sets} WHERE id = $${values.length}`, values);
}

export async function setEventStatus(id: number, status: Event["status"]): Promise<void> {
  await execute("UPDATE events SET status = $1, updated_at = $2 WHERE id = $3", [status, nowIso(), id]);
}

export async function setEventArchived(id: number, archived: boolean): Promise<void> {
  await execute("UPDATE events SET is_archived = $1, updated_at = $2 WHERE id = $3", [
    archived ? 1 : 0,
    nowIso(),
    id,
  ]);
}

export async function deleteEvent(id: number): Promise<void> {
  await execute("DELETE FROM events WHERE id = $1", [id]);
}
