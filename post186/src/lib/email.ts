import "server-only";

/**
 * Email notifications are optional. When RESEND_API_KEY and EMAIL_FROM are set
 * the site sends mail through Resend (https://resend.com — free for the volume
 * a post needs). Without them nothing is sent and every request and message
 * still lands in the admin area.
 */

type Email = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
};

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Never throws: a mail problem must not stop a booking or message from being saved. */
export async function sendEmail(email: Email): Promise<boolean> {
  const recipients = (Array.isArray(email.to) ? email.to : [email.to]).filter(Boolean);
  if (!recipients.length) return false;

  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email not configured] To: ${recipients.join(", ")} — ${email.subject}`);
    }
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: recipients,
        subject: email.subject,
        text: email.text,
        reply_to: email.replyTo,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`Email failed (${response.status}): ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email failed:", error);
    return false;
  }
}
