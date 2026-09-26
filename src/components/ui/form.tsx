import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Form building blocks for every page after the homepage port. Server- and
 * client-safe: no hooks, no state.
 */

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string;
};

export function Field({ label, name, hint, error, id, className, ...input }: FieldProps) {
  const inputId = id ?? `f-${name}`;
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={[
          "h-14 w-full rounded-2xl border bg-ink px-4 text-[17px] text-cream outline-none",
          "placeholder:text-muted/60 transition-[border-color,box-shadow] duration-300",
          "focus:border-gold focus:shadow-[0_0_0_4px_rgb(245_181_61/0.15)]",
          error ? "border-brand-2" : "border-line hover:border-line-strong",
          className ?? "",
        ].join(" ")}
        {...input}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-brand-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  name,
  children,
  defaultChecked,
  error,
}: {
  name: string;
  children: ReactNode;
  defaultChecked?: boolean;
  error?: string;
}) {
  const box = (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug text-muted">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        aria-invalid={error ? true : undefined}
        className="peer mt-0.5 grid size-5 shrink-0 cursor-pointer appearance-none place-content-center rounded-md border border-line-strong bg-ink transition-colors duration-200 checked:border-brand checked:bg-brand checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%223.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M5%2012.5l4.5%204.5L19%207%22/%3E%3C/svg%3E')] checked:bg-[length:14px] checked:bg-center checked:bg-no-repeat hover:border-cream/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      />
      <span>{children}</span>
    </label>
  );

  if (!error) return box;
  return (
    <div className="flex flex-col gap-2">
      {box}
      <p role="alert" className="text-sm font-medium text-brand-2">
        {error}
      </p>
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
  pendingLabel,
  variant = "red",
}: {
  children: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
  variant?: "red" | "ghost";
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`btn btn-${variant} w-full justify-center disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
      {!pending && variant === "red" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      ) : null}
    </button>
  );
}

export function FormAlert({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null;
  return error ? (
    <p
      role="alert"
      className="rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-[15px] text-cream"
    >
      {error}
    </p>
  ) : (
    <p
      role="status"
      className="rounded-2xl border border-herb/40 bg-herb/10 px-4 py-3 text-[15px] text-cream"
    >
      {notice}
    </p>
  );
}
