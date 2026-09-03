import { execute, query, queryOne, transaction } from "./db";
import { slugify } from "./slug";

export type Category = { id: number; kind: "post" | "event"; name: string; slug: string; sort_order: number };

export async function listCategories(kind: "post" | "event"): Promise<Category[]> {
  return query<Category>("SELECT * FROM categories WHERE kind = $1 ORDER BY sort_order, name", [kind]);
}

export async function addCategory(kind: "post" | "event", name: string): Promise<{ ok: boolean; error?: string }> {
  const slug = slugify(name);
  if (!slug) return { ok: false, error: "Enter a category name with letters or numbers." };
  const existing = await queryOne("SELECT id FROM categories WHERE kind = $1 AND slug = $2", [kind, slug]);
  if (existing) return { ok: false, error: "That category already exists." };
  const max = await queryOne<{ m: number }>(
    "SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories WHERE kind = $1",
    [kind],
  );
  await execute("INSERT INTO categories (kind, name, slug, sort_order) VALUES ($1, $2, $3, $4)", [
    kind,
    name.trim(),
    slug,
    (max?.m ?? 0) + 1,
  ]);
  return { ok: true };
}

export async function renameCategory(id: number, name: string): Promise<{ ok: boolean; error?: string }> {
  const slug = slugify(name);
  if (!slug) return { ok: false, error: "Enter a category name with letters or numbers." };
  const row = await queryOne<Category>("SELECT * FROM categories WHERE id = $1", [id]);
  if (!row) return { ok: false, error: "Category not found." };
  const clash = await queryOne("SELECT id FROM categories WHERE kind = $1 AND slug = $2 AND id <> $3", [
    row.kind,
    slug,
    id,
  ]);
  if (clash) return { ok: false, error: "Another category already uses that name." };
  const table = row.kind === "post" ? "posts" : "events";
  await transaction(async (client) => {
    await client.query("UPDATE categories SET name = $1, slug = $2 WHERE id = $3", [name.trim(), slug, id]);
    await client.query(`UPDATE ${table} SET category = $1 WHERE category = $2`, [slug, row.slug]);
  });
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<void> {
  const row = await queryOne<Category>("SELECT * FROM categories WHERE id = $1", [id]);
  if (!row) return;
  const table = row.kind === "post" ? "posts" : "events";
  await transaction(async (client) => {
    await client.query(`UPDATE ${table} SET category = '' WHERE category = $1`, [row.slug]);
    await client.query("DELETE FROM categories WHERE id = $1", [id]);
  });
}

export async function categoryName(kind: "post" | "event", slug: string): Promise<string> {
  if (!slug) return "";
  const row = await queryOne<{ name: string }>(
    "SELECT name FROM categories WHERE kind = $1 AND slug = $2",
    [kind, slug],
  );
  return row?.name ?? slug;
}
