"use client";

import { useActionState } from "react";
import { startLogin } from "@/lib/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(startLogin, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert error={state?.error} />
      <Field
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(732) 555-0123"
        required
        autoFocus
        defaultValue={state?.values?.phone}
        error={state?.fieldErrors?.phone}
      />
      <SubmitButton pending={pending} pendingLabel="Sending code…">
        Text me a code
      </SubmitButton>
      <p className="text-center text-[13px] leading-relaxed text-muted">
        We&apos;ll text a 6-digit code to sign you in — no password to remember.
        Msg &amp; data rates may apply.
      </p>
    </form>
  );
}
