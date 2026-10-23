// «Alacant Sun»'s font: a small hand-made proportional bitmap font (7 px capitals, 5 px lower case,
// two rows of descender, accents above) drawn once into cached atlases, one per colour. Spanish
// characters included: á é í ó ú ü ñ Á É Í Ó Ú Ü Ñ ¿ ¡. Text is crisp at 240×160, like the original's.
//
// A glyph cell is 11 rows: 0–1 accents of the capitals, 2–8 capitals and ascenders (lower case
// x-height 4–8), 9–10 descenders. Each glyph below lists its rows from `top`.
import { ctx, lienzo } from './pixel';

interface Glifo {
  top: number;
  rows: string[];
}

/** Line height used by the text windows. */
export const ALTO_LINEA = 11;
/** Space between lines in a window, from baseline to baseline. */
export const ALTO_CELDA = 11;

const g = (top: number, rows: string[]): Glifo => ({ top, rows });

const BASE: Record<string, Glifo> = {
  A: g(2, ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']),
  B: g(2, ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.']),
  C: g(2, ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.']),
  D: g(2, ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.']),
  E: g(2, ['#####', '#....', '#....', '####.', '#....', '#....', '#####']),
  F: g(2, ['#####', '#....', '#....', '####.', '#....', '#....', '#....']),
  G: g(2, ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.']),
  H: g(2, ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']),
  I: g(2, ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###']),
  J: g(2, ['..###', '....#', '....#', '....#', '....#', '#...#', '.###.']),
  K: g(2, ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#']),
  L: g(2, ['#....', '#....', '#....', '#....', '#....', '#....', '#####']),
  M: g(2, ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#']),
  N: g(2, ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#']),
  O: g(2, ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.']),
  P: g(2, ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....']),
  Q: g(2, ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#']),
  R: g(2, ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#']),
  S: g(2, ['.####', '#....', '#....', '.###.', '....#', '....#', '####.']),
  T: g(2, ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..']),
  U: g(2, ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.']),
  V: g(2, ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..']),
  W: g(2, ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#']),
  X: g(2, ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#']),
  Y: g(2, ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..']),
  Z: g(2, ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####']),
  '0': g(2, ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.']),
  '1': g(2, ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.']),
  '2': g(2, ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####']),
  '3': g(2, ['####.', '....#', '....#', '.###.', '....#', '....#', '####.']),
  '4': g(2, ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.']),
  '5': g(2, ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.']),
  '6': g(2, ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.']),
  '7': g(2, ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...']),
  '8': g(2, ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.']),
  '9': g(2, ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.']),
  a: g(4, ['.###.', '....#', '.####', '#...#', '.####']),
  b: g(2, ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.']),
  c: g(4, ['.###', '#...', '#...', '#...', '.###']),
  d: g(2, ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####']),
  e: g(4, ['.###.', '#...#', '#####', '#....', '.###.']),
  f: g(2, ['..##', '.#..', '###.', '.#..', '.#..', '.#..', '.#..']),
  g: g(4, ['.####', '#...#', '#...#', '#...#', '.####', '....#', '.###.']),
  h: g(2, ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#']),
  i: g(2, ['#', '.', '#', '#', '#', '#', '#']),
  j: g(2, ['.#', '..', '.#', '.#', '.#', '.#', '.#', '.#', '##']),
  k: g(2, ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#']),
  l: g(2, ['#', '#', '#', '#', '#', '#', '#']),
  m: g(4, ['##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#']),
  n: g(4, ['####.', '#...#', '#...#', '#...#', '#...#']),
  o: g(4, ['.###.', '#...#', '#...#', '#...#', '.###.']),
  p: g(4, ['####.', '#...#', '#...#', '#...#', '####.', '#....', '#....']),
  q: g(4, ['.####', '#...#', '#...#', '#...#', '.####', '....#', '....#']),
  r: g(4, ['#.##', '##..', '#...', '#...', '#...']),
  s: g(4, ['.####', '#....', '.###.', '....#', '####.']),
  t: g(3, ['.#.', '###', '.#.', '.#.', '.#.', '..#']),
  u: g(4, ['#...#', '#...#', '#...#', '#...#', '.####']),
  v: g(4, ['#...#', '#...#', '#...#', '.#.#.', '..#..']),
  w: g(4, ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.']),
  x: g(4, ['#...#', '.#.#.', '..#..', '.#.#.', '#...#']),
  y: g(4, ['#...#', '#...#', '#...#', '#...#', '.####', '....#', '.###.']),
  z: g(4, ['#####', '...#.', '..#..', '.#...', '#####']),
  '.': g(8, ['#']),
  ',': g(8, ['.#', '#.']),
  ':': g(5, ['#', '.', '.', '#']),
  ';': g(5, ['.#', '..', '..', '.#', '#.']),
  '!': g(2, ['#', '#', '#', '#', '#', '.', '#']),
  '¡': g(2, ['#', '.', '#', '#', '#', '#', '#']),
  '?': g(2, ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..']),
  '¿': g(2, ['..#..', '.....', '..#..', '.##..', '#....', '#...#', '.###.']),
  "'": g(2, ['#', '#']),
  '"': g(2, ['#.#', '#.#']),
  '-': g(6, ['###']),
  '(': g(2, ['.#', '#.', '#.', '#.', '#.', '#.', '.#']),
  ')': g(2, ['#.', '.#', '.#', '.#', '.#', '.#', '#.']),
  '+': g(5, ['.#.', '###', '.#.']),
  '/': g(2, ['..#', '..#', '.#.', '.#.', '#..', '#..', '#..']),
  '%': g(2, ['#...#', '#..#.', '...#.', '..#..', '.#...', '.#..#', '#...#']),
  'º': g(2, ['.#.', '#.#', '.#.']),
  '♪': g(2, ['..###', '..#.#', '..#.#', '..#..', '###..', '###..']),
};

/** Merges an overlay (rows from its own top) onto a glyph, returning a new glyph. */
function componer(base: Glifo, sobre: Glifo, ancho = Math.max(...base.rows.map((r) => r.length))): Glifo {
  const top = Math.min(base.top, sobre.top);
  const fin = Math.max(base.top + base.rows.length, sobre.top + sobre.rows.length);
  const rows: string[] = [];
  for (let y = top; y < fin; y++) {
    const a = base.rows[y - base.top] ?? '';
    const b = sobre.rows[y - sobre.top] ?? '';
    let fila = '';
    for (let x = 0; x < ancho; x++) fila += a[x] === '#' || b[x] === '#' ? '#' : '.';
    rows.push(fila);
  }
  return { top, rows };
}

/** An accent as rows of the right width, centred on the glyph. */
function acento(ancho: number, tipo: 'agudo' | 'agudoM' | 'dieresis' | 'dieresisM' | 'tilde' | 'tildeM'): Glifo {
  const cx = Math.floor((ancho - 1) / 2);
  const fila = (xs: number[], n: number) =>
    Array.from({ length: n }, (_, i) => (xs.includes(i) ? '#' : '.')).join('');
  const n = Math.max(ancho, cx + 2);
  switch (tipo) {
    case 'agudo': // capital: a short dash on row 0
      return g(0, [fila([cx, cx + 1], n)]);
    case 'agudoM': // lower case: two pixels on rows 1–2
      return g(1, [fila([cx + 1], n), fila([cx], n)]);
    case 'dieresis':
      return g(0, [fila([cx - 1, cx + 1], n)]);
    case 'dieresisM':
      return g(2, [fila([cx - 1, cx + 1], n)]);
    case 'tilde':
      return g(0, [fila([0, 2], n), fila([1, 3], n)]);
    case 'tildeM':
      return g(1, [fila([0, 2], n), fila([1, 3], n)]);
  }
}

const GLIFOS: Record<string, Glifo> = { ...BASE };
const ancho = (gl: Glifo) => Math.max(...gl.rows.map((r) => r.length));
for (const [con, sin, tipo] of [
  ['á', 'a', 'agudoM'], ['é', 'e', 'agudoM'], ['ó', 'o', 'agudoM'], ['ú', 'u', 'agudoM'],
  ['ü', 'u', 'dieresisM'], ['ñ', 'n', 'tildeM'],
  ['Á', 'A', 'agudo'], ['É', 'E', 'agudo'], ['Í', 'I', 'agudo'], ['Ó', 'O', 'agudo'], ['Ú', 'U', 'agudo'],
  ['Ü', 'U', 'dieresis'], ['Ñ', 'N', 'tilde'],
] as const) {
  const b = BASE[sin];
  GLIFOS[con] = componer(b, acento(ancho(b), tipo));
}
// í: no dot, a stem with its accent (two columns wide).
GLIFOS['í'] = g(1, ['.#', '#.', '..', '#.', '#.', '#.', '#.', '#.']);

const ESPACIO = 3;

/** One colour's atlas: every glyph side by side in a single canvas, plus where each one is. */
interface Atlas {
  img: HTMLCanvasElement;
  x: Record<string, number>;
}
const atlas = new Map<string, Atlas>();

function atlasDe(col: string): Atlas {
  let a = atlas.get(col);
  if (a) return a;
  const letras = Object.keys(GLIFOS);
  const total = letras.reduce((s, ch) => s + ancho(GLIFOS[ch]) + 1, 0);
  const img = lienzo(total, 11);
  const x = ctx(img);
  x.fillStyle = col;
  const pos: Record<string, number> = {};
  let px = 0;
  for (const ch of letras) {
    const gl = GLIFOS[ch];
    pos[ch] = px;
    gl.rows.forEach((fila, j) => {
      for (let i = 0; i < fila.length; i++) if (fila[i] === '#') x.fillRect(px + i, gl.top + j, 1, 1);
    });
    px += ancho(gl) + 1;
  }
  a = { img, x: pos };
  atlas.set(col, a);
  return a;
}

/** Width in pixels of a text (glyphs plus one pixel between them). */
export function anchoTexto(s: string): number {
  let w = 0;
  for (const ch of s) w += ch === ' ' ? ESPACIO + 1 : (GLIFOS[ch] ? ancho(GLIFOS[ch]) : 5) + 1;
  return Math.max(0, w - 1);
}

/** Advance of one character (for letter-by-letter typing). */
export function avance(ch: string): number {
  return ch === ' ' ? ESPACIO + 1 : (GLIFOS[ch] ? ancho(GLIFOS[ch]) : 5) + 1;
}

/** Draws a text at (x, y) = top-left of the 11-row cell. Optional shadow one pixel down-right. */
export function escribir(c: CanvasRenderingContext2D, s: string, x: number, y: number, col = '#ffffff', sombra?: string) {
  if (sombra) escribir(c, s, x + 1, y + 1, sombra);
  const a = atlasDe(col);
  let px = x;
  for (const ch of s) {
    if (ch === ' ') {
      px += ESPACIO + 1;
      continue;
    }
    const gl = GLIFOS[ch];
    if (!gl) {
      px += 6;
      continue;
    }
    const w = ancho(gl);
    c.drawImage(a.img, a.x[ch], 0, w, 11, px, y, w, 11);
    px += w + 1;
  }
}

/** Breaks a text into lines no wider than `max` pixels, at spaces. */
export function partir(s: string, max: number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of s.split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && anchoTexto(prueba) > max) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** True if every character of the text is in the font (the check of the texts file). */
export function faltan(s: string): string[] {
  return [...new Set([...s].filter((ch) => ch !== ' ' && !GLIFOS[ch]))];
}
