"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/auth/actions";
import { PasswordField } from "@/components/ui/PasswordField";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert error={state?.error} />
      <Field
        label="Email or mobile number"
        name="identifier"
        type="text"
        inputMode="email"
        autoComplete="username"
        placeholder="you@example.com"
        required
        autoFocus
        defaultValue={state?.values?.identifier}
        error={state?.fieldErrors?.identifier}
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        error={state?.fieldErrors?.password}
      />
      <SubmitButton pending={pending} pendingLabel="Logging in…">
        Log in
      </SubmitButton>
      <p className="text-center text-[13px] leading-relaxed text-muted">
        <Link href="/forgot-password" className="text-gold underline-offset-4 hover:underline">
          Forgotten your password?
        </Link>{" "}
        We&apos;ll email you a link.
      </p>
    </form>
  );
}
