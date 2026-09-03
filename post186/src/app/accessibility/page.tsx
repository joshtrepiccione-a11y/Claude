import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { getSiteContent } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accessibility",
  description: `Accessibility statement for the ${SITE.name} website and how to report a problem.`,
  alternates: { canonical: "/accessibility" },
};

export default async function AccessibilityPage() {
  const c = await getSiteContent();
  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>Accessibility</h1>
        <p className="lead">This website is meant to work for everyone, including members and neighbors who use assistive technology.</p>
      </div>
      <section className="section prose container" style={{ paddingTop: "1rem" }}>
        <h2>Our commitment</h2>
        <p>
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. In practice that means the site is built with clear headings and landmarks, a skip link, visible keyboard focus, labels on every form field, error messages that say what to fix, readable text sizes, strong color contrast, and no motion that plays on its own.
        </p>
        <h2>Known limitations</h2>
        <ul>
          <li>Photos are being added over time. Every published image will carry a written description.</li>
          <li>The month calendar view scrolls sideways on small screens. The upcoming list view offers the same events in a simple list.</li>
        </ul>
        <h2>Report a problem</h2>
        <p>
          If any part of this site is hard to use, please tell us.{" "}
          {c.accessibility_contact ? `Contact ${c.accessibility_contact}, or use the contact form.` : "Use the contact form and mention accessibility in the subject so it reaches the right person quickly."}
        </p>
        <p>
          <Link href="/contact">Report an accessibility problem</Link>
        </p>
        <h2>Visiting the hall</h2>
        <p>
          {c.rental_accessibility
            ? c.rental_accessibility
            : "Details about physical access to the hall at 101 French Street, including entrances, restrooms, and parking, will be posted once confirmed. Contact us with any questions before your visit."}
        </p>
      </section>
    </PublicShell>
  );
}
