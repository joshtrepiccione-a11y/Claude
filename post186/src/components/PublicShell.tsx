import { Header } from "./Header";
import { Footer } from "./Footer";
import { JsonLd } from "./JsonLd";
import { SITE, siteUrl } from "@/lib/site";
import { getSiteContent } from "@/lib/content";

/** Wraps every public page: skip link, header, main landmark, footer, and Organization structured data. */
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();
  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: siteUrl(),
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.streetAddress,
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      postalCode: SITE.postalCode,
      addressCountry: "US",
    },
  };
  if (content.contact_phone) org.telephone = content.contact_phone;
  if (content.contact_email) org.email = content.contact_email;
  const sameAs = [content.social_facebook, content.social_instagram, content.social_other].filter(Boolean);
  if (sameAs.length) org.sameAs = sameAs;

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer content={content} />
      <JsonLd data={org} />
    </>
  );
}
