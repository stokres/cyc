// The two maps of the slice: Pablo's bedroom (cuarto.ts) and the village in fiestas, at night, in a storm.
// A map is built once: the ground baked into a canvas (tiles, banks, pools of light), the objects with their
// sprites and collision boxes, the strings of fiesta lights... The frame loop only reads it.
import {
  aguaFrames, arbol, banco, barril, cartel, casa, caja, farola, fuente, maceta, postePuerta, puesto, sueloDe, T,
  type Baldosa, type Luz,
} from './arte';
import { letreroPosada, letreroTienda } from './artecampo';
import { ctx, lienzo, una } from './pixel';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Something drawn in the world, sorted by `base` (the y of its feet): sprites painted once. */
export interface Objeto {
  id: string;
  x: number;
  y: number;
  frames: HTMLCanvasElement[];
  /** Frames per second when it has several. */
  vel?: number;
  /** The y that decides who is in front (bottom edge of the sprite by default). */
  base: number;
}

/** A string of fiesta bulbs between two points; it sags by `caida` pixels in the middle. */
export interface Cuerda {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  caida: number;
  /** Little coloured flags along it. */
  banderas?: boolean;
}

export interface Bombilla {
  x: number;
  y: number;
  /** 0–4: colour; the twinkle phase is derived from the index. */
  color: number;
}

/** A thing to read or look at with A: where it is (in front of it) and the text key. */
export interface Lectura {
  rect: Rect;
  clave: string;
  /** Who says it: the thinker's own line («pablo») or the narrator (null). */
  quien: 'pablo' | null;
}

/** What every walkable map has: the baked ground, the water, the solid boxes and the objects in depth order. */
export interface MundoBase {
  w: number;
  h: number;
  suelo: HTMLCanvasElement;
  agua: HTMLCanvasElement[];
  grid: Baldosa[][];
  rects: Rect[];
  objetos: Objeto[];
  luces: Luz[];
  /** Water sparkles: x, y, phase. */
  brillos: Array<[number, number, number]>;
  lecturas: Lectura[];
}

/** The village. */
export interface Mundo extends MundoBase {
  cuerdas: Cuerda[];
  bombillas: Bombilla[];
  /** The strings' cords and flags, painted once (transparent), drawn over everything. */
  cordones: HTMLCanvasElement | null;
  /** Pablo's front door: the tile and where he comes out. */
  puerta: Rect;
  /** The doors of the peña (the shop) and of the inn: the tile to walk into. */
  tienda: Rect;
  posada: Rect;
  /** Where Pablo comes out of each. */
  salidaTienda: { x: number; y: number };
  salidaPosada: { x: number; y: number };
  /** The way out to the road, on the plaza's east side: walk into it. */
  salidaCamino: Rect;
  /** Where Pablo stands when he comes back from the road. */
  llegadaCamino: { x: number; y: number };
  /** Where the three friends wait (feet), the narrator's spot and Chuchi's entrance (the gate). */
  amigos: { fran: { x: number; y: number }; guille: { x: number; y: number }; chuchi: { x: number; y: number } };
  narrador: { x: number; y: number };
  salida: { x: number; y: number };
  /** The plaza, where the slice ends. */
  plaza: Rect;
  /** The crate. */
  caja: { x: number; y: number };
  /** The villager's walking area and start (feet). */
  aldeano: { zona: Rect; x: number; y: number };
  /** Pablo's start (feet), when he comes in from the door. */
  inicio: { x: number; y: number };
  /** Lamps (their light flickers a little). */
  farolas: Array<{ x: number; y: number }>;
}

const rr = (g: Baldosa[][], x0: number, y0: number, x1: number, y1: number, k: Baldosa) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = k;
};

/** Is this tile solid for walking? */
export const solidoBaldosa = (k: Baldosa | undefined) => k === undefined || k === 'w' || k === 'f' || k === 'h' || k === 'x';

/** Extra width of a house's doorway on each side of its tile (the opening and the trigger). */
const MARGEN_PUERTA = 4;

export const ANCHO_PUEBLO = 40;
export const ALTO_PUEBLO = 26;

/** The village, built once. */
export function pueblo(): Mundo {
  return una('mundo.pueblo', construirPueblo);
}

function construirPueblo(): Mundo {
  const W = ANCHO_PUEBLO;
  const H = ALTO_PUEBLO;
  const g: Baldosa[][] = Array.from({ length: H }, () => Array<Baldosa>(W).fill('g'));
  // The forest around, the channel, the fiesta's fence with its gate, the plaza and the roads.
  rr(g, 0, 0, 39, 1, 'x');
  rr(g, 0, 24, 39, 25, 'x');
  rr(g, 0, 0, 1, 25, 'x');
  rr(g, 38, 0, 39, 25, 'x');
  rr(g, 13, 2, 14, 23, 'w');
  rr(g, 19, 2, 19, 23, 'f');
  rr(g, 20, 5, 37, 14, 'p');
  rr(g, 2, 19, 12, 20, 'd');
  rr(g, 15, 19, 18, 20, 'd');
  rr(g, 13, 19, 14, 20, 'b');
  g[20][19] = 'd';
  g[18][5] = 'd';
  rr(g, 10, 6, 11, 18, 'd');
  rr(g, 5, 10, 9, 10, 'd');
  g[9][5] = 'd';
  rr(g, 16, 10, 16, 18, 'd');
  rr(g, 20, 15, 21, 20, 'd');
  rr(g, 22, 15, 22, 20, 'h');
  rr(g, 20, 21, 22, 21, 'h');
  // A little path on the plaza's south side to the fiesta grounds.
  rr(g, 23, 15, 37, 15, 'g');
  // The way out to the road to the theatre: an opening in the forest on the east side of the plaza.
  rr(g, 38, 9, 39, 11, 'd');

  const luces: Luz[] = [];
  const rects: Rect[] = [];
  const objetos: Objeto[] = [];
  const lecturas: Lectura[] = [];
  const farolasPos: Array<{ x: number; y: number }> = [];
  const calido: [number, number, number] = [255, 190, 90];
  const frio: [number, number, number] = [150, 200, 255];

  const poner = (id: string, x: number, y: number, img: HTMLCanvasElement, base = y + img.height) => {
    objetos.push({ id, x, y, frames: [img], base });
  };

  // --- houses: [tile x, tile y of the roof's top row, width, door tile column, colour, options]
  const casas: Array<[string, number, number, number, number, string, Partial<Parameters<typeof casa>[0]>]> = [
    ['pablo', 3, 13, 6, 2, '#d6502f', { chimenea: true, guirnalda: true }],
    ['vecina', 3, 4, 6, 2, '#2f9a8a', { guirnalda: true }],
    ['tienda', 15, 5, 4, 1, '#8a4cc0', { chimenea: true }],
    ['norte1', 22, 0, 6, 2, '#e0a22a', { guirnalda: true }],
    ['norte2', 31, 0, 6, 3, '#c0392b', { chimenea: true }],
    ['sur1', 25, 16, 6, 3, '#3a7ac8', { guirnalda: true }],
    ['sur2', 32, 17, 5, 2, '#d6502f', { ventanas: false }],
  ];
  for (const [id, tx, ty, w, puerta, techo, extra] of casas) {
    const img = casa({ w, techo, puerta, ...extra });
    const x = tx * T;
    const y = ty * T;
    poner(`casa.${id}`, x, y, img);
    const WP = w * T;
    if (id === 'pablo' || id === 'tienda' || id === 'norte1') {
      // The door tile can be walked into; the opening is a little wider than the tile (4 px each side) so that
      // the middle of the door is easy to hit with the feet's box.
      rects.push({ x, y, w: WP, h: 64 }, { x, y: y + 64, w: puerta * T - MARGEN_PUERTA, h: 16 }, { x: x + (puerta + 1) * T + MARGEN_PUERTA, y: y + 64, w: WP - (puerta + 1) * T - MARGEN_PUERTA, h: 16 });
    } else {
      rects.push({ x, y, w: WP, h: 80 });
      lecturas.push({ rect: { x: x + puerta * T - 4, y: y + 80, w: T + 8, h: 14 }, clave: 'lectura.puerta', quien: null });
    }
    // The signs on the walls beside the shop's and the inn's doors.
    if (id === 'tienda') poner('letrero.tienda', x + (puerta + 1) * T + 4, y + 50, letreroTienda(), y + 79);
    if (id === 'norte1') poner('letrero.posada', x + (puerta + 1) * T + 4, y + 50, letreroPosada(), y + 79);
    // The pool of light at the door and the windows.
    luces.push({ x: x + puerta * T + 8, y: y + 84, rx: 26, ry: 10, rgb: calido, fuerza: extra.ventanas === false ? 0.3 : 1 });
  }
  const pabloCasa = { x: 3 * T, y: 13 * T };

  // --- trees: [tile x, base tile row, variant]
  const arboles: Array<[number, number, number]> = [
    [9, 3, 0], [16, 3, 1], [2, 12, 2], [2, 8, 1], [11, 23, 2], [3, 23, 1], [7, 23, 0], [17, 23, 0], [12, 3, 2],
    [24, 22, 0], [29, 23, 1], [34, 23, 2], [23, 17, 1], [37, 14, 0], [23, 23, 1],
  ];
  for (const [tx, tyb, v] of arboles) {
    const y = (tyb + 1) * T - 48;
    poner(`arbol.${tx}.${tyb}`, tx * T, y, arbol(v));
    rects.push({ x: tx * T + 10, y: (tyb + 1) * T - 8, w: 12, h: 7 });
  }
  // The forest around: trees close together on the edges (the ring of tiles is solid anyway).
  for (let k = -1; k < 14; k++) {
    poner(`bosqueO.${k}`, -8 + (k % 2) * 14, k * 32 - 14, arbol((k + 3) % 3));
    // (a gap in the east forest: the road to the theatre)
    if (k >= 4 && k <= 6) continue;
    poner(`bosqueE.${k}`, W * T - 24 - (k % 2) * 14, k * 32 - 14 + 10, arbol((k + 1) % 3));
  }
  for (let k = 0; k < 20; k++) {
    poner(`bosqueN.${k}`, k * 32 - 4 + (k % 2) * 6, -18 - (k % 2) * 6, arbol(k % 3));
    poner(`bosqueS.${k}`, k * 32 - 8 + (k % 2) * 8, H * T - 46 + (k % 2) * 4, arbol((k + 2) % 3));
  }

  // --- lamps
  const farolasT: Array<[number, number]> = [[9, 18], [12, 18], [15, 18], [18, 18], [22, 6], [36, 6], [22, 13], [36, 13], [28, 16], [17, 12]];
  for (const [tx, ty] of farolasT) {
    const x = tx * T + 2;
    const y = (ty + 1) * T - 44;
    poner(`farola.${tx}.${ty}`, x, y, farola());
    rects.push({ x: tx * T + 5, y: (ty + 1) * T - 5, w: 6, h: 4 });
    luces.push({ x: tx * T + 8, y: (ty + 1) * T - 2, rx: 34, ry: 15, rgb: calido, fuerza: 1.05 });
    farolasPos.push({ x: tx * T + 8, y: (ty + 1) * T - 37 });
  }

  // --- the gate's two posts
  for (const ty of [19, 21]) {
    poner(`poste.${ty}`, 19 * T + 1, (ty + 1) * T - 44, postePuerta(), (ty + 1) * T);
    luces.push({ x: 19 * T + 12, y: (ty + 1) * T, rx: 22, ry: 9, rgb: calido, fuerza: 0.9 });
  }

  // --- the plaza: fountain, two stalls, benches, a sign at the gate, barrels and pots
  poner('fuente', 27 * T, 6 * T, fuente(0), 6 * T + 52);
  objetos[objetos.length - 1].frames = [fuente(0), fuente(1)];
  objetos[objetos.length - 1].vel = 2;
  rects.push({ x: 27 * T + 4, y: 6 * T + 28, w: 56, h: 24 });
  luces.push({ x: 29 * T + 8, y: 6 * T + 40, rx: 52, ry: 24, rgb: frio, fuerza: 0.9 });
  lecturas.push({ rect: { x: 26 * T, y: 6 * T + 52, w: 6 * T, h: 14 }, clave: 'lectura.fuente', quien: null });
  for (const [id, tx, ty] of [['puesto1', 22, 8], ['puesto2', 34, 8]] as const) {
    const img = puesto(id === 'puesto1' ? '#d4453a' : '#2f8ac8');
    poner(id, tx * T, ty * T, img, ty * T + 46);
    rects.push({ x: tx * T + 2, y: ty * T + 26, w: 44, h: 20 });
    luces.push({ x: tx * T + 24, y: ty * T + 50, rx: 34, ry: 12, rgb: calido, fuerza: 0.9 });
    lecturas.push({ rect: { x: tx * T, y: ty * T + 46, w: 48, h: 14 }, clave: 'lectura.puesto', quien: null });
  }
  for (const [tx, ty] of [[24, 12], [31, 12]] as const) {
    poner(`banco.${tx}`, tx * T, ty * T, banco(), ty * T + 17);
    rects.push({ x: tx * T + 2, y: ty * T + 8, w: 28, h: 8 });
  }
  poner('cartel', 18 * T - 2, 21 * T - 16, cartel(), 21 * T + 10);
  rects.push({ x: 18 * T + 4, y: 21 * T + 2, w: 5, h: 5 });
  lecturas.push({ rect: { x: 17 * T, y: 21 * T + 8, w: 3 * T, h: 12 }, clave: 'lectura.cartel', quien: null });
  for (const [tx, ty] of [[8, 18], [4, 12], [18, 15], [37, 8], [21, 6]] as const) {
    poner(`barril.${tx}.${ty}`, tx * T + 1, ty * T - 2, barril(), ty * T + 16);
    rects.push({ x: tx * T + 1, y: ty * T + 6, w: 14, h: 8 });
  }
  for (const [tx, ty, col] of [[7, 18, '#ff6a8a'], [4, 18, '#ffd84a'], [17, 10, '#b784f0'], [26, 13, '#ff6a8a'], [33, 13, '#ffd84a']] as const) {
    poner(`maceta.${tx}.${ty}`, tx * T + 1, ty * T, maceta(col), ty * T + 16);
    rects.push({ x: tx * T + 3, y: ty * T + 8, w: 10, h: 7 });
  }

  // --- strings of fiesta lights between the lamps, the fountain and the fence
  const punta = (tx: number, ty: number) => ({ x: tx * T + 8, y: (ty + 1) * T - 37 });
  const L = (tx: number, ty: number) => punta(tx, ty);
  const F = { x: 29 * T + 8, y: 6 * T + 4 };
  const cuerdas: Cuerda[] = [];
  const unir = (a: { x: number; y: number }, b: { x: number; y: number }, caida: number, banderas = false) =>
    cuerdas.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, caida, banderas });
  unir(L(9, 18), L(12, 18), 6, true);
  unir(L(12, 18), L(15, 18), 7);
  unir(L(15, 18), L(18, 18), 6, true);
  unir(L(18, 18), L(22, 13), 9);
  unir(L(22, 6), L(36, 6), 8, true);
  unir(L(22, 13), L(36, 13), 8, true);
  unir(L(22, 6), L(22, 13), 5);
  unir(L(36, 6), L(36, 13), 5);
  unir(F, L(22, 6), 10);
  unir(F, L(36, 6), 10);
  unir(F, L(22, 13), 12);
  unir(F, L(36, 13), 12);
  unir(L(17, 12), L(15, 18), 8);

  const bombillas: Bombilla[] = [];
  let n = 0;
  for (const c of cuerdas) {
    const largo = Math.hypot(c.x2 - c.x1, c.y2 - c.y1);
    const k = Math.max(2, Math.round(largo / 11));
    for (let i = 1; i < k; i++) {
      const t = i / k;
      bombillas.push({ x: Math.round(c.x1 + (c.x2 - c.x1) * t), y: Math.round(c.y1 + (c.y2 - c.y1) * t + c.caida * 4 * t * (1 - t)), color: n++ % 5 });
    }
  }
  const cordones = hacerCordones(W * T, H * T, cuerdas);

  // --- water sparkles
  const brillos: Array<[number, number, number]> = [];
  for (let ty = 2; ty < 24; ty++) for (let k = 0; k < 2; k++) brillos.push([13 * T + 2 + ((ty * 7 + k * 13) % 26), ty * T + 2 + ((ty * 5 + k * 9) % 12), ((ty * 31 + k * 17) % 100) / 100]);

  const suelo = sueloDe(g, luces);
  const agua = aguaFrames(g);

  // The crate and the world's things that move are the engine's.
  const aldeanoZona: Rect = { x: 15 * T, y: 18 * T, w: 4 * T, h: 6 * T };
  void pabloCasa;
  // the sign at the mouth of the road (its text is the narrator's)
  poner('cartel.camino', 35 * T + 2, 12 * T - 6, cartel(), 12 * T + 14);
  rects.push({ x: 35 * T + 8, y: 12 * T + 4, w: 5, h: 5 });
  lecturas.push({ rect: { x: 34 * T, y: 12 * T + 10, w: 3 * T, h: 12 }, clave: 'lectura.cartelCamino', quien: null });
  return {
    w: W * T,
    h: H * T,
    suelo,
    agua,
    grid: g,
    rects,
    objetos: objetos.sort((a, b) => a.base - b.base),
    luces,
    brillos,
    cuerdas,
    bombillas,
    cordones,
    lecturas,
    puerta: { x: 3 * T + 2 * T - MARGEN_PUERTA, y: 13 * T + 64, w: T + 2 * MARGEN_PUERTA, h: 16 },
    tienda: { x: 15 * T + T - MARGEN_PUERTA, y: 5 * T + 64, w: T + 2 * MARGEN_PUERTA, h: 16 },
    posada: { x: 22 * T + 2 * T - MARGEN_PUERTA, y: 0 * T + 64, w: T + 2 * MARGEN_PUERTA, h: 16 },
    salidaTienda: { x: 15 * T + T + 8, y: 5 * T + 80 + 10 },
    salidaPosada: { x: 22 * T + 2 * T + 8, y: 0 * T + 80 + 10 },
    salidaCamino: { x: 38 * T, y: 9 * T, w: 2 * T, h: 3 * T },
    llegadaCamino: { x: 37 * T, y: 10 * T + 8 },
    amigos: { fran: { x: 23 * T + 8, y: 11 * T + 8 }, guille: { x: 31 * T + 8, y: 9 * T + 12 }, chuchi: { x: 19 * T + 8, y: 20 * T + 12 } },
    narrador: { x: 26 * T, y: 10 * T + 8 },
    salida: { x: 3 * T + 2 * T + 8, y: 13 * T + 80 + 10 },
    plaza: { x: 22 * T, y: 5 * T, w: 14 * T, h: 8 * T },
    caja: { x: 20 * T, y: 20 * T },
    aldeano: { zona: aldeanoZona, x: 16 * T + 8, y: 21 * T + 8 },
    inicio: { x: 3 * T + 2 * T + 8, y: 13 * T + 80 + 10 },
    farolas: farolasPos,
  };
}

/** The strings' cords and their flags, once. */
function hacerCordones(w: number, h: number, cuerdas: Cuerda[]): HTMLCanvasElement {
  const c = lienzo(w, h);
  const x = ctx(c);
  const banderas = ['#e8453a', '#f5c542', '#3aa0e0', '#52c26a', '#e86aa8'];
  for (const s of cuerdas) {
    const largo = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    const pasos = Math.ceil(largo);
    let ult = -1;
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      const px = Math.round(s.x1 + (s.x2 - s.x1) * t);
      const py = Math.round(s.y1 + (s.y2 - s.y1) * t + s.caida * 4 * t * (1 - t));
      x.fillStyle = 'rgba(28,18,38,0.85)';
      x.fillRect(px, py, 1, 1);
      if (s.banderas && i % 9 === 4 && i - ult > 6) {
        ult = i;
        const col = banderas[(i / 9 + Math.round(s.x1)) % 5 | 0] ?? banderas[0];
        x.fillStyle = col;
        // a hanging pennant, a triangle pointing down
        x.fillRect(px - 2, py + 1, 5, 1);
        x.fillRect(px - 1, py + 2, 3, 1);
        x.fillRect(px, py + 3, 1, 1);
      }
    }
  }
  return c;
}

/** Where the crate stands, for the engine: tile and sprite. */
export const spriteCaja = caja;
