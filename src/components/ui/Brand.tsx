import Link from "next/link";

/** The logo lockup from the homepage nav, reusing its `.brand` styles. */
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Shahzad's Halal Food home">
      {/* eslint-disable-next-line @next/next/no-img-element -- same asset and styling as the homepage nav */}
      <img src="/img/logo.png" alt="" />
      <span>
        <b>Shahzad&apos;s</b>
        <small>Halal Food</small>
      </span>
    </Link>
  );
}
