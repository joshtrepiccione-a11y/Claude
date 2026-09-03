import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { RichText } from "@/components/RichText";
import { Pending } from "@/components/Pending";
import { RentalForm } from "@/components/forms/RentalForm";
import { getSiteContent } from "@/lib/content";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hall Rentals",
  description: `Rent the American Legion Post 186 hall at ${SITE.fullAddress} for celebrations, meetings, and community events.`,
  alternates: { canonical: "/hall-rentals" },
};

const FACTS: Array<{ key: string; label: string }> = [
  { key: "rental_capacity", label: "Capacity" },
  { key: "rental_accessibility", label: "Accessibility" },
  { key: "rental_parking", label: "Parking" },
  { key: "rental_tables_chairs", label: "Tables and chairs" },
  { key: "rental_kitchen", label: "Kitchen" },
  { key: "rental_bar", label: "Bar" },
  { key: "rental_av", label: "Audio and visual" },
  { key: "rental_deposit", label: "Deposit" },
];

const POLICIES: Array<{ key: string; label: string }> = [
  { key: "rental_rates", label: "Rates" },
  { key: "rental_windows", label: "Available rental windows" },
  { key: "rental_setup", label: "Setup" },
  { key: "rental_cleanup", label: "Cleanup" },
  { key: "rental_alcohol", label: "Alcohol policy" },
  { key: "rental_insurance", label: "Insurance" },
];

export default async function HallRentalsPage() {
  const c = await getSiteContent();
  const facts = FACTS.filter((f) => c[f.key]);
  const policies = POLICIES.filter((f) => c[f.key]);
  const eventTypes = c.rental_event_types.split("\n").map((l) => l.trim()).filter(Boolean);
  const missingAny = facts.length < FACTS.length || policies.length < POLICIES.length;

  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>Rent our hall</h1>
        <p className="lead">A welcoming space on French Street for the moments that bring people together.</p>
      </div>

      <section className="section" aria-labelledby="hall-overview">
        <div className="container">
          <h2 id="hall-overview">The hall</h2>
          <RichText text={c.rental_overview} />
          <ul className="gallery" aria-label="Hall photos" style={{ marginTop: "1.5rem" }}>
            {["Main hall", "Kitchen", "Entrance and parking", "Set for an event"].map((caption) => (
              <li key={caption} className="gallery-slot">
                Photo coming soon: {caption}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="hall-details">
        <div className="container">
          <h2 id="hall-details">Details</h2>
          {facts.length ? (
            <ul className="fact-list">
              {facts.map((f) => (
                <li key={f.key}>
                  <strong>{f.label}</strong>
                  {c[f.key]}
                </li>
              ))}
            </ul>
          ) : null}
          {policies.length ? (
            <div className="prose">
              {policies.map((p) => (
                <div key={p.key}>
                  <h3>{p.label}</h3>
                  <RichText text={c[p.key]} className="" />
                </div>
              ))}
            </div>
          ) : null}
          {missingAny ? (
            <Pending>
              Capacity, amenities, rates, policies, and availability are being finalized by Post leadership. Send an inquiry and we will share current details directly.
            </Pending>
          ) : null}
        </div>
      </section>

      <section className="section" aria-labelledby="event-types">
        <div className="container">
          <h2 id="event-types">What people host here</h2>
          {eventTypes.length ? (
            <ul className="prose">
              {eventTypes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="prose">
              Families and groups often ask about birthdays, showers, reunions, community meetings, memorial gatherings, and nonprofit events. Which uses are permitted, and on what terms, is decided by the Post. Tell us about your event and we will let you know.
            </p>
          )}
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="rental-inquiry">
        <div className="container">
          <h2 id="rental-inquiry">Ask about renting the hall</h2>
          <div className="notice notice-warn">
            <p>
              <strong>Sending this form does not reserve the hall, confirm availability, or create a rental agreement.</strong> A member will contact you to discuss dates, details, and the rental agreement.
            </p>
          </div>
          <RentalForm responseTime={c.response_time} />
        </div>
      </section>
    </PublicShell>
  );
}
