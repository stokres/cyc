// The cast: the four protagonists (playable) and Aceituna. Art comes from
// src/arte/personajes; names and how they speak from src/textos.
import * as fran from '../arte/personajes/fran.mjs';
import * as pablo from '../arte/personajes/pablo.mjs';
import * as chuchi from '../arte/personajes/chuchi.mjs';
import * as guille from '../arte/personajes/guille.mjs';
import * as aceituna from '../arte/personajes/aceituna.mjs';
import * as vero from '../arte/personajes/vero.mjs';
import type { ArteDePersonaje } from '../motor/actores';
import { svgABitmap } from '../motor/sprites';

export type PjId = 'fran' | 'pablo' | 'chuchi' | 'guille';
export const PROTAS: PjId[] = ['fran', 'pablo', 'chuchi', 'guille'];

export interface Ficha {
  id: PjId;
  nombre: string;
  arte: ArteDePersonaje;
  /** Outfit they wear unless the story changes it. */
  ropa: string | undefined;
  /** Accent for their UI (portrait ring, name in dialogues). */
  color: string;
}

export const REPARTO: Record<PjId, Ficha> = {
  fran: { id: 'fran', nombre: 'Fran', arte: fran as unknown as ArteDePersonaje, ropa: 'calle', color: '#4fb0ae' },
  pablo: { id: 'pablo', nombre: 'Pablo', arte: pablo as unknown as ArteDePersonaje, ropa: undefined, color: '#e2b04a' },
  chuchi: { id: 'chuchi', nombre: 'Chuchi', arte: chuchi as unknown as ArteDePersonaje, ropa: undefined, color: '#c8566a' },
  guille: { id: 'guille', nombre: 'Guille', arte: guille as unknown as ArteDePersonaje, ropa: undefined, color: '#f5c95f' },
};

/** Characters who talk and stand in a scene but are never played (chapter 2: Vero, behind the Brío's bar). */
export type NpcId = 'vero';
export interface FichaNpc {
  id: NpcId;
  nombre: string;
  arte: ArteDePersonaje;
  ropa: string | undefined;
  color: string;
}
export const NPCS: Record<NpcId, FichaNpc> = {
  vero: { id: 'vero', nombre: 'Vero', arte: vero as unknown as ArteDePersonaje, ropa: 'barra', color: '#d0607a' },
};
export const esNpc = (q: string | null): q is NpcId => !!q && q in NPCS;

export const NOMBRE_ACEITUNA = 'Aceituna';
export const COLOR_ACEITUNA = '#c8433a';
export const COLOR_SOMBRA = '#8a7ab8';

const retratos = new Map<string, string>();

interface Pose {
  mood?: string;
  mouthKind?: string;
  blink?: boolean;
  /** What they wear now, if it changes the face (Chuchi without his glasses). */
  ropa?: string;
}

/** Portrait (SVG markup) for the dialogue box and the character dock; each pose is built once. */
export function retrato(id: PjId | 'aceituna' | 'sombra' | NpcId, o: Pose = {}) {
  const k = `${id}|${o.mood}|${o.mouthKind}|${o.blink ? 1 : 0}|${o.ropa ?? ''}`;
  let v = retratos.get(k);
  if (!v) retratos.set(k, (v = dibujarRetrato(id, o)));
  return v;
}

// Portraits of the dialogue box as bitmaps. While a line is typed the mouth changes up to forty times a second; as inline SVG
// each change was parsed and rasterised again inside a rounded, clipped box over the animated scene, and on a phone with the GPU
// busy the tiles came out late or half-drawn (stripes, a face not put together). A bitmap is made once per pose and the box
// only draws it (docs/ESTILO.md, T5.7). A small cache, oldest out first, keeps the memory low.
const LADO_RETRATO = 224;
const MAX_RETRATOS = 40;
const bitmaps = new Map<string, HTMLCanvasElement>();
const haciendo = new Map<string, Promise<HTMLCanvasElement>>();

const claveRetrato = (id: string, o: Pose) => `${id}|${o.mood}|${o.mouthKind}|${o.blink ? 1 : 0}|${o.ropa ?? ''}`;

/** The portrait bitmap of a pose if it is made already (a square of 224 px, the face centred as in the SVG box), or null. */
export function retratoYa(id: PjId | 'aceituna' | 'sombra' | NpcId, o: Pose = {}): HTMLCanvasElement | null {
  const k = claveRetrato(id, o);
  const c = bitmaps.get(k);
  if (c) {
    bitmaps.delete(k);
    bitmaps.set(k, c);
  }
  return c ?? null;
}

/** The portrait bitmap of a pose, made once (and shared by whoever asks for it at the same time). */
export function retratoBitmap(id: PjId | 'aceituna' | 'sombra' | NpcId, o: Pose = {}): Promise<HTMLCanvasElement> {
  const ya = retratoYa(id, o);
  if (ya) return Promise.resolve(ya);
  const k = claveRetrato(id, o);
  let p = haciendo.get(k);
  if (!p) {
    const svg = retrato(id, o).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO_RETRATO}" height="${LADO_RETRATO}" `);
    p = svgABitmap(svg, LADO_RETRATO, LADO_RETRATO)
      .then((c) => {
        bitmaps.set(k, c);
        while (bitmaps.size > MAX_RETRATOS) {
          const viejo = bitmaps.keys().next().value as string;
          const v = bitmaps.get(viejo)!;
          bitmaps.delete(viejo);
          v.width = v.height = 0;
        }
        return c;
      })
      .finally(() => haciendo.delete(k));
    haciendo.set(k, p);
  }
  return p;
}

function dibujarRetrato(id: PjId | 'aceituna' | 'sombra' | NpcId, o: Pose) {
  // Pablo's shadow: his own face, gone dark (only eyes and a glint left).
  if (id === 'sombra') {
    return `<svg viewBox="-62 -82 124 150" aria-hidden="true"><defs><filter id="sombra-retrato"><feColorMatrix type="matrix" values="0.12 0.06 0 0 0.03  0.06 0.1 0.02 0 0.02  0.06 0.04 0.16 0 0.06  0 0 0 1 0"/></filter></defs><g filter="url(#sombra-retrato)">${REPARTO.pablo.arte.headFront({ mood: o.mood, mouthKind: o.mouthKind, blink: o.blink })}</g></svg>`;
  }
  if (id === 'aceituna') {
    return `<svg viewBox="-52 -74 104 126" aria-hidden="true">${aceituna.headFront({ blink: o.blink, pant: o.mouthKind === 'a' || o.mouthKind === 'o', happy: o.mood === 'happy' })}</svg>`;
  }
  // Vero's bun rises above the others' hair: a taller box, same width.
  if (esNpc(id)) {
    return `<svg viewBox="-62 -96 124 164" aria-hidden="true">${NPCS[id].arte.headFront({ mood: o.mood, mouthKind: o.mouthKind, blink: o.blink })}</svg>`;
  }
  // Portraits face the camera (front view), unlike the 3/4 characters in the scene.
  const arte = REPARTO[id].arte;
  const frente = (o.ropa && arte.OUTFITS?.[o.ropa]?.headFront) || arte.headFront;
  return `<svg viewBox="-62 -82 124 150" aria-hidden="true">${frente({ mood: o.mood, mouthKind: o.mouthKind, blink: o.blink })}</svg>`;
}
