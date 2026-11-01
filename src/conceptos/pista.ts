// La Pista de Baile (zone 3): the three little brains of its enemies, the lit floor and EL DJ.
//  - bola: a mirror ball hung from the ceiling. It stops, flashes (a thin line shows where the beam starts) and sweeps a beam of light across (that hurts).
//  - chupito: a shot glass with legs that hops to the beat (a squat first, so it reads); every third hop is a big one towards Fran.
//  - altavoz: a speaker. Its cone shakes, then a pulse runs out and shoves Fran back (it does not hurt). A jarrazo silences it for a while.
//  - EL DJ (the mini-boss): high in his booth, out of reach. He throws vinyls that fly in an arc (a ring on the floor shows where they will land) and
//    then roll; Fran can send one BACK with a well-timed jarrazo (`devolverVinilos`): the returned vinyl flies to the DJ and hurts him. Meanwhile
//    the floor, eight lit tiles, lights up to the beat (124 bpm, the DJ's music): the tiles that turn red warn and then burn. At the end he drops the
//    beat: the music stops for a moment and then several vinyls come at once.
import { TILE } from './datos';
import { fisica, type Enem, type Proyectil } from './enemigos';
import { chocaRect, sueloEn } from './fisica';
import type { Mundo } from './mundo';

/** The DJ's tempo and the length of a beat in seconds. */
export const BPM = 124;
export const PULSO = 60 / BPM;

// ---------------------------------------------------------------- the mirror ball

/** The beam is this long (units); it stops at the first solid tile. */
export const HAZ_LARGO = 330;
const HAZ_ANCHO = 12;

export function bola(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  const t = m.reloj;
  // Hung from its chain: it sways a little round its place (x0, y0 is where it hangs).
  e.x = e.x0 + Math.sin(t * 1.3 + e.animT * 0.01) * 7;
  e.y = e.y0 + Math.sin(t * 2.2) * 3;
  const cx = e.x;
  const cy = e.y - e.h / 2;
  switch (e.estado) {
    case 'alerta': {
      // Telegraph: the ball shudders and a thin line shows where the beam will start.
      e.l = 0;
      e.a = e.c;
      if (e.t <= 0) {
        e.estado = 'barre';
        e.t = 1.9;
        m.snd.haz();
      }
      break;
    }
    case 'barre': {
      const k = Math.min(1, Math.max(0, 1 - e.t / 1.9));
      const s = k * k * (3 - 2 * k) * 0.35 + k * 0.65;
      e.a = e.c + (e.b - e.c) * s;
      e.l = largoHaz(m, cx, cy, e.a);
      if (Math.random() < d * 40) m.fx.chispas(cx + Math.sin(e.a) * e.l, cy + Math.cos(e.a) * e.l, 1, 0, 90, '#fff3b0', Math.PI * 2);
      if (m.estado === 'jugando' && j.inv <= 0) {
        for (let r = 30; r <= e.l; r += 16) {
          const px = cx + Math.sin(e.a) * r;
          const py = cy + Math.cos(e.a) * r;
          if (Math.abs(px - j.x) < j.hw + HAZ_ANCHO && py > j.y - j.h - 4 && py < j.y + 6) {
            m.herir(px);
            break;
          }
        }
      }
      if (e.t <= 0) {
        e.estado = 'enfria';
        e.t = 0.4;
        e.l = 0;
        e.cd = 1.6;
      }
      break;
    }
    case 'enfria':
      e.l = 0;
      if (e.t <= 0) e.estado = 'patrulla';
      break;
    default: {
      // Waiting: when Fran comes under it, it winds up for a sweep that will cross where he stands.
      e.l = 0;
      const dx = j.x - cx;
      const dy = j.y - 40 - cy;
      if (e.cd <= 0 && m.estado === 'jugando' && Math.abs(dx) < 320 && dy > 40 && dy < 460) {
        const s = Math.random() < 0.5 ? 1 : -1;
        const a = Math.atan2(dx, dy);
        e.c = a - s * 0.62;
        e.b = a + s * 0.62;
        e.estado = 'alerta';
        e.t = 0.9;
        m.snd.riiing();
      }
    }
  }
}

function largoHaz(m: Mundo, x: number, y: number, a: number): number {
  const sx = Math.sin(a);
  const sy = Math.cos(a);
  for (let r = 26; r < HAZ_LARGO; r += 14) {
    const px = x + sx * r;
    const py = y + sy * r;
    if (chocaRect(m.rej, px - 2, py - 2, px + 2, py + 2)) return r;
  }
  return HAZ_LARGO;
}

// ---------------------------------------------------------------- the shot glass

export function chupito(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  switch (e.estado) {
    case 'agacha': {
      e.vx = 0;
      fisica(m, e, d);
      if (e.t <= 0) {
        const grande = e.turno % 3 === 2;
        // Never jump off an edge: if there is no ground where it would land, it turns round.
        const alcance = grande ? 200 : 115;
        if (!sueloEn(m.rej, e.x + e.dir * alcance, e.y) && !sueloEn(m.rej, e.x + e.dir * alcance * 0.6, e.y)) e.dir = (e.dir * -1) as 1 | -1;
        e.turno++;
        e.vx = e.dir * (grande ? 250 : 150);
        e.vy = grande ? -800 : -600;
        e.estado = 'salta';
        e.t = 0.15;
        e.suelo = false;
        m.snd.chupa();
      }
      break;
    }
    case 'salta': {
      const muro = fisica(m, e, d);
      if (muro) {
        e.dir = (e.dir * -1) as 1 | -1;
        e.vx = e.dir * Math.abs(e.vx) * 0.6;
      }
      if (e.suelo && e.t <= 0) {
        e.estado = 'patrulla';
        e.t = e.turno % 3 === 0 ? 0.5 : 0.3;
        e.vx = 0;
        m.fx.polvo(e.x, e.y, 3, 10);
      }
      break;
    }
    default: {
      e.vx = 0;
      fisica(m, e, d);
      if (e.t <= 0 && e.suelo) {
        const dx = j.x - e.x;
        if (Math.abs(dx) < 440 && Math.abs(j.y - e.y) < 170) e.dir = dx >= 0 ? 1 : -1;
        e.estado = 'agacha';
        e.t = 0.22;
      }
    }
  }
}

// ---------------------------------------------------------------- the speaker

export function altavoz(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  e.vx = 0;
  fisica(m, e, d);
  switch (e.estado) {
    case 'mareo':
      if (e.t <= 0) {
        e.estado = 'patrulla';
        e.t = 0.9;
      }
      break;
    case 'alerta':
      // The cone shakes and the ring grows: the pulse is coming.
      if (e.t <= 0) {
        e.estado = 'pulso';
        e.t = 0.3;
        m.proy.push({ tipo: 'pulso', x: e.x, y: e.y - e.h * 0.55, vx: 0, vy: 0, r: 18, vida: 0.8, t: 0 });
        m.snd.pulso();
        m.fx.sacudir(2.5);
      }
      break;
    case 'pulso':
      if (e.t <= 0) {
        e.estado = 'patrulla';
        e.t = 1.45;
      }
      break;
    default:
      e.dir = j.x >= e.x ? 1 : -1;
      if (e.t <= 0) {
        if (m.estado === 'jugando' && Math.abs(j.x - e.x) < 340 && Math.abs(j.y - e.y) < 260) {
          e.estado = 'alerta';
          e.t = 0.55;
        } else e.t = 0.2;
      }
  }
}

/** A pulse of bass: a ring that grows from the speaker and shoves Fran once, if he is on it. */
export function pulso(m: Mundo, p: Proyectil, d: number): boolean {
  const j = m.j;
  p.r = 18 + p.t * 410;
  void d;
  if (p.vy === 0 && m.estado === 'jugando') {
    const dist = Math.hypot(j.x - p.x, j.y - 40 - p.y);
    if (Math.abs(dist - p.r) < 34) {
      p.vy = 1;
      m.empujar(j.x >= p.x ? 1 : -1);
    }
  }
  return p.t > p.vida;
}

// ---------------------------------------------------------------- the lit floor

/** Which tiles turn red together (indices 0..7, left to right). Every pattern leaves safe tiles to stand on. */
const PATRONES: number[][][] = [
  // phase 1: always half or more of the floor is safe
  [[0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 2, 3], [4, 5, 6, 7], [2, 3, 4, 5]],
  // phase 2
  [[0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 2, 3, 4], [3, 4, 5, 6, 7], [2, 3, 4, 5], [0, 1, 6, 7]],
  // phase 3
  [[0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 2, 3, 4], [3, 4, 5, 6, 7], [0, 1, 3, 4, 6, 7], [0, 2, 3, 5, 7]],
];

/**
 * The floor of the DJ's arena: eight tiles. Each is 0 dark, 1 lit (safe), 2 red (warning) or 3 burning. Every few beats: a flash of colour, a warning of
 * the red ones (blinking), a burst of flame, a rest.
 */
export class Baldosas {
  readonly n = 8;
  readonly x0 = TILE;
  readonly ancho: number;
  readonly suelo: number;
  estado: number[] = Array(8).fill(0);
  fase: 'reposo' | 'luz' | 'aviso' | 'quema' = 'reposo';
  /** Seconds left in the current stage. */
  tf = 1.2;
  /** The red tiles of the pattern in play. */
  rojas: number[] = [];
  private ultimo = -1;
  /** While > 0 the music is stopped (the drop): everything is dark. */
  silencio = 0;

  constructor(m: Mundo) {
    this.suelo = m.H - 2 * TILE;
    this.ancho = (m.W - 2 * TILE) / this.n;
  }

  actualizar(m: Mundo, d: number, faseJefe: number, activo: boolean) {
    this.silencio = Math.max(0, this.silencio - d);
    if (!activo || this.silencio > 0) {
      this.estado.fill(0);
      this.fase = 'reposo';
      this.tf = 0.7;
      return;
    }
    this.tf -= d;
    switch (this.fase) {
      case 'reposo':
        if (this.tf <= 0) {
          this.fase = 'luz';
          this.tf = PULSO;
          this.estado.fill(1);
        }
        break;
      case 'luz':
        if (this.tf <= 0) {
          const lista = PATRONES[Math.min(2, faseJefe - 1)];
          let k = Math.floor(Math.random() * lista.length);
          if (k === this.ultimo) k = (k + 1) % lista.length;
          this.ultimo = k;
          this.rojas = lista[k];
          this.estado.fill(1);
          for (const i of this.rojas) this.estado[i] = 2;
          this.fase = 'aviso';
          this.tf = PULSO * (faseJefe === 1 ? 2 : 1.5);
          m.snd.riiing();
        }
        break;
      case 'aviso':
        if (this.tf <= 0) {
          for (const i of this.rojas) {
            this.estado[i] = 3;
            m.fx.chispas(this.x0 + (i + 0.5) * this.ancho, this.suelo - 4, 5, 0, 220, '#ffb347', 1.4);
          }
          this.fase = 'quema';
          this.tf = PULSO * 1.2;
          m.snd.llama();
          m.fx.sacudir(3);
        }
        break;
      case 'quema': {
        const j = m.j;
        if (m.estado === 'jugando' && j.inv <= 0 && j.y > this.suelo - 64) {
          for (const i of this.rojas) {
            const a = this.x0 + i * this.ancho;
            if (j.x + j.hw * 0.7 > a && j.x - j.hw * 0.7 < a + this.ancho) {
              m.herir(a + this.ancho / 2);
              break;
            }
          }
        }
        if (this.tf <= 0) {
          this.estado.fill(0);
          this.fase = 'reposo';
          this.tf = PULSO * (faseJefe === 1 ? 1.4 : 0.9);
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- the vinyls

const R_VINILO = 22;
const G_VINILO = 1000;

/** Throws a vinyl from the DJ's hand to land at `tx` on the floor after `vuelo` seconds. */
function lanzarVinilo(m: Mundo, e: Enem, tx: number, vuelo: number) {
  const x0 = e.x - 46;
  const y0 = e.y - 116;
  const ty = m.H - 2 * TILE - R_VINILO;
  const x = Math.max(TILE + 40, Math.min(m.W - TILE - 40, tx));
  m.proy.push({ tipo: 'vinilo', x: x0, y: y0, vx: (x - x0) / vuelo, vy: (ty - y0 - 0.5 * G_VINILO * vuelo * vuelo) / vuelo, r: 0, vida: 6, t: 0, tx: x });
  m.snd.vinilo();
  m.fx.onda(x0, y0, 8, '#ff7ae0', 14, 0.3);
  e.b = 0.28;
}

export function vinilo(m: Mundo, p: Proyectil, d: number): boolean {
  const j = m.j;
  if (p.r === 2) {
    // Sent back: straight to the DJ.
    const e = m.jefe;
    if (!e || e.muerto || e.tipo !== 'dj') return true;
    const dx = e.x - p.x;
    const dy = e.y - 50 - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    p.vx = (dx / dist) * 760;
    p.vy = (dy / dist) * 760;
    p.x += p.vx * d;
    p.y += p.vy * d;
    if (Math.random() < 0.8) m.fx.chispas(p.x, p.y, 1, 0, 70, '#ffe28a', Math.PI * 2);
    if (Math.abs(p.x - e.x) < e.hw + 14 && p.y > e.y - e.h - 24 && p.y < e.y + 30) {
      m.fx.onda(p.x, p.y, 16, '#ffe28a', 34, 0.45);
      m.fx.estrellas(p.x, p.y, 10, '#fff3b0');
      m.fx.parar(0.07);
      m.herirEnemigo(e, 1, true);
      return true;
    }
    return p.t > 3;
  }
  const suelo = m.H - 2 * TILE;
  if (p.r === 0) {
    p.vy += G_VINILO * d;
    p.x += p.vx * d;
    p.y += p.vy * d;
    if (p.vy > 0 && p.y >= suelo - R_VINILO) {
      // It lands and starts to roll along the floor.
      p.y = suelo - R_VINILO;
      p.r = 1;
      p.t = 0;
      p.vida = 2.4;
      p.vx = Math.sign(p.vx || 1) * 250;
      p.vy = 0;
      m.fx.polvo(p.x, suelo, 6, 16);
      m.fx.onda(p.x, suelo - 4, 12, '#ff7ae0', 18, 0.3);
      m.snd.aterriza(0.6);
    }
  } else {
    p.x += p.vx * d;
    if (p.x < TILE + R_VINILO || p.x > m.W - TILE - R_VINILO) p.vx = -p.vx;
    if (Math.random() < 0.3) m.fx.chispas(p.x, p.y + R_VINILO - 4, 1, 0, 60, '#ffb8f0', 1.2);
    if (p.t > p.vida) {
      m.fx.polvo(p.x, p.y, 5, 10);
      return true;
    }
  }
  // It hurts Fran if it touches him.
  if (m.estado === 'jugando' && j.inv <= 0) {
    const cx = Math.max(j.x - j.hw + 3, Math.min(j.x + j.hw - 3, p.x));
    const cy = Math.max(j.y - j.h + 4, Math.min(j.y - 2, p.y));
    if ((cx - p.x) ** 2 + (cy - p.y) ** 2 < (R_VINILO * 0.85) ** 2) {
      m.herir(p.x);
      m.fx.estrellas(p.x, p.y, 6, '#ffb8f0');
      return true;
    }
  }
  return false;
}

/** The jarrazo meets the vinyls in its box: each one that is not already on its way back flies to the DJ. Returns how many it sent back. */
export function devolverVinilos(m: Mundo, x0: number, x1: number, y0: number, y1: number): number {
  let n = 0;
  for (const p of m.proy) {
    if (p.tipo !== 'vinilo' || p.r === 2) continue;
    if (p.x + R_VINILO < x0 || p.x - R_VINILO > x1 || p.y + R_VINILO < y0 || p.y - R_VINILO > y1) continue;
    p.r = 2;
    p.t = 0;
    n++;
    m.fx.onda(p.x, p.y, 14, '#ffe28a', 40, 0.4);
    m.fx.estrellas(p.x, p.y, 8, '#fff3b0');
    m.fx.parar(0.06);
    m.snd.parry();
  }
  return n;
}

// ---------------------------------------------------------------- EL DJ

/** What the DJ does in each stretch, by phase: one vinyl, a pair, or the drop (the music stops, then three at once). */
const SECUENCIA: string[][] = [['uno'], ['uno', 'par', 'uno', 'par'], ['drop', 'par', 'uno', 'par', 'drop']];
const VUELO = [1.1, 1.0, 0.95];
const PAUSA = [2.1, 1.7, 1.5];

export function dj(m: Mundo, e: Enem, d: number) {
  const j = m.j;
  e.alfa = 1;
  e.b = Math.max(0, e.b - d);
  e.dir = -1;
  // Phases: at two thirds and at a third of his life.
  if (e.fase === 1 && e.hp <= Math.ceil((e.hpMax * 2) / 3)) cambiaFase(m, e, 2);
  else if (e.fase === 2 && e.hp <= Math.ceil(e.hpMax / 3)) cambiaFase(m, e, 3);
  switch (e.estado) {
    case 'espera':
      if (e.t <= 0) siguiente(m, e);
      break;
    case 'lanza': {
      for (const r of e.cola) r.t -= d;
      while (e.cola.length && e.cola[0].t <= 0) {
        const r = e.cola.shift()!;
        lanzarVinilo(m, e, j.x + j.vx * 0.25 + r.h, VUELO[e.fase - 1]);
      }
      if (e.t <= 0 && !e.cola.length) {
        e.estado = 'espera';
        e.t = PAUSA[e.fase - 1];
      }
      break;
    }
    case 'drop': {
      // The music is stopped: dark and quiet, arms up. Then three vinyls at once.
      if (e.t <= 0) {
        const vuelo = VUELO[2];
        for (const dx of [0, -200, 200]) lanzarVinilo(m, e, j.x + dx, vuelo);
        m.fx.sacudir(8);
        m.fx.destello(0.35, '#ff7ae0');
        e.estado = 'lanza';
        e.t = 0.2;
        e.cola = [];
      }
      break;
    }
    default:
      break;
  }
}

function cambiaFase(m: Mundo, e: Enem, f: number) {
  e.fase = f;
  e.estado = 'espera';
  e.t = 1.0;
  e.turno = 0;
  e.cola = [];
  m.fx.sacudir(8);
  m.fx.destello(0.4, '#ff4fa8');
  m.snd.riiing(true);
  m.proy = m.proy.filter((p) => p.tipo !== 'vinilo' || p.r === 2);
  m.decirEnem(e, f === 2 ? 'dj.fase2' : 'dj.fase3');
  if (f === 3) {
    // Straight into the drop.
    e.turno = 0;
    e.estado = 'espera';
    e.t = 1.2;
  }
}

function siguiente(m: Mundo, e: Enem) {
  const lista = SECUENCIA[e.fase - 1];
  const a = lista[e.turno++ % lista.length];
  if (a === 'drop') {
    e.estado = 'drop';
    e.t = 1.5;
    m.pista && (m.pista.silencio = 1.5);
    m.fx.destello(0.2, '#0a0420');
    m.decirEnem(e, 'dj.drop');
  } else if (a === 'par') {
    e.estado = 'lanza';
    e.t = 1.5;
    e.cola = [{ t: 0.8, h: 0 }, { t: 1.4, h: (Math.random() < 0.5 ? -1 : 1) * 90 }];
    m.snd.riiing();
  } else {
    e.estado = 'lanza';
    e.t = 0.9;
    e.cola = [{ t: 0.8, h: 0 }];
    m.snd.riiing();
    if (e.turno % 3 === 1) m.decirEnem(e, 'dj.tira');
  }
}
