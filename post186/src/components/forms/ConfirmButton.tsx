"use client";

import type { ReactNode } from "react";

/** A submit button that asks "are you sure?" first. Used for deletes. */
export function ConfirmButton({
  message,
  children,
  className = "btn btn-danger btn-sm",
  name,
  value,
}: {
  message: string;
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
