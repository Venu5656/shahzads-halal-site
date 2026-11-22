import Link from "next/link";

/**
 * Shell for the owner's sign-in and for the subscriber screens.
 *
 * Customers do not have accounts any more — ordering is DoorDash's — so the
 * only person who signs in here is Shahzad, on his way to the menu manager.
 * Nothing on the public site links to it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-64 left-1/2 size-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(226_58_47/0.22),rgb(245_181_61/0.06)_55%,transparent)] blur-md"
      />
      <header className="relative z-10">
        <div className="wrap flex h-[78px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="Shahzad's Halal Food, home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.png" alt="" width={34} height={34} className="size-8 object-contain" />
            <span className="font-display text-[20px]" style={{ letterSpacing: "0.22em" }}>
              SHAHZAD&rsquo;S
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-[15px] font-medium text-muted transition-colors hover:bg-cream/5 hover:text-cream"
          >
            ← Back to menu
          </Link>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[460px]">{children}</div>
      </main>
    </div>
  );
}
