// The cast: the four protagonists (playable) and Aceituna. Art comes from
// src/arte/personajes; names and how they speak from src/textos.
import * as fran from '../arte/personajes/fran.mjs';
import * as pablo from '../arte/personajes/pablo.mjs';
import * as chuchi from '../arte/personajes/chuchi.mjs';
import * as guille from '../arte/personajes/guille.mjs';
import * as aceituna from '../arte/personajes/aceituna.mjs';
import type { ArteDePersonaje } from '../motor/actores';

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

export const NOMBRE_ACEITUNA = 'Aceituna';
export const COLOR_ACEITUNA = '#c8433a';

/** Portrait (SVG markup) for the dialogue box and the character dock. */
export function retrato(id: PjId | 'aceituna', o: { mood?: string; mouthKind?: string; blink?: boolean } = {}) {
  if (id === 'aceituna') {
    return `<svg viewBox="-52 -74 104 126" aria-hidden="true">${aceituna.headFront({ blink: o.blink, pant: o.mouthKind === 'a' || o.mouthKind === 'o', happy: o.mood === 'happy' })}</svg>`;
  }
  // Portraits face the camera (front view), unlike the 3/4 characters in the scene.
  return `<svg viewBox="-62 -82 124 150" aria-hidden="true">${REPARTO[id].arte.headFront({ mood: o.mood, mouthKind: o.mouthKind, blink: o.blink })}</svg>`;
}
