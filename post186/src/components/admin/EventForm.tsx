"use client";

import { useActionState } from "react";
import { saveEventAction } from "@/app/admin/actions";
import { ErrorSummary, SelectField, TextArea, TextField, initialFormState, type FormState } from "@/components/forms/fields";

type Props = {
  id: number | null;
  initial: Record<string, string>;
  categories: Array<{ slug: string; name: string }>;
};

export function EventForm({ id, initial, categories }: Props) {
  const bound = saveEventAction.bind(null, id);
  const [state, action, pending] = useActionState(bound, { ...initialFormState, values: initial } satisfies FormState);
  const values = Object.keys(state.values).length ? state.values : initial;
  const s: FormState = { ...state, values };

  return (
    <form action={action} className="form" style={{ maxWidth: "52rem" }}>
      <ErrorSummary state={s} />
      <fieldset className="admin-fieldset">
        <legend>Event</legend>
        <TextField name="title" label="Title" required maxLength={200} state={s} />
        <TextField name="slug" label="Web address (slug)" hint="Leave blank to create one from the title." maxLength={80} state={s} />
        <TextArea name="summary" label="Summary" hint="One sentence shown on cards and in calendar downloads." rows={2} maxLength={300} state={s} />
        <TextArea name="description" label="Full description" hint="Blank line between paragraphs. Use - for a list item and [link text](https://...) for links." rows={10} maxLength={20000} state={s} />
        <SelectField name="category" label="Category" state={s} placeholder="No category" options={categories.map((c) => ({ value: c.slug, label: c.name }))} />
      </fieldset>
      <fieldset className="admin-fieldset">
        <legend>When and where</legend>
        <div className="field-row">
          <TextField name="start_at" label="Starts" type="datetime-local" required state={s} />
          <TextField name="end_at" label="Ends" type="datetime-local" required state={s} />
        </div>
        <div className="choice">
          <input type="checkbox" id="all_day" name="all_day" defaultChecked={values.all_day === "on"} />
          <label htmlFor="all_day">All-day event (times are ignored)</label>
        </div>
        <TextField name="location" label="Location" hint="Leave blank for the Post hall at 101 French Street." maxLength={200} state={s} />
        <TextField name="recurrence" label="Repeats" hint="Describe the pattern, for example: Second Tuesday of every month. Each date still needs its own event." maxLength={200} state={s} />
      </fieldset>
      <fieldset className="admin-fieldset">
        <legend>Details</legend>
        <div className="field-row">
          <TextField name="organizer" label="Organizer or contact" maxLength={200} state={s} />
          <TextField name="cost" label="Cost" hint="For example: Free, or $25 per person" maxLength={120} state={s} />
        </div>
        <div className="field-row">
          <TextField name="link_url" label="Registration or external link" type="url" maxLength={500} state={s} />
          <TextField name="link_label" label="Link button text" hint="For example: Register online" maxLength={80} state={s} />
        </div>
        <TextArea name="accessibility_notes" label="Accessibility notes" rows={2} maxLength={1000} state={s} />
        <TextField name="featured_image" label="Image path" hint="For example /images/fish-fry.jpg after uploading to public/images" maxLength={300} state={s} />
        <TextField name="image_alt" label="Image description (alt text)" maxLength={300} state={s} />
      </fieldset>
      <fieldset className="admin-fieldset">
        <legend>Visibility and status</legend>
        <div className="choice">
          <input type="checkbox" id="is_public" name="is_public" defaultChecked={values.is_public === "on"} />
          <label htmlFor="is_public">Show on the public calendar (leave unchecked for private rentals and internal meetings)</label>
        </div>
        <div className="choice">
          <input type="checkbox" id="is_featured" name="is_featured" defaultChecked={values.is_featured === "on"} />
          <label htmlFor="is_featured">Featured event</label>
        </div>
        <div className="choice">
          <input type="checkbox" id="is_archived" name="is_archived" defaultChecked={values.is_archived === "on"} />
          <label htmlFor="is_archived">Archived (hidden everywhere, kept for records)</label>
        </div>
        <SelectField name="status" label="Status" required state={s} placeholder="Choose a status" options={[{ value: "scheduled", label: "Scheduled" }, { value: "postponed", label: "Postponed" }, { value: "cancelled", label: "Cancelled" }]} />
      </fieldset>
      <div className="form-actions">
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create event"}
        </button>
      </div>
    </form>
  );
}
