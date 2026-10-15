// PokéUsera · online: the game messages that travel inside the room's `juego` envelope
// (docs/POKEUSERA.md, «Online»). The server only relays them; the host's browser runs the game.
import type { Eleccion, EntrenadorId, EscenarioId, EstadoCombate, EstadoDraft, Evento, ModoJuego, ObjetoId } from '../tipos';

export interface AsientoMsg {
  entrenador: EntrenadorId;
  nombre: string;
  bot: boolean;
}

/** Host → everybody (`juego`, `a: 'todos'`). */
export type MsgAnfitrion =
  /** In the room (before the game): the way of playing the host chose (NORMAL / AL AZAR). The host repeats it when somebody joins; guests only read it. */
  | { k: 'modo'; modo: ModoJuego }
  /** A game begins (also for «OTRA»). `seats` maps a room id to its seat; ids missing there only watch. `id` names the game (guests echo it in `listo`). `modo` is the game's mode (AL AZAR: no draft and no 'barra'; 'azar' follows). */
  | { k: 'asientos'; id: number; asientos: AsientoMsg[]; seats: Record<string, number>; escenario: EscenarioId; modo: ModoJuego }
  /** The draft changed; `turnoDe` picks next (null = over) and has `plazoMs`. `draft.elegidos.length` identifies the pick. */
  | { k: 'draft'; draft: EstadoDraft; turnoDe: number | null; plazoMs: number }
  /** «La barra», to the guest of that seat only: the three objects on offer and the guest's team (the choice goes back as 'objeto'). */
  | { k: 'barra'; ofertas: ObjetoId[]; especies: string[]; plazoMs: number }
  /** «TU EQUIPO AL AZAR» (mode AL AZAR), to the guest of that seat only: the teams dealt to every seat (the useritos are public, as in the draft), but only the objects of THAT guest's team (`null`: none); the answer is 'azar'. */
  | { k: 'azar'; equipos: string[][]; objetos: (ObjetoId | null)[]; plazoMs: number }
  /** «¿Quién sale primero?», to the guest of that seat only: their team and the objects on it (`null`: none); the choice goes back as 'salida'. */
  | { k: 'salida'; especies: string[]; objetos: (ObjetoId | null)[]; plazoMs: number }
  /** The battle begins. The states of 'inicio', 'turno', 'reemplazo' and 'fin' go to each guest without the other players' objects that have not worked yet. */
  | { k: 'inicio'; estado: EstadoCombate }
  /** The players in `quienes` must choose for `turno` (= `estado.turno` of the last state they got). */
  | { k: 'pide'; turno: number; quienes: number[]; plazoMs: number }
  /** `turno` was resolved. */
  | { k: 'turno'; turno: number; eventos: Evento[]; estado: EstadoCombate }
  /** The seats in `quienes` must choose which userito comes in (after the fall in `estado.turno − 1`) within `plazoMs`. Sent when the host opens the question, like `pide`. */
  | { k: 'pideRemp'; quienes: number[]; plazoMs: number }
  | { k: 'reemplazo'; eventos: Evento[]; estado: EstadoCombate }
  | { k: 'fin'; estado: EstadoCombate }
  /** The guest of this seat left: the machine plays for it from now on. */
  | { k: 'salio'; seat: number; nombre: string }
  /** The host chose «OTRA»: a new `asientos` and draft follow. */
  | { k: 'otra' };

/** Guest → host (`juego`, `a: 'anfitrion'`). */
export type MsgInvitado =
  /** On entering the room: the guest's account (token for the statistics, name for the seat); the host never shows the token. See cuentas/sala.ts. */
  | { k: 'cuenta'; token: string; nombre: string }
  /** «I have finished playing» the `n`-th 'inicio' / 'turno' / 'reemplazo' message of game `g`: the host waits for these (up to a cap) before opening the next turn. */
  | { k: 'listo'; g: number; n: number }
  | { k: 'pick'; n: number; especie: string }
  /** The guest pressed ¡A PELEAR! on «TU EQUIPO AL AZAR» (or ran out of time there). */
  | { k: 'azar' }
  /** The guest's choice in «La barra»: one of the offered objects and which userito (index in their team) carries it. */
  | { k: 'objeto'; objeto: ObjetoId; idx: number }
  /** The guest's choice in «¿Quién sale primero?»: the index (0..2) of the userito in their team. */
  | { k: 'salida'; idx: number }
  | { k: 'eleccion'; turno: number; eleccion: Eleccion | null }
  | { k: 'reemplazoIdx'; turno: number; idx: number };

/** How a session of online play ends: back to the room, to the menu, or the room is gone. */
export type FinOnline = 'sala' | 'menu' | 'cerrada';
