// LA ÚLTIMA, the Ultimosaurio: the final boss of «Una más», a tyrannosaurus made of beer (a glass mug for a body, a crest of foam, a brass tap for a
// tail). It lives apart from the engine: this module holds its art, its brain (three phases), its attacks, its scenes and its drawing; the engine
// (mundo.ts, render.ts, hud.ts) only calls the few hooks marked «LA ÚLTIMA» there. The room is `grifo-jefe` (datos.ts): fixed camera, the painted
// bar counter of fondos/grifo.webp is the floor.
//
// ART. src/conceptos/jefe/*.webp are pieces cut from jefe-recortado.png (2400 x 1792, the monster faces LEFT): the body with the mug, the head, the
// lower jaw, the tail with its tap and the two legs, plus `vacio`, the inside of the empty mug. All the pieces are placed in the coordinates of the
// original picture («px» below: `AX`, `AY` is the point between the feet; `K` game units per px) and animated by transforms (breathing, steps, bite,
// roar, stagger), baked pieces only. The BEER LEVEL is the `vacio` slice that covers the mug from its top down to the level (which follows its life),
// with a swaying surface on top of it. Mirrored when it looks right.
//
// FIGHT (24 hits of life). 1 «¡Ronda!»: stomps that raise waves of foam (jump them), fans of bottle caps; its weak point is the crest of foam (above
// the body: only the double jump gets there) and its head when it rests low. 2 «Barra libre»: it plugs its tail tap into a barrel at a wall to heal
// while glasses rain from the ceiling: break the barrel (Chuchi's jarrazo, like a «NO» block) and it falls dizzy. 3 «La penúltima de verdad»: half
// empty and drunk, it charges from wall to wall: climb a wall (Pablo's wall jump) and fall on its back when it crashes. Then it roars, the glass
// cracks and it empties; it shrinks into an ordinary mug and Guille takes it. Test: `&fase=2` or `&fase=3` in the address starts in that phase.
import { texto } from '../juego/textos';
import * as A from '../arte/conceptos.mjs';
import type { FiguraDef } from '../capitulos/conceptos-rig';
import { ESCALA } from './arte';
import { TILE } from './datos';
import type { Fondo } from './fondos';
import { hornearRig, type Cuadro } from './rig';
import type { Mundo } from './mundo';
import urlCuerpo from './jefe/cuerpo.webp?url';
import urlCabeza from './jefe/cabeza.webp?url';
import urlMandibula from './jefe/mandibula.webp?url';
import urlCola from './jefe/cola.webp?url';
import urlPata1 from './jefe/pata1.webp?url';
import urlPata2 from './jefe/pata2.webp?url';
import urlVacio from './jefe/vacio.webp?url';

// ---------------------------------------------------------------- numbers

/** Game units per pixel of the original picture, and the point between the feet (px). */
const K = 0.15;
const AX = 1285;
const AY = 1740;
/** Life: hits. The phases start at 24, 16 and 8. */
const HP_MAX = 24;
const HP_F2 = 16;
const HP_F3 = 8;
const HP_LLENO = 22;
/** Where each piece sits in the original picture (px) and its pivot. */
const P = {
  cuerpo: { x: 650, y: 116, w: 1127, h: 1286 },
  cabeza: { x: 137, y: 242, w: 625, h: 919 },
  mandibula: { x: 246, y: 773, w: 457, h: 344 },
  cola: { x: 1558, y: 818, w: 763, h: 605 },
  pata1: { x: 847, y: 1233, w: 443, h: 428 },
  pata2: { x: 1354, y: 1378, w: 343, h: 368 },
  vacio: { x: 1008, y: 518, w: 548, h: 768 },
} as const;
type Pieza = keyof typeof P;
const PIV = { cabeza: [700, 800], mandibula: [640, 930], cola: [1640, 1150], pata1: [1100, 1280], pata2: [1500, 1400], pie: [1520, 1745] } as const;
/** The beer: level of its surface (px of the picture) when full and when almost empty, and the span of the mug at the sides. */
const CERV = { lleno: 800, vacio: 1235, x0: 1062, x1: 1585, x1Bajo: 1290, pasoBajo: 900 };
/** The mouth, the crest and the tail tap, in px of the picture. */
const BOCA = [210, 790];
const CRESTA = [1150, 220];
const GRIFO = [2290, 1335];

const BASE_ESPERA = 0.8;

type Est = 'dormido' | 'espera' | 'camina' | 'pisoton' | 'escupe' | 'mordisco' | 'baja' | 'ruta' | 'gira' | 'bebiendo' | 'atontado' | 'prepara' | 'embiste' | 'tambalea' | 'harto' | 'rugido' | 'muerto';

interface Ola {
  x: number;
  vx: number;
  h: number;
  t: number;
}
interface Chapa {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  t: number;
}
interface Vaso {
  x: number;
  y: number;
  vy: number;
  t: number;
  cae: boolean;
}
interface Barril {
  x: number;
  hp: number;
  lado: 'izq' | 'der';
  golpeT: number;
  aviso: number;
}
interface Amigo3 {
  quien: 'guille' | 'chuchi' | 'pablo';
  x: number;
  salida: number;
  cuadros: { idle: Cuadro[]; celebra: Cuadro[] };
}
type Escena = { tipo: 'intro' | 'trans' | 'muerte' | 'encoge' | 'salen' | 'guille' | 'fin' | 'dialogo'; t: number; n?: number; flag?: Record<string, boolean> };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const aprox = (v: number, a: number, d: number) => (v < a ? Math.min(a, v + d) : Math.max(a, v - d));
const suave = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const choca = (a: Caja2, b: Caja2) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
interface Caja2 {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// ---------------------------------------------------------------- the baked art

interface ArteJefe {
  img: Record<Pieza, HTMLImageElement>;
  blanco: Record<Pieza, HTMLCanvasElement>;
  grietas: HTMLCanvasElement;
  chapa: HTMLCanvasElement;
  vaso: HTMLCanvasElement;
  barril: HTMLCanvasElement;
  ola: HTMLCanvasElement;
  chuchi: { idle: Cuadro[]; celebra: Cuadro[] };
  pablo: { idle: Cuadro[]; celebra: Cuadro[] };
}

const URLS: Record<Pieza, string> = { cuerpo: urlCuerpo, cabeza: urlCabeza, mandibula: urlMandibula, cola: urlCola, pata1: urlPata1, pata2: urlPata2, vacio: urlVacio };

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
};

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = async () => {
      await im.decode?.().catch(() => undefined);
      res(im);
    };
    im.onerror = () => rej(new Error(`no se pudo cargar ${url}`));
    im.src = url;
  });
}

function hornearGrietas(): HTMLCanvasElement {
  // Cracks over the mug (its box: P.vacio), 2 px per game unit of the picture scale: white-blue lines that branch.
  const s = 0.3;
  const c = lienzo(P.vacio.w * s, P.vacio.h * s);
  const x = c.getContext('2d')!;
  let semilla = 7;
  const r = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  const grieta = (px: number, py: number, ang: number, largo: number, grosor: number) => {
    x.beginPath();
    x.moveTo(px, py);
    let ax = px;
    let ay = py;
    for (let i = 0; i < 9 && largo > 4; i++) {
      ang += (r() - 0.5) * 1.1;
      const l = largo / 5 + r() * 6;
      ax += Math.cos(ang) * l;
      ay += Math.sin(ang) * l;
      x.lineTo(ax, ay);
      largo -= l;
      if (r() < 0.28) grieta(ax, ay, ang + (r() < 0.5 ? 0.8 : -0.8), largo * 0.6, grosor * 0.6);
    }
    x.strokeStyle = 'rgba(20,6,30,0.65)';
    x.lineWidth = grosor + 1.6;
    x.stroke();
    x.strokeStyle = 'rgba(240,250,255,0.95)';
    x.lineWidth = grosor;
    x.stroke();
  };
  const W = c.width;
  const H = c.height;
  grieta(W * 0.42, H * 0.04, 1.5, H * 0.5, 2.4);
  grieta(W * 0.8, H * 0.2, 2.1, H * 0.4, 2.2);
  grieta(W * 0.08, H * 0.35, 0.5, W * 0.7, 2);
  grieta(W * 0.95, H * 0.6, 3.3, W * 0.8, 2.2);
  grieta(W * 0.35, H * 0.98, -1.4, H * 0.5, 2.4);
  grieta(W * 0.6, H * 0.5, 0.9, H * 0.3, 1.8);
  return c;
}

function hornearChapa(): HTMLCanvasElement {
  const c = lienzo(40, 40);
  const x = c.getContext('2d')!;
  x.translate(20, 20);
  // The crimped edge: a gold star of many points, a lighter disc and a dark ring in the middle.
  x.fillStyle = '#c98a1a';
  x.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 16 : 19;
    x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  x.closePath();
  x.fill();
  const g = x.createRadialGradient(-5, -6, 2, 0, 0, 16);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.55, '#f2c14e');
  g.addColorStop(1, '#c98a1a');
  x.fillStyle = g;
  x.beginPath();
  x.arc(0, 0, 14, 0, 6.3);
  x.fill();
  x.strokeStyle = '#7a4a10';
  x.lineWidth = 2;
  x.beginPath();
  x.arc(0, 0, 8, 0, 6.3);
  x.stroke();
  return c;
}

function hornearVaso(): HTMLCanvasElement {
  const c = lienzo(44, 60);
  const x = c.getContext('2d')!;
  x.translate(22, 4);
  x.beginPath();
  x.moveTo(-17, 0);
  x.lineTo(17, 0);
  x.lineTo(12, 52);
  x.lineTo(-12, 52);
  x.closePath();
  x.fillStyle = 'rgba(210,230,255,0.55)';
  x.fill();
  x.beginPath();
  x.moveTo(-15, 14);
  x.lineTo(15, 14);
  x.lineTo(11, 50);
  x.lineTo(-11, 50);
  x.closePath();
  const g = x.createLinearGradient(0, 14, 0, 50);
  g.addColorStop(0, '#ffcf6a');
  g.addColorStop(1, '#c97a14');
  x.fillStyle = g;
  x.fill();
  x.fillStyle = '#fff6e0';
  x.fillRect(-15, 8, 30, 7);
  x.strokeStyle = 'rgba(255,255,255,0.9)';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(-17, 0);
  x.lineTo(-12, 52);
  x.moveTo(-9, 18);
  x.lineTo(-7, 44);
  x.stroke();
  x.strokeStyle = 'rgba(70,40,110,0.8)';
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(-17, 0);
  x.lineTo(17, 0);
  x.lineTo(12, 52);
  x.lineTo(-12, 52);
  x.closePath();
  x.stroke();
  return c;
}

function hornearBarril(): HTMLCanvasElement {
  const c = lienzo(120, 120);
  const x = c.getContext('2d')!;
  x.translate(60, 118);
  // The keg: wood in staves, dark iron hoops, a red plate («NO»-red: only Chuchi's jarrazo breaks it) and a brass tap on top.
  const g = x.createLinearGradient(-44, 0, 44, 0);
  g.addColorStop(0, '#5a2e14');
  g.addColorStop(0.35, '#b8723a');
  g.addColorStop(0.7, '#8a4a22');
  g.addColorStop(1, '#4a2410');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(-34, 0);
  x.quadraticCurveTo(-52, -44, -34, -88);
  x.lineTo(34, -88);
  x.quadraticCurveTo(52, -44, 34, 0);
  x.closePath();
  x.fill();
  x.strokeStyle = 'rgba(40,16,8,0.55)';
  x.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    x.beginPath();
    x.moveTo(i * 11, -86);
    x.quadraticCurveTo(i * 15, -44, i * 11, -2);
    x.stroke();
  }
  x.fillStyle = '#2a2230';
  for (const y of [-72, -16]) {
    x.beginPath();
    x.moveTo(-42 + Math.abs(y + 44) * 0.12, y);
    x.lineTo(42 - Math.abs(y + 44) * 0.12, y);
    x.lineTo(42 - Math.abs(y + 44) * 0.12, y - 8);
    x.lineTo(-42 + Math.abs(y + 44) * 0.12, y - 8);
    x.closePath();
    x.fill();
  }
  x.fillStyle = '#e8453c';
  x.beginPath();
  x.roundRect(-24, -58, 48, 24, 5);
  x.fill();
  x.strokeStyle = '#fff2d8';
  x.lineWidth = 3.5;
  x.beginPath();
  // Two strokes that read as a cross-out: no letters in the code.
  x.moveTo(-14, -52);
  x.lineTo(14, -40);
  x.moveTo(14, -52);
  x.lineTo(-14, -40);
  x.stroke();
  const b = x.createLinearGradient(0, -110, 0, -88);
  b.addColorStop(0, '#fff0a8');
  b.addColorStop(1, '#a8741a');
  x.fillStyle = b;
  x.fillRect(-5, -108, 10, 22);
  x.fillRect(-16, -112, 32, 7);
  x.fillRect(-4, -100, 22, 7);
  return c;
}

function hornearOla(): HTMLCanvasElement {
  // A mound of foam, 120 x 100, its base on the bottom edge: amber at the foot, cream bubbles at the top.
  const c = lienzo(140, 120);
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 120, 0, 10);
  g.addColorStop(0, '#d98a1c');
  g.addColorStop(0.35, '#f4c35a');
  g.addColorStop(1, '#fff6e0');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(6, 118);
  x.quadraticCurveTo(24, 60, 66, 22);
  x.quadraticCurveTo(110, 38, 136, 118);
  x.closePath();
  x.fill();
  x.fillStyle = '#fffaf0';
  const bolas = [[30, 70, 16], [52, 40, 20], [78, 28, 18], [100, 52, 17], [66, 62, 15], [118, 86, 14], [14, 96, 12], [88, 80, 13]];
  for (const [bx, by, r] of bolas) {
    x.globalAlpha = 0.92;
    x.beginPath();
    x.arc(bx, by, r, 0, 6.3);
    x.fill();
  }
  x.globalAlpha = 1;
  x.strokeStyle = '#ffd070';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(4, 117);
  x.lineTo(138, 117);
  x.stroke();
  return c;
}

function blancoDe(im: HTMLImageElement): HTMLCanvasElement {
  const c = lienzo(im.naturalWidth, im.naturalHeight);
  const x = c.getContext('2d')!;
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = '#fff4e0';
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

async function amigo(nombre: 'chuchi' | 'pablo') {
  const def = A.figura(nombre) as unknown as FiguraDef;
  const q = 1.5;
  const [a, b] = await Promise.all([hornearRig(def, [{}], ESCALA.guille * q), hornearRig(def, [{ cuerpo: { sy: 1.04 } }], ESCALA.guille * q)]);
  return { idle: a, celebra: b };
}

let artePromesa: Promise<ArteJefe> | null = null;
function cargarArteJefe(): Promise<ArteJefe> {
  artePromesa ??= (async () => {
    const nombres = Object.keys(URLS) as Pieza[];
    const ims = await Promise.all(nombres.map((n) => cargarImagen(URLS[n])));
    const img = {} as Record<Pieza, HTMLImageElement>;
    const blanco = {} as Record<Pieza, HTMLCanvasElement>;
    nombres.forEach((n, i) => {
      img[n] = ims[i];
      blanco[n] = blancoDe(ims[i]);
    });
    const [chuchi, pablo] = await Promise.all([amigo('chuchi'), amigo('pablo')]);
    return { img, blanco, grietas: hornearGrietas(), chapa: hornearChapa(), vaso: hornearVaso(), barril: hornearBarril(), ola: hornearOla(), chuchi, pablo };
  })();
  return artePromesa;
}

/** Frees the baked art when the game closes. */
export function soltarJefe() {
  artePromesa = null;
}

// ---------------------------------------------------------------- the background of the arena

/** The arena's painted backdrop sits still (a fixed camera): its width is the one of the arena, the counter under the floor; the foreground layer is off. */
export function marcarFondoUltima(f: Fondo, activa: boolean) {
  const c0 = f.capas[0];
  if (!c0 || !(c0.img instanceof HTMLImageElement)) return;
  if (activa) {
    const w = (TILE * 17) / 0.788;
    Object.assign(c0, { w, h: (w * c0.img.naturalHeight) / c0.img.naturalWidth, f: 0, fija: true });
  } else {
    c0.fija = false;
    c0.f = 0.04;
  }
  for (const c of f.capas) if (c.frente) c.alfa = activa ? 0 : undefined;
}

// ---------------------------------------------------------------- the boss

export class Ultima {
  /** Where the anchor (between its feet) stands, which way it looks (-1 left, 1 right) and the floor. */
  x: number;
  dir: -1 | 1 = -1;
  readonly suelo: number;
  readonly xl: number;
  readonly xr: number;
  hp = HP_MAX;
  /** The life shown (it eases), and the beer level that follows it. */
  hpVista = HP_MAX;
  fase = 1;
  estado: Est = 'dormido';
  /** Seconds left in the state; `sub` is a step inside it. */
  t = 0;
  sub = 0;
  anim = 0;
  hurtT = 0;
  vx = 0;
  /** Pose in the making: lean (-: front down), head, jaw, squash, a jump of the whole body. */
  incl = -0.1;
  cab = -0.3;
  mand = 0.4;
  sq = 1;
  salto = 0;
  tiembla = 0;
  /** Cracks in the glass (0..1) and the size of the monster while it shrinks (1..0). */
  grietas = 0;
  escala = 1;
  /** For the bar of life: it shows once the fight starts. */
  barra = 0;
  /** The red glow of a telegraph (0..1). */
  aviso = 0;
  olas: Ola[] = [];
  chapas: Chapa[] = [];
  vasos: Vaso[] = [];
  barril: Barril | null = null;
  esc: Escena | null = null;
  arte: ArteJefe | null = null;
  /** Attacks still to do before the next move of the phase. */
  cola: string[] = [];
  turno = 0;
  rep = 0;
  dobles = false;
  tVaso = 1.2;
  curar = 0;
  cargas = 0;
  /** The marks that tell one swing of the jug has already done its work. */
  private readonly mDebil = {} as never;
  private readonly mBarril = {} as never;
  private readonly mCuerpo = {} as never;
  private fase0: number;
  private ph = 0;
  private avisoBarril = 0;
  private amigos: Amigo3[] = [];
  private tJarra = 0;

  constructor(private readonly m: Mundo) {
    this.suelo = (m.rej.rows - 1) * TILE;
    this.xl = TILE;
    this.xr = m.W - TILE;
    this.x = this.xr - 230;
    const q = Number(new URLSearchParams(location.search).get('fase')) || 0;
    this.fase0 = q === 2 || q === 3 ? q : 0;
    void cargarArteJefe().then((a) => {
      this.arte = a;
    });
  }

  /** The fixed camera of the arena: centred, and the floor at 340 units from the top of the view. */
  static camara(m: Mundo): [number, number] {
    return [m.W / 2 - m.vw / 2, (m.rej.rows - 1) * TILE - 340];
  }

  // ---------------------------------------------------------------- geometry (the picture looks left: «u» is forward, in units from the anchor)

  private caja(u0: number, u1: number, h0: number, h1: number): Caja2 {
    const a = this.x + this.dir * u0;
    const b = this.x + this.dir * u1;
    return { x0: Math.min(a, b), x1: Math.max(a, b), y0: this.suelo - h1 - this.salto, y1: this.suelo - h0 - this.salto };
  }

  private get hundido() {
    return this.incl * 207;
  }

  /** The body that hurts, the head that hurts (it lunges forward when biting) and the crest and head that can be hit. */
  private cuerpoCaja(): Caja2 {
    return this.caja(-55, 88, 0, 165);
  }
  private cabezaCaja(): Caja2 {
    const ds = this.hundido + this.cab * 60;
    const lance = this.estado === 'mordisco' && this.sub === 1 ? 50 : 0;
    return this.caja(88, 172 + lance, 96 + ds, 200 + ds);
  }
  private crestaCaja(): Caja2 {
    const ds = this.hundido * 0.6 + this.cab * 30;
    return this.caja(-50, 172, 190 + ds, 256 + ds);
  }
  private barrilCaja(): Caja2 | null {
    const b = this.barril;
    return b ? { x0: b.x - 28, x1: b.x + 28, y0: this.suelo - 52, y1: this.suelo } : null;
  }
  private get cabezaDebil() {
    return this.estado === 'baja' || this.estado === 'atontado' || this.estado === 'bebiendo' || this.estado === 'dormido';
  }
  private get inofensiva() {
    return this.estado === 'atontado' || this.estado === 'muerto' || this.estado === 'dormido' || this.estado === 'rugido';
  }
  private get vivo() {
    return !!this.arte && this.estado !== 'muerto';
  }

  // ---------------------------------------------------------------- the update

  /** Called while the engine is in a talk (the monster keeps breathing). */
  ambiente(d: number) {
    this.anim += d;
  }

  actualizar(d: number) {
    const m = this.m;
    if (!this.arte) return;
    this.anim += d;
    this.hurtT = Math.max(0, this.hurtT - d);
    this.aviso = Math.max(0, this.aviso - d * 3);
    this.avisoBarril = Math.max(0, this.avisoBarril - d);
    this.hpVista += (this.hp - this.hpVista) * (1 - Math.exp(-d * 5));
    if (this.barra > 0 && this.barra < 1) this.barra = Math.min(1, this.barra + d * 2);
    this.proyectiles(d);
    this.lluvia(d);
    this.cerebro(d);
    this.encajar();
    this.ambientar(d);
    if (this.estado !== 'muerto' && m.estado === 'jugando') this.contacto();
  }

  /** Keeps the boss inside the arena (head and tail inside the walls). */
  private encajar() {
    const adelante = 172;
    const atras = 155;
    const lo = this.dir < 0 ? this.xl + adelante : this.xl + atras;
    const hi = this.dir < 0 ? this.xr - atras : this.xr - adelante;
    this.x = Math.max(lo, Math.min(hi, this.x));
  }

  private mirarA(x: number) {
    this.dir = x >= this.x ? 1 : -1;
  }

  private estar(e: Est, t: number, sub = 0) {
    this.estado = e;
    this.t = t;
    this.sub = sub;
  }

  private cerebro(d: number) {
    const m = this.m;
    const j = m.j;
    this.t -= d;
    const lim = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    // Pose targets, eased every frame (each state says where it wants to be).
    let incl = 0;
    let cab = 0;
    let mand = 0;
    let sq = 1;
    let salto = 0;
    let tiembla = 0;
    const resp = Math.sin(this.anim * 2.6);
    sq = 1 + 0.012 * resp;
    cab = 0.03 * Math.sin(this.anim * 1.7);
    mand = -0.04 + 0.03 * Math.sin(this.anim * 2.1);
    const dx = j.x - this.x;
    switch (this.estado) {
      case 'dormido': {
        incl = -0.1;
        cab = -0.32;
        mand = 0.45;
        if (this.fase0) {
          this.arrancar(this.fase0);
        } else if (m.estado === 'jugando' && j.x > this.xl + 230) {
          m.pelea = 1;
          j.vx = 0;
          m.hablar('jefe', () => {
            m.estado = 'ultima';
            this.esc = { tipo: 'intro', t: 0, flag: {} };
          });
        }
        break;
      }
      case 'espera': {
        this.vx = 0;
        if (this.fase !== 3) this.mirarA(j.x);
        else if (Math.abs(dx) > 40) this.mirarA(j.x);
        incl = this.fase === 3 ? -0.03 + 0.04 * Math.sin(this.anim * 1.9) : 0;
        if (this.t <= 0) this.siguiente();
        break;
      }
      case 'camina': {
        this.mirarA(j.x);
        this.vx = this.dir * 120;
        this.x += this.vx * d;
        this.ph += 120 * d * 0.045;
        salto = Math.abs(Math.sin(this.ph)) * 3;
        if (Math.abs(dx) < 240 || this.t <= 0) this.estar('espera', 0.25);
        break;
      }
      case 'pisoton': {
        // sub 0: the front foot goes up (telegraph); 1: it falls (the wave); 2: it rests.
        this.vx = 0;
        if (this.sub === 0) {
          const k = suave(1 - this.t / 0.8);
          incl = 0.07 * k;
          salto = 16 * k;
          cab = 0.2 * k;
          mand = -0.2 * k;
          this.aviso = Math.max(this.aviso, 0.6 + 0.4 * Math.sin(this.anim * 26));
          if (Math.random() < d * 24) m.fx.polvo(this.x + this.dir * rnd(-40, 90), this.suelo, 1, 12);
          if (this.t <= 0) {
            this.sub = 1;
            this.t = 0.28;
            this.golpePiso();
          }
        } else if (this.sub === 1) {
          incl = -0.05;
          salto = 0;
          if (this.t <= 0) {
            if (this.rep > 0) {
              // The triple stomp: again, with a shorter wind-up.
              this.rep--;
              this.sub = 0;
              this.t = 0.5;
            } else this.estar('baja', 1.3);
          }
        }
        break;
      }
      case 'escupe': {
        // sub 0: it breathes in (head back, mouth wide); 1: first fan; 2: second fan; 3: recovery.
        this.vx = 0;
        this.mirarA(j.x);
        if (this.sub === 0) {
          const k = suave(1 - this.t / 0.8);
          cab = 0.38 * k;
          mand = -0.35 * k;
          incl = 0.05 * k;
          sq = 1 + 0.05 * k;
          this.aviso = Math.max(this.aviso, 0.5 + 0.4 * Math.sin(this.anim * 24));
          if (this.t <= 0) {
            this.sub = 1;
            this.t = 0.45;
            this.abanico([-0.5, -0.25, 0, 0.25, 0.5]);
          }
        } else if (this.sub === 1) {
          cab = -0.05;
          mand = -0.3;
          if (this.t <= 0) {
            this.sub = 2;
            this.t = 0.5;
            this.abanico([-0.38, -0.12, 0.12, 0.38]);
          }
        } else {
          cab = -0.08;
          mand = -0.2;
          if (this.t <= 0) this.estar('espera', this.fase === 1 ? 0.55 : 0.4);
        }
        break;
      }
      case 'mordisco': {
        // sub 0: head back; 1: the lunge, jaws shut; 2: it stays there a moment.
        if (this.sub === 0) {
          this.vx = 0;
          this.mirarA(j.x);
          const k = suave(1 - this.t / 0.6);
          cab = 0.28 * k;
          mand = -0.5 * k;
          incl = 0.06 * k;
          this.aviso = Math.max(this.aviso, 0.5 + 0.4 * Math.sin(this.anim * 28));
          if (this.t <= 0) {
            this.sub = 1;
            this.t = 0.34;
            m.snd.embiste();
            m.snd.chapa();
          }
        } else if (this.sub === 1) {
          this.vx = this.dir * 560;
          this.x += this.vx * d;
          cab = -0.12;
          mand = 0.5;
          incl = -0.07;
          if (Math.random() < 0.6) m.fx.polvo(this.x - this.dir * 60, this.suelo, 1, 10);
          if (this.t <= 0) {
            this.sub = 2;
            this.t = 0.3;
            this.vx = 0;
            m.fx.sacudir(6);
            m.fx.polvo(this.x + this.dir * 130, this.suelo, 6, 18);
            m.snd.cristal();
            const [bx, by] = this.punto('cabeza', BOCA[0], BOCA[1]);
            m.fx.espuma(bx, by, 10, this.dir, 300);
            m.fx.gotas(bx, by, 6, this.dir, 300);
          }
        } else {
          cab = -0.15;
          mand = 0.45;
          incl = -0.08;
          if (this.t <= 0) this.estar('baja', 1.1);
        }
        break;
      }
      case 'baja': {
        // Resting low: the head is in reach of the jarrazo from the floor.
        this.vx = 0;
        incl = -0.12;
        cab = -0.3;
        mand = 0.0;
        if (Math.random() < d * 7) m.fx.estrellas(this.x + this.dir * rnd(90, 150), this.suelo - 150 + this.hundido, 1, '#ffe9a8');
        if (this.t <= 0) this.estar('espera', 0.4);
        break;
      }
      case 'rugido': {
        // Used by the transitions: the scene moves it; here it only holds the pose.
        this.vx = 0;
        break;
      }
      case 'ruta': {
        // Walking to the wall where the barrel is (facing the wall), then it turns round.
        const objetivo = this.sub === 0 ? this.xrDestino() : this.xlDestino();
        this.dir = objetivo >= this.x ? 1 : -1;
        this.vx = this.dir * 250;
        this.x += this.vx * d;
        this.ph += 250 * d * 0.045;
        salto = Math.abs(Math.sin(this.ph)) * 4;
        incl = -0.05;
        cab = -0.1;
        mand = -0.15;
        // Arrived (the clamp would hold it a few units short, so it counts as arrived when it stops).
        if ((this.dir > 0 && this.x >= objetivo - 2) || (this.dir < 0 && this.x <= objetivo + 2)) {
          this.x = objetivo;
          this.estar('gira', 0.6, this.sub);
          m.fx.polvo(this.x, this.suelo, 6, 40);
        }
        break;
      }
      case 'gira': {
        this.vx = 0;
        const k = 1 - this.t / 0.6;
        salto = Math.sin(Math.PI * Math.min(1, k * 1.4)) * 14;
        sq = 1 - 0.05 * Math.sin(Math.PI * k);
        if (k > 0.45 && this.sub >= 0) {
          // Turns to face the arena and plugs in.
          const lado: 'izq' | 'der' = this.sub === 0 ? 'der' : 'izq';
          this.dir = lado === 'der' ? -1 : 1;
          this.sub = -1;
          const tip = this.punto('cola', GRIFO[0], GRIFO[1]);
          this.barril = { x: tip[0], hp: 6, lado, golpeT: 0, aviso: 0 };
          this.curar = 0;
          m.fx.polvo(tip[0], this.suelo, 6, 24);
          m.fx.sacudir(5);
          m.snd.barrilRoto();
          m.snd.chorro();
          this.avisar('jefe.pista.barril');
        }
        if (this.t <= 0) this.estar('bebiendo', 99);
        break;
      }
      case 'bebiendo': {
        // Drinking from the barrel: it trembles, the beer rises (a hit of life each so often) and the glasses rain.
        this.vx = 0;
        incl = -0.04;
        cab = -0.16;
        mand = -0.1;
        tiembla = 1;
        if (this.barril) this.barril.golpeT = Math.max(0, this.barril.golpeT - d);
        this.curar += d;
        if (this.curar > 1.35) {
          this.curar = 0;
          if (this.hp < HP_LLENO) {
            this.hp += 1;
            const [cx, cy] = this.punto('cuerpo', 1300, 900);
            m.fx.gotas(cx, cy, 6, 0, 160, '#ffcf4a');
            m.fx.estrellas(cx, cy, 5, '#fff2b8');
            m.fx.onda(cx, cy, 10, '#ffd070', 10, 0.45);
            m.snd.chorro();
          } else this.estar('harto', 1.4);
        }
        if (Math.random() < d * 9) {
          const b = this.barril;
          if (b) m.fx.gotas(b.x, this.suelo - 60, 1, 0, 80, '#ffcf4a');
        }
        break;
      }
      case 'harto': {
        // Full: it unplugs with a belch and goes on with a round of attacks before trying again.
        this.vx = 0;
        incl = 0.05;
        cab = 0.3;
        mand = -0.3;
        if (this.sub === 0) {
          this.sub = 1;
          m.snd.eructo();
          this.quitarBarril(false);
          this.cola = ['pisoton', 'escupe'];
        }
        if (this.t <= 0) this.estar('espera', 0.3);
        break;
      }
      case 'atontado': {
        this.vx = aprox(this.vx, 0, 600 * d);
        this.x += this.vx * d;
        incl = -0.14 + 0.012 * Math.sin(this.anim * 5);
        cab = -0.36 + 0.03 * Math.sin(this.anim * 4);
        mand = -0.15;
        if (Math.random() < d * 9) m.fx.estrellas(this.x + this.dir * rnd(80, 150), this.suelo - 150 + this.hundido, 1, '#ffe9a8');
        if (this.t <= 0) {
          if (this.fase === 2) this.estar('espera', 0.6);
          else this.estar('tambalea', 0.7);
        }
        break;
      }
      case 'tambalea': {
        // Drunk: it sways about between charges.
        this.vx = 0;
        incl = -0.04 + 0.05 * Math.sin(this.anim * 2.4);
        cab = 0.05 * Math.sin(this.anim * 3.1) - 0.05;
        mand = -0.1;
        if (Math.abs(dx) > 30) this.mirarA(j.x);
        if (this.t <= 0) this.siguiente();
        break;
      }
      case 'prepara': {
        // The telegraph of the charge: it scrapes the floor and burps; the wall it is going to hit is the one it faces.
        this.vx = 0;
        const k = suave(1 - this.t / 1.0);
        incl = 0.05 * k + 0.02 * Math.sin(this.anim * 25) * k;
        cab = 0.2 * k;
        mand = -0.3 * k;
        tiembla = k;
        this.aviso = Math.max(this.aviso, 0.55 + 0.4 * Math.sin(this.anim * 28));
        if (Math.random() < d * 30) m.fx.polvo(this.x - this.dir * rnd(-40, 80), this.suelo, 1, 10);
        if (this.sub === 0 && this.t < 0.55) {
          this.sub = 1;
          m.snd.eructo();
          const [bx, by] = this.punto('cabeza', BOCA[0], BOCA[1]);
          m.fx.espuma(bx, by, 8, this.dir, 220);
        }
        if (this.t <= 0) {
          this.estar('embiste', 3);
          this.cargas++;
          m.snd.embiste();
          m.snd.rugido(0.6);
        }
        break;
      }
      case 'embiste': {
        const v = 440 + Math.min(3, this.cargas) * 35;
        this.vx = this.dir * v;
        const antes = this.x;
        this.x += this.vx * d;
        this.encajar();
        this.ph += v * d * 0.045;
        salto = Math.abs(Math.sin(this.ph * 1.2)) * 9;
        // The drunk wobble: it leans from side to side and the jaw swings.
        incl = -0.1 + 0.05 * Math.sin(this.anim * 14);
        cab = -0.1 + 0.1 * Math.sin(this.anim * 11);
        mand = -0.3;
        if (Math.random() < 0.7) m.fx.polvo(this.x - this.dir * 70, this.suelo, 1, 14);
        if (Math.random() < d * 14) m.fx.gotas(this.x, this.suelo - 150, 1, -this.dir, 150, '#f0a21e');
        if (Math.floor(this.anim * 8) % 2 === 0) m.fx.sacudir(1.3);
        if (Math.abs(this.x - antes) < 0.01 || this.t <= 0) this.choqueMuro();
        break;
      }
      case 'muerto':
        break;
    }
    // The pose eases towards what the state asked for.
    const e = 1 - Math.exp(-d * (this.estado === 'embiste' ? 14 : 9));
    this.incl += (incl - this.incl) * e;
    this.cab += (lim(cab, -0.6, 0.6) - this.cab) * e;
    this.mand += (lim(mand, -0.7, 0.7) - this.mand) * e;
    this.sq += (sq - this.sq) * e;
    this.salto += (salto - this.salto) * Math.min(1, e * 1.6);
    this.tiembla += (tiembla - this.tiembla) * e;
    // Phase changes (a hit may take it over the line).
    if (this.hp <= 0 && this.estado !== 'muerto') this.morir();
    else if (this.fase === 1 && this.hp <= HP_F2) this.transicion(2);
    else if (this.fase === 2 && this.hp <= HP_F3) this.transicion(3);
  }

  /** Where the boss stands to plug into the right wall (its tail tip a hundred units from it) and into the left one. */
  private xrDestino() {
    return this.xr - 100 - 150;
  }
  private xlDestino() {
    return this.xl + 100 + 150;
  }

  /** What it does next, by phase. */
  private siguiente() {
    const m = this.m;
    const j = m.j;
    const dx = Math.abs(j.x - this.x);
    if (this.fase === 1) {
      if (dx > 330 && this.estado !== 'camina') return this.estar('camina', 1.0);
      const lista = ['pisoton', 'escupe', 'mordisco', 'pisoton+', 'escupe', 'pisoton'];
      const a = this.cola.shift() ?? lista[this.turno++ % lista.length];
      return this.atacar(a);
    }
    if (this.fase === 2) {
      const a = this.cola.shift();
      if (a) return this.atacar(a);
      // The side it plugs into is the one away from Fran: he has to get past it.
      const lado = j.x < this.m.W / 2 ? 0 : 1;
      return this.estar('ruta', 99, lado === 0 ? 0 : 1);
    }
    const a = this.cola.shift() ?? (this.turno++ % 4 === 2 ? 'escupe' : 'embiste');
    return this.atacar(a);
  }

  private atacar(a: string) {
    const m = this.m;
    this.mirarA(m.j.x);
    if (a === 'pisoton' || a === 'pisoton+') {
      this.rep = a === 'pisoton+' ? 2 : 0;
      this.dobles = a === 'pisoton+';
      this.estar('pisoton', 0.85, 0);
      m.snd.embiste();
    } else if (a === 'escupe') this.estar('escupe', 0.85, 0);
    else if (a === 'mordisco') this.estar('mordisco', 0.6, 0);
    else if (a === 'embiste') {
      this.estar('prepara', 1.0, 0);
      m.snd.eructo();
    }
  }

  // ---------------------------------------------------------------- attacks

  /** The stomp: a boom, dust, and a wave of foam running along the floor to each side (one is tall in the second stomp). */
  private golpePiso() {
    const m = this.m;
    m.fx.sacudir(14);
    m.fx.parar(0.07);
    m.fx.destello(0.15, '#fff1c8');
    m.snd.pisoton();
    const fx = this.x + this.dir * 70;
    m.fx.polvo(fx, this.suelo, 14, 70);
    m.fx.espuma(fx, this.suelo - 4, 16, 0, 300);
    m.fx.onda(fx, this.suelo - 4, 20, '#ffe9a8', 26, 0.45);
    // In the triple stomp the last one sends a tall wave (the double jump clears it with room to spare).
    const alta = this.dobles && this.rep === 0;
    for (const lado of [-1, 1]) this.olas.push({ x: fx + lado * 60, vx: lado * 300, h: alta ? 82 : 46, t: 0 });
  }

  /** A fan of bottle caps at Fran, spread by these angles (radians). */
  private abanico(angulos: number[]) {
    const m = this.m;
    const [bx, by] = this.punto('cabeza', BOCA[0], BOCA[1]);
    const j = m.j;
    const base = Math.atan2(j.y - 50 - by, j.x - bx);
    m.snd.chapa();
    m.snd.cristal();
    m.fx.espuma(bx, by, 8, this.dir, 240);
    m.fx.chispas(bx, by, 8, this.dir, 300, '#ffd24a');
    m.fx.sacudir(3);
    for (const a of angulos) {
      const ang = base + a;
      this.chapas.push({ x: bx, y: by, vx: Math.cos(ang) * 390, vy: Math.sin(ang) * 390 - 40, rot: 0, t: 0 });
    }
  }

  /** The crash against the wall at the end of a charge: it stays dizzy, ready to be hit. */
  private choqueMuro() {
    const m = this.m;
    m.fx.sacudir(17);
    m.fx.parar(0.1);
    m.fx.destello(0.25, '#fff1c8');
    m.snd.pisoton();
    m.snd.cristal(true);
    const hx = this.x + this.dir * 160;
    m.fx.polvo(hx, this.suelo, 12, 40);
    m.fx.hojas(hx, this.suelo - 120, 16, -this.dir, ['#cfe8ff', '#ffffff', '#9ad0ff']);
    m.fx.espuma(hx, this.suelo - 100, 16, -this.dir, 340);
    m.fx.gotas(this.x, this.suelo - 150, 14, -this.dir, 380, '#f0a21e');
    this.vx = -this.dir * 110;
    this.estar('atontado', 2.5);
    m.snd.eructo();
  }

  // ---------------------------------------------------------------- shots and hazards

  private proyectiles(d: number) {
    const m = this.m;
    const j = m.j;
    const jr: Caja2 = { x0: j.x - j.hw * 0.8, x1: j.x + j.hw * 0.8, y0: j.y - j.h + 6, y1: j.y - 3 };
    // Waves of foam along the floor: they hurt below their height.
    for (let i = this.olas.length - 1; i >= 0; i--) {
      const o = this.olas[i];
      o.t += d;
      o.x += o.vx * d;
      if (o.x < this.xl + 4 || o.x > this.xr - 4 || o.t > 3) {
        m.fx.espuma(o.x, this.suelo - 8, 8, -Math.sign(o.vx), 200);
        m.fx.polvo(o.x, this.suelo, 3, 10);
        this.olas.splice(i, 1);
        continue;
      }
      if (Math.random() < 0.6) m.fx.espuma(o.x, this.suelo - o.h * 0.8, 1, Math.sign(o.vx), 60);
      if (m.estado === 'jugando' && choca(jr, { x0: o.x - 24, x1: o.x + 24, y0: this.suelo - o.h, y1: this.suelo })) m.herir(o.x);
    }
    // Bottle caps.
    for (let i = this.chapas.length - 1; i >= 0; i--) {
      const c = this.chapas[i];
      c.t += d;
      c.vy += 260 * d;
      c.x += c.vx * d;
      c.y += c.vy * d;
      c.rot += 14 * d;
      let fuera = c.x < this.xl + 4 || c.x > this.xr - 4 || c.t > 4;
      if (c.y > this.suelo - 6) {
        m.fx.chispas(c.x, this.suelo - 6, 5, 0, 220, '#ffd24a', 2.4);
        m.snd.chapa();
        fuera = true;
      }
      if (c.y < 60) fuera = true;
      if (!fuera && m.estado === 'jugando' && choca(jr, { x0: c.x - 9, x1: c.x + 9, y0: c.y - 9, y1: c.y + 9 })) {
        m.herir(c.x);
        fuera = true;
      }
      if (fuera) this.chapas.splice(i, 1);
    }
  }

  /** The rain of glasses in the second phase: a ring on the floor warns, then the glass falls. */
  private lluvia(d: number) {
    const m = this.m;
    const j = m.j;
    if (this.fase === 2 && (this.estado === 'bebiendo' || this.estado === 'ruta' || this.estado === 'gira' || this.estado === 'espera' || this.estado === 'pisoton' || this.estado === 'escupe')) {
      this.tVaso -= d;
      if (this.tVaso <= 0) {
        this.tVaso = this.estado === 'bebiendo' ? 1.05 : 1.7;
        const x = Math.max(this.xl + 30, Math.min(this.xr - 30, j.x + rnd(-170, 170)));
        this.vasos.push({ x, y: 60, vy: 0, t: 0, cae: false });
      }
    }
    const jr: Caja2 = { x0: j.x - j.hw * 0.8, x1: j.x + j.hw * 0.8, y0: j.y - j.h + 6, y1: j.y - 3 };
    for (let i = this.vasos.length - 1; i >= 0; i--) {
      const v = this.vasos[i];
      v.t += d;
      if (!v.cae) {
        if (v.t > 0.85) {
          v.cae = true;
          v.y = 40;
        }
        continue;
      }
      v.vy += 1500 * d;
      v.y += v.vy * d;
      if (m.estado === 'jugando' && choca(jr, { x0: v.x - 14, x1: v.x + 14, y0: v.y - 8, y1: v.y + 50 })) {
        m.herir(v.x);
        this.romperVaso(v);
        this.vasos.splice(i, 1);
        continue;
      }
      if (v.y + 48 > this.suelo) {
        this.romperVaso(v);
        this.vasos.splice(i, 1);
      }
    }
  }

  private romperVaso(v: Vaso) {
    const m = this.m;
    const y = Math.min(this.suelo - 4, v.y + 48);
    m.fx.hojas(v.x, y - 6, 9, 0, ['#cfe8ff', '#ffffff', '#9ad0ff']);
    m.fx.gotas(v.x, y - 4, 7, 0, 260, '#f0a21e');
    m.fx.espuma(v.x, y - 4, 4, 0, 160);
    m.snd.cristal();
  }

  // ---------------------------------------------------------------- Fran's blows

  /** The jarrazo of Fran, in world coordinates: true if it touched something of the boss. */
  golpe(x0: number, x1: number, y0: number, y1: number) {
    const m = this.m;
    if (!this.vivo || m.estado !== 'jugando') return;
    const j = m.j;
    const marcas = j.golpeados as unknown as Set<unknown>;
    const swing: Caja2 = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1 };
    // The barrel: only Chuchi's jarrazo breaks it.
    const bc = this.barrilCaja();
    if (bc && choca(swing, bc) && !marcas.has(this.mBarril)) {
      marcas.add(this.mBarril);
      this.golpeBarril(swing, bc);
    }
    if (this.estado === 'muerto' || this.estado === 'rugido' || this.estado === 'dormido') return;
    // The weak spots: the crest (only reached from above the body) and the head when it rests low.
    const debil = choca(swing, this.crestaCaja()) ? this.crestaCaja() : this.cabezaDebil && choca(swing, this.cabezaCaja()) ? this.cabezaCaja() : null;
    if (debil && !marcas.has(this.mDebil)) {
      marcas.add(this.mDebil);
      this.herirJefe(swing, debil);
    } else if (!debil && choca(swing, this.cuerpoCaja()) && !marcas.has(this.mCuerpo)) {
      // The glass does not give: a dull clang.
      marcas.add(this.mCuerpo);
      const px = Math.max(swing.x0, Math.min(swing.x1, this.x));
      m.fx.chispas(px, (swing.y0 + swing.y1) / 2, 6, j.cara, 300, '#ffffff', 2);
      m.fx.sacudir(2);
      m.fx.parar(0.03);
      m.snd.clang();
    }
  }

  private herirJefe(sw: Caja2, c: Caja2) {
    const m = this.m;
    const j = m.j;
    this.hp = Math.max(0, this.hp - 1);
    this.hurtT = 0.14;
    const px = (Math.max(sw.x0, c.x0) + Math.min(sw.x1, c.x1)) / 2;
    const py = (Math.max(sw.y0, c.y0) + Math.min(sw.y1, c.y1)) / 2;
    m.fx.golpe(px, py, j.cara, true);
    m.fx.espuma(px, py, 14, j.cara, 340);
    m.fx.gotas(px, py, 12, j.cara, 420, '#f0a21e');
    m.fx.parar(0.12);
    m.fx.sacudir(11);
    m.snd.golpe(true);
    m.snd.cristal();
    // The crest of foam is thrown into the air: bubbles and flakes.
    const [cx, cy] = this.punto('cuerpo', CRESTA[0], CRESTA[1]);
    m.fx.espuma(cx, cy, 8, 0, 200);
    if (this.estado === 'atontado') this.vx = -this.dir * 40;
  }

  private golpeBarril(sw: Caja2, c: Caja2) {
    const m = this.m;
    const b = this.barril!;
    const px = (Math.max(sw.x0, c.x0) + Math.min(sw.x1, c.x1)) / 2;
    const py = (Math.max(sw.y0, c.y0) + Math.min(sw.y1, c.y1)) / 2;
    if (!m.tiene('teclazo')) {
      m.fx.chispas(px, py, 8, m.j.cara, 300, '#ffffff', 2);
      m.fx.sacudir(2);
      m.snd.clang();
      if (b.aviso <= 0) {
        b.aviso = 4;
        m.aviso(texto('jefe.pista.barril'), 3.2);
      }
      return;
    }
    b.hp -= 1;
    b.golpeT = 0.2;
    m.fx.golpe(px, py, m.j.cara, false);
    m.fx.teclas(px, py, 5);
    m.fx.gotas(px, py, 8, m.j.cara, 300, '#f0a21e');
    m.snd.golpe(true);
    if (b.hp <= 0) {
      this.quitarBarril(true);
      this.estar('atontado', 3.6);
      this.vx = -this.dir * 20;
      m.fx.camaraLenta(0.4, 0.5);
      m.snd.eructo();
    }
  }

  /** The barrel goes (broken, or the boss unplugging). */
  private quitarBarril(roto: boolean) {
    const m = this.m;
    const b = this.barril;
    if (!b) return;
    this.barril = null;
    if (roto) {
      m.fx.muerteEnemigo(b.x, this.suelo - 30, '#f0a21e', false);
      m.fx.teclas(b.x, this.suelo - 30, 10);
      m.fx.gotas(b.x, this.suelo - 30, 24, 0, 520, '#f0a21e');
      m.fx.espuma(b.x, this.suelo - 30, 20, 0, 360);
      m.fx.sacudir(14);
      m.fx.parar(0.1);
      m.snd.barrilRoto();
    } else {
      m.fx.gotas(b.x, this.suelo - 40, 8, 0, 200, '#f0a21e');
    }
  }

  // ---------------------------------------------------------------- touching Fran

  private contacto() {
    const m = this.m;
    if (this.inofensiva) return;
    const j = m.j;
    if (j.inv > 0) return;
    const jr: Caja2 = { x0: j.x - j.hw * 0.8, x1: j.x + j.hw * 0.8, y0: j.y - j.h + 6, y1: j.y - 4 };
    const cuerpo = this.cuerpoCaja();
    if (choca(jr, cuerpo)) return m.herir((cuerpo.x0 + cuerpo.x1) / 2);
    if (this.estado !== 'baja' && this.estado !== 'bebiendo') {
      const cab = this.cabezaCaja();
      if (choca(jr, cab)) m.herir((cab.x0 + cab.x1) / 2);
    }
  }

  // ---------------------------------------------------------------- ambient effects

  private ambientar(d: number) {
    const m = this.m;
    if (this.estado === 'muerto') return;
    if (Math.random() < d * 5) {
      const [cx, cy] = this.punto('cuerpo', rnd(900, 1500), rnd(150, 300));
      m.fx.espuma(cx, cy, 1, 0, 40);
    }
    if (this.fase >= 3 && Math.random() < d * 3) {
      const [gx, gy] = this.punto('cuerpo', rnd(1100, 1500), rnd(900, 1250));
      m.fx.gotas(gx, gy, 1, 0, 60, '#f0a21e');
    }
  }

  // ---------------------------------------------------------------- phases and scenes

  private arrancar(fase: number) {
    const m = this.m;
    this.barra = 0.01;
    m.pelea = 1;
    this.fase = fase;
    this.hp = fase === 2 ? HP_F2 : HP_F3;
    this.hpVista = this.hp;
    this.grietas = fase === 3 ? 0.5 : 0;
    this.estar('espera', 0.8);
    this.dir = -1;
    this.x = this.xr - 230;
    m.snd.musicaJefe(fase === 3 ? 3 : 1);
    this.fase0 = 0;
  }

  /** Where a point of a piece of the picture is in the world (for the effects): the matrix chain of the drawing. */
  private punto(grupo: 'cuerpo' | 'cabeza' | 'cola', ox: number, oy: number): [number, number] {
    const M = this.matriz(grupo);
    const p = M.transformPoint(new DOMPoint(ox, oy));
    return [p.x, p.y];
  }

  private matriz(grupo: 'cuerpo' | 'cabeza' | 'cola' | 'mandibula' | 'pata1' | 'pata2'): DOMMatrix {
    const gira = (px: number, py: number, r: number) => new DOMMatrix().translate(px, py).rotate((r * 180) / Math.PI).translate(-px, -py);
    const sx = this.escala;
    let M = new DOMMatrix()
      .translate(this.x + (this.tiembla > 0.05 ? Math.sin(this.anim * 70) * 1.2 * this.tiembla : 0), this.suelo - this.salto)
      .scale(this.dir > 0 ? -K : K, K)
      .scale(sx, sx * this.sq)
      .translate(-AX, -AY);
    if (grupo === 'pata2') return M;
    M = M.multiply(gira(PIV.pie[0], PIV.pie[1], this.incl));
    if (grupo === 'cuerpo') return M;
    if (grupo === 'cabeza') return M.multiply(gira(PIV.cabeza[0], PIV.cabeza[1], this.cab));
    if (grupo === 'mandibula') return M.multiply(gira(PIV.cabeza[0], PIV.cabeza[1], this.cab)).multiply(gira(PIV.mandibula[0], PIV.mandibula[1], this.mand));
    if (grupo === 'cola') return M.multiply(gira(PIV.cola[0], PIV.cola[1], this.colaRot()));
    // pata1: the far leg steps.
    return M.multiply(gira(PIV.pata1[0], PIV.pata1[1], this.pata1Rot()));
  }

  private colaRot() {
    const base = 0.03 * Math.sin(this.anim * 1.6);
    if (this.estado === 'bebiendo') return 0.1 + 0.015 * Math.sin(this.anim * 60);
    if (this.estado === 'embiste') return -0.12 * Math.sin(this.anim * 11);
    if (this.estado === 'atontado') return 0.12;
    return base + (Math.abs(this.vx) > 10 ? -0.06 * Math.sin(this.ph * 2) : 0);
  }

  private pata1Rot() {
    if (this.estado === 'pisoton' && this.sub === 0) return 0.7 * suave(1 - this.t / 0.8);
    if (this.estado === 'pisoton') return -0.08;
    if (Math.abs(this.vx) > 10) return 0.3 * Math.sin(this.ph * 2);
    return 0.01 * Math.sin(this.anim * 2.6);
  }

  private pata2Rot() {
    if (Math.abs(this.vx) > 10) return -0.3 * Math.sin(this.ph * 2);
    return 0;
  }

  private transicion(fase: number) {
    const m = this.m;
    this.fase = fase;
    this.olas = [];
    this.chapas = [];
    this.vasos = [];
    this.quitarBarril(false);
    this.cola = [];
    this.estar('rugido', 99);
    m.estado = 'ultima';
    m.j.vx = 0;
    this.esc = { tipo: 'trans', t: 0, n: fase, flag: {} };
    m.fx.camaraLenta(0.3, 0.5);
    if (fase === 3) m.snd.musicaJefe(3);
  }

  private morir() {
    const m = this.m;
    this.estar('muerto', 99);
    this.olas = [];
    this.chapas = [];
    this.vasos = [];
    this.quitarBarril(false);
    m.estado = 'ultima';
    m.j.vx = 0;
    this.esc = { tipo: 'muerte', t: 0, flag: {} };
    m.snd.parar(1.4);
    m.fx.camaraLenta(0.25, 0.9);
    m.fx.destello(0.4, '#fff6d8');
  }

  private avisar(clave: string) {
    this.m.aviso(texto(clave), 3.4);
  }

  /** The scenes: the intro, the changes of phase, the death and the end (the engine is in the state `ultima`). */
  escena(d: number, ent: { tomar: (k: 'saltarP' | 'atacarP' | 'pausaP' | 'tocarP') => boolean }) {
    const m = this.m;
    const e = this.esc;
    ent.tomar('tocarP');
    ent.tomar('saltarP');
    ent.tomar('atacarP');
    this.anim += d;
    this.hurtT = Math.max(0, this.hurtT - d);
    this.hpVista += (this.hp - this.hpVista) * (1 - Math.exp(-d * 5));
    if (!e) {
      m.estado = 'jugando';
      return;
    }
    e.t += d;
    const f = e.flag!;
    const una = (k: string, hacer: () => void) => {
      if (!f[k]) {
        f[k] = true;
        hacer();
      }
    };
    const dioses = (incl: number, cab: number, mand: number, sq = 1) => {
      const k = 1 - Math.exp(-d * 8);
      this.incl += (incl - this.incl) * k;
      this.cab += (cab - this.cab) * k;
      this.mand += (mand - this.mand) * k;
      this.sq += (sq - this.sq) * k;
    };
    switch (e.tipo) {
      case 'intro': {
        // Wakes up: the head rises, then the roar and the name.
        const k = suave(e.t / 0.9);
        dioses(-0.1 + 0.15 * k, -0.32 + 0.7 * k, 0.45 - 0.9 * k, 1 + 0.04 * k);
        if (e.t > 0.4) this.tiembla = 1;
        if (e.t > 0.2 && Math.floor((e.t - d) / 0.3) !== Math.floor(e.t / 0.3)) m.fx.sacudir(4);
        if (e.t >= 0.9)
          una('rugido', () => {
            m.snd.rugido();
            m.snd.musicaJefe(1);
            m.fx.sacudir(14);
            m.fx.destello(0.4, '#fff1c8');
            m.bannerJefe = { titulo: texto('jefe.ultima'), sub: texto('jefe.ultima.sub'), t: 0 };
            this.espumazo();
          });
        if (e.t > 2.8) {
          this.barra = 0.01;
          this.estar('espera', BASE_ESPERA);
          m.estado = 'jugando';
          m.pelea = 1;
          this.esc = null;
          m.aviso(texto('jefe.fase1') + ' ' + texto('jefe.fase1.sub'), 4);
        }
        break;
      }
      case 'trans': {
        const fase = e.n ?? 2;
        dioses(0.1, 0.45, -0.5, 1.05);
        this.tiembla = 1;
        if (e.t > 0.3) {
          una('rugido', () => {
            m.snd.rugido(1.2);
            m.fx.sacudir(16);
            m.fx.destello(0.5, '#ff5a4a');
            m.fx.onda(this.x, this.suelo - 120, 20, '#ff7a6a', 24, 0.7);
            this.espumazo();
            m.bannerJefe = { titulo: texto(`jefe.fase${fase}`), sub: texto(`jefe.fase${fase}.sub`), t: 0 };
            if (fase === 3) this.grietas = 0.5;
          });
        }
        if (Math.floor((e.t - d) / 0.35) !== Math.floor(e.t / 0.35) && e.t > 0.3 && e.t < 2.2) m.fx.sacudir(5);
        if (e.t > 2.4) {
          this.esc = null;
          this.tiembla = 0;
          m.estado = 'jugando';
          this.estar('espera', 0.5);
          this.dir = m.j.x >= this.x ? 1 : -1;
          this.turno = 0;
          this.tVaso = 1.8;
          m.hablar(fase === 2 ? 'jefe.fase2' : 'jefe.fase3', () => {
            this.avisar(fase === 2 ? 'jefe.pista.barril' : 'jefe.pista.pared');
          });
        }
        break;
      }
      case 'muerte': {
        // Roars, the glass cracks, the beer runs out and the mug bursts.
        const t = e.t;
        dioses(0.1, 0.5, -0.55, 1.05);
        this.tiembla = t < 3 ? 1 : 0;
        una('rugido', () => m.snd.rugido(1.5));
        const k = suave((t - 1.0) / 1.8);
        this.grietas = Math.max(this.grietas, 0.5 + 0.5 * k);
        if (t > 1.0 && t < 3.0) {
          this.hp = Math.max(0, this.hp);
          this.hpVista = Math.max(0, this.hpVista - d * 3);
          if (Math.floor((t - d) / 0.22) !== Math.floor(t / 0.22)) {
            m.snd.cristal();
            m.fx.sacudir(8);
            const [cx, cy] = this.punto('cuerpo', rnd(1100, 1550), rnd(600, 1200));
            m.fx.hojas(cx, cy, 5, 0, ['#cfe8ff', '#ffffff', '#9ad0ff']);
            m.fx.gotas(cx, cy, 8, 0, 300, '#f0a21e');
          }
          if (Math.random() < d * 40) {
            const [gx, gy] = this.punto('cuerpo', rnd(1100, 1500), 1280);
            m.fx.gotas(gx, gy, 2, rnd(-1, 1), 220, '#f0a21e');
          }
        }
        if (t >= 3.0)
          una('estalla', () => {
            const [cx, cy] = this.punto('cuerpo', 1300, 900);
            m.fx.muerteEnemigo(cx, cy, '#f0a21e', true);
            m.fx.hojas(cx, cy, 30, 0, ['#cfe8ff', '#ffffff', '#9ad0ff']);
            m.fx.hojas(cx, cy, 20, 0, ['#cfe8ff', '#ffffff', '#9ad0ff']);
            m.fx.gotas(cx, cy, 28, 0, 560, '#f0a21e');
            m.fx.espuma(cx, cy, 26, 0, 420);
            m.fx.destello(0.9, '#fff6d8');
            m.fx.camaraLenta(0.35, 1.2);
            m.snd.cristal(true);
            m.snd.muerteEnemigo(true);
          });
        if (t > 3.5 && !f.habla) {
          f.habla = true;
          e.tipo = 'dialogo';
          this.tiembla = 0;
          m.hablar('jefe.muere', () => {
            m.estado = 'ultima';
            this.esc = { tipo: 'encoge', t: 0, flag: {} };
          });
        }
        break;
      }
      case 'dialogo':
        break;
      case 'encoge': {
        // It shrinks and shrinks until it is an ordinary mug on the floor.
        const k = suave(e.t / 1.7);
        this.escala = 1 - 0.9 * k;
        dioses(0, 0, 0.2, 1);
        this.tJarra = k;
        if (Math.floor((e.t - d) / 0.2) !== Math.floor(e.t / 0.2) && k < 0.95) {
          m.fx.estrellas(this.x, this.suelo - 60 * this.escala, 2, '#fff2b8');
          m.fx.onda(this.x, this.suelo - 40 * this.escala, 10 * this.escala, '#ffe9a8', 10, 0.35);
        }
        una('suena', () => m.snd.sorbo());
        if (e.t > 2.1) {
          this.escala = 0;
          this.tJarra = 1;
          this.esc = { tipo: 'salen', t: 0, flag: {} };
          void cargarArteJefe().then((a) => this.prepararAmigos(a));
        }
        break;
      }
      case 'salen': {
        // The friends come out of Fran's jar one after another and run to him.
        if (!this.amigos.length && this.arte) this.prepararAmigos(this.arte);
        this.amigos.forEach((_a, i) => {
          if (e.t > i * 0.4 + 0.2 && !f[`s${i}`]) {
            f[`s${i}`] = true;
            const [jx, jy] = m.posJarra();
            m.fx.gotas(jx, jy, 8, 0, 280, '#f0a21e');
            m.fx.espuma(jx, jy, 8, 0, 200);
            m.fx.estrellas(jx, jy, 6, '#ffe9a8');
            m.snd.sorbo();
          }
        });
        if (e.t > 2.2 && !f.habla) {
          f.habla = true;
          e.tipo = 'dialogo';
          m.hablar('jefe.final.1', () => {
            m.estado = 'ultima';
            this.esc = { tipo: 'guille', t: 0, flag: {} };
          });
        }
        break;
      }
      case 'guille': {
        // Guille takes the mug (it flies into his hands) and says it is his.
        if (e.t > 1.5 && !f.agarra) {
          f.agarra = true;
          m.snd.rescate();
          const g = this.amigos.find((a) => a.quien === 'guille');
          if (g) m.fx.estrellas(g.x, this.suelo - 60, 14, '#fff2b8');
        }
        if (e.t > 2.0 && !f.habla) {
          f.habla = true;
          e.tipo = 'dialogo';
          m.hablar('jefe.final.2', () => {
            m.estado = 'ultima';
            this.esc = { tipo: 'fin', t: 0, flag: {} };
          });
        }
        break;
      }
      case 'fin': {
        una('musica', () => m.snd.musica('rescate'));
        if (e.t > 0.9) m.fadeObjetivo = 1;
        if (e.t > 2.2 && !f.fin) {
          f.fin = true;
          m.prog.hechos.add('ultima');
          m.pelea = 2;
          m.alTerminar();
        }
        break;
      }
    }
    m.fx.actualizar(0);
  }

  private espumazo() {
    const m = this.m;
    const [cx, cy] = this.punto('cuerpo', 1250, 250);
    m.fx.espuma(cx, cy, 24, 0, 380);
    m.fx.gotas(cx, cy, 10, 0, 400, '#f0a21e');
    m.fx.polvo(this.x, this.suelo, 10, 90);
    m.fx.onda(this.x, this.suelo - 100, 18, '#fff1c8', 22, 0.6);
  }

  private prepararAmigos(a: ArteJefe) {
    if (this.amigos.length) return;
    const m = this.m;
    const g = m.arte.guille;
    const j = m.j;
    const s = this.x >= j.x ? 1 : -1;
    const base = Math.max(this.xl + 60, Math.min(this.xr - 60, j.x));
    const pos = [s * 62, s * 118, s * 176].map((o) => Math.max(this.xl + 40, Math.min(this.xr - 40, base + o)));
    this.amigos = [
      { quien: 'chuchi', x: pos[0], salida: 0, cuadros: a.chuchi },
      { quien: 'pablo', x: pos[1], salida: 0, cuadros: a.pablo },
      { quien: 'guille', x: pos[2], salida: 0, cuadros: { idle: g.idle, celebra: g.celebra } },
    ];
    j.cara = s as 1 | -1;
  }

  // ---------------------------------------------------------------- drawing

  /** The boss, its barrel, the hazards and (in the end) the friends: in world coordinates, behind Fran. */
  dibujar(ctx: CanvasRenderingContext2D, t: number) {
    const a = this.arte;
    if (!a) return;
    const m = this.m;
    this.dibujarBarril(ctx, a, t);
    if (this.escala > 0.02) this.dibujarJefe(ctx, t);
    this.dibujarJarra(ctx);
    // Waves of foam.
    for (const o of this.olas) {
      const k = o.h / 100;
      const w = 140 * k * 0.8;
      const h = 120 * k;
      ctx.save();
      ctx.translate(o.x, this.suelo + 2);
      ctx.scale(Math.sign(o.vx), 1);
      ctx.drawImage(a.ola, -w * 0.45, -h + 8, w, h);
      ctx.restore();
    }
    // Rain of glasses: the ring on the floor, then the glass.
    for (const v of this.vasos) {
      if (!v.cae) {
        const k = v.t / 0.85;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,140,90,${0.35 + 0.5 * Math.abs(Math.sin(t * 22))})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(v.x, this.suelo - 2, 30 - 14 * k, 7 - 3 * k, 0, 0, 6.3);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.drawImage(a.vaso, v.x - 15, v.y - 6, 30, 41);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25;
        ctx.drawImage(m.arte.brillos.ambar, v.x - 26, v.y - 20, 52, 52);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // Bottle caps.
    for (const c of this.chapas) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.drawImage(a.chapa, -11, -11, 22, 22);
      ctx.restore();
    }
    this.dibujarAmigos(ctx, t);
  }

  private dibujarPiezas(ctx: CanvasRenderingContext2D, blanco: boolean, alfa: number) {
    const a = this.arte!;
    const fuente = (n: Pieza) => (blanco ? a.blanco[n] : a.img[n]);
    const pon = (M: DOMMatrix, n: Pieza) => {
      ctx.save();
      ctx.transform(M.a, M.b, M.c, M.d, M.e, M.f);
      if (alfa !== 1) ctx.globalAlpha = alfa;
      ctx.drawImage(fuente(n), P[n].x, P[n].y, P[n].w, P[n].h);
      ctx.restore();
    };
    pon(this.matriz('cola'), 'cola');
    pon(this.matriz('pata1'), 'pata1');
    pon(this.matriz('cuerpo'), 'cuerpo');
    if (!blanco) this.dibujarCerveza(ctx, a);
    // The near leg: its lower part, stepping (a little about the knee).
    pon(this.matriz('cuerpo').multiply(new DOMMatrix().translate(PIV.pata2[0], PIV.pata2[1]).rotate((this.pata2Rot() * 180) / Math.PI).translate(-PIV.pata2[0], -PIV.pata2[1])), 'pata2');
    pon(this.matriz('mandibula'), 'mandibula');
    pon(this.matriz('cabeza'), 'cabeza');
  }

  /** The beer inside the mug: the empty glass covers it from the rim down to the level, and a swaying surface sits on the level. */
  private dibujarCerveza(ctx: CanvasRenderingContext2D, a: ArteJefe) {
    const k = Math.max(0, Math.min(1, this.hpVista / HP_MAX));
    const M = this.matriz('cuerpo');
    ctx.save();
    ctx.transform(M.a, M.b, M.c, M.d, M.e, M.f);
    if (k < 0.995) {
      const lev = CERV.lleno + (1 - k) * (CERV.vacio - CERV.lleno);
      const alto = lev - P.vacio.y;
      const im = a.img.vacio;
      ctx.drawImage(im, 0, 0, im.naturalWidth, (alto / P.vacio.h) * im.naturalHeight, P.vacio.x, P.vacio.y, P.vacio.w, alto);
      // The surface: a wavy cap of amber with a line of foam, tilted a little by the boss's own movement.
      const x0 = CERV.x0;
      const x1 = lev < CERV.pasoBajo ? CERV.x1 : CERV.x1Bajo;
      const tilt = this.incl * 0.8 + Math.sin(this.anim * 3.2) * 0.04 + (this.estado === 'embiste' ? Math.sin(this.anim * 11) * 0.12 : 0);
      const N = 9;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const x = x0 + ((x1 - x0) * i) / N;
        const y = lev + Math.sin(this.anim * 3.4 + i * 0.9) * 9 + tilt * (x - (x0 + x1) / 2) * 1.1;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(x1, lev + 40);
      ctx.lineTo(x0, lev + 40);
      ctx.closePath();
      ctx.fillStyle = 'rgba(232,150,34,0.96)';
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#fff3d0';
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const x = x0 + ((x1 - x0) * i) / N;
        const y = lev + Math.sin(this.anim * 3.4 + i * 0.9) * 9 + tilt * (x - (x0 + x1) / 2) * 1.1;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if (this.grietas > 0.02) {
      ctx.globalAlpha = Math.min(1, this.grietas);
      ctx.drawImage(a.grietas, P.vacio.x, P.vacio.y, P.vacio.w, P.vacio.h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private dibujarJefe(ctx: CanvasRenderingContext2D, t: number) {
    const m = this.m;
    // Shadow on the counter.
    ctx.fillStyle = 'rgba(8,0,24,0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x + this.dir * -25, this.suelo + 3, 140 * this.escala, 15 * this.escala, 0, 0, 6.3);
    ctx.fill();
    // The red glow of a telegraph, behind it.
    if (this.aviso > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.7, this.aviso * 0.7);
      const r = 190;
      ctx.drawImage(m.arte.brillos.rojo, this.x - r + this.dir * 40, this.suelo - 120 - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // A warm light from the beer when it is nearly empty or when it drinks.
    if (this.estado === 'bebiendo') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t * 9);
      ctx.drawImage(m.arte.brillos.ambar, this.x - 170, this.suelo - 260, 340, 340);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    this.dibujarPiezas(ctx, false, 1);
    if (this.hurtT > 0) this.dibujarPiezas(ctx, true, Math.min(0.85, this.hurtT * 7));
    // The weak spot, glowing when the monster rests with its head low or when it is dizzy.
    if (this.cabezaDebil && this.estado !== 'dormido') {
      const c = this.cabezaCaja();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32 + 0.18 * Math.sin(t * 10);
      ctx.drawImage(m.arte.brillos.oro, c.x0 - 20, c.y0 - 20, c.x1 - c.x0 + 40, c.y1 - c.y0 + 40);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** The tap on the floor: the keg the boss plugs into, with the pipe from the wall and the stream of beer. */
  private dibujarBarril(ctx: CanvasRenderingContext2D, a: ArteJefe, t: number) {
    const b = this.barril;
    if (!b) return;
    const pared = b.lado === 'der' ? this.xr : this.xl;
    // The pipe from the wall (brass).
    const x0 = Math.min(pared, b.x);
    const w = Math.abs(pared - b.x);
    const g = ctx.createLinearGradient(0, this.suelo - 36, 0, this.suelo - 18);
    g.addColorStop(0, '#fff0a8');
    g.addColorStop(0.5, '#c8921f');
    g.addColorStop(1, '#6a4410');
    ctx.fillStyle = g;
    ctx.fillRect(x0, this.suelo - 36, w, 16);
    ctx.fillStyle = '#7a4e12';
    for (let x = x0 + 8; x < x0 + w; x += 40) ctx.fillRect(x, this.suelo - 39, 6, 22);
    const sacude = b.golpeT > 0 ? Math.sin(t * 90) * 2.5 : 0;
    const k = 1.15;
    ctx.drawImage(a.barril, b.x - 60 * k * 0.5 + sacude, this.suelo - 118 * k * 0.5 + 2, 120 * k * 0.5, 120 * k * 0.5);
    // The stream of beer between the tap and the tail.
    if (this.estado === 'bebiendo') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,190,70,0.9)';
      ctx.fillRect(b.x - 3, this.suelo - 84, 6, 22);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(this.m.arte.brillos.ambar, b.x - 40, this.suelo - 110, 80, 80);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // How hurt it is: a red dot per hit left, over the keg.
    ctx.fillStyle = '#fff2d8';
    for (let i = 0; i < b.hp; i++) ctx.fillRect(b.x - 18 + i * 7, this.suelo - 76, 5, 5);
  }

  /** The ordinary mug that is left on the floor while the monster shrinks (and in Guille's hands at the end). */
  private dibujarJarra(ctx: CanvasRenderingContext2D) {
    if (this.tJarra <= 0) return;
    const m = this.m;
    const s = m.arte.props.jarraLlena;
    const e = this.esc;
    let x = this.x;
    let y = this.suelo;
    let k = 0.5 + 1.4 * this.tJarra;
    if (e && (e.tipo === 'guille' || e.tipo === 'fin' || (e.tipo === 'dialogo' && e.flag?.agarra))) {
      const g = this.amigos.find((q) => q.quien === 'guille');
      if (g) {
        const kk = suave((e.tipo === 'guille' ? e.t - 0.9 : 9) / 0.6);
        const gx = g.x + (this.m.j.cara > 0 ? -1 : 1) * 14;
        const gy = this.suelo - 44;
        x = this.x + (gx - this.x) * kk;
        y = this.suelo + (gy - this.suelo) * kk - Math.sin(Math.PI * Math.min(1, kk)) * 60;
      }
    }
    ctx.drawImage(s.c, x + s.x * k, y + s.y * k, s.w * k, s.h * k);
  }

  private dibujarAmigos(ctx: CanvasRenderingContext2D, t: number) {
    const e = this.esc;
    if (!this.amigos.length || !e) return;
    if (!(e.tipo === 'salen' || e.tipo === 'guille' || e.tipo === 'fin' || e.tipo === 'dialogo')) return;
    const m = this.m;
    const [jx, jy] = m.posJarra();
    const tt = e.tipo === 'salen' ? e.t : 9;
    this.amigos.forEach((a, i) => {
      const k = suave((tt - 0.2 - i * 0.4) / 0.9);
      if (k <= 0) return;
      const fr = a.cuadros.celebra[Math.floor(t * 8 + i) % a.cuadros.celebra.length] ?? a.cuadros.idle[0];
      const idle = a.cuadros.idle[Math.floor(t * 8 + i) % a.cuadros.idle.length];
      const f = k < 1 ? fr : idle;
      const gx = jx + (a.x - jx) * k;
      const gy = this.suelo + (jy - this.suelo) * (1 - k) - Math.sin(Math.PI * k) * 90;
      let esc = ESCALA.guille * (0.15 + 0.85 * k);
      let y = gy;
      let x = gx;
      // Guille runs to the mug while the others cheer.
      if (a.quien === 'guille' && e.tipo === 'guille') {
        const q = suave(e.t / 0.9);
        x = a.x + (this.x - a.x) * q * 0.85;
        y = this.suelo - Math.abs(Math.sin(e.t * 14)) * 5 * (1 - q);
      }
      if (k >= 1) this.sombraAmigo(ctx, x, this.suelo);
      const flip = (a.quien === 'guille' && e.tipo === 'guille' ? this.x < a.x : this.x < a.x) ? true : false;
      const s = esc / f.ppu;
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(f.c, -f.ax * s, -f.ay * s, f.c.width * s, f.c.height * s);
      ctx.restore();
      esc = 0;
    });
  }

  private sombraAmigo(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = 'rgba(8,0,24,0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 22, 4, 0, 0, 6.3);
    ctx.fill();
  }

  // ---------------------------------------------------------------- the boss's bar of life (the interface layer)

  hud(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    if (this.barra <= 0 || this.estado === 'muerto' || (this.esc && (this.esc.tipo === 'encoge' || this.esc.tipo === 'salen' || this.esc.tipo === 'guille' || this.esc.tipo === 'fin'))) return;
    const w = Math.min(520, vw - 420);
    const x = (vw - w) / 2;
    const y = vh - 46;
    ctx.globalAlpha = Math.min(1, this.barra);
    ctx.fillStyle = 'rgba(16,8,38,0.78)';
    ctx.beginPath();
    ctx.roundRect(x - 14, y - 32, w + 28, 58, 12);
    ctx.fill();
    ctx.strokeStyle = '#ff7a6a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "700 18px 'Graduate', 'Alegreya Sans', serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,0,30,0.85)';
    ctx.fillText(texto('jefe.ultima'), vw / 2 + 2, y - 8);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(texto('jefe.ultima'), vw / 2, y - 10);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, 12);
    const k = Math.max(0, this.hpVista / HP_MAX);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#e8961e');
    g.addColorStop(1, '#ffe08a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * k, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x, y, w * k, 3);
    // The phases: marks at a third and two thirds.
    ctx.fillStyle = 'rgba(255,240,200,0.85)';
    ctx.fillRect(x + (w * HP_F3) / HP_MAX - 1, y - 2, 2, 16);
    ctx.fillRect(x + (w * HP_F2) / HP_MAX - 1, y - 2, 2, 16);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}
