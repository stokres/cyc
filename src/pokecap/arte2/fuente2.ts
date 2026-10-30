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

// ---------------------------------------------------------------------------------------------------------
// Baked text. Every canvas costs the browser about 18 KB of bookkeeping on top of its pixels, and a session
// used to create well over a thousand (one per glyph and colour, one per line): so the glyphs of a colour live
// side by side in ONE sheet, and the baked lines of all colours are packed into a few shared pages. Drawing
// is one drawImage of a sub-rectangle either way (smoothing is off, so it is the same pixels).
// ---------------------------------------------------------------------------------------------------------

const bitmaps = new Map<string, Bitmap | null>();
function bitmapDe(ch: string): Bitmap | null {
  let b = bitmaps.get(ch);
  if (b === undefined) {
    b = bitmap(ch);
    bitmaps.set(ch, b);
  }
  return b;
}

/** Where each known character sits in a glyph sheet (its cell is the glyph's width + 1, like its own canvas used to be). */
const ranuras = new Map<string, { x: number; w: number; i: number }>();
let anchoHoja = 0;
for (const ch of [...Object.keys(GLIFOS), ...Object.keys(ACENTUADAS)]) {
  const w = (bitmap(ch)?.w ?? 0) + 1;
  ranuras.set(ch, { x: anchoHoja, w, i: ranuras.size });
  anchoHoja += w;
}
const INTERROGANTE = ranuras.get('?')!;

interface Hoja {
  cv: HTMLCanvasElement;
  cx: CanvasRenderingContext2D;
  /** Which slots are drawn already (lazily: a colour rarely uses every character). */
  hechos: Uint8Array;
}
/** Glyph sheets by colour, then by shadow colour ('' for none): two lookups, no key string built per draw. */
const hojas = new Map<string, Map<string, Hoja>>();

function hojaDe(color: string, sombra: string | null): Hoja {
  let porSombra = hojas.get(color);
  if (!porSombra) {
    porSombra = new Map();
    hojas.set(color, porSombra);
  }
  const k = sombra ?? '';
  let h = porSombra.get(k);
  if (!h) {
    const cv = document.createElement('canvas');
    cv.width = anchoHoja;
    cv.height = ALTO_CELDA + 1;
    h = { cv, cx: cv.getContext('2d')!, hechos: new Uint8Array(ranuras.size) };
    porSombra.set(k, h);
  }
  return h;
}

/** The slot of `ch` in the sheet (the «?» one for a character the font does not have), drawn if it was not yet. */
function ranura(h: Hoja, ch: string, color: string, sombra: string | null): { x: number; w: number } {
  const r = ranuras.get(ch) ?? INTERROGANTE;
  if (!h.hechos[r.i]) {
    h.hechos[r.i] = 1;
    const b = bitmapDe(ranuras.has(ch) ? ch : '?')!;
    const cx = h.cx;
    if (sombra) {
      cx.fillStyle = sombra;
      for (const [x, y] of b.px) cx.fillRect(r.x + x + 1, y + 1, 1, 1);
    }
    cx.fillStyle = color;
    for (const [x, y] of b.px) cx.fillRect(r.x + x, y, 1, 1);
  }
  return r;
}

/** Advance of each character (glyph width + 1 gap), computed once: the bitmap is rebuilt otherwise. */
const avances = new Map<string, number>();
function avance(ch: string): number {
  let a = avances.get(ch);
  if (a === undefined) {
    a = ch === ' ' ? ESPACIO + 1 : (bitmapDe(ch) ?? bitmapDe('?')!).w + 1;
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

/** A page of baked lines: all lines are one cell high, so they go in rows of that height. */
const PAG_ANCHO = 256;
const PAG_FILAS = 21;
const MAX_PAGINAS = 10;
interface Pagina {
  cv: HTMLCanvasElement;
  cx: CanvasRenderingContext2D;
  /** Where the next line goes. */
  x: number;
  fila: number;
  /** Tick of the last draw of any of its lines (the oldest page is the one recycled). */
  uso: number;
  lineas: { mapa: Map<string, Linea>; texto: string }[];
}
interface Linea {
  pag: Pagina;
  x: number;
  y: number;
  /** Width of the baked line (its advance plus one). */
  w: number;
  avance: number;
}
const paginas: Pagina[] = [];
let abierta: Pagina | null = null;
let reloj = 0;

function paginaNueva(): Pagina {
  const cv = document.createElement('canvas');
  cv.width = PAG_ANCHO;
  cv.height = PAG_FILAS * (ALTO_CELDA + 1);
  return { cv, cx: cv.getContext('2d')!, x: 0, fila: 0, uso: ++reloj, lineas: [] };
}

/** Finds room for a line `w` wide: in the open page, a fresh one, or the least recently used page wiped clean. */
function sitio(w: number): { pag: Pagina; x: number; y: number } {
  const alto = ALTO_CELDA + 1;
  if (w > PAG_ANCHO) {
    // Wider than a page (never on a 240 px screen): a canvas of its own, outside the pool.
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = alto;
    return { pag: { cv, cx: cv.getContext('2d')!, x: 0, fila: 0, uso: 0, lineas: [] }, x: 0, y: 0 };
  }
  let p = abierta;
  if (p && p.x + w > PAG_ANCHO) {
    p.fila++;
    p.x = 0;
  }
  if (!p || (p.fila + 1) * alto > p.cv.height) {
    if (paginas.length < MAX_PAGINAS) {
      p = paginaNueva();
      paginas.push(p);
    } else {
      p = paginas.reduce((a, q) => (q !== abierta && q.uso < a.uso ? q : a), paginas.find((q) => q !== abierta)!);
      for (const l of p.lineas) l.mapa.delete(l.texto);
      p.lineas = [];
      p.cx.clearRect(0, 0, p.cv.width, p.cv.height);
      p.x = 0;
      p.fila = 0;
    }
    abierta = p;
  }
  const r = { pag: p, x: p.x, y: p.fila * alto };
  p.x += w + 1; // one empty column between neighbours
  return r;
}

/** Baked lines by colour, then shadow, then text (three Map lookups, no key string built per draw). */
const lineas = new Map<string, Map<string, Map<string, Linea>>>();

/**
 * Whole strings baked into a page, so that a line of text is one drawImage instead of one per letter: on phones
 * the per-letter draws were most of a frame's cost. When the pages are all in use the least recently drawn one is
 * wiped and its lines are baked again if they come back.
 */
function lineaCanvas(texto: string, color: string, sombra: string | null): Linea {
  let porSombra = lineas.get(color);
  if (!porSombra) {
    porSombra = new Map();
    lineas.set(color, porSombra);
  }
  const ks = sombra ?? '';
  let porTexto = porSombra.get(ks);
  if (!porTexto) {
    porTexto = new Map();
    porSombra.set(ks, porTexto);
  }
  const hit = porTexto.get(texto);
  if (hit) {
    hit.pag.uso = ++reloj;
    return hit;
  }
  let adv = 0;
  for (const ch of texto) adv += avance(ch);
  const w = Math.max(1, adv + 1);
  const hoja = hojaDe(color, sombra);
  const lugar = sitio(w);
  const alto = ALTO_CELDA + 1;
  let x = 0;
  for (const ch of texto) {
    if (ch !== ' ') {
      const r = ranura(hoja, ch, color, sombra);
      lugar.pag.cx.drawImage(hoja.cv, r.x, 0, r.w, alto, lugar.x + x, lugar.y, r.w, alto);
    }
    x += avance(ch);
  }
  const l: Linea = { pag: lugar.pag, x: lugar.x, y: lugar.y, w, avance: x };
  lugar.pag.uso = ++reloj;
  if (paginas.includes(lugar.pag)) lugar.pag.lineas.push({ mapa: porTexto, texto }); // (a line wider than a page has its own canvas, outside the pool)
  porTexto.set(texto, l);
  return l;
}

/** Draws a string with its capital line at `y`. Optional drop shadow colour. */
export function dibujarTexto2(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, color: string, sombra: string | null = null): number {
  if (!texto) return 0;
  const alto = ALTO_CELDA + 1;
  // Numbers change every frame while a bar drains or a clock counts: letter by letter, not one baked line each.
  if (texto.length <= 9 && /^[0-9/%:+\-×. ]+$/.test(texto)) {
    const hoja = hojaDe(color, sombra);
    let cx = Math.round(x);
    const cy = Math.round(y) - 2;
    for (const ch of texto) {
      if (ch !== ' ') {
        const r = ranura(hoja, ch, color, sombra);
        ctx.drawImage(hoja.cv, r.x, 0, r.w, alto, cx, cy, r.w, alto);
      }
      cx += avance(ch);
    }
    return cx - Math.round(x);
  }
  const l = lineaCanvas(texto, color, sombra);
  ctx.drawImage(l.pag.cv, l.x, l.y, l.w, alto, Math.round(x), Math.round(y) - 2, l.w, alto);
  return l.avance;
}

/** Draws the first `n` characters of a string (the typewriter): a clip of the whole baked line, so nothing is baked per step. */
export function dibujarTextoParcial2(ctx: CanvasRenderingContext2D, texto: string, n: number, x: number, y: number, color: string, sombra: string | null = null): void {
  if (!texto || n <= 0) return;
  const l = lineaCanvas(texto, color, sombra);
  let w = 0;
  let i = 0;
  for (const ch of texto) {
    if (i++ >= n) break;
    w += avance(ch);
  }
  w = Math.min(w, l.w);
  if (w > 0) ctx.drawImage(l.pag.cv, l.x, l.y, w, ALTO_CELDA + 1, Math.round(x), Math.round(y) - 2, w, ALTO_CELDA + 1);
}

/** Word wrap by pixel width (remembered by width, then text: screens wrap the same texts every frame, and no key string is built). */
const envueltos = new Map<number, Map<string, string[]>>();
let nEnvueltos = 0;
export function envolver2(texto: string, ancho: number): string[] {
  let porTexto = envueltos.get(ancho);
  if (!porTexto) {
    porTexto = new Map();
    envueltos.set(ancho, porTexto);
  }
  const hecho = porTexto.get(texto);
  if (hecho) return hecho;
  const out = envolverSinMemoria(texto, ancho);
  if (++nEnvueltos > 800) {
    envueltos.clear();
    nEnvueltos = 1;
    porTexto = new Map();
    envueltos.set(ancho, porTexto);
  }
  porTexto.set(texto, out);
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
