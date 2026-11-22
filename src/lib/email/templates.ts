import "server-only";
import type { Mail } from "./mailer";

/**
 * The two transactional emails, in the restaurant's voice and colours.
 *
 * Both are written text-first: plenty of people read mail as plain text, and
 * spam filters treat an HTML-only message with suspicion. The HTML is
 * deliberately plain — table-free, inline styles, no images, no web fonts —
 * because that is what survives Gmail, Outlook and the rest intact.
 */

const BRAND = {
  bg: "#0d0907",
  card: "#1b140f",
  cream: "#f6ecdc",
  muted: "#b3a393",
  red: "#e23a2f",
  gold: "#f5b53d",
  line: "rgba(246,236,220,.14)",
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function shell(options: {
  heading: string;
  body: string[];
  buttonLabel: string;
  url: string;
  footnote: string;
}): string {
  const paragraphs = options.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.cream}">${escapeHtml(line)}</p>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:32px 16px;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:18px;padding:36px 32px">
    <div style="font-size:13px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:${BRAND.gold};margin-bottom:22px">Shahzad's Halal Food</div>
    <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:${BRAND.cream}">${escapeHtml(options.heading)}</h1>
    ${paragraphs}
    <p style="margin:28px 0">
      <a href="${options.url}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:${BRAND.red};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none">${escapeHtml(options.buttonLabel)}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.muted}">Or paste this into your browser:</p>
    <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:${BRAND.muted};word-break:break-all">${options.url}</p>
    <p style="margin:0;padding-top:20px;border-top:1px solid ${BRAND.line};font-size:13px;line-height:1.6;color:${BRAND.muted}">${escapeHtml(options.footnote)}</p>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${BRAND.muted}">152 Easton Ave, New Brunswick, NJ 08901 · (848) 202-1430</p>
  </div>
</body>
</html>`;
}

export function verificationEmail(options: {
  to: string;
  name: string;
  url: string;
  hours: number;
}): Mail {
  const body = [
    `Hi ${options.name}, thanks for signing up.`,
    "Confirm this address and your account is ready to order from.",
  ];
  return {
    to: options.to,
    tag: "verify",
    subject: "Confirm your email — Shahzad's Halal Food",
    text: [
      `Hi ${options.name}, thanks for signing up at Shahzad's Halal Food.`,
      "",
      "Confirm your email address by opening this link:",
      options.url,
      "",
      `The link works for ${options.hours} hours and can only be used once.`,
      "If you didn't sign up, you can ignore this — no account will be used.",
      "",
      "Shahzad's Halal Food",
      "152 Easton Ave, New Brunswick, NJ 08901 · (848) 202-1430",
    ].join("\n"),
    html: shell({
      heading: "Confirm your email",
      body,
      buttonLabel: "Confirm my email",
      url: options.url,
      footnote: `The link works for ${options.hours} hours and can only be used once. If you didn't sign up, ignore this email — no account will be used.`,
    }),
  };
}

export function passwordResetEmail(options: {
  to: string;
  name: string;
  url: string;
  minutes: number;
}): Mail {
  const body = [
    `Hi ${options.name}, someone asked to reset the password on this account.`,
    "If that was you, choose a new one here.",
  ];
  return {
    to: options.to,
    tag: "reset",
    subject: "Reset your password — Shahzad's Halal Food",
    text: [
      `Hi ${options.name}, someone asked to reset the password for your Shahzad's Halal Food account.`,
      "",
      "If that was you, choose a new password here:",
      options.url,
      "",
      `The link expires in ${options.minutes} minutes and can only be used once.`,
      "If it wasn't you, ignore this email. Your password has not changed.",
      "",
      "Shahzad's Halal Food",
      "152 Easton Ave, New Brunswick, NJ 08901 · (848) 202-1430",
    ].join("\n"),
    html: shell({
      heading: "Reset your password",
      body,
      buttonLabel: "Choose a new password",
      url: options.url,
      footnote: `The link expires in ${options.minutes} minutes and can only be used once. If it wasn't you, ignore this email — your password has not changed.`,
    }),
  };
}

/**
 * An offer.
 *
 * No name field: the list asks for an address and nothing else, so "Hi Sam"
 * is not available and a cheerful "Hi there" is worse than no greeting. The
 * unsubscribe URL is required rather than optional — a marketing email that
 * can be sent without one is a mistake waiting for a quiet afternoon.
 */
export function marketingEmail(options: {
  to: string;
  subject: string;
  heading: string;
  body: string[];
  buttonLabel: string;
  url: string;
  unsubscribeUrl: string;
}): Mail {
  const paragraphs = options.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.cream}">${escapeHtml(line)}</p>`,
    )
    .join("");

  return {
    to: options.to,
    tag: "marketing",
    subject: options.subject,
    headers: {
      "List-Unsubscribe": `<${options.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text: [
      ...options.body,
      "",
      options.url,
      "",
      "—",
      "You're getting this because you asked Shahzad's to send you offers.",
      "Stop getting them, in one click:",
      options.unsubscribeUrl,
      "",
      "Shahzad's Halal Food",
      "152 Easton Ave, New Brunswick, NJ 08901 · (848) 202-1430",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;padding:32px 16px;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:18px;padding:36px 32px">
    <div style="font-size:13px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:${BRAND.gold};margin-bottom:22px">Shahzad's Halal Food</div>
    <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:${BRAND.cream}">${escapeHtml(options.heading)}</h1>
    ${paragraphs}
    <p style="margin:28px 0">
      <a href="${options.url}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:${BRAND.red};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none">${escapeHtml(options.buttonLabel)}</a>
    </p>
    <p style="margin:0;padding-top:20px;border-top:1px solid ${BRAND.line};font-size:13px;line-height:1.6;color:${BRAND.muted}">
      You&rsquo;re getting this because you asked Shahzad&rsquo;s to send you offers.
      <a href="${options.unsubscribeUrl}" style="color:${BRAND.gold}">Unsubscribe in one click</a> — it takes effect straight away.
    </p>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${BRAND.muted}">Shahzad's Halal Food, 152 Easton Ave, New Brunswick, NJ 08901 &middot; (848) 202-1430</p>
  </div>
</body>
</html>`,
  };
}

/**
 * The one email we are allowed to send to an address nobody has proved.
 *
 * Everything else — every offer, every new-item announcement — waits until
 * this link is opened. A list built without that step is a list of other
 * people's typos, and the complaints land on the sender.
 */
export function listConfirmationEmail(options: {
  to: string;
  url: string;
  days: number;
  /** Set when they also asked to be texted, so the email names it. */
  phoneLabel?: string | null;
}): Mail {
  const body = [
    "You asked to hear about Shahzad's offers and new menu items.",
    "Open the link below and you're on the list. If this wasn't you, ignore this email — nothing else will be sent.",
  ];
  if (options.phoneLabel) {
    body.splice(
      1,
      0,
      `You also asked us to text offers to ${options.phoneLabel}. Confirming here covers both.`,
    );
  }

  return {
    to: options.to,
    tag: "list-confirm",
    subject: "Confirm your email for Shahzad's offers",
    text: [
      "You asked to hear about Shahzad's offers and new menu items.",
      ...(options.phoneLabel
        ? [`You also asked us to text offers to ${options.phoneLabel}.`]
        : []),
      "",
      "Confirm your email address by opening this link:",
      options.url,
      "",
      `The link works for ${options.days} days and can only be used once.`,
      "If this wasn't you, ignore this email — nothing else will be sent.",
      "",
      "Shahzad's Halal Food",
      "152 Easton Ave, New Brunswick, NJ 08901 · (848) 202-1430",
    ].join("\n"),
    html: shell({
      heading: "Confirm your email",
      body,
      buttonLabel: "Yes, add me to the list",
      url: options.url,
      footnote: `The link works for ${options.days} days and can only be used once. If this wasn't you, ignore this email — nothing else will be sent.`,
    }),
  };
}
