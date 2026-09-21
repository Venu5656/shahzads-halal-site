import Link from "next/link";
import { Brand } from "./Brand";
import { logout } from "@/lib/auth/actions";

/** Top bar for signed-in pages (account, manager area). */
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-line">
      <div className="wrap flex h-[78px] items-center justify-between gap-4">
        <Brand />
        <nav className="flex items-center gap-1" aria-label="Account">
          {children}
          <Link
            href="/#menu"
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-muted transition-colors hover:bg-cream/5 hover:text-cream sm:inline-block"
          >
            Menu
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-[15px] font-medium text-muted transition-colors hover:bg-cream/5 hover:text-cream"
            >
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
