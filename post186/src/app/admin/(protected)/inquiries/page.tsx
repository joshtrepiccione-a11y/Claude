import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { inquiryCounts, listInquiries, type InquiryStatus, type InquiryType } from "@/lib/inquiries";
import { INQUIRY_STATUSES, INQUIRY_STATUS_LABELS } from "@/lib/validation";
import { formatShortDate } from "@/lib/time";
import { Flash } from "@/components/admin/Flash";

const TYPES: Array<{ key: InquiryType; label: string }> = [
  { key: "membership", label: "Membership" },
  { key: "rental", label: "Hall rentals" },
  { key: "general", label: "General" },
];

export default async function AdminInquiriesPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; deleted?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const type = (TYPES.some((t) => t.key === sp.type) ? sp.type : "membership") as InquiryType;
  const status = (INQUIRY_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as InquiryStatus) : undefined;
  const counts = await inquiryCounts();
  const rows = await listInquiries(type, status);

  return (
    <>
      <h1>Inquiries</h1>
      <Flash deleted={sp.deleted} />
      <nav className="view-switch" aria-label="Inquiry queues">
        {TYPES.map((t) => (
          <Link key={t.key} href={`/admin/inquiries?type=${t.key}`} aria-current={type === t.key ? "true" : undefined}>
            {t.label} ({counts[t.key].new} new)
          </Link>
        ))}
      </nav>
      <form method="get" action="/admin/inquiries" className="filter-form">
        <input type="hidden" name="type" value={type} />
        <div className="field">
          <label htmlFor="status">Show</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">All except spam</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-outline btn-sm">
          Apply
        </button>
        <a href={`/admin/inquiries/export?type=${type}`} className="btn btn-quiet btn-sm">
          Download CSV
        </a>
      </form>
      {rows.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">Name</th>
                <th scope="col">{type === "rental" ? "Event" : "Subject"}</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatShortDate(r.created_at)}</td>
                  <td>
                    <Link href={`/admin/inquiries/${r.id}`}>{r.name}</Link>
                  </td>
                  <td>{r.subject || r.message.slice(0, 60) || "(no subject)"}</td>
                  <td>
                    <span className={`tag${r.status === "new" ? " tag-new" : ""}`}>{INQUIRY_STATUS_LABELS[r.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="lead">Nothing in this queue.</p>
      )}
    </>
  );
}
