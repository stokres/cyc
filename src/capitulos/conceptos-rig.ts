// El rig de las figuras del mundo de los conceptos, en vivo (capítulo 2; docs/CAPITULO2.md), y la pintura que comparten la boca
// de Vero y el mundo: la textura de grano y pincelada que se da a cada bitmap al hornearlo.
//
// Docs/ESTILO.md, T5: cada pieza de cada figura (cabeza, cara, pelo, torso, brazos, piernas, bebida, adornos que flotan) se
// pasa a bitmap UNA vez (el SVG viene de src/arte/conceptos-figuras.mjs) y por fotograma solo se traslada, gira y escala con
// `drawImage`; la tela que ondea son unas tiras del mismo bitmap desplazadas de lado. Nada de SVG ni de filtros por fotograma.
import { svgABitmap } from '../motor/sprites';

/** Movimiento senoidal: [amplitud, frecuencia (rad/s), fase]. */
type Sen = [number, number, number];

export interface ParteDef {
  id: string;
  padre?: string;
  /** Punto de giro (en coordenadas de la figura; de la propia pieza si flota). */
  piv?: [number, number];
  x: number;
  y: number;
  w: number;
  h: number;
  svg: string;
  fija?: boolean;
  mov?: { rot?: Sen; dx?: Sen; dy?: Sen; esc?: Sen };
  /** Flota en una órbita elíptica alrededor de (cx, cy). */
  orb?: { cx: number; cy: number; rx: number; ry: number; w: number; fase: number };
  /** Cae en bucle y se esfuma al llegar abajo. */
  cae?: { x: number; y: number; alto: number; w: number; fase: number };
  /** Tela que ondea: tiras desplazadas de lado. */
  onda?: { amp: number; w: number; fase: number };
}

export interface FiguraDef {
  id: string;
  mira: number;
  alto: number;
  ancho: number;
  color: string;
  bebida: string;
  partes: ParteDef[];
}

export interface ParteBmp {
  def: ParteDef;
  c: HTMLCanvasElement;
}

export interface FiguraBmp {
  id: string;
  mira: number;
  alto: number;
  ancho: number;
  color: string;
  partes: ParteBmp[];
  por: Map<string, ParteBmp>;
  /** Resplandor redondo de su color (para pintarlo con mezcla aditiva). */
  aura: HTMLCanvasElement;
}

/** Un trozo suelto de una figura al recomponerse (en unidades de la figura): se mueve respecto a su sitio. */
export interface Montaje {
  dx: number;
  dy: number;
  rot: number;
  esc: number;
  a: number;
}

// ---------------------------------------------------------------- la textura de pintura

let grano: HTMLCanvasElement | null = null;
let pincel: HTMLCanvasElement | null = null;
let hebras: HTMLCanvasElement | null = null;

/** Un azar rápido y determinista (el mismo grano en cada partida). */
function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function teselas() {
  if (grano && pincel && hebras) return;
  const r = azar(1234);
  // El grano: puntitos claros y violetas, muy sutiles, de un píxel.
  grano = document.createElement('canvas');
  grano.width = grano.height = 128;
  const gx = grano.getContext('2d')!;
  const id = gx.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) {
    const claro = r() < 0.5;
    id.data[i] = claro ? 255 : 30;
    id.data[i + 1] = claro ? 240 : 10;
    id.data[i + 2] = claro ? 220 : 70;
    id.data[i + 3] = Math.round(r() * (claro ? 26 : 34));
  }
  gx.putImageData(id, 0, 0);
  // La pincelada: manchas grandes y blandas de luz y de sombra, y unas hebras largas en diagonal (el pelo del pincel).
  pincel = document.createElement('canvas');
  pincel.width = pincel.height = 256;
  const px = pincel.getContext('2d')!;
  const pon = (x: number, y: number, rad: number, col: string, a: number) => {
    for (const ox of [-256, 0, 256]) {
      for (const oy of [-256, 0, 256]) {
        const g = px.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        g.addColorStop(0, col.replace('A', String(a)));
        g.addColorStop(1, col.replace('A', '0'));
        px.fillStyle = g;
        px.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
  };
  for (let i = 0; i < 70; i++) pon(r() * 256, r() * 256, 18 + r() * 46, r() < 0.5 ? 'rgba(255,236,210,A)' : 'rgba(24,6,60,A)', 0.07 + r() * 0.07);
  // Las hebras largas en diagonal (el pelo del pincel), aparte: solo se usan sobre las figuras y los conceptos.
  hebras = document.createElement('canvas');
  hebras.width = hebras.height = 256;
  const hx = hebras.getContext('2d')!;
  hx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const l = 14 + r() * 40;
    hx.strokeStyle = r() < 0.5 ? `rgba(255,240,220,${0.035 + r() * 0.04})` : `rgba(20,4,50,${0.045 + r() * 0.05})`;
    hx.lineWidth = 0.8 + r() * 2.2;
    for (const ox of [-256, 0, 256]) {
      hx.beginPath();
      hx.moveTo(x + ox, y);
      hx.lineTo(x + ox + l * 0.94, y - l * 0.34);
      hx.stroke();
    }
  }
}

/** Da a un bitmap recién horneado la textura de pintura: pincelada y grano, solo donde hay dibujo (`source-atop`). */
export function texturar(c: HTMLCanvasElement, fuerza = 1) {
  teselas();
  const x = c.getContext('2d')!;
  x.save();
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = Math.min(1, 0.6 * fuerza);
  x.fillStyle = x.createPattern(pincel!, 'repeat')!;
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = x.createPattern(hebras!, 'repeat')!;
  x.fillRect(0, 0, c.width, c.height);
  x.globalAlpha = Math.min(1, 0.7 * fuerza);
  x.fillStyle = x.createPattern(grano!, 'repeat')!;
  x.fillRect(0, 0, c.width, c.height);
  x.restore();
}

/** Las teselas de textura, para el fondo (se pintan con otra mezcla). */
export function teselasPintura() {
  teselas();
  return { grano: grano!, pincel: pincel! };
}

/** Un bitmap de un dibujo SVG con su textura. `res` = píxeles de bitmap por unidad del dibujo. */
export async function hornearDibujo(d: { w: number; h: number; svg: string }, res: number, fuerza = 1): Promise<HTMLCanvasElement> {
  const w = Math.max(2, Math.ceil(d.w * res));
  const h = Math.max(2, Math.ceil(d.h * res));
  const svg = d.svg.replace(/ width="[^"]*" height="[^"]*"/, ` width="${w}" height="${h}"`);
  const c = await svgABitmap(svg, w, h);
  texturar(c, fuerza);
  return c;
}

/** Un resplandor redondo y blando de un color (alfa `a` en el centro). */
export function resplandor(color: string, lado: number, a = 0.8): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(4, Math.ceil(lado));
  const x = c.getContext('2d')!;
  const r = c.width / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  const rgba = (al: number) => {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${al})`;
  };
  g.addColorStop(0, rgba(a));
  g.addColorStop(0.4, rgba(a * 0.45));
  g.addColorStop(0.75, rgba(a * 0.12));
  g.addColorStop(1, rgba(0));
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------------------------------------------------------------- hornear una figura

const cede = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Hornea todas las piezas de una figura con `res` píxeles por unidad. Por tandas, cediendo el hilo entre una y otra, para que no haya
 * un parón largo (se hace mientras suena la boca).
 */
export async function hornearFigura(def: FiguraDef, res: number): Promise<FiguraBmp> {
  const partes: ParteBmp[] = [];
  const TANDA = 6;
  for (let i = 0; i < def.partes.length; i += TANDA) {
    const lote = def.partes.slice(i, i + TANDA);
    const hechos = await Promise.all(lote.map((p) => hornearDibujo(p, res)));
    lote.forEach((p, k) => partes.push({ def: p, c: hechos[k] }));
    await cede();
  }
  return {
    id: def.id,
    mira: def.mira,
    alto: def.alto,
    ancho: def.ancho,
    color: def.color,
    partes,
    por: new Map(partes.map((p) => [p.def.id, p])),
    aura: resplandor(def.color, def.alto * res * 0.9, 0.85),
  };
}

export function soltarFigura(f: FiguraBmp) {
  for (const p of f.partes) p.c.width = p.c.height = 0;
  f.aura.width = f.aura.height = 0;
}

// ---------------------------------------------------------------- dibujar una figura

export interface OpcionesFigura {
  /** Posición del centro de la peana en el lienzo (unidades de escena) y escala. */
  x: number;
  y: number;
  s: number;
  /** Opacidad general. */
  a?: number;
  /** Fuerza del resplandor que late (0 = ninguno). */
  brillo?: number;
  /** Cuánto se mueve (1 = lo normal; en el caos, más). */
  vida?: number;
  /** Si cada pieza está suelta de su sitio (la boca: se recomponen volando). */
  montaje?: (id: string, i: number) => Montaje | null;
  /** No pintar la peana (cuando aún no ha llegado). */
  sinPeana?: boolean;
  /** Un giro de toda la figura (el rebote al tocarla) y su aplastamiento. */
  rot?: number;
  sx?: number;
  sy?: number;
}

const sen = (m: Sen | undefined, t: number) => (m ? m[0] * Math.sin(m[1] * t + m[2]) : 0);

/** Aplica el movimiento propio de una pieza (sin el de su padre). */
function moverPieza(ctx: CanvasRenderingContext2D, d: ParteDef, t: number, vida: number) {
  if (d.orb) {
    const o = d.orb;
    ctx.translate(o.cx + Math.cos(o.w * t + o.fase) * o.rx * vida, o.cy + Math.sin(o.w * t + o.fase) * o.ry * vida);
  }
  if (d.cae) {
    const u = (t * d.cae.w + d.cae.fase) % 1;
    ctx.translate(d.cae.x, d.cae.y + u * d.cae.alto);
  }
  const m = d.mov;
  if (!m) return;
  const dx = sen(m.dx, t) * vida;
  const dy = sen(m.dy, t) * vida;
  if (dx || dy) ctx.translate(dx, dy);
  const rot = sen(m.rot, t) * vida;
  const esc = sen(m.esc, t) * vida;
  if (rot || esc) {
    const [px, py] = d.piv ?? [0, 0];
    ctx.translate(px, py);
    if (rot) ctx.rotate(rot);
    if (esc) ctx.scale(1 - esc * 0.6, 1 + esc);
    ctx.translate(-px, -py);
  }
}

/** Pinta una figura entera: su resplandor, su peana y todas sus piezas, cada una con su movimiento. */
export function dibujarFigura(ctx: CanvasRenderingContext2D, F: FiguraBmp, t: number, o: OpcionesFigura) {
  const vida = o.vida ?? 1;
  const a = o.a ?? 1;
  if (a <= 0.01) return;
  const base = ctx.getTransform();
  // El resplandor late detrás (y un charco de luz en el suelo).
  if (o.brillo) {
    const k = o.brillo * (0.75 + 0.25 * Math.sin(t * 1.9 + F.alto)) * a;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k * 0.7;
    const r = F.alto * o.s * (0.82 + 0.05 * Math.sin(t * 1.9 + F.alto));
    ctx.drawImage(F.aura, o.x - r, o.y - F.alto * o.s * 0.58 - r * 0.5, r * 2, r * 2 * 0.9);
    ctx.globalAlpha = k * 0.55;
    ctx.drawImage(F.aura, o.x - r * 0.9, o.y - r * 0.16, r * 1.8, r * 0.32);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.s * F.mira * (o.sx ?? 1), o.s * (o.sy ?? 1));
  if (a !== 1) ctx.globalAlpha *= a;
  const marco = ctx.getTransform();
  let i = 0;
  for (const p of F.partes) {
    const d = p.def;
    i++;
    if (d.fija && o.sinPeana) continue;
    const mont = o.montaje?.(d.id, i) ?? null;
    if (mont && mont.a <= 0.01) continue;
    ctx.setTransform(marco);
    // El montaje (la pieza viene volando) va por fuera de todo: se mueve alrededor del centro de su caja.
    if (mont) {
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h / 2;
      ctx.translate(mont.dx, mont.dy);
      ctx.translate(cx, cy);
      if (mont.rot) ctx.rotate(mont.rot);
      if (mont.esc !== 1) ctx.scale(mont.esc, mont.esc);
      ctx.translate(-cx, -cy);
    }
    // Su cadena de padres, de la raíz a ella.
    if (!d.fija) {
      const cadena: ParteDef[] = [];
      for (let q: ParteDef | undefined = d; q; q = q.padre ? F.por.get(q.padre)?.def : undefined) cadena.unshift(q);
      for (const q of cadena) moverPieza(ctx, q, t, vida);
    }
    const alfaPieza = d.cae ? Math.sin(Math.PI * ((t * d.cae.w + d.cae.fase) % 1)) : 1;
    const al = (mont ? mont.a : 1) * alfaPieza;
    const g0 = ctx.globalAlpha;
    if (al !== 1) ctx.globalAlpha = g0 * al;
    if (d.onda && vida > 0) {
      // Tela que ondea: tiras desplazadas de lado, más cuanto más lejos del punto del que cuelga.
      const N = 8;
      const sh = p.c.height / N;
      const dh = d.h / N;
      for (let k = 0; k < N; k++) {
        const off = d.onda.amp * d.h * Math.sin(d.onda.w * t + d.onda.fase + k * 0.75) * Math.pow(k / (N - 1), 1.3) * vida;
        ctx.drawImage(p.c, 0, k * sh, p.c.width, sh, d.x + off, d.y + k * dh, d.w, dh + 0.7);
      }
    } else ctx.drawImage(p.c, d.x, d.y, d.w, d.h);
    ctx.globalAlpha = g0;
  }
  ctx.restore();
  ctx.setTransform(base);
}
