"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/lib/auth/account-actions";
import { PasswordField } from "@/components/ui/PasswordField";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/login-policy";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const [open, setOpen] = useState(false);
  const showForm = open || Boolean(state?.error || state?.fieldErrors);

  return (
    <div className="flex flex-col gap-4">
      <FormAlert notice={state?.notice} />
      {!showForm ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[20px] tracking-[0.2em] text-muted">••••••••</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-line px-4 py-2 text-[14px] font-bold text-muted transition-colors hover:border-line-strong hover:text-cream"
          >
            Change password
          </button>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <FormAlert error={state?.error} />
          <PasswordField
            label="Current password"
            name="currentPassword"
            autoComplete="current-password"
            autoFocus
            error={state?.fieldErrors?.currentPassword}
          />
          <PasswordField
            label="New password"
            name="newPassword"
            autoComplete="new-password"
            error={state?.fieldErrors?.newPassword}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters. Changing it signs out every other device.`}
          />
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1 sm:flex-none">
              <SubmitButton pending={pending} pendingLabel="Saving…">
                Change password
              </SubmitButton>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2 text-[15px] font-bold text-muted hover:text-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
