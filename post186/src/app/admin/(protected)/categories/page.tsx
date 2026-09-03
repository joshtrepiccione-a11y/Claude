import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { Flash } from "@/components/admin/Flash";
import { addCategoryAction, deleteCategoryAction, renameCategoryAction } from "@/app/admin/actions";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const kinds = [
    { kind: "event" as const, label: "Event categories", items: await listCategories("event") },
    { kind: "post" as const, label: "News categories", items: await listCategories("post") },
  ];
  return (
    <>
      <h1>Categories</h1>
      <Flash saved={sp.saved} error={sp.error} />
      <p className="meta">Renaming a category updates every event or post that uses it. Deleting one leaves those items uncategorized.</p>
      {kinds.map(({ kind, label, items }) => (
        <section key={kind} className="admin-fieldset" aria-labelledby={`cat-${kind}`}>
          <h2 id={`cat-${kind}`} style={{ fontSize: "var(--step-1)" }}>
            {label}
          </h2>
          <ul className="checklist">
            {items.map((c) => (
              <li key={c.id}>
                <form action={renameCategoryAction} className="filter-form" style={{ marginBottom: 0 }}>
                  <input type="hidden" name="id" value={c.id} />
                  <div className="field">
                    <label htmlFor={`cat-${c.id}`} className="visually-hidden">
                      Rename {c.name}
                    </label>
                    <input id={`cat-${c.id}`} name="name" type="text" defaultValue={c.name} maxLength={60} required />
                  </div>
                  <button type="submit" className="btn btn-outline btn-sm">
                    Rename
                  </button>
                </form>
                <form action={deleteCategoryAction} className="inline-form">
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="btn btn-quiet btn-sm">
                    Delete {c.name}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addCategoryAction} className="filter-form" style={{ marginTop: "1rem" }}>
            <input type="hidden" name="kind" value={kind} />
            <div className="field">
              <label htmlFor={`new-${kind}`}>Add a category</label>
              <input id={`new-${kind}`} name="name" type="text" maxLength={60} required />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              Add
            </button>
          </form>
        </section>
      ))}
    </>
  );
}
