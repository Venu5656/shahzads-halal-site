/**
 * Measures the hero text against the video actually playing behind it.
 *
 *   npm run dev              # in one terminal
 *   node scripts/hero-contrast.mjs
 *
 * How it works: it reads each run of text's real box and its real rendered
 * colour, hides the whole content layer, then screenshots the bare video and
 * scrim at five points across the loop at three viewports and takes the WORST
 * SINGLE PIXEL under each box. Alpha-blended colours are composited over the
 * pixel they actually land on before the ratio is taken.
 *
 * Two things it deliberately does not do:
 *
 * It never writes a colour down. An earlier version hardcoded them, and after
 * the hero's red and the status line changed it carried on reporting the old
 * values and showed no movement at all — a measurement that cannot notice the
 * thing it is measuring is worse than none.
 *
 * It ignores text-shadow, which the hero leans on heavily. The shadow follows
 * the letters and genuinely darkens what each glyph sits on, but it cannot be
 * sampled this way, so every figure here is a floor rather than the truth.
 *
 * Targets are WCAG AA: 3:1 for large text, 4.5:1 for body.
 */

import { chromium } from "@playwright/test";
import sharp from "sharp";

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "390x844", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const FRAMES = [0, 1.4, 2.8, 4.2, 5.6];

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Text drawn at alpha over a background pixel is really this colour.
const over = (fg, a, bg) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

// Colours are READ FROM THE PAGE, never written down here. The first version
// of this script hardcoded them, so after the hero's red and the status line
// were changed it went on measuring the old values and reported no movement.
const TARGETS = [
  { key: "headline ink", sel: "h1", need: 3 },
  { key: "headline red", sel: "h1 span", need: 3 },
  { key: "lede", sel: "section p.kuro-hero-text[class*='mt-10']", need: 4.5 },
  { key: "status line", sel: "section p.kuro-label.kuro-hero-text", need: 4.5 },
  { key: "phone number", sel: "section a[href^='tel:']", need: 4.5 },
];

const b = await chromium.launch();
const worst = new Map();

for (const vp of VIEWPORTS) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor ?? 1 });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/", { waitUntil: "load" });
  await p.waitForTimeout(2500);

  const boxes = await p.evaluate((targets) => {
    const out = {};
    for (const t of targets) {
      const el = document.querySelector(t.sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
      const m = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
      out[t.key] = { x: Math.max(0, r.left), y: Math.max(0, r.top),
                     w: Math.min(r.width, innerWidth - r.left), h: Math.min(r.height, innerHeight - r.top),
                     colour: m.slice(0, 3), alpha: m.length > 3 ? m[3] : 1 };
    }
    return out;
  }, TARGETS.map(({ key, sel }) => ({ key, sel })));

  // Hide the whole content layer, so what is sampled is video + scrim only.
  await p.addStyleTag({ content: ".kuro-hero-bg ~ * { visibility: hidden !important }" });

  for (const t of FRAMES) {
    await p.evaluate((time) => { const v = document.querySelector("video"); if (v) { v.pause(); v.currentTime = time; } }, t);
    await p.waitForTimeout(450);
    const png = await p.screenshot({ clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 900) } });
    const img = sharp(png);
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const scale = info.width / vp.width;

    for (const target of TARGETS) {
      const bx = boxes[target.key];
      if (!bx) continue;
      let lo = Infinity;
      const x0 = Math.round(bx.x * scale), y0 = Math.round(bx.y * scale);
      const x1 = Math.min(info.width - 1, Math.round((bx.x + bx.w) * scale));
      const y1 = Math.min(info.height - 1, Math.round((bx.y + bx.h) * scale));
      for (let y = y0; y <= y1; y += 2) {
        for (let x = x0; x <= x1; x += 2) {
          const i = (y * info.width + x) * info.channels;
          const bg = [data[i], data[i + 1], data[i + 2]];
          const fg = bx.alpha < 1 ? over(bx.colour, bx.alpha, bg) : bx.colour;
          const r = ratio(fg, bg);
          if (r < lo) lo = r;
        }
      }
      const prev = worst.get(target.key);
      if (!prev || lo < prev.r) worst.set(target.key, { r: lo, need: target.need, where: `${vp.name} @${t}s` });
    }
  }
  await ctx.close();
}
await b.close();

let bad = 0;
console.log("worst single pixel, 5 frames x 3 viewports, text layer hidden\n");
for (const [k, v] of worst) {
  const ok = v.r >= v.need;
  if (!ok) bad++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${k.padEnd(14)} ${v.r.toFixed(2).padStart(6)} : 1   needs ${v.need}   (${v.where})`);
}
console.log(bad ? `\n${bad} below target` : "\nall clear");
