"use client";

import { useActionState } from "react";
import { resendVerification } from "@/lib/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";

/**
 * "Send it again". Answers the same way whether or not the address has an
 * unverified account, so it cannot be used to find out who is registered.
 */
export function ResendVerificationForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState(resendVerification, undefined);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert error={state?.error} notice={state?.notice} />
      {defaultEmail ? <input type="hidden" name="email" value={defaultEmail} /> : null}
      {defaultEmail ? null : (
        <Field
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          maxLength={254}
          error={state?.fieldErrors?.email}
        />
      )}
      <SubmitButton pending={pending} pendingLabel="Sending…" variant="ghost">
        Send the link again
      </SubmitButton>
    </form>
  );
}
