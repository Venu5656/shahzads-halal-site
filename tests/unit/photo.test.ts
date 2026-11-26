import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { preparePhoto } from "@/lib/menu/photo";

/**
 * What happens to a photograph between Shahzad's camera and the menu.
 *
 * The decision worth pinning is the conditional one. Keying the backdrop out
 * is right when the photo was taken on the black tray and wrong when it was
 * taken on a worktop — and "wrong" here does not mean slightly worse, it means
 * the flood fill walks into the middle of the food and leaves holes. So these
 * tests feed it both and check it can tell them apart.
 */

type Fake = { type: string; size: number; bytes: () => Promise<Uint8Array> };

const fileOf = (buf: Buffer, type = "image/jpeg"): Fake => ({
  type,
  size: buf.length,
  bytes: async () => new Uint8Array(buf),
});

/** A bright blob on a given background, as a JPEG. */
async function photo(background: { r: number; g: number; b: number }) {
  const w = 240;
  const h = 180;
  const food = await sharp({
    create: { width: 90, height: 70, channels: 3, background: { r: 230, g: 120, b: 40 } },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width: w, height: h, channels: 3, background } })
    .composite([{ input: food, left: 75, top: 55 }])
    .jpeg()
    .toBuffer();
}

/** Fraction of fully transparent pixels, which is what keying produces. */
async function clearFraction(webp: Buffer) {
  const { data, info } = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let clear = 0;
  const total = info.width * info.height;
  for (let p = 0; p < total; p++) if (data[p * info.channels + 3]! < 8) clear++;
  return clear / total;
}

describe("what it refuses", () => {
  it("turns away anything that is not an image", async () => {
    const res = await preparePhoto(fileOf(Buffer.from("not a picture"), "application/pdf"));
    expect(res.ok).toBe(false);
  });

  it("turns away an empty file", async () => {
    const res = await preparePhoto(fileOf(Buffer.alloc(0), "image/jpeg"));
    expect(res.ok).toBe(false);
  });

  it("turns away something that only claims to be a JPEG", async () => {
    const res = await preparePhoto(fileOf(Buffer.from("GIF89a and then lies"), "image/jpeg"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/could not be read/i);
  });

  it("gives a message rather than throwing, every time", async () => {
    for (const bad of [
      fileOf(Buffer.from("x"), "text/plain"),
      fileOf(Buffer.alloc(0), "image/png"),
      fileOf(Buffer.from([0, 1, 2, 3]), "image/webp"),
    ]) {
      const res = await preparePhoto(bad);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.length).toBeGreaterThan(10);
    }
  });
});

describe("what it does to a photo it accepts", () => {
  it("keys the backdrop out when the photo was shot on black", async () => {
    const res = await preparePhoto(fileOf(await photo({ r: 0, g: 0, b: 0 })));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.keyed).toBe(true);
    // The blob covers about a seventh of the frame; the rest should be gone.
    expect(await clearFraction(res.bytes)).toBeGreaterThan(0.5);
  });

  it("leaves a photo shot on a worktop alone", async () => {
    // The case that matters: keying this would eat into the food instead of
    // the background, because there is no dark border to fill inward from.
    const res = await preparePhoto(fileOf(await photo({ r: 170, g: 165, b: 150 })));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.keyed).toBe(false);
    expect(await clearFraction(res.bytes)).toBeLessThan(0.02);
  });

  it("does not key a photo that is merely dim", async () => {
    // Dark everywhere, but not a studio backdrop — uneven enough that filling
    // from the edge would run straight through the middle.
    const res = await preparePhoto(fileOf(await photo({ r: 70, g: 64, b: 58 })));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.keyed).toBe(false);
  });

  it("writes WebP, whatever went in", async () => {
    const res = await preparePhoto(fileOf(await photo({ r: 0, g: 0, b: 0 })));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect((await sharp(res.bytes).metadata()).format).toBe("webp");
  });

  it("fits the photo to the size the rest of the menu uses", async () => {
    const big = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    const res = await preparePhoto(fileOf(big));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(Math.max(res.width, res.height)).toBe(820);
  });

  it("does not blow a small photo up", async () => {
    const small = await sharp({
      create: { width: 200, height: 150, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    const res = await preparePhoto(fileOf(small));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.width).toBe(200);
  });

  it("turns a sideways phone photo the right way up", async () => {
    // Phones record "this is rotated" in EXIF instead of rotating the pixels.
    // Stripping that without acting on it first is how a dish ends up on its
    // side on the menu.
    const sideways = await sharp({
      create: { width: 400, height: 200, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const res = await preparePhoto(fileOf(sideways));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // 400x200 rotated a quarter turn is taller than it is wide.
    expect(res.height).toBeGreaterThan(res.width);
  });

  it("keeps nothing of where the picture was taken", async () => {
    const withExif = await sharp({
      create: { width: 300, height: 300, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .withExif({ IFD0: { Copyright: "somebody", Software: "a phone" } })
      .jpeg()
      .toBuffer();
    const res = await preparePhoto(fileOf(withExif));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const meta = await sharp(res.bytes).metadata();
    expect(meta.exif).toBeUndefined();
  });
});
