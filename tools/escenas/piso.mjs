// Fran's flat at dusk: he wakes up from a nap on the sofa. Layout follows the
// floor plan the group sent (kitchen, fridge, fireplace, terrace, bathroom) plus
// the hall with the front door on the far right, which leads to the street.
//
// Layers, back to front:
//   exterior (0.4)  dusk sky and Usera rooftops, only seen through the glass
//   terraza  (0.88) the terrace behind the glass door
//   pared    (1)    back wall with the kitchen, fridge, fireplace, doors
//   suelo    (rows) floor with per-row parallax: real perspective as the camera pans
//   [characters and floor props, sorted by depth]
//   muebles  (1.42) foreground: dining table and the sofa (seen from behind)
import { bed, bowls } from './aceituna.mjs';
import {
  smooth, ellipse, path, stroke, g, shape, rect, circle, line, poly, polyD, rectD, rr, lin, rad, gpath,
  mat, box, bevel, tiles, foliage, pottedPlant, framed, persp, rng,
} from './kit.mjs';

export const P = persp({ HOR: 200, BASE: 800, CX: 1170 });
export const W = 3400;
/** Units per metre on the back wall. */
export const M = 250;

const WOOD = mat('#c99c69', '#a87b4f', '#e2b98a', '#6f4e2f', '#8e663f');
const WALNUT = mat('#7a5236', '#5c3c27', '#996b49', '#3a2416');
const STEEL = mat('#d4d8dc', '#aeb3ba', '#eef0f2', '#6c727a');
const CHARCOAL = mat('#4a4f57', '#353940', '#666c75', '#24272c');
const STONE = mat('#ddd5c8', '#bdb3a4', '#efe9df', '#857a6a');
const WHITE = mat('#f1ede6', '#d6d0c6', '#fbf9f5', '#9a9286');
const BRASS = mat('#c9a14f', '#9c7a35', '#e6c97c', '#5e4719');

const WALL = '#e6d9c6';
const WALL_LIVING = '#b9bb9f';
const WALL_HALL = '#dccbb3';

// Glass openings in the wall (cut out so the layers behind show through).
const KWIN = { x: 420, y: 250, w: 350, h: 250 };
const KHOLES = [[436, 266, 153, 218], [601, 266, 153, 218]];
const TDOOR = { x: 2295, y: 240, w: 330, h: 532 };
const THOLES = [[2331, 258, 158, 490], [2531, 258, 60, 490]];

// ---------------------------------------------------------------- back wall

function wall() {
  const out = [];
  // Plaster, by zones, with a soft darkening towards the ceiling.
  out.push(rect(0, 0, 1060, 805, WALL), rect(1060, 0, 1262, 805, WALL), rect(1322, 0, 968, 805, WALL_LIVING), rect(2290, 0, 600, 805, WALL), rect(2890, 0, 520, 805, WALL_HALL));
  out.push(gpath(rectD(0, 0, W, 805), lin(0, 60, 0, 420, [[0, '#3a2e3a', 0.2], [1, '#3a2e3a', 0]])));
  // Ceiling strip and cornice.
  out.push(rect(0, 0, W, 46, '#cbbfae'), rect(0, 46, W, 16, '#f0e8dc'), rect(0, 58, W, 4, '#bfb2a0'), rect(0, 62, W, 10, '#3a2e2a', { opacity: 0.08 }));
  // Corners between zones read as soft vertical shadows.
  for (const [x, w] of [[1322, 18], [2290, 14], [2890, 16]]) out.push(gpath(rectD(x, 62, w, 740), lin(x, 0, x + w, 0, [[0, '#2e2620', 0.22], [1, '#2e2620', 0]])));
  // Skirting board.
  out.push(rect(0, 772, W, 28, '#efe8dc'), rect(0, 772, W, 4, '#fbf7f0'), rect(0, 794, W, 6, '#cfc6b8'));
  return out.join('');
}

function bedroomDoor() {
  // Left edge: the open door of Fran's bedroom, dark inside.
  return [
    rect(-60, 250, 140, 522, '#2c2a36'),
    gpath(rectD(-60, 250, 140, 522), lin(0, 250, 0, 772, [[0, '#24222e'], [1, '#3a3442']])),
    path(smooth([[-20, 772, 'c'], [-20, 640], [40, 610], [80, 640, 'c'], [80, 772, 'c']]), '#3d3747', { opacity: 0.6 }),
    box(70, 236, 18, 536, WOOD, { r: 2, sh: 0, li: 0, lw: 1.4 }),
    box(-60, 236, 148, 16, WOOD, { r: 2, sh: 0.3, li: 0.2, lw: 1.4 }),
  ].join('');
}

function kitchen() {
  const out = [];
  // Backsplash: white subway tiles, around the window.
  const T = (x, y, w, h, s) => tiles(x, y, w, h, 56, 26, '#f3f0ea', '#d5cfc5', { seed: s, vary: ['#eeeae2', '#f7f5f0'] });
  out.push(T(90, 330, 330, 232, 1), T(770, 330, 280, 232, 2), T(420, 516, 350, 46, 3));
  out.push(rect(88, 328, 964, 3, '#c9c1b5'));
  // Upper cabinet (left) and the clock above the window.
  out.push(box(100, 196, 236, 262, WOOD, { r: 4, sh: 0.05, li: 0.03 }));
  out.push(bevel(108, 204, 108, 244, WOOD), bevel(220, 204, 108, 244, WOOD));
  out.push(box(196, 420, 8, 26, CHARCOAL, { r: 3, sh: 0, li: 0, side: false }), box(232, 420, 8, 26, CHARCOAL, { r: 3, sh: 0, li: 0, side: false }));
  out.push(rect(100, 458, 236, 10, '#3a2e2a', { opacity: 0.12 }));
  out.push(clock(595, 160));
  // Window: white frame, mullion and stone sill. The glass itself is a hole.
  out.push(box(KWIN.x, KWIN.y, KWIN.w, KWIN.h, WHITE, { r: 3, sh: 0, li: 0, side: false, lw: 1.6 }));
  out.push(rect(KWIN.x + 16, KWIN.y + 16, KWIN.w - 32, 4, '#cfc8bc'), rect(589, 266, 12, 218, '#e9e4db'), rect(598, 266, 3, 218, '#cfc8bc'));
  out.push(box(404, 498, 382, 18, STONE, { r: 3, sh: 0.3, li: 0.2 }));
  out.push(pottedPlant(500, 498, 0.9, 4), pottedPlant(690, 498, 0.75, 9, { tall: 1.25, leaves: ['#2d5a3c', '#3d7449', '#52905a', '#79b06e'] }));
  // Extractor hood.
  out.push(box(862, 62, 70, 240, STEEL, { r: 2, sh: 0, li: 0, lw: 1.4 }));
  out.push(shape(polyD([[850, 300], [944, 300], [978, 372], [816, 372]]), STEEL.base, [rect(816, 356, 170, 16, STEEL.shadow), rect(816, 300, 170, 8, STEEL.light)], STEEL.line, 1.6));
  out.push(rect(830, 372, 134, 6, '#585e66'));
  // Counter top and front edge.
  out.push(box(78, 548, 984, 16, STONE, { r: 3, sh: 0, li: 0.3, side: false }), box(78, 562, 984, 18, STONE, { r: 2, sh: 0.4, li: 0.1, side: false }));
  // Lower units.
  out.push(rect(90, 580, 960, 192, WOOD.deep));
  for (let i = 0; i < 3; i++) {
    out.push(bevel(94, 584 + i * 63, 172, 59, WOOD, { inset: 6 }));
    out.push(box(160, 604 + i * 63, 40, 7, CHARCOAL, { r: 3, sh: 0, li: 0, side: false, lw: 1 }));
  }
  for (const [x, w] of [[270, 108], [380, 108], [492, 104], [598, 100], [884, 82], [968, 80]]) {
    out.push(bevel(x, 584, w, 182, WOOD, { inset: 8 }));
  }
  for (const x of [366, 392, 584, 612, 952, 980]) out.push(box(x - 3.5, 602, 7, 40, CHARCOAL, { r: 3, sh: 0, li: 0, side: false, lw: 1 }));
  // Oven.
  out.push(box(702, 584, 178, 182, mat('#3b3f46', '#2b2e33', '#565b63', '#1c1e22'), { r: 3, sh: 0.05, li: 0.03 }));
  out.push(rect(714, 596, 154, 22, '#2b2e33'), ...[740, 770, 800, 830].map((x) => circle(x, 607, 6, '#9aa0a8')));
  out.push(gpath(rr(716, 634, 150, 112, 6), lin(0, 634, 0, 746, [[0, '#1d2026'], [1, '#2c2f36']])), rect(716, 626, 150, 6, '#7a8088', { rx: 3 }));
  out.push(path(smooth([[722, 640], [800, 638], [770, 700], [722, 720]]), '#ffffff', { opacity: 0.06 }));
  out.push(rect(90, 766, 960, 6, '#3a2e2a', { opacity: 0.25 }));
  // Sink + gooseneck tap under the window.
  out.push(rect(525, 548, 140, 5, '#9aa0a6', { rx: 2 }));
  out.push(stroke('M612 549L612 470Q612 446 636 446Q660 446 660 470L660 492', '#3b3e44', 8), stroke('M612 549L612 470Q612 446 636 446Q660 446 660 470L660 492', '#6b7078', 2.5, { opacity: 0.8 }));
  out.push(box(600, 540, 26, 10, CHARCOAL, { r: 3, sh: 0, li: 0, side: false, lw: 1 }));
  // Hob, with a red enamel pot and a moka pot (Spanish kitchen staples).
  out.push(rect(714, 545, 156, 5, '#1e1f23', { rx: 2 }));
  out.push(shape(rr(742, 486, 84, 60, 10), '#c8433a', [rect(742, 486, 84, 10, '#e06a5c'), rect(806, 486, 20, 60, '#9e2e27')], '#6e1c17', 1.6));
  out.push(box(736, 482, 96, 9, mat('#c8433a', '#9e2e27', '#e06a5c', '#6e1c17'), { r: 4, sh: 0.3, li: 0.3 }), circle(784, 476, 7, '#2a2a2e'));
  out.push(moka(470, 548));
  // Fruit bowl, oil bottle, chopping board.
  out.push(shape(smooth([[300, 520], [380, 520], [372, 540], [340, 548], [308, 540]]), '#e9e2d4', [rect(300, 536, 80, 12, '#c9c0ae')], '#8a8070', 1.4));
  for (const [x, y, c] of [[318, 514, '#f08a2e'], [338, 508, '#f3c33a'], [358, 514, '#f08a2e'], [346, 520, '#e8792a']]) out.push(shape(ellipse(x, y, 12, 11), c, [path(ellipse(x - 4, y - 4, 4, 3), '#ffffff', { opacity: 0.35 })], '#9a4a12', 1.2));
  out.push(shape(smooth([[402, 548, 'c'], [402, 478], [408, 470], [408, 452, 'c'], [416, 452, 'c'], [416, 470], [422, 478], [422, 548, 'c']]), '#8a9a3a', [rect(414, 452, 8, 96, '#6a7a26'), rect(403, 500, 18, 22, '#efe6c8')], '#4a5414', 1.3));
  out.push(shape(smooth([[980, 552, 'c'], [976, 450], [990, 432], [1004, 426], [1020, 432], [1032, 450], [1030, 552, 'c']]), '#d7aa72', [rect(1018, 426, 20, 130, '#b98a55'), path(ellipse(1004, 448, 7, 7), '#3a2e2a', { opacity: 0.85 })], '#7b5530', 1.5));
  return out.join('');
}

function clock(cx, cy) {
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ticks.push(line(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, cx + Math.cos(a) * 29, cy + Math.sin(a) * 29, '#3a3532', i % 3 ? 1.6 : 3));
  }
  // 20:35, the nap went on a bit long.
  const hA = ((8 + 35 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const mA = (35 / 60) * Math.PI * 2 - Math.PI / 2;
  return [
    circle(cx + 4, cy + 5, 37, '#000', { opacity: 0.12 }),
    shape(ellipse(cx, cy, 36, 36), '#2f3a44', [], '#1b232b', 1.5),
    circle(cx, cy, 31, '#f5f0e6'),
    ...ticks,
    line(cx, cy, cx + Math.cos(hA) * 15, cy + Math.sin(hA) * 15, '#2a2522', 4),
    line(cx, cy, cx + Math.cos(mA) * 24, cy + Math.sin(mA) * 24, '#2a2522', 2.5),
    circle(cx, cy, 3, '#c8433a'),
  ].join('');
}

function moka(x, base) {
  const m = mat('#c4c8cc', '#9ca1a8', '#e6e8ea', '#5c6168');
  return [
    shape(polyD([[x - 13, base], [x + 13, base], [x + 9, base - 20], [x + 12, base - 24], [x - 12, base - 24], [x - 9, base - 20]]), m.base, [rect(x + 4, base - 24, 10, 24, m.shadow)], m.line, 1.2),
    shape(polyD([[x - 12, base - 26], [x + 12, base - 26], [x + 8, base - 46], [x - 8, base - 46]]), m.base, [rect(x + 3, base - 46, 10, 20, m.shadow)], m.line, 1.2),
    shape(polyD([[x - 9, base - 46], [x + 9, base - 46], [x + 4, base - 54], [x - 4, base - 54]]), m.light, [], m.line, 1.2),
    stroke(`M${x - 12} ${base - 42}Q${x - 24} ${base - 38} ${x - 13} ${base - 28}`, '#2a2a2e', 3.5),
    path(`M${x + 9} ${base - 44}L${x + 18} ${base - 49}L${x + 10} ${base - 38}Z`, m.shadow),
  ].join('');
}

function fridge() {
  const out = [];
  // Niche walls and the cabinet above.
  out.push(rect(1058, 62, 16, 712, '#d2c5b2'), rect(1306, 62, 16, 712, '#d2c5b2'));
  out.push(box(1070, 140, 240, 146, WOOD, { r: 3, sh: 0.06, li: 0.03 }), bevel(1076, 146, 114, 134, WOOD), bevel(1190, 146, 114, 134, WOOD));
  out.push(rect(1070, 286, 240, 10, '#3a2e2a', { opacity: 0.18 }));
  // The fridge, two doors.
  out.push(rect(1078, 296, 224, 494, STEEL.line), box(1080, 298, 220, 304, STEEL, { r: 10, sh: 0.04, li: 0.02 }), box(1080, 606, 220, 166, STEEL, { r: 10, sh: 0.06, li: 0.03 }));
  out.push(gpath(rectD(1086, 304, 60, 290), lin(1086, 0, 1146, 0, [[0, '#ffffff', 0.35], [1, '#ffffff', 0]])));
  out.push(box(1092, 460, 10, 128, CHARCOAL, { r: 5, sh: 0, li: 0.1, side: false, lw: 1 }), box(1092, 618, 10, 82, CHARCOAL, { r: 5, sh: 0, li: 0.1, side: false, lw: 1 }));
  out.push(rect(1086, 772, 208, 18, '#3c4046'));
  // Magnets: a polaroid of Aceituna, Madrid's bear-and-tree, a shopping list.
  out.push(g(null, [
    rect(-34, -40, 68, 80, '#000', { opacity: 0.12, transform: 'translate(4 4)' }),
    rect(-34, -40, 68, 80, '#fbf8f2'),
    rect(-28, -34, 56, 54, '#9cc3d6'),
    path(smooth([[-28, 20, 'c'], [-28, 4], [-10, 0], [6, 2], [28, 6], [28, 20, 'c']]), '#7fae63'),
    path(smooth([[-10, 14], [-12, 2], [-4, -6], [8, -6], [14, 0], [12, 12]]), '#24232a'),
    path(smooth([[-4, -6], [-8, -16], [-2, -10]]), '#24232a'), path(smooth([[8, -6], [12, -16], [6, -10]]), '#24232a'),
    circle(-1, -1, 1.6, '#fff'), circle(7, -1, 1.6, '#fff'),
    circle(0, -38, 5, '#d0473c'),
  ], { transform: 'translate(1190 380) rotate(-6)' }));
  out.push(g(null, [
    rect(-26, -32, 52, 64, '#fffdf4'), ...[0, 1, 2, 3, 4].map((i) => line(-18, -18 + i * 10, 6 + (i % 2) * 10, -18 + i * 10, '#5a6ea0', 2)),
    circle(0, -30, 5, '#3a8a5a'),
  ], { transform: 'translate(1250 480) rotate(4)' }));
  out.push(g(null, [
    shape(smooth([[-10, 16], [-12, 0], [-6, -10], [6, -10], [12, 0], [10, 16]]), '#2f8a45', [], '#1d5a2c', 1.2),
    rect(-2, 14, 4, 8, '#7a4a2a'), circle(-3, -2, 2.4, '#d0473c'), circle(4, 5, 2.4, '#d0473c'), circle(2, -6, 2, '#d0473c'),
    path(smooth([[-14, 24], [-16, 14], [-8, 10], [-2, 16], [-4, 24]]), '#6b4a30'),
  ], { transform: 'translate(1150 650)' }));
  for (const [x, y, c] of [[1260, 330, '#f3c33a'], [1130, 545, '#3a7be0'], [1270, 690, '#e0533a']]) out.push(circle(x, y, 7, c), circle(x - 2, y - 2, 2.5, '#fff', { opacity: 0.5 }));
  return out.join('');
}

function living() {
  const out = [];
  // Wall sconce (on).
  out.push(box(1440, 392, 20, 30, BRASS, { r: 4, sh: 0.2, li: 0.2 }), stroke('M1450 400Q1450 370 1470 360', BRASS.shadow, 4));
  out.push(shape(polyD([[1446, 330], [1494, 330], [1508, 372], [1432, 372]]), '#efe2c8', [rect(1432, 362, 80, 10, '#d8c6a2')], '#8a7550', 1.4));
  // Sideboard with a record player and records.
  out.push(box(1360, 640, 190, 132, WALNUT, { r: 3, sh: 0.05 }), bevel(1366, 652, 88, 112, WALNUT), bevel(1456, 652, 88, 112, WALNUT));
  out.push(rect(1360, 772, 190, 6, '#2b1d14', { opacity: 0.4 }));
  out.push(box(1376, 614, 104, 26, mat('#3b3530', '#2a2622', '#5a524a', '#1a1714'), { r: 3 }), path(ellipse(1418, 616, 34, 5), '#1b1a1c'), circle(1418, 615, 4, '#c8433a'), stroke('M1466 612L1448 622', '#b8bcc0', 3));
  for (let i = 0; i < 7; i++) out.push(rect(1494 + i * 6, 586, 5, 54, ['#2a3c66', '#c8433a', '#e2b04a', '#2f6a55', '#d8d0c2', '#6a3a7a', '#1e1e22'][i], { rx: 1 }));
  // Fireplace: mantel, surround and firebox.
  out.push(rect(1586, 556, 462, 216, '#000', { opacity: 0.08, transform: 'translate(8 0)' }));
  out.push(box(1590, 556, 452, 216, STONE, { r: 3, sh: 0.04, li: 0.02 }));
  out.push(box(1556, 536, 518, 24, STONE, { r: 4, sh: 0.35, li: 0.25 }), rect(1556, 560, 518, 8, '#3a2e2a', { opacity: 0.15 }));
  out.push(gpath(rr(1672, 612, 288, 164, 4), lin(0, 612, 0, 776, [[0, '#1f1917'], [0.7, '#2e2420'], [1, '#3b2c24']])));
  for (let i = 0; i < 5; i++) out.push(line(1680, 630 + i * 28, 1952, 630 + i * 28, '#3e302a', 2, { opacity: 0.6 }));
  out.push(stroke(rr(1672, 612, 288, 164, 4), STONE.shadow, 3));
  // Logs on a grate (the embers are emissive, painted later).
  out.push(rect(1714, 752, 204, 8, '#1a1716'), rect(1724, 760, 6, 14, '#1a1716'), rect(1902, 760, 6, 14, '#1a1716'));
  const log = (x1, y1, x2, y2, r) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const nx = -Math.sin(a) * r;
    const ny = Math.cos(a) * r;
    return [
      shape(polyD([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]), '#5e3e2a', [path(polyD([[x1 + nx * 0.2, y1 + ny * 0.2], [x2 + nx * 0.2, y2 + ny * 0.2], [x2 + nx, y2 + ny], [x1 + nx, y1 + ny]]), '#4a2f1f')], '#2e1c12', 1.4),
      shape(ellipse(x2, y2, r * 0.6, r), '#c9a27a', [path(ellipse(x2, y2, r * 0.3, r * 0.5), '#a87e55')], '#6e4a2c', 1.2),
    ].join('');
  };
  out.push(log(1730, 748, 1900, 740, 14), log(1760, 734, 1880, 712, 12), log(1890, 742, 1790, 716, 11));
  // Mantel: plant, candle, books, photo of Aceituna.
  out.push(pottedPlant(1620, 536, 0.95, 21, { tall: 1.15 }));
  out.push(shape(rr(1688, 494, 20, 42, 3), '#f2ead8', [rect(1700, 494, 8, 42, '#d9ceb6')], '#9a8a68', 1.2), line(1698, 494, 1698, 486, '#2a2522', 1.5));
  out.push(box(1860, 516, 92, 20, mat('#2f5d7a', '#234a62', '#467a98', '#163044'), { r: 2 }), box(1866, 498, 82, 18, mat('#c8433a', '#9e2e27', '#e06a5c', '#6e1c17'), { r: 2 }), box(1872, 482, 70, 16, mat('#e2b04a', '#b8892d', '#f2cc72', '#7a5714'), { r: 2 }));
  out.push(g(null, [
    box(-30, -34, 60, 68, mat('#2c2a2a', '#1c1b1b', '#4a4646', '#121111'), { r: 2, sh: 0, li: 0, side: false }),
    rect(-24, -28, 48, 56, '#e8c9a0'),
    path(smooth([[-14, 26], [-16, 6], [-8, -6], [8, -6], [16, 6], [14, 26]]), '#24232a'),
    path(smooth([[-8, -4], [-12, -16], [-4, -8]]), '#24232a'), path(smooth([[8, -4], [12, -16], [4, -8]]), '#24232a'),
    circle(-4, 4, 1.8, '#fff'), circle(5, 4, 1.8, '#fff'), path(ellipse(0, 12, 4, 2.6), '#3a3a40'),
  ], { transform: 'translate(2006 502) rotate(3)' }));
  // Prints above the fireplace (abstract, as in the plan).
  out.push(framed(1612, 250, 168, 196, [rect(1640, 282, 112, 132, '#9fb79a'), rect(1652, 296, 72, 104, '#7f9f80'), circle(1730, 300, 16, '#d9844f')].join('')));
  out.push(framed(1852, 250, 168, 196, [rect(1880, 282, 112, 132, '#ecc46e'), rect(1898, 300, 76, 96, '#d9a441'), line(1888, 380, 1984, 300, '#c8433a', 3)].join('')));
  // Tall plant in a basket between the fireplace and the terrace.
  out.push(basketPlant(2170, 772, 1.05, 31));
  return out.join('');
}

function basketPlant(x, base, s, seed) {
  const r = rng(seed);
  const out = [];
  // Monstera-like leaves on long stems.
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.1;
    const len = (150 + r() * 120) * s;
    leaves.push([x + Math.cos(a) * len, base - 110 * s + Math.sin(a) * len * 0.9, a, (34 + r() * 18) * s]);
  }
  leaves.sort((a, b) => a[1] - b[1]);
  for (const [lx, ly] of leaves) out.push(stroke(`M${x} ${base - 100 * s}Q${(x + lx) / 2} ${ly + 30} ${lx} ${ly}`, '#3a6a3c', 3 * s));
  for (const [lx, ly, a, sz] of leaves) {
    const tone = r();
    const c = tone < 0.4 ? '#3f7a48' : tone < 0.75 ? '#4f8f52' : '#2f5d3a';
    out.push(g(null, [
      shape(smooth([[0, 0, 'c'], [sz * 0.5, -sz * 0.6], [sz * 1.25, -sz * 0.5], [sz * 1.6, 0, 'c'], [sz * 1.2, sz * 0.55], [sz * 0.5, sz * 0.6]]), c, [path(smooth([[0, 0], [sz * 1.6, 0], [sz * 1.2, -sz * 0.4], [sz * 0.5, -sz * 0.5]]), '#6aa864', { opacity: 0.55 }), ...[0.5, 0.85, 1.15].map((k) => path(ellipse(sz * k, sz * (0.28 - k * 0.05), sz * 0.08, sz * 0.16), WALL_LIVING))], '#234a2c', 1.3),
      stroke(`M0 0L${sz * 1.5} 0`, '#2a5530', 1.4),
    ], { transform: `translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${((a * 180) / Math.PI).toFixed(1)}) scale(1 ${r() < 0.5 ? 1 : -1})` }));
  }
  const bw = 58 * s;
  out.push(shape(polyD([[x - bw, base - 110 * s], [x + bw, base - 110 * s], [x + bw * 0.82, base], [x - bw * 0.82, base]]), '#c9a46a', [
    ...[0, 1, 2, 3, 4, 5].map((i) => rect(x - bw, base - 104 * s + i * 18 * s, bw * 2, 5 * s, '#a8824a')),
    rect(x + bw * 0.4, base - 110 * s, bw, 110 * s, '#a8824a', { opacity: 0.6 }),
  ], '#6e5228', 1.6));
  return out.join('');
}

function terraceDoor() {
  const out = [];
  out.push(box(TDOOR.x, TDOOR.y, TDOOR.w, TDOOR.h + 6, CHARCOAL, { r: 3, sh: 0, li: 0, side: false, lw: 1.6 }));
  out.push(rect(2513, 258, 12, 496, CHARCOAL.shadow), rect(2509, 258, 4, 496, CHARCOAL.light));
  out.push(rect(2313, 748, 300, 24, CHARCOAL.base), rect(2313, 748, 300, 4, CHARCOAL.light));
  out.push(box(2492, 456, 10, 104, mat('#2a2d32', '#1c1e22', '#4a4e55', '#121315'), { r: 5, sh: 0, li: 0.1, side: false, lw: 1 }));
  // Curtain gathered on the left, linen.
  out.push(shape(smooth([[2238, 70, 'c'], [2300, 70, 'c'], [2296, 300], [2310, 520], [2300, 772, 'c'], [2234, 772, 'c'], [2244, 520], [2230, 300]]), '#e9dfcc', [
    path(smooth([[2252, 70], [2262, 70], [2258, 400], [2266, 772], [2256, 772], [2248, 400]]), '#d2c4aa'),
    path(smooth([[2278, 70], [2286, 70], [2284, 400], [2290, 772], [2280, 772], [2274, 400]]), '#d2c4aa'),
  ], '#9a8a6a', 1.4));
  out.push(rect(2200, 60, 460, 8, '#3a3532', { rx: 4 }), circle(2200, 64, 7, '#3a3532'), circle(2660, 64, 7, '#3a3532'));
  return out.join('');
}

function bathroom() {
  const out = [];
  const x0 = 2705;
  const x1 = 2875;
  // Inside: blue tiles, the toilet, a small print; door leaf open to the left.
  out.push(tiles(x0, 262, x1 - x0, 440, 34, 34, '#a7c3d1', '#8eaebe', { bond: false, seed: 7, vary: ['#b3cdd9'] }));
  out.push(tiles(x0, 702, x1 - x0, 70, 26, 14, '#9aa1a8', '#80878f', { bond: true, seed: 8 }));
  out.push(gpath(rectD(x0, 262, x1 - x0, 510), lin(0, 262, 0, 772, [[0, '#1c2a3a', 0.35], [1, '#1c2a3a', 0.1]])));
  out.push(framed(2770, 360, 66, 80, [rect(2786, 376, 34, 48, '#e9a95e'), circle(2803, 392, 8, '#f6e2a0')].join(''), { frame: mat('#d8c1a0', '#b89e78', '#ecdcc0', '#7a6440') }));
  // Toilet, seen at an angle.
  out.push(shape(smooth([[2812, 610], [2870, 606], [2875, 640], [2862, 700], [2836, 704], [2820, 690], [2808, 650]]), '#f6f6f2', [rect(2850, 600, 30, 110, '#d8dcdc')], '#8a9090', 1.4));
  out.push(box(2826, 520, 50, 92, mat('#f6f6f2', '#d8dcdc', '#ffffff', '#8a9090'), { r: 6 }));
  out.push(box(2814, 700, 40, 56, mat('#eceeea', '#cfd3d3', '#ffffff', '#8a9090'), { r: 6, sh: 0.25 }));
  // Door leaf with a towel.
  out.push(shape(polyD([[x0, 262], [x0 + 44, 286], [x0 + 44, 762], [x0, 772]]), '#e6dccb', [rect(x0 + 30, 262, 20, 520, '#cfc3ae')], '#8e826a', 1.4));
  out.push(shape(smooth([[x0 + 8, 430, 'c'], [x0 + 40, 440, 'c'], [x0 + 42, 560], [x0 + 38, 600, 'c'], [x0 + 6, 590, 'c'], [x0 + 10, 520]]), '#d9844f', [rect(x0 + 6, 570, 40, 8, '#f0c9a0'), rect(x0 + 28, 430, 20, 180, '#b8683a')], '#7a3e1c', 1.3));
  // Casing.
  out.push(box(2688, 246, 20, 526, WOOD, { r: 2, sh: 0, li: 0, lw: 1.4 }), box(2872, 246, 20, 526, WOOD, { r: 2, sh: 0, li: 0, lw: 1.4 }), box(2688, 236, 204, 20, WOOD, { r: 2, sh: 0.3, li: 0.2, lw: 1.4 }));
  return out.join('');
}

function hall() {
  const out = [];
  // Coat rack: Fran's rain jacket, a cap and Aceituna's lead.
  out.push(box(2920, 296, 150, 18, WOOD, { r: 4, sh: 0.3, li: 0.2 }));
  for (const x of [2944, 2994, 3044]) out.push(stroke(`M${x} 312L${x} 326Q${x} 334 ${x + 8} 330`, BRASS.shadow, 4));
  out.push(shape(smooth([[2936, 320, 'c'], [2960, 318, 'c'], [2984, 340], [2992, 420], [2996, 560, 'c'], [2920, 566, 'c'], [2918, 470], [2914, 380], [2924, 336]]), '#6a7a3a', [
    path(smooth([[2950, 330], [2960, 420], [2958, 560], [2946, 560], [2944, 420]]), '#55642c'),
    rect(2972, 330, 30, 240, '#55642c'),
    rect(2918, 540, 80, 8, '#7d8e48'),
  ], '#353f16', 1.6));
  out.push(shape(smooth([[2978, 326], [2992, 314], [3010, 314], [3018, 330], [3030, 336], [3006, 340], [2984, 338]]), '#c8433a', [rect(2978, 332, 52, 8, '#9e2e27')], '#5e1612', 1.3));
  // Red lead coiled on the last hook.
  out.push(stroke('M3052 330C3070 360 3060 420 3046 450C3036 474 3060 500 3072 470C3084 440 3040 400 3038 440', '#c23a2e', 6), stroke('M3052 330C3070 360 3060 420 3046 450', '#e2604e', 2, { opacity: 0.7 }));
  out.push(box(3030, 440, 18, 12, BRASS, { r: 3, sh: 0.3, li: 0.3, lw: 1 }));
  // Console table with the key bowl and a small lamp (on).
  out.push(box(2920, 600, 150, 16, WALNUT, { r: 3, sh: 0.3, li: 0.2 }));
  for (const x of [2928, 3054]) out.push(box(x, 614, 8, 158, WALNUT, { r: 2, sh: 0, li: 0, lw: 1.2 }));
  out.push(rect(2928, 700, 134, 6, WALNUT.shadow));
  out.push(shape(smooth([[2952, 586], [3004, 586], [2998, 600], [2978, 604], [2958, 600]]), '#3f6f8f', [rect(2952, 596, 52, 8, '#2c5470')], '#183248', 1.3));
  out.push(stroke('M2966 588L2976 580L2984 588', '#d9c27a', 2.5), circle(2988, 584, 4, '#c8a04a'));
  out.push(box(3032, 560, 20, 40, mat('#e9e2d4', '#c9c0ae', '#f7f3ea', '#8a8070'), { r: 8 }));
  out.push(shape(polyD([[3022, 514], [3062, 514], [3070, 552], [3014, 552]]), '#f2e2c0', [rect(3014, 544, 60, 8, '#d9c39a')], '#8a7550', 1.3));
  // Front door: walnut, four panels, brass knob, peephole and chain.
  out.push(box(3084, 236, 224, 18, WOOD, { r: 2, sh: 0.3, li: 0.2 }), box(3084, 250, 18, 522, WOOD, { r: 2, sh: 0, li: 0 }), box(3290, 250, 18, 522, WOOD, { r: 2, sh: 0, li: 0 }));
  out.push(box(3102, 254, 188, 518, WALNUT, { r: 2, sh: 0.02, li: 0.01 }));
  for (const [x, y, w, h] of [[3118, 272, 72, 210], [3202, 272, 72, 210], [3118, 500, 72, 250], [3202, 500, 72, 250]]) out.push(bevel(x, y, w, h, WALNUT, { inset: 9 }));
  out.push(circle(3196, 400, 5, '#d4b26a'), circle(3196, 400, 2.2, '#1a1410'));
  out.push(box(3264, 520, 18, 46, BRASS, { r: 6 }), circle(3256, 536, 10, BRASS.base), circle(3253, 533, 4, BRASS.light));
  out.push(stroke('M3270 470Q3250 486 3262 498', '#b8bcc0', 2.5), circle(3272, 468, 3.5, '#9aa0a6'));
  // Intercom handset (the telefonillo) and the light switch.
  out.push(box(3332, 420, 46, 120, mat('#e8e0cc', '#cbc1a8', '#f6f1e4', '#8a7f62'), { r: 6 }));
  out.push(box(3340, 430, 30, 96, mat('#efe8d6', '#d6ccb2', '#fbf8ee', '#8a7f62'), { r: 10, sh: 0.2 }), stroke('M3378 500Q3392 520 3380 540', '#6a6250', 2));
  out.push(box(3336, 590, 30, 40, WHITE, { r: 3 }), rect(3346, 600, 10, 18, '#d6d0c6', { rx: 2 }));
  out.push(gpath(rectD(3370, 62, 30, 740), lin(3370, 0, 3400, 0, [[0, '#2e2620', 0], [1, '#2e2620', 0.3]])));
  return out.join('');
}

function backWall() {
  const holes = [...KHOLES, ...THOLES].map(([x, y, w, h]) => rect(x, y, w, h, 'black')).join('');
  const body = [wall(), bedroomDoor(), kitchen(), fridge(), living(), terraceDoor(), bathroom(), hall()].join('');
  // Faint reflections on the glass, drawn on top of the cut-outs.
  const glass = [...KHOLES, ...THOLES].map(([x, y, w, h]) => [
    rect(x, y, w, h, '#c9d6ec', { opacity: 0.08 }),
    path(polyD([[x + w * 0.15, y], [x + w * 0.45, y], [x + w * 0.05, y + h * 0.55], [x, y + h * 0.55], [x, y + h * 0.3]]), '#ffffff', { opacity: 0.07 }),
  ].join('')).join('');
  return `<mask id="huecos" maskUnits="userSpaceOnUse" x="-100" y="0" width="${W + 200}" height="1080"><rect x="-100" y="0" width="${W + 200}" height="1080" fill="white"/>${holes}</mask><g mask="url(#huecos)">${body}</g>${glass}`;
}

/** Light sources painted after the light map (they are the light). */
function wallEmissive() {
  const ember = [
    // Glowing embers under the logs and in their cracks.
    gpath(rectD(1700, 728, 232, 32), rad(1816, 756, 130, [[0, '#ffd27a'], [0.45, '#ff8a3a'], [1, '#c2401a', 0]], 0.25)),
    stroke('M1748 744L1790 740M1810 738L1870 736', '#ffb052', 2.5, { opacity: 0.9 }),
    stroke('M1772 728L1820 716M1846 720L1872 726', '#ff9a40', 2, { opacity: 0.8 }),
  ].join('');
  return [
    ember,
    // Sconce shade and console lamp shade, glowing through the fabric.
    gpath(polyD([[1448, 332], [1492, 332], [1505, 370], [1435, 370]]), lin(0, 332, 0, 370, [[0, '#ffe8b8'], [1, '#ffc878']])),
    gpath(polyD([[3024, 516], [3060, 516], [3068, 550], [3016, 550]]), lin(0, 516, 0, 550, [[0, '#ffe8b8'], [1, '#ffc070']])),
    // Candle flame.
    path(smooth([[1698, 470], [1703, 480], [1701, 488], [1695, 488], [1693, 480]]), '#ffd27a'),
    path(smooth([[1698, 476], [1700, 482], [1698, 486], [1696, 482]]), '#fff4d0'),
  ].join('');
}

// ---------------------------------------------------------------- outside

function exterior() {
  // Dusk over Usera from the third floor: sky, rooftops, the Cuatro Torres far away.
  const out = [];
  out.push(gpath(rectD(-900, 0, 4000, 800), lin(0, 0, 0, 760, [[0, '#26305e'], [0.35, '#4a4a82'], [0.62, '#93698e'], [0.8, '#e08a72'], [0.92, '#f6b27a'], [1, '#ffd29a']])));
  out.push(gpath(rectD(-900, 380, 4000, 420), rad(1500, 760, 900, [[0, '#ffd8a0', 0.7], [1, '#ffd8a0', 0]], 0.4)));
  const r = rng(77);
  // A few early stars.
  for (let i = 0; i < 40; i++) out.push(circle(-900 + r() * 4000, 20 + r() * 260, 0.8 + r() * 1.2, '#fff6e0', { opacity: 0.35 + r() * 0.5 }));
  // Cuatro Torres, very far and hazy.
  for (const [x, w, h, top] of [[1580, 30, 250, 'flat'], [1626, 34, 268, 'crown'], [1676, 30, 236, 'flat'], [1716, 34, 262, 'arch']]) {
    const y = 640 - h;
    out.push(rect(x, y, w, h, '#6a5a86'), rect(x + w * 0.6, y, w * 0.4, h, '#5e4f7a'));
    if (top === 'crown') out.push(path(polyD([[x - 2, y], [x + w + 2, y], [x + w - 4, y - 14], [x + 4, y - 14]]), '#6a5a86'));
    if (top === 'arch') out.push(path(`M${x} ${y}Q${x + w / 2} ${y - 26} ${x + w} ${y}Z`, '#6a5a86'));
    out.push(circle(x + w / 2, y - (top === 'flat' ? 2 : 14), 2.2, '#ff5a4a'));
  }
  // Rooftops band: brick blocks with tiled roofs, antennas, water tanks, lit windows.
  let x = -900;
  let seed = 3;
  while (x < 3100) {
    const rr2 = rng(seed++);
    const w = 160 + rr2() * 220;
    const top = 560 + rr2() * 90;
    const tone = ['#7a4e4a', '#6e4744', '#83564e', '#5f4446'][Math.floor(rr2() * 4)];
    out.push(rect(x, top, w, 900 - top, tone));
    out.push(rect(x, top, w, 8, '#9a6a5a'), rect(x + w - 18, top, 18, 900 - top, '#000', { opacity: 0.12 }));
    for (let wy = top + 34; wy < 900; wy += 58) {
      for (let wx = x + 22; wx < x + w - 30; wx += 52) {
        const lit = rr2() < 0.35;
        out.push(rect(wx, wy, 22, 28, lit ? (rr2() < 0.7 ? '#ffcf86' : '#cfe0ff') : '#3e3346', { rx: 2 }));
        if (!lit && rr2() < 0.5) out.push(rect(wx, wy, 22, 12 + rr2() * 14, '#8a6a5a'));
      }
    }
    if (rr2() < 0.6) out.push(line(x + w * 0.3, top, x + w * 0.3, top - 50, '#3e3346', 2), line(x + w * 0.3 - 16, top - 40, x + w * 0.3 + 16, top - 40, '#3e3346', 2), line(x + w * 0.3 - 10, top - 28, x + w * 0.3 + 10, top - 28, '#3e3346', 2));
    if (rr2() < 0.4) out.push(box(x + w * 0.65, top - 30, 40, 30, mat('#8a8a96', '#6a6a76', '#a6a6b0', '#4a4a56'), { r: 3, lw: 1 }));
    if (rr2() < 0.35) out.push(path(ellipse(x + w * 0.5, top - 10, 14, 10), '#c9c9d2'), line(x + w * 0.5, top - 10, x + w * 0.5 + 10, top + 4, '#4a4a56', 2));
    x += w + 6 + rr2() * 30;
  }
  return out.join('');
}

function terrace() {
  // Behind the glass: terracotta floor, white railing, an olive tree and the drying rack.
  const out = [];
  const yR = P.yOf(0.88);
  out.push(tiles(2120, yR, 600, 90, 40, 20, '#c47a52', '#a35e3c', { bond: true, seed: 12, vary: ['#b86e48', '#cf8a60'] }));
  out.push(rect(2120, yR - 8, 600, 10, '#e9e4da'));
  // Railing.
  out.push(rect(2120, yR - 216, 600, 10, '#f1ede6'), rect(2120, yR - 206, 600, 3, '#c9c3b8'));
  for (let x = 2130; x < 2720; x += 18) out.push(rect(x, yR - 206, 5, 200, '#ece8e0'));
  // Drying rack with Fran's teal T-shirt, a towel and socks.
  out.push(stroke(`M2350 ${yR}L2420 ${yR - 160}L2490 ${yR}`, '#b8bcc0', 3), stroke(`M2360 ${yR - 150}L2560 ${yR - 150}`, '#b8bcc0', 3));
  out.push(shape(smooth([[2380, yR - 150, 'c'], [2450, yR - 150, 'c'], [2462, yR - 128], [2448, yR - 124], [2446, yR - 70, 'c'], [2386, yR - 70, 'c'], [2384, yR - 124], [2370, yR - 128]]), '#2e8a8c', [rect(2430, yR - 150, 30, 90, '#1f6567')], '#154647', 1.4));
  out.push(shape(rr(2466, yR - 152, 50, 100, 4), '#f0c9a0', [rect(2466, yR - 70, 50, 8, '#d9844f')], '#9a6a40', 1.3));
  out.push(shape(rr(2526, yR - 152, 14, 40, 4), '#e9e4da', [], '#8a8070', 1), shape(rr(2544, yR - 152, 14, 44, 4), '#e9e4da', [], '#8a8070', 1));
  // Olive tree in a big pot.
  out.push(foliage(2230, yR - 230, 80, 70, ['#55663e', '#6e8050', '#8a9c66', '#a6b680'], 5, { n: 18 }));
  out.push(stroke(`M2226 ${yR - 60}Q2236 ${yR - 140} 2222 ${yR - 200}`, '#6e5a44', 7));
  out.push(shape(polyD([[2190, yR - 60], [2270, yR - 60], [2260, yR - 2], [2200, yR - 2]]), '#c4704a', [rect(2245, yR - 60, 25, 60, '#9c5235')], '#6d3420', 1.5));
  return out.join('');
}

// ---------------------------------------------------------------- floor

function floor() {
  const out = [];
  const { gp } = P;
  const kMax = P.f(1080) + 0.02;
  const quad = (X0, X1, k0, k1) => polyD([gp(X0, k0), gp(X1, k0), gp(X1, k1), gp(X0, k1)]);
  // Kitchen: hydraulic tiles (black, cream and terracotta), the classic Madrid flat floor.
  const KX0 = 60;
  const KX1 = 1066;
  const step = 64;
  const depths = [];
  for (let z = 1; z > 1 / kMax - 0.05; z -= 0.055) depths.push(1 / z);
  for (let X = KX0; X < KX1; X += step) {
    for (let i = 0; i < depths.length - 1; i++) {
      const k0 = depths[i];
      const k1 = depths[i + 1];
      const X1 = Math.min(KX1, X + step);
      out.push(path(quad(X + 1.5, X1 - 1.5, k0 + 0.004, k1 - 0.004), '#ede4d2'));
      // Motif: a terracotta diamond with a black centre, corners in black.
      const cx = (X + X1) / 2;
      const km = (k0 + k1) / 2;
      out.push(path(polyD([gp(cx, k0 + 0.006), gp(X1 - 4, km), gp(cx, k1 - 0.006), gp(X + 4, km)]), (i + Math.round(X / step)) % 2 ? '#c27a5e' : '#cc8a6a'));
      out.push(path(polyD([gp(cx, km - (k1 - k0) * 0.22), gp(cx + 12, km), gp(cx, km + (k1 - k0) * 0.22), gp(cx - 12, km)]), '#4a4446'));
      for (const [ax, ak] of [[X + 1.5, k0], [X1 - 1.5, k0], [X1 - 1.5, k1], [X + 1.5, k1]]) {
        const sx = ax < cx ? 1 : -1;
        const sk = ak < km ? 1 : -1;
        out.push(path(polyD([gp(ax, ak), gp(ax + sx * 14, ak), gp(ax, ak + sk * (k1 - k0) * 0.26)]), '#4a4446'));
      }
    }
  }
  out.push(path(quad(KX0 - 400, KX0, 1, kMax), '#a57a50'));
  // Oak parquet everywhere else: boards running away from the camera.
  const r = rng(41);
  const tones = ['#b78c5e', '#a87e52', '#c49a69', '#ad8456', '#bd9262'];
  for (let X = KX1; X < 3560; X += 34) {
    let z = 1 - r() * 0.15;
    while (z > 1 / kMax - 0.2) {
      const z1 = z - (0.16 + r() * 0.1);
      const k0 = 1 / z;
      const k1 = 1 / Math.max(z1, 0.3);
      out.push(path(quad(X, X + 34, Math.max(1, k0), Math.min(kMax + 0.3, k1)), tones[Math.floor(r() * tones.length)]));
      out.push(path(polyD([gp(X, Math.max(1, k0)), gp(X + 34, Math.max(1, k0)), gp(X + 34, Math.max(1, k0) + 0.006), gp(X, Math.max(1, k0) + 0.006)]), '#7e5a3a', { opacity: 0.7 }));
      z = z1;
    }
    out.push(stroke(`M${gp(X, 1).join(' ')}L${gp(X, kMax + 0.3).join(' ')}`, '#7e5a3a', 1.3, { opacity: 0.6 }));
  }
  // Threshold between kitchen tiles and parquet.
  out.push(path(quad(KX1 - 4, KX1 + 6, 1, kMax + 0.3), '#c9a27a'));
  // Hearth slab in front of the fireplace.
  out.push(path(quad(1576, 2056, 1, 1.06), STONE.base), path(quad(1576, 2056, 1.05, 1.062), STONE.shadow));
  // Kilim rug between the fireplace and the sofa.
  const rug = (X0, X1, k0, k1, c) => path(quad(X0, X1, k0, k1), c);
  out.push(rug(1520, 2110, 1.08, 1.38, '#e3c891'), rug(1534, 2096, 1.095, 1.365, '#a8472f'));
  for (const [a, b] of [[1.13, 1.16], [1.29, 1.32]]) out.push(rug(1534, 2096, a, b, '#2f3d5c'));
  for (let X = 1570; X < 2080; X += 64) {
    out.push(path(polyD([gp(X + 32, 1.18), gp(X + 58, 1.225), gp(X + 32, 1.27), gp(X + 6, 1.225)]), '#e3c891'));
    out.push(path(polyD([gp(X + 32, 1.205), gp(X + 44, 1.225), gp(X + 32, 1.245), gp(X + 20, 1.225)]), '#2f3d5c'));
  }
  for (let X = 1528; X < 2110; X += 14) out.push(stroke(`M${gp(X, 1.38).join(' ')}L${gp(X, 1.395).join(' ')}`, '#e3c891', 2));
  // Doormat by the front door.
  out.push(rug(3100, 3290, 1.02, 1.14, '#8a6a3c'), rug(3112, 3278, 1.03, 1.13, '#b98f55'));
  // Contact shadow along the wall and under the furniture that touches it.
  out.push(gpath(polyD([gp(-400, 1), gp(3600, 1), gp(3600, 1.05), gp(-400, 1.05)]), lin(0, 800, 0, 832, [[0, '#2a1e16', 0.35], [1, '#2a1e16', 0]])));
  return out.join('');
}

// ---------------------------------------------------------------- foreground

const KF = 1.42; // depth factor of the foreground furniture
const yF = P.yOf(KF); // their floor line, ~1052

function table() {
  const out = [];
  const u0 = 270;
  const u1 = 800;
  const top = yF - 0.76 * M * KF;
  const T = mat('#9a6a44', '#7a5034', '#b8845a', '#4a2e1c');
  // Chairs at both ends (bistro chairs, seen side on).
  const chair = (x, dir) => {
    const s = dir;
    return [
      stroke(`M${x} ${yF}L${x + 6 * s} ${yF - 150}L${x + 2 * s} ${yF - 330}`, T.line, 12),
      stroke(`M${x} ${yF}L${x + 6 * s} ${yF - 150}L${x + 2 * s} ${yF - 330}`, T.base, 8),
      stroke(`M${x + 90 * s} ${yF}L${x + 84 * s} ${yF - 150}`, T.line, 12), stroke(`M${x + 90 * s} ${yF}L${x + 84 * s} ${yF - 150}`, T.base, 8),
      box(Math.min(x, x + 96 * s) - 4, yF - 166, 104, 20, T, { r: 6, sh: 0.3, li: 0.3 }),
      box(Math.min(x - 2 * s, x + 14 * s) - 6, yF - 340, 24, 110, T, { r: 8 }),
    ].join('');
  };
  out.push(chair(u0 + 10, -1), chair(u1 - 10, 1));
  // Table: top seen slightly from above, two front legs.
  out.push(path(polyD([[u0 - 6, top - 22], [u1 + 6, top - 22], [u1 + 16, top + 4], [u0 - 16, top + 4]]), T.light));
  out.push(path(polyD([[u0 + 30, top - 18], [u1 - 90, top - 18], [u1 - 140, top + 2], [u0 + 10, top + 2]]), '#ffffff', { opacity: 0.08 }));
  out.push(box(u0 - 16, top + 2, u1 - u0 + 32, 26, T, { r: 3, sh: 0.3, li: 0.15 }));
  for (const x of [u0 + 4, u1 - 34]) out.push(box(x, top + 26, 30, yF - top - 26, T, { r: 3, sh: 0.05, li: 0 }));
  out.push(box(u0 + 34, top + 26, u1 - u0 - 68, 16, T, { r: 2, sh: 0.4, li: 0 }));
  // On the table: Fran's phone, a bowl of olives (a nod to the dog) and an empty can.
  out.push(shape(polyD([[u0 + 120, top - 12], [u0 + 186, top - 12], [u0 + 192, top - 2], [u0 + 116, top - 2]]), '#1d1f26', [rect(u0 + 120, top - 11, 66, 3, '#3a3e48')], '#0e0f13', 1));
  out.push(shape(smooth([[u0 + 300, top - 10], [u0 + 380, top - 10], [u0 + 370, top + 4], [u0 + 340, top + 8], [u0 + 310, top + 4]]), '#f0e8d8', [rect(u0 + 300, top, 80, 8, '#d0c6b2')], '#8a8070', 1.3));
  for (const [dx, dy] of [[318, -14], [334, -18], [350, -14], [364, -18], [342, -10], [326, -8]]) out.push(shape(ellipse(u0 + dx, top + dy, 9, 7), '#6b7a2e', [path(ellipse(u0 + dx - 3, top + dy - 2, 3, 2), '#a6b65a')], '#3a4410', 1));
  out.push(shape(rr(u0 + 430, top - 70, 32, 64, 5), '#c8433a', [rect(u0 + 452, top - 70, 10, 64, '#9e2e27'), rect(u0 + 430, top - 46, 32, 16, '#f2ead8')], '#6e1c17', 1.3));
  // Pendant lamp over the table (off), hanging from the ceiling out of frame.
  out.push(line(530, -40, 530, 70, '#2a2522', 3));
  out.push(shape(smooth([[470, 120], [482, 86], [530, 70], [578, 86], [590, 120], [576, 132], [484, 132]]), '#d9c7a0', [
    ...[0, 1, 2, 3].map((i) => stroke(`M${478 + i * 4} ${96 + i * 9}Q530 ${82 + i * 9} ${582 - i * 4} ${96 + i * 9}`, '#b8a274', 2)),
    rect(470, 118, 120, 14, '#b8a274'),
  ], '#7a6440', 1.6));
  return out.join('');
}

function sofa() {
  // Back to the camera, facing the fireplace. Rust fabric, a knitted throw and a cushion.
  const S = mat('#a4523a', '#7e3b28', '#c06a4e', '#5a2817', '#6a2f1f');
  const u0 = 1700;
  const u1 = 2470;
  const top = yF - 0.86 * M * KF;
  const arm = yF - 0.66 * M * KF;
  const out = [];
  // Cushion peeking over the back, right side.
  out.push(shape(smooth([[2270, top + 30], [2286, top - 30], [2350, top - 44], [2400, top - 24], [2404, top + 30]]), '#d9a441', [path(ellipse(2330, top - 20, 40, 12), '#ecc46e', { opacity: 0.7 })], '#7a5714', 1.6));
  // Armrests.
  for (const [a, b] of [[u0 - 40, u0 + 70], [u1 - 70, u1 + 40]]) {
    out.push(shape(smooth([[a, yF - 30, 'c'], [a, arm + 24], [a + 8, arm], [(a + b) / 2, arm - 8], [b - 8, arm], [b, arm + 24], [b, yF - 30, 'c']]), S.base, [rect(a, arm + 70, b - a, yF, S.shadow), path(ellipse((a + b) / 2, arm + 6, (b - a) * 0.4, 10), S.light, { opacity: 0.7 })], S.line, 2));
  }
  // Back panel.
  out.push(shape(smooth([[u0 + 40, yF - 30, 'c'], [u0 + 40, top + 40], [u0 + 70, top + 4], [(u0 + u1) / 2, top - 8], [u1 - 70, top + 4], [u1 - 40, top + 40], [u1 - 40, yF - 30, 'c']]), S.base, [
    path(smooth([[u0 + 40, top + 50], [(u0 + u1) / 2, top + 30], [u1 - 40, top + 50], [u1 - 40, top + 70], [u0 + 40, top + 70]]), S.light, { opacity: 0.45 }),
    rect(u0, yF - 120, u1 - u0, 120, S.shadow),
    ...[0.33, 0.66].map((k) => stroke(`M${u0 + 40 + (u1 - u0 - 80) * k} ${top + 20}L${u0 + 40 + (u1 - u0 - 80) * k} ${yF - 40}`, S.deep, 2.4, { opacity: 0.6 })),
  ], S.line, 2.2));
  // Knitted throw draped over the left of the back.
  out.push(shape(smooth([[u0 + 60, top + 10], [u0 + 160, top - 10], [u0 + 300, top - 4], [u0 + 320, top + 60], [u0 + 300, top + 190, 'c'], [u0 + 250, top + 170], [u0 + 200, top + 200, 'c'], [u0 + 150, top + 160], [u0 + 90, top + 190, 'c'], [u0 + 70, top + 90]]), '#ece2cc', [
    ...[0, 1, 2, 3, 4].map((i) => stroke(`M${u0 + 100 + i * 44} ${top}Q${u0 + 108 + i * 44} ${top + 90} ${u0 + 98 + i * 44} ${top + 180}`, '#d2c4a6', 5)),
    path(smooth([[u0 + 60, top + 10], [u0 + 300, top - 4], [u0 + 300, top + 20], [u0 + 60, top + 30]]), '#f8f2e4', { opacity: 0.7 }),
  ], '#9a8a68', 1.6));
  // Wooden feet.
  for (const x of [u0 - 20, u0 + 300, u1 - 320, u1 + 10]) out.push(box(x, yF - 30, 18, 30, mat('#6e4a2c', '#4e321c', '#8e6440', '#2e1c0e'), { r: 3 }));
  return out.join('');
}

const LAMP = { bx: 1600, sx: 1860, sy: 430 };

function floorLamp() {
  // Arc reading lamp at the sofa's left end; the inside of the shade is emissive.
  const { bx, sx, sy } = LAMP;
  return [
    shape(ellipse(bx, yF - 8, 46, 12), '#2a2b30', [path(ellipse(bx, yF - 12, 40, 8), '#3e4048')], '#141418', 1.4),
    stroke(`M${bx} ${yF - 14}L${bx} 360Q${bx} 200 ${bx + 130} 196Q${sx - 10} 196 ${sx} ${sy - 80}`, '#2f3036', 9),
    stroke(`M${bx - 2} ${yF - 14}L${bx - 2} 360Q${bx - 2} 204 ${bx + 130} 200`, '#5a5c66', 2.5, { opacity: 0.8 }),
    shape(smooth([[sx - 54, sy], [sx - 38, sy - 62], [sx, sy - 80], [sx + 38, sy - 62], [sx + 54, sy]]), '#2f3036', [rect(sx - 54, sy - 80, 108, 20, '#4a4c56')], '#141418', 1.6),
  ].join('');
}

function bigPlant() {
  // Big monstera at the far left, framing the start of the scene.
  return basketPlant(60, yF, 1.7, 55);
}

function frontEmissive() {
  return [
    // Arc lamp: warm inside of the shade.
    gpath(ellipse(LAMP.sx, LAMP.sy, 54, 9), lin(0, LAMP.sy - 9, 0, LAMP.sy + 9, [[0, '#ffe7b0'], [1, '#ffc066']])),
    // Phone face down... except for the notification light blinking on its edge.
    circle(456, yF - 0.76 * M * KF - 7, 2.2, '#7fe0a0'),
  ].join('');
}

// ---------------------------------------------------------------- scene

/** u-range a layer at depth factor k must cover for any phone width (16:9 to 21:9 and 4:3). */
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
  const ext = uRange(0.4);
  const fl = uRange(P.f(1080));
  return {
    id: 'piso',
    name: 'Casa de Fran',
    W,
    H: 1080,
    HOR: P.HOR,
    BASE: P.BASE,
    CX: P.CX,
    M,
    ambient: '#5f5d80',
    walk: { y0: 846, y1: 936, x0: 150, x1: 3330 },
    start: { X: 1830, y: 900 },
    layers: [
      { id: 'exterior', k: 0.4, x0: ext[0], x1: ext[1], y0: 0, y1: 800, body: exterior(), lit: false },
      { id: 'terraza', k: 0.88, x0: 2100, x1: 2720, y0: 240, y1: 780, body: terrace(), lit: true },
      {
        id: 'pared', k: 1, x0: -60, x1: W + 20, y0: 0, y1: 805, body: backWall(), lit: true, emissive: wallEmissive(),
        glows: [
          { x: 1470, y: 352, r: 120, color: '#ffc27a', a: 0.55 },
          { x: 3042, y: 534, r: 90, color: '#ffc27a', a: 0.5 },
          { x: 1698, y: 480, r: 34, color: '#ffd27a', a: 0.6 },
          { x: 1816, y: 750, r: 200, color: '#ff8a3a', a: 0.35 },
        ],
      },
      { id: 'suelo', floor: true, x0: fl[0], x1: fl[1], y0: 800, y1: 1080, body: floor(), lit: true },
      {
        id: 'muebles', k: KF, z: 'front', lit: true,
        pieces: [
          { x0: -260, x1: 330, y0: 400, y1: 1080, body: bigPlant() },
          { x0: 140, x1: 930, y0: -10, y1: 1080, body: table() },
          { x0: 1500, x1: 2560, y0: 140, y1: 1080, body: floorLamp() + sofa() },
        ],
        emissive: frontEmissive(),
        glows: [{ x: LAMP.sx, y: LAMP.sy + 4, r: 160, color: '#ffc878', a: 0.5 }],
      },
    ],
    props: [
      { id: 'cama', X: 2440, y: 870, svg: bed(), z: -40 },
      { id: 'cuencos', X: 1190, y: 850, svg: bowls(), z: -40 },
    ],
    // Lights in back-wall coordinates. `fy` is where the light pools on the floor.
    lights: [
      { X: 595, y: 380, r: 760, color: '#aaa6dc', power: 0.42, fy: 830 },
      { X: 2460, y: 500, r: 980, color: '#c4a8d8', power: 0.5, fy: 840 },
      { X: 1816, y: 720, r: 760, color: '#ff9446', power: 0.85, fy: 820, flat: 0.5 },
      { X: 1470, y: 360, r: 560, color: '#ffc27a', power: 0.55 },
      { X: 1653, y: 470, r: 640, color: '#ffcf8a', power: 0.55, fy: 880 },
      { X: 3042, y: 540, r: 480, color: '#ffc27a', power: 0.45 },
    ],
    // Dusk light through the terrace door, laid on the floor as a long shaft.
    shafts: [{ X0: 2331, X1: 2589, dX: -520, k1: 1.48, color: '#d6b0d8', power: 0.32 }],
    spots: {
      sofa: { u: 2085, k: KF, zx: 1960, zy: 640 },
      salida: { X: 3196, y: 860, label: 'Salir a la calle' },
      cama: { X: 2440, y: 870 },
      cuencos: { X: 1190, y: 850 },
    },
  };
}
