"use client";

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
        Forgotten your password? Call the store on{" "}
        <a href="tel:+18482021430" className="text-gold underline-offset-4 hover:underline">
          (848) 202-1430
        </a>{" "}
        and we&apos;ll sort it out.
      </p>
    </form>
  );
}
