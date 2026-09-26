"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/auth/actions";
import { PasswordField } from "@/components/ui/PasswordField";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/login-policy";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormAlert error={state?.error} />
      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        error={state?.fieldErrors?.newPassword}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. A few random words beat one clever word.`}
      />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save new password
      </SubmitButton>
      <p className="text-center text-[13px] leading-relaxed text-muted">
        Saving this signs you out on every device, including any you&apos;ve forgotten about.
      </p>
    </form>
  );
}
