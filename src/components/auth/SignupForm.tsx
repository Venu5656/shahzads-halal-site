"use client";

import { useActionState } from "react";
import { startSignup } from "@/lib/auth/actions";
import { Checkbox, Field, FormAlert, SubmitButton } from "@/components/ui/form";

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(startSignup, undefined);

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
      <SubmitButton pending={pending} pendingLabel="Sending code…">
        Create account
      </SubmitButton>
      <p className="text-center text-[13px] leading-relaxed text-muted">
        We&apos;ll text a 6-digit code to confirm your number, and use it to text you when
        your order is ready. Msg &amp; data rates may apply.
      </p>
    </form>
  );
}
