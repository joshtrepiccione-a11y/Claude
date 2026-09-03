import Link from "next/link";
import { NAV_LINKS, SITE } from "@/lib/site";
import type { SiteContent } from "@/lib/content";
import { Brandmark, brandmarkAvailable } from "./Brandmark";

export function Footer({ content }: { content: SiteContent }) {
  const socials = [
    { label: "Facebook", href: content.social_facebook },
    { label: "Instagram", href: content.social_instagram },
    { label: "More", href: content.social_other },
  ].filter((s) => s.href);
  const hasWhiteMark = brandmarkAvailable("white");

  return (
    <footer className="site-footer on-dark">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            {hasWhiteMark ? <Brandmark variant="white" size="sm" /> : <Brandmark variant="primary" size="sm" />}
            <p style={{ marginTop: "1rem" }}>
              {SITE.streetAddress}
              <br />
              {SITE.city}, {SITE.region} {SITE.postalCode}
            </p>
            <p>
              <a href={SITE.mapsUrl} rel="noopener">
                Get directions
              </a>
            </p>
          </div>
          <div>
            <h2>Visit</h2>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Reach us</h2>
            <ul>
              {content.contact_phone ? (
                <li>
                  <a href={`tel:${content.contact_phone.replace(/[^0-9+]/g, "")}`}>{content.contact_phone}</a>
                </li>
              ) : null}
              {content.contact_email ? (
                <li>
                  <a href={`mailto:${content.contact_email}`}>{content.contact_email}</a>
                </li>
              ) : null}
              {!content.contact_phone && !content.contact_email ? (
                <li>
                  <Link href="/contact">Send us a message</Link>
                </li>
              ) : null}
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} rel="noopener">
                    {s.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={SITE.legionEligibilityUrl} rel="noopener">
                  The American Legion national site
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            &copy; {new Date().getFullYear()} {SITE.name}
          </span>
          <span>
            <Link href="/privacy">Privacy</Link> &nbsp;&middot;&nbsp; <Link href="/accessibility">Accessibility</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
