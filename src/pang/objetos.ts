// Items bubbles drop: they fall, wait on the floor or a block, and blink before leaving.
import { objeto } from './arte/sprites';
import { GRAVEDAD, type Mundo } from './mundo';
import { AREA, type Objeto } from './tipos';

const DURA = 6;
const PARPADEA = 2;
const PROBABILIDAD = 0.12;
const COMIDA: Array<[Objeto, number]> = [['jamon', 25], ['aceitunas', 30], ['croqueta', 22], ['turron', 15], ['yema', 8]];

/** Picks what drops: food 55 %, clock 12, shot 10, shield 13, beer 5 (those that make no sense here become food). */
function elegir(m: Mundo): Objeto {
  const r = Math.random() * 95;
  if (r < 12) return 'reloj';
  if (r < 22) return m.fase.jefe ? comida() : 'chupito';
  if (r < 35) return 'escudo';
  if (r < 40) return m.canaDada ? comida() : 'cana';
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

/** 12 % of the bursts leave something. */
export function soltarObjeto(m: Mundo, x: number, y: number) {
  if (Math.random() >= PROBABILIDAD) return;
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
  }
}

/** Is the item visible this frame (it blinks at the end)? */
export const objetoVisible = (t: number) => t < DURA - PARPADEA || Math.floor(t * 8) % 2 === 0;
