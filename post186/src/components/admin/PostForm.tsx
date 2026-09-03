"use client";

import { useActionState } from "react";
import { savePostAction } from "@/app/admin/actions";
import { ErrorSummary, SelectField, TextArea, TextField, initialFormState, type FormState } from "@/components/forms/fields";

type Props = {
  id: number | null;
  initial: Record<string, string>;
  categories: Array<{ slug: string; name: string }>;
};

export function PostForm({ id, initial, categories }: Props) {
  const bound = savePostAction.bind(null, id);
  const [state, action, pending] = useActionState(bound, { ...initialFormState, values: initial } satisfies FormState);
  const values = Object.keys(state.values).length ? state.values : initial;
  const s: FormState = { ...state, values };

  return (
    <form action={action} className="form" style={{ maxWidth: "52rem" }}>
      <ErrorSummary state={s} />
      <fieldset className="admin-fieldset">
        <legend>Article</legend>
        <TextField name="title" label="Title" required maxLength={200} state={s} />
        <TextField name="slug" label="Web address (slug)" hint="Leave blank to create one from the title. Lowercase letters, numbers, and dashes." maxLength={80} state={s} />
        <TextArea name="excerpt" label="Excerpt" hint="One or two sentences shown on cards and the home page." rows={2} maxLength={400} state={s} />
        <TextArea name="body" label="Body" required hint="Blank line between paragraphs. Use ## for a heading, - for a list item, **bold**, and [link text](https://...)." rows={16} maxLength={50000} state={s} />
        <div className="field-row">
          <TextField name="author" label="Author or display attribution" maxLength={120} state={s} />
          <SelectField name="category" label="Category" state={s} placeholder="No category" options={categories.map((c) => ({ value: c.slug, label: c.name }))} />
        </div>
      </fieldset>
      <fieldset className="admin-fieldset">
        <legend>Featured image</legend>
        <TextField name="featured_image" label="Image path" hint="Upload the photo to the site's public/images folder, then enter its path, for example /images/memorial-day-2026.jpg" maxLength={300} state={s} />
        <TextField name="image_alt" label="Image description (alt text)" hint="Describe the photo for people who cannot see it." maxLength={300} state={s} />
      </fieldset>
      <fieldset className="admin-fieldset">
        <legend>Publishing</legend>
        <div className="field-row">
          <SelectField name="status" label="Status" required state={s} placeholder="Choose a status" options={[{ value: "draft", label: "Draft (hidden)" }, { value: "scheduled", label: "Scheduled (publishes at the date below)" }, { value: "published", label: "Published" }]} />
          <TextField name="publish_at" label="Publish date and time" type="datetime-local" required state={s} />
        </div>
        <div className="choice">
          <input type="checkbox" id="is_featured" name="is_featured" defaultChecked={values.is_featured === "on"} />
          <label htmlFor="is_featured">Feature this article at the top of the News page</label>
        </div>
      </fieldset>
      <fieldset className="admin-fieldset">
        <legend>Search and sharing</legend>
        <TextField name="seo_title" label="Search title" hint="Optional. Up to 70 characters. Defaults to the article title." maxLength={70} state={s} />
        <TextArea name="meta_description" label="Search description" hint="Optional. Up to 160 characters. Defaults to the excerpt." rows={2} maxLength={160} state={s} />
      </fieldset>
      <div className="form-actions">
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create post"}
        </button>
      </div>
    </form>
  );
}
