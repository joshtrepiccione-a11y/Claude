import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { ContactForm } from "@/components/forms/ContactForm";
import { getSiteContent } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${SITE.name} at ${SITE.fullAddress}. Directions, hours, and a message form.`,
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const c = await getSiteContent();
  const socials = [
    { label: "Facebook", href: c.social_facebook },
    { label: "Instagram", href: c.social_instagram },
    { label: "Other", href: c.social_other },
  ].filter((s) => s.href);

  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>Contact Post 186</h1>
        <p className="lead">We are glad to hear from veterans, families, neighbors, and community groups.</p>
      </div>
      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container contact-grid">
          <div>
            <h2>Visit or call</h2>
            <ul className="contact-list">
              <li>
                <strong>Post</strong>
                {SITE.name}
              </li>
              <li>
                <strong>Address</strong>
                {SITE.streetAddress}
                <br />
                {SITE.city}, {SITE.region} {SITE.postalCode}
                <br />
                <a href={SITE.mapsUrl} rel="noopener">
                  Map and directions
                </a>
              </li>
              {c.contact_phone ? (
                <li>
                  <strong>Phone</strong>
                  <a href={`tel:${c.contact_phone.replace(/[^0-9+]/g, "")}`}>{c.contact_phone}</a>
                </li>
              ) : null}
              {c.contact_email ? (
                <li>
                  <strong>Email</strong>
                  <a href={`mailto:${c.contact_email}`}>{c.contact_email}</a>
                </li>
              ) : null}
              {c.office_hours ? (
                <li>
                  <strong>Hours</strong>
                  {c.office_hours.split("\n").map((line) => (
                    <span key={line} style={{ display: "block" }}>
                      {line}
                    </span>
                  ))}
                </li>
              ) : null}
              {socials.length ? (
                <li>
                  <strong>Follow the Post</strong>
                  {socials.map((s, i) => (
                    <span key={s.label}>
                      {i > 0 ? " · " : ""}
                      <a href={s.href} rel="noopener">
                        {s.label}
                      </a>
                    </span>
                  ))}
                </li>
              ) : null}
              {!c.contact_phone && !c.contact_email ? (
                <li>
                  <strong>Phone and email</strong>
                  Our phone and email listings are being confirmed. The form on this page is the quickest way to reach us in the meantime.
                </li>
              ) : null}
            </ul>
            <h2 style={{ marginTop: "2rem" }}>Looking for something specific?</h2>
            <ul className="prose">
              <li>
                <Link href="/membership">Membership inquiry</Link>: joining, transferring, or learning more
              </li>
              <li>
                <Link href="/hall-rentals">Hall rental inquiry</Link>: dates, details, and the rental agreement
              </li>
            </ul>
          </div>
          <div>
            <h2>Send a general message</h2>
            <ContactForm responseTime={c.response_time} />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
