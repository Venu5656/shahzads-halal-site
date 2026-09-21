"use client";

import { useState } from "react";
import { Field } from "./form";

/** A password box with a show/hide toggle — fewer typos at 2 AM on a phone. */
export function PasswordField({
  label,
  name,
  autoComplete,
  error,
  hint,
  autoFocus,
}: {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <Field
        label={label}
        name={name}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required
        autoFocus={autoFocus}
        error={error}
        hint={hint}
        className="pr-20"
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-pressed={shown}
        className="absolute top-[34px] right-3 rounded-full px-3 py-2 text-[13px] font-bold tracking-wide text-muted uppercase transition-colors hover:bg-cream/5 hover:text-cream"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
