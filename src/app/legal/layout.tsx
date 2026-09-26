import type { ReactNode } from "react";
import { SiteHeader } from "@/components/ui/SiteHeader";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap pt-10 pb-24 sm:pt-16">
        <article className="mx-auto max-w-[760px] [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[30px] [&_h2]:leading-none [&_h2]:font-extrabold [&_h2]:uppercase [&_li]:mb-2 [&_p]:mb-4 [&_p]:text-[17px] [&_p]:leading-relaxed [&_p]:text-muted [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-[17px] [&_ul]:leading-relaxed [&_ul]:text-muted">
          {children}
        </article>
      </main>
    </>
  );
}
