// The game itself: one stage of the Pang, from «¡LISTOS!» to cleared or out of lives.
// Placeholder: to be written (see docs/PANG.md).
import type { Sound } from '../core/audio';
import type { Fase, PjId, ResultadoFase } from './tipos';

export interface OpcionesFase {
  /** Where the game puts its canvas and its touch buttons (removed when it ends). */
  padre: HTMLElement;
  fase: Fase;
  pj: PjId;
  vidas: number;
  puntos: number;
  sonido: Sound;
  /** Opens the pause menu (pantallas.ts); resolves with what the player chose. */
  pausa: () => Promise<'seguir' | 'salir'>;
  /** Title-screen attract mode: a bot plays, no input, no sound, never ends on its own. */
  demo?: boolean;
  /** Aborting it ends the stage at once (cleans up, resolves 'salir'): the title screen stops its demo. */
  senal?: AbortSignal;
}

/**
 * Plays one stage. Losing a life restarts the stage (as in Pang) while lives remain.
 * Resolves with the result, or 'salir' if the player quit from the pause menu.
 */
export function jugarFase(o: OpcionesFase): Promise<ResultadoFase | 'salir'> {
  void o;
  return Promise.resolve({ superada: true, puntos: o.puntos, vidas: o.vidas });
}
