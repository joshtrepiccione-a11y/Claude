import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { EventCard } from "@/components/EventCard";
import { PostCard } from "@/components/PostCard";
import { RichText } from "@/components/RichText";
import { getSiteContent } from "@/lib/content";
import { listUpcomingEvents } from "@/lib/events";
import { listPublishedPosts } from "@/lib/posts";
import { listCategories } from "@/lib/categories";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${SITE.name} | Hammonton, NJ`,
  description: "Veterans serving Hammonton. Ask about membership, rent our hall on French Street, and see upcoming Post and community events.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const content = await getSiteContent();
  const events = await listUpcomingEvents({ limit: 3 });
  const posts = await listPublishedPosts({ limit: 3 });
  const eventCats = new Map((await listCategories("event")).map((c) => [c.slug, c.name]));
  const postCats = new Map((await listCategories("post")).map((c) => [c.slug, c.name]));

  return (
    <PublicShell>
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <h1>{SITE.name}</h1>
            <p className="hero-address">
              {SITE.fullAddress} &middot;{" "}
              <a href={SITE.mapsUrl} rel="noopener">
                Directions
              </a>
            </p>
            <div className="hero-actions">
              <Link href="/membership" className="btn btn-primary">
                Ask About Membership
              </Link>
              <Link href="/hall-rentals" className="btn btn-secondary">
                Rent Our Hall
              </Link>
              <Link href="/events" className="btn btn-outline">
                View Upcoming Events
              </Link>
            </div>
            <RichText text={content.mission_summary} />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="home-events">
        <div className="container">
          <div className="section-header">
            <h2 id="home-events">Coming up</h2>
            <Link href="/events">See the full calendar</Link>
          </div>
          {events.length ? (
            <div className="grid grid-3">
              {events.map((e) => (
                <EventCard key={e.id} event={e} categoryLabel={eventCats.get(e.category)} />
              ))}
            </div>
          ) : (
            <p className="lead">No public events are scheduled right now. Check back soon, or ask us what is coming up.</p>
          )}
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="home-rental">
        <div className="container">
          <div className="grid grid-2">
            <div>
              <h2 id="home-rental">Rent the hall</h2>
              <RichText text={content.rental_overview} />
              <div className="detail-actions">
                <Link href="/hall-rentals" className="btn btn-secondary">
                  Hall details and inquiry form
                </Link>
              </div>
            </div>
            <div>
              <h2>Join or reconnect</h2>
              <p className="prose">
                Veterans, active service members, and Legion Family members are welcome. Not sure whether you are eligible? Ask us. There is no obligation, and we will point you to the official eligibility rules.
              </p>
              <div className="detail-actions">
                <Link href="/membership" className="btn btn-outline">
                  Membership information
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="home-news">
        <div className="container">
          <div className="section-header">
            <h2 id="home-news">News from the Post</h2>
            <Link href="/news">All news</Link>
          </div>
          {posts.length ? (
            <div className="grid grid-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} categoryLabel={postCats.get(p.category)} />
              ))}
            </div>
          ) : (
            <p className="lead">News and updates will be posted here.</p>
          )}
        </div>
      </section>

      <section className="section section-gray" aria-labelledby="home-contact">
        <div className="container">
          <div className="contact-grid">
            <div>
              <h2 id="home-contact">Find us</h2>
              <ul className="contact-list">
                <li>
                  <strong>Address</strong>
                  {SITE.fullAddress}
                  <br />
                  <a href={SITE.mapsUrl} rel="noopener">
                    Open in maps
                  </a>
                </li>
                {content.contact_phone ? (
                  <li>
                    <strong>Phone</strong>
                    <a href={`tel:${content.contact_phone.replace(/[^0-9+]/g, "")}`}>{content.contact_phone}</a>
                  </li>
                ) : null}
                {content.contact_email ? (
                  <li>
                    <strong>Email</strong>
                    <a href={`mailto:${content.contact_email}`}>{content.contact_email}</a>
                  </li>
                ) : null}
                {content.office_hours ? (
                  <li>
                    <strong>Hours</strong>
                    {content.office_hours.split("\n").map((line) => (
                      <span key={line} style={{ display: "block" }}>
                        {line}
                      </span>
                    ))}
                  </li>
                ) : null}
              </ul>
            </div>
            <div>
              <h2>Send a message</h2>
              <p className="prose">
                Questions about the Post, an event, or how to get involved? Use the contact form and we will get back to you.
              </p>
              <div className="detail-actions">
                <Link href="/contact" className="btn btn-outline">
                  Contact the Post
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
