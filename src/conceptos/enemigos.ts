// The enemies of «Una más» and their simple brains. Each one is a little state machine (`estado`, `t` = seconds left in it):
//  - sobre de EL TRABAJO: flies in formation (a swarm sharing one sway), and dives at Fran one after another.
//  - NO gigante: bounces along the floor and turns at the walls.
//  - bola de discoteca, chupito y altavoz (zone 3, La Pista de Baile) and EL DJ (its mini-boss): pista.ts.
//  - El Apuntador (zone 4's): teleports between posts, throws scripts and calls spotlights that drop giant NOs.

//  - despertador de MAÑANA: patrols; when Fran comes close it rings (a telegraph), charges, and gets dizzy against the wall.
//  - reloj de LAS TANTAS: crawls after Fran, dripping puddles that slow him down.
//  - Gran Despertador (the garden's mini-boss): charges, leaps with a shockwave, and from half its life rings in waves.
import type { TipoEnemigo } from './datos';
import { TILE } from './datos';
import { chocaRect, moverX, moverY, sueloEn, type Caja } from './fisica';
import type { Mundo } from './mundo';
import { altavoz, bola, chupito, dj, pulso, vinilo } from './pista';

export interface Enem extends Caja {
  tipo: TipoEnemigo;
  id: string;
  vx: number;
  vy: number;
  hp: number;
  hpMax: number;
  dir: 1 | -1;
  estado: string;
  /** Seconds left in the state (counts down). */
  t: number;
  animT: number;
  hurtT: number;
  /** Knockback: seconds during which the brain does nothing. */
  kx: number;
  muerto: boolean;
  suelo: boolean;
  /** Cool-down before it can notice Fran again. */
  cd: number;
  goteo: number;
  /** Boss: which attack is next and which phase it is in. */
  turno: number;
  fase: number;
  /** Boss: rings still to launch (time, height). */
  cola: { t: number; h: number }[];
  /** Position at the start of a charge (to know how far it ran). */
  x0: number;
  /** Home height of a flying envelope. */
  y0: number;
  /** Opacity (El Apuntador fades while he teleports). */
  alfa: number;
  /** Mirror ball: the angle of its beam now (from straight down, to the right), where the sweep ends and where it starts, and the beam's length. El DJ: `b` is the time since his throw. */
  a: number;
  b: number;
  c: number;
  l: number;
}

export interface Charco {
  x: number;
  y: number;
  w: number;
  vida: number;
  vida0: number;
}

export interface Proyectil {
  tipo: 'onda' | 'aro' | 'guion' | 'foco' | 'vinilo' | 'pulso';
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vida: number;
  t: number;
  /** A vinyl: where it will land. */
  tx?: number;
}

const DEF: Record<TipoEnemigo, { hw: number; h: number; hp: number }> = {
  despertador: { hw: 20, h: 52, hp: 2 },
  reloj: { hw: 34, h: 42, hp: 3 },
  gran: { hw: 52, h: 112, hp: 14 },
  sobre: { hw: 24, h: 34, hp: 1 },
  no: { hw: 36, h: 54, hp: 3 },
  bola: { hw: 28, h: 56, hp: 2 },
  chupito: { hw: 20, h: 44, hp: 2 },
  altavoz: { hw: 30, h: 96, hp: 3 },
  dj: { hw: 64, h: 120, hp: 9 },
  apuntador: { hw: 30, h: 132, hp: 14 },
};

/** The mini-bosses. */
export const esJefe = (e: { tipo: TipoEnemigo }) => e.tipo === 'gran' || e.tipo === 'dj' || e.tipo === 'apuntador';

/** Enemies that hang or fly: a hit does not knock them about or make them fall. */
export const colgante = (e: { tipo: TipoEnemigo }) => e.tipo === 'sobre' || e.tipo === 'bola' || e.tipo === 'dj';

export function crearEnemigo(tipo: TipoEnemigo, id: string, x: number, y: number): Enem {
  const d = DEF[tipo];
  return {
    tipo, id, x, y, hw: d.hw, h: d.h, vx: 0, vy: 0, hp: d.hp, hpMax: d.hp, dir: Math.random() < 0.5 ? 1 : -1, estado: tipo === 'reloj' ? 'repta' : tipo === 'no' ? 'bota' : 'patrulla',
    t: 0.4 + Math.random(), animT: Math.random() * 3, hurtT: 0, kx: 0, muerto: false, suelo: false, cd: 0, goteo: 1 + Math.random() * 1.2, turno: 0, fase: 1, cola: [], x0: x, y0: y, alfa: 1, a: 0, b: 0, c: 0, l: 0,
  };
}

const G = 2600;

/** Gravity and the tiles for an enemy. Returns true if it hit a wall moving sideways. */
export function fisica(m: Mundo, e: Enem, d: number): boolean {
  e.vy = Math.min(1100, e.vy + G * d);
  const muro = moverX(m.rej, e, e.vx * d);
  const r = moverY(m.rej, e, e.vy * d);
  if (r === 1) {
    e.suelo = true;
    e.vy = 0;
  } else if (r === -1) e.vy = 0;
  else e.suelo = false;
  return muro;
}

const aprox = (v: number, a: number, d: number) => (v < a ? Math.min(a, v + d) : Math.max(a, v - d));

export function actualizarEnemigos(m: Mundo, d: number) {
  const j = m.j;
  for (const e of m.enems) {
    e.animT += d;
    e.hurtT = Math.max(0, e.hurtT - d);
    e.cd = Math.max(0, e.cd - d);
    if (e.muerto) continue;
    if (e.estado === 'dormido') continue;
    // Knockback: just slide and fall.
    if (e.kx > 0) {
      e.kx -= d;
      e.vx = aprox(e.vx, 0, 900 * d);
      fisica(m, e, d);
      continue;
    }
    e.t -= d;
    if (e.tipo === 'despertador') despertador(m, e, d);
    else if (e.tipo === 'reloj') reloj(m, e, d);
    else if (e.tipo === 'sobre') sobre(m, e, d);
    else if (e.tipo === 'no') no(m, e, d);
    else if (e.tipo === 'apuntador') apuntador(m, e, d);
    else if (e.tipo === 'bola') bola(m, e, d);
    else if (e.tipo === 'chupito') chupito(m, e, d);
    else if (e.tipo === 'altavoz') altavoz(m, e, d);
    else if (e.tipo === 'dj') dj(m, e, d);
    else gran(m, e, d);
    // Contact damage.
    if (danaAlContacto(e) && j.inv <= 0 && m.estado === 'jugando') {
      const dx = Math.abs(j.x - e.x);
      const sobreX = dx < j.hw * 0.8 + e.hw * 0.85;
      const sobreY = j.y - 4 > e.y - e.h && j.y - j.h + 6 < e.y;
      if (sobreX && sobreY) m.herir(e.x);
    }
  }
  m.enems = m.enems.filter((e) => !e.muerto || esJefe(e));
}

function danaAlContacto(e: Enem): boolean {
  if (e.tipo === 'reloj' || e.tipo === 'sobre' || e.tipo === 'no' || e.tipo === 'chupito') return true;
  if (e.tipo === 'apuntador' || e.tipo === 'bola' || e.tipo === 'altavoz' || e.tipo === 'dj') return false;
  if (e.tipo === 'despertador') return e.estado !== 'mareo';
  return e.estado === 'carga' || e.estado === 'espera' || e.estado === 'salta' || e.estado === 'agacha' || e.estado === 'alerta' || e.estado === 'ring' || e.estado === 'aterriza';
}

// ---------------------------------------------------------------- the alarm clock

function despertador(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  const dx = j.x - e.x;
  switch (e.estado) {
    case 'patrulla': {
      e.vx = e.dir * 58;
      const muro = fisica(m, e, d);
      const borde = e.suelo && !sueloEn(m.rej, e.x + e.dir * (e.hw + 6), e.y);
      if (muro || borde) {
        e.dir = (e.dir * -1) as 1 | -1;
        e.vx = 0;
        e.x -= e.dir * -0.5;
      }
      // It notices Fran: in front of it within a few tiles, or very close behind.
      if (e.cd <= 0 && Math.abs(j.y - e.y) < 100 && ((Math.abs(dx) < 330 && Math.sign(dx) === e.dir) || Math.abs(dx) < 130) && e.suelo && m.estado === 'jugando') {
        e.estado = 'alerta';
        e.t = 0.62;
        e.dir = dx >= 0 ? 1 : -1;
        e.vx = 0;
        m.snd.riiing();
        m.fx.onda(e.x, e.y - e.h - 8, 6, '#ffe9a8', 9, 0.4);
      }
      break;
    }
    case 'alerta':
      e.vx = 0;
      fisica(m, e, d);
      if (Math.random() < d * 18) m.fx.chispas(e.x + (Math.random() - 0.5) * 50, e.y - e.h - 6, 1, 0, 160, '#ffcf4a', Math.PI * 2);
      if (e.t <= 0) {
        e.estado = 'carga';
        e.t = 0.95;
        e.x0 = e.x;
        e.dir = j.x >= e.x ? 1 : -1;
        m.snd.embiste();
      }
      break;
    case 'carga': {
      e.vx = e.dir * 440;
      const muro = fisica(m, e, d);
      const borde = e.suelo && !sueloEn(m.rej, e.x + e.dir * (e.hw + 10), e.y);
      if (Math.random() < 0.5) m.fx.polvo(e.x - e.dir * 14, e.y, 1, 8);
      if (muro || borde || e.t <= 0) {
        if (muro) {
          m.fx.polvo(e.x + e.dir * e.hw, e.y - e.h * 0.5, 5, 10);
          m.fx.estrellas(e.x + e.dir * e.hw, e.y - e.h, 4);
          m.fx.sacudir(2);
        }
        e.estado = 'mareo';
        e.t = 1.1;
        e.vx = e.dir * (muro ? -90 : 0);
        e.cd = 1.2;
      }
      break;
    }
    case 'mareo':
      e.vx = aprox(e.vx, 0, 500 * d);
      fisica(m, e, d);
      if (Math.random() < d * 6) m.fx.estrellas(e.x + (Math.random() - 0.5) * 30, e.y - e.h - 10, 1, '#ffe9a8');
      if (e.t <= 0) {
        e.estado = 'patrulla';
        e.t = 1;
      }
      break;
  }
}

// ---------------------------------------------------------------- the clock of «las tantas»

function reloj(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  const dx = j.x - e.x;
  const cerca = Math.abs(dx) < 460 && Math.abs(j.y - e.y) < 200 && m.estado === 'jugando';
  if (cerca && Math.abs(dx) > 18) e.dir = dx >= 0 ? 1 : -1;
  e.vx = e.dir * (cerca ? 42 : 30);
  const muro = fisica(m, e, d);
  const borde = e.suelo && !sueloEn(m.rej, e.x + e.dir * (e.hw + 4), e.y);
  if (muro || borde) {
    e.dir = (e.dir * -1) as 1 | -1;
    e.vx = 0;
  }
  e.goteo -= d;
  if (e.estado === 'gotea') {
    e.vx = 0;
    if (e.t <= 0) e.estado = 'repta';
  } else if (e.goteo <= 0 && e.suelo) {
    e.goteo = 1.9 + Math.random() * 0.6;
    e.estado = 'gotea';
    e.t = 0.4;
    m.charcos.push({ x: e.x - e.dir * 14, y: e.y, w: 92, vida: 7, vida0: 7 });
    if (m.charcos.length > 6) m.charcos.shift();
    m.snd.goteo();
    m.fx.gotas(e.x - e.dir * 14, e.y - 8, 4, 0, 160, '#7a66e0');
  }
}

// ---------------------------------------------------------------- the envelopes of EL TRABAJO

/**
 * A swarm: each envelope sways along the same path (`x0`, `y0` is its own place in the formation, so the formation holds), and now and then, one after
 * the other (`turno` is its number, `cd` the wait), they dive at where Fran stands and fly back home.
 */
function sobre(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  const t = m.reloj;
  const homeX = e.x0 + Math.sin(t * 0.75) * 150;
  const homeY = e.y0 + Math.sin(t * 2.1 + e.turno * 0.7) * 9;
  switch (e.estado) {
    case 'patrulla': {
      e.dir = Math.cos(t * 0.75) >= 0 ? 1 : -1;
      e.x = homeX;
      e.y = homeY;
      const dx = j.x - e.x;
      const dy = j.y - 40 - e.y;
      if (e.cd <= 0 && m.estado === 'jugando' && Math.abs(dx) < 330 && dy > -30 && dy < 430) {
        e.estado = 'alerta';
        e.t = 0.42;
      }
      break;
    }
    case 'alerta': {
      // It stops and shudders, mouth open.
      e.x += (Math.random() - 0.5) * 2.4;
      e.dir = j.x >= e.x ? 1 : -1;
      if (e.t <= 0) {
        const dx = j.x - e.x;
        const dy = j.y - 36 - e.y;
        const n = Math.hypot(dx, dy) || 1;
        e.vx = (dx / n) * 400;
        e.vy = (dy / n) * 400;
        e.estado = 'pica';
        e.t = 0.95;
      }
      break;
    }
    case 'pica': {
      e.x += e.vx * d;
      e.y += e.vy * d;
      e.dir = e.vx >= 0 ? 1 : -1;
      if (chocaRect(m.rej, e.x - 14, e.y - e.h * 0.8, e.x + 14, e.y - e.h * 0.2) || e.t <= 0) {
        e.estado = 'vuelve';
        e.t = 3;
        e.cd = 1.6 + Math.random() * 1.2;
      }
      break;
    }
    case 'vuelve': {
      const dx = homeX - e.x;
      const dy = homeY - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 16 || e.t <= 0) {
        e.estado = 'patrulla';
      } else {
        e.x += (dx / dist) * 250 * d;
        e.y += (dy / dist) * 250 * d;
        e.dir = dx >= 0 ? 1 : -1;
      }
      break;
    }
  }
}

// ---------------------------------------------------------------- the bouncing NO

function no(m: Mundo, e: Enem, d: number) {
  e.vx = e.dir * 135;
  const muro = fisica(m, e, d);
  if (muro) e.dir = (e.dir * -1) as 1 | -1;
  if (e.suelo) {
    e.vy = -840;
    m.fx.polvo(e.x, e.y, 2, 12);
  }
  if (e.y > m.H + 200) e.muerto = true;
}

// ---------------------------------------------------------------- El Apuntador

const ATAQUES_AP = ['guion', 'salta', 'foco', 'guion', 'salta', 'guion', 'foco', 'salta'];

function apuntador(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  const f2 = e.fase === 2;
  if (e.fase === 1 && e.hp <= e.hpMax / 2 && (e.estado === 'espera' || e.estado === 'guion')) {
    e.fase = 2;
    e.estado = 'espera';
    e.t = 0.9;
    m.fx.sacudir(6);
    m.fx.destello(0.35, '#b08aff');
    m.snd.riiing(true);
  }
  e.alfa = e.estado === 'desaparece' ? Math.max(0, e.t / 0.35) : e.estado === 'aparece' ? 1 - Math.max(0, e.t / 0.35) : 1;
  switch (e.estado) {
    case 'alerta':
      e.vx = 0;
      fisica(m, e, d);
      e.dir = j.x >= e.x ? 1 : -1;
      if (Math.random() < d * 16) m.fx.chispas(e.x + (Math.random() - 0.5) * 70, e.y - e.h, 1, 0, 160, '#c8b0ff', Math.PI * 2);
      if (e.t <= 0 && m.estado === 'jugando') {
        e.estado = 'espera';
        e.t = 0.7;
      }
      break;
    case 'espera':
      e.vx = 0;
      fisica(m, e, d);
      e.dir = j.x >= e.x ? 1 : -1;
      if (e.t <= 0) siguienteApuntador(m, e);
      break;
    case 'guion': {
      e.vx = 0;
      fisica(m, e, d);
      e.dir = j.x >= e.x ? 1 : -1;
      for (const r of e.cola) r.t -= d;
      while (e.cola.length && e.cola[0].t <= 0) {
        const r = e.cola.shift()!;
        // The farther Fran is, the harder the throw; some fly high, some low.
        const fuerza = Math.max(0.7, Math.min(1.5, Math.abs(j.x - e.x) / 380));
        m.proy.push({ tipo: 'guion', x: e.x + e.dir * 34, y: e.y - 112, vx: e.dir * (250 + r.h) * fuerza, vy: -380 - r.h * 1.4, r: 0, vida: 3.2, t: 0 });
        m.snd.embiste();
        m.fx.onda(e.x + e.dir * 34, e.y - 112, 8, '#e8dcff', 10, 0.25);
      }
      if (e.t <= 0 && !e.cola.length) {
        e.estado = 'espera';
        e.t = f2 ? 0.5 : 0.8;
      }
      break;
    }
    case 'foco':
      e.vx = 0;
      fisica(m, e, d);
      e.dir = j.x >= e.x ? 1 : -1;
      if (Math.random() < d * 22) m.fx.chispas(e.x + (Math.random() - 0.5) * 60, e.y - e.h - 6, 1, 0, 200, '#fff3b0', Math.PI * 2);
      if (e.t <= 0) {
        e.estado = 'espera';
        e.t = f2 ? 0.5 : 0.9;
      }
      break;
    case 'desaparece':
      e.vx = 0;
      fisica(m, e, d);
      if (Math.random() < d * 40) m.fx.chispas(e.x + (Math.random() - 0.5) * 60, e.y - Math.random() * e.h, 1, 0, 180, '#c8b0ff', Math.PI * 2);
      if (e.t <= 0) {
        const p = puestoLejano(m, e);
        if (p) {
          e.x = p.x;
          e.y = p.y;
          e.vy = 0;
        }
        m.fx.onda(e.x, e.y - e.h * 0.5, 12, '#c8b0ff', 18, 0.4);
        e.estado = 'aparece';
        e.t = 0.35;
      }
      break;
    case 'aparece':
      e.vx = 0;
      fisica(m, e, d);
      e.dir = j.x >= e.x ? 1 : -1;
      if (e.t <= 0) {
        e.estado = 'espera';
        e.t = f2 ? 0.4 : 0.6;
      }
      break;
    default:
      fisica(m, e, d);
  }
}

/** The post (tile of his feet) farthest from Fran among the ones the room offers, other than where El Apuntador stands. */
function puestoLejano(m: Mundo, e: Enem): { x: number; y: number } | null {
  const ps = (m.sala.jefe?.puestos ?? []).map((p) => ({ x: (p.col + 0.5) * TILE, y: (p.fila + 1) * TILE }));
  const otros = ps.filter((p) => Math.abs(p.x - e.x) > 40 || Math.abs(p.y - e.y) > 40);
  if (!otros.length) return null;
  otros.sort((a, b) => Math.abs(b.x - m.j.x) - Math.abs(a.x - m.j.x));
  // Mostly the farthest, sometimes another.
  return Math.random() < 0.65 ? otros[0] : otros[Math.floor(Math.random() * otros.length)];
}

function siguienteApuntador(m: Mundo, e: Enem) {
  const f2 = e.fase === 2;
  let a = ATAQUES_AP[e.turno++ % ATAQUES_AP.length];
  const nos = m.enems.filter((x) => x.tipo === 'no' && !x.muerto).length;
  if (a === 'foco' && nos >= 2) a = 'guion';
  if (a === 'guion') {
    e.estado = 'guion';
    const n = f2 ? 5 : 3;
    e.cola = Array.from({ length: n }, (_, i) => ({ t: 0.6 + i * (f2 ? 0.42 : 0.55), h: [0, 90, 40, 120, 60][i % 5] }));
    e.t = e.cola[n - 1].t + 0.2;
    m.decirEnem(e, 'apuntador.guion');
  } else if (a === 'foco') {
    e.estado = 'foco';
    e.t = 1.7;
    const n = f2 ? 4 : 3;
    const lado = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const x = Math.max(2.5 * TILE, Math.min(m.W - 2.5 * TILE, m.j.x + (i === 0 ? 0 : lado * (i % 2 ? 1 : -1) * (150 + 130 * Math.floor((i + 1) / 2)))));
      m.proy.push({ tipo: 'foco', x, y: e.y, vx: 0, vy: 0, r: 0, vida: 0.95 + i * 0.22, t: 0 });
    }
    m.snd.riiing();
    m.decirEnem(e, 'apuntador.foco');
  } else {
    e.estado = 'desaparece';
    e.t = 0.35;
    m.snd.riiing();
  }
}

// ---------------------------------------------------------------- the Gran Despertador

const ATAQUES_1 = ['carga', 'salto', 'carga', 'salto', 'salto'];
const ATAQUES_2 = ['carga', 'ring', 'salto', 'ring', 'carga', 'salto'];

function gran(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  const f2 = e.fase === 2;
  const vel = f2 ? 1.22 : 1;
  // Phase two: at half its life it roars and speeds up.
  if (e.fase === 1 && e.hp <= e.hpMax / 2 && e.estado !== 'carga' && e.estado !== 'salta') {
    e.fase = 2;
    e.estado = 'espera';
    e.t = 1.0;
    e.turno = 0;
    m.fx.sacudir(10);
    m.fx.destello(0.4, '#ff5a4a');
    m.snd.riiing(true);
    m.fx.onda(e.x, e.y - e.h * 0.5, 20, '#ff7a6a', 24, 0.7);
  }
  switch (e.estado) {
    case 'alerta': {
      // Telegraph of a charge (or the entrance).
      e.vx = 0;
      fisica(m, e, d);
      if (Math.random() < d * 22) m.fx.chispas(e.x + (Math.random() - 0.5) * 120, e.y - e.h - 8, 1, 0, 220, '#ffcf4a', Math.PI * 2);
      e.dir = j.x >= e.x ? 1 : -1;
      if (e.t <= 0 && m.estado === 'jugando') {
        e.estado = 'carga';
        e.t = 3;
        e.x0 = e.x;
        m.snd.embiste();
      }
      break;
    }
    case 'espera': {
      e.vx = 0;
      fisica(m, e, d);
      e.dir = j.x >= e.x ? 1 : -1;
      if (e.t <= 0) siguienteAtaque(m, e);
      break;
    }
    case 'carga': {
      e.vx = e.dir * 560 * vel;
      const muro = fisica(m, e, d);
      if (Math.random() < 0.6) m.fx.polvo(e.x - e.dir * 40, e.y, 1, 20);
      if (Math.floor(e.animT * 14) % 2 === 0) m.fx.sacudir(1.2);
      if (muro) {
        m.fx.sacudir(13);
        m.fx.parar(0.08);
        m.fx.polvo(e.x + e.dir * e.hw, e.y - 50, 10, 24);
        m.fx.estrellas(e.x + e.dir * e.hw, e.y - e.h, 10);
        m.snd.pisoton();
        e.estado = 'mareo';
        e.t = f2 ? 1.2 : 1.6;
        e.vx = -e.dir * 130;
        e.dir = (e.dir * -1) as 1 | -1;
      }
      break;
    }
    case 'mareo':
      e.vx = aprox(e.vx, 0, 400 * d);
      fisica(m, e, d);
      if (Math.random() < d * 8) m.fx.estrellas(e.x + (Math.random() - 0.5) * 80, e.y - e.h - 12, 1, '#ffe9a8');
      if (e.t <= 0) {
        e.estado = 'espera';
        e.t = f2 ? 0.45 : 0.7;
      }
      break;
    case 'agacha':
      e.vx = 0;
      fisica(m, e, d);
      e.dir = j.x >= e.x ? 1 : -1;
      if (e.t <= 0) {
        e.estado = 'salta';
        e.vy = -960;
        e.vx = Math.max(-520, Math.min(520, (j.x - e.x) * 1.15)) * vel;
        e.t = 0.2;
        m.snd.embiste();
      }
      break;
    case 'salta': {
      fisica(m, e, d);
      if (e.suelo && e.t <= 0) {
        // The landing: a boom and a shockwave along the floor on both sides.
        e.estado = 'aterriza';
        e.t = f2 ? 0.5 : 0.7;
        e.vx = 0;
        m.fx.sacudir(14);
        m.fx.parar(0.07);
        m.fx.polvo(e.x, e.y, 14, 60);
        m.fx.onda(e.x, e.y - 4, 20, '#ffe9a8', 26, 0.45);
        m.snd.pisoton();
        for (const lado of [-1, 1]) m.proy.push({ tipo: 'onda', x: e.x + lado * (e.hw + 6), y: e.y, vx: lado * 390 * vel, vy: 0, r: 0, vida: 3, t: 0 });
      }
      break;
    }
    case 'aterriza':
      e.vx = 0;
      fisica(m, e, d);
      if (e.t <= 0) {
        e.estado = 'espera';
        e.t = f2 ? 0.4 : 0.65;
      }
      break;
    case 'ring': {
      e.vx = 0;
      fisica(m, e, d);
      e.dir = j.x >= e.x ? 1 : -1;
      for (const r of e.cola) r.t -= d;
      while (e.cola.length && e.cola[0].t <= 0) {
        const r = e.cola.shift()!;
        m.proy.push({ tipo: 'aro', x: e.x + e.dir * 56, y: e.y - r.h, vx: e.dir * 300, vy: 0, r: 30, vida: 4, t: 0 });
        m.snd.riiing();
        m.fx.onda(e.x + e.dir * 56, e.y - r.h, 8, '#ffcf4a', 12, 0.3);
        m.fx.sacudir(2);
      }
      if (e.t <= 0 && !e.cola.length) {
        e.estado = 'espera';
        e.t = 0.6;
      }
      break;
    }
    default:
      fisica(m, e, d);
  }
}

function siguienteAtaque(m: Mundo, e: Enem) {
  const lista = e.fase === 2 ? ATAQUES_2 : ATAQUES_1;
  const a = lista[e.turno++ % lista.length];
  if (a === 'carga') {
    e.estado = 'alerta';
    e.t = e.fase === 2 ? 0.6 : 0.8;
    m.snd.riiing();
  } else if (a === 'salto') {
    e.estado = 'agacha';
    e.t = e.fase === 2 ? 0.34 : 0.5;
  } else {
    e.estado = 'ring';
    e.t = 2.4;
    // Low, high, low, high: jump the low ones, stay down for the high ones.
    e.cola = [{ t: 0.55, h: 38 }, { t: 1.15, h: 128 }, { t: 1.75, h: 38 }, { t: 2.35, h: 128 }];
    e.t = 2.5;
    m.snd.riiing(true);
  }
}

// ---------------------------------------------------------------- the shots

export function actualizarProyectiles(m: Mundo, d: number) {
  const j = m.j;
  for (let i = m.proy.length - 1; i >= 0; i--) {
    const p = m.proy[i];
    p.t += d;
    // The Pista's: a bass pulse that shoves, a vinyl that flies, rolls and can be sent back.
    if (p.tipo === 'pulso' || p.tipo === 'vinilo') {
      if ((p.tipo === 'pulso' ? pulso(m, p, d) : vinilo(m, p, d))) m.proy.splice(i, 1);
      continue;
    }
    if (p.tipo === 'guion') p.vy += 1300 * d;
    p.x += p.vx * d;
    p.y += p.vy * d;
    if (p.t > p.vida) {
      // A spotlight that has finished its warning drops a giant NO from the ceiling.
      if (p.tipo === 'foco') {
        const n = crearEnemigo('no', `foco.${Math.floor(p.x)}.${Math.floor(m.reloj * 10)}`, p.x, 2.2 * TILE);
        n.dir = Math.random() < 0.5 ? 1 : -1;
        n.vy = 200;
        m.enems.push(n);
        m.fx.polvo(p.x, p.y, 8, 20);
        m.fx.sacudir(3);
      }
      m.proy.splice(i, 1);
      continue;
    }
    if (p.tipo === 'foco') continue;
    if (p.tipo === 'guion') {
      // A script that arcs and bounces once on the floor.
      const lado = Math.sign(p.vx) || 1;
      if (chocaRect(m.rej, p.x + lado * 14, p.y - 6, p.x + lado * 18, p.y + 6)) p.vx = -p.vx * 0.5;
      if (p.vy > 0 && chocaRect(m.rej, p.x - 10, p.y + 6, p.x + 10, p.y + 12)) {
        if (p.r === 0) {
          p.r = 1;
          p.vy = -Math.abs(p.vy) * 0.5;
          m.fx.polvo(p.x, p.y + 8, 4, 8);
        } else {
          m.proy.splice(i, 1);
          continue;
        }
      }
      if (Math.abs(j.x - p.x) < 20 + j.hw && j.y > p.y - 14 && j.y - j.h < p.y + 14 && m.estado === 'jugando') m.herir(p.x);
      continue;
    }
    if (p.tipo === 'onda') {
      // A bank of dust running along the floor, 30 high.
      const lado = Math.sign(p.vx);
      if (chocaRect(m.rej, p.x + lado * 10, p.y - 20, p.x + lado * 14, p.y - 4)) {
        m.fx.polvo(p.x, p.y, 6, 10);
        m.proy.splice(i, 1);
        continue;
      }
      if (Math.random() < 0.7) m.fx.polvo(p.x, p.y, 1, 6, 'rgba(255,230,190,0.55)');
      if (Math.abs(j.x - p.x) < 20 + j.hw && j.y > p.y - 34 && j.y - j.h < p.y && m.estado === 'jugando') m.herir(p.x);
    } else {
      // A ring that grows as it travels.
      p.r = 30 + p.t * 14;
      const lado = Math.sign(p.vx);
      if (chocaRect(m.rej, p.x + lado * p.r, p.y - 4, p.x + lado * p.r + 2, p.y + 4)) {
        m.fx.onda(p.x, p.y, p.r * 0.6, '#ffcf4a', 10, 0.3);
        m.proy.splice(i, 1);
        continue;
      }
      if (Math.random() < 0.6) m.fx.chispas(p.x + (Math.random() - 0.5) * p.r, p.y + (Math.random() - 0.5) * p.r, 1, 0, 80, '#ffcf4a', Math.PI * 2);
      // Circle against Fran's box.
      const cx = Math.max(j.x - j.hw + 3, Math.min(j.x + j.hw - 3, p.x));
      const cy = Math.max(j.y - j.h + 4, Math.min(j.y - 2, p.y));
      const rr = p.r * 0.82;
      if ((cx - p.x) ** 2 + (cy - p.y) ** 2 < rr * rr && m.estado === 'jugando') m.herir(p.x);
    }
  }
}
