import "server-only";
import type { InquiryType } from "./inquiries";

/**
 * Optional email notification. No provider is bundled; when SMTP variables are set this
 * logs a reminder that a transport still needs wiring (see README, "Email notifications").
 * Inquiries are always stored in the admin queue regardless of email.
 */
export async function notifyNewInquiry(type: InquiryType, id: number, name: string): Promise<void> {
  const to = process.env.NOTIFY_EMAIL_TO?.trim();
  if (!to) return;
  const label = type === "membership" ? "Membership" : type === "rental" ? "Hall rental" : "General";
  // Keep logs free of contact details; the admin queue holds the full record.
  console.info(`[notify] New ${label} inquiry #${id} from ${name.split(" ")[0]} (email transport not configured; see README).`);
}
