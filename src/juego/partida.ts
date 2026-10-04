// The saved game, in this browser (each player on their own phone).
//
// Two games and what they have unlocked:
//   - principal: the story as you go through it, chapter after chapter.
//   - rejuego: a chapter you have already finished, played again from the
//     start. It is a separate game: it never touches the main one, so replaying
//     never loses your progress. When you leave it, you are back where you were.
//   - progreso: chapters and minigames finished (in either game), for the
//     chapter list and the minigames menu.
//
// Saved after every action and when the page is hidden. Version 4; a version 3
// save (one game, no progress) becomes the main game.
import { storageGet, storageSet } from '../core/util';
import type { Estado } from './estado';

export interface Progreso {
  capitulos: Record<string, { superado: boolean; fecha?: string }>;
  minijuegos: Record<string, { superado: boolean; record?: number }>;
}

export type Hueco = 'principal' | 'rejuego';

export interface Partida {
  v: 4;
  progreso: Progreso;
  principal: { capitulo: number; estado: Estado } | null;
  rejuego: { capitulo: number; estado: Estado } | null;
  /** Which of the two is being played. */
  jugando: Hueco;
}

const KEY = 'cyc.partida.v4';
const KEY_V3 = 'cyc.save.v3';

const vacia = (): Partida => ({ v: 4, progreso: { capitulos: {}, minijuegos: {} }, principal: null, rejuego: null, jugando: 'principal' });

export function cargarPartida(): Partida {
  try {
    const raw = storageGet(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partida;
      if (p.v === 4) {
        p.progreso ??= { capitulos: {}, minijuegos: {} };
        p.progreso.capitulos ??= {};
        p.progreso.minijuegos ??= {};
        if (p.jugando === 'rejuego' && !p.rejuego) p.jugando = 'principal';
        return p;
      }
    }
  } catch {
    /* a broken save: start again rather than not start at all */
  }
  // An older save: it becomes the main game (and if it reached the end, chapter 1 is finished).
  const p = vacia();
  try {
    const raw = storageGet(KEY_V3);
    const e = raw ? (JSON.parse(raw) as Estado) : null;
    if (e && e.v === 3) {
      p.principal = { capitulo: 1, estado: e };
      if (e.final) {
        // It reached the end, so it won every minigame on the way (or skipped them, but who's counting).
        p.progreso.capitulos['1'] = { superado: true };
        for (const id of ['rana', 'cerdos', 'palabras', 'robot']) p.progreso.minijuegos[id] = { superado: true };
      }
    }
  } catch {
    /* ignore */
  }
  return p;
}

export function guardarPartida(p: Partida) {
  storageSet(KEY, JSON.stringify(p));
}

/** The game being played now, if any. */
export function enJuego(p: Partida) {
  return p.jugando === 'rejuego' ? p.rejuego : p.principal;
}

/** Leave the replay and go back to the main game, exactly where it was. */
export function volverAPrincipal(p: Partida) {
  p.rejuego = null;
  p.jugando = 'principal';
}

/** Replay a chapter from the start, as a separate game (the main one is untouched). */
export function rejugar(p: Partida, capitulo: number, estado: Estado) {
  p.rejuego = { capitulo, estado };
  p.jugando = 'rejuego';
}
