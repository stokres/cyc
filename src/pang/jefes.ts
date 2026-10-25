// The three bosses: one big bouncing (or floating) thing each, with hit points.
// Robi and el Peor bounce like bubbles; la Penúltima floats at the top and spits.
import { jefe as hojaJefe } from './arte/sprites';
import { avisar, crearBurbuja, efectoPop, llenarBarra, sumar, velocidadBurbujas } from './base';
import { moverCuerpo } from './fisica';
import type { JefeVivo, JugadorVivo, Mundo } from './mundo';
import { reventarTodas } from './reglas';
import { AREA, type ColorBola, type Jefe } from './tipos';

const COLORES: ColorBola[] = ['roja', 'azul', 'amarilla', 'verde'];
const PUNTOS_GOLPE = 100;
const PUNTOS_JEFE: Record<Jefe, number> = { robi: 3000, peor: 4000, penultima: 8000 };
/** Robi: seconds without and with the party hat. */
const SIN_GORRO = 7;
const CON_GORRO = 3;

/** The boss has more hit points the more players there are: × (1 + 0.5 × (n − 1)). */
export function crearJefe(tipo: Jefe, jugadores = 1, vida?: number): JefeVivo {
  const hoja = hojaJefe(tipo);
  const datos = {
    robi: { hp: 16, bote: 130, vel: 36, x: 96, y: 50 },
    peor: { hp: 18, bote: 100, vel: 46, x: 288, y: 60 },
    penultima: { hp: 40, bote: 0, vel: 38, x: 192, y: 70 },
  }[tipo];
  const hp = Math.round((vida ?? datos.hp) * (1 + 0.5 * (jugadores - 1)));
  return {
    tipo,
    hoja,
    x: datos.x,
    y: datos.y,
    vx: tipo === 'peor' ? -datos.vel : datos.vel,
    vy: 0,
    r: hoja.radio,
    bote: datos.bote,
    hp,
    hpMax: hp,
    golpeT: 0,
    t: 0,
    acumulado: 0,
    golpes: 0,
    gorro: false,
    gorroAviso: false,
    proximo: tipo === 'robi' ? SIN_GORRO : 3.5,
    escupeT: 0,
    escupidas: 0,
    velocidad: datos.vel,
  };
}

/** The frame to draw for the boss now. */
export function marcoJefe(j: JefeVivo): HTMLCanvasElement {
  const f = j.hoja.frames;
  if (j.golpeT > 0 && f.golpe) return f.golpe;
  if (j.tipo === 'penultima') {
    if (j.escupeT > 0 && f.escupe) return f.escupe;
    if (j.hp <= j.hpMax / 2 && f.enfadada) return f.enfadada;
  }
  if (j.tipo === 'robi' && j.gorro && f.gorrito) return f.gorrito;
  return f.normal;
}

/** One simulation step of the boss (not called while everything is frozen). */
export function actualizarJefe(m: Mundo, dt: number) {
  const j = m.jefe;
  if (!j) return;
  j.t += dt;
  if (j.golpeT > 0) j.golpeT -= dt;
  if (j.escupeT > 0) j.escupeT -= dt;
  if (j.tipo === 'robi') {
    if (j.t >= j.proximo) {
      j.gorro = !j.gorro;
      j.proximo = j.t + (j.gorro ? CON_GORRO : SIN_GORRO);
    }
    moverCuerpo(j, dt, m.bloques);
  } else if (j.tipo === 'peor') {
    j.velocidad = j.hp <= j.hpMax / 3 ? 46 * 1.3 : 46;
    j.vx = Math.sign(j.vx || 1) * j.velocidad;
    moverCuerpo(j, dt, m.bloques);
  } else {
    flotar(m, j, dt);
  }
}

/** La Penúltima: drifts left and right at the top, swaying, and spits champagne bubbles. */
function flotar(m: Mundo, j: JefeVivo, dt: number) {
  j.x += j.vx * dt;
  if (j.x - j.r < AREA.izq) {
    j.x = AREA.izq + j.r;
    j.vx = Math.abs(j.vx);
  } else if (j.x + j.r > AREA.der) {
    j.x = AREA.der - j.r;
    j.vx = -Math.abs(j.vx);
  }
  j.y = 70 + 20 * Math.sin(j.t * 1.1);
  if (j.t < j.proximo) return;
  const furiosa = j.hp <= j.hpMax / 2;
  j.proximo = j.t + (furiosa ? 2.5 : 3.5) * (m.fase.jefeEscupe ?? 1);
  j.escupeT = 0.45;
  const dos = furiosa && j.escupidas % 2 === 1;
  j.escupidas++;
  if (m.burbujas.length > 14) return;
  const v = velocidadBurbujas(m);
  const lado = Math.random() < 0.5 ? -1 : 1;
  if (dos) {
    m.burbujas.push(crearBurbuja(m, j.x - 14, j.y + j.r * 0.6, 1, 'champan', 'roja', -v, 70));
    m.burbujas.push(crearBurbuja(m, j.x + 14, j.y + j.r * 0.6, 1, 'champan', 'roja', v, 70));
  } else m.burbujas.push(crearBurbuja(m, j.x, j.y + j.r * 0.6, 1, 'champan', 'roja', lado * v, 70));
}

/** What a hit makes the boss do besides losing hit points. */
function alGolpe(m: Mundo, j: JefeVivo) {
  const v = velocidadBurbujas(m);
  const lado = Math.random() < 0.5 ? -1 : 1;
  if (j.tipo === 'robi') {
    j.golpes++;
    if (j.golpes % 2 === 0) m.burbujas.push(crearBurbuja(m, j.x, j.y, 3, 'bola', COLORES[Math.floor(Math.random() * COLORES.length)], lado * v, -120));
  } else if (j.tipo === 'peor') {
    m.burbujas.push(crearBurbuja(m, j.x, j.y, 3, 'cerdito', 'roja', lado * v, -120));
  }
}

/**
 * A shot of player `p` reaches the boss. Returns false if it bounced off (Robi's party hat).
 * `danio` is 1 for a harpoon, 0.34 for a bullet; the special ignores the hat.
 */
export function golpearJefe(m: Mundo, p: JugadorVivo, danio: number, ignoraGorro = false): boolean {
  const j = m.jefe;
  if (!j) return false;
  if (j.gorro && !ignoraGorro) {
    m.sfx.clonk();
    if (!j.gorroAviso) {
      j.gorroAviso = true;
      avisar(m, 'hud.gorrito');
    }
    return false;
  }
  j.hp -= danio;
  j.golpeT = 0.1;
  m.sfx.golpeJefe();
  llenarBarra(p, Math.min(1, danio));
  j.acumulado += danio;
  const enteros = Math.floor(j.acumulado);
  if (enteros > 0) {
    j.acumulado -= enteros;
    sumar(m, p, PUNTOS_GOLPE, j.x, j.y - j.r);
    if (j.hp > 0) alGolpe(m, j);
  }
  if (j.hp <= 0) matarJefe(m, p);
  return true;
}

/** The boss bursts into a string of pops. La Penúltima takes every bubble with her. */
function matarJefe(m: Mundo, p: JugadorVivo) {
  const j = m.jefe;
  if (!j) return;
  m.jefe = null;
  m.finJefe = 0;
  for (let k = 0; k < 12; k++) {
    efectoPop(m, j.x + (Math.random() - 0.5) * j.hoja.w * 0.8, j.y + (Math.random() - 0.5) * j.hoja.h * 0.8, 'cerveza', k % 3 === 0 ? 0 : 1, k * 0.08);
  }
  sumar(m, p, PUNTOS_JEFE[j.tipo], j.x, j.y);
  m.sfx.jefeDerrotado();
  if (j.tipo === 'penultima') reventarTodas(m, p);
}
