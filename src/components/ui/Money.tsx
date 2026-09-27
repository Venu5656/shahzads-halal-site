import { formatCents } from "@/lib/money";

/** Cents rendered as money. One place, so nothing ever prints "$12.5". */
export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={className}>{formatCents(cents)}</span>;
}
