// PokéUsera · warms the art up in the background: baking a 64×64 userito takes a few milliseconds on a
// computer and tens of them on a slow phone, so doing it the moment a screen first needs it (the trainer pick,
// the draft's grid of twenty, the first battle and its move effects) made those screens stall. This bakes them one at a time
// while the player is still on the title and the menu, whenever the browser says it has nothing better to do.
import { ENTRENADORES, ESCENARIOS } from '../tipos';
import { ESPECIES } from '../datos';
import { entrenador2, icono2 } from '../arte2/entrenadores2';
import { spriteEspalda2, spriteFrente2 } from '../arte2/sprites2';
import { tareasPrecalentarBarra } from './barra';
import { alturaCampo } from './combate';
import { tareasPrecalentarDraft } from './draft';
import { hornearFondoEscenario, miniatura } from './fondos';
import { tareasPrecalentarEfectos } from './efectosMov';
import { tareasPrecalentarObjetos } from './iconosObjeto';
import { pantalla } from '../pantalla';

let cola: (() => void)[] | null = null;
/** Tasks asked for by a screen that is already running (the battle's benched useritos): done before the rest of `cola`, popped from the end too. */
const urgentes: (() => void)[] = [];
let pendiente = false;

type Ocioso = (cb: (d: { timeRemaining(): number; didTimeout: boolean }) => void, o?: { timeout: number }) => number;
const ocioso: Ocioso | null = typeof requestIdleCallback === 'function' ? (requestIdleCallback as unknown as Ocioso) : null;

function construir(): (() => void)[] {
  const tareas: (() => void)[] = [];
  // In the order the screens need them: the trainer pick, the draft's grid (and its card), the battle.
  for (const id of ENTRENADORES) {
    tareas.push(() => entrenador2(id, 0));
    tareas.push(() => entrenador2(id, 1));
    tareas.push(() => icono2(id));
  }
  for (const s of ESPECIES) tareas.push(() => miniatura(s.id));
  tareas.push(...tareasPrecalentarDraft());
  for (const s of ESPECIES) tareas.push(() => spriteFrente2(s.id, 1));
  for (const s of ESPECIES) {
    tareas.push(() => spriteEspalda2(s.id, 0));
    tareas.push(() => spriteEspalda2(s.id, 1));
  }
  // The pixel icons of the objects («La barra», the panels) and the four bars' backdrops (one canvas per screen height; the battle bakes the one it
  // needs again if the window changed size meanwhile).
  tareas.push(...tareasPrecalentarObjetos(), ...tareasPrecalentarBarra());
  for (const id of ESCENARIOS) tareas.push(() => hornearFondoEscenario(id, alturaCampo(pantalla().alto)));
  // The move effects of the battle: one move or one type per task (tiny canvases, but not all in one frame).
  tareas.push(...tareasPrecalentarEfectos());
  return tareas.reverse(); // popped from the end
}

function siguiente() {
  if (pendiente || !(urgentes.length || cola?.length)) return;
  pendiente = true;
  const hacer = (d?: { timeRemaining(): number; didTimeout: boolean }) => {
    pendiente = false;
    // Not worth starting a bake if the browser has less than a frame's worth of idle time (unless it has waited too long).
    if (d && !d.didTimeout && d.timeRemaining() < 8) {
      siguiente();
      return;
    }
    // `window.__precalentando`: the canvases made inside a task are the background baking's (scripts/rendimiento-pokeusera.mjs does not count them against the screen).
    const w = window as unknown as { __precalentando?: boolean };
    w.__precalentando = true;
    try {
      (urgentes.pop() ?? cola?.pop())?.();
    } finally {
      w.__precalentando = false;
    }
    siguiente();
  };
  if (ocioso) ocioso(hacer, { timeout: 1200 });
  else setTimeout(() => hacer(), 120);
}

/** Starts baking, in the background, the art the next screens will want. Safe to call again. */
export function precalentar(): void {
  if (cola) return;
  cola = construir();
  siguiente();
}

/**
 * Bakes these tasks, in order, in the background before anything else of the warm-up: what a screen can do without in its first frames
 * (the battle: the benched useritos and the moves nobody has in the field yet) so it opens sooner. Works even if `precalentar` was never called.
 */
export function precalentarPronto(tareas: (() => void)[]): void {
  urgentes.push(...[...tareas].reverse());
  siguiente();
}
