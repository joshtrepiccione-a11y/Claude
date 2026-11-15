import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DEFAULT_SETTINGS, fullPostName } from "@/lib/settings";
import { siteUrl } from "@/lib/site";

// Archivo and Inter are the typefaces used on legion.org. Both are open source
// (SIL Open Font License) and are served from this site, not a third party.
const archivo = localFont({
  src: "../fonts/archivo-latin-wdth-normal.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

const inter = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const name = fullPostName(DEFAULT_SETTINGS);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${name} | Hammonton, NJ`,
    template: `%s | American Legion Post 186, Hammonton NJ`,
  },
  description:
    "The American Legion Frank M. Calletta Post 186 serves veterans, their families and the community in Hammonton, New Jersey. Find events, rent our hall, and contact post officers.",
  applicationName: "American Legion Post 186",
  openGraph: {
    type: "website",
    siteName: name,
    locale: "en_US",
  },
  formatDetection: { telephone: true, address: true },
};

export const viewport: Viewport = {
  themeColor: "#0e1e37",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`} data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
