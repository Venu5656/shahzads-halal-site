"use client";

import { useActionState, useState } from "react";
import { changePhone } from "@/lib/auth/account-actions";
import { PasswordField } from "@/components/ui/PasswordField";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";

export function PhoneForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(changePhone, undefined);
  const [open, setOpen] = useState(false);
  const showForm = open || Boolean(state?.error || state?.fieldErrors);

  return (
    <div className="flex flex-col gap-4">
      <FormAlert notice={state?.notice} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[20px] font-medium">{current}</span>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-line px-4 py-2 text-[14px] font-bold text-muted transition-colors hover:border-line-strong hover:text-cream"
          >
            Change number
          </button>
        ) : null}
      </div>
      {showForm ? (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <FormAlert error={state?.error} />
          <Field
            label="New mobile number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(732) 555-0123"
            required
            autoFocus
            defaultValue={state?.values?.phone}
            error={state?.fieldErrors?.phone}
            hint="You'll log in with this number from now on."
          />
          <PasswordField
            label="Your password"
            name="password"
            autoComplete="current-password"
            error={state?.fieldErrors?.password}
          />
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1 sm:flex-none">
              <SubmitButton pending={pending} pendingLabel="Saving…">
                Change number
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
      ) : null}
    </div>
  );
}
