import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { getPostById, postDisplayStatus } from "@/lib/posts";
import { utcToLocalInput } from "@/lib/time";
import { PostForm } from "@/components/admin/PostForm";
import { Flash } from "@/components/admin/Flash";
import { deletePostAction } from "@/app/admin/actions";

export default async function EditPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const post = await getPostById(Number(id));
  if (!post) notFound();
  const initial: Record<string, string> = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body: post.body,
    author: post.author,
    category: post.category,
    featured_image: post.featured_image,
    image_alt: post.image_alt,
    status: post.status,
    is_featured: post.is_featured ? "on" : "",
    publish_at: utcToLocalInput(post.publish_at),
    seo_title: post.seo_title,
    meta_description: post.meta_description,
  };
  const status = postDisplayStatus(post);
  return (
    <>
      <p className="breadcrumb">
        <Link href="/admin/posts">News posts</Link> &rsaquo; Edit
      </p>
      <h1>{post.title}</h1>
      <p className="meta">
        <span className={`tag tag-${status.toLowerCase()}`}>{status}</span>
        {status === "Published" ? (
          <>
            {" "}
            &middot;{" "}
            <Link href={`/news/${post.slug}`} target="_blank" rel="noopener">
              View on the site
            </Link>
          </>
        ) : null}
      </p>
      <Flash saved={sp.saved} />
      <PostForm id={post.id} initial={initial} categories={await listCategories("post")} />
      <form action={deletePostAction} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={post.id} />
        <button type="submit" className="btn btn-danger btn-sm">
          Delete this post permanently
        </button>
      </form>
    </>
  );
}
