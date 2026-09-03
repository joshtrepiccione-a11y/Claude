import type { MetadataRoute } from "next";
import { listAllPublicEvents } from "@/lib/events";
import { listPublishedPosts } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["/", "/about", "/membership", "/hall-rentals", "/events", "/news", "/contact", "/privacy", "/accessibility"];
  const entries: MetadataRoute.Sitemap = staticPages.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly", priority: p === "/" ? 1 : 0.7 }));
  for (const e of await listAllPublicEvents()) entries.push({ url: absoluteUrl(`/events/${e.slug}`), lastModified: e.updated_at, changeFrequency: "weekly", priority: 0.6 });
  for (const p of await listPublishedPosts()) entries.push({ url: absoluteUrl(`/news/${p.slug}`), lastModified: p.updated_at, changeFrequency: "monthly", priority: 0.6 });
  return entries;
}
