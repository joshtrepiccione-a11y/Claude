"use client";

import type { ReactNode } from "react";

export type FormState = {
  ok: boolean;
  errors: Record<string, string>;
  values: Record<string, string>;
  message?: string;
};

export const initialFormState: FormState = { ok: false, errors: {}, values: {} };

type BaseProps = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  state: FormState;
};

function Wrapper({
  name,
  label,
  hint,
  required,
  state,
  children,
}: BaseProps & { children: (ids: { describedBy?: string; invalid: boolean }) => ReactNode }) {
  const error = state.errors[name];
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={name}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : <span className="meta"> (optional)</span>}
      </label>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {children({ describedBy, invalid: Boolean(error) })}
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField(props: BaseProps & { type?: string; autoComplete?: string; maxLength?: number; min?: number; max?: number; inputMode?: "numeric" | "tel" | "email" | "text" }) {
  const { name, type = "text", autoComplete, maxLength, min, max, inputMode, required } = props;
  return (
    <Wrapper {...props}>
      {({ describedBy, invalid }) => (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={props.state.values[name] ?? ""}
          required={required}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete={autoComplete}
          maxLength={maxLength}
          min={min}
          max={max}
          inputMode={inputMode}
        />
      )}
    </Wrapper>
  );
}

export function TextArea(props: BaseProps & { rows?: number; maxLength?: number }) {
  const { name, rows = 5, maxLength, required } = props;
  return (
    <Wrapper {...props}>
      {({ describedBy, invalid }) => (
        <textarea
          id={name}
          name={name}
          rows={rows}
          defaultValue={props.state.values[name] ?? ""}
          required={required}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          maxLength={maxLength}
        />
      )}
    </Wrapper>
  );
}

export function SelectField(props: BaseProps & { options: Array<{ value: string; label: string }>; placeholder?: string }) {
  const { name, options, placeholder = "Choose one", required } = props;
  return (
    <Wrapper {...props}>
      {({ describedBy, invalid }) => (
        <select
          id={name}
          name={name}
          defaultValue={props.state.values[name] ?? ""}
          required={required}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Wrapper>
  );
}

export function RadioGroup(props: BaseProps & { options: Array<{ value: string; label: string }> }) {
  const { name, label, hint, options, state, required } = props;
  const error = state.errors[name];
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className={`field${error ? " has-error" : ""}`} aria-describedby={describedBy}>
      <legend>
        {label}
        {required ? (
          <>
            <span aria-hidden="true"> *</span>
            <span className="visually-hidden"> (required)</span>
          </>
        ) : null}
      </legend>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        return (
          <div className="choice" key={o.value}>
            <input type="radio" id={id} name={name} value={o.value} defaultChecked={state.values[name] === o.value} required={required} />
            <label htmlFor={id}>{o.label}</label>
          </div>
        );
      })}
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function ConsentBox({ state, text }: { state: FormState; text: string }) {
  const error = state.errors.consent;
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <div className="choice">
        <input type="checkbox" id="consent" name="consent" required aria-describedby={error ? "consent-error" : undefined} aria-invalid={error ? true : undefined} defaultChecked={state.values.consent === "on"} />
        <label htmlFor="consent">{text}</label>
      </div>
      {error ? (
        <p className="field-error" id="consent-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Honeypot() {
  return (
    <div className="honeypot" aria-hidden="true">
      <label htmlFor="website">Leave this field empty</label>
      <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

export function ErrorSummary({ state }: { state: FormState }) {
  const entries = Object.entries(state.errors);
  if (!entries.length) return null;
  return (
    <div className="form-summary" role="alert" tabIndex={-1} id="form-errors">
      <h2>Please check {entries.length === 1 ? "one thing" : `${entries.length} things`} before sending</h2>
      <ul>
        {entries.map(([field, msg]) => (
          <li key={field}>
            {field === "form" ? msg : <a href={`#${field}`}>{msg}</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}
