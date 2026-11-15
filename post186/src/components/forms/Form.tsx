"use client";

import {
  createContext,
  use,
  useActionState,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Alert, Check } from "@/components/icons";
import { IDLE, type FormState } from "@/lib/validation";

/**
 * A small form kit shared by the public forms and the admin area.
 *
 * Every form posts to a server action that returns a FormState. Fields look
 * up their own error and previously typed value by name, so a form with a
 * mistake comes back filled in with the problem marked next to the field.
 * Forms work without JavaScript; with it, they also show a busy state.
 */

type Ctx = { state: FormState; pending: boolean };
const FormContext = createContext<Ctx>({ state: IDLE, pending: false });

export function useForm(): Ctx {
  return use(FormContext);
}

export type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

type FormProps = {
  action: FormAction;
  children: ReactNode;
  className?: string;
  /** Replaces the whole form after a successful submit. */
  success?: (state: FormState) => ReactNode;
};

/**
 * Pages stay alive in the background when a visitor moves around the site, so
 * a form would otherwise still show what was typed (or its "sent" message) on
 * the next visit. Keying on bfcacheId gives a clean form each time someone
 * arrives by a link, and restores their draft if they use the Back button.
 */
export function Form(props: FormProps) {
  const { bfcacheId } = useRouter();
  return <FormBody key={bfcacheId} {...props} />;
}

function FormBody({ action, children, className, success }: FormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE);

  if (state.status === "success" && success) {
    return <FormContext value={{ state, pending }}>{success(state)}</FormContext>;
  }

  return (
    <FormContext value={{ state, pending }}>
      <form action={formAction} className={className} noValidate>
        {children}
      </form>
    </FormContext>
  );
}

/** Announces the result of the last submit and, on error, moves focus to it. */
export function FormAlert({ className = "" }: { className?: string }) {
  const { state } = useForm();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle" && state.message) ref.current?.focus();
  }, [state]);

  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  const count = Object.keys(state.errors ?? {}).length;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-md border-l-4 px-4 py-3 font-semibold ${
        isError ? "border-flag bg-bad-soft text-flag-dark" : "border-ok bg-ok-soft text-ok"
      } ${className}`}
    >
      {isError ? <Alert size={22} className="mt-0.5 flex-none" /> : <Check size={22} className="mt-0.5 flex-none" />}
      <p>
        {state.message}
        {isError && count > 1 ? ` (${count} fields need attention.)` : ""}
      </p>
    </div>
  );
}

type BaseField = {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  /** Hide the "(optional)" note, for fields where a default is always chosen. */
  plain?: boolean;
  className?: string;
};

function useField(name: string, hint: ReactNode) {
  const { state } = useForm();
  const id = useId();
  const error = state.errors?.[name];
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return {
    id,
    error,
    submitted: state.values,
    aria: {
      "aria-invalid": error ? (true as const) : undefined,
      "aria-describedby": described || undefined,
    },
  };
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  plain,
  className,
  children,
}: BaseField & { id: string; error?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required ? (
          <span className="ml-1 font-semibold text-flag-dark" aria-hidden="true">
            *
          </span>
        ) : plain ? null : (
          <span className="text-[0.875rem] font-normal text-body"> (optional)</span>
        )}
      </label>
      {children}
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          <Alert size={17} className="mt-0.5 flex-none" />
          {error}
        </span>
      )}
    </div>
  );
}

type TextFieldProps = BaseField & {
  type?: "text" | "email" | "tel" | "date" | "time" | "number" | "password" | "url";
  defaultValue?: string | number | null;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  maxLength?: number;
};

export function TextField({ name, label, hint, required, className, type = "text", defaultValue, ...rest }: TextFieldProps) {
  const { id, error, submitted, aria } = useField(name, hint);
  return (
    <FieldShell id={id} name={name} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        className="input"
        required={required}
        defaultValue={type === "password" ? undefined : (submitted?.[name] ?? defaultValue ?? "")}
        {...aria}
        {...rest}
      />
    </FieldShell>
  );
}

/** Same as TextField but the value is owned by the parent (used with the date picker). */
export function ControlledTextField({
  name,
  label,
  hint,
  required,
  className,
  type = "text",
  value,
  onChange,
  ...rest
}: Omit<TextFieldProps, "defaultValue"> & { value: string; onChange: (value: string) => void }) {
  const { id, error, aria } = useField(name, hint);
  return (
    <FieldShell id={id} name={name} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        className="input"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...aria}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  required,
  className,
  defaultValue,
  rows = 5,
  maxLength,
  placeholder,
}: BaseField & { defaultValue?: string; rows?: number; maxLength?: number; placeholder?: string }) {
  const { id, error, submitted, aria } = useField(name, hint);
  return (
    <FieldShell id={id} name={name} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        className="input"
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        defaultValue={submitted?.[name] ?? defaultValue ?? ""}
        {...aria}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  hint,
  required,
  className,
  defaultValue,
  options,
  placeholder,
  plain,
}: BaseField & {
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  const { id, error, submitted, aria } = useField(name, hint);
  return (
    <FieldShell id={id} name={name} label={label} hint={hint} error={error} required={required} plain={plain} className={className}>
      {/* A select only reads defaultValue when it is created, so re-create it when
          a failed submit hands back a different choice. */}
      <select
        key={submitted?.[name] ?? defaultValue ?? ""}
        id={id}
        name={name}
        className="input"
        required={required}
        defaultValue={submitted?.[name] ?? defaultValue ?? ""}
        {...aria}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked = false,
  className = "",
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  defaultChecked?: boolean;
  className?: string;
}) {
  const { id, error, submitted, aria } = useField(name, hint);
  const checked = submitted ? submitted[name] === "on" : defaultChecked;
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input id={id} name={name} type="checkbox" className="check" defaultChecked={checked} {...aria} />
        <div>
          <label htmlFor={id} className="font-semibold text-ink">
            {label}
          </label>
          {hint && (
            <span id={`${id}-hint`} className="hint !mt-0.5">
              {hint}
            </span>
          )}
        </div>
      </div>
      {error && (
        <span id={`${id}-error`} className="field-error">
          <Alert size={17} className="mt-0.5 flex-none" />
          {error}
        </span>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Sending…",
  className = "btn btn-red",
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useForm();
  return (
    <button type="submit" className={className} aria-disabled={pending} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Spam trap: a field real visitors never see. Bots that fill it in are ignored. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
