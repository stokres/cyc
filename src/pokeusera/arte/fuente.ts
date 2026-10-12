// PokéUsera · Edición Jarra: 8×8 bitmap font in the style of the first Game Boy games, plus a
// tiny 4×6 variant for badges. Every colour is baked once into a glyph atlas (cached by colour)
// and the text is blitted with drawImage, so there is no per-frame vector work.
//
// Cell layout of the 8×8 font: capitals and digits use rows 1–6, lowercase uses rows 2–6 (x-height
// 5) with ascenders on row 1 and descenders on row 7; accents live on row 0 (and row 1 for the
// lowercase acute).

type Filas = string[];

/** Builds the 8 rows of a glyph, placing the given rows from `desde` on. */
function r(desde: number, ...filas: string[]): Filas {
  const out: Filas = Array(8).fill('......');
  filas.forEach((f, i) => {
    out[desde + i] = f.padEnd(7, '.');
  });
  return out.map((f) => f.padEnd(7, '.'));
}

/** ORs an overlay (rows from row 0) onto a base glyph. */
function con(base: Filas, ...sobre: [number, string][]): Filas {
  const out = base.map((f) => f.split(''));
  for (const [fila, patron] of sobre) {
    for (let i = 0; i < patron.length; i++) if (patron[i] === 'X') out[fila][i] = 'X';
  }
  return out.map((f) => f.join(''));
}

const A = r(1, '..XX..', '.XXXX.', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX');
const E = r(1, 'XXXXXX', 'XX....', 'XXXX..', 'XX....', 'XX....', 'XXXXXX');
const I = r(1, '.XXXX.', '..XX..', '..XX..', '..XX..', '..XX..', '.XXXX.');
const O = r(1, '.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.');
const U = r(1, 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.');
const N = r(1, 'XX..XX', 'XXX.XX', 'XXXXXX', 'XX.XXX', 'XX..XX', 'XX..XX');
const a = r(2, '.XXXX.', '....XX', '.XXXXX', 'XX..XX', '.XXXXX');
const e = r(2, '.XXXX.', 'XX..XX', 'XXXXXX', 'XX....', '.XXXX.');
const i = r(2, '.XXX..', '..XX..', '..XX..', '..XX..', '.XXXX.');
const o = r(2, '.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.');
const u = r(2, 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXXX');
const n = r(2, 'XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX');

const AGUDO_MAY: [number, string] = [0, '...XX.'];
const AGUDO_MIN: [number, string][] = [
  [0, '....X.'],
  [1, '...X..'],
];
const DIERESIS: [number, string] = [0, '.X..X.'];
const TILDE: [number, string] = [0, '.XX.X.'];

const GLIFOS: Record<string, Filas> = {
  A,
  B: r(1, 'XXXXX.', 'XX..XX', 'XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.'),
  C: r(1, '.XXXX.', 'XX..XX', 'XX....', 'XX....', 'XX..XX', '.XXXX.'),
  D: r(1, 'XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.'),
  E,
  F: r(1, 'XXXXXX', 'XX....', 'XXXX..', 'XX....', 'XX....', 'XX....'),
  G: r(1, '.XXXX.', 'XX..XX', 'XX....', 'XX.XXX', 'XX..XX', '.XXXX.'),
  H: r(1, 'XX..XX', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX'),
  I,
  J: r(1, '..XXXX', '...XX.', '...XX.', '...XX.', 'XX.XX.', '.XXX..'),
  K: r(1, 'XX..XX', 'XX.XX.', 'XXXX..', 'XXXX..', 'XX.XX.', 'XX..XX'),
  L: r(1, 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XXXXXX'),
  M: r(1, 'XX...XX', 'XXX.XXX', 'XXXXXXX', 'XX.X.XX', 'XX...XX', 'XX...XX'),
  N,
  O,
  P: r(1, 'XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX....', 'XX....'),
  Q: r(1, '.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX.XX.', '.XX.XX'),
  R: r(1, 'XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX.XX.', 'XX..XX'),
  S: r(1, '.XXXXX', 'XX....', '.XXXX.', '....XX', '....XX', 'XXXXX.'),
  T: r(1, 'XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..'),
  U,
  V: r(1, 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', '.XXXX.', '..XX..'),
  W: r(1, 'XX...XX', 'XX...XX', 'XX.X.XX', 'XXXXXXX', 'XXX.XXX', 'XX...XX'),
  X: r(1, 'XX..XX', '.XXXX.', '..XX..', '..XX..', '.XXXX.', 'XX..XX'),
  Y: r(1, 'XX..XX', 'XX..XX', '.XXXX.', '..XX..', '..XX..', '..XX..'),
  Z: r(1, 'XXXXXX', '....XX', '...XX.', '..XX..', '.XX...', 'XXXXXX'),
  a,
  b: r(1, 'XX....', 'XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.'),
  c: r(2, '.XXXX.', 'XX..XX', 'XX....', 'XX..XX', '.XXXX.'),
  d: r(1, '....XX', '.XXXXX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXXX'),
  e,
  f: r(1, '..XXX.', '.XX...', 'XXXXX.', '.XX...', '.XX...', '.XX...'),
  g: r(2, '.XXXXX', 'XX..XX', 'XX..XX', '.XXXXX', '....XX', '.XXXX.'),
  h: r(1, 'XX....', 'XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX'),
  i: con(i, [0, '..XX..']),
  j: con(r(2, '...XX.', '...XX.', '...XX.', '...XX.', 'XX.XX.', '.XXX..'), [0, '...XX.']),
  k: r(1, 'XX....', 'XX..XX', 'XX.XX.', 'XXXX..', 'XX.XX.', 'XX..XX'),
  l: r(1, '.XXX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XXX.'),
  m: r(2, 'XXXXXX.', 'XX.X.XX', 'XX.X.XX', 'XX.X.XX', 'XX.X.XX'),
  n,
  o,
  p: r(2, 'XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX....', 'XX....'),
  q: r(2, '.XXXXX', 'XX..XX', 'XX..XX', '.XXXXX', '....XX', '....XX'),
  r: r(2, 'XX.XXX', 'XXX...', 'XX....', 'XX....', 'XX....'),
  s: r(2, '.XXXXX', 'XX....', '.XXXX.', '....XX', 'XXXXX.'),
  t: r(1, '.XX...', 'XXXXX.', '.XX...', '.XX...', '.XX..X', '..XXX.'),
  u,
  v: r(2, 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', '..XX..'),
  w: r(2, 'XX...XX', 'XX...XX', 'XX.X.XX', 'XXXXXXX', '.XX.XX.'),
  x: r(2, 'XX..XX', '.XXXX.', '..XX..', '.XXXX.', 'XX..XX'),
  y: r(2, 'XX..XX', 'XX..XX', 'XX..XX', '.XXXXX', '....XX', 'XXXXX.'),
  z: r(2, 'XXXXXX', '...XX.', '..XX..', '.XX...', 'XXXXXX'),
  '0': r(1, '.XXXX.', 'XX.XXX', 'XXXXXX', 'XXX.XX', 'XX..XX', '.XXXX.'),
  '1': r(1, '..XX..', '.XXX..', '..XX..', '..XX..', '..XX..', '.XXXX.'),
  '2': r(1, '.XXXX.', 'XX..XX', '....XX', '..XXX.', '.XX...', 'XXXXXX'),
  '3': r(1, '.XXXX.', 'XX..XX', '...XX.', '....XX', 'XX..XX', '.XXXX.'),
  '4': r(1, '..XXX.', '.XXXX.', 'XX.XX.', 'XXXXXX', '...XX.', '...XX.'),
  '5': r(1, 'XXXXXX', 'XX....', 'XXXXX.', '....XX', 'XX..XX', '.XXXX.'),
  '6': r(1, '.XXXX.', 'XX....', 'XXXXX.', 'XX..XX', 'XX..XX', '.XXXX.'),
  '7': r(1, 'XXXXXX', '....XX', '...XX.', '..XX..', '..XX..', '..XX..'),
  '8': r(1, '.XXXX.', 'XX..XX', '.XXXX.', 'XX..XX', 'XX..XX', '.XXXX.'),
  '9': r(1, '.XXXX.', 'XX..XX', 'XX..XX', '.XXXXX', '....XX', '.XXXX.'),
  '!': r(1, '..XX..', '..XX..', '..XX..', '..XX..', '......', '..XX..'),
  '¡': r(1, '..XX..', '......', '..XX..', '..XX..', '..XX..', '..XX..'),
  '?': r(1, '.XXXX.', 'XX..XX', '...XX.', '..XX..', '......', '..XX..'),
  '¿': r(1, '..XX..', '......', '..XX..', '.XX...', 'XX..XX', '.XXXX.'),
  '.': r(5, '..XX..', '..XX..'),
  ',': r(5, '..XX..', '..XX..', '.XX...'),
  ':': r(2, '..XX..', '..XX..', '......', '..XX..', '..XX..'),
  ';': r(2, '..XX..', '..XX..', '......', '..XX..', '..XX..', '.XX...'),
  "'": r(1, '..XX..', '..XX..', '.XX...'),
  '"': r(1, '.XX.XX', '.XX.XX', '.X..X.'),
  '-': r(4, '.XXXX.'),
  '+': r(2, '..XX..', '..XX..', 'XXXXXX', '..XX..', '..XX..'),
  '/': r(1, '....XX', '...XX.', '...XX.', '..XX..', '.XX...', 'XX....'),
  '(': r(1, '...XX.', '..XX..', '.XX...', '.XX...', '.XX...', '..XX..', '...XX.'),
  ')': r(1, '.XX...', '..XX..', '...XX.', '...XX.', '...XX.', '..XX..', '.XX...'),
  '%': r(1, 'XX..XX', 'XX.XX.', '...XX.', '..XX..', '.XX.XX', 'XX..XX'),
  '×': r(2, 'XX..XX', '.XXXX.', '.XXXX.', 'XX..XX'),
  '…': r(5, '.X.X.X', '.X.X.X'),
  '«': r(2, '..X..X', '.X..X.', 'X..X..', '.X..X.', '..X..X'),
  '»': r(2, 'X..X..', '.X..X.', '..X..X', '.X..X.', 'X..X..'),
  '▶': r(1, 'XX....', 'XXX...', 'XXXX..', 'XXXXX.', 'XXXX..', 'XXX...', 'XX....'),
  '▼': r(4, 'XXXXXX', '.XXXX.', '..XX..'),
  '★': r(1, '..XX..', 'XXXXXX', '.XXXX.', '.XXXX.', 'XX..XX', 'X....X'),
  ' ': r(0),
  Á: con(A, AGUDO_MAY),
  É: con(E, AGUDO_MAY),
  Í: con(I, AGUDO_MAY),
  Ó: con(O, AGUDO_MAY),
  Ú: con(U, AGUDO_MAY),
  Ü: con(U, DIERESIS),
  Ñ: con(N, TILDE),
  á: con(a, ...AGUDO_MIN),
  é: con(e, ...AGUDO_MIN),
  í: con(r(2, '.XXX..', '..XX..', '..XX..', '..XX..', '.XXXX.'), ...AGUDO_MIN),
  ó: con(o, ...AGUDO_MIN),
  ú: con(u, ...AGUDO_MIN),
  ü: con(u, DIERESIS),
  ñ: con(n, TILDE),
};

const JUEGO = Object.keys(GLIFOS).join('');
const INDICE = new Map<string, number>();
Array.from(JUEGO).forEach((c, k) => INDICE.set(c, k));
const SIN_GLIFO = INDICE.get('?') ?? 0;

// ---------------------------------------------------------------------------------------------
// Tiny 3×5 font in 4×6 cells (uppercase, digits and a few signs), for badges and labels.

const MINI: Record<string, string> = {
  A: '.X./X.X/XXX/X.X/X.X',
  B: 'XX./X.X/XX./X.X/XX.',
  C: '.XX/X../X../X../.XX',
  D: 'XX./X.X/X.X/X.X/XX.',
  E: 'XXX/X../XX./X../XXX',
  F: 'XXX/X../XX./X../X..',
  G: '.XX/X../X.X/X.X/.XX',
  H: 'X.X/X.X/XXX/X.X/X.X',
  I: 'XXX/.X./.X./.X./XXX',
  J: '..X/..X/..X/X.X/.X.',
  K: 'X.X/X.X/XX./X.X/X.X',
  L: 'X../X../X../X../XXX',
  M: 'X.X/XXX/XXX/X.X/X.X',
  N: 'XX./X.X/X.X/X.X/X.X',
  O: '.X./X.X/X.X/X.X/.X.',
  P: 'XX./X.X/XX./X../X..',
  Q: '.X./X.X/X.X/XX./.XX',
  R: 'XX./X.X/XX./X.X/X.X',
  S: '.XX/X../.X./..X/XX.',
  T: 'XXX/.X./.X./.X./.X.',
  U: 'X.X/X.X/X.X/X.X/XXX',
  V: 'X.X/X.X/X.X/X.X/.X.',
  W: 'X.X/X.X/XXX/XXX/X.X',
  X: 'X.X/X.X/.X./X.X/X.X',
  Y: 'X.X/X.X/.X./.X./.X.',
  Z: 'XXX/..X/.X./X../XXX',
  '0': 'XXX/X.X/X.X/X.X/XXX',
  '1': '.X./XX./.X./.X./XXX',
  '2': 'XX./..X/.X./X../XXX',
  '3': 'XX./..X/.X./..X/XX.',
  '4': 'X.X/X.X/XXX/..X/..X',
  '5': 'XXX/X../XX./..X/XX.',
  '6': '.XX/X../XXX/X.X/XXX',
  '7': 'XXX/..X/.X./.X./.X.',
  '8': 'XXX/X.X/XXX/X.X/XXX',
  '9': 'XXX/X.X/XXX/..X/XX.',
  '.': '.../.../.../.../.X.',
  ':': '.../.X./.../.X./...',
  '-': '.../.../XXX/.../...',
  '+': '.../.X./XXX/.X./...',
  '/': '..X/..X/.X./X../X..',
  '%': 'X.X/..X/.X./X../X.X',
  '!': '.X./.X./.X./.../.X.',
  '?': 'XX./..X/.X./.../.X.',
  ' ': '.../.../.../.../...',
};

// ---------------------------------------------------------------------------------------------
// Atlas baking.

function rgb(color: string): [number, number, number] {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const x = c.getContext('2d')!;
  x.fillStyle = color;
  x.fillRect(0, 0, 1, 1);
  const d = x.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

const atlasGrande = new Map<string, HTMLCanvasElement>();
const atlasMini = new Map<string, HTMLCanvasElement>();

function hornear(color: string, ancho: number, alto: number, total: number, pixel: (k: number, x: number, y: number) => boolean): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = ancho * total;
  cv.height = alto;
  const cx = cv.getContext('2d')!;
  const img = cx.createImageData(cv.width, cv.height);
  const [R, G, B] = rgb(color);
  for (let k = 0; k < total; k++) {
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        if (!pixel(k, x, y)) continue;
        const p = (y * cv.width + k * ancho + x) * 4;
        img.data[p] = R;
        img.data[p + 1] = G;
        img.data[p + 2] = B;
        img.data[p + 3] = 255;
      }
    }
  }
  cx.putImageData(img, 0, 0);
  return cv;
}

function atlas8(color: string): HTMLCanvasElement {
  let cv = atlasGrande.get(color);
  if (!cv) {
    const claves = Array.from(JUEGO);
    cv = hornear(color, 8, 8, claves.length, (k, x, y) => GLIFOS[claves[k]][y][x] === 'X');
    atlasGrande.set(color, cv);
  }
  return cv;
}

const CLAVES_MINI = Object.keys(MINI);
function atlas4(color: string): HTMLCanvasElement {
  let cv = atlasMini.get(color);
  if (!cv) {
    cv = hornear(color, 4, 6, CLAVES_MINI.length, (k, x, y) => MINI[CLAVES_MINI[k]].split('/')[y]?.[x] === 'X');
    atlasMini.set(color, cv);
  }
  return cv;
}

function blit(ctx: CanvasRenderingContext2D, at: HTMLCanvasElement, s: string, x: number, y: number, cw: number, ch: number, idx: (c: string) => number, escala: number): void {
  const suav = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  let cx = x;
  let cy = y;
  for (const c of s) {
    if (c === '\n') {
      cx = x;
      cy += ch * escala;
      continue;
    }
    const k = idx(c);
    if (k >= 0 && c !== ' ') ctx.drawImage(at, k * cw, 0, cw, ch, Math.round(cx), Math.round(cy), cw * escala, ch * escala);
    cx += cw * escala;
  }
  ctx.imageSmoothingEnabled = suav;
}

// ---------------------------------------------------------------------------------------------
// Public API.

/** Draws text with the 8×8 font; (x, y) is the top-left corner. `\n` starts a new line. */
export function dibujarTexto(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, opts: { escala?: number; sombra?: string } = {}): void {
  const escala = opts.escala ?? 1;
  const idx = (c: string): number => INDICE.get(c) ?? SIN_GLIFO;
  if (opts.sombra) blit(ctx, atlas8(opts.sombra), s, x + escala, y + escala, 8, 8, idx, escala);
  blit(ctx, atlas8(color), s, x, y, 8, 8, idx, escala);
}

/** Width in pixels of the longest line of `s`. */
export function anchoTexto(s: string, escala = 1): number {
  let max = 0;
  for (const l of s.split('\n')) max = Math.max(max, Array.from(l).length);
  return max * 8 * escala;
}

/** Word wrap by words into lines of at most `anchoPx` pixels (monospaced 8 px cells). */
export function envolver(s: string, anchoPx: number): string[] {
  const max = Math.max(1, Math.floor(anchoPx / 8));
  const lineas: string[] = [];
  for (const parrafo of s.split('\n')) {
    let actual = '';
    for (let palabra of parrafo.split(' ')) {
      while (Array.from(palabra).length > max) {
        const trozo = Array.from(palabra);
        if (actual) {
          lineas.push(actual);
          actual = '';
        }
        lineas.push(trozo.slice(0, max).join(''));
        palabra = trozo.slice(max).join('');
      }
      if (!actual) actual = palabra;
      else if (Array.from(actual).length + 1 + Array.from(palabra).length <= max) actual += ' ' + palabra;
      else {
        lineas.push(actual);
        actual = palabra;
      }
    }
    lineas.push(actual);
  }
  return lineas;
}

function miniClave(c: string): string {
  const u = c.toUpperCase();
  if (u === 'Ñ') return 'N';
  const base = u.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return base;
}

/** Tiny 3×5 font (4 px advance), uppercase only: lowercase and accents are folded. */
export function dibujarMini(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, escala = 1): void {
  const idx = (c: string): number => {
    const k = CLAVES_MINI.indexOf(miniClave(c));
    return k < 0 ? CLAVES_MINI.indexOf('?') : k;
  };
  blit(ctx, atlas4(color), s, x, y, 4, 6, idx, escala);
}

/** Width in pixels of `s` in the tiny font (the last column is blank, so it counts 1 px less). */
export function anchoMini(s: string, escala = 1): number {
  const n = Array.from(s).length;
  return n === 0 ? 0 : (n * 4 - 1) * escala;
}
