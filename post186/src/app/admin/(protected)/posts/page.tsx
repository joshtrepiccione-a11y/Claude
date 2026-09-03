import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAllPosts, postDisplayStatus } from "@/lib/posts";
import { formatShortDate } from "@/lib/time";
import { Flash } from "@/components/admin/Flash";

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const posts = await listAllPosts();
  return (
    <>
      <h1>News posts</h1>
      <Flash deleted={sp.deleted} />
      <div className="admin-toolbar">
        <Link href="/admin/posts/new" className="btn btn-secondary btn-sm">
          Write a news post
        </Link>
      </div>
      {posts.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Publish date</th>
                <th scope="col">Category</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const status = postDisplayStatus(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/posts/${p.id}`}>{p.title}</Link>
                      {p.is_featured ? <> &nbsp;<span className="tag">Featured</span></> : null}
                    </td>
                    <td>
                      <span className={`tag tag-${status.toLowerCase()}`}>{status}</span>
                    </td>
                    <td>{formatShortDate(p.publish_at)}</td>
                    <td>{p.category}</td>
                    <td>{status === "Published" ? <Link href={`/news/${p.slug}`} target="_blank" rel="noopener">View</Link> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="lead">No posts yet. Write the first one.</p>
      )}
    </>
  );
}
