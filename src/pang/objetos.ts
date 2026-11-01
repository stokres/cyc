// Items bubbles drop: they fall, wait on the floor or a block, and blink before leaving.
import { objeto } from './arte/sprites';
import { GRAVEDAD, type Mundo, type ObjetoSuelto } from './mundo';
import { AREA, type Arma, type Objeto } from './tipos';

const DURA = 6;
const PARPADEA = 2;
const PROBABILIDAD = 0.15;
/** The chapter's short Pang (it holds a fixed weapon) keeps its original rates, so its difficulty stays as tuned. */
const PROBABILIDAD_CAPITULO = 0.12;
/** The food that drops, with its weight (out of 100). */
const COMIDA: Array<[Objeto, number]> = [['jamon', 25], ['aceitunas', 30], ['croqueta', 22], ['turron', 15], ['yema', 8]];
/** The weapon items and their weight (12 + 8 + 8 + 4 = 32 of every 100 items). */
const ARMAS: Array<[Objeto, Arma, number]> = [['armaDoble', 'doble', 12], ['armaFijo', 'fijo', 8], ['armaRafaga', 'rafaga', 8], ['armaTriple', 'triple', 4]];
const PESO_ARMAS = 32;

/** A weapon item by weight, never the one the first player already holds. */
function elegirArma(m: Mundo): Objeto {
  const tiene = m.jugadores[0]?.arma;
  let r = Math.random() * (PESO_ARMAS - (ARMAS.find((a) => a[1] === tiene)?.[2] ?? 0));
  for (const [o, arma, peso] of ARMAS) {
    if (arma === tiene) continue;
    r -= peso;
    if (r < 0) return o;
  }
  return 'armaDoble';
}

/**
 * Picks what drops, out of 100: weapons 32 (double 12, sticky 8, burst 8, triple 4), clock 10, shot 8 (not with a boss),
 * shield 10, beer 5 (only one per stage) and food 35; what makes no sense here becomes food. The chapter's short Pang
 * has no weapons: its own table (see PROBABILIDAD_CAPITULO).
 */
function elegir(m: Mundo): Objeto {
  if (m.armaFija) {
    const r = Math.random() * 95;
    if (r < 12) return 'reloj';
    if (r < 22) return m.fase.jefe ? comida() : 'chupito';
    if (r < 35) return 'escudo';
    if (r < 40) return m.canaDada ? comida() : 'cana';
    return comida();
  }
  const r = Math.random() * 100;
  if (r < PESO_ARMAS) return elegirArma(m);
  if (r < 42) return 'reloj';
  if (r < 50) return m.fase.jefe ? comida() : 'chupito';
  if (r < 60) return 'escudo';
  if (r < 65) return m.canaDada ? comida() : 'cana';
  return comida();
}

function comida(): Objeto {
  let r = Math.random() * 100;
  for (const [o, p] of COMIDA) {
    r -= p;
    if (r < 0) return o;
  }
  return 'jamon';
}

export function ponerObjeto(m: Mundo, tipo: Objeto, x: number, y: number, vy = 0) {
  if (m.objetos.length >= 16) return;
  if (tipo === 'cana') m.canaDada = true;
  m.objetos.push({ tipo, img: objeto(tipo), x, y, vy, t: 0 });
}

/** 15 % of the bursts leave something (12 % in the chapter's short Pang). */
export function soltarObjeto(m: Mundo, x: number, y: number) {
  if (Math.random() >= (m.armaFija ? PROBABILIDAD_CAPITULO : PROBABILIDAD)) return;
  ponerObjeto(m, elegir(m), Math.max(AREA.izq + 6, Math.min(AREA.der - 6, x)), y);
}

/** What an item at `x` would land on when its bottom goes from `desde` to `hasta`. */
function apoyo(m: Mundo, x: number, desde: number, hasta: number): number | null {
  let mejor: number | null = hasta >= AREA.suelo ? AREA.suelo : null;
  for (const b of m.bloques) {
    if (x >= b.x - 4 && x <= b.x + b.w + 4 && b.y >= desde - 1 && b.y <= hasta && (mejor === null || b.y < mejor)) mejor = b.y;
  }
  return mejor;
}

/** Fran's «poder de convocatoria»: items resting level with him, close by, slide toward his feet. */
const CONVOCA_DX = 64;
const CONVOCA_DY = 24;
const VEL_CONVOCA = 40;

/** Moves the items; those that have been waiting too long disappear. */
export function actualizarObjetos(m: Mundo, dt: number) {
  const lista = m.objetos;
  for (let i = lista.length - 1; i >= 0; i--) {
    const o = lista[i];
    o.t += dt;
    if (o.t >= DURA) {
      lista[i] = lista[lista.length - 1];
      lista.pop();
      continue;
    }
    const pie = o.y + 6;
    o.vy += GRAVEDAD * dt;
    const nuevo = pie + o.vy * dt;
    const suelo = apoyo(m, o.x, pie, nuevo);
    if (suelo !== null) {
      o.y = suelo - 6;
      o.vy = 0;
    } else o.y = nuevo - 6;
    if (o.vy === 0) convocar(m, o, dt);
  }
}

/** A resting item slides toward the nearest player who has the «convocatoria» (it may fall off a platform's edge: the rest is the fall's). */
function convocar(m: Mundo, o: ObjetoSuelto, dt: number) {
  for (const j of m.jugadores) {
    if (j.estilo.cualidad !== 'convocatoria' || j.fuera || j.caido > 0) continue;
    const dx = j.x - o.x;
    if (Math.abs(dx) >= CONVOCA_DX || Math.abs(o.y + 6 - j.y) >= CONVOCA_DY) continue;
    o.x += Math.sign(dx) * Math.min(Math.abs(dx), VEL_CONVOCA * dt);
    return;
  }
}

/** Is the item visible this frame (it blinks at the end)? */
export const objetoVisible = (t: number) => t < DURA - PARPADEA || Math.floor(t * 8) % 2 === 0;
