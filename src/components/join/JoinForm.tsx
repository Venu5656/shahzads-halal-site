"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Checkbox, Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { EMAIL_DISCLOSURE, SMS_DISCLOSURE } from "@/lib/consent/disclosure";
import { joinList } from "@/lib/subscribers/actions";

/**
 * "Tell me about the deals."
 *
 * One required field. No name, no password, no account: none of them are
 * needed to send somebody an offer, and every extra field is a signup lost
 * and one more thing to protect afterwards.
 *
 * The number is optional and the texts box is separate from it, deliberately.
 * Consent to be texted is a different permission from consent to be emailed —
 * in law, and in the plain sense that most people want one and not the other —
 * so bundling them into "sign up for offers" would make both unprovable.
 *
 * The SMS disclosure is the checkbox's own label rather than small print
 * elsewhere on the page. What somebody agreed to is what was attached to the
 * box they ticked.
 */
export function JoinForm() {
  const [state, action, pending] = useActionState(joinList, undefined);

  if (state?.notice) {
    return (
      <div
        role="status"
        className="rounded-3xl border p-7"
        style={{ borderColor: "var(--line)", background: "rgb(242 236 228 / 0.04)" }}
      >
        <p className="kuro-label kuro-label-accent">One more tap</p>
        <p className="kuro-serif mt-3 text-[26px]">Check your email.</p>
        <p className="mt-3 text-[15.5px] leading-[1.7]" style={{ color: "var(--muted)" }}>
          {state.notice}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormAlert error={state?.error} />
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
        hint={EMAIL_DISCLOSURE}
      />
      <Field
        label="Mobile number — optional"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(732) 555-0123"
        defaultValue={state?.values?.phone}
        error={state?.fieldErrors?.phone}
        hint="Only needed if you want the texts. Leave it blank for email only."
      />
      <Checkbox name="smsConsent" error={state?.fieldErrors?.smsConsent}>
        {SMS_DISCLOSURE}
      </Checkbox>
      <SubmitButton pending={pending} pendingLabel="Sending the link…">
        Send me the deals
      </SubmitButton>
      {/* Stated rather than ticked. A checkbox is the right control for the
          texts, where the agreement is the thing being proved; an age box on a
          two-field form costs signups and proves nothing a statement does not,
          since nobody has ever been stopped by one. What it does do is make
          the list not knowingly collected from children, which is the actual
          requirement. */}
      <p className="text-[13px] leading-[1.7]" style={{ color: "var(--muted-dim)" }}>
        For adults — please don&rsquo;t sign up if you&rsquo;re under 16. We keep your address
        to send you offers and for nothing else; see the{" "}
        <Link href="/legal/privacy" className="underline underline-offset-4">
          privacy policy
        </Link>
        . Unsubscribe in one click from any email.
      </p>
    </form>
  );
}
