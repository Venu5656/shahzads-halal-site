"use client";

import { useActionState } from "react";
import { resendAccountVerification } from "@/lib/auth/account-actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";

/**
 * The banner for an address that still needs proving — either the one the
 * account was created with, or a new one waiting to replace it.
 */
export function EmailNotice({
  pendingEmail,
  email,
  verified,
}: {
  pendingEmail: string | null;
  email: string;
  verified: boolean;
}) {
  const [state, action, pending] = useActionState(
    async () => resendAccountVerification(),
    undefined,
  );

  const target = pendingEmail ?? email;

  return (
    <section
      aria-live="polite"
      className="rounded-[26px] border border-gold/35 bg-gold/10 p-6 sm:p-7"
    >
      <h2 className="mb-2 font-display text-[26px] leading-none font-extrabold uppercase text-cream">
        {pendingEmail ? "Confirm your new address" : "Confirm your email"}
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-cream/85">
        {pendingEmail ? (
          <>
            We&apos;ve sent a link to <strong className="text-cream">{pendingEmail}</strong>. Until
            you open it, your account keeps using{" "}
            <strong className="text-cream">{email}</strong>.
          </>
        ) : (
          <>
            We&apos;ve sent a link to <strong className="text-cream">{email}</strong>. Confirming it
            keeps your account recoverable if you ever forget your password.
          </>
        )}
      </p>
      {verified && !pendingEmail ? null : (
        <form action={action} className="flex flex-col gap-4">
          <FormAlert error={state?.error} notice={state?.notice} />
          <div className="sm:max-w-xs">
            <SubmitButton pending={pending} pendingLabel="Sending…" variant="ghost">
              Send the link to {target}
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
