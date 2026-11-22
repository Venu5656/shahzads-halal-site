/**
 * The wording somebody agrees to, and its version.
 *
 * This is a module rather than a string in a JSX file for one reason: the
 * ledger records which version was on the screen, and a version number that
 * lives somewhere other than the words it names will eventually disagree with
 * them. Change the words, change the version, in the same edit.
 *
 * The rule for bumping: any change to what is being agreed to — who sends,
 * what they send, how often, what it costs, how to stop — is a new version.
 * Fixing a typo in "Shahzad's" is not.
 *
 * Old versions are kept here deliberately. A ledger row from 2026 names
 * "2026-11-email-v1", and in two years somebody will need to read the words
 * that row refers to. A version string pointing at wording nobody kept is a
 * version string pointing at nothing.
 */

export const EMAIL_DISCLOSURE_VERSION = "2026-11-email-v1";
export const SMS_DISCLOSURE_VERSION = "2026-11-sms-v1";

/** Shown beside the email field. Email marketing is opt-out in US law, but a
 *  list built without saying what it is gets marked as spam, which costs more
 *  than it saves. */
export const EMAIL_DISCLOSURE =
  "We'll email you Shahzad's offers and new menu items — a few times a month, " +
  "never more than weekly. Unsubscribe from any email, in one click.";

/**
 * Shown beside the SMS checkbox, and it is the checkbox's label in substance.
 *
 * Every clause here is load-bearing. The TCPA puts the burden of proving
 * consent on the sender, and the things that have to be proved are that the
 * person agreed to texts specifically (not "to hear from us"), that they knew
 * who was texting, that they knew it was automated, that they knew it was not
 * a condition of anything, that they were told about message rates, and that
 * they were told how to stop. Dropping any one of them is the difference
 * between evidence and a boolean.
 */
export const SMS_DISCLOSURE =
  "Text me offers from Shahzad's Halal Food at the number above. " +
  "Recurring automated marketing texts, up to 4 a month. " +
  "Consent is not a condition of any purchase. " +
  "Message and data rates may apply. Reply STOP to stop, HELP for help.";

/** Where a consent happened. Written into the ledger as `source`. */
export type ConsentSource =
  | "join-form"
  | "email-confirm"
  | "unsubscribe-link"
  | "sms-stop"
  | "counter";
