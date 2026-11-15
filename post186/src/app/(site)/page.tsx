import Link from "next/link";
import Image from "next/image";
import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_CACHE } from "@/lib/cache";
import { ArrowRight, Building, Calendar, MapPin, Users } from "@/components/icons";
import { DateBadge, EventRow } from "@/components/site/EventBits";
import { HeroArt, StarRow } from "@/components/site/FlagArt";
import { SectionHeading } from "@/components/site/PageHeader";
import { getSettings, getUpcomingOccurrences } from "@/lib/data";
import { formatDateLong, formatTimeRange } from "@/lib/dates";
import { media } from "@/lib/media";
import { addressLine, directionsUrl, fullPostName } from "@/lib/settings";
import { siteUrl } from "@/lib/site";

const QUICK_LINKS = [
  {
    href: "/events",
    title: "Events",
    text: "Meetings, ceremonies and community gatherings at the post.",
    icon: Calendar,
  },
  {
    href: "/hall-rental",
    title: "Hall Rental",
    text: "Check open dates and request the hall for your celebration.",
    icon: Building,
  },
  {
    href: "/officers",
    title: "Officers & Contact",
    text: "The volunteers who lead Post 186, and how to reach them.",
    icon: Users,
  },
];

async function Hero() {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("settings", "events");
  const [settings, next] = await Promise.all([getSettings(), getUpcomingOccurrences(3)]);

  return (
    <section className="flag-backdrop relative overflow-hidden text-white">
      {media.hero ? (
        <div className="absolute inset-y-0 right-0 hidden w-1/2 lg:block">
          <Image src={media.hero} alt="" fill priority sizes="50vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/40 to-transparent" />
        </div>
      ) : (
        <HeroArt className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[58%] md:block" />
      )}

      <div className="container-page relative grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:py-24">
        <div>
          <p className="eyebrow !text-white/85">
            {settings.city}, {settings.stateName}
          </p>
          <h1 className="mt-3 text-white">Veterans Strengthening {settings.city}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/95 md:text-xl">
            {fullPostName(settings)} is home to {settings.city}-area veterans — a place for service,
            fellowship and community.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/events" className="btn btn-red btn-lg">
              See What&apos;s Happening
            </Link>
            <Link href="/hall-rental" className="btn btn-ghost btn-lg">
              Rent Our Hall
            </Link>
          </div>
          <p className="mt-8 flex items-start gap-2 text-white/90">
            <MapPin size={20} className="mt-1 flex-none" />
            <a
              href={directionsUrl(settings)}
              rel="noopener"
              className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
            >
              {addressLine(settings)}
            </a>
          </p>
        </div>

        <aside
          aria-labelledby="next-heading"
          className="rounded-lg bg-white p-5 text-body shadow-2xl sm:p-6 lg:ml-auto lg:w-full lg:max-w-md"
        >
          <div className="flex items-center justify-between gap-3 border-b-2 border-navy pb-3">
            <h2 id="next-heading" className="text-2xl">
              Next at the Post
            </h2>
            <Link href="/events" className="link-arrow text-[0.9375rem]">
              Full calendar <ArrowRight size={16} />
            </Link>
          </div>
          {next.length ? (
            <ul className="divide-y divide-line-soft">
              {next.map(({ date, event }) => (
                <li key={`${event.id}-${date}`} className="flex items-center gap-4 py-3.5">
                  <DateBadge date={date} />
                  <div className="min-w-0">
                    <Link
                      href={`/events/${event.slug}`}
                      className="font-display text-lg font-bold leading-snug text-navy hover:text-azure hover:underline"
                    >
                      {event.title}
                    </Link>
                    <p className="text-[0.9375rem]">
                      <span className="sr-only">{formatDateLong(date)}, </span>
                      {formatTimeRange(event.startTime, event.endTime)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-5">New events are posted here as they are scheduled. {settings.meetingSchedule}</p>
          )}
        </aside>
      </div>
      <div aria-hidden="true" className="stripe-rule" />
    </section>
  );
}

async function UpcomingEvents() {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("events", "settings");
  const [events, settings] = await Promise.all([getUpcomingOccurrences(4), getSettings()]);

  return (
    <section aria-labelledby="events-heading" className="bg-white py-14 md:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-navy pb-4">
          <SectionHeading id="events-heading" title="What's Happening" />
          <Link href="/events" className="link-arrow mb-1">
            View all events <ArrowRight size={18} />
          </Link>
        </div>
        {events.length ? (
          <ul className="divide-y divide-line-soft">
            {events.map((occurrence) => (
              <EventRow key={`${occurrence.event.id}-${occurrence.date}`} occurrence={occurrence} />
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-md bg-cloud p-6">
            <p className="font-semibold text-ink">No upcoming events are posted right now.</p>
            <p className="mt-1">{settings.meetingSchedule}</p>
          </div>
        )}
      </div>
    </section>
  );
}

async function HomeBody() {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("settings");
  const settings = await getSettings();
  const { hall } = settings;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: fullPostName(settings),
    alternateName: `American Legion Post ${settings.postNumber}`,
    url: siteUrl(),
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.street,
      addressLocality: settings.city,
      addressRegion: settings.state,
      postalCode: settings.zip,
      addressCountry: "US",
    },
    parentOrganization: { "@type": "NGO", name: "The American Legion", url: "https://www.legion.org/" },
    sameAs: settings.facebookUrl ? [settings.facebookUrl] : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Welcome + the three things this site is for */}
      <section aria-labelledby="welcome-heading" className="bg-cloud py-14 md:py-20">
        <div className="container-page">
          <SectionHeading
            id="welcome-heading"
            align="center"
            title={`Welcome to Post ${settings.postNumber}`}
            lead={
              <>
                We are {settings.city}&apos;s American Legion post: local veterans, their families and neighbors
                looking out for one another. See what is coming up, rent our hall for your next gathering, or get
                in touch with an officer.
              </>
            }
          />
          <ul className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {QUICK_LINKS.map(({ href, title, text, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-md border border-azure bg-white p-6 transition-colors hover:bg-azure"
                >
                  <Icon size={32} className="text-flag group-hover:text-white" />
                  <span className="mt-4 font-display text-2xl font-bold text-azure group-hover:text-white">
                    {title}
                  </span>
                  <span className="mt-1.5 group-hover:text-white">{text}</span>
                  <span className="link-arrow mt-4 group-hover:text-white" aria-hidden="true">
                    Go <ArrowRight size={17} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <UpcomingEvents />

      {/* Hall rental */}
      <section aria-labelledby="hall-heading" className="flag-backdrop relative overflow-hidden text-white">
        <div className="container-page grid gap-10 py-14 md:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <StarRow className="mb-5 text-white/80" />
            <SectionHeading
              id="hall-heading"
              tone="dark"
              eyebrow="Hall rental"
              title="Host Your Event at the Post"
              lead={hall.intro}
            />
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/hall-rental#request" className="btn btn-red btn-lg">
                Check Dates &amp; Request
              </Link>
              <Link href="/hall-rental" className="btn btn-ghost btn-lg">
                Hall Details
              </Link>
            </div>
          </div>
          {media.hall.length ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border-4 border-white/90 shadow-2xl">
              <Image
                src={media.hall[0]}
                alt={`${hall.name} at Post ${settings.postNumber}`}
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {hall.amenities.slice(0, 6).map((amenity) => (
                <li
                  key={amenity}
                  className="flex items-center gap-3 rounded-md border border-white/25 bg-white/10 px-4 py-3.5 font-semibold"
                >
                  <span aria-hidden="true" className="size-2 flex-none rounded-full bg-flag" />
                  {amenity}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Our name */}
      <section aria-labelledby="calletta-heading" className="bg-cloud py-14 md:py-20">
        <div className="container-page">
          <div className="rounded-lg bg-azure px-6 py-10 text-white shadow-lg sm:px-10 md:py-12">
            <div className="max-w-3xl">
              <p className="eyebrow !text-white/85">Our name</p>
              <h2 id="calletta-heading" className="mt-2 text-white">
                In Honor of Commander Frank M. Calletta
              </h2>
              <div className="prose-post mt-4 text-lg text-white/95">
                <p>
                  Our post carries the name of Frank M. Calletta, who was serving as our Commander when he passed
                  away in October 2025. Frank led the renovation of our hall, helped our membership grow and
                  brought back traditions like the color guard.
                </p>
                <p>
                  By a unanimous vote of the members, the post was renamed in his memory and dedicated on June 7,
                  2026, during our first Family Day. His name is on our building; his example is in the work we do.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visit + get involved */}
      <section aria-labelledby="visit-heading" className="bg-white py-14 md:py-20">
        <div className="container-page grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <SectionHeading
              id="visit-heading"
              title="Come By. Get Involved."
              lead={
                <>
                  Veterans, family members and neighbors who want to lend a hand are all welcome at Post{" "}
                  {settings.postNumber}. The best way to start is to say hello — send a note to an officer or stop
                  in at a meeting.
                </>
              }
            />
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/officers#contact" className="btn btn-red btn-lg">
                Contact an Officer
              </Link>
              <Link href="/events" className="btn btn-outline btn-lg">
                Events Calendar
              </Link>
            </div>
            <p className="mt-5 text-[0.9375rem]">
              Looking for membership eligibility, benefits or national issues? You will find links to The American
              Legion&apos;s national resources at the bottom of every page.
            </p>
          </div>
          <div className="card p-6 sm:p-8">
            <h3>Meetings</h3>
            <p className="mt-2">{settings.meetingSchedule}</p>
            {settings.hours && (
              <>
                <h3 className="mt-6">Hours</h3>
                <p className="mt-2">{settings.hours}</p>
              </>
            )}
            <h3 className="mt-6">Find us</h3>
            <p className="mt-2">{addressLine(settings)}</p>
            <a href={directionsUrl(settings)} rel="noopener" className="link-arrow mt-3">
              Get directions <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <HomeBody />
    </>
  );
}
