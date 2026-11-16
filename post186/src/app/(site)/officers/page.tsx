import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_CACHE } from "@/lib/cache";
import { Facebook, Mail, MapPin, Phone } from "@/components/icons";
import { ContactForm, ContactFormView } from "@/components/site/ContactForm";
import { PageHeader } from "@/components/site/PageHeader";
import { getPublicOfficers, getSettings } from "@/lib/data";
import { directionsUrl, fullPostName, telHref } from "@/lib/settings";
import { OFFICER_GROUPS, type PublicOfficer } from "@/lib/types";

export const metadata: Metadata = {
  title: "Officers & Contact",
  description:
    "Meet the officers of American Legion Frank M. Calletta Post 186 in Hammonton, NJ. Call, visit at 101 French Street, or send a message to the post or to an officer.",
  alternates: { canonical: "/officers" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase();
}

function OfficerCard({ officer }: { officer: PublicOfficer }) {
  return (
    <li className="card flex flex-col p-6">
      <div className="flex items-center gap-4">
        {officer.photoUrl ? (
          <span className="relative size-20 flex-none overflow-hidden rounded-full bg-fog">
            <Image src={officer.photoUrl} alt="" fill sizes="80px" className="object-cover" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="caps flex size-20 flex-none items-center justify-center rounded-full bg-navy text-3xl text-white"
          >
            {initials(officer.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="eyebrow">{officer.title}</p>
          <h3 className="mt-0.5 text-2xl">{officer.name}</h3>
        </div>
      </div>

      {officer.bio && <p className="mt-4 text-[0.9375rem]">{officer.bio}</p>}

      {(officer.phone || officer.email) && (
        <ul className="mt-3">
          {officer.phone && (
            <li>
              <a
                href={telHref(officer.phone)}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-azure hover:underline"
              >
                <Phone size={17} /> {officer.phone}
              </a>
            </li>
          )}
          {officer.email && (
            <li>
              <a
                href={`mailto:${officer.email}`}
                className="inline-flex min-h-11 items-center gap-2 break-all font-semibold text-azure hover:underline"
              >
                <Mail size={17} className="flex-none" /> {officer.email}
              </a>
            </li>
          )}
        </ul>
      )}

      {officer.acceptsMessages && (
        <Link href={`/officers?to=${officer.id}#contact`} className="btn btn-outline btn-sm mt-5 self-start">
          Send a message
          <span className="sr-only"> to {officer.name}</span>
        </Link>
      )}
    </li>
  );
}

async function OfficersContent() {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("officers", "settings");
  const [officers, settings] = await Promise.all([getPublicOfficers(), getSettings()]);

  const groups = OFFICER_GROUPS.map((group) => ({
    ...group,
    members: officers.filter((officer) => officer.group === group.value),
  })).filter((group) => group.members.length > 0);

  const recipients = officers
    .filter((officer) => officer.acceptsMessages)
    .map((officer) => ({ id: officer.id, label: `${officer.name} — ${officer.title}` }));

  return (
    <>
      <div className="container-page py-12 md:py-16">
        {groups.length === 0 && (
          <div className="rounded-md bg-cloud p-6">
            <h2 className="text-2xl">Officer listings are being updated</h2>
            <p className="mt-2">Send a message below and we will direct it to the right person.</p>
          </div>
        )}
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.value} aria-labelledby={`group-${group.value}`}>
              <h2 id={`group-${group.value}`} className="border-b-2 border-navy pb-2 text-2xl md:text-3xl">
                {group.label}
              </h2>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.members.map((officer) => (
                  <OfficerCard key={officer.id} officer={officer} />
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-[0.9375rem]">
          Post officers are volunteers elected by the members each year. {settings.meetingSchedule}
        </p>
      </div>

      <section
        id="contact"
        aria-labelledby="contact-heading"
        className="scroll-mt-24 border-t border-line bg-cloud py-12 md:py-16"
      >
        <div className="container-page grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <h2 id="contact-heading">Send Us a Message</h2>
            <p className="mb-6 mt-3 max-w-2xl">
              Questions about joining, events, help for a veteran, or anything else? Write to the post or directly
              to an officer. To reserve the hall, please use the{" "}
              <Link href="/hall-rental#request" className="link">
                hall rental request form
              </Link>
              .
            </p>
            <div className="card max-w-2xl p-5 sm:p-8">
              {/* The recipient can be pre-selected from the URL, which is only known in the browser. */}
              <Suspense fallback={<ContactFormView recipients={recipients} to="" />}>
                <ContactForm recipients={recipients} />
              </Suspense>
            </div>
          </div>

          <aside aria-labelledby="visit-heading" className="card h-fit overflow-hidden">
            <div className="bg-navy px-6 py-4">
              <h2 id="visit-heading" className="text-xl text-white">
                Visit or call
              </h2>
            </div>
            <address className="space-y-4 p-6 not-italic">
              <p className="font-bold text-ink">{fullPostName(settings)}</p>
              <p className="flex items-start gap-3">
                <MapPin size={20} className="mt-1 flex-none text-azure" />
                <span>
                  {settings.street}
                  <br />
                  {settings.city}, {settings.state} {settings.zip}
                  <br />
                  <a href={directionsUrl(settings)} rel="noopener" className="link">
                    Get directions
                  </a>
                </span>
              </p>
              {settings.phone && (
                <p className="flex items-center gap-3">
                  <Phone size={20} className="flex-none text-azure" />
                  <a href={telHref(settings.phone)} className="link inline-flex min-h-11 items-center text-lg">
                    {settings.phone}
                  </a>
                </p>
              )}
              {settings.email && (
                <p className="flex items-center gap-3">
                  <Mail size={20} className="flex-none text-azure" />
                  <a href={`mailto:${settings.email}`} className="link inline-flex min-h-11 items-center break-all">
                    {settings.email}
                  </a>
                </p>
              )}
              {settings.mailingAddress && (
                <p>
                  <span className="block text-sm font-semibold uppercase tracking-wide">Mailing address</span>
                  {settings.mailingAddress}
                </p>
              )}
              {settings.hours && (
                <p>
                  <span className="block text-sm font-semibold uppercase tracking-wide">Hours</span>
                  {settings.hours}
                </p>
              )}
              {settings.facebookUrl && (
                <p>
                  <a
                    href={settings.facebookUrl}
                    rel="noopener"
                    className="inline-flex min-h-11 items-center gap-2 font-bold text-navy hover:text-azure hover:underline"
                  >
                    <Facebook size={22} /> Post {settings.postNumber} on Facebook
                  </a>
                </p>
              )}
            </address>
          </aside>
        </div>
      </section>
    </>
  );
}

export default function OfficersPage() {
  return (
    <>
      <PageHeader
        title="Officers & Contact"
        lead="Post 186 is led by volunteer officers. Call, stop by, or send a message — we are glad to help."
      >
        <a href="#contact" className="btn btn-red">
          Send a Message
        </a>
      </PageHeader>
      <OfficersContent />
    </>
  );
}
