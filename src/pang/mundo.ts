// The state of one stage in play, and the numbers of the rules (docs/PANG.md). The other
// modules of the game (reglas, fisica, armas, jefes, objetos, especiales, bot) work on a
// `Mundo`; juego.ts owns it and the flow around it.
import type { HojaJefe } from './arte/sprites';
import type { Arma, Bloque, ColorBola, Estilo, Fase, Jefe, Objeto, PjId, Talla, Variante } from './tipos';
import type { Efectos } from './sonido';

/** Fixed simulation step, seconds. */
export const PASO = 1 / 120;
export const GRAVEDAD = 320;
/**
 * Bubbles fall slower than the player and the items, so they float like Pang's (Jesús, 12
 * October 2026: they were too fast, the big ones above all).
 */
export const GRAVEDAD_BURBUJA = 200;
/** Horizontal speed of a bubble, px/s, before the stage's pace and its size (base.ts). */
export const VEL_BURBUJA = 40;
/** The big ones drift slowest. */
export const VEL_TALLA: Record<Talla, number> = { 0: 0.8, 1: 0.9, 2: 1, 3: 1.05 };
/** Height the BOTTOM of a bubble reaches above what it bounced on, by size. */
export const ALTURA_BOTE: Record<Talla, number> = { 0: 120, 1: 92, 2: 64, 3: 40 };
export const PUNTOS_BURBUJA: Record<Talla, number> = { 0: 50, 1: 100, 2: 150, 3: 200 };
/** Bubbles popped (or boss hits) to fill the special bar. */
export const BARRA_LLENA = 16;
/** The cierzo's push at full strength (px/s): on the bubbles and on the player. */
export const VIENTO_BURBUJAS = 20;
export const VIENTO_JUGADOR = 22;
export const PUNTOS_COMIDA: Partial<Record<Objeto, number>> = { jamon: 500, aceitunas: 300, croqueta: 800, turron: 1000, yema: 1500 };
/** Player's hit box: half width and height above the feet. */
export const CAJA = { semi: 7, alto: 24 } as const;

/** Anything that bounces around the play area: bubbles and bosses. `bote` 0: no gravity, reflects everywhere. */
export interface Cuerpo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  bote: number;
}

export interface Burbuja extends Cuerpo {
  id: number;
  talla: Talla;
  variante: Variante;
  color: ColorBola;
  img: HTMLCanvasElement;
}

/** A harpoon wire: vertical, from `base` (where it was fired) up to `punta`. */
export interface Cable {
  x: number;
  base: number;
  punta: number;
  ancho: number;
  /** Fired with the sticky weapon: it stays under the ceiling or a block instead of vanishing. */
  pega: boolean;
  /** Stuck to the ceiling or a block (the sticky weapon's): seconds it has been there. */
  fijo: boolean;
  t: number;
  /** Index (in `Mundo.jugadores`) of the player who fired it: points, bar and limits are his. */
  dueno: number;
}

export interface Bala {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Kinki: goes through bubbles, hitting each at most once. */
  atraviesa: boolean;
  golpeadas: number[];
  /** Index (in `Mundo.jugadores`) of the player who fired it. */
  dueno: number;
}

export interface ObjetoSuelto {
  tipo: Objeto;
  img: HTMLCanvasElement;
  x: number;
  /** Centre. */
  y: number;
  vy: number;
  t: number;
}

/** A pop, or a bit of the boss exploding. `t` < 0: not started yet. */
export interface Efecto {
  x: number;
  y: number;
  t: number;
  frames: HTMLCanvasElement[];
  /** What the frames were made from (the snapshot of an online game sends these, not the images). */
  variante: Variante;
  talla: Talla;
}

export interface Popup {
  x: number;
  y: number;
  t: number;
  img: HTMLCanvasElement;
  /** Text and colour of `img`. */
  txt: string;
  color: string;
}

export interface JefeVivo extends Cuerpo {
  tipo: Jefe;
  hoja: HojaJefe;
  hp: number;
  hpMax: number;
  /** Seconds left of the white flash after a hit. */
  golpeT: number;
  /** Seconds alive (drives the timers of each boss). */
  t: number;
  /** Damage not yet counted as a whole hit (bullets are 0.34). */
  acumulado: number;
  golpes: number;
  /** Robi: hat on (shots bounce off). */
  gorro: boolean;
  gorroAviso: boolean;
  /** Next change of hat / next spit, in `t`. */
  proximo: number;
  /** Penúltima: seconds the mouth stays open. */
  escupeT: number;
  escupidas: number;
  velocidad: number;
}

export interface Aviso {
  img: HTMLCanvasElement;
  t: number;
  /** Text key and colour of `img`. */
  clave: string;
  color: string;
}

/** One player of the stage: body, weapon state and his own score, lives and special bar. */
export interface JugadorVivo {
  pj: PjId;
  estilo: Estilo;
  /** The weapon in hand: 'normal' until he picks one up; lost with a life (Pablo keeps it). */
  arma: Arma;
  puntos: number;
  vidas: number;
  barra: number;
  siguienteVida: number;
  /** Chuchi's rapid fire: seconds left. */
  kinki: number;
  /** Seconds until the next bullet may leave. */
  enfriamiento: number;
  /** Seconds left of the hit animation (several players only): 0 = up and playing. No collisions meanwhile. */
  caido: number;
  /** Out of lives until the stage ends (several players only): not drawn, no collisions, no input. */
  fuera: boolean;
  x: number;
  /** Feet. */
  y: number;
  vy: number;
  dir: 1 | -1;
  /** Index of the ladder being climbed, or -1. */
  escalera: number;
  escalado: number;
  disparoT: number;
  inv: number;
  /** Hits the shield still takes (0: none). The shield item gives 1 (Guille: 2), the bear hug 1. */
  escudo: number;
  /** The shield is the bear hug's: when it breaks it bursts what is near. */
  abrazo: boolean;
  /** Seconds in the current animation (frames come from it). */
  animT: number;
  /** Walking this step (for the walk cycle). */
  anda: boolean;
}

export interface Mundo {
  fase: Fase;
  sfx: Efectos;
  /** Seconds of play since the stage (re)started. */
  t: number;
  tiempo: number;
  canaDada: boolean;
  /** The chapter's short Pang: everybody holds this weapon always and no weapon items drop. Null: the full game. */
  armaFija: Arma | null;
  sigId: number;
  burbujas: Burbuja[];
  bloques: Bloque[];
  cables: Cable[];
  balas: Bala[];
  objetos: ObjetoSuelto[];
  efectos: Efecto[];
  popups: Popup[];
  jefe: JefeVivo | null;
  /** Seconds since the boss died, or -1. */
  finJefe: number;
  /** One to four players, in the order of the room (index = `dueno` of their shots). */
  jugadores: JugadorVivo[];
  /** Bubbles and boss stand still (clock item, Fran's special): for everybody. */
  congelado: number;
  aviso: Aviso | null;
  /** Scratch: the children of the last bubble popped. */
  hijos: Burbuja[];
  /** Wind now: -1, 0 or 1 times its ramp (cierzo), px/s on bubbles. */
  viento: number;
  /** Stage specials. */
  aceituna: { prox: number; activa: boolean; x: number; dir: 1 | -1; soltarX: number; soltada: boolean; t: number };
  oscuro: { t: number };
  cierzo: { t: number; dir: 1 | -1; soplando: boolean; rafaga: number };
  /** The HUD must be redrawn. */
  hudSucio: boolean;
}
