"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";

/**
 * Where the order has got to, and a quiet poll while it is still moving.
 *
 * The steps are rendered on the server; this only re-fetches. An order that
 * has reached a terminal state stops polling entirely, and so does a hidden
 * tab — nobody's phone should be waking up every fifteen seconds to ask about
 * a gyro that was collected an hour ago.
 */

const STEPS: { status: OrderStatus; label: string; note: string }[] = [
  { status: "PAID", label: "Paid", note: "We have your money and your order." },
  { status: "CONFIRMED", label: "Confirmed", note: "The kitchen has accepted it." },
  { status: "PREPARING", label: "Cooking", note: "On the flat-top now." },
  { status: "READY", label: "Ready", note: "Come and collect it." },
  { status: "PICKED_UP", label: "Collected", note: "Enjoy." },
];

const POLL_MS = 15_000;

export function OrderProgress({
  status,
  isActive,
}: {
  status: OrderStatus;
  isActive: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isActive) return;

    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, POLL_MS);
    // Catch up straight away when someone comes back to the tab.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [isActive, router]);

  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <p role="status" className="rounded-2xl border border-brand-2/40 bg-brand/10 p-5 text-[16px] text-cream">
        This order was {status === "CANCELLED" ? "cancelled" : "refunded"}. If that is a
        surprise, call the shop on (848) 202-1430 and we will sort it out.
      </p>
    );
  }

  const reached = STEPS.findIndex((step) => step.status === status);

  return (
    <ol className="grid gap-3" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        const current = i === reached;
        return (
          <li
            key={step.status}
            aria-current={current ? "step" : undefined}
            className={[
              "flex items-start gap-4 rounded-2xl border p-4 transition-colors",
              current
                ? "border-gold/50 bg-gold/5"
                : done
                  ? "border-line bg-card"
                  : "border-line bg-transparent",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={[
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-black",
                done ? "bg-gold text-ink" : "border border-line-strong text-muted",
              ].join(" ")}
            >
              {done ? "✓" : i + 1}
            </span>
            <span>
              <span
                className={[
                  "block text-[16px] font-bold",
                  done ? "text-cream" : "text-muted",
                ].join(" ")}
              >
                {step.label}
              </span>
              <span className="block text-[14px] leading-snug text-muted">{step.note}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
