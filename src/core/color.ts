// Color helpers. Colors travel as [r, g, b] in 0..1 so lighting math stays simple.
export type RGB = [number, number, number];

export function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function css(c: RGB, a = 1): string {
  const r = Math.round(clamp01(c[0]) * 255);
  const g = Math.round(clamp01(c[1]) * 255);
  const b = Math.round(clamp01(c[2]) * 255);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function mul(a: RGB, b: RGB): RGB {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

export function scale(a: RGB, k: number): RGB {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function add(a: RGB, b: RGB): RGB {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function luma(c: RGB): number {
  return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
}

/** Darker tone of the same hue, used for silhouette lines (style rule E10). */
export function shade(c: RGB, k = 0.55): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** Hex string shortcut for canvas code: cssHex('#aabbcc', 0.5). */
export function cssHex(h: string, a = 1): string {
  return css(hex(h), a);
}
