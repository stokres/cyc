// El mundo de los conceptos, en vivo (capítulo 2, tramo final; docs/CAPITULO2.md): lo que flota, gira, late y
// se deforma sobre el fondo horneado de src/arte/escenas/conceptos.mjs.
//
// Docs/ESTILO.md, T5: cada figura, cada concepto y cada forma de fondo se pasa a bitmap UNA vez (el SVG viene de
// src/arte/conceptos.mjs; las palabras, de src/textos/capitulo2.md, se escriben encima con la letra de la
// página) y un fotograma solo dibuja esos bitmaps con una transformación barata: flotar, girar, latir,
// deformarse con la escala. Nada de SVG dibujado por fotograma y nada de filtros. Se pinta en las capas vivas
// del motor (`Motor.extra`): `fondo` (detrás de todo) y `frente` (la boca de Vero, que lo envuelve).
//
// Los toques son las zonas de la escena: aquí se mueven con cada pieza para que acompañen lo que se ve.
import type { Aventura } from '../juego/aventura';
import { svgABitmap } from '../motor/sprites';
import { texto } from '../juego/textos';
import * as A from '../arte/conceptos.mjs';
import { SITIOS } from '../arte/escenas/conceptos.mjs';

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
}

const PIEZAS: Pieza[] = [
  { id: 'casa', s: 1.55, dibujo: A.casa, etiqueta: { clave: 'c2.concepto.casa', color: '#fff1d6', tam: 21, abajo: 26 } },
  { id: 'trabajo', s: 1.55, dibujo: A.trabajo, etiqueta: { clave: 'c2.concepto.trabajo', color: '#fff1d6', tam: 21, abajo: 28 } },
  { id: 'reloj', s: 1.65, dibujo: A.relojDerretido, etiqueta: { clave: 'c2.concepto.reloj', color: '#fff1d6', tam: 21, abajo: 28 } },
  { id: 'no', s: 1.55, dibujo: A.noRebota },
  { id: 'manana', s: 1.2, dibujo: A.puertaManana, etiqueta: { clave: 'c2.concepto.manana', color: '#ffe9a8', tam: 24, abajo: 30 } },
  { id: 'penultima', s: 1.6, dibujo: A.jarraPenultima, etiqueta: { clave: 'c2.concepto.penultima', color: '#ffe9a8', tam: 19, abajo: 28 } },
  { id: 'fran', s: 1.45, dibujo: A.jarraFran, etiqueta: { clave: 'c2.concepto.unamas', color: '#e4fffb', tam: 22, abajo: 28 } },
  { id: 'ultima', s: 1.7, dibujo: A.jarraUltima, etiqueta: { clave: 'c2.concepto.ultima', color: '#ffffff', tam: 22, abajo: 30 } },
  { id: 'chuchi', s: 1.8, dibujo: A.circuloChuchi },
  { id: 'chuchi.aguja', s: 1.8, dibujo: A.agujaChuchi },
  { id: 'pablo', s: 1.5, dibujo: A.espiralPablo },
  { id: 'pablo.aro', s: 1.5, dibujo: A.aroPablo },
  { id: 'guille', s: 1.3, dibujo: A.florGuille },
  { id: 'guille.tallo', s: 1.3, dibujo: A.talloGuille },
  // La jarra de Guille («Este es mío»): la de la penúltima, pero sin palabra debajo.
  { id: 'guille.jarra', s: 1.6, dibujo: A.jarraPenultima },
  // El userito mitológico: dibujado a escala de escena (2 300 × 1 080), lisa y enorme, con menos resolución que el resto.
  { id: 'dino', s: 1, dibujo: A.dinosaurio, res: 0.62 },
];

/** Una forma de fondo: dónde está respecto al centro de la pantalla, a qué profundidad y cómo se mueve. */
interface Flota {
  tipo: number;
  dx: number;
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
  color: number;
}

const COLORES_FONDO = ['#ff3fa4', '#ffcf3a', '#2fe0d0', '#ff7a3a', '#7a5cff', '#a8ff4a', '#ff5a5a', '#46b8ff'];

/** Azar determinista: el mundo es el mismo en cada partida. */
function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const FLOTAS: Flota[] = (() => {
  const r = azar(77);
  return Array.from({ length: 44 }, (_, i) => {
    const p = 0.25 + r() * 1.6;
    return {
      tipo: Math.floor(r() * A.FORMAS.length),
      dx: (r() - 0.5) * 2100,
      y: r() * 1080,
      p,
      tam: (0.45 + r() * 0.85) * (0.5 + p * 0.6),
      rot: r() * Math.PI * 2,
      vrot: (r() - 0.5) * 1.4,
      ax: 20 + r() * 50,
      ay: 16 + r() * 40,
      fx: 0.12 + r() * 0.35,
      fy: 0.1 + r() * 0.3,
      fase: r() * 20,
      color: i % COLORES_FONDO.length,
    };
  }).sort((a, b) => a.p - b.p);
})();

interface Horneado {
  clave: string;
  piezas: Map<string, Bmp>;
  formas: Bmp[][];
  labioArriba: Bmp;
  labioAbajo: Bmp;
  dinoPalabra: HTMLCanvasElement;
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

const FUENTE = "'Graduate', 'Alegreya Sans', Georgia, serif";

/** Los «???» del dinosaurio (unidades de escena): el cuadro, el cuerpo de letra y dónde están sobre su cabeza (según su dibujo). */
const DINO_PALABRA = { w: 460, h: 190, tam: 150, x: -560, y: 285 };
/** Lo que tarda en levantarse el dinosaurio (segundos). */
const DINO_SUBE = 3.6;
/** Adónde se apartan los conceptos que taparían su cabeza (a la izquierda de la pantalla, sobre su cuello y bajo su barbilla). */
const HUYEN = { casa: { dx: -1010, y: 285 }, trabajo: { dx: -170, y: 300 }, pablo: { dx: -740, y: 735 } };

function lienzo(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

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
  const pw = Math.ceil(W * res);
  const ph = Math.ceil(Hh * res);
  const svg = d.svg.replace(/ width="[^"]*" height="[^"]*"/, ` width="${Math.ceil(d.w * res)}" height="${Math.ceil(d.h * res)}"`);
  const arte = await svgABitmap(svg, d.w * res, d.h * res);
  const c = lienzo(pw, ph);
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

/** Hornea todo el mundo (una vez; otra si cambia la resolución de la pantalla). */
export function prepararConceptos(g: Aventura): Promise<void> {
  const px = Math.max(0.3, g.motor.px);
  const clave = `${px.toFixed(1)}@${Math.round(g.motor.vw)}`;
  if (listo?.clave === clave) return Promise.resolve();
  if (horneando) return horneando;
  horneando = (async () => {
    const piezas = new Map<string, Bmp>();
    await Promise.all(
      PIEZAS.map(async (p) => {
        const d = p.dibujo();
        piezas.set(p.id, await hornear(d, p.s * px * (p.res ?? 1.2), p.etiqueta ? { ...p.etiqueta, tam: p.etiqueta.tam, abajo: p.etiqueta.abajo } : undefined));
      }),
    );
    // Las formas de fondo: una por tipo y color que se use.
    const usadas = new Set(FLOTAS.map((f) => `${f.tipo}:${f.color}`));
    const formas: Bmp[][] = A.FORMAS.map(() => []);
    await Promise.all(
      [...usadas].map(async (k) => {
        const [t, col] = k.split(':').map(Number);
        formas[t][col] = await hornear(A.forma(A.FORMAS[t], COLORES_FONDO[col]), px * 1.8);
      }),
    );
    const ancho = Math.ceil(g.motor.vw) + 200;
    const [labioArriba, labioAbajo] = await Promise.all([hornear(A.labioSuperior(ancho), px * 0.9), hornear(A.labioInferior(ancho), px * 0.9)]);
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
    const viejo = listo;
    listo = { clave, piezas, formas, labioArriba, labioAbajo, dinoPalabra };
    if (viejo) soltar(viejo);
  })().finally(() => (horneando = null));
  return horneando;
}

function soltar(h: Horneado) {
  for (const b of h.piezas.values()) b.c.width = b.c.height = 0;
  for (const fila of h.formas) for (const b of fila) if (b) b.c.width = b.c.height = 0;
  for (const b of [h.labioArriba, h.labioAbajo]) b.c.width = b.c.height = 0;
  h.dinoPalabra.width = h.dinoPalabra.height = 0;
}

/** Suelta los bitmaps al salir del mundo (la memoria de los móviles, docs/ESTILO.md T5.11). */
export function liberarConceptos() {
  if (listo) soltar(listo);
  listo = null;
  golpes.clear();
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

/** La última aparece (cuando Fran ya está con los demás). */
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
  // El vaivén de la cámara: mueve cada capa según su profundidad (el paralaje).
  const vaiven = (p: number) => Math.sin(real * 0.23 * (1 + caos * 2)) * 70 * p;
  const vaivenY = (p: number) => Math.cos(real * 0.17 * (1 + caos * 2)) * 26 * p;
  const base = () => ctx.setTransform(px, 0, 0, px, 0, 0);
  /** Lo que se apagan las piezas que no son la protagonista del momento (Guille, al dar el paso). */
  let alfa = 1;
  const pon = (b: Bmp, x: number, y: number, s = 1, rot = 0, sx = 1, sy = 1) => {
    ctx.save();
    if (alfa !== 1) ctx.globalAlpha *= alfa;
    base();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s * sx, s * sy);
    ctx.drawImage(b.c, b.x, b.y, b.w, b.h);
    ctx.restore();
  };
  // Anclas de cada pieza: el bitmap está ya dimensionado en unidades de escena multiplicadas por `s`; aquí se
  // pinta con su escala de dibujo.
  const S = Object.fromEntries(PIEZAS.map((p) => [p.id, p.s])) as Record<string, number>;
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

  if (capa === 'fondo') {
    // ---- El color de fondo se pone loco: en el caos gira por el arco iris.
    if (caos) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'hard-light';
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = `hsl(${((real * 140) % 360).toFixed(0)} 90% 50%)`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
    // ---- El dinosaurio del fondo (el userito mitológico): una silueta ENORME que llena toda la pantalla por detrás de
    // todo. Crece desde abajo (anclado al borde de abajo, hundido y pequeño, y se levanta hasta llenarla, con un
    // pequeño rebote al llegar) mientras tiembla; sus «???» van sobre su cabeza, grandes y latiendo.
    const dinoU = estado.dino > 0 ? (real - estado.dino) / DINO_SUBE : 0;
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
    // Con el dinosaurio levantándose, las formas de fondo se apagan para que se lea la silueta...
    const apagan = estado.dino > 0 ? 1 - 0.5 * suave(dinoU) : 1;
    // ...y los tres conceptos que le taparían la cabeza y los «???» se apartan asustados (cada uno a su rincón).
    const hk = estado.dino > 0 ? suave(dinoU * 1.5) : 0;
    const huye = Object.fromEntries(
      (Object.keys(HUYEN) as (keyof typeof HUYEN)[]).map((id) => [id, { dx: SITIOS[id].dx + (HUYEN[id].dx - SITIOS[id].dx) * hk, y: SITIOS[id].y + (HUYEN[id].y - SITIOS[id].y) * hk }]),
    ) as Record<keyof typeof HUYEN, { dx: number; y: number }>;
    // ---- Las formas que flotan, de lo lejano a lo cercano; las cercanas, a un lado y algo translúcidas.
    const n = caos ? FLOTAS.length : nivel >= 7 ? FLOTAS.length - 10 : FLOTAS.length - 18;
    let k = 0;
    for (const f of FLOTAS) {
      if (k++ >= n) break;
      const b = L.formas[f.tipo]?.[f.color];
      if (!b) continue;
      const x = cx + f.dx + vaiven(f.p) + Math.sin(t * f.fx + f.fase) * f.ax;
      const y = f.y + vaivenY(f.p) + Math.cos(t * f.fy + f.fase * 1.3) * f.ay;
      const latir = 1 + 0.12 * Math.sin(t * 1.6 + f.fase);
      ctx.save();
      ctx.globalAlpha = (f.p > 1.15 ? 0.55 : f.p < 0.5 ? 0.6 : 0.85) * apagan;
      pon(b, x, y, f.tam * latir, f.rot + t * f.vrot);
      ctx.restore();
    }

    // ---- Los conceptos.
    const hallado = g.flag('c2.fran.hallado');
    // Cuando Guille da el paso al frente, todo lo demás se apaga un poco para que se lea él, con su jarra.
    const pasoK = estado.paso > 0 ? suave((real - estado.paso) / 1.3) : 0;
    alfa = 1 - 0.55 * pasoK;
    // CASA: siempre lejos. Se acerca... y se aleja justo cuando la miras.
    {
      const ciclo = Math.sin(t * 0.5);
      const x = cx + huye.casa.dx + vaiven(0.45) + ciclo * 70;
      const y = huye.casa.y + vaivenY(0.45);
      const r = rebote(real, 'casa');
      pon(bm('casa'), x, y, S.casa * (1 + 0.28 * Math.sin(t * 0.5 + 1.6)) * 0.9, r.r, r.sx, r.sy);
      zona('casa', x, y);
    }
    // EL TRABAJO: vibra como un móvil con avisos.
    {
      const zumbido = Math.sin(t * 0.9) > 0.55 ? Math.sin(t * 60) * 0.05 : 0;
      const x = cx + huye.trabajo.dx + vaiven(0.8) + Math.sin(t * 0.4) * 16;
      const y = huye.trabajo.y + vaivenY(0.8) + Math.sin(t * 0.8) * 10;
      const r = rebote(real, 'trabajo');
      pon(bm('trabajo'), x, y, S.trabajo, zumbido + r.r, r.sx, r.sy);
      zona('trabajo', x, y);
    }
    // El RELOJ derretido: cuelga de su rama y se descuelga un poco más cada vez.
    {
      const x = cx + SITIOS.reloj.dx + vaiven(0.9);
      const y = SITIOS.reloj.y + vaivenY(0.9);
      const r = rebote(real, 'reloj');
      pon(bm('reloj'), x, y, S.reloj, Math.sin(t * 0.8) * 0.09 + r.r, (1 + 0.04 * Math.sin(t * 1.9)) * r.sx, (1 - 0.06 * Math.sin(t * 1.9)) * r.sy);
      zona('reloj', x, y);
    }
    // El NO: rebota de arriba abajo y se aplasta al caer.
    {
      const fase = Math.abs(Math.sin(t * 2.1));
      const x = cx + SITIOS.no.dx + vaiven(1.0) + Math.sin(t * 0.7) * 30;
      const y = SITIOS.no.y + vaivenY(1.0) - fase * 55;
      const aplasta = fase < 0.18 ? 1 - (0.18 - fase) * 1.4 : 1;
      const r = rebote(real, 'no');
      pon(bm('no'), x, y + (1 - aplasta) * 30, S.no, Math.sin(t * 1.3) * 0.12 + r.r, (2 - aplasta) * r.sx, aplasta * r.sy);
      zona('no', x, y);
    }
    // MAÑANA: la puerta intenta abrirse (se estrecha un poco) y nunca se abre.
    {
      const x = cx + SITIOS.manana.dx + vaiven(1.0);
      const y = SITIOS.manana.y + vaivenY(1.0);
      const intento = Math.max(0, Math.sin(t * 1.3 - 0.4));
      const tiembla = intento > 0.9 ? Math.sin(t * 55) * 0.012 : 0;
      const r = rebote(real, 'manana');
      pon(bm('manana'), x, y, S.manana, tiembla + r.r * 0.4, (1 - 0.06 * intento * intento) * r.sx, r.sy);
      zona('manana', x, y);
    }
    // LA PENÚLTIMA: late y se rellena sola.
    {
      const x = cx + SITIOS.penultima.dx + vaiven(1.1);
      const y = SITIOS.penultima.y + vaivenY(1.1) + Math.sin(t * 1.4) * 8;
      const r = rebote(real, 'penultima');
      pon(bm('penultima'), x, y, S.penultima, Math.sin(t * 0.9) * 0.07 + r.r, (1 + 0.05 * Math.sin(t * 3)) * r.sx, (1 - 0.05 * Math.sin(t * 3)) * r.sy);
      zona('penultima', x, y);
    }
    // PABLO: la espiral gira despacio y su aro le da vueltas.
    {
      const x = cx + huye.pablo.dx + vaiven(1.05);
      const y = huye.pablo.y + vaivenY(1.05) + Math.sin(t * 0.8) * 10;
      const r = rebote(real, 'pablo');
      pon(bm('pablo'), x, y, S.pablo, t * 0.6 + r.r, r.sx, r.sy);
      const a = t * 1.7;
      pon(bm('pablo.aro'), x + Math.cos(a) * 92 * S.pablo, y + Math.sin(a) * 92 * S.pablo * 0.8, S.pablo * 0.95, a * 1.3 + r.r);
      zona('pablo', x, y);
    }
    // CHUCHI: el círculo brilla y su aguja asoma por detrás a golpes de segundero.
    {
      const x = cx + SITIOS.chuchi.dx + vaiven(1.05);
      const y = SITIOS.chuchi.y + vaivenY(1.05) + Math.sin(t * 1.1 + 2) * 12;
      const r = rebote(real, 'chuchi');
      const tic = Math.floor(t * 2) * (Math.PI / 6) + Math.sin(t * 40) * (t * 2 - Math.floor(t * 2) < 0.15 ? 0.05 : 0);
      pon(bm('chuchi.aguja'), x, y, S.chuchi, tic);
      pon(bm('chuchi'), x, y, S.chuchi * (1 + 0.04 * Math.sin(t * 2.4)), r.r, r.sx, r.sy);
      zona('chuchi', x, y);
    }
    // GUILLE: la flor más alta, con la cabeza girando al viento en lo alto de su tallo. Al dar el paso al frente crece,
    // se adelanta hacia el centro, con un resplandor detrás, y sostiene su jarra en una hoja. Se pinta el último.
    const dibujarGuille = () => {
      const x = cx + SITIOS.guille.dx + vaiven(1.0);
      const yCabeza = 400 + vaivenY(1.0);
      const r = rebote(real, 'guille');
      const dp = pasoK;
      const sc = 1 + dp * 0.62;
      const gx = x + (cx - 150 - x) * dp;
      const gy = yCabeza + dp * 70;
      if (dp > 0) {
        // Un resplandor cálido detrás de él y de la jarra, para que se lean sobre el dinosaurio y las figuras.
        ctx.save();
        base();
        ctx.globalCompositeOperation = 'lighter';
        const rad = 430 * dp;
        const cxh = gx + 120 * sc;
        const cyh = gy + 60 * sc;
        const gr = ctx.createRadialGradient(cxh, cyh, 0, cxh, cyh, rad);
        gr.addColorStop(0, 'rgba(255,214,120,0.5)');
        gr.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(cxh - rad, cyh - rad, rad * 2, rad * 2);
        ctx.restore();
      }
      pon(bm('guille.tallo'), gx + Math.sin(t * 0.9) * 8 * sc, gy + 6 * sc, S.guille * sc, Math.sin(t * 0.9) * 0.03 + r.r * 0.4, r.sx, r.sy);
      pon(bm('guille'), gx + Math.sin(t * 0.9) * 8 * sc, gy, S.guille * sc, t * 0.5 + r.r, r.sx, r.sy);
      // La jarra de Guille, en una de sus hojas (la misma del concepto de la penúltima, pero suya).
      if (dp > 0) ctxJarra(ctx, base, bm('guille.jarra'), gx + 185 * sc, gy + 100 * sc, 0.8 * sc, dp, t);
      zona('guille', gx, gy + 140 * sc, SITIOS.guille.w * sc, SITIOS.guille.h * sc);
    };
    // FRAN, hecho «UNA MÁS»: la jarra infinita pasea por el mundo.
    {
      const x = cx + SITIOS.fran.dx + 200 * Math.sin(t * 0.21) + vaiven(0.95);
      const y = SITIOS.fran.y + 35 * Math.sin(t * 0.37 + 1) + vaivenY(0.95);
      const r = rebote(real, 'fran');
      const pistado = g.flag('c2.con.pista') && !hallado;
      if (pistado || hallado) {
        // Un halo que respira alrededor (cuando ya se ha avisado o ya se ha encontrado).
        ctx.save();
        base();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alfa;
        const rad = 170 * (1 + 0.15 * Math.sin(real * 4));
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, hallado ? 'rgba(120,255,230,0.55)' : 'rgba(120,255,230,0.38)');
        gr.addColorStop(1, 'rgba(120,255,230,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        ctx.restore();
      }
      pon(bm('fran'), x, y, S.fran, Math.sin(t * 0.9 + 1) * 0.08 + r.r, (1 + 0.04 * Math.sin(t * 2.7)) * r.sx, (1 - 0.04 * Math.sin(t * 2.7)) * r.sy);
      zona('fran', x, y);
    }
    // LA ÚLTIMA: aparece cuando ya están los cuatro, un contorno con una luz dentro.
    if (estado.ultima > 0) {
      const u = suave((real - estado.ultima) / 1.6);
      const x = cx + SITIOS.ultima.dx + vaiven(1.0);
      const y = SITIOS.ultima.y + vaivenY(1.0) + Math.sin(t * 1.2) * 14;
      const r = rebote(real, 'ultima');
      ctx.save();
      base();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alfa;
      const rad = 260 * u * (1 + 0.1 * Math.sin(real * 3));
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,246,224,0.5)');
      gr.addColorStop(1, 'rgba(255,246,224,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = u * (0.75 + 0.25 * Math.sin(real * 5));
      pon(bm('ultima'), x, y, S.ultima * (0.6 + 0.4 * u), Math.sin(t * 0.7) * 0.05 + r.r, r.sx, r.sy);
      ctx.restore();
      zona('ultima', x, y);
    }
    // GUILLE va el último: da el paso al frente y se queda por delante de todo lo demás.
    alfa = 1;
    dibujarGuille();
  } else {
    // ---- VERO: una boca dorada que lo envuelve todo. Respira; los labios se cierran y se abren un poco.
    const respira = Math.sin(t * 1.1) * 0.5 + 0.5;
    const r = rebote(real, 'vero');
    const cierra = caos ? 40 + 40 * Math.sin(t * 2.2) : 0;
    const dy = respira * 22 + cierra;
    const lb = L.labioAbajo;
    const la = L.labioArriba;
    // Los dos labios se pintan con su cuadro tal cual (el dibujo ya mide lo que la pantalla de ancho).
    ctx.save();
    base();
    ctx.translate(0, 1044 - dy * 1.0 - r.r * 40);
    ctx.drawImage(lb.c, lb.x, lb.y, lb.w, lb.h);
    ctx.restore();
    ctx.save();
    base();
    ctx.translate(0, 70 + dy * 0.7);
    ctx.drawImage(la.c, la.x, la.y, la.w, la.h);
    ctx.restore();
    zona('vero', cx, 1010 - dy, SITIOS.vero.w, SITIOS.vero.h);
  }
}

/** La jarra de Guille, a su lado cuando da el paso. */
function ctxJarra(ctx: CanvasRenderingContext2D, base: () => void, b: Bmp, x: number, y: number, s: number, u: number, t: number) {
  ctx.save();
  base();
  ctx.globalAlpha = u;
  ctx.translate(x, y);
  ctx.rotate(-0.25 + Math.sin(t * 2) * 0.04);
  ctx.scale(s * 1.4, s * 1.4);
  ctx.drawImage(b.c, b.x, b.y, b.w, b.h);
  ctx.restore();
}

