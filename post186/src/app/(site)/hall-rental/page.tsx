import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_CACHE } from "@/lib/cache";
import { Check, Clock, Phone, Users } from "@/components/icons";
import { BookingWidget } from "@/components/site/BookingWidget";
import { PageHeader, SectionHeading } from "@/components/site/PageHeader";
import { getHallAvailability, getSettings } from "@/lib/data";
import { formatTime } from "@/lib/dates";
import { altFromPath, media } from "@/lib/media";
import { telHref } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Hall Rental",
  description:
    "Rent the newly renovated hall at American Legion Post 186 in Hammonton, NJ for birthdays, showers, receptions and community events. Check open dates and send a request online.",
  alternates: { canonical: "/hall-rental" },
};

const STEPS = [
  { title: "Pick a date", text: "Check the calendar for an open day that works for you." },
  { title: "Send a request", text: "Tell us about your event. It takes about two minutes." },
  { title: "We confirm", text: "An officer reviews the request and contacts you about pricing." },
  { title: "Sign & reserve", text: "A signed agreement and deposit hold your date." },
];

async function HallContent() {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("settings", "bookings", "events");
  const [settings, availability] = await Promise.all([getSettings(), getHallAvailability()]);
  const { hall } = settings;
  const phoneHref = telHref(settings.phone);

  return (
    <>
      {/* Overview */}
      <section aria-labelledby="overview-heading" className="bg-white py-12 md:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <div>
            <SectionHeading id="overview-heading" title="A Welcoming Space for Your Occasion" lead={hall.intro} />
            <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {hall.amenities.map((amenity) => (
                <li key={amenity} className="flex items-start gap-3 font-semibold text-ink">
                  <Check size={22} className="mt-0.5 flex-none text-ok" />
                  {amenity}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#request" className="btn btn-red btn-lg">
                Check Dates &amp; Request
              </a>
              {settings.phone && (
                <a href={phoneHref} className="btn btn-outline btn-lg">
                  <Phone size={20} /> {settings.phone}
                </a>
              )}
            </div>
          </div>

          <dl className="card divide-y divide-line-soft">
            <div className="flex items-center gap-4 p-5">
              <Users size={30} className="flex-none text-azure" />
              <div>
                <dt className="text-sm font-semibold uppercase tracking-wide">Capacity</dt>
                <dd className="font-display text-2xl font-bold text-navy">Up to {hall.capacity} guests</dd>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5">
              <Clock size={30} className="flex-none text-azure" />
              <div>
                <dt className="text-sm font-semibold uppercase tracking-wide">Rental hours</dt>
                <dd className="font-display text-2xl font-bold text-navy">
                  {formatTime(hall.openTime)} – {formatTime(hall.closeTime)}
                </dd>
              </div>
            </div>
            <div className="p-5">
              <dt className="text-sm font-semibold uppercase tracking-wide">Where</dt>
              <dd className="mt-1 font-semibold text-ink">
                {settings.street}, {settings.city}, {settings.state} {settings.zip}
              </dd>
            </div>
          </dl>
        </div>

        {media.hall.length > 0 && (
          <div className="container-page mt-12">
            <h3 className="sr-only">Photos of the hall</h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {media.hall.map((src) => (
                <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-md bg-fog">
                  <Image
                    src={src}
                    alt={altFromPath(src)}
                    fill
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* How it works */}
      <section aria-labelledby="steps-heading" className="border-y border-line bg-cloud py-12 md:py-14">
        <div className="container-page">
          <h2 id="steps-heading" className="text-2xl md:text-3xl">
            How renting works
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="caps flex size-11 flex-none items-center justify-center rounded-full bg-flag text-xl text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg">{step.title}</h3>
                  <p className="mt-0.5 text-[0.9375rem]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Request */}
      <section id="request" aria-labelledby="request-heading" className="scroll-mt-24 bg-white py-12 md:py-16">
        <div className="container-page">
          <SectionHeading
            id="request-heading"
            title="Check a Date & Send a Request"
            lead={
              <>
                Choose an open date, then tell us about your event. {hall.responseTime} Already sent one?{" "}
                <Link href="/hall-rental/status" className="link">
                  Check your request status
                </Link>
                .
              </>
            }
          />
          <div className="mt-10">
            <BookingWidget
              availability={availability}
              hall={{
                capacity: hall.capacity,
                openTime: hall.openTime,
                closeTime: hall.closeTime,
                minNoticeDays: hall.minNoticeDays,
                responseTime: hall.responseTime,
              }}
              phone={settings.phone}
              phoneHref={phoneHref}
            />
          </div>
        </div>
      </section>

      {/* Rates and policies */}
      <section aria-labelledby="rates-heading" className="border-t border-line bg-cloud py-12 md:py-16">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <h2 id="rates-heading" className="text-2xl md:text-3xl">
              Rates
            </h2>
            {hall.rates.length ? (
              <div className="card scroll-x mt-5">
                <table className="table">
                  <caption className="sr-only">Hall rental rates</caption>
                  <thead>
                    <tr>
                      <th scope="col">Rental</th>
                      <th scope="col" className="text-right">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hall.rates.map((rate) => (
                      <tr key={rate.label}>
                        <th scope="row" className="!whitespace-normal !border-b !border-line-soft !p-3 !font-sans !text-base !normal-case !tracking-normal">
                          <span className="font-bold text-ink">{rate.label}</span>
                          {rate.note && <span className="block text-[0.9375rem] font-normal text-body">{rate.note}</span>}
                        </th>
                        <td className="whitespace-nowrap text-right font-display text-xl font-bold text-navy">
                          {rate.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4">
                Rates depend on the day, the length of your event and what you need. Send a request or call us and
                an officer will give you a quote — there is no obligation.
              </p>
            )}
            {hall.ratesNote && <p className="mt-4 text-[0.9375rem]">{hall.ratesNote}</p>}
            <p className="mt-6 rounded-md border-l-4 border-azure bg-white px-4 py-3">
              <strong className="text-ink">Your rental gives back.</strong> Proceeds from hall rentals support
              Post {settings.postNumber} programs for veterans, their families and local youth.
            </p>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl">Rental policies</h2>
            <ul className="mt-5 space-y-3">
              {hall.policies.map((policy) => (
                <li key={policy} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-2.5 size-2 flex-none rounded-full bg-flag" />
                  {policy}
                </li>
              ))}
            </ul>
            <p className="mt-6">
              Questions before you request?{" "}
              <Link href="/officers#contact" className="link">
                Contact the post
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default function HallRentalPage() {
  return (
    <>
      <PageHeader
        title="Hall Rental"
        lead="Celebrate at Post 186. Our renovated hall is available for private parties, family milestones and community events."
      />
      <HallContent />
    </>
  );
}
