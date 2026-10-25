// «El safari» (chapter 2's last stretch): a comic with a little movement. Guille has proposed a safari, the caravan sets off
// and the story is told as the pages of a comic: panels slanting into place one by one (they slide, drop, spin, peek in),
// each with its own small animation (the caravan rolling on, layers of scenery sliding past, dust, wheels, a sun going
// down, the camera drifting), speech bubbles popping out of the caravan (no one is drawn: only the caravan talks),
// narrator's caption boxes, onomatopoeias drawn with strokes, and finally the desert of Las Vegas at dusk. A tap brings
// the next thing in at once; «Saltar» skips the lot.
//
// Performance (docs/ESTILO.md, T5): every panel's scenery is baked once to bitmaps (src/ui/safari-*.ts) when its page is
// built (the next page is baked while this one is read); a frame only draws those images, with transforms, into a small
// canvas per panel. The bubbles, boxes and sound effects are baked bitmaps too, popped in with CSS animations (the
// compositor). Only the panels that have come in are drawn, the loop never passes 60 fps, and the page that has been
// turned is freed. The words are in src/textos/capitulo2.md (safari.*).
import { h } from './hud';
import { esVertical } from './orientacion';
import { texto } from '../juego/textos';
import type { Pista } from '../sonido/musica';
import type { SonidoMinijuego } from '../core/audio';
import { PAPEL, TINTA, acota, hornearBocadillo, hornearCartucha, hornearOno, lienzo, trama, type Bocadillo } from './safari-dibujo';
import type { Escena } from './safari-base';
import { ESCENAS } from './safari-escenas';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

export interface OpcionesSafari {
  rapido?: boolean;
  sonido?: SonidoMinijuego;
  /** For the tests: start on this page (0 to 3). */
  pagina?: number;
}

type P = [number, number];
type Entrada = 'izq' | 'der' | 'cae' | 'gira' | 'asoma';
type Borde = 'recto' | 'redondo' | 'ondulado' | 'dientes' | 'marquesina';
type Sonido = 'brum' | 'plaf' | 'bocina' | 'crac' | 'fiu' | 'frena' | 'trompa';

interface DatosBocadillo {
  clave: string;
  t: number;
  /** Centre of the bubble as fractions of the panel. */
  pos: P;
  grito?: boolean;
  /** Seconds after which it fades away again (a shot where the lines would pile up on top of the picture). */
  dura?: number;
}
interface DatosCartucha {
  clave: string;
  t: number;
  /** Top left corner as fractions of the panel. */
  pos: P;
  giro?: number;
}
interface DatosOno {
  clave: string;
  t: number;
  pos: P;
  letra: string;
  rafaga: string;
  rafaga2: string;
  /** Height of its letters as a fraction of the page's height. */
  alto: number;
  giro?: number;
  sonido: Sonido;
  /** The name by which the shot hears of it (`ev[evento]`: seconds since it came). */
  evento?: string;
}
interface DatosVineta {
  escena: string;
  /** Corners as fractions of the page (shared edges between neighbours are the gutters). */
  poli: P[];
  borde: Borde;
  entra: { t: number; tipo: Entrada };
  cartuchas?: DatosCartucha[];
  bocadillos?: DatosBocadillo[];
  onos?: DatosOno[];
  /** Music that starts as the panel comes in (the page's own keeps going otherwise). */
  musica?: Pista;
}
interface DatosPagina {
  musica: Pista;
  /** Seconds the last thing stays before the page turns by itself. */
  resto?: number;
  vinetas: DatosVineta[];
}

const ROJO = { letra: '#ffd23f', rafaga: '#e8453a', rafaga2: '#ff8a3a' };
const AZUL = { letra: '#fff4d6', rafaga: '#3a7ac8', rafaga2: '#79b6ea' };
const VERDE = { letra: '#fff0a8', rafaga: '#4a9a52', rafaga2: '#9ad06a' };
const ROSA = { letra: '#fff4d6', rafaga: '#c8408a', rafaga2: '#f080b8' };

// The four pages. The panels' corners are fractions of the page; a panel's other positions are fractions of the panel.
const PAGINAS: DatosPagina[] = [
  {
    // Madrid's ring road, the Monegros, and the map that blows away.
    musica: 'granjaRadio',
    vinetas: [
      {
        escena: 'm30',
        poli: [[0, 0], [1, 0], [1, 0.5], [0, 0.57]],
        borde: 'recto',
        entra: { t: 0.3, tipo: 'izq' },
        cartuchas: [{ clave: 'safari.p1.a.cart', t: 1.0, pos: [0.015, 0.05], giro: -0.012 }],
        onos: [{ clave: 'safari.ono.brum', t: 1.6, pos: [0.83, 0.3], ...ROJO, alto: 0.15, giro: -0.12, sonido: 'brum' }],
        bocadillos: [
          { clave: 'safari.p1.a.b1', t: 2.7, pos: [0.56, 0.16] },
          { clave: 'safari.p1.a.b2', t: 4.8, pos: [0.5, 0.45] },
        ],
      },
      {
        escena: 'monegros',
        poli: [[0, 0.57], [0.63, 0.5251], [0.59, 1], [0, 1]],
        borde: 'recto',
        entra: { t: 6.4, tipo: 'cae' },
        cartuchas: [{ clave: 'safari.p1.b.cart', t: 7.1, pos: [0.02, 0.06], giro: 0.012 }],
        bocadillos: [
          { clave: 'safari.p1.b.b1', t: 8.4, pos: [0.6, 0.2] },
          { clave: 'safari.p1.b.b2', t: 10.4, pos: [0.19, 0.58] },
        ],
      },
      {
        escena: 'mapa',
        poli: [[0.63, 0.5251], [1, 0.5], [1, 1], [0.59, 1]],
        borde: 'redondo',
        entra: { t: 12.2, tipo: 'gira' },
        onos: [{ clave: 'safari.ono.fiu', t: 12.9, pos: [0.66, 0.3], ...AZUL, alto: 0.1, giro: 0.1, sonido: 'fiu' }],
        bocadillos: [{ clave: 'safari.p1.c.b2', t: 14.2, pos: [0.5, 0.74] }],
      },
    ],
    resto: 2.2,
  },
  {
    // Africa: giraffes, an elephant and the horn; and the diploma in the caravan's window.
    musica: 'granjaRadio',
    vinetas: [
      {
        escena: 'sabana',
        poli: [[0, 0], [0.68, 0], [0.64, 1], [0, 1]],
        borde: 'recto',
        entra: { t: 0.3, tipo: 'der' },
        cartuchas: [{ clave: 'safari.p2.a.cart', t: 0.9, pos: [0.02, 0.04], giro: -0.01 }],
        bocadillos: [
          { clave: 'safari.p2.a.b1', t: 2.0, pos: [0.3, 0.19] },
          { clave: 'safari.p2.a.b2', t: 3.9, pos: [0.74, 0.34] },
          { clave: 'safari.p2.a.b3', t: 5.8, pos: [0.3, 0.38] },
          { clave: 'safari.p2.a.b4', t: 9.6, pos: [0.5, 0.18] },
        ],
        onos: [
          { clave: 'safari.ono.piii', t: 7.2, pos: [0.22, 0.58], ...AZUL, alto: 0.15, giro: -0.1, sonido: 'bocina', evento: 'bocina' },
          { clave: 'safari.ono.prru', t: 8.2, pos: [0.76, 0.5], ...VERDE, alto: 0.14, giro: 0.08, sonido: 'trompa', evento: 'trompa' },
        ],
      },
      {
        escena: 'diploma',
        poli: [[0.68, 0], [1, 0], [1, 1], [0.64, 1]],
        borde: 'redondo',
        entra: { t: 2.6, tipo: 'asoma' },
        cartuchas: [{ clave: 'safari.p2.b.cart', t: 3.2, pos: [0.06, 0.04], giro: 0.016 }],
        bocadillos: [
          { clave: 'safari.p2.b.b1', t: 4.6, pos: [0.5, 0.34], dura: 1.9 },
          { clave: 'safari.p2.b.b2', t: 6.6, pos: [0.5, 0.34], dura: 1.7 },
          { clave: 'safari.p2.b.b3', t: 8.4, pos: [0.5, 0.82] },
        ],
      },
    ],
    resto: 2.4,
  },
  {
    // The Atlantic by night: the caravan afloat, an octopus, and kilometre 4,000.
    musica: 'granjaRadio',
    vinetas: [
      {
        escena: 'oceano',
        poli: [[0, 0], [1, 0], [1, 0.66], [0, 0.74]],
        borde: 'ondulado',
        entra: { t: 0.3, tipo: 'cae' },
        cartuchas: [{ clave: 'safari.p3.a.cart', t: 1.0, pos: [0.015, 0.06], giro: -0.012 }],
        bocadillos: [
          { clave: 'safari.p3.a.b1', t: 2.2, pos: [0.42, 0.17] },
          { clave: 'safari.p3.a.b2', t: 4.0, pos: [0.17, 0.35] },
          { clave: 'safari.p3.a.b3', t: 7.6, pos: [0.38, 0.35] },
          { clave: 'safari.p3.a.b4', t: 9.4, pos: [0.52, 0.5] },
        ],
        onos: [{ clave: 'safari.ono.plaf', t: 6.2, pos: [0.7, 0.27], ...AZUL, alto: 0.16, giro: -0.08, sonido: 'plaf', evento: 'plaf' }],
      },
      {
        escena: 'kilometro',
        poli: [[0, 0.74], [1, 0.66], [1, 1], [0, 1]],
        borde: 'recto',
        entra: { t: 11.2, tipo: 'izq' },
        cartuchas: [{ clave: 'safari.p3.b.cart', t: 11.8, pos: [0.015, 0.08], giro: 0.01 }],
        bocadillos: [
          { clave: 'safari.p3.b.b1', t: 12.8, pos: [0.45, 0.34] },
          { clave: 'safari.p3.b.b2', t: 14.6, pos: [0.47, 0.72] },
        ],
      },
    ],
    resto: 2.0,
  },
  {
    // The red rocks of the West, and the desert of Las Vegas at dusk.
    musica: 'granjaRadio',
    vinetas: [
      {
        escena: 'canon',
        poli: [[0, 0], [0.46, 0], [0.42, 1], [0, 1]],
        borde: 'dientes',
        entra: { t: 0.3, tipo: 'izq' },
        cartuchas: [{ clave: 'safari.p4.a.cart', t: 0.9, pos: [0.04, 0.04], giro: -0.012 }],
        bocadillos: [
          { clave: 'safari.p4.a.b1', t: 2.0, pos: [0.3, 0.27] },
          { clave: 'safari.p4.a.b2', t: 3.9, pos: [0.7, 0.36] },
          { clave: 'safari.p4.a.b3', t: 7.0, pos: [0.26, 0.5] },
        ],
        onos: [{ clave: 'safari.ono.crac', t: 5.8, pos: [0.73, 0.58], ...ROJO, alto: 0.13, giro: 0.1, sonido: 'crac', evento: 'crac' }],
      },
      {
        escena: 'vegas',
        musica: 'pasodoble',
        poli: [[0.46, 0], [1, 0], [1, 1], [0.42, 1]],
        borde: 'marquesina',
        entra: { t: 9.2, tipo: 'cae' },
        cartuchas: [{ clave: 'safari.p4.b.cart', t: 9.9, pos: [0.04, 0.04], giro: 0.01 }],
        onos: [{ clave: 'safari.ono.frena', t: 10.3, pos: [0.7, 0.15], ...ROSA, alto: 0.08, giro: -0.06, sonido: 'frena' }],
        bocadillos: [
          { clave: 'safari.p4.b.b1', t: 12.4, pos: [0.26, 0.2] },
          { clave: 'safari.p4.b.b2', t: 14.6, pos: [0.72, 0.31] },
          { clave: 'safari.p4.b.b3', t: 17.2, pos: [0.42, 0.6] },
          { clave: 'safari.p4.b.b4', t: 20.4, pos: [0.24, 0.45], grito: false },
        ],
      },
    ],
    resto: 4.6,
  },
];

// ---------------------------------------------------------------- the panels' shapes

/** Moves every edge of a convex polygon inward by its own distance and joins them again. */
function hundir(pts: P[], d: number[]): P[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sg = area >= 0 ? 1 : -1;
  const rectas = pts.map((a, i) => {
    const b = pts[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    return { px: a[0] + sg * (-dy / L) * d[i], py: a[1] + sg * (dx / L) * d[i], dx, dy };
  });
  return pts.map((_, i) => {
    const p = rectas[(i + n - 1) % n];
    const q = rectas[i];
    const den = p.dx * q.dy - p.dy * q.dx;
    if (Math.abs(den) < 1e-9) return [q.px, q.py] as P;
    const u = ((q.px - p.px) * q.dy - (q.py - p.py) * q.dx) / den;
    return [p.px + p.dx * u, p.py + p.dy * u] as P;
  });
}

/** The path of a panel's edge in the chosen style. Coordinates are relative to `o` (the panel's origin). */
function trazar(pts: P[], borde: Borde, o: P): Path2D {
  const p = new Path2D();
  const q = pts.map(([a, b]) => [a - o[0], b - o[1]] as P);
  const n = q.length;
  if (borde === 'redondo') {
    const R = 16;
    for (let i = 0; i < n; i++) {
      const a = q[(i + n - 1) % n];
      const b = q[i];
      const c = q[(i + 1) % n];
      const m1: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const m2: P = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
      if (i) p.lineTo(m1[0] + (b[0] - m1[0]) * 0, m1[1]);
      else p.moveTo(m1[0], m1[1]);
      p.arcTo(b[0], b[1], m2[0], m2[1], R);
    }
    p.closePath();
    return p;
  }
  q.forEach((a, i) => {
    const b = q[(i + 1) % n];
    if (i === 0) p.moveTo(a[0], a[1]);
    if (borde === 'recto' || borde === 'marquesina') {
      p.lineTo(b[0], b[1]);
      return;
    }
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    const nx = -dy / L;
    const ny = dx / L;
    const paso = borde === 'ondulado' ? 4 : 1;
    const pasos = Math.max(2, Math.round(L / (borde === 'ondulado' ? paso : 9)));
    for (let k = 1; k <= pasos; k++) {
      const u = k / pasos;
      let off = 0;
      if (borde === 'ondulado') off = Math.sin((u * L) / 11) * 2.4 * Math.min(1, Math.min(u, 1 - u) * L / 14);
      else off = (k % 2 ? 1 : -1) * 3.4 * (k === pasos ? 0 : 1);
      p.lineTo(a[0] + dx * u + nx * off, a[1] + dy * u + ny * off);
    }
  });
  p.closePath();
  return p;
}

// ---------------------------------------------------------------- the page

interface ElementoVivo {
  t: number;
  hecho: boolean;
  /** What happens when its time comes. */
  suena?: Sonido;
  /** Tidying (a bubble going away): the taps do not wait for it and it does not hold the page. */
  silencioso?: boolean;
  lanzar: () => void;
}

interface VinetaViva {
  datos: DatosVineta;
  caja: HTMLElement;
  vista: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  /** Where its bounding box sits inside the page's area, and its size (CSS px); `pad` is the margin around the shape. */
  bx: number;
  by: number;
  bw: number;
  bh: number;
  pad: number;
  dp: number;
  clip: Path2D;
  marco: HTMLCanvasElement[];
  escena: Escena | null;
  entrada: boolean;
  /** Seconds, on the page's clock, at which each named onomatopoeia came. */
  eventos: Record<string, number>;
}

interface PaginaViva {
  el: HTMLElement;
  area: HTMLElement;
  vinetas: VinetaViva[];
  eventos: ElementoVivo[];
  fin: number;
  datos: DatosPagina;
}

/** A small tile of speckled paper, made once for every page. */
let papel: string | null = null;
function fibra() {
  if (papel) return papel;
  const [c, x] = lienzo(160, 160, 1);
  x.fillStyle = PAPEL;
  x.fillRect(0, 0, 160, 160);
  let s = 12345;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 700; i++) {
    x.fillStyle = r() < 0.5 ? 'rgba(140,100,60,0.055)' : 'rgba(255,255,255,0.18)';
    x.fillRect(r() * 160, r() * 160, 1 + r() * 1.4, 1 + r() * 1.4);
  }
  papel = c.toDataURL('image/png');
  c.width = c.height = 0;
  return papel;
}

const nada = () => undefined;

export function jugarSafari(parent: HTMLElement, o: OpcionesSafari = {}): Promise<Resultado> {
  const rapido = o.rapido ?? false;
  const { sonido } = o;
  const saltar = h('button', { class: 'btn fantasma saltar' }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const mesa = h('div', { class: 'safari-mesa' });
  const sonda = h('div', { class: 'safari-sonda' });
  const capa = h('div', { class: 'cubierta minijuego safari' }, mesa, sonda, saltar, cerrar);
  capa.style.setProperty('--papel', `url(${fibra()})`);
  parent.append(capa);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  /** The page's area (inside the safe margins), in CSS px. */
  let AW = 800;
  let AH = 360;
  const medir = () => {
    const r = sonda.getBoundingClientRect();
    AW = Math.max(200, r.width);
    AH = Math.max(120, r.height);
  };
  medir();

  const fuentes = document.fonts
    ? Promise.race([
        Promise.all([document.fonts.load('800 16px "Alegreya Sans"'), document.fonts.load('400 16px Graduate')]).then(() => undefined),
        new Promise<void>((r) => setTimeout(r, 1800)),
      ])
    : Promise.resolve();

  // ---------------------------------------------------------------- building a page
  const pausa = () => new Promise<void>((r) => setTimeout(r, 0));

  const construir = async (n: number): Promise<PaginaViva> => {
    const datos = PAGINAS[n];
    const area = h('div', { class: 'safari-area' });
    const el = h('div', { class: 'safari-pagina' }, area);
    const textos = h('div', { class: 'safari-textos' });
    const vinetas: VinetaViva[] = [];
    const eventos: ElementoVivo[] = [];
    const margen = 11;
    const canal = 10;
    const dp = Math.min(dpr, 1.5);
    const tam = Math.round(acota(AH * 0.042, 14, 18));
    for (const d of datos.vinetas) {
      const unidad = d.poli;
      const enBorde = (a: P, b: P) => (a[0] === 0 && b[0] === 0) || (a[0] === 1 && b[0] === 1) || (a[1] === 0 && b[1] === 0) || (a[1] === 1 && b[1] === 1);
      const dist = unidad.map((a, i) => (enBorde(a, unidad[(i + 1) % unidad.length]) ? margen : canal / 2));
      const px = hundir(unidad.map(([a, b]) => [a * AW, b * AH] as P), dist);
      const xs = px.map((q) => q[0]);
      const ys = px.map((q) => q[1]);
      const pad = 8;
      const bx = Math.min(...xs);
      const by = Math.min(...ys);
      const bw = Math.max(...xs) - bx;
      const bh = Math.max(...ys) - by;
      const cw = bw + pad * 2;
      const ch = bh + pad * 2;
      const clip = trazar(px, d.borde, [bx - pad, by - pad]);
      // The shadow under the panel, soft and offset, baked once.
      const [sombra, sx] = lienzo(cw + 8, ch + 8, dp);
      sx.shadowColor = 'rgba(43,28,32,0.5)';
      sx.shadowBlur = 7;
      sx.shadowOffsetX = 2.5;
      sx.shadowOffsetY = 3.5;
      sx.fillStyle = '#2b1c20';
      sx.fill(clip);
      // The frame: a soft shade along the edges with a halftone in the corners, then the ink line. «Marquesina» (the Las
      // Vegas panel) adds a ring of bulbs, two sets that take turns to blink.
      const marcos = (d.borde === 'marquesina' ? [0, 1] : [0]).map((fase) => {
        const [mc, m] = lienzo(cw, ch, dp);
        m.save();
        m.clip(clip);
        m.lineJoin = 'round';
        m.strokeStyle = 'rgba(43,28,32,0.2)';
        m.lineWidth = 22;
        m.stroke(clip);
        m.strokeStyle = 'rgba(43,28,32,0.2)';
        m.lineWidth = 10;
        m.stroke(clip);
        const esquinas: P[] = [[pad, pad], [pad + bw, pad], [pad, pad + bh], [pad + bw, pad + bh]];
        for (const [qx, qy] of esquinas) trama(m, pad, pad, pad + bw, pad + bh, 'rgba(43,28,32,0.5)', (a, b) => 1 - Math.hypot(a - qx, b - qy) / Math.min(70, bh * 0.45), 4.6, 1.5);
        m.restore();
        m.strokeStyle = TINTA;
        m.lineWidth = 3.4;
        m.lineJoin = 'round';
        m.stroke(clip);
        m.strokeStyle = 'rgba(251,243,223,0.55)';
        m.lineWidth = 1;
        m.save();
        m.clip(clip);
        m.translate(0, 0);
        m.lineWidth = 2;
        m.strokeStyle = 'rgba(255,240,200,0.35)';
        m.setLineDash([]);
        m.stroke(clip);
        m.restore();
        if (d.borde === 'marquesina') {
          const bombillas: P[] = [];
          for (let i = 0; i < px.length; i++) {
            const a = px[i];
            const b = px[(i + 1) % px.length];
            const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const k = Math.floor(L / 17);
            for (let j = 0; j < k; j++) bombillas.push([a[0] + ((b[0] - a[0]) * (j + 0.5)) / k - bx + pad, a[1] + ((b[1] - a[1]) * (j + 0.5)) / k - by + pad]);
          }
          bombillas.forEach(([qx, qy], j) => {
            const on = j % 2 === fase;
            const g = m.createRadialGradient(qx, qy, 0, qx, qy, on ? 9 : 5);
            g.addColorStop(0, on ? 'rgba(255,238,170,1)' : 'rgba(255,200,110,0.55)');
            g.addColorStop(0.4, on ? 'rgba(255,190,80,0.7)' : 'rgba(255,170,70,0.25)');
            g.addColorStop(1, 'rgba(255,160,60,0)');
            m.fillStyle = g;
            m.fillRect(qx - 10, qy - 10, 20, 20);
            m.beginPath();
            m.arc(qx, qy, 2.6, 0, Math.PI * 2);
            m.fillStyle = on ? '#fff3c0' : '#9a6a30';
            m.fill();
            m.lineWidth = 1;
            m.strokeStyle = TINTA;
            m.stroke();
          });
        }
        return mc;
      });
      const vista = h('canvas', { class: 'safari-vista', 'aria-hidden': 'true' });
      vista.width = Math.round(cw * dp);
      vista.height = Math.round(ch * dp);
      Object.assign(vista.style, { width: `${cw}px`, height: `${ch}px` });
      const sombraEl = sombra;
      Object.assign(sombraEl.style, { width: `${cw + 8}px`, height: `${ch + 8}px`, left: '-4px', top: '-4px' });
      sombraEl.className = 'safari-sombra';
      const caja = h('div', { class: 'safari-vineta' }, sombraEl, vista);
      Object.assign(caja.style, { left: `${bx - pad}px`, top: `${by - pad}px`, width: `${cw}px`, height: `${ch}px`, visibility: 'hidden' });
      area.append(caja);
      const x = vista.getContext('2d')!;
      vinetas.push({ datos: d, caja, vista, x, bx, by, bw, bh, pad, dp, clip, marco: marcos, escena: null, entrada: false, eventos: {} });
    }
    el.append(textos);
    // The shots' scenery (the heavy part) is baked one panel at a time, giving the frames room in between.
    await fuentes;
    for (const v of vinetas) {
      v.escena = ESCENAS[v.datos.escena]({ w: v.bw, h: v.bh, dp: v.dp });
      await pausa();
    }
    // The bubbles, boxes and onomatopoeias, baked and waiting.
    for (const v of vinetas) {
      const d = v.datos;
      const ancla = v.escena!.ventana;
      const tipPx: P = [v.bx + ancla[0] * v.bw, v.by + ancla[1] * v.bh];
      const maxAncho = acota(v.bw * 0.3, 110, 196);
      const poner = (img: HTMLCanvasElement, w: number, hh: number, izq: number, arriba: number, origen: P, clase: string) => {
        const pos = h('div', { class: `safari-pop ${clase}` });
        // Never out of the page.
        const l = acota(izq, 4, AW - w - 4);
        const a = acota(arriba, 4, AH - hh - 4);
        Object.assign(pos.style, { left: `${l}px`, top: `${a}px`, width: `${w}px`, height: `${hh}px`, transformOrigin: `${origen[0] + (izq - l)}px ${origen[1] + (arriba - a)}px`, visibility: 'hidden' });
        Object.assign(img.style, { width: `${w}px`, height: `${hh}px` });
        const dentro = h('div', { class: 'safari-flota' }, img);
        dentro.style.animationDelay = `${-Math.random() * 2.4}s`;
        pos.append(dentro);
        textos.append(pos);
        return pos;
      };
      for (const c of d.cartuchas ?? []) {
        const cart = hornearCartucha(texto(c.clave), tam, acota(v.bw * 0.5, 130, 250), Math.min(dpr, 2));
        const pos = poner(cart.img, cart.w, cart.h, v.bx + c.pos[0] * v.bw, v.by + c.pos[1] * v.bh, [0, 0], 'cartucha');
        pos.style.setProperty('--giro', `${(c.giro ?? 0) * 57.3}deg`);
        eventos.push({ t: d.entra.t + (c.t - d.entra.t), hecho: false, lanzar: () => animar(pos, 'cartucha') });
      }
      for (const b of d.bocadillos ?? []) {
        const cx = v.bx + b.pos[0] * v.bw;
        const cy = v.by + b.pos[1] * v.bh;
        const bub: Bocadillo = hornearBocadillo(texto(b.clave), tam, maxAncho, [tipPx[0] - cx, tipPx[1] - cy], Math.min(dpr, 2), b.grito);
        const pos = poner(bub.img, bub.w, bub.h, cx - bub.centro[0], cy - bub.centro[1], bub.punta, 'bocadillo');
        eventos.push({ t: b.t, hecho: false, suena: undefined, lanzar: () => (animar(pos, 'bocadillo'), suena('pop')) });
        if (b.dura) eventos.push({ t: b.t + b.dura, hecho: false, silencioso: true, lanzar: () => retirar(pos) });
      }
      for (const on of d.onos ?? []) {
        const alto = AH * on.alto;
        const ono = hornearOno(texto(on.clave), { letra: on.letra, rafaga: on.rafaga, rafaga2: on.rafaga2, alto, dpr: Math.min(dpr, 2), giro: on.giro, semilla: on.clave.length * 3 + 1 });
        const pos = poner(ono.img, ono.w, ono.h, v.bx + on.pos[0] * v.bw - ono.w / 2, v.by + on.pos[1] * v.bh - ono.h / 2, [ono.w / 2, ono.h / 2], 'ono');
        eventos.push({
          t: on.t,
          hecho: false,
          suena: on.sonido,
          lanzar: () => {
            animar(pos, 'ono');
            suena(on.sonido);
            if (on.evento) v.eventos[on.evento] = -1;
          },
        });
      }
      // The panel itself coming in.
      eventos.push({
        t: d.entra.t,
        hecho: false,
        lanzar: () => {
          entrar(v);
          if (d.musica) sonido?.musica(d.musica, 0.4);
        },
      });
      await pausa();
    }
    eventos.sort((a, b) => a.t - b.t);
    const ultimo = Math.max(0, ...eventos.filter((q) => !q.silencioso).map((q) => q.t));
    return { el, area, vinetas, eventos, fin: ultimo + (datos.resto ?? 2.4), datos };
  };

  // ---------------------------------------------------------------- the effects of things coming in
  const suena = (tipo: Sonido | 'pop' | 'pagina' | 'panel') => {
    const s = sonido;
    if (!s) return;
    try {
      if (tipo === 'pop') s.tono?.(560 + Math.random() * 120, 0.07, 'triangle', 0.05, 0, 260);
      else if (tipo === 'panel') s.ruido?.(0.16, 0.1, 1800);
      else if (tipo === 'pagina') s.ruido?.(0.4, 0.12, 900);
      else if (tipo === 'brum') {
        s.tono?.(88, 0.7, 'sawtooth', 0.12, 0, -30);
        s.ruido?.(0.5, 0.12, 260);
      } else if (tipo === 'plaf') {
        s.ruido?.(0.3, 0.3, 1200);
        s.tono?.(210, 0.18, 'sine', 0.2, 0, -150);
      } else if (tipo === 'bocina') {
        s.tono?.(392, 0.5, 'square', 0.06);
        s.tono?.(494, 0.5, 'square', 0.05);
      } else if (tipo === 'trompa') {
        s.tono?.(180, 0.9, 'sawtooth', 0.09, 0, 120);
        s.tono?.(250, 0.8, 'square', 0.04, 0.05, 160);
      } else if (tipo === 'crac') {
        s.ruido?.(0.14, 0.4, 3600);
        s.tono?.(120, 0.2, 'square', 0.1, 0, -60);
      } else if (tipo === 'fiu') s.tono?.(900, 0.5, 'sine', 0.05, 0, -500);
      else if (tipo === 'frena') {
        s.ruido?.(0.9, 0.22, 3200);
        s.tono?.(780, 0.8, 'sawtooth', 0.04, 0, -520);
      }
    } catch {
      /* the sound is a trimming */
    }
  };

  const retirar = (el: HTMLElement) => {
    if (rapido) {
      el.style.visibility = 'hidden';
      return;
    }
    const a = el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(0.94)' }], { duration: 320, easing: 'ease-in', fill: 'forwards' });
    void a.finished.then(() => (el.style.visibility = 'hidden')).catch(nada);
  };

  const animar = (el: HTMLElement, tipo: 'bocadillo' | 'cartucha' | 'ono') => {
    el.style.visibility = '';
    if (rapido) return;
    if (tipo === 'bocadillo') {
      el.animate(
        [
          { transform: 'scale(0.05) rotate(-8deg)', opacity: 0 },
          { transform: 'scale(1.2) rotate(3deg)', opacity: 1, offset: 0.5 },
          { transform: 'scale(0.93) rotate(-1deg)', offset: 0.75 },
          { transform: 'scale(1) rotate(0)' },
        ],
        { duration: 520, easing: 'ease-out', fill: 'backwards' },
      );
    } else if (tipo === 'cartucha') {
      el.animate(
        [
          { transform: 'translateY(-18px) rotate(-4deg) scale(0.92)', opacity: 0 },
          { transform: 'translateY(3px) rotate(0.5deg) scale(1.02)', opacity: 1, offset: 0.65 },
          { transform: 'translateY(0) rotate(0) scale(1)' },
        ],
        { duration: 380, easing: 'ease-out', fill: 'backwards' },
      );
    } else {
      el.animate(
        [
          { transform: 'scale(0.1) rotate(-14deg)', opacity: 0 },
          { transform: 'scale(1.35) rotate(5deg)', opacity: 1, offset: 0.35 },
          { transform: 'scale(0.9) rotate(-3deg)', offset: 0.55 },
          { transform: 'scale(1.06) rotate(1.5deg)', offset: 0.75 },
          { transform: 'scale(1) rotate(0)' },
        ],
        { duration: 560, easing: 'ease-out', fill: 'backwards' },
      );
      // A short tremble afterwards, like it is still ringing.
      el.firstElementChild?.animate(
        [{ transform: 'translate(0,0)' }, { transform: 'translate(2px,-1.5px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(1.5px,1.5px)' }, { transform: 'translate(0,0)' }],
        { duration: 160, iterations: 7, delay: 560 },
      );
    }
  };

  const entrar = (v: VinetaViva) => {
    v.entrada = true;
    v.caja.style.visibility = '';
    suena('panel');
    if (rapido) return;
    const e = v.datos.entra.tipo;
    const d = 640;
    const f = 'backwards';
    if (e === 'izq')
      v.caja.animate([{ transform: 'translateX(-115%) rotate(-5deg)' }, { transform: 'translateX(2.5%) rotate(0.8deg)', offset: 0.72 }, { transform: 'none' }], { duration: d, easing: 'cubic-bezier(.2,.7,.3,1)', fill: f });
    else if (e === 'der')
      v.caja.animate([{ transform: 'translateX(115%) rotate(5deg)' }, { transform: 'translateX(-2.5%) rotate(-0.8deg)', offset: 0.72 }, { transform: 'none' }], { duration: d, easing: 'cubic-bezier(.2,.7,.3,1)', fill: f });
    else if (e === 'cae')
      v.caja.animate(
        [
          { transform: 'translateY(-125%) rotate(-3deg)' },
          { transform: 'translateY(4%) rotate(0.8deg)', offset: 0.55 },
          { transform: 'translateY(-2.4%)', offset: 0.72 },
          { transform: 'translateY(0.8%)', offset: 0.86 },
          { transform: 'none' },
        ],
        { duration: 760, easing: 'cubic-bezier(.5,0,.8,.6)', fill: f },
      );
    else if (e === 'gira')
      v.caja.animate([{ transform: 'scale(0.15) rotate(-35deg)', opacity: 0 }, { transform: 'scale(1.07) rotate(4deg)', opacity: 1, offset: 0.65 }, { transform: 'none' }], { duration: d, easing: 'ease-out', fill: f });
    else
      v.caja.animate([{ transform: 'scale(0.3) translateY(30%)', opacity: 0 }, { transform: 'scale(1.06) translateY(-2%)', opacity: 1, offset: 0.7 }, { transform: 'none' }], { duration: d, easing: 'ease-out', fill: f });
    // The page shudders when something falls onto it.
    if (e === 'cae') pagina?.el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(3px)', offset: 0.3 }, { transform: 'translateY(-1.5px)', offset: 0.55 }, { transform: 'translateY(0)' }], { duration: 300, delay: 380 });
  };

  // ---------------------------------------------------------------- the loop
  let pagina: PaginaViva | null = null;
  let siguiente: Promise<PaginaViva> | null = null;
  let siguienteN = -1;
  let nPagina = Math.max(0, Math.min(PAGINAS.length - 1, o.pagina ?? 0));
  let tp = 0;
  let girando = false;
  let vivo = true;
  let fotogramas = 0;
  let ultimoToque = 0;
  let resolver: (r: Resultado) => void = nada;

  const soltarPagina = (p: PaginaViva) => {
    for (const v of p.vinetas) {
      v.escena?.liberar();
      v.vista.width = v.vista.height = 0;
      for (const m of v.marco) m.width = m.height = 0;
    }
    p.el.remove();
  };

  const pintarVineta = (v: VinetaViva, t: number) => {
    const { x, dp, pad } = v;
    x.setTransform(dp, 0, 0, dp, 0, 0);
    x.clearRect(0, 0, v.bw + pad * 2, v.bh + pad * 2);
    x.save();
    x.clip(v.clip);
    x.translate(pad, pad);
    v.escena!.pintar(x, t, v.eventos);
    x.restore();
    x.drawImage(v.marco[v.marco.length > 1 ? Math.floor(t * 2.2) % v.marco.length : 0], 0, 0, v.bw + pad * 2, v.bh + pad * 2);
  };

  const fin = (r: Resultado) => {
    if (!vivo) return;
    vivo = false;
    delete (window as unknown as { __safari?: unknown }).__safari;
    if (r !== 'hecho') sonido?.pararMusica(0.6);
    const sal = () => {
      if (pagina) soltarPagina(pagina);
      void siguiente?.then(soltarPagina);
      capa.remove();
      resolver(r);
    };
    if (r === 'hecho' && !rapido) {
      capa.classList.add('sale');
      setTimeout(sal, 600);
    } else sal();
  };

  const cambiarA = async (n: number, t = 0) => {
    const previa = siguiente && siguienteN === n ? siguiente : null;
    if (!previa) void siguiente?.then(soltarPagina);
    siguiente = null;
    const nueva = await (previa ?? construir(n));
    if (pagina) soltarPagina(pagina);
    pagina = nueva;
    nPagina = n;
    mesa.replaceWith(mesa);
    capa.insertBefore(nueva.el, saltar);
    tp = t;
    pagina.eventos.forEach((e) => (e.hecho = false));
    sonido?.musica(PAGINAS[n].musica, 0.4);
  };

  const preparar = () => {
    if (nPagina + 1 < PAGINAS.length && !siguiente) {
      siguienteN = nPagina + 1;
      siguiente = construir(siguienteN);
    }
  };

  const pasarPagina = async () => {
    if (girando || !pagina) return;
    if (nPagina + 1 >= PAGINAS.length) return fin('hecho');
    girando = true;
    preparar();
    const vieja = pagina;
    const nueva = await siguiente!;
    siguiente = null;
    medir();
    capa.insertBefore(nueva.el, vieja.el);
    nueva.el.classList.add('debajo');
    suena('pagina');
    if (rapido) {
      soltarPagina(vieja);
    } else {
      const giro = vieja.el.animate(
        [
          { transform: 'perspective(1500px) rotateY(0deg)', filter: 'brightness(1)', offset: 0 },
          { transform: 'perspective(1500px) rotateY(-38deg)', filter: 'brightness(0.92)', offset: 0.45 },
          { transform: 'perspective(1500px) rotateY(-100deg) translateX(-4%)', filter: 'brightness(0.7)', offset: 1 },
        ],
        { duration: 760, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' },
      );
      nueva.el.animate([{ filter: 'brightness(0.78)' }, { filter: 'brightness(1)' }], { duration: 760, easing: 'ease-out' });
      await giro.finished.catch(nada);
      soltarPagina(vieja);
    }
    nueva.el.classList.remove('debajo');
    pagina = nueva;
    nPagina++;
    tp = 0;
    girando = false;
    sonido?.musica(PAGINAS[nPagina].musica, 0.4);
    // The next page is baked while this one is read.
    setTimeout(preparar, 600);
  };

  return new Promise<Resultado>((resolve) => {
    resolver = resolve;
    let ultimo = performance.now();
    let hecho = false;
    const paso = (ahora: number) => {
      if (!vivo) return;
      requestAnimationFrame(paso);
      // Phone held upright: the notice covers it. Time does not pass.
      if (esVertical()) {
        ultimo = ahora;
        return;
      }
      if (ahora - ultimo < 1000 / 60 - 4) return;
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      if (!pagina) return;
      if (!girando) {
        tp += dt * (rapido ? 5 : 1);
        for (const e of pagina.eventos) {
          if (!e.hecho && tp >= e.t) {
            e.hecho = true;
            e.lanzar();
          }
        }
        for (const v of pagina.vinetas) for (const k of Object.keys(v.eventos)) v.eventos[k] = v.eventos[k] < 0 ? 0 : v.eventos[k] + dt;
        if (!hecho && tp >= pagina.fin) {
          hecho = true;
          void pasarPagina().then(() => (hecho = false));
        }
      }
      for (const v of pagina.vinetas) if (v.entrada) pintarVineta(v, Math.max(0, tp - v.datos.entra.t));
      fotogramas++;
    };
    // The first page, baked while the cream cover shows; the music begins with it.
    void (async () => {
      await cambiarA(nPagina, 0);
      if (!vivo) return;
      ultimo = performance.now();
      requestAnimationFrame(paso);
      setTimeout(preparar, 900);
    })();
    // A tap brings the next thing in at once; with everything in, it turns the page.
    capa.addEventListener('click', (e) => {
      e.stopPropagation();
      if (esVertical() || girando || !pagina) return;
      const ahora = performance.now();
      if (ahora - ultimoToque < 320) return;
      ultimoToque = ahora;
      const falta = pagina.eventos.find((q) => !q.hecho && !q.silencioso);
      if (falta) tp = Math.max(tp, falta.t + 0.01);
      else if (tp > pagina.fin - (pagina.datos.resto ?? 2.4) + 0.7) void pasarPagina();
    });
    saltar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('saltado');
    });
    cerrar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('cancelado');
    });
    (window as unknown as { __safari: unknown }).__safari = () => ({
      get pagina() {
        return nPagina;
      },
      /** The first page is built and the loop is running. */
      get listo() {
        return pagina !== null;
      },
      get tp() {
        return tp;
      },
      fotogramas,
      cerrar: () => fin('saltado'),
      /** For the tests: jump to page `n`, at time `t` of it. */
      ir: async (n: number, t = 0) => {
        girando = true;
        await cambiarA(n, t);
        // Everything before `t` is shown at once.
        pagina?.eventos.forEach((q) => {
          if (q.t <= t) {
            q.hecho = true;
            q.lanzar();
          }
        });
        girando = false;
      },
    });
  });
}
