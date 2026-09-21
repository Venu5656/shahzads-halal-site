"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/auth/account-actions";
import { Checkbox, Field, FormAlert, SubmitButton } from "@/components/ui/form";

export function ProfileForm({
  name,
  email,
  marketingOptIn,
}: {
  name: string;
  email: string | null;
  marketingOptIn: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormAlert error={state?.error} notice={state?.notice} />
      <Field
        label="Name"
        name="name"
        autoComplete="name"
        required
        maxLength={60}
        defaultValue={state?.values?.name ?? name}
        error={state?.fieldErrors?.name}
      />
      <Field
        label="Email (optional)"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        placeholder="for receipts"
        defaultValue={state?.values?.email ?? email ?? ""}
        error={state?.fieldErrors?.email}
      />
      <Checkbox name="marketingOptIn" defaultChecked={marketingOptIn}>
        Text me the occasional deal.
      </Checkbox>
      <div className="sm:max-w-[220px]">
        <SubmitButton pending={pending} pendingLabel="Saving…" variant="ghost">
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}
