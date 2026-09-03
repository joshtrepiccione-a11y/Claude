import { execute, nowIso, query, queryOne } from "./db";
import type { INQUIRY_STATUSES } from "./validation";

export type InquiryType = "membership" | "rental" | "general";
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export type Inquiry = {
  id: number;
  type: InquiryType;
  status: InquiryStatus;
  name: string;
  email: string;
  phone: string;
  contact_method: string;
  organization: string;
  subject: string;
  message: string;
  details: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
};

export type NewInquiry = {
  type: InquiryType;
  name: string;
  email: string;
  phone?: string;
  contact_method?: string;
  organization?: string;
  subject?: string;
  message?: string;
  details?: Record<string, string | number | boolean>;
};

export async function createInquiry(input: NewInquiry): Promise<number> {
  const now = nowIso();
  const row = await queryOne<{ id: number }>(
    `INSERT INTO inquiries (type, status, name, email, phone, contact_method, organization, subject, message, details, created_at, updated_at)
     VALUES ($1, 'new', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [
      input.type,
      input.name,
      input.email,
      input.phone ?? "",
      input.contact_method ?? "",
      input.organization ?? "",
      input.subject ?? "",
      input.message ?? "",
      JSON.stringify(input.details ?? {}),
      now,
      now,
    ],
  );
  return row!.id;
}

export async function listInquiries(type: InquiryType, status?: InquiryStatus): Promise<Inquiry[]> {
  const params: unknown[] = [type];
  let where = "type = $1";
  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  } else {
    where += " AND status <> 'spam'";
  }
  return query<Inquiry>(`SELECT * FROM inquiries WHERE ${where} ORDER BY created_at DESC`, params);
}

export async function getInquiry(id: number): Promise<Inquiry | undefined> {
  return queryOne<Inquiry>("SELECT * FROM inquiries WHERE id = $1", [id]);
}

export async function updateInquiry(id: number, status: InquiryStatus, adminNotes: string): Promise<void> {
  await execute("UPDATE inquiries SET status = $1, admin_notes = $2, updated_at = $3 WHERE id = $4", [
    status,
    adminNotes.slice(0, 5000),
    nowIso(),
    id,
  ]);
}

export async function deleteInquiry(id: number): Promise<void> {
  await execute("DELETE FROM inquiries WHERE id = $1", [id]);
}

export async function inquiryCounts(): Promise<Record<InquiryType, { new: number; total: number }>> {
  const rows = await query<{ type: InquiryType; status: InquiryStatus; n: number }>(
    "SELECT type, status, COUNT(*) AS n FROM inquiries GROUP BY type, status",
  );
  const out: Record<InquiryType, { new: number; total: number }> = {
    membership: { new: 0, total: 0 },
    rental: { new: 0, total: 0 },
    general: { new: 0, total: 0 },
  };
  for (const r of rows) {
    if (r.status === "spam") continue;
    out[r.type].total += r.n;
    if (r.status === "new") out[r.type].new += r.n;
  }
  return out;
}

export function parseDetails(inquiry: Inquiry): Record<string, string> {
  try {
    const obj = JSON.parse(inquiry.details) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, String(v)]));
  } catch {
    return {};
  }
}

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  // Spreadsheets treat a leading =, +, - or @ as a formula, so neutralize it. Text that people
  // typed into a public form should never execute when a volunteer opens the export.
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function inquiriesToCsv(rows: Inquiry[]): string {
  const detailKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(parseDetails(r))))).sort();
  const header = ["id", "type", "status", "created_at", "name", "email", "phone", "contact_method", "organization", "subject", "message", ...detailKeys, "admin_notes"];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    const d = parseDetails(r);
    const cells = [r.id, r.type, r.status, r.created_at, r.name, r.email, r.phone, r.contact_method, r.organization, r.subject, r.message, ...detailKeys.map((k) => d[k] ?? ""), r.admin_notes];
    lines.push(cells.map(csvCell).join(","));
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
