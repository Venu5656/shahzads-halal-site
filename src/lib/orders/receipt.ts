import "server-only";
import { prisma } from "@/lib/db";
import { absoluteUrl, sendMail } from "@/lib/email/mailer";
import { receiptEmail } from "@/lib/email/templates";
import { PICKUP_LEAD_MINUTES } from "@/lib/hours";
import type { OrderView } from "./queries";

/**
 * Sending the receipt.
 *
 * Called once an order is paid — by the Stripe webhook when that exists, and
 * by the tests today. Two things it deliberately does not do:
 *
 * It never throws. A receipt that fails to send must not fail the webhook,
 * because Stripe would retry the whole delivery and the customer would end up
 * with a second order rather than a second email.
 *
 * It only sends once. `receiptSentAt` is set in the same breath, so a retried
 * webhook that gets as far as a second send finds the stamp and stops.
 */
export async function sendOrderReceipt(options: {
  order: OrderView;
  to: string;
  /** Skip the already-sent check; only the tests want this. */
  force?: boolean;
}): Promise<{ sent: boolean; reason?: string }> {
  const { order, to, force = false } = options;

  try {
    if (!force) {
      const fresh = await prisma.order.findUnique({
        where: { id: order.id },
        select: { receiptSentAt: true },
      });
      if (fresh?.receiptSentAt) return { sent: false, reason: "already sent" };
    }

    const mail = receiptEmail({
      to,
      name: order.customerName.split(" ")[0] || order.customerName,
      orderNumber: order.orderNumber,
      url: absoluteUrl(`/orders/${order.orderNumber}`),
      lines: order.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        lineTotalCents: line.lineTotalCents,
        options: line.options.map((o) => o.optionName),
      })),
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      tipCents: order.tipCents,
      totalCents: order.totalCents,
      pickupMinutes: PICKUP_LEAD_MINUTES,
    });

    const result = await sendMail(mail);
    if (!result.ok) return { sent: false, reason: result.error };

    await prisma.order.update({
      where: { id: order.id },
      data: { receiptSentAt: new Date() },
    });
    return { sent: true };
  } catch (error) {
    // Deliberately swallowed: see the note above.
    console.warn("[receipt] could not send:", (error as Error).message);
    return { sent: false, reason: (error as Error).message };
  }
}
