// PokéUsera · online: the game messages that travel inside the room's `juego` envelope
// (docs/POKEUSERA.md, «Online»). The server only relays them; the host's browser runs the game.
import type { Eleccion, EntrenadorId, EstadoCombate, EstadoDraft, Evento } from '../tipos';

export interface AsientoMsg {
  entrenador: EntrenadorId;
  nombre: string;
  bot: boolean;
}

/** Host → everybody (`juego`, `a: 'todos'`). */
export type MsgAnfitrion =
  /** A game begins (also for «OTRA»). `seats` maps a room id to its seat; ids missing there only watch. */
  | { k: 'asientos'; asientos: AsientoMsg[]; seats: Record<string, number> }
  /** The draft changed; `turnoDe` picks next (null = over) and has `plazoMs`. `draft.elegidos.length` identifies the pick. */
  | { k: 'draft'; draft: EstadoDraft; turnoDe: number | null; plazoMs: number }
  | { k: 'inicio'; estado: EstadoCombate }
  /** The players in `quienes` must choose for `turno` (= `estado.turno` of the last state they got). */
  | { k: 'pide'; turno: number; quienes: number[]; plazoMs: number }
  /** `turno` was resolved. The seats in `reemplazan` must now choose a replacement within `rempMs`. */
  | { k: 'turno'; turno: number; eventos: Evento[]; estado: EstadoCombate; reemplazan: number[]; rempMs: number }
  | { k: 'reemplazo'; eventos: Evento[]; estado: EstadoCombate }
  | { k: 'fin'; estado: EstadoCombate }
  /** The guest of this seat left: the machine plays for it from now on. */
  | { k: 'salio'; seat: number; nombre: string }
  /** The host chose «OTRA»: a new `asientos` and draft follow. */
  | { k: 'otra' };

/** Guest → host (`juego`, `a: 'anfitrion'`). */
export type MsgInvitado =
  | { k: 'pick'; n: number; especie: string }
  | { k: 'eleccion'; turno: number; eleccion: Eleccion | null }
  | { k: 'reemplazoIdx'; turno: number; idx: number };

/** How a session of online play ends: back to the room, to the menu, or the room is gone. */
export type FinOnline = 'sala' | 'menu' | 'cerrada';
