// Online snapshots («fotos», docs/PANG-ONLINE.md, «Las fotos»). The host's Partida takes one
// about 30 times a second (`sacarFoto`) and the room hands it to the guests; a guest's Partida
// keeps the last few in an `Espejo` and each frame paints the state of ~one interval ago,
// interpolated between the two fotos around that time.
//
// A foto is plain JSON, as small as it can be: arrays instead of objects, short keys, numbers
// rounded, empty lists left out. Images never travel: the guest rebuilds them from the data
// (bubble → `burbuja(variante, talla, color)`, item → `objeto(tipo)`, …), and those are cached.
import { texto } from '../../juego/textos';
import { burbuja, estallido, objeto } from '../arte/sprites';
import { rotulo } from '../hud';
import { crearJefe } from '../jefes';
import type { Aviso, Burbuja, Mundo } from '../mundo';
import type { EfectoGrabado } from '../sonido';
import { RADIO, type Arma, type ColorBola, type Jefe, type Objeto, type Talla, type Variante } from '../tipos';
import type { Estado, Partida } from '../juego';

export const ESTADOS: Estado[] = ['titulo', 'listo', 'ya', 'jugando', 'herido', 'victoria', 'bonus'];

const VARIANTES: Variante[] = ['cerveza', 'bola', 'purin', 'posavasos', 'champan', 'cerdito'];
const COLORES: ColorBola[] = ['roja', 'azul', 'amarilla', 'verde'];
const OBJETOS: Objeto[] = ['reloj', 'chupito', 'escudo', 'cana', 'jamon', 'aceitunas', 'croqueta', 'turron', 'yema', 'armaDoble', 'armaTriple', 'armaFijo', 'armaRafaga'];
const ARMAS: Arma[] = ['normal', 'doble', 'triple', 'fijo', 'rafaga'];
/** The shield hits and the bear hug's flag travel in one number: hits + 16 for the hug. */
const BIT_ABRAZO = 16;
const JEFES: Jefe[] = ['robi', 'peor', 'penultima'];
/** The colours `popup` and `avisar` use unless told otherwise: left out of the foto. */
const COLOR_POPUP = '#ffffff';
const COLOR_AVISO = '#ffd36a';

/** The flow of the stage (Partida's private fields), which the foto carries and the guest sets. */
export interface Flujo {
  estado: Estado;
  tEstado: number;
  causa: 'bicho' | 'tiempo';
  bonusGanado: number;
}

/**
 * One snapshot. Lists (all optional when empty):
 *   j  players  [x, y, dir, escalera, escalado, disparoT, inv, escudo+abrazo, animT, anda, puntos, vidas, barra, kinki, caido, fuera, arma]
 *   b  bubbles  [id, x, y, talla, variante, color]
 *   bq blocks of the stage that are gone (indices into `fase.bloques`)
 *   c  wires    [x, base, punta, ancho, fijo, t]
 *   ba bullets  [x, y, atraviesa]
 *   o  items    [tipo, x, y, t]
 *   ef pops     [x, y, t, variante, talla]
 *   pu numbers  [x, y, t, txt, color?]
 *   jf boss     [tipo, x, y, hp, hpMax, golpeT, gorro, escupeT]
 *   av banner   [clave, t, color?]
 *   sp the stage's special: aceituna [activa, x, dir, t], oscuro [t], cierzo [t, dir, soplando]
 *   so sounds of this interval
 */
export interface Foto {
  /** Number, and the host's clock (ms) when taken. */
  s: number;
  ts: number;
  /** Flow: state, seconds in it, cause of the hurt state (1 = time), bonus counted so far. */
  e: number;
  te: number;
  ca: number;
  bg: number;
  /** Seconds of play, seconds left, freeze left, wind, seconds since the boss died. */
  t: number;
  ti: number;
  co: number;
  vi: number;
  fj: number;
  j: number[][];
  b?: number[][];
  bq?: number[];
  c?: number[][];
  ba?: number[][];
  o?: number[][];
  ef?: number[][];
  pu?: Array<[number, number, number, string] | [number, number, number, string, string]>;
  jf?: number[];
  av?: [string, number] | [string, number, string];
  sp?: number[];
  so?: EfectoGrabado[];
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
/** Timers that only matter while above zero. */
const pos = (v: number) => (v > 0 ? r2(v) : 0);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

let sig = 0;

/** The host's Partida as a foto. Drains the recorded sound effects into it. */
export function sacarFoto(p: Partida): Foto {
  const m = p.mundo;
  const fl = p.flujo;
  const f: Foto = {
    s: sig++,
    ts: Math.round(performance.now()),
    e: ESTADOS.indexOf(fl.estado),
    te: r2(fl.tEstado),
    ca: fl.causa === 'tiempo' ? 1 : 0,
    bg: fl.bonusGanado,
    t: r2(m.t),
    ti: r1(m.tiempo),
    co: pos(m.congelado),
    vi: r2(m.viento),
    fj: r2(m.finJefe),
    j: m.jugadores.map((j) => [r1(j.x), r1(j.y), j.dir > 0 ? 1 : 0, j.escalera, r1(j.escalado), pos(j.disparoT), pos(j.inv), j.escudo + (j.abrazo ? BIT_ABRAZO : 0), r2(j.animT), j.anda ? 1 : 0, Math.floor(j.puntos), j.vidas, r2(j.barra), pos(j.kinki), pos(j.caido), j.fuera ? 1 : 0, Math.max(0, ARMAS.indexOf(j.arma))]),
  };
  if (m.burbujas.length) f.b = m.burbujas.map((b) => [b.id, r1(b.x), r1(b.y), b.talla, VARIANTES.indexOf(b.variante), COLORES.indexOf(b.color)]);
  const fb = m.fase.bloques;
  if (m.bloques.length !== fb.length) {
    const quitados: number[] = [];
    fb.forEach((b, i) => {
      if (!m.bloques.some((x) => x.x === b.x && x.y === b.y && x.w === b.w && x.h === b.h)) quitados.push(i);
    });
    if (quitados.length) f.bq = quitados;
  }
  if (m.cables.length) f.c = m.cables.map((c) => [c.x, r1(c.base), r1(c.punta), c.ancho, c.fijo ? 1 : 0, r2(c.t)]);
  if (m.balas.length) f.ba = m.balas.map((b) => [r1(b.x), r1(b.y), b.atraviesa ? 1 : 0]);
  if (m.objetos.length) f.o = m.objetos.map((o) => [OBJETOS.indexOf(o.tipo), r1(o.x), r1(o.y), r2(o.t)]);
  if (m.efectos.length) f.ef = m.efectos.map((e) => [r1(e.x), r1(e.y), r2(e.t), VARIANTES.indexOf(e.variante), e.talla]);
  if (m.popups.length) f.pu = m.popups.map((u) => (u.color === COLOR_POPUP ? [r1(u.x), r1(u.y), r2(u.t), u.txt] : [r1(u.x), r1(u.y), r2(u.t), u.txt, u.color]));
  const jf = m.jefe;
  if (jf) f.jf = [JEFES.indexOf(jf.tipo), r1(jf.x), r1(jf.y), r2(jf.hp), jf.hpMax, pos(jf.golpeT), jf.gorro ? 1 : 0, pos(jf.escupeT)];
  if (m.aviso) f.av = m.aviso.color === COLOR_AVISO ? [m.aviso.clave, r2(m.aviso.t)] : [m.aviso.clave, r2(m.aviso.t), m.aviso.color];
  switch (m.fase.especial) {
    case 'aceituna':
      f.sp = [m.aceituna.activa ? 1 : 0, r1(m.aceituna.x), m.aceituna.dir > 0 ? 1 : 0, r2(m.aceituna.t)];
      break;
    case 'oscuro':
      f.sp = [r2(m.oscuro.t)];
      break;
    case 'cierzo':
      f.sp = [r2(m.cierzo.t), m.cierzo.dir > 0 ? 1 : 0, m.cierzo.soplando ? 1 : 0];
      break;
  }
  const grabadora = m.sfx.grabadora;
  if (grabadora && grabadora.length) f.so = grabadora.splice(0, grabadora.length);
  return f;
}

// ---------------------------------------------------------------- the guest's side

/** Fotos kept. */
const MAX_COLA = 12;
/** How far behind the newest foto the guest paints (ms): about two intervals, so one late foto does not stall it. It grows when fotos run out and shrinks again. */
const RETARDO_MIN = 70;
const RETARDO_MAX = 250;
/** Things that moved further than this between two fotos jumped (a restart): no sliding. */
const SALTO = 40;

/**
 * The guest's copy of the host's stage. `meter` takes the fotos as they arrive; `aplicar`, once a
 * frame, writes the state for «now» into the Mundo (interpolating players, bubbles, the boss and
 * a few moving specials; everything else takes the newer foto) and plays the sounds that are due.
 */
export class Espejo {
  /** Fotos received, and when (performance.now) the last one came. */
  recibidas = 0;
  llegada = performance.now();

  private cola: Foto[] = [];
  /** Smallest (guest clock − host clock) seen: the fastest trip, so the host's time can be told. */
  private desfase = Infinity;
  private retardo = RETARDO_MIN;
  private ultima = -1;
  private sonada = -1;
  private quitados = '';
  private vivas = new Map<number, Burbuja>();
  private deA: Foto | null = null;
  private idsA = new Map<number, number[]>();
  private aviso: Aviso | null = null;

  constructor(private readonly m: Mundo) {}

  meter(f: Foto, ahora: number): void {
    if (!f || typeof f.s !== 'number' || typeof f.ts !== 'number' || !Array.isArray(f.j) || f.s <= this.ultima) return;
    this.ultima = f.s;
    this.recibidas++;
    this.llegada = ahora;
    this.desfase = Math.min(this.desfase, ahora - f.ts);
    this.cola.push(f);
    if (this.cola.length > MAX_COLA) this.cola.shift();
  }

  /** Writes the state for `ahora` into the Mundo; returns the flow, or null while nothing has come yet. */
  aplicar(ahora: number): Flujo | null {
    const cola = this.cola;
    if (!cola.length) return null;
    const m = this.m;
    const nueva = cola[cola.length - 1];
    let th = ahora - this.desfase - this.retardo;
    if (th > nueva.ts) {
      // Out of fotos: hold the last one and wait a little longer from now on.
      th = nueva.ts;
      this.retardo = Math.min(RETARDO_MAX, this.retardo + 4);
    } else this.retardo = Math.max(RETARDO_MIN, this.retardo - 0.5);
    let i = 0;
    while (i + 1 < cola.length && cola[i + 1].ts <= th) i++;
    const a = cola[i];
    const b = cola[i + 1] ?? a;
    // The sounds of every foto the picture has reached.
    for (const f of cola) {
      if (f.ts > th) break;
      if (f.s <= this.sonada) continue;
      this.sonada = f.s;
      if (f.so) for (const e of f.so) m.sfx.reproducir(e);
    }
    if (i > 0) cola.splice(0, i);

    // Interpolate only inside one flow state (a restart or a new state jumps).
    const suave = a !== b && a.e === b.e;
    const u = suave ? Math.min(1, Math.max(0, (th - a.ts) / (b.ts - a.ts || 1))) : 1;
    const entre = (x: number, y: number) => (suave ? lerp(x, y, u) : y);
    const cerca = (x0: number, y0: number, x1: number, y1: number) => suave && Math.abs(x1 - x0) < SALTO && Math.abs(y1 - y0) < SALTO;

    m.t = suave && b.t >= a.t ? lerp(a.t, b.t, u) : b.t;
    m.tiempo = b.ti;
    m.congelado = b.co;
    m.viento = b.vi;
    m.finJefe = b.fj;

    b.j.forEach((q, k) => {
      const j = m.jugadores[k];
      if (!j) return;
      const p = a.j[k];
      const mover = !!p && cerca(p[0], p[1], q[0], q[1]);
      j.x = mover ? lerp(p[0], q[0], u) : q[0];
      j.y = mover ? lerp(p[1], q[1], u) : q[1];
      j.dir = q[2] ? 1 : -1;
      j.escalera = q[3];
      j.escalado = q[4];
      j.disparoT = q[5];
      j.inv = q[6];
      j.escudo = q[7] & (BIT_ABRAZO - 1);
      j.abrazo = (q[7] & BIT_ABRAZO) !== 0;
      j.animT = q[8];
      j.anda = !!q[9];
      j.puntos = q[10];
      j.vidas = q[11];
      j.barra = q[12];
      j.kinki = q[13];
      j.caido = q[14];
      j.fuera = !!q[15];
      j.arma = ARMAS[q[16]] ?? 'normal';
    });

    this.burbujas(a, b, suave, u, cerca);
    this.bloques(b);

    m.cables = (b.c ?? []).map((c) => ({ x: c[0], base: c[1], punta: c[2], ancho: c[3], pega: false, fijo: !!c[4], t: c[5], dueno: 0 }));
    m.balas = (b.ba ?? []).map((q) => ({ x: q[0], y: q[1], vx: 0, vy: 0, atraviesa: !!q[2], golpeadas: [], dueno: 0 }));
    m.objetos = (b.o ?? []).map((o) => ({ tipo: OBJETOS[o[0]], img: objeto(OBJETOS[o[0]]), x: o[1], y: o[2], vy: 0, t: o[3] }));
    m.efectos = (b.ef ?? []).map((e) => ({ x: e[0], y: e[1], t: e[2], frames: estallido(VARIANTES[e[3]], e[4] as Talla), variante: VARIANTES[e[3]], talla: e[4] as Talla }));
    m.popups = (b.pu ?? []).map((u) => {
      const color = u[4] ?? COLOR_POPUP;
      return { x: u[0], y: u[1], t: u[2], img: rotulo(u[3], color), txt: u[3], color };
    });
    this.cartel(b);

    const q = b.jf;
    if (q) {
      const tipo = JEFES[q[0]];
      const j = m.jefe && m.jefe.tipo === tipo ? m.jefe : (m.jefe = crearJefe(tipo, m.jugadores.length));
      const p = a.jf && a.jf[0] === q[0] ? a.jf : null;
      const mover = !!p && cerca(p[1], p[2], q[1], q[2]);
      j.x = mover ? lerp(p![1], q[1], u) : q[1];
      j.y = mover ? lerp(p![2], q[2], u) : q[2];
      j.hp = q[3];
      j.hpMax = q[4];
      j.golpeT = q[5];
      j.gorro = !!q[6];
      j.escupeT = q[7];
    } else m.jefe = null;

    const sp = b.sp;
    if (sp) {
      const pa = a.sp;
      if (m.fase.especial === 'aceituna') {
        m.aceituna.activa = !!sp[0];
        m.aceituna.x = pa && pa[0] && sp[0] ? entre(pa[1], sp[1]) : sp[1];
        m.aceituna.dir = sp[2] ? 1 : -1;
        m.aceituna.t = sp[3];
      } else if (m.fase.especial === 'oscuro') {
        m.oscuro.t = pa && suave && sp[0] >= pa[0] ? lerp(pa[0], sp[0], u) : sp[0];
      } else if (m.fase.especial === 'cierzo') {
        m.cierzo.t = sp[0];
        m.cierzo.dir = sp[1] ? 1 : -1;
        m.cierzo.soplando = !!sp[2];
      }
    }

    return { estado: ESTADOS[b.e] ?? 'jugando', tEstado: suave && b.te >= a.te ? lerp(a.te, b.te, u) : b.te, causa: b.ca ? 'tiempo' : 'bicho', bonusGanado: b.bg };
  }

  /** Bubbles by id: the same object stays between frames, sliding between its two positions. */
  private burbujas(a: Foto, b: Foto, suave: boolean, u: number, cerca: (x0: number, y0: number, x1: number, y1: number) => boolean) {
    if (suave && this.deA !== a) {
      this.deA = a;
      this.idsA = new Map((a.b ?? []).map((q) => [q[0], q]));
    }
    const nuevas = new Map<number, Burbuja>();
    const lista: Burbuja[] = [];
    for (const q of b.b ?? []) {
      let o = this.vivas.get(q[0]);
      if (!o) {
        const talla = q[3] as Talla;
        const variante = VARIANTES[q[4]];
        const color = COLORES[q[5]] ?? 'roja';
        o = { id: q[0], x: 0, y: 0, vx: 0, vy: 0, r: RADIO[talla], bote: 0, talla, variante, color, img: burbuja(variante, talla, color) };
      }
      const p = suave ? this.idsA.get(q[0]) : undefined;
      const mover = !!p && cerca(p[1], p[2], q[1], q[2]);
      o.x = mover ? lerp(p![1], q[1], u) : q[1];
      o.y = mover ? lerp(p![2], q[2], u) : q[2];
      nuevas.set(q[0], o);
      lista.push(o);
    }
    this.vivas = nuevas;
    this.m.burbujas = lista;
  }

  /** The blocks of the stage minus the broken ones; rebuilt only when that list changes. */
  private bloques(b: Foto) {
    const clave = (b.bq ?? []).join(',');
    if (clave === this.quitados) return;
    this.quitados = clave;
    const fuera = new Set(b.bq ?? []);
    this.m.bloques = this.m.fase.bloques.filter((_, i) => !fuera.has(i)).map((x) => ({ ...x }));
  }

  /** The banner in the middle: its image is kept while the same one shows. */
  private cartel(b: Foto) {
    const m = this.m;
    const q = b.av;
    if (!q) {
      m.aviso = this.aviso = null;
      return;
    }
    const color = q[2] ?? COLOR_AVISO;
    if (!this.aviso || this.aviso.clave !== q[0] || this.aviso.color !== color) this.aviso = { img: rotulo(texto(q[0]), color, 16), t: 0, clave: q[0], color };
    this.aviso.t = q[1];
    m.aviso = this.aviso;
  }
}
