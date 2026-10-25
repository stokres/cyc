// Inside the Bar del Brío, chapter 2 (docs/CAPITULO2.md). A small neighbourhood bar at
// night: aluminium door and window to the street, the tobacco machine, a long steel
// counter with tapas and two beer taps, bottle shelves, the telly in the top corner,
// the football-pool sheet for the Christmas basket, the slot machine and the only toilet.
//
// Four scenes, bar0..bar3, with the same layout, zones, spots and props: the night
// «level» (the dream getting out of hand) only changes the paint and, at level 3, bends
// the lines. The drawing is generated once in a neutral palette and the level is applied
// to the generated SVG: colours are remapped (levels 2 and 3) and coordinates are bent
// (level 3), so there are no filters and nothing is deformed per frame.
//
// Layers, back to front:
//   calle   (0.5)  the street at night, only seen through the glass of the window and the door
//   pared   (1)    the back wall: facade, tobacco machine, shelves, pool sheet, slot machine corner, toilet
//   suelo   (rows) tiled floor with per-row parallax
//   [characters and floor props, sorted by depth: the counter, the stools, the slot machine, the coin]
//   techo   (1.4)  foreground at the top: tubes, pendant lamps, hams
//
// What moves (the telly, the tapas, the slot machine lights, the pool number, a few spinning
// pieces at level 3) is not here: src/capitulos/bar-vivo.ts draws it from the pieces
// that `piezasVivas()` describes, turned into bitmaps once.
import { smooth, ellipse, path, stroke, g, shape, rect, circle, line, poly, polyD, rectD, rr, lin, rad, gpath, mat, box, tiles, persp, rng, ao, sombra, f2 } from './kit.mjs';

export const P = persp({ HOR: 200, BASE: 800, CX: 1500 });
export const W = 3000;
/** Units per metre on the back wall. */
export const M = 250;
/** Back-plane units to character units (a character is 270 tall for 1.75 m). */
const A_PJ = 270 / (M * 1.75);

// ---------------------------------------------------------------- layout (back-plane units)

const FLOOR = 800;
const TILE_TOP = 530; // top of the tiled half of the walls
const CORNISA = 62;

export const BAR = { X: 1560, L: 1260, y: 868, alto: 262 }; // counter: centre, length, floor line of its front, height
export const KB = P.f(BAR.y);
// Left of the tap tower (counter x +100), so the tower does not hide her: between the olives and the taps.
const VERO = { X: 1520, y: 826 };
// Two on each side of Vero, so she is seen (and can be tapped) between them, at the taps.
const AMIGOS = { chuchi: 1080, pablo: 1330, fran: 1920, guille: 2170 };
const YA = 930; // the four friends stand here, in front of the counter
const TABURETES = { X: 1625, y: 922, xs: [-500, -250, 0, 250, 500] }; // offsets from X

const WIN = { x: 40, y: 262, w: 290, h: 330 };
const WIN_HUECOS = [[54, 276, 126, 302], [200, 276, 116, 302]];
const DOOR = { x: 372, y: 290, w: 200, h: 512 };
const DOOR_HUECOS = [[388, 306, 168, 430]];
const TAB = { x: 612, y: 372, w: 200, h: 428 }; // tobacco machine
const TRAS = { x0: 990, x1: 2150, top: 104, mostrador: 548 }; // back bar: shelves and its counter
const PORRA = { x: 1990, y: 168, w: 330, h: 392 };
const TELE = { x: 2590, y: 74, w: 250, h: 150 };
const TRAGA = { X: 2455, y: 818, w: 168, h: 440 }; // slot machine against the wall
const TRAGA_FUERA = { X: 2400, y: 858 };
const ENCHUFE = { X: 2548, y: 748 };
const DURO = { X: 2495, y: 814 };
const BANO = { x: 2610, y: 300, w: 200, h: 500 };

// ---------------------------------------------------------------- materials (daylight albedo)

const ALU = mat('#c4c8cc', '#9ca1a8', '#e2e4e6', '#5c6168');
const STEEL = mat('#d4d8dc', '#aeb3ba', '#eef0f2', '#6c727a');
const INOX = mat('#c3c9cf', '#8f969e', '#eaeef1', '#555c64');
const WOOD = mat('#8a5632', '#683f23', '#a8703f', '#3c2210', '#4e2e18');
const WOODD = mat('#5e3a22', '#43281a', '#7a4c2e', '#26150b');
const DARK = mat('#3b3f46', '#2b2e33', '#565b63', '#1c1e22');
const BRASS = mat('#c9a14f', '#9c7a35', '#e6c97c', '#5e4719');
const REDV = mat('#b3322e', '#8a2420', '#d4504a', '#4a1210');
const GREENP = mat('#2f6b4f', '#245340', '#43896a', '#15382a');

const WALL = '#dcc6a0';
const WALL_FACHADA = '#cdb48c';
const AZULEJO = '#e7ebdc';
const REJUNTE = '#bfc7b0';

// ---------------------------------------------------------------- the night's level

const hexRGB = (h) => {
  let s = h.slice(1);
  if (s.length === 3) s = s.replace(/./g, (c) => c + c);
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
function aHSL(hex) {
  const [r, g2, b] = hexRGB(hex).map((v) => v / 255);
  const mx = Math.max(r, g2, b);
  const mn = Math.min(r, g2, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g2 - b) / d + (g2 < b ? 6 : 0)) : mx === g2 ? (b - r) / d + 2 : (r - g2) / d + 4;
  return [h * 60, s, l];
}
function deHSL(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g2, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g2, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

/** Level 2: lilac, magenta and acid green mixed with the amber. */
function psicodelico(hex) {
  const [h, s, l] = aHSL(hex);
  if (l < 0.045 || l > 0.97) return hex;
  if (s < 0.16) return deHSL(272 + 48 * l, 0.34 + 0.3 * (1 - Math.abs(2 * l - 1)), l);
  if (h < 22 || h >= 340) return deHSL(322 + h * 0.2, Math.min(1, s * 1.1 + 0.12), l);
  if (h < 70) return deHSL(h, Math.min(1, s * 1.25 + 0.12), l);
  if (h < 175) return deHSL(88 + (h - 70) * 0.1, Math.min(1, s * 1.3 + 0.25), Math.min(0.9, l * 1.04));
  if (h < 265) return deHSL(266 + (h - 175) * 0.1, Math.min(1, s * 1.15 + 0.1), l);
  return deHSL(302 + (h - 265) * 0.1, Math.min(1, s * 1.15 + 0.12), l);
}

/** Level 3: a dream palette, pastel and a little sickly: coral, peach gold, turquoise, periwinkle. */
function sueno(hex) {
  const [h, s, l] = aHSL(hex);
  if (l < 0.045 || l > 0.97) return hex;
  const L = l * 0.82 + 0.1;
  if (s < 0.16) return deHSL(246 + 30 * l, 0.28 + 0.2 * (1 - Math.abs(2 * l - 1)), L);
  if (h < 22 || h >= 340) return deHSL(350, Math.min(0.9, s * 0.95 + 0.12), L);
  if (h < 70) return deHSL(38 + (h - 22) * 0.3, Math.min(0.9, s * 0.95 + 0.1), L);
  if (h < 175) return deHSL(172, Math.min(0.85, s * 1.1 + 0.15), L);
  if (h < 265) return deHSL(236, Math.min(0.85, s * 1.1 + 0.1), L);
  return deHSL(318, Math.min(0.85, s * 1.1 + 0.1), L);
}

/** Level 6: Vero's gold and wine, over the upside-down bar. Every hue is pulled into the reds, golds and ambers of her mouth. */
function tragado(hex) {
  const [h, s, l] = aHSL(hex);
  if (l < 0.045 || l > 0.97) return hex;
  return deHSL((335 + (h / 360) * 95) % 360, Math.min(1, s * 1.1 + 0.25), Math.min(0.88, l * 1.04 + 0.02));
}

const PALETA = [null, null, psicodelico, sueno, pasillo, reves, (hex) => tragado(reves(hex))];

/** Colours of the generated SVG (fill, stroke and gradient stops) through `fn`. */
function recolor(svg, fn) {
  return svg.replace(/(fill|stroke|stop-color)="(#[0-9a-fA-F]{3,6})"/g, (m, a, c) => `${a}="${fn(c)}"`);
}
const colorDe = (nivel) => PALETA[nivel] ?? ((c) => c);
/** Levels 3 and 4 are the same bar (curved lines, the sevens, the spinning bottles); level 4 only changes the palette. */
const esSueno = (nivel) => nivel === 3 || nivel === 4;

/**
 * The bend of level 3: every line of the bar sways. A smooth displacement in the scene's own
 * coordinates, calmer around the counter where Vero stands, and calmer still towards the floor
 * so the join with the wall keeps.
 */
export function doblar(x, y) {
  const centro = Math.min(1, Math.abs(x - 1600) / 800);
  const env = 0.4 + 0.6 * centro * centro * (3 - 2 * centro);
  const suelo = 1 - 0.55 * Math.max(0, Math.min(1, (y - 780) / 140));
  const dx = 26 * Math.sin(y / 205 + x / 1150) + 11 * Math.sin(y / 93 + 1.3);
  const dy = (24 * Math.sin(x / 270 + 0.6) + 12 * Math.sin(x / 650 + y / 420)) * env * suelo;
  return [x + dx * (0.55 + 0.45 * env), y + dy];
}

const num = (s) => parseFloat(s);

/** One path's `d` bent by `fn`: edges and curves are cut into short pieces, so lines really curve. */
function doblarD(d, fn) {
  const t = d.match(/[MLHVCQZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const P2 = (x, y) => {
    const [a, b] = fn(x, y);
    return `${f2(a)} ${f2(b)}`;
  };
  const recta = (x1, y1) => {
    const n = Math.max(1, Math.min(60, Math.ceil(Math.hypot(x1 - cx, y1 - cy) / 28)));
    for (let k = 1; k <= n; k++) out.push(`L${P2(cx + ((x1 - cx) * k) / n, cy + ((y1 - cy) * k) / n)}`);
    cx = x1;
    cy = y1;
  };
  const curva = (pts) => {
    const p = [[cx, cy], ...pts];
    let largo = 0;
    for (let k = 1; k < p.length; k++) largo += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
    const n = Math.max(4, Math.min(40, Math.ceil(largo / 16)));
    for (let k = 1; k <= n; k++) {
      const u = k / n;
      const v = 1 - u;
      let x;
      let y;
      if (p.length === 4) {
        x = v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0];
        y = v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1];
      } else {
        x = v * v * p[0][0] + 2 * v * u * p[1][0] + u * u * p[2][0];
        y = v * v * p[0][1] + 2 * v * u * p[1][1] + u * u * p[2][1];
      }
      out.push(`L${P2(x, y)}`);
    }
    const e = pts[pts.length - 1];
    cx = e[0];
    cy = e[1];
  };
  while (i < t.length) {
    const c = t[i++];
    if (c === 'M') {
      cx = sx = num(t[i++]);
      cy = sy = num(t[i++]);
      out.push(`M${P2(cx, cy)}`);
    } else if (c === 'L') recta(num(t[i++]), num(t[i++]));
    else if (c === 'H') recta(num(t[i++]), cy);
    else if (c === 'V') recta(cx, num(t[i++]));
    else if (c === 'C') {
      const a = [num(t[i++]), num(t[i++])];
      const b = [num(t[i++]), num(t[i++])];
      const e = [num(t[i++]), num(t[i++])];
      curva([a, b, e]);
    } else if (c === 'Q') {
      const a = [num(t[i++]), num(t[i++])];
      const e = [num(t[i++]), num(t[i++])];
      curva([a, e]);
    } else if (c === 'Z') {
      recta(sx, sy);
      out.push('Z');
    }
  }
  return out.join('');
}

const atributos = (a, quitar) =>
  [...a.matchAll(/([\w-]+)="([^"]*)"/g)]
    .filter(([, k]) => !quitar.includes(k))
    .map(([, k, v]) => ` ${k}="${v}"`)
    .join('');
const attr = (a, k) => a.match(new RegExp(`(?:^|\\s)${k}="([^"]*)"`))?.[1];

/** The whole SVG bent by `fn`: rectangles, circles and paths become bent paths. */
function doblarSvg(svg, fn) {
  return svg.replace(/<(rect|circle|path)\b([^>]*?)\/>/g, (m, tag, a) => {
    if (tag === 'path') return `<path d="${doblarD(attr(a, 'd'), fn)}"${atributos(a, ['d'])}/>`;
    if (tag === 'rect') {
      const x = num(attr(a, 'x') ?? 0);
      const y = num(attr(a, 'y') ?? 0);
      const w = num(attr(a, 'width'));
      const h = num(attr(a, 'height'));
      return `<path d="${doblarD(`M${x} ${y}H${x + w}V${y + h}H${x}Z`, fn)}"${atributos(a, ['x', 'y', 'width', 'height', 'rx', 'ry'])}/>`;
    }
    const cx = num(attr(a, 'cx'));
    const cy = num(attr(a, 'cy'));
    const r = num(attr(a, 'r'));
    const pts = Array.from({ length: 16 }, (_, k) => [cx + Math.cos((k / 16) * Math.PI * 2) * r, cy + Math.sin((k / 16) * Math.PI * 2) * r]);
    return `<path d="${doblarD(polyD(pts), fn)}"${atributos(a, ['cx', 'cy', 'r'])}/>`;
  });
}

/** The level applied to a generated drawing: palette first, then (level 3) the bend. */
function nivelar(svg, nivel, fn = doblar, curvar = true) {
  let s = svg;
  if (PALETA[nivel]) s = recolor(s, PALETA[nivel]);
  if (esSueno(nivel) && curvar) s = doblarSvg(s, fn);
  return s;
}

/** Text (canvas lettering): its colour and its place follow the level. */
function nivelarTexto(t, nivel) {
  const [x, y] = esSueno(nivel) ? doblar(t.x, t.y) : [t.x, t.y];
  return { ...t, x, y, color: PALETA[nivel] && t.color.startsWith('#') ? PALETA[nivel](t.color) : t.color };
}

// ---------------------------------------------------------------- small shared drawings

const E = (cx, cy, rx, ry, rot) => ellipse(cx, cy, rx, ry, rot);

/** Banded vertical glass sheen. */
const brillo = (x, y, w, h, a = 0.12) =>
  path(polyD([[x + w * 0.15, y], [x + w * 0.5, y], [x + w * 0.1, y + h * 0.7], [x, y + h * 0.7], [x, y + h * 0.3]]), '#ffffff', { opacity: a });

/** A wall light switch / socket plate. */
function placa(x, y) {
  return [box(x - 11, y - 16, 22, 32, mat('#efe9dc', '#cfc7b6', '#fbf8f0', '#8a8272'), { r: 4, lw: 1.2, sh: 0.2, li: 0.1, side: false }), rect(x - 4, y - 8, 8, 16, '#d8d0c0', { rx: 3 })].join('');
}

// ---------------------------------------------------------------- the street seen through the glass

function calle() {
  const out = [];
  const x0 = -420;
  const x1 = 1180;
  out.push(gpath(rectD(x0, 0, x1 - x0, 800), lin(0, 0, 0, 640, [[0, '#0e1230'], [0.5, '#1d2152'], [1, '#2c2a5e']])));
  const r = rng(11);
  for (let i = 0; i < 22; i++) out.push(circle(x0 + r() * (x1 - x0), 20 + r() * 150, 0.8 + r(), '#fff6e0', { opacity: 0.3 + r() * 0.4 }));
  // The block across the street: brick, lit windows, a first-floor balcony, a closed shop.
  const bw = 330;
  for (let x = x0, i = 0; x < x1; x += bw, i++) {
    const tone = ['#5a3a46', '#4e3446', '#654250'][i % 3];
    out.push(rect(x, 130 + (i % 2) * 40, bw - 8, 700, tone), rect(x + bw - 26, 130 + (i % 2) * 40, 18, 700, '#000', { opacity: 0.14 }));
    out.push(rect(x - 4, 124 + (i % 2) * 40, bw, 12, '#7a5560'));
    for (let wy = 190 + (i % 2) * 40; wy < 520; wy += 96) {
      for (let wx = x + 30; wx < x + bw - 70; wx += 72) {
        const on = r() < 0.38;
        out.push(rect(wx, wy, 36, 56, on ? (r() < 0.7 ? '#ffcf86' : '#cfe0ff') : '#2e2638', { rx: 3 }));
        out.push(rect(wx - 5, wy + 56, 46, 6, '#8a6a72'));
        if (!on && r() < 0.5) out.push(rect(wx, wy, 36, 14 + r() * 24, '#7a6470'));
      }
    }
    // Closed shop shutter at street level.
    out.push(rect(x + 24, 560, bw - 62, 170, '#4a4e58'));
    for (let sy = 566; sy < 726; sy += 14) out.push(rect(x + 24, sy, bw - 62, 4, '#3a3e48'));
    out.push(rect(x + 24, 548, bw - 62, 14, '#2e3038'));
  }
  // Pavement, kerb and wet road.
  out.push(rect(x0, 726, x1 - x0, 90, '#4d4e66'), rect(x0, 726, x1 - x0, 10, '#6a6b86'));
  for (let x = x0 + 20; x < x1; x += 120) out.push(rect(x, 760, 70, 4, '#3a3b52', { opacity: 0.8 }));
  out.push(rect(x0, 786, x1 - x0, 40, '#23243a'));
  // A parked car, dark blue, and a bin.
  out.push(shape(smooth([[760, 740, 'c'], [760, 690], [800, 676], [850, 636], [930, 628], [1000, 640], [1040, 676], [1080, 684], [1090, 740, 'c']]), '#2e3c6a', [rect(760, 700, 330, 40, '#222d52'), rect(840, 640, 120, 40, '#7a96c8', { opacity: 0.7 })], '#161d38', 1.4));
  for (const x of [830, 1030]) out.push(circle(x, 744, 24, '#16181f'), circle(x, 744, 11, '#8a8e98'));
  out.push(rect(250, 650, 54, 80, '#3d6a5a', { rx: 8 }), rect(246, 644, 62, 14, '#2a4e42', { rx: 6 }));
  // Two street lamps, sodium: pole, arm and the lit head.
  for (const x of [330, 700]) {
    out.push(rect(x - 5, 330, 10, 420, '#262a36'), rect(x - 12, 736, 24, 14, '#262a36', { rx: 4 }));
    out.push(stroke(`M${x} 336Q${x + 4} 300 ${x + 52} 298`, '#262a36', 9));
    out.push(shape(smooth([[x + 34, 296, 'c'], [x + 84, 296, 'c'], [x + 94, 312], [x + 24, 312]]), '#3a3e4c', [], '#161a24', 1.2));
  }
  return out.join('');
}
function calleEmisiva() {
  const out = [];
  for (const x of [330, 700]) out.push(gpath(polyD([[x + 36, 312], [x + 82, 312], [x + 72, 320], [x + 46, 320]]), lin(0, 312, 0, 320, [[0, '#fff0c8'], [1, '#ffb25a']])));
  // Light of the lamps on the pavement.
  for (const x of [330, 700]) out.push(gpath(E(x + 60, 736, 150, 26), rad(x + 60, 736, 150, [[0, '#ffb25a', 0.55], [1, '#ffb25a', 0]], 26 / 150)));
  return out.join('');
}
const CALLE_GLOWS = [330, 700].map((x) => ({ x: x + 59, y: 314, r: 190, color: '#ffb25a', a: 0.6 }));

// ---------------------------------------------------------------- back wall

function plano() {
  const out = [];
  out.push(rect(-60, 0, 1010, 810, WALL_FACHADA), rect(950, 0, 1560, 810, WALL), rect(2510, 0, 550, 810, WALL_FACHADA));
  out.push(gpath(rectD(-60, 0, W + 120, 810), lin(0, 60, 0, 440, [[0, '#3a2e3a', 0.24], [1, '#3a2e3a', 0]])));
  // Ceiling strip and cornice.
  out.push(rect(-60, 0, W + 120, 46, '#cbbfae'), rect(-60, 46, W + 120, 16, '#f0e8dc'), rect(-60, 58, W + 120, 4, '#bfb2a0'), rect(-60, 62, W + 120, 10, '#3a2e2a', { opacity: 0.1 }));
  // Soft vertical shadows where the planes change.
  for (const [x, w] of [[950, 16], [2510, 16]]) out.push(gpath(rectD(x, 62, w, 740), lin(x, 0, x + w, 0, [[0, '#2e2620', 0.2], [1, '#2e2620', 0]])));
  out.push(ao(-60, 62, W + 120, 120, 0.3));
  // Tiled half of the walls: pale green glaze, a dark green band and a cap.
  out.push(tiles(-60, TILE_TOP, W + 120, FLOOR - TILE_TOP + 40, 50, 50, AZULEJO, REJUNTE, { bond: false, seed: 3, vary: ['#dfe5d3', '#eef1e5'] }));
  out.push(rect(-60, TILE_TOP - 16, W + 120, 16, '#3f7a62'), rect(-60, TILE_TOP - 18, W + 120, 3, '#6fa88c'), rect(-60, TILE_TOP - 1, W + 120, 3, '#2c5a46'));
  for (let x = -40; x < W + 60; x += 100) out.push(rect(x, TILE_TOP - 12, 18, 8, '#58957a', { rx: 2 }));
  // Skirting and the shadow it throws on the floor line.
  out.push(rect(-60, 772, W + 120, 28, '#8a8e80'), rect(-60, 772, W + 120, 4, '#b5b9a8'), rect(-60, 800, W + 120, 40, '#7a7e70'));
  return out.join('');
}

function fachada() {
  const out = [];
  // Shop window: aluminium frame around two panes (the glass itself is a hole), sill, and a radiator under it.
  out.push(box(WIN.x, WIN.y, WIN.w, WIN.h, ALU, { r: 3, sh: 0, li: 0, side: false, lw: 1.6 }));
  out.push(rect(WIN.x + 14, WIN.y + 14, WIN.w - 28, 3, ALU.shadow), rect(180, 276, 20, 302, ALU.base), rect(180, 276, 4, 302, ALU.light), rect(196, 276, 4, 302, ALU.shadow));
  out.push(box(WIN.x - 8, WIN.y + WIN.h - 4, WIN.w + 16, 16, mat('#ddd5c8', '#bdb3a4', '#efe9df', '#857a6a'), { r: 3, sh: 0.3, li: 0.2 }));
  out.push(ao(WIN.x - 8, WIN.y + WIN.h + 12, WIN.w + 16, 40, 0.3));
  // Door: aluminium frame, glass, kick plate; sign above.
  out.push(box(DOOR.x, DOOR.y, DOOR.w, DOOR.h, ALU, { r: 3, sh: 0.02, li: 0.02, side: false, lw: 1.6 }));
  out.push(rect(DOOR.x + 3, DOOR.y + 3, 2.4, DOOR.h - 6, '#ffffff', { opacity: 0.55 }), rect(DOOR.x + DOOR.w - 6, DOOR.y + 3, 3, DOOR.h - 6, ALU.shadow, { opacity: 0.8 }));
  out.push(box(DOOR.x + 12, 740, DOOR.w - 24, 58, ALU, { r: 3, sh: 0.2, li: 0.2, lw: 1.2 }), rect(DOOR.x + 20, 752, DOOR.w - 40, 3, ALU.shadow, { opacity: 0.8 }));
  out.push(box(DOOR.x - 12, DOOR.y - 8, DOOR.w + 24, 14, ALU, { r: 3, sh: 0.3, li: 0.2 }), ao(DOOR.x - 12, DOOR.y + 6, DOOR.w + 24, 34, 0.3));
  // Green emergency sign (lit in `emisivo`).
  out.push(box(432, 232, 82, 32, mat('#3a8a5a', '#2a6a44', '#5ab07c', '#144a2a'), { r: 4, lw: 1.2 }));
  return out.join('');
}

/** What stands in front of the glass: café curtain, stickers, handle. */
function fachadaFrente() {
  const out = [];
  // Gingham half curtain on a brass rod, on the window.
  const cx0 = 56;
  const cw = 258;
  const cy0 = 440;
  const ch = 134;
  out.push(rect(cx0 - 6, cy0 - 8, cw + 12, 5, BRASS.base, { rx: 2.5 }), circle(cx0 - 6, cy0 - 5.5, 5, BRASS.base), circle(cx0 + cw + 6, cy0 - 5.5, 5, BRASS.base));
  const bordeInf = [];
  for (let i = 0; i < 9; i++) bordeInf.push(E(cx0 + (i + 0.5) * (cw / 9), cy0 + ch, cw / 18, 9));
  out.push(rect(cx0, cy0, cw, ch, '#f2ece0'), ...bordeInf.map((d) => path(d, '#f2ece0')));
  for (let x = cx0; x < cx0 + cw; x += 28) out.push(rect(x, cy0, 14, ch + 8, '#c4413a', { opacity: 0.55 }));
  for (let y = cy0; y < cy0 + ch + 8; y += 28) out.push(rect(cx0, y, cw, 14, '#c4413a', { opacity: 0.55 }));
  for (let i = 0; i < 6; i++) out.push(rect(cx0 + 14 + i * 44, cy0, 5, ch, '#8a6a52', { opacity: 0.18 }));
  out.push(ao(cx0, cy0, cw, 26, 0.3));
  // Reflections on both panes and the door.
  for (const [x, y, w, h] of [...WIN_HUECOS, ...DOOR_HUECOS]) out.push(rect(x, y, w, h, '#c9d6ec', { opacity: 0.07 }), brillo(x, y, w, h * 0.55, 0.08));
  // Safety band on the door glass and the push bar.
  out.push(rect(388, 470, 168, 22, '#f2f6ff', { opacity: 0.34 }), rect(388, 476, 168, 3, '#ffffff', { opacity: 0.4 }));
  out.push(box(398, 540, 8, 120, STEEL, { r: 4, sh: 0, li: 0.2, side: false, lw: 1.2 }), rect(398, 546, 6, 108, '#ffffff', { opacity: 0.4 }));
  out.push(box(536, 536, 14, 130, ALU, { r: 6, sh: 0.2, li: 0.2, lw: 1.2 }));
  return out.join('');
}

/** Cigarette vending machine, with its pack grid, keypad and tray. */
function maquinaTabaco() {
  const { x, y, w, h } = TAB;
  const cuerpo = mat('#2c3140', '#1f2330', '#454c60', '#11141c');
  const out = [];
  out.push(rect(x + 8, y + 10, w, h, '#000', { opacity: 0.14 }), ao(x - 6, FLOOR - 24, w + 12, 28, 0.35, -1));
  out.push(box(x, y, w, h, cuerpo, { r: 8, sh: 0.05, li: 0.02, lw: 1.6 }));
  // Header: red band with the lettering (lit).
  out.push(box(x + 8, y + 8, w - 16, 44, mat('#b32a2c', '#8a1f22', '#d4484a', '#4a0e10'), { r: 5, lw: 1.2 }));
  // Pack window: 5 columns by 6 rows of coloured packs.
  const gx = x + 14;
  const gy = y + 62;
  const gw = 120;
  const gh = 214;
  out.push(rect(gx - 4, gy - 4, gw + 8, gh + 8, '#10131a', { rx: 5 }));
  const r = rng(5);
  const cols = ['#c8433a', '#e8e2d0', '#2f5aa0', '#e2b04a', '#3a8a5a', '#8a3a6a', '#d8d0c0', '#1e1e24'];
  for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) out.push(rect(gx + 2 + i * 23.4, gy + 4 + j * 34.6, 21, 29, cols[Math.floor(r() * cols.length)], { rx: 2 }), rect(gx + 2 + i * 23.4, gy + 4 + j * 34.6, 21, 6, '#ffffff', { opacity: 0.25, rx: 2 }));
  out.push(brillo(gx, gy, gw, gh * 0.9, 0.1));
  // Right column: LCD, keypad, coin slot, bill slot.
  const kx = x + 146;
  out.push(rect(kx, gy, 42, 26, '#0e1812', { rx: 3 }), rect(kx + 3, gy + 3, 36, 20, '#5a9a6a', { rx: 2 }));
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) out.push(rect(kx + 2 + i * 14, gy + 38 + j * 18, 11, 13, '#8a909a', { rx: 3 }), rect(kx + 2 + i * 14, gy + 38 + j * 18, 11, 3, '#c4c8d0', { rx: 1.5 }));
  out.push(rect(kx, gy + 118, 42, 10, '#10131a', { rx: 3 }), rect(kx + 4, gy + 121, 34, 3, '#5a5f6a', { rx: 1.5 }));
  out.push(rect(kx + 6, gy + 140, 30, 22, '#1a1d26', { rx: 4 }), circle(kx + 21, gy + 151, 7, '#c9a14f'), circle(kx + 21, gy + 151, 3, '#2a2d36'));
  // Delivery tray.
  out.push(box(x + 14, y + 306, w - 28, 54, mat('#14171f', '#0c0e14', '#2a2e3a', '#05060a'), { r: 6, lw: 1.2 }), rect(x + 24, y + 316, w - 48, 8, '#3a3e4a', { rx: 4 }));
  out.push(rect(x + 14, y + 370, w - 28, 8, '#5a5f6a', { rx: 3 }));
  // Warning sticker.
  out.push(rect(x + 14, y + 386, 60, 28, '#e8d8a0', { rx: 3 }), rect(x + 20, y + 394, 48, 3, '#8a3a2a'), rect(x + 20, y + 402, 36, 3, '#5a4a3a'));
  out.push(gpath(rectD(x + w - 18, y + 4, 14, h - 8), lin(x + w - 18, 0, x + w - 4, 0, [[0, '#1a1222', 0], [1, '#1a1222', 0.35]])));
  return out.join('');
}

/** A small round wall clock. */
function reloj(cx, cy) {
  const out = [circle(cx + 3, cy + 4, 35, '#000', { opacity: 0.14 }), shape(E(cx, cy, 34, 34), '#2b2f38', [], '#14161c', 1.4), circle(cx, cy, 29, '#f3eee2')];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    out.push(line(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, cx + Math.cos(a) * 27, cy + Math.sin(a) * 27, '#3a3532', i % 3 ? 1.4 : 2.8));
  }
  // 22:10, the night is young.
  const h = ((10 + 10 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const m = (10 / 60) * Math.PI * 2 - Math.PI / 2;
  out.push(line(cx, cy, cx + Math.cos(h) * 14, cy + Math.sin(h) * 14, '#2a2522', 3.6), line(cx, cy, cx + Math.cos(m) * 22, cy + Math.sin(m) * 22, '#2a2522', 2.4), circle(cx, cy, 3, '#c8433a'));
  return out.join('');
}

/** Blackboard with the day's tapas (lettering is canvas text, see TEXTOS). */
function pizarra() {
  const x = 842;
  const y = 316;
  const w = 130;
  const h = 176;
  return [
    rect(x + 6, y + 8, w, h, '#000', { opacity: 0.16 }),
    box(x, y, w, h, WOOD, { r: 4, sh: 0.1, li: 0.08, lw: 1.4 }),
    rect(x + 8, y + 8, w - 16, h - 16, '#22302a', { rx: 2 }),
    gpath(rectD(x + 8, y + 8, w - 16, h - 16), lin(0, y + 8, 0, y + h, [[0, '#ffffff', 0.08], [1, '#ffffff', 0]])),
    stroke(`M${x + 20} ${y + 40}H${x + w - 20}`, '#e8e2d0', 1.4, { opacity: 0.6 }),
    rect(x + 12, y + h - 14, w - 24, 6, WOOD.light),
  ].join('');
}

/** Faded poster of a bullfight on the wall above the tobacco machine. */
function cartelToros() {
  return [
    rect(641, 202, 130, 150, '#000', { opacity: 0.14 }),
    rect(636, 192, 130, 150, '#e8d4a0'),
    rect(642, 198, 118, 138, '#d8bd7a'),
    path(smooth([[660, 316], [670, 262], [700, 240], [736, 262], [744, 316]]), '#a8322a'),
    path(smooth([[686, 250], [690, 226], [702, 218], [714, 226], [718, 250], [702, 258]]), '#2a2420'),
    path(smooth([[688, 220], [676, 208], [684, 224]]), '#2a2420'), path(smooth([[716, 220], [728, 208], [720, 224]]), '#2a2420'),
    rect(646, 204, 108, 8, '#a8322a'), rect(646, 322, 108, 8, '#a8322a'),
  ].join('');
}

// ---------------------------------------------------------------- shelves and bottles

const BOTELLAS = [
  // [kind, body, label, w, h]
  { id: 'vino', cuerpo: '#2f5a3a', etiqueta: '#e8e0c8', w: 26, h: 100, cuello: 34, gorro: '#c9a14f' },
  { id: 'vinoT', cuerpo: '#6a1820', etiqueta: '#e8e0c8', w: 26, h: 100, cuello: 34, gorro: '#2a1a1a' },
  { id: 'whisky', cuerpo: '#a8661c', etiqueta: '#f0e6c8', w: 34, h: 82, cuello: 20, gorro: '#2a1e14' },
  { id: 'ron', cuerpo: '#5a2e14', etiqueta: '#e8c860', w: 32, h: 88, cuello: 22, gorro: '#c9a14f' },
  { id: 'ginebra', cuerpo: '#8fbcd0', etiqueta: '#2f5aa0', w: 30, h: 90, cuello: 24, gorro: '#d8dcdc' },
  { id: 'vodka', cuerpo: '#cfd8dc', etiqueta: '#3a3e8a', w: 30, h: 94, cuello: 26, gorro: '#2f5aa0' },
  { id: 'licor', cuerpo: '#d8932a', etiqueta: '#f4ecd8', w: 30, h: 80, cuello: 20, gorro: '#8a3a1a' },
  { id: 'menta', cuerpo: '#3aa860', etiqueta: '#f4ecd8', w: 30, h: 80, cuello: 20, gorro: '#1e5a34' },
  { id: 'vermut', cuerpo: '#8a2a1a', etiqueta: '#e8d8a0', w: 32, h: 86, cuello: 24, gorro: '#c9a14f' },
  { id: 'anis', cuerpo: '#e8e4d0', etiqueta: '#c8433a', w: 30, h: 96, cuello: 28, gorro: '#c8433a' },
  { id: 'curacao', cuerpo: '#2f7ad0', etiqueta: '#f4ecd8', w: 30, h: 82, cuello: 20, gorro: '#d8dcdc' },
  { id: 'cava', cuerpo: '#1f3a2a', etiqueta: '#e2b04a', w: 36, h: 106, cuello: 40, gorro: '#e2b04a' },
];

function botella(b, x, base) {
  const { w, h, cuello } = b;
  const c = x + w / 2;
  const nw = Math.max(7, w * 0.3);
  const y0 = base - h;
  const d = smooth([[c - nw / 2, y0], [c + nw / 2, y0], [c + nw / 2, y0 + cuello * 0.7], [c + w / 2, y0 + cuello * 1.15, 'c'], [c + w / 2, base - 5, 'c'], [c + w / 2 - 4, base, 'c'], [c - w / 2 + 4, base, 'c'], [c - w / 2, base - 5, 'c'], [c - w / 2, y0 + cuello * 1.15, 'c'], [c - nw / 2, y0 + cuello * 0.7]]);
  return [
    path(d, b.cuerpo),
    rect(c + w * 0.18, y0 + cuello * 1.2, w * 0.32, h - cuello * 1.2 - 3, '#000', { opacity: 0.18 }),
    rect(c - w / 2 + 1, y0 + cuello * 1.2 + (h - cuello) * 0.32, w - 2, (h - cuello) * 0.34, b.etiqueta),
    rect(c - w / 2 + 4, y0 + cuello * 1.3, 3, h - cuello * 1.3 - 10, '#ffffff', { opacity: 0.36, rx: 1.5 }),
    rect(c - nw / 2 - 1, y0 - 4, nw + 2, 9, b.gorro, { rx: 2 }),
  ].join('');
}

/**
 * The bottles on the shelves: an irregular mix, or at level 2 sorted by colour along each
 * shelf. Returns the drawing plus the pieces that go spinning (level 3), which are drawn live.
 */
function estanteria(nivel, vivas) {
  const out = [];
  const { x0, x1, top, mostrador } = TRAS;
  // Dark slatted panel and the mirror strip behind the bottles.
  out.push(rect(x0 - 14, top - 8, x1 - x0 + 28, mostrador - top + 16, '#2c1a12'));
  out.push(gpath(rectD(x0, top, x1 - x0, mostrador - top), lin(0, top, 0, mostrador, [[0, '#4a2c1c'], [1, '#6a4028']])));
  for (let x = x0 + 40; x < x1; x += 80) out.push(rect(x, top, 6, mostrador - top, '#2c1a12', { opacity: 0.45 }));
  out.push(rect(x0 - 14, top - 14, x1 - x0 + 28, 12, WOOD.base, { rx: 3 }), rect(x0 - 14, top - 14, x1 - x0 + 28, 3, WOOD.light));
  const baldas = [212, 322, 432];
  const r = rng(nivel === 2 ? 17 : 17);
  let n = 0;
  const giran = [];
  for (const base of baldas) {
    // Fill the shelf from left to right with random bottles, leaving a small gap each.
    const fila = [];
    let x = x0 + 14;
    while (x < x1 - 40) {
      const b = BOTELLAS[Math.floor(r() * BOTELLAS.length)];
      if (x + b.w > x1 - 14) break;
      fila.push({ b, x });
      x += b.w + 3 + r() * 9;
    }
    // Level 2: the same bottles, side by side by colour.
    let orden = fila;
    if (nivel === 2) {
      const hue = (b) => (aHSL(b.cuerpo)[1] < 0.2 ? 400 + aHSL(b.cuerpo)[2] * 40 : aHSL(b.cuerpo)[0]);
      const ordenados = fila.map((f) => f.b).sort((a, c) => hue(a) - hue(c));
      let xx = fila[0].x;
      orden = ordenados.map((b, i) => {
        const p = { b, x: xx };
        xx += b.w + (fila[Math.min(i + 1, fila.length - 1)].x - fila[Math.min(i, fila.length - 1)].x - fila[i].b.w);
        return p;
      });
    }
    for (const { b, x: bx } of orden) {
      n++;
      // At level 3 a few small ones leave the shelf: the spinning ones are live pieces.
      if (esSueno(nivel) && vivas && b.h < 92 && (n % 11 === 3 || n % 17 === 5) && giran.length < 3) {
        giran.push({ b, x: bx, base });
        continue;
      }
      out.push(botella(b, bx, base));
    }
    // Board, light strip under it, and the shadow of the board on what is below.
    out.push(box(x0 - 14, base, x1 - x0 + 28, 12, WOOD, { r: 3, sh: 0.3, li: 0.3, lw: 1.2 }), ao(x0, base + 12, x1 - x0, 20, 0.35));
  }
  // Back-bar top, with the coffee machine and cups.
  out.push(box(x0 - 20, mostrador, x1 - x0 + 40, 14, INOX, { r: 3, sh: 0.3, li: 0.25 }));
  out.push(cafetera(1100, mostrador));
  out.push(shape(rr(1370, mostrador - 44, 56, 44, 8), '#e8e2d0', [rect(1396, mostrador - 44, 30, 44, '#cfc6b0')], '#8a8070', 1.2), ...[0, 1, 2, 3].map((i) => rect(1376 + i * 12, mostrador - 52, 10, 8, '#f4ecd8', { rx: 2 })));
  out.push(caja(1770, mostrador));
  return { svg: out.join(''), giran };
}

function cafetera(x, base) {
  const out = [];
  out.push(box(x, base - 96, 210, 96, INOX, { r: 10, sh: 0.1, li: 0.08, lw: 1.5 }));
  out.push(rect(x + 8, base - 90, 194, 22, '#2a2d36', { rx: 6 }), ...[0, 1, 2, 3].map((i) => circle(x + 30 + i * 50, base - 79, 6, ['#d4504a', '#3a8a5a', '#e2b04a', '#9aa0a8'][i])));
  for (const gx of [x + 48, x + 120]) out.push(rect(gx - 14, base - 66, 28, 20, '#4a4f58', { rx: 4 }), rect(gx - 3, base - 48, 6, 16, '#2a2d36'), rect(gx - 20, base - 32, 40, 4, '#8f969e', { rx: 2 }));
  out.push(rect(x + 176, base - 128, 28, 32, '#2a2d36', { rx: 5 }), rect(x + 180, base - 124, 20, 20, '#6a9ad0', { opacity: 0.8, rx: 3 }));
  out.push(rect(x + 20, base - 6, 170, 6, '#8f969e', { rx: 3 }));
  return out.join('');
}

function caja(x, base) {
  return [
    box(x, base - 50, 96, 50, mat('#2c3140', '#1f2330', '#454c60', '#11141c'), { r: 6, lw: 1.3 }),
    rect(x + 8, base - 94, 80, 46, '#14171f', { rx: 6 }), rect(x + 14, base - 88, 68, 28, '#5a9a6a', { rx: 3 }), rect(x + 18, base - 84, 30, 4, '#cfe8d4', { opacity: 0.8 }),
    rect(x + 10, base - 40, 76, 10, '#5a5f6a', { rx: 3 }), rect(x + 10, base - 24, 36, 8, '#8a909a', { rx: 3 }),
  ].join('');
}

// ---------------------------------------------------------------- the pool sheet (porra)

/** Fran's number in the pool (Jesús, 25 Oct 2026): the 5, written down by Vero as «Patxi» (his name as a comedian) in red pen, with a heart. */
const NUM_FRAN = 5;
const NOMBRES = ['Paco', 'Lola', 'Manoli', 'Toni', 'Chus', 'Marisa', 'Pepe', 'Carmen', 'Juanjo', 'Rosi', 'Nacho', 'Eva', 'Quique', 'Mari', 'Luis', 'Pili', 'Sergio', 'Ana', 'Rafa', 'Isa'];

/** Where each of the 100 cells of the pool sheet is (centre and size), numbered 1..100 in rows of ten. */
export function celdasPorra() {
  const gx = PORRA.x + 12;
  const gy = PORRA.y + 76;
  const cw = (PORRA.w - 24) / 10;
  const ch = (PORRA.h - 76 - 14) / 10;
  return Array.from({ length: 100 }, (_, i) => ({ n: i + 1, x: gx + (i % 10) * cw + cw / 2, y: gy + Math.floor(i / 10) * ch + ch / 2, w: cw, h: ch }));
}

function porraArte(nivel) {
  const out = [];
  const { x, y, w, h } = PORRA;
  // The cardboard, with a drawing pin at each top corner and a bit of tape.
  out.push(rect(x + 8, y + 10, w, h, '#000', { opacity: 0.16, rx: 3 }));
  out.push(box(x, y, w, h, mat('#f1e6a8', '#d8cc86', '#faf2c8', '#8a7e48'), { r: 3, sh: 0.04, li: 0.02, side: false, lw: 1.4 }));
  out.push(rect(x + 12, y + 12, w - 24, 52, '#c8433a', { rx: 6 }), rect(x + 12, y + 12, w - 24, 8, '#e06a5c', { rx: 4 }));
  const cs = celdasPorra();
  const gx = x + 12;
  const gy = y + 76;
  const cw = cs[0].w;
  const ch = cs[0].h;
  out.push(rect(gx, gy, cw * 10, ch * 10, '#fffdf0'));
  for (let i = 0; i <= 10; i++) out.push(line(gx + i * cw, gy, gx + i * cw, gy + ch * 10, '#3a5aa0', 1.4, { opacity: 0.7 }), line(gx, gy + i * ch, gx + cw * 10, gy + i * ch, '#3a5aa0', 1.4, { opacity: 0.7 }));
  // Names in pen: some cells have a scribble, some are still free. The 5 is Fran's: highlighted, with a red heart (the name is lettered in textosPorra).
  const r = rng(23);
  for (const c of cs) {
    if (c.n === NUM_FRAN) {
      out.push(rect(c.x - c.w / 2 + 1.5, c.y - c.h / 2 + 1.5, c.w - 3, c.h - 3, '#ffe27a', { opacity: 0.75 }));
      const hx = c.x + c.w * 0.27;
      const hy = c.y - c.h * 0.22;
      out.push(path(`M${f2(hx)} ${f2(hy + 5.9)}l-5.9 -5.9a3.4 3.4 0 0 1 5.9 -3.9a3.4 3.4 0 0 1 5.9 3.9z`, '#d0201c', { transform: `rotate(-12 ${f2(hx)} ${f2(hy)})` }));
      continue;
    }
    if (esSueno(nivel) || r() < 0.62) continue;
    const ancho = c.w * (0.5 + r() * 0.35);
    const yy = c.y + c.h * 0.16;
    let d = `M${f2(c.x - ancho / 2)} ${f2(yy)}`;
    for (let k = 1; k <= 5; k++) d += `L${f2(c.x - ancho / 2 + (ancho * k) / 5)} ${f2(yy + (k % 2 ? -2.6 : 2.2) * (0.6 + r() * 0.6))}`;
    out.push(stroke(d, r() < 0.7 ? '#2a3fa0' : '#a02a2a', 1.7, { opacity: 0.85 }));
  }
  // Pins and tape.
  out.push(circle(x + 14, y + 12, 6, '#d4504a'), circle(x + 12.5, y + 10.5, 2, '#fff', { opacity: 0.6 }), circle(x + w - 14, y + 12, 6, '#3a7be0'), circle(x + w - 15.5, y + 10.5, 2, '#fff', { opacity: 0.6 }));
  out.push(poly([[x + w / 2 - 28, y - 6], [x + w / 2 + 28, y - 9], [x + w / 2 + 29, y + 9], [x + w / 2 - 27, y + 12]], '#e8dcc0', { opacity: 0.7 }));
  // The cart with the basket drawn on the header: a little hamper with a bow.
  out.push(shape(smooth([[x + w - 66, y + 52], [x + w - 60, y + 38], [x + w - 34, y + 36], [x + w - 28, y + 52]]), '#c9a46a', [rect(x + w - 66, y + 44, 40, 4, '#a8824a')], '#6e5228', 1.2));
  out.push(path(smooth([[x + w - 52, y + 36], [x + w - 60, y + 24], [x + w - 46, y + 30]]), '#3a8a5a'), path(smooth([[x + w - 42, y + 36], [x + w - 34, y + 22], [x + w - 36, y + 34]]), '#d4504a'));
  return out.join('');
}

function textosPorra(nivel) {
  const { x, y, w } = PORRA;
  const cs = celdasPorra();
  const t = [
    { x: x + w / 2 - 20, y: y + 30, s: 'PORRA DE LA CESTA', size: 22, font: 'display', color: '#fff4d8', maxW: w - 100 },
    { x: x + w / 2 - 20, y: y + 52, s: 'DE NAVIDAD', size: 20, font: 'display', color: '#ffe27a', maxW: w - 140 },
  ];
  const r = rng(77);
  for (const c of cs) {
    const fran = c.n === NUM_FRAN;
    const siete = esSueno(nivel);
    t.push({ x: c.x - c.w / 2 + 3, y: c.y - c.h / 2 + 8, s: siete ? '7' : String(c.n), size: siete ? 14 : 9.5, font: 'body', weight: siete ? 800 : 700, color: siete ? '#c8433a' : '#6a7090', align: 'left' });
    if (fran) t.push({ x: c.x + 1, y: c.y + c.h * 0.2, s: 'Patxi', size: 11.5, font: 'body', weight: 800, color: '#d0201c', maxW: c.w - 3, rot: -0.07 });
    else if (!siete && r() < 0.13) t.push({ x: c.x, y: c.y + c.h * 0.2, s: NOMBRES[Math.floor(r() * NOMBRES.length)], size: 10.5, font: 'body', weight: 700, color: r() < 0.6 ? '#2a3fa0' : '#a02a2a', maxW: c.w - 3 });
    else if (siete && r() < 0.5) t.push({ x: c.x + 4, y: c.y + c.h * 0.22, s: '77', size: 14, font: 'body', weight: 800, color: '#2a3fa0', maxW: c.w - 6 });
  }
  return t;
}

// ---------------------------------------------------------------- telly bracket, toilet, slot machine corner

function soporteTele() {
  const { x, y, w, h } = TELE;
  const cx = x + w / 2;
  return [
    rect(cx - 6, y + h - 6, 12, 44, DARK.base), box(cx - 34, y + h + 32, 68, 10, DARK, { r: 3, lw: 1 }),
    stroke(`M${cx} ${y + h + 4}L${cx} 40`, DARK.shadow, 7),
    ao(x - 20, y + h + 8, w + 40, 50, 0.22),
    // The cable down the wall.
    stroke(`M${cx + 30} ${y + h + 6}Q${cx + 70} ${y + h + 80} ${cx + 40} ${y + h + 160}`, '#14161c', 3, { opacity: 0.7 }),
  ].join('');
}

function bano() {
  const { x, y, w, h } = BANO;
  const out = [];
  out.push(box(x - 16, y - 18, w + 32, 18, WOOD, { r: 2, sh: 0.3, li: 0.2, lw: 1.2 }), box(x - 16, y - 18, 16, h + 18, WOOD, { r: 2, sh: 0, li: 0, lw: 1.2 }), box(x + w, y - 18, 16, h + 18, WOOD, { r: 2, sh: 0, li: 0, lw: 1.2 }));
  out.push(box(x, y, w, h, GREENP, { r: 3, sh: 0.02, li: 0.02, lw: 1.6 }));
  for (const [py, ph] of [[y + 22, 190], [y + 230, 250]]) out.push(rect(x + 18, py, w - 36, ph, GREENP.shadow, { rx: 4 }), rect(x + 22, py + 4, w - 44, ph - 8, GREENP.base, { rx: 3 }), rect(x + 22, py + 4, w - 44, 3, GREENP.light, { rx: 1.5 }));
  out.push(box(x + w - 40, y + 250, 16, 56, mat('#c4c8cc', '#9ca1a8', '#e2e4e6', '#5c6168'), { r: 6, lw: 1.2 }), circle(x + w - 32, y + 244, 10, '#c4c8cc'), circle(x + w - 34, y + 242, 4, '#fff', { opacity: 0.6 }));
  out.push(ao(x - 16, y + h - 30, w + 32, 30, 0.3, -1));
  // Plate with the pictograms above the door (lit lettering in TEXTOS).
  out.push(box(x + 38, y - 66, 124, 40, mat('#e8e4da', '#cfc9b8', '#fbf8f0', '#7a7464'), { r: 5, lw: 1.3 }));
  for (const [dx, falda] of [[x + 62, false], [x + 98, true]]) {
    out.push(circle(dx, y - 55, 4.5, '#1f3a6a'));
    out.push(falda ? poly([[dx - 4, y - 49], [dx + 4, y - 49], [dx + 8, y - 36], [dx - 8, y - 36]], '#1f3a6a') : rect(dx - 4.5, y - 49, 9, 14, '#1f3a6a', { rx: 2 }));
  }
  return out.join('');
}

function extintor(x) {
  return [
    sombra(x, FLOOR - 4, 24, 5, 0.4),
    shape(smooth([[x - 18, 700, 'c'], [x - 20, 600], [x - 14, 540], [x, 528], [x + 14, 540], [x + 20, 600], [x + 18, 700, 'c']]), '#c8433a', [rect(x + 6, 528, 14, 172, '#9e2e27'), rect(x - 20, 590, 40, 40, '#f2ead8')], '#6e1c17', 1.4),
    rect(x - 8, 506, 16, 24, '#2a2a2e', { rx: 4 }), stroke(`M${x + 6} 512Q${x + 26} 510 ${x + 22} 540`, '#2a2a2e', 4), rect(x - 14, 504, 30, 6, '#3a3a40', { rx: 3 }),
  ].join('');
}

/** The part of the wall that shows when the slot machine is pulled out: dust, and the plug. */
function huellaTragaperras() {
  const x0 = 2402;
  const x1 = 2570;
  return [
    rect(x0 - 6, 372, x1 - x0 + 12, 440, '#7a6a52', { opacity: 0.22, rx: 4 }),
    gpath(rectD(x0 - 6, 372, x1 - x0 + 12, 440), lin(0, 372, 0, 812, [[0, '#2a2018', 0.18], [1, '#2a2018', 0.04]])),
    // Cobweb in the corner, a few dust bunnies low down.
    stroke('M2402 376L2470 440M2402 376L2436 456M2402 376L2420 400M2418 410Q2430 414 2440 408M2434 428Q2448 432 2456 424', '#e8e2d0', 1.1, { opacity: 0.55 }),
    ...[2440, 2478, 2520].map((px, i) => path(E(px, 805, 10 + i * 2, 4), '#cfc6b4', { opacity: 0.55 })),
  ].join('');
}

function enchufe() {
  const { X, y } = ENCHUFE;
  return [placa(X, y), circle(X - 3.5, y - 5, 1.8, '#2a2a2e'), circle(X + 3.5, y - 5, 1.8, '#2a2a2e'), circle(X - 3.5, y + 5, 1.8, '#2a2a2e'), circle(X + 3.5, y + 5, 1.8, '#2a2a2e')].join('');
}

// ---------------------------------------------------------------- textos (canvas lettering)

function textosCrudos(nivel) {
  return [
    { x: TAB.x + TAB.w / 2, y: TAB.y + 30, s: 'TABACO', size: 24, font: 'display', color: '#fff4e0', emissive: true, maxW: TAB.w - 36 },
    { x: 473, y: 248, s: 'SALIDA', size: 17, font: 'body', weight: 800, color: '#eaffea', emissive: true, maxW: 70 },
    { x: 907, y: 346, s: 'TAPAS', size: 19, font: 'display', color: '#f0e8d0', maxW: 96 },
    ...['Ensaladilla', 'Boquerones', 'Oreja', 'Tortilla', 'Croquetas'].map((s, i) => ({ x: 907, y: 372 + i * 22, s, size: 15, font: 'body', weight: 700, color: i % 2 ? '#f0e8d0' : '#f2c878', maxW: 96 })),
    ...textosPorra(nivel),
  ].filter((q) => q.s);
}

function textos(nivel) {
  return textosCrudos(nivel).map((q) => nivelarTexto(q, nivel));
}

// ---------------------------------------------------------------- the wall as a whole

/** The back wall as drawn, in the neutral palette and not bent: what `pared` and the levels 4 and 5 start from. */
function paredCruda(nivel) {
  const base = [plano(), fachada(), maquinaTabaco(), reloj(705, 150), cartelToros(), pizarra()];
  const est = estanteria(nivel, true);
  base.push(est.svg, porraArte(nivel), soporteTele(), enchufe(), bano(), extintor(2915));
  base.push(placa(2860, 600));
  const todos = base.join('');
  const huecos = [...WIN_HUECOS, ...DOOR_HUECOS].map(([x, y, w, h]) => rect(x, y, w, h, 'black')).join('');
  const cuerpo = `<mask id="huecos" maskUnits="userSpaceOnUse" x="-200" y="-100" width="${W + 400}" height="1300"><rect x="-200" y="-100" width="${W + 400}" height="1300" fill="white"/>${huecos}</mask><g mask="url(#huecos)">${todos}</g>${fachadaFrente()}`;
  return { cuerpo, giran: est.giran };
}

function pared(nivel) {
  const c = paredCruda(nivel);
  return { svg: nivelar(c.cuerpo, nivel), giran: c.giran };
}

function paredEmisiva(nivel) {
  const out = [];
  // Light strips under the shelves, the signs, the tobacco machine's panel, the light under the toilet door.
  for (const base of [212, 322, 432]) out.push(gpath(rectD(TRAS.x0 - 10, base + 12, TRAS.x1 - TRAS.x0 + 20, 5), lin(TRAS.x0, 0, TRAS.x1, 0, [[0, '#ffb45a', 0.75], [0.5, '#ffd9a0'], [1, '#ffb45a', 0.75]])));
  out.push(gpath(rectD(TAB.x + 8, TAB.y + 8, TAB.w - 16, 44), lin(0, TAB.y + 8, 0, TAB.y + 52, [[0, '#ff5a4a'], [1, '#d4302c']])));
  out.push(gpath(rectD(kxLcd().x, kxLcd().y, 36, 20), lin(0, 0, 0, 1, [[0, '#9affb0'], [1, '#5ad07a']])));
  out.push(gpath(rr(436, 236, 74, 24, 3), lin(0, 236, 0, 260, [[0, '#7affa8'], [1, '#2ed068']])));
  out.push(rect(BANO.x + 24, FLOOR - 4, BANO.w - 48, 4, '#ffd27a', { opacity: 0.85 }));
  return nivelar(out.join(''), nivel);
}
const kxLcd = () => ({ x: TAB.x + 146 + 3, y: TAB.y + 62 + 3 });

// ---------------------------------------------------------------- floor

/** u-range a layer at depth factor k must cover for any phone width (16:9 to 21:9 and 4:3). */
function uRange(k, pad = 60, P_ = P, W_ = W) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const vw of [1440, 1920, 2400, 2560]) {
    for (const c of [vw / 2, Math.max(vw / 2, W_ - vw / 2)]) {
      const off = vw / 2 - P_.CX + k * (P_.CX - c);
      lo = Math.min(lo, -off);
      hi = Math.max(hi, vw - off);
    }
  }
  return [Math.floor(lo - pad), Math.ceil(hi + pad)];
}

/** u-range of the street layer: what can be seen through the window and the door from any camera. */
function calleRango(k, P_ = P, W_ = W) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const vw of [1440, 1920, 2400, 2560]) {
    for (const c of [vw / 2, Math.max(vw / 2, W_ - vw / 2)]) {
      for (const X of [WIN.x, DOOR.x + DOOR.w]) {
        const u = P_.CX + (X - c) - k * (P_.CX - c);
        lo = Math.min(lo, u);
        hi = Math.max(hi, u);
      }
    }
  }
  return [Math.floor(lo - 90), Math.ceil(hi + 90)];
}

function suelo() {
  const out = [];
  const { gp, uOf, yOf } = P;
  const kMax = P.f(1080) + 0.3;
  const quad = (X0, X1, k0, k1) => polyD([gp(X0, k0), gp(X1, k0), gp(X1, k1), gp(X0, k1)]);
  const r = rng(61);
  // Grey-beige stoneware tiles, 40 cm, laid in a loose checker.
  out.push(path(quad(-500, 3500, 1, kMax), '#a39a84'));
  const prof = [];
  for (let z = 1; z > 1 / kMax - 0.06; z -= 0.05) prof.push(1 / z);
  const paso = 100;
  for (let X = -500, i = 0; X < 3500; X += paso, i++) {
    for (let j = 0; j < prof.length - 1; j++) {
      const k0 = prof[j];
      const k1 = prof[j + 1];
      const par = (i + j) % 2;
      const tono = par ? '#c6bda6' : '#b9af97';
      out.push(path(quad(X + 1.6, X + paso - 1.6, k0 + 0.003, k1 - 0.003), r() < 0.2 ? (par ? '#cdc4ae' : '#c0b69f') : tono));
      if (j < 3) out.push(path(quad(X + 1.6, X + paso - 1.6, k0 + 0.003, k0 + (k1 - k0) * 0.3), '#ffffff', { opacity: 0.06 }));
    }
  }
  // The wall's foot shadow and the shadow of everything that touches the wall.
  out.push(gpath(polyD([gp(-500, 1), gp(3500, 1), gp(3500, 1.06), gp(-500, 1.06)]), lin(0, 800, 0, 836, [[0, '#2a1e16', 0.4], [1, '#2a1e16', 0]])));
  const pie = (x0, x1, a = 0.4, fondo = 0.05, k = 1) => sombra(uOf((x0 + x1) / 2, k + fondo / 3), yOf(k + fondo / 3), ((x1 - x0) / 2 + 20) * (k + fondo / 3), (yOf(k + fondo) - yOf(k)) * 1.2, a);
  out.push(pie(TAB.x, TAB.x + TAB.w, 0.5, 0.05), pie(TRAGA.X - 90, TRAGA.X + 90, 0.5, 0.05, P.f(TRAGA.y)), pie(2896, 2934, 0.4, 0.04), pie(BANO.x, BANO.x + BANO.w, 0.25, 0.03));
  // The counter's shadow on the floor in front of it, and a warm spill of its light.
  const kb = KB;
  out.push(gpath(polyD([gp(BAR.X - BAR.L / 2 - 30, kb - 0.002), gp(BAR.X + BAR.L / 2 + 30, kb - 0.002), gp(BAR.X + BAR.L / 2 + 30, kb + 0.05), gp(BAR.X - BAR.L / 2 - 30, kb + 0.05)]), lin(0, BAR.y, 0, yOf(kb + 0.05), [[0, '#1a1222', 0.5], [1, '#1a1222', 0]])));
  out.push(gpath(polyD([gp(BAR.X - BAR.L / 2, kb + 0.02), gp(BAR.X + BAR.L / 2, kb + 0.02), gp(BAR.X + BAR.L / 2 + 80, kb + 0.24), gp(BAR.X - BAR.L / 2 - 80, kb + 0.24)]), lin(0, yOf(kb + 0.02), 0, yOf(kb + 0.24), [[0, '#ffb45a', 0.22], [1, '#ffb45a', 0]])));
  // Doormat with ridges.
  out.push(path(quad(386, 560, 1.0, 1.12), '#2f3036'), path(quad(394, 552, 1.012, 1.108), '#3c3e46'));
  for (let k = 1.02; k < 1.105; k += 0.02) out.push(path(quad(396, 550, k, k + 0.007), '#23242a'));
  // Litter at the foot of the counter, as in every bar: napkins, shells, olive stones, toothpicks.
  const q = rng(9);
  for (let n = 0; n < 40; n++) {
    const X = 960 + q() * 1220;
    const k = kb + 0.016 + q() * 0.17;
    const [u, y] = gp(X, k);
    const s = k * (0.8 + q() * 0.6);
    const tipo = q();
    if (tipo < 0.4) {
      out.push(path(E(u + 2 * s, y + 2.5 * s, 9 * s, 3.4 * s), '#000', { opacity: 0.14 }), path(smooth([[u - 8 * s, y], [u - 4 * s, y - 3.4 * s], [u + 3 * s, y - 4 * s], [u + 8 * s, y - 1 * s], [u + 6 * s, y + 2.4 * s], [u - 3 * s, y + 3 * s]]), '#f1ede2'), path(E(u - 1 * s, y - 1.4 * s, 4 * s, 1.4 * s), '#ffffff', { opacity: 0.8 }), path(E(u + 3 * s, y + 1.2 * s, 3.4 * s, 1.2 * s), '#cfc8b6', { opacity: 0.7 }));
    } else if (tipo < 0.6) out.push(path(E(u, y, 3 * s, 2 * s), '#000', { opacity: 0.15 }), stroke(`M${f2(u - 5 * s)} ${f2(y)}Q${f2(u)} ${f2(y - 6 * s)} ${f2(u + 5 * s)} ${f2(y + 0.5 * s)}`, '#e0834a', 2.6 * s), stroke(`M${f2(u - 4 * s)} ${f2(y)}Q${f2(u)} ${f2(y - 4 * s)} ${f2(u + 4 * s)} ${f2(y + 0.5 * s)}`, '#f0b08a', 1 * s));
    else if (tipo < 0.8) out.push(path(E(u, y, 3.2 * s, 2 * s), '#7a8a3a'), path(E(u - 0.8 * s, y - 0.5 * s, 1.2 * s, 0.7 * s), '#c8d28a', { opacity: 0.8 }));
    else out.push(line(u - 7 * s, y, u + 7 * s, y - 1.6 * s, '#d8b878', 1.5 * s));
  }
  return out.join('');
}

// ---------------------------------------------------------------- foreground at the top

const KT = 1.4;
const uT = (X) => P.CX + KT * (X - P.CX);

function tuboFluorescente(cx, len) {
  const x0 = cx - len / 2;
  return [
    ao(x0 - 10, 52, len + 20, 40, 0.3),
    box(x0, 8, len, 22, mat('#d8dcdf', '#aab0b6', '#f2f4f5', '#6c727a'), { r: 4, sh: 0.3, li: 0.25, lw: 1.3 }),
    rect(x0 + 8, 30, len - 16, 14, '#e8f0f6', { rx: 7 }),
    rect(x0 + 8, 30, len - 16, 4, '#ffffff', { rx: 2, opacity: 0.85 }),
    ...[0.1, 0.9].map((k) => rect(x0 + len * k - 4, 0, 8, 12, '#6c727a')),
    rect(x0 + 14, 8, 40, 3, '#fff', { opacity: 0.5 }),
  ].join('');
}
function tuboEmisivo(cx, len) {
  const x0 = cx - len / 2;
  return gpath(rr(x0 + 10, 32, len - 20, 10, 5), lin(0, 32, 0, 42, [[0, '#ffffff'], [1, '#dfeaff']]));
}

function lampara(cx) {
  return [
    stroke(`M${cx} -30L${cx} 112`, '#2a2522', 3),
    shape(smooth([[cx - 14, 116, 'c'], [cx - 8, 100], [cx - 4, 88, 'c'], [cx + 4, 88, 'c'], [cx + 8, 100], [cx + 14, 116, 'c']]), '#4a4f58', [], '#1c1e22', 1.2),
    shape(smooth([[cx - 54, 164, 'c'], [cx - 44, 134], [cx - 20, 118], [cx + 20, 118], [cx + 44, 134], [cx + 54, 164, 'c']]), '#d9a441', [path(smooth([[cx + 14, 118], [cx + 44, 134], [cx + 54, 164], [cx + 12, 164]]), '#b8862c'), path(smooth([[cx - 40, 140], [cx - 18, 124], [cx - 10, 130], [cx - 34, 150]]), '#f2cc72', { opacity: 0.9 })], '#7a5714', 1.4),
    rect(cx - 56, 160, 112, 8, '#c9a14f', { rx: 4 }),
  ].join('');
}
function lamparaEmisiva(cx) {
  return gpath(E(cx, 166, 40, 9), lin(0, 158, 0, 175, [[0, '#fff0c8'], [1, '#ffb45a']]));
}

function jamon(cx, flip = 1) {
  const f = flip;
  return [
    stroke(`M${cx} -30L${cx} 52`, '#6a4a2a', 3),
    path(E(cx + 3, 128, 36, 84), '#000', { opacity: 0.08 }),
    shape(smooth([[cx - 6 * f, 52, 'c'], [cx + 8 * f, 52, 'c'], [cx + 12 * f, 84], [cx + 28 * f, 120], [cx + 32 * f, 162], [cx + 20 * f, 198, 'c'], [cx - 14 * f, 206, 'c'], [cx - 32 * f, 176], [cx - 30 * f, 124], [cx - 14 * f, 84]]), '#7a3a2a', [
      path(smooth([[cx - 12 * f, 150], [cx - 30 * f, 124], [cx - 34 * f, 176], [cx - 14 * f, 206], [cx + 2 * f, 190]]), '#5a2418'),
      path(smooth([[cx + 4 * f, 120], [cx + 28 * f, 120], [cx + 34 * f, 162], [cx + 20 * f, 198], [cx + 6 * f, 160]]), '#9a523a', { opacity: 0.8 }),
      rect(cx - 40, 168, 80, 5, '#e8d8b8', { opacity: 0.8 }),
      path(smooth([[cx - 18 * f, 174], [cx + 22 * f, 174], [cx + 18 * f, 200], [cx - 12 * f, 206]]), '#e2a0a0', { opacity: 0.85 }),
      path(smooth([[cx - 14 * f, 182], [cx + 14 * f, 182], [cx + 10 * f, 198], [cx - 8 * f, 202]]), '#f4e8d8', { opacity: 0.85 }),
    ], '#3a160e', 1.4),
    // The cone for the drips.
    shape(polyD([[cx - 22, 214], [cx + 22, 214], [cx + 6, 262], [cx - 6, 262]]), '#f4eee0', [rect(cx + 4, 214, 20, 48, '#d8d0be')], '#8a8070', 1.2),
    rect(cx - 14, 52, 28, 16, '#c9a14f', { rx: 4 }),
  ].join('');
}

function sartaChorizos(cx, ancho) {
  const out = [];
  const x0 = cx - ancho / 2;
  out.push(stroke(`M${x0} 12Q${cx} 76 ${x0 + ancho} 12`, '#6a4a2a', 3));
  for (let i = 1; i < 8; i++) {
    const u = i / 8;
    const x = x0 + ancho * u;
    const y = 12 + 4 * u * (1 - u) * 32 + 18;
    out.push(shape(rr(x - 12, y, 24, 56, 10), i % 2 ? '#a8321e' : '#8a2616', [rect(x + 3, y, 9, 56, '#6a1a0e'), rect(x - 8, y + 6, 4, 40, '#e8785a', { opacity: 0.7 })], '#4a0e06', 1.2), rect(x - 12, y + 24, 24, 3, '#e8d8b8', { opacity: 0.8 }));
  }
  return out.join('');
}

function techoPiezas(nivel) {
  const piezas = [];
  const pz = (x0, x1, y0, y1, body, emissive) => piezas.push({ x0: Math.floor(x0), x1: Math.ceil(x1), y0, y1, body: nivelar(body, nivel), emissive: emissive ? nivelar(emissive, nivel) : undefined });
  for (const [X, len] of [[900, 440], [1500, 520], [2200, 440]]) {
    const u = uT(X);
    pz(u - len / 2 - 20, u + len / 2 + 20, -10, 110, tuboFluorescente(u, len), tuboEmisivo(u, len));
  }
  for (const X of [1330, 1625, 1920]) {
    const u = uT(X);
    pz(u - 170, u + 170, -30, 240, lampara(u), lamparaEmisiva(u));
  }
  pz(uT(1060) - 50, uT(1060) + 50, -30, 280, jamon(uT(1060)));
  pz(uT(1170) - 50, uT(1170) + 50, -30, 280, jamon(uT(1170), -1));
  pz(uT(760) - 130, uT(760) + 130, -10, 140, sartaChorizos(uT(760), 230));
  const glows = [1330, 1625, 1920].map((X) => ({ x: uT(X), y: 168, r: 150, color: '#ffc27a', a: 0.55 }));
  return { piezas, glows };
}

export const TUBOS = [[900, 440], [1500, 520], [2200, 440]].map(([X, len]) => ({ u: uT(X), y: 36, len }));

// ---------------------------------------------------------------- props (drawn in back-plane units, foot at the origin)

/** A prop's drawing, in back-plane units, ready for the actor (character units). */
const propSvg = (inner) => g(null, inner, { transform: `scale(${Math.round(A_PJ * 10000) / 10000})` });

/** Level applied to a prop. At level 3 it bends like the wall does at the place where it stands. */
function propNivel(svg, nivel, X, y, curvar = true) {
  if (esSueno(nivel) && curvar) {
    const k = P.f(y);
    const fn = (lx, ly) => {
      const sx = P.CX + k * (X + lx - P.CX);
      const sy = y + k * ly;
      const [dx, dy] = doblar(sx, sy);
      return [lx + (dx - sx) / k, ly + (dy - sy) / k];
    };
    return propSvg(nivelar(svg, nivel, fn));
  }
  return propSvg(nivelar(svg, nivel, doblar, false));
}

const CIMA = -BAR.alto; // front edge of the counter top, in the counter's own coordinates

// Where things stand on the counter (offsets from BAR.X).
export const EXPO = { x: -598, y: CIMA - 114, w: 216, h: 108 };
const TAPAS = [
  { id: 'ensaladilla', x: -552, y: CIMA - 56, fase: 0 },
  { id: 'boquerones', x: -462, y: CIMA - 56, fase: 1.6 },
  { id: 'tortilla', x: -552, y: CIMA - 8, fase: 3.1 },
  { id: 'oreja', x: -462, y: CIMA - 8, fase: 4.7 },
];

function barra() {
  const x0 = -BAR.L / 2;
  const x1 = BAR.L / 2;
  const H = BAR.alto;
  const out = [];
  out.push(sombra(0, 6, BAR.L / 2 + 50, 22, 0.55));
  // Plinth and the steel face, panelled.
  out.push(rect(x0 + 10, -30, BAR.L - 20, 30, '#23262c'), rect(x0 + 10, -30, BAR.L - 20, 3, '#4a5058'));
  out.push(gpath(rr(x0, -H + 6, BAR.L, H - 34, 8), lin(0, -H, 0, -28, [[0, '#c4cad1'], [0.18, '#a9b0b8'], [0.62, '#7e8690'], [1, '#575e68']])));
  out.push(stroke(rr(x0, -H + 6, BAR.L, H - 34, 8), '#5c6168', 2));
  const n = 7;
  for (let i = 1; i < n; i++) {
    const x = x0 + (BAR.L * i) / n;
    out.push(rect(x - 2, -H + 12, 4, H - 46, '#5c6168', { opacity: 0.65 }), rect(x + 2, -H + 12, 2, H - 46, '#ffffff', { opacity: 0.5 }));
  }
  // Brushed streaks, a warm reflection of the lamps low down and the bright glare high up.
  for (let i = 0; i < n; i++) {
    const x = x0 + (BAR.L * i) / n;
    out.push(path(polyD([[x + 26, -H + 12], [x + 54, -H + 12], [x + 16, -34], [x - 12, -34]]), '#ffffff', { opacity: 0.1 }));
    out.push(rect(x + 70, -H + 14, 3, H - 50, '#ffffff', { opacity: 0.08 }));
  }
  out.push(gpath(rectD(x0 + 4, -120, BAR.L - 8, 88), lin(0, -120, 0, -32, [[0, '#ffb45a', 0], [1, '#ffb45a', 0.48]])));
  out.push(rect(x0 + 4, -H + 52, BAR.L - 8, 7, '#5c6168', { opacity: 0.55 }), rect(x0 + 4, -H + 59, BAR.L - 8, 2.4, '#ffffff', { opacity: 0.55 }));
  // The foot rail on its brackets.
  out.push(line(x0 + 36, -60, x1 - 36, -60, '#6c727a', 13), line(x0 + 36, -61, x1 - 36, -61, '#d0d6dc', 9), line(x0 + 36, -64, x1 - 36, -64, '#ffffff', 3, { opacity: 0.8 }));
  for (let i = 0; i < 8; i++) {
    const x = x0 + 36 + ((BAR.L - 72) * i) / 7;
    out.push(circle(x, -60, 9, '#8f969e'), circle(x, -61, 6.4, '#e2e6ea'), circle(x - 1.8, -63, 2, '#fff', { opacity: 0.9 }));
  }
  // The top: its front lip, then the surface going back, with a lit streak and a few warm reflections.
  out.push(gpath(rr(x0 - 8, CIMA - 2, BAR.L + 16, 14, 6), lin(0, CIMA - 2, 0, CIMA + 12, [[0, '#ffffff'], [1, '#c3c9cf']])));
  out.push(stroke(rr(x0 - 8, CIMA - 2, BAR.L + 16, 14, 6), '#6c727a', 1.6));
  out.push(gpath(polyD([[x0 - 8, CIMA], [x1 + 8, CIMA], [x1 - 12, CIMA - 28], [x0 + 12, CIMA - 28]]), lin(0, CIMA - 28, 0, CIMA, [[0, '#9ea5ad'], [0.5, '#c8ced4'], [1, '#e6eaee']])));
  out.push(stroke(`M${x0 + 12} ${CIMA - 28}L${x1 - 12} ${CIMA - 28}`, '#8f969e', 1.6));
  for (const [xx, w] of [[-380, 150], [-70, 220], [330, 180], [560, 90]]) out.push(path(polyD([[xx, CIMA - 3], [xx + w, CIMA - 3], [xx + w - 14, CIMA - 24], [xx + 18, CIMA - 24]]), '#ffffff', { opacity: 0.22 }));
  for (const xx of [-200, 120, 480]) out.push(path(E(xx, CIMA - 12, 70, 5), '#ffb45a', { opacity: 0.2 }));
  // Rounded ends of the counter.
  for (const [x, s] of [[x0 - 8, -1], [x1 + 8, 1]]) out.push(path(smooth([[x, CIMA - 2, 'c'], [x + s * 10, CIMA + 6], [x + s * 8, CIMA + 28], [x, CIMA + 30, 'c']]), '#9aa1a9'));
  return out.join('');
}

/** The things on the counter: glass case (frame and glass only, the tapas inside are live), taps, dome, napkins. */
function barraEncima(vitrinaFija = false) {
  const out = [];
  const yc = CIMA + 4; // near edge of the top, where things stand
  // Glass case on the left: the tapas inside are drawn live under this (bar-vivo.ts). `vitrinaFija`
  // (the long bar's other counters, and the one on the ceiling): its inside is part of the drawing.
  const ex = EXPO;
  if (vitrinaFija) out.push(expositorFondo(), ...TAPAS.map((t) => tapaArte(t.id, t.x, t.y)));
  out.push(path(polyD([[ex.x - 6, ex.y - 2], [ex.x + ex.w + 6, ex.y - 2], [ex.x + ex.w - 4, ex.y - 24], [ex.x + 4, ex.y - 24]]), '#cfe6f0', { opacity: 0.28 }));
  out.push(stroke(`M${ex.x + 4} ${ex.y - 24}L${ex.x + ex.w - 4} ${ex.y - 24}`, INOX.base, 3), stroke(`M${ex.x + 4} ${ex.y - 24}L${ex.x - 6} ${ex.y - 2}M${ex.x + ex.w - 4} ${ex.y - 24}L${ex.x + ex.w + 6} ${ex.y - 2}`, INOX.base, 3));
  out.push(rect(ex.x - 6, ex.y - 5, ex.w + 12, 6, INOX.base, { rx: 3 }), rect(ex.x - 6, ex.y - 5, ex.w + 12, 2, '#fff', { opacity: 0.6 }));
  out.push(rect(ex.x - 6, yc - 8, ex.w + 12, 9, INOX.shadow, { rx: 3 }), rect(ex.x - 6, yc - 8, ex.w + 12, 2.4, '#fff', { opacity: 0.55 }));
  for (const x of [ex.x - 6, ex.x + ex.w]) out.push(rect(x, ex.y - 4, 6, ex.h + 8, INOX.base, { rx: 2 }), rect(x, ex.y - 4, 2, ex.h + 8, '#fff', { opacity: 0.55 }));
  out.push(rect(ex.x, ex.y - 4, ex.w, 5, '#ffd9a0'));
  out.push(path(polyD([[ex.x + 20, ex.y], [ex.x + 60, ex.y], [ex.x + 14, ex.y + ex.h * 0.82], [ex.x + 4, ex.y + ex.h * 0.82]]), '#ffffff', { opacity: 0.13 }), path(polyD([[ex.x + 100, ex.y], [ex.x + 112, ex.y], [ex.x + 70, ex.y + ex.h * 0.8], [ex.x + 62, ex.y + ex.h * 0.8]]), '#ffffff', { opacity: 0.1 }));
  // Napkin holder and a little bowl of olives.
  out.push(sombra(-268, yc - 2, 34, 6, 0.35), box(-292, yc - 46, 48, 46, INOX, { r: 4, sh: 0.2, li: 0.15, lw: 1.3 }));
  for (let i = 0; i < 6; i++) out.push(path(polyD([[-288 + i * 8, yc - 46], [-282 + i * 8, yc - 46], [-282 + i * 8 + (i - 3) * 2, yc - 66], [-292 + i * 8 + (i - 3) * 2, yc - 66]]), '#faf6ec'));
  out.push(rect(-292, yc - 28, 48, 4, INOX.shadow, { opacity: 0.6 }));
  out.push(sombra(-200, yc - 2, 34, 6, 0.3), shape(smooth([[-224, yc - 22], [-176, yc - 22], [-182, yc - 8], [-200, yc - 2], [-218, yc - 8]]), '#f0e8d8', [rect(-200, yc - 22, 26, 22, '#d0c6b0')], '#8a8070', 1.2));
  for (const [dx, dy] of [[-214, -24], [-204, -27], [-194, -25], [-208, -20], [-198, -21], [-188, -22]]) out.push(circle(dx + 14, yc + dy + 1, 5, '#6a8a30'), circle(dx + 12.5, yc + dy - 0.5, 1.5, '#c8d890', { opacity: 0.8 }));
  out.push(stroke(`M-196 ${yc - 40}L-203 ${yc - 22}`, '#d8b878', 1.6), circle(-196, yc - 41, 2.4, '#c8433a'));
  // The tap tower: drip tray, column, head with two spouts and two levers; a pint being pulled.
  const tx = 100;
  out.push(sombra(tx, yc - 3, 50, 8, 0.4));
  out.push(path(polyD([[tx - 46, yc - 2], [tx + 46, yc - 2], [tx + 38, yc - 16], [tx - 38, yc - 16]]), '#2a2d34'), path(polyD([[tx - 40, yc - 4], [tx + 40, yc - 4], [tx + 34, yc - 14], [tx - 34, yc - 14]]), '#4a4f58'));
  for (let i = -3; i <= 3; i++) out.push(line(tx + i * 11, yc - 4, tx + i * 9, yc - 14, '#2a2d34', 1.6));
  out.push(path(E(tx - 12, yc - 9, 14, 2.6), '#e8a83a', { opacity: 0.6 }));
  out.push(shape(rr(tx - 16, yc - 126, 32, 124, 10), '#c3c9cf', [rect(tx + 4, yc - 126, 12, 124, '#8f969e'), rect(tx - 12, yc - 124, 5, 120, '#fff', { opacity: 0.75 })], '#555c64', 1.4));
  out.push(shape(rr(tx - 34, yc - 156, 68, 38, 12), '#d8dde2', [rect(tx + 12, yc - 156, 22, 38, '#a3aab2'), rect(tx - 30, yc - 154, 56, 5, '#fff', { opacity: 0.7 })], '#555c64', 1.4));
  out.push(circle(tx - 12, yc - 138, 7, '#e2b04a'), circle(tx + 12, yc - 138, 7, '#c8433a'), circle(tx - 13.5, yc - 140, 2.2, '#fff', { opacity: 0.8 }), circle(tx + 10.5, yc - 140, 2.2, '#fff', { opacity: 0.8 }));
  for (const [dx, c] of [[-16, '#3a3e46'], [16, '#d8c8a0']]) {
    out.push(stroke(`M${tx + dx} ${yc - 158}L${tx + dx} ${yc - 192}`, c, 8), circle(tx + dx, yc - 194, 8, c), circle(tx + dx - 2, yc - 196, 2.6, '#fff', { opacity: 0.6 }));
    out.push(path(polyD([[tx + dx - 5, yc - 120], [tx + dx + 5, yc - 120], [tx + dx + 3, yc - 90], [tx + dx - 3, yc - 90]]), '#aab0b6'), rect(tx + dx - 3, yc - 92, 6, 8, '#6c727a', { rx: 2 }));
  }
  // Pint under the left spout.
  const gx = tx - 16;
  out.push(path(E(gx, yc - 2, 22, 4), '#000', { opacity: 0.25 }));
  out.push(shape(polyD([[gx - 16, yc - 58], [gx + 16, yc - 58], [gx + 12, yc - 3], [gx - 12, yc - 3]]), '#f2b632', [rect(gx + 4, yc - 58, 12, 56, '#c8841a'), rect(gx - 11, yc - 58, 4, 54, '#fff4c0', { opacity: 0.7 })], '#9ab4c0', 1.2));
  out.push(path(smooth([[gx - 17, yc - 58], [gx - 14, yc - 68], [gx - 4, yc - 72], [gx + 8, yc - 70], [gx + 17, yc - 62], [gx + 17, yc - 56]]), '#fbf3dc'), path(E(gx - 6, yc - 68, 7, 3), '#fff', { opacity: 0.8 }));
  // Glass dome with a tortilla, on the right.
  const dx = 330;
  out.push(sombra(dx, yc - 3, 48, 7, 0.35));
  out.push(path(E(dx, yc - 6, 46, 7), '#b4bbc2'), rect(dx - 8, yc - 14, 16, 8, '#aab0b6'), path(E(dx, yc - 16, 40, 6), '#c3c9cf'));
  out.push(shape(E(dx, yc - 22, 32, 8), '#e8b83a', [path(smooth([[dx - 30, yc - 22], [dx - 10, yc - 28], [dx + 14, yc - 28], [dx + 32, yc - 22], [dx + 10, yc - 18], [dx - 20, yc - 18]]), '#f4d466'), rect(dx + 6, yc - 32, 26, 20, '#b8851f', { opacity: 0.5 })], '#7a5410', 1.2));
  out.push(path(polyD([[dx + 8, yc - 22], [dx + 30, yc - 22], [dx + 4, yc - 18]]), '#f8ecb0'));
  out.push(path(smooth([[dx - 40, yc - 20, 'c'], [dx - 40, yc - 50], [dx - 20, yc - 76], [dx, yc - 80], [dx + 20, yc - 76], [dx + 40, yc - 50], [dx + 40, yc - 20, 'c']]), '#cfe6f0', { opacity: 0.2 }));
  out.push(stroke(`M${dx - 40} ${yc - 20}C${dx - 40} ${yc - 52} ${dx - 18} ${yc - 78} ${dx} ${yc - 80}C${dx + 18} ${yc - 78} ${dx + 40} ${yc - 52} ${dx + 40} ${yc - 20}`, '#e8f4f8', 2, { opacity: 0.7 }), circle(dx, yc - 84, 5, '#c3c9cf'), path(smooth([[dx - 28, yc - 56], [dx - 20, yc - 68], [dx - 14, yc - 72], [dx - 24, yc - 52]]), '#fff', { opacity: 0.5 }));
  // Bread basket and the oil and vinegar cruets.
  out.push(sombra(470, yc - 2, 40, 6, 0.3), shape(polyD([[430, yc - 26], [510, yc - 26], [502, yc - 3], [438, yc - 3]]), '#c9a46a', [rect(430, yc - 14, 80, 4, '#a8824a'), rect(486, yc - 26, 24, 24, '#a8824a', { opacity: 0.6 })], '#6e5228', 1.2));
  for (const [x, w] of [[440, 26], [462, 30], [488, 24]]) out.push(path(E(x + 12, yc - 30, w / 2, 8), '#d8a458'), path(E(x + 10, yc - 33, w / 3, 3), '#f2cc8a', { opacity: 0.8 }));
  for (const [x, c] of [[560, '#e2b04a'], [586, '#9a2a1a']]) out.push(sombra(x, yc - 2, 14, 3.5, 0.3), shape(smooth([[x - 7, yc - 36], [x - 5, yc - 24], [x - 11, yc - 4, 'c'], [x + 11, yc - 4, 'c'], [x + 5, yc - 24], [x + 7, yc - 36]]), c, [rect(x + 2, yc - 36, 9, 32, '#000', { opacity: 0.18 }), rect(x - 8, yc - 22, 3, 14, '#fff', { opacity: 0.4 })], '#5a3a10', 1), rect(x - 4, yc - 44, 8, 10, '#c9a14f', { rx: 2 }));
  return out.join('');
}

function taburetes(xs = TABURETES.xs) {
  const out = [];
  for (const x of xs) {
    out.push(sombra(x + 6, 4, 40, 8, 0.5));
    out.push(shape(E(x, -3, 34, 8), '#6c727a', [rect(x - 34, -3, 68, 6, '#4a5058')], '#2e3338', 1.2), path(E(x, -6, 28, 5), '#9aa1a9'));
    out.push(rect(x - 4.5, -150, 9, 146, '#aab0b6'), rect(x - 4.5, -150, 3, 146, '#fff', { opacity: 0.7 }), rect(x + 1.5, -150, 3, 146, '#555c64', { opacity: 0.6 }));
    out.push(stroke(`M${x - 28} -66Q${x} -56 ${x + 28} -66`, '#8f969e', 5), stroke(`M${x - 28} -67Q${x} -57 ${x + 28} -67`, '#e8ecef', 2), line(x - 28, -66, x - 4, -66, '#6c727a', 3), line(x + 28, -66, x + 4, -66, '#6c727a', 3));
    out.push(shape(smooth([[x - 40, -160], [x - 38, -176, 'c'], [x + 38, -176, 'c'], [x + 40, -160], [x + 34, -148, 'c'], [x - 34, -148, 'c']]), REDV.base, [rect(x + 12, -176, 30, 30, REDV.shadow), rect(x - 40, -152, 80, 6, REDV.deep)], REDV.line, 1.4));
    out.push(path(E(x, -176, 38, 9), REDV.light), path(E(x - 8, -178, 22, 4), '#fff', { opacity: 0.3 }), stroke(`M${x - 38} -160Q${x} -152 ${x + 38} -160`, '#c3c9cf', 3.4), stroke(`M${x - 30} -170Q${x} -164 ${x + 30} -170`, REDV.shadow, 1.4, { opacity: 0.8 }));
  }
  return out.join('');
}

// --- the slot machine

/** The machine's front, centred on its base. `luz` paints the lit state of the top half instead (the live overlay). */
function maquinaFrente(luz = false, fase = 0) {
  const out = [];
  const ORO = '#e2b04a';
  if (!luz) {
    out.push(gpath(rr(-84, -440, 168, 408, 14), lin(-84, 0, 84, 0, [[0, '#c0323a'], [0.45, '#a3262c'], [1, '#6e1218']])));
    out.push(stroke(rr(-84, -440, 168, 408, 14), '#4a0e12', 2.4), stroke(rr(-80, -436, 160, 400, 11), ORO, 3, { opacity: 0.9 }));
    out.push(rect(-80, -436, 6, 400, '#ffffff', { opacity: 0.16, rx: 3 }), rect(72, -436, 8, 400, '#000', { opacity: 0.16, rx: 3 }));
    // Plinth.
    out.push(box(-76, -36, 152, 36, mat('#23262c', '#17191d', '#3a3e46', '#0c0d10'), { r: 4, lw: 1.2 }), rect(-70, -34, 140, 3, '#5a5f6a'));
  }
  // Marquee: bulbs around a dark panel with three fruit-machine icons.
  if (!luz) out.push(gpath(rr(-72, -430, 144, 64, 9), lin(0, -430, 0, -366, [[0, '#2a1a22'], [1, '#14080e']])), stroke(rr(-72, -430, 144, 64, 9), ORO, 2.4));
  else out.push(gpath(rr(-72, -430, 144, 64, 9), lin(0, -430, 0, -366, [[0, '#7a1a4a'], [1, '#3a0a28']])), stroke(rr(-72, -430, 144, 64, 9), ORO, 2.6));
  const bul = [];
  for (let i = 0; i < 12; i++) bul.push([-66 + i * 12, -436], [-66 + i * 12, -360]);
  for (let j = 1; j < 5; j++) bul.push([-72, -436 + j * 15], [72, -436 + j * 15]);
  bul.forEach(([x, y], i) => {
    if (!luz) out.push(circle(x, y, 3.4, '#8a7a4a'), circle(x - 0.8, y - 0.8, 1.2, '#fff', { opacity: 0.4 }));
    else out.push(circle(x, y, 3.8, (i + fase) % 2 ? '#fff6c0' : '#ff9a3a'), circle(x - 0.8, y - 0.8, 1.4, '#fff'));
  });
  // Icons on the marquee: a seven, a bell, a cherry pair.
  const o = luz ? 1 : 0.55;
  out.push(path(smooth([[-52, -416], [-34, -416], [-44, -380], [-50, -380], [-42, -402], [-54, -402]]), '#e8323a', { opacity: o }));
  out.push(path(smooth([[-10, -380, 'c'], [-14, -398], [-6, -412], [0, -414], [6, -412], [14, -398], [10, -380, 'c']]), '#ffd23a', { opacity: o }), circle(0, -378, 3, '#ffd23a', { opacity: o }));
  out.push(circle(30, -388, 7, '#e8323a', { opacity: o }), circle(44, -386, 7, '#e8323a', { opacity: o }), stroke('M30 -395Q36 -412 48 -414M44 -393Q44 -406 48 -414', '#3aa860', 2, { opacity: o }));
  // Reels window.
  out.push(gpath(rr(-72, -356, 144, 100, 9), lin(0, -356, 0, -256, [[0, '#d8dde2'], [1, '#8f969e']])), stroke(rr(-72, -356, 144, 100, 9), '#555c64', 1.6));
  const sym = (cx, cy, i) => {
    const t = (i + Math.floor(fase)) % 3;
    if (t === 0) return [path(smooth([[cx - 11, cy - 15], [cx + 11, cy - 15], [cx + 1, cy + 15], [cx - 5, cy + 15], [cx + 3, cy - 5], [cx - 11, cy - 5]]), '#e8323a'), rect(cx - 11, cy - 15, 22, 3, '#ff8a8a')].join('');
    if (t === 1) return [path(smooth([[cx - 13, cy + 12, 'c'], [cx - 14, cy - 4], [cx - 6, cy - 14], [cx, cy - 15], [cx + 6, cy - 14], [cx + 14, cy - 4], [cx + 13, cy + 12, 'c']]), '#f2c23a'), circle(cx, cy + 15, 4, '#a8780a'), rect(cx - 8, cy - 8, 3, 14, '#fff6c0', { opacity: 0.8 })].join('');
    return [path(E(cx, cy + 2, 14, 11), '#f4e04a'), path(E(cx - 4, cy - 1, 6, 4), '#fff8b0', { opacity: 0.8 }), path(smooth([[cx + 10, cy + 2], [cx + 18, cy - 4], [cx + 14, cy + 6]]), '#c8b020')].join('');
  };
  for (let i = 0; i < 3; i++) {
    const cx = -45 + i * 45;
    if (!luz) out.push(rect(cx - 19, -348, 38, 84, '#10141a', { rx: 4 }));
    else out.push(gpath(rr(cx - 19, -348, 38, 84, 4), lin(0, -348, 0, -264, [[0, '#d8d0b8'], [0.5, '#fffdf0'], [1, '#d8d0b8']])), sym(cx, -306, i));
  }
  if (luz) out.push(rect(-68, -352, 136, 3, '#ffffff', { opacity: 0.4 }), path(polyD([[-60, -352], [-26, -352], [-48, -262], [-70, -262]]), '#fff', { opacity: 0.1 }));
  if (!luz) {
    out.push(path(polyD([[-60, -352], [-26, -352], [-48, -262], [-70, -262]]), '#fff', { opacity: 0.1 }));
    // Control deck: a lit coin slot, six buttons, a small display.
    out.push(path(polyD([[-76, -250], [76, -250], [72, -196], [-72, -196]]), '#1c1318'), rect(-72, -250, 144, 3, '#ffffff', { opacity: 0.2 }));
    for (let i = 0; i < 6; i++) out.push(circle(-52 + i * 20, -226, 7, ['#d4504a', '#e2b04a', '#3a8a5a', '#3a7be0', '#e2b04a', '#d4504a'][i]), circle(-54 + i * 20, -228, 2.2, '#fff', { opacity: 0.6 }));
    out.push(rect(-60, -208, 40, 8, '#0e1812', { rx: 3 }), rect(-57, -207, 34, 6, '#4a7a58', { rx: 2 }));
    out.push(rect(30, -212, 30, 12, '#10080c', { rx: 5 }), rect(36, -208, 18, 4, '#ffcf6a', { rx: 2 }));
    // Coin return, payout tray and service door.
    out.push(box(-50, -184, 100, 34, mat('#14080c', '#0a0306', '#2a1418', '#05020a'), { r: 8, lw: 1.2 }), rect(-44, -178, 88, 4, '#5a5f6a', { rx: 2 }));
    for (const [x, y] of [[-14, -156], [4, -154], [20, -157]]) out.push(circle(x, y, 5, '#c9a14f'), circle(x - 1, y - 1, 2, '#f2d98a', { opacity: 0.8 }));
    out.push(box(-70, -140, 140, 96, mat('#8a1c22', '#6a1218', '#a8282e', '#3a0a0e'), { r: 6, sh: 0.1, li: 0.05, lw: 1.3 }));
    out.push(circle(52, -92, 7, '#c3c9cf'), rect(51, -97, 2, 9, '#555c64'));
    out.push(rect(-56, -122, 74, 44, '#6a1218', { rx: 4 }), rect(-52, -118, 66, 36, '#8a1c22', { rx: 3 }));
    // «Out of order» note taped over the reels window: a sheet with red bars.
    out.push(path(polyD([[-56, -338], [56, -331], [53, -296], [-59, -302]]), '#f6f2e6'), path(polyD([[-56, -338], [56, -331], [55, -327], [-56, -334]]), '#d8d2c0'));
    out.push(path(polyD([[-46, -325], [46, -320], [46, -313], [-46, -318]]), '#c8433a'), path(polyD([[-36, -310], [34, -307], [34, -302], [-36, -305]]), '#c8433a', { opacity: 0.8 }));
    out.push(path(polyD([[-62, -343], [-46, -341], [-48, -331], [-62, -333]]), '#e8dcc0', { opacity: 0.8 }), path(polyD([[46, -331], [62, -330], [60, -320], [46, -321]]), '#e8dcc0', { opacity: 0.8 }));
  }
  return out.join('');
}

function maquinaPared() {
  return [sombra(0, 4, 100, 12, 0.5), maquinaFrente()].join('');
}

/** Pulled out of the wall and turned a little: the left side shows, the plug is on its way to the wall. */
const FUERA_M = 'matrix(0.86 0.05 0 1 14 0)';
function maquinaFuera(CXe = P.CX, d = 0) {
  const out = [];
  const k = P.f(TRAGA_FUERA.y);
  const um = CXe + k * (TRAGA_FUERA.X + d - CXe);
  const lx = (ENCHUFE.X + d - um) / k;
  const ly = (ENCHUFE.y - TRAGA_FUERA.y) / k;
  out.push(sombra(-6, 6, 110, 14, 0.55));
  // Cable first (behind): from the rear of the cabinet to the socket, with a loop on the floor.
  const cable = `M58 -78C70 -30 ${f2(lx - 70)} 14 ${f2(lx - 60)} -34C${f2(lx - 54)} -62 ${f2(lx - 20)} ${f2(ly + 70)} ${f2(lx - 4)} ${f2(ly + 16)}`;
  out.push(stroke(cable, '#15161a', 5.2), stroke(cable, '#3a3d46', 1.6, { opacity: 0.8 }));
  // Left side of the cabinet, closed: the corner it shares with the front is the nearest edge, so the far edge is a
  // little shorter (it never fans out like an open door), with the plinth and the gold trim going round the corner.
  const lado = polyD([[-58, -444], [-104, -436], [-104, -52], [-58, -38]]);
  out.push(shape(lado, '#8a1c22', [
    gpath(rectD(-104, -450, 46, 420), lin(-104, 0, -58, 0, [[0, '#2a0608', 0.5], [1, '#2a0608', 0.05]])),
    rect(-103, -440, 3, 390, '#ffffff', { opacity: 0.1 }),
    path(polyD([[-96, -420], [-66, -426], [-66, -92], [-96, -96]]), '#6e1218', { opacity: 0.55 }),
    stroke('M-96 -420L-66 -426L-66 -92L-96 -96Z', '#e2b04a', 1.6, { opacity: 0.55 }),
  ], '#4a0e12', 2));
  out.push(stroke('M-62 -441L-62 -40', '#e2b04a', 3, { opacity: 0.85 }));
  out.push(shape(polyD([[-52, -38], [-100, -50], [-100, -18], [-52, 0]]), '#1c1f25', [rect(-100, -50, 48, 3, '#4a4f5a')], '#0c0d10', 1.2));
  out.push(g(null, maquinaFrente(), { transform: FUERA_M }));
  // The plug in the wall socket (in front of the wall, so it is drawn last).
  out.push(box(lx - 10, ly - 12, 18, 24, mat('#2a2d36', '#1a1c22', '#454a56', '#0c0d10'), { r: 4, lw: 1.1 }), rect(lx - 14, ly - 4, 6, 3, '#c3c9cf'), rect(lx - 14, ly + 3, 6, 3, '#c3c9cf'));
  return out.join('');
}

/** The lit state of the machine (marquee and reels), in the same frame as the prop. `fuera` turns it like the cabinet. */
function luzMaquina(fuera, fase, nivel) {
  const inner = maquinaFrente(true, fase);
  return nivelar(fuera ? g(null, inner, { transform: FUERA_M }) : inner, nivel === 3 ? 0 : nivel);
}

function duroArte() {
  return [
    path(E(2, 4, 17, 6.5), '#000', { opacity: 0.3 }),
    shape(E(0, 0, 14, 7.4), '#c9a14f', [path(E(0, -1.4, 11, 4.4), '#f2d98a'), rect(-14, 1, 28, 6, '#8a6a22', { opacity: 0.6 })], '#6a4a10', 1.2),
    path(E(0, 0, 8.6, 4), '#e2c470', { opacity: 0.9 }), path(E(-3, -1.8, 4, 1.4), '#fff', { opacity: 0.8 }),
  ].join('');
}

// ---------------------------------------------------------------- live pieces (bar-vivo.ts)

function tapaArte(id, x, y) {
  const plato = [path(E(x, y + 2, 38, 8), '#000', { opacity: 0.2 }), shape(E(x, y - 2, 36, 8), '#f1ede6', [path(E(x, y, 36, 6), '#d6d0c6')], '#9a9286', 1), path(E(x, y - 3, 28, 5), '#faf8f2')];
  if (id === 'ensaladilla') {
    return [...plato, path(smooth([[x - 26, y - 4], [x - 22, y - 18], [x - 6, y - 26], [x + 12, y - 24], [x + 26, y - 14], [x + 26, y - 4]]), '#f0e6c4'), path(smooth([[x - 18, y - 12], [x - 6, y - 22], [x + 8, y - 22], [x - 4, y - 12]]), '#fffaf0', { opacity: 0.8 }),
      ...[[-14, -14, '#e8793a'], [0, -19, '#d4504a'], [10, -12, '#5aa030'], [-4, -10, '#e8793a'], [18, -17, '#d4504a']].map(([dx, dy, c]) => circle(x + dx, y + dy, 2.6, c)), path(E(x + 2, y - 26, 5, 3), '#6a8a30'), circle(x + 2, y - 26, 1.6, '#c8433a')].join('');
  }
  if (id === 'boquerones') {
    return [...plato, ...[0, 1, 2, 3, 4].map((i) => stroke(`M${x - 24 + i * 10} ${y - 3}Q${x - 20 + i * 10} ${y - 20} ${x - 12 + i * 10} ${y - 8}`, '#f4f6f4', 6)), ...[0, 1, 2, 3, 4].map((i) => stroke(`M${x - 22 + i * 10} ${y - 5}Q${x - 19 + i * 10} ${y - 16} ${x - 13 + i * 10} ${y - 9}`, '#cfd6d4', 2)),
      ...[[-18, -4], [-2, -3], [12, -4], [22, -3]].map(([dx, dy]) => circle(x + dx, y + dy, 1.8, '#4a8a30')), path(smooth([[x - 4, y - 14], [x + 8, y - 22], [x + 14, y - 16], [x + 4, y - 11]]), '#f2d84a'), path(E(x + 8, y - 17, 3, 1.6), '#fff6b0', { opacity: 0.8 })].join('');
  }
  if (id === 'tortilla') {
    return [...plato, shape(smooth([[x - 22, y - 2], [x - 20, y - 14], [x + 20, y - 18], [x + 26, y - 4], [x + 8, y + 2]]), '#e8b83a', [path(smooth([[x - 18, y - 14], [x + 18, y - 17], [x + 22, y - 10], [x - 14, y - 7]]), '#f4d466'), rect(x - 26, y - 4, 56, 4, '#b8851f', { opacity: 0.7 }), ...[0, 1, 2].map((i) => circle(x - 8 + i * 12, y - 8 + (i % 2) * 2, 2.4, '#f8ecb0', { opacity: 0.85 }))], '#8a5a10', 1.2), shape(polyD([[x + 20, y - 14], [x + 30, y - 8], [x + 24, y - 1], [x + 10, y - 3]]), '#f0cc58', [], '#8a5a10', 1), rect(x - 30, y - 6, 12, 3, '#e8c890', { opacity: 0.9 })].join('');
  }
  return [...plato, ...[0, 1, 2, 3, 4].map((i) => path(smooth([[x - 26 + i * 11, y - 4], [x - 24 + i * 11, y - 14 - (i % 2) * 3], [x - 16 + i * 11, y - 16], [x - 14 + i * 11, y - 6]]), i % 2 ? '#c8783a' : '#b8662c')), ...[0, 1, 2, 3].map((i) => circle(x - 20 + i * 12, y - 10, 1.6, '#d8432a', { opacity: 0.9 })), path(smooth([[x - 6, y - 14], [x + 6, y - 24], [x + 14, y - 22], [x + 4, y - 12]]), '#c8783a'), line(x + 6, y - 26, x + 9, y - 12, '#d8b878', 1.6), circle(x + 6, y - 27, 2, '#c8433a')].join('');
}

/** The glass case's inside: the lit back, a glass shelf and the lamp's light; the plates are separate. */
function expositorFondo() {
  const e = EXPO;
  return [
    gpath(rectD(e.x, e.y, e.w, e.h), lin(0, e.y, 0, e.y + e.h, [[0, '#ffd9a0'], [0.5, '#e8a458'], [1, '#a8602a']])),
    gpath(rectD(e.x, e.y, e.w, e.h), rad(e.x + e.w / 2, e.y, 130, [[0, '#fff0c8', 0.7], [1, '#fff0c8', 0]], 0.9)),
    rect(e.x, e.y + 56, e.w, 4, '#e8f0f2'), rect(e.x, e.y + 60, e.w, 3, '#8aa4ae', { opacity: 0.6 }),
    rect(e.x, e.y + e.h - 6, e.w, 6, '#8f969e'),
    ao(e.x, e.y + 60, e.w, 14, 0.25), ao(e.x, e.y + e.h - 6, e.w, 12, 0.3, -1),
  ].join('');
}

/** The telly: frame and screen; also a sheet of pitch for levels 0-1 and the dragon for 2-3. */
function teleArte() {
  const { x, y, w, h } = TELE;
  const marco = [
    rect(x + 6, y + 10, w, h, '#000', { opacity: 0.22, rx: 8 }),
    box(x, y, w, h, mat('#1c1e24', '#14161a', '#383c46', '#08090c'), { r: 10, sh: 0.1, li: 0.06, lw: 1.5 }),
    gpath(rr(x + 10, y + 10, w - 20, h - 34, 4), lin(0, y + 10, 0, y + h - 24, [[0, '#26303e'], [1, '#10141c']])),
    rect(x + w / 2 - 6, y + h - 17, 12, 4, '#5a5f6a', { rx: 2 }), circle(x + w - 22, y + h - 14, 2.4, '#ff6a4a'),
  ].join('');
  return { x: x - 4, y: y - 2, w: w + 14, h: h + 16, svg: marco, pantalla: { x: x + 10, y: y + 10, w: w - 20, h: h - 34 } };
}

function partidoArte(p) {
  const { x, y, w, h } = p;
  const out = [rect(x, y, w, h, '#2f8a48'), ...[0, 1, 2, 3, 4, 5].map((i) => rect(x + i * (w / 6), y, w / 12, h, '#389652'))];
  out.push(stroke(rr(x + 8, y + 8, w - 16, h - 16, 2), '#e8f4e0', 1.6), line(x + w / 2, y + 8, x + w / 2, y + h - 8, '#e8f4e0', 1.6), stroke(E(x + w / 2, y + h / 2, 16, 14), '#e8f4e0', 1.6));
  out.push(stroke(rr(x + 8, y + h / 2 - 20, 22, 40, 1), '#e8f4e0', 1.4), stroke(rr(x + w - 30, y + h / 2 - 20, 22, 40, 1), '#e8f4e0', 1.4));
  // Players: red against white.
  const r = rng(3);
  for (let i = 0; i < 14; i++) out.push(circle(x + 16 + r() * (w - 32), y + 14 + r() * (h - 28), 3.4, i % 2 ? '#d8323a' : '#f4f4f0'));
  out.push(rect(x + 6, y + 4, 54, 12, '#0a0c10', { rx: 2, opacity: 0.8 }), rect(x + 10, y + 7, 14, 6, '#d8323a'), rect(x + 28, y + 7, 14, 6, '#f4f4f0'));
  return out.join('');
}

function dragonArte() {
  // The Usera dragon, tiny: a green head with a red muzzle, a golden mane, and scaly body discs.
  const cabeza = [
    path(smooth([[-34, 6, 'c'], [-30, -12], [-8, -22], [14, -18], [30, -6], [34, 6, 'c'], [20, 16], [-8, 16]]), '#2fae5a'),
    path(smooth([[8, -2], [30, -6], [38, 4], [30, 14], [10, 12]]), '#e8323a'),
    path(smooth([[-34, -2], [-46, -16], [-40, 6], [-48, 14], [-34, 14]]), '#ffd23a'),
    path(smooth([[-16, -20], [-22, -36], [-8, -26]]), '#ffd23a'), path(smooth([[2, -20], [2, -38], [12, -22]]), '#ffd23a'),
    circle(10, -8, 5, '#fff'), circle(11, -8, 2.6, '#10141c'), circle(32, 2, 1.6, '#7a0a14'), circle(25, 2, 1.6, '#7a0a14'),
    path(polyD([[16, 12], [20, 18], [24, 12]]), '#fff'), path(polyD([[26, 10], [30, 16], [34, 10]]), '#fff'),
    stroke('M-24 0Q-8 -10 8 -4', '#1f7a3e', 2.4, { opacity: 0.8 }),
  ].join('');
  const cuerpo = [circle(0, 0, 12, '#2fae5a'), path(E(0, 4, 8, 6), '#9be0a8'), path(smooth([[-6, -10], [0, -22], [6, -10]]), '#ffd23a'), stroke('M-10 -2Q0 -10 10 -2', '#1f7a3e', 1.6)].join('');
  const cola = [path(smooth([[0, 0, 'c'], [-14, -10], [-30, -2], [-20, 6], [-34, 12], [-8, 10]]), '#e8323a'), path(smooth([[-6, 0], [-18, -4], [-22, 2], [-10, 5]]), '#ffd23a')].join('');
  return { cabeza, cuerpo, cola };
}

function marcadorPorra(nivel) {
  const cs = celdasPorra()[0];
  const siete = esSueno(nivel);
  return {
    w: cs.w,
    h: cs.h,
    svg: [rect(1.5, 1.5, cs.w - 3, cs.h - 3, '#fff27a', { opacity: 0.85, rx: 3 }), `<text x="${f2(cs.w / 2)}" y="${f2(cs.h * 0.74)}" font-family="Trebuchet MS, Arial, sans-serif" font-weight="800" font-style="italic" font-size="${f2(cs.h * 0.62)}" text-anchor="middle" fill="#d02a2a">${siete ? '7' : NUM_FRAN}</text>`].join(''),
  };
}

/**
 * Everything live in the bar, as drawings in the frames the scene uses (bar-vivo.ts turns them into bitmaps).
 * @returns {ReturnType<typeof piezasVivasBase> & { desp?: object, inclina?: object, volteo?: number, sinVitrina?: boolean }}
 */
export function piezasVivas(nivel) {
  const datos = piezasVivasBase(nivel);
  return nivel >= 5 ? adaptarNoche(nivel, datos) : datos;
}

function piezasVivasBase(nivel) {
  // Levels 4 and 5 have the content of level 3 (sevens, spinning bottles) in their own palette and place.
  const N = nivel >= 4 ? 3 : nivel;
  const cl = (svg) => (nivel === 3 ? nivelar(svg, 0) : nivelar(svg, nivel, doblar, false));
  const tele = teleArte();
  const sc = tele.pantalla;
  const dr = dragonArte();
  const giran = estanteria(N, true).giran;
  const marcador = marcadorPorra(N);
  const centro = [tele.x + tele.w / 2, tele.y + tele.h / 2];
  return {
    nivel,
    tele: { marco: { svg: cl(tele.svg), x: tele.x, y: tele.y, w: tele.w, h: tele.h }, pantalla: sc, partido: cl(partidoArte(sc)), dragon: { cabeza: cl(dr.cabeza), cuerpo: cl(dr.cuerpo), cola: cl(dr.cola) }, centro: nivel === 3 ? doblar(centro[0], centro[1]) : centro },
    expositor: { fondo: { svg: cl(expositorFondo()), x: EXPO.x, y: EXPO.y, w: EXPO.w, h: EXPO.h }, tapas: TAPAS.map((t) => ({ id: t.id, fase: t.fase, x: t.x, y: t.y, svg: cl(tapaArte(t.id, t.x, t.y)), box: { x: t.x - 42, y: t.y - 36, w: 84, h: 46 } })) },
    maquina: {
      pared: { x: -110, y: -460, w: 190, h: 210, luces: [0, 1, 2].map((f) => luzMaquina(false, f, nivel)) },
      fuera: { x: -130, y: -470, w: 220, h: 220, luces: [0, 1, 2].map((f) => luzMaquina(true, f, nivel)) },
    },
    porra: { celdas: celdasPorra().filter((c) => c.n !== NUM_FRAN), marcador: { w: marcador.w, h: marcador.h, svg: cl(marcador.svg) } },
    botellas: giran.map((q) => {
      const c = [q.x + q.b.w / 2, q.base - q.b.h / 2];
      const [cx, cy] = esSueno(nivel) ? doblar(c[0], c[1]) : c;
      return { svg: cl(botella(q.b, -q.b.w / 2, q.b.h / 2)), x: cx, y: cy, w: q.b.w + 20, h: q.b.h + 24, ox: -q.b.w / 2 - 10, oy: -q.b.h / 2 - 12 };
    }),
    tubos: TUBOS,
    bar: { X: BAR.X, y: BAR.y, k: KB },
    maquinaPared: { X: TRAGA.X, y: TRAGA.y },
    maquinaFuera: { X: TRAGA_FUERA.X, y: TRAGA_FUERA.y },
    duro: DURO,
  };
}

// ---------------------------------------------------------------- the scene

const escenas = new Map();

export function escena(nivel = 0) {
  if (!escenas.has(nivel)) escenas.set(nivel, nivel === 5 ? construir5() : nivel === 6 ? construir6() : construir(nivel));
  return escenas.get(nivel);
}

/** Lights in back-plane coordinates; `fy` is where the light pools on the floor. */
function luces(nivel) {
  const col = colorDe(nivel);
  const L = [
    // The white of the tubes, a little cold.
    { X: 900, y: 40, r: 760, color: '#cfe0ff', power: 0.34, fy: 840 },
    { X: 1500, y: 40, r: 900, color: '#cfe0ff', power: 0.38, fy: 850 },
    { X: 2200, y: 40, r: 780, color: '#cfe0ff', power: 0.32, fy: 840 },
    // The amber of the shelves, the pendant lamps and the display case.
    { X: 1570, y: 330, r: 760, color: '#ffb45a', power: 0.62, fy: 900, flat: 0.5 },
    { X: 1330, y: 170, r: 520, color: '#ffc27a', power: 0.4, fy: 900 },
    { X: 1625, y: 170, r: 520, color: '#ffc27a', power: 0.4, fy: 900 },
    { X: 1920, y: 170, r: 520, color: '#ffc27a', power: 0.4, fy: 900 },
    { X: 1070, y: 500, r: 440, color: '#ffc27a', power: 0.55, fy: 890 },
    // The street through the glass, the tobacco machine, the dim slot machine and the telly.
    { X: 470, y: 450, r: 540, color: '#ffae5e', power: 0.36, fy: 860 },
    { X: 712, y: 480, r: 300, color: '#ff7a5a', power: 0.3 },
    { X: 2455, y: 420, r: 560, color: '#ff6a8a', power: 0.2, fy: 880 },
    { X: 2715, y: 160, r: 800, color: '#8fb4ff', power: 0.46, fy: 860 },
  ];
  if (nivel === 2) L.push({ X: 1250, y: 420, r: 700, color: '#d040ff', power: 0.4, fy: 900 }, { X: 2050, y: 400, r: 700, color: '#80ff40', power: 0.32, fy: 900 });
  if (esSueno(nivel)) L.push({ X: 1500, y: 300, r: 900, color: '#ff9ac8', power: 0.3, fy: 900 });
  return L.map((l) => ({ ...l, color: col(l.color) }));
}

function construir(nivel) {
  const col = colorDe(nivel);
  const pa = pared(nivel);
  const top = techoPiezas(nivel);
  const ext = calleRango(0.5);
  const fl = uRange(P.f(1080));
  const dibujoCalle = nivelar(calle(), nivel);
  const dibujoSuelo = nivelar(suelo(), nivel);
  const hueco = nivelar(huellaTragaperras(), nivel);
  const barraSvg = propNivel(barra() + barraEncima(), nivel, BAR.X, BAR.y);
  const lugar = (X, y) => ({ u: P.uOf(X, P.f(y)), k: P.f(y) });
  const bk = lugar(BAR.X, BAR.y);
  const tk = lugar(TRAGA.X, TRAGA.y);
  return {
    id: `bar${nivel}`,
    name: 'Bar del Brío',
    W,
    H: 1080,
    HOR: P.HOR,
    BASE: P.BASE,
    CX: P.CX,
    M,
    // Key light for relief: the tubes, from above.
    clave: [0.1, -0.8, 0.55],
    ambient: col('#5a5670'),
    walk: { y0: 892, y1: 1010, x0: 140, x1: 2860 },
    start: { X: 560, y: 905 },
    layers: [
      { id: 'calle', k: 0.5, x0: ext[0], x1: ext[1], y0: 0, y1: 800, body: dibujoCalle, emissive: nivelar(calleEmisiva(), nivel), glows: CALLE_GLOWS.map((q) => ({ ...q, color: col(q.color) })), lit: false },
      {
        id: 'pared', k: 1, textura: 0.2, x0: -60, x1: W + 60, y0: 0, y1: 845,
        pieces: [
          { x0: -60, x1: W + 60, y0: 0, y1: 845, body: pa.svg, emissive: paredEmisiva(nivel) },
          { x0: 2380, x1: 2600, y0: 360, y1: 830, body: hueco, si: 'c2.separada' },
        ],
        lit: true,
        texts: textos(nivel),
        glows: [
          { x: 473, y: 248, r: 70, color: col('#6aff9a'), a: 0.4 },
          { x: TAB.x + TAB.w / 2, y: TAB.y + 30, r: 110, color: col('#ff6a5a'), a: 0.38 },
          { x: BANO.x + BANO.w / 2, y: FLOOR - 4, r: 110, color: col('#ffd27a'), a: 0.3 },
        ],
      },
      { id: 'suelo', floor: true, x0: fl[0], x1: fl[1], y0: 800, y1: 1080, body: dibujoSuelo, lit: true, textura: 0.3 },
      { id: 'techo', k: KT, z: 'front', lit: true, textura: 0.25, pieces: top.piezas, glows: top.glows.map((q) => ({ ...q, color: col(q.color) })) },
    ],
    props: [
      { id: 'barra', X: BAR.X, y: BAR.y, svg: barraSvg, z: 0 },
      { id: 'taburetes', X: TABURETES.X, y: TABURETES.y, svg: propNivel(taburetes(), nivel, TABURETES.X, TABURETES.y), z: 0 },
      { id: 'tragaperras', X: TRAGA.X, y: TRAGA.y, svg: propNivel(maquinaPared(), nivel, TRAGA.X, TRAGA.y, false), z: 0, si: '!c2.separada' },
      { id: 'tragaperrasFuera', X: TRAGA_FUERA.X, y: TRAGA_FUERA.y, svg: propNivel(maquinaFuera(), nivel, TRAGA_FUERA.X, TRAGA_FUERA.y, false), z: 0, si: 'c2.separada' },
      { id: 'duro', X: DURO.X, y: DURO.y, svg: propNivel(duroArte(), nivel, DURO.X, DURO.y, false), z: -20, si: 'c2.duroVisible' },
    ],
    lights: luces(nivel),
    // The sodium light of the street lamp coming in through the door, laid on the floor.
    shafts: [{ X0: 388, X1: 556, dX: 420, k1: 1.36, color: col('#ffb056'), power: 0.3 }],
    spots: {
      vero: { X: VERO.X, y: VERO.y },
      chuchi: { X: AMIGOS.chuchi, y: YA, face: 1 },
      pablo: { X: AMIGOS.pablo, y: YA, face: 1 },
      fran: { X: AMIGOS.fran, y: YA, face: -1 },
      guille: { X: AMIGOS.guille, y: YA, face: -1 },
      entrada: { X: 560, y: 905 },
      tragaperras: { X: 2200, y: 906, face: 1 },
      tragaperrasSeparada: { X: TRAGA_FUERA.X, y: TRAGA_FUERA.y },
      duro: { X: DURO.X, y: DURO.y },
    },
    // Tap areas: screen box at depth k (u = horizontal position in that layer), and where the character stands.
    zonas: {
      puerta: { u: DOOR.x + DOOR.w / 2, k: 1, w: DOOR.w + 20, top: DOOR.y - 8, bottom: 790, X: DOOR.x + DOOR.w / 2, y: 905 },
      tabaco: { u: TAB.x + TAB.w / 2, k: 1, w: TAB.w, top: TAB.y, bottom: 790, X: TAB.x + TAB.w / 2, y: 905 },
      // The top of the counter and the strip of its face; the friends stand in front of the rest.
      barra: { u: bk.u, k: bk.k, w: BAR.L - 60, top: BAR.y - BAR.alto - 40, bottom: BAR.y - BAR.alto + 36, X: BAR.X, y: 905 },
      grifos: { u: P.uOf(BAR.X + 100, bk.k), k: bk.k, w: 100, top: BAR.y - BAR.alto * 1 - 20, bottom: BAR.y - BAR.alto + 14, X: BAR.X + 100, y: 905 },
      expositor: { u: P.uOf(BAR.X - 490, bk.k), k: bk.k, w: 240, top: BAR.y - BAR.alto - 130, bottom: BAR.y - BAR.alto + 10, X: BAR.X - 490, y: 905 },
      estanteria: { u: 1570, k: 1, w: 1160, top: TRAS.top - 10, bottom: 540, X: 1570, y: 905 },
      tele: { u: TELE.x + TELE.w / 2, k: 1, w: TELE.w + 20, top: TELE.y - 10, bottom: TELE.y + TELE.h + 10, X: 2560, y: 905 },
      porra: { u: PORRA.x + PORRA.w / 2, k: 1, w: PORRA.w, top: PORRA.y - 10, bottom: PORRA.y + PORRA.h, X: 2150, y: 905 },
      tragaperras: { u: (tk.u + P.uOf(TRAGA_FUERA.X, P.f(TRAGA_FUERA.y))) / 2, k: tk.k, w: 330, top: TRAGA.y - TRAGA.h - 20, bottom: 800, X: 2200, y: 906 },
      bano: { u: BANO.x + BANO.w / 2, k: 1, w: BANO.w + 30, top: BANO.y - 70, bottom: 790, X: BANO.x + BANO.w / 2, y: 905 },
    },
  };
}

// ---------------------------------------------------------------- levels 4 and 5: the night gets out of hand
//
// Level 4 (after the Pang, simplified on 25 October 2026): the same bar, not a corridor. It is level 3's bar (the same
// lines, bent, with the sevens and the spinning bottles) in an acid palette, like a club's lights: `construir(4)`,
// with `pasillo` as its palette. The slot machine stays where it always is.
//
// Level 5, upside down: the wall is turned over (its ceiling is at the bottom, the tiles at the top); the
// counter, the stools and the bottles hang from the real floor, which is now the ceiling; the pendant lamps stand on the
// floor as standing lamps, and the floor the friends walk on is a ceiling of plaster with its fluorescent panels.
//
// Same zones and spots as the other levels.

/** Level 4: acid. Magenta, acid lime, teal, electric blue and violet over cold indigo greys, like a corridor in a club. */
function pasillo(hex) {
  const [h, s, l] = aHSL(hex);
  if (l < 0.045 || l > 0.97) return hex;
  if (s < 0.16) return deHSL(232 + 24 * l, 0.36 + 0.3 * (1 - Math.abs(2 * l - 1)), l * 0.92);
  if (h < 22 || h >= 340) return deHSL(326, Math.min(1, s * 1.1 + 0.2), l);
  if (h < 70) return deHSL(h < 44 ? 66 : 80, Math.min(1, s * 1.15 + 0.3), Math.min(0.88, l * 1.02));
  if (h < 175) return deHSL(172, Math.min(1, s * 1.2 + 0.3), l);
  if (h < 265) return deHSL(208, Math.min(1, s * 1.2 + 0.2), l);
  return deHSL(286, Math.min(1, s * 1.2 + 0.2), l);
}

/** Level 5: the other way round. Lights go dark and darks go light, and every hue goes to its opposite. */
function reves(hex) {
  const [h, s, l] = aHSL(hex);
  if (l < 0.045) return deHSL(h + 180, s, 0.82);
  if (l > 0.97) return deHSL(h + 180, 0.3, 0.16);
  return deHSL(h + 180, Math.min(1, s * 1.1 + 0.05), Math.max(0.08, Math.min(0.9, 1.03 - l * 0.94)));
}

// ---------------------------------------------------------------- level 5

/** A standing lamp: the pendant lamp turned over, on the floor: a dish of light on a stick. */
function lamparaPie() {
  const out = [];
  out.push(sombra(4, 6, 58, 11, 0.5));
  out.push(shape(E(0, -4, 44, 10), '#3a3e46', [path(E(0, -7, 36, 6), '#565b63')], '#1c1e22', 1.2));
  out.push(rect(-4, -318, 8, 312, '#c9a14f'), rect(-4, -318, 3, 312, '#f2d98a', { opacity: 0.8 }), rect(1.5, -318, 3, 312, '#5e4719', { opacity: 0.5 }));
  out.push(circle(0, -214, 7, '#c9a14f'));
  // The dish, open to the ceiling, lit inside.
  out.push(shape(smooth([[-62, -352, 'c'], [-52, -330], [-22, -314], [22, -314], [52, -330], [62, -352, 'c']]), '#d9a441', [path(smooth([[14, -314], [52, -330], [62, -352], [10, -352]]), '#b8862c')], '#7a5714', 1.4));
  out.push(gpath(E(0, -352, 60, 12), lin(0, -362, 0, -342, [[0, '#fff6d8'], [1, '#ffcf70']])));
  out.push(path(E(0, -354, 36, 5), '#ffffff', { opacity: 0.7 }));
  out.push(rect(-64, -358, 128, 7, '#c9a14f', { rx: 3.5 }));
  return out.join('');
}

/** What the friends walk on in level 5: the ceiling of the bar, in panels of plaster with their fluorescent lights. */
function sueloReves() {
  const out = [];
  const lit = [];
  const { gp, yOf } = P;
  const kMax = P.f(1080) + 0.3;
  const quad = (X0, X1, k0, k1) => polyD([gp(X0, k0), gp(X1, k0), gp(X1, k1), gp(X0, k1)]);
  out.push(path(quad(-500, 3500, 1, kMax), '#7c7868'));
  const prof = [];
  for (let z = 1; z > 1 / kMax - 0.06; z -= 0.06) prof.push(1 / z);
  const paso = 150;
  const r = rng(31);
  for (let X = -500, i = 0; X < 3500; X += paso, i++) {
    for (let j = 0; j < prof.length - 1; j++) {
      const k0 = prof[j];
      const k1 = prof[j + 1];
      out.push(path(quad(X + 2.4, X + paso - 2.4, k0 + 0.004, k1 - 0.004), r() < 0.25 ? '#dcd6c6' : '#e4dfd0'));
      // A light panel every fourth column and third row, with its two tubes.
      if (i % 4 === 1 && j % 3 === 1) {
        out.push(path(quad(X + 14, X + paso - 14, k0 + 0.012, k1 - 0.012), '#f8f9ff'));
        lit.push(path(quad(X + 14, X + paso - 14, k0 + 0.012, k1 - 0.012), '#ffffff'));
        out.push(path(quad(X + 44, X + 50, k0 + 0.012, k1 - 0.012), '#c4cad8', { opacity: 0.7 }), path(quad(X + paso - 50, X + paso - 44, k0 + 0.012, k1 - 0.012), '#c4cad8', { opacity: 0.7 }));
      } else if (r() < 0.1) out.push(path(quad(X + 40, X + 54, k0 + 0.02, k0 + 0.03), '#8a8672', { opacity: 0.8 }));
    }
  }
  out.push(gpath(polyD([gp(-500, 1), gp(3500, 1), gp(3500, 1.06), gp(-500, 1.06)]), lin(0, 800, 0, 836, [[0, '#2a1e16', 0.4], [1, '#2a1e16', 0]])));
  return { svg: recolor(out.join(''), reves), emisivo: recolor(lit.join(''), (c) => c) };
}

/** The upside-down counter, stools and bottles of level 5, hanging from the ceiling at the top of the screen (`CEIL5`). */
const CEIL5 = 64;
function colgante5() {
  const out = [];
  const k = KB;
  const uc = (X) => P.CX + k * (X - P.CX);
  const [x0, x1] = uRange(k, 160);
  // The ceiling: the floor's tiles seen from below, in a darkening band.
  const tw = 100 * k;
  for (let x = Math.floor(x0 / tw) * tw, i = 0; x < x1; x += tw, i++) {
    for (let j = 0; j < 3; j++) out.push(rect(x + 1.4, -80 + j * 48, tw - 2.8, 46, (i + j) % 2 ? '#c6bda6' : '#b9af97'));
  }
  out.push(gpath(rectD(x0, CEIL5 - 40, x1 - x0, 130), lin(0, CEIL5 - 40, 0, CEIL5 + 90, [[0, '#1a1222', 0.0], [0.3, '#1a1222', 0.35], [1, '#1a1222', 0]])));
  out.push(rect(x0, CEIL5 - 2, x1 - x0, 6, '#6c727a'));
  const colgado = (X, contenido) => `<g transform="translate(${f2(uc(X))} ${CEIL5}) scale(${f2(k)} ${f2(-k)})">${contenido}</g>`;
  // The counter, turned over: its foot on the ceiling, the things on it hanging underneath.
  out.push(colgado(BAR.X, barra() + barraEncima(true)));
  out.push(colgado(TABURETES.X, taburetes()));
  // Bottles standing on the ceiling, upside down.
  const r = rng(5);
  for (let i = 0; i < 17; i++) {
    const b = BOTELLAS[Math.floor(r() * BOTELLAS.length)];
    out.push(colgado(260 + i * 150 + r() * 60, botella(b, -b.w / 2, 0)));
  }
  return { svg: recolor(out.join(''), reves), x0, x1 };
}

/** Big stools hanging in front of the picture, level 5. */
function techo5() {
  const piezas = [];
  for (const X of [420, 1010, 2730]) {
    const u = uT(X);
    piezas.push({ x0: Math.floor(u - 110), x1: Math.ceil(u + 110), y0: -20, y1: 330, body: recolor(`<g transform="translate(${f2(u)} 6) scale(${KT} ${-KT})">${taburetes([0])}</g>`, reves) });
  }
  return piezas;
}

const volteoY = (y) => 810 - y;

function construir5() {
  const base = escena(0);
  const col = reves;
  const c = paredCruda(3);
  const volteo = `<g transform="translate(0 810) scale(1 -1)">`;
  const ext = calleRango(0.5);
  const fl = uRange(P.f(1080));
  const cg = colgante5();
  const sl = sueloReves();
  const tx = textosCrudos(3).map((t) => ({ ...t, y: volteoY(t.y), rot: Math.PI, color: t.color.startsWith('#') ? col(t.color) : t.color }));
  const lampX = [760, 1210, 2045, 2420];
  const spots = {};
  for (const [id, v] of Object.entries(base.spots)) spots[id] = { ...v };
  // Zones: those on the wall turn over with it; the counter's now hang from the ceiling.
  const zonas = {};
  const ky = KB;
  for (const [id, z] of Object.entries(base.zonas)) {
    if (id === 'barra') zonas[id] = { ...z, top: CEIL5 + 10, bottom: CEIL5 + 262 * ky + 30 };
    else if (id === 'grifos') zonas[id] = { ...z, top: CEIL5 + 262 * ky + 30, bottom: CEIL5 + 262 * ky + 190 * ky };
    else if (id === 'expositor') zonas[id] = { ...z, top: CEIL5 + 262 * ky + 30, bottom: CEIL5 + 262 * ky + 140 * ky };
    else zonas[id] = { ...z, top: volteoY(z.bottom), bottom: volteoY(z.top) };
  }
  return {
    id: 'bar5',
    name: 'Bar del Brío',
    W,
    H: 1080,
    HOR: P.HOR,
    BASE: P.BASE,
    CX: P.CX,
    M,
    clave: [0.1, 0.8, 0.55],
    ambient: col('#5a5670'),
    walk: { y0: 892, y1: 1010, x0: 140, x1: 2860 },
    start: { X: 560, y: 905 },
    layers: [
      { id: 'calle', k: 0.5, x0: ext[0], x1: ext[1], y0: 0, y1: 800, body: recolor(`<g transform="translate(0 800) scale(1 -1)">${calle()}</g>`, col), emissive: recolor(`<g transform="translate(0 800) scale(1 -1)">${calleEmisiva()}</g>`, col), glows: CALLE_GLOWS.map((q) => ({ ...q, y: 800 - q.y, color: col(q.color) })), lit: false },
      {
        id: 'pared', k: 1, textura: 0.2, x0: -60, x1: W + 60, y0: 0, y1: 845,
        pieces: [
          { x0: -60, x1: W + 60, y0: 0, y1: 845, body: recolor(`${volteo}${c.cuerpo}</g>`, col), emissive: recolor(`${volteo}${paredEmisiva(0)}</g>`, col) },
          { x0: 2380, x1: 2600, y0: 0, y1: 460, body: recolor(`${volteo}${huellaTragaperras()}</g>`, col), si: 'c2.separada' },
        ],
        lit: true,
        texts: tx,
        glows: [
          { x: 473, y: volteoY(248), r: 70, color: col('#6aff9a'), a: 0.4 },
          { x: TAB.x + TAB.w / 2, y: volteoY(TAB.y + 30), r: 110, color: col('#ff6a5a'), a: 0.38 },
          { x: BANO.x + BANO.w / 2, y: volteoY(FLOOR - 4), r: 110, color: col('#ffd27a'), a: 0.3 },
        ],
      },
      { id: 'colgante', k: KB, textura: 0.2, lit: true, pieces: [{ x0: cg.x0, x1: cg.x1, y0: -90, y1: 640, body: cg.svg }] },
      { id: 'suelo', floor: true, x0: fl[0], x1: fl[1], y0: 800, y1: 1080, body: sl.svg, emissive: sl.emisivo, lit: true, textura: 0.3 },
      { id: 'techo', k: KT, z: 'front', lit: true, textura: 0.25, pieces: techo5() },
    ],
    props: [
      ...lampX.map((X, i) => ({ id: `lampara${i}`, X, y: 905, svg: propSvg(recolor(lamparaPie(), col)), z: 0 })),
      { id: 'tragaperras', X: TRAGA.X, y: TRAGA.y, svg: propNivel(recolor(maquinaPared(), col), 5, TRAGA.X, TRAGA.y, false), z: 0, si: '!c2.separada' },
      { id: 'tragaperrasFuera', X: TRAGA_FUERA.X, y: TRAGA_FUERA.y, svg: propNivel(recolor(maquinaFuera(), col), 5, TRAGA_FUERA.X, TRAGA_FUERA.y, false), z: 0, si: 'c2.separada' },
      { id: 'duro', X: DURO.X, y: DURO.y, svg: propNivel(recolor(duroArte(), col), 5, DURO.X, DURO.y, false), z: -20, si: 'c2.duroVisible' },
    ],
    lights: [
      ...luces(0).map((l) => ({ ...l, y: l.y < 700 ? volteoY(l.y) : l.y, color: col(l.color) })),
      ...lampX.map((X) => ({ X, y: 560, r: 520, color: col('#ffc27a'), power: 0.45, fy: 930 })),
    ],
    shafts: [{ X0: 388, X1: 556, dX: 420, k1: 1.36, color: col('#ffb056'), power: 0.3 }],
    spots,
    zonas,
    noche: { tubos: [] },
  };
}

/**
 * Level 6, where Vero swallows Fran: the upside-down bar again, every colour of it pulled into the gold and wine of her
 * mouth (the same layout, the same zones and places; only the colours of what is baked change).
 */
function construir6() {
  const S = construir5();
  const r = (svg) => (svg ? recolor(svg, tragado) : svg);
  const col = (c) => (typeof c === 'string' && c.startsWith('#') ? tragado(c) : c);
  return {
    ...S,
    id: 'bar6',
    ambient: col(S.ambient),
    layers: S.layers.map((L) => ({
      ...L,
      body: r(L.body),
      emissive: r(L.emissive),
      pieces: L.pieces?.map((q) => ({ ...q, body: r(q.body), emissive: r(q.emissive) })),
      texts: L.texts?.map((t) => ({ ...t, color: col(t.color), glow: col(t.glow) })),
      glows: L.glows?.map((q) => ({ ...q, color: col(q.color) })),
    })),
    props: S.props.map((q) => ({ ...q, svg: r(q.svg) })),
    lights: S.lights.map((l) => ({ ...l, color: col(l.color) })),
    shafts: S.shafts?.map((q) => ({ ...q, color: col(q.color) })),
  };
}

/** The live pieces of level 5 (upside down), in the place and the drawing of their level (bar-vivo.ts). */
function adaptarNoche(nivel, d) {
  return { ...d, volteo: 810, sinVitrina: true, tubos: [] };
}
