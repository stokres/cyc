// What is special about a stage (Aceituna's runs, the shadow's darkness, Zaragoza's wind)
// and the four characters' specials.
import { aceituna } from './arte/sprites';
import { avisar } from './base';
import { golpearJefe } from './jefes';
import { type JugadorVivo, type Mundo, BARRA_LLENA } from './mundo';
import { ponerObjeto } from './objetos';
import { partirTodas } from './reglas';
import { rotulo } from './hud';
import { texto } from '../juego/textos';
import { AREA } from './tipos';

// --- the characters' specials ------------------------------------------------------------

const DURA_CONGELADO = 5;
const DURA_KINKI = 6;

/**
 * Player `j` uses his special if his bar is full. Returns true if it went off. Fran's
 * freezes everything for everybody; Pablo's splits every bubble (the points are his);
 * the kinki and the bear hug are only his.
 */
export function usarPoder(m: Mundo, j: JugadorVivo): boolean {
  if (j.barra < BARRA_LLENA) return false;
  const poder = j.estilo.poder;
  avisar(m, `hud.poder.${poder}`);
  m.sfx.poder();
  switch (poder) {
    case 'penultima':
      m.congelado = Math.max(m.congelado, DURA_CONGELADO);
      break;
    case 'siy':
      partirTodas(m, j);
      if (m.jefe) golpearJefe(m, j, 3, true);
      break;
    case 'kinki':
      j.kinki = DURA_KINKI;
      break;
    case 'abrazo':
      j.escudo = 1;
      break;
  }
  j.barra = 0;
  m.hudSucio = true;
  return true;
}

// --- Aceituna (stage 3) ----------------------------------------------------------------

const VEL_ACEITUNA = 120;

export const proximaAceituna = () => 9 + Math.random() * 5;

function actualizarAceituna(m: Mundo, dt: number) {
  const a = m.aceituna;
  if (!a.activa) {
    a.prox -= dt;
    if (a.prox > 0) return;
    a.activa = true;
    a.dir = Math.random() < 0.5 ? -1 : 1;
    a.x = a.dir > 0 ? AREA.izq - 14 : AREA.der + 14;
    a.soltarX = 70 + Math.random() * 244;
    a.soltada = false;
    a.t = 0;
    return;
  }
  a.x += a.dir * VEL_ACEITUNA * dt;
  a.t += dt;
  if (!a.soltada && (a.dir > 0 ? a.x >= a.soltarX : a.x <= a.soltarX)) {
    a.soltada = true;
    ponerObjeto(m, 'jamon', a.x, AREA.suelo - 20, -90);
  }
  if (a.x < AREA.izq - 16 || a.x > AREA.der + 16) {
    a.activa = false;
    a.prox = proximaAceituna();
  }
}

// --- the shadow's darkness (stage 5) ----------------------------------------------------

const LUZ = 3;
const OSCURO = 8;
const FUNDIDO = 0.4;
const ANCHO_AREA = AREA.der - AREA.izq;
const ALTO_AREA = AREA.suelo - AREA.techo;

/** How dark the stage is now, 0 (lit) to 1: 3 s of light, then 8 s of darkness, fading in and out. */
export function oscuridad(t: number): number {
  const c = t % (LUZ + OSCURO);
  if (c < LUZ) return 0;
  const d = c - LUZ;
  return Math.min(1, d / FUNDIDO, (OSCURO - d) / FUNDIDO);
}

let capaOscura: HTMLCanvasElement | null = null;
let luces: { jugador: HTMLCanvasElement; foco: HTMLCanvasElement } | null = null;

function luz(radio: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = radio * 2;
  const x = c.getContext('2d')!;
  const d = x.createRadialGradient(radio, radio, 0, radio, radio, radio);
  d.addColorStop(0, 'rgba(0,0,0,1)');
  d.addColorStop(0.55, 'rgba(0,0,0,0.92)');
  d.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = d;
  x.fillRect(0, 0, radio * 2, radio * 2);
  return c;
}

/** Where the wandering spotlight is. */
export function foco(t: number): { x: number; y: number } {
  return { x: 192 + 150 * Math.sin(t * 0.37), y: 110 + 45 * Math.sin(t * 0.51 + 1) };
}

function dibujarOscuridad(g: CanvasRenderingContext2D, m: Mundo) {
  const a = oscuridad(m.oscuro.t);
  if (a <= 0) return;
  if (!capaOscura) {
    capaOscura = document.createElement('canvas');
    capaOscura.width = ANCHO_AREA;
    capaOscura.height = ALTO_AREA;
    luces = { jugador: luz(46), foco: luz(40) };
  }
  const x = capaOscura.getContext('2d')!;
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = 'rgba(2,3,10,0.9)';
  x.fillRect(0, 0, ANCHO_AREA, ALTO_AREA);
  x.globalCompositeOperation = 'destination-out';
  for (const j of m.jugadores) {
    if (j.fuera) continue;
    x.drawImage(luces!.jugador, Math.round(j.x - 46 - AREA.izq), Math.round(j.y - 16 - 46 - AREA.techo));
  }
  const f = foco(m.oscuro.t);
  x.drawImage(luces!.foco, Math.round(f.x - 40 - AREA.izq), Math.round(f.y - 40 - AREA.techo));
  g.globalAlpha = a;
  g.drawImage(capaOscura, AREA.izq, AREA.techo);
  g.globalAlpha = 1;
}

// --- Zaragoza's wind (stage 9) -----------------------------------------------------------

const CALMA = 5;
const RACHA = 6;
const RAYAS = 18;
const rx = new Float32Array(RAYAS);
const ry = new Float32Array(RAYAS);
const rl = new Float32Array(RAYAS);
const rv = new Float32Array(RAYAS);
for (let i = 0; i < RAYAS; i++) {
  rx[i] = AREA.izq + Math.random() * ANCHO_AREA;
  ry[i] = AREA.techo + 6 + Math.random() * (ALTO_AREA - 12);
  rl[i] = 8 + Math.random() * 14;
  rv[i] = 0.8 + Math.random() * 0.8;
}

function actualizarCierzo(m: Mundo, dt: number) {
  const c = m.cierzo;
  c.t += dt;
  if (!c.soplando && c.t >= CALMA) {
    c.soplando = true;
    c.t = 0;
  } else if (c.soplando && c.t >= RACHA) {
    c.soplando = false;
    c.t = 0;
    c.dir = Math.random() < 0.5 ? -1 : 1;
  }
  // Wind strength: ramps up and down over half a second.
  m.viento = c.soplando ? c.dir * Math.min(1, c.t / 0.5, (RACHA - c.t) / 0.5) * (m.fase.cierzo ?? 1) : 0;
  moverRayas(m.viento, dt);
}

/** The streaks that show the wind. Purely visual: an online guest moves them too. */
export function moverRayas(viento: number, dt: number) {
  if (Math.abs(viento) <= 0.02) return;
  for (let i = 0; i < RAYAS; i++) {
    rx[i] += viento * 260 * rv[i] * dt;
    if (rx[i] > AREA.der) rx[i] = AREA.izq - rl[i];
    else if (rx[i] + rl[i] < AREA.izq) rx[i] = AREA.der;
  }
}

let flechas: Record<number, HTMLCanvasElement> | null = null;

function flecha(dir: number): HTMLCanvasElement {
  if (!flechas) {
    flechas = {};
    for (const d of [-1, 1]) {
      const c = document.createElement('canvas');
      c.width = 11;
      c.height = 9;
      const x = c.getContext('2d')!;
      x.fillStyle = '#000';
      x.fillRect(0, 3, 11, 3);
      x.fillStyle = '#e8f4ff';
      x.fillRect(1, 4, 9, 1);
      for (let k = 0; k < 4; k++) {
        const px = d > 0 ? 10 - k : k;
        x.fillStyle = '#e8f4ff';
        x.fillRect(px, 4 - k, 1, 1 + 2 * k);
      }
      flechas[d] = c;
    }
  }
  return flechas[dir];
}

function dibujarCierzo(g: CanvasRenderingContext2D, m: Mundo) {
  const c = m.cierzo;
  if (Math.abs(m.viento) > 0.02) {
    g.fillStyle = 'rgba(232,244,255,0.4)';
    for (let i = 0; i < RAYAS; i++) g.fillRect(Math.round(rx[i]), Math.round(ry[i]), Math.round(rl[i]), 1);
  }
  // The warning: from a second before the gust and while it blows, the word and an arrow.
  const aviso = c.soplando || c.t > CALMA - 1;
  if (!aviso || (!c.soplando && Math.floor(c.t * 6) % 2 === 0)) return;
  const txt = rotulo(texto('hud.cierzo'), '#e8f4ff');
  const a = flecha(c.dir);
  const total = txt.width + 6 + a.width;
  const x0 = 192 - total / 2;
  g.drawImage(c.dir > 0 ? txt : a, Math.round(x0), c.dir > 0 ? 12 : 14);
  g.drawImage(c.dir > 0 ? a : txt, Math.round(x0 + (c.dir > 0 ? txt.width + 6 : a.width + 6)), c.dir > 0 ? 14 : 12);
}

// --- all together -----------------------------------------------------------------------

export function actualizarEspecial(m: Mundo, dt: number) {
  switch (m.fase.especial) {
    case 'aceituna':
      actualizarAceituna(m, dt);
      break;
    case 'oscuro':
      m.oscuro.t += dt;
      break;
    case 'cierzo':
      actualizarCierzo(m, dt);
      break;
  }
}

/** Drawn under the player and the bubbles: Aceituna. */
export function dibujarAbajo(g: CanvasRenderingContext2D, m: Mundo, espejo: (c: HTMLCanvasElement) => HTMLCanvasElement) {
  const a = m.aceituna;
  if (m.fase.especial !== 'aceituna' || !a.activa) return;
  const f = aceituna();
  const img = f[Math.floor(a.t * 12) % f.length];
  g.drawImage(a.dir > 0 ? img : espejo(img), Math.round(a.x - img.width / 2), AREA.suelo - img.height);
}

/** Drawn over everything in the play area: the darkness and the wind. */
export function dibujarArriba(g: CanvasRenderingContext2D, m: Mundo) {
  if (m.fase.especial === 'oscuro') dibujarOscuridad(g, m);
  else if (m.fase.especial === 'cierzo') dibujarCierzo(g, m);
}

