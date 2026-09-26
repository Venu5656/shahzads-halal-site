"use client";

import { useActionState } from "react";
import { signup } from "@/lib/auth/actions";
import { PasswordField } from "@/components/ui/PasswordField";
import { Checkbox, Field, FormAlert, SubmitButton } from "@/components/ui/form";
import Link from "next/link";
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
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        maxLength={254}
        defaultValue={state?.values?.email}
        error={state?.fieldErrors?.email}
        hint="We'll send a link here to confirm it's yours before you can order."
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
        hint="How the kitchen reaches you about a pickup order."
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        error={state?.fieldErrors?.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. A few random words beat one clever word.`}
      />
      <div className="flex flex-col gap-4">
        <Checkbox name="acceptTerms" error={state?.fieldErrors?.acceptTerms}>
          I agree to the{" "}
          <Link href="/legal/terms" className="text-gold underline-offset-4 hover:underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-gold underline-offset-4 hover:underline">
            privacy policy
          </Link>
          .
        </Checkbox>
        <Checkbox name="marketingOptIn">
          Email me the occasional deal. Unticked by default — you can change this any time.
        </Checkbox>
      </div>
      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
