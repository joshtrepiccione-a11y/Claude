import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { PostCard } from "@/components/PostCard";
import { listCategories } from "@/lib/categories";
import { getFeaturedPost, listPublishedPosts } from "@/lib/posts";
import { formatDate } from "@/lib/time";
import { plainText } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News",
  description: "News, ceremonies, community service, veteran resources, and member stories from American Legion Post 186 in Hammonton, NJ.",
  alternates: { canonical: "/news" },
};

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const categories = await listCategories("post");
  const catMap = new Map(categories.map((c) => [c.slug, c.name]));
  const category = categories.some((c) => c.slug === sp.category) ? sp.category : undefined;
  const featured = category ? undefined : await getFeaturedPost();
  const posts = (await listPublishedPosts({ category })).filter((p) => p.id !== featured?.id);

  return (
    <PublicShell>
      <div className="container page-intro">
        <h1>News from Post 186</h1>
        <p className="lead">What the Post is doing, who we are honoring, and resources for veterans and families.</p>
      </div>
      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <form method="get" action="/news" className="filter-form">
            <div className="field">
              <label htmlFor="category">Filter by category</label>
              <select id="category" name="category" defaultValue={category ?? ""}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-outline btn-sm">
              Apply filter
            </button>
            {category ? (
              <Link href="/news" className="btn btn-quiet btn-sm">
                Clear
              </Link>
            ) : null}
          </form>

          {featured ? (
            <article className="card" style={{ marginBottom: "2rem", borderLeft: "6px solid var(--blue)" }}>
              <p className="meta">
                <span className="badge badge-featured">Featured</span> &nbsp;
                <time dateTime={featured.publish_at}>{formatDate(featured.publish_at)}</time>
                {featured.category ? <> &middot; {catMap.get(featured.category)}</> : null}
              </p>
              <h2 style={{ fontSize: "var(--step-2)" }}>
                <Link href={`/news/${featured.slug}`} style={{ textDecoration: "none" }}>
                  {featured.title}
                </Link>
              </h2>
              {featured.featured_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.featured_image} alt={featured.image_alt} loading="lazy" style={{ maxWidth: "40rem", borderRadius: "4px", marginBottom: "1rem" }} />
              ) : null}
              <p className="prose">{featured.excerpt || plainText(featured.body, 240)}</p>
              <Link href={`/news/${featured.slug}`} className="standalone-link">Read the full article</Link>
            </article>
          ) : null}

          {posts.length ? (
            <div className="grid grid-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} categoryLabel={catMap.get(p.category)} />
              ))}
            </div>
          ) : !featured ? (
            <p className="lead">{category ? "No articles in this category yet." : "No articles have been published yet. Check back soon."}</p>
          ) : null}
        </div>
      </section>
    </PublicShell>
  );
}
