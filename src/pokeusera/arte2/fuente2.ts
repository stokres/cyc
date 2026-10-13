// PokéUsera · Edición Jarra (arte v2): a proportional pixel font with 1-px strokes.
//
// Capitals are 7 px tall, lowercase has an x-height of 5, descenders go 2 px below the baseline;
// accents (á é í ó ú ü ñ and ¡ ¿) sit above the letters. Glyph widths vary (i is 1 px, m is 5), with a
// 1-px gap between letters. Like arte/fuente.ts it is a *baked atlas*: every colour (with its optional
// drop shadow) gets one small canvas per glyph, cached, and the text is blitted with drawImage.
//
// Cell geometry (rows): 0–1 accents of capitals, 1–2 accents of lowercase, 2–8 capitals and ascenders,
// 4–8 x-height, 9–10 descenders. `dibujarTexto2` takes the y of the capital line (row 2 of the cell).

/** Rows of a glyph and the cell row where the first row goes. */
type Glifo = { fila0: number; filas: string[] };

const C = (...filas: string[]): Glifo => ({ fila0: 2, filas });
const X = (...filas: string[]): Glifo => ({ fila0: 4, filas });

const MAYUS: Record<string, Glifo> = {
  A: C('.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'),
  B: C('XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'),
  C: C('.XXXX', 'X....', 'X....', 'X....', 'X....', 'X....', '.XXXX'),
  D: C('XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'),
  E: C('XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'),
  F: C('XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....'),
  G: C('.XXXX', 'X....', 'X....', 'X..XX', 'X...X', 'X...X', '.XXXX'),
  H: C('X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'),
  I: C('XXX', '.X.', '.X.', '.X.', '.X.', '.X.', 'XXX'),
  J: C('..XX', '...X', '...X', '...X', '...X', 'X..X', '.XX.'),
  K: C('X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'),
  L: C('X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'),
  M: C('X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'),
  N: C('X...X', 'XX..X', 'X.X.X', 'X.X.X', 'X..XX', 'X...X', 'X...X'),
  O: C('.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'),
  P: C('XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'),
  Q: C('.XXX.', 'X...X', 'X...X', 'X...X', 'X.X.X', 'X..X.', '.XX.X'),
  R: C('XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'),
  S: C('.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.'),
  T: C('XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'),
  U: C('X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'),
  V: C('X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '.X.X.', '..X..'),
  W: C('X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'),
  X: C('X...X', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X'),
  Y: C('X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'),
  Z: C('XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX'),
};

const MINUS: Record<string, Glifo> = {
  a: X('.XX.', '...X', '.XXX', 'X..X', '.XXX'),
  b: C('X...', 'X...', 'XXX.', 'X..X', 'X..X', 'X..X', 'XXX.'),
  c: X('.XXX', 'X...', 'X...', 'X...', '.XXX'),
  d: C('...X', '...X', '.XXX', 'X..X', 'X..X', 'X..X', '.XXX'),
  e: X('.XX.', 'X..X', 'XXXX', 'X...', '.XXX'),
  f: C('.XX', 'X..', 'XXX', 'X..', 'X..', 'X..', 'X..'),
  g: X('.XXX', 'X..X', 'X..X', 'X..X', '.XXX', '...X', 'XXX.'),
  h: C('X...', 'X...', 'XXX.', 'X..X', 'X..X', 'X..X', 'X..X'),
  i: C('X', '.', 'X', 'X', 'X', 'X', 'X'),
  j: C('.X', '..', '.X', '.X', '.X', '.X', '.X', '.X', 'X.'),
  k: C('X...', 'X...', 'X..X', 'X.X.', 'XX..', 'X.X.', 'X..X'),
  l: C('X', 'X', 'X', 'X', 'X', 'X', 'X'),
  m: X('XXXX.', 'X.X.X', 'X.X.X', 'X.X.X', 'X.X.X'),
  n: X('XXX.', 'X..X', 'X..X', 'X..X', 'X..X'),
  o: X('.XX.', 'X..X', 'X..X', 'X..X', '.XX.'),
  p: X('XXX.', 'X..X', 'X..X', 'X..X', 'XXX.', 'X...', 'X...'),
  q: X('.XXX', 'X..X', 'X..X', 'X..X', '.XXX', '...X', '...X'),
  r: X('X.XX', 'XX..', 'X...', 'X...', 'X...'),
  s: X('.XXX', 'X...', '.XX.', '...X', 'XXX.'),
  t: { fila0: 3, filas: ['.X.', 'XXX', '.X.', '.X.', '.X.', '.XX'] },
  u: X('X..X', 'X..X', 'X..X', 'X..X', '.XXX'),
  v: X('X...X', 'X...X', '.X.X.', '.X.X.', '..X..'),
  w: X('X...X', 'X...X', 'X.X.X', 'XX.XX', 'X...X'),
  x: X('X...X', '.X.X.', '..X..', '.X.X.', 'X...X'),
  y: X('X..X', 'X..X', 'X..X', 'X..X', '.XXX', '...X', 'XXX.'),
  z: X('XXXX', '...X', '.XX.', 'X...', 'XXXX'),
};

const OTROS: Record<string, Glifo> = {
  '0': C('.XXX.', 'X...X', 'X..XX', 'X.X.X', 'XX..X', 'X...X', '.XXX.'),
  '1': C('.X.', 'XX.', '.X.', '.X.', '.X.', '.X.', 'XXX'),
  '2': C('.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX'),
  '3': C('XXXX.', '....X', '....X', '.XXX.', '....X', '....X', 'XXXX.'),
  '4': C('...X.', '..XX.', '.X.X.', 'X..X.', 'XXXXX', '...X.', '...X.'),
  '5': C('XXXXX', 'X....', 'XXXX.', '....X', '....X', 'X...X', '.XXX.'),
  '6': C('.XXX.', 'X....', 'X....', 'XXXX.', 'X...X', 'X...X', '.XXX.'),
  '7': C('XXXXX', '....X', '...X.', '..X..', '.X...', '.X...', '.X...'),
  '8': C('.XXX.', 'X...X', 'X...X', '.XXX.', 'X...X', 'X...X', '.XXX.'),
  '9': C('.XXX.', 'X...X', 'X...X', '.XXXX', '....X', '....X', '.XXX.'),
  '.': { fila0: 8, filas: ['X'] },
  ',': { fila0: 8, filas: ['X', 'X'] },
  ':': { fila0: 5, filas: ['X', '.', '.', 'X'] },
  ';': { fila0: 5, filas: ['X', '.', '.', 'X', 'X'] },
  '!': C('X', 'X', 'X', 'X', 'X', '.', 'X'),
  '¡': C('X', '.', 'X', 'X', 'X', 'X', 'X', 'X'),
  '?': C('.XXX.', 'X...X', '....X', '..XX.', '..X..', '.....', '..X..'),
  '¿': C('..X..', '.....', '..X..', '.XX..', 'X....', 'X...X', '.XXX.'),
  '-': { fila0: 6, filas: ['XXX'] },
  '+': { fila0: 5, filas: ['.X.', 'XXX', '.X.'] },
  '/': C('..X', '..X', '.X.', '.X.', '.X.', 'X..', 'X..'),
  '(': C('.X', 'X.', 'X.', 'X.', 'X.', 'X.', '.X'),
  ')': C('X.', '.X', '.X', '.X', '.X', '.X', 'X.'),
  '%': C('XX..X', 'XX..X', '...X.', '..X..', '.X...', 'X..XX', 'X..XX'),
  "'": { fila0: 2, filas: ['X', 'X'] },
  '"': { fila0: 2, filas: ['X.X', 'X.X'] },
  '…': { fila0: 8, filas: ['X.X.X'] },
  '·': { fila0: 6, filas: ['X'] },
  '×': { fila0: 5, filas: ['X.X', '.X.', 'X.X'] },
  '=': { fila0: 5, filas: ['XXX', '...', 'XXX'] },
  '*': { fila0: 3, filas: ['X.X', '.X.', 'X.X'] },
  '«': { fila0: 5, filas: ['..X.X', '.X.X.', 'X.X..', '.X.X.', '..X.X'] },
  '»': { fila0: 5, filas: ['X.X..', '.X.X.', '..X.X', '.X.X.', 'X.X..'] },
  'º': { fila0: 2, filas: ['XXX', 'X.X', 'XXX'] },
  '€': C('..XXX', '.X...', 'XXXX.', '.X...', 'XXXX.', '.X...', '..XXX'),
};

const GLIFOS: Record<string, Glifo> = { ...MAYUS, ...MINUS, ...OTROS };

/** Accent overlays as [cell row, pattern relative to the letter]; '#' = pixel. */
const AGUDO_MIN: [number, string][] = [
  [1, '..#'],
  [2, '.#.'],
];
const AGUDO_MAY: [number, string][] = [
  [0, '..#'],
  [1, '.#.'],
];
const DIERESIS_MIN: [number, string][] = [[2, '#.#']];
const DIERESIS_MAY: [number, string][] = [[0, '#.#']];
const TILDE_MIN: [number, string][] = [
  [1, '.##.'],
  [2, '#..#'],
];
const TILDE_MAY: [number, string][] = [
  [0, '.##.'],
  [1, '#..#'],
];

const ACENTUADAS: Record<string, [string, [number, string][]]> = {
  á: ['a', AGUDO_MIN],
  é: ['e', AGUDO_MIN],
  í: ['i', AGUDO_MIN],
  ó: ['o', AGUDO_MIN],
  ú: ['u', AGUDO_MIN],
  ü: ['u', DIERESIS_MIN],
  ñ: ['n', TILDE_MIN],
  Á: ['A', AGUDO_MAY],
  É: ['E', AGUDO_MAY],
  Í: ['I', AGUDO_MAY],
  Ó: ['O', AGUDO_MAY],
  Ú: ['U', AGUDO_MAY],
  Ü: ['U', DIERESIS_MAY],
  Ñ: ['N', TILDE_MAY],
};

/** Final bitmap of a character: width and the set of [col, row] pixels in the 11-row cell. */
interface Bitmap {
  w: number;
  px: [number, number][];
}

function bitmap(ch: string): Bitmap | null {
  const acc = ACENTUADAS[ch];
  const base = acc ? GLIFOS[acc[0]] : GLIFOS[ch];
  if (!base) return null;
  const px: [number, number][] = [];
  let w = 0;
  base.filas.forEach((f, j) => {
    w = Math.max(w, f.length);
    for (let i = 0; i < f.length; i++) if (f[i] === 'X') px.push([i, base.fila0 + j]);
  });
  if (acc) {
    for (const [fila, patron] of acc[1]) {
      // Centre the pattern over the letter (i is 1 px wide: the accent leans right of it).
      const off = w <= 2 ? 0 : Math.max(0, Math.floor((w - patron.length) / 2) + (w >= 4 ? 1 : 0));
      for (let i = 0; i < patron.length; i++) {
        if (patron[i] === '#') px.push([Math.max(0, i + off - (w <= 2 ? 1 : 0)), fila]);
      }
    }
    w = Math.max(w, ...px.map(([x]) => x + 1));
  }
  return { w, px };
}

/** Height of the text cell and the offset from the cell top to the capital line. */
export const ALTO_CELDA = 11;
export const LINEA = 12;
const ESPACIO = 3;

type Atlas = Map<string, HTMLCanvasElement>;
const atlas = new Map<string, Atlas>();

function atlasDe(color: string, sombra: string | null): Atlas {
  const clave = `${color}|${sombra ?? ''}`;
  let a = atlas.get(clave);
  if (!a) {
    a = new Map();
    atlas.set(clave, a);
  }
  return a;
}

function glifoCanvas(ch: string, color: string, sombra: string | null): HTMLCanvasElement | null {
  const a = atlasDe(color, sombra);
  const hit = a.get(ch);
  if (hit) return hit;
  const b = bitmap(ch);
  if (!b) return null;
  const cv = document.createElement('canvas');
  cv.width = b.w + 1;
  cv.height = ALTO_CELDA + 1;
  const cx = cv.getContext('2d')!;
  if (sombra) {
    cx.fillStyle = sombra;
    for (const [x, y] of b.px) cx.fillRect(x + 1, y + 1, 1, 1);
  }
  cx.fillStyle = color;
  for (const [x, y] of b.px) cx.fillRect(x, y, 1, 1);
  a.set(ch, cv);
  return cv;
}

/** Advance of each character (glyph width + 1 gap), computed once: the bitmap is rebuilt otherwise. */
const avances = new Map<string, number>();
function avance(ch: string): number {
  let a = avances.get(ch);
  if (a === undefined) {
    a = ch === ' ' ? ESPACIO + 1 : (bitmap(ch) ?? bitmap('?')!).w + 1;
    avances.set(ch, a);
  }
  return a;
}

/** Width in pixels of a string (gap between letters included, no trailing gap). */
export function anchoTexto2(texto: string): number {
  let w = 0;
  for (const ch of texto) w += avance(ch);
  return Math.max(0, w - 1);
}

/**
 * Whole strings baked into one canvas each (least recently used out first), so that a line of text is one
 * drawImage instead of one per letter: on phones the per-letter draws were most of a frame's cost.
 */
const MAX_LINEAS = 500;
const lineas = new Map<string, { cv: HTMLCanvasElement; avance: number }>();
function lineaCanvas(texto: string, color: string, sombra: string | null): { cv: HTMLCanvasElement; avance: number } {
  const clave = `${color}|${sombra ?? ''}|${texto}`;
  let l = lineas.get(clave);
  if (l) {
    // Refresh its place in the LRU order.
    lineas.delete(clave);
    lineas.set(clave, l);
    return l;
  }
  let w = 0;
  for (const ch of texto) w += avance(ch);
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, w + 1);
  cv.height = ALTO_CELDA + 1;
  const cx = cv.getContext('2d')!;
  let x = 0;
  for (const ch of texto) {
    if (ch !== ' ') {
      const g = glifoCanvas(ch, color, sombra) ?? glifoCanvas('?', color, sombra)!;
      cx.drawImage(g, x, 0);
    }
    x += avance(ch);
  }
  l = { cv, avance: x };
  lineas.set(clave, l);
  if (lineas.size > MAX_LINEAS) lineas.delete(lineas.keys().next().value!);
  return l;
}

/** Draws a string with its capital line at `y`. Optional drop shadow colour. */
export function dibujarTexto2(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, color: string, sombra: string | null = null): number {
  if (!texto) return 0;
  // Numbers change every frame while a bar drains or a clock counts: letter by letter, not one canvas each.
  if (texto.length <= 9 && /^[0-9/%:+\-×. ]+$/.test(texto)) {
    let cx = Math.round(x);
    const cy = Math.round(y) - 2;
    for (const ch of texto) {
      if (ch !== ' ') ctx.drawImage(glifoCanvas(ch, color, sombra) ?? glifoCanvas('?', color, sombra)!, cx, cy);
      cx += avance(ch);
    }
    return cx - Math.round(x);
  }
  const l = lineaCanvas(texto, color, sombra);
  ctx.drawImage(l.cv, Math.round(x), Math.round(y) - 2);
  return l.avance;
}

/** Draws the first `n` characters of a string (the typewriter): a clip of the whole line's canvas, so no canvas per step. */
export function dibujarTextoParcial2(ctx: CanvasRenderingContext2D, texto: string, n: number, x: number, y: number, color: string, sombra: string | null = null): void {
  if (!texto || n <= 0) return;
  const l = lineaCanvas(texto, color, sombra);
  let w = 0;
  let i = 0;
  for (const ch of texto) {
    if (i++ >= n) break;
    w += avance(ch);
  }
  w = Math.min(w, l.cv.width);
  if (w > 0) ctx.drawImage(l.cv, 0, 0, w, l.cv.height, Math.round(x), Math.round(y) - 2, w, l.cv.height);
}

/** Word wrap by pixel width (remembered: screens wrap the same texts every frame). */
const envueltos = new Map<string, string[]>();
export function envolver2(texto: string, ancho: number): string[] {
  const clave = `${ancho}|${texto}`;
  const hecho = envueltos.get(clave);
  if (hecho) return hecho;
  const out = envolverSinMemoria(texto, ancho);
  if (envueltos.size > 800) envueltos.clear();
  envueltos.set(clave, out);
  return out;
}

function envolverSinMemoria(texto: string, ancho: number): string[] {
  const out: string[] = [];
  let linea = '';
  for (const palabra of texto.split(' ')) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (linea && anchoTexto2(prueba) > ancho) {
      out.push(linea);
      linea = palabra;
    } else {
      linea = prueba;
    }
  }
  if (linea) out.push(linea);
  return out;
}
