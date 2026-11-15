import "server-only";

import { randomInt } from "node:crypto";
import { getKv, query, run, setKv, type Row } from "./db";
import { isHm, isYmd, nowIso, type Ymd } from "./dates";
import { RECURRENCE_VALUES, type Recurrence } from "./recurrence";
import { mergeSettings, type SiteSettings } from "./settings";
import type {
  AdminUser,
  BlockedDate,
  Booking,
  BookingStatus,
  EventCategory,
  EventRecord,
  Message,
  Officer,
  OfficerGroup,
} from "./types";

/**
 * Direct, uncached database reads and writes.
 * The public site reads through src/lib/data.ts (cached); the admin area and
 * server actions use these functions so they always see the latest data.
 */

const bool = (v: unknown) => Number(v) === 1;
const str = (v: unknown) => (v == null ? "" : String(v));

// ───────────────────────── Settings ─────────────────────────

export async function readSettings(): Promise<SiteSettings> {
  const raw = await getKv("settings");
  if (!raw) return mergeSettings(null);
  try {
    return mergeSettings(JSON.parse(raw));
  } catch {
    return mergeSettings(null);
  }
}

export async function writeSettings(settings: SiteSettings): Promise<void> {
  await setKv("settings", JSON.stringify(settings));
}

// ───────────────────────── Events ─────────────────────────

function toEvent(r: Row): EventRecord {
  const recurrence = str(r.recurrence) as Recurrence;
  return {
    id: Number(r.id),
    slug: str(r.slug),
    title: str(r.title),
    summary: str(r.summary),
    description: str(r.description),
    category: str(r.category) as EventCategory,
    location: str(r.location),
    startDate: str(r.start_date),
    startTime: isHm(r.start_time) ? r.start_time : null,
    endTime: isHm(r.end_time) ? r.end_time : null,
    recurrence: RECURRENCE_VALUES.includes(recurrence) ? recurrence : "none",
    repeatUntil: isYmd(r.repeat_until) ? r.repeat_until : null,
    skipDates: str(r.skip_dates).split(",").filter(isYmd),
    audience: str(r.audience) === "members" ? "members" : "public",
    usesHall: bool(r.uses_hall),
    featured: bool(r.featured),
    published: bool(r.published),
    cancelled: bool(r.cancelled),
    isDemo: bool(r.is_demo),
    updatedAt: str(r.updated_at),
  };
}

export async function listEvents(options: { publishedOnly?: boolean } = {}): Promise<EventRecord[]> {
  const rows = await query(
    `SELECT * FROM events ${options.publishedOnly ? "WHERE published = 1" : ""} ORDER BY start_date, start_time`,
  );
  return rows.map(toEvent);
}

export async function getEvent(id: number): Promise<EventRecord | null> {
  const rows = await query("SELECT * FROM events WHERE id = ?", [id]);
  return rows.length ? toEvent(rows[0]) : null;
}

export async function getEventBySlug(slug: string): Promise<EventRecord | null> {
  const rows = await query("SELECT * FROM events WHERE slug = ? AND published = 1", [slug]);
  return rows.length ? toEvent(rows[0]) : null;
}

export type EventInput = Omit<EventRecord, "id" | "slug" | "isDemo" | "updatedAt">;

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event"
  );
}

async function uniqueSlug(title: string, excludeId?: number): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 200; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const rows = await query("SELECT id FROM events WHERE slug = ?", [candidate]);
    if (!rows.length || Number(rows[0].id) === excludeId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function eventArgs(e: EventInput) {
  return [
    e.title,
    e.summary,
    e.description,
    e.category,
    e.location,
    e.startDate,
    e.startTime,
    e.endTime,
    e.recurrence,
    e.repeatUntil,
    e.skipDates.join(","),
    e.audience,
    e.usesHall ? 1 : 0,
    e.featured ? 1 : 0,
    e.published ? 1 : 0,
    e.cancelled ? 1 : 0,
  ];
}

export async function createEvent(input: EventInput): Promise<number> {
  const now = nowIso();
  const slug = await uniqueSlug(input.title);
  const { lastInsertId } = await run(
    `INSERT INTO events (title, summary, description, category, location, start_date, start_time,
       end_time, recurrence, repeat_until, skip_dates, audience, uses_hall, featured, published,
       cancelled, slug, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...eventArgs(input), slug, now, now],
  );
  return lastInsertId;
}

/** The slug (and so the public link) is kept stable when an event is edited. */
export async function updateEvent(id: number, input: EventInput): Promise<void> {
  await run(
    `UPDATE events SET title = ?, summary = ?, description = ?, category = ?, location = ?,
       start_date = ?, start_time = ?, end_time = ?, recurrence = ?, repeat_until = ?,
       skip_dates = ?, audience = ?, uses_hall = ?, featured = ?, published = ?, cancelled = ?,
       is_demo = 0, updated_at = ?
     WHERE id = ?`,
    [...eventArgs(input), nowIso(), id],
  );
}

export async function deleteEvent(id: number): Promise<void> {
  await run("DELETE FROM events WHERE id = ?", [id]);
}

// ───────────────────────── Officers ─────────────────────────

function toOfficer(r: Row): Officer {
  const group = str(r.grp);
  return {
    id: Number(r.id),
    name: str(r.name),
    title: str(r.title),
    group: (["officer", "committee", "family"].includes(group) ? group : "officer") as OfficerGroup,
    email: str(r.email),
    phone: str(r.phone),
    showEmail: bool(r.show_email),
    showPhone: bool(r.show_phone),
    acceptsMessages: bool(r.accepts_messages),
    bio: str(r.bio),
    photoUrl: str(r.photo_url),
    sortOrder: Number(r.sort_order),
    isDemo: bool(r.is_demo),
  };
}

export async function listOfficers(): Promise<Officer[]> {
  const rows = await query("SELECT * FROM officers ORDER BY sort_order, id");
  return rows.map(toOfficer);
}

export async function getOfficer(id: number): Promise<Officer | null> {
  const rows = await query("SELECT * FROM officers WHERE id = ?", [id]);
  return rows.length ? toOfficer(rows[0]) : null;
}

export type OfficerInput = Omit<Officer, "id" | "sortOrder" | "isDemo">;

export async function createOfficer(input: OfficerInput): Promise<number> {
  const now = nowIso();
  const max = await query("SELECT COALESCE(MAX(sort_order), 0) AS max FROM officers");
  const { lastInsertId } = await run(
    `INSERT INTO officers (name, title, grp, email, phone, show_email, show_phone,
       accepts_messages, bio, photo_url, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.title,
      input.group,
      input.email,
      input.phone,
      input.showEmail ? 1 : 0,
      input.showPhone ? 1 : 0,
      input.acceptsMessages ? 1 : 0,
      input.bio,
      input.photoUrl,
      Number(max[0].max) + 10,
      now,
      now,
    ],
  );
  return lastInsertId;
}

export async function updateOfficer(id: number, input: OfficerInput): Promise<void> {
  await run(
    `UPDATE officers SET name = ?, title = ?, grp = ?, email = ?, phone = ?, show_email = ?,
       show_phone = ?, accepts_messages = ?, bio = ?, photo_url = ?, is_demo = 0, updated_at = ?
     WHERE id = ?`,
    [
      input.name,
      input.title,
      input.group,
      input.email,
      input.phone,
      input.showEmail ? 1 : 0,
      input.showPhone ? 1 : 0,
      input.acceptsMessages ? 1 : 0,
      input.bio,
      input.photoUrl,
      nowIso(),
      id,
    ],
  );
}

export async function deleteOfficer(id: number): Promise<void> {
  await run("DELETE FROM officers WHERE id = ?", [id]);
}

/** Moves an officer one place up or down in the display order. */
export async function moveOfficer(id: number, direction: "up" | "down"): Promise<void> {
  const all = await listOfficers();
  const index = all.findIndex((o) => o.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= all.length) return;
  const reordered = [...all];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
  for (let i = 0; i < reordered.length; i += 1) {
    await run("UPDATE officers SET sort_order = ? WHERE id = ?", [(i + 1) * 10, reordered[i].id]);
  }
}

// ───────────────────────── Bookings ─────────────────────────

function toBooking(r: Row): Booking {
  return {
    id: Number(r.id),
    reference: str(r.reference),
    status: str(r.status) as BookingStatus,
    eventDate: str(r.event_date),
    startTime: str(r.start_time),
    endTime: str(r.end_time),
    eventType: str(r.event_type),
    guestCount: Number(r.guest_count),
    contactName: str(r.contact_name),
    contactEmail: str(r.contact_email),
    contactPhone: str(r.contact_phone),
    organization: str(r.organization),
    isMember: bool(r.is_member),
    alcohol: bool(r.alcohol),
    kitchen: bool(r.kitchen),
    notes: str(r.notes),
    adminNotes: str(r.admin_notes),
    declineReason: str(r.decline_reason),
    quotedAmount: str(r.quoted_amount),
    depositPaid: bool(r.deposit_paid),
    source: str(r.source) === "admin" ? "admin" : "web",
    isDemo: bool(r.is_demo),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    decidedAt: r.decided_at ? str(r.decided_at) : null,
  };
}

export async function listBookings(status?: BookingStatus): Promise<Booking[]> {
  const rows = status
    ? await query("SELECT * FROM bookings WHERE status = ? ORDER BY event_date, start_time", [status])
    : await query("SELECT * FROM bookings ORDER BY event_date DESC, start_time");
  return rows.map(toBooking);
}

export async function listBookingsFrom(date: Ymd): Promise<Booking[]> {
  const rows = await query(
    "SELECT * FROM bookings WHERE event_date >= ? ORDER BY event_date, start_time",
    [date],
  );
  return rows.map(toBooking);
}

export async function getBooking(id: number): Promise<Booking | null> {
  const rows = await query("SELECT * FROM bookings WHERE id = ?", [id]);
  return rows.length ? toBooking(rows[0]) : null;
}

export async function getBookingByReference(reference: string): Promise<Booking | null> {
  const rows = await query("SELECT * FROM bookings WHERE reference = ?", [reference]);
  return rows.length ? toBooking(rows[0]) : null;
}

export async function countBookings(): Promise<Record<BookingStatus, number>> {
  const rows = await query("SELECT status, COUNT(*) AS n FROM bookings GROUP BY status");
  const counts: Record<BookingStatus, number> = { pending: 0, approved: 0, declined: 0, cancelled: 0 };
  for (const r of rows) {
    const status = str(r.status) as BookingStatus;
    if (status in counts) counts[status] = Number(r.n);
  }
  return counts;
}

/** Approved bookings on the same day whose times overlap the given range. */
export async function findConflicts(
  date: Ymd,
  startTime: string,
  endTime: string,
  excludeId?: number,
): Promise<Booking[]> {
  const rows = await query(
    `SELECT * FROM bookings
     WHERE event_date = ? AND status = 'approved' AND id != ?
       AND start_time < ? AND end_time > ?`,
    [date, excludeId ?? -1, endTime, startTime],
  );
  return rows.map(toBooking);
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

async function newReference(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
    const reference = `P186-${code}`;
    if (!(await getBookingByReference(reference))) return reference;
  }
  throw new Error("Could not generate a booking reference.");
}

export type BookingInput = Pick<
  Booking,
  | "eventDate"
  | "startTime"
  | "endTime"
  | "eventType"
  | "guestCount"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "organization"
  | "isMember"
  | "alcohol"
  | "kitchen"
  | "notes"
>;

export async function createBooking(
  input: BookingInput,
  options: { status: BookingStatus; source: "web" | "admin"; adminNotes?: string; quotedAmount?: string },
): Promise<Booking> {
  const now = nowIso();
  const reference = await newReference();
  const { lastInsertId } = await run(
    `INSERT INTO bookings (reference, status, event_date, start_time, end_time, event_type,
       guest_count, contact_name, contact_email, contact_phone, organization, is_member, alcohol,
       kitchen, notes, admin_notes, quoted_amount, source, created_at, updated_at, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reference,
      options.status,
      input.eventDate,
      input.startTime,
      input.endTime,
      input.eventType,
      input.guestCount,
      input.contactName,
      input.contactEmail,
      input.contactPhone,
      input.organization,
      input.isMember ? 1 : 0,
      input.alcohol ? 1 : 0,
      input.kitchen ? 1 : 0,
      input.notes,
      options.adminNotes ?? "",
      options.quotedAmount ?? "",
      options.source,
      now,
      now,
      options.status === "pending" ? null : now,
    ],
  );
  return (await getBooking(lastInsertId))!;
}

export async function updateBookingDetails(
  id: number,
  input: BookingInput & { adminNotes: string; quotedAmount: string; depositPaid: boolean },
): Promise<void> {
  await run(
    `UPDATE bookings SET event_date = ?, start_time = ?, end_time = ?, event_type = ?,
       guest_count = ?, contact_name = ?, contact_email = ?, contact_phone = ?, organization = ?,
       is_member = ?, alcohol = ?, kitchen = ?, notes = ?, admin_notes = ?, quoted_amount = ?,
       deposit_paid = ?, is_demo = 0, updated_at = ?
     WHERE id = ?`,
    [
      input.eventDate,
      input.startTime,
      input.endTime,
      input.eventType,
      input.guestCount,
      input.contactName,
      input.contactEmail,
      input.contactPhone,
      input.organization,
      input.isMember ? 1 : 0,
      input.alcohol ? 1 : 0,
      input.kitchen ? 1 : 0,
      input.notes,
      input.adminNotes,
      input.quotedAmount,
      input.depositPaid ? 1 : 0,
      nowIso(),
      id,
    ],
  );
}

export async function setBookingStatus(
  id: number,
  status: BookingStatus,
  declineReason = "",
): Promise<void> {
  const now = nowIso();
  await run(
    "UPDATE bookings SET status = ?, decline_reason = ?, decided_at = ?, updated_at = ? WHERE id = ?",
    [status, status === "declined" ? declineReason : "", status === "pending" ? null : now, now, id],
  );
}

export async function deleteBooking(id: number): Promise<void> {
  await run("DELETE FROM bookings WHERE id = ?", [id]);
}

// ───────────────────────── Blocked dates ─────────────────────────

export async function listBlockedDates(from?: Ymd): Promise<BlockedDate[]> {
  const rows = from
    ? await query("SELECT * FROM blocked_dates WHERE date >= ? ORDER BY date", [from])
    : await query("SELECT * FROM blocked_dates ORDER BY date");
  return rows.map((r) => ({ id: Number(r.id), date: str(r.date), reason: str(r.reason) }));
}

export async function addBlockedDate(date: Ymd, reason: string): Promise<void> {
  await run(
    "INSERT INTO blocked_dates (date, reason) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason",
    [date, reason],
  );
}

export async function removeBlockedDate(id: number): Promise<void> {
  await run("DELETE FROM blocked_dates WHERE id = ?", [id]);
}

// ───────────────────────── Messages ─────────────────────────

export async function createMessage(input: {
  name: string;
  email: string;
  phone: string;
  topic: string;
  officerId: number | null;
  officerName: string | null;
  body: string;
}): Promise<void> {
  await run(
    `INSERT INTO messages (name, email, phone, topic, officer_id, officer_name, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.name, input.email, input.phone, input.topic, input.officerId, input.officerName, input.body, nowIso()],
  );
}

export async function listMessages(): Promise<Message[]> {
  const rows = await query("SELECT * FROM messages ORDER BY created_at DESC LIMIT 300");
  return rows.map((r) => ({
    id: Number(r.id),
    name: str(r.name),
    email: str(r.email),
    phone: str(r.phone),
    topic: str(r.topic),
    officerId: r.officer_id == null ? null : Number(r.officer_id),
    officerName: r.officer_name == null ? null : str(r.officer_name),
    body: str(r.body),
    isRead: bool(r.is_read),
    createdAt: str(r.created_at),
  }));
}

export async function countUnreadMessages(): Promise<number> {
  const rows = await query("SELECT COUNT(*) AS n FROM messages WHERE is_read = 0");
  return Number(rows[0].n);
}

export async function setMessageRead(id: number, isRead: boolean): Promise<void> {
  await run("UPDATE messages SET is_read = ? WHERE id = ?", [isRead ? 1 : 0, id]);
}

export async function deleteMessage(id: number): Promise<void> {
  await run("DELETE FROM messages WHERE id = ?", [id]);
}

// ───────────────────────── Admin users ─────────────────────────

export async function listAdminUsers(): Promise<AdminUser[]> {
  const rows = await query("SELECT id, email, name, created_at FROM admin_users ORDER BY id");
  return rows.map((r) => ({
    id: Number(r.id),
    email: str(r.email),
    name: str(r.name),
    createdAt: str(r.created_at),
  }));
}

export async function countAdminUsers(): Promise<number> {
  const rows = await query("SELECT COUNT(*) AS n FROM admin_users");
  return Number(rows[0].n);
}

export async function findAdminByEmail(
  email: string,
): Promise<(AdminUser & { passwordHash: string }) | null> {
  const rows = await query("SELECT * FROM admin_users WHERE email = ?", [email.toLowerCase()]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    email: str(r.email),
    name: str(r.name),
    createdAt: str(r.created_at),
    passwordHash: str(r.password_hash),
  };
}

export async function createAdminUser(email: string, name: string, passwordHash: string): Promise<number> {
  const { lastInsertId } = await run(
    "INSERT INTO admin_users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)",
    [email.toLowerCase(), name, passwordHash, nowIso()],
  );
  return lastInsertId;
}

export async function updateAdminPassword(id: number, passwordHash: string): Promise<void> {
  await run("UPDATE admin_users SET password_hash = ? WHERE id = ?", [passwordHash, id]);
}

export async function deleteAdminUser(id: number): Promise<void> {
  await run("DELETE FROM sessions WHERE user_id = ?", [id]);
  await run("DELETE FROM admin_users WHERE id = ?", [id]);
}

// ───────────────────────── Sample content ─────────────────────────

export async function countDemoRows(): Promise<number> {
  const rows = await query(
    `SELECT (SELECT COUNT(*) FROM events WHERE is_demo = 1)
          + (SELECT COUNT(*) FROM bookings WHERE is_demo = 1)
          + (SELECT COUNT(*) FROM officers WHERE is_demo = 1) AS n`,
  );
  return Number(rows[0].n);
}

export async function removeDemoRows(): Promise<void> {
  await run("DELETE FROM events WHERE is_demo = 1");
  await run("DELETE FROM bookings WHERE is_demo = 1");
  await run("DELETE FROM officers WHERE is_demo = 1");
}
