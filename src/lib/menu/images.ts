/**
 * The item photos are cutouts: the food on a transparent background, no plate
 * and no studio floor. Dropped straight onto a dark card they look pasted flat
 * onto it, so they get a shadow to sit on instead.
 *
 * The drawn SVG tiles — dips, drinks, and the "photo coming soon" placeholders —
 * carry their own frame already, so they stay flat. Returning a class rather
 * than a style keeps the shadow composable with `grayscale` for a sold-out item,
 * which a bare `filter` would clobber.
 */

const SHADOWS = {
  sm: "drop-shadow-[0_5px_7px_rgb(0_0_0/0.5)]",
  md: "drop-shadow-[0_14px_18px_rgb(0_0_0/0.55)]",
  lg: "drop-shadow-[0_24px_30px_rgb(0_0_0/0.6)]",
} as const;

export function cutoutShadow(imagePath: string, size: keyof typeof SHADOWS = "md"): string {
  return imagePath.includes("/cutout/") ? SHADOWS[size] : "";
}
