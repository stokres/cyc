// The sound ids of «Alacant Sun». They come from src/sonido/musica.ts (the music and effects are
// made in parallel by another agent); until they are there, the casts below keep the code compiling
// and every call here does nothing (a missing id never reaches the audio code).
import type { SonidoMinijuego } from '../core/audio';
import type { Pista } from '../sonido/musica';
import { MUSICA } from '../sonido/musica';

/** The village theme (musica.ts: `solPueblo`). */
export const PISTA_PUEBLO = 'solPueblo' as unknown as Pista;
/** The road to the theatre (musica.ts: `solCamino`). */
export const PISTA_CAMINO = 'solCamino' as unknown as Pista;
/** The fight theme (musica.ts: `solCombate`). */
export const PISTA_COMBATE = 'solCombate' as unknown as Pista;
/** The victory fanfare (musica.ts: `solVictoria`). */
export const PISTA_VICTORIA = 'solVictoria' as unknown as Pista;
/** The level-up jingle (musica.ts: `solNivel`). */
export const PISTA_NIVEL = 'solNivel' as unknown as Pista;
/** The letter blip of the text (musica.ts: `solTexto`). */
export const EFECTO_TEXTO = 'solTexto' as unknown as Pista;
/** The psynergy cast (musica.ts: `solPoder`). */
export const EFECTO_PODER = 'solPoder' as unknown as Pista;
/** The choice cursor and confirm (musica.ts: `solMenu`). */
export const EFECTO_MENU = 'solMenu' as unknown as Pista;
/** A door (musica.ts: `solPuerta`). */
export const EFECTO_PUERTA = 'solPuerta' as unknown as Pista;
/** The swirl into a fight (musica.ts: `solEncuentro`). */
export const EFECTO_ENCUENTRO = 'solEncuentro' as unknown as Pista;
/** A hit landing (musica.ts: `solGolpe`). */
export const EFECTO_GOLPE = 'solGolpe' as unknown as Pista;
/** A heal (musica.ts: `solCura`). */
export const EFECTO_CURA = 'solCura' as unknown as Pista;
/** A prompter released or set (musica.ts: `solApuntador`). */
export const EFECTO_APUNTADOR = 'solApuntador' as unknown as Pista;
/** An enemy (or a friend) falling (musica.ts: `solCae`). */
export const EFECTO_CAE = 'solCae' as unknown as Pista;
/** Running away (musica.ts: `solHuir`). */
export const EFECTO_HUIR = 'solHuir' as unknown as Pista;

/** The boss fight (musica.ts: `solJefe`). */
export const PISTA_JEFE = 'solJefe' as unknown as Pista;
/** Calderón's summon, played once from its first beat AS AN EFFECT (musica.ts: `solCalderon`, 22 s, the blow at second 16). */
export const PISTA_CALDERON = 'solCalderon' as unknown as Pista;
/** The ending and the credits (musica.ts: `solFinal`). */
export const PISTA_FINAL = 'solFinal' as unknown as Pista;
/** The boss changes shape (musica.ts: `solTransforma`). */
export const EFECTO_TRANSFORMA = 'solTransforma' as unknown as Pista;
/** A curtain pulled (musica.ts: `solTelon`). */
export const EFECTO_TELON = 'solTelon' as unknown as Pista;
/** A gust of wind (musica.ts: `solViento`). */
export const EFECTO_VIENTO = 'solViento' as unknown as Pista;
/** Ice cracking, used for water (musica.ts: `solHielo`). */
export const EFECTO_HIELO = 'solHielo' as unknown as Pista;

/**
 * The second of `solCalderon` at which its closing blow lands (the music agent tells it; change it here only).
 * The whole summon is timed to it: the sky opens, Calderón comes down, writes, and drops the quill on this beat.
 */
export const CALDERON_GOLPE = 16;
/** Seconds the summon goes on after the blow (the last notes of the track). */
export const CALDERON_COLA = 6;

const hay = (id: Pista) => id in MUSICA;

/** What the game asks of the sound, every call guarded: no sound, or no such id, does nothing. */
export class SonidoSol {
  /** The track playing now (so a fight can give the world its music back). */
  actual: Pista | null = null;

  constructor(private readonly s?: SonidoMinijuego) {
    const ids = [
      EFECTO_TEXTO, EFECTO_PODER, EFECTO_MENU, EFECTO_PUERTA,
      EFECTO_ENCUENTRO, EFECTO_GOLPE, EFECTO_CURA, EFECTO_APUNTADOR, EFECTO_CAE, EFECTO_HUIR,
      EFECTO_TRANSFORMA, EFECTO_TELON, EFECTO_VIENTO, EFECTO_HIELO, PISTA_CALDERON,
    ].filter(hay);
    if (ids.length) void s?.prepararEfectos?.(...ids)?.catch?.(() => {});
  }

  /** Is this track or effect registered (the music is made in parallel)? */
  existe(id: Pista) {
    return hay(id);
  }

  /** Resolves once an effect is fetched and decoded, so that it starts on its beat when played (at once without sound). */
  async preparar(id: Pista) {
    if (!hay(id)) return;
    try {
      await this.s?.prepararEfectos?.(id);
    } catch {
      /* ditto */
    }
  }

  /** Seconds into a track playing now (from its first beat); null when it is not playing or there is no sound. */
  posicion(id: Pista): number | null {
    if (!hay(id)) return null;
    try {
      return this.s?.posicion?.(id) ?? null;
    } catch {
      return null;
    }
  }

  /** Resolves once the track has loaded (at once without sound or without that track). */
  async lista(id: Pista) {
    if (!hay(id)) return;
    try {
      await this.s?.lista?.(id);
    } catch {
      /* ditto */
    }
  }

  efecto(id: Pista, volumen = 1) {
    if (!hay(id)) return;
    try {
      this.s?.efecto?.(id, volumen);
    } catch {
      /* no sound is not an error */
    }
  }

  /** Plays a track (the village's by default). A track that does not exist yet does nothing. */
  musica(id: Pista = PISTA_PUEBLO) {
    if (!hay(id)) return;
    this.actual = id;
    try {
      this.s?.musica(id);
    } catch {
      /* ditto */
    }
  }

  parar(fundido?: number) {
    this.actual = null;
    try {
      this.s?.pararMusica(fundido);
    } catch {
      /* ditto */
    }
  }
}
