import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Sending mail, with a transport that depends on what the environment can
 * actually do:
 *
 *   resend  — the real thing, used whenever RESEND_API_KEY is set.
 *   outbox  — writes each message to .mail/outbox.jsonl and logs the link.
 *             The development default, and what the end-to-end tests read, so
 *             the whole signup and reset flow can be exercised with no
 *             account, no API key and no network.
 *
 * Set EMAIL_TRANSPORT to force one. Nothing here ever logs a full token: the
 * outbox file is gitignored and local-only, and the console line carries the
 * link because that is the point of the development transport.
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Only for the outbox, so tests can find the message they want. */
  tag: string;
};

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

const OUTBOX_DIR = ".mail";
const OUTBOX_FILE = "outbox.jsonl";

function transport(): "resend" | "outbox" {
  const forced = process.env.EMAIL_TRANSPORT?.toLowerCase();
  if (forced === "resend" || forced === "outbox") return forced;
  return process.env.RESEND_API_KEY ? "resend" : "outbox";
}

export function fromAddress(): string {
  return process.env.RECEIPT_FROM_EMAIL || "Shahzad's Halal Food <onboarding@resend.dev>";
}

/** Absolute URL for a path, for links that have to survive leaving the browser. */
export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendViaOutbox(mail: Mail): Promise<SendResult> {
  const id = `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = { id, at: new Date().toISOString(), from: fromAddress(), ...mail };
  try {
    const dir = join(process.cwd(), OUTBOX_DIR);
    await mkdir(dir, { recursive: true });
    await appendFile(join(dir, OUTBOX_FILE), `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    // A read-only filesystem must not take the signup down with it.
    console.warn("[mail] could not write the outbox:", (error as Error).message);
  }
  // The whole point of this transport: the developer needs the link.
  const link = mail.text.match(/https?:\/\/\S+/)?.[0];
  console.log(`\n[mail:${mail.tag}] to ${mail.to} — ${mail.subject}`);
  if (link) console.log(`[mail:${mail.tag}] ${link}\n`);
  return { ok: true, id };
}

async function sendViaResend(mail: Mail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
      // A hung mail provider must not hold a signup open forever.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      // The body can quote the recipient address back at us; keep it out of logs.
      return { ok: false, error: `Resend responded ${response.status}` };
    }
    const body = (await response.json()) as { id?: string };
    return { ok: true, id: body.id ?? "resend" };
  } catch (error) {
    return { ok: false, error: (error as Error).name || "send failed" };
  }
}

/**
 * Sends a message. Never throws: a failed send is reported, and the caller
 * decides what the customer sees — which, for anything triggered by typing an
 * address into a form, is the same screen either way.
 */
export async function sendMail(mail: Mail): Promise<SendResult> {
  const result =
    transport() === "resend" ? await sendViaResend(mail) : await sendViaOutbox(mail);
  if (!result.ok) console.error(`[mail:${mail.tag}] send failed: ${result.error}`);
  return result;
}

export const outboxPath = join(OUTBOX_DIR, OUTBOX_FILE);
export const activeTransport = transport;
