import Link from "next/link";
import type { Post } from "@/lib/posts";
import { formatShortDate } from "@/lib/time";
import { plainText } from "@/lib/markdown";

export function PostCard({ post, categoryLabel, headingLevel = 3 }: { post: Post; categoryLabel?: string; headingLevel?: 2 | 3 }) {
  const Heading = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";
  return (
    <article className="card">
      {post.featured_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featured_image}
          alt={post.image_alt}
          loading="lazy"
          style={{ marginBottom: "0.9rem", borderRadius: "4px", aspectRatio: "16 / 9", objectFit: "cover", width: "100%" }}
        />
      ) : null}
      <Heading>
        <Link href={`/news/${post.slug}`}>{post.title}</Link>
      </Heading>
      <p className="meta">
        <time dateTime={post.publish_at}>{formatShortDate(post.publish_at)}</time>
        {categoryLabel ? <> &middot; {categoryLabel}</> : null}
        {post.author ? <> &middot; {post.author}</> : null}
      </p>
      <p>{post.excerpt || plainText(post.body, 150)}</p>
    </article>
  );
}
