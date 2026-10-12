// Pablo's story: the backstage of the Joso theatre (a parody of the one where
// the group does impro), at night, dark. Black brick, pipes and cables, a
// black velvet drape, and the things that pile up behind a stage, with nods to
// the group's impro company: three cushion clouds, airline captain jackets and
// caps, turquoise neck scarves and white suitcases.
//
// Left to right: the stage door (the way out, under the green SALIDA sign) and
// the Joso poster with its elephant; the costume rack; a mannequin in uniform;
// the props trunk and the suitcases; Pablo's desk with the typewriter and the
// lamp; the lighting board and a ladder; the follow spot; the pale projection screen
// with the cushion clouds in front of it and old flats leaning on the wall.
// When the follow spot is on, its light and Pablo's shadow, huge, land on the
// projection screen: that is drawn live (src/capitulos/pablo.ts).
//
// Layers, back to front:
//   fondo   (1)     the back wall and everything against it
//   suelo   (rows)  black stage floor with spike tape marks
//   [characters]
//   frente  (1.45)  a flight case and a coil of cable at the edges
import { smooth, ellipse, path, stroke, g, shape, rect, circle, line, poly, polyD, rectD, rr, lin, rad, gpath, mat, box, bevel, bricks, persp, rng, ao, sombra } from './kit.mjs';

export const P = persp({ HOR: 380, BASE: 820, CX: 1170 });
export const W = 3800;
export const M = 210;
const { gp, yOf, uOf } = P;
const G = P.BASE;
const KF = 1.45;

const WOOD = mat('#6e5034', '#523a24', '#8a6646', '#2e1e10');
const DARK = mat('#34323a', '#26242c', '#4a4852', '#141218');
const STEEL = mat('#a9aeb4', '#868b92', '#c8ccd0', '#4c5158');
const NAVY = mat('#22304e', '#18223a', '#34466c', '#0c1222');
const GOLD = '#d8b25a';
const TURQ = mat('#3fc0b8', '#2a9890', '#7ae0d8', '#16605a');
const WHITE = mat('#ece8e2', '#c8c2b8', '#faf8f4', '#7e786e');
const JOSO = '#e8452e'; // the theatre's red
const BRASS_T = '#a8843c'; // trunk corners

// Layout along the back wall.
const DOOR = [150, 470];
const RACK = [880, 1260];
const MANIQUI = 1390;
const BAUL = [1520, 1780];
const MALETAS = [1810, 1980];
const DESK = [2040, 2440];
const CUADRO = [2620, 2810];
const CANON = 2920;
const CICLO = [3080, 3720];

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

// ---------------------------------------------------------------- the back wall

function wall() {
  const out = [];
  // Black-painted brick, a little lighter near the floor where the work lights reach.
  out.push(bricks(-200, -60, W + 400, G + 60, ['#322f3b', '#3b3846', '#292630'], '#15131a', { bw: 46, bh: 16, seed: 3 }));
  out.push(gpath(rectD(-200, -60, W + 400, G + 60), lin(0, -60, 0, G, [[0, '#000000', 0.55], [0.7, '#000000', 0.15], [1, '#000000', 0]])));
  out.push(ao(-200, -60, W + 400, 190, 0.45));
  // Pipes and cable runs.
  out.push(ao(-200, 74, W + 400, 56, 0.5));
  out.push(rect(-200, 60, W + 400, 14, '#4a4852'), rect(-200, 60, W + 400, 3, '#6a6872'), rect(-200, 70, W + 400, 4, '#2a2830'));
  for (const x of [520, 1720, 2620, 3380]) out.push(rect(x + 10, 74, 8, G - 74, '#000', { opacity: 0.22 }), rect(x, 74, 10, G - 74, '#3c3a44'), rect(x, 74, 3.5, G - 74, '#5a5864'));
  out.push(stroke(`M-200 110Q600 140 1400 112T3800 120`, '#141218', 5), stroke(`M-200 128Q900 160 2000 126T3800 140`, '#1a1820', 4));
  // A black velvet drape hanging on the left of the projection screen.
  const d0 = CICLO[0] - 150;
  out.push(path(smooth([[d0, 40], [d0 + 150, 40], [d0 + 160, G, 'c'], [d0 - 10, G, 'c']]), '#141018'));
  for (let x = d0 + 14; x < d0 + 150; x += 26) out.push(stroke(`M${x} 46Q${x + 6} ${G / 2} ${x + 2} ${G - 4}`, '#221a26', 6));
  return out.join('');
}

function stageDoor() {
  const [x0, x1] = DOOR;
  const out = [];
  const em = [];
  const tx = [];
  // Steel door in a red frame, push bar, the green SALIDA sign above.
  out.push(rect(x0 - 20, 180, x1 - x0 + 40, G - 180, JOSO), rect(x0, 200, x1 - x0, G - 200, '#3a3c44'));
  out.push(bevel(x0 + 14, 214, x1 - x0 - 28, G - 220, mat('#4a4c56', '#383a42', '#5c5e68', '#1e2026'), { inset: 18 }));
  out.push(box(x0 + 30, 470, x1 - x0 - 60, 22, STEEL, { r: 6 }));
  out.push(path(rr((x0 + x1) / 2 - 90, 120, 180, 50, 6), '#14361e'));
  em.push(path(rr((x0 + x1) / 2 - 84, 125, 168, 40, 4), '#3ad06a', { opacity: 0.9 }));
  tx.push({ x: (x0 + x1) / 2, y: 145, s: 'SALIDA', size: 30, font: 'body', weight: 800, color: '#eafff0', emissive: true, spacing: 3 });
  // A bare work bulb in a cage.
  out.push(stroke(`M${x1 + 70} 74L${x1 + 70} 230`, '#141218', 3), path(rr(x1 + 56, 228, 28, 14, 3), '#2a2830'));
  em.push(circle(x1 + 70, 256, 14, '#ffe2a0'));
  out.push(stroke(`M${x1 + 56} 246Q${x1 + 70} 290 ${x1 + 84} 246`, '#2a2830', 2));
  return { body: out.join(''), emissive: em.join(''), texts: tx };
}

/** The Joso poster: dark panel, red frame, the name and an elephant in red line art. */
function poster() {
  const x = DOOR[1] + 140;
  const y = 300;
  const w = 220;
  const h = 300;
  const out = [rect(x, y + 4, w + 24, h + 24, '#000', { opacity: 0.22 }), rect(x - 8, y - 8, w + 16, h + 16, JOSO), rect(x - 8, y - 8, w + 16, 4, '#ff7a5a'), rect(x - 8, y + h + 4, w + 16, 4, '#a42a1a'), rect(x, y, w, h, '#2c2a30'), rect(x, y, w, 10, '#0e0c12', { opacity: 0.5 })];
  // The elephant, in the same red line style as the owl it replaces: big ears,
  // round head, two eyes, a curling trunk and little feet.
  const cx = x + w / 2;
  const cy = y + 200;
  const fondo = '#2c2a30';
  out.push(
    circle(cx - 46, cy - 12, 32, fondo, { stroke: JOSO, 'stroke-width': 5 }),
    circle(cx + 46, cy - 12, 32, fondo, { stroke: JOSO, 'stroke-width': 5 }),
    circle(cx, cy - 14, 38, fondo, { stroke: JOSO, 'stroke-width': 5 }),
    circle(cx - 14, cy - 24, 7, 'none', { stroke: JOSO, 'stroke-width': 4 }),
    circle(cx + 14, cy - 24, 7, 'none', { stroke: JOSO, 'stroke-width': 4 }),
    stroke(`M${cx} ${cy - 6}C${cx - 4} ${cy + 24} ${cx + 2} ${cy + 46} ${cx + 18} ${cy + 50}C${cx + 30} ${cy + 52} ${cx + 32} ${cy + 36} ${cx + 22} ${cy + 34}`, JOSO, 5),
    stroke(`M${cx - 24} ${cy + 26}l0 26M${cx - 34} ${cy + 52}l20 0M${cx + 44} ${cy + 20}l0 32M${cx + 36} ${cy + 52}l18 0`, JOSO, 5),
  );
  const tx = [
    { x: cx, y: y + 46, s: 'JOSO', size: 58, font: 'body', weight: 800, color: '#ece6dc', spacing: 4 },
    { x: cx, y: y + 92, s: 'Laboratorio Teatral', size: 24, font: 'body', weight: 700, color: '#ece6dc', maxW: w - 30 },
  ];
  return { body: out.join(''), texts: tx };
}

/** Pilot captain's jacket on a hanger: navy, gold stripes on the cuffs. */
function chaqueta(x, y, s = 1) {
  const out = [
    stroke(`M${x} ${y - 8}l0 -14a8 8 0 1 1 8 -8`, STEEL.line, 2.4),
    shape(smooth([[x - 46, y], [x + 46, y], [x + 52, y + 30], [x + 48, y + 170, 'c'], [x - 48, y + 170, 'c'], [x - 52, y + 30]]), NAVY.base, [path(smooth([[x - 4, y], [x + 4, y], [x + 2, y + 170], [x - 2, y + 170]]), NAVY.shadow)], NAVY.line, 1.6),
    path(smooth([[x - 18, y], [x, y + 50], [x + 18, y]]), '#e8e4dc'),
    ...[0, 1, 2].map((i) => circle(x - 12, y + 70 + i * 34, 4, GOLD)),
    ...[0, 1, 2].map((i) => circle(x + 12, y + 70 + i * 34, 4, GOLD)),
    ...[0, 1, 2, 3].map((i) => rect(x - 46, y + 140 + i * 7, 22, 3.5, GOLD)),
    ...[0, 1, 2, 3].map((i) => rect(x + 24, y + 140 + i * 7, 22, 3.5, GOLD)),
  ];
  return g(null, out, s === 1 ? {} : { transform: `translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})` });
}

/** Captain's cap: white crown, black peak, gold badge. */
function gorra(x, y, s = 1) {
  return g(null, [
    path(smooth([[x - 40, y], [x - 34, y - 26], [x + 34, y - 30], [x + 44, y - 4], [x + 40, y + 4], [x - 38, y + 6]]), '#f2f0ea'),
    path(rr(x - 40, y - 4, 82, 14, 5), '#1a1a22'),
    path(smooth([[x + 6, y + 8], [x + 52, y + 8], [x + 46, y + 18, 'c'], [x + 4, y + 16, 'c']]), '#101016'),
    path(ellipse(x, y - 12, 9, 7), GOLD),
    stroke(`M${x - 22} ${y - 12}l10 0M${x + 12} ${y - 12}l10 0`, GOLD, 3),
  ], { transform: `translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})` });
}

/** Turquoise neck scarf hanging from the rail. */
function panuelo(x, y) {
  return shape(smooth([[x - 16, y], [x + 16, y], [x + 10, y + 70], [x + 18, y + 120, 'c'], [x - 2, y + 96, 'c'], [x - 12, y + 60]]), TURQ.base, [path(smooth([[x + 2, y], [x + 16, y], [x + 10, y + 70], [x + 4, y + 66]]), TURQ.shadow), stroke(`M${x - 8} ${y + 20}l12 4M${x - 6} ${y + 44}l12 4`, TURQ.light, 2)], TURQ.line, 1.2);
}

function rack() {
  const [x0, x1] = RACK;
  const out = [];
  // Rail on two uprights with wheels; a hat shelf on top.
  out.push(ao(x0 - 10, 230, x1 - x0 + 20, 54, 0.45), ao(x0, 310, x1 - x0, 40, 0.3));
  out.push(rect(x0 + 6, G - 36, x1 - x0 - 12, 10, STEEL.shadow), rect(x0 + 6, G - 36, x1 - x0 - 12, 3, STEEL.light));
  out.push(rect(x0, 300, x1 - x0, 10, STEEL.base), rect(x0, 300, x1 - x0, 3, STEEL.light), rect(x0 + 5, 300, 10, G - 330, STEEL.shadow), rect(x0 + 5, 300, 3.5, G - 330, STEEL.light), rect(x1 - 15, 300, 10, G - 330, STEEL.shadow), rect(x1 - 15, 300, 3.5, G - 330, STEEL.light));
  out.push(rect(x0 - 10, 220, x1 - x0 + 20, 12, STEEL.base), rect(x0 - 10, 220, x1 - x0 + 20, 3.5, STEEL.light), rect(x0 - 10, 230, x1 - x0 + 20, 3, STEEL.line));
  for (const x of [x0 + 10, x1 - 10]) out.push(circle(x, G - 14, 14, '#1a1a1e'), circle(x, G - 14, 5, STEEL.base));
  out.push(gorra(x0 + 70, 214, 0.9), gorra(x0 + 190, 214, 0.9), gorra(x0 + 320, 214, 0.9));
  out.push(chaqueta(x0 + 90, 316), chaqueta(x0 + 210, 316), panuelo(x0 + 290, 312), panuelo(x0 + 320, 312), chaqueta(x0 + 360, 316, 0.96));
  // A sewing table beside it, with the costume scissors.
  const tx = x1 + 20;
  out.push(ao(tx, 616, 90, 40, 0.4));
  out.push(box(tx, 600, 90, 18, WOOD, { r: 3 }), box(tx + 6, 616, 78, 10, WOOD, { r: 2, sh: 0.4, li: 0, side: false }), box(tx + 6, 624, 10, G - 624, WOOD, { r: 2, sh: 0, li: 0, lw: 1.2 }), box(tx + 72, 624, 10, G - 624, WOOD, { r: 2, sh: 0, li: 0, lw: 1.2 }));
  out.push(stroke(`M${tx + 26} 594l34 -10M${tx + 26} 584l34 10`, STEEL.light, 3), circle(tx + 22, 596, 6, 'none', { stroke: '#c8433a', 'stroke-width': 3 }), circle(tx + 22, 582, 6, 'none', { stroke: '#c8433a', 'stroke-width': 3 }));
  return out.join('');
}

function maniqui() {
  const x = MANIQUI;
  const out = [];
  // Tailor's dummy on a stand, dressed as a captain, scarf and cap.
  out.push(rect(x - 5, 560, 10, G - 590, '#2a2830'), rect(x - 5, 560, 3.5, G - 590, '#4a4852'), path(ellipse(x, G - 14, 50, 12), '#1c1a20'), path(ellipse(x, G - 17, 46, 9), '#3a3842'), path(ellipse(x - 8, G - 19, 20, 3.5), '#5a5864'));
  out.push(shape(smooth([[x - 50, 330], [x + 50, 330], [x + 44, 420], [x + 34, 560, 'c'], [x - 34, 560, 'c'], [x - 44, 420]]), NAVY.base, [path(smooth([[x - 4, 330], [x + 4, 330], [x + 2, 560], [x - 2, 560]]), NAVY.shadow)], NAVY.line, 1.6));
  out.push(path(smooth([[x - 50, 330], [x - 26, 322], [x + 26, 322], [x + 50, 330], [x + 44, 346], [x - 44, 346]]), NAVY.light, { opacity: 0.55 }), rect(x - 48, 420, 96, 5, NAVY.shadow, { opacity: 0.6 }));
  out.push(path(smooth([[x - 18, 330], [x, 380], [x + 18, 330]]), '#e8e4dc'), panuelo(x - 4, 330));
  for (let i = 0; i < 3; i++) out.push(circle(x - 14, 400 + i * 40, 4, GOLD), circle(x + 14, 400 + i * 40, 4, GOLD));
  out.push(rect(x - 10, 324, 20, 12, '#b8afa2'), path(ellipse(x, 300, 26, 32), '#d8cfc2'), path(ellipse(x + 11, 304, 14, 28), '#b8afa2', { opacity: 0.55 }), path(ellipse(x - 10, 292, 6, 14), '#f0e8dc', { opacity: 0.6 }), gorra(x, 278, 0.75));
  return out.join('');
}

function trunk() {
  const [x0, x1] = BAUL;
  const out = [];
  const M = mat('#5a3424', '#42261a', '#74462e', '#22120a');
  const B = mat('#8a6a3a', '#5e4624', '#b08c52', '#2e200c');
  const w = x1 - x0;
  // Old props trunk, lid ajar, a script peeking out.
  out.push(rect(x0 + 6, G - 196, w, 190, '#000', { opacity: 0.2 }));
  out.push(box(x0, G - 150, w, 150, M, { r: 6, sh: 0.1, li: 0.05 }));
  // Wooden slats, leather straps with rivets and brass corners.
  for (const y of [G - 112, G - 64]) out.push(rect(x0 + 4, y, w - 8, 3.5, M.shadow, { opacity: 0.8 }), rect(x0 + 4, y + 3.5, w - 8, 2.5, M.light, { opacity: 0.5 }));
  for (const x of [x0 + 30, x1 - 42]) out.push(rect(x, G - 150, 14, 150, B.base), rect(x, G - 150, 4, 150, B.light), rect(x + 10, G - 150, 4, 150, B.shadow), ...[0, 1, 2].map((i) => circle(x + 7, G - 130 + i * 50, 3.4, B.light)));
  out.push(rect(x0, G - 90, w, 10, B.base), rect(x0, G - 90, w, 3, B.light), rect(x0, G - 83, w, 3, B.shadow));
  for (const x of [x0, x1 - 22]) out.push(poly([[x, G - 150], [x + 22, G - 150], [x + 22, G - 128], [x + 8, G - 128], [x + 8, G - 12], [x, G - 12]], BRASS_T), poly([[x, G], [x + 22, G], [x + 22, G - 14], [x, G - 14]], BRASS_T));
  out.push(path(rr((x0 + x1) / 2 - 22, G - 134, 44, 36, 4), B.shadow), path(rr((x0 + x1) / 2 - 18, G - 130, 36, 28, 3), GOLD), circle((x0 + x1) / 2, G - 118, 4.5, '#3e2614'), rect((x0 + x1) / 2 - 2, G - 118, 4, 9, '#3e2614'));
  // Lid: dark gap, then the lid with its lit top edge and a thick lip.
  out.push(poly([[x0 - 4, G - 152], [x1 + 4, G - 152], [x1 + 4, G - 144], [x0 - 4, G - 144]], '#150a06'));
  out.push(poly([[x0 - 4, G - 152], [x1 + 4, G - 152], [x1 - 6, G - 196], [x0 + 6, G - 190]], '#6a3e2a'));
  out.push(poly([[x0 + 6, G - 190], [x1 - 6, G - 196], [x1 - 8, G - 188], [x0 + 8, G - 182]], '#8a5238'));
  out.push(poly([[x0 - 4, G - 160], [x1 + 4, G - 160], [x1 + 4, G - 152], [x0 - 4, G - 152]], '#52301f'), rect(x0 - 4, G - 160, w + 8, 3, '#8a5238'));
  out.push(rect(x0 + 24, G - 196, 14, 44, B.base, { opacity: 0.9 }), rect(x1 - 38, G - 196, 14, 44, B.base, { opacity: 0.9 }));
  out.push(path(rr(x0 + 70, G - 168, 110, 20, 2), '#efe6d2'), rect(x0 + 70, G - 168, 110, 5, '#c8433a'), rect(x0 + 70, G - 152, 110, 4, '#b8ad96'));
  out.push(rect(x0 + 4, G - 8, w - 8, 8, '#150a06', { opacity: 0.55 }));
  return out.join('');
}

function suitcases() {
  const [x0] = MALETAS;
  const out = [];
  // Three white suitcases, big to small, stacked, with stickers from the tour.
  const stk = ['#3fc0b8', '#e8452e', '#e8c23a'];
  const maleta = (x, y, w, h, n) => [
    rect(x + 6, y - h + 4, w, h, '#000', { opacity: 0.14, rx: 10 }),
    box(x, y - h, w, h, WHITE, { r: 10, sh: 0.1, li: 0.06 }),
    // ribs, corner caps, latches and a thick handle
    ...[0.3, 0.7].map((k) => rect(x + w * k - 2.5, y - h + 8, 5, h - 16, WHITE.shadow, { opacity: 0.8 })),
    rect(x + 10, y - h / 2 - 3, w - 20, 5, WHITE.shadow), rect(x + 10, y - h / 2 + 2, w - 20, 2.5, WHITE.light),
    ...[x + 8, x + w - 20].map((cx) => rect(cx, y - 14, 12, 12, '#8a8f94', { rx: 3 })),
    ...[x + 8, x + w - 20].map((cx) => rect(cx, y - h + 2, 12, 12, '#8a8f94', { rx: 3 })),
    ...[x + w * 0.3 - 9, x + w * 0.7 - 9].map((cx) => rect(cx, y - h / 2 - 10, 18, 22, '#b8a470', { rx: 3 })),
    path(rr(x + w / 2 - 20, y - h - 16, 40, 18, 7), 'none', { stroke: '#6a6458', 'stroke-width': 6 }),
    path(rr(x + w / 2 - 20, y - h - 16, 40, 18, 7), 'none', { stroke: '#a8a294', 'stroke-width': 2.5, transform: 'translate(0 -1.5)' }),
    rect(x + w * 0.5 + 8, y - h + 14, 20, 16, stk[n % 3], { rx: 3, transform: `rotate(${n * 7 - 6} ${x + w * 0.5 + 18} ${y - h + 22})` }),
  ].join('');
  out.push(maleta(x0, G, 170, 110, 0), maleta(x0 + 14, G - 112, 140, 90, 1), maleta(x0 + 30, G - 204, 110, 70, 2));
  return out.join('');
}

function desk() {
  const [x0, x1] = DESK;
  const out = [];
  const em = [];
  // Pablo's work table: typewriter, a lamp, crumpled pages, a cajón (his drum box) underneath.
  const CAJ = mat('#9a6a3e', '#7a5230', '#b6844e', '#3e2614');
  out.push(ao(x0 - 10, 636, x1 - x0 + 20, 70, 0.5), rect(x0 + 14, 628, x1 - x0 - 20, G - 628, '#000', { opacity: 0.16 }));
  // Legs with body (lit left edge), a low stretcher and an apron under the top.
  out.push(rect(x0 + 24, G - 70, x1 - x0 - 60, 9, WOOD.shadow), rect(x0 + 24, G - 70, x1 - x0 - 60, 3, WOOD.base));
  for (const lx of [x0 + 10, x1 - 28]) out.push(box(lx, 620, 18, G - 620, WOOD, { r: 3, sh: 0, li: 0, lw: 1.2 }), rect(lx + 2, 622, 4, G - 626, WOOD.light, { opacity: 0.8 }));
  out.push(box(x0 + 14, 618, x1 - x0 - 28, 22, WOOD, { r: 2, sh: 0.35, li: 0, side: false, lw: 1.2 }));
  out.push(box(x0, 596, x1 - x0, 26, WOOD, { r: 4, sh: 0.22, li: 0.18 }), rect(x0 + 4, 596, x1 - x0 - 8, 4, '#a07a52', { opacity: 0.9 }));
  // The cajon: lit top, framed front face with the sound hole, screws and little feet.
  out.push(rect(x0 + 40, G - 8, 12, 8, '#2a1a0c'), rect(x0 + 118, G - 8, 12, 8, '#2a1a0c'));
  out.push(box(x0 + 30, G - 120, 110, 114, CAJ, { r: 4, sh: 0.06, li: 0.02 }), poly([[x0 + 30, G - 120], [x0 + 140, G - 120], [x0 + 134, G - 130], [x0 + 36, G - 130]], CAJ.light));
  out.push(path(rr(x0 + 40, G - 110, 90, 94, 4), 'none', { stroke: CAJ.shadow, 'stroke-width': 3.5 }), rect(x0 + 40, G - 17, 90, 2.5, CAJ.light, { opacity: 0.8 }));
  out.push(circle(x0 + 85, G - 66, 22, CAJ.shadow), circle(x0 + 85, G - 66, 17, '#2e1a0c'), path(ellipse(x0 + 85, G - 72, 12, 6), '#4a2c16', { opacity: 0.6 }));
  for (const [dx, dy] of [[47, G - 103], [123, G - 103], [47, G - 24], [123, G - 24]]) out.push(circle(x0 + dx, dy, 3.2, '#c8a46a'));
  const tx = (x0 + x1) / 2;
  out.push(path(ellipse(tx, 598, 108, 8), '#000', { opacity: 0.25 }), box(tx - 90, 520, 180, 80, DARK, { r: 12 }), rect(tx - 100, 506, 200, 16, '#1c1a20'), path(rr(tx - 70, 548, 140, 36, 4), '#141218'));
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) out.push(circle(tx - 64 + i * 16 + (r % 2) * 6, 556 + r * 11, 4.2, '#d8d4cc'));
  out.push(rect(tx - 60, 490, 120, 18, '#bcb6aa'));
  // Crumpled pages.
  const r = rng(6);
  for (let i = 0; i < 6; i++) out.push(path(ellipse(x0 + 40 + r() * (x1 - x0 - 80), 596 - r() * 6, 12, 9, r() * 3), '#e8e2d4'));
  // The lamp.
  const lx = x1 - 50;
  out.push(path(ellipse(lx, 598, 26, 6), '#2a2830'), stroke(`M${lx} 596L${lx - 30} 520L${lx - 70} 500`, '#2a2830', 6), path(smooth([[lx - 100, 498], [lx - 52, 478], [lx - 40, 510, 'c'], [lx - 96, 524, 'c']]), '#3a6a5a'));
  em.push(path(ellipse(lx - 72, 514, 22, 7, -0.4), '#fff0c0'));
  // A chair.
  out.push(box(x0 + 292, 520, 16, 130, WOOD, { r: 3, sh: 0, li: 0, lw: 1.2 }), box(x0 + 286, 530, 28, 12, WOOD, { r: 3, sh: 0.3, li: 0.2, lw: 1.2 }), box(x0 + 286, 562, 28, 10, WOOD, { r: 3, sh: 0.3, li: 0.2, lw: 1.2 }));
  out.push(box(x0 + 222, 654, 10, G - 654, WOOD, { r: 2, sh: 0, li: 0, lw: 1.2 }), box(x0 + 294, 654, 12, G - 654, WOOD, { r: 2, sh: 0, li: 0, lw: 1.2 }), rect(x0 + 232, G - 60, 62, 6, WOOD.shadow));
  out.push(box(x0 + 216, 640, 98, 20, WOOD, { r: 5, sh: 0.3, li: 0.2 }));
  return { body: out.join(''), emissive: em.join('') };
}

function lightingBoard() {
  const [x0, x1] = CUADRO;
  const out = [];
  const em = [];
  // Grey metal cabinet, open: rows of breakers and dimmer faders, a big lever.
  const CAB = mat('#5a5e64', '#44484e', '#70747a', '#22252a');
  out.push(rect(x0 + 10, 310, x1 - x0, 290, '#000', { opacity: 0.22, rx: 6 }), ao(x0 - 6, 580, x1 - x0 + 12, 46, 0.4));
  out.push(box(x0, 300, x1 - x0, 280, CAB, { r: 4, sh: 0.06, li: 0.03 }), rect(x0 + 14, 316, x1 - x0 - 28, 248, '#22252a'));
  out.push(rect(x0 + 14, 316, x1 - x0 - 28, 12, '#0e0f12', { opacity: 0.8 }), rect(x0 + 14, 560, x1 - x0 - 28, 4, CAB.light, { opacity: 0.7 }), rect(x0 + 14, 316, 5, 248, '#0e0f12', { opacity: 0.6 }));
  for (const [bx, by] of [[x0 + 7, 308], [x1 - 7, 308], [x0 + 7, 572], [x1 - 7, 572]]) out.push(circle(bx, by, 3.6, CAB.light));
  for (let rr2 = 0; rr2 < 3; rr2++) for (let i = 0; i < 6; i++) out.push(rect(x0 + 26 + i * 26, 330 + rr2 * 40, 16, 26, '#d8d4cc'), rect(x0 + 29 + i * 26, 334 + rr2 * 40 + ((i + rr2) % 2) * 10, 10, 8, '#3a3a40'));
  for (let i = 0; i < 6; i++) em.push(circle(x0 + 34 + i * 26, 470, 4, i % 3 ? '#ff5a3a' : '#5aff8a'));
  out.push(rect(x0 + 40, 500, 110, 10, '#141218'), box(x0 + 54, 486, 18, 36, mat('#c8433a', '#9a2e28', '#e06a5c', '#5e1814')));
  out.push(path(polyD([[x0 + 50, 312], [x0 + 92, 312], [x0 + 71, 290]]), '#e8c23a'));
  // Cables down to the floor; a ladder leaning on the wall.
  for (let i = 0; i < 4; i++) out.push(stroke(`M${x0 + 30 + i * 30} 580Q${x0 + 20 + i * 34} ${G - 20} ${x0 - 40 + i * 50} ${G - 4}`, '#141218', 6));
  const lx = x0 - 150;
  const A = [lx, G, lx + 60, 220];
  const B = [lx + 70, G, lx + 130, 220];
  const rail = ([xa, ya, xb, yb]) => [
    stroke(`M${xa + 12} ${ya}L${xb + 12} ${yb}`, '#000', 10, { opacity: 0.22 }),
    stroke(`M${xa} ${ya}L${xb} ${yb}`, '#4a5056', 15),
    stroke(`M${xa} ${ya}L${xb} ${yb}`, '#868b92', 11),
    stroke(`M${xa - 3} ${ya}L${xb - 3} ${yb}`, '#b4b9be', 3.5),
  ].join('');
  out.push(rail(A), rail(B));
  for (let y = G - 60; y > 240; y -= 70) {
    const k = (G - y) / (G - 220);
    const a = lx + k * 60;
    out.push(line(a, y, a + 70, y, '#4a5056', 11), line(a, y, a + 70, y, '#7a8086', 7), line(a + 2, y - 2.5, a + 68, y - 2.5, '#b4b9be', 3));
  }
  out.push(rect(lx - 8, G - 8, 18, 9, '#1c1c20', { rx: 3 }), rect(lx + 62, G - 8, 18, 9, '#1c1c20', { rx: 3 }));
  return { body: out.join(''), emissive: em.join('') };
}

function followSpot() {
  const x = CANON;
  const out = [];
  // A follow spot on its tripod, aimed at the projection screen.
  out.push(stroke(`M${x} 520L${x - 60} ${G}M${x} 520L${x + 60} ${G}M${x} 520L${x} ${G}`, '#2a2830', 7));
  out.push(g(null, [box(x - 80, 440, 180, 72, DARK, { r: 30 }), path(ellipse(x + 104, 476, 14, 38), '#4a4852'), rect(x - 40, 430, 40, 14, '#2a2830')], { transform: `rotate(-6 ${x} 476)` }));
  return out.join('');
}

function pantalla() {
  const [x0, x1] = CICLO;
  const out = [];
  // Pale cloth on a pipe, gently gathered; dark at the edges.
  out.push(rect(x0, 70, x1 - x0, 12, '#3c3a44'));
  out.push(gpath(rectD(x0, 80, x1 - x0, G - 90), lin(0, 80, 0, G, [[0, '#6e7088'], [1, '#4a4c62']])));
  for (let x = x0 + 30; x < x1; x += 60) out.push(stroke(`M${x} 84Q${x + 8} ${G / 2} ${x} ${G - 12}`, '#5a5c74', 3, { opacity: 0.6 }));
  out.push(gpath(rectD(x0, 80, x1 - x0, G - 90), lin(x0, 0, x1, 0, [[0, '#000', 0.5], [0.15, '#000', 0], [0.85, '#000', 0], [1, '#000', 0.5]])));
  // Old flats leaning against the far end: a fake door and a cardboard palm.
  const fx = x1 - 160;
  out.push(poly([[fx, G], [fx + 20, 300], [fx + 200, 300], [fx + 180, G]], '#7a6a8a'), bevel(fx + 50, 360, 110, G - 380, mat('#8a5a6a', '#6e4656', '#a46e80', '#3a1e2a'), { inset: 12 }));
  out.push(stroke(`M${x0 + 80} ${G}Q${x0 + 70} 520 ${x0 + 110} 380`, '#7a5a3a', 14));
  for (let i = 0; i < 5; i++) out.push(path(smooth([[x0 + 110, 380], [x0 + 110 + Math.cos(i * 1.3) * 120, 380 + Math.sin(i * 1.3) * 60 - 20], [x0 + 110 + Math.cos(i * 1.3) * 160, 400 + Math.sin(i * 1.3) * 80]], false), '#3a6a3a'));
  return out.join('');
}

/** Three cushion clouds, the group's own, piled in front of the projection screen. */
function nubes() {
  const out = [];
  const nube = (x, y, s) => g(null, [
    shape(smooth([[-70, 0], [-76, -26], [-50, -50], [-16, -48], [6, -72], [44, -66], [62, -40], [86, -30], [84, 0, 'c']]), '#ffffff', [path(smooth([[-70, -10], [84, -10], [84, 0], [-70, 0]]), '#dcdcf0'), path(ellipse(10, -52, 24, 12), '#ffffff')], '#9a9ab8', 2),
    stroke('M-40 -10q10 6 20 0M30 -12q10 6 20 0', '#b0b0c4', 2),
  ], { transform: `translate(${x} ${y}) scale(${s})` });
  out.push(nube(CICLO[0] + 300, G - 4, 1.2), nube(CICLO[0] + 470, G - 4, 1.05), nube(CICLO[0] + 390, G - 76, 0.95));
  return out.join('');
}

function backWall() {
  const d = stageDoor();
  const p = poster();
  const k = desk();
  const c = lightingBoard();
  return {
    body: [wall(), d.body, p.body, rack(), maniqui(), trunk(), suitcases(), k.body, c.body, followSpot(), pantalla(), nubes(), ao(-200, G, W + 400, 64, 0.42, -1)].join(''),
    emissive: [d.emissive, k.emissive, c.emissive].join(''),
    texts: [...d.texts, ...p.texts],
  };
}

// ---------------------------------------------------------------- floor and foreground

function floor() {
  const out = [];
  const kMax = P.f(1080) + 0.4;
  const quad = (X0, X1, k0, k1) => polyD([gp(X0, k0), gp(X1, k0), gp(X1, k1), gp(X0, k1)]);
  // Matte-black stage boards running away from the camera (they meet at the horizon),
  // with staggered end joints. Boards are grouped by tone: one path per tone.
  const tones = ['#2e2c36', '#33313b', '#2a2832', '#312f39'];
  const groups = tones.map(() => []);
  out.push(path(quad(-1600, W + 1600, 1, kMax), '#100e14'));
  const r = rng(12);
  const BW = 46;
  for (let X = -1600; X < W + 1600; X += BW) {
    let z = 1 - r() * 0.2;
    let first = true;
    while (z > 1 / kMax - 0.1) {
      const z1 = z - (0.2 + r() * 0.14);
      const k0 = first ? 1 : Math.max(1, 1 / z);
      first = false;
      const k1 = Math.min(kMax, 1 / Math.max(z1, 0.2));
      groups[Math.floor(r() * tones.length)].push(quad(X + 1, X + BW - 1, k0 + 0.006, k1 - 0.003));
      z = z1;
    }
  }
  tones.forEach((c, i) => out.push(path(groups[i].join(''), c)));
  // Worn centre of the boards (where feet go) and scuffs, a little lighter.
  const scuff = [];
  for (let i = 0; i < 46; i++) {
    const X = -600 + r() * (W + 1200);
    const k = 1.02 + r() * (kMax - 1.1);
    scuff.push(smooth([gp(X - 50, k), gp(X + 20, k - 0.012), gp(X + 90, k + 0.01)], false));
  }
  out.push(stroke(scuff.join(''), '#5a5666', 4, { opacity: 0.3 }));
  // Dust, in soft patches.
  for (let i = 0; i < 10; i++) {
    const [x, y] = gp(-200 + r() * (W + 400), 1.08 + r() * 0.5);
    out.push(sombra(x, y, 200, 34, 0.18, '#8a86a0'));
  }
  // Spike tape marks for the scenery, in colours.
  const cols = ['#e8c23a', '#3fc0b8', '#e8452e', '#f2f2f4'];
  for (let i = 0; i < 14; i++) {
    const X = 300 + r() * (W - 600);
    const k = 1.05 + r() * 0.3;
    const [x, y] = gp(X, k);
    out.push(rect(x - 14 * k, y - 2, 28 * k, 5 * k, cols[i % 4], { opacity: 0.85 }), rect(x - 2, y - 12 * k, 5 * k, 14 * k, cols[i % 4], { opacity: 0.85 }));
  }
  // Shade along the foot of the wall and soft contact shadows under what stands on the floor.
  out.push(gpath(quad(-1600, W + 1600, 1, 1.1), lin(0, yOf(1), 0, yOf(1.1), [[0, '#000000', 0.55], [1, '#000000', 0]])));
  const pie = (x0, x1, a = 0.5, fondo = 0.05) => sombra(uOf((x0 + x1) / 2, 1 + fondo / 3), yOf(1 + fondo / 3), ((x1 - x0) / 2 + 26) * (1 + fondo / 3), (yOf(1 + fondo) - yOf(1)) * 1.15, a, '#000000');
  out.push(pie(RACK[0] - 10, RACK[1] + 10, 0.4), pie(RACK[1] + 20, RACK[1] + 110, 0.4, 0.04), pie(MANIQUI - 50, MANIQUI + 50, 0.45, 0.04));
  out.push(pie(BAUL[0], BAUL[1], 0.6, 0.06), pie(MALETAS[0], MALETAS[0] + 170, 0.55, 0.06));
  out.push(pie(DESK[0], DESK[1], 0.55, 0.06), pie(DESK[0] + 214, DESK[0] + 316, 0.5, 0.07));
  out.push(pie(CUADRO[0] - 160, CUADRO[0] - 70, 0.5, 0.05), pie(CANON - 70, CANON + 70, 0.5, 0.05));
  out.push(pie(CICLO[0] + 190, CICLO[0] + 600, 0.45, 0.07), pie(CICLO[1] - 160, CICLO[1] + 40, 0.5, 0.06), pie(CICLO[0] + 40, CICLO[0] + 140, 0.4, 0.04));
  return out.join('');
}

function foreground() {
  const yF = yOf(KF);
  const at = (Xb) => uOf(Xb, KF);
  // A flight case on the left, a coil of cable on the right.
  const a = at(-120);
  const FC = mat('#2a2830', '#1c1a20', '#3a3842', '#0c0a10');
  const fc = [
    sombra(a + 150, yF - 4, 176, 24, 0.6, '#000000'),
    box(a, yF - 230, 300, 230, FC, { r: 8, sh: 0.1, li: 0.05 }),
    // ribbed panels, aluminium edges and corners, two latches and a handle
    ...[0, 1, 2, 3, 4, 5].map((i) => rect(a + 52 + i * 34, yF - 214, 8, 94, FC.shadow, { opacity: 0.8 })),
    ...[0, 1].map((i) => rect(a + 20 + i * 240, yF - 230, 20, 230, '#8a8f94')),
    ...[0, 1].map((i) => rect(a + 20 + i * 240, yF - 230, 5, 230, '#c8ccd0')),
    rect(a, yF - 130, 300, 14, '#8a8f94'), rect(a, yF - 130, 300, 4, '#c8ccd0'), rect(a, yF - 118, 300, 3, '#4c5158'),
    ...[a + 100, a + 190].map((x) => rect(x, yF - 140, 26, 34, '#4c5158', { rx: 4 })),
    ...[a + 100, a + 190].map((x) => rect(x + 4, yF - 134, 18, 8, '#c8ccd0', { rx: 2 })),
    rect(a + 120, yF - 60, 60, 12, '#4c5158', { rx: 6 }),
    ...[[a + 6, yF - 224], [a + 294, yF - 224], [a + 6, yF - 8], [a + 294, yF - 8]].map(([x, y]) => circle(x, y, 4, '#c8ccd0')),
  ].join('');
  const b = at(3560);
  const cable = sombra(b - 80, yF - 12, 120, 24, 0.55, '#000000') + [0, 1, 2, 3].map((i) => stroke(`M${b - 80} ${yF - 40}m-${80 - i * 6} 0a${80 - i * 6} ${30 - i * 2} 0 1 0 ${160 - i * 12} 0a${80 - i * 6} ${30 - i * 2} 0 1 0 -${160 - i * 12} 0`, i % 2 ? '#141218' : '#1e1c24', 9)).join('');
  return [
    { x0: Math.floor(a - 30), x1: Math.ceil(a + 330), y0: Math.floor(yF - 260), y1: 1080, body: fc },
    { x0: Math.floor(b - 280), x1: Math.ceil(b + 120), y0: Math.floor(yF - 100), y1: 1080, body: cable },
  ];
}

export function escena() {
  const fl = uRange(P.f(1080));
  const back = backWall();
  return {
    id: 'backstage',
    name: 'Teatro Joso, entre bambalinas',
    W,
    H: 1080,
    HOR: P.HOR,
    BASE: P.BASE,
    CX: P.CX,
    M,
    // Key light for relief: the desk lamp.
    clave: [0.6, -0.5, 0.6],
    ambient: '#2c2840',
    walk: { y0: 850, y1: 950, x0: 160, x1: 3640 },
    start: { X: 2240, y: 880 },
    layers: [
      {
        id: 'fondo', k: 1, lit: true, textura: 0.3,
        pieces: [
          { x0: -260, x1: W + 260, y0: -60, y1: G + 6, body: back.body, emissive: back.emissive },
        ],
        texts: back.texts,
        glows: [
          { x: (DOOR[0] + DOOR[1]) / 2, y: 145, r: 120, color: '#3ad06a', a: 0.35 },
          { x: DOOR[1] + 70, y: 256, r: 160, color: '#ffe2a0', a: 0.5 },
          { x: DESK[1] - 122, y: 520, r: 180, color: '#ffe0a0', a: 0.45 },
        ],
      },
      { id: 'suelo', floor: true, x0: fl[0], x1: fl[1], y0: 800, y1: 1080, body: floor(), lit: true, textura: 0.3 },
      { id: 'frente', k: KF, z: 'front', lit: true, textura: 0.3, pieces: foreground() },
    ],
    lights: [
      { X: DESK[1] - 122, y: 520, r: 900, color: '#ffd890', power: 0.95, fy: 880 },
      { X: DOOR[1] + 70, y: 256, r: 900, color: '#ffe2a0', power: 0.7, fy: 870 },
      { X: (DOOR[0] + DOOR[1]) / 2, y: 145, r: 500, color: '#3ad06a', power: 0.35 },
      { X: (CICLO[0] + CICLO[1]) / 2, y: 300, r: 900, color: '#7a7cb8', power: 0.35, fy: 880, flat: 0.5 },
      // A blue working light on the cushion clouds, so they read as clouds in the dark.
      { X: CICLO[0] + 400, y: G - 120, r: 420, color: '#b8c4ff', power: 0.55 },
      { X: CUADRO[0] + 90, y: 470, r: 360, color: '#ff6a4a', power: 0.25 },
    ],
    spots: {
      // The follow spot's lens and where it lands on the projection screen, for the giant
      // shadow drawn live when it is on (src/capitulos/pablo.ts).
      canon: { x: CANON + 104, y: 466 },
      ciclo: { x: (CICLO[0] + CICLO[1]) / 2 + 20, y: 430, r: 300, suelo: G },
    },
    zonas: {
      puertaArtistas: { u: (DOOR[0] + DOOR[1]) / 2, k: 1, w: DOOR[1] - DOOR[0], top: 200, bottom: G, X: DOOR[1] + 40, y: 870 },
      cartel: { u: DOOR[1] + 250, k: 1, w: 240, top: 292, bottom: 610, X: DOOR[1] + 250, y: 866 },
      perchero: { u: (RACK[0] + RACK[1]) / 2, k: 1, w: RACK[1] - RACK[0], top: 200, bottom: G, X: (RACK[0] + RACK[1]) / 2, y: 870 },
      tijeras: { u: RACK[1] + 65, k: 1, w: 100, top: 560, bottom: 630, X: RACK[1] + 60, y: 866 },
      maniqui: { u: MANIQUI, k: 1, w: 120, top: 250, bottom: G, X: MANIQUI + 90, y: 870 },
      baul: { u: (BAUL[0] + BAUL[1]) / 2, k: 1, w: BAUL[1] - BAUL[0], top: G - 200, bottom: G, X: (BAUL[0] + BAUL[1]) / 2, y: 880 },
      maletas: { u: MALETAS[0] + 85, k: 1, w: 180, top: G - 300, bottom: G, X: MALETAS[0] + 85, y: 870 },
      maquina: { u: (DESK[0] + DESK[1]) / 2, k: 1, w: 220, top: 480, bottom: 610, X: DESK[0] - 50, y: 880 },
      flexo: { u: DESK[1] - 80, k: 1, w: 110, top: 470, bottom: 600, X: DESK[1] - 40, y: 870 },
      cuadro: { u: (CUADRO[0] + CUADRO[1]) / 2, k: 1, w: CUADRO[1] - CUADRO[0], top: 290, bottom: 590, X: (CUADRO[0] + CUADRO[1]) / 2, y: 870 },
      canon: { u: CANON + 10, k: 1, w: 220, top: 420, bottom: G, X: CANON - 120, y: 880 },
      nubes: { u: CICLO[0] + 400, k: 1, w: 320, top: G - 160, bottom: G, X: CICLO[0] + 400, y: 880 },
      pantalla: { u: (CICLO[0] + CICLO[1]) / 2, k: 1, w: 500, top: 90, bottom: G - 170, X: (CICLO[0] + CICLO[1]) / 2, y: 870 },
    },
  };
}
