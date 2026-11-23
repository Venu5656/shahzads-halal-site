/**
 * Rebuilds every dish photo in public/img/menu from Shahzad's studio shoot.
 *
 *   node scripts/menu-images.mjs <out-dir> [quality]
 *
 * Run it when the shoot is reshot or a dish is added, then copy the result
 * over public/img/menu. It is here for the same reason scripts/hero-video.sh
 * is: the 45MB of source PNGs are not something to re-derive by hand, and the
 * mapping from "chicken platter.png" to chicken-over-rice.webp is a judgement
 * call that would otherwise live only in somebody's memory.
 *
 * The source is menu prices/Menu_Images_No_Lids: 1-2MB PNGs, half of them
 * already cut out and half still on the studio's black floor.
 */

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "/Users/venusikhakolli/Downloads/shahzads-halal-site/menu prices/Menu_Images_No_Lids";
const OUT = process.argv[2];
const QUALITY = Number(process.argv[3] ?? 74);

// slug -> [source file, published path, square size]
const MAP = {
  // Platters over rice — the homepage stage shows these big.
  "fish-over-rice":               ["fish platter.png",              "plate", 1100],
  "falafel-over-rice":            ["falafel platter.png",           "plate", 1100],
  "chicken-over-rice":            ["chicken platter.png",           "plate", 1100],
  "lamb-over-rice":               ["lamb platter.png",              "plate", 1100],
  "chicken-kofta-kabab-over-rice":["chicken kofta.png",             "plate", 1100],
  "chicken-chapli-kabab":         ["chicken chapli.png",            "plate", 1100],
  "beef-chapli-kabab-rice":       ["beef chapli.png",               "plate", 1100],
  "mix-platter":                  ["mic platter.png",               "plate", 1100],
  "chapli-kabab-mix":             ["chapli mix.png",                "plate", 1100],
  "shrimp-platter":               ["shrimp platter.png",            "plate", 1100],
  // Gyros
  "chicken-gyro":                 ["chicken gyro.png",              "plate", 820],
  "lamb-gyro":                    ["lamb gyro.png",                 "cutout", 900],
  "combo-gyro":                   ["chicken and lamb mix gyro.png", "plate", 820],
  "falafel-gyro":                 ["falafel on pita.png",           "plate", 820],
  "fish-pita":                    ["2 pc fish on pita.png",         "plate", 820],
  "kofta-kabab-gyro":             ["chicken kofta gyro.png",        "plate", 820],
  "chicken-chapli-gyro":          ["chicken chapli gyro.png",       "plate", 820],
  "mix-chapli-gyro":              ["chapli mix gyro.png",           "plate", 820],
  "beef-chapli-gyro":             ["beef chapli gyro.png",          "plate", 820],
  // Sandwiches and burgers
  "cheeseburger":                 ["cheeseburger.png",              "plate", 820],
  "chicken-sandwich":             ["chicken sandwich.png",          "plate", 820],
  "grilled-chicken-sandwich":     ["grilled chicken sandwich.png",  "plate", 820],
  "fish-sandwich":                ["fish burger.png",               "plate", 820],
  "veggie-burger":                ["veggie burger.png",             "plate", 820],
  "crispy-chicken-burger":        ["crispy chicken burger.png",     "plate", 820],
  "double-cheese-burger":         ["double cheese burger.png",      "plate", 820],
  "philly-cheesesteak":           ["philly cheesesteak.png",        "plate", 820],
  "chicken-cheesesteak":          ["chicken cheese setak.png",      "plate", 820],
  // Wings and sides
  "chicken-wings":                ["chicken wings.png",             "plate", 820],
  "french-fries":                 ["fries.png",                     "plate", 820],
  "onion-rings":                  ["onion rings.png",               "plate", 820],
  "waffle-fries":                 ["waffle fries.png",              "plate", 820],
  "chicken-nuggets":              ["chicken nuggest.png",           "plate", 820],
  "mozzarella-sticks":            ["mozerella sticks.png",          "plate", 820],
  "chicken-tenders":              ["chicken tenders.png",           "plate", 820],
  "falafel":                      ["falafel 2.png",                 "plate", 820],
  "baklava":                      ["baklava.png",                   "plate", 820],
};

/**
 * Remove the studio black, but only the black that is connected to the border.
 *
 * A plain luminance key would be wrong here: half these dishes sit in a black
 * takeout tray, and the tray is the subject. Flood-filling inward from the
 * edge keeps any dark pixel the food encloses — the tray, the char on a kabab,
 * the gap between two fries — and takes only the backdrop behind it.
 */
function keyOutBackdrop(data, w, h, channels) {
  const LUM = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  const CUT = 34;         // backdrop is pure black; border ring measured max 29
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (x, y) => {
    const p = y * w + x;
    if (seen[p]) return;
    if (LUM(p * channels) > CUT) return;
    seen[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  // Anti-alias the rim, and only the rim.
  //
  // The first attempt faded every dark pixel in the picture, not just the ones
  // against the backdrop. That ate the tray: the inside of a black takeout box
  // is exactly as dark as the studio floor behind it, so the box turned half
  // transparent and the card colour showed through it. It also tripled the
  // file size, because an alpha channel full of intermediate values compresses
  // far worse than one that is flat except at the edges.
  //
  // So: the mask is binary, and a 3x3 average softens it where — and only
  // where — a kept pixel touches a removed one.
  const soft = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      let sum = 0, n = 0;
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
      soft[p] = Math.round(sum / n);
    }
  }
  for (let p = 0; p < w * h; p++) {
    data[p * channels + 3] = seen[p] ? 0 : Math.min(data[p * channels + 3], soft[p]);
  }
  return data;
}

mkdirSync(join(OUT, "plate"), { recursive: true });
mkdirSync(join(OUT, "cutout"), { recursive: true });

const report = [];
for (const [slug, [file, folder, size]] of Object.entries(MAP)) {
  const src = sharp(join(SRC, file)).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const corner = data[3];
  const opaque = corner > 8;
  if (opaque) keyOutBackdrop(data, info.width, info.height, info.channels);

  let img = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
  // Trim the backdrop away, then keep the dish's own proportions.
  //
  // The first pass padded everything out to a square, which is what the old
  // tiles do, and it made the long items disappear: a cheesesteak is three
  // times as wide as it is tall, so squaring it spends two thirds of the frame
  // on nothing and draws the sandwich at a third of the size of the burger
  // beside it. Every frame these sit in uses object-contain, which already
  // handles any shape, so the sandwich may as well fill the width it has.
  img = sharp(await img.png().toBuffer()).trim({ threshold: 1 });
  const t = await img.png().toBuffer({ resolveWithObject: true });
  const air = Math.round(Math.max(t.info.width, t.info.height) * 0.04);
  const scale = size / Math.max(t.info.width + air * 2, t.info.height + air * 2);
  const squared = await sharp(t.data)
    .extend({ top: air, bottom: air, left: air, right: air, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: Math.round((t.info.width + air * 2) * scale),
      height: Math.round((t.info.height + air * 2) * scale),
      kernel: "lanczos3",
    })
    .webp({ quality: QUALITY, alphaQuality: 85, effort: 6 })
    .toBuffer();

  const dest = join(OUT, folder, `${slug}.webp`);
  writeFileSync(dest, squared);
  report.push({ slug, file, folder, size, opaque, bytes: squared.length });
}

report.sort((a, b) => b.bytes - a.bytes);
let total = 0;
for (const r of report) {
  total += r.bytes;
  console.log(
    `${String(Math.round(r.bytes / 1024)).padStart(4)}KB  ${r.opaque ? "keyed " : "cutout"}  ${r.folder}/${r.slug}.webp`.padEnd(52) + `← ${r.file}`
  );
}
console.log(`\n${report.length} images, ${(total / 1024 / 1024).toFixed(2)} MB total`);
