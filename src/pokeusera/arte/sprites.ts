// PokéUsera · Edición Jarra: all the pixel art, baked once into cached canvases.
// - spriteFrente / spriteEspalda: the 20 useritos at 32×32.
// - entrenador / icono: the four friends (32×40 full body, 8×8 face).
// - logo: the title logo.
import type { EntrenadorId } from '../tipos';
import { Lienzo } from './pixel';
import { USERITOS } from './useritos';
import { ENTRENADORES_ARTE } from './entrenadores';
import { hornearLogo } from './logo';

const frentes = new Map<string, HTMLCanvasElement>();
const espaldas = new Map<string, HTMLCanvasElement>();
const entrenadores = new Map<EntrenadorId, HTMLCanvasElement>();
const iconos = new Map<EntrenadorId, HTMLCanvasElement>();
let logoCache: HTMLCanvasElement | null = null;

/** The ids of the useritos that have a drawing, in dex order. */
export const IDS_USERITOS: readonly string[] = [
  'draguserin', 'goudazard', 'aceitun', 'cierzon', 'turroncho', 'tocinon', 'roscochoco', 'espumarro', 'cajonazo', 'lentejasur',
  'tragaperras', 'turito', 'resacon', 'evoscar', 'chupitochu', 'caravaner', 'camioner', 'criaturitah', 'ego-ego', 'kbronero',
];

function dibujo(id: string) {
  return USERITOS[id] ?? USERITOS.turito ?? Object.values(USERITOS)[0];
}

/** Front view, 32×32, transparent background. */
export function spriteFrente(id: string): HTMLCanvasElement {
  let c = frentes.get(id);
  if (!c) {
    const d = dibujo(id);
    const L = new Lienzo(32, 32, false);
    d.dibujar(L);
    c = L.hornear(d.paleta);
    frentes.set(id, c);
  }
  return c;
}

/** Back view, 32×32: the front without its face, mirrored, halved to 16×16 and doubled back (chunky, like the originals). */
export function spriteEspalda(id: string): HTMLCanvasElement {
  let c = espaldas.get(id);
  if (!c) {
    const d = dibujo(id);
    const L = new Lienzo(32, 32, true);
    d.dibujar(L);
    L.voltear().engordar();
    c = L.hornear(d.paleta);
    espaldas.set(id, c);
  }
  return c;
}

/** Full-body trainer, 32×40. */
export function entrenador(id: EntrenadorId): HTMLCanvasElement {
  let c = entrenadores.get(id);
  if (!c) {
    const d = ENTRENADORES_ARTE[id];
    const L = new Lienzo(32, 40);
    d.cuerpo(L);
    c = L.hornear(d.paleta);
    entrenadores.set(id, c);
  }
  return c;
}

/** 8×8 face icon of a trainer. */
export function icono(id: EntrenadorId): HTMLCanvasElement {
  let c = iconos.get(id);
  if (!c) {
    const d = ENTRENADORES_ARTE[id];
    const L = new Lienzo(8, 8);
    d.icono(L);
    c = L.hornear(d.paleta);
    iconos.set(id, c);
  }
  return c;
}

/** The title logo (160×64): «PokéUsera», «EDICIÓN JARRA» and the beer-jar mascot. */
export function logo(): HTMLCanvasElement {
  if (!logoCache) logoCache = hornearLogo();
  return logoCache;
}
