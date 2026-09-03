import { execute, nowIso, query, queryOne } from "./db";
import { slugify, uniqueSlugAsync } from "./slug";
import { zonedToUtc } from "./time";
import type { z } from "zod";
import type { postSchema } from "./validation";

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  category: string;
  featured_image: string;
  image_alt: string;
  status: "draft" | "scheduled" | "published";
  is_featured: number;
  publish_at: string;
  seo_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
};

const PUBLIC_WHERE = "status IN ('published','scheduled') AND publish_at <= $1";

export async function listPublishedPosts(opts: { limit?: number; category?: string } = {}): Promise<Post[]> {
  const params: unknown[] = [nowIso()];
  let where = PUBLIC_WHERE;
  if (opts.category) {
    params.push(opts.category);
    where += ` AND category = $${params.length}`;
  }
  let sql = `SELECT * FROM posts WHERE ${where} ORDER BY publish_at DESC`;
  if (opts.limit) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  return query<Post>(sql, params);
}

export async function getFeaturedPost(): Promise<Post | undefined> {
  return queryOne<Post>(
    `SELECT * FROM posts WHERE ${PUBLIC_WHERE} AND is_featured = 1 ORDER BY publish_at DESC LIMIT 1`,
    [nowIso()],
  );
}

export async function getPublishedPost(slug: string): Promise<Post | undefined> {
  return queryOne<Post>(`SELECT * FROM posts WHERE ${PUBLIC_WHERE} AND slug = $2`, [nowIso(), slug]);
}

export async function relatedPosts(post: Post, limit = 3): Promise<Post[]> {
  return query<Post>(
    `SELECT * FROM posts WHERE ${PUBLIC_WHERE} AND id <> $2 ORDER BY (category = $3) DESC, publish_at DESC LIMIT $4`,
    [nowIso(), post.id, post.category, limit],
  );
}

/** Admin */
export async function listAllPosts(): Promise<Post[]> {
  return query<Post>("SELECT * FROM posts ORDER BY publish_at DESC");
}

export async function getPostById(id: number): Promise<Post | undefined> {
  return queryOne<Post>("SELECT * FROM posts WHERE id = $1", [id]);
}

type PostInput = z.infer<typeof postSchema>;

async function toRow(input: PostInput, existingId?: number) {
  const base = slugify(input.slug || input.title);
  const slug = await uniqueSlugAsync(base, async (candidate) => {
    const row = await queryOne<{ id: number }>("SELECT id FROM posts WHERE slug = $1", [candidate]);
    return Boolean(row && row.id !== existingId);
  });
  return {
    title: input.title,
    slug,
    excerpt: input.excerpt,
    body: input.body,
    author: input.author,
    category: input.category,
    featured_image: input.featured_image,
    image_alt: input.image_alt,
    status: input.status,
    is_featured: input.is_featured ? 1 : 0,
    publish_at: zonedToUtc(input.publish_at).toISOString(),
    seo_title: input.seo_title,
    meta_description: input.meta_description,
  };
}

const COLUMNS = [
  "title", "slug", "excerpt", "body", "author", "category", "featured_image", "image_alt", "status",
  "is_featured", "publish_at", "seo_title", "meta_description",
] as const;

export async function createPost(input: PostInput): Promise<number> {
  const row = await toRow(input);
  const now = nowIso();
  const values = [...COLUMNS.map((c) => (row as Record<string, unknown>)[c]), now, now];
  const cols = [...COLUMNS, "created_at", "updated_at"];
  const row0 = await queryOne<{ id: number }>(
    `INSERT INTO posts (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
    values,
  );
  return row0!.id;
}

export async function updatePost(id: number, input: PostInput): Promise<void> {
  const row = await toRow(input, id);
  const cols = [...COLUMNS, "updated_at"];
  const values = [...COLUMNS.map((c) => (row as Record<string, unknown>)[c]), nowIso(), id];
  const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  await execute(`UPDATE posts SET ${sets} WHERE id = $${values.length}`, values);
}

export async function deletePost(id: number): Promise<void> {
  await execute("DELETE FROM posts WHERE id = $1", [id]);
}

/** Display state that accounts for scheduled posts whose time has not arrived. */
export function postDisplayStatus(post: Post): "Draft" | "Scheduled" | "Published" {
  if (post.status === "draft") return "Draft";
  return post.publish_at > nowIso() ? "Scheduled" : "Published";
}
