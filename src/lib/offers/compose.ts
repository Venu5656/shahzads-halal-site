import { z } from "zod";

/**
 * What an offer is, before it is an email.
 *
 * The body is typed as paragraphs separated by blank lines, the way anybody
 * writes, and stored as an array of plain strings. Never HTML: the template
 * escapes every line on the way out, so nothing the owner types — an
 * ampersand in "fish & chips", a stray angle bracket — can become markup, and
 * the look of an offer can be changed later without touching what he wrote.
 */

export const MAX_PARAGRAPHS = 8;

const line = (max: number, label: string) =>
  z.string().trim().min(1, `${label} can't be empty.`).max(max, `${label} is too long.`);

/**
 * Where the button in an offer may point.
 *
 * A path on this site, or a full https address. Two traps are worth naming,
 * because this value ends up in an href in an email going to several hundred
 * people, and an email is the one place a bad link cannot be taken back.
 *
 * "//evil.test" starts with a slash and is not a path on this site: browsers
 * read it as another origin entirely. And "javascript:" is refused along with
 * everything else that is not plain https.
 */
function isSafeLink(value: string): boolean {
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.startsWith("/")) return true;
  return value.startsWith("https://") && value.length > "https://".length;
}

export const offerSchema = z.object({
  // Long subjects are cut off by every mail client; this is where it happens.
  subject: line(120, "The subject"),
  heading: line(90, "The heading"),
  body: z
    .string()
    .trim()
    .min(1, "Write something.")
    .max(4000, "That's longer than an offer should be.")
    .transform((value) =>
      value
        // A browser submits a textarea with CRLF line endings, not LF — the
        // HTML spec says so. Splitting on bare newlines therefore finds no
        // blank lines at all, and the whole offer arrives as one paragraph,
        // which is exactly what happened before this line existed.
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean),
    )
    .refine((paragraphs) => paragraphs.length > 0, "Write something.")
    .refine(
      (paragraphs) => paragraphs.length <= MAX_PARAGRAPHS,
      `Keep it to ${MAX_PARAGRAPHS} paragraphs — nobody reads more in an offer.`,
    ),
  buttonLabel: line(40, "The button"),
  url: z
    .string()
    .trim()
    .min(1, "Where should the button go?")
    .max(500, "That link is too long.")
    .refine(isSafeLink, "Use a link on this site, like /menu, or a full https:// address."),
});

export type OfferInput = z.infer<typeof offerSchema>;
