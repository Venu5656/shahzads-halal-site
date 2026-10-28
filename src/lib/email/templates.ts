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
 * The receipt.
 *
 * Unlike the other two this is not a "click here" email — it is the record of
 * a transaction, so the numbers have to stand on their own in the text part,
 * readable without loading anything. The link is a convenience for watching
 * the order's progress, not the point of the message.
 */
export function receiptEmail(options: {
  to: string;
  name: string;
  orderNumber: string;
  url: string;
  lines: { name: string; quantity: number; lineTotalCents: number; options: string[] }[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  pickupMinutes: number;
}): Mail {
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const textLines = options.lines.flatMap((line) => {
    const head = `  ${line.quantity} × ${line.name}`.padEnd(38) + money(line.lineTotalCents);
    return line.options.length ? [head, `      ${line.options.join(", ")}`] : [head];
  });

  const htmlRows = options.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:8px 0;font-size:15px;color:${BRAND.cream};vertical-align:top">
          ${escapeHtml(`${line.quantity} × ${line.name}`)}
          ${
            line.options.length
              ? `<div style="font-size:13px;color:${BRAND.muted};padding-top:3px">${escapeHtml(line.options.join(", "))}</div>`
              : ""
          }
        </td>
        <td style="padding:8px 0;font-size:15px;color:${BRAND.cream};text-align:right;white-space:nowrap;vertical-align:top">${money(line.lineTotalCents)}</td>
      </tr>`,
    )
    .join("");

  const total = (label: string, cents: number, strong = false) => `
      <tr>
        <td style="padding:${strong ? "12px 0 0" : "4px 0"};font-size:${strong ? "17px" : "14px"};color:${strong ? BRAND.cream : BRAND.muted};${strong ? "font-weight:700;border-top:1px solid " + BRAND.line : ""}">${escapeHtml(label)}</td>
        <td style="padding:${strong ? "12px 0 0" : "4px 0"};font-size:${strong ? "17px" : "14px"};color:${strong ? BRAND.cream : BRAND.muted};text-align:right;${strong ? "font-weight:700;border-top:1px solid " + BRAND.line : ""}">${money(cents)}</td>
      </tr>`;

  return {
    to: options.to,
    tag: "receipt",
    subject: `Order ${options.orderNumber} — Shahzad's Halal Food`,
    text: [
      `Thanks ${options.name}. We have your order.`,
      "",
      `Order ${options.orderNumber}`,
      `Ready for pickup in about ${options.pickupMinutes} minutes.`,
      "",
      ...textLines,
      "",
      `  Subtotal`.padEnd(38) + money(options.subtotalCents),
      `  Sales tax`.padEnd(38) + money(options.taxCents),
      ...(options.tipCents ? [`  Tip`.padEnd(38) + money(options.tipCents)] : []),
      `  Total`.padEnd(38) + money(options.totalCents),
      "",
      "Collect at 152 Easton Ave, New Brunswick. Pickup only.",
      "Follow your order here:",
      options.url,
      "",
      "Shahzad's Halal Food",
      "152 Easton Ave, New Brunswick, NJ 08901 · (848) 202-1430",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;padding:32px 16px;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:18px;padding:36px 32px">
    <div style="font-size:13px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:${BRAND.gold};margin-bottom:22px">Shahzad's Halal Food</div>
    <h1 style="margin:0 0 8px;font-size:26px;line-height:1.25;color:${BRAND.cream}">Order ${escapeHtml(options.orderNumber)}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${BRAND.muted}">Thanks ${escapeHtml(options.name)} — the kitchen has it. Ready in about ${options.pickupMinutes} minutes.</p>
    <table style="width:100%;border-collapse:collapse">${htmlRows}
      ${total("Subtotal", options.subtotalCents)}
      ${total("Sales tax", options.taxCents)}
      ${options.tipCents ? total("Tip", options.tipCents) : ""}
      ${total("Total", options.totalCents, true)}
    </table>
    <p style="margin:28px 0">
      <a href="${options.url}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:${BRAND.red};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none">Follow your order</a>
    </p>
    <p style="margin:0;padding-top:20px;border-top:1px solid ${BRAND.line};font-size:13px;line-height:1.6;color:${BRAND.muted}">Pickup only — collect at the counter and give your name. Keep this email; the order number is on it.</p>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${BRAND.muted}">152 Easton Ave, New Brunswick, NJ 08901 · (848) 202-1430</p>
  </div>
</body>
</html>`,
  };
}

/**
 * A marketing email.
 *
 * Separate from the three transactional templates because the rules are
 * different, and because the difference is easy to forget at the moment
 * somebody wants to send an offer. A receipt is sent whether or not anyone
 * opted in; an offer may only go to someone who did, and must carry a way out
 * and a real postal address.
 *
 * This is the only way to build one. It takes a `userId` rather than letting
 * the caller pass a footer, so an offer without an unsubscribe link cannot be
 * assembled by accident — there is no argument that would produce one.
 */
export function marketingEmail(options: {
  to: string;
  userId: string;
  name: string;
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
      `Hi ${options.name},`,
      "",
      ...options.body,
      "",
      options.url,
      "",
      "—",
      "You're getting this because you asked for offers when you made your account.",
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
      You&rsquo;re getting this because you asked for offers when you made your account.
      <a href="${options.unsubscribeUrl}" style="color:${BRAND.gold}">Unsubscribe in one click</a> — it takes effect straight away, and you&rsquo;ll still get receipts for anything you order.
    </p>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${BRAND.muted}">Shahzad's Halal Food, 152 Easton Ave, New Brunswick, NJ 08901 &middot; (848) 202-1430</p>
  </div>
</body>
</html>`,
  };
}
