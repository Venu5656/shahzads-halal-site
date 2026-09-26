/**
 * Both legal pages are placeholders. They describe what the software actually
 * does with personal data — which I can state accurately — but the binding
 * text has to come from the owner's lawyer. Tracked in OPEN-QUESTIONS.md.
 */
export function DraftNotice() {
  return (
    <p className="mb-8 rounded-2xl border border-brand-2/40 bg-brand/10 p-5 text-[15px] leading-relaxed text-cream">
      <strong>Draft — not yet reviewed.</strong> This page describes how the site currently
      handles your information. It has not been checked by a lawyer and is not the final
      policy. Questions in the meantime: <a href="tel:+18482021430" className="text-gold underline-offset-4 hover:underline">(848) 202-1430</a>.
    </p>
  );
}
