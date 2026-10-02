// Helpers to author characters as layered SVG (same layer/pivot conventions as the
// style kit's artist template). Shapes are written as point lists and smoothed
// with Catmull-Rom curves, so organic outlines stay clean and easy to adjust.

const f = (v) => +v.toFixed(2);

/**
 * Smooth path through points. A point written as [x, y, 'c'] is a sharp corner.
 * `t` is the curve tension (1 = Catmull-Rom).
 */
export function smooth(pts, closed = true, t = 1) {
  const n = pts.length;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    const k1 = p1[2] === 'c' ? 0 : t / 6;
    const k2 = p2[2] === 'c' ? 0 : t / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k1, p1[1] + (p2[1] - p0[1]) * k1];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k2, p2[1] - (p3[1] - p1[1]) * k2];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

/** Ellipse as a path (so it can be clipped and reused like any shape). */
export function ellipse(cx, cy, rx, ry, rot = 0) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return smooth(pts);
}

let uid = 0;
const attrs = (a = {}) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');

export const path = (d, fill, a = {}) => `<path d="${d}" fill="${fill}"${attrs(a)}/>`;
export const stroke = (d, color, width, a = {}) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${attrs(a)}/>`;
export const g = (id, body, a = {}) => `<g${id ? ` id="${id}"` : ''}${attrs(a)}>${Array.isArray(body) ? body.join('') : body}</g>`;
export const pivot = (name, x, y) => `<circle id="pivot-${name}" cx="${f(x)}" cy="${f(y)}" r="2.2" fill="#ff2a8a" stroke="#ffffff" stroke-width="0.7" class="pivot"/>`;

/**
 * A shaded shape: base fill, inner shading shapes clipped to the outline, and a
 * thin silhouette line in a darker tone of its own colour (style rule P2).
 */
export function shape(outline, base, shading = [], line = null, lineWidth = 1.4) {
  const id = `c${++uid}`;
  const parts = [`<clipPath id="${id}"><path d="${outline}"/></clipPath>`, path(outline, base)];
  if (shading.length) parts.push(`<g clip-path="url(#${id})">${shading.join('')}</g>`);
  if (line) parts.push(stroke(outline, line, lineWidth));
  return parts.join('');
}

export function svg(viewBox, body, title = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${title ? `<title>${title}</title>` : ''}${body}</svg>\n`;
}

/**
 * Angry upper lid for an eye at (x, cy) in three-quarter view: it drops towards
 * the nose (the inner corner is on the right for the near eye, left for the far one).
 */
export function angryLid(which, x, cy, rx, ry) {
  const inner = cy - ry * 0.05;
  const outer = cy - ry * 0.6;
  const [lt, rt] = which === 'cerca' ? [outer, inner] : [inner, outer];
  return smooth([[x - rx - 2, cy - ry - 3], [x + rx + 2, cy - ry - 3], [x + rx + 1, rt], [x, (lt + rt) / 2 - 0.4], [x - rx - 1, lt]]);
}

/** Rounded rectangle centred on (cx, cy) as a path: square glasses, pockets, signs. */
export function rrect(cx, cy, hw, hh, r) {
  const x0 = cx - hw, x1 = cx + hw, y0 = cy - hh, y1 = cy + hh;
  return `M${f(x0 + r)} ${f(y0)}H${f(x1 - r)}Q${f(x1)} ${f(y0)} ${f(x1)} ${f(y0 + r)}V${f(y1 - r)}Q${f(x1)} ${f(y1)} ${f(x1 - r)} ${f(y1)}H${f(x0 + r)}Q${f(x0)} ${f(y1)} ${f(x0)} ${f(y1 - r)}V${f(y0 + r)}Q${f(x0)} ${f(y0)} ${f(x0 + r)} ${f(y0)}Z`;
}
