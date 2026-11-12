import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Color = [number, number, number];
const css = readFileSync("app/globals.css", "utf8");
function colors(theme: "light" | "dark") {
  const block = css.match(new RegExp(`html\\[data-theme="${theme}"\\]\\s*\\{([^}]+)\\}`))?.[1];
  if (!block) throw new Error(`Missing ${theme} token block`);
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)].map((match) => [
      match[1],
      match.slice(2, 5).map(Number) as Color,
    ]),
  );
}
function luminance(rgb: Color) {
  return rgb
    .map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}
const pairs = [
  ...["surface", "surface-muted", "surface-raised"].flatMap((background) =>
    ["text", "text-muted", "brand-strong"].map((foreground) => [foreground, background]),
  ),
  ["on-brand", "brand"],
  ["brand-strong", "brand-soft"],
  ["success", "success-soft"],
  ["warning", "warning-soft"],
  ["danger", "danger-soft"],
  ["info", "info-soft"],
];
describe("semantic text and surface token contrast", () => {
  for (const theme of ["light", "dark"] as const)
    it(`${theme} documented foreground/background pairs meet AA normal text`, () => {
      const values = colors(theme);
      for (const [foreground, background] of pairs) {
        expect(values[foreground], `${theme}: missing ${foreground}`).toBeDefined();
        expect(values[background], `${theme}: missing ${background}`).toBeDefined();
        const a = luminance(values[foreground]);
        const b = luminance(values[background]);
        expect(
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          `${theme}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
});
