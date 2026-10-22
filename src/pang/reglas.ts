// The rules that bubbles, items and the player's life share: bursting, splitting, being hurt.
import { avisar, crearBurbuja, efectoPop, llenarBarra, sumar, vidaExtra, velocidadBurbujas } from './base';
import { PUNTOS_BURBUJA, PUNTOS_COMIDA, type Burbuja, type JugadorVivo, type Mundo, type ObjetoSuelto } from './mundo';
import { soltarObjeto } from './objetos';
import type { Talla } from './tipos';

export interface OpcionesReventar {
  /** Score it (default true). */
  puntos?: boolean;
  /** May leave an item (default true). */
  soltar?: boolean;
  /** Counts for the special bar (default true). */
  barra?: boolean;
  /** Splits into smaller bubbles (default true). */
  partir?: boolean;
}

/**
 * Bursts a bubble that the caller has ALREADY taken out of `m.burbujas`: puff, points,
 * maybe an item, and two children of the next size. The children are left in `m.hijos`.
 * `j` is the player who burst it: his are the points and the special bar.
 */
export function reventar(m: Mundo, j: JugadorVivo, b: Burbuja, op: OpcionesReventar = {}): void {
  m.hijos.length = 0;
  efectoPop(m, b.x, b.y, b.variante, b.talla);
  m.sfx.reventar(b.talla);
  if (op.puntos !== false) sumar(m, j, PUNTOS_BURBUJA[b.talla], b.x, b.y - b.r);
  if (op.barra !== false) llenarBarra(j, 1);
  if (op.soltar !== false) soltarObjeto(m, b.x, b.y);
  if (op.partir === false || b.talla >= 3) return;
  const talla = (b.talla + 1) as Talla;
  const v = velocidadBurbujas(m);
  for (const lado of [-1, 1]) {
    // Beer mats keep their straight diagonals; the rest hop up a little.
    const h = crearBurbuja(m, b.x, b.y, talla, b.variante, b.color, lado * v, b.variante === 'posavasos' ? -v : -120);
    m.burbujas.push(h);
    m.hijos.push(h);
  }
}

/** Bursts every bubble that is within `radio` of a point (the bear hug breaking). */
export function reventarCercanas(m: Mundo, j: JugadorVivo, x: number, y: number, radio: number) {
  for (let i = m.burbujas.length - 1; i >= 0; i--) {
    const b = m.burbujas[i];
    if (Math.hypot(b.x - x, b.y - y) > radio + b.r) continue;
    m.burbujas[i] = m.burbujas[m.burbujas.length - 1];
    m.burbujas.pop();
    reventar(m, j, b);
  }
}

/** Every bubble splits once at once; the smallest burst. No items, nothing for the bar. */
export function partirTodas(m: Mundo, j: JugadorVivo) {
  const viejas = m.burbujas;
  m.burbujas = [];
  for (const b of viejas) reventar(m, j, b, { soltar: false, barra: false });
}

/** Every bubble bursts without splitting (the Penúltima falls). */
export function reventarTodas(m: Mundo, j: JugadorVivo) {
  const viejas = m.burbujas;
  m.burbujas = [];
  for (const b of viejas) reventar(m, j, b, { soltar: false, barra: false, partir: false });
}

/** The shot: every bubble splits again and again down to the smallest size. */
export function chupito(m: Mundo, j: JugadorVivo) {
  const viejas = m.burbujas;
  m.burbujas = [];
  const v = velocidadBurbujas(m);
  for (const b of viejas) {
    if (b.talla >= 3) {
      m.burbujas.push(b);
      continue;
    }
    efectoPop(m, b.x, b.y, b.variante, b.talla);
    sumar(m, j, PUNTOS_BURBUJA[b.talla], b.x, b.y - b.r);
    const n = 2 ** (3 - b.talla);
    for (let k = 0; k < n; k++) {
      const lado = k % 2 ? 1 : -1;
      const h = crearBurbuja(m, b.x + (k - n / 2) * 2, b.y, 3, b.variante, b.color, lado * v, b.variante === 'posavasos' ? (k % 4 < 2 ? -v : v) : -120 - (k % 3) * 20);
      m.burbujas.push(h);
    }
  }
}

/**
 * Something touches player `j`. Returns true if it really hurts: not while invulnerable
 * (after a shield breaks) and not when a shield absorbs it (the bear hug also bursts what
 * is near, for him).
 */
export function herir(m: Mundo, j: JugadorVivo): boolean {
  if (j.inv > 0) return false;
  if (j.escudo) {
    const era = j.escudo;
    j.escudo = 0;
    j.inv = 1.5;
    m.sfx.escudoRoto();
    if (era === 1) reventarCercanas(m, j, j.x, j.y - 16, 48);
    return false;
  }
  return true;
}

/** Player `j` picks an item up: the clock and the shot work for everybody, the rest for him. */
export function recoger(m: Mundo, j: JugadorVivo, o: ObjetoSuelto) {
  m.sfx.objeto();
  switch (o.tipo) {
    case 'reloj':
      m.congelado = Math.max(m.congelado, 5);
      avisar(m, 'hud.reloj');
      break;
    case 'chupito':
      avisar(m, 'hud.chupito');
      chupito(m, j);
      break;
    case 'escudo':
      if (!j.escudo) j.escudo = 2;
      avisar(m, 'hud.escudo');
      break;
    case 'cana':
      vidaExtra(m, j);
      break;
    default:
      sumar(m, j, PUNTOS_COMIDA[o.tipo] ?? 0, o.x, o.y - 8);
  }
}
