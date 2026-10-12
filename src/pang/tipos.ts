// Camiones y Caravanas · PANG: a game of its own (pang.html), the arcade machine of
// chapter 2 (see docs/PANG.md). This file is the contract the other modules share:
// the logical screen, the stage data and what each piece exports.
//
// Everything is pixel art at a fixed logical size (W × H), drawn on a small canvas and
// blown up without smoothing (juego.ts). Coordinates are logical pixels, y downwards.

export type PjId = 'fran' | 'pablo' | 'chuchi' | 'guille';
export const PJS: PjId[] = ['fran', 'pablo', 'chuchi', 'guille'];

/** The logical screen, 16:9. */
export const W = 384;
export const H = 216;

/**
 * The play area, inside the frame of blocks the background paints: walls at x = 8 and
 * x = 376, ceiling at y = 8, floor surface at y = 184. Below the floor, 184–192 is floor
 * tiles (background) and 192–216 the score strip (the game draws it on black).
 */
export const AREA = { izq: 8, der: 376, techo: 8, suelo: 184 } as const;
export const FRANJA = 192;

/**
 * Bubble sizes, 0 the biggest. A hit splits one size into two of the next; the smallest
 * just bursts. Radius in logical px.
 */
export type Talla = 0 | 1 | 2 | 3;
export const RADIO: Record<Talla, number> = { 0: 20, 1: 12, 2: 7, 3: 4 };

/**
 * What a bubble looks like (and, for «posavasos», how it moves: no gravity, straight
 * diagonal bounces, like Pang's hexagons).
 *   cerveza   beer foam: gold with a cap of foam (the default)
 *   bola      a ball from Bolilandia's ball pit (colour from `color`)
 *   purin     the farm's: muddy green-brown
 *   posavasos a hexagonal beer mat
 *   champan   Las Vegas: pale gold and sparkly
 *   cerdito   a round piglet, what el Peor drops (moves like a bubble)
 */
export type Variante = 'cerveza' | 'bola' | 'purin' | 'posavasos' | 'champan' | 'cerdito';
export type ColorBola = 'roja' | 'azul' | 'amarilla' | 'verde';

export interface BurbujaInicial {
  x: number;
  /** Centre height; it falls from here. */
  y: number;
  talla: Talla;
  /** Horizontal direction it starts moving in. */
  dir: 1 | -1;
  variante?: Variante;
  color?: ColorBola;
}

/** How a block looks: one tile set per kind (sprites.ts, `bloque`). */
export type EstiloBloque = 'ladrillo' | 'contenedor' | 'cojin' | 'bola' | 'madera' | 'bala' | 'piedra' | 'muralla' | 'turron' | 'caravana' | 'neon';

/**
 * A platform or block. Solid for bubbles (they bounce off every side) and for the
 * player standing on top (only via ladders: the player never jumps). Harpoons stop
 * at its underside; a breakable block (`rompible`) breaks when a shot hits it.
 */
export interface Bloque {
  x: number;
  y: number;
  w: number;
  h: number;
  estilo: EstiloBloque;
  rompible?: boolean;
}

/** A ladder: `x` its left edge, from `arriba` (top, a platform's top) down to `abajo`. Width 16. */
export interface Escalera {
  x: number;
  arriba: number;
  abajo: number;
}

export type FondoId =
  | 'usera'
  | 'calle'
  | 'piso'
  | 'bolilandia'
  | 'teatro'
  | 'granja'
  | 'madridrio'
  | 'avila'
  | 'zaragoza'
  | 'jijona'
  | 'nevada'
  | 'vegas';

/**
 * Something the stage adds to the rules.
 *   aceituna  Fran's dog runs across the floor now and then and drops ham (points)
 *   oscuro    the shadow switches the lights off: only the player's spotlight is seen
 *   cierzo    Zaragoza's wind blows bubbles and player sideways, changing direction
 */
export type Especial = 'aceituna' | 'oscuro' | 'cierzo';

/**
 * Bosses. Each is one big bouncing thing with hit points.
 *   robi       Robi's head (chapter 1, Bolilandia): now and then he puts on his party
 *              hat and shots just bounce off; drops small balls when hit
 *   peor       el Peor, the 152 kg pig: each hit drops a piglet (a small bubble)
 *   penultima  la Penúltima, a giant beer mug: spits bubbles, angrier at half health
 */
export type Jefe = 'robi' | 'peor' | 'penultima';

/** Music of the game (src/sonido/musica.ts keys). */
export type Pista = 'pangUsera' | 'pangCalle' | 'pangRonda';

export interface Fase {
  /** 1–12. Texts: fase.N.nombre, fase.N.lugar; dialogue before it: ## fase.N (optional). */
  n: number;
  fondo: FondoId;
  musica: Pista;
  /** Seconds to clear it. */
  tiempo: number;
  burbujas: BurbujaInicial[];
  bloques: Bloque[];
  escaleras: Escalera[];
  especial?: Especial;
  jefe?: Jefe;
  /** Player's starting x (centre). */
  inicio: number;
  /** Multiplies the bubbles' horizontal speed (1 = normal). */
  prisa?: number;
}

/** How each character plays (juego.ts uses these numbers). */
export type Arma = 'doble' | 'fijo' | 'rafaga' | 'ancho';
export type Poder = 'penultima' | 'siy' | 'kinki' | 'abrazo';
export interface Estilo {
  arma: Arma;
  poder: Poder;
  /** Walking speed, logical px/s. */
  paso: number;
}
export const ESTILO: Record<PjId, Estilo> = {
  fran: { arma: 'doble', poder: 'penultima', paso: 62 },
  pablo: { arma: 'fijo', poder: 'siy', paso: 72 },
  chuchi: { arma: 'rafaga', poder: 'kinki', paso: 84 },
  guille: { arma: 'ancho', poder: 'abrazo', paso: 72 },
};

/** Things bubbles drop. */
export type Objeto = 'reloj' | 'chupito' | 'escudo' | 'cana' | 'jamon' | 'aceitunas' | 'croqueta' | 'turron' | 'yema';

/** Player animations. Frames face right; the game mirrors them to face left. */
export type Anim = 'quieto' | 'andar' | 'disparar' | 'escalar' | 'herido' | 'victoria';

export interface ResultadoFase {
  /** true: stage cleared; false: nobody left standing (the caller offers to continue). */
  superada: boolean;
  /** One per player, in order. `vidas` 0: he was out of lives when the stage ended (the next stage starts him with 1). */
  jugadores: { puntos: number; vidas: number }[];
}
