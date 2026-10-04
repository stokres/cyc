// Chuchi's story: Bolilandia, a children's play park in Usera, after closing.
// A classmate's birthday party has just ended; everyone has gone home and the
// lights are off. A mural sky with a rainbow, foam mats on the floor, the party
// table, the soft-play climbing frame with its tube slide and nets, and the big
// ball pit. By the exit, Robi, the park's mascot robot, asleep on his pedestal.
//
// Left to right: the electric shutter of the exit (under the green SALIDA sign)
// and Robi; the shoe rack («deja aquí tus zapatos»); the reception counter;
// the staff door with the key hung up high, out of the children's reach; the
// party table and the piñata; the long ball net; the climbing frame, the tube
// slide, the ball cannon and the ball pit.
//
// What changes with the story are flagged pieces (si): the shutter up or down,
// Robi asleep, awake (in front of the exit, with the shoe) or beaten, the staff
// door open with the fuse box inside, the key, the net and the piñata stick.
// The lights out are drawn live over everything (src/capitulos/chuchi.ts).
//
// Layers, back to front:
//   fondo   (1)     the back wall and everything against it
//   suelo   (rows)  foam mats in colours
//   [characters and props]
//   frente  (1.45)  a foam block and stray balls at the edges
import { smooth, ellipse, path, stroke, g, shape, rect, circle, line, poly, polyD, rectD, rr, lin, gpath, mat, box, bevel, persp, rng } from './kit.mjs';
import { robot, zapatoBrilli } from '../robot.mjs';

export const P = persp({ HOR: 340, BASE: 820, CX: 1170 });
export const W = 3700;
export const M = 210;
const { gp, yOf, uOf } = P;
const G = P.BASE;
const KF = 1.45;

const PERSIANA = [110, 520];
const ROBOT_PEANA = 690;
const ZAPATERO = [830, 990];
const RECEPCION = [1060, 1440];
const PERSONAL = [1520, 1740];
const GANCHO = { x: 1800, y: 318 };
const FIESTA = [1830, 2330];
const RED = 2400;
const PISCINA = [2480, 3420];
const ESTRUCTURA = [2440, 3640];
const CANON = { x: 3300, y: 452 };

const BOLAS = ['#e8452e', '#f5c95f', '#5ad08a', '#5aa8ff', '#f27aa8', '#ff9a3a'];
const AZUL = mat('#3a7ad8', '#2a5aa8', '#6a9ae8', '#163a70');
const ROJO = mat('#e0503a', '#b03a28', '#f07a60', '#6a1a10');
const AMARILLO = mat('#f5c33a', '#d4a020', '#ffe07a', '#7a5a08');
const VERDE = mat('#4ab86a', '#36904e', '#7ad890', '#14502a');
const WOOD = mat('#c49a6a', '#a07a4e', '#dcb88a', '#5e4229');
const STEEL = mat('#a9aeb4', '#868b92', '#c8ccd0', '#4c5158');

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

function nube(x, y, s) {
  return path(smooth([[x - 70 * s, y], [x - 64 * s, y - 26 * s], [x - 30 * s, y - 40 * s], [x, y - 60 * s], [x + 40 * s, y - 50 * s], [x + 70 * s, y - 24 * s], [x + 78 * s, y, 'c']]), '#ffffff', { opacity: 0.85 });
}

function mural() {
  const out = [];
  // A painted sky down to the padded wainscot, with clouds, a sun and a rainbow.
  out.push(gpath(rectD(-200, -60, W + 400, G - 160 + 60), lin(0, -60, 0, G - 160, [[0, '#5aa0e0'], [1, '#a8d8f4']])));
  const arco = (r, c) => stroke(`M${1960 - r} ${G - 160}A${r} ${r * 0.8} 0 0 1 ${1960 + r} ${G - 160}`, c, 34);
  out.push(arco(560, '#e8452e'), arco(526, '#ff9a3a'), arco(492, '#f5c95f'), arco(458, '#5ad08a'), arco(424, '#5aa8ff'), arco(390, '#8a6ad8'));
  out.push(circle(560, 170, 70, '#ffd23a'), circle(560, 170, 52, '#ffe68a'));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    out.push(line(560 + Math.cos(a) * 86, 170 + Math.sin(a) * 86, 560 + Math.cos(a) * 112, 170 + Math.sin(a) * 112, '#ffd23a', 10));
  }
  for (const [x, y, s] of [[1100, 160, 1.4], [1500, 110, 1], [2500, 150, 1.6], [3100, 100, 1.2], [3500, 190, 1]]) out.push(nube(x, y, s));
  // Padded wainscot in colours.
  const cols = [AZUL, ROJO, AMARILLO, VERDE];
  for (let x = -200, i = 0; x < W + 200; x += 180, i++) out.push(box(x, G - 160, 180, 160, cols[i % 4], { r: 14, sh: 0.12, li: 0.1, side: false, lw: 2 }));
  // Ceiling with light panels.
  out.push(rect(-200, -60, W + 400, 70, '#e8e4dc'), rect(-200, 6, W + 400, 6, '#c8c2b4'));
  for (const x of [380, 1180, 1980, 2780, 3500]) out.push(rect(x - 130, -4, 260, 18, '#f6f8ff'));
  return out.join('');
}

function salida() {
  const [x0, x1] = PERSIANA;
  const out = [];
  const em = [];
  const tx = [];
  out.push(rect(x0 - 30, 220, x1 - x0 + 60, G - 220, '#5a6070'), rect(x0 - 30, 220, x1 - x0 + 60, 40, '#4a4f5c'));
  // The SALIDA sign, always lit (emergency light).
  out.push(path(rr((x0 + x1) / 2 - 100, 150, 200, 54, 8), '#14361e'));
  em.push(path(rr((x0 + x1) / 2 - 94, 155, 188, 44, 6), '#3ad06a', { opacity: 0.9 }));
  tx.push({ x: (x0 + x1) / 2, y: 177, s: 'SALIDA', size: 32, font: 'body', weight: 800, color: '#eafff0', emissive: true, spacing: 3 });
  return { body: out.join(''), emissive: em.join(''), texts: tx };
}

/** The shutter down: corrugated steel. */
function persianaBajada() {
  const [x0, x1] = PERSIANA;
  const out = [rect(x0, 260, x1 - x0, G - 260, '#9aa0a8')];
  for (let y = 270; y < G; y += 22) out.push(rect(x0, y, x1 - x0, 6, '#7a8088'), rect(x0, y + 6, x1 - x0, 3, '#c0c4ca'));
  out.push(box((x0 + x1) / 2 - 50, G - 40, 100, 26, STEEL, { r: 6 }));
  return out.join('');
}

/** The shutter up: the street at night through the glass door. */
function persianaSubida() {
  const [x0, x1] = PERSIANA;
  const out = [gpath(rectD(x0, 260, x1 - x0, G - 260), lin(0, 260, 0, G, [[0, '#1c2446'], [1, '#3a3458']]))];
  out.push(rect(x0, 600, x1 - x0, G - 600, '#2a2638'), rect(x0 + 260, 330, 10, 300, '#3a3a44'), circle(x0 + 265, 330, 22, '#ffd27a', { opacity: 0.9 }));
  for (let i = 0; i < 6; i++) out.push(rect(x0 + 30 + i * 60, 420 + (i % 3) * 30, 34, 50, '#3a3a5a'), rect(x0 + 40 + i * 60, 432 + (i % 3) * 30, 10, 12, '#ffd27a', { opacity: 0.7 }));
  out.push(rect(x0, 260, x1 - x0, 26, '#9aa0a8'), rect(x0, 286, x1 - x0, 6, '#7a8088'));
  out.push(stroke(rr(x0 + 20, 300, x1 - x0 - 40, G - 310, 4), '#c8ccd4', 8), stroke(`M${(x0 + x1) / 2} 300L${(x0 + x1) / 2} ${G - 10}`, '#c8ccd4', 6));
  return out.join('');
}

function peana() {
  const x = ROBOT_PEANA;
  return [
    box(x - 150, G - 70, 300, 70, mat('#5a6070', '#40444f', '#7a8090', '#1e2028'), { r: 10 }),
    rect(x - 120, G - 52, 240, 30, '#2a2e38', { rx: 6 }),
  ].join('');
}

function zapatero() {
  const [x0, x1] = ZAPATERO;
  const out = [];
  // Low cubby shelves full of little shoes.
  out.push(box(x0, G - 260, x1 - x0, 260, WOOD, { r: 6 }));
  const r = rng(8);
  const cols = ['#e8452e', '#5aa8ff', '#f5c95f', '#2a2e38', '#f27aa8', '#5ad08a', '#ffffff'];
  for (let fila = 0; fila < 4; fila++) {
    const y = G - 240 + fila * 62;
    out.push(rect(x0 + 10, y + 48, x1 - x0 - 20, 6, WOOD.shadow));
    for (let i = 0; i < 3; i++) {
      const cx = x0 + 30 + i * 48;
      const c = cols[Math.floor(r() * cols.length)];
      out.push(path(smooth([[cx - 18, y + 46, 'c'], [cx - 18, y + 34], [cx - 6, y + 28], [cx + 8, y + 34], [cx + 20, y + 40], [cx + 20, y + 46, 'c']]), c), rect(cx - 18, y + 44, 38, 4, '#f2ead8'));
    }
  }
  return out.join('');
}

function recepcion() {
  const [x0, x1] = RECEPCION;
  const out = [];
  const em = [];
  const tx = [];
  // The counter, curved front in stripes, a till and a bunch of balloons.
  out.push(box(x0, G - 240, x1 - x0, 240, mat('#f2ead8', '#d6ccb4', '#fffaf0', '#7a705a'), { r: 16 }));
  for (let i = 0; i < 6; i++) out.push(rect(x0 + 20 + i * 60, G - 200, 30, 170, BOLAS[i], { opacity: 0.85, rx: 12 }));
  out.push(box(x0 + 40, G - 300, 120, 60, mat('#3a3e48', '#2a2e36', '#5a5e68', '#141618'), { r: 8 }), rect(x0 + 60, G - 290, 80, 24, '#5ad08a', { opacity: 0.6 }));
  for (const [dx, dy, c] of [[0, 0, '#e8452e'], [44, -30, '#5aa8ff'], [-36, -40, '#f5c95f'], [20, -76, '#f27aa8']]) {
    const bx = x1 - 70 + dx;
    const by = 330 + dy;
    out.push(stroke(`M${bx} ${by + 50}Q${bx + 10} ${by + 160} ${x1 - 60} ${G - 240}`, '#7a7068', 2), shape(ellipse(bx, by, 40, 50), c, [path(ellipse(bx - 14, by - 18, 10, 14), '#ffffff', { opacity: 0.5 })], '#00000055', 1.4));
  }
  // The park's sign.
  out.push(path(rr(x0 + 10, 230, x1 - x0 - 20, 80, 30), '#8a3ad8'));
  em.push(path(rr(x0 + 18, 238, x1 - x0 - 36, 64, 24), '#b06aff', { opacity: 0.35 }));
  tx.push({ x: (x0 + x1) / 2, y: 271, s: 'BOLILANDIA', size: 46, font: 'display', color: '#fff4a0', emissive: true, spacing: 2 });
  return { body: out.join(''), emissive: em.join(''), texts: tx };
}

function personal() {
  const [x0, x1] = PERSONAL;
  const out = [];
  const tx = [];
  // Door frame and the high shelf with the hook (key apart: si).
  out.push(rect(x0 - 16, 330, x1 - x0 + 32, G - 330, '#3a3e48'));
  out.push(box(GANCHO.x - 80, GANCHO.y - 14, 160, 14, WOOD, { r: 3 }), stroke(`M${GANCHO.x} ${GANCHO.y}l0 18a8 8 0 1 0 8 8`, '#4a4f5c', 4));
  out.push(path(rr((x0 + x1) / 2 - 90, 290, 180, 30, 6), '#e8452e'));
  tx.push({ x: (x0 + x1) / 2, y: 305, s: 'SOLO PERSONAL', size: 20, font: 'body', weight: 800, color: '#ffffff', spacing: 1 });
  return { body: out.join(''), texts: tx };
}

function puertaCerrada() {
  const [x0, x1] = PERSONAL;
  return [bevel(x0, 340, x1 - x0, G - 340, mat('#e0e4ec', '#c4c8d2', '#f4f6fa', '#6a7080'), { inset: 18 }), circle(x1 - 30, 600, 10, '#c9a14f')].join('');
}

/** The staff door open: a dark little room and the fuse box with its big lever. */
function puertaAbierta() {
  const [x0, x1] = PERSONAL;
  const out = [rect(x0, 340, x1 - x0, G - 340, '#1a1c24')];
  out.push(poly([[x0, 340], [x0 - 60, 320], [x0 - 60, G + 10], [x0, G]], '#d4d8e2'));
  const cx = (x0 + x1) / 2;
  out.push(box(cx - 70, 400, 140, 190, mat('#8a8e98', '#6e727c', '#a4a8b2', '#2e3038'), { r: 6 }), rect(cx - 56, 414, 112, 120, '#2e3038'));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) out.push(rect(cx - 46 + i * 24, 428 + j * 50, 14, 32, '#d8d4cc'));
  out.push(box(cx - 14, 546, 28, 36, mat('#e8452e', '#b03a28', '#f07a60', '#6a1a10'), { r: 6 }));
  out.push(path(polyD([[cx - 22, 400], [cx + 22, 400], [cx, 380]]), '#f5c33a'));
  return out.join('');
}

function llave() {
  return [stroke(`M${GANCHO.x - 2} ${GANCHO.y + 30}a9 9 0 1 0 0.2 0`, '#c9a14f', 4), stroke(`M${GANCHO.x - 2} ${GANCHO.y + 48}L${GANCHO.x - 2} ${GANCHO.y + 84}M${GANCHO.x - 2} ${GANCHO.y + 72}l8 0M${GANCHO.x - 2} ${GANCHO.y + 80}l8 0`, '#d9dcd8', 5), path(rr(GANCHO.x - 16, GANCHO.y + 10, 28, 12, 4), '#e8452e')].join('');
}

function fiesta() {
  const [x0, x1] = FIESTA;
  const out = [];
  // Party table: a striped tablecloth, the remains of the cake, cups and hats.
  out.push(rect(x0 + 30, G - 150, 14, 150, WOOD.shadow), rect(x1 - 44, G - 150, 14, 150, WOOD.shadow));
  out.push(shape(smooth([[x0, G - 200, 'c'], [x1, G - 200, 'c'], [x1 + 10, G - 130, 'c'], [x0 - 10, G - 130, 'c']]), '#ffffff', [...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => rect(x0 + i * 60, G - 200, 30, 70, '#f27aa8', { opacity: 0.6 }))], '#a07a8a', 2));
  const cx = x0 + 150;
  out.push(path(ellipse(cx, G - 202, 70, 14), '#e8e4dc'), shape(smooth([[cx - 60, G - 206, 'c'], [cx - 60, G - 250], [cx - 10, G - 256], [cx + 4, G - 230], [cx + 10, G - 206, 'c']]), '#8a4a2a', [path(smooth([[cx - 60, G - 250], [cx - 10, G - 256], [cx - 10, G - 246], [cx - 60, G - 240]]), '#f2ead8')], '#4a2410', 1.6));
  out.push(circle(cx - 30, G - 262, 5, '#e8452e'));
  for (let i = 0; i < 5; i++) {
    const x = x0 + 260 + i * 46;
    out.push(path(polyD([[x - 12, G - 202], [x + 12, G - 202], [x + 9, G - 236], [x - 9, G - 236]]), BOLAS[i]));
  }
  for (const [x, c] of [[x0 + 60, '#5aa8ff'], [x1 - 80, '#f5c95f']]) out.push(path(polyD([[x - 22, G - 202], [x + 22, G - 202], [x, G - 262]]), c), circle(x, G - 266, 6, '#ffffff'));
  // The piñata (a llama, already broken) hanging from the ceiling.
  const px = x0 + 330;
  out.push(stroke(`M${px} 0L${px} 250`, '#7a7068', 3));
  out.push(shape(smooth([[px - 70, 300], [px - 60, 270], [px + 30, 266], [px + 40, 220], [px + 60, 212], [px + 70, 240], [px + 64, 300], [px + 50, 340], [px - 60, 340]]), '#f5f0e0', [
    ...[0, 1, 2, 3].map((i) => rect(px - 70, 290 + i * 12, 140, 6, BOLAS[i])),
    path(ellipse(px - 6, 330, 24, 14), '#3a2a20'),
  ], '#8a7a5a', 2));
  for (const [dx, dy] of [[-40, 350], [-10, 362], [24, 352]]) out.push(stroke(`M${px + dx} 340L${px + dx} ${dy + 40}`, '#f27aa8', 6));
  return out.join('');
}

/** The piñata stick, lying on the table, with its grip of duct tape. */
function palo() {
  const [x0] = FIESTA;
  return [stroke(`M${x0 + 300} ${G - 208}L${x0 + 480} ${G - 214}`, '#c49a6a', 10), rect(x0 + 300, G - 214, 40, 12, '#9aa0a8', { rx: 3 })].join('');
}

/** The long net for fishing balls out of the pit, leaning on the wall. */
function red() {
  const x = RED;
  return [
    stroke(`M${x} ${G}L${x + 40} 360`, '#5a6070', 9),
    shape(ellipse(x + 46, 320, 40, 46, 0.1), 'none', [], '#5a6070', 6),
    ...[-24, -8, 8, 24].map((d) => stroke(`M${x + 46 + d} 280L${x + 46 + d * 0.6} 362`, '#c8ccd4', 2)),
    ...[300, 320, 340].map((y) => stroke(`M${x + 12} ${y}L${x + 80} ${y}`, '#c8ccd4', 2)),
  ].join('');
}

function estructura() {
  const [x0, x1] = ESTRUCTURA;
  const out = [];
  // Padded posts and two platforms, with nets between.
  for (const x of [x0, x0 + 400, x0 + 800, x1 - 20]) out.push(box(x, 120, 28, G - 120, AMARILLO, { r: 12, sh: 0.05, li: 0.05 }));
  out.push(box(x0, 300, x1 - x0, 30, ROJO, { r: 12 }), box(x0, 470, x1 - x0, 30, AZUL, { r: 12 }));
  for (let x = x0 + 30; x < x1; x += 40) out.push(line(x, 120, x, 300, '#2a2e38', 1.6, { opacity: 0.5 }), line(x, 330, x, 470, '#2a2e38', 1.6, { opacity: 0.4 }));
  for (let y = 140; y < 300; y += 40) out.push(line(x0, y, x1, y, '#2a2e38', 1.6, { opacity: 0.5 }));
  // Soft rollers and a climbing wall of colour holds.
  for (let i = 0; i < 4; i++) out.push(shape(ellipse(x0 + 120 + i * 70, 400, 30, 52), BOLAS[i], [], '#00000044', 2));
  const r = rng(4);
  for (let i = 0; i < 14; i++) out.push(circle(x0 + 460 + r() * 300, 340 + r() * 120, 8, BOLAS[i % 6]));
  // The tube slide, from the top platform down into the pit, in green.
  const t = [[x1 - 200, 300], [x1 - 60, 360], [x1 - 160, 470], [x1 - 420, 520], [x1 - 560, 600]];
  out.push(stroke(`M${t.map((p) => p.join(' ')).join('L')}`, '#1e6a3a', 96), stroke(`M${t.map((p) => p.join(' ')).join('L')}`, VERDE.base, 84), stroke(`M${t.map((p) => p.join(' ')).join('L')}`, VERDE.light, 20, { opacity: 0.5, transform: 'translate(-8 -16)' }));
  out.push(shape(ellipse(t[4][0], t[4][1], 50, 46), '#14502a', [path(ellipse(t[4][0] + 6, t[4][1] + 4, 36, 34), '#0c2a16')], '#0c2a16', 3));
  return out.join('');
}

/** The ball cannon on the lower platform (it blows balls with air when there is power). */
function canon() {
  const { x, y } = CANON;
  return [
    box(x - 50, y + 14, 100, 30, mat('#5a6070', '#40444f', '#7a8090', '#1e2028'), { r: 8 }),
    g(null, [
      shape(rr(-90, -30, 150, 60, 28), AMARILLO.base, [rect(-90, 10, 150, 20, AMARILLO.shadow)], AMARILLO.line, 3),
      shape(ellipse(-92, 0, 18, 34), '#2a2e38', [], '#141618', 2),
      shape(smooth([[20, -30], [40, -90], [90, -96], [70, -30]]), '#5aa8ff', [], '#163a70', 2.4),
      ...BOLAS.slice(0, 4).map((c, i) => circle(48 + i * 9, -74 - (i % 2) * 8, 9, c)),
    ], { transform: `translate(${x} ${y}) rotate(-12)` }),
  ].join('');
}

function piscina() {
  const [x0, x1] = PISCINA;
  const out = [];
  // Balls heaped above the padded wall, then the wall in front.
  const r = rng(11);
  for (let i = 0; i < 420; i++) {
    const x = x0 + 10 + r() * (x1 - x0 - 20);
    const y = G - 200 - Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 26 + r() * 40;
    out.push(circle(x, y, 13 + r() * 3, BOLAS[Math.floor(r() * 6)]));
    if (i % 3 === 0) out.push(circle(x - 4, y - 5, 4, '#ffffff', { opacity: 0.45 }));
  }
  for (let x = x0, i = 0; x < x1; x += 156, i++) out.push(box(x, G - 170, 156, 170, i % 2 ? AZUL : ROJO, { r: 18, sh: 0.15, li: 0.12, side: false, lw: 2.4 }));
  out.push(box(x0 - 20, G - 186, x1 - x0 + 40, 26, AMARILLO, { r: 13 }));
  return out.join('');
}

function backWall() {
  const s = salida();
  const rc = recepcion();
  const pe = personal();
  return {
    body: [mural(), s.body, zapatero(), rc.body, pe.body, fiesta(), estructura(), canon(), piscina()].join(''),
    emissive: [s.emissive, rc.emissive].join(''),
    texts: [...s.texts, ...rc.texts, ...pe.texts],
  };
}

// ---------------------------------------------------------------- floor and foreground

function floor() {
  const out = [];
  const kMax = P.f(1080) + 0.4;
  const quad = (X0, X1, k0, k1) => polyD([gp(X0, k0), gp(X1, k0), gp(X1, k1), gp(X0, k1)]);
  const cols = ['#c8423a', '#3a74c8', '#e8b83a', '#46a860'];
  // Interlocking foam mats, a chequer of colours.
  let fila = 0;
  for (let z = 1; 1 / z < kMax; fila++) {
    const z1 = z - 0.12;
    const k0 = 1 / z;
    const k1 = Math.min(kMax, 1 / Math.max(z1, 0.2));
    for (let X = -1600, i = 0; X < W + 1600; X += 200, i++) {
      out.push(path(quad(X, X + 200, k0, k1), cols[(i + fila) % 4]));
      out.push(path(quad(X, X + 4, k0, k1), '#000000', { opacity: 0.18 }));
    }
    out.push(path(quad(-1600, W + 1600, k0, k0 + 0.004), '#000000', { opacity: 0.2 }));
    z = z1;
  }
  return out.join('');
}

function foreground() {
  const yF = yOf(KF);
  const at = (Xb) => uOf(Xb, KF);
  // A big foam step on the left, and a few balls that escaped the pit on the right.
  const a = at(-160);
  const cubo = [box(a, yF - 170, 320, 170, AZUL, { r: 24 }), box(a + 40, yF - 300, 240, 130, AMARILLO, { r: 22 })].join('');
  const b = at(3420);
  const r = rng(21);
  const bolas = [];
  for (let i = 0; i < 9; i++) bolas.push(circle(b - 200 + r() * 360, yF - 24 - r() * 30, 22 + r() * 6, BOLAS[i % 6]), circle(b - 200 + r() * 360, yF - 30, 6, '#ffffff', { opacity: 0.35 }));
  return [
    { x0: Math.floor(a - 30), x1: Math.ceil(a + 350), y0: Math.floor(yF - 330), y1: 1080, body: cubo },
    { x0: Math.floor(b - 260), x1: Math.ceil(b + 200), y0: Math.floor(yF - 90), y1: 1080, body: bolas.join('') },
  ];
}

/** The little shoe on the floor once Robi drops it: character units. */
function zapatoSuelo() {
  return [path(ellipse(0, 2, 22, 5), '#000', { opacity: 0.22 }), `<g transform="translate(0 -6) scale(0.42)">${zapatoBrilli()}</g>`].join('');
}

export function escena() {
  const fl = uRange(P.f(1080));
  const back = backWall();
  const robotEn = (x, y, estado) => `<g transform="translate(${x} ${y})">${robot({ estado })}</g>`;
  return {
    id: 'parque',
    name: 'Bolilandia, parque de bolas',
    W,
    H: 1080,
    HOR: P.HOR,
    BASE: P.BASE,
    CX: P.CX,
    M,
    clave: [0.2, -0.9, 0.4],
    ambient: '#5a6a9a',
    walk: { y0: 850, y1: 950, x0: 560, x1: 3560 },
    start: { X: 2380, y: 880 },
    layers: [
      {
        id: 'fondo', k: 1, lit: true,
        pieces: [
          { x0: -260, x1: W + 260, y0: -60, y1: G + 6, body: back.body, emissive: back.emissive },
          { x0: PERSIANA[0] - 10, x1: PERSIANA[1] + 10, y0: 250, y1: G + 4, body: persianaBajada(), si: '!c.luz' },
          { x0: PERSIANA[0] - 10, x1: PERSIANA[1] + 10, y0: 250, y1: G + 4, body: persianaSubida(), si: 'c.luz' },
          { x0: PERSONAL[0] - 10, x1: PERSONAL[1] + 10, y0: 330, y1: G + 4, body: puertaCerrada(), si: '!c.cuarto' },
          { x0: PERSONAL[0] - 70, x1: PERSONAL[1] + 10, y0: 310, y1: G + 14, body: puertaAbierta(), si: 'c.cuarto' },
          { x0: GANCHO.x - 30, x1: GANCHO.x + 30, y0: GANCHO.y, y1: GANCHO.y + 100, body: llave(), si: '!c.llave' },
          { x0: FIESTA[0] + 290, x1: FIESTA[0] + 490, y0: G - 230, y1: G - 190, body: palo(), si: '!c.palo' },
          { x0: RED - 20, x1: RED + 100, y0: 260, y1: G + 4, body: red(), si: '!c.red' },
          { x0: ROBOT_PEANA - 160, x1: ROBOT_PEANA + 160, y0: G - 80, y1: G + 4, body: peana() },
          // Robi: asleep on his pedestal; awake, in front of the exit; beaten, slumped back on it.
          { x0: ROBOT_PEANA - 300, x1: ROBOT_PEANA + 300, y0: G - 760, y1: G - 60, body: robotEn(ROBOT_PEANA, G - 66, 'apagado'), si: '!c.luz' },
          { x0: (PERSIANA[0] + PERSIANA[1]) / 2 - 330, x1: (PERSIANA[0] + PERSIANA[1]) / 2 + 360, y0: G - 720, y1: G + 6, body: robotEn((PERSIANA[0] + PERSIANA[1]) / 2, G, 'encendido'), si: 'c.robot' },
          { x0: ROBOT_PEANA - 300, x1: ROBOT_PEANA + 300, y0: G - 760, y1: G - 20, body: robotEn(ROBOT_PEANA, G - 66, 'vencido'), si: 'c.vencido' },
        ],
        texts: back.texts,
        glows: [
          { x: (PERSIANA[0] + PERSIANA[1]) / 2, y: 177, r: 140, color: '#3ad06a', a: 0.4 },
          { x: (RECEPCION[0] + RECEPCION[1]) / 2, y: 270, r: 260, color: '#b06aff', a: 0.25 },
        ],
      },
      { id: 'suelo', floor: true, x0: fl[0], x1: fl[1], y0: 800, y1: 1080, body: floor(), lit: true },
      { id: 'frente', k: KF, z: 'front', lit: true, pieces: foreground() },
    ],
    props: [{ id: 'zapato', X: ROBOT_PEANA + 160, y: 900, svg: zapatoSuelo(), z: -10, si: 'c.zapatoSuelo' }],
    lights: [
      { X: 380, y: 60, r: 1100, color: '#f4f6ff', power: 0.6, fy: 880 },
      { X: 1180, y: 60, r: 1100, color: '#f4f6ff', power: 0.6, fy: 880 },
      { X: 1980, y: 60, r: 1100, color: '#f4f6ff', power: 0.6, fy: 880 },
      { X: 2780, y: 60, r: 1100, color: '#f4f6ff', power: 0.6, fy: 880 },
      { X: 3500, y: 60, r: 1100, color: '#f4f6ff', power: 0.55, fy: 880 },
      { X: (PERSIANA[0] + PERSIANA[1]) / 2, y: 177, r: 500, color: '#3ad06a', power: 0.3 },
    ],
    spots: {
      // Where the emergency lights are, so the dark (lights out) leaves them lit (chuchi.ts).
      salida: { x: (PERSIANA[0] + PERSIANA[1]) / 2, y: 177, r: 420 },
      tobogan: { x: ESTRUCTURA[1] - 560, y: 600, r: 380 },
      piscina: { x: (PISCINA[0] + PISCINA[1]) / 2, y: G - 200 },
      zapato: { x: ROBOT_PEANA + 160, y: 900 },
      robot: { x: (PERSIANA[0] + PERSIANA[1]) / 2, y: G },
    },
    zonas: {
      persiana: { u: (PERSIANA[0] + PERSIANA[1]) / 2, k: 1, w: PERSIANA[1] - PERSIANA[0], top: 250, bottom: G, X: PERSIANA[1] + 60, y: 880 },
      robot: { u: ROBOT_PEANA, k: 1, w: 300, top: G - 720, bottom: G, X: ROBOT_PEANA + 220, y: 890 },
      // Robi awake, planted in front of the exit.
      robotSalida: { u: (PERSIANA[0] + PERSIANA[1]) / 2, k: 1, w: 380, top: G - 700, bottom: G, X: PERSIANA[1] + 120, y: 885 },
      // The shoe on the floor once he drops it.
      zapato: { u: P.CX + P.f(900) * (ROBOT_PEANA + 160 - P.CX), k: P.f(900), w: 110, top: 850, bottom: 915, X: ROBOT_PEANA + 260, y: 905 },
      zapatero: { u: (ZAPATERO[0] + ZAPATERO[1]) / 2, k: 1, w: ZAPATERO[1] - ZAPATERO[0], top: G - 260, bottom: G, X: ZAPATERO[1] + 70, y: 885 },
      recepcion: { u: (RECEPCION[0] + RECEPCION[1]) / 2, k: 1, w: RECEPCION[1] - RECEPCION[0], top: G - 320, bottom: G, X: RECEPCION[1] + 40, y: 885 },
      gancho: { u: GANCHO.x, k: 1, w: 120, top: GANCHO.y - 30, bottom: GANCHO.y + 110, X: GANCHO.x, y: 870 },
      puertaPersonal: { u: (PERSONAL[0] + PERSONAL[1]) / 2, k: 1, w: PERSONAL[1] - PERSONAL[0], top: 340, bottom: G, X: PERSONAL[1] + 90, y: 885 },
      fiesta: { u: FIESTA[0] + 150, k: 1, w: 260, top: G - 280, bottom: G - 120, X: FIESTA[0] - 30, y: 885 },
      palo: { u: FIESTA[0] + 390, k: 1, w: 220, top: G - 250, bottom: G - 180, X: FIESTA[0] + 390, y: 875 },
      pinata: { u: FIESTA[0] + 330, k: 1, w: 160, top: 200, bottom: 360, X: FIESTA[0] + 330, y: 880 },
      red: { u: RED + 40, k: 1, w: 110, top: 270, bottom: G, X: RED + 40, y: 880 },
      // He rummages from the near end, so he never stands in front of what you tap.
      piscina: { u: (PISCINA[0] + PISCINA[1]) / 2, k: 1, w: PISCINA[1] - PISCINA[0], top: G - 240, bottom: G, X: PISCINA[0] - 50, y: 880 },
      tobogan: { u: ESTRUCTURA[1] - 300, k: 1, w: 400, top: 290, bottom: 640, X: ESTRUCTURA[1] - 380, y: 880 },
      canon: { u: CANON.x - 10, k: 1, w: 200, top: CANON.y - 100, bottom: CANON.y + 50, X: CANON.x + 190, y: 885 },
    },
  };
}
