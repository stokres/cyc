// One game's state (a protagonist's place, bag, flags...). Small and serialisable:
// it is saved inside the Partida (src/juego/partida.ts).
import type { PjId } from './reparto';

export interface Lugar {
  escena: string;
  X: number;
  y: number;
  face: number;
}

export interface Estado {
  v: 3;
  /** Who the player controls. */
  activo: PjId;
  /** Who has finished their story and is on the way to the bar (faded out). */
  llegados: PjId[];
  /** Everyone made it: the final scene at the bar has been played. */
  final?: boolean;
  /** Who can be picked in the character dock (in order). */
  jugables: PjId[];
  /** Where each protagonist is; missing = not in the story yet. */
  donde: Partial<Record<PjId, Lugar>>;
  /** Outfit per protagonist (see OUTFITS in src/arte/personajes). */
  ropa: Partial<Record<PjId, string>>;
  inv: Record<PjId, string[]>;
  flags: Record<string, boolean | number>;
  /** Each story keeps its own clock, minutes after midnight. */
  minutos: Record<PjId, number>;
  /** Dialogue variant counters (see textos.ts). */
  usos: Record<string, number>;
  /** Aceituna's spot in the flat. */
  perro?: { X: number; y: number };
}
