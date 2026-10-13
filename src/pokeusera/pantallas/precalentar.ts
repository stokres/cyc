// PokéUsera · warms the art up in the background: baking a 64×64 userito takes a few milliseconds on a
// computer and tens of them on a slow phone, so doing it the moment a screen first needs it (the trainer pick,
// the draft's grid of twenty, the first battle and its move effects) made those screens stall. This bakes them one at a time
// while the player is still on the title and the menu, whenever the browser says it has nothing better to do.
import { ENTRENADORES } from '../tipos';
import { ESPECIES } from '../datos';
import { entrenador2, icono2 } from '../arte2/entrenadores2';
import { spriteEspalda2, spriteFrente2 } from '../arte2/sprites2';
import { miniatura } from './fondos';
import { tareasPrecalentarEfectos } from './efectosMov';

let cola: (() => void)[] | null = null;
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
  for (const s of ESPECIES) tareas.push(() => spriteFrente2(s.id, 1));
  for (const s of ESPECIES) {
    tareas.push(() => spriteEspalda2(s.id, 0));
    tareas.push(() => spriteEspalda2(s.id, 1));
  }
  // The move effects of the battle: one move or one type per task (tiny canvases, but not all in one frame).
  tareas.push(...tareasPrecalentarEfectos());
  return tareas.reverse(); // popped from the end
}

function siguiente() {
  if (pendiente || !cola?.length) return;
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
      cola?.pop()?.();
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
