// Pixel-art sprites of the Pang: the four, the bubbles, the bosses, the items, the blocks.
// Everything is painted ONCE into small canvases (cached) and the game only drawImage()s
// them, never resized with smoothing (docs/ESTILO.md, T5). Shapes are plotted pixel by
// pixel (char maps or scanline runs), so every edge is crisp. Outlines are always a dark
// tone of the material's own colour, never black (docs/ESTILO.md, F3 and P2).
import type { Anim, Arma, Bloque, ColorBola, Jefe, Objeto, PjId, Talla, Variante } from '../tipos';
import { ARMA_DE_OBJETO, RADIO } from '../tipos';

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};
const cache = new Map<string, unknown>();
function una<T>(k: string, f: () => T): T {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k) as T;
}
const ctx = (c: HTMLCanvasElement) => c.getContext('2d')!;

// ---------------------------------------------------------------- drawing helpers

type Pal = Record<string, string>;

/** Paints a char map (one letter per pixel; '.' or a letter not in the palette is empty). */
function pintar(x: CanvasRenderingContext2D, filas: string[], pal: Pal, ox = 0, oy = 0) {
  filas.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) {
      const col = pal[fila[i]];
      if (!col) continue;
      // Merge runs of the same letter into one fillRect.
      let k = i + 1;
      while (k < fila.length && fila[k] === fila[i]) k++;
      x.fillStyle = col;
      x.fillRect(ox + i, oy + j, k - i, 1);
      i = k - 1;
    }
  });
}
/** Mirrors a half map (its last column is the centre) into a symmetrical whole. */
const espejo = (m: string[]) => m.map((f) => f + [...f].reverse().join(''));
const rect = (x: CanvasRenderingContext2D, col: string, px: number, py: number, w: number, h: number) => {
  x.fillStyle = col;
  x.fillRect(px, py, w, h);
};
/** Crisp filled ellipse by scanlines (pixel centres inside the ellipse). */
function elipse(x: CanvasRenderingContext2D, col: string, cx: number, cy: number, rx: number, ry: number) {
  x.fillStyle = col;
  for (let j = Math.floor(cy - ry); j < Math.ceil(cy + ry); j++) {
    const dy = (j + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const a = Math.round(cx - half);
    const b = Math.round(cx + half);
    if (b > a) x.fillRect(a, j, b - a, 1);
  }
}
/** Ellipse with a 1 px outline in a darker tone. */
function elipseL(x: CanvasRenderingContext2D, col: string, lin: string, cx: number, cy: number, rx: number, ry: number) {
  elipse(x, lin, cx, cy, rx, ry);
  elipse(x, col, cx, cy, rx - 1, ry - 1);
}
/** Rectangle with an outline and the corners cut by one pixel (rounded look). */
function rectL(x: CanvasRenderingContext2D, col: string, lin: string, px: number, py: number, w: number, h: number, redondo = true) {
  rect(x, lin, px, py, w, h);
  rect(x, col, px + 1, py + 1, w - 2, h - 2);
  if (redondo) {
    x.clearRect(px, py, 1, 1);
    x.clearRect(px + w - 1, py, 1, 1);
    x.clearRect(px, py + h - 1, 1, 1);
    x.clearRect(px + w - 1, py + h - 1, 1, 1);
  }
}
/** A tiny deterministic random generator, so the art is the same on every load. */
function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/** A copy of a sprite with every opaque pixel pushed towards white: the flash of a hit. */
function destello(src: HTMLCanvasElement, t = 0.82) {
  const c = lienzo(src.width, src.height);
  const x = ctx(c);
  x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    if (d.data[i + 3] === 0) continue;
    d.data[i] += (255 - d.data[i]) * t;
    d.data[i + 1] += (255 - d.data[i + 1]) * t;
    d.data[i + 2] += (255 - d.data[i + 2]) * t;
  }
  x.putImageData(d, 0, 0);
  return c;
}

// ---------------------------------------------------------------- the four

/** Size of a player frame: 24 × 32, feet at the bottom centre (12, 32). Facing right. */
export const JUGADOR = { w: 24, h: 32 } as const;

type Vista = '3q' | 'frente' | 'espalda';
type Expr = 'normal' | 'feliz' | 'x' | 'espiral' | 'arriba';

/** Everything that makes one friend recognisable. Maps are 12 wide; halves are mirrored. */
interface Molde {
  alto: number;
  pal: Pal;
  /** Head in 3/4 view (facing right), the front view looking up (half) and the back (half). */
  cab: string[];
  cabF: string[];
  cabE: string[];
  /** Top-left of each 2×2 eye and the mouth (x, y, width), in head-map coordinates. */
  ojos: [number, number][];
  ojosF: [number, number][];
  boca: [number, number, number];
  bocaF: [number, number, number];
  /** Torso, whole maps (front and back). */
  tor: string[];
  torE: string[];
  /** Legs: x of the left and right leg, width, rows from the hip down (letters, see TONOS). */
  pierna: { w: number; xs: [number, number]; filas: string; inset?: string };
  /** A corner of the mouth goes up (a smile) when the face is calm. */
  sonrisa?: boolean;
  /** 10 × 10 face for the lives counter. */
  icono: string[];
  /** Arm: width and rows from the shoulder down (the last two are the hand). */
  brazo: { w: number; filas: string };
}

/** Per letter of a leg or arm: [left outline, body, right shade] and an inset on each side. */
const TONOS: Record<string, [string, string, string]> = {
  t: ['l', 't', 'T'],
  s: ['o', 's', 'S'],
  p: ['i', 'p', 'P'],
  w: ['W', 'w', 'W'],
  z: ['Z', 'z', 'Z'],
  f: ['F', 'f', 'F'],
  Z: ['Z', 'Z', 'Z'],
};

const OJO = { blanco: '#f4efe4', negro: '#2a1a16', boca: '#5a2422', dientes: '#f6f2e8', estrella: '#ffd23a' };

// -- Fran: stocky, big dark beard, grey in the hair, thick brows, teal tee, long shorts.
const FRAN: Molde = {
  alto: 29,
  pal: {
    h: '#2b221e', H: '#4b3e37', g: '#948b84', s: '#e8b296', S: '#c88a70', o: '#93533f', k: '#1a1411', L: '#b5675b',
    b: '#2a201c', B: '#4a3a32',
    t: '#2e8a8c', T: '#1f6567', u: '#4cb0b0', l: '#174c4e',
    e: '#2a1a16', p: '#3e5279', P: '#2c3b5a', i: '#1d2a42', w: '#e9e4da', W: '#b9b3a6', z: '#4a4d57', Z: '#24262d',
  },
  cab: [
    '...hhhhhhh..',
    '..hhhHhhhhh.',
    '.hhgHhhhhhh.',
    '.hhhhhsssss.',
    '.hhhkkkkkkko',
    '.hhhssssssso',
    '.hhSsssssssS',
    '.bbbbssbbbb.',
    '.bbbbbbbbbbb',
    '.bBbbbbbbbB.',
    '..bbbBbbbb..',
  ],
  cabF: ['..hhhh', '.hhHhh', 'hhgHhh', 'hhhhhh', 'hskkks', 'hsssss', 'SSssss', 'bbssss', 'bbbbbb', 'bBbbbb', '.bbbbB'],
  cabE: ['..hhhh', '.hhHhh', 'hhgHhh', 'hhhhhh', 'hhhhhh', 'hhhhhh', 'ShhhHh', 'bhhhhh', 'bbhhhh', 'bBbhhh', '.bbbbb'],
  ojos: [[5, 5], [8, 5]],
  ojosF: [[2, 5], [8, 5]],
  boca: [8, 8, 2],
  bocaF: [4, 8, 4],
  tor: espejo(['.luttt', 'lutttt', 'lttttt', 'lttttt', 'lTtttt', 'lTTttt', 'lTTTtt', '.TTTTT']),
  torE: espejo(['.luttt', 'lutttT', 'lttttT', 'lttttT', 'lTtttT', 'lTTttT', 'lTTTtT', '.TTTTT']),
  pierna: { w: 5, xs: [6, 12], filas: 'ppppps' + 'ww' + 'zZ', inset: 'sw' },
  brazo: { w: 3, filas: 'tttsssss' },
  icono: ['..hhhhhh..', '.hhHhhghh.', 'hhhHhhhhhh', 'hssssssssh', 'hskksskksh', 'hsessssesh', 'bbssssssbb', 'bbbbbbbbbb', 'bBbbLLbbBb', '.bbbBbbbb.'],
};

// -- Pablo: slim, messy brown hair up, short beard, small earring, open dark sherpa jacket.
const PABLO: Molde = {
  alto: 30,
  sonrisa: true,
  pal: {
    h: '#5c3d28', H: '#86603f', s: '#dba27e', S: '#bc805f', o: '#874c33', k: '#3f2a1c', L: '#b8604f', e: '#2a1a14',
    b: '#5c3f2b', B: '#80593e', r: '#e4e8ee',
    t: '#3a3a46', T: '#2a2a34', u: '#555563', l: '#1d1d26', f: '#d8cfb8', F: '#b8ae94', a: '#ece6d6', A: '#cfc8b4',
    p: '#4a6a9a', P: '#36507a', i: '#26385a', z: '#f1efe8', Z: '#bdb8aa',
  },
  cab: [
    '...h..h.h...',
    '..hhhhHhhh..',
    '.hhHhhhhhhh.',
    '.hhhhhhhhss.',
    '.hhhhsssssso',
    '.hhhskkskkko',
    '.hhhsssssss.',
    '.hhSssssssss',
    '.hbrsssssss.',
    '..bbbsssbbb.',
    '..bbbbbbbb..',
    '...bbbbbb...',
  ],
  cabF: ['..h.h.', '.hhhHh', 'hhHhhh', 'hhhhhh', 'hhhsss', 'hskkss', 'hsssss', 'hSssss', 'hbssss', '.bbsss', '..bbbb', '...bbb'],
  cabE: ['..h.h.', '.hhhHh', 'hhHhhh', 'hhhhhh', 'hhhhhh', 'hhhhhh', 'hhhhhh', 'ShhhHh', 'rbhhhh', '.bhhhh', '..bbhh', '...bbb'],
  ojos: [[5, 6], [8, 6]],
  ojosF: [[2, 6], [8, 6]],
  boca: [5, 9, 3],
  bocaF: [4, 9, 4],
  tor: espejo(['.lfss', 'lutfa', 'lttfa', 'lttfa', 'lTtfa', 'lTtfa', 'lTtfa', '.TTfa']),
  torE: espejo(['.lfTt', 'luttT', 'lttTT', 'lttTT', 'lTttT', 'lTttT', 'lTttT', '.TTTT']),
  pierna: { w: 4, xs: [7, 13], filas: 'pppppppp' + 'zZ' },
  brazo: { w: 2, filas: 'tttttfss' },
  icono: ['.h.hhh.h..', '.hhhHhhhh.', 'hhhhhhhhhh', 'hhsssssshh', 'hskksskksh', 'hsessssesh', 'SssssssssS', 'rbbssssbbS', '.bbsLLsbb.', '..bbbbbb..'],
};

// -- Chuchi: tall and thin, bald and shiny, square dark-brown glasses, trimmed red beard.
const CHUCHI: Molde = {
  alto: 31,
  sonrisa: true,
  pal: {
    s: '#f1c6a9', S: '#d59f86', x: '#fff0e2', o: '#a0624a', k: '#9a6440', L: '#c27064', e: '#3d2a1e',
    f: '#46291a', F: '#8a5a3c', r: '#b4552f', R: '#8a3a1e', q: '#c98b5c',
    t: '#7b2432', T: '#5b1824', u: '#9c3a4a', l: '#3e1019',
    p: '#3a3b46', P: '#282932', i: '#1a1b22', z: '#ecebe6', Z: '#b9b6ae',
  },
  cab: [
    '...ssssss...',
    '..sxxsssss..',
    '.sxssssssss.',
    '.sssskkskkk.',
    '.sssfffffffo',
    '.sfffssfssfo',
    '.ssSfssfssfs',
    '.sssFFFFFFFs',
    '.srrssssrrr.',
    '.rrrsssrrrr.',
    '..rrrrrrrr..',
  ],
  cabF: ['..ssss', '.sxsss', 'sxssss', 'sskkss', 'sffffs', 'sfssff', 'Sfssfs', 'sFFFFs', 'srrsrr', 'rrrsss', '.rrrrr'],
  cabE: ['..ssss', '.sxsss', 'sxssss', 'ssssss', 'ssssss', 'sfssss', 'Sfssss', 'ssssss', 'srssss', '.rrsss', '..rrrr'],
  ojos: [[5, 5], [8, 5]],
  ojosF: [[2, 5], [8, 5]],
  boca: [4, 9, 3],
  bocaF: [3, 9, 6],
  tor: espejo(['.lTs', 'lutt', 'lttt', 'lttt', 'lTtt', 'lTtt', 'lTtt', 'lTTt', 'lTTT']),
  torE: espejo(['.lTT', 'luTt', 'lttT', 'lttT', 'lTtT', 'lTtT', 'lTtT', 'lTTT', 'lTTT']),
  pierna: { w: 3, xs: [8, 13], filas: 'ppppppppp' + 'zZ' },
  brazo: { w: 2, filas: 'ttttttt' + 'ss' },
  icono: ['..ssssss..', '.sxxsssss.', 'sxssssssss', 'ssssssssss', 'sffffffffs', 'sfesffsefs', 'sFFFFFFFFs', 'rrrsssssrr', 'rrrsLLsrrr', '.rrrrrrrr.'],
};

// -- Guille: the tallest, athletic, dark longish hair, thick brows, stubble, Hawaiian shirt.
const GUILLE: Molde = {
  alto: 32,
  sonrisa: true,
  pal: {
    h: '#241a16', H: '#45362f', s: '#e2af8c', S: '#c38a68', o: '#8c5437', k: '#1d1512', L: '#b8695a', e: '#22150f', u: '#a9714f',
    t: '#e2a32e', T: '#b67c1c', l: '#7a5210', r: '#c8323a', R: '#8e1e28', y: '#ffe08a', g: '#4a8a3a', G: '#2f6a2a', c: '#f5c95f',
    p: '#3e5a86', P: '#2c4268', i: '#1e2e4c', z: '#7a4a2a', Z: '#4a2c16',
  },
  cab: [
    '...hhhhhh...',
    '..hhhHhhhh..',
    '.hhhhhhhhhh.',
    '.hhhhhhhhss.',
    '.hhhhkkkkkko',
    '.hhhsssssss.',
    '.hhSssssssss',
    '.hhhsusssus.',
    '.hhhsssssss.',
    '..hhsuuusus.',
    '....suuuus..',
  ],
  cabF: ['..hhhh', '.hhHhh', 'hhhhhh', 'hhhhss', 'hhkkks', 'hsssss', 'hSssss', 'hhsssu', 'hhssss', '.hsuuu', '..suuu'],
  cabE: ['..hhhh', '.hhHhh', 'hhHhhh', 'hhhhhh', 'hhhhhh', 'hhhhhh', 'Shhhhh', 'hhhhHh', 'hhhhhh', '.hhhhh', '..hhhh'],
  ojos: [[5, 5], [8, 5]],
  ojosF: [[2, 5], [8, 5]],
  boca: [6, 8, 4],
  bocaF: [3, 8, 6],
  tor: [
    '.lcttssttcl.',
    'lcttcssctttl',
    'ltttcTTctttl',
    'ltrrtTTtttgl',
    'lgrytTTttgGl',
    'lttgtTTtrrtl',
    'ltttTTTtrytl',
    '.lttTTTtttgl',
    '.ltttTTtttl.',
    '..lTTTTTTl..',
  ],
  torE: [
    '.lccccccccl.',
    'lcttttttttcl',
    'ltttrrtttttl',
    'lttrryrtttgl',
    'ltttrrtttgGl',
    'lttgtttttttl',
    'ltttttttttTl',
    '.lttttttttl.',
    '.ltttttttTl.',
    '..lTTTTTTl..',
  ],
  pierna: { w: 4, xs: [7, 13], filas: 'ppppppppp' + 'zZ' },
  brazo: { w: 3, filas: 'ttt' + 'ssssss' },
  icono: ['..hhhhhh..', '.hhhHhhhh.', 'hhhhhhhhhh', 'hhsssssshh', 'hkkkssskkh', 'hsessssesh', 'hhssssssh.', 'hsuussuush', '.suLLLLus.', '..suuuus..'],
};

// ---------------------------------------------------------------- the engine of a figure

interface Pie {
  /** Horizontal displacement of the foot (+ = forward, to the right). */
  dx: number;
  /** The foot is lifted this many pixels. */
  alza?: number;
}
interface Brazo {
  modo: 'cuelga' | 'sube';
  /** Horizontal displacement of the hand relative to the shoulder. */
  dx: number;
  /** Fewer rows (a bent arm). */
  corto?: number;
}
interface Pose {
  vista: Vista;
  expr: Expr;
  /** The upper body is lowered by this many px (breathing, steps). */
  bob?: number;
  cabDx?: number;
  piernas: [Pie, Pie];
  brazos: [Brazo, Brazo];
  /** Dazed stars next to the head (which of the two arrangements). */
  estrellas?: 1 | 2;
}

function dibujarPierna(x: CanvasRenderingContext2D, m: Molde, px: number, py: number, pie: Pie) {
  const filas = m.pierna.filas.split('');
  if (pie.alza) filas.splice(2, pie.alza);
  const n = filas.length;
  const w = m.pierna.w;
  filas.forEach((L, i) => {
    const t = TONOS[L] ?? [L, L, L];
    const ins = m.pierna.inset?.includes(L) ? 1 : 0;
    const ox = px + Math.round((pie.dx * i) / (n - 1));
    for (let k = ins; k < w - ins; k++) rect(x, m.pal[k === ins ? t[0] : k === w - 1 - ins ? t[2] : t[1]], ox + k, py + i, 1, 1);
    // The shoe has a toe pointing right.
    if (L === 'z' || L === 'Z') rect(x, m.pal[L], ox + w, py + i, 1, 1);
  });
}

function dibujarBrazo(x: CanvasRenderingContext2D, m: Molde, ax: number, sy: number, b: Brazo) {
  const filas = m.brazo.filas.split('');
  if (b.corto) filas.splice(2, b.corto);
  const n = filas.length;
  const w = m.brazo.w;
  filas.forEach((L, i) => {
    const t = TONOS[L] ?? [L, L, L];
    const ox = ax + Math.round((b.dx * i) / (n - 1));
    const y = b.modo === 'sube' ? sy - i : sy + i;
    for (let k = 0; k < w; k++) rect(x, m.pal[k === 0 ? t[0] : k === w - 1 ? t[2] : t[1]], ox + k, y, 1, 1);
  });
}

/** Eyes and mouth over the head map, by expression. */
function rostro(x: CanvasRenderingContext2D, m: Molde, e: Expr, vista: Vista, hx: number, hy: number) {
  const ojos = vista === 'frente' ? m.ojosF : m.ojos;
  const [mx, my, mw] = vista === 'frente' ? m.bocaF : m.boca;
  const P = (px: number, py: number, col: string) => rect(x, col, hx + px, hy + py, 1, 1);
  ojos.forEach(([ex, ey], k) => {
    const cx = ex + k; // centre column for the 3-wide shapes (the far eye one to the right)
    if (e === 'normal') {
      rect(x, OJO.blanco, hx + ex, hy + ey, 1, 2);
      rect(x, OJO.negro, hx + ex + 1, hy + ey, 1, 2);
    } else if (e === 'arriba') {
      rect(x, OJO.negro, hx + ex, hy + ey, 2, 1);
      rect(x, OJO.blanco, hx + ex, hy + ey + 1, 2, 1);
    } else if (e === 'feliz') {
      P(cx - 1, ey + 1, OJO.negro);
      P(cx, ey, OJO.negro);
      P(cx + 1, ey + 1, OJO.negro);
    } else if (e === 'x') {
      [[-1, 0], [1, 0], [0, 1], [-1, 2], [1, 2]].forEach(([dx, dy]) => P(cx + dx, ey + dy, OJO.negro));
    } else {
      [[-1, 0], [0, 0], [1, 0], [-1, 1], [1, 1], [-1, 2], [0, 2]].forEach(([dx, dy]) => P(cx + dx, ey + dy, OJO.negro));
    }
  });
  const lab = m.pal.L;
  if (e === 'feliz') {
    const fw = Math.max(mw + 1, 3);
    rect(x, OJO.dientes, hx + mx, hy + my, fw, 1);
    rect(x, OJO.boca, hx + mx + 1, hy + my + 1, fw - 2, 1);
  } else if (e === 'x' || e === 'espiral') {
    rect(x, OJO.boca, hx + mx, hy + my, 2, 2);
  } else {
    rect(x, lab, hx + mx, hy + my, mw, 1);
    if (m.sonrisa && vista === '3q') P(mx + mw, my - 1, lab);
  }
}

function figura(m: Molde, p: Pose): HTMLCanvasElement {
  const c = lienzo(JUGADOR.w, JUGADOR.h);
  const x = ctx(c);
  const bob = p.bob ?? 0;
  const y0 = 32 - m.alto;
  // Legs first: the torso hides their top rows.
  const largoPie = m.pierna.filas.length;
  p.piernas.forEach((pie, k) => dibujarPierna(x, m, m.pierna.xs[k], 32 - largoPie, pie));
  const cabAlto = m.cab.length;
  const hx = 6 + (p.cabDx ?? 0);
  const hy = y0 + bob;
  const ty = hy + cabAlto;
  const tw = m.tor[0].length;
  const tx = 12 - tw / 2;
  pintar(x, p.vista === 'espalda' ? m.torE : m.tor, m.pal, tx, ty);
  const aw = m.brazo.w;
  dibujarBrazo(x, m, tx - aw, ty + 1, p.brazos[0]);
  dibujarBrazo(x, m, tx + tw, ty + 1, p.brazos[1]);
  const mapa = p.vista === '3q' ? m.cab : espejo(p.vista === 'frente' ? m.cabF : m.cabE);
  pintar(x, mapa, m.pal, hx, hy);
  if (p.vista !== 'espalda') rostro(x, m, p.expr, p.vista, hx, hy);
  if (p.estrellas) {
    const sx = p.estrellas === 1 ? [2, 20] : [3, 19];
    const sy = p.estrellas === 1 ? [hy + 2, hy + 5] : [hy + 5, hy + 2];
    [0, 1].forEach((k) => {
      rect(x, OJO.estrella, sx[k] - 1, sy[k], 3, 1);
      rect(x, OJO.estrella, sx[k], sy[k] - 1, 1, 3);
    });
  }
  return c;
}

const PARADO: [Pie, Pie] = [{ dx: 0 }, { dx: 0 }];
const COLGAR: [Brazo, Brazo] = [{ modo: 'cuelga', dx: 0 }, { modo: 'cuelga', dx: 0 }];

function animaciones(m: Molde): Record<Anim, HTMLCanvasElement[]> {
  const f = (p: Pose) => figura(m, p);
  const cuelga = (a: number, b: number): [Brazo, Brazo] => [
    { modo: 'cuelga', dx: a },
    { modo: 'cuelga', dx: b },
  ];
  return {
    // Breathing: the upper body sinks one pixel.
    quieto: [f({ vista: '3q', expr: 'normal', piernas: PARADO, brazos: COLGAR }), f({ vista: '3q', expr: 'normal', bob: 1, piernas: PARADO, brazos: COLGAR })],
    // Contact, passing, contact, passing: legs and arms swing against each other.
    andar: [
      f({ vista: '3q', expr: 'normal', bob: 1, piernas: [{ dx: -2 }, { dx: 2 }], brazos: cuelga(1, -1) }),
      f({ vista: '3q', expr: 'normal', piernas: [{ dx: 0 }, { dx: 0, alza: 2 }], brazos: cuelga(0, 0) }),
      f({ vista: '3q', expr: 'normal', bob: 1, piernas: [{ dx: 2 }, { dx: -2 }], brazos: cuelga(-1, 1) }),
      f({ vista: '3q', expr: 'normal', piernas: [{ dx: 0, alza: 2 }, { dx: 0 }], brazos: cuelga(0, 0) }),
    ],
    // Facing us, looking up, the right arm straight up with the harpoon.
    disparar: [f({ vista: 'frente', expr: 'arriba', piernas: PARADO, brazos: [{ modo: 'cuelga', dx: 0 }, { modo: 'sube', dx: 0 }] })],
    // From behind: arms and legs climb in turns.
    escalar: [
      f({ vista: 'espalda', expr: 'normal', piernas: [{ dx: 0, alza: 3 }, { dx: 0 }], brazos: [{ modo: 'sube', dx: 0 }, { modo: 'sube', dx: 0, corto: 3 }] }),
      f({ vista: 'espalda', expr: 'normal', piernas: [{ dx: 0 }, { dx: 0, alza: 3 }], brazos: [{ modo: 'sube', dx: 0, corto: 3 }, { modo: 'sube', dx: 0 }] }),
    ],
    // Dazed: eyes as X then as spirals, swaying, stars around the head.
    herido: [
      f({ vista: '3q', expr: 'x', cabDx: -1, piernas: [{ dx: -1 }, { dx: 1 }], brazos: cuelga(-2, 2), estrellas: 1 }),
      f({ vista: '3q', expr: 'espiral', cabDx: 1, bob: 1, piernas: [{ dx: 1 }, { dx: -1 }], brazos: cuelga(-2, 2), estrellas: 2 }),
    ],
    // Both arms up, laughing, a little bounce.
    victoria: [
      f({ vista: '3q', expr: 'feliz', piernas: PARADO, brazos: [{ modo: 'sube', dx: -1 }, { modo: 'sube', dx: 1 }] }),
      f({ vista: '3q', expr: 'feliz', bob: 1, piernas: PARADO, brazos: [{ modo: 'sube', dx: -2 }, { modo: 'sube', dx: 2 }] }),
    ],
  };
}

const MOLDES: Record<PjId, Molde> = { fran: FRAN, pablo: PABLO, chuchi: CHUCHI, guille: GUILLE };

/**
 * A player's animations. Frame counts: quieto 2, andar 4, disparar 1 (looking up,
 * facing the camera), escalar 2 (from behind), herido 2, victoria 2.
 */
export function jugador(pj: PjId): Record<Anim, HTMLCanvasElement[]> {
  return una(`pj|${pj}`, () => animaciones(MOLDES[pj]));
}

/** A 10 × 10 face for the lives counter. */
export function cara(pj: PjId): HTMLCanvasElement {
  return una(`cara|${pj}`, () => {
    const c = lienzo(10, 10);
    pintar(ctx(c), MOLDES[pj].icono, MOLDES[pj].pal);
    return c;
  });
}

// ---------------------------------------------------------------- shapes for bubbles and bosses

interface TonosEsfera {
  borde: string;
  base: string;
  sombra: string;
  luz: string;
  /** The specular spot; omitted for matt things. */
  brillo?: string;
}
/**
 * A shaded ball (or ellipse), plotted pixel by pixel: dark rim, base, a shadow crescent
 * at the lower right, a lighter zone and a specular spot at the upper left.
 */
function esfera(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, t: TonosEsfera) {
  const m = Math.min(rx, ry);
  for (let j = Math.floor(cy - ry); j < Math.ceil(cy + ry); j++) {
    for (let i = Math.floor(cx - rx); i < Math.ceil(cx + rx); i++) {
      const dx = (i + 0.5 - cx) / rx;
      const dy = (j + 0.5 - cy) / ry;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      let col = t.base;
      if (d > 1 - 1.05 / m) col = t.borde;
      else {
        if (dx * 0.5 + dy * 0.75 > 0.42) col = t.sombra;
        const hd = Math.hypot(dx + 0.42, dy + 0.45) * m;
        const hr = Math.max(0.9, 0.17 * m);
        if (hd < hr) col = t.brillo ?? t.luz;
        else if (m >= 7 && hd < hr * 2.1 && col === t.base) col = t.luz;
      }
      rect(x, col, i, j, 1, 1);
    }
  }
}
/** A line of pixels of the given thickness. */
function linea(x: CanvasRenderingContext2D, col: string, x0: number, y0: number, x1: number, y1: number, g = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  x.fillStyle = col;
  for (let k = 0; k <= n; k++) x.fillRect(Math.round(x0 + ((x1 - x0) * k) / n - (g - 1) / 2), Math.round(y0 + ((y1 - y0) * k) / n - (g - 1) / 2), g, g);
}
/** Filled polygon (even-odd on pixel centres). */
function poli(x: CanvasRenderingContext2D, col: string, pts: [number, number][]) {
  const ys = pts.map((p) => p[1]);
  x.fillStyle = col;
  for (let j = Math.floor(Math.min(...ys)); j < Math.ceil(Math.max(...ys)); j++) {
    const yc = j + 0.5;
    const cortes: number[] = [];
    for (let k = 0; k < pts.length; k++) {
      const [ax, ay] = pts[k];
      const [bx, by] = pts[(k + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) cortes.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    cortes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cortes.length; k += 2) {
      const a = Math.round(cortes[k]);
      const b = Math.round(cortes[k + 1]);
      if (b > a) x.fillRect(a, j, b - a, 1);
    }
  }
}
/** A cross of 3 × 3 pixels (a sparkle). */
const brillito = (x: CanvasRenderingContext2D, col: string, cx: number, cy: number) => {
  rect(x, col, cx - 1, cy, 3, 1);
  rect(x, col, cx, cy - 1, 1, 3);
};

// ---------------------------------------------------------------- bubbles

const BOLAS: Record<ColorBola, TonosEsfera> = {
  roja: { borde: '#6e1219', base: '#d8323a', sombra: '#a8222c', luz: '#ff7a80', brillo: '#ffffff' },
  azul: { borde: '#122f6e', base: '#2f6fd8', sombra: '#2252a8', luz: '#7ab0ff', brillo: '#ffffff' },
  amarilla: { borde: '#7a5a08', base: '#f2c42a', sombra: '#c99a14', luz: '#fff09a', brillo: '#ffffff' },
  verde: { borde: '#14501e', base: '#3aae4a', sombra: '#268a36', luz: '#8ae890', brillo: '#ffffff' },
};
const PURIN: TonosEsfera = { borde: '#3a361c', base: '#74703a', sombra: '#58542a', luz: '#8f8a4c', brillo: '#a29d62' };
const CERDITO: TonosEsfera = { borde: '#9c4a55', base: '#f2a7aa', sombra: '#dc838b', luz: '#fcd0cc', brillo: '#fff0ee' };

/** One bubble of radius r, painted in a (2r + 2) square. */
function pintarBurbuja(variante: Variante, r: number, color: ColorBola): HTMLCanvasElement {
  const c = lienzo(r * 2 + 2, r * 2 + 2);
  const x = ctx(c);
  const o = r + 1;
  if (variante === 'bola') {
    esfera(x, o, o, r, r, BOLAS[color]);
  } else if (variante === 'purin') {
    esfera(x, o, o, r, r, PURIN);
    // Mud: dark and pale blotches, 2 px clumps.
    const az = azar(r * 7 + 3);
    const n = r >= 12 ? 14 : r >= 7 ? 5 : 1;
    for (let k = 0; k < n; k++) {
      const a = az() * Math.PI * 2;
      const d = az() * r * 0.62;
      const px = Math.round(o + Math.cos(a) * d);
      const py = Math.round(o + Math.sin(a) * d);
      rect(x, k % 3 === 0 ? '#9a9558' : '#4a4620', px, py, r >= 12 ? 2 : 1, 1);
    }
  } else if (variante === 'cerveza') {
    const T = { borde: '#8f5f12', base: '#e9b13c', sombra: '#c98a22', luz: '#ffd877', espuma: '#fbf3dc', espumaS: '#e0d2a8', borde2: '#a8905a' };
    for (let j = 0; j < c.height; j++) {
      for (let i = 0; i < c.width; i++) {
        const dx = i + 0.5 - o;
        const dy = j + 0.5 - o;
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        const u = dx / r;
        const v = dy / r;
        const espuma = v < -0.34 + 0.08 * Math.sin(u * 7 + 1);
        let col: string;
        if (d > r - 1.05) col = espuma ? T.borde2 : T.borde;
        else if (espuma) col = u * 0.5 + v * 0.7 > 0.1 || (u > 0.45 && v > -0.62) ? T.espumaS : T.espuma;
        else if (u * 0.5 + v * 0.7 > 0.42) col = T.sombra;
        else col = Math.abs(u + 0.46) < 0.14 && v > -0.12 && v < 0.5 ? T.luz : T.base;
        rect(x, col, i, j, 1, 1);
      }
    }
    if (r >= 12) {
      // Tiny bubbles in the beer.
      [[0.2, 0.3], [0.45, 0.55], [-0.15, 0.58], [0.05, 0.1]].forEach(([u, v]) => rect(x, T.luz, Math.round(o + u * r), Math.round(o + v * r), 1, 1));
    }
  } else if (variante === 'champan') {
    const T: TonosEsfera = { borde: '#b69a48', base: '#f6e6a4', sombra: '#dcc277', luz: '#fffbe6', brillo: '#ffffff' };
    esfera(x, o, o, r, r, T);
    // Sparkles: crosses of light, more on the big ones.
    const bri: [number, number][] = r >= 20 ? [[-0.36, -0.36], [0.42, 0.05], [-0.08, 0.52]] : r >= 12 ? [[-0.36, -0.3], [0.38, 0.22]] : r >= 7 ? [[-0.3, -0.25]] : [];
    bri.forEach(([u, v]) => brillito(x, '#ffffff', Math.round(o + u * r), Math.round(o + v * r)));
    if (r >= 12) [[0.5, -0.4], [-0.5, 0.35], [0.1, 0.05]].forEach(([u, v]) => rect(x, '#fffbe6', Math.round(o + u * r), Math.round(o + v * r), 1, 1));
  } else if (variante === 'posavasos') {
    // A hexagonal beer mat (flat top), cream with a red ring and a gold dot.
    const R = r + 0.5;
    const anillo0 = Math.max(1.6, 0.55 * R);
    const anillo1 = anillo0 + Math.max(1.2, 0.15 * R);
    for (let j = 0; j < c.height; j++) {
      for (let i = 0; i < c.width; i++) {
        const dx = i + 0.5 - o;
        const dy = j + 0.5 - o;
        const m = Math.max((Math.abs(dy) * 2) / Math.sqrt(3), Math.abs(dx) + Math.abs(dy) / Math.sqrt(3));
        if (m > R) continue;
        let col = '#f3e6c4';
        if (m > R - 1.1) col = '#9c8550';
        else if (m > R - 2.2 && dx + dy * 0.8 > 0) col = '#d8c598';
        else if (m >= anillo0 && m < anillo1) col = dx * 0.5 + dy * 0.7 > 0.3 * R ? '#8e1e28' : '#c8323a';
        else if (m < anillo0 - 0.5 && r >= 12 && m < 0.22 * R) col = '#e9b13c';
        rect(x, col, i, j, 1, 1);
      }
    }
  } else {
    // cerdito: a round pink piglet, ears sticking out a little.
    const e = (s: number) => {
      // ear: a triangle on the upper corner, outline then inner
      const pts = (k: number): [number, number][] => [
        [o + s * (0.28 * r - k * 0.6), o - 0.9 * r],
        [o + s * (0.86 * r + k * 0.4), o - 0.5 * r + k * 0.3],
        [o + s * (0.84 * r + k * 0.5), o - 1.04 * r - k * 0.6],
      ];
      poli(x, CERDITO.borde, pts(1));
      poli(x, CERDITO.sombra, pts(0));
    };
    if (r >= 7) {
      e(-1);
      e(1);
    } else {
      rect(x, CERDITO.borde, o - 4, 0, 2, 2);
      rect(x, CERDITO.borde, o + 2, 0, 2, 2);
    }
    esfera(x, o, o, r, r, CERDITO);
    const ojo = r >= 12 ? 2 : 1;
    [-1, 1].forEach((s) => {
      rect(x, '#2a1418', Math.round(o + s * 0.36 * r - (s > 0 ? 0 : ojo)), Math.round(o - 0.2 * r), ojo, r >= 12 ? 3 : r >= 7 ? 2 : 1);
      if (r >= 20) rect(x, '#ffffff', Math.round(o + s * 0.36 * r - (s > 0 ? 0 : ojo)), Math.round(o - 0.2 * r), 1, 1);
    });
    // snout
    if (r >= 7) {
      elipseL(x, '#ea8c95', '#9c4a55', o, o + 0.34 * r, Math.max(3, 0.42 * r), Math.max(2.5, 0.28 * r));
      const nx = Math.max(1, Math.round(0.14 * r));
      rect(x, '#7a3440', o - nx - 1, Math.round(o + 0.3 * r), r >= 12 ? 2 : 1, r >= 12 ? 3 : 2);
      rect(x, '#7a3440', o + nx, Math.round(o + 0.3 * r), r >= 12 ? 2 : 1, r >= 12 ? 3 : 2);
    } else {
      rect(x, '#ea8c95', o - 2, o + 1, 4, 2);
      rect(x, '#7a3440', o - 1, o + 1, 1, 1);
      rect(x, '#7a3440', o, o + 1, 1, 1);
    }
  }
  return c;
}

/** A bubble: (2r + 2) square, its centre in the middle. */
export function burbuja(variante: Variante, talla: Talla, color: ColorBola = 'roja'): HTMLCanvasElement {
  return una(`b|${variante}|${talla}|${variante === 'bola' ? color : ''}`, () => pintarBurbuja(variante, RADIO[talla], color));
}

const ESTALLIDOS: Record<Variante, string[]> = {
  cerveza: ['#fbf3dc', '#e9b13c', '#c98a22'],
  bola: ['#fff0f0', '#d8323a', '#2f6fd8', '#f2c42a', '#3aae4a'],
  purin: ['#a29d62', '#74703a', '#8f8a4c'],
  posavasos: ['#f3e6c4', '#c8323a', '#d8c598'],
  champan: ['#fffbe6', '#f6e6a4', '#ffffff'],
  cerdito: ['#fcd0cc', '#f2a7aa', '#dc838b'],
};

/** The pop of a bubble of that size: 4 frames, (2r + 12) square, centred like the bubble. */
export function estallido(variante: Variante, talla: Talla): HTMLCanvasElement[] {
  return una(`e|${variante}|${talla}`, () => {
    const r = RADIO[talla];
    const S = r * 2 + 12;
    const o = S / 2;
    const cols = ESTALLIDOS[variante];
    const n = r >= 20 ? 14 : r >= 12 ? 12 : r >= 7 ? 9 : 7;
    const tam = r >= 20 ? [5, 4, 3, 2] : r >= 12 ? [4, 3, 3, 2] : r >= 7 ? [3, 3, 2, 1] : [3, 2, 2, 1];
    const rho = [r * 0.9 + 1.5, r + 2.4, r + 3.6, r + 4.6];
    return [0, 1, 2, 3].map((k) => {
      const c = lienzo(S, S);
      const x = ctx(c);
      // The ring of foam: whole, then broken, then gone.
      if (k < 2) {
        for (let j = 0; j < S; j++)
          for (let i = 0; i < S; i++) {
            const dx = i + 0.5 - o;
            const dy = j + 0.5 - o;
            const d = Math.hypot(dx, dy);
            const grueso = k === 0 ? 3 : 2;
            if (d > rho[k] || d < rho[k] - grueso) continue;
            const a = Math.atan2(dy, dx) + Math.PI;
            if (k === 1 && Math.floor((a / (Math.PI * 2)) * n * 2) % 2 === 0) continue;
            rect(x, cols[0], i, j, 1, 1);
          }
      }
      // Droplets flying out.
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * 0.13 + (i % 2) * 0.1;
        const rr = rho[k] + (i % 2 ? 1.2 : -0.6) * (k + 1) * 0.7;
        const s = Math.max(1, tam[k] - (i % 3 === 0 ? 1 : 0));
        const col = variante === 'bola' ? cols[1 + (i % 4)] : cols[i % 3];
        const px = Math.round(o + Math.cos(a) * Math.min(rr, o - s - 0.5) - s / 2);
        const py = Math.round(o + Math.sin(a) * Math.min(rr, o - s - 0.5) - s / 2);
        if (variante === 'champan' && k >= 1 && i % 3 === 0) brillito(x, '#ffffff', px + 1, py + 1);
        else rect(x, col, px, py, s, s);
      }
      // A few inner crumbs in the first frames.
      if (k === 1 || k === 2) for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.5 + k;
        rect(x, cols[(i + 1) % cols.length], Math.round(o + Math.cos(a) * rho[k] * 0.55), Math.round(o + Math.sin(a) * rho[k] * 0.55), 1, 1);
      }
      return c;
    });
  });
}

// ---------------------------------------------------------------- items

/** A shape given as, per row, the first and last column filled ([] = empty row). */
type Mascara = ([number, number] | null)[];
function dentro(m: Mascara, i: number, j: number) {
  const f = m[j];
  return !!f && i >= f[0] && i <= f[1];
}
/** Paints a mask: outline where it touches the outside, light on the upper left, shade on the lower right. */
function pintarMascara(x: CanvasRenderingContext2D, m: Mascara | ((i: number, j: number) => boolean), t: { lin: string; base: string; luz: string; sombra: string }) {
  const en = typeof m === 'function' ? m : (i: number, j: number) => dentro(m, i, j);
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      if (!en(i, j)) continue;
      const fuera = (a: number, b: number) => !en(i + a, j + b);
      let col = t.base;
      if (fuera(-1, 0) || fuera(1, 0) || fuera(0, -1) || fuera(0, 1)) col = t.lin;
      else if (fuera(-1, 0) || fuera(0, -1) || fuera(-2, 0) || fuera(0, -2)) col = t.luz;
      else if (fuera(2, 0) || fuera(0, 2) || fuera(1, 1)) col = t.sombra;
      rect(x, col, i, j, 1, 1);
    }
  }
}

/** The weapon items' capsule (a rounded badge, in one colour per weapon) and what is drawn on it, 12 × 12. */
const CAPSULA: Mascara = [[2, 8], [1, 9], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [1, 9], [2, 8]];
const COLOR_ARMA: Record<Arma, { lin: string; base: string; luz: string; sombra: string }> = {
  normal: { lin: '#3a3a44', base: '#80808e', luz: '#aeaebc', sombra: '#5e5e6c' },
  doble: { lin: '#122a66', base: '#3f74d6', luz: '#7ba6f0', sombra: '#2a54a8' },
  triple: { lin: '#124a24', base: '#3fa65a', luz: '#7cd890', sombra: '#2a7a40' },
  fijo: { lin: '#3a1a66', base: '#8a52c8', luz: '#b88af0', sombra: '#643a98' },
  rafaga: { lin: '#6a2208', base: '#e0662a', luz: '#f59a62', sombra: '#b04a18' },
};
// Each drawing is symmetric about column 5, the capsule's centre (11 wide: the 12th column stays empty).
const DIBUJO_ARMA: Record<Arma, string[]> = {
  // one arrow
  normal: ['...........', '...........', '.....W.....', '....WWW....', '...WWWWW...', '.....s.....', '.....s.....', '.....s.....', '....fsf....', '...f.s.f...'],
  // two arrows
  doble: ['...........', '...........', '...W...W...', '..WWW.WWW..', '...s...s...', '...s...s...', '...s...s...', '...s...s...', '..fsf.fsf..', '...........'],
  // three arrows, a fan
  triple: ['...........', '...........', '.....W.....', '..W.WWW.W..', '..W..s..W..', '..s..s..s..', '...s.s.s...', '...s.s.s...', '....sss....', '....fsf....'],
  // an arrow stuck under the ceiling
  fijo: ['...........', '...........', '.ccccccccc.', '.....W.....', '....WWW....', '...WWWWW...', '.....s.....', '.....s.....', '....fsf....', '...f.s.f...'],
  // bullets
  rafaga: ['...........', '...........', '.....w.....', '....yyy....', '....yyy....', '..w.YYY.w..', '.yyy...yyy.', '.yyy...yyy.', '.YYY...YYY.', '...........'],
};
const PALETA_ARMA = { W: '#ffffff', s: '#e2ded0', f: '#ffd36a', c: '#e8e4d8', w: '#fff6c8', y: '#ffc83a', Y: '#c88a1a' };

/** The icon of a weapon (the item a bubble drops; 'normal' only appears in the score strip). */
function pintarArma(arma: Arma): HTMLCanvasElement {
  const c = lienzo(12, 12);
  const x = ctx(c);
  pintarMascara(x, CAPSULA, COLOR_ARMA[arma]);
  pintar(x, DIBUJO_ARMA[arma], PALETA_ARMA);
  return c;
}

/** The icon of a weapon: 12 × 12, painted once. */
export function iconoArma(a: Arma): HTMLCanvasElement {
  return una(`ia|${a}`, () => pintarArma(a));
}

function pintarObjeto(o: Objeto): HTMLCanvasElement {
  const arma = ARMA_DE_OBJETO[o];
  if (arma) return pintarArma(arma);
  const c = lienzo(12, 12);
  const x = ctx(c);
  if (o === 'reloj') {
    // Round kitchen wall clock: red rim, cream face, two hands, four ticks.
    for (let j = 0; j < 12; j++)
      for (let i = 0; i < 12; i++) {
        const d = Math.hypot(i + 0.5 - 6, j + 0.5 - 6);
        if (d > 6) continue;
        rect(x, d > 5.1 ? '#6e1a18' : d > 4 ? (i + j > 11 ? '#b02e28' : '#e0524a') : (i + j > 12 ? '#e0d6bc' : '#f8f2e4'), i, j, 1, 1);
      }
    [[6, 2], [6, 9], [2, 5], [9, 5]].forEach(([a, b]) => rect(x, '#8a7a66', a, b, 1, 1));
    rect(x, '#3b2b2b', 5, 3, 1, 3); // hour hand
    rect(x, '#3b2b2b', 5, 5, 4, 1); // minute hand
    rect(x, '#c8323a', 5, 5, 1, 1);
  } else if (o === 'chupito') {
    // Shot glass with amber liquor.
    const G = { G: '#6f9eaa', g: '#d8f0f4', h: '#ffffff', a: '#f0a21e', A: '#b86e0c', y: '#ffd23a' };
    pintar(x, [
      '.........y..',
      '..GGGGGGGG..',
      '..GhgggggG..',
      '..GhaaaaaG..',
      '..GaaaaaAG..',
      '..GaaaaaAG..',
      '...GaaaAG...',
      '...GaaaAG...',
      '...GGGGGG...',
      '...GhgggG...',
      '...GGGGGG...',
      '............',
    ], G);
  } else if (o === 'escudo') {
    // A heart-shaped shield in Hawaiian-shirt mustard: a red hibiscus and a green leaf (the «bear hug»).
    const forma = ['............', '.xxxx..xxxx.', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', '.xxxxxxxxxx.', '..xxxxxxxx..', '...xxxxxx...', '....xxxx....', '.....xx.....', '............', '............'];
    const corazon = (i: number, j: number) => forma[j]?.[i] === 'x';
    pintarMascara(x, corazon, { lin: '#6e4608', base: '#e2a32e', luz: '#f5c95f', sombra: '#b67c1c' });
    [[2, 3, 'r'], [3, 3, 'r'], [2, 4, 'r'], [3, 4, 'y']].forEach(([a, b, k]) => rect(x, k === 'r' ? '#c8323a' : '#ffe08a', a as number, b as number, 1, 1));
    [[4, 4], [5, 4], [4, 5]].forEach(([a, b]) => rect(x, '#3f8a3a', a, b, 1, 1));
    [[7, 5], [8, 5], [8, 6], [7, 6]].forEach(([a, b], k) => rect(x, k === 3 ? '#ffe08a' : '#c8323a', a, b, 1, 1));
    [[6, 7], [6, 8]].forEach(([a, b]) => rect(x, '#3f8a3a', a, b, 1, 1));
  } else if (o === 'cana') {
    // A glass of beer («caña»): foam cap, amber body, thick base.
    const m: Mascara = [null, null, [2, 9], [2, 9], [2, 9], [2, 9], [2, 9], [3, 8], [3, 8], [3, 8], [3, 8], [3, 8]];
    pintarMascara(x, m, { lin: '#7a5210', base: '#e9b13c', luz: '#ffd877', sombra: '#c98a22' });
    rect(x, '#f3e6b8', 4, 10, 4, 1); // glass base
    rect(x, '#ffd877', 4, 4, 1, 4);
    // foam
    pintar(x, ['...wwwwww...', '.wwwWwwwwww.', '.wwwwwwwWww.', '..WwwwWwwW..', '..WWWWWWWW..'], { w: '#fbf3dc', W: '#d6c690' }, 0, 0);
  } else if (o === 'jamon') {
    // Three cubes of cured ham with a band of fat.
    const cubo = (px: number, py: number) => {
      rect(x, '#5e1c28', px, py, 5, 5);
      rect(x, '#b8404a', px + 1, py + 1, 3, 3);
      rect(x, '#f4dcd0', px + 1, py + 1, 3, 1);
      rect(x, '#8e2a38', px + 3, py + 2, 1, 2);
      rect(x, '#d9606a', px + 1, py + 2, 1, 1);
    };
    cubo(1, 6);
    cubo(6, 6);
    cubo(3, 1);
  } else if (o === 'aceitunas') {
    // Two green olives with a red pimiento on a pick.
    linea(x, '#c8a46a', 0, 11, 11, 0, 1);
    linea(x, '#8a6a3a', 1, 11, 11, 1, 1);
    const oliva = (cx: number, cy: number) => {
      elipseL(x, '#7a9a3a', '#344618', cx, cy, 3, 2.6);
      rect(x, '#a8c460', cx - 1.5, cy - 1.5, 1, 1);
      rect(x, '#566e26', cx + 1, cy + 0.5, 1, 1);
      rect(x, '#d8323a', cx, cy - 0.5, 2, 1);
    };
    oliva(4, 7.5);
    oliva(8, 3.5);
  } else if (o === 'croqueta') {
    // Two golden croquettes.
    const croq = (cx: number, cy: number) => {
      elipseL(x, '#c88a3a', '#6e4210', cx, cy, 5.5, 3.5);
      rect(x, '#e8b866', cx - 3, cy - 2, 4, 1);
      rect(x, '#a2661f', cx + 1, cy + 1, 3, 1);
      rect(x, '#8a5a1a', cx - 1, cy, 1, 1);
      rect(x, '#e0a850', cx + 2, cy - 1, 1, 1);
    };
    croq(5.5, 4.5);
    croq(6.5, 8.5);
  } else if (o === 'turron') {
    // A bar of turrón: wafer edges, nougat with almonds, a bit of the top face.
    rect(x, '#8a6a30', 0, 4, 10, 7);
    rect(x, '#f3e6c0', 1, 5, 8, 5);
    rect(x, '#e0cc90', 1, 5, 8, 1);
    rect(x, '#e0cc90', 1, 9, 8, 1);
    [[2, 7], [4, 6], [5, 8], [7, 7], [8, 6]].forEach(([a, b]) => {
      rect(x, '#c08a4a', a, b, 2, 1);
      rect(x, '#8a5a2a', a, b + 1, 1, 1);
    });
    poli(x, '#8a6a30', [[1, 4], [3, 1], [12, 1], [10, 4]]);
    poli(x, '#fff4d0', [[2, 4], [4, 2], [11, 2], [9, 4]]);
    rect(x, '#8a6a30', 10, 4, 2, 6);
    rect(x, '#d8c488', 10, 3, 1, 6);
    rect(x, '#b89a58', 11, 2, 1, 7);
  } else {
    // yema de Ávila: a sugared yellow ball in a pleated paper cup.
    pintar(x, [
      '....yyyy....',
      '..yyYYYYyy..',
      '.yyYsYYYYyy.',
      '.yYYYYYYYYy.',
      '.yYYYYYYYYy.',
      '..yDDDDDDy..',
      '..pPppPppP..',
      '..ppPppPpp..',
      '...pPppPp...',
      '...ppPppp...',
      '....pPpp....',
      '............',
    ], { y: '#9a6a08', Y: '#f2c42a', s: '#fff6c0', D: '#d8a018', p: '#f7efe0', P: '#c9bea6' });
    rect(x, '#fff6c0', 6, 3, 1, 1);
    rect(x, '#ffe46a', 4, 2, 2, 1);
    rect(x, '#8a7a5e', 3, 8, 1, 1);
    rect(x, '#8a7a5e', 8, 8, 1, 1);
  }
  return c;
}

/** An item a bubble drops: 12 × 12. */
export function objeto(o: Objeto): HTMLCanvasElement {
  return una(`o|${o}`, () => pintarObjeto(o));
}

// ---------------------------------------------------------------- blocks and ladders

/** A zigzag crack from the top to the bottom edge: the sign of a breakable block. */
function grieta(x: CanvasRenderingContext2D, w: number, h: number, oscuro: string, claro: string, fx = 0.42) {
  const x0 = Math.round(w * fx);
  const paso = [0, 1, 1, 0, -1, 0, 1, 2, 2, 1, 0, -1];
  for (let j = 0; j < h; j++) {
    const px = x0 + paso[j % paso.length];
    rect(x, oscuro, px, j, 1, 1);
    if (j % 2 === 0) rect(x, claro, px + 1, j, 1, 1);
    if (j === Math.floor(h / 2)) {
      // a short branch
      rect(x, oscuro, px - 1, j, 1, 1);
      rect(x, oscuro, px - 2, j + 1, 1, 1);
    }
  }
}

function pintarBloque(estilo: string, w: number, h: number, rompible: boolean): HTMLCanvasElement {
  const c = lienzo(w, h);
  const x = ctx(c);
  const az = azar(w * 31 + h * 7 + estilo.length * 101);
  let crO = '#2a1a14';
  let crC = '#ffffff';
  if (estilo === 'ladrillo') {
    rect(x, '#5e2e26', 0, 0, w, h);
    const tonos = ['#b4533c', '#a6482f', '#c2604a'];
    for (let j = 0, fila = 0; j < h; j += 4, fila++) {
      for (let bx = -(fila % 2) * 4; bx < w; bx += 8) {
        const a = Math.max(0, bx);
        const b = Math.min(w, bx + 7);
        rect(x, tonos[Math.floor(az() * 3)], a, j, b - a, Math.min(3, h - j));
        rect(x, '#d0735a', a, j, b - a, 1);
      }
    }
    rect(x, '#e08a6c', 0, 0, w, 1);
    rect(x, '#3e1a14', 0, h - 1, w, 1);
    crO = '#2e120e';
    crC = '#d9906e';
  } else if (estilo === 'contenedor') {
    // Wheelie bins seen from the front: lid and ribbed body, green and grey in turn.
    const bw = 16;
    for (let k = 0; k * bw < w; k++) {
      const gris = k % 2 === 1;
      const T = gris ? { lid: '#98a0a8', lidL: '#bcc4cc', body: '#6a727a', bodyD: '#505860', lin: '#2e343a' } : { lid: '#3f8a52', lidL: '#6ab87c', body: '#2f6a3e', bodyD: '#22502e', lin: '#12301c' };
      const px = k * bw;
      const ww = Math.min(bw, w - px);
      rect(x, T.lin, px, 0, ww, h);
      rect(x, T.lid, px, 0, ww - 1, 4);
      rect(x, T.lidL, px, 0, ww - 1, 1);
      rect(x, T.lin, px, 3, ww - 1, 1);
      rect(x, T.lin, px + 5, 1, Math.max(0, ww - 11), 1); // handle slot
      rect(x, T.body, px + 1, 4, ww - 3, h - 4);
      for (let rx = px + 3; rx < px + ww - 2; rx += 3) rect(x, T.bodyD, rx, 4, 1, h - 4);
      rect(x, T.lin, px, h - 1, ww, 1);
    }
    crO = '#12301c';
    crC = '#98a0a8';
  } else if (estilo === 'cojin') {
    // Sofa cushions, 24 wide each: puffy, a button and a seam.
    const cw = 24;
    for (let k = 0; k * cw < w; k++) {
      const px = k * cw;
      const ww = Math.min(cw, w - px);
      rect(x, '#6e2e18', px, 0, ww, h);
      rect(x, '#c8683a', px + 1, 1, ww - 2, h - 2);
      rect(x, '#e08a58', px + 1, 1, ww - 2, 2);
      rect(x, '#e08a58', px + 1, 1, 2, h - 2);
      rect(x, '#a04a28', px + 1, h - 3, ww - 2, 2);
      rect(x, '#a04a28', px + ww - 3, 1, 2, h - 2);
      // rounded corners
      [[0, 0], [ww - 1, 0], [0, h - 1], [ww - 1, h - 1]].forEach(([a, b]) => x.clearRect(px + a, b, 1, 1));
      [[1, 1], [ww - 2, 1], [1, h - 2], [ww - 2, h - 2]].forEach(([a, b]) => rect(x, '#6e2e18', px + a, b, 1, 1));
      // button with its tuft, and stitches along the edge
      const bx = px + Math.floor(ww / 2);
      rect(x, '#6e2e18', bx - 1, Math.floor(h / 2) - 1, 2, 2);
      rect(x, '#e8a070', bx - 1, Math.floor(h / 2) - 1, 1, 1);
      rect(x, '#a04a28', bx - 3, Math.floor(h / 2), 1, 1);
      rect(x, '#a04a28', bx + 2, Math.floor(h / 2) - 1, 1, 1);
      for (let sx = px + 4; sx < px + ww - 4; sx += 3) {
        rect(x, '#e8a070', sx, 2, 1, 1);
        rect(x, '#8a3e20', sx, h - 3, 1, 1);
      }
    }
    crO = '#3a140a';
    crC = '#f4efe6';
  } else if (estilo === 'bola') {
    // A ball-pit wall: rows of 6 px plastic balls, red, blue, yellow and green.
    rect(x, '#2e2a50', 0, 0, w, h);
    const cols: ColorBola[] = ['roja', 'azul', 'amarilla', 'verde'];
    for (let fila = 0, k0 = 0; fila * 6 < h; fila++, k0 += 2) {
      for (let k = 0; k * 6 - (fila % 2) * 3 < w; k++) {
        const t = BOLAS[cols[(k + k0 + Math.floor(az() * 2)) % 4]];
        const cx = k * 6 - (fila % 2) * 3 + 3;
        const cy = fila * 6 + 3;
        for (let j = 0; j < 6; j++)
          for (let i = 0; i < 6; i++) {
            const px = cx - 3 + i;
            const py = cy - 3 + j;
            if (px < 0 || px >= w || py >= h) continue;
            const dx = i + 0.5 - 3;
            const dy = j + 0.5 - 3;
            const d = Math.hypot(dx, dy);
            if (d > 3.05) continue;
            let col = d > 2.2 ? t.borde : dx + dy > 1.2 ? t.sombra : t.base;
            if (i === 1 && j === 1) col = '#ffffff';
            else if ((i === 2 && j === 1) || (i === 1 && j === 2)) col = t.luz;
            rect(x, col, px, py, 1, 1);
          }
      }
    }
    crO = '#1a1630';
    crC = '#ffffff';
  } else if (estilo === 'madera') {
    // A stage beam: planks with grain, knots and nails.
    rect(x, '#9a6a3c', 0, 0, w, h);
    rect(x, '#c0905a', 0, 0, w, 1);
    rect(x, '#b2824c', 0, 1, w, 1);
    rect(x, '#6a4220', 0, h - 1, w, 1);
    rect(x, '#7e5230', 0, h - 2, w, 1);
    for (let k = 0; k < w / 4; k++) {
      const gx = Math.floor(az() * w);
      const gy = 2 + Math.floor(az() * Math.max(1, h - 4));
      const gl = 3 + Math.floor(az() * 6);
      rect(x, az() < 0.6 ? '#7e5230' : '#b08048', gx, gy, Math.min(gl, w - gx), 1);
    }
    [[0.25, 3], [0.7, 4]].forEach(([fx, fy]) => {
      const kx = Math.round(w * fx);
      rect(x, '#5a3a1c', kx, fy, 3, 2);
      rect(x, '#7e5230', kx + 1, fy - 1, 1, 1);
    });
    // plank joints
    for (let jx = 40; jx < w; jx += 40) rect(x, '#5a3a1c', jx, 0, 1, h);
    [3, w - 4].forEach((nx) => {
      rect(x, '#3e3e46', nx, Math.floor(h / 2), 1, 1);
      rect(x, '#8a8a96', nx, Math.floor(h / 2) - 1, 1, 1);
    });
    crO = '#2e1a0a';
    crC = '#d0a070';
  } else if (estilo === 'bala') {
    // A bale of hay with two bands of twine.
    rect(x, '#7a5a1a', 0, 0, w, h);
    rect(x, '#d8b44a', 1, 1, w - 2, h - 2);
    rect(x, '#ecd27a', 1, 1, w - 2, 2);
    rect(x, '#b08a2a', 1, h - 3, w - 2, 2);
    for (let k = 0; k < w; k++) {
      const gx = 1 + Math.floor(az() * (w - 4));
      const gy = 1 + Math.floor(az() * (h - 2));
      rect(x, az() < 0.5 ? '#b08a2a' : '#f0dc8c', gx, gy, 2 + Math.floor(az() * 3), 1);
    }
    [0.26, 0.7].forEach((fx) => {
      const bx = Math.round(w * fx);
      rect(x, '#6a4a22', bx, 0, 2, h);
      rect(x, '#9a7a42', bx, 1, 1, h - 2);
    });
    [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].forEach(([a, b]) => x.clearRect(a, b, 1, 1));
    crO = '#5a3a0a';
    crC = '#f6e8a8';
  } else if (estilo === 'piedra') {
    // Granite slab: speckled grey with a pink fleck and joints.
    rect(x, '#8a8e96', 0, 0, w, h);
    rect(x, '#b0b4bc', 0, 0, w, 1);
    rect(x, '#9ea2aa', 0, 1, w, 1);
    rect(x, '#4e525a', 0, h - 1, w, 1);
    rect(x, '#6a6e76', 0, h - 2, w, 1);
    for (let k = 0; k < w * h * 0.12; k++) {
      const col = ['#5e626a', '#b8bcc4', '#a89494', '#767a82'][Math.floor(az() * 4)];
      rect(x, col, Math.floor(az() * w), 1 + Math.floor(az() * (h - 2)), 1, 1);
    }
    for (let jx = 32 + Math.floor(az() * 12); jx < w - 8; jx += 36 + Math.floor(az() * 10)) {
      rect(x, '#4e525a', jx, 0, 1, h);
      rect(x, '#b0b4bc', jx + 1, 1, 1, h - 3);
    }
    crO = '#2c2e34';
    crC = '#c8ccd4';
  } else if (estilo === 'muralla') {
    // The wall of Ávila: crenellations on top (shaded, the top stays flat), granite blocks below.
    const cren = Math.min(3, h - 4);
    rect(x, '#b0a07c', 0, cren, w, h - cren);
    for (let bx = 0; bx < w; bx += 12) {
      rect(x, '#d4c49a', bx, 0, 8, cren); // merlon
      rect(x, '#f0e4be', bx, 0, 8, 1);
      rect(x, '#8a7a56', bx + 7, 0, 1, cren);
      rect(x, '#6a5a3c', bx + 8, 0, 4, cren); // gap in shadow
    }
    rect(x, '#8a7a56', 0, cren, w, 1);
    const alto = Math.max(3, Math.floor((h - cren) / 2));
    for (let j = cren + 1, fila = 0; j < h; j += alto, fila++) {
      for (let bx = -(fila % 2) * 8; bx < w; bx += 16) {
        const a = Math.max(0, bx);
        rect(x, '#8a7a56', Math.max(0, bx + 15), j, 1, alto);
        rect(x, '#c4b48c', a, j, 1, 1);
        rect(x, '#8a7a56', a, j + alto - 1, Math.min(16, w - a), 1);
      }
    }
    for (let k = 0; k < w * 0.5; k++) rect(x, ['#948462', '#c8b890', '#a89870'][Math.floor(az() * 3)], Math.floor(az() * w), cren + 1 + Math.floor(az() * (h - cren - 2)), 1, 1);
    rect(x, '#5a4a30', 0, h - 1, w, 1);
    crO = '#3a2e1a';
    crC = '#e0d4aa';
  } else if (estilo === 'turron') {
    // Turrón slabs: wafer on both faces, nougat with almonds; a seam between slabs.
    rect(x, '#8a6a30', 0, 0, w, h);
    rect(x, '#efe0b4', 1, 1, w - 2, h - 2);
    rect(x, '#fff4d0', 1, 1, w - 2, 1);
    rect(x, '#d8c488', 1, 2, w - 2, 1);
    rect(x, '#d8c488', 1, h - 3, w - 2, 1);
    rect(x, '#e2cf98', 1, h - 2, w - 2, 1);
    for (let sx = 20; sx < w - 2; sx += 20) {
      rect(x, '#9a7a3c', sx, 0, 1, h);
      rect(x, '#fff4d0', sx + 1, 1, 1, h - 2);
    }
    for (let k = 0; k < Math.floor(w / 4); k++) {
      const ax = 2 + Math.floor(az() * (w - 5));
      const ay = 3 + Math.floor(az() * Math.max(1, h - 7));
      rect(x, '#c08a4a', ax, ay, 2, 1);
      rect(x, '#8a5a2a', ax, ay + 1, 1, 1);
    }
    [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].forEach(([a, b]) => x.clearRect(a, b, 1, 1));
    crO = '#5a3a10';
    crC = '#fff4d0';
  } else if (estilo === 'caravana') {
    // A small old caravan seen from the side: brown roof, cream body, a window with curtains, a door, one wheel and a hitch.
    const roof = { b: '#8a5a34', l: '#b27c4c', d: '#5a3a1c' };
    rect(x, roof.d, 1, 0, w - 2, 5);
    rect(x, roof.b, 1, 1, w - 2, 3);
    rect(x, roof.l, 2, 1, w - 4, 1);
    rect(x, '#efe4c8', 0, 5, w, h - 8);
    rect(x, '#d8caa4', 0, 5, w, 1);
    rect(x, '#c2b288', 0, h - 7, w, 2);
    rect(x, roof.b, 0, 11, w, 2); // brown stripe
    rect(x, roof.l, 0, 11, w, 1);
    // chassis
    rect(x, '#3e362c', 4, h - 4, w - 8, 2);
    rect(x, '#2a241c', 4, h - 2, w - 8, 2);
    // windows
    const ventana = (vx: number) => {
      rect(x, '#6a4a2c', vx, 6, 20, 8);
      rect(x, '#9ac4d8', vx + 1, 7, 18, 6);
      rect(x, '#c8e4f0', vx + 2, 7, 5, 1);
      rect(x, '#c85a4a', vx + 1, 7, 4, 6); // curtains
      rect(x, '#c85a4a', vx + 15, 7, 4, 6);
      rect(x, '#e0786a', vx + 1, 7, 1, 6);
      rect(x, '#6a4a2c', vx + 9, 7, 1, 6);
    };
    ventana(16);
    ventana(66);
    // door
    rect(x, '#5a3a1c', 44, 6, 14, h - 9);
    rect(x, '#7a4a2a', 45, 7, 12, h - 11);
    rect(x, '#9ac4d8', 47, 8, 8, 4);
    rect(x, '#e2b84a', 54, 13, 1, 2);
    // wheel (half hidden by the body) and hitch
    for (let j = 0; j < 10; j++)
      for (let i = 0; i < 10; i++) {
        const d = Math.hypot(i + 0.5 - 5, j + 0.5 - 5);
        if (d > 5) continue;
        const px = 84 + i;
        const py = h - 10 + j;
        rect(x, d > 3.2 ? '#22222a' : d > 1.6 ? '#9a9aa4' : '#c8c8d2', px, py, 1, 1);
      }
    rect(x, '#5a5a64', 0, h - 5, 6, 2);
    rect(x, '#3e3e46', 0, h - 3, 3, 3);
    [[0, 5], [w - 1, 5]].forEach(([a, b]) => x.clearRect(a, b, 1, 1));
    [[0, 0], [w - 1, 0]].forEach(([a, b]) => x.clearRect(a, b, 1, 1));
    crO = '#5a3a1c';
    crC = '#fff4d0';
  } else {
    // neon: a bar of Las Vegas, a dark housing with a pink and a cyan tube.
    rect(x, '#160c26', 0, 0, w, h);
    rect(x, '#2a1840', 1, 1, w - 2, h - 2);
    for (let k = 0; k < 2; k++) {
      const ty = k === 0 ? 1 : h - 3;
      const [core, col, glow] = k === 0 ? ['#ffd8ee', '#ff4fa8', '#7a2a6a'] : ['#d8fbff', '#40e0ff', '#1f6a82'];
      rect(x, glow, 1, ty - (k === 0 ? 0 : 0), w - 2, 2);
      rect(x, col, 2, ty, w - 4, 1);
      rect(x, core, 3, ty, w - 6, 1);
      rect(x, col, 2, ty + 1, w - 4, 1);
    }
    for (let sx = 12; sx < w - 4; sx += 12) {
      rect(x, '#160c26', sx, 1, 1, h - 2);
      rect(x, '#3a2858', sx + 1, 2, 1, h - 4);
    }
    rect(x, '#6a4a98', 0, 0, w, 1);
    crO = '#160c26';
    crC = '#ff4fa8';
  }
  if (rompible) {
    grieta(x, w, h, crO, crC, estilo === 'cojin' ? 0.5 : 0.42);
    if (w >= 40) grieta(x, w, h, crO, crC, 0.82);
  }
  return c;
}

/** A block, painted at its size. Breakable ones (`rompible`) carry a crack; they go in one hit. */
export function bloque(b: Pick<Bloque, 'w' | 'h' | 'estilo' | 'rompible'>): HTMLCanvasElement {
  return una(`k|${b.estilo}|${b.w}|${b.h}|${b.rompible ? 1 : 0}`, () => recortado(pintarBloque(b.estilo, b.w, b.h, !!b.rompible)));
}

/**
 * Every block gets the same arcade edge so it never melts into the background (Jesús, 12
 * October 2026: on stage 2 the bins looked like part of the street): a near-black outline, a
 * bright line along the top (what the bubbles bounce on) and a darker one along the bottom.
 */
function recortado(c: HTMLCanvasElement): HTMLCanvasElement {
  const x = ctx(c);
  const { width: w, height: h } = c;
  x.fillStyle = 'rgba(255, 244, 214, 0.75)';
  x.fillRect(1, 1, w - 2, 1);
  x.fillStyle = 'rgba(0, 0, 0, 0.35)';
  x.fillRect(1, h - 2, w - 2, 1);
  x.fillStyle = '#0b0a14';
  x.fillRect(0, 0, w, 1);
  x.fillRect(0, h - 1, w, 1);
  x.fillRect(0, 0, 1, h);
  x.fillRect(w - 1, 0, 1, h);
  return c;
}

/** A wooden ladder, 16 wide and `alto` tall: two rails and a rung every 6 px. */
export function escalera(alto: number): HTMLCanvasElement {
  return una(`l|${alto}`, () => {
    const c = lienzo(16, alto);
    const x = ctx(c);
    [1, 12].forEach((rx) => {
      rect(x, '#5a3a1a', rx, 0, 1, alto);
      rect(x, '#b88a4c', rx + 1, 0, 1, alto);
      rect(x, '#8a5e2c', rx + 2, 0, 1, alto);
      for (let y = 4; y < alto; y += 9) rect(x, '#6e4a22', rx + 1, y, 1, 1); // grain
    });
    for (let y = 3; y < alto - 1; y += 6) {
      rect(x, '#d0a468', 4, y, 8, 1);
      rect(x, '#a8783c', 4, y + 1, 8, 1);
      rect(x, '#5a3a1a', 4, y + 2, 8, 1);
      [2, 13].forEach((nx) => rect(x, '#3e3e46', nx, y, 1, 1));
    }
    return c;
  });
}

// ---------------------------------------------------------------- bosses

/**
 * A boss's frames, all the same size, centred on (w/2, h/2), which is also the centre of
 * its round hit area of radius `radio`.
 *   robi:      normal, gorrito (party hat on: shots bounce), golpe (flash when hit)
 *   peor:      normal, golpe
 *   penultima: normal, escupe (mouth open), enfadada (below half health), golpe
 */
export interface HojaJefe {
  w: number;
  h: number;
  radio: number;
  frames: Record<string, HTMLCanvasElement>;
}

/** Robi, the birthday robot: a round cream head, a dark visor with cyan eyes, a glowing red button. */
function pintarRobi(gorrito: boolean): HTMLCanvasElement {
  const c = lienzo(56, 56);
  const x = ctx(c);
  const CREMA = { borde: '#7a705a', base: '#f2ead8', sombra: '#d6ccb4', luz: '#fffaf0' };
  // ears (teal discs)
  [5.5, 50.5].forEach((ex) => {
    elipseL(x, '#3fb8c8', '#145660', ex, 31, 4.5, 6);
    rect(x, '#7ad8e4', ex - 2, 28, 1, 3);
    rect(x, '#2a8e9c', ex + 1, 33, 1, 3);
  });
  esfera(x, 28, 31, 22, 22, CREMA);
  // little lights on the forehead
  ['#e8452e', '#f5c95f', '#5ad08a', '#5aa8ff'].forEach((col, k) => {
    rect(x, '#7a705a', 17 + k * 6, 15, 3, 3);
    rect(x, col, 17 + k * 6, 15, 2, 2);
  });
  // visor
  rectL(x, '#16203a', '#0a1020', 11, 22, 34, 19);
  rect(x, '#2e3e64', 13, 23, 12, 2);
  // eyes
  [21, 35].forEach((ex) => {
    elipse(x, '#2a9ab0', ex, 30, 5, 5);
    elipse(x, '#5af0ff', ex, 30, 4, 4);
    elipse(x, '#aaf8ff', ex, 30, 2.5, 2.5);
    rect(x, '#ffffff', ex - 2, 28, 2, 2);
    if (gorrito) rect(x, '#16203a', ex - 5, 24, 10, 5); // smug, half-closed
  });
  if (gorrito) [21, 35].forEach((ex) => rect(x, '#5af0ff', ex - 4, 29, 8, 1));
  // smile
  for (let i = 0; i < 13; i++) {
    const d = Math.abs(i - 6);
    rect(x, '#5af0ff', 22 + i, 36 - (d > 4 ? 2 : d > 2 ? 1 : 0), 1, 1);
  }
  if (gorrito) {
    // The party hat covers the button: striped cone with a pompom.
    poli(x, '#7a1e44', [[17, 14], [28, -1], [39, 14]]);
    poli(x, '#f27aa8', [[19, 14], [28, 1], [37, 14]]);
    poli(x, '#ffd23a', [[22, 14], [28, 4], [25.5, 14]]);
    poli(x, '#ffd23a', [[30.5, 14], [28, 4], [34, 14]]);
    poli(x, '#5ad0e8', [[25.5, 14], [28, 6], [30.5, 14]]);
    rect(x, '#d4588a', 17, 13, 22, 2);
    [[27, 9], [28, 11], [31, 11], [24, 12]].forEach(([a, b]) => rect(x, '#ffffff', a, b, 1, 1));
    elipseL(x, '#fff6fb', '#c4a0b4', 28, 3, 3, 3);
  } else {
    // glowing red button, with its glow
    elipse(x, '#ff8a8a', 28, 9, 8, 5);
    elipse(x, '#8a1010', 28, 10, 6, 4);
    elipse(x, '#ff3a3a', 28, 9, 5, 3.4);
    rect(x, '#ffd0d0', 25, 8, 3, 1);
    rect(x, '#ffffff', 25, 7, 1, 1);
    rect(x, '#8a1010', 26, 12, 4, 1);
  }
  return c;
}

/** El Peor: a huge, dirty, bad-tempered pig, straight on. */
function pintarPeor(): HTMLCanvasElement {
  const c = lienzo(64, 52);
  const x = ctx(c);
  const P = { borde: '#7e3a45', base: '#d99596', sombra: '#bf737b', luz: '#ecb7b0' };
  // trotters
  [14, 40].forEach((px) => {
    rect(x, '#7e3a45', px, 42, 11, 9);
    rect(x, '#bf737b', px + 1, 42, 9, 6);
    rect(x, '#3a1e24', px + 1, 48, 9, 3);
    rect(x, '#5e2834', px + 5, 48, 1, 3);
  });
  // ears: floppy triangles, outline then inner
  [-1, 1].forEach((s) => {
    const X = (v: number) => (s < 0 ? v : 64 - v);
    poli(x, P.borde, [[X(4), 2], [X(26), 7], [X(11), 27]]);
    poli(x, '#d99596', [[X(6), 5], [X(23), 9], [X(12), 24]]);
    poli(x, '#cf7a83', [[X(10), 9], [X(21), 11], [X(13), 20]]);
  });
  esfera(x, 32, 26, 25, 22, { ...P, brillo: '#f8d0c8' });
  // mud on the forehead and cheeks
  [[20, 14, 3, 2], [40, 12, 4, 2], [47, 30, 2, 2], [15, 31, 2, 3]].forEach(([a, b, rx, ry]) => {
    elipse(x, '#73563a', a, b, rx, ry);
    rect(x, '#9c7c58', a - 1, b - 1, 1, 1);
  });
  // brows, slanting down to the middle: furious
  linea(x, '#3a1e24', 14, 15, 28, 21, 3);
  linea(x, '#3a1e24', 50, 15, 36, 21, 3);
  // eyes
  [22, 42].forEach((ex, k) => {
    elipse(x, '#f4efe4', ex, 24, 4.5, 3);
    rect(x, '#c01818', ex + (k === 0 ? 1 : -3), 22, 3, 4);
    rect(x, '#2a1418', ex + (k === 0 ? 2 : -2), 23, 1, 2);
    rect(x, '#3a1e24', ex - 5, 21, 10, 1);
  });
  // snout
  elipseL(x, '#cf7a83', '#7e3a45', 32, 35, 11, 8);
  rect(x, '#e0a0a6', 26, 30, 5, 1);
  elipse(x, '#3a1e24', 28, 35, 2, 3.4);
  elipse(x, '#3a1e24', 36, 35, 2, 3.4);
  // mouth: a scowl with two tusks
  rect(x, '#3a1e24', 21, 44, 22, 2);
  rect(x, '#3a1e24', 19, 42, 2, 2);
  rect(x, '#3a1e24', 43, 42, 2, 2);
  poli(x, '#f4efe4', [[22, 44], [25, 38.5], [27, 44]]);
  poli(x, '#f4efe4', [[37, 44], [39, 38.5], [42, 44]]);
  return c;
}

type CaraJarra = 'normal' | 'escupe' | 'enfadada';

/** La Penúltima: a giant beer mug with a foam crown, a handle and a sly face. */
function pintarPenultima(cara: CaraJarra): HTMLCanvasElement {
  const c = lienzo(72, 80);
  const x = ctx(c);
  const T = { lin: '#7a5210', base: '#e9b13c', sombra: '#c98a22', luz: '#ffd877', vidrio: '#f0e4b0', vidrioS: '#cdbf86' };
  // handle: a thick ring, the hole cut out afterwards
  elipse(x, T.lin, 54, 46, 15, 17);
  elipse(x, T.vidrio, 54, 46, 13.5, 15.5);
  elipse(x, T.vidrioS, 55, 47, 12, 14);
  elipse(x, T.vidrio, 54, 45, 11.5, 13.5);
  x.save();
  x.globalCompositeOperation = 'destination-out';
  elipse(x, '#000', 54, 46, 7, 10);
  x.restore();
  elipse(x, T.lin, 54, 46, 8, 11);
  x.save();
  x.globalCompositeOperation = 'destination-out';
  elipse(x, '#000', 54, 46, 6.5, 9.5);
  x.restore();
  // body of the mug
  rectL(x, T.base, T.lin, 14, 24, 39, 47, true);
  rect(x, T.sombra, 46, 25, 6, 45);
  rect(x, '#b27818', 50, 25, 2, 45);
  rect(x, T.luz, 17, 26, 3, 36);
  rect(x, '#fff0b0', 17, 27, 1, 14);
  // thick glass base
  rect(x, T.lin, 15, 63, 37, 1);
  rect(x, T.vidrio, 15, 64, 37, 6);
  rect(x, T.vidrioS, 15, 68, 37, 2);
  rect(x, '#fffbe0', 17, 65, 8, 1);
  // bubbles in the beer
  [[24, 52], [43, 58], [30, 60], [45, 36], [22, 38]].forEach(([a, b]) => {
    rect(x, '#ffe39a', a, b, 2, 2);
  });
  // foam crown: bumps along the top
  const bultos: [number, number, number][] = [[18, 24, 7], [26, 18, 8], [36, 14, 9], [46, 18, 8], [51, 24, 6]];
  bultos.forEach(([a, b, r]) => elipse(x, '#a8905a', a, b, r + 1, r + 1));
  elipse(x, '#a8905a', 33, 27, 20, 4);
  bultos.forEach(([a, b, r]) => elipse(x, '#fbf3dc', a, b, r, r));
  elipse(x, '#fbf3dc', 33, 27, 19, 3);
  bultos.forEach(([a, b, r]) => {
    elipse(x, '#e0d2a8', a + 2, b + 2, r - 3, r - 3);
    elipse(x, '#fbf3dc', a - 1, b - 1, r - 3, r - 3);
  });
  rect(x, '#ffffff', 31, 9, 4, 2);
  rect(x, '#ffffff', 22, 14, 3, 1);
  // foam dripping down the front
  [[20, 30, 3], [31, 31, 5], [44, 30, 3]].forEach(([a, b, h]) => {
    rect(x, '#a8905a', a - 1, b, 5, h);
    rect(x, '#fbf3dc', a, b, 3, h - 1);
    rect(x, '#fbf3dc', a, b + h - 1, 3, 1);
  });
  // the face
  const sombraOjo = '#5a3a10';
  const ojo = (ex: number, ey: number, grande: boolean) => {
    elipseL(x, '#fffaf0', sombraOjo, ex, ey, 5.5, grande ? 5.5 : 4.5);
    elipse(x, cara === 'enfadada' ? '#c01818' : '#2a1a10', ex + 1.5, ey + 0.5, 2.5, 2.5);
    rect(x, '#ffffff', ex + 1, ey - 1, 1, 1);
  };
  const ex0 = 25;
  const ex1 = 42;
  ojo(ex0, 45, cara === 'escupe');
  ojo(ex1, 45, cara === 'escupe');
  if (cara === 'normal') {
    // sly: half-closed lids, one brow raised
    rect(x, T.base, ex0 - 5, 40, 11, 4);
    rect(x, T.lin, ex0 - 6, 43, 12, 1);
    rect(x, T.base, ex1 - 5, 40, 11, 4);
    rect(x, T.lin, ex1 - 6, 43, 12, 1);
    linea(x, '#5a3a10', ex0 - 5, 38, ex0 + 4, 39, 2);
    linea(x, '#5a3a10', ex1 - 4, 37, ex1 + 1, 34, 2);
    linea(x, '#5a3a10', ex1 + 1, 34, ex1 + 5, 36, 2);
    // smirk: a long line that goes up on the right, one tooth
    linea(x, '#5a2a10', 24, 56, 38, 58, 2);
    linea(x, '#5a2a10', 38, 58, 47, 53, 2);
    rect(x, '#5a2a10', 47, 52, 1, 1);
    rect(x, '#fffaf0', 35, 58, 3, 2);
  } else if (cara === 'escupe') {
    linea(x, '#5a3a10', ex0 - 5, 36, ex0 + 4, 36, 2);
    linea(x, '#5a3a10', ex1 - 4, 36, ex1 + 5, 36, 2);
    elipseL(x, '#5a1a14', '#3a0e0a', 34, 57, 10, 7);
    elipse(x, '#e0707a', 34, 60, 6, 3);
    rect(x, '#fffaf0', 26, 51, 16, 2);
    // cheeks puffed
    elipse(x, '#f0a84a', 20, 52, 3, 2);
    elipse(x, '#f0a84a', 48, 52, 3, 2);
  } else {
    // angry: brows slanting down to the middle, red cheeks, a grimace of teeth
    linea(x, '#3a1a08', ex0 - 6, 37, ex0 + 5, 41, 3);
    linea(x, '#3a1a08', ex1 + 6, 37, ex1 - 5, 41, 3);
    elipse(x, '#e8553a', 19, 52, 4, 3);
    elipse(x, '#e8553a', 49, 52, 4, 3);
    rect(x, '#3a0e0a', 24, 54, 20, 7);
    rect(x, '#fffaf0', 25, 55, 18, 2);
    rect(x, '#fffaf0', 25, 58, 18, 2);
    for (let k = 0; k < 7; k++) rect(x, '#3a0e0a', 27 + k * 3, 55, 1, 5);
    rect(x, '#3a0e0a', 25, 57, 18, 1);
  }
  return c;
}

export function jefe(j: Jefe): HojaJefe {
  return una<HojaJefe>(`j|${j}`, () => {
    const hoja = (w: number, h: number, radio: number, frames: Record<string, HTMLCanvasElement>): HojaJefe => ({ w, h, radio, frames });
    if (j === 'robi') {
      const normal = pintarRobi(false);
      return hoja(56, 56, 24, { normal, gorrito: pintarRobi(true), golpe: destello(normal) });
    }
    if (j === 'peor') {
      const normal = pintarPeor();
      return hoja(64, 52, 24, { normal, golpe: destello(normal) });
    }
    const normal = pintarPenultima('normal');
    return hoja(72, 80, 32, { normal, escupe: pintarPenultima('escupe'), enfadada: pintarPenultima('enfadada'), golpe: destello(normal) });
  });
}

// ---------------------------------------------------------------- Aceituna and the shield

/** Aceituna running across the floor (stage 3): 4 frames, 20 × 14, facing right, feet at the bottom. */
export function aceituna(): HTMLCanvasElement[] {
  return una('aceituna', () => {
    const F = { piel: '#2c2b35', sombra: '#1b1a21', borde: '#0f0e14', luz: '#4a4858', brillo: '#6a6880', hocico: '#3a3844', collar: '#c8433a', chapa: '#e2b84a' };
    // per frame: [front legs foot dx, back legs foot dx, body lift, tail y, tongue]
    const pasos: [number, number, number, number, boolean][] = [
      [3, -3, 0, 2, true],
      [0, 0, 1, 1, false],
      [-2, 2, 0, 2, true],
      [0, 0, 1, 3, false],
    ];
    return pasos.map(([fd, bd, lift, tail, lengua]) => {
      const c = lienzo(20, 14);
      const x = ctx(c);
      const y0 = lift ? 0 : 1; // gathered frames: the body is a pixel higher (feet off the ground)
      // legs (far ones darker), hips at the body, feet at y = 13
      const pata = (hx: number, dx: number, col: string) => {
        linea(x, F.borde, hx, 9 + y0, hx + dx, 13, 1);
        linea(x, col, hx + 1, 9 + y0, hx + 1 + dx, 13, 1);
        rect(x, F.borde, hx + dx, 13, 3, 1);
      };
      pata(4, bd, F.sombra);
      pata(12, fd, F.sombra);
      pata(6, bd - (bd ? 1 : 0), F.piel);
      pata(10, fd - (fd ? 1 : 0), F.piel);
      // tail
      linea(x, F.borde, 3, 6 + y0, 1, tail + y0, 2);
      rect(x, F.piel, 2, tail + y0, 1, 1);
      // body
      elipse(x, F.borde, 9.5, 6.5 + y0, 7, 4);
      elipse(x, F.piel, 9.5, 6.5 + y0, 6, 3);
      rect(x, F.luz, 5, 3 + y0, 8, 1);
      rect(x, F.brillo, 7, 3 + y0, 3, 1);
      rect(x, F.sombra, 5, 8 + y0, 9, 1);
      // head
      elipse(x, F.borde, 15.5, 4.5 + y0, 4, 3.5);
      elipse(x, F.piel, 15.5, 4.5 + y0, 3, 2.6);
      rect(x, F.borde, 17, 4 + y0, 3, 3);
      rect(x, F.hocico, 17, 4 + y0, 2, 2);
      rect(x, '#141317', 19, 4 + y0, 1, 1);
      rect(x, '#e8dcc0', 16, 3 + y0, 1, 1); // eye
      if (lengua) rect(x, '#e0707a', 18, 7 + y0, 1, 2);
      // ear
      poli(x, F.borde, [[12, 1 + y0], [15, 0 + y0], [14, 5 + y0]]);
      poli(x, F.sombra, [[13, 2 + y0], [14.5, 1 + y0], [14, 4.5 + y0]]);
      // red collar with its tag
      rect(x, '#8e2a22', 12, 3 + y0, 1, 5);
      rect(x, F.collar, 13, 3 + y0, 1, 5);
      rect(x, F.chapa, 13, 8 + y0, 1, 1);
      return c;
    });
  });
}

/** Guille's bear-hug shield (and the «escudo» item's): 2 frames 32 × 40, centred on the player (feet at y = 36). */
export function escudo(): HTMLCanvasElement[] {
  return una('escudo', () =>
    [0, 1].map((k) => {
      const c = lienzo(32, 40);
      const x = ctx(c);
      const d = x.createImageData(32, 40);
      const poner = (i: number, j: number, r: number, g: number, b: number, a: number) => {
        if (i < 0 || j < 0 || i >= 32 || j >= 40) return;
        const o = (j * 32 + i) * 4;
        d.data[o] = r;
        d.data[o + 1] = g;
        d.data[o + 2] = b;
        d.data[o + 3] = a;
      };
      const rx = k ? 14.4 : 13.6;
      const ry = k ? 18.6 : 17.8;
      for (let j = 0; j < 40; j++)
        for (let i = 0; i < 32; i++) {
          const m = Math.hypot((i + 0.5 - 16) / rx, (j + 0.5 - 20) / ry);
          if (m > 1) continue;
          if (m > 0.93) poner(i, j, 255, 233, 160, 235); // bright rim
          else if (m > 0.85) poner(i, j, 255, 205, 100, 120); // inner glow
          else poner(i, j, 255, 214, 120, 64); // warm veil
        }
      // highlight arc at the upper left
      for (let t = 0; t < 7; t++) poner(Math.round(16 - 10 * Math.cos(0.5 + t * 0.12)), Math.round(20 - 14 * Math.sin(0.5 + t * 0.12)) + 1, 255, 250, 225, 200);
      x.putImageData(d, 0, 0);
      // sparkles, in different places each frame
      const bri = k ? [[6, 12], [26, 28], [24, 8]] : [[8, 8], [27, 20], [7, 29]];
      bri.forEach(([a, b]) => {
        x.fillStyle = 'rgba(255,250,225,0.95)';
        x.fillRect(a - 1, b, 3, 1);
        x.fillRect(a, b - 1, 1, 3);
      });
      return c;
    }),
  );
}
