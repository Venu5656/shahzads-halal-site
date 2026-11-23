import "server-only";
import { prisma } from "@/lib/db";

/**
 * Reading the list, as opposed to adding to it.
 *
 * The offers page carries a count and nothing else, which was a deliberate
 * choice and the right one for the screen it is on: the only figure that
 * changes what Shahzad should do is how many people there are to send to.
 *
 * It is not enough on its own, though, for three reasons that have nothing to
 * do with metrics.
 *
 * He is supposed to own this list. That was the whole premise — DoorDash takes
 * the ordering and he keeps the customers — and a number is not a list. If he
 * cannot look at it or take it with him, he does not really have it.
 *
 * Consent has to be producible. Under the TCPA the sender carries the burden
 * of proving somebody agreed, per message, and the ConsentEvent ledger holds
 * exactly that: the address, the time, the IP, the wording they were shown.
 * None of it was reachable from any screen, so in the one situation where it
 * matters it may as well not have been recorded.
 *
 * And somebody asks at the counter. "Am I on the list?" has no answer without
 * a search box.
 */

export type RosterRow = {
  id: string;
  email: string;
  phone: string | null;
  joinedAt: Date;
  emailState: "active" | "pending" | "stopped";
  smsState: "active" | "pending" | "stopped" | "none";
};

export const PAGE_SIZE = 50;

/** active = can be sent to; pending = asked, never confirmed; stopped = opted out. */
function emailStateOf(s: {
  emailConfirmedAt: Date | null;
  emailStoppedAt: Date | null;
}): RosterRow["emailState"] {
  if (s.emailStoppedAt) return "stopped";
  return s.emailConfirmedAt ? "active" : "pending";
}

function smsStateOf(s: {
  phone: string | null;
  smsConsentAt: Date | null;
  smsConfirmedAt: Date | null;
  smsStoppedAt: Date | null;
}): RosterRow["smsState"] {
  if (!s.phone || !s.smsConsentAt) return "none";
  if (s.smsStoppedAt) return "stopped";
  return s.smsConfirmedAt ? "active" : "pending";
}

/**
 * A search matches an address or a number, on the assumption that whoever is
 * typing has one of the two in front of them and not a subscriber id.
 *
 * Digits are matched against the stored E.164 number with the punctuation
 * taken out of the query, so "(848) 202-1430", "848-202-1430" and "8482021430"
 * are the same search — which is three of the ways somebody might read a
 * number off a phone screen at a counter.
 */
function whereFor(query: string) {
  const q = query.trim();
  if (!q) return {};
  const digits = q.replace(/\D/g, "");
  const or: object[] = [{ email: { contains: q, mode: "insensitive" as const } }];
  if (digits.length >= 4) or.push({ phone: { contains: digits } });
  return { OR: or };
}

export async function roster(query = "", page = 0) {
  const where = whereFor(query);
  const [total, rows] = await Promise.all([
    prisma.subscriber.count({ where }),
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        phone: true,
        createdAt: true,
        emailConfirmedAt: true,
        emailStoppedAt: true,
        smsConsentAt: true,
        smsConfirmedAt: true,
        smsStoppedAt: true,
      },
    }),
  ]);

  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: rows.map(
      (s): RosterRow => ({
        id: s.id,
        email: s.email,
        phone: s.phone,
        joinedAt: s.createdAt,
        emailState: emailStateOf(s),
        smsState: smsStateOf(s),
      }),
    ),
  };
}

/** Headline counts, so the page can say what the list is made of. */
export async function rosterTotals() {
  const [all, email, stopped] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { emailConfirmedAt: { not: null }, emailStoppedAt: null } }),
    prisma.subscriber.count({ where: { emailStoppedAt: { not: null } } }),
  ]);
  return { all, email, stopped, pending: all - email - stopped };
}

/** One person, with every consent event ever written for them. */
export async function person(id: string) {
  const s = await prisma.subscriber.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      createdAt: true,
      emailConfirmedAt: true,
      emailStoppedAt: true,
      smsConsentAt: true,
      smsConfirmedAt: true,
      smsStoppedAt: true,
    },
  });
  if (!s) return null;

  const events = await prisma.consentEvent.findMany({
    where: { subscriberId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      channel: true,
      action: true,
      target: true,
      ip: true,
      userAgent: true,
      disclosureVersion: true,
      source: true,
      createdAt: true,
    },
  });

  const sends = await prisma.offerSend.count({ where: { subscriberId: id } });

  return {
    ...s,
    emailState: emailStateOf(s),
    smsState: smsStateOf(s),
    events,
    sends,
  };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote everything. A spreadsheet reads it back the same either way, and a
  // bare value is one comma in an address away from shifting every column.
  return `"${s.replace(/"/g, '""')}"`;
};

/**
 * The whole list as CSV, which is what "he keeps the customers" has to mean
 * in practice: something he can open, back up and take to another provider
 * without asking anybody.
 */
export async function rosterCsv(): Promise<string> {
  const rows = await prisma.subscriber.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      email: true,
      phone: true,
      createdAt: true,
      emailConfirmedAt: true,
      emailStoppedAt: true,
      smsConsentAt: true,
      smsConfirmedAt: true,
      smsStoppedAt: true,
    },
  });

  const header = [
    "email",
    "phone",
    "joined",
    "email_confirmed",
    "email_stopped",
    "sms_consented",
    "sms_confirmed",
    "sms_stopped",
    "can_email",
    "can_sms",
  ];
  const iso = (d: Date | null) => (d ? d.toISOString() : "");

  const lines = rows.map((s) =>
    [
      s.email,
      s.phone,
      iso(s.createdAt),
      iso(s.emailConfirmedAt),
      iso(s.emailStoppedAt),
      iso(s.smsConsentAt),
      iso(s.smsConfirmedAt),
      iso(s.smsStoppedAt),
      s.emailConfirmedAt && !s.emailStoppedAt ? "yes" : "no",
      s.smsConfirmedAt && !s.smsStoppedAt ? "yes" : "no",
    ]
      .map(csvCell)
      .join(","),
  );

  // CRLF: it is what the format says, and what Excel expects.
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
