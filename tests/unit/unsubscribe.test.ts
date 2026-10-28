import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-at-least-thirty-two-characters-long";
});

const load = async () => await import("@/lib/email/unsubscribe");

/**
 * The unsubscribe link is the only thing on the site that acts on an account
 * without a session, so the signature is the whole of its security.
 */
describe("the unsubscribe link", () => {
  it("accepts a link it signed itself", async () => {
    const { unsubscribeUrl, verifyUnsubscribe, unsubscribeSignature } = await load();
    const id = "usr_abc123";
    expect(verifyUnsubscribe(id, unsubscribeSignature(id))).toBe(id);
    expect(unsubscribeUrl(id)).toContain(encodeURIComponent(id));
  });

  it("refuses another user's signature", async () => {
    const { verifyUnsubscribe, unsubscribeSignature } = await load();
    expect(verifyUnsubscribe("usr_victim", unsubscribeSignature("usr_attacker"))).toBeNull();
  });

  it("refuses a tampered or absent signature", async () => {
    const { verifyUnsubscribe, unsubscribeSignature } = await load();
    const good = unsubscribeSignature("usr_abc123");
    expect(verifyUnsubscribe("usr_abc123", good.slice(0, -1) + "0")).toBeNull();
    expect(verifyUnsubscribe("usr_abc123", "")).toBeNull();
    expect(verifyUnsubscribe("usr_abc123", undefined)).toBeNull();
    expect(verifyUnsubscribe(undefined, good)).toBeNull();
    expect(verifyUnsubscribe(123, good)).toBeNull();
  });

  it("gives every account a different signature", async () => {
    const { unsubscribeSignature } = await load();
    expect(unsubscribeSignature("usr_a")).not.toBe(unsubscribeSignature("usr_b"));
  });

  it("offers the headers a mail client needs for its own button", async () => {
    const { unsubscribeHeaders } = await load();
    const headers = unsubscribeHeaders("usr_abc123");
    expect(headers["List-Unsubscribe"]).toMatch(/^<https?:\/\/.+>$/);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("points at a URL that accepts POST, as one-click requires", async () => {
    const { unsubscribeUrl } = await load();
    expect(unsubscribeUrl("usr_abc123")).toContain("/api/unsubscribe");
  });
});

describe("a marketing email", () => {
  it("cannot be built without a way out of it", async () => {
    const { marketingEmail } = await import("@/lib/email/templates");
    const mail = marketingEmail({
      to: "customer@example.test",
      userId: "usr_abc123",
      name: "Yusuf",
      subject: "Free fries this week",
      heading: "Free fries this week",
      body: ["Order any platter before Sunday and the fries are on us."],
      buttonLabel: "See the menu",
      url: "http://localhost:3000/menu",
      unsubscribeUrl: "http://localhost:3000/api/unsubscribe?u=usr_abc123&s=deadbeef",
    });

    // Both parts carry the opt-out and the postal address.
    for (const part of [mail.text, mail.html]) {
      expect(part).toContain("/api/unsubscribe");
      expect(part).toContain("152 Easton Ave");
      expect(part).toContain("New Brunswick, NJ 08901");
    }
    expect(mail.headers?.["List-Unsubscribe"]).toBeTruthy();
    expect(mail.tag).toBe("marketing");
  });
});
