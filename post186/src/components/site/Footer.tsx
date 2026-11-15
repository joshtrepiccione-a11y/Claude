import Link from "next/link";
import type { ReactNode } from "react";
import { External, Facebook, Mail, MapPin, Phone } from "@/components/icons";
import { directionsUrl, fullPostName, telHref, type SiteSettings } from "@/lib/settings";
import { NATIONAL_ISSUES, NATIONAL_SERVICES } from "@/lib/site";
import { Lockup } from "./Lockup";
import { NAV_ITEMS } from "./nav-items";

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 font-sans text-base font-bold normal-case tracking-normal text-navy [font-variation-settings:normal]">
      {children}
    </h2>
  );
}

const linkClass =
  "flex items-center justify-between gap-2 border-b border-line py-2.5 font-bold text-navy hover:text-azure hover:underline";

function LocalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  );
}

function NationalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} rel="noopener" className={linkClass}>
      <span>{children}</span>
      <External size={15} className="flex-none text-azure" />
    </a>
  );
}

/**
 * The footer is where national topics live. Post 186's own pages are in the
 * first column; everything about national issues, membership and benefits
 * links out to legion.org and its partner sites.
 */
export function Footer({ settings, year }: { settings: SiteSettings; year: number }) {
  return (
    <footer className="mt-auto">
      <div className="bg-white py-10">
        <div className="container-page flex flex-col items-center gap-3 text-center">
          <Lockup settings={settings} tone="light" size="lg" />
          <p className="caps mt-1 text-lg tracking-[0.12em] text-navy">For God and Country</p>
        </div>
      </div>

      <div aria-hidden="true" className="stripe-rule" />

      <div className="bg-cloud py-10">
        <div className="container-page grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-label="Post 186 pages">
            <FooterHeading>Post {settings.postNumber}</FooterHeading>
            <ul>
              <li>
                <LocalLink href="/">Home</LocalLink>
              </li>
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <LocalLink href={item.href}>{item.label}</LocalLink>
                </li>
              ))}
              <li>
                <LocalLink href="/events#subscribe">Subscribe to Our Calendar</LocalLink>
              </li>
              <li>
                <LocalLink href="/hall-rental/status">Check a Hall Request</LocalLink>
              </li>
            </ul>
          </nav>

          <nav aria-label="National issues at legion.org">
            <FooterHeading>National Issues</FooterHeading>
            <ul>
              {NATIONAL_ISSUES.map((link) => (
                <li key={link.href}>
                  <NationalLink href={link.href}>{link.label}</NationalLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="National membership and benefits">
            <FooterHeading>National Membership &amp; Benefits</FooterHeading>
            <ul>
              {NATIONAL_SERVICES.map((link) => (
                <li key={link.href}>
                  <NationalLink href={link.href}>{link.label}</NationalLink>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <FooterHeading>Contact Post {settings.postNumber}</FooterHeading>
            <address className="not-italic">
              <p className="font-bold text-ink">{fullPostName(settings)}</p>
              <p className="mt-1">
                {settings.street}
                <br />
                {settings.city}, {settings.state} {settings.zip}
              </p>
              {settings.mailingAddress && (
                <p className="mt-2 text-[0.9375rem]">
                  <span className="font-semibold text-ink">Mail:</span> {settings.mailingAddress}
                </p>
              )}
              <ul className="mt-3 space-y-1.5">
                {settings.phone && (
                  <li>
                    <a href={telHref(settings.phone)} className="inline-flex min-h-8 items-center gap-2 font-bold text-azure hover:underline">
                      <Phone size={17} /> {settings.phone}
                    </a>
                  </li>
                )}
                {settings.email && (
                  <li>
                    <a href={`mailto:${settings.email}`} className="inline-flex min-h-8 items-center gap-2 break-all font-bold text-azure hover:underline">
                      <Mail size={17} className="flex-none" /> {settings.email}
                    </a>
                  </li>
                )}
                <li>
                  <a href={directionsUrl(settings)} rel="noopener" className="inline-flex min-h-8 items-center gap-2 font-bold text-azure hover:underline">
                    <MapPin size={17} /> Get directions
                  </a>
                </li>
                {settings.facebookUrl && (
                  <li>
                    <a href={settings.facebookUrl} rel="noopener" className="inline-flex min-h-8 items-center gap-2 font-bold text-azure hover:underline">
                      <Facebook size={18} /> Follow us on Facebook
                    </a>
                  </li>
                )}
              </ul>
            </address>
          </div>
        </div>
        <p className="container-page mt-8 flex items-center gap-2 text-[0.9375rem]">
          <External size={15} className="flex-none text-azure" />
          National links open the websites of The American Legion and its partners.
        </p>
      </div>

      <div className="border-t border-line bg-white py-5 text-[0.9375rem]">
        <div className="container-page flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {fullPostName(settings)}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <Link href="/privacy" className="text-azure hover:underline">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-azure hover:underline" prefetch={false}>
                Officer sign-in
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
