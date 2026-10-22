// The sound ids of «Alacant Sun». They come from src/sonido/musica.ts (the music and effects are
// made in parallel by another agent); until they are there, the casts below keep the code compiling
// and every call here does nothing (a missing id never reaches the audio code).
import type { SonidoMinijuego } from '../core/audio';
import type { Pista } from '../sonido/musica';
import { MUSICA } from '../sonido/musica';

/** The village theme (musica.ts: `solPueblo`). */
export const PISTA_PUEBLO = 'solPueblo' as unknown as Pista;
/** The letter blip of the text (musica.ts: `solTexto`). */
export const EFECTO_TEXTO = 'solTexto' as unknown as Pista;
/** The psynergy cast (musica.ts: `solPoder`). */
export const EFECTO_PODER = 'solPoder' as unknown as Pista;
/** The choice cursor and confirm (musica.ts: `solMenu`). */
export const EFECTO_MENU = 'solMenu' as unknown as Pista;
/** A door (musica.ts: `solPuerta`). */
export const EFECTO_PUERTA = 'solPuerta' as unknown as Pista;

const hay = (id: Pista) => id in MUSICA;

/** What the game asks of the sound, every call guarded: no sound, or no such id, does nothing. */
export class SonidoSol {
  constructor(private readonly s?: SonidoMinijuego) {
    const ids = [EFECTO_TEXTO, EFECTO_PODER, EFECTO_MENU, EFECTO_PUERTA].filter(hay);
    if (ids.length) void s?.prepararEfectos?.(...ids)?.catch?.(() => {});
  }

  efecto(id: Pista, volumen = 1) {
    if (!hay(id)) return;
    try {
      this.s?.efecto?.(id, volumen);
    } catch {
      /* no sound is not an error */
    }
  }

  musica() {
    if (!hay(PISTA_PUEBLO)) return;
    try {
      this.s?.musica(PISTA_PUEBLO);
    } catch {
      /* ditto */
    }
  }

  parar() {
    try {
      this.s?.pararMusica();
    } catch {
      /* ditto */
    }
  }
}
