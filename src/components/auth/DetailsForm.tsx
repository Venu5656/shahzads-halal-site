"use client";

import { useActionState } from "react";
import { finishSignup } from "@/lib/auth/actions";
import { Checkbox, Field, FormAlert, SubmitButton } from "@/components/ui/form";

export function DetailsForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(finishSignup, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert error={state?.error} />
      <Field
        label="Your name"
        name="name"
        autoComplete="name"
        placeholder="First name is fine"
        required
        autoFocus
        maxLength={60}
        defaultValue={state?.values?.name}
        error={state?.fieldErrors?.name}
      />
      <Field
        label="Email (optional)"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="for receipts"
        maxLength={254}
        defaultValue={state?.values?.email}
        error={state?.fieldErrors?.email}
      />
      <Checkbox name="marketingOptIn">
        Text me the occasional deal. You can change this any time.
      </Checkbox>
      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
