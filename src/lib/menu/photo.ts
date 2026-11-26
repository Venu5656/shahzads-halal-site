import "server-only";
import sharp from "sharp";

/**
 * Turning a photograph off Shahzad's phone into something the menu can show.
 *
 * The committed shoot went through scripts/menu-images.mjs: cropped, keyed off
 * the studio's black floor, sized and compressed by hand. Nothing here can
 * assume that much. What arrives is whatever the camera produced — four
 * megabytes, sideways, with the room in the background — and it has to come
 * out looking like it belongs beside the others.
 *
 * Three things happen, in this order, and each one earns its place.
 *
 * It is re-encoded rather than stored. The bytes that arrive are never the
 * bytes that get served: sharp decodes the image and writes a fresh WebP, so
 * EXIF goes (including, on a phone, where the picture was taken), and anything
 * hiding in a file that merely claims to be a JPEG does not survive being
 * turned into pixels and back.
 *
 * It is rotated to match its EXIF orientation first. Phones record "this is
 * sideways" in metadata rather than rotating the pixels, and stripping the
 * metadata without acting on it first is how a photograph ends up on its side.
 *
 * And the backdrop is keyed out, but only when it is safe to. The cards are
 * #131110, so an opaque photo reads as a rectangle on them. The same flood
 * fill the shoot used works here — inward from the border, so a black takeout
 * tray survives and only what is actually behind the food is removed — but it
 * is right only when the backdrop IS dark and even. Shot on a worktop under
 * strip lights it would eat the food. So the border is measured first, and if
 * it does not look like the studio floor the photo is left alone.
 */

/** What a phone produces, plus what a browser may convert it to. */
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** Before decoding. A modern phone photo is 3-5MB; 15 leaves room for a big one. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Matches the committed set, which is 820px on its longest side. */
const LONGEST_SIDE = 820;

/** Luminance below this is treated as backdrop; measured at 29 on the shoot. */
const BACKDROP_CUT = 34;

export type PhotoResult =
  | { ok: true; bytes: Buffer; width: number; height: number; keyed: boolean }
  | { ok: false; error: string };

const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Is the border dark and even enough that flood-filling it is safe?
 *
 * Both halves matter. Dark alone is not enough — a dim photo of a counter is
 * dark everywhere and keying it would punch holes through the middle of the
 * food. Even matters because a real studio backdrop has almost no variation
 * along its edge, and a room has plenty.
 */
function backdropIsStudioBlack(data: Buffer, w: number, h: number, ch: number): boolean {
  const at = (x: number, y: number) => {
    const i = (y * w + x) * ch;
    return lum(data[i]!, data[i + 1]!, data[i + 2]!);
  };
  const samples: number[] = [];
  const steps = 48;
  for (let i = 0; i < steps; i++) {
    const x = Math.min(w - 1, Math.floor((i / (steps - 1)) * (w - 1)));
    const y = Math.min(h - 1, Math.floor((i / (steps - 1)) * (h - 1)));
    samples.push(at(x, 1), at(x, h - 2), at(1, y), at(w - 2, y));
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const spread = Math.max(...samples) - Math.min(...samples);
  return mean < 26 && spread < 70;
}

/**
 * Remove the backdrop, and only the backdrop.
 *
 * Flood fill inward from every edge. A dark pixel the food encloses — the
 * inside of a tray, the char on a kabab, the gap between two fries — is never
 * reached, because the fill cannot get to it without crossing something
 * lighter. A plain "make dark pixels transparent" pass would take all of them.
 */
function keyBackdrop(data: Buffer, w: number, h: number, ch: number): void {
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const push = (x: number, y: number) => {
    const p = y * w + x;
    if (seen[p]) return;
    const i = p * ch;
    if (lum(data[i]!, data[i + 1]!, data[i + 2]!) > BACKDROP_CUT) return;
    seen[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (head < tail) {
    const p = queue[head++]!;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // Anti-alias the rim and only the rim. Fading every dark pixel instead would
  // make the trays half transparent and triple the file size — which is
  // exactly what the first version of the shoot's pipeline did.
  const soft = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += seen[yy * w + xx] ? 0 : 255;
          n++;
        }
      }
      soft[y * w + x] = Math.round(sum / n);
    }
  }
  for (let p = 0; p < w * h; p++) {
    const a = p * ch + 3;
    data[a] = seen[p] ? 0 : Math.min(data[a]!, soft[p]!);
  }
}

/**
 * The whole pipeline. Returns the bytes to store, or a message to show the
 * person who uploaded — never throws for a bad file, because "that is not a
 * picture" is an ordinary thing for somebody to do by accident.
 */
export async function preparePhoto(file: {
  type: string;
  size: number;
  bytes: () => Promise<Uint8Array>;
}): Promise<PhotoResult> {
  if (!ACCEPTED.has(file.type)) {
    return {
      ok: false,
      error: "That has to be a photo — JPEG, PNG or WebP. Take it with the camera app.",
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That photo is too big. Fifteen megabytes is the limit." };
  }
  if (file.size === 0) return { ok: false, error: "That file is empty." };

  const input = Buffer.from(await file.bytes());

  try {
    // rotate() with no argument applies the EXIF orientation and then drops
    // it, which is the only order that leaves a phone photo the right way up.
    const base = sharp(input, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({
        width: LONGEST_SIDE,
        height: LONGEST_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      });

    const { data, info } = await base
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const keyed = backdropIsStudioBlack(data, info.width, info.height, info.channels);
    if (keyed) keyBackdrop(data, info.width, info.height, info.channels);

    const bytes = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels as 4 },
    })
      .webp({ quality: 78, alphaQuality: 85, effort: 5 })
      .toBuffer();

    return { ok: true, bytes, width: info.width, height: info.height, keyed };
  } catch {
    // sharp refuses what it cannot decode — a HEIC straight off an iPhone that
    // the browser did not convert, or a file renamed to .jpg.
    return {
      ok: false,
      error: "That photo could not be read. Try saving it as a JPEG and uploading again.",
    };
  }
}
