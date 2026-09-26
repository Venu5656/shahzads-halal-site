"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormAlert error={state?.error} notice={state?.notice} />
      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        autoFocus
        maxLength={254}
        defaultValue={state?.values?.email}
        error={state?.fieldErrors?.email}
      />
      <SubmitButton pending={pending} pendingLabel="Sending…">
        Email me a reset link
      </SubmitButton>
    </form>
  );
}
