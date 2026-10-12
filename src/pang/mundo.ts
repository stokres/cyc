// The state of one stage in play, and the numbers of the rules (docs/PANG.md). The other
// modules of the game (reglas, fisica, armas, jefes, objetos, especiales, bot) work on a
// `Mundo`; juego.ts owns it and the flow around it.
import type { HojaJefe } from './arte/sprites';
import type { Bloque, ColorBola, Estilo, Fase, Jefe, Objeto, PjId, Talla, Variante } from './tipos';
import type { Efectos } from './sonido';

/** Fixed simulation step, seconds. */
export const PASO = 1 / 120;
export const GRAVEDAD = 320;
/** Horizontal speed of every bubble (times the stage's `prisa`), px/s. */
export const VEL_BURBUJA = 52;
/** Height the BOTTOM of a bubble reaches above what it bounced on, by size. */
export const ALTURA_BOTE: Record<Talla, number> = { 0: 120, 1: 92, 2: 64, 3: 40 };
export const PUNTOS_BURBUJA: Record<Talla, number> = { 0: 50, 1: 100, 2: 150, 3: 200 };
/** Bubbles popped (or boss hits) to fill the special bar. */
export const BARRA_LLENA = 16;
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
  /** Stuck to the ceiling or a block (Pablo's): seconds it has been there. */
  fijo: boolean;
  t: number;
}

export interface Bala {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Kinki: goes through bubbles, hitting each at most once. */
  atraviesa: boolean;
  golpeadas: number[];
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
}

export interface Popup {
  x: number;
  y: number;
  t: number;
  img: HTMLCanvasElement;
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
}

export type Escudo = 0 | 1 | 2; // none, bear hug (pops on break), item

export interface JugadorVivo {
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
  escudo: Escudo;
  /** Seconds in the current animation (frames come from it). */
  animT: number;
  /** Walking this step (for the walk cycle). */
  anda: boolean;
}

export interface Mundo {
  fase: Fase;
  pj: PjId;
  estilo: Estilo;
  sfx: Efectos;
  /** Seconds of play since the stage (re)started. */
  t: number;
  tiempo: number;
  puntos: number;
  vidas: number;
  barra: number;
  siguienteVida: number;
  canaDada: boolean;
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
  jugador: JugadorVivo;
  /** Bubbles and boss stand still (clock item, Fran's special). */
  congelado: number;
  /** Chuchi's rapid fire. */
  kinki: number;
  enfriamiento: number;
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
