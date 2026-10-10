// The street, at night: from Fran's front door, past the shops, along the big
// playground with the Chinese dragon, across a side street and into the
// pedestrian street where the Bar del Río has its terrace.
//
// One camera model for everything (docs/ESTILO.md, phase 3): facades at depth 1,
// a camera 8 m away and ~2.9 m up. Each layer sits at its true depth factor k,
// the ground is drawn with per-row parallax and the walls of the side street are
// rendered in strips, so the whole street holds together in perspective as the
// camera pans.
import {
  smooth, ellipse, path, stroke, g, shape, rect, circle, line, poly, polyD, rectD, rr, lin, rad, gpath,
  mat, box, bevel, tiles, bricks, foliage, persp, rng, f2, ao,
} from './kit.mjs';

export const P = persp({ HOR: 150, BASE: 760, CX: 1170 });
export const W = 8200;
export const M = 210; // units per metre on the facades
export const ZW = 8; // camera distance to the facades, metres
const kAt = (d) => ZW / (ZW + d); // depth factor d metres behind the facades
const { gp, yOf, uOf } = P;

const BRICK = ['#b4694e', '#a05a42', '#c47c60'];
const MORTAR = '#d9c4ab';
const GRANITE = mat('#a8a6a2', '#8a8884', '#c4c2bd', '#5e5c58');
const IRON = mat('#2f3a36', '#1f2724', '#4a5a54', '#141a18');
const STEEL = mat('#c4c8cc', '#9ca1a8', '#e2e4e6', '#5c6168');
const WOODD = mat('#5a3a26', '#42291a', '#7a5236', '#26160c');
const RED = mat('#cf3a3a', '#97232a', '#ef6a5a', '#5e1418');
const YEL = mat('#f4c23a', '#c9921a', '#ffe48a', '#7a5414');

// Street layout along the facades (X in facade units).
const X = {
  portal: [300, 540], merceria: [620, 980], fruta: [1030, 1470], panaderia: [1500, 1960],
  parque: [2000, 4400], puerta: [3080, 3300], farmacia: [4400, 4900], cruce: [4900, 6200],
  bar: [6440, 7040], puertaAzul: [6250, 6420], puerta40: [7060, 7250], fin: 8200,
};

// ---------------------------------------------------------------- facades

function plinth(x0, x1) {
  const out = [rect(x0, 700, x1 - x0, 60, GRANITE.base), rect(x0, 700, x1 - x0, 5, GRANITE.light), rect(x0, 752, x1 - x0, 8, GRANITE.shadow)];
  for (let x = x0 + 70; x < x1; x += 140) out.push(line(x, 705, x, 752, GRANITE.shadow, 1.5));
  return out.join('');
}

/** First-floor balconies, cut by the top of the frame: slab, bars and a pot or two. */
function balconies(x0, x1, seed, { every = 330, w = 220, plants = true } = {}) {
  const r = rng(seed);
  const out = [];
  for (let x = x0 + (every - w) / 2; x + w <= x1; x += every) {
    out.push(rect(x + 20, -30, w - 40, 30, '#3c2c34', { opacity: 0.55 }));
    out.push(box(x, -6, w, 24, GRANITE, { r: 2, sh: 0.4, li: 0.2 }));
    for (let b = x + 8; b < x + w - 4; b += 14) out.push(rect(b, -40, 4, 36, IRON.base));
    out.push(rect(x, -12, w, 6, IRON.base));
    if (plants && r() < 0.7) {
      const px = x + 30 + r() * (w - 60);
      out.push(foliage(px, -14, 34, 22, ['#2f5d3a', '#3f7a48', '#5b9a5a', '#7bb46c'], seed + x, { n: 7 }));
      if (r() < 0.6) for (let i = 0; i < 4; i++) out.push(stroke(`M${px - 20 + i * 12} -4Q${px - 24 + i * 12} 30 ${px - 18 + i * 13} ${40 + r() * 30}`, '#3f7a48', 3));
    }
    if (r() < 0.35) out.push(box(x + w - 70, -38, 56, 34, mat('#e9e6df', '#c9c5bc', '#f7f5f0', '#8a8680'), { r: 3 }));
  }
  return out.join('');
}

/** Messy overhead cables, very Madrid. */
function cables(x0, x1, seed, y = 40) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < 4; i++) {
    const ya = y + r() * 40;
    const yb = y + r() * 40;
    const sag = 20 + r() * 40;
    out.push(stroke(`M${x0} ${ya}C${x0 + (x1 - x0) * 0.3} ${ya + sag} ${x0 + (x1 - x0) * 0.7} ${yb + sag} ${x1} ${yb}`, '#1c1a1e', 2.4 + r() * 1.5));
  }
  return out.join('');
}

/** A graffiti tag, loud colours with a dark outline. */
function tag(x, y, s, seed, colors) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < 9; i++) pts.push([x + i * 26 * s + (r() - 0.5) * 10 * s, y + (r() - 0.5) * 40 * s]);
  const d = smooth(pts, false);
  return [stroke(d, '#1a1a22', 20 * s), stroke(d, colors[0], 13 * s), stroke(d, colors[1], 4 * s, { opacity: 0.8 }), ...pts.filter((_, i) => i % 3 === 1).map(([a, b]) => circle(a + 8 * s, b - 22 * s, 4 * s, colors[1]))].join('');
}

function shutter(x0, x1, y0, y1, seed) {
  const out = [rect(x0, y0, x1 - x0, y1 - y0, '#9aa0a6')];
  for (let y = y0 + 6; y < y1; y += 12) out.push(rect(x0, y, x1 - x0, 4, '#7e848b'), rect(x0, y - 2, x1 - x0, 2, '#b6bbc0'));
  out.push(rect(x0, y1 - 18, x1 - x0, 18, '#6e747b'), rect(x0 - 8, y0 - 26, x1 - x0 + 16, 28, '#8a9096', { rx: 3 }));
  out.push(tag(x0 + 40, y0 + (y1 - y0) * 0.55, 1.3, seed, ['#ff5aa0', '#7af0e0']), tag(x0 + (x1 - x0) * 0.5, y0 + (y1 - y0) * 0.3, 0.9, seed + 3, ['#ffd23a', '#ffffff']));
  return out.join('');
}

// ---------------------------------------------------------------- shop windows
// A lit shop seen through its glass, all of it emissive so it glows at night: the
// back wall with light pooling under the ceiling lamps, the goods each shop lays
// out, and the glass on top (the frame's shadow, two slanted reflections and the
// dark street reflected low down).

/** Back wall, ceiling with its lamps and the strip of floor of a lit shop. */
function interior(x0, y0, x1, y1, { wall, wall2, floor, ceil = '#3a3434', lamps = 3 }) {
  const w = x1 - x0;
  const h = y1 - y0;
  const o = [gpath(rectD(x0, y0, w, h), lin(0, y0, 0, y1, [[0, wall], [1, wall2]]))];
  const rx = (w / lamps) * 0.6;
  const ry = h * 0.5;
  const xs = Array.from({ length: lamps }, (_, i) => x0 + (w * (i + 0.5)) / lamps);
  for (const cx of xs) o.push(gpath(ellipse(cx, y0 + 18, rx, ry), rad(cx, y0 + 18, rx, [[0, '#ffffff', 0.55], [1, '#ffffff', 0]], ry / rx)));
  o.push(rect(x0, y0, w, 16, ceil));
  for (const cx of xs) o.push(rect(cx - 34, y0 + 12, 68, 5, '#cfd2d4'), rect(cx - 30, y0 + 17, 60, 5, '#ffffff'));
  o.push(rect(x0, y1 - 24, w, 24, floor), rect(x0, y1 - 24, w, 3, '#000000', { opacity: 0.12 }));
  return o.join('');
}

/** The glass over a shop window: frame shadow, reflections and the street low down. */
function cristal(x0, y0, x1, y1) {
  const w = x1 - x0;
  const h = y1 - y0;
  const brillo = [[0, '#ffffff', 0], [0.33, '#ffffff', 0], [0.34, '#ffffff', 0.16], [0.42, '#ffffff', 0.1], [0.43, '#ffffff', 0], [0.5, '#ffffff', 0], [0.51, '#ffffff', 0.12], [0.54, '#ffffff', 0.07], [0.55, '#ffffff', 0]];
  return [
    ao(x0, y0, w, Math.min(34, h * 0.12), 0.32),
    gpath(rectD(x0, y0, Math.min(16, w * 0.1), h), lin(x0, 0, x0 + Math.min(16, w * 0.1), 0, [[0, '#1a1222', 0.25], [1, '#1a1222', 0]])),
    gpath(rectD(x0, y1 - h * 0.3, w, h * 0.3), lin(0, y1 - h * 0.3, 0, y1, [[0, '#2a2440', 0], [1, '#2a2440', 0.35]])),
    gpath(rectD(x0, y0, w, h), lin(x0, y0, x0 + h * 0.6, y0 + h, brillo)),
  ].join('');
}

/** A shelf of packed goods (tins, jars, boxes), in runs of one product as shops lay them out. */
function estante(x0, x1, y, seed, pal, { s = 1, board = '#c8b89a' } = {}) {
  const r = rng(seed);
  const o = [];
  let x = x0 + 4 * s;
  while (x < x1 - 20 * s) {
    const kind = Math.floor(r() * 3);
    const c = pal[Math.floor(r() * pal.length)];
    const n = 2 + Math.floor(r() * 4);
    const w = [14, 16, 20][kind] * s;
    const h = [20, 24, 30][kind] * s;
    for (let i = 0; i < n && x + w < x1 - 4 * s; i++, x += w + 2 * s) {
      if (kind === 0) o.push(rect(x, y - h, w, h, '#c8ccd0', { rx: 2 * s }), rect(x, y - h * 0.78, w, h * 0.56, c), rect(x + w * 0.6, y - h, w * 0.22, h, '#ffffff', { opacity: 0.35 }));
      else if (kind === 1) o.push(rect(x, y - h, w, h, c, { rx: 4 * s, opacity: 0.9 }), rect(x + s, y - h - 4 * s, w - 2 * s, 5 * s, '#c9a14f', { rx: 1.5 * s }), rect(x + 3 * s, y - h * 0.62, w - 6 * s, h * 0.3, '#f6f0e0'));
      else o.push(rect(x, y - h, w, h, c, { rx: 1.5 * s }), rect(x, y - h * 0.58, w, h * 0.2, '#ffffff', { opacity: 0.75 }), rect(x + w - 3 * s, y - h, 3 * s, h, '#000000', { opacity: 0.15 }));
    }
    x += 8 * s;
  }
  o.push(rect(x0, y, x1 - x0, 6 * s, board), rect(x0, y + 6 * s, x1 - x0, 5 * s, '#000000', { opacity: 0.14 }));
  return o.join('');
}

/** A heap of round fruit in a crate: rows that narrow upwards, each fruit with its shine. */
function monton(x0, x1, base, rf, m, seed) {
  const r = rng(seed);
  const o = [];
  for (let row = 0, y = base - rf * 0.6, a = x0 + rf, b = x1 - rf; row < 3 && a <= b; row++, y -= rf * 1.45, a += rf, b -= rf) {
    for (let x = a; x <= b + 0.1; x += rf * 2) {
      const fx = x + (r() - 0.5) * rf * 0.3;
      const fy = y + (r() - 0.5) * rf * 0.2;
      o.push(shape(ellipse(fx, fy, rf, rf * 0.92), m.base, [path(ellipse(fx + rf * 0.3, fy + rf * 0.35, rf * 0.8, rf * 0.6), m.shadow), path(ellipse(fx - rf * 0.35, fy - rf * 0.38, rf * 0.3, rf * 0.2), '#ffffff', { opacity: 0.6 })], m.line, 1));
    }
  }
  return o.join('');
}

const FRUTA = {
  naranja: mat('#f08a2e', '#c8661a', '#ffb466', '#7a3a10'),
  manzana: mat('#d8362e', '#a3221e', '#f26a5a', '#5e1010'),
  verde: mat('#8ac43a', '#5e9a24', '#b8e06a', '#2e5010'),
  limon: mat('#f4d43a', '#cfa81a', '#fff08a', '#7a6010'),
  ciruela: mat('#7a3a8a', '#55245e', '#a868b4', '#2a1030'),
  tomate: mat('#e8452a', '#b02a18', '#ff7a5a', '#5e1408'),
};

/** A tilted crate of fruit with its little price card. */
function cajaFruta(x, base, w, m, rf, seed) {
  const wood = mat('#c9a06a', '#a47c48', '#e0bc88', '#6e5028');
  const h = rf * 2.6;
  return [
    monton(x + 2, x + w - 2, base - h + rf * 0.7, rf, m, seed),
    box(x, base - h, w, h, wood, { r: 2, sh: 0.25, li: 0.12, side: false }),
    rect(x + 4, base - h * 0.5, w - 8, 2.5, wood.shadow),
    rect(x + 6, base - h + 5, 18, 11, '#ffffff', { rx: 2 }),
    rect(x + 9, base - h + 9, 12, 2.5, '#d8323a'),
  ].join('');
}

/** A lucky cat on the counter, waving. */
function gatoSuerte(x, base, s = 1) {
  const blanco = mat('#fbf4e4', '#e8d8b8', '#ffffff', '#a8946a');
  return [
    path(ellipse(x, base - 2 * s, 30 * s, 6 * s), '#000000', { opacity: 0.25 }),
    shape(ellipse(x, base - 30 * s, 26 * s, 30 * s), blanco.base, [path(ellipse(x + 12 * s, base - 22 * s, 16 * s, 26 * s), blanco.shadow)], blanco.line, 1.6),
    shape(rr(x + 20 * s, base - 86 * s, 13 * s, 38 * s, 6 * s), blanco.base, [], blanco.line, 1.4),
    path(polyD([[x - 22 * s, base - 82 * s], [x - 14 * s, base - 104 * s], [x - 4 * s, base - 86 * s]]), blanco.line),
    path(polyD([[x + 4 * s, base - 86 * s], [x + 14 * s, base - 104 * s], [x + 22 * s, base - 82 * s]]), blanco.line),
    path(polyD([[x - 19 * s, base - 84 * s], [x - 14 * s, base - 98 * s], [x - 8 * s, base - 86 * s]]), '#f2a0a0'),
    path(polyD([[x + 8 * s, base - 86 * s], [x + 14 * s, base - 98 * s], [x + 19 * s, base - 84 * s]]), '#f2a0a0'),
    shape(ellipse(x, base - 72 * s, 24 * s, 19 * s), blanco.base, [path(ellipse(x + 10 * s, base - 66 * s, 14 * s, 14 * s), blanco.shadow, { opacity: 0.6 })], blanco.line, 1.6),
    stroke(`M${x - 13 * s} ${base - 75 * s}q4 -4 8 0`, '#3a2a1a', 2 * s),
    stroke(`M${x + 5 * s} ${base - 75 * s}q4 -4 8 0`, '#3a2a1a', 2 * s),
    circle(x, base - 68 * s, 2.4 * s, '#e0606a'),
    rect(x - 20 * s, base - 55 * s, 40 * s, 6 * s, '#d8323a', { rx: 3 * s }),
    circle(x, base - 48 * s, 5 * s, '#f0c23a'),
    shape(ellipse(x - 6 * s, base - 22 * s, 13 * s, 10 * s), '#f0c23a', [], '#9c7a1a', 1.2),
  ].join('');
}

function franBuilding(em, tx) {
  const out = [];
  out.push(bricks(0, -40, 1000, 740, BRICK, MORTAR, { bw: 36, bh: 13, seed: 11 }));
  out.push(gpath(rectD(0, -40, 1000, 300), lin(0, -40, 0, 260, [[0, '#2a1a20', 0.35], [1, '#2a1a20', 0]])));
  out.push(balconies(0, 1000, 5));
  out.push(plinth(0, 1000));
  // Ground-floor window with bars and a lit curtain.
  out.push(box(52, 290, 200, 280, GRANITE, { r: 2, sh: 0.05, li: 0.03 }));
  out.push(rect(70, 308, 164, 244, '#2a2430'));
  em.push(gpath(rectD(70, 308, 164, 244), lin(0, 308, 0, 552, [[0, '#ffcf8a'], [1, '#f0a060']])), path(smooth([[70, 308, 'c'], [150, 308, 'c'], [130, 420], [110, 552, 'c'], [70, 552, 'c']]), '#f6e2c0', { opacity: 0.9 }), path(smooth([[234, 308, 'c'], [196, 308, 'c'], [206, 420], [214, 552, 'c'], [234, 552, 'c']]), '#f6e2c0', { opacity: 0.9 }), circle(170, 360, 26, '#2e7a3a', { opacity: 0.55 }));
  em.push(cristal(70, 308, 234, 552));
  for (let x = 78; x < 234; x += 22) em.push(rect(x, 300, 6, 262, IRON.line));
  em.push(rect(64, 330, 176, 6, IRON.line), rect(64, 520, 176, 6, IRON.line));
  out.push(box(44, 566, 216, 18, GRANITE, { r: 2, sh: 0.4, li: 0.2 }));
  // Fran's portal: granite surround, fanlight and a green iron-and-glass door.
  const [p0, p1] = X.portal;
  out.push(box(p0 - 14, 150, p1 - p0 + 28, 610, GRANITE, { r: 2, sh: 0.02, li: 0.02 }));
  out.push(rect(p0 + 18, 186, p1 - p0 - 36, 560, IRON.line));
  em.push(gpath(rectD(p0 + 24, 192, p1 - p0 - 48, 548), lin(0, 192, 0, 740, [[0, '#ffe2a8'], [0.5, '#f4c07a'], [1, '#c98a50']])));
  // Inside: stairs and the mailboxes, soft and warm.
  em.push(path(polyD([[p0 + 120, 740], [p1 - 30, 560], [p1 - 30, 740]]), '#b07a4a', { opacity: 0.55 }));
  for (let i = 0; i < 6; i++) em.push(rect(p0 + 140 + i * 30, 720 - i * 26, 34, 6, '#8a5a34', { opacity: 0.5 }));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) em.push(rect(p0 + 34 + i * 26, 430 + j * 30, 22, 24, '#9a8a6a', { opacity: 0.55 }));
  const door = [rect(p0 + 18, 186, p1 - p0 - 36, 12, IRON.base), rect(p0 + 18, 300, p1 - p0 - 36, 12, IRON.base), rect((p0 + p1) / 2 - 6, 300, 12, 446, IRON.base)];
  for (const x of [p0 + 18, p1 - 30]) door.push(rect(x, 186, 12, 560, IRON.base));
  for (let i = 0; i < 7; i++) door.push(stroke(`M${p0 + 30 + i * 30} 298Q${(p0 + p1) / 2} ${200 - Math.abs(i - 3) * 6} ${p1 - 30 - i * 30} 298`, IRON.base, 3));
  door.push(rect(p0 + 18, 600, p1 - p0 - 36, 10, IRON.base));
  for (const x of [p0 + 60, p0 + 90, p1 - 90, p1 - 60]) door.push(rect(x, 610, 6, 130, IRON.base));
  door.push(box((p0 + p1) / 2 - 22, 470, 10, 60, mat('#c9a14f', '#9c7a35', '#e6c97c', '#5e4719'), { r: 4 }), box((p0 + p1) / 2 + 12, 470, 10, 60, mat('#c9a14f', '#9c7a35', '#e6c97c', '#5e4719'), { r: 4 }));
  em.push(...door);
  out.push(box(p0 - 30, 740, p1 - p0 + 60, 20, GRANITE, { r: 2, sh: 0.4, li: 0.3 }));
  out.push(box(p1 + 20, 400, 44, 150, STEEL, { r: 4 }));
  for (let i = 0; i < 5; i++) out.push(circle(p1 + 33, 430 + i * 22, 5, '#5c6168'), circle(p1 + 51, 430 + i * 22, 5, '#5c6168'));
  out.push(rect(p1 + 30, 412, 24, 10, '#2a2d32', { rx: 2 }));
  out.push(box((p0 + p1) / 2 - 40, 120, 80, 50, mat('#2f5d8a', '#234a70', '#4a7ab0', '#14304a'), { r: 4 }));
  tx.push({ x: (p0 + p1) / 2, y: 146, s: '12', size: 32, font: 'display', color: '#f3ead6' });
  // The old haberdashery, closed for years: faded sign and a tagged shutter.
  const [m0, m1] = X.merceria;
  out.push(box(m0, 140, m1 - m0, 86, mat('#e8dcc0', '#cbbf9f', '#f4ecd8', '#8a7e5e'), { r: 3 }));
  tx.push({ x: (m0 + m1) / 2, y: 184, s: 'MERCERÍA LOLI', size: 40, font: 'serif', weight: 700, color: '#5e8a6a', maxW: m1 - m0 - 40 });
  out.push(shutter(m0 + 20, m1 - 20, 262, 740, 23));
  return out.join('');
}

function shopsBuilding(em, tx) {
  const out = [];
  out.push(rect(1000, -40, 1000, 740, '#dcc6a4'));
  out.push(gpath(rectD(1000, -40, 1000, 300), lin(0, -40, 0, 260, [[0, '#2a1a20', 0.3], [1, '#2a1a20', 0]])));
  for (let y = 0; y < 700; y += 46) out.push(rect(1000, y, 1000, 2, '#c9b28e', { opacity: 0.6 }));
  out.push(balconies(1000, 2000, 9, { every: 340, w: 240 }));
  out.push(cables(1000, 2000, 4, 60));
  out.push(plinth(1000, 2000));
  out.push(rect(1996, -40, 8, 800, '#b8a07a'));
  // Fruit shop: lit sign box, striped awning, an open shop full of colour.
  const [f0, f1] = X.fruta;
  out.push(box(f0, 112, f1 - f0, 86, mat('#f4f4ee', '#d8d8ce', '#ffffff', '#8a8a80'), { r: 4 }));
  em.push(rect(f0 + 8, 120, f1 - f0 - 16, 70, '#f8fbf2'));
  tx.push({ x: (f0 + f1) / 2, y: 156, s: 'FRUTERÍA · ALIMENTACIÓN', size: 38, font: 'body', weight: 800, color: '#2e7a3a', maxW: f1 - f0 - 40, emissive: true });
  // Inside: tins and jars at the back, a stepped stand of fruit crates, bananas
  // hanging, and the counter with the scale behind the glass door on the right.
  const v0 = f0 + 20;
  const v1 = f1 - 20;
  const dx = f1 - 130;
  out.push(rect(v0, 290, v1 - v0, 430, '#2a2a30'));
  em.push(interior(v0, 290, v1, 720, { wall: '#f6f8ee', wall2: '#dfe6d2', floor: '#b8b0a0', ceil: '#3a4038' }));
  const lata = ['#e04a3a', '#f0c23a', '#3a7be0', '#3ab070', '#e07a2a', '#f6f0e0'];
  em.push(estante(v0 + 150, dx - 6, 380, 31, lata), estante(v0 + 150, dx - 6, 452, 32, lata));
  em.push(rect(dx + 4, 560, v1 - dx - 4, 160, '#c9b28e'), rect(dx + 4, 560, v1 - dx - 4, 8, '#e6d6b8'), rect(dx + 4, 600, v1 - dx - 4, 120, '#000000', { opacity: 0.12 }));
  em.push(box(dx + 20, 520, 64, 40, mat('#f4f4f0', '#d4d6d2', '#ffffff', '#7a7e80'), { r: 4 }), rect(dx + 30, 528, 30, 12, '#2a3a2a'), rect(dx + 33, 531, 24, 6, '#d8323a'), path(ellipse(dx + 52, 516, 30, 5), '#cfd2d4'));
  // Bananas hanging from a rail at the top left.
  em.push(rect(v0 + 10, 326, 130, 5, '#8a7e70'));
  for (const bx of [v0 + 36, v0 + 80, v0 + 122]) {
    em.push(line(bx, 330, bx, 344, '#6a5a3a', 2));
    for (let i = -2; i <= 2; i++) em.push(path(smooth([[bx, 346, 'c'], [bx + i * 9 - 4, 370], [bx + i * 12, 398, 'c'], [bx + i * 9 + 5, 372]]), i % 2 ? '#f2cf3a' : '#e8c22a'), circle(bx + i * 12, 398, 2.4, '#5a4a2a'));
  }
  // The stand: three steps of crates, the back ones higher and smaller.
  const filas = [[520, 9, ['verde', 'limon', 'ciruela']], [606, 10, ['manzana', 'naranja', 'verde', 'tomate']], [694, 11, ['naranja', 'tomate', 'limon', 'manzana']]];
  for (const [base, rf, frutas] of filas) {
    const n = frutas.length;
    const cw = (dx - v0 - 30) / n;
    em.push(rect(v0 + 6, base - 4, dx - v0 - 12, 30, '#6a8a4a'), rect(v0 + 6, base - 4, dx - v0 - 12, 4, '#8aaa5a'));
    frutas.forEach((f, i) => em.push(cajaFruta(v0 + 14 + i * cw, base, cw - 8, FRUTA[f], rf, base + i)));
  }
  // The glass door: aluminium frame and its handle.
  em.push(rect(dx - 4, 290, 8, 430, '#9aa2a8'), rect(v1 - 6, 290, 6, 430, '#9aa2a8'), rect(dx + 14, 440, 6, 80, '#d8dce0', { rx: 3 }));
  em.push(cristal(v0, 290, dx - 4, 720), cristal(dx + 4, 290, v1 - 6, 720));
  // Awning.
  const stripes = [];
  for (let x = f0 - 10; x < f1 + 10; x += 40) stripes.push(rect(x, 200, 20, 92, '#2e8a46'));
  out.push(shape(polyD([[f0 - 10, 200], [f1 + 10, 200], [f1 + 24, 270], [f0 - 24, 270]]), '#f4f2ea', stripes, '#1e5a2e', 1.6));
  const sc = [];
  for (let x = f0 - 24; x < f1 + 24; x += 40) sc.push([x, 270], [x + 20, 294]);
  sc.push([f1 + 24, 270]);
  out.push(path(`M${f0 - 24} 268L${sc.map(([a, b]) => `${a} ${b}`).join('L')}L${f1 + 24} 268Z`, '#2e8a46'));
  // Crates of fruit outside, on the sidewalk.
  const crate = (x, y, w, fruit) => {
    const o = [box(x, y, w, 56, mat('#c9a06a', '#a47c48', '#e0bc88', '#6e5028'), { r: 2, sh: 0.25 })];
    for (let i = 0; i < 2; i++) o.push(rect(x + 4, y + 18 + i * 18, w - 8, 3, '#8a6838'));
    const rr2 = rng(Math.round(x));
    for (let i = 0; i < w / 18; i++) {
      const cx = x + 10 + i * 18 + rr2() * 4;
      if (fruit === 'platano') o.push(path(smooth([[cx - 8, y - 4], [cx + 2, y - 14], [cx + 12, y - 8], [cx + 4, y - 6]]), '#f2cf3a'));
      else o.push(shape(ellipse(cx, y - 8 - rr2() * 4, 10, 9), fruit, [path(ellipse(cx - 3, y - 12, 3.5, 2.5), '#ffffff', { opacity: 0.35 })], '#4a2a10', 1));
    }
    return o.join('');
  };
  out.push(crate(f0 + 20, 640, 110, '#f08a2e'), crate(f0 + 140, 640, 110, '#d8362e'), crate(f0 + 260, 640, 110, 'platano'), crate(f0 + 80, 584, 110, '#5aa83a'), crate(f0 + 200, 584, 110, '#f0c23a'));
  // Chinese bakery: red sign, two paper lanterns, buns and a waving lucky cat.
  const [b0, b1] = X.panaderia;
  out.push(box(b0, 112, b1 - b0, 86, RED, { r: 4 }));
  tx.push({ x: (b0 + b1) / 2, y: 156, s: 'BOLLERÍA CHINA', size: 40, font: 'display', color: '#ffd56a', maxW: b1 - b0 - 60, emissive: true });
  // Inside: photos of the dishes on the back wall, shelves of buns and steamers,
  // a glass counter of trays, and the lucky cat by the till.
  const w0 = b0 + 20;
  const w1 = b1 - 20;
  const mid = (b0 + b1) / 2;
  out.push(rect(w0, 230, w1 - w0, 470, '#2a2026'));
  em.push(interior(w0, 230, w1, 700, { wall: '#ffe4b4', wall2: '#f0b47a', floor: '#9a4a2a', ceil: '#5a2a1a', lamps: 2 }));
  const platos = [['#f6efe0', 4], ['#e8a040', 0], ['#c8542a', 3], ['#f6efe0', 0]];
  platos.forEach(([c, n], i) => {
    const px = w0 + 24 + i * 102;
    em.push(rect(px, 262, 84, 62, '#fff6e6', { rx: 3 }), rect(px + 4, 266, 76, 54, '#4a2a22'), path(ellipse(px + 42, 300, 30, 12), '#f6f0e6'));
    if (n) for (let k = 0; k < n; k++) em.push(path(ellipse(px + 28 + k * 9, 296, 7, 6), c));
    else em.push(path(ellipse(px + 42, 296, 22, 7), c), stroke(`M${px + 26} 296q8 -6 16 0t16 0`, '#fff2c8', 1.6, { opacity: 0.8 }));
  });
  for (const fx of [w0 + 4, w1 - 26]) em.push(path(polyD([[fx + 11, 262], [fx + 22, 280], [fx + 11, 298], [fx, 280]]), '#d8323a'), stroke(polyD([[fx + 11, 266], [fx + 18, 280], [fx + 11, 294], [fx + 4, 280]]), '#f0c23a', 1.4));
  const bao = (x, y) => [path(ellipse(x, y - 3, 17, 5), '#c88a50', { opacity: 0.6 }), path(ellipse(x, y - 10, 16, 11), '#fff8ec'), path(ellipse(x + 5, y - 6, 10, 5), '#f0dcc0', { opacity: 0.8 }), stroke(`M${x - 6} ${y - 16}Q${x} ${y - 22} ${x + 6} ${y - 16}`, '#e0c8a4', 1.6), circle(x, y - 20, 2, '#e0c8a4')].join('');
  const vaporera = (x, y, n) => {
    const o = [];
    for (let k = 0; k < n; k++) o.push(rect(x - 26, y - (k + 1) * 15, 52, 15, '#d8b070', { rx: 3 }), rect(x - 26, y - (k + 1) * 15 + 6, 52, 2, '#a87a3a'), rect(x + 14, y - (k + 1) * 15, 12, 15, '#b88a4a', { opacity: 0.6 }));
    o.push(path(`M${x - 28} ${y - n * 15}Q${x} ${y - n * 15 - 22} ${x + 28} ${y - n * 15}Z`, '#e6c68a'), stroke(`M${x - 18} ${y - n * 15 - 6}Q${x} ${y - n * 15 - 18} ${x + 18} ${y - n * 15 - 6}`, '#b88a4a', 1.4));
    return o.join('');
  };
  for (const [y, desde] of [[430, 0], [530, 1]]) {
    em.push(rect(w0 + 16, y, w1 - w0 - 32, 7, '#b06a3a'), rect(w0 + 16, y + 7, w1 - w0 - 32, 5, '#000000', { opacity: 0.15 }));
    for (let k = 0, x = w0 + 46; x < w1 - 40; k++, x += 58) em.push((k + desde) % 3 === 2 ? vaporera(x, y, 2) : bao(x - 12, y) + bao(x + 12, y) + bao(x, y - 14));
  }
  // Glass counter: dark base, trays of egg tarts and buns behind the glass.
  em.push(rect(w0 + 10, 600, w1 - w0 - 20, 100, '#7a3a22'), rect(w0 + 10, 600, w1 - w0 - 20, 6, '#c8844a'));
  for (let x = w0 + 24; x < w1 - 150; x += 30) em.push(path(ellipse(x, 640, 12, 5), '#c8843a'), path(ellipse(x, 638, 8, 3), '#f6c83a'));
  for (let x = w0 + 30; x < w1 - 150; x += 34) em.push(bao(x, 684));
  em.push(gpath(rectD(w0 + 10, 612, w1 - w0 - 20, 88), lin(0, 612, 0, 700, [[0, '#ffffff', 0.18], [0.3, '#ffffff', 0.04], [1, '#ffffff', 0.1]])));
  em.push(gatoSuerte(w1 - 70, 600, 0.85));
  em.push(cristal(w0, 240, mid - 4, 700), cristal(mid + 4, 240, w1, 700));
  em.push(rect(w0, 230, w1 - w0, 10, '#2a2026'), rect(mid - 4, 230, 8, 470, '#5a2a1a'));
  for (const lx of [b0 + 60, b1 - 60]) {
    out.push(line(lx, 198, lx, 226, '#2a2026', 2));
    em.push(shape(ellipse(lx, 262, 30, 36), '#e0402e', [path(ellipse(lx - 6, 256, 14, 26), '#ff7a50')], '#7a1a10', 1.4), rect(lx - 14, 222, 28, 8, '#d6a64a'), rect(lx - 14, 294, 28, 8, '#d6a64a'), rect(lx - 2, 302, 4, 20, '#d6a64a'));
  }
  return out.join('');
}

function parkFront() {
  const out = [];
  const [a, b] = X.parque;
  const [g0, g1] = X.puerta;
  // Low granite wall with a green railing, open at the gate.
  for (const [x0, x1] of [[a, g0 - 30], [g1 + 30, b]]) {
    out.push(box(x0, 688, x1 - x0, 72, GRANITE, { r: 2, sh: 0.15, li: 0.12, side: false }));
    out.push(rect(x0, 470, x1 - x0, 9, IRON.base), rect(x0, 660, x1 - x0, 9, IRON.base));
    for (let x = x0 + 10; x < x1 - 4; x += 26) {
      out.push(rect(x, 452, 6, 236, IRON.base), rect(x + 4, 452, 2, 236, IRON.light, { opacity: 0.5 }));
      out.push(path(polyD([[x - 3, 456], [x + 3, 436], [x + 9, 456]]), IRON.base));
    }
  }
  // Gate pillars and the playground sign.
  for (const x of [g0 - 30, g1]) {
    out.push(box(x, 400, 30, 360, GRANITE, { r: 2, sh: 0.05 }), box(x - 6, 388, 42, 16, GRANITE, { r: 2, sh: 0.3, li: 0.3 }), circle(x + 15, 372, 16, GRANITE.light), circle(x + 15, 372, 16, 'none', { stroke: GRANITE.line, 'stroke-width': 1.4 }));
  }
  out.push(box(g1 + 40, 470, 120, 80, mat('#2e5a8a', '#234870', '#4a7ab0', '#14304a'), { r: 6 }));
  // Corner pilasters of the buildings either side.
  out.push(rect(a - 4, -40, 10, 800, '#b8a07a'));
  return out.join('');
}

function pharmacy(em, tx) {
  const out = [];
  const [a, b] = X.farmacia;
  out.push(rect(a, -40, b - a, 740, '#e8d9b8'));
  out.push(gpath(rectD(a, -40, b - a, 300), lin(0, -40, 0, 260, [[0, '#2a1a20', 0.3], [1, '#2a1a20', 0]])));
  for (let y = 0; y < 700; y += 46) out.push(rect(a, y, b - a, 2, '#cfbf98', { opacity: 0.6 }));
  out.push(balconies(a, b, 13, { every: 250, w: 190 }));
  out.push(plinth(a, b));
  out.push(box(a + 20, 112, b - a - 110, 86, mat('#f4f4ee', '#d8d8ce', '#ffffff', '#8a8a80'), { r: 4 }));
  em.push(rect(a + 28, 120, b - a - 126, 70, '#f2fff6'));
  tx.push({ x: a + 20 + (b - a - 110) / 2, y: 156, s: 'FARMACIA', size: 46, font: 'body', weight: 800, color: '#1f9a4a', emissive: true, spacing: 4 });
  // Inside: white shelves of boxes and bottles, a summer poster in a light box,
  // the counter with its green cross, and the old scale by the glass door.
  const v0 = a + 20;
  const v1 = b - 40;
  const dx = b - 120;
  out.push(rect(v0, 230, v1 - v0, 490, '#22302a'));
  em.push(interior(v0, 230, v1, 720, { wall: '#f4fbf6', wall2: '#d6ebdf', floor: '#c8d4cc', ceil: '#3a4a40' }));
  const cajas = ['#ffffff', '#e8f4ff', '#bfe6cc', '#f4d8e0', '#d8e8f8', '#ffe6b0', '#9ad0f0'];
  for (const [y, sd] of [[332, 3], [412, 5], [492, 7]]) em.push(estante(v0 + 150, dx - 8, y, sd, cajas, { board: '#e8eeea' }));
  em.push(rect(v0 + 10, 268, 126, 250, '#dfe6e2', { rx: 4 }));
  em.push(gpath(rectD(v0 + 18, 276, 110, 234), lin(0, 276, 0, 510, [[0, '#4aa8e8'], [0.55, '#bfe8ff'], [0.56, '#2a8ad0'], [0.7, '#5ab0e0'], [0.71, '#f2d8a0'], [1, '#e8c888']])));
  em.push(circle(v0 + 104, 312, 18, '#ffd23a'), circle(v0 + 104, 312, 26, '#ffe68a', { opacity: 0.4 }));
  em.push(shape(rr(v0 + 44, 380, 40, 100, 12), '#f08a2e', [rect(v0 + 70, 380, 14, 100, '#c8661a'), rect(v0 + 48, 410, 32, 40, '#ffffff')], '#7a3a10', 1.4), rect(v0 + 54, 362, 20, 20, '#ffffff', { rx: 3 }), circle(v0 + 64, 430, 9, '#ffd23a'));
  em.push(rect(v0 + 140, 560, dx - v0 - 210, 160, '#f2f6f4'), rect(v0 + 140, 560, dx - v0 - 210, 8, '#ffffff'), rect(v0 + 150, 580, dx - v0 - 230, 130, '#2fa860', { rx: 4 }), rect(v0 + 150, 580, dx - v0 - 230, 8, '#5ac888', { rx: 4 }));
  const cx = (v0 + 140 + dx - 70) / 2;
  em.push(path(`M${cx - 10} 612h20v22h22v20h-22v22h-20v-22h-22v-20h22z`, '#ffffff'));
  em.push(box(v0 + 160, 520, 70, 40, mat('#3a4048', '#2a3036', '#5a626a', '#14181c'), { r: 4 }), rect(v0 + 170, 526, 36, 14, '#9af0c0'));
  for (const [x, c] of [[v0 + 250, '#f4d8e0'], [v0 + 274, '#bfe6cc'], [v0 + 298, '#ffffff']]) em.push(rect(x, 536, 20, 24, c, { rx: 2 }), rect(x, 546, 20, 4, '#1f9a4a'));
  const sx = dx - 34;
  em.push(rect(sx - 28, 692, 56, 18, '#cfd6da', { rx: 3 }), rect(sx - 8, 560, 16, 134, '#e6eaec'), rect(sx + 2, 560, 6, 134, '#c4cacd'));
  em.push(shape(ellipse(sx, 540, 28, 28), '#f6f8f8', [path(ellipse(sx + 8, 548, 22, 22), '#dfe4e6')], '#8a9498', 1.6), circle(sx, 540, 18, '#ffffff'), line(sx, 540, sx + 10, 528, '#d8323a', 2.4));
  em.push(rect(dx - 4, 230, 8, 490, '#9aa2a8'), rect(v1 - 6, 230, 6, 490, '#9aa2a8'), rect(dx + 14, 420, 6, 80, '#d8dce0', { rx: 3 }));
  em.push(cristal(v0, 230, dx - 4, 720), cristal(dx + 4, 230, v1 - 6, 720));
  // The green cross on its bracket (its LEDs are animated live).
  out.push(rect(b - 60, 148, 40, 10, IRON.base));
  out.push(box(b - 66, 104, 92, 120, mat('#2a3a30', '#1a2620', '#3e5246', '#0e1612'), { r: 6 }));
  em.push(path('M4869 125h22v28h28v22h-28v28h-22v-28h-28v-22h28z', '#2fd06a'));
  // Corner pilaster and the street name plaque.
  out.push(rect(b - 18, -40, 18, 800, '#cdbd96'));
  out.push(box(b - 210, 30, 150, 64, mat('#f4f0e6', '#d8d2c4', '#ffffff', '#4a5a8a'), { r: 4 }), rect(b - 202, 38, 134, 48, '#2a4a8a'), rect(b - 198, 42, 126, 40, '#f4f0e6'));
  tx.push({ x: b - 135, y: 63, s: 'USERA', size: 26, font: 'display', color: '#2a4a8a' });
  return out.join('');
}

function pedestrianBuildings(em, tx) {
  const out = [];
  const [c1] = X.cruce.slice(1);
  out.push(rect(c1, -40, 1100, 740, '#e2ab98'));
  out.push(rect(c1 + 1100, -40, X.fin - c1 - 1100 + 60, 740, '#dcc9a6'));
  out.push(gpath(rectD(c1, -40, X.fin - c1 + 60, 300), lin(0, -40, 0, 260, [[0, '#2a1a20', 0.3], [1, '#2a1a20', 0]])));
  for (let y = 0; y < 700; y += 46) out.push(rect(c1, y, X.fin - c1 + 60, 2, '#000', { opacity: 0.05 }));
  out.push(rect(c1, -40, 16, 800, '#c99482'));
  out.push(balconies(c1, c1 + 1100, 21, { every: 360, w: 240 }), balconies(c1 + 1100, X.fin, 27, { every: 300, w: 200 }));
  out.push(plinth(c1, X.fin + 60));
  out.push(cables(c1, c1 + 1100, 8, 30), cables(c1 + 1100, X.fin, 12, 50));
  // Blue doorway to the left of the bar.
  const [d0, d1] = X.puertaAzul;
  out.push(box(d0, 220, d1 - d0, 540, mat('#2f6fb5', '#235a96', '#4a8ad0', '#123a6a'), { r: 2, sh: 0.02, li: 0.02 }));
  out.push(box(d0 + 22, 252, d1 - d0 - 44, 490, WOODD, { r: 2 }));
  for (let y = 290; y < 720; y += 46) out.push(rect(d0 + 34, y, d1 - d0 - 68, 5, IRON.line));
  for (let x = d0 + 40; x < d1 - 30; x += 24) out.push(rect(x, 270, 4, 450, IRON.line));
  out.push(box(d0 - 6, 740, d1 - d0 + 12, 20, GRANITE, { r: 2, sh: 0.4, li: 0.3 }));
  // Bar del Río: grey marble cladding, black awning, aluminium door and window.
  const [a, b] = X.bar;
  out.push(rect(a, 240, b - a, 520, '#5e5e64'));
  const r = rng(51);
  for (let x = a; x < b; x += 120) for (let y = 240; y < 760; y += 130) {
    out.push(rect(x + 2, y + 2, 116, 126, r() < 0.5 ? '#68686e' : '#5a5a60'));
    out.push(stroke(`M${x + 10 + r() * 40} ${y + 10}Q${x + 60} ${y + 60 + r() * 30} ${x + 100} ${y + 120}`, '#7a7a82', 1.5, { opacity: 0.7 }));
  }
  // Light box "RIO" peeking above the awning, and a beer sign.
  out.push(box(a + 430, 150, 170, 100, mat('#f4f6fa', '#d4d8e0', '#ffffff', '#6a7080'), { r: 4 }));
  em.push(rect(a + 438, 158, 154, 84, '#f2f6ff'));
  tx.push({ x: a + 515, y: 200, s: 'RIO', size: 70, font: 'serif', weight: 700, color: '#1a3a9a', emissive: true });
  out.push(box(b + 20, 130, 110, 120, mat('#3a2a26', '#2a1e1a', '#5a4a44', '#140c0a'), { r: 4 }));
  em.push(rect(b + 26, 136, 14, 108, '#d8323a'));
  tx.push({ x: b + 84, y: 175, s: 'CERVEZA', size: 20, font: 'body', weight: 800, color: '#f4e6c8', emissive: true, maxW: 76 });
  tx.push({ x: b + 84, y: 205, s: 'DESDE 1890', size: 13, font: 'body', weight: 700, color: '#d8323a', emissive: true, maxW: 76 });
  // The awning: slanted top and the valance with the name.
  out.push(shape(polyD([[a - 30, 236], [b + 30, 236], [b + 50, 300], [a - 50, 300]]), '#1e1e22', [rect(a - 50, 236, b - a + 100, 10, '#2c2c32'), path(polyD([[a + 60, 240], [a + 300, 240], [a + 200, 296], [a - 20, 296]]), '#ffffff', { opacity: 0.05 })], '#0a0a0c', 1.6));
  out.push(box(a - 50, 298, b - a + 100, 84, mat('#1e1e22', '#141416', '#2e2e34', '#0a0a0c'), { r: 2, sh: 0.1, li: 0.04 }));
  out.push(rect(a - 50, 298, b - a + 100, 5, '#e8dcc0'));
  tx.push({ x: (a + b) / 2, y: 342, s: 'BAR DEL RIO', size: 56, font: 'serif', weight: 700, color: '#efe2c4', spacing: 2 });
  // Little logo on the left of the valance: a cup and diamonds.
  out.push(path(polyD([[a - 20, 352], [a + 2, 322], [a + 24, 352]]), '#e8b83a'), path(polyD([[a + 14, 352], [a + 36, 322], [a + 58, 352]]), '#d8323a'), path(polyD([[a + 2, 352], [a + 14, 336], [a + 26, 352], [a + 14, 368]]), '#d8323a'));
  out.push(shape(rr(a - 36, 330, 18, 16, 3), '#d8323a', [], '#5e1418', 1), stroke(`M${a - 18} 334q8 4 0 8`, '#d8323a', 2));
  for (const x of [a - 40, b + 40]) out.push(stroke(`M${x} 382L${x + (x < a ? -10 : 10)} 520`, '#c8ccd0', 4));
  // Menu poster on the left panel.
  out.push(box(a + 20, 420, 140, 200, mat('#141418', '#0c0c10', '#26262c', '#000000'), { r: 2 }));
  for (const [y, c] of [[470, '#c8542a'], [520, '#e2a33a'], [568, '#9a3a2a']]) out.push(path(ellipse(a + 120, y, 26, 16), c), path(ellipse(a + 116, y - 4, 10, 6), '#f4d8a0', { opacity: 0.6 }));
  tx.push({ x: a + 56, y: 440, s: 'RACIONES', size: 15, font: 'body', weight: 800, color: '#e8a83a', align: 'center', maxW: 80 });
  for (const [i, s] of ['Oreja plancha', 'Bravas', 'Calamares', 'Alitas', 'Tortilla'].entries()) tx.push({ x: a + 30, y: 466 + i * 18, s: (i + 1) + '· ' + s, size: 11, font: 'body', weight: 700, color: '#f4ecd8', align: 'left', maxW: 64 });
  tx.push({ x: a + 90, y: 586, s: 'BOCADILLOS · PLATOS COMBINADOS', size: 11, font: 'body', weight: 800, color: '#e8a83a', maxW: 128 });
  for (let i = 0; i < 9; i++) out.push(circle(a + 32 + i * 14, 606, 4, ['#e04a3a', '#f0c23a', '#3ab070', '#3a7be0'][i % 4]));
  // Door: aluminium frame, warm interior, gold letters on the glass.
  const dx0 = a + 180;
  const dx1 = a + 360;
  out.push(rect(dx0, 380, dx1 - dx0, 370, '#b8bcc0'));
  em.push(gpath(rectD(dx0 + 12, 392, dx1 - dx0 - 24, 346), lin(0, 392, 0, 738, [[0, '#ffdca0'], [1, '#e6a060']])));
  em.push(path(ellipse(dx0 + 90, 600, 30, 60), '#8a5030', { opacity: 0.55 }), circle(dx0 + 90, 520, 22, '#8a5030', { opacity: 0.55 }));
  em.push(rect(dx0 + 12, 560, dx1 - dx0 - 24, 10, '#b8bcc0'), rect(dx0 + 12, 640, dx1 - dx0 - 24, 98, '#3a3a40', { opacity: 0.6 }));
  for (let x = dx0 + 20; x < dx1 - 16; x += 16) em.push(rect(x, 646, 4, 88, '#2a2a30'));
  tx.push({ x: (dx0 + dx1) / 2, y: 452, s: 'BAR', size: 36, font: 'serif', weight: 700, color: '#c99a3a', emissive: true });
  tx.push({ x: (dx0 + dx1) / 2, y: 500, s: 'DEL RIO', size: 30, font: 'serif', weight: 700, color: '#c99a3a', emissive: true });
  em.push(rect(dx1 - 34, 560, 10, 40, '#d8dce0'));
  // Window: counter, bottles, taps and the telly.
  const wx0 = a + 380;
  const wx1 = b - 20;
  out.push(rect(wx0, 380, wx1 - wx0, 250, '#b8bcc0'));
  em.push(gpath(rectD(wx0 + 12, 392, wx1 - wx0 - 24, 226), lin(0, 392, 0, 618, [[0, '#ffe2b0'], [1, '#f0aa66']])));
  em.push(rect(wx0 + 12, 470, wx1 - wx0 - 24, 6, '#8a5a34'));
  const rb = rng(9);
  for (let x = wx0 + 20; x < wx1 - 20; x += 13) {
    const h = 20 + rb() * 18;
    em.push(rect(x, 470 - h, 9, h, rb() < 0.5 ? '#4a7a4a' : '#8a3a2a', { rx: 3, opacity: 0.85 }));
  }
  em.push(rect(wx0 + 12, 560, wx1 - wx0 - 24, 58, '#8a5030'), rect(wx0 + 12, 554, wx1 - wx0 - 24, 8, '#5a3420'));
  for (const x of [wx0 + 70, wx0 + 86]) em.push(rect(x, 520, 6, 36, '#d8d0c4'));
  em.push(rect(wx0 + 120, 404, 80, 50, '#1a1e28'), rect(wx0 + 124, 408, 72, 42, '#3a8a4a'), rect(wx0 + 124, 428, 72, 2, '#e8f4e0'));
  em.push(circle(wx0 + 150, 590, 20, '#7a4428', { opacity: 0.55 }), path(ellipse(wx0 + 150, 640, 30, 30), '#7a4428', { opacity: 0.55 }));
  em.push(cristal(dx0 + 12, 392, dx1 - 12, 560), cristal(wx0 + 12, 392, wx1 - 12, 618));
  out.push(rect((wx0 + wx1) / 2 - 4, 380, 8, 250, '#b8bcc0'));
  out.push(box(a - 6, 740, b - a + 12, 20, GRANITE, { r: 2, sh: 0.4, li: 0.3 }));
  // Salmon doorway with the number 40.
  const [n0, n1] = X.puerta40;
  out.push(box(n0, 230, n1 - n0, 530, mat('#e0907a', '#c27560', '#eeac98', '#7a3a2a'), { r: 2, sh: 0.02, li: 0.02 }));
  out.push(box(n0 + 24, 262, n1 - n0 - 48, 480, WOODD, { r: 2 }));
  for (let x = n0 + 40; x < n1 - 36; x += 18) out.push(rect(x, 300, 8, 300, WOODD.light, { rx: 4 }));
  out.push(box(n1 - 10, 160, 70, 60, mat('#e8dcc0', '#cbbf9f', '#f4ecd8', '#5a4a2a'), { r: 3 }));
  tx.push({ x: n1 + 25, y: 192, s: '40', size: 40, font: 'serif', weight: 700, color: '#2a2a2e' });
  out.push(box(n0 - 6, 740, n1 - n0 + 12, 20, GRANITE, { r: 2, sh: 0.4, li: 0.3 }));
  // Next building: the hairdresser, closed, and another doorway.
  const h0 = c1 + 1140;
  out.push(box(h0, 112, 520, 86, mat('#2a2a3a', '#1e1e2a', '#3e3e54', '#0e0e16'), { r: 4 }));
  tx.push({ x: h0 + 260, y: 156, s: 'PELUQUERÍA ROSI', size: 38, font: 'display', color: '#f0a8c8', maxW: 480 });
  out.push(shutter(h0 + 20, h0 + 500, 250, 740, 77));
  out.push(box(h0 + 600, 220, 200, 540, GRANITE, { r: 2, sh: 0.02 }), box(h0 + 620, 250, 160, 490, WOODD, { r: 2 }));
  for (let y = 290; y < 720; y += 70) out.push(bevel(h0 + 636, y, 128, 56, WOODD, { inset: 7 }));
  return out.join('');
}

function facades() {
  const em = [];
  const tx = [];
  const body = [franBuilding(em, tx), shopsBuilding(em, tx), parkFront(), pharmacy(em, tx), pedestrianBuildings(em, tx)].join('');
  tx.push({ x: X.puerta[1] + 100, y: 498, s: 'ÁREA', size: 20, font: 'display', color: '#f3ead6' }, { x: X.puerta[1] + 100, y: 524, s: 'INFANTIL', size: 20, font: 'display', color: '#f3ead6' });
  return { body, emissive: em.join(''), texts: tx };
}

// ---------------------------------------------------------------- park

const KP = 0.86; // trees, benches and lamps just inside the railing
const KD = 0.32; // the dragon
const KT = 0.4; // backs of the neighbouring buildings
const KL = 0.12; // far side of the park
const KS = kAt(30); // far end of the side street

/** Plane tree: mottled bark and a big canopy. Local units: metres * m. */
function planeTree(u, base, m, seed) {
  const r = rng(seed);
  const tw = 0.36 * m;
  const top = base - 3.2 * m;
  const out = [];
  out.push(shape(smooth([[u - tw * 0.7, base, 'c'], [u - tw * 0.5, base - m], [u - tw * 0.55, top + 0.6 * m], [u - tw * 1.4, top - 0.2 * m], [u - tw * 0.6, top - 0.1 * m], [u, top + 0.2 * m], [u + tw * 0.5, top - 0.3 * m], [u + tw * 1.3, top - 0.1 * m], [u + tw * 0.55, top + 0.6 * m], [u + tw * 0.5, base - m], [u + tw * 0.75, base, 'c']]), '#a8a48a', [
    ...Array.from({ length: 9 }, () => path(ellipse(u + (r() - 0.5) * tw, base - r() * 3 * m, tw * (0.2 + r() * 0.25), tw * (0.3 + r() * 0.4)), r() < 0.5 ? '#7a7a62' : '#c8c4a6')),
    rect(u + tw * 0.15, top - m, tw, 5 * m, '#6a6a54', { opacity: 0.5 }),
  ], '#4a4a38', 1.6));
  out.push(foliage(u, top - 1.2 * m, 2.6 * m, 1.6 * m, ['#2a4a2e', '#365e38', '#4a7a46', '#68985a'], seed, { n: 26, leaf: 0.38 }));
  return out.join('');
}

function bench(u, base, m) {
  const W2 = 0.9 * m;
  const o = [];
  for (const x of [u - W2 + 0.1 * m, u + W2 - 0.2 * m]) o.push(stroke(`M${x} ${base}L${x + 0.04 * m} ${base - 0.42 * m}L${x - 0.02 * m} ${base - 0.85 * m}`, '#1e2622', 0.07 * m));
  for (let i = 0; i < 3; i++) o.push(box(u - W2, base - 0.85 * m + i * 0.13 * m, W2 * 2, 0.08 * m, mat('#8a5a34', '#6a4024', '#a8744a', '#3a2010'), { r: 3, sh: 0.3, li: 0.2, side: false }));
  o.push(box(u - W2 - 0.05 * m, base - 0.47 * m, W2 * 2 + 0.1 * m, 0.08 * m, mat('#8a5a34', '#6a4024', '#a8744a', '#3a2010'), { r: 3, sh: 0.3, li: 0.3, side: false }));
  return o.join('');
}

function globeLamp(u, base, m) {
  return [
    box(u - 0.08 * m, base - 0.25 * m, 0.16 * m, 0.25 * m, IRON, { r: 3 }),
    rect(u - 0.035 * m, base - 3.1 * m, 0.07 * m, 2.9 * m, IRON.base),
    box(u - 0.07 * m, base - 3.15 * m, 0.14 * m, 0.08 * m, IRON, { r: 2 }),
  ].join('');
}

function parkNear() {
  const m = M * KP;
  const base = yOf(KP);
  const at = (Xb) => uOf(Xb, KP);
  const out = [];
  const em = [];
  // Low box hedge behind the railing.
  out.push(shape(smooth([[at(1980), base, 'c'], [at(1980), base - 0.5 * m], [at(2600), base - 0.62 * m], [at(3060), base - 0.5 * m], [at(3060), base, 'c']]), '#2f5a32', [path(smooth([[at(1980), base - 0.45 * m], [at(2500), base - 0.6 * m], [at(3060), base - 0.48 * m], [at(3060), base - 0.36 * m], [at(1980), base - 0.32 * m]]), '#467a44')], '#1a3a1e', 1.4));
  out.push(shape(smooth([[at(3320), base, 'c'], [at(3320), base - 0.5 * m], [at(3900), base - 0.62 * m], [at(4420), base - 0.5 * m], [at(4420), base, 'c']]), '#2f5a32', [path(smooth([[at(3320), base - 0.45 * m], [at(3900), base - 0.6 * m], [at(4420), base - 0.48 * m], [at(4420), base - 0.36 * m], [at(3320), base - 0.32 * m]]), '#467a44')], '#1a3a1e', 1.4));
  out.push(bench(at(2560), base - 0.1 * m, m), bench(at(3880), base - 0.1 * m, m));
  out.push(globeLamp(at(2760), base, m), globeLamp(at(3560), base, m));
  for (const xb of [2760, 3560]) em.push(gpath(ellipse(at(xb), base - 3.4 * m, 0.27 * m, 0.27 * m), rad(at(xb) - 0.08 * m, base - 3.48 * m, 0.3 * m, [[0, '#ffffff'], [0.6, '#eef2ff'], [1, '#c8d4f0']])));
  out.push(planeTree(at(2170), base, m, 3), planeTree(at(3180), base + 0.2 * m, m * 1.05, 8), planeTree(at(4260), base, m, 14));
  return { body: out.join(''), emissive: em.join(''), glows: [2760, 3560].map((xb) => ({ x: at(xb), y: base - 3.4 * m, r: 0.9 * m, color: '#dfe8ff', a: 0.55 })) };
}

/** The Usera dragon: red ribs, yellow spine plates, a huge head with googly eyes. */
function dragon() {
  const s = (M * KD) / 100; // local units are centimetres
  const out = [];
  const T = (pts) => pts.map(([x, y, c]) => (c ? [x * s, y * s, c] : [x * s, y * s]));
  const tube = (d, w, m = RED) => stroke(d, m.line, w * s + 2.4) + stroke(d, m.base, w * s) + stroke(d, m.light, w * s * 0.28, { opacity: 0.8, transform: `translate(${-w * s * 0.18} ${-w * s * 0.18})` });
  const P2 = (x, y) => `${f2(x * s)} ${f2(y * s)}`;
  const H = (x) => 200 + 55 * Math.sin((x + 260) / 210);
  // Climbing net and platforms inside the body, behind the near ribs.
  out.push(path(smooth(T([[-380, 0, 'c'], [-380, -170], [-100, -240], [200, -230], [480, -180], [560, -60], [560, 0, 'c']])), '#3a2a2a', { opacity: 0.25 }));
  for (const [x, y, w] of [[-260, -110, 180], [60, -130, 200], [330, -110, 170]]) out.push(box((x - w / 2) * s, y * s, w * s, 16 * s, YEL, { r: 2, sh: 0.3, li: 0.2 }));
  // Far ribs (darker), then the spine rails.
  const ribs = [];
  for (let x = -330; x <= 520; x += 85) ribs.push(x);
  for (const x of ribs) out.push(stroke(`M${P2(x + 28, 0)}Q${P2(x + 40, -H(x) * 1.15)} ${P2(x - 10, -H(x) * 0.6)}`, '#7a1a20', 6 * s));
  out.push(tube(`M${P2(-360, -H(-360))}${ribs.map((x) => `L${P2(x, -H(x))}`).join('')}L${P2(600, -130)}`, 9));
  out.push(tube(`M${P2(-360, -110)}${ribs.map((x) => `L${P2(x, -H(x) * 0.5)}`).join('')}`, 6));
  // Dorsal plates.
  for (const x of ribs) {
    const y = -H(x);
    out.push(shape(polyD([[(x - 34) * s, (y - 4) * s], [(x + 34) * s, (y - 4) * s], [(x + 6) * s, (y - 70 - (x % 3) * 6) * s]]), YEL.base, [path(polyD([[(x + 6) * s, (y - 70) * s], [(x + 34) * s, (y - 4) * s], [(x + 12) * s, (y - 4) * s]]), YEL.shadow)], RED.base, 3.2 * s));
  }
  // Nets between some ribs.
  for (const x of [-245, -75, 180]) {
    const net = [];
    for (let i = 0; i <= 6; i++) net.push(line((x + i * 14) * s, 0, (x + 85) * s, (-H(x) * 0.5 + i * 8) * s, '#b8262c', 1.4), line((x + 85 - i * 14) * s, 0, x * s, (-H(x) * 0.5 + i * 8) * s, '#b8262c', 1.4));
    out.push(...net);
  }
  // Near ribs.
  for (const x of ribs) out.push(tube(`M${P2(x - 40, 0)}Q${P2(x - 50, -H(x) * 1.3)} ${P2(x, -H(x))}Q${P2(x + 50, -H(x) * 0.7)} ${P2(x + 40, 0)}`, 11));
  // Tail: a spiral of shrinking ribs, then the slide.
  for (let i = 0; i < 5; i++) {
    const cx = 600 + i * 26;
    const r2 = 90 - i * 16;
    out.push(tube(`M${P2(cx - r2, 0)}A${f2(r2 * s)} ${f2(r2 * 1.1 * s)} 0 1 1 ${P2(cx + r2 * 0.6, -r2 * 0.4)}`, 9 - i));
  }
  out.push(shape(polyD(T([[470, -190], [500, -200], [720, -18], [740, 0], [700, 0], [680, -14]])), STEEL.base, [path(polyD(T([[480, -196], [500, -200], [720, -18], [706, -16]])), STEEL.light)], STEEL.line, 1.4));
  // Head: horns swept back, a yellow face with a long snout, huge googly eyes.
  for (let i = 0; i < 4; i++) {
    const bx = -470 + i * 30;
    const tx = -380 + i * 46;
    const ty = -430 + i * 12;
    out.push(tube(`M${P2(bx, -320)}Q${P2(bx + 10, -400)} ${P2(tx, ty)}`, 6), circle(tx * s, ty * s, 8 * s, '#fffaf0'));
  }
  // Red mane behind the head.
  for (let i = 0; i < 5; i++) out.push(shape(polyD(T([[-400 + i * 8, -300 + i * 40], [-330 + i * 10, -320 + i * 44], [-392 + i * 8, -260 + i * 40]])), RED.base, [], RED.line, 2 * s));
  out.push(shape(smooth(T([[-380, -130], [-372, -250], [-420, -330], [-520, -356], [-610, -330], [-660, -290], [-760, -250], [-800, -214], [-790, -176], [-700, -160], [-600, -150], [-470, -118]])), YEL.base, [
    path(smooth(T([[-380, -130], [-372, -250], [-410, -310], [-450, -150]])), YEL.shadow),
    path(smooth(T([[-540, -346], [-640, -316], [-700, -276], [-620, -300]])), YEL.light, { opacity: 0.85 }),
    path(smooth(T([[-790, -200], [-700, -176], [-600, -168], [-470, -126], [-500, -150], [-640, -186], [-760, -214]])), YEL.shadow, { opacity: 0.7 }),
    ...[0, 1, 2, 3].map((i) => stroke(`M${P2(-424 + i * 12, -160 - i * 40)}L${P2(-384 + i * 6, -176 - i * 40)}`, RED.base, 4 * s)),
  ], RED.base, 6 * s));
  // Nostrils on the tip of the snout.
  out.push(path(ellipse(-770 * s, -222 * s, 12 * s, 8 * s, -0.3), RED.line), path(ellipse(-742 * s, -238 * s, 10 * s, 7 * s, -0.3), RED.line));
  // Eyes.
  for (const [x, y, rr3] of [[-600, -300, 50], [-490, -312, 54]]) {
    out.push(shape(ellipse(x * s, y * s, rr3 * s, rr3 * s), '#fffaf0', [path(ellipse((x + 10) * s, (y + 12) * s, rr3 * 0.9 * s, rr3 * 0.7 * s), '#e8e0d0')], RED.line, 2.4));
    out.push(path(ellipse((x - 14) * s, (y + 6) * s, rr3 * 0.42 * s, rr3 * 0.46 * s), '#1a1418'), circle((x - 22) * s, (y - 4) * s, 5 * s, '#ffffff'));
    out.push(stroke(`M${P2(x - rr3, y - rr3 * 0.6)}Q${P2(x, y - rr3 * 1.5)} ${P2(x + rr3, y - rr3 * 0.7)}`, RED.base, 9 * s));
  }
  // Mouth: a red lip line and the jaw frame with its climbing net down to the ground.
  out.push(tube(`M${P2(-780, -176)}Q${P2(-700, -130)} ${P2(-560, -140)}Q${P2(-500, -146)} ${P2(-470, -120)}`, 10));
  out.push(tube(`M${P2(-740, -150)}L${P2(-720, 0)}M${P2(-540, -138)}L${P2(-520, 0)}`, 9));
  for (let i = 0; i < 7; i++) out.push(line((-715 + i * 28) * s, 0, (-736 + i * 30) * s, (-150 + i * 2) * s, '#b8262c', 1.4), line((-736 + i * 30) * s, 0, (-715 + i * 28) * s, (-146 + i * 1) * s, '#b8262c', 1.4));
  // Whiskers: two clean curls from the snout.
  out.push(tube(`M${P2(-790, -196)}C${P2(-880, -210)} ${P2(-900, -130)} ${P2(-850, -110)}C${P2(-820, -100)} ${P2(-820, -130)} ${P2(-840, -132)}`, 6));
  out.push(tube(`M${P2(-760, -170)}C${P2(-830, -120)} ${P2(-800, -60)} ${P2(-760, -70)}C${P2(-736, -76)} ${P2(-744, -98)} ${P2(-760, -96)}`, 5));
  return out.join('');
}

function dragonLayer() {
  const base = yOf(KD);
  const m = M * KD;
  const at = (Xb) => uOf(Xb, KD);
  const out = [];
  // Swings to the right of the dragon, small trees around.
  const sx = at(4300);
  out.push(stroke(`M${sx - 1.6 * m} ${base}L${sx - 1.2 * m} ${base - 2.4 * m}L${sx + 1.2 * m} ${base - 2.4 * m}L${sx + 1.6 * m} ${base}`, '#2e6aa8', 0.1 * m));
  for (const x of [sx - 0.6 * m, sx + 0.5 * m]) out.push(line(x - 0.15 * m, base - 2.4 * m, x - 0.15 * m, base - 0.5 * m, '#9aa0a6', 2), line(x + 0.15 * m, base - 2.4 * m, x + 0.15 * m, base - 0.5 * m, '#9aa0a6', 2), rect(x - 0.22 * m, base - 0.52 * m, 0.44 * m, 0.08 * m, '#d8323a'));
  for (const [xb, sd] of [[1700, 3], [2300, 5], [4600, 9]]) {
    const u = at(xb);
    out.push(rect(u - 0.1 * m, base - 2 * m, 0.2 * m, 2 * m, '#5a4a3a'), foliage(u, base - 2.6 * m, 1.3 * m, 1 * m, ['#22402a', '#2e5434', '#3e6a40', '#527e4e'], sd, { n: 14 }));
  }
  out.push(g(null, dragon(), { transform: `translate(${f2(at(3200))} ${f2(base)})` }));
  // Two more park lamps, far.
  const em = [];
  const gl = [];
  for (const xb of [2400, 4000]) {
    const u = at(xb);
    out.push(rect(u - 0.035 * m, base - 3.1 * m, 0.07 * m, 3.1 * m, IRON.base));
    em.push(circle(u, base - 3.35 * m, 0.27 * m, '#f4f6ff'));
    gl.push({ x: u, y: base - 3.35 * m, r: 0.8 * m, color: '#dfe8ff', a: 0.5 });
  }
  return { body: out.join(''), emissive: em.join(''), glows: gl };
}

/** Backs of the neighbouring blocks, seen across the park: lit windows, laundry. */
function backs() {
  const base = yOf(KT);
  const m = M * KT;
  const out = [];
  const em = [];
  const r = rng(61);
  const blocks = [[-1200, uOf(2000, KT), '#b98a6e'], [uOf(4400, KT), uOf(4900, KT), '#c8a888']];
  for (const [u0, u1, c] of blocks) {
    out.push(rect(u0, -60, u1 - u0, base + 60, c));
    for (let fl = 0; fl < 4; fl++) {
      const y = base - (fl + 0.35) * 3 * m;
      for (let x = u0 + 0.8 * m; x < u1 - 1.4 * m; x += 2.4 * m) {
        const lit = r() < 0.45;
        out.push(rect(x - 0.1 * m, y - 1.6 * m, 1.3 * m, 1.75 * m, '#5a4a52'));
        if (lit) em.push(rect(x, y - 1.5 * m, 1.1 * m, 1.5 * m, r() < 0.75 ? '#ffcf86' : '#cfe0ff'), rect(x, y - 1.5 * m, 1.1 * m, (0.2 + r() * 0.6) * m, '#8a6a5a', { opacity: 0.8 }));
        else out.push(rect(x, y - 1.5 * m, 1.1 * m, 1.5 * m, '#2e2836'), rect(x, y - 1.5 * m, 1.1 * m, (0.3 + r() * 0.9) * m, '#7a6a64'));
        out.push(rect(x - 0.25 * m, y, 1.6 * m, 0.12 * m, '#d8c8b0'));
        if (r() < 0.3) for (let i = 0; i < 4; i++) out.push(rect(x + i * 0.3 * m, y + 0.15 * m, 0.22 * m, (0.3 + r() * 0.3) * m, ['#e04a3a', '#f4f0e6', '#3a7be0', '#f0c23a'][i]));
        if (r() < 0.2) out.push(box(x + 1.2 * m, y - 0.6 * m, 0.7 * m, 0.45 * m, mat('#e9e6df', '#c9c5bc', '#f7f5f0', '#8a8680'), { r: 2, lw: 1 }));
      }
    }
    out.push(rect(u1 - 0.3 * m, -60, 0.3 * m, base + 60, '#000', { opacity: 0.15 }));
  }
  return { body: out.join(''), emissive: em.join('') };
}

/** Beyond the park: low houses, trees and the blocks of the next neighbourhood. */
function farSide() {
  const base = yOf(KL);
  const m = M * KL;
  const out = [];
  const r = rng(91);
  // Tall blocks first (further), then houses and trees.
  for (let x = uOf(-2000, KL) - 400; x < uOf(10000, KL) + 400; ) {
    const w = (8 + r() * 10) * m;
    const h = (14 + r() * 22) * m;
    out.push(rect(x, base - h, w, h + 10, r() < 0.5 ? '#262b48' : '#2c3150'));
    for (let wy = base - h + 1.2 * m; wy < base - 2 * m; wy += 3 * m) for (let wx = x + 0.8 * m; wx < x + w - 1.2 * m; wx += 2 * m) if (r() < 0.38) out.push(rect(wx, wy, 0.9 * m, 1.1 * m, r() < 0.7 ? '#e8b870' : '#b8c8e8', { opacity: 0.85 }));
    if (r() < 0.3) out.push(circle(x + w / 2, base - h - 6, 2.4, '#ff5a4a'));
    x += w + (1 + r() * 6) * m;
  }
  for (let x = uOf(-2000, KL) - 400; x < uOf(10000, KL) + 400; ) {
    const w = (5 + r() * 6) * m;
    const h = (5 + r() * 4) * m;
    out.push(rect(x, base - h, w, h + 10, '#3a3450'), path(polyD([[x - 0.4 * m, base - h], [x + w / 2, base - h - 1.6 * m], [x + w + 0.4 * m, base - h]]), '#4a3a48'));
    for (let wx = x + 0.8 * m; wx < x + w - 1 * m; wx += 1.8 * m) if (r() < 0.5) out.push(rect(wx, base - h + 1 * m, 0.8 * m, 1 * m, '#f2c27a', { opacity: 0.9 }));
    x += w + r() * 2 * m;
  }
  for (let x = uOf(1500, KL); x < uOf(5000, KL); x += (2 + r() * 3) * m) out.push(foliage(x, base - 3 * m, (2 + r()) * m, (1.8 + r()) * m, ['#1e2a2a', '#24342e', '#2c3e34', '#34483c'], Math.round(x), { n: 10 }));
  // Far railing of the park.
  out.push(rect(uOf(1000, KL), base - 1.2 * m, uOf(5400, KL) - uOf(1000, KL), 1.5, '#1a1e2a'));
  return out.join('');
}

function sky() {
  const out = [];
  out.push(gpath(rectD(-200, -60, 3800, 900), lin(0, -60, 0, 420, [[0, '#0d1430'], [0.55, '#1f2752'], [0.85, '#3a3866'], [1, '#5a4a6e']])));
  const r = rng(5);
  for (let i = 0; i < 90; i++) out.push(circle(-200 + r() * 3800, -40 + r() * 300, 0.8 + r() * 1.4, '#fff6e0', { opacity: 0.25 + r() * 0.6 }));
  // Moon (key light, upper right).
  const mx = 2120;
  const my = 70;
  out.push(gpath(rectD(mx - 160, my - 160, 320, 320), rad(mx, my, 160, [[0, '#dce2ff', 0.35], [1, '#dce2ff', 0]])));
  out.push(circle(mx, my, 30, '#f3f0e6'), circle(mx - 8, my - 6, 7, '#e2ddd0'), circle(mx + 9, my + 8, 5, '#e2ddd0'));
  // Thin clouds catching the city glow.
  for (const [x, y, w] of [[600, 120, 420], [1500, 60, 520], [2700, 140, 380]]) out.push(path(smooth([[x, y], [x + w * 0.3, y - 18], [x + w * 0.7, y - 10], [x + w, y + 4], [x + w * 0.6, y + 14], [x + w * 0.2, y + 12]]), '#4a4870', { opacity: 0.5 }));
  return out.join('');
}

// ---------------------------------------------------------------- side street

function sideFar() {
  // The building closing the end of the side street, ~30 m away.
  const base = yOf(KS);
  const m = M * KS;
  const u0 = uOf(4500, KS);
  const u1 = uOf(6600, KS);
  const out = [];
  const em = [];
  out.push(rect(u0, -60, u1 - u0, base + 70, '#c9a88a'));
  for (let fl = 1; fl < 8; fl++) for (let x = u0 + 0.6 * m; x < u1 - 1 * m; x += 2.2 * m) {
    const y = base - fl * 3 * m;
    out.push(rect(x, y + 0.6 * m, 1 * m, 1.6 * m, '#4a3e48'));
    if ((fl * 7 + Math.round(x)) % 3 === 0) em.push(rect(x + 0.1 * m, y + 0.7 * m, 0.8 * m, 1.4 * m, fl % 2 ? '#ffcf86' : '#d8e6ff'));
  }
  // A shop at the end of the street, still open.
  const sx = uOf(5500, KS);
  out.push(rect(sx - 3 * m, base - 3 * m, 6 * m, 3 * m, '#2a2a30'));
  em.push(rect(sx - 2.8 * m, base - 2.6 * m, 2.4 * m, 2.6 * m, '#c8d8f0'), rect(sx + 0.4 * m, base - 2.6 * m, 2.4 * m, 2.6 * m, '#b8c8e4'), rect(sx - 3 * m, base - 3.4 * m, 6 * m, 0.6 * m, '#2e7a4e'));
  for (let i = 0; i < 6; i++) em.push(rect(sx - 2.6 * m + i * 0.9 * m, base - 2 * m, 0.6 * m, 1.6 * m, ['#e04a3a', '#f0c23a', '#3a7be0', '#3ab070'][i % 4], { opacity: 0.6 }));
  return { body: out.join(''), emissive: em.join(''), glows: [{ x: sx, y: base - 1.4 * m, r: 4 * m, color: '#c8d8f0', a: 0.2 }] };
}

/** Texture for a wall running into depth. Near end at x=0 (face +1) or at x=len (face -1). */
function sideWall({ len, h, face, seed, color, shops }) {
  const Wt = len * M;
  const out = [rect(0, -h * M, Wt, h * M, color)];
  const em = [];
  const tx = [];
  const r = rng(seed);
  const pos = (d) => (face > 0 ? d * M : (len - d) * M);
  // Upper floors: windows with balconies, some lit.
  for (let fl = 1; fl < 3; fl++) {
    const y = -fl * 3.2 * M - 0.6 * M;
    for (let d = 1.2; d < len - 1; d += 3.4) {
      const x = pos(d) - (face > 0 ? 0 : 1.3 * M);
      out.push(rect(x, y - 1.8 * M, 1.3 * M, 2.1 * M, '#3e3440'));
      if (r() < 0.4) em.push(rect(x + 0.1 * M, y - 1.7 * M, 1.1 * M, 1.9 * M, r() < 0.7 ? '#ffcf86' : '#cfe0ff'), rect(x + 0.1 * M, y - 1.7 * M, 1.1 * M, (0.3 + r() * 0.6) * M, '#8a6a5a', { opacity: 0.85 }));
      else out.push(rect(x + 0.1 * M, y - 1.7 * M, 1.1 * M, (0.6 + r() * 1.1) * M, '#8a7a70'));
      out.push(rect(x - 0.3 * M, y + 0.3 * M, 1.9 * M, 0.14 * M, '#d8c8b0'));
      for (let b = 0; b < 8; b++) out.push(rect(x - 0.25 * M + b * 0.24 * M, y - 0.5 * M, 0.05 * M, 0.8 * M, IRON.base));
      out.push(rect(x - 0.3 * M, y - 0.55 * M, 1.9 * M, 0.06 * M, IRON.base));
    }
  }
  out.push(rect(0, -0.5 * M, Wt, 0.5 * M, GRANITE.base));
  for (const s of shops) {
    const x0 = Math.min(pos(s.d0), pos(s.d1));
    const x1 = Math.max(pos(s.d0), pos(s.d1));
    if (s.kind === 'cierre') {
      out.push(shutter(x0, x1, -3 * M, -0.1 * M, seed + s.d0));
    } else if (s.kind === 'portal') {
      out.push(box(x0, -3.1 * M, x1 - x0, 3.1 * M, GRANITE, { r: 2 }), rect(x0 + 0.2 * M, -2.8 * M, x1 - x0 - 0.4 * M, 2.8 * M, '#2a2228'));
      em.push(rect(x0 + 0.3 * M, -2.7 * M, x1 - x0 - 0.6 * M, 1 * M, '#f0c07a', { opacity: 0.8 }));
    } else {
      out.push(rect(x0, -3.2 * M, x1 - x0, 3.2 * M, '#2a2a30'));
      em.push(gpath(rectD(x0 + 0.15 * M, -2.6 * M, x1 - x0 - 0.3 * M, 2.5 * M), lin(0, -2.6 * M, 0, 0, [[0, s.light], [1, s.light2 ?? s.light]])));
      em.push(rect(x0, -3.2 * M, x1 - x0, 0.6 * M, s.sign));
      tx.push({ x: (x0 + x1) / 2, y: -2.9 * M, s: s.name, size: 0.4 * M, font: 'body', weight: 800, color: s.ink, emissive: true, maxW: x1 - x0 - 0.4 * M });
      const pal = ['#e04a3a', '#f0c23a', '#3a7be0', '#3ab070', '#f6f0e0'];
      em.push(estante(x0 + 0.3 * M, x1 - 0.3 * M, -1.7 * M, Math.round(x0), pal, { s: 2.4 }), estante(x0 + 0.3 * M, x1 - 0.3 * M, -0.9 * M, Math.round(x0) + 1, pal, { s: 2.4 }));
      em.push(cristal(x0 + 0.15 * M, -2.6 * M, x1 - 0.15 * M, -0.1 * M));
    }
  }
  return { body: out.join(''), emissive: em.join(''), texts: tx };
}

/** Bricks as an SVG pattern: a big blank wall stays light to store and bake. */
function brickPattern(id, tones, mortar) {
  const bw = 40;
  const bh = 15;
  const r = rng(id.length * 7);
  const cells = [];
  for (let row = 0; row < 4; row++) for (let i = -1; i < 4; i++) {
    const x = i * bw + (row % 2 ? bw / 2 : 0);
    const p = r();
    cells.push(rect(x + 1.2, row * bh + 1.2, bw - 2.4, bh - 2.4, p < 0.6 ? tones[0] : p < 0.85 ? tones[1] : tones[2], { rx: 1.5 }));
  }
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${bw * 3}" height="${bh * 4}">${rect(0, 0, bw * 3, bh * 4, mortar)}${cells.join('')}</pattern>`;
}

function laterals() {
  const mk = (id, Xw, face, len, color, shops, seed, after, lights = []) => ({ id, X: Xw, face, len, h: 9, after, ...sideWall({ len, h: 9, face, seed, color, shops }), near: '#5a5f88', far: '#262a48', lights });
  return [
    // Party walls of the blocks either side of the park.
    { id: 'medianera1', X: 2000, face: 1, len: 12, h: 9, after: 'traseras', near: '#4e5378', far: '#2c304e', body: [brickPattern('lad1', ['#a8644c', '#985a44', '#b8745a'], '#c4ad96'), rect(0, -9 * M, 12 * M, 9 * M, 'url(#lad1)'), rect(1.5 * M, -7.5 * M, 8 * M, 3.6 * M, '#d8c8a0', { opacity: 0.55 })].join(''), texts: [{ x: 5.5 * M, y: -6.4 * M, s: 'VINOS · LICORES', size: 0.9 * M, font: 'display', color: '#8a3a2a' }, { x: 5.5 * M, y: -5 * M, s: 'CASA FUNDADA EN 1931', size: 0.45 * M, font: 'display', color: '#5a4a3a' }] },
    { id: 'medianera2', X: 4400, face: -1, len: 12, h: 9, after: 'traseras', near: '#4e5378', far: '#2c304e', body: brickPattern('lad2', ['#b07058', '#9e624c', '#c08068'], '#ccb69e') + rect(0, -9 * M, 12 * M, 9 * M, 'url(#lad2)') },
    mk('lado1', 4900, 1, 30, '#ddc9a8', [
      { kind: 'tienda', d0: 0.6, d1: 5.5, name: 'FARMACIA', sign: '#f2fff6', ink: '#1f9a4a', light: '#f2fff8', light2: '#cfeadc' },
      { kind: 'portal', d0: 7, d1: 9 },
      { kind: 'tienda', d0: 11, d1: 18, name: 'BAZAR', sign: '#d8323a', ink: '#ffe08a', light: '#f4f8ff', light2: '#d8e6f4' },
      { kind: 'cierre', d0: 19.5, d1: 25 },
      { kind: 'portal', d0: 26.5, d1: 28.5 },
    ], 33, 'parque'),
    mk('lado2', 6200, -1, 30, '#e6b8a4', [
      { kind: 'cierre', d0: 0.8, d1: 6 },
      { kind: 'tienda', d0: 8, d1: 13, name: 'KEBAB', sign: '#f0c23a', ink: '#8a1a1a', light: '#ffe0b0', light2: '#f0a868' },
      { kind: 'portal', d0: 15, d1: 17 },
      { kind: 'tienda', d0: 19, d1: 25, name: 'LOCUTORIO', sign: '#2a5aa8', ink: '#ffffff', light: '#eaf2ff', light2: '#cfdcf0' },
    ], 37, 'calzada'),
  ];
}

// ---------------------------------------------------------------- ground

const K_CURB = 1.333;
const K_ROAD = 1.38;

function ground() {
  const out = [];
  const kBot = P.f(1080) + 0.05;
  const quad = (X0, X1, k0, k1) => polyD([gp(X0, k0), gp(X1, k0), gp(X1, k1), gp(X0, k1)]);
  const Q = (X0, X1, k0, k1, c, a = {}) => path(quad(X0, X1, k0, k1), c, a);
  const [c0, c1] = X.cruce;
  const [p0, p1] = X.parque;
  // Park floor: gravel path by the railing, the playground's rubber blobs, grass beyond.
  out.push(Q(800, 4890, KL - 0.02, 1, '#4e6a38'));
  out.push(Q(p0 - 600, p1 + 600, kAt(5), kAt(2.2), '#c9b48e'), Q(p0, p1, kAt(2.2), 1, '#3a5a30'));
  out.push(Q(X.puerta[0], X.puerta[1], kAt(5), 1, '#c9b48e'));
  const zone = [[2300, 6], [2000, 12], [2200, 20], [3200, 23], [4300, 20], [4500, 12], [4200, 6], [3200, 5]];
  const proj = (pts) => smooth(pts.map(([x, d]) => gp(x, kAt(d))));
  out.push(path(proj(zone), '#d9a43a'));
  for (const [x, d, rx, rd, c] of [[2600, 9, 300, 2.2, '#8e2a2a'], [3500, 14, 420, 3, '#8e2a2a'], [2500, 17, 260, 2, '#7a7a7a'], [4000, 8.5, 200, 1.5, '#7a7a7a'], [3000, 7, 160, 1, '#8e2a2a'], [4100, 17, 220, 1.6, '#8e2a2a']]) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      pts.push([x + Math.cos(a) * rx * (0.8 + 0.25 * Math.sin(i * 2.1)), d + Math.sin(a) * rd]);
    }
    out.push(path(proj(pts), c));
  }
  // Main sidewalk: Madrid grey tiles with their four pastilles.
  const side = (X0, X1) => {
    const o = [Q(X0, X1, 1, K_CURB, '#a7a49e')];
    const rr2 = rng(Math.round(X0));
    const step = 0.3 * M;
    const zs = [];
    for (let z = ZW; z > ZW / K_CURB; z -= 0.3) zs.push(ZW / z);
    zs.push(K_CURB);
    for (let x = X0; x < X1; x += step) {
      for (let i = 0; i < zs.length - 1; i++) {
        const x1 = Math.min(X1, x + step);
        const t = rr2();
        o.push(Q(x + 1.5, x1 - 1.5, zs[i] + 0.002, zs[i + 1] - 0.002, t < 0.3 ? '#b2afa8' : t < 0.6 ? '#a9a6a0' : '#b8b5ae'));
        const xm = (x + x1) / 2;
        const km = (zs[i] + zs[i + 1]) / 2;
        o.push(stroke(`M${gp(xm, zs[i] + 0.004).join(' ')}L${gp(xm, zs[i + 1] - 0.004).join(' ')}M${gp(x + 8, km).join(' ')}L${gp(x1 - 8, km).join(' ')}`, '#8f8c86', 1.6));
      }
    }
    return o.join('');
  };
  out.push(side(-500, c0), side(c0 - 10, c0 + 140), side(c1 - 140, c1 + 10));
  // Curb and road along the first stretch.
  out.push(Q(-500, c0 + 140, K_CURB, K_CURB + 0.012, '#d2cec6'), Q(-500, c0 + 140, K_CURB + 0.012, K_ROAD, '#8e8a84'));
  out.push(Q(-500, c1 + 10, K_ROAD, kBot, '#45464e'));
  const ra = rng(7);
  for (let i = 0; i < 260; i++) {
    const x = -500 + ra() * (c1 + 500);
    const k = K_ROAD + ra() * (kBot - K_ROAD);
    out.push(circle(...gp(x, k), 1 + ra() * 2, ra() < 0.5 ? '#3a3b42' : '#55565e'));
  }
  out.push(Q(1700, 1830, K_ROAD + 0.01, K_ROAD + 0.05, '#2a2b30'));
  for (let i = 0; i < 6; i++) out.push(Q(1705 + i * 21, 1715 + i * 21, K_ROAD + 0.015, K_ROAD + 0.045, '#55565e'));
  // Side street: its own narrow sidewalks, the road, and the zebra crossing.
  out.push(Q(c0, c0 + 140, KS, 1, '#a7a49e'), Q(c1 - 140, c1, KS, 1, '#a7a49e'));
  out.push(Q(c0 + 140, c1 - 140, KS, K_ROAD, '#4a4b53'));
  out.push(Q(c0 + 130, c0 + 142, KS, K_CURB, '#d2cec6'), Q(c1 - 142, c1 - 130, KS, K_CURB, '#d2cec6'));
  for (let x = c0 + 190; x < c1 - 200; x += 110) out.push(Q(x, x + 60, 1.06, 1.3, '#e6e3dc', { opacity: 0.92 }));
  out.push(Q(5450, 5650, kAt(8), kAt(7.4), '#2e2f36'));
  // Pedestrian street: big granite slabs, no curb.
  const r = rng(13);
  out.push(Q(c1 - 10, X.fin + 900, 1, kBot, '#b5b0a6'));
  const zs = [];
  for (let z = ZW; z > ZW / kBot - 0.4; z -= 0.45) zs.push(ZW / z);
  for (let i = 0; i < zs.length - 1; i++) {
    const off = i % 2 ? 0.35 * M : 0;
    for (let x = c1 - off; x < X.fin + 900; x += 0.7 * M) {
      const t = r();
      out.push(Q(Math.max(c1, x) + 2, x + 0.7 * M - 2, zs[i] + 0.003, zs[i + 1] - 0.003, t < 0.35 ? '#bdb8ae' : t < 0.7 ? '#b1aca2' : '#c6c1b7'));
    }
  }
  out.push(Q(c1, X.fin + 900, K_CURB - 0.01, K_CURB + 0.01, '#8e8a84'));
  // Contact shadow along the facades and the park wall.
  out.push(gpath(quad(-500, X.fin + 900, 1, 1.05), lin(0, 760, 0, 792, [[0, '#120c18', 0.45], [1, '#120c18', 0]])));
  return out.join('');
}

// ---------------------------------------------------------------- foreground

const KF = K_CURB;

function lampPost(u, base, m) {
  return [
    box(u - 0.22 * m, base - 0.7 * m, 0.44 * m, 0.7 * m, mat('#26302c', '#18201c', '#3a4640', '#0c1210'), { r: 6 }),
    box(u - 0.3 * m, base - 0.18 * m, 0.6 * m, 0.18 * m, mat('#26302c', '#18201c', '#3a4640', '#0c1210'), { r: 4 }),
    shape(polyD([[u - 0.1 * m, base - 0.7 * m], [u + 0.1 * m, base - 0.7 * m], [u + 0.07 * m, -200], [u - 0.07 * m, -200]]), '#26302c', [rect(u + 0.02 * m, -200, 0.08 * m, base + 200, '#18201c'), rect(u - 0.07 * m, -200, 0.03 * m, base + 200, '#3a4640')], '#0c1210', 1.6),
    box(u - 0.14 * m, base - 2.2 * m, 0.28 * m, 0.12 * m, mat('#26302c', '#18201c', '#3a4640', '#0c1210'), { r: 3 }),
    box(u - 0.12 * m, base - 0.95 * m, 0.24 * m, 0.1 * m, mat('#26302c', '#18201c', '#3a4640', '#0c1210'), { r: 3 }),
  ].join('');
}

function bollard(u, base, m) {
  return shape(smooth([[u - 0.07 * m, base, 'c'], [u - 0.07 * m, base - 0.78 * m], [u - 0.05 * m, base - 0.86 * m], [u, base - 0.9 * m], [u + 0.05 * m, base - 0.86 * m], [u + 0.07 * m, base - 0.78 * m], [u + 0.07 * m, base, 'c']]), '#2a2c32', [rect(u + 0.02 * m, base - m, 0.06 * m, m, '#1a1c20'), rect(u - 0.08 * m, base - 0.7 * m, 0.16 * m, 0.04 * m, '#3e4048')], '#0e0f12', 1.4);
}

function containers(u, base, m) {
  const one = (x, w, c, lid, label) => [
    shape(rr(x, base - 1.3 * m, w, 1.25 * m, 8), c.base, [rect(x, base - 0.5 * m, w, 0.45 * m, c.shadow), rect(x + w - 0.1 * m, base - 1.3 * m, 0.1 * m, 1.3 * m, c.shadow)], c.line, 1.8),
    box(x - 0.05 * m, base - 1.42 * m, w + 0.1 * m, 0.16 * m, lid, { r: 6 }),
    circle(x + 0.2 * m, base - 0.02 * m, 0.08 * m, '#141414'), circle(x + w - 0.2 * m, base - 0.02 * m, 0.08 * m, '#141414'),
    rect(x + w / 2 - 0.25 * m, base - 1.05 * m, 0.5 * m, 0.3 * m, '#f4f4ee', { rx: 4, opacity: 0.85 }),
    label,
  ].join('');
  return [
    one(u - 1.9 * m, 1.2 * m, mat('#f0c23a', '#c9921a', '#ffe48a', '#7a5414'), mat('#e8b82a', '#c9921a', '#ffe48a', '#7a5414'), ''),
    one(u - 0.6 * m, 1.2 * m, mat('#2a6ab0', '#1e5090', '#4a8ad0', '#0e2a50'), mat('#225ea0', '#1e5090', '#4a8ad0', '#0e2a50'), ''),
    one(u + 0.7 * m, 1.2 * m, mat('#6a6e74', '#50545a', '#8a8e94', '#2a2e34'), mat('#5a5e64', '#50545a', '#8a8e94', '#2a2e34'), ''),
  ].join('');
}

function crossingSign(u, base, m) {
  return [
    rect(u - 0.04 * m, base - 2.6 * m, 0.08 * m, 2.6 * m, '#8a9096'),
    box(u - 0.33 * m, base - 3.3 * m, 0.66 * m, 0.66 * m, mat('#2a5aa8', '#1e4890', '#4a7ad0', '#0e2a60'), { r: 6 }),
    path(polyD([[u - 0.25 * m, base - 2.74 * m], [u, base - 3.18 * m], [u + 0.25 * m, base - 2.74 * m]]), '#f4f4ee'),
    circle(u + 0.01 * m, base - 3.0 * m, 0.035 * m, '#141414'), stroke(`M${u} ${base - 2.96 * m}L${u - 0.03 * m} ${base - 2.86 * m}M${u - 0.03 * m} ${base - 2.86 * m}L${u - 0.07 * m} ${base - 2.78 * m}M${u - 0.03 * m} ${base - 2.86 * m}L${u + 0.04 * m} ${base - 2.79 * m}`, '#141414', 0.03 * m),
  ].join('');
}

function streetTree(u, base, m, seed) {
  return [
    path(polyD([[u - 0.6 * m, base], [u + 0.6 * m, base], [u + 0.5 * m, base + 0.06 * m], [u - 0.5 * m, base + 0.06 * m]]), '#3a3630'),
    planeTree(u, base, m * 1.1, seed),
  ].join('');
}

function terraceChair(u, base, m, dir = 1) {
  // Black plastic terrace chair, seen from the side.
  const c = mat('#26262c', '#18181c', '#3e3e48', '#0a0a0c');
  const s = dir;
  return [
    stroke(`M${u} ${base}L${u + 0.04 * m * s} ${base - 0.45 * m}M${u + 0.42 * m * s} ${base}L${u + 0.4 * m * s} ${base - 0.45 * m}`, c.base, 0.05 * m),
    box(Math.min(u, u + 0.46 * m * s) - 0.02 * m, base - 0.5 * m, 0.48 * m, 0.07 * m, c, { r: 4 }),
    shape(smooth([[u + 0.02 * m * s, base - 0.48 * m], [u - 0.02 * m * s, base - 0.86 * m], [u + 0.06 * m * s, base - 0.9 * m], [u + 0.1 * m * s, base - 0.5 * m]]), c.base, [], c.line, 1.4),
  ].join('');
}

function foreground() {
  const m = M * KF;
  const base = yOf(KF);
  const at = (Xb) => uOf(Xb, KF);
  const pieces = [];
  const piece = (Xb, w, body, top = -220) => pieces.push({ x0: Math.floor(at(Xb) - w), x1: Math.ceil(at(Xb) + w), y0: top, y1: 1080, body });
  for (const xb of [760, 1980, 3000, 4100, 6560, 7700]) piece(xb, 0.4 * m, lampPost(at(xb), base, m));
  for (const xb of [260, 600, 1230, 2560, 3400, 3700, 4560, 6260, 6380]) piece(xb, 0.12 * m, bollard(at(xb), base, m));
  piece(1420, 3.2 * m, streetTree(at(1420), base, m, 21));
  piece(2330, 2.2 * m, containers(at(2330), base + 0.25 * m, m), base - 2 * m);
  piece(4860, 0.5 * m, crossingSign(at(4860), base, m));
  piece(7380, 3.2 * m, streetTree(at(7380), base, m, 27));
  // Two terrace chairs right at the front, by the bar.
  piece(6920, 1.2 * m, [terraceChair(at(6920) - 0.9 * m, base + 0.25 * m, m, 1), terraceChair(at(6920) + 0.5 * m, base + 0.2 * m, m, -1)].join(''), base - 1.2 * m);
  return pieces;
}

/** Terrace tables (with their chairs) live among the characters, sorted by depth. */
function terraceTable(seed) {
  // Character units (Fran is 270 tall = 1.75 m): 1 m = 154 units.
  const m = 154;
  const r = rng(seed);
  const al = mat('#c8ccd2', '#a2a8b0', '#e4e6ea', '#5c626a');
  const ch = mat('#26262c', '#18181c', '#3e3e48', '#0a0a0c');
  const chair = (x, dir, back) => {
    const s = dir;
    return [
      stroke(`M${x} 0L${x + 0.04 * m * s} ${-0.45 * m}M${x + 0.42 * m * s} 0L${x + 0.4 * m * s} ${-0.45 * m}`, back ? ch.shadow : ch.base, 0.05 * m),
      box(Math.min(x, x + 0.46 * m * s) - 0.02 * m, -0.5 * m, 0.48 * m, 0.07 * m, ch, { r: 4, lw: 1 }),
      shape(smooth([[x + 0.02 * m * s, -0.48 * m], [x - 0.02 * m * s, -0.86 * m], [x + 0.06 * m * s, -0.9 * m], [x + 0.1 * m * s, -0.5 * m]]), back ? ch.shadow : ch.base, [], ch.line, 1),
    ].join('');
  };
  const out = [path(ellipse(0, 2, 0.75 * m, 0.1 * m), '#000', { opacity: 0.3 })];
  out.push(chair(-0.62 * m, -1, true), chair(0.62 * m, 1, true));
  out.push(stroke(`M0 0L0 ${-0.7 * m}`, al.base, 0.06 * m), path(ellipse(0, -0.02 * m, 0.25 * m, 0.04 * m), al.shadow));
  out.push(shape(polyD([[-0.4 * m, -0.74 * m], [0.4 * m, -0.74 * m], [0.44 * m, -0.7 * m], [-0.44 * m, -0.7 * m]]), al.light, [], al.line, 1.2), box(-0.44 * m, -0.71 * m, 0.88 * m, 0.04 * m, al, { r: 2, lw: 1 }));
  // A napkin holder and, sometimes, a glass someone left.
  out.push(box(-0.12 * m, -0.86 * m, 0.1 * m, 0.12 * m, mat('#d8dce0', '#a8acb0', '#f4f6f8', '#5c626a'), { r: 2, lw: 0.8 }), rect(-0.1 * m, -0.9 * m, 0.06 * m, 0.06 * m, '#ffffff'));
  if (r() < 0.6) out.push(shape(polyD([[0.1 * m, -0.9 * m], [0.18 * m, -0.9 * m], [0.17 * m, -0.74 * m], [0.11 * m, -0.74 * m]]), '#f0c25a', [rect(0.1 * m, -0.9 * m, 0.08 * m, 0.03 * m, '#fff8e8')], '#8a6a2a', 0.8));
  out.push(chair(-0.5 * m, 1, false), chair(0.5 * m, -1, false));
  return g(null, out);
}

// ---------------------------------------------------------------- scene

export function uRange(k, pad = 60) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const vw of [1440, 1920, 2400, 2560]) {
    for (const c of [vw / 2, Math.max(vw / 2, W - vw / 2)]) {
      const off = vw / 2 - P.CX + k * (P.CX - c);
      lo = Math.min(lo, -off);
      hi = Math.max(hi, vw - off);
    }
  }
  return [Math.floor(lo - pad), Math.ceil(hi + pad)];
}

export function escena() {
  const F = facades();
  const near = parkNear();
  const dr = dragonLayer();
  const bk = backs();
  const sf = sideFar();
  const gr = uRange(P.f(1080));
  const sk = uRange(0.03);
  const fa = uRange(KL);
  const at = (Xb, k) => uOf(Xb, k);
  return {
    id: 'calle',
    name: 'Calle de Usera',
    W,
    H: 1080,
    HOR: P.HOR,
    BASE: P.BASE,
    CX: P.CX,
    M,
    ZW,
    speed: 300,
    // Key light for relief: the moon, up and to the right.
    clave: [0.45, -0.75, 0.5],
    ambient: '#3c4470',
    walk: { y0: 830, y1: 935, x0: 140, x1: 8060 },
    start: { X: 420, y: 860 },
    layers: [
      { id: 'cielo', k: 0.03, x0: sk[0], x1: sk[1], y0: -60, y1: 520, body: sky(), lit: false },
      { id: 'lejos', k: KL, x0: fa[0], x1: fa[1], y0: -60, y1: yOf(KL) + 10, body: farSide(), lit: false },
      { id: 'transversal', k: KS, x0: Math.floor(at(4500, KS)), x1: Math.ceil(at(6600, KS)), y0: -60, y1: yOf(KS) + 12, body: sf.body, emissive: sf.emissive, glows: sf.glows, lit: true, ambient: '#454a72', lights: false },
      { id: 'calzada', floor: true, x0: gr[0], x1: gr[1], y0: 200, y1: 1080, body: ground(), lit: true, textura: 0.35 },
      { id: 'dragon', k: KD, x0: Math.floor(at(1300, KD)), x1: Math.ceil(at(5500, KD)), y0: -40, y1: yOf(KD) + 6, body: dr.body, emissive: dr.emissive, glows: dr.glows, lit: true, ambient: '#525a88', textura: 0.25 },
      { id: 'traseras', k: KT, x0: Math.floor(at(-1200, KT)), x1: Math.ceil(at(9000, KT)), y0: -60, y1: yOf(KT) + 6, body: bk.body, emissive: bk.emissive, lit: true, ambient: '#3a3f66', lights: false, textura: 0.25 },
      { id: 'parque', k: KP, x0: Math.floor(at(1600, KP)), x1: Math.ceil(at(4800, KP)), y0: -220, y1: yOf(KP) + 8, body: near.body, emissive: near.emissive, glows: near.glows, lit: true, textura: 0.25 },
      { id: 'fachadas', k: 1, x0: -60, x1: W + 80, y0: -40, y1: 765, body: F.body, emissive: F.emissive, texts: F.texts, lit: true, textura: 0.3 },
      { id: 'frente', k: KF, z: 'front', lit: true, textura: 0.3, pieces: foreground() },
    ],
    laterals: laterals(),
    props: [
      { id: 'mesa1', X: 6560, y: 940, svg: terraceTable(1) },
      { id: 'mesa2', X: 6900, y: 868, svg: terraceTable(2) },
      { id: 'mesa3', X: 7260, y: 935, svg: terraceTable(3) },
      { id: 'mesa4', X: 7600, y: 872, svg: terraceTable(4) },
    ],
    lights: [
      ...[760, 1980, 3000, 4100, 6560, 7700].map((x) => ({ X: x, y: -80, r: 820, color: '#ffad58', power: 0.5, fy: 900, flat: 0.32 })),
      { X: 150, y: 430, r: 360, color: '#ffc27a', power: 0.35, fy: 790 },
      { X: 420, y: 470, r: 420, color: '#ffcf8a', power: 0.45, fy: 800 },
      { X: 1250, y: 450, r: 560, color: '#eef4ff', power: 0.55, fy: 820 },
      { X: 1730, y: 450, r: 520, color: '#ff9a6a', power: 0.5, fy: 820 },
      { X: 2760, y: 140, r: 520, color: '#dfe8ff', power: 0.4, fy: 690, flat: 0.3 },
      { X: 3560, y: 140, r: 520, color: '#dfe8ff', power: 0.4, fy: 690, flat: 0.3 },
      { X: 4650, y: 420, r: 600, color: '#9cf0b8', power: 0.45, fy: 820 },
      { X: 6740, y: 480, r: 760, color: '#ffc27a', power: 0.75, fy: 860 },
      { X: 6955, y: 200, r: 380, color: '#dfe8ff', power: 0.3 },
      { X: 7600, y: 440, r: 300, color: '#ffb070', power: 0.2, fy: 820 },
    ],
    zonas: {
      ventanaBajo: { u: 152, k: 1, w: 200, top: 290, bottom: 570, X: 160, y: 850 },
      portal: { u: 420, k: 1, w: 240, top: 150, bottom: 760, X: 420, y: 846 },
      merceria: { u: 800, k: 1, w: 360, top: 140, bottom: 740, X: 800, y: 850 },
      fruteria: { u: 1250, k: 1, w: 440, top: 112, bottom: 760, X: 1250, y: 850 },
      panaderia: { u: 1730, k: 1, w: 460, top: 112, bottom: 700, X: 1730, y: 850 },
      // The bins' lids and bodies, not the pavement in front of them.
      contenedores: { u: uOf(2330, K_CURB), k: K_CURB, w: 760, top: 580, bottom: 780, X: 2330, y: 900 },
      parque: { u: 3190, k: 1, w: 220, top: 380, bottom: 760, X: 3190, y: 846 },
      dragon: { u: at(3200, KD), k: KD, w: 1000, top: 20, bottom: yOf(KD), X: 3000, y: 846 },
      farmacia: { u: 4640, k: 1, w: 480, top: 100, bottom: 720, X: 4640, y: 850 },
      senal: { u: uOf(4860, K_CURB), k: K_CURB, w: 90, top: 80, bottom: 280, X: 4860, y: 900 },
      calleLateral: { u: 5550, k: 1, w: 900, top: 100, bottom: 700, X: 5550, y: 880 },
      puertaAzul: { u: 6335, k: 1, w: 170, top: 220, bottom: 760, X: 6335, y: 850 },
      bar: { u: 6740, k: 1, w: 600, top: 236, bottom: 760, X: 6740, y: 850 },
      puerta40: { u: 7155, k: 1, w: 190, top: 160, bottom: 760, X: 7155, y: 850 },
      peluqueria: { u: 7700, k: 1, w: 520, top: 112, bottom: 740, X: 7700, y: 850 },
    },
    spots: {
      cruz: { x: 4880, y: 164 },
      tele: { x: 6860, y: 430 },
      // a0..a1: the side street's far end; b0..b1: its mouth between the facades.
      cruce: { k: KS, x0: at(4300, KS), x1: at(6900, KS), y: yOf(KS) - 10, a0: at(4900, KS), a1: at(6200, KS), b0: 4900, b1: 6200 },
    },
  };
}
