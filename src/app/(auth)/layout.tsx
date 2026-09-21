import Link from "next/link";
import { Brand } from "@/components/ui/Brand";

/** Shell for log in, sign up and the code screen: brand bar and one centred card. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-64 left-1/2 size-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(226_58_47/0.22),rgb(245_181_61/0.06)_55%,transparent)] blur-md"
      />
      <header className="relative z-10">
        <div className="wrap flex h-[78px] items-center justify-between">
          <Brand />
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
