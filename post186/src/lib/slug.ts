export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Returns `base`, or `base-2`, `base-3`, ... until `exists` returns false. */
export function uniqueSlug(base: string, exists: (candidate: string) => boolean): string {
  const root = base || "item";
  if (!exists(root)) return root;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${root}-${i}`;
    if (!exists(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/** Async twin of {@link uniqueSlug}, for uniqueness checks that hit the database. */
export async function uniqueSlugAsync(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = base || "item";
  if (!(await exists(root))) return root;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${root}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now()}`;
}
