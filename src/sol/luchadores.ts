// The four friends in the fights, seen from behind and a little to the side, looking up and to the right at the
// enemies, like the original's party at the bottom of the battle screen. 32×40 each, feet at (16, 38).
//
// Each friend is a few hand-drawn maps (the back of the head, the torso, the weapon) plus a little skeleton: the
// arms are thick lines between a shoulder, an elbow and a hand, the legs are two columns, the upper body leans
// and bobs. A pose is just a list of numbers for that skeleton. Everything is painted once into a cached canvas
// (`una`), outlined in a dark tone of each colour (never black) like the walking sprites, and the game only
// drawImage()s it (docs/ESTILO.md, T5).
//
// The weapons are comic and come from each one's character:
//   Pablo  (earth)  the script, rolled up and tied with a red ribbon
//   Chuchi (fire)   a keyboard with its cable hanging, a red Enter
//   Guille (wind)   a rubber chicken, held by the feet
//   Fran   (water)  a glass of beer, foam and all
import { ctx, lienzo, mezcla, una, type Pal } from './pixel';
import { paletaDe, type Amigo } from './personajes';

export type PoseCombate = 'quieto' | 'ataque' | 'poder' | 'herido' | 'caido' | 'victoria';

export const LUCHADOR_W = 32;
export const LUCHADOR_H = 40;
/** Where the feet are inside the frame (the fight places each friend by this point). */
export const LUCHADOR_PIES = { x: 16, y: 38 } as const;

/** How many frames each pose has (`frame` goes from 0 to this minus one). */
export const FRAMES: Record<PoseCombate, number> = { quieto: 2, ataque: 3, poder: 2, herido: 1, caido: 1, victoria: 2 };

/** The colour of each one's element: the glow of the powers (Pablo earth, Chuchi fire, Guille wind, Fran water). */
export const ELEMENTO: Record<Amigo, string> = { pablo: '#e0a43a', chuchi: '#ff6a2a', guille: '#b48cff', fran: '#4ab4ff' };

const W = LUCHADOR_W;
const H = LUCHADOR_H;

// ---------------------------------------------------------------- a grid of colours to paint on

type G = Array<string | null>;
const vacio = (): G => new Array<string | null>(W * H).fill(null);

function px(g: G, x: number, y: number, col: string | undefined) {
  x = Math.round(x);
  y = Math.round(y);
  if (!col || x < 0 || y < 0 || x >= W || y >= H) return;
  g[y * W + x] = col;
}
const cuadro = (g: G, x: number, y: number, w: number, h: number, col: string | undefined) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, col);
};

/** A thick line (a square brush `grosor` wide) from one point to another. */
function linea(g: G, x0: number, y0: number, x1: number, y1: number, col: string, grosor = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const o = Math.floor(grosor / 2);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    cuadro(g, x - o, y - o, grosor, grosor, col);
  }
}

/** Paints a char map (letters through the palette) with its top-left at (x0, y0). */
function mapa(g: G, filas: readonly string[], x0: number, y0: number, pal: Pal) {
  filas.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) {
      const ch = fila[i];
      if (ch !== '.') px(g, x0 + i, y0 + j, pal[ch]);
    }
  });
}

// ---------------------------------------------------------------- the weapons

interface Arma {
  filas: string[];
  pal: Pal;
  /** Where the hand holds it (map coordinates) and the spot that hits. */
  pivote: [number, number];
  punta: [number, number];
}

const ARMAS: Record<Amigo, Arma> = {
  // The script of the play, rolled up and tied with a red ribbon.
  pablo: {
    pal: { p: '#f2e6c8', P: '#cdbd98', q: '#a89a74', r: '#d24a3a', k: '#7a6a48' },
    filas: [
      '.qqq.', // 0
      'qpkpq', // 1
      'qkppq', // 2
      'pppPq', // 3
      'rrrrr', // 4
      'pppPP', // 5
      'pkpPP', // 6
      'pppPP', // 7
      'pkkPP', // 8
      'pppPP', // 9
      'rrrrr', // 10
      'pppPP', // 11
      'pppPP', // 12
      'PppPP', // 13
      '.PPP.', // 14
    ],
    pivote: [2, 12],
    punta: [2, 2],
  },
  // A keyboard, its cable hanging from the bottom, a red Enter.
  chuchi: {
    pal: { t: '#7a8098', g: '#3a3f4e', G: '#2a2e3a', k: '#d4d9e6', K: '#9aa2b8', r: '#ff5040', c: '#8a90a8' },
    filas: [
      'ttttttt', // 0
      'gkkgkkg', // 1
      'gggggGg', // 2
      'gkkgkkg', // 3
      'gggggGg', // 4
      'gkkgkrg', // 5
      'gggggGg', // 6
      'gkkkkkg', // 7
      'gggggGg', // 8
      'GGGGGGG', // 9
      'GGGGGGG', // 10
      '...c...', // 11
      '...c...', // 12
      '..cc...', // 13
      '..c....', // 14
    ],
    pivote: [3, 10],
    punta: [3, 2],
  },
  // A rubber chicken, held by the feet, the beak open in a scream.
  guille: {
    pal: { y: '#f4d03a', Y: '#d8a81c', r: '#d83a2a', o: '#f08a2a', O: '#b8601a', e: '#ffffff', k: '#1a1020' },
    filas: [
      '...rr....', // 0
      '..rrrr...', // 1
      '..yyyyoo.', // 2
      '..yeyyooO', // 3
      '..yyyyoo.', // 4
      '...yyy...', // 5
      '...yYy...', // 6
      '..yyyyy..', // 7
      '.yyyyyyy.', // 8
      '.yyyyyYy.', // 9
      '.yyyyyYY.', // 10
      '..yYYYY..', // 11
      '...ooo...', // 12
      '...o.o...', // 13
      '..oo.oo..', // 14
    ],
    pivote: [4, 12],
    punta: [4, 8],
  },
  // A glass of beer held by the middle, foam over the brim and a handle on the outer side.
  fran: {
    pal: { f: '#fffaf0', F: '#d8d0c0', v: '#dfeaf2', e: '#f2b830', E: '#c88418', h: '#c4d4e2' },
    filas: [
      '..ff.ff....', // 0
      '.fffffff...', // 1
      'fffFfffFf..', // 2
      'fFffffffF..', // 3
      '.vvvvvvv...', // 4
      '.veeeeeEv..', // 5
      '.veeeeeEvhh', // 6
      '.veeeeeEv.h', // 7
      '.veeeeeEv.h', // 8
      '.veeeeEEvhh', // 9
      '.vEEEEEEv..', // 10
      '.vvvvvvvv..', // 11
    ],
    pivote: [4, 7],
    punta: [4, 3],
  },
};

/** Paints a weapon turned `ang` degrees clockwise (0 = as drawn, tip up) with its grip at (hx, hy). Returns where the tip ends. */
function arma(g: G, q: Amigo, hx: number, hy: number, ang: number): [number, number] {
  const A = ARMAS[q];
  const r = (ang * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const [px0, py0] = A.pivote;
  const R = Math.ceil(Math.hypot(A.filas[0].length, A.filas.length)) + 1;
  for (let y = Math.floor(hy) - R; y <= Math.ceil(hy) + R; y++) {
    for (let x = Math.floor(hx) - R; x <= Math.ceil(hx) + R; x++) {
      // four samples inside the pixel; the commonest letter wins, so a turned edge stays clean
      const votos = new Map<string, number>();
      let pintados = 0;
      for (const [ox, oy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
        const dx = x + ox - hx;
        const dy = y + oy - hy;
        const sx = Math.floor(px0 + 0.5 + cos * dx + sin * dy);
        const sy = Math.floor(py0 + 0.5 - sin * dx + cos * dy);
        const ch = A.filas[sy]?.[sx];
        if (ch && ch !== '.') {
          pintados++;
          votos.set(ch, (votos.get(ch) ?? 0) + 1);
        }
      }
      if (pintados < 2) continue;
      let mejor = '';
      let n = 0;
      for (const [ch, v] of votos) if (v > n) { mejor = ch; n = v; }
      px(g, x, y, A.pal[mejor]);
    }
  }
  const ux = A.punta[0] - px0;
  const uy = A.punta[1] - py0;
  return [hx + cos * ux - sin * uy, hy + sin * ux + cos * uy];
}

// ---------------------------------------------------------------- the four friends

interface Ficha {
  /** The back of the head, three-quarters turned to the right: 14×13, rows from y = 5 at x = 10. */
  cabeza: string[];
  /** The torso seen from behind: rows from y = 17, left column at `torsoX`. */
  torso: string[];
  torsoX: number;
  /** Where the arms hang from (the shoulders). */
  hombroD: [number, number];
  hombroI: [number, number];
  /** Long sleeves down to the wrist; if not, the forearm is bare. */
  mangaLarga: boolean;
  /** Letter of the cuff, painted where the sleeve ends. */
  puno?: string;
  pierna: { x: [number, number]; w: number; pantalon?: number; calcetin?: string };
}

const FICHAS: Record<Amigo, Ficha> = {
  pablo: {
    cabeza: [
      '...h.hh..h....', // 0
      '..hhhhhhhhhh..', // 1
      '.hhlhhhhhhhhh.', // 2
      'hhhhlhhhhhhhhh', // 3
      'hhhhhhhhhhhhhh', // 4
      'hhhhhhhhhhhhhs', // 5
      'hhhhhhhhhhhhss', // 6
      'hhhhhhhhhhhsSs', // 7
      'hhhhhhhhhhhsxs', // 8
      '.hhhhhhhhhhbbs', // 9
      '.hhhhhhhhhbbb.', // 10
      '..HHHHHHHHbB..', // 11
      '....HHHHssb...', // 12
    ],
    torso: [
      '.ccDDDDDDDDcc.', // 0
      'ccccDDDDDDcccC', // 1
      'ccccccccccccCC', // 2
      'cccccCcccccccC', // 3
      'ccccccCcccccCC', // 4
      'ccccccCcccccCC', // 5
      'ccccccccccccCC', // 6
      'ccccccccccccCC', // 7
      '.cccccccccccC.', // 8
      '.CCCCCCCCCCCC.', // 9
      '..CCCCCCCCCC..', // 10
    ],
    torsoX: 9,
    hombroD: [21, 19],
    hombroI: [10, 19],
    mangaLarga: true,
    pierna: { x: [11, 17], w: 5 },
  },
  chuchi: {
    cabeza: [
      '....sslsss....', // 0
      '..sslssssssS..', // 1
      '.ssllsssssssSS', // 2
      '.ssssssssssssS', // 3
      'sssssssssssssS', // 4
      'ssssssssssSSss', // 5
      'ssssssssssSSgg', // 6
      'ssssssssssSSss', // 7
      '.sssssssssSsbb', // 8
      '..sssssssssbbb', // 9
      '...sssssssbbbB', // 10
      '....ssssssbbB.', // 11
      '.....ssssBBB..', // 12
    ],
    torso: [
      '..cccccccc..', // 0
      '.cdddddddcC.', // 1
      'cddddddddddC', // 2
      'cddddddddddC', // 3
      'cddddcdddddC', // 4
      'cdddddcddddC', // 5
      'cddddddddddC', // 6
      'cddddddddddC', // 7
      '.cddddddddC.', // 8
      '.CCCCCCCCCC.', // 9
    ],
    torsoX: 10,
    hombroD: [20, 19],
    hombroI: [11, 19],
    mangaLarga: true,
    puno: 'C',
    pierna: { x: [11, 16], w: 4 },
  },
  fran: {
    cabeza: [
      '....hhhhhh....', // 0
      '..hhhhwhhhhh..', // 1
      '.hhhlhhhhhhhh.', // 2
      'hhhhhhhhhhhhhh', // 3
      'hhhhhhhhhhhhhh', // 4
      'hhhhhhhhhhhhhs', // 5
      'hhhhhhhhhhhhss', // 6
      'hhhhhhhhhhhssb', // 7
      '.hhhhhhhhhhbbb', // 8
      '..hhhhhhhhbbbb', // 9
      '..hhhhhhhbbbbb', // 10
      '...hhhhhhbbBB.', // 11
      '....hhhhbbBB..', // 12
    ],
    torso: [
      '..cccccccccccc..', // 0
      '.ddcccccccccccC.', // 1
      'cddccccccccccccC', // 2
      'cccccccccccccccC', // 3
      'ccccccccccccccCC', // 4
      'ccccccccccccccCC', // 5
      'ccccccccccccccCC', // 6
      'ccccccccccccccCC', // 7
      'cccccccccccccCCC', // 8
      '.cccccccccccCCC.', // 9
      '.CCCCCCCCCCCCCC.', // 10
      '..CCCCCCCCCCCC..', // 11
    ],
    torsoX: 8,
    hombroD: [22, 19],
    hombroI: [9, 19],
    mangaLarga: false,
    pierna: { x: [11, 16], w: 5, pantalon: 4, calcetin: 'q' },
  },
  guille: {
    cabeza: [
      '....hhhhhh....', // 0
      '..hhhhhhhhhh..', // 1
      '.hhhlhhhhhhhh.', // 2
      'hhhhhhlhhhhhhh', // 3
      'hhhhhhhhhhhhhh', // 4
      'hhhhhhhhhhhhhs', // 5
      'hhhhhhhhhhhhss', // 6
      'hhhhhhhhhhhsSs', // 7
      'hhhhhhhhhhhssS', // 8
      '.hhhhhhhhhhSss', // 9
      '.hhhhhhhhhhSs.', // 10
      '..HHHHHHHHss..', // 11
      '....HHHHssss..', // 12
    ],
    torso: [
      '.cccccccccccccC.', // 0
      'cccccccccccccccC', // 1
      '.ccccccccccccCC.', // 2
      '.cccfcccccccccC.', // 3
      '.ccffwfcccvcccC.', // 4
      '..cccfcccvvccC..', // 5
      '..ccccccccfccC..', // 6
      '..cccccccffwfC..', // 7
      '..CCCCCCCCCCCC..', // 8
      '...CCCCCCCCCC...', // 9
    ],
    torsoX: 8,
    hombroD: [22, 19],
    hombroI: [9, 19],
    mangaLarga: false,
    pierna: { x: [11, 17], w: 4 },
  },
};

// ---------------------------------------------------------------- one pose of the skeleton

type Punto = [number, number];

interface Postura {
  /** The whole upper body (and what it holds) moves by this; `inc` leans it (pixels at the head, 0 at the hips). */
  dx: number;
  dy: number;
  inc: number;
  /** Extra shift of the head alone. */
  cabezaDy?: number;
  /** Arms: elbow and hand, relative to the shoulder. The weapon is held in the right hand at `ang`. */
  d: { codo: Punto; mano: Punto; ang?: number; abierta?: boolean };
  i: { codo: Punto; mano: Punto; abierta?: boolean };
  /** Legs: shift in x, and how many rows the top and the bottom move (crouching, jumping). */
  pI?: { dx?: number; top?: number; bot?: number };
  pD?: { dx?: number; top?: number; bot?: number };
  /** Draw the left arm over the body (when it is raised beside the head). */
  brazoIDelante?: boolean;
}

const BASE_I = { codo: [-3, 4] as Punto, mano: [-3, 8] as Punto };

const POSTURAS: Record<Exclude<PoseCombate, 'caido'>, Postura[]> = {
  quieto: [
    { dx: 0, dy: 0, inc: 0, d: { codo: [3, 5], mano: [4, 2], ang: 8 }, i: BASE_I },
    { dx: 0, dy: 1, inc: 0, d: { codo: [3, 5], mano: [4, 2], ang: 8 }, i: BASE_I },
  ],
  ataque: [
    // get ready: the weapon over the head, the body leaning back
    { dx: -1, dy: 1, inc: -3, d: { codo: [5, -3], mano: [4, -9], ang: -35 }, i: { codo: [-4, 3], mano: [-5, 7] }, pI: { dx: -1 }, pD: { dx: 1 } },
    // the blow: forward and up, the weapon swung to the right
    { dx: 0, dy: -2, inc: 3, d: { codo: [4, -1], mano: [3, -5], ang: 38 }, i: { codo: [-4, 2], mano: [-4, 6] }, pI: { dx: -2 }, pD: { dx: 2 } },
    // follow through: the weapon comes down on the other side
    { dx: 1, dy: 0, inc: 2, d: { codo: [3, 4], mano: [1, 4], ang: 132 }, i: { codo: [-4, 3], mano: [-4, 7] }, pI: { dx: -1 }, pD: { dx: 1 } },
  ],
  poder: [
    { dx: 0, dy: 0, inc: 0, d: { codo: [5, -5], mano: [4, -11], abierta: true }, i: { codo: [-5, -5], mano: [-4, -11], abierta: true }, brazoIDelante: true, pI: { dx: -1 }, pD: { dx: 1 } },
    { dx: 0, dy: -1, inc: 0, d: { codo: [5, -6], mano: [4, -12], abierta: true }, i: { codo: [-5, -6], mano: [-4, -12], abierta: true }, brazoIDelante: true, pI: { dx: -1 }, pD: { dx: 1 } },
  ],
  herido: [
    // doubled up, leaning back, one hand on the head and the weapon dangling
    { dx: -1, dy: 2, inc: -4, cabezaDy: 1, d: { codo: [3, 5], mano: [3, 7], ang: 170 }, i: { codo: [-5, -3], mano: [-1, -9] }, brazoIDelante: true, pI: { dx: -1, top: 2 }, pD: { dx: 2, top: 2 } },
  ],
  victoria: [
    { dx: 0, dy: 0, inc: 1, d: { codo: [3, -3], mano: [3, -5], ang: 22 }, i: { codo: [-4, 3], mano: [0, 7] } },
    { dx: 0, dy: -2, inc: 1, d: { codo: [3, -3], mano: [3, -6], ang: 28 }, i: { codo: [-5, -3], mano: [-5, -9], abierta: true }, brazoIDelante: true, pI: { top: -2, bot: -2 }, pD: { top: -2, bot: -2 } },
  ],
};

/** The standing figure of a friend on a grid, before the outline. */
function figura(q: Amigo, p: Postura, soloPies = false): { g: G; punta: Punto | null } {
  const F = FICHAS[q];
  const pal = paletaDe(q);
  const g = vacio();
  const sombra = (x: number, y: number): Punto => [x + p.dx + Math.round((p.inc * (28 - y)) / 23), y + p.dy];
  const sD = F.hombroD;
  const sI = F.hombroI;
  const sleeve = pal.c;
  const skin = pal.s;

  const brazo = (S: Punto, codo: Punto, mano: Punto, abierta?: boolean) => {
    const a = sombra(S[0], S[1]);
    const b = sombra(S[0] + codo[0], S[1] + codo[1]);
    const c = sombra(S[0] + mano[0], S[1] + mano[1]);
    linea(g, a[0], a[1], b[0], b[1], sleeve, 3);
    linea(g, b[0], b[1], c[0], c[1], F.mangaLarga ? sleeve : skin, 3);
    if (F.puno && F.mangaLarga) {
      const m = [c[0] + (b[0] - c[0]) * 0.25, c[1] + (b[1] - c[1]) * 0.25];
      px(g, m[0], m[1], pal[F.puno]);
    }
    // the hand: a fist, or an open palm with the fingers spread
    if (abierta) {
      cuadro(g, c[0] - 1, c[1] - 1, 3, 3, skin);
      px(g, c[0] - 1, c[1] - 2, skin);
      px(g, c[0] + 1, c[1] - 2, skin);
    } else cuadro(g, c[0] - 1, c[1] - 1, 3, 3, skin);
    return c;
  };

  // the far (left) arm first, behind the body, unless it is raised
  if (!p.brazoIDelante) brazo(sI, p.i.codo, p.i.mano);

  // the legs
  const torsoFilas = F.torso.length;
  const yLegs = 17 + torsoFilas;
  const L = F.pierna;
  [0, 1].forEach((k) => {
    const o = (k === 0 ? p.pI : p.pD) ?? {};
    const x = L.x[k] + (o.dx ?? 0);
    const y0 = yLegs + (o.top ?? 0);
    const y1 = 37 + (o.bot ?? 0);
    const alto = y1 - y0 + 1;
    const pant = alto - 3;
    const corto = L.pantalon ?? pant;
    for (let j = 0; j < alto; j++) {
      const y = y0 + j;
      if (j < Math.min(corto, pant)) {
        cuadro(g, x, y, L.w, 1, k === 0 ? pal.p : pal.P);
        px(g, x + (k === 0 ? L.w - 1 : 0), y, pal.P);
      } else if (j < pant) cuadro(g, x, y, L.w, 1, pal[L.calcetin ?? 'q'] ?? pal.p);
      else cuadro(g, x - (k === 0 ? 1 : 0), y, L.w + 1, 1, j === alto - 1 ? pal.O : pal.o);
    }
  });
  if (soloPies) return { g, punta: null };

  // the upper body: the torso and the head, leaning
  const alto = vacio();
  mapa(alto, F.torso, F.torsoX, 17, pal);
  mapa(alto, F.cabeza, 10, 5 + (p.cabezaDy ?? 0), pal);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const col = alto[y * W + x];
      if (!col) continue;
      const [nx, ny] = sombra(x, y);
      px(g, nx, ny, col);
    }
  }

  // the near (right) arm and the weapon
  let punta: Punto | null = null;
  const mano = brazo(sD, p.d.codo, p.d.mano, p.d.abierta);
  if (p.d.ang !== undefined) punta = arma(g, q, mano[0], mano[1], p.d.ang);
  // the weapon covers the fist's top, so the fist goes on again over the grip
  if (p.d.ang !== undefined) cuadro(g, mano[0] - 1, mano[1] - 1, 3, 3, skin);
  if (p.brazoIDelante) brazo(sI, p.i.codo, p.i.mano, p.i.abierta);
  return { g, punta };
}

/** The dark outline: every empty pixel next to a painted one takes a dark tone of that one's colour. */
function contornear(g: G): G {
  const out = g.slice();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (g[y * W + x]) continue;
      for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const c = g[ny * W + nx];
        if (c) {
          out[y * W + x] = mezcla(c, '#1c1226', 0.62);
          break;
        }
      }
    }
  }
  return out;
}

function aLienzo(g: G, c: HTMLCanvasElement) {
  const x = ctx(c);
  for (let y = 0; y < H; y++) {
    for (let i = 0; i < W; i++) {
      const col = g[y * W + i];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, y, 1, 1);
    }
  }
}

// ---------------------------------------------------------------- effects (painted on the canvas)

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** A four-pointed sparkle. */
function chispa(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) {
  x.fillStyle = col;
  x.fillRect(cx - r, cy, r * 2 + 1, 1);
  x.fillRect(cx, cy - r, 1, r * 2 + 1);
}

function elipseSuave(x: CanvasRenderingContext2D, col: string, cx: number, cy: number, rx: number, ry: number) {
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

function pintar(q: Amigo, pose: PoseCombate, frame: number): HTMLCanvasElement {
  const c = lienzo(W, H);
  const x = ctx(c);
  const el = ELEMENTO[q];

  if (pose === 'caido') {
    // Lying down: the crouched figure turned a quarter, the weapon dropped beside it and a few stars going round.
    const { g } = figura(q, { dx: 0, dy: 3, inc: 0, d: { codo: [2, 6], mano: [3, 9] }, i: { codo: [-2, 6], mano: [-2, 9] }, pI: { top: 3 }, pD: { top: 3 } });
    let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (g[j * W + i]) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
    const r = vacio();
    // the weapon lies on the ground behind the body
    arma(r, q, 13, 17, 95);
    // quarter turn clockwise: the head goes to the right, the feet to the left
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const col = g[j * W + i];
        if (!col) continue;
        px(r, y1 - j + 1, 37 - (x1 - x0) + (i - x0), col);
      }
    }
    aLienzo(contornear(r), c);
    chispa(x, 27, 18, 2, '#fff2a0');
    chispa(x, 21, 21, 1, '#ffffff');
    chispa(x, 31, 22, 1, '#fff2a0');
    return c;
  }

  const lista = POSTURAS[pose];
  const p = lista[Math.min(frame, lista.length - 1)];
  const { g, punta } = figura(q, p);

  if (pose === 'poder') {
    // the glow of the element behind the friend, a ring on the ground and lights over the hands
    const f = frame;
    elipseSuave(x, rgba(el, 0.18), 16, 22, 15 + f, 19);
    elipseSuave(x, rgba(el, 0.3), 16, 22, 11 + f, 15);
    elipseSuave(x, rgba(el, 0.5), 16, 37, 13, 3);
    elipseSuave(x, rgba(el, 0.35), 16, 37, 9, 2);
    aLienzo(contornear(g), c);
    const F = FICHAS[q];
    const hd = [F.hombroD[0] + p.d.mano[0], F.hombroD[1] + p.d.mano[1] + p.dy];
    const hi = [F.hombroI[0] + p.i.mano[0], F.hombroI[1] + p.i.mano[1] + p.dy];
    for (const [hx, hy] of [hd, hi]) {
      elipseSuave(x, rgba(el, 0.55), hx, hy - 3, 4, 4);
      elipseSuave(x, rgba('#ffffff', 0.7), hx, hy - 3, 2, 2);
    }
    chispa(x, 4, 12 - f * 2, 2, el);
    chispa(x, 28, 10 + f * 3, 2, '#ffffff');
    chispa(x, 3, 28 + f * 2, 1, '#ffffff');
    chispa(x, 29, 24 - f * 3, 1, el);
    chispa(x, 16, 1 + f, 1, '#ffffff');
    return c;
  }

  aLienzo(contornear(g), c);

  if (pose === 'ataque' && frame === 1 && punta) {
    // the impact: a white burst with the colour of the element around it
    const tx = Math.min(27, Math.round(punta[0]));
    const ty = Math.max(4, Math.round(punta[1]));
    chispa(x, tx, ty, 4, rgba(el, 0.9));
    chispa(x, tx, ty, 2, '#ffffff');
    x.fillStyle = '#ffffff';
    x.fillRect(tx - 1, ty - 1, 3, 3);
  }
  if (pose === 'herido') {
    // pain lines and a drop of sweat
    x.fillStyle = '#ffffff';
    for (const [lx, ly] of [[25, 6], [28, 9], [27, 3]]) {
      x.fillRect(lx, ly, 1, 1);
      x.fillRect(lx + 1, ly - 1, 1, 1);
      x.fillRect(lx + 2, ly - 2, 1, 1);
    }
    x.fillStyle = '#9fd8ff';
    x.fillRect(6, 7, 1, 2);
    x.fillRect(5, 8, 3, 1);
  }
  if (pose === 'victoria') {
    chispa(x, 5, 9 + frame * 2, 2, '#fff2a0');
    chispa(x, 29, 12 - frame * 2, 1, '#ffffff');
    if (frame === 1) chispa(x, 27, 4, 1, '#fff2a0');
  }
  return c;
}

/** One cached frame of a friend in a fight. */
export function luchador(q: Amigo, pose: PoseCombate, frame: number): HTMLCanvasElement {
  return una(`luchador.${q}.${pose}.${frame}`, () => pintar(q, pose, frame));
}
