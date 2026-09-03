import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { getSiteContent } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${SITE.name} handles information sent through this website.`,
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const c = await getSiteContent();
  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>Privacy</h1>
        <p className="lead">Plain answers about what this site collects and why.</p>
      </div>
      <section className="section prose container" style={{ paddingTop: "1rem" }}>
        <h2>What we collect</h2>
        <p>
          The only personal information this site collects is what you type into our forms: your name, email address, phone number if you choose to share it, your preferred contact method, and the details of your message or request. Membership inquiries may include the general nature of your military connection if you choose to share it. Hall rental inquiries include event details such as dates, guest counts, and setup needs.
        </p>
        <p>
          Please do not send Social Security numbers, discharge papers, VA records, medical information, or other sensitive documents through this website. If a form message appears to contain a Social Security number, the site will ask you to remove it before sending.
        </p>
        <h2>Why we collect it</h2>
        <p>We use your contact details for one purpose: to respond to the inquiry you sent. We do not sell, rent, or share your information with advertisers.</p>
        <h2>Who sees it</h2>
        <p>
          Form submissions are stored in a private administrative area of this website and are visible only to Post 186 volunteers who handle membership, hall rentals, and general questions. {c.privacy_retention ? `Inquiries are kept ${c.privacy_retention}.` : "Retention periods are being finalized by Post leadership."}
        </p>
        <h2>Cookies and tracking</h2>
        <p>The public site does not use advertising or analytics cookies. A single session cookie is used only when a Post volunteer signs in to the administrative area.</p>
        <h2>Correcting or deleting your information</h2>
        <p>
          You may ask us to correct or delete an inquiry you sent at any time.{" "}
          {c.privacy_contact ? `Contact ${c.privacy_contact}.` : "Use the contact form and we will route your request to the right person."}
        </p>
        <p>
          <Link href="/contact">Contact the Post</Link>
        </p>
      </section>
    </PublicShell>
  );
}
