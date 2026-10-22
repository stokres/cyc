// The road to the theatre: the Alicante countryside at night, clear and moonlit (the fight's background is the
// same place): orange groves, an irrigation channel (acequia) with a bridge, almond trees round a farmhouse,
// palms and prickly pears on the last stretch and the theatre's front at the end. Side paths lead to a chest, to
// a lost shot glass and to the clearing where the wild prompter «Chist» waits. Like the village (mapas.ts) it
// is built once and the frame loop only reads it.
import { aguaFrames, arbol, casa, cartel, sueloDe, T, type Baldosa, type Luz } from './arte';
import { almendro, canas, chumbera, farolillo, matorral, naranjo, palmera, roca, teatro } from './artecampo';
import type { MundoBase, Objeto, Rect, Lectura } from './mapas';
import { una } from './pixel';

export const ANCHO_CAMINO = 80;
export const ALTO_CAMINO = 28;

/** A stretch of the road with its own wild groups (the fights are picked from them). */
export interface ZonaEncuentro {
  /** Tiles, inclusive. */
  c0: number;
  c1: number;
  /** Rows, inclusive (all of them when missing). */
  r0?: number;
  r1?: number;
  grupos: string[][];
  /** No fights here. */
  seguro?: boolean;
}

export interface Cofre {
  id: string;
  /** Feet of the chest (its bottom centre). */
  x: number;
  y: number;
  objeto?: string;
  cantidad?: number;
  monedas?: number;
}

export interface Escondite {
  id: string;
  x: number;
  y: number;
  objeto: string;
}

export interface MundoCamino extends MundoBase {
  /** Where Pablo comes in from the village (feet). */
  inicio: { x: number; y: number };
  /** The way back to the village: walk into it. */
  salidaOeste: Rect;
  /** The theatre's door: the end of the slice. */
  puertaTeatro: Rect;
  /** The wild prompter (feet). */
  chist: { x: number; y: number };
  cofres: Cofre[];
  escondites: Escondite[];
  zonas: ZonaEncuentro[];
  /** Fireflies: x, y, phase. */
  luciernagas: Array<[number, number, number]>;
}

const hash = (a: number, b: number, s = 0) => {
  let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const rr = (g: Baldosa[][], x0: number, y0: number, x1: number, y1: number, k: Baldosa) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = k;
};

/** The road, built once. `letrero` is the name on the theatre's marquee (it is painted into the sprite). */
export function camino(letrero: string): MundoCamino {
  return una('mundo.camino', () => construir(letrero));
}

function construir(letrero: string): MundoCamino {
  const W = ANCHO_CAMINO;
  const H = ALTO_CAMINO;
  const g: Baldosa[][] = Array.from({ length: H }, () => Array<Baldosa>(W).fill('g'));
  // the forest all round, with the road coming in on the left
  rr(g, 0, 0, W - 1, 1, 'x');
  rr(g, 0, H - 2, W - 1, H - 1, 'x');
  rr(g, 0, 0, 1, H - 1, 'x');
  rr(g, W - 2, 0, W - 1, H - 1, 'x');
  // the main road, the acequia and its bridge
  rr(g, 0, 12, 23, 13, 'd');
  rr(g, 24, 2, 25, H - 3, 'w');
  rr(g, 24, 12, 25, 13, 'b');
  rr(g, 26, 12, 47, 13, 'd');
  rr(g, 46, 13, 51, 14, 'd');
  rr(g, 50, 14, 63, 15, 'd');
  // the little plaza in front of the theatre
  rr(g, 60, 15, 77, 19, 'p');
  rr(g, 60, 14, 77, 14, 'p');
  // the path south to the chest's clearing
  rr(g, 14, 14, 15, 18, 'd');
  rr(g, 9, 18, 20, 18, 'h');
  rr(g, 14, 18, 15, 18, 'd');
  rr(g, 9, 19, 9, 24, 'h');
  rr(g, 20, 19, 20, 24, 'h');
  rr(g, 9, 24, 20, 24, 'h');
  // the path north to the prompter's clearing
  rr(g, 36, 8, 37, 11, 'd');
  rr(g, 31, 1, 42, 2, 'h');
  rr(g, 31, 3, 31, 7, 'h');
  rr(g, 42, 3, 42, 7, 'h');
  rr(g, 31, 7, 42, 7, 'h');
  rr(g, 36, 7, 37, 7, 'd');
  // the hidden nook with a lost shot glass: a one-tile path between hedges
  rr(g, 58, 9, 58, 13, 'd');
  rr(g, 57, 9, 57, 13, 'h');
  rr(g, 59, 9, 59, 13, 'h');
  rr(g, 53, 4, 64, 4, 'h');
  rr(g, 53, 5, 53, 8, 'h');
  rr(g, 64, 5, 64, 8, 'h');
  rr(g, 53, 9, 57, 9, 'h');
  rr(g, 59, 9, 64, 9, 'h');
  // farm fences along the road near the farmhouse
  rr(g, 27, 10, 38, 10, 'f');
  rr(g, 27, 15, 44, 15, 'f');
  rr(g, 18, 14, 18, 16, 'f');

  const rects: Rect[] = [];
  const objetos: Objeto[] = [];
  const lecturas: Lectura[] = [];
  const luces: Luz[] = [];
  const calido: [number, number, number] = [255, 190, 90];
  const frio: [number, number, number] = [150, 200, 255];
  const poner = (id: string, x: number, y: number, img: HTMLCanvasElement, base = y + img.height) => {
    objetos.push({ id, x, y, frames: [img], base });
  };

  // Free ground for a tree or a rock: tiles of plain grass, away from every path and clearing.
  const libre = (c: number, r: number, ancho = 2, alto = 2, margen = 1): boolean => {
    for (let y = r - alto + 1 - margen; y <= r + margen; y++) {
      for (let x = c - margen; x < c + ancho + margen; x++) {
        const k = g[y]?.[x];
        if (k !== 'g') return false;
      }
    }
    return true;
  };

  const arbolEn = (id: string, c: number, r: number, img: HTMLCanvasElement, ancho = 32) => {
    // the base of the trunk sits at the bottom of tile row `r`
    const px = c * T + (T * 2 - ancho) / 2 + Math.round((hash(c, r, 3) - 0.5) * 6);
    const base = (r + 1) * T;
    poner(id, px, base - img.height + 1, img, base);
    rects.push({ x: px + ancho / 2 - 6, y: base - 8, w: 12, h: 7 });
  };

  // --- the forest round the map (non-solid decoration over the solid ring)
  for (let k = 0; k < W / 2 + 1; k++) {
    poner(`bosqueN.${k}`, k * 32 - 6 + (k % 2) * 6, -10 - (k % 2) * 8, arbol(k % 3));
    poner(`bosqueS.${k}`, k * 32 - 8 + (k % 2) * 8, H * T - 46 + (k % 2) * 4, arbol((k + 2) % 3));
  }
  for (let k = 0; k < H / 2 + 1; k++) {
    if (k * 32 > 12 * T - 20 && k * 32 < 14 * T + 4) continue; // the road comes in here
    poner(`bosqueO.${k}`, -10 + (k % 2) * 10, k * 32 - 16, arbol((k + 1) % 3));
    poner(`bosqueE.${k}`, W * T - 24 - (k % 2) * 8, k * 32 - 16, arbol(k % 3));
  }

  // --- the groves: oranges on the first stretch, almonds in the middle, palms at the end
  const huerto = (c0: number, c1: number, r0: number, r1: number, f: () => HTMLCanvasElement, tag: string, densidad = 0.85, ancho = 32, pasoC = 2, pasoR = 2) => {
    for (let r = r0; r <= r1; r += pasoR) {
      for (let c = c0 + ((r / pasoR) % 2) * Math.floor(pasoC / 2); c <= c1; c += pasoC) {
        if (hash(c, r, 9) > densidad) continue;
        if (!libre(c, r, 2, 2, 1)) continue;
        arbolEn(`${tag}.${c}.${r}`, c, r, f(), ancho);
      }
    }
  };
  huerto(3, 22, 3, 10, naranjo, 'naranjo');
  huerto(3, 22, 16, 25, naranjo, 'naranjo');
  huerto(27, 47, 3, 9, almendro, 'almendro', 0.8);
  huerto(27, 47, 17, 25, almendro, 'almendro', 0.8);
  huerto(49, 76, 3, 9, palmera, 'palmera', 0.6, 36, 3, 3);
  huerto(49, 76, 20, 25, palmera, 'palmera', 0.6, 36, 3, 3);

  // --- small things scattered on the grass
  for (let r = 3; r < H - 3; r++) {
    for (let c = 3; c < W - 3; c++) {
      if (!libre(c, r, 1, 1, 1)) continue;
      const h = hash(c, r, 21);
      if (h < 0.018) {
        poner(`roca.${c}.${r}`, c * T - 1, (r + 1) * T - 13, roca(), (r + 1) * T);
        rects.push({ x: c * T + 1, y: (r + 1) * T - 6, w: 12, h: 5 });
      } else if (h < 0.034) {
        poner(`matorral.${c}.${r}`, c * T - 2, (r + 1) * T - 14, matorral(), (r + 1) * T);
        rects.push({ x: c * T + 1, y: (r + 1) * T - 6, w: 12, h: 5 });
      } else if (h < 0.05 && c > 46) {
        poner(`chumbera.${c}.${r}`, c * T - 3, (r + 1) * T - 24, chumbera(), (r + 1) * T);
        rects.push({ x: c * T + 1, y: (r + 1) * T - 6, w: 11, h: 5 });
      }
    }
  }
  // reeds along the channel
  for (let r = 3; r < H - 3; r += 2) {
    if (r >= 11 && r <= 14) continue;
    poner(`cana.o.${r}`, 22 * T + 4, r * T - 6, canas(), r * T + 20);
    poner(`cana.e.${r}`, 26 * T + 2, r * T - 4 + (r % 4), canas(), r * T + 20);
  }

  // --- the signpost where the road begins and the farmhouse
  poner('cartel.inicio', 6 * T, 11 * T - 12, cartel(), 11 * T + 14);
  rects.push({ x: 6 * T + 6, y: 11 * T + 4, w: 5, h: 5 });
  lecturas.push({ rect: { x: 5 * T, y: 11 * T + 10, w: 3 * T, h: 12 }, clave: 'lectura.cartelInicio', quien: null });
  const granja = casa({ w: 5, techo: '#b4553a', puerta: 2, pared: '#efe6d0', chimenea: true, ventanas: true });
  poner('granja', 41 * T, 7 * T, granja);
  rects.push({ x: 41 * T, y: 7 * T, w: 5 * T, h: 80 });
  lecturas.push({ rect: { x: 41 * T + 2 * T - 4, y: 7 * T + 80, w: T + 8, h: 14 }, clave: 'lectura.granja', quien: null });
  luces.push({ x: 41 * T + 2 * T + 8, y: 7 * T + 84, rx: 30, ry: 11, rgb: calido, fuerza: 1 });

  // --- the theatre and its plaza
  const FACHADA = { w: 144, h: 110 };
  const tx = 69 * T - 8;
  const ty = 15 * T - FACHADA.h + 6;
  poner('teatro', tx, ty, teatro(letrero), 15 * T + 6);
  rects.push({ x: tx + 6, y: ty + 40, w: FACHADA.w - 12, h: 62 });
  const puertaX = tx + FACHADA.w / 2;
  for (const dx of [-62, 62]) {
    poner(`farolillo.${dx}`, puertaX + dx - 7, 15 * T - 6, farolillo(), 15 * T + 30);
    luces.push({ x: puertaX + dx, y: 15 * T + 26, rx: 34, ry: 14, rgb: calido, fuerza: 1 });
  }
  luces.push({ x: puertaX, y: 15 * T + 14, rx: 60, ry: 22, rgb: calido, fuerza: 1.4 });
  luces.push({ x: 36 * T + 8, y: 5 * T, rx: 90, ry: 40, rgb: frio, fuerza: 0.9 });
  luces.push({ x: 58 * T + 8, y: 6 * T, rx: 60, ry: 26, rgb: frio, fuerza: 0.7 });
  luces.push({ x: 14 * T + 16, y: 21 * T, rx: 60, ry: 26, rgb: frio, fuerza: 0.7 });
  luces.push({ x: 12 * T, y: 13 * T, rx: 80, ry: 24, rgb: frio, fuerza: 0.5 });
  luces.push({ x: 44 * T, y: 13 * T, rx: 80, ry: 24, rgb: frio, fuerza: 0.5 });

  const suelo = sueloDe(g, luces);
  const agua = aguaFrames(g);
  const brillos: Array<[number, number, number]> = [];
  for (let ty2 = 2; ty2 < H - 2; ty2++) for (let k = 0; k < 2; k++) brillos.push([24 * T + 2 + ((ty2 * 7 + k * 13) % 26), ty2 * T + 2 + ((ty2 * 5 + k * 9) % 12), ((ty2 * 31 + k * 17) % 100) / 100]);

  const luciernagas: Array<[number, number, number]> = [];
  for (let i = 0; i < 26; i++) {
    const c = 3 + Math.floor(hash(i, 1, 5) * (W - 8));
    const r = 3 + Math.floor(hash(i, 2, 5) * (H - 8));
    if (g[r][c] !== 'g') continue;
    luciernagas.push([c * T + 8, r * T + 8, hash(i, 3, 5) * 6.28]);
  }

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
    lecturas,
    inicio: { x: 3 * T, y: 13 * T },
    salidaOeste: { x: 0, y: 12 * T, w: 2 * T, h: 2 * T },
    puertaTeatro: { x: puertaX - 14, y: 15 * T + 2, w: 28, h: 14 },
    chist: { x: 36 * T + 16, y: 5 * T + 8 },
    cofres: [
      { id: 'sur', x: 14 * T + 16, y: 22 * T, objeto: 'turron', cantidad: 2 },
      { id: 'norte', x: 33 * T + 8, y: 5 * T, monedas: 45 },
    ],
    escondites: [{ id: 'chupito', x: 60 * T + 8, y: 7 * T + 8, objeto: 'chupito' }],
    zonas: [
      // the clearings of the prompter and of the shot glass: nothing wild comes in
      { c0: 31, c1: 42, r0: 0, r1: 9, grupos: [], seguro: true },
      { c0: 53, c1: 64, r0: 3, r1: 13, grupos: [], seguro: true },
      { c0: 0, c1: 5, grupos: [], seguro: true },
      { c0: 6, c1: 23, grupos: [['petardo', 'mosquito'], ['mosquito', 'mosquito'], ['petardo', 'petardo'], ['mosquito', 'petardo', 'mosquito']] },
      { c0: 24, c1: 25, grupos: [], seguro: true },
      { c0: 26, c1: 48, grupos: [['movil', 'petardo'], ['spoiler', 'mosquito', 'mosquito'], ['movil', 'spoiler'], ['petardo', 'movil', 'mosquito']] },
      { c0: 49, c1: 59, grupos: [['critico', 'spoiler'], ['movil', 'spoiler', 'petardo'], ['traca', 'mosquito2'], ['critico', 'movil']] },
      { c0: 60, c1: 79, grupos: [], seguro: true },
    ],
    luciernagas,
  };
}
