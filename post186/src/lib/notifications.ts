import "server-only";

import { formatDateLong, formatTimeRange } from "./dates";
import { sendEmail } from "./email";
import { addressLine, fullPostName, type SiteSettings } from "./settings";
import { siteUrl } from "./site";
import type { Booking, Officer } from "./types";

function bookingSummary(b: Booking): string {
  return [
    `Reference: ${b.reference}`,
    `Date: ${formatDateLong(b.eventDate)}`,
    `Time: ${formatTimeRange(b.startTime, b.endTime)}`,
    `Event: ${b.eventType}`,
    `Guests: ${b.guestCount}`,
  ].join("\n");
}

function signature(s: SiteSettings): string {
  return [fullPostName(s), addressLine(s), s.phone].filter(Boolean).join("\n");
}

export async function notifyBookingReceived(b: Booking, s: SiteSettings): Promise<void> {
  const tasks: Promise<boolean>[] = [];

  if (s.notifyEmail) {
    tasks.push(
      sendEmail({
        to: s.notifyEmail,
        replyTo: b.contactEmail,
        subject: `New hall request: ${formatDateLong(b.eventDate)} (${b.reference})`,
        text: [
          "A new hall rental request came in through the website.",
          "",
          bookingSummary(b),
          "",
          `Name: ${b.contactName}`,
          `Email: ${b.contactEmail}`,
          `Phone: ${b.contactPhone}`,
          b.organization ? `Organization: ${b.organization}` : "",
          `Legion Family member: ${b.isMember ? "Yes" : "No"}`,
          `Alcohol will be served: ${b.alcohol ? "Yes" : "No"}`,
          `Kitchen requested: ${b.kitchen ? "Yes" : "No"}`,
          b.notes ? `\nNotes:\n${b.notes}` : "",
          "",
          `Review and respond: ${siteUrl()}/admin/bookings/${b.id}`,
        ]
          .filter((line) => line !== "")
          .join("\n"),
      }),
    );
  }

  tasks.push(
    sendEmail({
      to: b.contactEmail,
      replyTo: s.email || s.notifyEmail || undefined,
      subject: `We received your hall request (${b.reference})`,
      text: [
        `Hello ${b.contactName},`,
        "",
        `Thank you for your interest in renting the hall at ${fullPostName(s)}. We received your request:`,
        "",
        bookingSummary(b),
        "",
        "Your date is not reserved yet. A post officer will review the request and contact you to confirm availability, pricing and the rental agreement.",
        s.hall.responseTime,
        "",
        `Check the status of your request any time: ${siteUrl()}/hall-rental/status`,
        "",
        signature(s),
      ].join("\n"),
    }),
  );

  await Promise.all(tasks);
}

export async function notifyBookingDecision(b: Booking, s: SiteSettings): Promise<void> {
  if (!b.contactEmail) return;
  const replyTo = s.email || s.notifyEmail || undefined;

  if (b.status === "approved") {
    await sendEmail({
      to: b.contactEmail,
      replyTo,
      subject: `Your hall request is approved (${b.reference})`,
      text: [
        `Hello ${b.contactName},`,
        "",
        `Good news — your request to rent the hall at ${fullPostName(s)} has been approved.`,
        "",
        bookingSummary(b),
        b.quotedAmount ? `Quoted rental: ${b.quotedAmount}` : "",
        "",
        "A post officer will be in touch about the rental agreement and deposit, which hold the date.",
        "",
        signature(s),
      ]
        .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
        .join("\n"),
    });
  } else if (b.status === "declined") {
    await sendEmail({
      to: b.contactEmail,
      replyTo,
      subject: `About your hall request (${b.reference})`,
      text: [
        `Hello ${b.contactName},`,
        "",
        `Thank you for thinking of ${fullPostName(s)}. Unfortunately we are not able to host your event as requested.`,
        b.declineReason ? `\n${b.declineReason}` : "",
        "",
        bookingSummary(b),
        "",
        `If another date could work, you are welcome to send a new request at ${siteUrl()}/hall-rental or call us${
          s.phone ? ` at ${s.phone}` : ""
        }.`,
        "",
        signature(s),
      ].join("\n"),
    });
  }
}

export async function notifyContactMessage(
  message: { name: string; email: string; phone: string; topic: string; body: string },
  officer: Officer | null,
  s: SiteSettings,
): Promise<void> {
  const recipients = new Set<string>();
  if (s.notifyEmail) recipients.add(s.notifyEmail);
  if (officer?.email) recipients.add(officer.email);
  if (!recipients.size) return;

  await sendEmail({
    to: [...recipients],
    replyTo: message.email,
    subject: `Website message: ${message.topic}${officer ? ` (for ${officer.name})` : ""}`,
    text: [
      `From: ${message.name} <${message.email}>`,
      message.phone ? `Phone: ${message.phone}` : "",
      `Topic: ${message.topic}`,
      officer ? `Sent to: ${officer.title} ${officer.name}` : "Sent to: Post 186 (general)",
      "",
      message.body,
      "",
      "Reply to this email to answer the sender directly.",
      `All messages: ${siteUrl()}/admin/messages`,
    ]
      .filter((line, i) => line !== "" || i > 2)
      .join("\n"),
  });
}
