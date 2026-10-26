import { describe, expect, it } from "vitest";
import { receiptEmail } from "@/lib/email/templates";

/**
 * The receipt is the only one of the three emails that is a record rather
 * than a link, so the numbers have to survive in the plain-text part on their
 * own — plenty of people read mail as text, and a receipt whose total only
 * exists in the HTML is no receipt at all.
 */

function receipt(overrides: Partial<Parameters<typeof receiptEmail>[0]> = {}) {
  return receiptEmail({
    to: "customer@example.test",
    name: "Yusuf",
    orderNumber: "SH-4821",
    url: "http://localhost:3000/orders/SH-4821",
    lines: [
      {
        name: "Lamb Gyro",
        quantity: 2,
        lineTotalCents: 1998,
        options: ["White sauce", "Add fries and a soda"],
      },
      { name: "Water", quantity: 1, lineTotalCents: 199, options: [] },
    ],
    subtotalCents: 2197,
    taxCents: 132,
    tipCents: 0,
    totalCents: 2329,
    pickupMinutes: 20,
    ...overrides,
  });
}

describe("the receipt email", () => {
  it("carries every number in the plain-text part", () => {
    const { text } = receipt();
    expect(text).toContain("SH-4821");
    expect(text).toContain("2 × Lamb Gyro");
    expect(text).toContain("$19.98");
    expect(text).toContain("$1.99");
    expect(text).toContain("$21.97"); // subtotal
    expect(text).toContain("$1.32"); // tax
    expect(text).toContain("$23.29"); // total
  });

  it("lists the options under their line, so the kitchen's work is visible", () => {
    expect(receipt().text).toContain("White sauce, Add fries and a soda");
  });

  it("leaves the tip out entirely when there is none", () => {
    const { text, html } = receipt();
    expect(text).not.toContain("Tip");
    expect(html).not.toContain(">Tip<");
  });

  it("shows a tip when there is one", () => {
    const { text } = receipt({ tipCents: 300, totalCents: 2629 });
    expect(text).toContain("Tip");
    expect(text).toContain("$3.00");
  });

  it("says where to collect it, since nothing is delivered", () => {
    const { text } = receipt();
    expect(text).toContain("152 Easton Ave");
    expect(text.toLowerCase()).toContain("pickup only");
  });

  it("puts the order number in the subject, where a mail client shows it", () => {
    expect(receipt().subject).toContain("SH-4821");
  });

  it("escapes a dish name that contains markup", () => {
    const { html } = receipt({
      lines: [
        { name: '<script>alert(1)</script>', quantity: 1, lineTotalCents: 100, options: [] },
      ],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("is tagged so the development outbox can be searched", () => {
    expect(receipt().tag).toBe("receipt");
  });
});
