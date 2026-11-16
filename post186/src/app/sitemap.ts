import type { MetadataRoute } from "next";
import { getFeedEvents } from "@/lib/data";
import { siteUrl } from "@/lib/site";

const PAGES = [
  { path: "", priority: 1 },
  { path: "/events", priority: 0.9 },
  { path: "/hall-rental", priority: 0.9 },
  { path: "/officers", priority: 0.9 },
  { path: "/privacy", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const events = await getFeedEvents();
  return [
    ...PAGES.map((page) => ({ url: `${base}${page.path}`, priority: page.priority })),
    ...events.map((event) => ({
      url: `${base}/events/${event.slug}`,
      lastModified: event.updatedAt,
      priority: 0.5,
    })),
  ];
}
