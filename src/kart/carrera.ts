// The race of Impropios Kart, with no drawing in it: six karts, arcade physics, the computer's driving, the items
// and the order of the race. `Carrera.actualizar(dt, mandos)` moves everything on a fixed step and leaves what
// happened (a box taken, a hit, a splash...) in `eventos` for the screen and the sound to pick up. Everything is
// in world units (texels of the circuit) and seconds.
import type { ItemId } from './arte';
import { PILOTOS, type Piloto } from './pilotos';
import { SUP, type Pista } from './pista';

// ---------------------------------------------------------------- numbers of the feel

/** Top speed of the player's kart (units/s): a lap is ~3000 units, so ~28 s at this speed. */
export const VMAX = 120;
const ACEL = 80;
const FRENO = 150;
/** Steering at full lock (rad/s). */
const GIRO = 2.3;
const RADIO = 6;
const PASO = 1 / 60;
export const VUELTAS = 3;
/** The countdown lasts this long before «¡YA!». */
export const CUENTA = 3.2;

export type EstadoKart = 'normal' | 'giro' | 'agua' | 'rescate' | 'meta';

export interface Kart {
  i: number;
  piloto: Piloto;
  humano: boolean;
  x: number;
  y: number;
  ang: number;
  vx: number;
  vy: number;
  /** Steering, smoothed (-1 left … 1 right). */
  giro: number;
  /** Drift: 0 none, -1 left, 1 right; seconds in it and its level (0–2: the turbo it will give). */
  derrape: number;
  derrapeT: number;
  nivel: number;
  mantener: number;
  mantDir: number;
  sueltaT: number;
  turbo: number;
  boa: number;
  lento: number;
  invuln: number;
  estado: EstadoKart;
  tEstado: number;
  /** A hit's spin for the sprite (rad) and a hop in the air (units). */
  girar: number;
  alto: number;
  item: ItemId | null;
  /** Seconds of the item roulette still turning, and what it will land on. */
  ruleta: number;
  ruletaItem: ItemId | null;
  /** The computer waits this long before using the item. */
  espera: number;
  idx: number;
  cruces: number;
  sRel: number;
  total: number;
  puesto: number;
  /** Place at the end of the race (1–6), or 0. */
  llegada: number;
  tMeta: number;
  atascado: number;
  /** For the computer: lane, wobble. */
  carril: number;
  semilla: number;
  /** Respawn point after the water or a rescue. */
  rescate: { x: number; y: number; ang: number } | null;
  /** Speed along the heading (for the sound and the HUD). */
  vel: number;
  rebote: number;
  /** The computer's speed factor this frame (rubber band and bends). */
  ia: number;
}

export interface Proyectil {
  tipo: 'maleta' | 'tacon';
  x: number;
  y: number;
  ang: number;
  vel: number;
  dueno: number;
  ttl: number;
  edad: number;
  rebotes: number;
  idx: number;
  objetivo: number;
}

export interface Trampa {
  x: number;
  y: number;
  dueno: number;
  ttl: number;
  edad: number;
}

export interface CajaMundo {
  x: number;
  y: number;
  suelo: number;
  /** Seconds until it is back (0 = there). */
  vuelve: number;
}

export type Evento =
  | { t: 'caja' | 'golpe' | 'agua' | 'flotador' | 'turbo' | 'choque' | 'lanzar' | 'boa' | 'luz' | 'derrape' | 'meta' | 'vuelta' | 'vueltaFinal' | 'ya' | 'semaforo' | 'atasco'; k: number; n?: number };

export interface Mandos {
  /** -1 … 1 */
  giro: number;
  /** Item pressed (taken by the race). */
  item: boolean;
}

/** Item odds by place (best place first): chupito, maleta, tacón, sangría, boa, luz. The last one gets the best. */
const REPARTO: Record<ItemId, number>[] = [
  { chupito: 40, maleta: 30, tacon: 0, sangria: 30, boa: 0, luz: 0 },
  { chupito: 35, maleta: 25, tacon: 15, sangria: 20, boa: 5, luz: 0 },
  { chupito: 30, maleta: 20, tacon: 25, sangria: 10, boa: 10, luz: 5 },
  { chupito: 25, maleta: 15, tacon: 30, sangria: 5, boa: 15, luz: 10 },
  { chupito: 20, maleta: 10, tacon: 30, sangria: 5, boa: 20, luz: 15 },
  { chupito: 15, maleta: 5, tacon: 30, sangria: 0, boa: 30, luz: 20 },
];

const limitar = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const envolver = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const mod = (a: number, n: number) => ((a % n) + n) % n;

export interface OpcionesCarrera {
  /** The computer's drivers. */
  rivales?: Piloto[];
  /** Skips most of the waiting. */
  rapido?: boolean;
  /** Where the human starts on the grid (0 first … 5 last). */
  salida?: number;
  /** A seed so that two races are different but a test is repeatable. */
  semilla?: number;
}

export class Carrera {
  karts: Kart[] = [];
  proyectiles: Proyectil[] = [];
  trampas: Trampa[] = [];
  cajas: CajaMundo[] = [];
  eventos: Evento[] = [];
  fase: 'cuenta' | 'carrera' | 'fin' = 'cuenta';
  /** Seconds since the green light (negative during the countdown). */
  t: number;
  /** Seconds the lights are dark after «¡Se va la luz!». */
  apagon = 0;
  readonly humano: Kart;
  llegados = 0;
  /** The computer drives the human's kart too (tests, the performance check and the hook's bot). */
  auto = false;
  /** Has the human crossed the line for the last time? */
  humanoLlego = false;
  private acum = 0;
  private semaforoVisto = 0;
  private rnd: () => number;

  constructor(readonly pista: Pista, o: OpcionesCarrera = {}) {
    let s = (o.semilla ?? Math.floor(Math.random() * 1e9)) >>> 0 || 1;
    this.rnd = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
    this.t = -CUENTA;
    const pil = [PILOTOS[0], ...(o.rivales ?? PILOTOS.slice(1))];
    // the human starts a few places from the back, so there is someone to catch
    const lugar = o.salida ?? 3;
    const orden = pil.map((_, i) => i).filter((i) => i !== 0);
    orden.splice(lugar, 0, 0);
    orden.forEach((quien, puesto) => {
      const g = pista.parrilla[puesto];
      this.karts[quien] = this.nuevoKart(quien, pil[quien], g.x, g.y, g.ang, quien === 0);
    });
    this.humano = this.karts[0];
    for (const k of this.karts) this.progreso(k);
    for (const c of pista.cajas) this.cajas.push({ x: c.x, y: c.y, suelo: c.suelo, vuelve: 0 });
    this.ordenar();
  }

  private nuevoKart(i: number, piloto: Piloto, x: number, y: number, ang: number, humano: boolean): Kart {
    return {
      i, piloto, humano, x, y, ang, vx: 0, vy: 0, giro: 0, derrape: 0, derrapeT: 0, nivel: 0, mantener: 0, mantDir: 0, sueltaT: 0,
      turbo: 0, boa: 0, lento: 0, invuln: 0, estado: 'normal', tEstado: 0, girar: 0, alto: 0,
      item: null, ruleta: 0, ruletaItem: null, espera: 0,
      idx: this.pista.meta.idx, cruces: 0, sRel: this.pista.longitud - 20, total: this.pista.longitud - 20, puesto: 0, llegada: 0, tMeta: 0, atascado: 0,
      carril: (this.rnd() - 0.5) * 36, semilla: this.rnd() * 100, rescate: null, vel: 0, rebote: 0, ia: 1,
    };
  }

  /** Lap the human is on (1–3), and the best the computer is. */
  vueltaDe(k: Kart) {
    return limitar(k.cruces, 1, VUELTAS);
  }

  /** Advances the race by `dt` seconds (any size: it takes fixed steps). */
  actualizar(dt: number, m: Mandos) {
    this.acum += Math.min(dt, 0.1);
    while (this.acum >= PASO) {
      this.acum -= PASO;
      this.paso(PASO, m);
      m = { giro: m.giro, item: false };
    }
  }

  private paso(dt: number, m: Mandos) {
    this.t += dt;
    if (this.fase === 'cuenta') {
      const n = Math.floor(this.t + CUENTA);
      if (n > this.semaforoVisto && n <= 3) {
        this.semaforoVisto = n;
        this.eventos.push({ t: 'semaforo', k: 0, n });
      }
      if (this.t >= 0) {
        this.fase = 'carrera';
        this.eventos.push({ t: 'ya', k: 0 });
      }
      return;
    }
    if (this.apagon > 0) this.apagon -= dt;
    for (const c of this.cajas) if (c.vuelve > 0) {
      c.vuelve -= dt;
      if (c.vuelve <= 0) this.pista.poner(c.x, c.y, 8, SUP.CAJA);
    }
    for (const k of this.karts) {
      let giroObj: number;
      let usar = false;
      if (k.humano && k.estado !== 'meta' && !this.auto) {
        giroObj = m.giro;
        usar = m.item;
      } else {
        const r = this.conducir(k, dt);
        giroObj = r.giro;
        usar = r.item;
      }
      this.moverKart(k, dt, giroObj, usar);
    }
    this.choques();
    this.proyectilesPaso(dt);
    for (let i = this.trampas.length - 1; i >= 0; i--) {
      const tr = this.trampas[i];
      tr.edad += dt;
      if (tr.edad > tr.ttl) {
        this.trampas.splice(i, 1);
        continue;
      }
      for (const k of this.karts) {
        if ((k.i === tr.dueno && tr.edad < 1) || Math.hypot(k.x - tr.x, k.y - tr.y) > 10) continue;
        if (this.golpear(k)) this.trampas.splice(i, 1);
        break;
      }
    }
    this.ordenar();
    if (this.humanoLlego && this.fase === 'carrera') this.fase = 'fin';
  }

  // ---------------------------------------------------------------- one kart

  private moverKart(k: Kart, dt: number, giroObj: number, usar: boolean) {
    const P = this.pista;
    k.tEstado += dt;
    if (k.invuln > 0) k.invuln -= dt;
    if (k.turbo > 0) k.turbo -= dt;
    if (k.boa > 0) k.boa -= dt;
    if (k.lento > 0) k.lento -= dt;
    if (k.rebote > 0) k.rebote -= dt;
    if (k.alto > 0 && k.estado !== 'rescate') k.alto = Math.max(0, k.alto - 40 * dt);
    if (k.ruleta > 0) {
      k.ruleta -= dt;
      if (k.ruleta <= 0) {
        k.item = k.ruletaItem;
        k.ruletaItem = null;
        k.espera = 0.8 + this.rnd() * 2.4;
      }
    }

    // special states
    if (k.estado === 'giro') {
      k.girar += (Math.PI * 4 * dt) / 1.1;
      k.vx *= Math.exp(-2.6 * dt);
      k.vy *= Math.exp(-2.6 * dt);
      this.deslizar(k, dt);
      if (k.tEstado > 1.1) {
        k.estado = 'normal';
        k.girar = 0;
        k.invuln = 1.2;
      }
      this.progreso(k);
      return;
    }
    if (k.estado === 'agua') {
      k.vx *= Math.exp(-4 * dt);
      k.vy *= Math.exp(-4 * dt);
      if (k.tEstado < 1.0) {
        k.x += k.vx * dt;
        k.y += k.vy * dt;
      } else if (k.tEstado >= 1.0 && k.rescate && k.alto === 0) {
        // the lifebelt has caught it: carried back to the road
        k.estado = 'rescate';
        k.tEstado = 0;
        k.x = k.rescate.x;
        k.y = k.rescate.y;
        k.ang = k.rescate.ang;
        k.vx = k.vy = 0;
        k.alto = 20;
        this.eventos.push({ t: 'flotador', k: k.i });
      }
      return;
    }
    if (k.estado === 'rescate') {
      // hanging from the lifebelt, lowered gently
      k.alto = Math.max(0, 20 - k.tEstado * 11);
      if (k.alto <= 0) {
        k.estado = 'normal';
        k.invuln = 1.8;
        k.atascado = 0;
      }
      this.progreso(k);
      return;
    }
    if (k.estado === 'meta') {
      // finished: the computer rolls on by itself
      const r = this.conducir(k, dt);
      giroObj = r.giro;
    }

    // surface under the kart
    const s = P.supEn(k.x, k.y);
    if (s === SUP.AGUA) {
      this.caer(k);
      return;
    }
    if (s === SUP.ACEITE && k.boa <= 0 && k.invuln <= 0) this.golpear(k, true);
    if (s === SUP.TURBO && k.turbo < 0.9) {
      k.turbo = 1.1;
      if (k.humano) this.eventos.push({ t: 'turbo', k: k.i });
    }
    if (s === SUP.CAJA) this.cogerCaja(k);

    if (usar && k.item && k.ruleta <= 0) this.usarItem(k);

    // steering
    const humanoLike = k.humano && k.estado !== 'meta' && !this.auto;
    k.giro += (giroObj - k.giro) * Math.min(1, (humanoLike ? 9 : 12) * dt);
    const fx0 = Math.cos(k.ang);
    const fy0 = Math.sin(k.ang);
    const vPar0 = k.vx * fx0 + k.vy * fy0;
    // drift: hold a hard turn at speed, then release for a turbo
    if (humanoLike) this.derrapar(k, dt, vPar0);
    let rate = k.giro;
    if (k.derrape !== 0) rate = limitar(k.derrape * 0.55 + k.giro * 0.55, -1.05, 1.05);
    const lento = Math.min(1, Math.abs(vPar0) / 45);
    k.ang += rate * GIRO * lento * dt * (vPar0 < 0 ? -1 : 1);
    k.ang = envolver(k.ang);

    // velocity: along the heading it follows the top speed; sideways it grips back
    const fx = Math.cos(k.ang);
    const fy = Math.sin(k.ang);
    const rx = -fy;
    const ry = fx;
    let vPar = k.vx * fx + k.vy * fy;
    let vLat = k.vx * rx + k.vy * ry;
    let vmax = VMAX * (k.humano ? 1 : k.piloto.velocidad * k.ia);
    if (s === SUP.HIERBA) vmax *= 0.5;
    if (k.lento > 0) vmax *= 0.62;
    let acel = ACEL;
    if (k.turbo > 0) {
      vmax = VMAX * 1.4 * (k.humano ? 1 : k.piloto.velocidad);
      acel = ACEL * 2.6;
    }
    if (k.boa > 0) {
      vmax = Math.max(vmax, VMAX * 1.3);
      acel = Math.max(acel, ACEL * 2);
    }
    if (this.fase !== 'carrera') vmax = 0;
    if (vPar < vmax) vPar = Math.min(vmax, vPar + acel * dt);
    else vPar = Math.max(vmax, vPar - FRENO * dt);
    const grip = k.derrape !== 0 ? 3.4 : s === SUP.RESBALA ? 4.2 : 14;
    vLat *= Math.exp(-grip * dt);
    k.vx = fx * vPar + rx * vLat;
    k.vy = fy * vPar + ry * vLat;
    k.vel = vPar;

    this.deslizar(k, dt);
    this.progreso(k);

    // stuck? after a couple of seconds the lifebelt comes for it
    if (this.fase === 'carrera' && k.estado === 'normal' && Math.hypot(k.vx, k.vy) < 14) k.atascado += dt;
    else k.atascado = Math.max(0, k.atascado - dt * 2);
    if (k.atascado > 2.2) {
      k.atascado = 0;
      this.rescatar(k, false);
    }
  }

  /** Moves the kart by its velocity, bouncing off walls. */
  private deslizar(k: Kart, dt: number) {
    const P = this.pista;
    const nx = k.x + k.vx * dt;
    const ny = k.y + k.vy * dt;
    const choca = (x: number, y: number) => {
      for (let a = 0; a < 8; a++) {
        const t = (a * Math.PI) / 4;
        if (P.supEn(x + Math.cos(t) * RADIO, y + Math.sin(t) * RADIO) === SUP.MURO) return true;
      }
      return false;
    };
    if (!choca(nx, ny)) {
      k.x = nx;
      k.y = ny;
      return;
    }
    // the wall's normal: away from the blocked probes
    let gx = 0;
    let gy = 0;
    for (let a = 0; a < 16; a++) {
      const t = (a * Math.PI) / 8;
      if (P.supEn(k.x + Math.cos(t) * (RADIO + 2), k.y + Math.sin(t) * (RADIO + 2)) === SUP.MURO || P.supEn(nx + Math.cos(t) * RADIO, ny + Math.sin(t) * RADIO) === SUP.MURO) {
        gx -= Math.cos(t);
        gy -= Math.sin(t);
      }
    }
    const l = Math.hypot(gx, gy);
    if (l < 1e-3) {
      k.vx *= -0.3;
      k.vy *= -0.3;
      return;
    }
    gx /= l;
    gy /= l;
    const vn = k.vx * gx + k.vy * gy;
    if (vn < 0) {
      if (vn < -35 && k.rebote <= 0) {
        k.rebote = 0.25;
        if (k.humano) this.eventos.push({ t: 'choque', k: k.i });
      }
      k.vx -= 1.35 * vn * gx;
      k.vy -= 1.35 * vn * gy;
      k.vx *= 0.82;
      k.vy *= 0.82;
      // turn a little toward where it now goes
      if (Math.hypot(k.vx, k.vy) > 20) k.ang += envolver(Math.atan2(k.vy, k.vx) - k.ang) * 0.35;
    }
    // slide along the wall and nudge out of it
    const tx = -gy;
    const ty = gx;
    const mx = k.x + (k.vx * dt) + gx * 0.35;
    const my = k.y + (k.vy * dt) + gy * 0.35;
    if (!choca(mx, my)) {
      k.x = mx;
      k.y = my;
    } else if (!choca(k.x + tx * 0.5, k.y + ty * 0.5)) {
      k.x += tx * 0.5;
      k.y += ty * 0.5;
    } else {
      k.x += gx * 0.8;
      k.y += gy * 0.8;
    }
  }

  private derrapar(k: Kart, dt: number, vPar: number) {
    const pulsando = Math.abs(k.giro) > 0.55 ? Math.sign(k.giro) : 0;
    if (k.derrape === 0) {
      if (pulsando !== 0 && pulsando === k.mantDir) k.mantener += dt;
      else {
        k.mantener = 0;
        k.mantDir = pulsando;
      }
      if (k.mantener > 0.32 && vPar > 0.6 * VMAX && k.estado === 'normal') {
        k.derrape = k.mantDir;
        k.derrapeT = 0;
        k.nivel = 0;
        k.sueltaT = 0;
        k.alto = 4;
        this.eventos.push({ t: 'derrape', k: k.i });
      }
      return;
    }
    k.derrapeT += dt;
    k.nivel = k.derrapeT > 1.5 ? 2 : k.derrapeT > 0.7 ? 1 : 0;
    // letting go of the steering (or turning the other way) ends it
    if (k.giro * k.derrape < 0.4) k.sueltaT += dt;
    else k.sueltaT = 0;
    if (k.sueltaT > 0.1 || vPar < 0.35 * VMAX || k.estado !== 'normal') {
      if (k.nivel > 0) {
        k.turbo = Math.max(k.turbo, k.nivel === 1 ? 0.8 : 1.5);
        this.eventos.push({ t: 'turbo', k: k.i });
      }
      k.derrape = 0;
      k.derrapeT = 0;
      k.nivel = 0;
      k.mantener = 0;
      k.mantDir = 0;
    }
  }

  // ---------------------------------------------------------------- progress and order

  private progreso(k: Kart) {
    const P = this.pista;
    const L = P.linea.length;
    let mejor = k.idx;
    let bd = 1e12;
    for (let d = -3; d <= 14; d++) {
      const i = (k.idx + d + L) % L;
      const w = P.linea[i];
      const dd = (w.x - k.x) ** 2 + (w.y - k.y) ** 2;
      if (dd < bd) {
        bd = dd;
        mejor = i;
      }
    }
    k.idx = mejor;
    const w = P.linea[mejor];
    const proy = limitar((k.x - w.x) * Math.cos(w.ang) + (k.y - w.y) * Math.sin(w.ang), -9, 9);
    const s = mod(w.s - P.meta.s + proy, P.longitud);
    const prev = k.sRel;
    k.sRel = s;
    if (prev > P.longitud * 0.7 && s < P.longitud * 0.3) {
      k.cruces++;
      if (k.cruces > 1 && k.cruces <= VUELTAS && k.humano) this.eventos.push({ t: k.cruces === VUELTAS ? 'vueltaFinal' : 'vuelta', k: k.i, n: k.cruces });
      if (k.cruces === VUELTAS + 1 && k.estado !== 'meta') this.llegar(k);
    } else if (prev < P.longitud * 0.3 && s > P.longitud * 0.7) k.cruces--;
    k.total = k.cruces * P.longitud + s;
  }

  private llegar(k: Kart) {
    k.estado = 'meta';
    k.llegada = ++this.llegados;
    k.tMeta = this.t;
    k.derrape = 0;
    k.nivel = 0;
    this.eventos.push({ t: 'meta', k: k.i, n: k.llegada });
    if (k.humano) this.humanoLlego = true;
  }

  private ordenar() {
    const orden = [...this.karts].sort((a, b) => {
      if (a.llegada && b.llegada) return a.llegada - b.llegada;
      if (a.llegada) return -1;
      if (b.llegada) return 1;
      return b.total - a.total;
    });
    orden.forEach((k, i) => (k.puesto = i + 1));
  }

  /** For tests and the hook: puts a kart `sRel` units along the lap (from the line) at a side offset, on a given lap count. */
  colocar(k: Kart, sRel: number, lado: number, cruces: number) {
    const P = this.pista;
    const s = mod(sRel, P.longitud);
    const q = P.enLinea(P.meta.s + s, lado);
    k.x = q.x;
    k.y = q.y;
    k.ang = q.ang;
    k.vx = k.vy = 0;
    k.cruces = cruces;
    k.sRel = s;
    k.total = cruces * P.longitud + s;
    k.estado = k.estado === 'meta' ? 'meta' : 'normal';
    k.derrape = 0;
    let mejor = 0;
    let bd = 1e12;
    P.linea.forEach((w, i) => {
      const dd = (w.x - q.x) ** 2 + (w.y - q.y) ** 2;
      if (dd < bd) {
        bd = dd;
        mejor = i;
      }
    });
    k.idx = mejor;
    this.ordenar();
  }

  /** For tests and the hook: the kart crosses the finish line for good. */
  forzarLlegada(k: Kart) {
    if (!k.llegada) {
      k.cruces = VUELTAS + 1;
      this.llegar(k);
    }
  }

  /** Karts in race order, first to last. */
  clasificacion(): Kart[] {
    return [...this.karts].sort((a, b) => a.puesto - b.puesto);
  }

  // ---------------------------------------------------------------- the water, the rescue and the hits

  private caer(k: Kart) {
    if (k.estado === 'agua') return;
    k.estado = 'agua';
    k.tEstado = 0;
    k.derrape = 0;
    k.nivel = 0;
    k.turbo = 0;
    k.boa = 0;
    const P = this.pista;
    // back on the road a little behind: the last waypoints
    const L = P.linea.length;
    const w = P.linea[(k.idx - 2 + L) % L];
    k.rescate = { x: w.x, y: w.y, ang: w.ang };
    this.eventos.push({ t: 'agua', k: k.i });
  }

  private rescatar(k: Kart, agua: boolean) {
    const P = this.pista;
    const L = P.linea.length;
    const w = P.linea[(k.idx - 1 + L) % L];
    k.rescate = { x: w.x, y: w.y, ang: w.ang };
    k.estado = 'agua';
    k.tEstado = 1.0;
    k.vx = k.vy = 0;
    k.alto = 0;
    k.derrape = 0;
    k.turbo = 0;
    if (!agua && k.humano) this.eventos.push({ t: 'atasco', k: k.i });
  }

  /** A hit: spin and lose the speed. False if it does not take (invincible, already down). */
  golpear(k: Kart, aceite = false): boolean {
    if (k.boa > 0 || k.invuln > 0 || k.estado !== 'normal') return false;
    k.estado = 'giro';
    k.tEstado = 0;
    k.girar = 0;
    k.derrape = 0;
    k.nivel = 0;
    k.turbo = 0;
    k.vx *= 0.45;
    k.vy *= 0.45;
    k.alto = 0;
    if (!aceite || k.humano) this.eventos.push({ t: 'golpe', k: k.i });
    return true;
  }

  // ---------------------------------------------------------------- boxes and items

  private cogerCaja(k: Kart) {
    if (k.item || k.ruleta > 0 || k.estado === 'meta') return;
    let mejor: CajaMundo | null = null;
    let bd = 14 * 14;
    for (const c of this.cajas) {
      if (c.vuelve > 0) continue;
      const dd = (c.x - k.x) ** 2 + (c.y - k.y) ** 2;
      if (dd < bd) {
        bd = dd;
        mejor = c;
      }
    }
    if (!mejor) return;
    mejor.vuelve = 6;
    this.pista.poner(mejor.x, mejor.y, 8, mejor.suelo as 0);
    k.ruleta = k.humano ? 1.0 : 0.6;
    k.ruletaItem = this.sortear(k.puesto);
    this.eventos.push({ t: 'caja', k: k.i });
  }

  private sortear(puesto: number): ItemId {
    const tabla = REPARTO[limitar(puesto - 1, 0, 5)];
    const total = Object.values(tabla).reduce((a, b) => a + b, 0);
    let r = this.rnd() * total;
    for (const [id, w] of Object.entries(tabla) as Array<[ItemId, number]>) {
      r -= w;
      if (r < 0) return id;
    }
    return 'chupito';
  }

  /** For tests and the hook: hands a kart an item straight away. */
  darItem(k: Kart, id: ItemId) {
    k.item = id;
    k.ruleta = 0;
    k.espera = 0;
  }

  usarItem(k: Kart) {
    const id = k.item;
    if (!id) return;
    k.item = null;
    const fx = Math.cos(k.ang);
    const fy = Math.sin(k.ang);
    switch (id) {
      case 'chupito':
        k.turbo = Math.max(k.turbo, 1.6);
        this.eventos.push({ t: 'turbo', k: k.i });
        break;
      case 'maleta':
        this.proyectiles.push({ tipo: 'maleta', x: k.x + fx * 12, y: k.y + fy * 12, ang: k.ang, vel: Math.max(150, k.vel + 60), dueno: k.i, ttl: 9, edad: 0, rebotes: 0, idx: k.idx, objetivo: -1 });
        this.eventos.push({ t: 'lanzar', k: k.i });
        break;
      case 'tacon': {
        const delante = this.karts.find((o) => o.puesto === k.puesto - 1);
        this.proyectiles.push({ tipo: 'tacon', x: k.x + fx * 12, y: k.y + fy * 12, ang: k.ang, vel: 140, dueno: k.i, ttl: 10, edad: 0, rebotes: 0, idx: k.idx, objetivo: delante ? delante.i : -1 });
        this.eventos.push({ t: 'lanzar', k: k.i });
        break;
      }
      case 'sangria':
        this.trampas.push({ x: k.x - fx * 15, y: k.y - fy * 15, dueno: k.i, ttl: 25, edad: 0 });
        this.eventos.push({ t: 'lanzar', k: k.i });
        break;
      case 'boa':
        k.boa = 6;
        k.invuln = 0;
        this.eventos.push({ t: 'boa', k: k.i });
        break;
      case 'luz':
        for (const o of this.karts) if (o !== k && o.boa <= 0) o.lento = 3.6;
        this.apagon = 1.3;
        this.eventos.push({ t: 'luz', k: k.i });
        break;
    }
  }

  private proyectilesPaso(dt: number) {
    const P = this.pista;
    const L = P.linea.length;
    for (let i = this.proyectiles.length - 1; i >= 0; i--) {
      const p = this.proyectiles[i];
      p.edad += dt;
      let quitar = p.edad > p.ttl;
      if (p.tipo === 'tacon') {
        // follows the line; when it is close to its target, goes for it
        const obj = p.objetivo >= 0 ? this.karts[p.objetivo] : null;
        let tx: number;
        let ty: number;
        if (obj && Math.hypot(obj.x - p.x, obj.y - p.y) < 90) {
          tx = obj.x;
          ty = obj.y;
        } else {
          const w = P.linea[(p.idx + 2) % L];
          tx = w.x;
          ty = w.y;
          if (Math.hypot(P.linea[p.idx].x - p.x, P.linea[p.idx].y - p.y) < 22) p.idx = (p.idx + 1) % L;
        }
        const d = envolver(Math.atan2(ty - p.y, tx - p.x) - p.ang);
        p.ang += limitar(d, -5 * dt, 5 * dt);
        p.x += Math.cos(p.ang) * p.vel * dt;
        p.y += Math.sin(p.ang) * p.vel * dt;
      } else {
        const nx = p.x + Math.cos(p.ang) * p.vel * dt;
        const ny = p.y + Math.sin(p.ang) * p.vel * dt;
        if (P.supEn(nx, ny) === SUP.MURO) {
          // bounce: try which axis is blocked
          const bx = P.supEn(nx, p.y) === SUP.MURO;
          const by = P.supEn(p.x, ny) === SUP.MURO;
          let dx = Math.cos(p.ang);
          let dy = Math.sin(p.ang);
          if (bx || !by) dx = -dx;
          if (by || !bx) dy = -dy;
          p.ang = Math.atan2(dy, dx);
          p.rebotes++;
          if (p.rebotes > 5) quitar = true;
        } else {
          p.x = nx;
          p.y = ny;
        }
      }
      if (P.supEn(p.x, p.y) === SUP.AGUA && p.tipo === 'maleta') quitar = true;
      if (!quitar)
        for (const k of this.karts) {
          if (k.i === p.dueno && p.edad < 0.5) continue;
          if (k.estado === 'meta' && k.humano) continue;
          if (Math.hypot(k.x - p.x, k.y - p.y) < 10) {
            this.golpear(k);
            quitar = true;
            break;
          }
        }
      if (quitar) this.proyectiles.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- kart against kart

  private choques() {
    const ks = this.karts;
    for (let a = 0; a < ks.length; a++)
      for (let b = a + 1; b < ks.length; b++) {
        const A = ks[a];
        const B = ks[b];
        if (A.estado === 'agua' || B.estado === 'agua' || A.estado === 'rescate' || B.estado === 'rescate') continue;
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const d = Math.hypot(dx, dy);
        if (d >= 13 || d < 1e-3) continue;
        const nx = dx / d;
        const ny = dy / d;
        const sobra = 13 - d;
        // push apart (the one that is down moves more)
        const pa = A.estado === 'giro' ? 0.7 : 0.5;
        A.x -= nx * sobra * pa;
        A.y -= ny * sobra * pa;
        B.x += nx * sobra * (1 - pa);
        B.y += ny * sobra * (1 - pa);
        const rel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
        if (rel > 0) {
          const j = rel * 0.75;
          A.vx -= nx * j;
          A.vy -= ny * j;
          B.vx += nx * j;
          B.vy += ny * j;
          if (rel > 25 && (A.humano || B.humano)) this.eventos.push({ t: 'choque', k: A.humano ? A.i : B.i });
        }
        // a boa knocks the others over
        if (A.boa > 0 && B.boa <= 0) this.golpear(B);
        if (B.boa > 0 && A.boa <= 0) this.golpear(A);
      }
  }

  // ---------------------------------------------------------------- the computer's driving

  /** Seconds the human has left of an item roulette, etc. are the human's; the computer's decisions live here. */
  private conducir(k: Kart, dt: number): { giro: number; item: boolean } {
    const P = this.pista;
    const L = P.linea.length;
    const vel = Math.hypot(k.vx, k.vy);
    const delante = 3 + Math.floor(vel / 45);
    const w = P.linea[(k.idx + delante) % L];
    const nxw = -Math.sin(w.ang);
    const nyw = Math.cos(w.ang);
    // lane offset, narrower where the road is
    const carril = limitar(k.carril, -w.semi * 0.45, w.semi * 0.45);
    const tx = w.x + nxw * carril;
    const ty = w.y + nyw * carril;
    const err = Math.sin(this.t * 0.9 + k.semilla) * 0.22 * (1 - k.piloto.punteria) + Math.sin(this.t * 2.3 + k.semilla * 3) * 0.1 * (1 - k.piloto.punteria);
    const d = envolver(Math.atan2(ty - k.y, tx - k.x) - k.ang);
    const giro = limitar(d * 2.3 + err, -1, 1);
    // slow down for the bend ahead
    let curva = 0;
    for (let i = 1; i <= 4; i++) curva = Math.max(curva, P.linea[(k.idx + i) % L].curva);
    let f = 1 - Math.min(0.42, curva * 1.15);
    // a gentle rubber band against the human so that the race stays close but can be won
    const h = this.humano;
    const dif = k.total - h.total;
    if (!k.humano) {
      if (dif > 220) f *= 1 - Math.min(0.08, (dif - 220) / 3500);
      else if (dif < -90) f *= 1 + Math.min(0.07, (-90 - dif) / 3000);
    }
    k.ia = f;
    // items
    let item = false;
    if (k.item && k.ruleta <= 0) {
      k.espera -= dt;
      if (k.espera <= 0) item = this.convieneUsar(k);
    }
    return { giro, item };
  }

  private convieneUsar(k: Kart): boolean {
    const fx = Math.cos(k.ang);
    const fy = Math.sin(k.ang);
    let delante = false;
    let detras = false;
    for (const o of this.karts) {
      if (o === k) continue;
      const dx = o.x - k.x;
      const dy = o.y - k.y;
      const par = dx * fx + dy * fy;
      const lat = Math.abs(-dx * fy + dy * fx);
      if (par > 10 && par < 140 && lat < 22) delante = true;
      if (par < -10 && par > -110 && lat < 24) detras = true;
    }
    switch (k.item) {
      case 'chupito':
      case 'boa':
        return k.estado === 'normal';
      case 'luz':
        return k.puesto > 1;
      case 'maleta':
        return delante || k.espera < -4;
      case 'tacon':
        return k.puesto > 1 && (delante || k.espera < -1.5);
      case 'sangria':
        return detras || k.espera < -5;
      default:
        return false;
    }
  }
}
