import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Reads the development outbox — the JSONL file the "outbox" mail transport
 * appends to instead of sending. It lets these tests follow the real links
 * from the real emails without an API key, a network, or a mail server.
 */

export type OutboxMessage = {
  id: string;
  at: string;
  to: string;
  subject: string;
  text: string;
  tag: string;
};

const OUTBOX = join(process.cwd(), ".mail", "outbox.jsonl");

async function readOutbox(): Promise<OutboxMessage[]> {
  try {
    const raw = await readFile(OUTBOX, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as OutboxMessage);
  } catch {
    return [];
  }
}

/** How many messages the address has been sent so far — the baseline a test waits past. */
export async function countFor(email: string, tag?: string): Promise<number> {
  const all = await readOutbox();
  return all.filter((m) => m.to === email && (!tag || m.tag === tag)).length;
}

/**
 * Waits for a message that arrives *after* `after` messages already existed,
 * and returns the link inside it. Counting rather than timestamping keeps this
 * reliable when two messages land in the same millisecond.
 */
export async function waitForLink(
  email: string,
  tag: "verify" | "reset" | "list-confirm" | "marketing",
  after = 0,
  timeoutMs = 15_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const mine = (await readOutbox()).filter((m) => m.to === email && m.tag === tag);
    if (mine.length > after) {
      const link = mine[mine.length - 1]!.text.match(/https?:\/\/\S+/)?.[0];
      if (link) return link;
      throw new Error(`The ${tag} email to ${email} had no link in it.`);
    }
    if (Date.now() > deadline) {
      throw new Error(
        `No ${tag} email for ${email} within ${timeoutMs}ms (saw ${mine.length}, wanted more than ${after}).`,
      );
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}

/**
 * Every link in the newest matching message.
 *
 * waitForLink returns the first one, which is what the verification and reset
 * emails have. An offer has two — the button and the unsubscribe — so a test
 * that wants a particular one has to say which.
 */
export async function waitForLinks(
  email: string,
  tag: "verify" | "reset" | "list-confirm" | "marketing",
  after = 0,
  timeoutMs = 15_000,
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const mine = (await readOutbox()).filter((m) => m.to === email && m.tag === tag);
    if (mine.length > after) {
      return mine[mine.length - 1]!.text.match(/https?:\/\/\S+/g) ?? [];
    }
    if (Date.now() > deadline) {
      throw new Error(
        `No ${tag} email for ${email} within ${timeoutMs}ms (saw ${mine.length}, wanted more than ${after}).`,
      );
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}

/** The path and query of a link, for page.goto() against the test base URL. */
export function toPath(link: string): string {
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}
