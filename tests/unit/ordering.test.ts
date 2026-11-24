import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Where "Order now" goes — now that it goes somewhere.
 *
 * This module had no tests at all while the link was missing, which was
 * survivable when every button fell back to a phone number. It is not
 * survivable now: as of today every sale the site produces leaves through
 * these four lines, and DoorDash reissues these links, so the next edit to
 * them will be made by somebody in a hurry.
 *
 * The property worth defending is the one that keeps a dead button off the
 * page: anything it cannot turn into a real https link comes back null, and a
 * null makes the caller render "Call to order" instead. Returning a broken
 * string would put a button on the site that silently goes nowhere, which is
 * the one outcome worse than having no link at all.
 *
 * BASE is read once at module load, so each case loads the module again with a
 * different environment rather than trying to reassign a constant.
 */

async function withLink(value: string | undefined) {
  vi.resetModules();
  if (value === undefined) delete process.env.NEXT_PUBLIC_ORDER_URL;
  else process.env.NEXT_PUBLIC_ORDER_URL = value;
  return import("@/lib/ordering");
}

const LIVE = "https://order.online/en/business/~1013632";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ORDER_URL;
  vi.resetModules();
});

describe("with no link configured", () => {
  it("says so, and hands back nothing to link to", async () => {
    const { orderingReady, orderUrl } = await withLink(undefined);
    expect(orderingReady()).toBe(false);
    expect(orderUrl("header")).toBeNull();
  });

  it("treats an empty value the same as an absent one", async () => {
    const { orderingReady, orderUrl } = await withLink("");
    expect(orderingReady()).toBe(false);
    expect(orderUrl("header")).toBeNull();
  });

  it("still offers the shop's own number to fall back to", async () => {
    const { ORDER_FALLBACK_TEL } = await withLink(undefined);
    expect(ORDER_FALLBACK_TEL).toBe("+18482021430");
  });
});

describe("with the live link", () => {
  it("builds a link that carries where the customer came from", async () => {
    const { orderUrl } = await withLink(LIVE);
    const url = new URL(orderUrl("item-chicken-over-rice")!);

    expect(url.origin + url.pathname).toBe(LIVE);
    expect(url.searchParams.get("utm_source")).toBe("website");
    expect(url.searchParams.get("utm_medium")).toBe("referral");
    // The campaign names the button, which is the only way to tell the
    // homepage's plate apart from a menu page in DoorDash's own reporting.
    expect(url.searchParams.get("utm_campaign")).toBe("item-chicken-over-rice");
  });

  it("tags each button differently", async () => {
    const { orderUrl } = await withLink(LIVE);
    const header = new URL(orderUrl("header")!);
    const dish = new URL(orderUrl("item-falafel-over-rice")!);
    expect(header.searchParams.get("utm_campaign")).toBe("header");
    expect(dish.searchParams.get("utm_campaign")).toBe("item-falafel-over-rice");
  });

  it("keeps any query string the issued link already had", async () => {
    // These links are issued by somebody else and have carried parameters
    // before. Dropping one would quietly break whatever it was there for.
    const { orderUrl } = await withLink(`${LIVE}?pickup=1`);
    const url = new URL(orderUrl("header")!);
    expect(url.searchParams.get("pickup")).toBe("1");
    expect(url.searchParams.get("utm_source")).toBe("website");
  });

  it("reports itself ready", async () => {
    const { orderingReady } = await withLink(LIVE);
    expect(orderingReady()).toBe(true);
  });
});

describe("refuses anything it cannot trust", () => {
  it("will not send a customer over plain http", async () => {
    const { orderingReady, orderUrl } = await withLink("http://order.online/en/business/~1013632");
    expect(orderingReady()).toBe(false);
    expect(orderUrl("header")).toBeNull();
  });

  it("will not accept a bare scheme with nothing after it", async () => {
    const { orderUrl } = await withLink("https://");
    expect(orderUrl("header")).toBeNull();
  });

  it("returns null rather than a broken string when the value is not a URL", async () => {
    const { orderUrl } = await withLink("https://not a url at all");
    expect(orderUrl("header")).toBeNull();
  });

  it("will not follow a javascript: value pasted in by mistake", async () => {
    const { orderingReady, orderUrl } = await withLink("javascript:alert(1)");
    expect(orderingReady()).toBe(false);
    expect(orderUrl("header")).toBeNull();
  });
});
