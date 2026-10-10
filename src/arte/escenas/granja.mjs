// Guille's farm, on the outskirts of Madrid, at dusk. The yard: the pig pen on
// the left, the livestock scale, the white barn with the radio in its window and
// the first-aid kit by the door, the tap with the hose, a rosemary bush and his
// car, which is the way out. Over the low fences, dry fields and the Madrid
// skyline against the last of the sunset (Cuatro Torres, KIO, Torrespaña...).
//
// Everything is painted once (albedo with 2–3 tones per material, a line in a
// darker tone of the material) and baked with the scene light; the sun has just
// set on the left, so soft shade falls to the right and the warm lit points
// (the barn door with its lamp, the window with the radio) are the brightest.
// Pieces of one colour are merged into a single path (`acc`) to keep the bake cheap.
//
// Layers, back to front:
//   cielo     (0.02)  sunset gradient
//   skyline   (0.06)  Madrid, lit windows (unlit layer, it is far away)
//   campos    (0.22)  furrowed dry fields, bales, a power line, olive trees, haze
//   granja    (1)     pen, scale, barn, tap, rosemary, car
//   suelo     (rows)  packed earth, ruts, puddles, a cracked concrete slab, contact shade
//   [characters]
//   frente    (1.45)  straw bales and a fence post at the edges
import {
  smooth, ellipse, path, stroke, g, shape, rect, circle, line, polyD, rectD, rr, lin, rad, gpath,
  mat, box, foliage, persp, rng, ao, sombra, f2,
} from './kit.mjs';
import { cerdo, PIARA } from '../cerdos.mjs';

export const P = persp({ HOR: 380, BASE: 820, CX: 1170 });
export const W = 3800;
export const M = 210; // units per metre at depth 1
const { gp, yOf, uOf } = P;

const KS = 0.06; // skyline
const KC = 0.22; // fields
const KF = 1.45; // foreground

const WOOD = mat('#a8835a', '#86643f', '#c49d70', '#4e3720');
const WOODD = mat('#6e5034', '#523a24', '#8a6646', '#2e1e10');
const STEEL = mat('#b8bdc4', '#959ba3', '#d6dade', '#555b63');
const GALV = mat('#a9aeb0', '#8b9092', '#c8cccd', '#565b5e');
const WHITE = mat('#ece6da', '#cfc7b8', '#f8f4ec', '#8a8273');
const RED = mat('#c8433a', '#9a2e28', '#e06a5c', '#5e1814');
const GREEN = mat('#2f8a4e', '#236a3a', '#4aa86a', '#123a20');
const STRAW = ['#d8b860', '#c9a448', '#e8cc7a'];
const HAY = mat('#d8b860', '#b29538', '#ecd488', '#6a5418');
const STONE = ['#c4b8a2', '#b3a690', '#d0c4ae', '#a89c88'];
const DK = '#1a1222'; // ink of the soft shade

/** Horizontal range a layer at depth k must cover for any phone width. */
function uRange(k, pad = 80) {
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

// ---------------------------------------------------------------- small helpers

/** Many pieces of one colour in a single <path>: much cheaper to bake than loose elements. */
function acc() {
  const m = new Map();
  const put = (k, d) => m.set(k, (m.get(k) ?? '') + d);
  const api = {
    f: (c, d, o = 1) => (put(`f|${c}|${o}`, d), api),
    s: (c, w, d, o = 1, da = '') => (put(`s|${c}|${w}|${o}|${da}`, d), api),
    /** Round dots (nails, flowers, pebbles) as zero-length strokes. */
    dots: (c, w, pts, o = 1) => api.s(c, w, pts.map(([x, y]) => `M${f2(x)} ${f2(y)}h.1`).join(''), o),
    out() {
      let r = '';
      for (const [k, d] of m) {
        const [t, c, a, b, e] = k.split('|');
        r += t === 'f' ? path(d, c, a !== '1' ? { opacity: a } : {}) : stroke(d, c, a, { ...(b !== '1' ? { opacity: b } : {}), ...(e ? { 'stroke-dasharray': e } : {}) });
      }
      return r;
    },
  };
  return api;
}

const rd = (x, y, w, h) => `M${f2(x)} ${f2(y)}h${f2(w)}v${f2(h)}h${f2(-w)}z`;
const ln = (x1, y1, x2, y2) => `M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`;
/** Little rock/pebble as an arc-pair ellipse: far lighter than `ellipse`. */
const el = (cx, cy, rx, ry) => `M${f2(cx - rx)} ${f2(cy)}a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(2 * rx)} 0a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(-2 * rx)} 0z`;

/** Corners of a board of thickness t along the line (x1,y1)-(x2,y2). */
function tabla(x1, y1, x2, y2, t) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  const nx = (-dy / L) * (t / 2);
  const ny = (dx / L) * (t / 2);
  return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
}

/** Vertical boards of uneven width and tone, with joints, grain and the odd knot. */
function tablones(A, x, y, w, h, tones, gap, grain, r, bw = 34) {
  const knots = [];
  for (let xx = x; xx < x + w - 6; ) {
    const pw = Math.min(x + w - xx, bw * (0.8 + r() * 0.4));
    A.f(tones[Math.floor(r() * tones.length)], rd(xx, y, pw, h));
    if (xx > x) A.s(gap, 2.4, ln(xx, y, xx, y + h));
    const gx = xx + pw * (0.3 + r() * 0.4);
    A.s(grain, 1.8, `M${f2(gx)} ${f2(y + 6)}c${f2((r() - 0.5) * 8)} ${f2(h * 0.3)} ${f2((r() - 0.5) * 8)} ${f2(h * 0.6)} ${f2((r() - 0.5) * 6)} ${f2(h - 12)}`, 0.55);
    if (r() < 0.22) knots.push([xx + pw * (0.25 + r() * 0.5), y + 20 + r() * (h - 40)]);
    xx += pw;
  }
  A.dots(grain, 9, knots, 0.55);
  A.dots(gap, 4.5, knots, 0.7);
}

/** A leaning wooden post: chipped top, light on the left, grain, a crack. */
function poste(A, x, base, h, w, r, m = WOODD) {
  const lean = (r() - 0.5) * 8;
  const top = base - h + r() * 10;
  const pts = [[x - w / 2, base], [x + w / 2, base], [x + w / 2 + lean, top + r() * 6], [x + lean + (r() - 0.5) * w * 0.4, top - 4 - r() * 4], [x - w / 2 + lean, top]];
  A.f(m.base, polyD(pts));
  A.f(m.light, polyD([pts[0], [x - w / 2 + w * 0.26, base], [x - w / 2 + w * 0.26 + lean, top + 2], pts[4]]), 0.9);
  A.f(m.shadow, polyD([[x + w / 2 - w * 0.24, base], pts[1], pts[2], [x + w / 2 - w * 0.24 + lean, top + 4]]), 0.85);
  A.s(m.line, 1.8, polyD(pts));
  A.s(m.line, 1.8, `M${f2(x - w * 0.1 + lean * 0.5)} ${f2(top + 14)}q${f2((r() - 0.5) * 5)} ${f2(h * 0.3)} ${f2((r() - 0.5) * 4)} ${f2(h * 0.55)}`, 0.5);
  A.s(m.line, 1.6, `M${f2(x + w * 0.05 + lean)} ${f2(top + 4)}l${f2(-2 + r() * 4)} ${f2(18 + r() * 14)}`, 0.7);
}

/** Straw/hay bale with a lit top, strands, cord and loose stalks. (x,y) top-left. */
function paca(x, y, w, h, seed, m = HAY, hebras = 30) {
  const r = rng(seed);
  const t = h * 0.2;
  const out = [shape(rr(x, y, w, h, h * 0.14), m.base, [
    rect(x, y, w, t, m.light),
    rect(x, y + t - 1, w, 3, m.shadow, { opacity: 0.7 }),
    rect(x, y + h * 0.8, w, h * 0.2, m.shadow),
    rect(x + w * 0.9, y, w * 0.1, h, m.shadow, { opacity: 0.55 }),
    rect(x, y, w * 0.06, h, m.light, { opacity: 0.6 }),
  ], m.line, 2)];
  const A = acc();
  const dark = '#8a6a24';
  for (let i = 0; i < hebras; i++) {
    const sx = x + 8 + r() * (w - 16);
    const sy = y + 6 + r() * (h - 12);
    const a = (r() - 0.5) * 0.5;
    const L = 12 + r() * 16;
    const c = i % 3 === 0 ? m.light : i % 3 === 1 ? dark : m.shadow;
    A.s(c, 3.2, `M${f2(sx)} ${f2(sy)}l${f2(Math.cos(a) * L)} ${f2(Math.sin(a) * L)}`, 0.8);
  }
  for (const k of [0.3, 0.7]) {
    const cx = x + w * k;
    A.s('#6a4a22', 5.5, `M${f2(cx)} ${f2(y + t)}V${f2(y + h - 2)}M${f2(cx)} ${f2(y + t)}l3 ${f2(-t + 1)}`);
    A.s('#a88848', 1.8, `M${f2(cx - 2)} ${f2(y + t + 2)}V${f2(y + h - 4)}`, 0.7);
    A.dots('#3e2a10', 7, [[cx, y + t + h * 0.3]], 0.8);
  }
  // Loose stalks poking out of the top and the sides.
  for (let i = 0; i < 9; i++) {
    const px = x + 6 + r() * (w - 12);
    const side = i < 6 ? 0 : i % 2 ? -1 : 1;
    const c = STRAW[i % 3];
    if (side === 0) A.s(c, 3.2, `M${f2(px)} ${f2(y + 3)}q${f2(-4 + r() * 8)} ${f2(-8 - r() * 6)} ${f2(-6 + r() * 12)} ${f2(-14 - r() * 8)}`);
    else A.s(c, 3.2, `M${f2(side < 0 ? x + 3 : x + w - 3)} ${f2(y + h * (0.3 + r() * 0.5))}q${f2(side * (8 + r() * 6))} ${f2(-4 + r() * 8)} ${f2(side * (14 + r() * 8))} ${f2(-6 + r() * 12)}`);
  }
  out.push(A.out());
  return out.join('');
}

/** Galvanised tube with a lit left edge and a shaded right edge (rails and posts). */
function tubo(A, x, y, w, h, vertical = false) {
  A.f(GALV.base, rd(x, y, w, h));
  if (vertical) {
    A.f(GALV.light, rd(x, y, Math.max(2, w * 0.3), h), 0.9);
    A.f(GALV.shadow, rd(x + w * 0.7, y, w * 0.3, h), 0.9);
  } else {
    A.f(GALV.light, rd(x, y, w, Math.max(2, h * 0.3)), 0.9);
    A.f(GALV.shadow, rd(x, y + h * 0.72, w, h * 0.28), 0.9);
  }
}

// ---------------------------------------------------------------- sky and Madrid

function sky() {
  const [x0, x1] = uRange(0.02);
  const out = [gpath(rectD(x0, -60, x1 - x0, 560), lin(0, -60, 0, 440, [[0, '#18204a'], [0.45, '#3a3466'], [0.75, '#8a4e6a'], [0.9, '#d8775a'], [1, '#f2a65e']]))];
  // The sun has just gone, low on the left.
  out.push(gpath(rectD(x0, 200, 1400, 300), rad(200, 440, 700, [[0, '#ffc070', 0.55], [1, '#ffc070', 0]], 0.4)));
  const r = rng(4);
  for (let i = 0; i < 40; i++) out.push(circle(x0 + r() * (x1 - x0), -40 + r() * 180, 0.8 + r() * 1.2, '#fff6e0', { opacity: 0.2 + r() * 0.5 }));
  for (const [x, y, w] of [[300, 180, 520], [1300, 120, 640], [2300, 210, 460]]) out.push(path(smooth([[x, y], [x + w * 0.3, y - 14], [x + w * 0.7, y - 8], [x + w, y + 4], [x + w * 0.6, y + 12], [x + w * 0.2, y + 10]]), '#c87a78', { opacity: 0.45 }));
  return out.join('');
}

/**
 * The skyline, painted rather than to scale: it has to read at a glance.
 * Returns its body and the red aviation lights (for the live layer).
 */
function skyline() {
  const base = yOf(KS) + 4; // ~410
  const out = [];
  const luces = [];
  const r = rng(12);
  const win = (x, y, w, h, n = 0.4, cols = 3, c = '#ffd890') => {
    const o = [];
    for (let yy = y + 6; yy < y + h - 6; yy += 7) for (let xx = x + 3; xx < x + w - 4; xx += w / cols) if (r() < n) o.push(rect(xx, yy, 2.4, 3, c, { opacity: 0.85 }));
    return o.join('');
  };
  const dark = '#2a2d50';
  const dark2 = '#33355a';
  // The low city: a long band of blocks.
  for (let x = -600; x < 3200; ) {
    const w = 18 + r() * 40;
    const h = 14 + r() * 30;
    out.push(rect(x, base - h, w, h + 4, r() < 0.5 ? dark : dark2), win(x, base - h, w, h, 0.25, 4));
    x += w + r() * 6;
  }
  const torre = (x, w, h, c = dark2, n = 0.45) => {
    out.push(rect(x, base - h, w, h, c), win(x, base - h, w, h, n, Math.max(3, Math.round(w / 6))));
    luces.push([x + w / 2, base - h - 3]);
  };
  // Cuatro Torres (+ Caleido), north: Cepsa with its arch, Cristal, Espacio, PwC.
  const ct = 980;
  out.push(rect(ct, base - 250, 6, 250, dark2), rect(ct + 34, base - 250, 6, 250, dark2), rect(ct, base - 256, 40, 10, dark2));
  out.push(win(ct + 6, base - 244, 28, 236, 0.35, 4).replace(/#ffd890/g, '#cfe0ff'), rect(ct + 6, base - 244, 28, 236, '#3a3c62', { opacity: 0.5 }));
  luces.push([ct + 20, base - 260]);
  torre(ct + 58, 32, 262, '#38406a', 0.5);
  out.push(path(smooth([[ct + 58, base - 262], [ct + 74, base - 284], [ct + 90, base - 262]]), '#4a5a5a'));
  out.push(path(polyD([[ct + 112, base], [ct + 114, base - 236], [ct + 128, base - 248], [ct + 142, base - 236], [ct + 146, base]]), dark), win(ct + 116, base - 230, 28, 228, 0.4, 4));
  luces.push([ct + 128, base - 252]);
  out.push(path(smooth([[ct + 166, base], [ct + 164, base - 120], [ct + 170, base - 214], [ct + 184, base - 226], [ct + 198, base - 214], [ct + 200, base - 120], [ct + 196, base, 'c']]), '#34385e'), win(ct + 168, base - 210, 28, 208, 0.45, 4));
  luces.push([ct + 184, base - 230]);
  torre(ct + 222, 24, 150);
  // Torres KIO, leaning towards each other over Plaza de Castilla.
  const kio = 720;
  out.push(path(polyD([[kio, base], [kio + 22, base - 120], [kio + 50, base - 120], [kio + 28, base]]), dark2), path(polyD([[kio + 92, base], [kio + 70, base - 120], [kio + 98, base - 120], [kio + 120, base]]), dark2));
  out.push(win(kio + 16, base - 116, 30, 112, 0.3, 4), win(kio + 74, base - 116, 30, 112, 0.3, 4));
  luces.push([kio + 36, base - 123], [kio + 84, base - 123]);
  // Torre Picasso.
  torre(1360, 30, 158, '#3a3e64', 0.5);
  // Torrespaña, the «Pirulí».
  const pi = 1560;
  out.push(rect(pi - 4, base - 190, 8, 190, '#3c3a60'), path(ellipse(pi, base - 150, 20, 7), '#45436a'), rect(pi - 10, base - 168, 20, 12, '#45436a'), rect(pi - 1.5, base - 236, 3, 48, '#3c3a60'));
  for (let i = -2; i <= 2; i++) out.push(rect(pi + i * 6 - 1, base - 152, 2.4, 3, '#ffd890', { opacity: 0.9 }));
  luces.push([pi, base - 238]);
  // Edificio España and Torre de Madrid, towards the centre.
  torre(1840, 36, 112, dark2, 0.4);
  torre(1890, 26, 142, '#34365c', 0.4);
  torre(2160, 22, 88);
  return { body: out.join(''), luces };
}

function fields() {
  const [x0, x1] = uRange(KC);
  const base = yOf(KC); // ~477
  const out = [];
  const r = rng(21);
  // Far hills with a rim of the last light, then the fields in stripes of dry wheat,
  // stubble and ploughed earth, each one furrowed.
  const hills = [[x0, base - 30], [x0 + 600, base - 52], [x0 + 1500, base - 34], [x0 + 2300, base - 58], [x1, base - 36]];
  out.push(path(smooth([...hills, [x1, base + 120, 'c'], [x0, base + 120, 'c']]), '#6a5a6a'));
  out.push(stroke(smooth(hills, false), '#c88a78', 3, { opacity: 0.45 }));
  const tones = ['#b89a6a', '#9c7c56', '#c8a874', '#8a6c50'];
  const F = acc();
  let y = base - 30;
  for (let i = 0; y < 860; i++) {
    const h = 22 + i * i * 4;
    const top = (dy) => [[x0, y + dy], [x0 + 900, y + dy - 6 + (i % 2) * 8], [x0 + 1900, y + dy + 4], [x1, y + dy - 4]];
    out.push(path(smooth([...top(0), [x1, y + h + 30, 'c'], [x0, y + h + 30, 'c']]), tones[i % 4]));
    const nf = Math.max(2, Math.min(8, Math.round(h / 15)));
    for (let j = 1; j < nf; j++) {
      const d = (h * j) / nf;
      F.s('#3a2a1a', 2.8, smooth(top(d), false), 0.16, ['46 20 120 26', '90 30 40 22', '30 24 150 34'][j % 3]);
    }
    y += h;
  }
  out.push(F.out());
  // Round bales left in the stubble, bigger the nearer they are.
  const B = acc();
  for (const [dy, s] of [[34, 7], [50, 8], [70, 10], [92, 12], [118, 14], [150, 16]]) {
    for (let n = 0; n < 1; n++) {
      const x = x0 + 200 + r() * (x1 - x0 - 400);
      const by = base + dy + n * 11;
      B.f(DK, el(x + s * 0.5, by + s * 0.9, s * 1.2, s * 0.28), 0.28);
      B.f('#c9a95c', el(x, by, s, s * 0.92));
      B.f('#e4cc86', el(x - s * 0.3, by - s * 0.3, s * 0.5, s * 0.4), 0.8);
      B.s('#8a6a2a', 2.2, el(x, by, s * 0.62, s * 0.55));
      B.s('#6a5018', 2.4, el(x, by, s, s * 0.92), 0.7);
    }
  }
  out.push(B.out());
  // A line of poplars.
  const T = acc();
  for (let x = x0 + 300; x < x0 + 1300; x += 26 + r() * 10) {
    T.f(r() < 0.5 ? '#4a5a3a' : '#56664a', ellipse(x, base - 46, 7, 26));
    T.f('#7a8a5a', el(x - 2.5, base - 50, 2.6, 17), 0.55);
  }
  out.push(T.out());
  // A line of power poles with their wires, a little nearer than the poplars.
  const PA = acc();
  const py = base + 34;
  const xs = [];
  for (let x = x0 + 140; x < x1; x += 250) xs.push(x);
  for (let i = 0; i + 1 < xs.length; i++) {
    for (const dx of [-16, 16]) PA.s('#2e2428', 2, `M${xs[i] + dx} ${py - 66}Q${(xs[i] + xs[i + 1]) / 2 + dx} ${py - 66 + 17}${xs[i + 1] + dx} ${py - 66}`, 0.85);
    PA.s('#2e2428', 2, `M${xs[i]} ${py - 72}Q${(xs[i] + xs[i + 1]) / 2} ${py - 72 + 17}${xs[i + 1]} ${py - 72}`, 0.85);
  }
  for (const x of xs) {
    PA.f('#3a2e30', rd(x - 2.4, py - 72, 4.8, 76));
    PA.f('#3a2e30', rd(x - 18, py - 68, 36, 4));
    PA.f('#6a5a56', rd(x - 2.4, py - 72, 1.8, 76), 0.8);
    PA.dots('#cfc6b6', 5, [[x - 16, py - 71], [x + 16, py - 71], [x, py - 77]], 0.9);
  }
  out.push(PA.out());
  // Olive trees.
  for (let i = 0; i < 22; i++) {
    const x = x0 + r() * (x1 - x0);
    const yy = base - 4 + r() * 70;
    out.push(rect(x - 1.5, yy - 6, 3, 8, '#4a3a2a'), foliage(x, yy - 12, 14, 9, ['#5a6a46', '#667652', '#728260', '#4e5e3e'], i + 3, { n: 6 }));
  }
  // Haze to set the planes apart (F4): the horizon melts into the last of the sunset.
  out.push(gpath(rectD(x0, base - 70, x1 - x0, 230), lin(0, base - 70, 0, base + 160, [[0, '#e0948c', 0], [0.28, '#e0948c', 0.55], [0.55, '#cf8a84', 0.22], [1, '#cf8a84', 0]])));
  return out.join('');
}

// ---------------------------------------------------------------- the farm (depth 1)

const G = P.BASE; // ground line of the back plane (820)
const PEN = [120, 1120];
const SCALE = [1180, 1520];
const BARN = [1560, 2720];
const TAP = 2830;
const ROMERO = 3060;
const CAR = [3260, 3740];

function fence(x0, x1, seed) {
  // Wire fence on wooden posts, 1.2 m: low enough to see the fields.
  const r = rng(seed);
  const A = acc();
  const h = 1.2 * M;
  const xs = [];
  for (let x = x0; x <= x1; x += 220) xs.push(x + (r() - 0.5) * 16);
  const staples = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    for (const k of [0.25, 0.55, 0.85]) {
      const ya = G - h * k + (r() - 0.5) * 5;
      const yb = G - h * k + (r() - 0.5) * 5;
      A.s('#7a7f84', 2.2, `M${f2(xs[i])} ${f2(ya)}Q${f2((xs[i] + xs[i + 1]) / 2)} ${f2((ya + yb) / 2 + 2 * (8 + r() * 12))} ${f2(xs[i + 1])} ${f2(yb)}`);
      staples.push([xs[i], ya], [xs[i + 1], yb]);
    }
  }
  const hz = [];
  for (const x of xs) {
    const hh = h + 6 + r() * 14;
    poste(A, x, G, hh, 12 + r() * 5, r);
  }
  for (const [x, y] of staples) hz.push([x, y]);
  A.dots('#2a2a2e', 5, hz, 0.9);
  // Dry weeds along the foot of the fence.
  for (let x = x0 + 20; x < x1; x += 40 + r() * 60) {
    const hh = 22 + r() * 34;
    A.s(r() < 0.6 ? '#8a9a5a' : '#b0a468', 3, `M${f2(x)} ${G}q${f2(-6 + r() * 12)} ${f2(-hh * 0.5)} ${f2(-5 + r() * 10)} ${f2(-hh)}`);
    A.s('#8a9a5a', 3, `M${f2(x + 4)} ${G}q${f2(-3 + r() * 10)} ${f2(-hh * 0.4)} ${f2(2 + r() * 8)} ${f2(-hh * 0.8)}`);
  }
  return A.out();
}

function pen() {
  const [x0, x1] = PEN;
  const w = x1 - x0;
  const out = [];
  const r = rng(8);
  const top = G - 0.9 * M; // the coping line of the back wall
  // Back wall: brick in four tones with a damp foot, piers at both ends and a coping on top.
  const A = acc();
  A.f('#c4ad96', rd(x0, top, w, G - 40 - top));
  const bw = 40;
  const bh = 14;
  const tn = ['#a8644c', '#985a44', '#b8745a', '#8e5240'];
  for (let row = 0, yy = top; yy < G - 40; row++, yy += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x0 - off; xx < x1; xx += bw) {
      const a = Math.max(x0, xx + 1.4);
      const b = Math.min(x1, xx + bw - 1.4);
      const hh = Math.min(G - 40, yy + bh) - yy - 2.4;
      if (b - a < 3 || hh < 3) continue;
      const p = r();
      A.f(tn[p < 0.5 ? 0 : p < 0.78 ? 1 : p < 0.93 ? 2 : 3], rd(a, yy + 1.4, b - a, hh));
    }
  }
  A.f('#7e6a58', rd(x0, G - 52, w, 12));
  A.f('#9a8670', rd(x0, G - 52, w, 3), 0.8);
  out.push(A.out());
  out.push(gpath(rectD(x0, G - 140, w, 100), lin(0, G - 140, 0, G - 40, [[0, '#3a2a20', 0], [1, '#3a2a20', 0.42]])));
  // The pen floor: earth, mud, straw, and the stone kerb in front.
  const FL = acc();
  FL.f('#6a5238', rd(x0 - 10, G - 40, w + 20, 28));
  for (const [mx, mw] of [[360, 190], [830, 170], [150, 90]]) {
    FL.f('#4e3a28', smooth([[mx, G - 26], [mx + mw * 0.3, G - 33], [mx + mw * 0.7, G - 32], [mx + mw, G - 25], [mx + mw * 0.6, G - 17], [mx + mw * 0.2, G - 18]]));
    FL.f('#a08a98', smooth([[mx + mw * 0.15, G - 27], [mx + mw * 0.4, G - 31], [mx + mw * 0.75, G - 29], [mx + mw * 0.5, G - 24]]), 0.55);
  }
  for (let i = 0; i < 90; i++) {
    const x = x0 + r() * w;
    const yy = G - 16 - r() * 22;
    FL.s(STRAW[i % 3], 2.6, `M${f2(x)} ${f2(yy)}l${f2(10 - r() * 20)} ${f2(-4 - r() * 8)}`);
  }
  out.push(FL.out());
  const K = acc();
  K.f('#b8ae9c', rd(x0 - 14, G - 14, w + 28, 14));
  K.f('#d4cab8', rd(x0 - 14, G - 14, w + 28, 4));
  K.f('#7e7464', rd(x0 - 14, G - 4, w + 28, 4), 0.7);
  for (let x = x0 + 60; x < x1; x += 130 + r() * 40) K.s('#7e7464', 2, ln(x, G - 14, x, G));
  out.push(K.out());
  // Piers and coping.
  const PC = acc();
  for (const px of [x0 - 16, x1 - 26]) {
    PC.f(STONE[1], rd(px, top - 30, 42, G - 14 - top + 30));
    for (let yy = top - 30; yy < G - 14; yy += 24) PC.s('#7e7464', 2, `M${px} ${yy}h42`);
    PC.f(STONE[2], rd(px, top - 30, 12, G - 14 - top + 30), 0.55);
    PC.f('#8a7a64', rd(px + 32, top - 30, 10, G - 14 - top + 30), 0.55);
    PC.f('#d4cab8', rd(px - 6, top - 40, 54, 14));
    PC.f('#8a7a64', rd(px - 6, top - 29, 54, 3), 0.7);
  }
  PC.f('#cfc0a8', rd(x0 + 20, top - 14, w - 40, 16));
  PC.f('#e8dcc6', rd(x0 + 20, top - 14, w - 40, 4));
  PC.f('#8a7a64', rd(x0 + 20, top - 3, w - 40, 5), 0.8);
  for (let x = x0 + 80; x < x1 - 30; x += 90 + r() * 40) PC.s('#8a7a64', 2, ln(x, top - 14, x, top + 2));
  for (let i = 0; i < 8; i++) PC.f('#6a7a3a', el(x0 + 60 + r() * (w - 120), top - 12, 8 + r() * 10, 3), 0.7);
  out.push(PC.out());
  out.push(ao(x0, top + 2, w, 34, 0.35));
  // The pigs (two metres of art scale: a pig is ~1.3 m long).
  const s = 1.9;
  for (const [x, y, sc, f, sem] of [[300, G - 30, 0.95, 1, 2], [560, G - 26, 1.05, -1, 7], [760, G - 34, 0.9, 1, 11], [950, G - 28, 1.0, -1, 3]]) {
    out.push(g(null, cerdo({ s: s * sc, semilla: sem, manchas: sem % 3 }), { transform: `translate(${x} ${y}) scale(${f} 1)` }));
  }
  // Rails and posts, built by hand: boards a little out of line, nailed to leaning posts.
  const xs = [];
  for (let x = x0; x <= x1; x += 250) xs.push(x + (x === x0 || x === x1 ? 0 : (r() - 0.5) * 12));
  const R = acc();
  const SH = acc();
  const rails = [G - 1.15 * M, G - 0.62 * M];
  const nails = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    for (const ry of rails) {
      const ya = ry + (r() - 0.5) * 6;
      const yb = ry + (r() - 0.5) * 6;
      const pts = [[xs[i], ya], [xs[i + 1], yb], [xs[i + 1], yb + 16], [xs[i], ya + 16]];
      SH.f(DK, polyD(pts.map(([x, y]) => [x + 4, y + 14])), 0.24);
      R.f(WOOD.base, polyD(pts));
      R.f(WOOD.light, polyD([pts[0], pts[1], [pts[1][0], pts[1][1] + 4], [pts[0][0], pts[0][1] + 4]]), 0.9);
      R.f(WOOD.shadow, polyD([[pts[3][0], pts[3][1] - 4], [pts[2][0], pts[2][1] - 4], pts[2], pts[3]]), 0.9);
      R.s(WOOD.line, 1.8, polyD(pts));
      R.s(WOOD.line, 1.6, `M${f2(xs[i] + 30)} ${f2(ya + 7)}Q${f2((xs[i] + xs[i + 1]) / 2)} ${f2((ya + yb) / 2 + 9)} ${f2(xs[i + 1] - 30)} ${f2(yb + 8)}`, 0.5);
      R.s(WOOD.line, 1.6, `M${f2(xs[i] + 90)} ${f2(ya + 11)}l${f2(40 + r() * 40)} ${f2(-1 + r() * 2)}`, 0.4);
      nails.push([xs[i], ya + 8], [xs[i + 1], yb + 8]);
    }
  }
  out.push(SH.out(), R.out());
  const PP = acc();
  for (const x of xs) poste(PP, x, G - 14, 1.25 * M, 18 + r() * 5, r, WOODD);
  PP.dots('#2a2420', 5.5, nails, 0.9);
  PP.dots('#9a8a7a', 2.2, nails.map(([x, y]) => [x - 1, y - 1]), 0.7);
  out.push(PP.out());
  return out.join('');
}

function scale() {
  const [x0, x1] = SCALE;
  const cx1 = x1 - 90; // right end of the cage
  const out = [];
  const A = acc();
  // Chapa estriada platform: a lit top plate with its diamond tread, and a bolted front face.
  const top = G - 46;
  A.f('#40454c', rd(x0 + 10, G - 8, 22, 8));
  A.f('#40454c', rd(cx1 - 32, G - 8, 22, 8));
  A.f('#959ba3', rd(x0, top + 14, cx1 - x0, 24));
  A.f('#7a8088', rd(x0, top + 32, cx1 - x0, 6), 0.9);
  A.f('#d6dade', rd(x0, top + 14, cx1 - x0, 3), 0.9);
  A.f('#c2c7cc', polyD([[x0 + 10, top], [cx1 - 10, top], [cx1, top + 14], [x0, top + 14]]));
  A.f('#e2e6ea', polyD([[x0 + 10, top], [cx1 - 10, top], [cx1 - 12, top + 3], [x0 + 12, top + 3]]), 0.9);
  let d1 = '';
  let d2 = '';
  for (let x = x0 + 14; x < cx1 - 14; x += 13) {
    d1 += `M${f2(x)} ${top + 4}l6 8`;
    d2 += `M${f2(x + 7)} ${top + 4}l-6 8`;
  }
  A.s('#6a7078', 2.2, d1, 0.7);
  A.s('#6a7078', 2.2, d2, 0.55);
  A.s(STEEL.line, 1.8, rd(x0, top + 14, cx1 - x0, 24));
  const bolts = [];
  for (let x = x0 + 24; x < cx1; x += 70) bolts.push([x, top + 28]);
  A.dots('#555b63', 7, bolts);
  A.dots('#d6dade', 2.4, bolts.map(([x, y]) => [x - 1.4, y - 1.4]), 0.9);
  out.push(A.out());
  // The cage: galvanised tubes with a soft shadow against the fields behind.
  const T = acc();
  const SH = acc();
  const ys = [G - 1.05 * M, G - 0.6 * M, G - 0.3 * M];
  const posts = [];
  for (let x = x0; x <= cx1; x += 62) posts.push(x);
  for (const y of ys) SH.f(DK, rd(x0 + 5, y + 6, cx1 - x0, 10), 0.18);
  for (const x of posts) SH.f(DK, rd(x - 1, G - 1.1 * M + 5, 11, 1.1 * M - 46), 0.18);
  out.push(SH.out());
  for (const x of posts.slice(0, -1)) tubo(T, x + 31 - 2.5, ys[0] + 8, 5, top + 16 - ys[0] - 8, true);
  for (const y of ys) tubo(T, x0, y, cx1 - x0, y === ys[2] ? 8 : 10);
  for (const x of posts) tubo(T, x - 5, G - 1.1 * M - 6, 10, 1.1 * M - 40, true);
  T.dots(GALV.line, 6, posts.flatMap((x) => [[x, ys[0] + 5], [x, ys[1] + 5]]), 0.9);
  T.dots('#d6dade', 2.2, posts.flatMap((x) => [[x - 1, ys[0] + 4], [x - 1, ys[1] + 4]]), 0.9);
  T.f('#6a7078', rd(cx1 - 6, ys[1] - 40, 16, 7), 0.9); // latch of the gate
  out.push(T.out());
  // The display on its post, wired to the platform.
  const dx = x1 - 50;
  const hy = G - 1.75 * M;
  const Y = mat('#e8c23a', '#c9a01a', '#f8dc6a', '#6a520a');
  out.push(stroke(`M${dx - 16} ${hy + 70}C${dx - 20} ${hy + 140} ${dx - 40} ${G - 90} ${dx - 44} ${top + 8}`, '#1c1c20', 5));
  out.push(stroke(`M${dx + 24} ${G - 118}L${dx - 38} ${G - 9}`, GALV.shadow, 7), rect(dx - 26, G - 10, 52, 10, '#40454c'));
  out.push(box(dx - 8, G - 1.35 * M, 16, 1.35 * M, STEEL, { r: 3 }));
  out.push(box(dx - 52, hy, 104, 70, Y, { r: 8 }));
  out.push(path(rr(dx - 46, hy + 6, 92, 42, 6), '#2a2a2e'), path(rr(dx - 40, hy + 12, 80, 30, 4), '#1c2024'));
  out.push(stroke(rr(dx - 46, hy + 6, 92, 42, 6), '#6a520a', 1.6, { opacity: 0.8 }));
  for (const [bx, c] of [[-28, '#c8433a'], [0, '#3a8a4a'], [28, '#e8e8e0']]) out.push(circle(dx + bx, hy + 59, 6, c, { stroke: Y.line, 'stroke-width': 1.4 }));
  const sc = acc();
  sc.dots('#8a7010', 5.5, [[dx - 47, hy + 5], [dx + 47, hy + 5], [dx - 47, hy + 65], [dx + 47, hy + 65]]);
  sc.dots('#fff3b8', 2, [[dx - 48, hy + 4], [dx + 46, hy + 4]], 0.8);
  out.push(sc.out());
  return out.join('');
}

/** The lit display: zero once it has batteries, the total once the pigs are weighed. */
function scaleDisplay(kg) {
  const dx = SCALE[1] - 50;
  const y = G - 1.75 * M + 12;
  return path(rr(dx - 40, y, 80, 30, 4), '#123018') + `<text x="${dx}" y="${y + 24}" font-family="monospace" font-size="24" font-weight="700" fill="#7cff9a" text-anchor="middle">${String(kg).padStart(4, '0')}</text>`;
}

/** Madrid on its own, for the pig minigame's backdrop: markup and its box. */
export function madrid() {
  const { body } = skyline();
  return { body, x0: 600, x1: 2300, y0: 100, y1: yOf(KS) + 10 };
}

/** A flaked patch of plaster that shows the brick underneath. */
function desconchon(cx, cy, rx, ry, seed) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const k = 0.62 + r() * 0.55;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const d = smooth(pts);
  let mortar = '';
  for (let y = cy - ry; y < cy + ry; y += 12) mortar += `M${f2(cx - rx * 1.2)} ${f2(y)}h${f2(rx * 2.4)}`;
  const bricks = acc();
  const rr2 = rng(seed + 5);
  for (let y = cy - ry, row = 0; y < cy + ry; y += 12, row++) {
    for (let x = cx - rx * 1.2 + (row % 2) * 17; x < cx + rx * 1.2; x += 34) {
      bricks.s('#c9a88c', 2.2, `M${f2(x)} ${f2(y)}v12`);
      if (rr2() < 0.35) bricks.f(rr2() < 0.5 ? '#8e4c3a' : '#b8745a', rd(x + 2, y + 2, 30, 8), 0.7);
    }
  }
  return [
    stroke(d, '#fff8ec', 3, { opacity: 0.6, transform: 'translate(-2 -2)' }),
    stroke(d, '#7a6c58', 3.4, { opacity: 0.45, transform: 'translate(2.5 3)' }),
    shape(d, '#a8644c', [stroke(mortar, '#c9a88c', 2.2), bricks.out(), gpath(rectD(cx - rx * 1.3, cy - ry * 1.3, rx * 2.6, ry * 2.6), lin(0, cy - ry, 0, cy + ry, [[0, DK, 0.35], [0.5, DK, 0.05], [1, DK, 0]]))], '#8a7c68', 2),
  ].join('');
}

function barn() {
  const [x0, x1] = BARN;
  const w = x1 - x0;
  const out = [];
  const em = [];
  const r = rng(30);
  const d0 = x0 + 140; // the opening, 480 wide
  const d1 = x0 + 620;
  const DX0 = d0 + 220; // the sliding leaf, 300 wide
  const DX1 = DX0 + 300;
  const wx = x0 + 760;

  // ---- plaster walls, warmer on the left where the sun left, with stains and flaking
  out.push(rect(x0, -60, w, G + 60, WHITE.base));
  out.push(gpath(rectD(x0, -60, w, G + 60), lin(0, -60, 0, 500, [[0, '#4a3a50', 0.35], [1, '#4a3a50', 0]])));
  out.push(gpath(rectD(x0, -60, w, G + 60), lin(x0, 0, x1, 0, [[0, '#ffc890', 0.16], [0.5, '#ffffff', 0], [1, '#3a2a50', 0.16]])));
  const S = acc();
  for (let i = 0; i < 12; i++) S.f(WHITE.shadow, ellipse(x0 + 60 + r() * (w - 120), 90 + r() * 560, 36 + r() * 70, 12 + r() * 22), 0.32);
  for (let i = 0; i < 6; i++) S.f('#b8a88e', ellipse(x0 + 60 + r() * (w - 120), 250 + r() * 380, 24 + r() * 40, 14 + r() * 24), 0.2);
  for (let i = 0; i < 14; i++) {
    const x = x0 + 30 + r() * (w - 60);
    const y = 70 + r() * 600;
    S.s('#fffaf0', 6, `M${f2(x)} ${f2(y)}q${f2(50)} ${f2(-5 + r() * 8)} ${f2(100 + r() * 60)} ${f2(r() * 4)}`, 0.22);
  }
  // Rain stains running down from the gutter.
  for (const [sx, len] of [[x0 + 60, 330], [x0 + 330, 190], [x0 + 700, 150], [x0 + 940, 260], [x1 - 120, 210], [x1 - 300, 120], [x0 + 1010, 140]]) {
    S.f('#9a8c78', polyD([[sx - 8, 44], [sx + 8, 44], [sx + 4, 44 + len * 0.7], [sx + 1.5, 44 + len], [sx - 3, 44 + len * 0.6]]), 0.2);
  }
  out.push(S.out());
  // Damp rising from the foot, with a wavy edge.
  const damp = [[x0 - 10, 700]];
  for (let x = x0 + 50; x < x1 + 40; x += 70) damp.push([x, 630 + r() * 60]);
  damp.push([x1 + 10, 715, 'c'], [x0 - 10, 715, 'c']);
  out.push(gpath(smooth(damp), lin(0, 620, 0, 715, [[0, '#6a5a48', 0.04], [1, '#6a5a48', 0.4]])));

  // ---- stone plinth: irregular blocks in two courses, with a lit edge and a worn foot
  const PL = acc();
  PL.f('#6e6252', rd(x0 - 6, 708, w + 12, G - 708));
  for (const [yy, hh, off] of [[713, 56, 0], [771, 49, -44]]) {
    for (let x = x0 - 6 + off; x < x1 + 6; ) {
      const sw = 62 + r() * 62;
      const h2 = hh - r() * 5;
      PL.f(STONE[Math.floor(r() * 4)], rr(x + 1.5, yy + 1.5, sw - 3, h2 - 3, 9));
      PL.s('#efe4cf', 2.4, `M${f2(x + 10)} ${f2(yy + 6)}h${f2(sw - 22)}`, 0.5);
      PL.s('#3a2e24', 2.4, `M${f2(x + 10)} ${f2(yy + h2 - 4)}h${f2(sw - 22)}`, 0.3);
      x += sw;
    }
  }
  PL.f('#d4c8b4', rd(x0 - 8, 706, w + 16, 9));
  PL.f('#f0e6d2', rd(x0 - 8, 706, w + 16, 3), 0.9);
  PL.f('#8a7c68', rd(x0 - 8, 713, w + 16, 3), 0.8);
  out.push(PL.out());
  out.push(gpath(rectD(x0 - 6, 770, w + 12, 56), lin(0, 770, 0, G, [[0, '#4a3a2c', 0], [1, '#4a3a2c', 0.4]])));

  // ---- corner quoins of dressed stone
  const Q = acc();
  for (const qx of [x0 - 8, x1 - 36]) {
    Q.f('#8a7c68', rd(qx, 50, 44, 660));
    let y = 54;
    for (let i = 0; y < 705; i++) {
      const bh = 50 + r() * 22;
      const bw = i % 2 ? 44 : 32;
      const ox = qx + (i % 2 ? 0 : 4);
      Q.f(STONE[Math.floor(r() * 3)], rr(ox + 1.5, y + 1.5, bw - 3, Math.min(bh, 705 - y) - 3, 4));
      Q.s('#efe4cf', 2.4, `M${f2(ox + 5)} ${f2(y + 5)}h${f2(bw - 10)}`, 0.45);
      Q.s('#4a3e30', 2.4, `M${f2(ox + bw - 3)} ${f2(y + 5)}v${f2(bh - 10)}`, 0.28);
      y += bh;
    }
  }
  out.push(Q.out());
  // The flaked plaster: some brick shows through.
  for (const [dx, dy, rx, ry] of [[80, 330, 28, 36], [705, 240, 46, 38], [985, 175, 52, 40], [1105, 640, 40, 26], [720, 650, 56, 28]]) out.push(desconchon(x0 + dx, dy, rx, ry, dx));
  out.push(stroke(`M${x0 + 1010} 250l8 20l-6 14l10 22`, '#a89c88', 2.2, { opacity: 0.8 }), stroke(`M${x0 + 590} 700l10 -22l-4 -16`, '#a89c88', 2.2, { opacity: 0.8 }));

  // ---- the opening: timber jamb and lintel, a dark interior full of things
  out.push(rect(d0, 150, 222, G - 150, '#2e2018'));
  const IN = acc();
  tablones(IN, d0, 184, 222, G - 184, ['#3a281c', '#32221a', '#412d1f'], '#1c120c', '#241810', r, 36);
  out.push(IN.out());
  // Tools on the back wall: a pitchfork, a spade and a coil of rope, each with its shadow.
  const TL = acc();
  const fx = d0 + 62;
  const px = d0 + 128;
  TL.s('#0e0804', 8, `M${fx + 5} 250L${fx + 5} 530M${px + 5} 276L${px + 5} 532`, 0.35);
  TL.s('#8a6a44', 7, `M${fx} 246L${fx} 526M${px} 272L${px} 528`);
  TL.s('#b08a5c', 2.2, `M${fx - 2} 250L${fx - 2} 520M${px - 2} 276L${px - 2} 522`, 0.7);
  const ST = acc();
  ST.s('#0e0804', 6, `M${fx - 19} 556L${fx - 19} 628M${fx + 5} 556L${fx + 5} 636M${fx + 29} 556L${fx + 29} 628M${fx - 24} 550Q${fx + 5} 510 ${fx + 34} 550`, 0.35);
  ST.s('#8e949a', 6, `M${fx - 24} 546Q${fx} 506 ${fx + 24} 546M${fx - 24} 546L${fx - 24} 622M${fx} 526L${fx} 630M${fx + 24} 546L${fx + 24} 622`);
  ST.s('#d0d4d8', 2, `M${fx - 25} 548L${fx - 25} 618M${fx - 1} 530L${fx - 1} 624`, 0.7);
  ST.dots('#8e949a', 5, [[fx - 24, 626], [fx, 634], [fx + 24, 626]]);
  out.push(TL.out(), ST.out());
  // Spade blade.
  out.push(shape(smooth([[px - 20, 528, 'c'], [px + 20, 528, 'c'], [px + 22, 580], [px + 6, 614], [px - 6, 614], [px - 22, 580]]), '#8e949a', [rect(px - 20, 528, 8, 90, '#d0d4d8', { opacity: 0.55 }), rect(px + 10, 528, 12, 90, '#5a6068', { opacity: 0.55 })], '#555b63', 2));
  const rp = d0 + 184;
  out.push(stroke(el(rp, 306, 20, 24), '#b8975c', 5), stroke(el(rp, 306, 13, 16), '#9a7a44', 5), stroke(`M${rp + 8} 326q10 24 2 56`, '#b8975c', 5), circle(rp, 276, 5, '#555b63'));
  // A beam across the top, a tie strut, and the shelf with a few jars.
  out.push(box(d0 - 8, 150, 238, 36, WOODD, { r: 4 }));
  out.push(poly4([[d0 + 6, 330], [d0 + 26, 330], [d0 + 100, 186], [d0 + 80, 186]], WOODD.base, WOODD.line));
  out.push(ao(d0, 186, 222, 70, 0.55));
  out.push(box(d0 - 4, 372, 100, 12, WOODD, { r: 3 }));
  const SHF = acc();
  SHF.f('#6a4a2a', rr(d0 + 6, 340, 22, 32, 4));
  SHF.f('#8a8e94', rr(d0 + 36, 346, 26, 26, 4));
  SHF.f('#a8644c', rr(d0 + 68, 350, 20, 22, 3));
  SHF.f('#c8c0a8', rd(d0 + 36, 346, 26, 5), 0.9);
  out.push(SHF.out());
  // Bales on the floor of the barn, lit from the lamp.
  out.push(paca(d0 + 20, G - 64, 96, 64, 31, mat('#c9a448', '#a8862e', '#e0c06a', '#6a5418'), 18));
  out.push(paca(d0 + 120, G - 64, 96, 64, 32, mat('#c9a448', '#a8862e', '#e0c06a', '#6a5418'), 18));
  out.push(paca(d0 + 70, G - 128, 96, 64, 33, mat('#d2ac4e', '#ad8a30', '#e8c870', '#6a5418'), 18));
  out.push(ao(d0, G - 40, 222, 40, 0.4, -1));
  // The leaf throws its shade on the interior and the post lights the other side.
  out.push(gpath(rectD(d0 + 150, 184, 72, G - 184), lin(d0 + 150, 0, d0 + 222, 0, [[0, '#000000', 0], [1, '#000000', 0.42]])));
  em.push(gpath(rectD(d0 + 10, 160, 210, G - 160), lin(0, 160, 0, G, [[0, '#6a3e1a', 0.5], [1, '#d88a40', 0.7]])));
  // Timber jamb on the left.
  out.push(box(d0 - 26, 150, 26, G - 150, WOOD, { r: 3 }));
  const JB = acc();
  JB.s(WOOD.line, 1.6, `M${d0 - 16} 170q3 200 -1 420`, 0.5);
  JB.dots('#2e2420', 5, [[d0 - 13, 200], [d0 - 13, 480], [d0 - 13, 740]], 0.9);
  out.push(JB.out());
  // Concrete sill at the foot of the opening.
  out.push(rect(d0 - 26, G - 6, d1 - d0 + 80, 6, '#a49c8e'), rect(d0 - 26, G - 6, d1 - d0 + 80, 2, '#cfc4b2'));

  // ---- sliding rail with its trolleys
  const RL = acc();
  const rx0 = x0 + 110;
  const rx1 = x0 + 700;
  RL.f(DK, rd(rx0, 150, rx1 - rx0, 8), 0.28);
  for (let x = rx0 + 20; x < rx1; x += 150) {
    RL.f('#6a7078', polyD([[x, 116], [x + 18, 116], [x + 18, 134], [x + 4, 150]]));
    RL.dots('#2e3236', 5, [[x + 9, 122]]);
  }
  RL.f(STEEL.base, rd(rx0, 124, rx1 - rx0, 20));
  RL.f(STEEL.light, rd(rx0, 124, rx1 - rx0, 5), 0.95);
  RL.f(STEEL.shadow, rd(rx0, 138, rx1 - rx0, 6), 0.95);
  RL.s(STEEL.line, 1.8, rd(rx0, 124, rx1 - rx0, 20));
  RL.f('#555b63', rd(rx1 - 6, 118, 14, 32));
  out.push(RL.out());
  const TR = acc();
  for (const tx of [DX0 + 22, DX1 - 70]) {
    TR.f('#6a7078', rr(tx, 128, 48, 26, 5));
    TR.f('#9aa0a8', rd(tx + 4, 130, 40, 4), 0.9);
    TR.f('#6a7078', rd(tx + 12, 152, 24, 52));
    TR.f('#9aa0a8', rd(tx + 12, 152, 5, 52), 0.8);
    TR.s('#3a3e44', 1.8, rd(tx + 12, 152, 24, 52));
    TR.dots('#2e3236', 6.5, [[tx + 24, 167], [tx + 24, 192]]);
    TR.dots('#d6dade', 2.4, [[tx + 22.5, 165.5], [tx + 22.5, 190.5]], 0.8);
  }
  out.push(TR.out());
  for (const tx of [DX0 + 22, DX1 - 70]) out.push(circle(tx + 14, 122, 9, '#2a2e32', { stroke: '#555b63', 'stroke-width': 2 }), circle(tx + 34, 122, 9, '#2a2e32', { stroke: '#555b63', 'stroke-width': 2 }));

  // ---- the leaf: boards of different tones, grain, nails, and the Z brace as wide boards
  const DOOR = mat('#7a3a2a', '#5e2a1e', '#94503a', '#2e120a');
  const DS = acc();
  const dh = G - 152;
  tablones(DS, DX0, 152, 300, dh, ['#7a3a2a', '#6e3224', '#86422f', '#7e3c2c', '#733628'], '#2e120a', '#4a1c12', r, 33);
  DS.f('#c8a888', rd(DX0, 152, 5, dh), 0.28);
  DS.f('#2e120a', rd(DX1 - 9, 152, 9, dh), 0.3);
  out.push(DS.out());
  out.push(gpath(rectD(DX0, G - 90, 300, 90), lin(0, G - 90, 0, G, [[0, '#c8b090', 0], [1, '#c8b090', 0.26]])));
  const BR = acc();
  const BS = acc();
  const DB = mat('#8e4a36', '#6a3022', '#a85e46', '#3a160c');
  const diag = tabla(DX0 + 30, G - 62, DX1 - 30, 203, 38);
  const topR = [DX0 + 8, 184, 284, 38];
  const botR = [DX0 + 8, G - 80, 284, 38];
  BS.f(DK, polyD(diag.map(([x, y]) => [x + 7, y + 9])), 0.36);
  BS.f(DK, rd(topR[0] + 6, topR[1] + 9, topR[2], topR[3]), 0.36);
  BS.f(DK, rd(botR[0] + 6, botR[1] + 9, botR[2], botR[3]), 0.36);
  out.push(BS.out());
  BR.f(DB.base, polyD(diag));
  BR.f(DB.light, polyD([diag[0], diag[1], [diag[1][0] + 1, diag[1][1] + 6], [diag[0][0] + 1, diag[0][1] + 6]]), 0.85);
  BR.f(DB.shadow, polyD([diag[3], diag[2], [diag[2][0], diag[2][1] - 6], [diag[3][0], diag[3][1] - 6]]), 0.85);
  BR.s(DB.line, 2, `M${f2(diag[0][0])} ${f2(diag[0][1])}L${f2(diag[1][0])} ${f2(diag[1][1])}M${f2(diag[3][0])} ${f2(diag[3][1])}L${f2(diag[2][0])} ${f2(diag[2][1])}`);
  for (const [bx, by, bw2, bh2] of [topR, botR]) {
    BR.f(DB.base, rd(bx, by, bw2, bh2));
    BR.f(DB.light, rd(bx, by, bw2, 6), 0.9);
    BR.f(DB.shadow, rd(bx, by + bh2 - 7, bw2, 7), 0.9);
    BR.s(DB.line, 2, rd(bx, by, bw2, bh2));
    BR.s(DB.line, 1.8, `M${bx + 20} ${by + 15}q70 -4 140 2M${bx + 110} ${by + 26}q60 3 120 -2`, 0.5);
  }
  const nails = [];
  for (const [bx, by] of [[DX0 + 8, 184], [DX0 + 8, G - 80]]) for (const [nx, ny] of [[16, 19], [268, 19], [92, 19], [192, 19]]) nails.push([bx + nx, by + ny]);
  nails.push([DX0 + 52, G - 62], [DX1 - 52, 204], [DX0 + 120, G - 130 + 8], [DX0 + 180, 290]);
  BR.dots('#1a0c08', 8, nails, 0.9);
  BR.dots('#b0a090', 3, nails.map(([x, y]) => [x - 1.4, y - 1.4]), 0.8);
  out.push(BR.out());
  // The pull: an iron bar and its plate.
  out.push(box(DX0 + 14, 470, 14, 72, mat('#4a4e54', '#2e3236', '#7a8088', '#14161a'), { r: 4 }), rect(DX0 + 12, 466, 18, 6, '#2e3236'), rect(DX0 + 12, 540, 18, 6, '#2e3236'));
  out.push(ao(DX0, 152, 300, 34, 0.38));

  // ---- the lamp over the door, with its cable
  const lx = x0 + 388;
  const LP = acc();
  LP.f('#2a2e32', rr(lx - 20, 88, 40, 12, 3));
  LP.f('#2a2e32', rd(lx - 4, 98, 8, 12));
  LP.f('#3e464a', smooth([[lx - 32, 124, 'c'], [lx - 26, 112], [lx - 4, 104], [lx + 4, 104], [lx + 26, 112], [lx + 32, 124, 'c']]));
  LP.f('#6a747a', smooth([[lx - 30, 122, 'c'], [lx - 24, 113], [lx - 12, 108], [lx - 12, 114], [lx - 22, 122, 'c']]), 0.9);
  LP.f('#2a2e32', rr(lx - 34, 122, 68, 6, 3));
  LP.s('#14161a', 1.8, smooth([[lx - 32, 124, 'c'], [lx - 26, 112], [lx - 4, 104], [lx + 4, 104], [lx + 26, 112], [lx + 32, 124, 'c']]));
  LP.f('#e8d8a8', ellipse(lx, 126, 16, 5.4));
  out.push(LP.out());
  em.push(gpath(rectD(lx - 300, 120, 600, 300), rad(lx, 126, 300, [[0, '#ffd890', 0.3], [0.5, '#ffd890', 0.1], [1, '#ffd890', 0]], 0.9)));
  em.push(path(ellipse(lx, 127, 20, 6), '#ffd890'), circle(lx, 126, 6, '#fff6d0'));
  const CB = acc();
  CB.s('#2a2428', 3.2, smooth([[x1 + 30, 52], [x0 + 1000, 62], [x0 + 800, 72], [x0 + 600, 66], [x0 + 460, 74], [lx + 12, 84], [lx + 3, 96]], false));
  CB.dots('#6a6458', 6, [[x0 + 1000, 62], [x0 + 800, 72], [x0 + 600, 66], [x0 + 460, 74]]);
  CB.f('#7a8086', rr(x0 + 1130, 56, 54, 36, 5));
  CB.f('#a4aab0', rd(x0 + 1131, 57, 52, 5), 0.9);
  CB.s('#3a3e44', 1.8, rr(x0 + 1130, 56, 54, 36, 5));
  CB.dots('#2e3236', 5, [[x0 + 1138, 64], [x0 + 1176, 84]]);
  out.push(CB.out());

  // ---- window with the radio on the sill, wooden shutters and a horseshoe
  const WN = acc();
  const WH = acc();
  WH.f(DK, rd(wx + 240, 428, 9, 196), 0.16);
  // timber lintel above, frame, interior reveal
  out.push(WH.out());
  out.push(box(wx - 20, 398, 280, 22, WOODD, { r: 3 }));
  out.push(box(wx, 420, 240, 200, mat('#7a5a3c', '#5a4028', '#96724c', '#2e1e10'), { r: 3, sh: 0.04, li: 0.03 }));
  out.push(rect(wx + 14, 434, 212, 172, '#2a2030'));
  out.push(gpath(rectD(wx + 14, 434, 212, 172), lin(0, 434, 0, 606, [[0, '#000000', 0.45], [0.35, '#000000', 0.05], [1, '#000000', 0]])));
  out.push(gpath(rectD(wx + 14, 434, 30, 172), lin(wx + 14, 0, wx + 44, 0, [[0, '#000000', 0.4], [1, '#000000', 0]])));
  em.push(gpath(rectD(wx + 14, 434, 212, 172), lin(0, 434, 0, 606, [[0, '#ffcf86', 0.55], [1, '#ffa860', 0.75]])));
  em.push(poly4([[wx + 24, 606], [wx + 70, 606], [wx + 124, 434], [wx + 78, 434]], '#ffe8b8', null, 0.1));
  em.push(poly4([[wx + 140, 606], [wx + 160, 606], [wx + 210, 440], [wx + 190, 440]], '#ffe8b8', null, 0.08));
  // glazing bars and the wooden cross
  WN.f('#7a5a3c', rd(wx + 113, 434, 14, 172));
  WN.f('#7a5a3c', rd(wx + 14, 514, 212, 12));
  WN.f('#96724c', rd(wx + 113, 434, 4, 172), 0.9);
  WN.f('#96724c', rd(wx + 14, 514, 212, 3), 0.9);
  WN.f('#3a2818', rd(wx + 123, 434, 4, 172), 0.5);
  WN.f('#3a2818', rd(wx + 14, 524, 212, 3), 0.5);
  WN.s('#2e1e10', 1.8, `M${wx + 113} 434v172M${wx + 127} 434v172M${wx + 14} 514h212M${wx + 14} 526h212`, 0.7);
  WN.dots('#2e2420', 5, [[wx + 7, 450], [wx + 7, 590], [wx + 233, 450], [wx + 233, 590]], 0.9);
  out.push(WN.out());
  // shutters, half open and seen in perspective
  const SHT = acc();
  const shut = (xa, xb, sgn) => {
    const p = [[xa, 424], [xb, 410], [xb, 630], [xa, 616]];
    SHT.f(DK, polyD(p.map(([x, y]) => [x + 5 * sgn, y + 4])), 0.22);
    SHT.f('#456a58', polyD(p));
    SHT.f('#628a74', polyD([p[0], p[1], [p[1][0], p[1][1] + 8], [p[0][0], p[0][1] + 8]]), 0.8);
    SHT.f('#244a38', polyD([p[3], p[2], [p[2][0], p[2][1] - 8], [p[3][0], p[3][1] - 8]]), 0.8);
    SHT.s('#183626', 1.8, polyD(p));
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      const ya = 424 + (616 - 424) * t;
      const yb = 410 + (630 - 410) * t;
      SHT.s('#183626', 2.4, ln(xa, ya, xb, yb), 0.75);
      SHT.s('#7aa68a', 1.6, ln(xa, ya + 3, xb, yb + 3), 0.5);
    }
  };
  shut(wx - 4, wx - 40, -1);
  shut(wx + 244, wx + 258, 1);
  out.push(SHT.out());
  // horseshoe over the window
  const HS = acc();
  HS.s('#14161a', 7.6, `M${wx + 108} 360a14 14 0 1 0 24 0`, 0.4);
  HS.s('#5a6068', 6, `M${wx + 107} 358a14 14 0 1 0 26 0`);
  HS.s('#aab0b6', 2, `M${wx + 104} 366a14 14 0 0 0 8 10`, 0.8);
  HS.dots('#14161a', 3.4, [[wx + 106, 364], [wx + 111, 376], [wx + 129, 376], [wx + 134, 364]]);
  out.push(HS.out());
  // the sill: a lit top, a stone face with a drip edge, and the shade it throws
  const SL = acc();
  SL.f('#d8cdbb', polyD([[wx - 4, 614], [wx + 244, 614], [wx + 254, 623], [wx - 14, 623]]));
  SL.f('#b0a492', rd(wx - 14, 623, 268, 12));
  SL.f('#efe4cf', rd(wx - 14, 623, 268, 3), 0.9);
  SL.f('#6a5e4e', rd(wx - 14, 631, 268, 4), 0.7);
  SL.s('#6a5e4e', 1.8, rd(wx - 14, 623, 268, 12));
  out.push(SL.out());
  out.push(ao(wx - 14, 635, 268, 44, 0.4));
  out.push(stroke(`M${wx + 20} 640q-4 24 2 52M${wx + 120} 640q5 30 -1 70M${wx + 210} 640q-3 20 1 44`, '#6a5a48', 7, { opacity: 0.16 }));
  // The radio: an old portable, red, on the sill (its own sprite zone below).
  const rx = wx + 120;
  out.push(path(ellipse(rx + 4, 619, 74, 5), DK, { opacity: 0.28 }));
  out.push(stroke(`M${rx - 50} 556q0 -26 50 -26q50 0 50 26`, '#5a2018', 6));
  out.push(box(rx - 62, 556, 124, 62, RED, { r: 10 }), path(rr(rx - 50, 568, 54, 38, 6), '#3a2a28'));
  const RD = acc();
  RD.s('#6a4a44', 2, [0, 1, 2, 3, 4].map((i) => `M${rx - 46} ${574 + i * 7}H${rx}`).join(''));
  RD.s('#8a6a60', 1.6, `M${rx - 48} 570H${rx - 2}`, 0.6);
  RD.f('#e8dcc0', rr(rx + 12, 568, 40, 16, 4));
  RD.s('#b0a488', 1.6, rr(rx + 12, 568, 40, 16, 4));
  RD.s('#c8433a', 2.2, `M${rx + 36} 570V582`);
  out.push(RD.out());
  out.push(circle(rx + 22, 598, 7, '#2a2a2a', { stroke: '#6a6a6a', 'stroke-width': 1.6 }), circle(rx + 42, 598, 7, '#2a2a2a', { stroke: '#6a6a6a', 'stroke-width': 1.6 }));
  out.push(circle(rx + 21, 596.5, 2, '#d0d0d0', { opacity: 0.7 }), circle(rx + 41, 596.5, 2, '#d0d0d0', { opacity: 0.7 }));
  out.push(rect(rx - 56, 557, 112, 4, '#e8806e', { opacity: 0.5, rx: 2 }));
  out.push(stroke(`M${rx + 40} 556L${rx + 70} 470`, '#9a9fa4', 2.4), circle(rx + 70, 470, 3.6, '#c0c4c8'));

  // ---- first-aid kit: a green box on the wall, with hinges, a latch and a raised cross
  const bx = x0 + 1080;
  out.push(path(rr(bx - 42, 480, 100, 82, 8), DK, { opacity: 0.24 }));
  out.push(box(bx - 50, 470, 100, 82, GREEN, { r: 8 }));
  const FK = acc();
  FK.f('#3aa05e', rr(bx - 42, 478, 84, 66, 5), 0.45);
  FK.s(GREEN.line, 1.8, rr(bx - 42, 478, 84, 66, 5), 0.6);
  FK.f('#c8ccd0', rd(bx - 54, 484, 7, 16));
  FK.f('#c8ccd0', rd(bx - 54, 524, 7, 16));
  FK.f('#7a8086', rd(bx - 54, 492, 7, 2));
  FK.f('#7a8086', rd(bx - 54, 532, 7, 2));
  FK.f('#c8ccd0', rr(bx + 44, 500, 10, 22, 3));
  FK.s('#555b63', 1.6, rr(bx + 44, 500, 10, 22, 3));
  FK.f(DK, rd(bx - 7, 485, 18, 58), 0.25);
  FK.f(DK, rd(bx - 27, 505, 58, 18), 0.25);
  FK.f('#f4f4ee', rd(bx - 9, 482, 18, 58));
  FK.f('#f4f4ee', rd(bx - 29, 502, 58, 18));
  FK.f('#ffffff', rd(bx - 9, 482, 18, 3), 0.8);
  FK.f('#c8c8bc', rd(bx - 9, 536, 18, 4), 0.8);
  FK.dots('#1a4a2a', 5, [[bx - 38, 482], [bx + 38, 482], [bx - 38, 540], [bx + 38, 540]], 0.8);
  out.push(FK.out());
  out.push(ao(bx - 50, 552, 100, 30, 0.34));

  // ---- the eaves: tile edge, fascia, galvanised gutter, downpipe and the shade under them
  const RF = acc();
  RF.f('#8a4a36', rd(x0 - 36, -60, w + 72, 64));
  for (let x = x0 - 36, i = 0; x < x1 + 36; x += 34, i++) {
    RF.f(TEJA_(i), `M${x} -60V-10a17 17 0 0 0 34 0V-60z`);
    RF.s('#5e2a1c', 2, `M${x + 34} -60V-8`, 0.7);
    RF.s('#d88a68', 2, `M${x + 6} -50V-8`, 0.45);
  }
  RF.f('#4a2a1e', rd(x0 - 36, 6, w + 72, 12), 0.9);
  out.push(RF.out());
  const GT = acc();
  GT.f(DK, rd(x0 - 30, 44, w + 60, 8), 0.2);
  GT.f(GALV.base, rr(x0 - 38, 16, w + 76, 30, 12));
  GT.f(GALV.light, rd(x0 - 30, 19, w + 60, 5), 0.9);
  GT.f(GALV.shadow, rd(x0 - 30, 36, w + 60, 8), 0.9);
  GT.s(GALV.line, 1.8, rr(x0 - 38, 16, w + 76, 30, 12));
  for (let x = x0 + 40; x < x1; x += 170) GT.f('#6a7078', rd(x, 40, 8, 12));
  // the downpipe, with its brackets
  const pxx = x0 + 52;
  GT.f(DK, rd(pxx + 6, 46, 18, G - 80), 0.18);
  GT.f(GALV.base, rd(pxx - 9, 40, 18, G - 100));
  GT.f(GALV.light, rd(pxx - 9, 40, 5, G - 100), 0.9);
  GT.f(GALV.shadow, rd(pxx + 4, 40, 5, G - 100), 0.9);
  GT.s(GALV.line, 1.8, rd(pxx - 9, 40, 18, G - 100));
  for (const by of [180, 400, 620]) GT.f('#6a7078', rd(pxx - 12, by, 24, 8));
  GT.f(GALV.base, polyD([[pxx - 9, G - 60], [pxx + 9, G - 60], [pxx + 30, G - 30], [pxx + 12, G - 30]]));
  GT.s(GALV.line, 1.8, polyD([[pxx - 9, G - 60], [pxx + 9, G - 60], [pxx + 30, G - 30], [pxx + 12, G - 30]]));
  out.push(GT.out());
  out.push(ao(x0 - 30, 50, w + 60, 80, 0.4));
  // and the shade where the wall meets the ground
  out.push(ao(x0 - 10, G - 46, w + 20, 46, 0.4, -1));
  return { body: out.join(''), emissive: em.join('') };
}

function TEJA_(i) {
  return ['#a85a3e', '#96492f', '#b8684a'][i % 3];
}

function poly4(pts, fill, lineC, op = 1) {
  return path(polyD(pts), fill, op < 1 ? { opacity: op } : {}) + (lineC ? stroke(polyD(pts), lineC, 1.8) : '');
}

function tap() {
  const out = [];
  // A tap on a short brick post (coping, wet stain below the spout), the green hose coiled
  // on a hook beside it, and a galvanised bucket.
  const A = acc();
  const px0 = TAP - 40;
  const top = G - 1.0 * M;
  const r = rng(9);
  A.f('#c4ad96', rd(px0, top, 80, G - top));
  const tn = ['#a8644c', '#985a44', '#b8745a', '#8e5240'];
  for (let row = 0, yy = top; yy < G; row++, yy += 11) {
    for (let xx = px0 - (row % 2 ? 13 : 0); xx < px0 + 80; xx += 26) {
      const a = Math.max(px0, xx + 1.2);
      const b = Math.min(px0 + 80, xx + 24.8);
      const hh = Math.min(G, yy + 11) - yy - 2;
      if (b - a < 3 || hh < 3) continue;
      const p = r();
      A.f(tn[p < 0.5 ? 0 : p < 0.78 ? 1 : p < 0.93 ? 2 : 3], rd(a, yy + 1.2, b - a, hh));
    }
  }
  A.f('#f0b890', rd(px0, top, 14, G - top), 0.12);
  A.f(DK, rd(px0 + 64, top, 16, G - top), 0.2);
  A.f(DK, rd(px0, G - 40, 80, 40), 0.18);
  A.f('#cfc0a8', rd(TAP - 48, top - 12, 96, 14));
  A.f('#e8dcc6', rd(TAP - 48, top - 12, 96, 4), 0.9);
  A.f('#8a7a64', rd(TAP - 48, top - 1, 96, 4), 0.8);
  A.s('#8a7a64', 1.8, rd(TAP - 48, top - 12, 96, 14));
  A.f('#4a5a6a', polyD([[TAP + 14, G - 0.8 * M + 12], [TAP + 24, G - 0.8 * M + 12], [TAP + 26, G - 0.8 * M + 70], [TAP + 12, G - 0.8 * M + 70]]), 0.25);
  out.push(A.out());
  // The tap: a brass spout, a down-turned nozzle and a red wheel.
  const TP = acc();
  const ty = G - 0.8 * M;
  TP.f(DK, rr(TAP - 4, ty + 4, 36, 16, 6), 0.25);
  TP.f('#b08a40', rr(TAP - 6, ty, 34, 16, 6));
  TP.f('#e0c070', rd(TAP - 2, ty + 2, 26, 4), 0.9);
  TP.f('#7a5a20', rd(TAP, ty + 11, 28, 4), 0.8);
  TP.f('#b08a40', rd(TAP + 22, ty + 4, 10, 22));
  TP.f('#7a5a20', rd(TAP + 27, ty + 4, 5, 22), 0.7);
  TP.s('#5a4010', 1.6, rr(TAP - 6, ty, 34, 16, 6));
  TP.f('#8a8e94', rd(TAP + 2, ty - 8, 8, 10));
  out.push(TP.out());
  out.push(circle(TAP + 6, ty - 12, 11, RED.base, { stroke: RED.line, 'stroke-width': 2 }), path(ellipse(TAP + 6, ty - 12, 11, 3.4), RED.shadow, { opacity: 0.6 }), circle(TAP + 2, ty - 15, 3, RED.light, { opacity: 0.8 }));
  out.push(stroke(`M${TAP - 4} ${ty - 12}h20`, RED.line, 2.4, { opacity: 0.8 }));
  // The hose coiled on its hook, lit on the upper left, with the free end trailing.
  const hx = TAP + 110;
  const hy = G - 0.95 * M;
  const HZ = acc();
  for (let i = 0; i < 4; i++) {
    const rx = 44 - i * 3;
    const ry = 30 - i * 2;
    const d = `M${hx} ${hy}m-${rx} 0a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 -${2 * rx} 0`;
    HZ.s('#1c4a2a', 9, d, 0.35);
    HZ.s(i % 2 ? '#2f8a4e' : '#3fa060', 7, d);
    HZ.s('#7ad090', 2, `M${hx - rx + 3} ${hy - 6}a${rx - 3} ${ry - 3} 0 0 1 ${rx * 0.8} ${-ry * 0.7}`, 0.75);
  }
  HZ.s('#1c4a2a', 9, `M${hx - 30} ${G - 0.8 * M}q-20 120 -110 ${0.8 * M - 4}`, 0.35);
  HZ.s('#3fa060', 7, `M${hx - 30} ${G - 0.8 * M}q-20 120 -110 ${0.8 * M - 4}`);
  HZ.s('#7ad090', 2, `M${hx - 33} ${G - 0.8 * M + 8}q-20 110 -104 ${0.8 * M - 20}`, 0.6);
  HZ.f('#b08a40', rr(hx - 152, G - 12, 22, 12, 3));
  const HP = acc();
  poste(HP, hx, G, 1.25 * M, 14, r, WOODD);
  HP.f('#8a8e94', rd(hx - 14, hy - 8, 28, 5));
  HP.dots('#2a2420', 5, [[hx, hy - 6]]);
  out.push(HP.out());
  out.push(HZ.out());
  // A bucket with a handle: tapered, ribbed, a rolled rim and dark water inside.
  const bx = TAP - 120;
  const BK = acc();
  BK.f(GALV.base, smooth([[bx - 36, G - 78, 'c'], [bx + 36, G - 78, 'c'], [bx + 28, G, 'c'], [bx - 28, G, 'c']]));
  BK.f(GALV.light, polyD([[bx - 36, G - 78], [bx - 22, G - 78], [bx - 16, G], [bx - 28, G]]), 0.9);
  BK.f(GALV.shadow, polyD([[bx + 18, G - 78], [bx + 36, G - 78], [bx + 28, G], [bx + 12, G]]), 0.9);
  BK.s(GALV.shadow, 3, `M${bx - 33} ${G - 54}H${bx + 33}M${bx - 30} ${G - 28}H${bx + 30}`, 0.9);
  BK.s(GALV.line, 1.8, polyD([[bx - 36, G - 78], [bx + 36, G - 78], [bx + 28, G], [bx - 28, G]]));
  out.push(BK.out());
  out.push(path(ellipse(bx, G - 78, 36, 8), GALV.light), path(ellipse(bx, G - 77, 31, 6), '#3a3a4a'), path(ellipse(bx - 6, G - 78, 14, 2.4), '#d88a7a', { opacity: 0.6 }), stroke(ellipse(bx, G - 78, 36, 8), GALV.line, 1.8));
  out.push(stroke(`M${bx - 34} ${G - 80}Q${bx} ${G - 150} ${bx + 34} ${G - 80}`, '#5a6068', 4), stroke(`M${bx - 33} ${G - 82}Q${bx - 4} ${G - 143} ${bx + 20} ${G - 118}`, '#c0c4c8', 1.6, { opacity: 0.7 }));
  return out.join('');
}

function romero() {
  const out = [];
  const r = rng(40);
  // A ring of stones and the bush rising out of it: dark mass behind, stems in three tones, flowers.
  const ST = acc();
  const stones = [];
  for (let i = 0; i < 9; i++) {
    const x = ROMERO - 100 + i * 25 + (r() - 0.5) * 8;
    const rx = 15 + r() * 6;
    stones.push([x, rx]);
    ST.f(DK, el(x + 4, G - 2, rx, 6), 0.22);
  }
  const mass = acc();
  mass.f('#34503a', ellipse(ROMERO, G - 70, 96, 62), 0.85);
  mass.f('#3e5c40', ellipse(ROMERO - 20, G - 80, 62, 46), 0.9);
  out.push(mass.out());
  const STM = acc();
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI * (0.1 + r() * 0.8);
    const L = 60 + r() * 90;
    const x = ROMERO - 60 + r() * 120;
    const left = Math.cos(a) < 0;
    STM.s(left ? ['#6a8a62', '#5e7e58', '#4a6a4a'][i % 3] : ['#4a6a4a', '#3e5c40', '#34503a'][i % 3], 4.6, `M${f2(x)} ${G}q${f2(Math.cos(a) * L * 0.4)} ${f2(Math.sin(a) * L * 0.6)} ${f2(Math.cos(a) * L)} ${f2(Math.sin(a) * L)}`);
  }
  out.push(STM.out());
  const FL = acc();
  const f1 = [];
  const f2p = [];
  for (let i = 0; i < 40; i++) (r() < 0.5 ? f1 : f2p).push([ROMERO - 110 + r() * 220, G - 40 - r() * 110]);
  FL.dots('#9a8ad8', 7.5, f1);
  FL.dots('#b4a6ec', 7.5, f2p);
  FL.dots('#e4dcff', 3, f2p.map(([x, y]) => [x - 1.5, y - 1.5]), 0.8);
  out.push(FL.out());
  // The ring of stones in front.
  for (const [x, rx] of stones) {
    out.push(shape(el(x, G - 7, rx, 9), STONE[(Math.floor(x) >> 2) % 4], [rect(x - rx, G - 16, rx * 2, 5, '#efe4cf', { opacity: 0.45 }), rect(x - rx, G - 5, rx * 2, 6, DK, { opacity: 0.25 })], '#7a6e5c', 1.6));
  }
  return out.join('');
}

function car() {
  const [x0, x1] = CAR;
  const out = [];
  const em = [];
  const y = G;
  const C = mat('#c8433a', '#9a2e28', '#e06a5c', '#5e1814');
  // An old three-door hatchback, nose to the right, its paint still catching the sunset.
  const body = smooth([[x0 + 10, y - 50], [x0 + 20, y - 120, 'c'], [x0 + 120, y - 130, 'c'], [x0 + 170, y - 210, 'c'], [x0 + 330, y - 214, 'c'], [x0 + 400, y - 136, 'c'], [x1 - 10, y - 124, 'c'], [x1, y - 60, 'c'], [x1 - 6, y - 30, 'c'], [x0 + 6, y - 30, 'c']]);
  const arc = (wx) => `M${wx - 47} ${y - 34}a47 47 0 0 1 94 0z`;
  const wheels = [x0 + 110, x1 - 110];
  const U = acc();
  U.f('#120c14', rd(x0 + 40, y - 42, x1 - x0 - 80, 36), 0.85);
  out.push(U.out());
  const refl = lin(x0, 0, x1, 0, [[0, '#ffbe84', 0.62], [0.3, '#ffbe84', 0.24], [0.65, '#ffbe84', 0]]);
  out.push(shape(body, C.base, [
    path(smooth([[x0, y - 70], [x1, y - 70], [x1, y - 30, 'c'], [x0, y - 30, 'c']]), C.shadow),
    path(smooth([[x0 + 20, y - 60], [x1 - 20, y - 60], [x1 - 20, y - 34, 'c'], [x0 + 20, y - 34, 'c']]), C.deep ?? C.shadow, { opacity: 0.4 }),
    refl[0] + rect(x0, y - 230, x1 - x0, 230, refl[1]),
    path(smooth([[x0 + 30, y - 124, 'c'], [x1 - 20, y - 124, 'c'], [x1 - 20, y - 119, 'c'], [x0 + 30, y - 119, 'c']]), C.light, { opacity: 0.85 }),
    path(smooth([[x0 + 30, y - 118, 'c'], [x1 - 20, y - 118, 'c'], [x1 - 20, y - 113, 'c'], [x0 + 30, y - 113, 'c']]), C.line, { opacity: 0.4 }),
    path(ellipse(x0 + 250, y - 207, 100, 6), '#ffd9a8', { opacity: 0.6 }),
    path(smooth([[x0 + 40, y - 100], [x0 + 140, y - 104], [x0 + 150, y - 98], [x0 + 40, y - 94]]), '#ffd9a8', { opacity: 0.45 }),
    path(ellipse(x0 + 118, y - 62, 44, 8), '#8a4a2a', { opacity: 0.45 }),
    path(ellipse(x1 - 120, y - 60, 40, 7), '#8a4a2a', { opacity: 0.4 }),
    path(ellipse(x0 + 70, y - 84, 14, 5), '#f0b090', { opacity: 0.35 }),
  ], C.line, 2));
  // Door shut lines, B-pillar, window frames with glass that still holds the evening sky.
  const SM = acc();
  SM.s(C.line, 1.8, `M${x0 + 140} ${y - 132}L${x0 + 136} ${y - 44}H${x0 + 392}L${x0 + 396} ${y - 134}M${x0 + 264} ${y - 134}L${x0 + 262} ${y - 44}M${x1 - 60} ${y - 118}Q${x1 - 20} ${y - 124} ${x1 - 8} ${y - 122}`, 0.85);
  out.push(SM.out());
  const wl = smooth([[x0 + 140, y - 134, 'c'], [x0 + 182, y - 198, 'c'], [x0 + 260, y - 200, 'c'], [x0 + 260, y - 134, 'c']]);
  const wr = smooth([[x0 + 272, y - 134, 'c'], [x0 + 272, y - 200, 'c'], [x0 + 322, y - 198, 'c'], [x0 + 378, y - 136, 'c']]);
  const glass = lin(0, y - 202, 0, y - 134, [[0, '#4a6a98'], [0.6, '#3a4a6e'], [1, '#2a3448']]);
  for (const [wd, xa] of [[wl, x0 + 150], [wr, x0 + 280]]) {
    out.push(shape(wd, '#2a3448', [
      glass[0] + rect(x0 + 100, y - 210, 300, 80, glass[1]),
      path(polyD([[xa + 20, y - 204], [xa + 46, y - 204], [xa + 16, y - 130], [xa - 10, y - 130]]), '#ffd9b0', { opacity: 0.2 }),
      path(polyD([[xa + 60, y - 204], [xa + 70, y - 204], [xa + 40, y - 130], [xa + 30, y - 130]]), '#ffd9b0', { opacity: 0.12 }),
      rect(x0 + 100, y - 150, 300, 20, '#f09a6a', { opacity: 0.16 }),
    ], '#14181e', 4));
  }
  out.push(rect(x0 + 258, y - 200, 14, 66, '#1a2030'));
  // Handles, mirror, fuel of the old days: chrome bits with their little shadows.
  const CH = acc();
  for (const hx of [x0 + 232, x0 + 338]) {
    CH.f(DK, rr(hx + 1, y - 109, 26, 7, 3), 0.35);
    CH.f('#d8dadc', rr(hx, y - 112, 26, 7, 3));
    CH.f('#ffffff', rd(hx + 3, y - 111, 18, 2), 0.8);
  }
  out.push(CH.out());
  out.push(stroke(`M${x0 + 386} ${y - 134}L${x0 + 380} ${y - 128}`, '#2a2e32', 3.4));
  out.push(shape(smooth([[x0 + 366, y - 144], [x0 + 384, y - 148], [x0 + 392, y - 138], [x0 + 372, y - 132]]), C.base, [path(smooth([[x0 + 368, y - 138], [x0 + 392, y - 138], [x0 + 372, y - 132]]), C.shadow), path(ellipse(x0 + 376, y - 144, 6, 2), C.light, { opacity: 0.8 })], C.line, 1.6));
  // Bumpers, lights and grille.
  out.push(shape(rr(x1 - 30, y - 80, 40, 36, 9), '#3e3e44', [rect(x1 - 30, y - 80, 40, 6, '#8a8a92', { opacity: 0.8 }), rect(x1 - 30, y - 52, 40, 8, '#16161a', { opacity: 0.6 })], '#16161a', 1.8));
  out.push(shape(rr(x0 - 10, y - 80, 40, 36, 9), '#3e3e44', [rect(x0 - 10, y - 80, 40, 6, '#8a8a92', { opacity: 0.8 }), rect(x0 - 10, y - 52, 40, 8, '#16161a', { opacity: 0.6 })], '#16161a', 1.8));
  out.push(rect(x1 - 22, y - 80, 14, 8, '#1a1418'), rect(x0 - 8, y - 28, 22, 6, '#4a4a4e', { rx: 3 }));
  out.push(shape(rr(x1 - 24, y - 106, 24, 26, 5), '#f2e8c8', [rect(x1 - 24, y - 90, 24, 10, '#c8bc98', { opacity: 0.7 })], '#7a7a70', 1.8));
  out.push(shape(rr(x0, y - 112, 17, 26, 4), '#a02020', [rect(x0, y - 112, 17, 6, '#e05a50', { opacity: 0.8 })], '#4a0e0e', 1.6));
  out.push(rect(x0 + 2, y - 96, 13, 5, '#e8e8dc', { opacity: 0.85, rx: 1.5 }));
  em.push(rect(x1 - 16, y - 102, 14, 18, '#fff2c0'));
  // Wheel arches and wheels: tyre, sidewall, hubcap with its rings and bolts.
  for (const wx of wheels) {
    out.push(path(arc(wx), '#120c14'), stroke(`M${wx - 48} ${y - 34}a48 48 0 0 1 96 0`, C.line, 3));
    out.push(circle(wx, y - 34, 40, '#1e1e22', { stroke: '#0e0e12', 'stroke-width': 2 }), circle(wx, y - 34, 33, '#2a2a30'));
    out.push(circle(wx, y - 34, 24, '#aeb3b8', { stroke: '#5a5f64', 'stroke-width': 2 }), circle(wx, y - 34, 16, '#8e949a', { stroke: '#6a7076', 'stroke-width': 1.6 }));
    const bolts = [0, 1, 2, 3, 4].map((i) => [wx + Math.cos(i * 1.2566 + 0.4) * 11, y - 34 + Math.sin(i * 1.2566 + 0.4) * 11]);
    const BL = acc();
    BL.dots('#3a3e44', 4.4, bolts);
    BL.dots('#4a4f54', 11, [[wx, y - 34]]);
    BL.s('#eef2f4', 3, `M${wx - 20} ${y - 40}a21 21 0 0 1 14 -12`, 0.75);
    BL.s('#555a60', 3, `M${wx - 32} ${y - 20}a34 34 0 0 0 54 12`, 0.5);
    out.push(BL.out());
  }
  return { body: out.join(''), emissive: em.join('') };
}

function farm() {
  const out = [fence(-200, PEN[0], 1), pen(), scale(), fence(BARN[1], W + 300, 2)];
  const b = barn();
  out.push(b.body, tap(), romero());
  const c = car();
  out.push(c.body);
  return { body: out.join(''), emissive: b.emissive + c.emissive };
}

// ---------------------------------------------------------------- ground and foreground

function ground() {
  const out = [];
  const kMax = P.f(1080) + 0.4;
  const quad = (X0, X1, k0, k1) => polyD([gp(X0, k0), gp(X1, k0), gp(X1, k1), gp(X0, k1)]);
  const gpoly = (pts) => polyD(pts.map(([X, k]) => gp(X, k)));
  const r = rng(77);
  // Packed earth, a touch dustier at the back, darker towards us.
  out.push(gpath(quad(-1600, W + 1600, 1, kMax), lin(0, G, 0, 1080, [[0, '#9a8460'], [0.4, '#8a7458'], [1, '#6e5a42']])));
  // Mottling: dark damp patches, pale dust and a few stains.
  const MT = acc();
  for (let i = 0; i < 56; i++) {
    const X = -800 + r() * (W + 1600);
    const k = 1.02 + r() * (kMax - 1.1);
    const s = 40 + r() * 90;
    const t = r();
    MT.f(t < 0.45 ? '#7a6448' : t < 0.8 ? '#a08a68' : '#5e4a34', smooth([gp(X - s, k), gp(X, k - 0.02), gp(X + s * 1.3, k), gp(X + 10, k + 0.025 + r() * 0.01)]), t < 0.8 ? 0.7 : 0.45);
  }
  out.push(MT.out());
  // The concrete slab in front of the barn and the scale: broken corners, joints, cracks, a worn lip.
  const SL0 = SCALE[0] - 40;
  const SL1 = BARN[1];
  const k1 = 1.2;
  const edge = [[SL0 + 14, 1], [SL1, 1]];
  for (let k = 1.03; k < k1; k += 0.05) edge.push([SL1 + (r() - 0.5) * 8, k]);
  const bot = [];
  for (let X = SL1; X > SL0; X -= 70) bot.push([X, k1 + (r() - 0.5) * 0.008]);
  const lefts = [];
  for (let k = k1; k > 1.02; k -= 0.04) lefts.push([SL0 + (r() - 0.3) * 26, k]);
  const slab = [...edge, ...bot, ...lefts];
  out.push(gpath(gpoly(slab), lin(0, G, 0, yOf(k1), [[0, '#a09888'], [0.5, '#aaa293'], [1, '#b4ac9d']])));
  const lip = [...bot, [SL0, k1]].map(([X, k]) => [X, k + 0.012]);
  out.push(path(gpoly([...bot, [SL0, k1], ...lip.reverse()]), '#7e776a'));
  out.push(path(gpoly([...bot, [SL0, k1], ...[...bot, [SL0, k1]].reverse().map(([X, k]) => [X, k - 0.004])]), '#d0c8b8', { opacity: 0.8 }));
  const SJ = acc();
  for (let X = SL0 + 330; X < SL1 - 100; X += 340) {
    SJ.s('#6a6358', 3.4, polyD([gp(X, 1), gp(X + 1, k1)]).replace(/Z$/, ''), 0.8);
    SJ.s('#d0c8b8', 2, polyD([gp(X + 5, 1), gp(X + 6, k1)]).replace(/Z$/, ''), 0.6);
  }
  SJ.s('#6a6358', 3.4, `M${f2(gp(SL0 + 30, 1.1)[0])} ${f2(yOf(1.1))}H${f2(gp(SL1, 1.1)[0])}`, 0.8);
  SJ.s('#d0c8b8', 2, `M${f2(gp(SL0 + 30, 1.1)[0])} ${f2(yOf(1.1) + 4)}H${f2(gp(SL1, 1.1)[0])}`, 0.55);
  for (let i = 0; i < 7; i++) {
    let X = SL0 + 60 + r() * (SL1 - SL0 - 120);
    let k = 1.02 + r() * 0.12;
    let d = `M${f2(gp(X, k)[0])} ${f2(yOf(k))}`;
    for (let j = 0; j < 5; j++) {
      X += (r() - 0.5) * 70;
      k += 0.012 + r() * 0.012;
      d += `L${f2(gp(X, k)[0])} ${f2(yOf(k))}`;
    }
    SJ.s('#5e574c', 2.4, d, 0.85);
  }
  out.push(SJ.out());
  // Oil and wet stains on the slab.
  const OS = acc();
  for (const [X, k, s] of [[2040, 1.1, 90], [1690, 1.14, 60], [2500, 1.07, 70]]) OS.f('#5e564c', smooth([gp(X - s, k), gp(X, k - 0.02), gp(X + s, k), gp(X, k + 0.03)]), 0.32);
  out.push(OS.out());
  // Ruts: two wheel tracks sweeping from the lower right into the car, with water in them.
  const RT = acc();
  const rutas = [
    [[2200, 1.95], [2600, 1.6], [2950, 1.34], [3220, 1.16], [3430, 1.07]],
    [[2330, 2.05], [2750, 1.68], [3100, 1.4], [3330, 1.22], [3570, 1.12]],
  ];
  for (const R of rutas) {
    const d = smooth(R.map(([X, k]) => gp(X, k)), false);
    RT.s('#c0aa84', 28, d, 0.28);
    RT.s('#4e3c28', 19, d, 0.55);
    RT.s('#3a2c1e', 7, d, 0.35);
  }
  out.push(RT.out());
  // Puddles that hold the sky of the sunset.
  const charco = (cx, ck, rx, rk, seed) => {
    const q = rng(seed);
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const f = 0.8 + q() * 0.4;
      pts.push(gp(cx + Math.cos(a) * rx * f, ck + Math.sin(a) * rk * f));
    }
    const ys = pts.map((p) => p[1]);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const xs = pts.map((p) => p[0]);
    const xm = (Math.min(...xs) + Math.max(...xs)) / 2;
    const wd = (Math.max(...xs) - Math.min(...xs)) / 2;
    out.push(path(smooth(pts), '#3e2e20', { opacity: 0.6, transform: `translate(${f2(xm)} ${f2((y0 + y1) / 2)}) scale(1.13 1.2) translate(${f2(-xm)} ${f2(-(y0 + y1) / 2)})` }));
    out.push(gpath(smooth(pts), lin(0, y0, 0, y1, [[0, '#ffd0a0'], [0.5, '#f0a8b0'], [1, '#9a88d0']]), { opacity: 0.95 }));
    out.push(path(ellipse(xm - wd * 0.35, y0 + (y1 - y0) * 0.3, wd * 0.5, (y1 - y0) * 0.1), '#ffe8c0', { opacity: 0.7 }), path(ellipse(xm + wd * 0.3, y0 + (y1 - y0) * 0.55, wd * 0.28, (y1 - y0) * 0.07), '#ffe8c0', { opacity: 0.45 }));
    out.push(stroke(smooth(pts), '#d8b890', 2, { opacity: 0.45 }));
  };
  charco(760, 1.17, 150, 0.06, 5);
  charco(2980, 1.31, 120, 0.04, 6);
  charco(2230, 1.5, 90, 0.05, 7);
  // Pebbles with a small shade to the right, dry tufts, scattered straw.
  const PB = acc();
  for (let i = 0; i < 80; i++) {
    const X = -400 + r() * (W + 800);
    const k = 1.01 + r() * (kMax - 1.05);
    const [x, y] = gp(X, k);
    const rx = (4 + r() * 6) * k;
    const t = r();
    PB.f(DK, el(x + 2.5 * k, y + 1.8 * k, rx, rx * 0.6), 0.28);
    PB.f(t < 0.4 ? '#b0a48e' : t < 0.75 ? '#9a8e78' : '#c4b8a2', el(x, y, rx, rx * 0.62));
    PB.f('#e8dcc4', el(x - rx * 0.25, y - rx * 0.2, rx * 0.5, rx * 0.22), 0.6);
  }
  out.push(PB.out());
  const TF = acc();
  const tuft = (X, k, s) => {
    const [x, y] = gp(X, k);
    for (let j = 0; j < 4; j++) {
      const h = (10 + r() * 14) * k * s;
      TF.s(['#8a9a5a', '#a8a468', '#6e7e4a'][j % 3], 3.4, `M${f2(x + (j - 1.5) * 5)} ${f2(y)}q${f2((j - 1.5) * 4 + (r() - 0.5) * 6)} ${f2(-h * 0.6)} ${f2((j - 1.5) * 7)} ${f2(-h)}`);
    }
  };
  for (let X = 40; X < W + 400; X += 90 + r() * 120) if (X < 1130 || X > 1560 || r() < 0.5) tuft(X, 1.0 + r() * 0.02, 0.8);
  for (let i = 0; i < 40; i++) tuft(-300 + r() * (W + 600), 1.1 + r() * (kMax - 1.2), 1.1);
  out.push(TF.out());
  const SW = acc();
  for (let i = 0; i < 170; i++) {
    const X = -400 + r() * (W + 800);
    const k = 1.01 + r() * (kMax - 1.05);
    const [x, y] = gp(X, k);
    SW.s(STRAW[i % 3], 2 * k, `M${f2(x)} ${f2(y)}l${f2((8 + r() * 12) * k * (r() < 0.5 ? -1 : 1))} ${f2(-r() * 4)}`);
  }
  out.push(SW.out());
  // Contact shade: soft, falling a little to the right of whatever stands on the ground.
  const pie = (a, b, op = 0.4, fondo = 0.05, dx = 16) => sombra(uOf((a + b) / 2 + dx, 1 + fondo / 3), yOf(1 + fondo / 3), (b - a) / 2 * P.f(yOf(1 + fondo / 3)) + 26, (yOf(1 + fondo) - yOf(1)) * 1.1, op);
  out.push(gpath(quad(-1600, W + 1600, 1, 1.07), lin(0, G, 0, yOf(1.07), [[0, DK, 0.34], [1, DK, 0]])));
  out.push(gpath(quad(SL1, SL1 + 300, 1, 1.12), lin(uOf(SL1, 1), 0, uOf(SL1 + 300, 1), 0, [[0, DK, 0.3], [1, DK, 0]])));
  out.push(gpath(quad(SL0, SL1, k1, k1 + 0.07), lin(0, yOf(k1), 0, yOf(k1 + 0.07), [[0, DK, 0.3], [1, DK, 0]])));
  out.push(pie(PEN[0], PEN[1], 0.4, 0.06), pie(SCALE[0], SCALE[0] + 250, 0.45, 0.06), pie(TAP - 40, TAP + 40, 0.45, 0.05, 22), pie(TAP - 160, TAP - 80, 0.5, 0.05, 20), pie(ROMERO - 100, ROMERO + 100, 0.4, 0.07, 20));
  out.push(pie(CAR[0] + 10, CAR[1] - 10, 0.55, 0.1, 30), pie(CAR[0] + 60, CAR[1] - 60, 0.4, 0.05, 20));
  out.push(pie(DOOR_X[0], DOOR_X[1], 0.35, 0.04, 14));
  for (let x = BARN[1]; x < W + 300; x += 220) out.push(pie(x - 6, x + 6, 0.3, 0.025, 10));
  for (let x = PEN[0]; x <= PEN[1]; x += 250) out.push(pie(x - 8, x + 8, 0.3, 0.025, 10));
  return out.join('');
}

const DOOR_X = [BARN[0] + 360, BARN[0] + 660];

function foreground() {
  const yF = yOf(KF);
  const at = (Xb) => uOf(Xb, KF);
  // Straw bales on the left, a fence post with barbed wire on the right.
  const b0 = at(-150);
  const bales = [
    sombra(b0 + 160, yF - 2, 170, 22, 0.45),
    paca(b0, yF - 170, 300, 170, 41, mat('#d8b860', '#b89a40', '#ecd080', '#6a5418'), 70),
    paca(b0 + 40, yF - 335, 280, 166, 42, mat('#dcbc64', '#b89a40', '#f0d68a', '#6a5418'), 64),
  ];
  const p0 = at(3600);
  const r = rng(51);
  const PO = acc();
  poste(PO, p0 + 17, yF, 520, 36, r, WOODD);
  for (const [dy, sag] of [[300, 26], [250, 34]]) {
    const xa = p0 - 400;
    const d = `M${f2(p0 + 17)} ${f2(yF - dy)}Q${f2((xa + p0) / 2)} ${f2(yF - dy + sag * 2)} ${f2(xa)} ${f2(yF - dy + 8)}`;
    PO.s('#2e3236', 4.4, d, 0.4);
    PO.s('#8a9096', 2.8, d);
    for (let i = 1; i < 9; i++) {
      const t = i / 9;
      const bx = p0 + 17 + (xa - p0 - 17) * t;
      const by = yF - dy + (sag * 2 * 2 * t * (1 - t)) + 8 * t * t;
      PO.s('#6a7076', 2.6, `M${f2(bx - 5)} ${f2(by - 5)}l10 10M${f2(bx + 5)} ${f2(by - 5)}l-10 10`, 0.9);
    }
  }
  PO.dots('#1a1c1e', 7, [[p0 + 17, yF - 300], [p0 + 17, yF - 250], [p0 + 17, yF - 420]]);
  PO.dots('#9aa0a6', 2.4, [[p0 + 15, yF - 302], [p0 + 15, yF - 252]], 0.8);
  // Dry thistles and tall grass at the foot of the post.
  const BU = acc();
  for (let i = 0; i < 34; i++) {
    const bx = p0 - 100 + r() * 190;
    const h = 40 + r() * 110 * (1 - Math.abs(bx - p0 + 10) / 200);
    BU.s(['#3a4a2e', '#4a5a38', '#7a7a48', '#9a8a54'][i % 4], 4.4, `M${f2(bx)} ${f2(yF)}q${f2((r() - 0.5) * 40)} ${f2(-h * 0.55)} ${f2((r() - 0.5) * 60)} ${f2(-h)}`);
  }
  BU.dots('#c8b8e0', 9, [[p0 - 40, yF - 128], [p0 + 40, yF - 100], [p0 - 74, yF - 92], [p0 + 70, yF - 136]], 0.9);
  const post = [sombra(p0, yF - 2, 60, 16, 0.4), PO.out(), BU.out()].join('');
  return [
    { x0: Math.floor(b0 - 40), x1: Math.ceil(b0 + 360), y0: Math.floor(yF - 360), y1: 1080, body: bales.join('') },
    { x0: Math.floor(p0 - 420), x1: Math.ceil(p0 + 60), y0: Math.floor(yF - 540), y1: 1080, body: post },
  ];
}

export function escena() {
  const sk = uRange(0.02);
  const sl = uRange(KS);
  const cp = uRange(KC);
  const gr = uRange(P.f(1080));
  const madrid = skyline();
  const f = farm();
  const total = PIARA.reduce((t, p) => t + p.kg, 0);
  return {
    id: 'granja',
    name: 'La granja',
    W,
    H: 1080,
    HOR: P.HOR,
    BASE: P.BASE,
    CX: P.CX,
    M,
    // Key light for relief: the sunset, low on the left.
    clave: [-0.8, -0.2, 0.55],
    ambient: '#6a5a80',
    walk: { y0: 850, y1: 950, x0: 160, x1: 3640 },
    start: { X: 1000, y: 890 },
    layers: [
      { id: 'cielo', k: 0.02, x0: sk[0], x1: sk[1], y0: -60, y1: 500, body: sky(), lit: false },
      { id: 'skyline', k: KS, x0: sl[0], x1: sl[1], y0: 100, y1: yOf(KS) + 10, body: madrid.body, lit: false },
      { id: 'campos', k: KC, x0: cp[0], x1: cp[1], y0: yOf(KC) - 90, y1: 900, body: fields(), lit: true, ambient: '#8a6a7a', lights: false, textura: 0.25 },
      {
        id: 'granja', k: 1, lit: true, textura: 0.35,
        pieces: [
          { x0: -260, x1: W + 320, y0: -60, y1: G + 6, body: f.body, emissive: f.emissive },
          { x0: SCALE[1] - 100, x1: SCALE[1], y0: G - 1.75 * M, y1: G - 1.75 * M + 50, body: '<g/>', emissive: scaleDisplay(0), si: 'basculaLista' },
          { x0: SCALE[1] - 100, x1: SCALE[1], y0: G - 1.75 * M, y1: G - 1.75 * M + 50, body: '<g/>', emissive: scaleDisplay(total), si: 'g.pesados' },
        ],
        glows: [
          { x: BARN[0] + 140 + 248, y: 132, r: 140, color: '#ffd890', a: 0.5 },
          { x: BARN[0] + 880, y: 520, r: 160, color: '#ffbf70', a: 0.35 },
          { x: CAR[1] - 8, y: G - 93, r: 60, color: '#fff2c0', a: 0.4 },
        ],
      },
      { id: 'suelo', floor: true, x0: gr[0], x1: gr[1], y0: 800, y1: 1080, body: ground(), lit: true, textura: 0.4 },
      { id: 'frente', k: KF, z: 'front', lit: true, textura: 0.3, pieces: foreground() },
    ],
    lights: [
      { X: BARN[0] + 388, y: 130, r: 900, color: '#ffc27a', power: 0.75, fy: 870 },
      { X: BARN[0] + 380, y: 600, r: 700, color: '#ffa850', power: 0.55, fy: 860 },
      { X: BARN[0] + 880, y: 520, r: 520, color: '#ffbf70', power: 0.4 },
      { X: -200, y: 300, r: 2200, color: '#ff9a6a', power: 0.45, fy: 900, flat: 0.4 },
      { X: 3200, y: 200, r: 1600, color: '#9a8ad8', power: 0.3, fy: 900, flat: 0.4 },
    ],
    spots: {
      radio: { x: BARN[0] + 880, y: 540 },
      // The barn hides the skyline: the live layer must not draw over it.
      nave: { x0: BARN[0] - 14, x1: BARN[1] + 14 },
      // Red aviation lights on the towers (blink in the live layer, src/motor/vivo.ts).
      ...Object.fromEntries(madrid.luces.map(([x, y], i) => [`baliza${i}`, { x, y, k: KS }])),
    },
    zonas: {
      corral: { u: 620, k: 1, w: 1000, top: G - 1.3 * M, bottom: G, X: 620, y: 880 },
      // Guille stands beside the scale, not in front of it, so it can still be tapped.
      bascula: { u: (SCALE[0] + SCALE[1]) / 2, k: 1, w: SCALE[1] - SCALE[0], top: G - 1.9 * M, bottom: G, X: SCALE[0] - 90, y: 880 },
      puertaNave: { u: BARN[0] + 380, k: 1, w: 480, top: 150, bottom: G, X: BARN[0] + 380, y: 870 },
      radio: { u: BARN[0] + 880, k: 1, w: 240, top: 430, bottom: 640, X: BARN[0] + 880, y: 866 },
      botiquin: { u: BARN[0] + 1080, k: 1, w: 120, top: 460, bottom: 560, X: BARN[0] + 1080, y: 866 },
      manguera: { u: TAP + 50, k: 1, w: 260, top: G - 1.3 * M, bottom: G, X: TAP + 60, y: 870 },
      romero: { u: ROMERO, k: 1, w: 240, top: G - 170, bottom: G, X: ROMERO, y: 870 },
      coche: { u: (CAR[0] + CAR[1]) / 2, k: 1, w: CAR[1] - CAR[0], top: G - 220, bottom: G, X: CAR[0] - 40, y: 880 },
      madrid: { u: uOf(1450, KS), k: KS, w: 220, top: yOf(KS) - 280, bottom: yOf(KS), X: 1500, y: 860 },
    },
  };
}
