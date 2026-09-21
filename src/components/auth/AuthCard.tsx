import Link from "next/link";
import type { ReactNode } from "react";

/** The segmented "Log in | Sign up" switch at the top of both screens. */
export function AuthTabs({ active, next }: { active: "login" | "signup"; next?: string }) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  const tab = (key: "login" | "signup", label: string) => {
    const on = key === active;
    return (
      <Link
        href={`/${key}${query}`}
        aria-current={on ? "page" : undefined}
        className={[
          "flex-1 rounded-full py-3 text-center text-[15px] font-bold transition-all duration-300",
          on ? "bg-cream text-ink shadow-[0_8px_24px_-12px_rgb(0_0_0/0.8)]" : "text-muted hover:text-cream",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav aria-label="Account" className="mb-7 flex gap-1 rounded-full border border-line bg-ink p-1">
      {tab("login", "Log in")}
      {tab("signup", "Sign up")}
    </nav>
  );
}

export function AuthCard({
  eyebrow,
  title,
  accent,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-line bg-card/90 p-6 shadow-[0_40px_90px_-40px_#000] backdrop-blur-sm sm:p-9">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="mt-3 mb-3 font-display text-[clamp(40px,11vw,56px)] leading-[0.9] font-black tracking-normal uppercase">
        {title}
        {accent ? (
          <>
            {" "}
            <em className="font-serif text-[0.8em] font-bold tracking-[-0.03em] text-brand normal-case italic">
              {accent}
            </em>
          </>
        ) : null}
      </h1>
      {intro ? <div className="mb-7 text-[16px] text-muted">{intro}</div> : null}
      {children}
    </section>
  );
}
