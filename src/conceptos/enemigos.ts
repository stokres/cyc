// The enemies of «Una más» and their simple brains. Each one is a little state machine (`estado`, `t` = seconds left in it):
//  - despertador de MAÑANA: patrols; when Fran comes close it rings (a telegraph), charges, and gets dizzy against the wall.
//  - reloj de LAS TANTAS: crawls after Fran, dripping puddles that slow him down.
//  - Gran Despertador (the garden's mini-boss): charges, leaps with a shockwave, and from half its life rings in waves.
import type { TipoEnemigo } from './datos';
import { chocaRect, moverX, moverY, sueloEn, type Caja } from './fisica';
import type { Mundo } from './mundo';

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
}

export interface Charco {
  x: number;
  y: number;
  w: number;
  vida: number;
  vida0: number;
}

export interface Proyectil {
  tipo: 'onda' | 'aro';
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vida: number;
  t: number;
}

const DEF: Record<TipoEnemigo, { hw: number; h: number; hp: number }> = {
  despertador: { hw: 20, h: 52, hp: 2 },
  reloj: { hw: 34, h: 42, hp: 3 },
  gran: { hw: 52, h: 112, hp: 14 },
};

export function crearEnemigo(tipo: TipoEnemigo, id: string, x: number, y: number): Enem {
  const d = DEF[tipo];
  return {
    tipo, id, x, y, hw: d.hw, h: d.h, vx: 0, vy: 0, hp: d.hp, hpMax: d.hp, dir: Math.random() < 0.5 ? 1 : -1, estado: tipo === 'reloj' ? 'repta' : 'patrulla',
    t: 0.4 + Math.random(), animT: Math.random() * 3, hurtT: 0, kx: 0, muerto: false, suelo: false, cd: 0, goteo: 1 + Math.random() * 1.2, turno: 0, fase: 1, cola: [], x0: x,
  };
}

const G = 2600;

/** Gravity and the tiles for an enemy. Returns true if it hit a wall moving sideways. */
function fisica(m: Mundo, e: Enem, d: number): boolean {
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
    else gran(m, e, d);
    // Contact damage.
    if (danaAlContacto(e) && j.inv <= 0 && m.estado === 'jugando') {
      const dx = Math.abs(j.x - e.x);
      const sobreX = dx < j.hw * 0.8 + e.hw * 0.85;
      const sobreY = j.y - 4 > e.y - e.h && j.y - j.h + 6 < e.y;
      if (sobreX && sobreY) m.herir(e.x);
    }
  }
  m.enems = m.enems.filter((e) => !e.muerto || e.tipo === 'gran');
}

function danaAlContacto(e: Enem): boolean {
  if (e.tipo === 'reloj') return true;
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
    p.x += p.vx * d;
    p.y += p.vy * d;
    if (p.t > p.vida) {
      m.proy.splice(i, 1);
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
