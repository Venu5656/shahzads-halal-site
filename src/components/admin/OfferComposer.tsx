"use client";

import { useActionState, useState } from "react";
import { sendOffer, testOffer } from "@/lib/offers/actions";
import { MAX_PARAGRAPHS } from "@/lib/offers/compose";

/**
 * Writing an offer.
 *
 * Five boxes, and the order they are in is the order somebody meets the email:
 * the subject line in the inbox, the heading at the top, the words, the button,
 * where the button goes.
 *
 * Two submit buttons on one form, and they are deliberately not alike. The test
 * send goes to whoever is signed in and nowhere else. The real send needs the
 * word SEND typed into a box first, because it is the only button on this site
 * that cannot be taken back, and a misplaced thumb on a phone behind a counter
 * should not be able to mail four hundred people.
 */
export function OfferComposer({ audience, from }: { audience: number; from: string }) {
  const [test, testAction, testing] = useActionState(testOffer, undefined);
  const [send, sendAction, sending] = useActionState(sendOffer, undefined);
  const [confirm, setConfirm] = useState("");

  // Whichever action ran last is the one with something to say.
  const state = send ?? test;
  const values = state?.values ?? {};
  const armed = confirm.trim().toUpperCase() === "SEND";

  const box = (
    label: string,
    name: string,
    hint: string,
    extra?: { multiline?: boolean; defaultValue?: string; maxLength?: number },
  ) => (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={`o-${name}`}
        className="kuro-label"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </label>
      {extra?.multiline ? (
        <textarea
          id={`o-${name}`}
          name={name}
          rows={9}
          defaultValue={values[name] ?? extra?.defaultValue ?? ""}
          maxLength={extra?.maxLength}
          className="w-full rounded-2xl border p-4 text-[16px] leading-[1.7] outline-none"
          style={{
            borderColor: state?.fieldErrors?.[name] ? "var(--accent)" : "var(--line)",
            background: "rgb(242 236 228 / 0.04)",
            color: "var(--ink)",
          }}
        />
      ) : (
        <input
          id={`o-${name}`}
          name={name}
          type="text"
          defaultValue={values[name] ?? extra?.defaultValue ?? ""}
          maxLength={extra?.maxLength}
          className="h-13 w-full rounded-2xl border px-4 py-3.5 text-[16px] outline-none"
          style={{
            borderColor: state?.fieldErrors?.[name] ? "var(--accent)" : "var(--line)",
            background: "rgb(242 236 228 / 0.04)",
            color: "var(--ink)",
          }}
        />
      )}
      {state?.fieldErrors?.[name] ? (
        <p role="alert" className="text-[13.5px]" style={{ color: "var(--accent)" }}>
          {state.fieldErrors[name]}
        </p>
      ) : (
        <p className="text-[13.5px]" style={{ color: "var(--muted-dim)" }}>
          {hint}
        </p>
      )}
    </div>
  );

  return (
    <form className="flex flex-col gap-7">
      {state?.error ? (
        <p
          role="alert"
          className="rounded-2xl border p-4 text-[15px]"
          style={{ borderColor: "var(--accent)", color: "var(--ink)" }}
        >
          {state.error}
        </p>
      ) : null}
      {state?.notice ? (
        <p
          role="status"
          className="rounded-2xl border p-4 text-[15px]"
          style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
        >
          {state.notice}
        </p>
      ) : null}

      {box("Subject", "subject", "What they see in the inbox. Keep it under about 50 characters or it gets cut off.", { maxLength: 120 })}
      {box("Heading", "heading", "The big line at the top of the email.", { maxLength: 90 })}
      {box(
        "The offer",
        "body",
        `Leave a blank line between paragraphs. Up to ${MAX_PARAGRAPHS} — nobody reads more.`,
        { multiline: true, maxLength: 4000 },
      )}
      {box("Button", "buttonLabel", "What the button says, e.g. “See the menu”.", {
        defaultValue: "See the menu",
        maxLength: 40,
      })}
      {box("Button goes to", "url", "A path on this site like /menu, or a full https:// link.", {
        defaultValue: "/menu",
        maxLength: 500,
      })}

      <div className="flex flex-col gap-5 border-t pt-7" style={{ borderColor: "var(--line)" }}>
        <button
          type="submit"
          formAction={testAction}
          disabled={testing || sending}
          className="self-start rounded-full border px-6 py-3.5 text-[15px] font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--line-strong)", color: "var(--ink)" }}
        >
          {testing ? "Sending…" : `Send one to me (${from})`}
        </button>

        <div className="flex flex-col gap-3">
          <label htmlFor="o-confirm" className="text-[15px]" style={{ color: "var(--muted)" }}>
            This goes to <strong style={{ color: "var(--ink)" }}>{audience}</strong>{" "}
            {audience === 1 ? "person" : "people"} and cannot be taken back. Type{" "}
            <strong style={{ color: "var(--ink)" }}>SEND</strong> to confirm.
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="o-confirm"
              name="confirm"
              type="text"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-13 w-[140px] rounded-2xl border px-4 py-3.5 text-[16px] tracking-[0.1em] outline-none"
              style={{
                borderColor: "var(--line)",
                background: "rgb(242 236 228 / 0.04)",
                color: "var(--ink)",
              }}
            />
            <button
              type="submit"
              formAction={sendAction}
              disabled={!armed || sending || testing || audience === 0}
              className="kuro-cta disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send it"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
