import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { RichText } from "@/components/RichText";
import { PostCard } from "@/components/PostCard";
import { JsonLd } from "@/components/JsonLd";
import { categoryName, listCategories } from "@/lib/categories";
import { getPublishedPost, relatedPosts } from "@/lib/posts";
import { plainText } from "@/lib/markdown";
import { SITE, absoluteUrl } from "@/lib/site";
import { formatDate, formatShortDate } from "@/lib/time";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Article not found" };
  const description = post.meta_description || post.excerpt || plainText(post.body);
  return {
    title: post.seo_title || post.title,
    description,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: absoluteUrl(`/news/${post.slug}`),
      publishedTime: post.publish_at,
      modifiedTime: post.updated_at,
      images: post.featured_image ? [{ url: post.featured_image, alt: post.image_alt }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  const related = await relatedPosts(post);
  const catMap = new Map((await listCategories("post")).map((c) => [c.slug, c.name]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    datePublished: post.publish_at,
    dateModified: post.updated_at,
    author: post.author ? { "@type": "Person", name: post.author } : { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: absoluteUrl(`/news/${post.slug}`),
    ...(post.featured_image ? { image: [post.featured_image] } : {}),
  };

  return (
    <PublicShell>
      <article>
        <div className="container detail-header">
          <p className="breadcrumb">
            <Link href="/news">News</Link>
            {post.category ? (
              <>
                {" "}
                &rsaquo; <Link href={`/news?category=${post.category}`}>{await categoryName("post", post.category)}</Link>
              </>
            ) : null}
          </p>
          <h1>{post.title}</h1>
          <p className="meta">
            <time dateTime={post.publish_at}>{formatDate(post.publish_at)}</time>
            {post.author ? <> &middot; By {post.author}</> : null}
            {post.updated_at > post.publish_at ? <> &middot; Updated {formatShortDate(post.updated_at)}</> : null}
          </p>
        </div>
        <div className="container section">
          {post.featured_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.featured_image} alt={post.image_alt} style={{ maxWidth: "48rem", borderRadius: "4px", marginBottom: "1.5rem" }} />
          ) : null}
          {post.excerpt ? <p className="lead">{post.excerpt}</p> : null}
          <RichText text={post.body} />
        </div>
      </article>
      {related.length ? (
        <section className="section section-alt" aria-labelledby="related">
          <div className="container">
            <h2 id="related">More from the Post</h2>
            <div className="grid grid-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} categoryLabel={catMap.get(p.category)} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <JsonLd data={jsonLd} />
    </PublicShell>
  );
}
