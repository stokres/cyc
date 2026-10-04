// The music: each track and where its loop starts and ends (seconds). The files are made by
// tools/musica (galop.py bucle, then bucle.py): the loop sits between half-second margins
// that hold what comes just before and after it, so it joins without a click on any phone.
import galop from './galop.mp3?url';

export const MUSICA = {
  /** «Galop del lío», for the minigames (first in Fran's, the frog). */
  galop: { url: galop, inicio: 0.5, fin: 51.026316 },
} as const;

export type Pista = keyof typeof MUSICA;
