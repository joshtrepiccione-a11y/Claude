"use client";

import { useActionState } from "react";
import { saveContentAction } from "@/app/admin/actions";
import { initialFormState } from "@/components/forms/fields";

type Field = { key: string; label: string; group: string; help: string; multiline?: boolean; draft?: string; fact?: boolean };

export function ContentForm({ fields, groups, stored }: { fields: Field[]; groups: string[]; stored: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveContentAction, initialFormState);
  const values = Object.keys(state.values).length ? state.values : stored;

  return (
    <form action={action} className="form" style={{ maxWidth: "52rem" }}>
      {state.ok && state.message ? (
        <div className="notice notice-success" role="status">
          <p>{state.message}</p>
        </div>
      ) : null}
      {groups.map((group) => (
        <fieldset className="admin-fieldset" key={group}>
          <legend>{group}</legend>
          {fields
            .filter((f) => f.group === group)
            .map((f) => {
              const hintId = `${f.key}-hint`;
              const hint = [f.help, f.fact ? "Fact: leave blank until verified; blank stays hidden on the public site." : "Draft copy is shown publicly until you replace it here."].filter(Boolean).join(" ");
              return (
                <div className="field" key={f.key}>
                  <label htmlFor={f.key}>{f.label}</label>
                  <p className="hint" id={hintId}>
                    {hint}
                  </p>
                  {f.multiline ? (
                    <textarea id={f.key} name={f.key} rows={f.draft ? 6 : 3} defaultValue={values[f.key] ?? ""} placeholder={f.draft ? "Currently showing draft copy" : ""} aria-describedby={hintId} />
                  ) : (
                    <input id={f.key} name={f.key} type="text" defaultValue={values[f.key] ?? ""} aria-describedby={hintId} />
                  )}
                  {f.draft && !(values[f.key] ?? "").trim() ? (
                    <details style={{ marginTop: "0.4rem" }}>
                      <summary className="meta">Show the draft copy currently displayed</summary>
                      <pre style={{ whiteSpace: "pre-wrap", font: "inherit", background: "var(--light-gray)", padding: "0.75rem", borderRadius: "4px" }}>{f.draft}</pre>
                    </details>
                  ) : null}
                </div>
              );
            })}
        </fieldset>
      ))}
      <div className="form-actions">
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? "Saving…" : "Save site content"}
        </button>
      </div>
    </form>
  );
}
