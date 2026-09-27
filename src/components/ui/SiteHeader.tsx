import Link from "next/link";
import { Brand } from "./Brand";
import { CartButton } from "@/components/cart/CartButton";
import { logout } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * The top bar for every page except the homepage, which keeps its own ported
 * nav. It works signed in or out — the legal and menu pages are public, so it
 * cannot assume there is anyone to log out.
 */
export async function SiteHeader({ children }: { children?: React.ReactNode }) {
  const user = await getCurrentUser();
  const first = user ? (user.name.split(" ")[0] ?? user.name) : null;

  return (
    <header className="border-b border-line">
      <div className="wrap flex h-[78px] items-center justify-between gap-4">
        <Brand />
        <nav className="flex items-center gap-1.5" aria-label="Main">
          {children}
          <Link
            href="/menu"
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-muted transition-colors hover:bg-cream/5 hover:text-cream sm:inline-block"
          >
            Menu
          </Link>
          <CartButton className="!px-3.5 !py-2 !text-[14px]" />

          {user ? (
            <>
              <Link
                href="/account"
                aria-label={`Your account (${first})`}
                className="hidden items-center gap-2 rounded-full border border-line py-1.5 pr-4 pl-1.5 text-[15px] font-bold whitespace-nowrap transition-colors hover:border-line-strong sm:flex"
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-gold font-display text-[17px] font-black text-ink uppercase"
                >
                  {first?.charAt(0)}
                </span>
                <span className="max-w-[110px] truncate">{first}</span>
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-full px-4 py-2 text-[15px] font-medium text-muted transition-colors hover:bg-cream/5 hover:text-cream"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-[15px] font-medium whitespace-nowrap text-muted transition-colors hover:bg-cream/5 hover:text-cream"
              >
                Log in
              </Link>
              <Link href="/signup" className="btn btn-ghost hidden whitespace-nowrap sm:inline-flex">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
