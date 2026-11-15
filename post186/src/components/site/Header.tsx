import Link from "next/link";
import { Suspense } from "react";
import { Facebook, MapPin, Phone } from "@/components/icons";
import { addressLine, directionsUrl, fullPostName, telHref, type SiteSettings } from "@/lib/settings";
import { Lockup } from "./Lockup";
import { NavView, SiteNav } from "./SiteNav";

export function Header({ settings }: { settings: SiteSettings }) {
  const nav = {
    phone: settings.phone,
    phoneHref: telHref(settings.phone),
    directionsHref: directionsUrl(settings),
  };
  const { announcement } = settings;

  return (
    <>
      <a href="#main" className="sr-only-focusable btn btn-red fixed left-3 top-3 z-50">
        Skip to main content
      </a>

      {announcement.enabled && announcement.text && (
        <div className="bg-azure text-white">
          <div className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[0.9375rem] font-semibold">
            <span>{announcement.text}</span>
            {announcement.linkUrl && (
              <a href={announcement.linkUrl} className="underline decoration-2 underline-offset-4">
                {announcement.linkLabel || "Learn more"}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Utility bar: how to find and reach the post */}
      <div className="bg-navy-deep text-white">
        <div className="container-page flex min-h-12 items-center justify-between gap-4 py-1.5">
          <a
            href={nav.directionsHref}
            rel="noopener"
            className="flex min-h-10 items-center gap-1.5 text-[0.8125rem] font-semibold leading-snug hover:underline sm:text-sm"
          >
            <MapPin size={16} className="flex-none" />
            <span>{addressLine(settings)}</span>
          </a>

          <div className="hidden items-center gap-5 lg:flex">
            {settings.phone && (
              <a href={nav.phoneHref} className="caps flex items-center gap-1.5 text-[0.9375rem] hover:underline">
                <Phone size={16} /> {settings.phone}
              </a>
            )}
            {settings.facebookUrl && (
              <a
                href={settings.facebookUrl}
                rel="noopener"
                className="caps flex items-center gap-1.5 text-[0.9375rem] hover:underline"
              >
                <Facebook size={17} /> Facebook
              </a>
            )}
            <Link href="/hall-rental" className="btn btn-red btn-sm">
              Rent the Hall
            </Link>
          </div>

          {settings.phone && (
            <a
              href={nav.phoneHref}
              className="caps flex min-h-10 flex-none items-center gap-1.5 text-sm lg:hidden"
              aria-label={`Call the post at ${settings.phone}`}
            >
              <Phone size={16} /> Call
            </a>
          )}
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-30 bg-navy shadow-[0_2px_0_rgba(0,0,0,0.15)]">
        <div className="container-page relative flex min-h-[4.5rem] items-center justify-between gap-4 py-2 lg:min-h-[5.5rem]">
          <Link href="/" aria-label={`${fullPostName(settings)} — home`} className="rounded">
            <Lockup settings={settings} tone="dark" />
          </Link>
          {/* The active link depends on the URL, so render plain links until it is known. */}
          <Suspense fallback={<NavView pathname="" {...nav} />}>
            <SiteNav {...nav} />
          </Suspense>
        </div>
      </header>
    </>
  );
}
