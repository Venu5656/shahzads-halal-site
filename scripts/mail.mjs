#!/usr/bin/env node
/**
 * Reads the development outbox.
 *
 * In development nothing is actually emailed — the mailer writes each message
 * to .mail/outbox.jsonl instead. This prints the recent ones with their links,
 * so a signup or a password reset can be finished without a mail account.
 *
 *   npm run mail                  the last 10 messages
 *   npm run mail -- you@test.com  only that address
 *   npm run mail -- --tag verify  only verification mails
 *   npm run mail -- --open        open the newest link in a browser
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const open = args.includes("--open");
const tagAt = args.indexOf("--tag");
const tag = tagAt === -1 ? null : args[tagAt + 1];
const address = args.find((a) => a.includes("@")) ?? null;

let lines;
try {
  lines = readFileSync(".mail/outbox.jsonl", "utf8").split("\n").filter(Boolean);
} catch {
  console.error("No .mail/outbox.jsonl yet — nothing has been sent on this machine.");
  process.exit(1);
}

const messages = lines
  .map((line) => JSON.parse(line))
  .filter((m) => (tag ? m.tag === tag : true))
  .filter((m) => (address ? m.to === address : true))
  .slice(-10);

if (!messages.length) {
  console.error("Nothing matched. Try `npm run mail` with no arguments.");
  process.exit(1);
}

let newest = null;
for (const m of messages) {
  const link = m.text.match(/https?:\/\/\S+/)?.[0] ?? null;
  if (link) newest = link;
  const when = new Date(m.at).toLocaleString();
  console.log(`\n${when}  [${m.tag}]  ${m.to}`);
  console.log(`  ${m.subject}`);
  if (link) console.log(`  ${link}`);
}
console.log();

if (open && newest) execFileSync("open", [newest]);
