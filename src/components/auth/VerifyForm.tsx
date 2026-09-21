"use client";

import { useActionState, useEffect, useState } from "react";
import { resendCode, submitCode } from "@/lib/auth/actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { OTP_LENGTH, OTP_RESEND_COOLDOWN_MS } from "@/lib/auth/otp-policy";

export function VerifyForm({ next, sentAt }: { next: string; sentAt: number }) {
  const [state, action, pending] = useActionState(submitCode, undefined);
  const [resendState, resend, resending] = useActionState(resendCode, undefined);
  const [code, setCode] = useState("");

  // Count down to when "Send a new code" unlocks.
  const lastSent = resendState?.sentAt ?? sentAt;
  const [now, setNow] = useState(sentAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const wait = Math.max(0, Math.ceil((lastSent + OTP_RESEND_COOLDOWN_MS - now) / 1000));

  const error = state?.error ?? resendState?.error;
  const notice = !state?.error ? resendState?.notice : undefined;

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormAlert error={error} notice={notice} />
        <div className="flex flex-col gap-2">
          <label
            htmlFor="f-code"
            className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted"
          >
            6-digit code
          </label>
          <input
            id="f-code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={OTP_LENGTH}
            required
            autoFocus
            aria-invalid={state?.fieldErrors?.code ? true : undefined}
            aria-describedby={state?.fieldErrors?.code ? "f-code-error" : undefined}
            placeholder="••••••"
            className="h-16 w-full rounded-2xl border border-line bg-ink text-center font-display text-[40px] font-extrabold tracking-[0.45em] text-cream outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-muted/40 hover:border-line-strong focus:border-gold focus:shadow-[0_0_0_4px_rgb(245_181_61/0.15)]"
          />
          {state?.fieldErrors?.code ? (
            <p id="f-code-error" role="alert" className="text-sm font-medium text-brand-2">
              {state.fieldErrors.code}
            </p>
          ) : null}
        </div>
        <SubmitButton pending={pending} pendingLabel="Checking…">
          Continue
        </SubmitButton>
      </form>

      <form action={resend} className="text-center">
        <button
          type="submit"
          disabled={wait > 0 || resending}
          className="rounded-full px-4 py-2 text-[15px] font-bold text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
        >
          {resending ? "Sending…" : wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
        </button>
      </form>
    </div>
  );
}
