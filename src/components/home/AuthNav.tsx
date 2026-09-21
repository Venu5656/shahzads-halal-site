import Link from "next/link";
import type { CurrentUser } from "@/lib/auth/dal";

/**
 * Account entry points grafted onto the ported homepage nav. Everything else in
 * the nav is untouched legacy markup.
 *
 * Which of these is visible at which width is decided by the `.nav-auth-*`
 * rules in globals.css — the original nav has very little room to spare, so the
 * controls thin out as the window narrows and disappear entirely at ≤980px,
 * where the burger drawer takes over (see DrawerAuth).
 */

type User = Pick<CurrentUser, "name"> | null;

export function NavAuth({ user }: { user: User }) {
  if (user) {
    const first = user.name.split(" ")[0] ?? user.name;
    return (
      <Link
        href="/account"
        aria-label={`Your account (${first})`}
        className="nav-auth-account flex items-center gap-2 rounded-full border border-line py-1.5 pr-4 pl-1.5 text-[15px] font-bold whitespace-nowrap transition-colors hover:border-line-strong"
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full bg-gold font-display text-[17px] font-black text-ink uppercase"
        >
          {first.charAt(0)}
        </span>
        <span className="nav-auth-name max-w-[110px] truncate">{first}</span>
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="nav-auth-link rounded-full px-4 py-[9px] text-[15px] font-medium whitespace-nowrap text-muted transition-colors hover:bg-cream/5 hover:text-cream"
      >
        Log in
      </Link>
      <Link href="/signup" className="nav-auth-signup btn btn-ghost whitespace-nowrap">
        Sign up
      </Link>
      {/* Shown instead of the pair on narrow laptops; /login offers Sign up too. */}
      <Link href="/login" className="nav-auth-compact btn btn-ghost whitespace-nowrap">
        Log in
      </Link>
    </>
  );
}

/** The same choices inside the full-screen mobile drawer. */
export function DrawerAuth({ user }: { user: User }) {
  // The legacy `.drawer a` rule styles every link in the drawer as a giant
  // headline; these utilities turn that back into buttons.
  const reset =
    "btn flex-1 justify-center font-sans text-[16px] leading-normal normal-case [body.menu-open_&]:delay-200";

  return (
    <div className="mt-10 flex max-w-[420px] gap-3">
      {user ? (
        <Link href="/account" className={`${reset} btn-ghost hover:text-cream`}>
          My account
        </Link>
      ) : (
        <>
          <Link href="/login" className={`${reset} btn-ghost hover:text-cream`}>
            Log in
          </Link>
          <Link href="/signup" className={`${reset} btn-red hover:text-white`}>
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}
