#!/usr/bin/env node
/**
 * Reads the development outbox.
 *
 * In development nothing is actually emailed — the mailer writes each message
 * to .mail/outbox.jsonl instead. This prints the recent ones with their links,
 * so a signup or a password reset can be finished without a mail account.
 *
 * It also logs the link with console.log, but do not go looking for that in
 * the terminal: Next 16 captures server-side console output into
 * .next/dev/logs/next-development.log as JSON rather than printing it to the
 * dev server's stdout. This file is the reliable place to read it.
 *
 *   npm run mail                  the last 10 messages
 *   npm run mail -- you@test.com  only that address
 *   npm run mail -- --tag verify  only verification mails
 *   npm run mail -- --open        open the newest link in a browser
 *   npm run mail -- --watch       print each new message as it is sent
 */
import { readFileSync, watchFile } from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const open = args.includes("--open");
const watch = args.includes("--watch");
const tagAt = args.indexOf("--tag");
const tag = tagAt === -1 ? null : args[tagAt + 1];
const address = args.find((a) => a.includes("@")) ?? null;

const PATH = ".mail/outbox.jsonl";

function read() {
  try {
    return readFileSync(PATH, "utf8").split("\n").filter(Boolean);
  } catch {
    return null;
  }
}

const wanted = (m) =>
  (tag ? m.tag === tag : true) && (address ? m.to === address : true);

function show(m) {
  const link = m.text.match(/https?:\/\/\S+/)?.[0] ?? null;
  console.log(`\n${new Date(m.at).toLocaleString()}  [${m.tag}]  ${m.to}`);
  console.log(`  ${m.subject}`);
  if (link) console.log(`  ${link}`);
  return link;
}

let lines = read();
if (lines === null) {
  if (!watch) {
    console.error(`No ${PATH} yet — nothing has been sent on this machine.`);
    process.exit(1);
  }
  lines = [];
}

if (watch) {
  // Everything already in the file is history; only report what arrives now.
  let seen = lines.length;
  console.log(`Watching ${PATH} — sign up in the browser and the link lands here.`);
  console.log("Ctrl-C to stop.");
  watchFile(PATH, { interval: 400 }, () => {
    const all = read() ?? [];
    for (const line of all.slice(seen)) {
      const m = JSON.parse(line);
      if (wanted(m)) show(m);
    }
    seen = all.length;
  });
} else {
  const messages = lines.map((l) => JSON.parse(l)).filter(wanted).slice(-10);
  if (!messages.length) {
    console.error("Nothing matched. Try `npm run mail` with no arguments.");
    process.exit(1);
  }
  let newest = null;
  for (const m of messages) newest = show(m) ?? newest;
  console.log();
  if (open && newest) execFileSync("open", [newest]);
}
