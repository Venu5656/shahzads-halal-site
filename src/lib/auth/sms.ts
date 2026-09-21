import "server-only";
import { maskPhone } from "./phone";

/**
 * Outbound SMS. Only the "console" provider exists today: codes are printed to
 * the server terminal and shown on the verify screen, so sign-up and login can
 * be built and tested before Twilio is approved.
 *
 * The console provider REFUSES to run in a production build unless
 * ALLOW_CONSOLE_SMS=1 is set explicitly (the end-to-end tests do this). A real
 * deployment without an SMS provider therefore fails closed — nobody can read
 * someone else's code off the screen.
 *
 * To add Twilio later: implement SmsSender, return it from getSmsSender() when
 * SMS_PROVIDER=twilio. Nothing else in the auth flow changes.
 */

export interface SmsSender {
  readonly name: string;
  send(to: string, body: string): Promise<void>;
}

export class SmsNotConfiguredError extends Error {}

const provider = () => process.env.SMS_PROVIDER ?? "console";

/** True when codes are shown on screen instead of texted. Never true in production. */
export function isConsoleSms(): boolean {
  if (provider() !== "console") return false;
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_CONSOLE_SMS === "1";
}

const consoleSender: SmsSender = {
  name: "console",
  async send(to, body) {
    console.info(`\n[sms:console] → ${maskPhone(to)}\n  ${body}\n`);
  },
};

export function getSmsSender(): SmsSender {
  if (provider() === "console") {
    if (!isConsoleSms()) {
      throw new SmsNotConfiguredError(
        "SMS_PROVIDER=console is disabled in production. Configure a real SMS provider.",
      );
    }
    return consoleSender;
  }
  throw new SmsNotConfiguredError(`SMS provider "${provider()}" is not implemented yet.`);
}

// --- dev-only code display --------------------------------------------------
// The code is never written to the database. In console mode we keep the most
// recent one per challenge in process memory so the verify page can show it.

type DevCode = { code: string; expiresAt: number };
const globalStore = globalThis as unknown as { __shzDevCodes?: Map<string, DevCode> };
const devCodes = (globalStore.__shzDevCodes ??= new Map());

export function rememberDevCode(challengeHash: string, code: string, expiresAt: Date) {
  if (!isConsoleSms()) return;
  const now = Date.now();
  for (const [key, value] of devCodes) if (value.expiresAt < now) devCodes.delete(key);
  devCodes.set(challengeHash, { code, expiresAt: expiresAt.getTime() });
}

export function peekDevCode(challengeHash: string): string | null {
  if (!isConsoleSms()) return null;
  const entry = devCodes.get(challengeHash);
  return entry && entry.expiresAt > Date.now() ? entry.code : null;
}
