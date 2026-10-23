// The Teatro of «Alacant Sun»: an old theatre at night, six connected rooms with a puzzle for each psynergy.
//   vestíbulo (ves): the ticket booth; two statues to push onto their marks with «Sí, y...» open the gold gate.
//   patio de butacas (pat): the orchestra pit is full of beer; «Fresquito» freezes the puddles into steps. Psst.
//   palcos (pal): a gap in the bridge and a rock of papier-mâché that «Abrazo de oso» lifts into it. Ejem.
//   bambalinas (bam): the footlights glare; «Cierzo» blows out the candles and the leaves, and the phosphorescent
//     marks of the stage crew show the planks that hold. Shhh.
//   foso (fos): a stagehand's ghost whose chat «Leer el chat» reads to learn the stage door's password.
//   escenario (esc): the stage, and the Sombra waiting.
// This file is the map data (ASCII rooms, doors, what stands where) and the baked floors. What moves (statues,
// ice, rocks, flames) is state of sol.ts. Everything is painted once into cached canvases (docs/ESTILO.md, T5).
import { barril, T, TINTE_OBJETO, type Luz } from './arte';
import { bastidor, butacas, cajon, columna, polea, saco, taquilla } from './arteteatro';
import type { Lectura, Objeto } from './mapas';
import type { Dir } from './personajes';
import { azar, ctx, elipse, lienzo, mezcla, noche, rect, una } from './pixel';
import { anchoTexto, escribir, partir } from './fuente';

export type IdSala = 'ves' | 'pat' | 'pal' | 'bam' | 'fos' | 'esc';
export const SALAS: readonly IdSala[] = ['ves', 'pat', 'pal', 'bam', 'fos', 'esc'];

export interface Llegada {
  x: number;
  y: number;
  dir: Dir;
}

export interface PuertaTeatro {
  /** Tiles, inclusive. */
  c0: number;
  r0: number;
  c1: number;
  r1: number;
  a: IdSala | 'camino';
  /** The gate that must be open to use it (a puzzle id). */
  abre?: PuzleTeatro;
}

export type PuzleTeatro = 'estatuas' | 'hielo' | 'roca' | 'velas' | 'chat';
export const PUZLES: readonly PuzleTeatro[] = ['estatuas', 'hielo', 'roca', 'velas', 'chat'];

export interface EstatuaDef {
  id: string;
  tipo: 'comedia' | 'tragedia';
  c: number;
  r: number;
}
export interface RocaDef {
  id: string;
  c: number;
  r: number;
  /** Where it lands when lifted (tile). If it is a hole it fills it. */
  c2: number;
  r2: number;
}
export interface VelaDef {
  id: string;
  c: number;
  r: number;
}
export interface HojasDef {
  id: string;
  c: number;
  r: number;
  w: number;
  h: number;
}
export interface PensadorDef {
  id: string;
  q: 'tramoyista' | 'acomodador';
  /** Feet in pixels. */
  x: number;
  y: number;
}
export interface ApuntadorDef {
  id: 'ejem' | 'psst' | 'shhh';
  /** Feet in pixels. */
  x: number;
  y: number;
  /** Who gets it. */
  dueno: 'chuchi' | 'fran' | 'guille';
}
export interface CofreDef {
  id: string;
  x: number;
  y: number;
  objeto?: string;
  cantidad?: number;
  monedas?: number;
}
export interface PuntoDef {
  id: string;
  x: number;
  y: number;
}

export interface SalaTeatro {
  id: IdSala;
  /** Tiles. */
  c: number;
  r: number;
  w: number;
  h: number;
  /** One character per tile (see `FILAS`). */
  filas: string[];
  /** The baked floor and walls, lit. */
  suelo: HTMLCanvasElement;
  objetos: Objeto[];
  luces: Luz[];
  lecturas: Lectura[];
  puertas: PuertaTeatro[];
  llegadas: Partial<Record<IdSala | 'camino', Llegada>>;
  /** No random fights here. */
  seguro: boolean;
  estatuas: EstatuaDef[];
  marcas: Array<{ c: number; r: number }>;
  rocas: RocaDef[];
  velas: VelaDef[];
  hojas: HojasDef[];
  pensadores: PensadorDef[];
  apuntadores: ApuntadorDef[];
  cofres: CofreDef[];
  chupitos: PuntoDef[];
  /** Phosphorescent marks of the safe planks (only in the bambalinas), baked. */
  brillo: HTMLCanvasElement | null;
  /** The sparks of the lamps that flicker. */
  lamparas: Array<{ x: number; y: number }>;
}

export interface MundoTeatro {
  salas: Record<IdSala, SalaTeatro>;
}

/** Words painted into the art (the texts file gives them). */
export interface Rotulos {
  taquilla: string;
  cartel1: string;
  cartel2: string;
  escenario: string;
}

// ---------------------------------------------------------------- the rooms

/**
 * The legend: `#` wall or void · `.` floor · `,` carpet · `X` solid with a floor under it (furniture, columns) ·
 * `o` a pit or chasm · `c` a puddle of beer (solid until frozen) · `h` a hole in the floor (solid until the
 * rock fills it) · `=` the gold gate · `P` the stage door · `D` a door, stairs or ladder (you walk through) ·
 * `H` a hatch · `t` a loose plank that gives way · `s` a plank that holds (looks like `t`).
 */
const FILAS: Record<IdSala, string[]> = {
  ves: [
    '################',
    '################',
    '#######==#######',
    '#XXX...,,......#',
    '#XXX...,,......#',
    '#....X.,,......#',
    '#......,,.X....#',
    '#......,,......#',
    '#......,,......#',
    '#......,,......#',
    '#......,,......#',
    '#######DD#######',
  ],
  pat: [
    '####################',
    '####################',
    '#################DD#',
    '#..................#',
    '#..................#',
    '#' + 'o'.repeat(10) + 'c' + 'o'.repeat(7) + '#',
    '#' + 'o'.repeat(10) + 'c' + 'o'.repeat(7) + '#',
    '#' + 'o'.repeat(7) + 'cccc' + 'o'.repeat(7) + '#',
    '#..................#',
    '#.XXXXXXX..XXXXXXX.#',
    '#.XXXXXXX..XXXXXXX.#',
    '#.XXXXXXX..XXXXXXX.#',
    '#.XXXXXXX..XXXXXXX.#',
    '#..................#',
    '#########DD#########',
  ],
  pal: [
    '####################',
    '####################',
    '#################DD#',
    '#......ooooo,,,,X..#',
    '#......ooooo,,,,X..#',
    '#......oooooXX.XX..#',
    '#......ooooo.......#',
    '#........h.........#',
    '#......ooooo.......#',
    '#......ooooo.......#',
    '#......ooooo.......#',
    '##DD################',
  ],
  // (the bambalinas are built below from the list of planks that hold)
  bam: [],
  fos: [
    '################',
    '################',
    '#######PP#######',
    '#..............#',
    '#.XX........XX.#',
    '#..............#',
    '#....X.....X...#',
    '#..............#',
    '#.XX...........#',
    '#..............#',
    '#..............#',
    '#############DD#',
  ],
  esc: [
    '###############',
    '###############',
    '###############',
    '#.............#',
    '#.............#',
    '#.............#',
    '#.............#',
    '#.............#',
    '#.............#',
    '#######DD######',
  ],
};

/** The planks of the bambalinas that hold (c, r), from the lip of the stage to the hatch. */
export const CAMINO_TABLAS: ReadonlyArray<[number, number]> = [
  [15, 10], [15, 9], [15, 8], [14, 8], [13, 8], [12, 8], [12, 7], [12, 6], [11, 6], [10, 6], [9, 6], [8, 6], [7, 6], [7, 5], [7, 4], [8, 4], [9, 4],
  // dead ends, to make you think
  [12, 5], [6, 6], [5, 6], [10, 7],
];

(() => {
  const W = 20;
  const H = 14;
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('#'));
  for (let r = 3; r <= 12; r++) for (let c = 1; c <= 18; c++) g[r][c] = '.';
  for (let r = 3; r <= 10; r++) for (let c = 3; c <= 16; c++) g[r][c] = 't';
  for (const [c, r] of CAMINO_TABLAS) g[r][c] = 's';
  g[3][9] = 'H';
  for (const c of [5, 9, 14]) g[11][c] = 'X';
  g[11][3] = 'X';
  g[13][2] = 'D';
  g[13][3] = 'D';
  FILAS.bam = g.map((f) => f.join(''));
})();

for (const [id, f] of Object.entries(FILAS)) {
  if (!f.length) continue;
  const w = f[0].length;
  f.forEach((row, i) => {
    if (row.length !== w) throw new Error(`Teatro: la fila ${i} de ${id} mide ${row.length} y debería medir ${w}`);
  });
}

// The Teatro's own monsters (enemigos.ts, ENEMIGOS_TEATRO), harder room by room; the patio still lets a few of the road's in.
const GRUPOS_PATIO: string[][] = [['programa', 'programa'], ['foco', 'spoiler'], ['programa', 'movil', 'programa'], ['tramoyista', 'critico']];
const GRUPOS_PALCOS: string[][] = [['butaca', 'programa'], ['foco', 'programa', 'foco'], ['tramoyista', 'butaca'], ['programa2', 'programa']];
const GRUPOS_BAMBALINAS: string[][] = [['tramoyista', 'tramoyista', 'programa'], ['foco2', 'butaca'], ['programa2', 'tramoyista', 'foco'], ['butaca', 'butaca']];
const GRUPOS_FOSO: string[][] = [['tramoyista2', 'butaca'], ['foco2', 'programa2', 'tramoyista'], ['butaca2', 'foco'], ['tramoyista2', 'programa2', 'programa2']];
export const GRUPOS_TEATRO: Partial<Record<IdSala, string[][]>> = { pat: GRUPOS_PATIO, pal: GRUPOS_PALCOS, bam: GRUPOS_BAMBALINAS, fos: GRUPOS_FOSO };

const px = (c: number) => c * T;

// ---------------------------------------------------------------- painting

const hash = (x: number, y: number, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const esFirme = (ch: string | undefined) => ch !== undefined && ch !== '#' && ch !== 'o' && ch !== 'c' && ch !== 'h';
const OSCURO = '#0b0916';

interface Tema {
  /** The wall face. */
  pared: string;
  paredO: string;
  paredL: string;
  /** Floor planks: base, seam, light. */
  suelo: string;
  sueloO: string;
  sueloL: string;
  tinte: [number, number, number];
}

const TEMAS: Record<IdSala, Tema> = {
  ves: { pared: '#7a1c34', paredO: '#5e1226', paredL: '#9a2e4c', suelo: '#e8e0ec', sueloO: '#9a90b0', sueloL: '#fbf8ff', tinte: [0.6, 0.62, 0.86] },
  pat: { pared: '#5e1226', paredO: '#44091a', paredL: '#8a2038', suelo: '#a8683a', sueloO: '#6e4426', sueloL: '#c9975a', tinte: [0.56, 0.58, 0.84] },
  pal: { pared: '#6a2a3c', paredO: '#4e1a2c', paredL: '#8e4258', suelo: '#a8683a', sueloO: '#6e4426', sueloL: '#c9975a', tinte: [0.56, 0.58, 0.84] },
  bam: { pared: '#5a4630', paredO: '#3e2e1c', paredL: '#7a6244', suelo: '#8a6a44', sueloO: '#4e3820', sueloL: '#a8845a', tinte: [0.5, 0.54, 0.8] },
  fos: { pared: '#4a4458', paredO: '#34303e', paredL: '#6a6480', suelo: '#7a6248', sueloO: '#4a3a28', sueloL: '#9a7e5c', tinte: [0.46, 0.5, 0.78] },
  esc: { pared: '#3a1a3a', paredO: '#2a102a', paredL: '#5a2a5a', suelo: '#7a5a3a', sueloO: '#4a3420', sueloL: '#9a7a52', tinte: [0.62, 0.62, 0.86] },
};

/** Planks of a tile: four horizontal boards with seams and nails. */
function tablones(x: CanvasRenderingContext2D, ox: number, oy: number, t: Tema, c: number, r: number) {
  const tono = 0.12 * (hash(c, r, 3) - 0.5);
  rect(x, mezcla(t.suelo, hash(c, r, 5) > 0.5 ? '#ffffff' : '#000000', Math.abs(tono)), ox, oy, T, T);
  for (let i = 0; i < 4; i++) {
    const y = oy + i * 4;
    rect(x, t.sueloO, ox, y + 3, T, 1);
    rect(x, t.sueloL, ox, y, T, 1);
    // a seam between two boards, at a different place in each row
    const sx = ox + Math.floor(hash(c + i, r, 7) * 13) + 1;
    rect(x, t.sueloO, sx, y, 1, 3);
    if (hash(c, r + i, 9) > 0.7) {
      rect(x, t.sueloO, ox + 2 + Math.floor(hash(c, r, i) * 10), y + 1, 1, 1);
    }
  }
}

/** Marble in a checkerboard of 8×8. */
function marmol(x: CanvasRenderingContext2D, ox: number, oy: number, t: Tema, c: number, r: number) {
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const claro = (c * 2 + i + r * 2 + j) % 2 === 0;
      rect(x, claro ? t.suelo : '#b4a8cc', ox + i * 8, oy + j * 8, 8, 8);
      rect(x, claro ? t.sueloL : '#c8bddc', ox + i * 8, oy + j * 8, 8, 1);
    }
  }
  rect(x, t.sueloO, ox, oy + 7, T, 1);
  rect(x, t.sueloO, ox + 7, oy, 1, T);
  if (hash(c, r, 4) > 0.6) rect(x, '#c4bad8', ox + 3, oy + 3, 2, 1);
}

function alfombra(x: CanvasRenderingContext2D, ox: number, oy: number, izq: boolean, der: boolean, c: number, r: number) {
  rect(x, '#9a1a30', ox, oy, T, T);
  rect(x, '#b3243a', ox + 1, oy, T - 2, T);
  // a pattern of small gold diamonds
  const f = (r + c) % 2;
  rect(x, '#d8a838', ox + 7, oy + 3 + f * 8, 2, 2);
  rect(x, '#d8a838', ox + 6, oy + 4 + f * 8, 4, 0);
  rect(x, '#e8c24a', ox + 7, oy + 4 + f * 8, 2, 1);
  if (izq) {
    rect(x, '#e0b030', ox, oy, 1, T);
    rect(x, '#7a0f24', ox + 1, oy, 1, T);
    rect(x, '#e0b030', ox + 3, oy, 1, T);
  }
  if (der) {
    rect(x, '#e0b030', ox + T - 1, oy, 1, T);
    rect(x, '#7a0f24', ox + T - 2, oy, 1, T);
    rect(x, '#e0b030', ox + T - 4, oy, 1, T);
  }
}

/** The pit (orchestra pit or chasm): dark depth, lighter near its lip, with a stain of beer or a glint of beams. */
function foso(x: CanvasRenderingContext2D, ox: number, oy: number, arriba: boolean, abajo: boolean, id: IdSala, c: number, r: number) {
  rect(x, '#150e1c', ox, oy, T, T);
  rect(x, '#1c1226', ox, oy + 2, T, T - 4);
  rect(x, '#0a0610', ox, oy + 6, T, 6);
  if (arriba) {
    // the lip: a wall of planks going down
    rect(x, '#3a2418', ox, oy, T, 5);
    rect(x, '#5a3a22', ox, oy, T, 1);
    rect(x, '#2a1810', ox, oy + 4, T, 1);
    for (let i = 0; i < 4; i++) rect(x, '#2a1810', ox + i * 4 + 3, oy + 1, 1, 3);
  }
  if (abajo) {
    rect(x, '#2a1810', ox, oy + T - 3, T, 3);
    rect(x, '#3a2418', ox, oy + T - 3, T, 1);
  }
  if (id === 'pat') {
    // beer: amber streaks and foam in the dark
    for (let i = 0; i < 3; i++) {
      const sx = ox + Math.floor(hash(c, r, 20 + i) * 12);
      const sy = oy + 6 + Math.floor(hash(c, r, 30 + i) * 6);
      rect(x, '#5a3a0a', sx, sy, 3, 1);
      rect(x, '#8a5a10', sx + 1, sy, 1, 1);
    }
    if (hash(c, r, 41) > 0.5) rect(x, '#f0e6c0', ox + 4 + Math.floor(hash(c, r, 8) * 8), oy + 9, 1, 1);
  } else {
    // the stalls far below: beams and a red glint
    rect(x, '#2a1810', ox + 3, oy + 8, 1, 6);
    rect(x, '#2a1810', ox + 11, oy + 7, 1, 7);
    if (hash(c, r, 6) > 0.7) rect(x, '#6a1a2c', ox + 6, oy + 10, 3, 1);
  }
}

/** A door tile: the stairs going up or down, the ladder or the dark of the next room. */
function escalera(x: CanvasRenderingContext2D, ox: number, oy: number, sube: boolean, lado: 'izq' | 'der' | 'mid') {
  rect(x, '#120c18', ox, oy, T, T);
  if (sube) {
    for (let i = 0; i < 5; i++) {
      rect(x, i % 2 ? '#6a5a7a' : '#8a7a9a', ox + 1, oy + 12 - i * 3, T - 2, 2);
      rect(x, '#2a2036', ox + 1, oy + 14 - i * 3, T - 2, 1);
    }
  } else {
    for (let i = 0; i < 5; i++) {
      rect(x, i % 2 ? '#8a7a9a' : '#a898ba', ox + 1, oy + 1 + i * 3, T - 2, 2);
      rect(x, '#2a2036', ox + 1, oy + 3 + i * 3, T - 2, 1);
    }
  }
  if (lado !== 'der') rect(x, '#5a3a22', ox, oy, 1, T);
  if (lado !== 'izq') rect(x, '#5a3a22', ox + T - 1, oy, 1, T);
}

function brillos(x: CanvasRenderingContext2D, luces: Luz[]) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const l of luces) {
    const f = l.fuerza ?? 1;
    for (let i = 0; i < 6; i++) {
      x.fillStyle = `rgba(${l.rgb[0]},${l.rgb[1]},${l.rgb[2]},${0.06 * f})`;
      const rx = l.rx * (1 - i * 0.14);
      const ry = l.ry * (1 - i * 0.14);
      for (let j = Math.floor(l.y - ry); j < Math.ceil(l.y + ry); j++) {
        const dy = (j + 0.5 - l.y) / ry;
        if (Math.abs(dy) > 1) continue;
        const half = rx * Math.sqrt(1 - dy * dy);
        x.fillRect(Math.round(l.x - half), j, Math.round(half * 2), 1);
      }
    }
  }
  x.restore();
}

const CALIDO: [number, number, number] = [255, 190, 90];
const FRIO: [number, number, number] = [150, 190, 255];

/** A sconce on the wall (a gold bracket with a flame and a glass tulip), 8×14. */
function aplique(x: CanvasRenderingContext2D, cx: number, y: number) {
  rect(x, '#8a6a10', cx - 1, y + 8, 3, 5);
  rect(x, '#e0b030', cx - 1, y + 8, 1, 5);
  rect(x, '#e0b030', cx - 3, y + 6, 7, 2);
  rect(x, '#f4ecd0', cx - 2, y + 2, 5, 5);
  rect(x, '#ffd84a', cx - 1, y + 1, 3, 4);
  rect(x, '#fff7c8', cx, y + 2, 1, 2);
  rect(x, 'rgba(255,214,110,0.25)', cx - 4, y, 9, 8);
}

/** Damask wallpaper tile of 16×16 (the face of a wall). */
function empapelado(x: CanvasRenderingContext2D, ox: number, oy: number, t: Tema, c: number, r: number) {
  rect(x, t.pared, ox, oy, T, T);
  const f = (c + r) % 2;
  // a damask motif: a small lozenge with four dots
  const cx = ox + 8;
  const cy = oy + 8;
  rect(x, t.paredL, cx, cy - 3, 1, 7);
  rect(x, t.paredL, cx - 2, cy - 1, 5, 3);
  rect(x, t.paredL, cx - 1, cy - 2, 3, 5);
  rect(x, t.paredO, cx - 3, cy, 1, 1);
  rect(x, t.paredO, cx + 3, cy, 1, 1);
  if (f) rect(x, t.paredO, ox, oy, T, 1);
  rect(x, t.paredO, ox, oy + T - 1, T, 1);
}

/** The foot of a wall: dark wood panelling with a gold line. */
function zocalo(x: CanvasRenderingContext2D, ox: number, oy: number) {
  rect(x, '#4a2a18', ox, oy + 8, T, 8);
  rect(x, '#6a3e22', ox, oy + 8, T, 1);
  rect(x, '#e0b030', ox, oy + 7, T, 1);
  rect(x, '#2a1810', ox, oy + 15, T, 1);
  rect(x, '#5a341c', ox + 2, oy + 10, 12, 5);
  rect(x, '#3a2010', ox + 2, oy + 10, 12, 1);
}

/** Paints a room: floor by tile, the wall faces and their decoration, the night grade and the lamps' light. */
function pintarSala(id: IdSala, f: string[], luces: Luz[], rot: Rotulos): HTMLCanvasElement {
  const t = TEMAS[id];
  const C = f[0].length;
  const R = f.length;
  const c = lienzo(C * T, R * T);
  const x = ctx(c);
  const en = (cc: number, rr: number) => f[rr]?.[cc];
  rect(x, OSCURO, 0, 0, C * T, R * T);

  // ---- floors
  for (let r = 0; r < R; r++) {
    for (let cc = 0; cc < C; cc++) {
      const ch = f[r][cc];
      const ox = cc * T;
      const oy = r * T;
      if (ch === '#') continue;
      if (ch === 'o') {
        const ar = en(cc, r - 1);
        foso(x, ox, oy, ar !== 'o' && ar !== 'c', en(cc, r + 1) !== 'o' && en(cc, r + 1) !== 'c', id, cc, r);
        continue;
      }
      if (ch === 'c') {
        foso(x, ox, oy, false, false, id, cc, r);
        continue;
      }
      if (ch === 'D') {
        escalera(x, ox, oy, r < R / 2, f[r][cc - 1] === 'D' ? 'der' : 'izq');
        continue;
      }
      if (ch === 'H') {
        tablones(x, ox, oy, t, cc, r);
        rect(x, '#120c18', ox + 1, oy + 1, 14, 14);
        rect(x, '#5a3a22', ox, oy, T, 1);
        rect(x, '#5a3a22', ox, oy + 15, T, 1);
        rect(x, '#5a3a22', ox, oy, 1, T);
        rect(x, '#5a3a22', ox + 15, oy, 1, T);
        for (let i = 0; i < 4; i++) {
          rect(x, '#c9975a', ox + 4, oy + 3 + i * 3, 8, 1);
          rect(x, '#8a5630', ox + 4, oy + 4 + i * 3, 8, 1);
        }
        rect(x, '#8a5630', ox + 3, oy + 1, 1, 14);
        rect(x, '#8a5630', ox + 12, oy + 1, 1, 14);
        continue;
      }
      if (id === 'ves' && ch !== ',') marmol(x, ox, oy, t, cc, r);
      else if (ch === ',') alfombra(x, ox, oy, en(cc - 1, r) !== ',', en(cc + 1, r) !== ',', cc, r);
      else tablones(x, ox, oy, t, cc, r);
    }
  }

  // ---- wall faces: up to three tiles above the floor, panelled at the foot
  const cara = new Set<string>();
  for (let cc = 0; cc < C; cc++) {
    let r = 0;
    while (r < R && f[r][cc] === '#') r++;
    // r is the first non-wall row of this column; the face is the (up to) three rows above it
    if (r === 0 || r >= R) continue;
    const alto = Math.min(3, r);
    for (let k = 0; k < alto; k++) {
      const rr = r - alto + k;
      const ox = cc * T;
      const oy = rr * T;
      cara.add(`${cc},${rr}`);
      empapelado(x, ox, oy, t, cc, rr);
      if (k === alto - 1) zocalo(x, ox, oy);
      if (k === 0) {
        rect(x, '#e0b030', ox, oy, T, 1);
        rect(x, t.paredO, ox, oy + 1, T, 2);
      }
    }
  }
  // the dark top of the other walls (the sides and the bottom): a lighter edge on the room's side
  for (let r = 0; r < R; r++) {
    for (let cc = 0; cc < C; cc++) {
      if (f[r][cc] !== '#' || cara.has(`${cc},${r}`)) continue;
      const ox = cc * T;
      const oy = r * T;
      const e = (dx: number, dy: number) => esFirme(en(cc + dx, r + dy));
      if (e(1, 0)) rect(x, '#2a1a32', ox + T - 3, oy, 3, T);
      if (e(-1, 0)) rect(x, '#2a1a32', ox, oy, 3, T);
      if (e(0, 1)) rect(x, '#2a1a32', ox, oy + T - 3, T, 3);
      if (e(0, -1)) rect(x, '#3a2418', ox, oy, T, 3);
    }
  }

  decorar(id, x, f, rot, luces);
  noche(c, t.tinte);
  brillos(x, luces);
  return c;
}

/** A framed poster on the wall: a painted card with a mask and the title in up to three lines, w×h. */
function cartel(x: CanvasRenderingContext2D, px0: number, py0: number, w: number, h: number, fondo: string, texto: string, col: string) {
  rect(x, '#3a2010', px0 - 1, py0 - 1, w + 2, h + 2);
  rect(x, '#c9975a', px0, py0, w, h);
  rect(x, fondo, px0 + 1, py0 + 1, w - 2, h - 2);
  rect(x, 'rgba(255,255,255,0.18)', px0 + 1, py0 + 1, w - 2, 1);
  const cx = px0 + Math.floor(w / 2);
  elipse(x, '#fff0b8', cx, py0 + 6, 3, 3.5);
  rect(x, '#2a1a30', cx - 2, py0 + 5, 1, 1);
  rect(x, '#2a1a30', cx + 1, py0 + 5, 1, 1);
  rect(x, '#8a2a2a', cx - 1, py0 + 8, 3, 1);
  partir(texto, w - 4).slice(0, 3).forEach((l, i) => escribir(x, l, cx - Math.floor(anchoTexto(l) / 2), py0 + 8 + i * 7, col));
}

function decorar(id: IdSala, x: CanvasRenderingContext2D, f: string[], rot: Rotulos, luces: Luz[]) {
  const C = f[0].length;
  if (id === 'ves') {
    // two posters, a big arch round the gold gate and lamps
    cartel(x, px(2) + 2, 12, 28, 28, '#2c3a78', rot.cartel1, '#fff0a8');
    cartel(x, px(12) + 2, 12, 28, 28, '#5a1a40', rot.cartel2, '#fff0a8');
    for (const c of [5, 10]) aplique(x, px(c) + 8, 14);
    // the arch of the gate
    rect(x, '#e0b030', px(7) - 3, 3, 38, 3);
    rect(x, '#8a6a10', px(7) - 3, 6, 38, 1);
    elipse(x, '#e0b030', px(8), 6, 14, 4);
    elipse(x, '#1a0a18', px(8), 8, 12, 4);
    rect(x, '#e0b030', px(7) - 3, 6, 3, 26);
    rect(x, '#e0b030', px(9) + 1, 6, 3, 26);
    rect(x, '#1a0a18', px(7), 8, 32, 24);
    luces.push({ x: px(5) + 8, y: 52, rx: 36, ry: 16, rgb: CALIDO, fuerza: 1.1 }, { x: px(10) + 8, y: 52, rx: 36, ry: 16, rgb: CALIDO, fuerza: 1.1 });
  } else if (id === 'pat') {
    // the stage front: a red curtain with gold fringe and the two masks, over the three rows
    const W = C * T;
    rect(x, '#2a0710', T, 0, W - 2 * T, 3 * T);
    for (let cc = 1; cc < C - 1; cc++) {
      const ox = cc * T;
      for (let i = 0; i < T; i++) {
        const pliegue = Math.sin((cc * T + i) / 3.1);
        rect(x, pliegue > 0.35 ? '#c8384e' : pliegue > -0.3 ? '#a8243a' : '#7a1428', ox + i, 8, 1, 33);
      }
    }
    // gold valance
    rect(x, '#e0b030', T, 0, W - 2 * T, 8);
    rect(x, '#fff0a8', T, 0, W - 2 * T, 1);
    rect(x, '#8a6a10', T, 7, W - 2 * T, 1);
    for (let i = T; i < W - T; i += 5) {
      rect(x, '#e0b030', i, 8, 2, 3);
      rect(x, '#fff0a8', i, 8, 1, 2);
    }
    // gathered curtain: drawn back at both sides
    for (const [a, b] of [[T, 5 * T], [W - 6 * T, W - T]]) {
      for (let i = a; i < b; i += 3) rect(x, 'rgba(0,0,0,0.18)', i, 9, 1, 32);
    }
    // masks on the valance
    for (const mx of [3 * T, W - 3 * T]) {
      elipse(x, '#fff0b8', mx, 14, 5, 6);
      rect(x, '#2a1a30', mx - 3, 12, 2, 2);
      rect(x, '#2a1a30', mx + 1, 12, 2, 2);
      rect(x, '#8a2a2a', mx - 2, 17, 5, 1);
    }
    // the footlights' edge
    for (let cc = 1; cc < C - 1; cc++) {
      if (f[2][cc] === '#') {
        rect(x, '#5a3a22', cc * T, 41, T, 4);
        rect(x, '#e0b030', cc * T, 41, T, 1);
      }
    }
    luces.push({ x: 3 * T, y: 4 * T, rx: 44, ry: 18, rgb: CALIDO, fuerza: 0.9 }, { x: 14 * T, y: 4 * T, rx: 44, ry: 18, rgb: CALIDO, fuerza: 0.9 });
    luces.push({ x: 9 * T, y: 13 * T + 8, rx: 60, ry: 22, rgb: FRIO, fuerza: 0.45 });
  } else if (id === 'pal') {
    // the boxes' red drapes on the back wall and a lamp
    for (const c of [3, 9, 13]) {
      rect(x, '#e0b030', px(c), 6, 28, 3);
      rect(x, '#a8243a', px(c) + 1, 9, 26, 30);
      for (let i = 0; i < 26; i += 3) rect(x, '#7a1428', px(c) + 1 + i, 9, 1, 30);
      rect(x, '#e0b030', px(c) + 12, 9, 4, 3);
    }
    for (const c of [6, 11]) aplique(x, px(c) + 8, 12);
    luces.push({ x: px(6) + 8, y: 52, rx: 40, ry: 16, rgb: CALIDO, fuerza: 1 }, { x: px(11) + 8, y: 52, rx: 40, ry: 16, rgb: CALIDO, fuerza: 1 });
    // the carpet of the box
    // the stairs' lamps
    luces.push({ x: px(2) + 16, y: px(10) + 6, rx: 40, ry: 14, rgb: CALIDO, fuerza: 0.8 });
  } else if (id === 'bam') {
    // dark planks of the flies with beams and ropes going up
    for (let cc = 1; cc < C - 1; cc++) {
      rect(x, '#3e2e1c', cc * T, 0, 1, 3 * T);
      if (cc % 4 === 0) rect(x, '#2a1c0e', cc * T, 0, 4, 3 * T);
    }
    rect(x, '#2a1c0e', 0, 3 * T - 8, C * T, 3);
    rect(x, '#7a6244', 0, 3 * T - 8, C * T, 1);
    luces.push({ x: px(2), y: px(10), rx: 30, ry: 14, rgb: CALIDO, fuerza: 0.5 });
  } else if (id === 'fos') {
    // brick wall of the cellar under the stage
    for (let r = 0; r < 3; r++) {
      for (let cc = 1; cc < C - 1; cc++) {
        if (f[r][cc] !== '#') continue;
        for (let j = 0; j < 2; j++) {
          const off = (r * 2 + j) % 2 ? 0 : 8;
          rect(x, '#3a3446', cc * T, r * T + j * 8 + 7, T, 1);
          for (let i = 0; i < 2; i++) rect(x, '#3a3446', cc * T + ((off + i * 8) % T), r * T + j * 8, 1, 7);
        }
      }
    }
    luces.push({ x: px(4), y: px(5), rx: 50, ry: 22, rgb: FRIO, fuerza: 0.6 }, { x: px(11), y: px(9), rx: 60, ry: 24, rgb: CALIDO, fuerza: 0.8 });
    aplique(x, px(3) + 8, 20);
    aplique(x, px(12) + 8, 20);
  } else if (id === 'esc') {
    // the backdrop: a night sky painted on the wall and a red curtain pulled to both sides
    const W = C * T;
    rect(x, '#1c2a68', T, 0, W - 2 * T, 3 * T);
    const r = azar(7);
    for (let i = 0; i < 26; i++) rect(x, '#ffffff', T + Math.floor(r() * (W - 2 * T)), Math.floor(r() * 30), 1, 1);
    elipse(x, '#ffe9a0', W / 2, 18, 9, 9);
    elipse(x, '#1c2a68', W / 2 + 3, 16, 8, 8);
    for (const [a, b] of [[T, 4 * T], [W - 4 * T, W - T]]) {
      for (let i = a; i < b; i++) {
        const pliegue = Math.sin(i / 2.8);
        rect(x, pliegue > 0.3 ? '#c8384e' : pliegue > -0.3 ? '#a8243a' : '#7a1428', i, 0, 1, 3 * T);
      }
    }
    rect(x, '#e0b030', T, 0, W - 2 * T, 5);
    rect(x, '#fff0a8', T, 0, W - 2 * T, 1);
    // a spotlight circle on the floor
    luces.push({ x: W / 2, y: 6 * T, rx: 70, ry: 34, rgb: [255, 236, 170], fuerza: 1.5 });
    luces.push({ x: 2 * T, y: 5 * T, rx: 30, ry: 18, rgb: CALIDO, fuerza: 0.6 }, { x: W - 2 * T, y: 5 * T, rx: 30, ry: 18, rgb: CALIDO, fuerza: 0.6 });
  }
}

// ---------------------------------------------------------------- the whole Teatro

const sala0 = (id: IdSala, filas: string[]): Omit<SalaTeatro, 'suelo' | 'objetos' | 'luces' | 'lecturas' | 'brillo'> => ({
  id,
  c: filas[0].length,
  r: filas.length,
  w: filas[0].length * T,
  h: filas.length * T,
  filas,
  puertas: [],
  llegadas: {},
  seguro: false,
  estatuas: [],
  marcas: [],
  rocas: [],
  velas: [],
  hojas: [],
  pensadores: [],
  apuntadores: [],
  cofres: [],
  chupitos: [],
  lamparas: [],
});

/** The Teatro, built once. `rot` has the words painted into the art. */
export function teatro(rot: Rotulos): MundoTeatro {
  return una(`teatro.${rot.taquilla}`, () => construir(rot));
}

function construir(rot: Rotulos): MundoTeatro {
  const objs: Record<IdSala, Objeto[]> = { ves: [], pat: [], pal: [], bam: [], fos: [], esc: [] };
  const luces: Record<IdSala, Luz[]> = { ves: [], pat: [], pal: [], bam: [], fos: [], esc: [] };
  const lect: Record<IdSala, Lectura[]> = { ves: [], pat: [], pal: [], bam: [], fos: [], esc: [] };
  const poner = (s: IdSala, id: string, x: number, y: number, img: HTMLCanvasElement, base = y + img.height) => {
    objs[s].push({ id, x, y, frames: [img], base });
  };
  const S = {} as Record<IdSala, ReturnType<typeof sala0>>;
  for (const id of SALAS) S[id] = sala0(id, FILAS[id]);

  // ---- vestíbulo
  poner('ves', 'taquilla', px(1), px(5) - 52, taquilla(rot.taquilla));
  poner('ves', 'columna.1', px(5), px(6) - 46, columna());
  poner('ves', 'columna.2', px(10), px(7) - 46, columna());
  lect.ves.push({ rect: { x: px(1), y: px(5), w: 3 * T, h: 12 }, clave: 'lectura.taquilla', quien: null });
  S.ves.puertas = [
    { c0: 7, r0: 2, c1: 8, r1: 2, a: 'pat', abre: 'estatuas' },
    { c0: 7, r0: 11, c1: 8, r1: 11, a: 'camino' },
  ];
  S.ves.llegadas = { camino: { x: 8 * T, y: 10 * T + 6, dir: 'N' }, pat: { x: 8 * T, y: 3 * T + 12, dir: 'S' } };
  S.ves.seguro = true;
  S.ves.estatuas = [
    { id: 'comedia', tipo: 'comedia', c: 5, r: 7 },
    { id: 'tragedia', tipo: 'tragedia', c: 11, r: 5 },
  ];
  S.ves.marcas = [{ c: 6, r: 4 }, { c: 9, r: 4 }];
  S.ves.pensadores = [{ id: 'acomodador', q: 'acomodador', x: px(12) + 8, y: px(9) + 12 }];
  S.ves.chupitos = [{ id: 'ves.chupito', x: px(14) + 8, y: px(10) + 8 }];
  S.ves.lamparas = [{ x: px(5) + 8, y: 20 }, { x: px(10) + 8, y: 20 }];

  // ---- patio de butacas
  for (let j = 0; j < 4; j++) {
    poner('pat', `butacas.i.${j}`, px(2), px(9 + j) - 4, butacas(7), px(10 + j));
    poner('pat', `butacas.d.${j}`, px(11), px(9 + j) - 4, butacas(7), px(10 + j));
  }
  S.pat.puertas = [
    { c0: 9, r0: 14, c1: 10, r1: 14, a: 'ves' },
    { c0: 17, r0: 2, c1: 18, r1: 2, a: 'pal' },
  ];
  S.pat.llegadas = { ves: { x: 10 * T - 8 + 8, y: 13 * T + 8, dir: 'N' }, pal: { x: 18 * T, y: 3 * T + 12, dir: 'S' } };
  S.pat.apuntadores = [{ id: 'psst', x: px(4) + 8, y: px(4) + 12, dueno: 'fran' }];
  S.pat.chupitos = [{ id: 'pat.chupito', x: px(18) + 8, y: px(12) + 8 }];
  S.pat.lamparas = [];
  lect.pat.push({ rect: { x: px(8), y: px(8) - 2, w: 3 * T, h: 12 }, clave: 'lectura.foso', quien: null });

  // ---- palcos
  S.pal.puertas = [
    { c0: 2, r0: 11, c1: 3, r1: 11, a: 'pat' },
    { c0: 17, r0: 2, c1: 18, r1: 2, a: 'bam' },
  ];
  S.pal.llegadas = { pat: { x: 3 * T, y: 10 * T + 6, dir: 'N' }, bam: { x: 18 * T, y: 3 * T + 12, dir: 'S' } };
  S.pal.rocas = [
    { id: 'roca.puente', c: 7, r: 7, c2: 9, r2: 7 },
    { id: 'roca.palco', c: 14, r: 5, c2: 12, r2: 9 },
  ];
  S.pal.apuntadores = [{ id: 'ejem', x: px(13) + 8, y: px(3) + 14, dueno: 'chuchi' }];
  S.pal.cofres = [{ id: 'pal.cofre', x: px(15) + 8, y: px(3) + 16, monedas: 60 }];
  lect.pal.push({ rect: { x: px(4), y: px(7) - 2, w: 2 * T, h: 14 }, clave: 'lectura.puente', quien: null });

  // ---- bambalinas
  S.bam.puertas = [
    { c0: 2, r0: 13, c1: 3, r1: 13, a: 'pal' },
    { c0: 9, r0: 3, c1: 9, r1: 3, a: 'fos' },
  ];
  S.bam.llegadas = { pal: { x: 3 * T, y: 12 * T + 8, dir: 'N' }, fos: { x: 9 * T + 8, y: 4 * T + 12, dir: 'S' } };
  S.bam.velas = [
    { id: 'vela.1', c: 5, r: 11 },
    { id: 'vela.2', c: 9, r: 11 },
    { id: 'vela.3', c: 14, r: 11 },
  ];
  S.bam.hojas = [
    { id: 'hojas.1', c: 11, r: 11, w: 1, h: 2 },
    { id: 'hojas.2', c: 17, r: 7, w: 2, h: 1 },
  ];
  S.bam.apuntadores = [{ id: 'shhh', x: px(18) + 8, y: px(4) + 14, dueno: 'guille' }];
  S.bam.chupitos = [{ id: 'bam.chupito', x: px(1) + 8, y: px(5) + 8 }];
  poner('bam', 'cartel.aviso', px(3) - 2, px(12) - 22, una('tt.cartelAviso', () => cartelAviso()), px(12));
  lect.bam.push({ rect: { x: px(3) - 2, y: px(12) - 2, w: 20, h: 12 }, clave: 'lectura.aviso', quien: null });
  for (const [c, r, i] of [[2, 3, 0], [3, 7, 1], [18, 3, 2]] as const) poner('bam', `saco.${i}`, px(c) + 2, px(r) - 40 + 2, saco(), px(r + 1));
  for (const c of [1, 18]) poner('bam', `polea.${c}`, px(c) + 3, 8, polea(), px(3) - 2);
  poner('bam', 'bastidor.0', px(1), px(4) - 6, bastidor(0), px(6));
  poner('bam', 'bastidor.1', px(1) + 18, px(7) - 4, bastidor(1), px(9));

  // ---- foso
  S.fos.puertas = [
    { c0: 13, r0: 11, c1: 14, r1: 11, a: 'bam' },
    { c0: 7, r0: 2, c1: 8, r1: 2, a: 'esc', abre: 'chat' },
  ];
  S.fos.llegadas = { bam: { x: 14 * T, y: 10 * T + 8, dir: 'N' }, esc: { x: 8 * T, y: 3 * T + 12, dir: 'S' } };
  S.fos.pensadores = [{ id: 'tramoyista', q: 'tramoyista', x: px(4) + 8, y: px(6) + 12 }];
  S.fos.cofres = [{ id: 'fos.cofre', x: px(13) + 8, y: px(3) + 16, objeto: 'turron', cantidad: 3 }];
  S.fos.chupitos = [{ id: 'fos.chupito', x: px(1) + 8, y: px(10) + 8 }];
  for (const [c, r] of [[2, 4], [12, 4]] as const) {
    poner('fos', `barril.${c}`, px(c) + 1, px(r + 1) - 18, barril(), px(r + 1));
    poner('fos', `barril.${c + 1}`, px(c + 1) + 1, px(r + 1) - 18, barril(), px(r + 1));
  }
  for (const [c, r] of [[2, 8], [3, 8]] as const) poner('fos', `cajon.${c}`, px(c), px(r + 1) - 18, cajon(), px(r + 1));
  for (const [c, r] of [[5, 6], [11, 6]] as const) poner('fos', `viga.${c}`, px(c), px(r + 1) - 46, columnaMadera(), px(r + 1));
  S.fos.lamparas = [{ x: px(3) + 8, y: 22 }, { x: px(12) + 8, y: 22 }];

  // ---- escenario
  S.esc.puertas = [{ c0: 7, r0: 9, c1: 8, r1: 9, a: 'fos' }];
  S.esc.llegadas = { fos: { x: 8 * T, y: 8 * T + 6, dir: 'N' } };
  S.esc.seguro = true;

  const salas = {} as Record<IdSala, SalaTeatro>;
  for (const id of SALAS) {
    const base = S[id];
    const lz = luces[id];
    const suelo = pintarSala(id, base.filas, lz, rot);
    salas[id] = {
      ...base,
      suelo,
      objetos: objs[id].sort((a, b) => a.base - b.base),
      luces: lz,
      lecturas: lect[id],
      brillo: id === 'bam' ? brilloTablas() : null,
    };
  }
  return { salas };
}

/** A wooden post (a beam under the stage), 16×46. */
function columnaMadera(): HTMLCanvasElement {
  return una('tt.viga', () => {
    const c = lienzo(16, 46);
    const x = ctx(c);
    rect(x, '#3a2010', 3, 0, 10, 46);
    rect(x, '#8a5630', 4, 0, 8, 44);
    rect(x, '#c9975a', 4, 0, 2, 44);
    rect(x, '#5a3418', 10, 0, 2, 44);
    for (const py of [6, 16, 30]) rect(x, '#5a3418', 4, py, 8, 1);
    rect(x, '#3a2010', 1, 42, 14, 4);
    rect(x, '#5a3418', 1, 42, 14, 1);
    rect(x, '#3a2010', 2, 0, 12, 3);
    noche(c, TINTE_OBJETO);
    return c;
  });
}

/** The warning sign of the bambalinas, 20×22. */
function cartelAviso(): HTMLCanvasElement {
  const c = lienzo(20, 24);
  const x = ctx(c);
  rect(x, '#6a4428', 9, 14, 3, 9);
  rect(x, '#85582f', 1, 2, 18, 13);
  rect(x, '#f0e6b0', 2, 3, 16, 11);
  rect(x, '#c9a85a', 2, 13, 16, 1);
  // a flame crossed out: the footlights
  rect(x, '#d84a2a', 8, 5, 4, 6);
  rect(x, '#ffd84a', 9, 7, 2, 4);
  rect(x, '#b3382c', 4, 4, 1, 9);
  rect(x, '#b3382c', 15, 4, 1, 9);
  noche(c, TINTE_OBJETO);
  return c;
}

/** The glowing footprints on the safe planks: a green halo and two prints, painted once (transparent). */
function brilloTablas(): HTMLCanvasElement {
  const c = lienzo(20 * T, 14 * T);
  const x = ctx(c);
  for (const [cc, rr] of CAMINO_TABLAS) {
    const ox = cc * T;
    const oy = rr * T;
    rect(x, 'rgba(120,255,160,0.16)', ox + 1, oy + 1, 14, 14);
    rect(x, 'rgba(120,255,160,0.22)', ox + 3, oy + 3, 10, 10);
    // two footprints
    for (const [fx, fy] of [[4, 3], [9, 8]]) {
      rect(x, 'rgba(200,255,220,0.95)', ox + fx, oy + fy, 3, 4);
      rect(x, 'rgba(200,255,220,0.95)', ox + fx, oy + fy + 5, 3, 1);
      rect(x, 'rgba(240,255,245,1)', ox + fx + 1, oy + fy + 1, 1, 2);
    }
  }
  return c;
}

