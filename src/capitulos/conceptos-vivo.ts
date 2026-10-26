// El mundo de los conceptos, en vivo (capítulo 2, tramo final; docs/CAPITULO2.md): un vacío de colores pintado como las referencias
// (degradado profundo con grano y pincelada, nubes de luz que pasean, formas geométricas flotando en tres capas con paralaje) donde
// los cuatro amigos y Vero son figuras de bloques con sus piezas sueltas, y lo que flota, gira, late y se deforma son los conceptos.
//
// Docs/ESTILO.md, T5: el fondo, cada pieza de cada figura, cada concepto y cada forma se pasan a bitmap UNA vez (el SVG viene de
// src/arte/conceptos*.mjs y se le da la textura de pintura en el lienzo; las palabras de src/textos/capitulo2.md se escriben encima
// con la letra de la página) y un fotograma solo dibuja esos bitmaps con una transformación barata: flotar, girar, latir, deformarse
// con la escala, ondear en tiras. Nada de SVG dibujado por fotograma y nada de filtros. Se pinta en las capas vivas del motor
// (`Motor.extra`): `fondo` (detrás de todo) y `frente` (el marco dorado de Vero, que lo envuelve).
//
// Los toques son las zonas de la escena: aquí se mueven con cada pieza para que acompañen lo que se ve.
import type { Aventura } from '../juego/aventura';
import { texto } from '../juego/textos';
import * as A from '../arte/conceptos.mjs';
import { SITIOS } from '../arte/escenas/conceptos.mjs';
import { dibujarFigura, hornearDibujo, hornearFigura, resplandor, soltarFigura, type FiguraBmp, type FiguraDef } from './conceptos-rig';
import { hornearFondo, hornearNubes } from './conceptos-fondo';

interface Dibujo {
  x: number;
  y: number;
  w: number;
  h: number;
  svg: string;
}

/** Un bitmap horneado: `c` cubre el cuadro (x, y, w, h) de su dibujo, más el margen de la etiqueta. */
interface Bmp {
  c: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Etiqueta {
  clave: string;
  color: string;
  tam: number;
  /** Margen que se añade abajo para la palabra (unidades del dibujo). */
  abajo: number;
}

/** Las piezas que se tocan (id = id de zona) y de qué están hechas. */
interface Pieza {
  id: string;
  /** Escala del dibujo a unidades de escena. */
  s: number;
  dibujo: () => Dibujo;
  etiqueta?: Etiqueta;
  /** Píxeles de bitmap por unidad del dibujo y por píxel de pantalla (1,2 de serie; menos para las piezas enormes y lisas). */
  res?: number;
  /** El color de su luz (un resplandor que late detrás). */
  luz?: string;
}

const PIEZAS: Pieza[] = [
  { id: 'reloj', s: 1.4, dibujo: A.relojDerretido, luz: '#ffd9a0', etiqueta: { clave: 'c2.concepto.reloj', color: '#fff1d6', tam: 21, abajo: 28 } },
  { id: 'no', s: 1.4, dibujo: A.noRebota, luz: '#ff5a4a' },
  { id: 'manana', s: 1.12, dibujo: A.puertaManana, luz: '#ffcf6a', etiqueta: { clave: 'c2.concepto.manana', color: '#ffe9a8', tam: 24, abajo: 30 } },
  { id: 'penultima', s: 1.05, dibujo: A.jarraPenultima, luz: '#ffb35a', etiqueta: { clave: 'c2.concepto.penultima', color: '#ffe9a8', tam: 19, abajo: 28 } },
  { id: 'ultima', s: 1.25, dibujo: A.jarraUltima, luz: '#ffffff', etiqueta: { clave: 'c2.concepto.ultima', color: '#ffffff', tam: 22, abajo: 30 } },
  // La jarra de Guille («Este es mío»): la de la penúltima, pero sin palabra debajo.
  { id: 'guille.jarra', s: 1.0, dibujo: A.jarraPenultima, luz: '#ffd27a' },
  // El userito mitológico: dibujado a escala de escena (2 300 × 1 080), lisa y enorme, con menos resolución que el resto.
  { id: 'dino', s: 1, dibujo: A.dinosaurio, res: 0.62 },
];

// ---------------------------------------------------------------- las figuras: dónde están

interface Sitio {
  /** Respecto al centro de la pantalla (unidades de escena) y dónde pisa (y de la peana). */
  dx: number;
  y: number;
  /** Escala de la figura. */
  s: number;
  /** Profundidad para el vaivén de la cámara (poco: están en el suelo). */
  p: number;
}

/** Las figuras, de izquierda a derecha en el suelo; Fran está en el hueco del medio, a la vista, casi como los demás. */
const FIG: Record<string, Sitio> = {
  chuchi: { dx: -700, y: 900, s: 0.9, p: 0.3 },
  pablo: { dx: -350, y: 905, s: 0.88, p: 0.3 },
  guille: { dx: 340, y: 905, s: 0.86, p: 0.3 },
  vero: { dx: 690, y: 900, s: 0.84, p: 0.3 },
  fran: { dx: 0, y: 905, s: 0.86, p: 0.3 },
};
/** Orden de dibujo de las figuras (Fran el primero: los vecinos le pasan un poco por delante). */
const ORDEN = ['fran', 'chuchi', 'pablo', 'vero', 'guille'];
/** Cuánto se encoge el reparto si la pantalla es estrecha, para que quepa todo (1 en los móviles alargados). */
const compacta = (vw: number) => Math.max(0.74, Math.min(1, (vw / 2 - 140) / 1000));

/** Una forma de fondo: dónde está respecto al centro de la pantalla, a qué profundidad y cómo se mueve. */
interface Flota {
  tipo: number;
  color: number;
  /** Capa de profundidad (0 = lejana, grande y borrosa; 2 = cercana, pequeña y nítida). */
  capa: number;
  /** Posición inicial (fracción del ancho) y deriva (unidades por segundo). */
  x0: number;
  vx: number;
  y: number;
  /** Profundidad: lo lejano se mueve poco con el vaivén de la cámara, lo cercano mucho. */
  p: number;
  tam: number;
  rot: number;
  vrot: number;
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  fase: number;
}

const COLORES_FONDO = ['#ff3fa4', '#ffcf3a', '#2fe0d0', '#ff7a3a', '#7a5cff', '#a8ff4a', '#ff5a5a', '#46b8ff', '#d49bff', '#ffa8d8'];
const COLORES_MOTA = ['#ffe9b0', '#ffb8f0', '#b8f0ff', '#fff6d8'];

/** Azar determinista: el mundo es el mismo en cada partida. */
function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const FLOTAS: Flota[] = (() => {
  const r = azar(77);
  const capas = [
    // capa, cuántas, profundidad (de, a), tamaño (de, a), deriva
    { capa: 0, n: 22, p: [0.15, 0.4], tam: [1.5, 2.7], vx: 5 },
    { capa: 1, n: 24, p: [0.55, 0.95], tam: [0.8, 1.4], vx: 11 },
    { capa: 2, n: 16, p: [1.2, 1.7], tam: [0.5, 0.95], vx: 20 },
  ];
  const sal: Flota[] = [];
  for (const c of capas) {
    for (let i = 0; i < c.n; i++) {
      sal.push({
        tipo: Math.floor(r() * A.FORMAS.length),
        color: Math.floor(r() * COLORES_FONDO.length),
        capa: c.capa,
        x0: r(),
        vx: (r() < 0.5 ? -1 : 1) * c.vx * (0.5 + r()),
        y: 40 + r() * 1000,
        p: c.p[0] + r() * (c.p[1] - c.p[0]),
        tam: c.tam[0] + r() * (c.tam[1] - c.tam[0]),
        rot: r() * Math.PI * 2,
        vrot: (r() - 0.5) * (c.capa === 0 ? 0.28 : c.capa === 1 ? 0.55 : 0.9),
        ax: 14 + r() * 40,
        ay: 12 + r() * 34,
        fx: 0.1 + r() * 0.3,
        fy: 0.08 + r() * 0.26,
        fase: r() * 20,
      });
    }
  }
  return sal;
})();

interface Mota {
  x0: number;
  y0: number;
  vy: number;
  tam: number;
  fase: number;
  color: number;
  p: number;
}

const MOTAS: Mota[] = (() => {
  const r = azar(305);
  return Array.from({ length: 46 }, () => ({ x0: r(), y0: r() * 1080, vy: -(6 + r() * 20), tam: 0.5 + r() * 1.1, fase: r() * 20, color: Math.floor(r() * COLORES_MOTA.length), p: 0.3 + r() * 1.2 }));
})();

interface Horneado {
  clave: string;
  figuras: Map<string, FiguraBmp>;
  piezas: Map<string, Bmp>;
  luces: Map<string, HTMLCanvasElement>;
  formas: Map<string, Bmp>;
  motas: Bmp[];
  /** El fondo pintado, ya a la resolución del cielo (CIELO × la de pantalla). */
  fondo: HTMLCanvasElement;
  nubes: { c: HTMLCanvasElement; lado: number }[];
  /** El cielo: fondo + nubes + formas lejanas + motas, pintado a baja resolución y pocos fps; por fotograma solo se copia entero. */
  cielo: HTMLCanvasElement;
  /** Resplandores de luz lineal (LA ÚLTIMA y Guille), para no crear degradados por fotograma. */
  halos: { ultima: HTMLCanvasElement; guille: HTMLCanvasElement };
  marcoArriba: Bmp;
  marcoAbajo: Bmp;
  dinoPalabra: HTMLCanvasElement;
  unaMas: Bmp;
}

let listo: Horneado | null = null;
let horneando: Promise<void> | null = null;

/** Cuándo se tocó cada pieza (segundos del motor), para que se encoja y rebote. */
const golpes = new Map<string, number>();
const estado = {
  /** Desde cuándo se ve la última (segundos), o 0. */
  ultima: 0,
  /** Desde cuándo sube el dinosaurio y desde cuándo da el paso Guille. */
  dino: 0,
  paso: 0,
  /** Tiempo en que empezó el caos. */
  caos: 0,
};

/** Cuándo se gastó cada argumento (segundos del motor): el concepto se vuelve jarra un momento y queda con «UNA MÁS» pegado. */
const gastados = new Map<string, number>();

/** Cuándo se pintó el cielo por última vez (segundos del motor). */
let cieloT = -1;

const ESC_PIEZA = Object.fromEntries(PIEZAS.map((p) => [p.id, p.s])) as Record<string, number>;
const LUZ_PIEZA = Object.fromEntries(PIEZAS.map((p) => [p.id, p.luz])) as Record<string, string | undefined>;

/**
 * El cielo (fondo pintado, nubes de luz, formas lejanas y motas) es lo más caro del mundo: nubes enormes con mezcla aditiva, a
 * pantalla completa, y decenas de formas. Se pinta aparte, a esta fracción de la resolución y a pocos fotogramas por segundo
 * (todo ahí es borroso y lento), y cada fotograma solo copia ese lienzo (una imagen opaca, sin mezclas).
 */
const CIELO = 0.6;
const CIELO_FPS = 15;
const CIELO_FPS_CAOS = 30;

/** Un resplandor redondo de caída lineal (el mismo degradado que antes se creaba en cada fotograma). */
function halo(rgb: string, a: number, lado: number) {
  const c = lienzo(lado, lado);
  const x = c.getContext('2d')!;
  const r = c.width / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

const FUENTE = "'Graduate', 'Alegreya Sans', Georgia, serif";

/** Los «???» del dinosaurio (unidades de escena): el cuadro, el cuerpo de letra y dónde están sobre su cabeza (según su dibujo). */
const DINO_PALABRA = { w: 460, h: 190, tam: 150, x: -560, y: 285 };
/** Lo que tarda en levantarse el dinosaurio (segundos). */
const DINO_SUBE = 3.6;
/** Adónde se aparta el concepto que taparía su cabeza (bajo su barbilla, entre su cuello y el centro). */
const HUYEN = { reloj: { dx: -300, y: 255 } };

function lienzo(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

const cede = () => new Promise<void>((r) => setTimeout(r, 0));

/** Hornea un dibujo con la resolución `res` (píxeles por unidad del dibujo) y, si hay, su palabra debajo. */
async function hornear(d: Dibujo, res: number, et?: Etiqueta): Promise<Bmp> {
  const abajo = et?.abajo ?? 0;
  // La palabra puede ser más ancha que el dibujo: el margen a los lados se calcula con ella.
  let texto0 = '';
  let padX = 0;
  if (et) {
    texto0 = texto(et.clave);
    const medida = lienzo(8, 8).getContext('2d')!;
    medida.font = `400 ${et.tam}px ${FUENTE}`;
    padX = Math.max(0, (medida.measureText(texto0).width + 14 - d.w) / 2);
  }
  const W = d.w + padX * 2;
  const Hh = d.h + abajo;
  const arte = await hornearDibujo(d, res);
  if (!et && padX === 0) return { c: arte, x: d.x, y: d.y, w: d.w, h: d.h };
  const c = lienzo(W * res, Hh * res);
  const x = c.getContext('2d')!;
  x.drawImage(arte, padX * res, 0, d.w * res, d.h * res);
  arte.width = arte.height = 0;
  if (et) {
    x.save();
    x.scale(res, res);
    x.font = `400 ${et.tam}px ${FUENTE}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineJoin = 'round';
    x.lineWidth = et.tam * 0.28;
    x.strokeStyle = 'rgba(20,8,40,0.92)';
    x.strokeText(texto0, W / 2, d.h + abajo / 2 + 1);
    x.fillStyle = et.color;
    x.fillText(texto0, W / 2, d.h + abajo / 2 + 1);
    x.restore();
  }
  return { c, x: d.x - padX, y: d.y, w: W, h: Hh };
}

/** La palabra «UNA MÁS» que lleva Fran debajo (centrada en su origen). */
function hornearUnaMas(res: number): Bmp {
  const tam = 26;
  const t0 = texto('c2.concepto.unamas');
  const m = lienzo(8, 8).getContext('2d')!;
  m.font = `400 ${tam}px ${FUENTE}`;
  const w = m.measureText(t0).width + 20;
  const h = tam + 16;
  const c = lienzo(w * res, h * res);
  const x = c.getContext('2d')!;
  x.scale(res, res);
  x.font = `400 ${tam}px ${FUENTE}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  x.lineWidth = tam * 0.3;
  x.strokeStyle = 'rgba(8,36,40,0.92)';
  x.strokeText(t0, w / 2, h / 2 + 1);
  x.fillStyle = '#e4fffb';
  x.fillText(t0, w / 2, h / 2 + 1);
  return { c, x: -w / 2, y: -h / 2, w, h };
}

/** Hornea todo el mundo (una vez; otra si cambia la resolución de la pantalla), por tandas para no dar un parón. */
export function prepararConceptos(g: Aventura): Promise<void> {
  const px = Math.max(0.3, g.motor.px);
  const vw = Math.round(g.motor.vw);
  const clave = `${px.toFixed(1)}@${vw}`;
  if (listo?.clave === clave) return Promise.resolve();
  if (horneando) return horneando;
  horneando = (async () => {
    // El fondo pintado y las nubes.
    const cp = px * CIELO;
    const fondo = hornearFondo(vw, cp);
    const nubes = hornearNubes(cp);
    const cielo = lienzo(vw * cp, 1080 * cp);
    const halos = { ultima: halo('255,246,224', 0.5, 128), guille: halo('255,214,120', 0.55, 128) };
    await cede();
    // Las figuras, una a una (cada una por tandas de piezas).
    const figuras = new Map<string, FiguraBmp>();
    for (const id of ORDEN) {
      figuras.set(id, await hornearFigura(A.figura(id) as FiguraDef, px * FIG[id].s * (id === 'guille' ? 1.55 : 1.2)));
      await cede();
    }
    // Los conceptos.
    const piezas = new Map<string, Bmp>();
    const luces = new Map<string, HTMLCanvasElement>();
    await Promise.all(
      PIEZAS.map(async (p) => {
        piezas.set(p.id, await hornear(p.dibujo(), p.s * px * (p.res ?? 1.2), p.etiqueta));
        if (p.luz && !luces.has(p.luz)) luces.set(p.luz, resplandor(p.luz, 150 * px, 0.8));
      }),
    );
    await cede();
    // Las formas de fondo: una por tipo, color y capa que se use (las lejanas, a menos resolución: salen borrosas).
    const formas = new Map<string, Bmp>();
    const usadas = new Set(FLOTAS.map((f) => `${f.tipo}:${f.color}:${f.capa}`));
    const lote = [...usadas];
    for (let i = 0; i < lote.length; i += 14) {
      await Promise.all(
        lote.slice(i, i + 14).map(async (k) => {
          const [t, col, capa] = k.split(':').map(Number);
          const res = px * (capa === 0 ? 0.55 : capa === 1 ? 1.1 : 1.5);
          const d = A.forma(A.FORMAS[t], COLORES_FONDO[col]);
          formas.set(k, { c: await hornearDibujo(d, res, capa === 0 ? 0.7 : 1), x: d.x, y: d.y, w: d.w, h: d.h });
        }),
      );
      await cede();
    }
    const motas = await Promise.all(
      COLORES_MOTA.map(async (c) => {
        const d = A.mota(c);
        return { c: await hornearDibujo(d, px * 0.8, 0), x: d.x, y: d.y, w: d.w, h: d.h } as Bmp;
      }),
    );
    // El marco dorado de Vero (arriba una cortina de seda; abajo, una ola).
    const ancho = Math.ceil(vw) + 160;
    const [aArriba, aAbajo] = [A.marcoSuperior(ancho), A.marcoInferior(ancho)];
    const [cArriba, cAbajo] = await Promise.all([hornearDibujo(aArriba, px * 0.9, 0.4), hornearDibujo(aAbajo, px * 0.7, 0.3)]);
    const marcoArriba = { c: cArriba, x: aArriba.x, y: aArriba.y, w: aArriba.w, h: aArriba.h };
    const marcoAbajo = { c: cAbajo, x: aAbajo.x, y: aAbajo.y, w: aAbajo.w, h: aAbajo.h };
    // Los tres interrogantes del dinosaurio: grandes (440 × 180 unidades), con un halo de luz y un trazo oscuro.
    const dinoPalabra = lienzo(DINO_PALABRA.w * px * 1.2, DINO_PALABRA.h * px * 1.2);
    const x = dinoPalabra.getContext('2d')!;
    x.scale(px * 1.2, px * 1.2);
    x.font = `400 ${DINO_PALABRA.tam}px ${FUENTE}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineJoin = 'round';
    const frase = texto('c2.concepto.dino');
    const cx0 = DINO_PALABRA.w / 2;
    const cy0 = DINO_PALABRA.h / 2 + 4;
    x.strokeStyle = 'rgba(122,76,255,0.35)';
    x.lineWidth = 34;
    x.strokeText(frase, cx0, cy0);
    x.strokeStyle = 'rgba(30,6,70,0.95)';
    x.lineWidth = 20;
    x.strokeText(frase, cx0, cy0);
    x.fillStyle = '#f6e2ff';
    x.fillText(frase, cx0, cy0);
    const unaMas = hornearUnaMas(px * 1.2);
    const viejo = listo;
    listo = { clave, figuras, piezas, luces, formas, motas, fondo, nubes, cielo, halos, marcoArriba, marcoAbajo, dinoPalabra, unaMas };
    if (viejo) soltar(viejo);
  })().finally(() => (horneando = null));
  return horneando;
}

function soltar(h: Horneado) {
  for (const f of h.figuras.values()) soltarFigura(f);
  for (const b of h.piezas.values()) b.c.width = b.c.height = 0;
  for (const c of h.luces.values()) c.width = c.height = 0;
  for (const b of h.formas.values()) b.c.width = b.c.height = 0;
  for (const b of h.motas) b.c.width = b.c.height = 0;
  for (const n of h.nubes) n.c.width = n.c.height = 0;
  h.fondo.width = h.fondo.height = 0;
  h.cielo.width = h.cielo.height = 0;
  h.halos.ultima.width = h.halos.ultima.height = 0;
  h.halos.guille.width = h.halos.guille.height = 0;
  for (const b of [h.marcoArriba, h.marcoAbajo, h.unaMas]) b.c.width = b.c.height = 0;
  h.dinoPalabra.width = h.dinoPalabra.height = 0;
}

/** Suelta los bitmaps al salir del mundo (la memoria de los móviles, docs/ESTILO.md T5.11). */
export function liberarConceptos() {
  if (listo) soltar(listo);
  listo = null;
  golpes.clear();
  gastados.clear();
  cieloT = -1;
  Object.assign(estado, { ultima: 0, dino: 0, paso: 0, caos: 0 });
}

export function conceptosListos() {
  return !!listo;
}

// ---------------------------------------------------------------- la historia les da cuerda

/** Un toque a una pieza: se encoge y rebota. */
export function golpear(g: Aventura, id: string) {
  golpes.set(id, g.motor.t);
}

/** Fran le da la vuelta a un argumento: el concepto se convierte en jarra y queda gastado, con «UNA MÁS» encima. */
export function gastarArgumento(g: Aventura, id: string) {
  gastados.set(id, g.motor.t);
}

/** La última aparece (cuando ya no queda ningún argumento que valga con Fran). */
export function revelarUltima(g: Aventura) {
  estado.ultima = g.motor.t;
}

/** El dinosaurio sube desde abajo. */
export function subirDino(g: Aventura) {
  estado.dino = g.motor.t;
}

/** Guille da un paso al frente con su jarra. */
export function darPasoGuille(g: Aventura) {
  estado.paso = g.motor.t;
}

export function empezarCaos(g: Aventura) {
  estado.caos = g.motor.t;
}

export function ultimaRevelada() {
  return estado.ultima > 0;
}

// ---------------------------------------------------------------- el dibujo de cada fotograma

const suave = (u: number) => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

/** Cómo se encoge y rebota una pieza justo después de tocarla (1 = en reposo). */
function rebote(t: number, id: string) {
  const t0 = golpes.get(id);
  if (t0 === undefined) return { sx: 1, sy: 1, r: 0 };
  const d = t - t0;
  if (d > 1.1) return { sx: 1, sy: 1, r: 0 };
  const k = Math.exp(-d * 4.5) * Math.sin(d * 24);
  return { sx: 1 + 0.22 * k, sy: 1 - 0.22 * k, r: 0.12 * k };
}

export function dibujarConceptos(g: Aventura, ctx: CanvasRenderingContext2D, capa: string, nivel: number) {
  if (capa !== 'fondo' && capa !== 'frente') return;
  const L = listo;
  if (!L) {
    void prepararConceptos(g).catch((e) => console.warn('[conceptos]', e));
    return;
  }
  const m = g.motor;
  const px = m.px;
  const vw = m.vw;
  const caos = nivel >= 8 ? 1 : 0;
  // El tiempo corre más deprisa según se pone la noche.
  const t = m.t * (1 + 1.6 * caos);
  const real = m.t;
  const cx = vw / 2;
  const kc = compacta(vw);
  // El vaivén de la cámara: mueve cada capa según su profundidad (el paralaje).
  const vaiven = (p: number) => Math.sin(real * 0.23 * (1 + caos * 2)) * 70 * p;
  const vaivenY = (p: number) => Math.cos(real * 0.17 * (1 + caos * 2)) * 26 * p;
  const base = () => ctx.setTransform(px, 0, 0, px, 0, 0);
  /** Lo que se apagan las piezas que no son la protagonista del momento (Guille, al dar el paso). */
  let alfa = 1;
  const pon = (b: Bmp, x: number, y: number, s = 1, rot = 0, sx = 1, sy = 1, a = 1) => {
    // Sin save/restore: se fija la transformación y la opacidad enteras (cada llamada vuelve a ponerlas).
    ctx.globalAlpha = a * alfa;
    const kx = px * s * sx;
    const ky = px * s * sy;
    if (rot) {
      const c = Math.cos(rot);
      const sn = Math.sin(rot);
      ctx.setTransform(c * kx, sn * kx, -sn * ky, c * ky, px * x, px * y);
    } else ctx.setTransform(kx, 0, 0, ky, px * x, px * y);
    ctx.drawImage(b.c, b.x, b.y, b.w, b.h);
  };
  // Anclas de cada pieza: el bitmap está ya dimensionado en unidades de escena multiplicadas por `s`; aquí se
  // pinta con su escala de dibujo.
  const S = ESC_PIEZA;
  const bm = (id: string) => L.piezas.get(id)!;
  const zonas = g.S?.zonas;
  /** Pone la zona de toque donde está la pieza en pantalla. */
  const zona = (id: string, sx: number, sy: number, ancho = SITIOS[id as keyof typeof SITIOS].w, alto = SITIOS[id as keyof typeof SITIOS].h) => {
    const z = zonas?.[id];
    if (!z) return;
    z.u = sx - m.off(1);
    z.w = ancho;
    z.top = sy - alto / 2;
    z.bottom = sy + alto / 2;
  };
  /** La luz de un concepto: un resplandor de su color que late detrás de él. */
  const luz = (id: string, x: number, y: number, k = 1, fase = 0) => {
    const col = LUZ_PIEZA[id];
    const c = col ? L.luces.get(col) : null;
    if (!c) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.2 + 0.1 * Math.sin(t * 1.7 + fase)) * k * alfa * gasto(id).a;
    const r = 150 * S[id] * (1 + 0.06 * Math.sin(t * 1.7 + fase));
    ctx.setTransform(px, 0, 0, px, 0, 0);
    ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  };

  /** Cuánto lleva gastado un argumento: `a` es lo que se apaga el concepto (1 = intacto) y `d` los segundos desde que Fran lo giró. */
  const gasto = (id: string) => {
    const t0 = gastados.get(id);
    const d = t0 !== undefined ? real - t0 : g.flag(`c2.con.${id}`) ? 99 : -1;
    return { d, a: d < 0 ? 1 : 1 - 0.58 * suave(d / 0.9) };
  };
  /** Un concepto: si Fran ya lo ha girado, se vuelve jarra un momento y queda atenuado con «UNA MÁS» pegado encima. */
  const cpt = (id: string, x: number, y: number, esc: number, rot: number, sx: number, sy: number) => {
    const { d, a } = gasto(id);
    const antes = alfa;
    alfa = antes * a;
    pon(bm(id), x, y, esc, rot, sx, sy);
    if (d >= 0) {
      // La jarra: aparece y se apaga mientras el concepto se desvanece.
      const j = d < 1.3 ? Math.sin((Math.PI * d) / 1.3) : 0;
      if (j > 0.01) {
        alfa = antes * j;
        pon(bm('guille.jarra'), x, y, esc * (0.55 + 0.45 * j), -0.1 * (1 - j), 1, 1);
      }
      // La etiqueta se pega con un golpecito y se queda.
      const e = suave((d - 0.45) / 0.35);
      if (e > 0) {
        alfa = antes * Math.min(1, e * 1.4) * 0.95;
        const pega = 1 + (1 - e) * 0.5;
        pon(L.unaMas, x, y + 14, 0.78 * pega, -0.14);
      }
    }
    alfa = antes;
  };

  if (capa === 'fondo') {
    const dinoU = estado.dino > 0 ? (real - estado.dino) / DINO_SUBE : 0;
    // Con el dinosaurio levantándose, las formas se apagan para que se lea la silueta.
    const apagan = estado.dino > 0 ? 1 - 0.5 * suave(dinoU) : 1;
    const nCapa = caos ? [22, 20, 12] : nivel >= 7 ? [22, 18, 10] : [22, 16, 8];
    const ancho = vw + 360;
    /** Una forma flotante en su sitio de este instante. */
    const flotar = (f: Flota, b: Bmp, a: number) => {
      const x0 = f.x0 * ancho + f.vx * t;
      const x = ((((x0 % ancho) + ancho) % ancho) - 180) + vaiven(f.p) + Math.sin(t * f.fx + f.fase) * f.ax;
      const y = f.y + vaivenY(f.p) + Math.cos(t * f.fy + f.fase * 1.3) * f.ay;
      const latir = 1 + 0.1 * Math.sin(t * 1.4 + f.fase);
      pon(b, x, y, f.tam * latir, f.rot + t * f.vrot, 1, 1, a);
    };

    // ---- El cielo: fondo pintado, nubes de luz que lo recorren, el color que se pone loco en el caos, las formas lejanas
    // (grandes, lentas y translúcidas) y las motas que suben. Se repinta a pocos fotogramas por segundo y a baja resolución
    // (CIELO); aquí solo se copia, una vez, sin mezclas.
    if (cieloT < 0 || real < cieloT || real - cieloT >= 1 / (caos ? CIELO_FPS_CAOS : CIELO_FPS)) {
      cieloT = real;
      const cc = L.cielo.getContext('2d')!;
      const cs = L.cielo.width / vw;
      cc.setTransform(1, 0, 0, 1, 0, 0);
      cc.globalAlpha = 1;
      cc.globalCompositeOperation = 'source-over';
      cc.drawImage(L.fondo, 0, 0, L.cielo.width, L.cielo.height);
      cc.setTransform(cs, 0, 0, cs, 0, 0);
      cc.globalCompositeOperation = 'lighter';
      L.nubes.forEach((n, i) => {
        const w = 0.07 + i * 0.013;
        const nx = cx + Math.sin(real * w + i * 1.9) * vw * 0.42 + Math.cos(real * w * 0.6 + i) * 120;
        const ny = 540 + Math.cos(real * w * 0.8 + i * 2.7) * 360;
        const rad = n.lado * (0.8 + 0.2 * Math.sin(real * 0.2 + i));
        cc.globalAlpha = 0.085 + 0.04 * Math.sin(real * 0.4 + i * 1.3);
        cc.drawImage(n.c, nx - rad, ny - rad, rad * 2, rad * 2);
      });
      if (caos) {
        cc.setTransform(1, 0, 0, 1, 0, 0);
        cc.globalCompositeOperation = 'hard-light';
        cc.globalAlpha = 0.42;
        cc.fillStyle = `hsl(${((real * 140) % 360).toFixed(0)} 90% 50%)`;
        cc.fillRect(0, 0, L.cielo.width, L.cielo.height);
        cc.setTransform(cs, 0, 0, cs, 0, 0);
      }
      cc.globalCompositeOperation = 'source-over';
      // Formas lejanas (capa 0).
      let n0 = 0;
      for (const f of FLOTAS) {
        if (f.capa !== 0) continue;
        if (n0++ >= nCapa[0]) break;
        const b = L.formas.get(`${f.tipo}:${f.color}:0`);
        if (!b) continue;
        const x0 = f.x0 * ancho + f.vx * t;
        const x = ((((x0 % ancho) + ancho) % ancho) - 180) + vaiven(f.p) + Math.sin(t * f.fx + f.fase) * f.ax;
        const y = f.y + vaivenY(f.p) + Math.cos(t * f.fy + f.fase * 1.3) * f.ay;
        const latir = 1 + 0.1 * Math.sin(t * 1.4 + f.fase);
        const k = f.tam * latir;
        const rot = f.rot + t * f.vrot;
        cc.globalAlpha = 0.4 * apagan;
        cc.setTransform(cs * k * Math.cos(rot), cs * k * Math.sin(rot), -cs * k * Math.sin(rot), cs * k * Math.cos(rot), cs * x, cs * y);
        cc.drawImage(b.c, b.x, b.y, b.w, b.h);
      }
      // Motas de luz: suben despacio y titilan.
      cc.setTransform(cs, 0, 0, cs, 0, 0);
      cc.globalCompositeOperation = 'lighter';
      for (const mo of MOTAS) {
        const b = L.motas[mo.color];
        const y = (((mo.y0 + mo.vy * t) % 1100) + 1100) % 1100 - 10;
        const x = mo.x0 * vw + vaiven(mo.p) * 0.5 + Math.sin(t * 0.5 + mo.fase) * 22;
        cc.globalAlpha = (0.4 + 0.5 * Math.abs(Math.sin(t * 1.3 + mo.fase))) * apagan;
        const s2 = mo.tam * (0.9 + 0.2 * Math.sin(t * 2 + mo.fase));
        cc.drawImage(b.c, x - 24 * s2, y - 24 * s2, 48 * s2, 48 * s2);
      }
      cc.globalCompositeOperation = 'source-over';
      cc.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(L.cielo, 0, 0, ctx.canvas.width, ctx.canvas.height);

    // ---- Las formas de las capas media y cercana, con paralaje, por fotograma.
    {
      const cuenta = [0, 0, 0];
      for (const f of FLOTAS) {
        if (f.capa === 0 || cuenta[f.capa]++ >= nCapa[f.capa]) continue;
        const b = L.formas.get(`${f.tipo}:${f.color}:${f.capa}`);
        if (b) flotar(f, b, (f.capa === 1 ? 0.62 : 0.88) * apagan);
      }
    }
    if (estado.dino > 0) {
      const D = bm('dino');
      // Sube deprisa al principio (el empujón) y se frena al llegar.
      const k = 1 - Math.pow(1 - Math.min(1, dinoU), 2.4);
      // Se pasa un poco de su tamaño al llegar y se asienta (un rebote de «he llegado»).
      const asienta = dinoU > 1 ? Math.exp(-(dinoU - 1) * 6) * Math.sin((dinoU - 1) * 14) * 0.025 : 0;
      const esc = 0.4 + 0.6 * k + asienta;
      const hundido = (1 - k) * 380;
      // Tiembla mientras sube, y un poco menos después (el retumbe).
      const tiembla = (1 - Math.min(1, dinoU)) * 16 + Math.max(0, 1 - Math.max(0, dinoU - 1) * 0.6) * 5;
      const ax = Math.sin(real * 61) * tiembla;
      const ay = Math.cos(real * 53) * tiembla * 0.7;
      const respira = 1 + 0.006 * Math.sin(real * 1.4);
      ctx.save();
      ctx.globalAlpha = Math.min(1, dinoU * 2.2);
      base();
      // El ancla es el borde de abajo, en el centro de la pantalla (el dibujo mide lo que la pantalla de alto).
      ctx.translate(cx + ax + vaiven(0.15), 1080 + hundido + ay);
      ctx.scale(esc * respira, esc * respira * (1 + 0.004 * Math.sin(real * 1.4)));
      ctx.drawImage(D.c, D.x, D.y - 1080, D.w, D.h);
      // Los «???» sobre su cabeza: aparecen cuando ya ha subido casi todo, y laten.
      const q = suave((dinoU - 0.55) / 0.35);
      if (q > 0) {
        const pulso = 1 + 0.06 * Math.sin(real * 5);
        ctx.globalAlpha = q * (0.8 + 0.2 * Math.sin(real * 7));
        ctx.translate(DINO_PALABRA.x, DINO_PALABRA.y - 1080 + Math.sin(real * 2.6) * 7);
        ctx.rotate(Math.sin(real * 1.7) * 0.05);
        ctx.scale(pulso, pulso);
        ctx.drawImage(L.dinoPalabra, -DINO_PALABRA.w / 2, -DINO_PALABRA.h / 2, DINO_PALABRA.w, DINO_PALABRA.h);
      }
      ctx.restore();
    }
    // ...y el concepto que le taparía la cabeza y los «???» se aparta asustado; los dos primeros
    // amigos, que están justo debajo, se encogen y se hunden un poco en el suelo.
    const hk = estado.dino > 0 ? suave(dinoU * 1.5) : 0;
    const huye = Object.fromEntries(
      (Object.keys(HUYEN) as (keyof typeof HUYEN)[]).map((id) => [id, { dx: SITIOS[id].dx * kc + (HUYEN[id].dx - SITIOS[id].dx * kc) * hk, y: SITIOS[id].y + (HUYEN[id].y - SITIOS[id].y) * hk }]),
    ) as Record<keyof typeof HUYEN, { dx: number; y: number }>;

    // ---- Los conceptos.
    // Cuando Guille da el paso al frente, todo lo demás se apaga un poco para que se lea él, con su jarra.
    const pasoK = estado.paso > 0 ? suave((real - estado.paso) / 1.3) : 0;
    alfa = 1 - 0.55 * pasoK;
    // El RELOJ derretido: cuelga de su rama y se descuelga un poco más cada vez.
    {
      const x = cx + huye.reloj.dx + vaiven(0.9);
      const y = huye.reloj.y + vaivenY(0.9);
      const r = rebote(real, 'reloj');
      luz('reloj', x, y, 1, 2);
      cpt('reloj', x, y, S.reloj, Math.sin(t * 0.8) * 0.09 + r.r, (1 + 0.04 * Math.sin(t * 1.9)) * r.sx, (1 - 0.06 * Math.sin(t * 1.9)) * r.sy);
      zona('reloj', x, y);
    }
    // El NO: rebota de arriba abajo y se aplasta al caer.
    {
      const fase = Math.abs(Math.sin(t * 2.1));
      const x = cx + SITIOS.no.dx * kc + vaiven(1.0) + Math.sin(t * 0.7) * 30;
      const y = SITIOS.no.y + vaivenY(1.0) - fase * 55;
      const aplasta = fase < 0.18 ? 1 - (0.18 - fase) * 1.4 : 1;
      const r = rebote(real, 'no');
      luz('no', x, y, 1, 3);
      cpt('no', x, y + (1 - aplasta) * 30, S.no, Math.sin(t * 1.3) * 0.12 + r.r, (2 - aplasta) * r.sx, aplasta * r.sy);
      zona('no', x, y);
    }
    // MAÑANA: la puerta intenta abrirse (se estrecha un poco) y nunca se abre.
    {
      const x = cx + SITIOS.manana.dx * kc + vaiven(1.0);
      const y = SITIOS.manana.y + vaivenY(1.0);
      const intento = Math.max(0, Math.sin(t * 1.3 - 0.4));
      const tiembla = intento > 0.9 ? Math.sin(t * 55) * 0.012 : 0;
      const r = rebote(real, 'manana');
      luz('manana', x, y - 40, 1.2, 4);
      cpt('manana', x, y, S.manana, tiembla + r.r * 0.4, (1 - 0.06 * intento * intento) * r.sx, r.sy);
      zona('manana', x, y);
    }
    // LA PENÚLTIMA: late y se rellena sola.
    {
      const x = cx + SITIOS.penultima.dx * kc + vaiven(1.1);
      const y = SITIOS.penultima.y + vaivenY(1.1) + Math.sin(t * 1.4) * 8;
      const r = rebote(real, 'penultima');
      luz('penultima', x, y, 1, 5);
      cpt('penultima', x, y, S.penultima, Math.sin(t * 0.9) * 0.07 + r.r, (1 + 0.05 * Math.sin(t * 3)) * r.sx, (1 - 0.05 * Math.sin(t * 3)) * r.sy);
      zona('penultima', x, y);
    }

    // ---- Las figuras. Hunden y encogen un poco a los de la izquierda cuando sube el dinosaurio, para no tapar su cabeza.
    const dibujarAmigo = (id: string, o: { x?: number; y?: number; s?: number; a?: number; brillo?: number; vida?: number } = {}) => {
      const F = L.figuras.get(id)!;
      const sit = FIG[id];
      const r = rebote(real, id);
      const baja = id === 'chuchi' || id === 'pablo' ? hk : 0;
      const s = (o.s ?? sit.s) * (1 - 0.22 * baja);
      const x = o.x ?? cx + sit.dx * kc + vaiven(sit.p);
      const y = (o.y ?? sit.y) + 70 * baja + vaivenY(sit.p) * 0.5;
      ctx.save();
      base();
      ctx.globalAlpha = alfa;
      dibujarFigura(ctx, F, t + id.length * 3.1, { x, y, s, a: o.a, aura: 0.8, brillo: o.brillo ?? 0.55, vida: (o.vida ?? 1) * (1 + 0.6 * caos), rot: r.r * 0.6, sx: r.sx, sy: r.sy });
      ctx.restore();
      // La zona de toque sigue a su figura (el centro de su cuerpo).
      const alto = F.alto * s;
      zona(id, x, y - alto * 0.5, Math.max(200, F.ancho * s * 0.78), alto * 0.95);
      return { x, y, s, F };
    };
    // FRAN, hecho «UNA MÁS»: está a la vista desde el principio, entre sus amigos, con la jarra que nunca se vacía (la cerveza
    // vuelve a caer en ella) y su «UNA MÁS» debajo. Se mece despacio, tan tranquilo.
    {
      const sit = FIG.fran;
      const x = cx + sit.dx * kc + vaiven(sit.p) + 14 * Math.sin(t * 0.5);
      const y = sit.y + 6 * Math.sin(t * 0.9 + 1);
      const f = dibujarAmigo('fran', { x, y, brillo: 0.85 });
      const U = L.unaMas;
      const ku = 0.9 + 0.04 * Math.sin(t * 2.7);
      ctx.globalAlpha = alfa;
      ctx.setTransform(px * ku, 0, 0, px * ku, px * x, px * (y + 110 * f.s + 6));
      ctx.drawImage(U.c, U.x, U.y, U.w, U.h);
    }
    // LA ÚLTIMA: aparece cuando ya están los cuatro, un contorno con una luz dentro.
    if (estado.ultima > 0) {
      const u = suave((real - estado.ultima) / 1.6);
      const x = cx + SITIOS.ultima.dx * kc + vaiven(1.0);
      const y = SITIOS.ultima.y + vaivenY(1.0) + Math.sin(t * 1.2) * 14;
      const r = rebote(real, 'ultima');
      {
        const rad = 260 * u * (1 + 0.1 * Math.sin(real * 3));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alfa;
        base();
        ctx.drawImage(L.halos.ultima, x - rad, y - rad, rad * 2, rad * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      pon(bm('ultima'), x, y, S.ultima * (0.6 + 0.4 * u), Math.sin(t * 0.7) * 0.05 + r.r, r.sx, r.sy, u * (0.75 + 0.25 * Math.sin(real * 5)));
      zona('ultima', x, y);
    }
    for (const id of ['chuchi', 'pablo', 'vero']) dibujarAmigo(id);
    // GUILLE va el último: da el paso al frente y se queda por delante de todo lo demás, con un resplandor cálido detrás y su
    // jarra a la vista (la de la penúltima, pero suya).
    alfa = 1;
    {
      const sit = FIG.guille;
      const dp = pasoK;
      const x0 = cx + sit.dx * kc + vaiven(sit.p);
      const gx = x0 + (cx - 120 - x0) * dp;
      const gy = sit.y + dp * 62;
      const gs = sit.s * (1 + dp * 0.34);
      if (dp > 0) {
        const rad = 470 * dp;
        const cyh = gy - 230 * gs;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1;
        base();
        ctx.drawImage(L.halos.guille, gx - rad, cyh - rad, rad * 2, rad * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      dibujarAmigo('guille', { x: gx, y: gy, s: gs, brillo: 0.55 + dp * 0.9 });
      // Su jarra, en la mano que levanta (la del lado al que mira).
      if (dp > 0) ctxJarra(ctx, base, bm('guille.jarra'), gx - 250 * gs, gy - 250 * gs, 0.62 * (1 + dp * 0.5), dp, t);
    }
  } else {
    // ---- VERO lo envuelve todo: el marco dorado (una cortina de seda arriba y una ola abajo) respira y ondea. Cuando el
    // caos aprieta, se cierra un poco, como una boca.
    const respira = Math.sin(t * 1.1) * 0.5 + 0.5;
    const cierra = caos ? 30 + 30 * Math.sin(t * 2.2) : 0;
    const dy = respira * 14 + cierra;
    const tiras = (b: Bmp, y0: number, sentido: number, amp: number) => {
      const N = 12;
      const sw = b.c.width / N;
      const dw = b.w / N;
      ctx.save();
      base();
      for (let i = 0; i < N; i++) {
        const o = Math.sin(t * 1.3 + i * 0.22) * amp + Math.sin(t * 0.7 + i * 0.12) * amp * 0.6;
        ctx.drawImage(b.c, i * sw, 0, sw, b.c.height, b.x + i * dw - 80, y0 + o * sentido + b.y, dw + 0.8, b.h);
      }
      ctx.restore();
    };
    tiras(L.marcoArriba, -78 + dy * 0.5, 1, 3.2);
    tiras(L.marcoAbajo, 930 - dy, -1, 4);
  }
}

/** La jarra de Guille, a su lado cuando da el paso. */
function ctxJarra(ctx: CanvasRenderingContext2D, base: () => void, b: Bmp, x: number, y: number, s: number, u: number, t: number) {
  ctx.save();
  base();
  ctx.globalAlpha = u;
  ctx.translate(x, y);
  ctx.rotate(0.12 + Math.sin(t * 2) * 0.04);
  ctx.scale(s * 1.4, s * 1.4);
  ctx.drawImage(b.c, b.x, b.y, b.w, b.h);
  ctx.restore();
}
