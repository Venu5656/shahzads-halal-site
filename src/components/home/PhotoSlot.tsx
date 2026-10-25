/**
 * A picture that does not exist yet.
 *
 * The open collections have plenty of New Brunswick in daylight and plenty of
 * late-night street somewhere else, and nothing that is both. The pictures
 * this page actually wants — the lit window on Easton at one in the morning,
 * the flat-top working, the queue — can only be taken by someone standing
 * there, and a phone is enough.
 *
 * So the slot is held open rather than filled with a stock photograph of
 * somebody else's restaurant. It keeps the real aspect ratio so the layout is
 * already correct, and it says what belongs in it. Pass `src` and the brief
 * disappears; nothing else about the page changes.
 */
export function PhotoSlot({
  src,
  alt,
  brief,
  ratio = "4/3",
  className = "",
  priority = false,
}: {
  src?: string;
  alt?: string;
  /** What to photograph, for whoever is holding the phone. */
  brief: string;
  ratio?: string;
  className?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        loading={priority ? undefined : "lazy"}
        decoding="async"
        style={{ aspectRatio: ratio }}
        className={`size-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ aspectRatio: ratio }}
      className={`grid w-full place-items-center border border-dashed border-line-strong bg-card/60 p-6 ${className}`}
    >
      <div className="max-w-[26ch] text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
          className="mx-auto mb-3 size-7 text-gold/70"
        >
          <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3L9 4h6l1.5 2h3A1.5 1.5 0 0 1 21 7.5v10A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
          <circle cx="12" cy="12" r="3.4" />
        </svg>
        <p className="text-small leading-snug font-bold tracking-[0.12em] text-gold uppercase">
          Photograph to come
        </p>
        <p className="mt-2 text-small leading-snug text-muted">{brief}</p>
      </div>
    </div>
  );
}
