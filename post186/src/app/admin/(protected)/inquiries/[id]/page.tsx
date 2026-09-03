import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getInquiry, parseDetails } from "@/lib/inquiries";
import { INQUIRY_STATUSES, INQUIRY_STATUS_LABELS, ALCOHOL_LABELS, CONTACT_METHOD_LABELS, MEMBERSHIP_INTEREST_LABELS, SERVICE_CONNECTION_LABELS } from "@/lib/validation";
import { formatDateTime } from "@/lib/time";
import { Flash } from "@/components/admin/Flash";
import { deleteInquiryAction, updateInquiryAction } from "@/app/admin/actions";

const DETAIL_LABELS: Record<string, string> = {
  service_connection: "Service connection",
  service_area: "Area of service",
  interest: "Interest",
  preferred_date: "First-choice date",
  start_time: "Start time",
  end_time: "End time",
  alternate_date: "Alternate date",
  guest_count: "Estimated guests",
  accessibility_needs: "Accessibility or setup needs",
  alcohol: "Alcohol service",
  notes: "Additional notes",
};

function prettify(key: string, value: string): string {
  const maps: Record<string, Record<string, string>> = {
    service_connection: SERVICE_CONNECTION_LABELS,
    interest: MEMBERSHIP_INTEREST_LABELS,
    alcohol: ALCOHOL_LABELS,
  };
  return maps[key]?.[value] ?? value;
}

export default async function InquiryDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const inquiry = await getInquiry(Number(id));
  if (!inquiry) notFound();
  const details = parseDetails(inquiry);
  const typeLabel = inquiry.type === "membership" ? "Membership inquiry" : inquiry.type === "rental" ? "Hall rental inquiry" : "General message";

  return (
    <>
      <p className="breadcrumb">
        <Link href={`/admin/inquiries?type=${inquiry.type}`}>Inquiries</Link> &rsaquo; {typeLabel}
      </p>
      <h1>{inquiry.name}</h1>
      <p className="meta">
        {typeLabel} &middot; received {formatDateTime(inquiry.created_at)}
      </p>
      <Flash saved={sp.saved} />
      <dl className="detail-facts">
        <dt>Email</dt>
        <dd>
          <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
        </dd>
        {inquiry.phone ? (
          <>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${inquiry.phone.replace(/[^0-9+]/g, "")}`}>{inquiry.phone}</a>
            </dd>
          </>
        ) : null}
        <dt>Prefers</dt>
        <dd>{CONTACT_METHOD_LABELS[inquiry.contact_method as keyof typeof CONTACT_METHOD_LABELS] ?? inquiry.contact_method}</dd>
        {inquiry.organization ? (
          <>
            <dt>Organization</dt>
            <dd>{inquiry.organization}</dd>
          </>
        ) : null}
        {inquiry.subject ? (
          <>
            <dt>{inquiry.type === "rental" ? "Event type" : "Subject"}</dt>
            <dd>{inquiry.subject}</dd>
          </>
        ) : null}
        {Object.entries(details)
          .filter(([, v]) => v !== "")
          .map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{DETAIL_LABELS[k] ?? k}</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{prettify(k, v)}</dd>
            </div>
          ))}
      </dl>
      {inquiry.message ? (
        <>
          <h2 style={{ fontSize: "var(--step-1)" }}>{inquiry.type === "rental" ? "Event description" : "Message"}</h2>
          <p className="prose" style={{ whiteSpace: "pre-wrap" }}>
            {inquiry.message}
          </p>
        </>
      ) : null}

      <form action={updateInquiryAction} className="form" style={{ marginTop: "1.5rem" }}>
        <input type="hidden" name="id" value={inquiry.id} />
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={inquiry.status}>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="admin_notes">Internal notes</label>
          <p className="hint" id="notes-hint">
            For volunteers only. Never shown to the person who wrote in.
          </p>
          <textarea id="admin_notes" name="admin_notes" rows={4} defaultValue={inquiry.admin_notes} aria-describedby="notes-hint" />
        </div>
        <button type="submit" className="btn btn-secondary btn-sm">
          Save status and notes
        </button>
      </form>
      <form action={deleteInquiryAction} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={inquiry.id} />
        <input type="hidden" name="type" value={inquiry.type} />
        <button type="submit" className="btn btn-danger btn-sm">
          Delete this inquiry permanently
        </button>
      </form>
    </>
  );
}
