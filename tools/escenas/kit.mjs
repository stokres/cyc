// Helpers to author scenes as layered SVG, in the same language as the characters:
// rounded shapes, 2–3 tones per material and a thin line in a darker tone of the
// material itself (never black). Everything is painted in "daylight" albedo; the
// scene light is multiplied on top when the layer is baked (docs/ESTILO.md, L4).
import { smooth, ellipse, path, stroke, g, shape, rrect } from '../personajes/svg.mjs';

export { smooth, ellipse, path, stroke, g, shape, rrect };

const f2 = (v) => +(+v).toFixed(1);

/** Deterministic PRNG (mulberry32), same as src/core/util.ts. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const attrs = (a = {}) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');

export const rect = (x, y, w, h, fill, a = {}) => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${fill}"${attrs(a)}/>`;
export const circle = (cx, cy, r, fill, a = {}) => `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${fill}"${attrs(a)}/>`;
export const line = (x1, y1, x2, y2, color, w = 2, a = {}) => `<path d="M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"${attrs(a)}/>`;
export const poly = (pts, fill, a = {}) => `<path d="M${pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join('L')}Z" fill="${fill}"${attrs(a)}/>`;
export const polyD = (pts) => `M${pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join('L')}Z`;
export const rectD = (x, y, w, h) => polyD([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
export const text = (x, y, s, size, fill, a = {}) => `<text x="${f2(x)}" y="${f2(y)}" font-size="${size}" fill="${fill}"${attrs(a)}>${s}</text>`;

let gid = 0;
/** Linear gradient: returns [defs, url]. Stops: [[offset, color, opacity?], ...]. */
export function lin(x1, y1, x2, y2, stops) {
  const id = `lg${++gid}`;
  const s = stops.map(([o, c, op = 1]) => `<stop offset="${o}" stop-color="${c}"${op < 1 ? ` stop-opacity="${op}"` : ''}/>`).join('');
  return [`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}">${s}</linearGradient>`, `url(#${id})`];
}
export function rad(cx, cy, r, stops, sy = 1) {
  const id = `rg${++gid}`;
  const s = stops.map(([o, c, op = 1]) => `<stop offset="${o}" stop-color="${c}"${op < 1 ? ` stop-opacity="${op}"` : ''}/>`).join('');
  const tr = sy !== 1 ? ` gradientTransform="translate(${f2(cx)} ${f2(cy)}) scale(1 ${sy}) translate(${f2(-cx)} ${f2(-cy)})"` : '';
  return [`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}"${tr}>${s}</radialGradient>`, `url(#${id})`];
}
/** Fill a shape with a gradient in one call. */
export function gpath(d, grad, a = {}) {
  return grad[0] + path(d, grad[1], a);
}

/**
 * A material: base, shadow, light and line tones. `box` draws a rounded block
 * lit from the upper left (light strip on top/left, shadow strip bottom/right).
 */
export const mat = (base, shadow, light, lineC, deep) => ({ base, shadow, light, line: lineC, deep: deep ?? shadow });

export function box(x, y, w, h, m, { r = 4, lw = 2, sh = 0.14, li = 0.08, side = true } = {}) {
  const d = rrect(x + w / 2, y + h / 2, w / 2, h / 2, Math.min(r, w / 2, h / 2));
  const s = [];
  if (li > 0) s.push(rect(x, y, w, Math.max(2, h * li), m.light));
  if (sh > 0) s.push(rect(x, y + h * (1 - sh), w, h * sh, m.shadow));
  if (side) s.push(rect(x + w - Math.max(3, w * 0.05), y, Math.max(3, w * 0.05), h, m.shadow, { opacity: 0.7 }));
  return shape(d, m.base, s, m.line, lw);
}

/** A flat-ish panel with an inner bevel (cabinet doors, drawers, panelled doors). */
export function bevel(x, y, w, h, m, { r = 3, inset = 8, lw = 1.6 } = {}) {
  return [
    box(x, y, w, h, m, { r, lw, sh: 0.06, li: 0.04, side: false }),
    stroke(rrect(x + w / 2, y + h / 2, w / 2 - inset, h / 2 - inset, r), m.shadow, 2.2),
    stroke(`M${f2(x + inset + 2)} ${f2(y + h - inset + 1.5)}H${f2(x + w - inset - 2)}`, m.light, 1.6, { opacity: 0.8 }),
  ].join('');
}

/** Rounded-rect outline path from corner coords. */
export const rr = (x, y, w, h, r) => rrect(x + w / 2, y + h / 2, w / 2, h / 2, Math.min(r, w / 2, h / 2));

/** Grid of tiles (bathroom, kitchen backsplash). Staggered when `bond` is true. */
export function tiles(x, y, w, h, tw, th, base, grout, { bond = true, seed = 1, vary = [], lw = 1.6 } = {}) {
  const r = rng(seed);
  const out = [rect(x, y, w, h, grout)];
  for (let row = 0, yy = y; yy < y + h; row++, yy += th) {
    const off = bond && row % 2 ? tw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += tw) {
      const x0 = Math.max(x, xx) + lw / 2;
      const x1 = Math.min(x + w, xx + tw) - lw / 2;
      const y1 = Math.min(y + h, yy + th) - lw / 2;
      if (x1 - x0 < 2 || y1 - yy < 2) continue;
      const c = vary.length && r() < 0.35 ? vary[Math.floor(r() * vary.length)] : base;
      out.push(rect(x0, yy + lw / 2, x1 - x0, y1 - yy - lw / 2, c, { rx: 1.5 }));
    }
  }
  return out.join('');
}

/** Brick wall with three tones and gentle irregularity. */
export function bricks(x, y, w, h, tones, mortar, { bw = 30, bh = 11, seed = 1 } = {}) {
  const r = rng(seed);
  const out = [rect(x, y, w, h, mortar)];
  for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) {
      const x0 = Math.max(x, xx + 1.2);
      const x1 = Math.min(x + w, xx + bw - 1.2);
      const y1 = Math.min(y + h, yy + bh - 1.2);
      if (x1 - x0 < 2 || y1 - yy < 2) continue;
      const p = r();
      out.push(rect(x0, yy + 1.2, x1 - x0, y1 - yy - 1.2, p < 0.6 ? tones[0] : p < 0.85 ? tones[1] : tones[2], { rx: 1.5 }));
    }
  }
  return out.join('');
}

/** Leaf cluster for plants and trees: overlapping blobs in 3 tones, light on top. */
export function foliage(cx, cy, rx, ry, tones, seed = 1, { n = 14, leaf = 0.42, lineC } = {}) {
  const r = rng(seed);
  const blobs = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    blobs.push([cx + Math.cos(a) * rx * d * 0.75, cy + Math.sin(a) * ry * d * 0.75, (0.6 + r() * 0.5) * rx * leaf, (0.6 + r() * 0.5) * ry * leaf]);
  }
  blobs.sort((a, b) => a[1] - b[1]);
  const out = [];
  // Dark mass first, then mid, then lit tops.
  out.push(path(ellipse(cx, cy + ry * 0.05, rx * 0.95, ry * 0.92), tones[0]));
  for (const [x, y, a, b] of blobs) {
    const top = y < cy - ry * 0.15;
    out.push(path(ellipse(x, y, a, b), top ? tones[2] : tones[1], lineC ? {} : {}));
    if (top) out.push(path(ellipse(x - a * 0.2, y - b * 0.25, a * 0.55, b * 0.45), tones[3] ?? tones[2], { opacity: 0.8 }));
  }
  return out.join('');
}

/** Little potted plant (window sills, mantel, shelves). */
export function pottedPlant(x, base, s, seed, { pot = mat('#c4704a', '#9c5235', '#dc8c63', '#6d3420'), leaves = ['#2f5d3a', '#3f7a48', '#5b9a5a', '#7bb46c'], tall = 1 } = {}) {
  const r = rng(seed);
  const out = [];
  // Leaves: fans of pointed leaves.
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
    const len = (26 + r() * 22) * s * tall;
    const tipx = x + Math.cos(a) * len;
    const tipy = base - 30 * s + Math.sin(a) * len;
    const mx = (x + tipx) / 2 + Math.cos(a + 1.57) * 7 * s;
    const my = (base - 30 * s + tipy) / 2 + Math.sin(a + 1.57) * 7 * s;
    const mx2 = (x + tipx) / 2 - Math.cos(a + 1.57) * 7 * s;
    const my2 = (base - 30 * s + tipy) / 2 - Math.sin(a + 1.57) * 7 * s;
    const c = leaves[1 + Math.floor(r() * 3)];
    out.push(path(smooth([[x, base - 28 * s, 'c'], [mx, my], [tipx, tipy, 'c'], [mx2, my2]]), c));
    out.push(stroke(`M${f2(x)} ${f2(base - 28 * s)}L${f2((x + tipx) / 2)} ${f2((base - 28 * s + tipy) / 2)}`, leaves[0], 1.2 * s, { opacity: 0.6 }));
  }
  const pw = 22 * s;
  out.push(shape(polyD([[x - pw, base - 32 * s], [x + pw, base - 32 * s], [x + pw * 0.78, base], [x - pw * 0.78, base]]), pot.base, [rect(x + pw * 0.3, base - 40 * s, pw, 40 * s, pot.shadow), rect(x - pw, base - 32 * s, pw * 2, 6 * s, pot.light)], pot.line, 1.4));
  out.push(shape(rr(x - pw - 3 * s, base - 37 * s, pw * 2 + 6 * s, 9 * s, 2), pot.base, [rect(x - pw - 3 * s, base - 31 * s, pw * 2 + 6 * s, 3 * s, pot.shadow)], pot.line, 1.4));
  return out.join('');
}

/** Picture frame with passe-partout and an abstract print (like the reference plan). */
export function framed(x, y, w, h, art, { frame = mat('#2c2a2a', '#1c1b1b', '#4a4646', '#121111'), mount = '#f4efe6' } = {}) {
  return [
    rect(x + 6, y + 8, w, h, '#000', { opacity: 0.12, rx: 2 }),
    box(x, y, w, h, frame, { r: 2, lw: 1.5, sh: 0.04, li: 0.02, side: false }),
    rect(x + 8, y + 8, w - 16, h - 16, mount),
    rect(x + 8, y + 8, w - 16, 5, '#d8d0c2'),
    art,
  ].join('');
}

/** Scene perspective. The back plane (facades / back wall) sits at factor 1. */
export function persp({ HOR, BASE, CX = 1170 }) {
  const f = (y) => (y - HOR) / (BASE - HOR);
  const yOf = (k) => HOR + (BASE - HOR) * k;
  // Ground point (X in back-plane units, depth factor k) to the layer's u-space.
  const gp = (X, k) => [CX + k * (X - CX), yOf(k)];
  const uOf = (X, k) => CX + k * (X - CX);
  return { HOR, BASE, CX, f, yOf, gp, uOf };
}

export { f2 };
