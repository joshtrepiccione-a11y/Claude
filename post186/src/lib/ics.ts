export type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  startIso: string;
  endIso: string;
  allDay: boolean;
  status: "scheduled" | "postponed" | "cancelled";
  updatedIso?: string;
};

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function dateOnly(iso: string, shiftDays = 0): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + shiftDays);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Fold lines longer than 75 octets per RFC 5545. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const next = current + ch;
    const limit = out.length === 0 ? 75 : 74;
    if (Buffer.byteLength(next, "utf8") > limit) {
      out.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(event: IcsEvent, opts: { productId?: string; localDate?: (iso: string, shift?: number) => string } = {}): string {
  const status = event.status === "cancelled" ? "CANCELLED" : event.status === "postponed" ? "TENTATIVE" : "CONFIRMED";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${opts.productId ?? "-//American Legion Post 186//Events//EN"}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.updatedIso ?? new Date().toISOString())}`,
  ];
  if (event.allDay) {
    const toDate = opts.localDate ?? dateOnly;
    lines.push(`DTSTART;VALUE=DATE:${toDate(event.startIso)}`);
    lines.push(`DTEND;VALUE=DATE:${toDate(event.endIso, 1)}`);
  } else {
    lines.push(`DTSTART:${utcStamp(event.startIso)}`);
    lines.push(`DTEND:${utcStamp(event.endIso)}`);
  }
  lines.push(`SUMMARY:${icsEscape(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push(`STATUS:${status}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(event: IcsEvent): string {
  const dates = event.allDay
    ? `${dateOnly(event.startIso)}/${dateOnly(event.endIso, 1)}`
    : `${utcStamp(event.startIso)}/${utcStamp(event.endIso)}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
