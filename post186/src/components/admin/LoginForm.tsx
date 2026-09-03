"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { initialFormState } from "@/components/forms/fields";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialFormState);
  return (
    <form action={action} className="form">
      {state.errors.form ? (
        <div className="form-summary" role="alert">
          <p style={{ margin: 0 }}>{state.errors.form}</p>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" autoComplete="username" required defaultValue={state.values.username ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn-secondary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
