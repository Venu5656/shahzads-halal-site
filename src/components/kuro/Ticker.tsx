/**
 * The line of facts along the foot.
 *
 * The track holds the same list twice and slides by exactly half its own
 * width, which is what makes the loop seamless without measuring anything at
 * runtime. The duplicate is hidden from the accessibility tree, so a screen
 * reader hears each fact once.
 *
 * Every item is true of this shop. A ticker of invented slogans is the point
 * at which this device stops being information and becomes decoration.
 */
function Row({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-center">
          <span className="kuro-label px-7 whitespace-nowrap">{item}</span>
          <span
            aria-hidden="true"
            className="size-1 rounded-full"
            style={{ background: "var(--muted-dim)" }}
          />
        </li>
      ))}
    </ul>
  );
}

export function Ticker({ items }: { items: string[] }) {
  return (
    <div
      className="overflow-hidden border-t py-4"
      style={{ borderColor: "var(--line)", background: "var(--bg-raised)" }}
    >
      <div className="kuro-ticker-track">
        <Row items={items} />
        <Row items={items} hidden />
      </div>
    </div>
  );
}
