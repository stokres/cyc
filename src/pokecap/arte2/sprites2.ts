// PokéUsera · Edición Jarra (arte v2): the 64×64 useritos baked once into cached canvases.
import { Pintor } from './pintor';
import { DIBUJOS2, dibujo2 } from './useritos2';

/** The three sample useritos (the detail sheet and the before/after use these). */
export const IDS_USERITOS2: readonly string[] = ['draguserin', 'espumarro', 'ego-ego'];
/** Every drawing, including the extra rival used only by the battle mock. */
export const TODOS_USERITOS2: readonly string[] = DIBUJOS2.map((d) => d.id);

/** Baked sprites by id; index = 2 × back + frame. (An array per id: no key string is built on every draw.) */
const cache = new Map<string, (HTMLCanvasElement | undefined)[]>();
const colores = new Map<string, number>();

function hornear(id: string, espalda: boolean, frame: number): HTMLCanvasElement {
  let v = cache.get(id);
  if (!v) {
    v = [];
    cache.set(id, v);
  }
  const k = (espalda ? 2 : 0) + frame;
  let c = v[k];
  if (!c) {
    const P = new Pintor(64, 64, espalda, frame);
    dibujo2(id).dibujar(P);
    P.suavizar();
    c = P.hornear();
    v[k] = c;
    colores.set(`${id}:${espalda ? 'e' : 'f'}:${frame}`, P.numColores);
  }
  return c;
}

/** Front view, 64×64, idle frame 0 or 1. */
export const spriteFrente2 = (id: string, frame = 0): HTMLCanvasElement => hornear(id, false, frame);
/** True back view, 64×64, idle frame 0 or 1. */
export const spriteEspalda2 = (id: string, frame = 0): HTMLCanvasElement => hornear(id, true, frame);
/** Number of palette colours a baked sprite uses. */
export function coloresSprite2(id: string, espalda: boolean, frame = 0): number {
  hornear(id, espalda, frame);
  return colores.get(`${id}:${espalda ? 'e' : 'f'}:${frame}`) ?? 0;
}
