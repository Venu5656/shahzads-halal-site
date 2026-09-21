"use client";

import { useActionState } from "react";
import { signup } from "@/lib/auth/actions";
import { PasswordField } from "@/components/ui/PasswordField";
import { Checkbox, Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/login-policy";

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signup, undefined);

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
        hint="So we know whose platter it is at the counter."
      />
      <Field
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(732) 555-0123"
        required
        defaultValue={state?.values?.phone}
        error={state?.fieldErrors?.phone}
        hint="This is what you'll log in with, and how we reach you about an order."
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        error={state?.fieldErrors?.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. A few random words beat one clever word.`}
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
        Text me the occasional deal. Unticked by default — you can change this any time.
      </Checkbox>
      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
