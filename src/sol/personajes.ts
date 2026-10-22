// The three characters of the slice as chibi 16×24 sprites (big head, small body, the proportions of
// the original's): Pablo, his mother and the villager. Each frame is built once from char maps and
// painted into a cached canvas; the game only drawImage()s them (docs/ESTILO.md, T5).
//
// Eight directions: south, north and east are drawn; the three-quarter views reuse them with the
// features shifted, and the west ones are mirrors. Walk cycle: idle, left foot, idle, right foot.
// Outlines are made automatically, always a dark tone of the colour they surround (never black).
import { ctx, lienzo, mezcla, noche, reflejar, una, type Pal } from './pixel';

export type Quien = 'pablo' | 'madre' | 'aldeano' | 'chuchi' | 'fran' | 'guille';
/** The four friends, the party of the fights. */
export type Amigo = 'pablo' | 'chuchi' | 'fran' | 'guille';
export type Dir = 'S' | 'SE' | 'E' | 'NE' | 'N' | 'NW' | 'W' | 'SW';
export type Pose = 'normal' | 'poder' | 'sentado' | 'dormido';

export const ANCHO = 16;
export const ALTO = 24;
/** The feet's centre inside a frame (where the character "is"). */
export const PIES = { x: 8, y: 22 } as const;

/** Directions in the order the mapping of the D-pad uses them. */
export const DIRS: Dir[] = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

// ---------------------------------------------------------------- the moulds

interface Molde {
  pal: Pal;
  /** Hair, as masks of 12 columns placed at x = 2, rows from `y`. Letters: h hair, H shade, l light, t/T hat, r hat band. */
  pelo?: { S: string[]; E: string[]; N: string[]; y: number; x?: number };
  /**
   * A whole head drawn by hand for each view (hair, face, ears, beard together), 12 columns at x = 2,
   * rows from y = 1. Facing right; the west views are mirrors. When a mould has it, `pelo` and `barba`
   * are not used: the same head turns from front to back through the three-quarter views. The
   * letters are the palette's; `e` are the eyes and `x` the earring (gold).
   */
  cabeza?: Record<'S' | 'SE' | 'E' | 'NE' | 'N', string[]>;
  /** Beard or moustache over the face (10 columns at x = 3 for the front, 11 for the profile). */
  barba?: { S: string[]; E: string[]; y: number };
  /** The torso as maps: front, back and profile (rows from y = 11). */
  torso: { S: string[]; N: string[]; E: string[] };
  /** A skirt hides the legs: rows from y = 17 (front/back, 12 columns at x = 2) and profile. */
  falda?: { S: string[]; E: string[] };
  /** The arm's colour letter and how many rows of sleeve (the rest of the arm is the hand). */
  manga: number;
  /** Rosy cheeks. */
  blush?: string;
  /** A back-of-the-head detail (apron bow...), as pixels [x, y, letter] for the back view. */
  espalda?: Array<[number, number, string]>;
}

// Faces (skin) are shared; skin tones come from the palette.
// Front: 10 columns at x = 3, rows 3–10 (rows 1–2 belong to the hair).
const CARA_S = [
  '..ssssss..', // 3
  '.ssssssss.', // 4
  'ssssssssss', // 5
  'ssessssess', // 6
  'ssessssess', // 7
  'ssssssssss', // 8
  '.sssmmsss.', // 9
  '..ssssss..', // 10
];
// Profile (facing right): 11 columns at x = 3, rows 3–10. The nose sticks out at the right.
const CARA_E = [
  '...ssssss..', // 3
  '..ssssssss.', // 4
  '.sssssssss.', // 5
  '.sssssssess', // 6
  '.ssssssssss', // 7
  '.sssssssss.', // 8
  '.ssssssmss.', // 9
  '..ssssssss.', // 10
];

const PABLO: Molde = {
  pal: {
    s: '#f2b88c', S: '#d9936b', e: '#2a1a22', m: '#b5504a',
    h: '#8a5430', H: '#60381f', l: '#b57a48', b: '#4e2e1c', B: '#3a2014',
    c: '#454c6a', C: '#2f3550', d: '#e9e4d2', D: '#c4bfae',
    p: '#4268ae', P: '#2f4d8a', o: '#f4f4f6', O: '#a9a9bd', x: '#f7c948',
  },
  cabeza: {
    //   x = 2 ......... 13
    S: [
      '..h..hh.h...', // 1
      '.hhhhhhhhhh.', // 2
      'hhhlhhhhhhhh', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhsssshhh', // 5
      'hhsesssseshh', // 6
      'hhsesssseshh', // 7
      '.xsssSSsssb.', // 8
      '..bbbmmbbb..', // 9
      '...BBBBBB...', // 10
    ],
    SE: [
      '..h.hh.h....', // 1
      '.hhhhhhhhhh.', // 2
      'hhlhhhhhhhh.', // 3
      'hhhhhhhhhhh.', // 4
      'hhhhhhsssss.', // 5
      'hhhhsessses.', // 6
      'hsShsessses.', // 7
      '.sSbsssssSss', // 8
      '.x.bbbbmmbb.', // 9
      '....BBBBBB..', // 10
    ],
    E: [
      '...hh.hh....', // 1
      '.hhhhhhhhh..', // 2
      'hhhlhhhhhhh.', // 3
      'hhhhhhhhhhh.', // 4
      'hhhhhhhhsss.', // 5
      'hhhhhhhsess.', // 6
      'hhhhhsSsess.', // 7
      '.hhhhsSbssss', // 8
      '..hhhxbbbbm.', // 9
      '...hhBBBBB..', // 10
    ],
    NE: [
      '...h.h.h....', // 1
      '..hhhhhhhh..', // 2
      '.hhlhhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhhhhhhhh', // 5
      'hhhhhhhhhhhs', // 6
      'hhhhhhhhsSss', // 7
      '.hhhhhhhsSss', // 8
      '..hhhhhhxbb.', // 9
      '...hhssss...', // 10
    ],
    N: [
      '...h..h.h...', // 1
      '..hhhhhhhh..', // 2
      '.hhhlhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhhhhhhhh', // 5
      'hhhhhhhhhhhh', // 6
      'shhhhhhhhhhs', // 7
      'shhhhhhhhhhs', // 8
      '.hhhhhhhhhhx', // 9
      '...ssssss...', // 10
    ],
  },
  torso: {
    S: ['cccccc', 'cddddc', 'cddddc', 'cddddc', 'cCddCc', 'CCCCCC'],
    N: ['cccccc', 'cccccc', 'cccccc', 'cccccc', 'cCCCCc', 'CCCCCC'],
    E: ['ccccc', 'cdddc', 'cdddc', 'cdddc', 'cCddC', 'CCCCC'],
  },
  manga: 3,
};

const MADRE: Molde = {
  pal: {
    s: '#f4c39c', S: '#dba47e', e: '#2a1a22', m: '#c25a58',
    h: '#8e4d2f', H: '#66331f', l: '#b8693d',
    c: '#cc5565', C: '#9b3b4d', d: '#f6edd4', D: '#d9cba8', a: '#e6b84a',
    p: '#cc5565', P: '#9b3b4d', o: '#6a4232', O: '#4a2c20',
  },
  pelo: {
    y: 1,
    S: [
      '....hhhh....', // 1  bun
      '...hhhhhh...', // 2
      '..hhhhhhhh..', // 3
      '.hhhlhhhhhh.', // 4
      'hhhhh..hhhhh', // 5  parted fringe
      'hh........hh', // 6
    ],
    E: [
      '...hhhh.....', // 1
      '..hhhhhh....', // 2
      '.hhhhhhhh...', // 3
      'hhhhhhhhhh..', // 4
      'hhhhhhhhhh..', // 5
      'hhhhhh......', // 6
      'hhhh........', // 7
      'hhh.........', // 8
    ],
    N: [
      '....hhhh....', // 1
      '...hhhhhh...', // 2
      '..hhhhhhhh..', // 3
      '.hhhlhhhhhh.', // 4
      'hhhhhhhhhhhh', // 5
      'hhhhhhhhhhhh', // 6
      'hhhhhhhhhhhh', // 7
      '.hhhhhhhhhh.', // 8
      '..hhhhhhhh..', // 9
    ],
  },
  torso: {
    S: ['cccccc', 'cddddc', 'cddddc', 'cdDDdc', 'cddddc', 'cddddc'],
    N: ['cccccc', 'cccaac', 'cccccc', 'cccccc', 'cccccc', 'cCCCCc'],
    E: ['ccccc', 'cdddc', 'cdddc', 'cdDdc', 'cdddc', 'cdddc'],
  },
  falda: {
    S: ['..cccccccc..', '.cddddddddc.', '.cddddddddc.', '.CCCCCCCCCC.'],
    E: ['..cccccccc.', '.cdddddddc.', '.cdddddddc.', '.CCCCCCCCC.'],
  },
  manga: 3,
  blush: '#e98c86',
};

const ALDEANO: Molde = {
  pal: {
    s: '#dc9d6c', S: '#b97b4e', e: '#2a1a22', m: '#a8504a',
    h: '#f2f2f2', H: '#c8c8d2', b: '#f4f4f6', B: '#cfcfd8',
    t: '#ecc96c', T: '#bd9540', r: '#c64b3a',
    c: '#b5472f', C: '#8a3224', d: '#f0e6d2', D: '#cfc2a8',
    p: '#6f6648', P: '#544d36', o: '#46322a', O: '#2e201b',
  },
  pelo: {
    y: 1,
    x: 1,
    S: [
      '.....tttt.....', // 1  straw hat
      '...tttttttt...', // 2
      '..tttttttttt..', // 3
      '..tttrrrrttt..', // 4  hat band
      'ttttttttttttTT', // 5  brim
      'TT..........TT', // 6  brim shade, only at the sides
    ],
    E: [
      '....tttttt....', // 1
      '..tttttttttt..', // 2
      '..tttttttttt..', // 3
      '.ttrrrrrrttt..', // 4
      'ttttttttttttT.', // 5
      'TT.........TTT', // 6
      '...hhh........', // 7 white hair at the nape
      '...hh.........', // 8
    ],
    N: [
      '.....tttt.....', // 1
      '...tttttttt...', // 2
      '..tttttttttt..', // 3
      '..tttrrrrttt..', // 4
      'ttttttttttttTT', // 5
      'TTTTTTTTTTTTTT', // 6
      '..hhhhhhhhhh..', // 7
      '..hhhhhhhhhh..', // 8
      '...hhhhhhhh...', // 9
    ],
  },
  barba: {
    y: 8,
    S: [
      '...bbbbbb.', // 8  big white moustache
      '..bb....bb', // 9
    ],
    E: [
      '....bbbbbbb', // 8
      '.....bbb...', // 9
    ],
  },
  torso: {
    S: ['dcddcd', 'ccddcc', 'ccddcc', 'ccddcc', 'cCddCc', 'CCCCCC'],
    N: ['cccccc', 'cccccc', 'cccccc', 'cccccc', 'cCCCCc', 'CCCCCC'],
    E: ['ccccc', 'cdddc', 'cdddc', 'cdddc', 'cCddC', 'CCCCC'],
  },
  manga: 3,
};

// Placeholders until the three friends are drawn: they wear the villager's mould.
const MOLDES: Record<Quien, Molde> = { pablo: PABLO, madre: MADRE, aldeano: ALDEANO, chuchi: ALDEANO, fran: ALDEANO, guille: ALDEANO };

// ---------------------------------------------------------------- painting into a grid

type Rejilla = Array<string | null>;
const poner = (g: Rejilla, x: number, y: number, col: string | undefined) => {
  if (!col || x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return;
  g[y * ANCHO + x] = col;
};

/** Paints a map (letters through the palette) with its top-left at (x0, y0). */
function mapa(g: Rejilla, filas: readonly string[], x0: number, y0: number, pal: Pal, quitar?: (ch: string) => boolean) {
  filas.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) {
      const ch = fila[i];
      if (ch === '.' || (quitar && quitar(ch))) continue;
      poner(g, x0 + i, y0 + j, pal[ch]);
    }
  });
}

/** Shades the bottom edge of a hair mask a tone darker (done on the colour grid after painting). */
function sombrearPelo(g: Rejilla, filas: readonly string[], x0: number, y0: number, pal: Pal) {
  if (!pal.H) return;
  filas.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) {
      if (fila[i] !== 'h') continue;
      const abajo = filas[j + 1]?.[i];
      if (!abajo || abajo === '.') poner(g, x0 + i, y0 + j, pal.H);
    }
  });
}

// ---------------------------------------------------------------- one frame

type Vista = 'S' | 'E' | 'N';

/** What a direction needs: the view drawn, whether it is mirrored and the 3/4 shift. */
function vistaDe(d: Dir): { v: Vista; espejo: boolean; tres: boolean } {
  switch (d) {
    case 'S': return { v: 'S', espejo: false, tres: false };
    case 'SE': return { v: 'S', espejo: false, tres: true };
    case 'E': return { v: 'E', espejo: false, tres: false };
    case 'NE': return { v: 'N', espejo: false, tres: true };
    case 'N': return { v: 'N', espejo: false, tres: false };
    case 'NW': return { v: 'N', espejo: true, tres: true };
    case 'W': return { v: 'E', espejo: true, tres: false };
    case 'SW': return { v: 'S', espejo: true, tres: true };
  }
}

function pintarFrame(q: Quien, d: Dir, paso: number, pose: Pose): HTMLCanvasElement {
  const M = MOLDES[q];
  const { v, espejo, tres } = vistaDe(d);
  const g: Rejilla = new Array(ANCHO * ALTO).fill(null);
  const pal = M.pal;
  // Contact frames drop the body a pixel; idle and the other poses stand tall.
  const dy = paso > 0 && pose === 'normal' ? 1 : 0;

  if (pose === 'dormido') {
    // Just the head, facing us with its eyes shut (the bed's pillow).
    cabeza(g, M, 'S', false, 0, pose);
  } else {
    if (pose !== 'sentado') piernas(g, M, v, paso, pose);
    torsoYBrazos(g, M, v, paso, dy, pose);
    if (M.falda && pose !== 'sentado') mapa(g, M.falda[v === 'E' ? 'E' : 'S'], 2, 17, pal);
    cabeza(g, M, v, tres, dy, pose);
  }

  // The outline: a dark tone of the colour it surrounds.
  const out = new Array<string | null>(ANCHO * ALTO).fill(null);
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) {
      if (g[y * ANCHO + x]) continue;
      for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || nx >= ANCHO || ny < 0 || ny >= ALTO) continue;
        const c = g[ny * ANCHO + nx];
        if (c) {
          out[y * ANCHO + x] = mezcla(c, '#1c1226', 0.62);
          break;
        }
      }
    }
  }
  const c = lienzo(ANCHO, ALTO);
  const x = ctx(c);
  for (let y = 0; y < ALTO; y++) {
    for (let i = 0; i < ANCHO; i++) {
      const col = g[y * ANCHO + i] ?? out[y * ANCHO + i];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, y, 1, 1);
    }
  }
  noche(c, [0.84, 0.88, 1]);
  return espejo ? reflejar(c) : c;
}

const cuadro = (g: Rejilla, x: number, y: number, w: number, h: number, col: string) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) poner(g, x + i, y + j, col);
};

function piernas(g: Rejilla, M: Molde, v: Vista, paso: number, pose: Pose) {
  const { pal } = M;
  const quieto = paso === 0 || pose !== 'normal';
  if (v === 'E') {
    // Profile: standing = the legs together; contact = a stride (the front foot lifts a pixel).
    const pierna = (x: number, alza: number, col: string) => {
      cuadro(g, x, 17, 3, 4 - alza, col);
      cuadro(g, x, 21 - alza, 4, 2, pal.o);
      cuadro(g, x, 22 - alza, 4, 1, pal.O);
    };
    if (quieto) pierna(7, 0, pal.p);
    else {
      const s = paso === 1 ? 1 : -1;
      pierna(7 - s * 2, 0, pal.P);
      pierna(7 + s * 2, 1, pal.p);
    }
    return;
  }
  // Front and back: two legs, 3 wide; in a step the one that moves is lifted a pixel.
  const pierna = (x: number, alza: number, col: string) => {
    cuadro(g, x, 17, 3, 4 - alza, col);
    cuadro(g, x, 21 - alza, 3, 2, pal.o);
    cuadro(g, x, 22 - alza, 3, 1, pal.O);
  };
  pierna(5, quieto ? 0 : paso === 1 ? 1 : 0, pal.p);
  pierna(8, quieto ? 0 : paso === 2 ? 1 : 0, pal.P);
}

function torsoYBrazos(g: Rejilla, M: Molde, v: Vista, paso: number, dy: number, pose: Pose) {
  const { pal } = M;
  const x0 = v === 'E' ? 6 : 5;
  const y0 = 11 + dy;
  mapa(g, M.torso[v], x0, y0, pal);
  const manga = pal.c;
  const mano = pal.s;
  const largo = M.manga;
  const poder = pose === 'poder';
  const sent = pose === 'sentado';

  if (v === 'E') {
    if (poder) {
      // The near arm forward and up, the hand open.
      poner(g, 9, y0 + 1, manga);
      poner(g, 10, y0, manga);
      poner(g, 11, y0 - 1, manga);
      poner(g, 12, y0 - 2, mano);
      poner(g, 12, y0 - 3, mano);
      poner(g, 13, y0 - 3, mano);
      poner(g, 13, y0 - 4, mano);
      return;
    }
    // The near arm swings with the stride.
    const sw = paso === 1 ? 1 : paso === 2 ? -1 : 0;
    for (let j = 0; j < largo; j++) poner(g, 8 + sw, y0 + 1 + j, manga);
    poner(g, 8 + sw, y0 + 1 + largo, mano);
    return;
  }

  const brazo = (x: number, al: number) => {
    for (let j = 0; j < largo; j++) poner(g, x, y0 + 1 + j + al, manga);
    poner(g, x, y0 + 1 + largo + al, mano);
  };
  const sw = sent || poder ? 0 : paso === 1 ? 1 : paso === 2 ? -1 : 0;
  brazo(4, sent ? -1 : sw);
  if (poder) {
    // The arm on the screen's right raised beside the head, the hand open.
    poner(g, 11, y0 + 1, manga);
    poner(g, 12, y0, manga);
    poner(g, 13, y0 - 1, manga);
    poner(g, 13, y0 - 2, mano);
    poner(g, 13, y0 - 3, mano);
    poner(g, 14, y0 - 3, mano);
    poner(g, 14, y0 - 4, mano);
    return;
  }
  brazo(11, sent ? -1 : -sw);
}

/** A hand-drawn head (`Molde.cabeza`); asleep, the eyes are shut: the upper pixel of each goes skin. */
function cabezaEntera(g: Rejilla, M: Molde, v: Vista, tres: boolean, dy: number, pose: Pose) {
  const { pal } = M;
  const vista = v === 'E' ? 'E' : tres ? (v === 'S' ? 'SE' : 'NE') : v;
  const filas = M.cabeza![vista];
  const dormido = pose === 'dormido';
  mapa(g, filas, 2, 1 + dy, pal, (ch) => dormido && ch === 'e');
  if (dormido) {
    filas.forEach((fila, j) => {
      for (let i = 0; i < fila.length; i++) {
        if (fila[i] !== 'e') continue;
        const arriba = filas[j - 1]?.[i] === 'e';
        poner(g, 2 + i, 1 + j + dy, arriba ? pal.s : pal.e);
        // A shut eye is a dash: the pixel next to it, towards the nose, is dark too.
        if (!arriba) poner(g, 2 + i + (i < 6 ? 1 : -1), 1 + j + dy, pal.e);
      }
    });
  }
}

function cabeza(g: Rejilla, M: Molde, v: Vista, tres: boolean, dy: number, pose: Pose) {
  if (M.cabeza) return cabezaEntera(g, M, v, tres, dy, pose);
  const { pal } = M;
  const y = dy;
  const pelo = M.pelo!;
  const px = pelo.x ?? 2;
  if (v === 'S') {
    // The base face; in the three-quarter view the features slide towards the facing side.
    mapa(g, CARA_S, 3, 3 + y, pal, (ch) => tres && (ch === 'e' || ch === 'm'));
    if (tres) {
      for (const ex of [4, 8]) {
        poner(g, 3 + ex, 6 + y, pal.e);
        poner(g, 3 + ex, 7 + y, pal.e);
      }
      poner(g, 9, 9 + y, pal.m);
      poner(g, 10, 9 + y, pal.m);
    }
    if (pose === 'dormido') {
      // Closed eyes: a short dash each, and a hint of a smile.
      for (const ex of [5, 6, 9, 10]) {
        poner(g, ex, 6 + y, pal.s);
        poner(g, ex, 7 + y, pal.e);
      }
      poner(g, 5, 7 + y, pal.e);
      poner(g, 10, 7 + y, pal.e);
    }
    for (let i = 2; i < 8; i++) poner(g, 3 + i, 10 + y, pal.S);
    if (M.blush) for (const bx of tres ? [4, 11] : [4, 11]) poner(g, bx, 8 + y, M.blush);
    if (M.barba) mapa(g, M.barba.S.map((r) => (tres ? `.${r.slice(0, -1)}` : r)), 3, M.barba.y + y, pal);
    mapa(g, pelo.S, px, pelo.y + y, pal);
    sombrearPelo(g, pelo.S, px, pelo.y + y, pal);
  } else if (v === 'E') {
    mapa(g, CARA_E, 3, 3 + y, pal);
    for (let i = 2; i < 9; i++) poner(g, 3 + i, 10 + y, pal.S);
    if (M.blush) poner(g, 10, 8 + y, M.blush);
    if (M.barba) mapa(g, M.barba.E, 3, M.barba.y + y, pal);
    mapa(g, pelo.E, px, pelo.y + y, pal);
    sombrearPelo(g, pelo.E, px, pelo.y + y, pal);
  } else {
    // From behind: the neck, then all hair.
    mapa(g, ['..ssssss..'], 3, 10 + y, pal);
    mapa(g, pelo.N, px, pelo.y + y, pal);
    sombrearPelo(g, pelo.N, px, pelo.y + y, pal);
    if (tres) {
      for (let j = 6; j <= 9; j++) poner(g, 12, j + y, pal.s);
    }
    if (M.espalda) for (const [ex, ey, ch] of M.espalda) poner(g, ex, ey + y, pal[ch]);
  }
}

// ---------------------------------------------------------------- public

/** One cached frame. `paso`: 0 idle, 1 left foot, 2 right foot. */
export function marco(q: Quien, d: Dir, paso: number, pose: Pose = 'normal'): HTMLCanvasElement {
  return una(`pj.${q}.${d}.${paso}.${pose}`, () => pintarFrame(q, d, paso, pose));
}

/** Cycle of the walk: idle, left, idle, right. */
export const CICLO = [0, 1, 0, 2] as const;

/** A soft contact shadow under the feet, 12×5 (night). */
export const sombraPies = () =>
  una('pj.sombra', () => {
    const c = lienzo(14, 6);
    const x = ctx(c);
    x.fillStyle = 'rgba(8,10,30,0.34)';
    x.fillRect(2, 0, 10, 6);
    x.fillStyle = 'rgba(8,10,30,0.34)';
    x.fillRect(0, 1, 14, 4);
    x.clearRect(0, 0, 2, 1);
    x.clearRect(12, 0, 2, 1);
    x.clearRect(0, 5, 2, 1);
    x.clearRect(12, 5, 2, 1);
    return c;
  });

/** The direction closest to a movement vector (screen: y grows down). */
export function dirDe(dx: number, dy: number, antes: Dir = 'S'): Dir {
  if (!dx && !dy) return antes;
  const a = Math.atan2(dy, dx); // 0 = east, +90° = south
  const i = Math.round(a / (Math.PI / 4));
  return (['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'] as const)[((i % 8) + 8) % 8];
}

/** The unit vector of a direction. */
export function vectorDe(d: Dir): [number, number] {
  const v: Record<Dir, [number, number]> = {
    E: [1, 0], SE: [1, 1], S: [0, 1], SW: [-1, 1], W: [-1, 0], NW: [-1, -1], N: [0, -1], NE: [1, -1],
  };
  return v[d];
}
