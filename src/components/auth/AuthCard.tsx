import type { ReactNode } from "react";

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
