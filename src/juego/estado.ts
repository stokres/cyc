// Saved game. Small and serialisable so it survives reloads.
import { storageGet, storageSet } from '../core/util';
import type { PjId } from './reparto';

export interface Lugar {
  escena: string;
  X: number;
  y: number;
  face: number;
}

export interface Estado {
  v: 2;
  /** Who the player controls. */
  activo: PjId;
  /** Who can be picked in the character dock (in order). */
  jugables: PjId[];
  /** Where each protagonist is; missing = not in the story yet. */
  donde: Partial<Record<PjId, Lugar>>;
  /** Outfit per protagonist (see OUTFITS in src/arte/personajes). */
  ropa: Partial<Record<PjId, string>>;
  inv: Record<PjId, string[]>;
  flags: Record<string, boolean | number>;
  /** In-game clock, minutes after midnight. */
  minutos: number;
  /** Dialogue variant counters (see textos.ts). */
  usos: Record<string, number>;
  /** Aceituna's spot in the flat. */
  perro?: { X: number; y: number };
}

const KEY = 'cyc.save.v2';

export function cargarEstado(): Estado | null {
  const raw = storageGet(KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Estado;
    return s.v === 2 ? s : null;
  } catch {
    return null;
  }
}

export function guardarEstado(s: Estado) {
  storageSet(KEY, JSON.stringify(s));
}

export function borrarEstado() {
  storageSet(KEY, null);
}
