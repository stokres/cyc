// Guille's farm, on the outskirts of Madrid, at dusk. The yard: the pig pen on
// the left, the livestock scale, the white barn with the radio in its window and
// the first-aid kit by the door, the tap with the hose, a rosemary bush and his
// car, which is the way out. Over the low fences, dry fields and the Madrid
// skyline against the last of the sunset (Cuatro Torres, KIO, Torrespaña...).
//
// Layers, back to front:
//   cielo     (0.02)  sunset gradient
//   skyline   (0.06)  Madrid, lit windows (unlit layer, it is far away)
//   campos    (0.22)  rolling dry fields, olive trees, a line of poplars
//   granja    (1)     pen, scale, barn, tap, rosemary, car
//   suelo     (rows)  packed earth, straw, tyre tracks
//   [characters]
//   frente    (1.45)  straw bales and a fence post at the edges
import {
  smooth, ellipse, path, stroke, g, shape, rect, circle, line, poly, polyD, rectD, rr, lin, rad, gpath,
  mat, box, bevel, bricks, foliage, persp, rng,
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
  // Far hills, then the fields in stripes of dry wheat, stubble and ploughed earth.
  out.push(path(smooth([[x0, base - 30], [x0 + 600, base - 52], [x0 + 1500, base - 34], [x0 + 2300, base - 58], [x1, base - 36], [x1, base + 120, 'c'], [x0, base + 120, 'c']]), '#6a5a6a'));
  const tones = ['#b89a6a', '#9c7c56', '#c8a874', '#8a6c50'];
  // Stripes get taller as they come closer, down past the yard's fences.
  let y = base - 30;
  for (let i = 0; y < 860; i++) {
    const h = 22 + i * i * 4;
    out.push(path(smooth([[x0, y], [x0 + 900, y - 6 + (i % 2) * 8], [x0 + 1900, y + 4], [x1, y - 4], [x1, y + h + 30, 'c'], [x0, y + h + 30, 'c']]), tones[i % 4]));
    y += h;
  }
  const r = rng(21);
  // A line of poplars and some olive trees.
  for (let x = x0 + 300; x < x0 + 1300; x += 26 + r() * 10) out.push(path(ellipse(x, base - 46, 7, 26), r() < 0.5 ? '#4a5a3a' : '#56664a'));
  for (let i = 0; i < 22; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = base - 4 + r() * 70;
    out.push(rect(x - 1.5, y - 6, 3, 8, '#4a3a2a'), foliage(x, y - 12, 14, 9, ['#5a6a46', '#667652', '#728260', '#4e5e3e'], i + 3, { n: 6 }));
  }
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
  const out = [];
  const h = 1.2 * M;
  for (let x = x0; x <= x1; x += 220) out.push(box(x - 6, G - h - 10, 12, h + 10, WOODD, { r: 2 }));
  for (const k of [0.25, 0.55, 0.85]) out.push(line(x0, G - h * k, x1, G - h * k, '#7a7f84', 1.6));
  const r = rng(seed);
  for (let x = x0 + 20; x < x1; x += 40 + r() * 60) out.push(stroke(`M${x} ${G}q${-6 + r() * 12} ${-20 - r() * 30} ${-4 + r() * 8} ${-40 - r() * 40}`, '#8a9a5a', 3));
  return out.join('');
}

function pen() {
  const [x0, x1] = PEN;
  const out = [];
  // Back wall of the pen (low brick) and the pigs, then the rails in front of them.
  out.push(bricks(x0, G - 0.9 * M, x1 - x0, 0.9 * M, ['#a8644c', '#985a44', '#b8745a'], '#c4ad96', { bw: 34, bh: 12, seed: 4 }));
  out.push(rect(x0 - 10, G - 0.9 * M - 12, x1 - x0 + 20, 14, '#cfc0a8'));
  // Straw on the floor of the pen.
  const r = rng(8);
  for (let i = 0; i < 70; i++) {
    const x = x0 + r() * (x1 - x0);
    out.push(line(x, G - 4 - r() * 10, x + 10 - r() * 20, G - 10 - r() * 20, STRAW[i % 3], 2.4));
  }
  // The pigs (two metres of art scale: a pig is ~1.3 m long).
  const s = 1.9;
  for (const [x, y, sc, f, sem] of [[300, G - 30, 0.95, 1, 2], [560, G - 26, 1.05, -1, 7], [760, G - 34, 0.9, 1, 11], [950, G - 28, 1.0, -1, 3]]) {
    out.push(g(null, cerdo({ s: s * sc, semilla: sem, manchas: sem % 3 }), { transform: `translate(${x} ${y}) scale(${f} 1)` }));
  }
  // Rails.
  out.push(box(x0, G - 1.15 * M, x1 - x0, 14, WOOD, { r: 3 }), box(x0, G - 0.62 * M, x1 - x0, 14, WOOD, { r: 3 }));
  for (let x = x0; x <= x1; x += 250) out.push(box(x - 9, G - 1.25 * M, 18, 1.25 * M, WOODD, { r: 3 }));
  return out.join('');
}

function scale() {
  const [x0, x1] = SCALE;
  const out = [];
  // Weighing cage: galvanised rails on a steel platform.
  out.push(box(x0, G - 30, x1 - x0 - 90, 30, STEEL, { r: 3 }));
  for (const y of [G - 1.05 * M, G - 0.6 * M]) out.push(rect(x0, y, x1 - x0 - 90, 8, GALV.base), rect(x0, y, x1 - x0 - 90, 2, GALV.light));
  for (let x = x0; x <= x1 - 90; x += 62) out.push(rect(x - 4, G - 1.1 * M, 8, 1.1 * M - 30, GALV.shadow));
  // The display on its post.
  const dx = x1 - 50;
  out.push(box(dx - 8, G - 1.35 * M, 16, 1.35 * M, STEEL), box(dx - 52, G - 1.75 * M, 104, 70, mat('#e8c23a', '#c9a01a', '#f8dc6a', '#6a520a'), { r: 8 }));
  out.push(path(rr(dx - 40, G - 1.75 * M + 12, 80, 30, 4), '#1c2024'));
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

function barn() {
  const [x0, x1] = BARN;
  const out = [];
  const em = [];
  // White plastered walls with a stone plinth; the roof edge is out of frame.
  out.push(rect(x0, -60, x1 - x0, G + 60, WHITE.base));
  out.push(gpath(rectD(x0, -60, x1 - x0, G + 60), lin(0, -60, 0, 500, [[0, '#4a3a50', 0.35], [1, '#4a3a50', 0]])));
  out.push(rect(x0, G - 0.5 * M, x1 - x0, 0.5 * M, '#b0a492'), rect(x0, G - 0.5 * M, x1 - x0, 5, '#cfc4b2'));
  const r = rng(30);
  for (let i = 0; i < 14; i++) out.push(path(ellipse(x0 + 40 + r() * (x1 - x0 - 80), 80 + r() * 560, 30 + r() * 60, 10 + r() * 20), WHITE.shadow, { opacity: 0.35 }));
  out.push(rect(x0 - 14, -60, 18, G + 60, WHITE.shadow), rect(x1 - 4, -60, 18, G + 60, WHITE.shadow));
  // Big sliding door, half open: warm light and straw inside.
  const d0 = x0 + 140;
  const d1 = x0 + 620;
  // Inside: dim warm light, beams and stacked bales on the floor.
  out.push(rect(d0, 150, d1 - d0, G - 150, '#2e2018'));
  em.push(gpath(rectD(d0 + 10, 160, 210, G - 160), lin(0, 160, 0, G, [[0, '#6a3e1a', 0.5], [1, '#d88a40', 0.7]])));
  for (const y of [260, 420]) out.push(rect(d0 + 10, y, 210, 14, '#4a3020'));
  const bale = (x, y) => box(x, y - 64, 96, 64, mat('#c9a448', '#a8862e', '#e0c06a', '#6a5418'), { r: 6 });
  out.push(bale(d0 + 20, G), bale(d0 + 120, G), bale(d0 + 70, G - 64));
  out.push(rect(d0 - 20, 130, d1 - d0 + 40, 22, '#6a6f72'));
  // The sliding half: dark red planks with a Z brace.
  const DOOR = mat('#7a3a2a', '#5e2a1e', '#94503a', '#2e120a');
  out.push(bevel(d0 + 220, 152, 300, G - 152, DOOR, { inset: 18 }));
  for (let x = d0 + 260; x < d0 + 500; x += 40) out.push(line(x, 172, x, G - 20, DOOR.shadow, 2));
  out.push(line(d0 + 240, 180, d0 + 500, 180, DOOR.light, 10), line(d0 + 240, G - 40, d0 + 500, G - 40, DOOR.light, 10), line(d0 + 240, G - 40, d0 + 500, 180, DOOR.light, 10));
  // Lamp over the door.
  out.push(rect(d0 + 228, 96, 40, 12, '#3a3a3a'), path(smooth([[d0 + 218, 108], [d0 + 278, 108], [d0 + 266, 128, 'c'], [d0 + 230, 128, 'c']]), '#4a4a4a'));
  em.push(path(ellipse(d0 + 248, 126, 18, 6), '#ffd890'));
  // Window with the radio on the sill.
  const wx = x0 + 760;
  out.push(rect(wx, 420, 240, 200, '#c9bfae'), rect(wx + 14, 434, 212, 172, '#2a2030'));
  em.push(gpath(rectD(wx + 14, 434, 212, 172), lin(0, 434, 0, 606, [[0, '#ffcf86', 0.55], [1, '#ffa860', 0.75]])));
  out.push(rect(wx + 116, 434, 8, 172, '#c9bfae'), rect(wx - 10, 618, 260, 16, '#b0a492'));
  // The radio: an old portable, red.
  const rx = wx + 120;
  out.push(box(rx - 62, 556, 124, 62, RED, { r: 10 }), path(rr(rx - 50, 568, 54, 38, 6), '#3a2a28'));
  for (let i = 0; i < 5; i++) out.push(line(rx - 46, 574 + i * 7, rx, 574 + i * 7, '#6a4a44', 2));
  out.push(path(rr(rx + 12, 568, 40, 16, 4), '#e8dcc0'), circle(rx + 22, 598, 7, '#2a2a2a'), circle(rx + 42, 598, 7, '#2a2a2a'));
  out.push(stroke(`M${rx + 40} 556L${rx + 70} 470`, '#9a9fa4', 2.4), stroke(`M${rx - 50} 556q0 -26 50 -26q50 0 50 26`, '#5a2018', 5));
  // First-aid kit: a green box with the white cross.
  const bx = x0 + 1080;
  out.push(box(bx - 50, 470, 100, 82, GREEN, { r: 8 }), rect(bx - 9, 482, 18, 58, '#f4f4ee'), rect(bx - 29, 502, 58, 18, '#f4f4ee'));
  return { body: out.join(''), emissive: em.join('') };
}

function tap() {
  const out = [];
  // A tap on a short brick post, the green hose coiled on a hook beside it.
  out.push(bricks(TAP - 40, G - 1.0 * M, 80, 1.0 * M, ['#a8644c', '#985a44', '#b8745a'], '#c4ad96', { bw: 26, bh: 10, seed: 9 }));
  out.push(rect(TAP - 46, G - 1.0 * M - 10, 92, 12, '#cfc0a8'));
  out.push(path(rr(TAP - 6, G - 0.8 * M, 34, 16, 6), STEEL.base), circle(TAP + 6, G - 0.8 * M - 10, 10, RED.base), rect(TAP + 22, G - 0.8 * M + 4, 10, 18, STEEL.shadow));
  const hx = TAP + 110;
  for (let i = 0; i < 4; i++) out.push(stroke(`M${hx} ${G - 0.95 * M}m-${44 - i * 3} 0a${44 - i * 3} ${30 - i * 2} 0 1 0 ${88 - i * 6} 0a${44 - i * 3} ${30 - i * 2} 0 1 0 -${88 - i * 6} 0`, i % 2 ? '#2f8a4e' : '#3fa060', 7));
  out.push(stroke(`M${hx - 30} ${G - 0.8 * M}q-20 120 -110 ${0.8 * M - 4}`, '#3fa060', 7));
  out.push(box(hx - 6, G - 1.25 * M, 12, 1.25 * M, WOODD));
  // A bucket.
  out.push(path(smooth([[TAP - 150, G - 70], [TAP - 90, G - 70], [TAP - 96, G, 'c'], [TAP - 144, G, 'c']]), GALV.base), path(ellipse(TAP - 120, G - 70, 30, 7), GALV.shadow));
  return out.join('');
}

function romero() {
  const out = [];
  const r = rng(40);
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI * (0.1 + r() * 0.8);
    const L = 60 + r() * 90;
    const x = ROMERO - 60 + r() * 120;
    out.push(stroke(`M${x} ${G}q${Math.cos(a) * L * 0.4} ${Math.sin(a) * L * 0.6} ${Math.cos(a) * L} ${Math.sin(a) * L}`, ['#4a6a4a', '#5a7a56', '#3e5c40'][i % 3], 4.2));
  }
  for (let i = 0; i < 40; i++) out.push(circle(ROMERO - 110 + r() * 220, G - 40 - r() * 110, 3 + r() * 2, r() < 0.5 ? '#9a8ad8' : '#b4a6ec'));
  return out.join('');
}

function car() {
  const [x0, x1] = CAR;
  const out = [];
  const em = [];
  const y = G;
  const C = mat('#c8433a', '#9a2e28', '#e06a5c', '#5e1814');
  // An old three-door hatchback, nose to the right.
  out.push(path(ellipse((x0 + x1) / 2, y - 6, (x1 - x0) / 2, 12), '#1a1414', { opacity: 0.35 }));
  out.push(shape(smooth([[x0 + 10, y - 50], [x0 + 20, y - 120, 'c'], [x0 + 120, y - 130, 'c'], [x0 + 170, y - 210, 'c'], [x0 + 330, y - 214, 'c'], [x0 + 400, y - 136, 'c'], [x1 - 10, y - 124, 'c'], [x1, y - 60, 'c'], [x1 - 6, y - 30, 'c'], [x0 + 6, y - 30, 'c']]), C.base, [path(smooth([[x0, y - 70], [x1, y - 70], [x1, y - 30, 'c'], [x0, y - 30, 'c']]), C.shadow), path(smooth([[x0 + 140, y - 140], [x0 + 400, y - 140], [x0 + 400, y - 130, 'c'], [x0 + 140, y - 130, 'c']]), C.light, { opacity: 0.7 })], C.line, 2));
  out.push(path(smooth([[x0 + 140, y - 134, 'c'], [x0 + 182, y - 198, 'c'], [x0 + 260, y - 200, 'c'], [x0 + 260, y - 134, 'c']]), '#2a3448'), path(smooth([[x0 + 272, y - 134, 'c'], [x0 + 272, y - 200, 'c'], [x0 + 322, y - 198, 'c'], [x0 + 378, y - 136, 'c']]), '#2a3448'));
  out.push(stroke(`M${x0 + 262} ${y - 130}L${x0 + 262} ${y - 40}`, C.line, 2), rect(x0 + 230, y - 112, 26, 7, '#d8d8d8'));
  for (const wx of [x0 + 110, x1 - 110]) out.push(circle(wx, y - 34, 40, '#1e1e22'), circle(wx, y - 34, 22, '#9a9fa4'), circle(wx, y - 34, 8, '#5a5f64'));
  out.push(rect(x1 - 18, y - 104, 18, 22, '#f2e8c8'), rect(x0 + 2, y - 108, 14, 20, '#a02020'));
  em.push(rect(x1 - 16, y - 102, 14, 18, '#fff2c0'));
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
  out.push(path(quad(-1600, W + 1600, 1, kMax), '#8a7458'));
  // Concrete pad in front of the barn and the scale.
  out.push(path(quad(SCALE[0] - 40, BARN[1], 1, 1.2), '#a49c8e'), path(quad(SCALE[0] - 40, BARN[1], 1.19, 1.205), '#7e776a'));
  const r = rng(77);
  // Patches of darker earth, tyre tracks towards the car, scattered straw.
  for (let i = 0; i < 40; i++) {
    const X = -800 + r() * (W + 1600);
    const k = 1.02 + r() * (kMax - 1.1);
    out.push(path(smooth([gp(X - 60, k), gp(X, k - 0.02), gp(X + 80, k), gp(X + 10, k + 0.025)]), r() < 0.5 ? '#7a6448' : '#968064', { opacity: 0.8 }));
  }
  for (const dk of [1.26, 1.38]) out.push(path(quad(BARN[1] - 200, W + 1600, dk, dk + 0.03), '#6e5a40', { opacity: 0.7 }));
  for (let i = 0; i < 160; i++) {
    const X = -400 + r() * (W + 800);
    const k = 1.01 + r() * (kMax - 1.05);
    const [x, y] = gp(X, k);
    out.push(line(x, y, x + (8 + r() * 12) * k * (r() < 0.5 ? -1 : 1), y - r() * 4, STRAW[i % 3], 2 * k));
  }
  return out.join('');
}

function foreground() {
  const yF = yOf(KF);
  const at = (Xb) => uOf(Xb, KF);
  const out = [];
  // Straw bales on the left, a fence post and a feeding trough on the right.
  const bale = (u, w, h, y) => [box(u, y - h, w, h, mat('#d8b860', '#b89a40', '#ecd080', '#6a5418'), { r: 14 }), ...[0.3, 0.7].map((k) => rect(u + w * k - 3, y - h, 6, h, '#8a6a20', { opacity: 0.8 }))].join('');
  const b0 = at(-150);
  out.push(bale(b0, 300, 170, yF), bale(b0 + 40, 280, 160, yF - 165));
  const p0 = at(3600);
  out.push(box(p0, yF - 520, 34, 520, WOODD, { r: 4 }), line(p0 - 400, yF - 300, p0 + 34, yF - 330, '#7a7f84', 2));
  return [
    { x0: Math.floor(b0 - 40), x1: Math.ceil(b0 + 360), y0: Math.floor(yF - 360), y1: 1080, body: out.slice(0, 2).join('') },
    { x0: Math.floor(p0 - 420), x1: Math.ceil(p0 + 60), y0: Math.floor(yF - 540), y1: 1080, body: out.slice(2).join('') },
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
      { id: 'campos', k: KC, x0: cp[0], x1: cp[1], y0: yOf(KC) - 90, y1: 900, body: fields(), lit: true, ambient: '#8a6a7a', lights: false },
      {
        id: 'granja', k: 1, lit: true,
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
      { id: 'suelo', floor: true, x0: gr[0], x1: gr[1], y0: 800, y1: 1080, body: ground(), lit: true },
      { id: 'frente', k: KF, z: 'front', lit: true, pieces: foreground() },
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
