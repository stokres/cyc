// The painted backgrounds of «Una más»: each zone has five LAYERS (four behind the game, one in front) that scroll at different speeds
// (parallax). Every layer is ONE image — a bitmap baked once when the zone opens (docs/ESTILO.md T5), and the frame only blits it, wrapped.
//
// THE SLOT FOR REAL PAINTINGS. A layer is exactly an image, so a hand-painted (or generated) one can take its place without touching the game:
// list its file in `FONDOS_PINTADOS` (below) under the zone and the layer index (0 = the farthest sky … 3 = the nearest wall, 4 = the foreground
// that passes in front of Fran). Files go in `public/conceptos/fondos/` and are fetched as `BASE_URL + 'conceptos/fondos/' + name`.
// Format: PNG or WebP, 2560 × 1440 px (it is shown at 1280 × 720 game units, twice the resolution), tileable left to right; layers 1–4 with
// transparency (the sky, 0, is opaque). The game places layer `i` with its bottom edge on the bottom of the screen and shifts it a little
// up and down when the camera climbs. `?fondos=0` forces the baked ones (to compare).
import type { Zona } from './datos';
import { texturar } from '../capitulos/conceptos-rig';
import { VISTA_ALTO } from './mundo';

/** zone → file name of each layer (index 0..4); leave a hole (undefined) to keep the baked one. */
export const FONDOS_PINTADOS: Partial<Record<Zona, (string | undefined)[]>> = {};

// The AI-painted backdrops (2400 x 1018, Silksong style) that Jesus approved: the farthest, slowest layer of each zone. Vite gives each its URL.
import urlRecibidor from './fondos/recibidor.webp?url';
import urlRecibidorBoca from './fondos/recibidor-boca.webp?url';
import urlJardin from './fondos/jardin.webp?url';
import urlBandeja from './fondos/bandeja.webp?url';
import urlTeatro from './fondos/teatro.webp?url';
import urlGrifo from './fondos/grifo.webp?url';

/** Painted backdrop of each zone (`grifo`, the boss arena with its own bar counter, is for a fixed camera and is used when that room exists). */
export const CIELOS_PINTADOS = { recibidor: urlRecibidor, jardin: urlJardin, bandeja: urlBandeja, teatro: urlTeatro, grifo: urlGrifo } as const;
/** The first room of the Recibidor, inside Vero's mouth (arch of teeth). */
const CIELO_BOCA = urlRecibidorBoca;

export interface Capa {
  img: CanvasImageSource;
  /** Size in game units (it tiles horizontally). */
  w: number;
  h: number;
  /** How much it follows the camera (0 = glued to the screen, 1 = with the world). */
  f: number;
  /** Drawn in front of the game. */
  frente?: boolean;
  /** The arena of LA ÚLTIMA: the layer sits still, centred, with its bottom on the bottom of the view (jefe-ultima.ts). */
  fija?: boolean;
  /** Opacity (0 hides it); the code layers are toned down when a painted backdrop sits behind them. */
  alfa?: number;
  /** Rows (in game units of the layer) that hold something: a layer that is mostly empty (the foreground) only blits these bands. */
  bandas?: [number, number][];
}

export interface Fondo {
  zona: Zona;
  capas: Capa[];
  /** Colour of the haze (for the vignette and the mist). */
  niebla: string;
  /** The tint of the grade laid over everything. */
  tinte: string;
  /** Colour of the motes of light that float. */
  motas: string[];
  /** The painted backdrops already decoded (the zone's, and the mouth variant of the first room). */
  pint?: { normal?: HTMLImageElement; boca?: HTMLImageElement };
}

export const LW = 1280;
export const LH = 720;
const PX = 1;

function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
};

interface Pal {
  cielo: string[];
  sol: string;
  /** Silhouette bodies, far to near, and the rim of light on their lit edge. */
  cuerpo: string[];
  borde: string[];
  niebla: string;
  rayos: string;
}

const PALETA: Record<Zona, Pal> = {
  recibidor: {
    cielo: ['#12052b', '#35106e', '#7a2290', '#d6507a', '#ffae6a'],
    sol: '#ffd27a',
    cuerpo: ['#5a2a8a', '#3e1a6c', '#2a1050', '#150630'],
    borde: ['#ff9ec0', '#ffb36a', '#ffcf6a', '#ffcf6a'],
    niebla: '#b05aa0',
    rayos: '#ffd9a0',
  },
  jardin: {
    cielo: ['#040d2a', '#0b2a5e', '#14607a', '#2a9a96', '#5ac0a0'],
    sol: '#d8f4ff',
    cuerpo: ['#6a3a86', '#4a2468', '#301048', '#170636'],
    borde: ['#ffb0d8', '#ffc88a', '#ffd88a', '#ffe0a0'],
    niebla: '#a868a8',
    rayos: '#ffe2b0',
  },
  bandeja: {
    cielo: ['#14123a', '#2e2e6e', '#5a5a9a', '#9a96c0', '#d8cde4'],
    sol: '#fff0d8',
    cuerpo: ['#6a68a0', '#4a4882', '#303060', '#16153a'],
    borde: ['#e8e0ff', '#ffd9c0', '#ffe0a8', '#ffe8b0'],
    niebla: '#9a94c8',
    rayos: '#ffe8c0',
  },
  teatro: {
    cielo: ['#2a0a1e', '#5a1a38', '#8a2a4a', '#b8505a', '#e89a6a'],
    sol: '#ffd9a0',
    cuerpo: ['#8a3050', '#62203e', '#3e1230', '#1c0618'],
    borde: ['#ffb08a', '#ffc27a', '#ffd88a', '#ffe0a0'],
    niebla: '#a8506a',
    rayos: '#ffd0a0',
  },
  grifo: {
    cielo: ['#1a0a2a', '#3a1a48', '#6a2a58', '#a85a5a', '#e8a85a'],
    sol: '#ffd070',
    cuerpo: ['#6a3a5a', '#4a2448', '#2e1238', '#160620'],
    borde: ['#ffc08a', '#ffd070', '#ffe090', '#fff0a8'],
    niebla: '#b8688a',
    rayos: '#ffd890',
  },
};

// ---------------------------------------------------------------- a silhouette: a body with a rim of light on its lit side

type Trazar = (p: Path2D) => void;

/** Fills `trazo` with `cuerpo` over a copy shifted up-left in the rim colour, so the lit edge shows as a thin line of light. */
function silueta(x: CanvasRenderingContext2D, trazo: Trazar, cuerpo: string | CanvasGradient, borde: string, grosor = 3) {
  const p = new Path2D();
  trazo(p);
  x.save();
  x.translate(-grosor * 0.8, -grosor);
  x.fillStyle = borde;
  x.fill(p);
  x.restore();
  x.fillStyle = cuerpo;
  x.fill(p);
}

/** Draws at x and, if it crosses the edge, again one tile away (so the layer wraps without a seam). */
function envuelto(c: CanvasRenderingContext2D, x: number, w: number, dibujar: (dx: number) => void) {
  dibujar(0);
  if (x - w < 0) dibujar(LW);
  if (x + w > LW) dibujar(-LW);
  void c;
}

const arco = (p: Path2D, cx: number, base: number, w: number, h: number) => {
  p.moveTo(cx - w / 2, base);
  p.lineTo(cx - w / 2, base - h + w / 2);
  p.arc(cx, base - h + w / 2, w / 2, Math.PI, 0);
  p.lineTo(cx + w / 2, base);
  p.closePath();
};

function triangulo(p: Path2D, cx: number, base: number, w: number, h: number) {
  p.moveTo(cx - w / 2, base);
  p.lineTo(cx, base - h);
  p.lineTo(cx + w / 2, base);
  p.closePath();
}

/** A tree of stacked triangles (the garden's), with a short trunk. */
function arbol(p: Path2D, cx: number, base: number, w: number, h: number) {
  p.rect(cx - w * 0.06, base - h * 0.2, w * 0.12, h * 0.2);
  for (let i = 0; i < 3; i++) {
    const k = 1 - i * 0.26;
    triangulo(p, cx, base - h * 0.14 - i * h * 0.27, w * k, h * 0.46);
  }
}

function flor(p: Path2D, cx: number, base: number, h: number, petalos = 7, r = 0) {
  const R = r || h * 0.26;
  p.rect(cx - 5, base - h, 10, h);
  const cy = base - h;
  for (let i = 0; i < petalos; i++) {
    const a = (i / petalos) * Math.PI * 2 - Math.PI / 2;
    p.moveTo(cx, cy);
    p.quadraticCurveTo(cx + Math.cos(a - 0.45) * R * 1.2, cy + Math.sin(a - 0.45) * R * 1.2, cx + Math.cos(a) * R * 1.5, cy + Math.sin(a) * R * 1.5);
    p.quadraticCurveTo(cx + Math.cos(a + 0.45) * R * 1.2, cy + Math.sin(a + 0.45) * R * 1.2, cx, cy);
  }
  p.moveTo(cx - 40, base - h * 0.3);
  p.lineTo(cx - 4, base - h * 0.42);
  p.lineTo(cx - 4, base - h * 0.34);
  p.closePath();
}

/** A hanging lamp: a cord and a glowing bulb in a shade. */
function lampara(x: CanvasRenderingContext2D, cx: number, y0: number, largo: number, col: string, glow: string) {
  x.strokeStyle = col;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(cx, y0);
  x.lineTo(cx, y0 + largo);
  x.stroke();
  const g = x.createRadialGradient(cx, y0 + largo + 16, 2, cx, y0 + largo + 16, 120);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.fillStyle = g;
  x.fillRect(cx - 120, y0 + largo - 100, 240, 240);
  x.restore();
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(cx - 22, y0 + largo + 22);
  x.lineTo(cx - 8, y0 + largo);
  x.lineTo(cx + 8, y0 + largo);
  x.lineTo(cx + 22, y0 + largo + 22);
  x.closePath();
  x.fill();
  x.fillStyle = '#fff3c8';
  x.beginPath();
  x.arc(cx, y0 + largo + 22, 8, 0, 6.3);
  x.fill();
}

/** A clock face seen as a pale disc with ticks and hands (the moon of «las tantas», the sun of «mañana»). */
function esfera(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, tinta: string, manos: [number, number] = [-1.2, 0.3]) {
  const g = x.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.55, col);
  g.addColorStop(1, tinta);
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, r, 0, 6.3);
  x.fill();
  x.strokeStyle = tinta;
  x.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    x.lineWidth = i % 3 ? 3 : 6;
    x.globalAlpha = 0.45;
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
    x.lineTo(cx + Math.cos(a) * r * 0.93, cy + Math.sin(a) * r * 0.93);
    x.stroke();
  }
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(cx, cy);
  x.lineTo(cx + Math.cos(manos[0]) * r * 0.5, cy + Math.sin(manos[0]) * r * 0.5);
  x.moveTo(cx, cy);
  x.lineTo(cx + Math.cos(manos[1]) * r * 0.7, cy + Math.sin(manos[1]) * r * 0.7);
  x.stroke();
  x.globalAlpha = 1;
}

function rayos(x: CanvasRenderingContext2D, ox: number, oy: number, col: string, n: number, r: () => number, alfa = 0.14, largo = 1000) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
    const w = 0.03 + r() * 0.07;
    const g = x.createLinearGradient(ox, oy, ox + Math.cos(a) * largo, oy + Math.sin(a) * largo);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = alfa * (0.5 + r());
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(ox, oy);
    x.lineTo(ox + Math.cos(a - w) * largo, oy + Math.sin(a - w) * largo);
    x.lineTo(ox + Math.cos(a + w) * largo, oy + Math.sin(a + w) * largo);
    x.closePath();
    x.fill();
  }
  x.restore();
}

function niebla(x: CanvasRenderingContext2D, col: string, y0: number, y1: number, alfa: number) {
  const g = x.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, col);
  x.save();
  x.globalAlpha = alfa;
  x.fillStyle = g;
  x.fillRect(0, y0, LW, y1 - y0);
  x.restore();
}

function motas(x: CanvasRenderingContext2D, n: number, col: string, r: () => number, y0 = 0, y1 = LH) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const px = r() * LW;
    const py = y0 + r() * (y1 - y0);
    const s = 1.5 + r() * 3.5;
    const g = x.createRadialGradient(px, py, 0, px, py, s * 4);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = 0.25 + r() * 0.5;
    x.fillStyle = g;
    x.fillRect(px - s * 4, py - s * 4, s * 8, s * 8);
  }
  x.restore();
}

// ---------------------------------------------------------------- the five layers of each zone

function cielo(z: Zona, pal: Pal): HTMLCanvasElement {
  const c = lienzo(LW * PX, LH * PX);
  const x = c.getContext('2d')!;
  x.scale(PX, PX);
  const r = azar(z === 'jardin' ? 11 : 7);
  const g = x.createLinearGradient(0, 0, 0, LH);
  pal.cielo.forEach((col, i) => g.addColorStop(i / (pal.cielo.length - 1), col));
  x.fillStyle = g;
  x.fillRect(0, 0, LW, LH);
  // Soft blotches of colour: the painted sky.
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const px = r() * LW;
    const py = r() * LH * 0.9;
    const rad = 80 + r() * 220;
    const gg = x.createRadialGradient(px, py, 0, px, py, rad);
    gg.addColorStop(0, i % 2 ? pal.rayos : pal.niebla);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = 0.045 + r() * 0.05;
    x.fillStyle = gg;
    x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  x.restore();
  if (z === 'recibidor') {
    // MAÑANA: a low sun behind everything, with its fan of light.
    const g2 = x.createRadialGradient(LW * 0.55, LH * 0.78, 10, LW * 0.55, LH * 0.78, 420);
    g2.addColorStop(0, 'rgba(255,240,200,0.95)');
    g2.addColorStop(0.25, 'rgba(255,190,110,0.55)');
    g2.addColorStop(1, 'rgba(255,120,120,0)');
    x.fillStyle = g2;
    x.fillRect(0, 0, LW, LH);
    x.fillStyle = '#fff0c4';
    x.beginPath();
    x.arc(LW * 0.55, LH * 0.78, 78, 0, 6.3);
    x.fill();
    rayos(x, LW * 0.55, LH * 0.78, pal.rayos, 14, r, 0.12, 900);
  } else {
    // LAS TANTAS: a huge pale clock-moon, and a few stars.
    const g2 = x.createRadialGradient(LW * 0.7, LH * 0.26, 20, LW * 0.7, LH * 0.26, 360);
    g2.addColorStop(0, 'rgba(210,245,255,0.7)');
    g2.addColorStop(1, 'rgba(60,160,200,0)');
    x.fillStyle = g2;
    x.fillRect(0, 0, LW, LH);
    esfera(x, LW * 0.7, LH * 0.26, 96, '#dcefff', '#6a8ac0', [-1.9, 0.35]);
    rayos(x, LW * 0.7, LH * 0.26, pal.rayos, 10, r, 0.1, 900);
  }
  motas(x, 90, '#fff6d8', r, 0, LH * 0.7);
  texturar(c, 0.5);
  return c;
}

function lejos(z: Zona, pal: Pal): HTMLCanvasElement {
  const c = lienzo(LW * PX, LH * PX);
  const x = c.getContext('2d')!;
  x.scale(PX, PX);
  const r = azar(z === 'jardin' ? 21 : 17);
  const base = LH - 30;
  const g = x.createLinearGradient(0, LH * 0.3, 0, LH);
  g.addColorStop(0, pal.cuerpo[0]);
  g.addColorStop(1, pal.niebla);
  if (z === 'recibidor') {
    // Tall arched doorways, like the hall of a house that never ends.
    for (let i = 0; i < 7; i++) {
      const cx = 90 + i * 190 + r() * 40;
      const w = 110 + r() * 80;
      const h = 300 + r() * 220;
      envuelto(x, cx, w, (dx) => silueta(x, (p) => arco(p, cx + dx, base, w, h), g, pal.borde[0], 3));
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const cx = 60 + i * 150 + r() * 50;
      const w = 160 + r() * 120;
      const h = 260 + r() * 260;
      envuelto(x, cx, w, (dx) => silueta(x, (p) => arbol(p, cx + dx, base, w, h), g, pal.borde[0], 3));
    }
  }
  niebla(x, pal.niebla, LH * 0.45, LH, 0.55);
  motas(x, 30, pal.rayos, r, LH * 0.3, LH);
  texturar(c, 0.6);
  return c;
}

function medio(z: Zona, pal: Pal): HTMLCanvasElement {
  const c = lienzo(LW * PX, LH * PX);
  const x = c.getContext('2d')!;
  x.scale(PX, PX);
  const r = azar(z === 'jardin' ? 31 : 37);
  const base = LH - 10;
  const g = x.createLinearGradient(0, LH * 0.35, 0, LH);
  g.addColorStop(0, pal.cuerpo[1]);
  g.addColorStop(1, pal.cuerpo[2]);
  if (z === 'recibidor') {
    // Panelled walls with pictures, coat racks and hanging lamps.
    for (let i = 0; i < 5; i++) {
      const cx = 100 + i * 260 + r() * 40;
      const w = 150 + r() * 60;
      const h = 150 + r() * 90;
      envuelto(x, cx, w, (dx) => {
        silueta(x, (p) => p.rect(cx + dx - w / 2, base - h - 140, w, h), g, pal.borde[1], 3);
        x.fillStyle = 'rgba(255,200,120,0.12)';
        x.fillRect(cx + dx - w / 2 + 10, base - h - 130, w - 20, h - 20);
      });
    }
    for (let i = 0; i < 4; i++) {
      const cx = 180 + i * 330 + r() * 60;
      envuelto(x, cx, 60, (dx) => {
        silueta(x, (p) => {
          p.rect(cx + dx - 5, base - 300, 10, 300);
          p.moveTo(cx + dx - 34, base - 290);
          p.lineTo(cx + dx + 34, base - 290);
          p.lineTo(cx + dx + 20, base - 270);
          p.lineTo(cx + dx - 20, base - 270);
          p.closePath();
          p.rect(cx + dx - 32, base - 260, 18, 70);
          p.rect(cx + dx + 14, base - 245, 22, 90);
        }, g, pal.borde[1], 3);
      });
    }
    for (let i = 0; i < 4; i++) lampara(x, 140 + i * 330 + r() * 50, 0, 120 + r() * 130, pal.cuerpo[2], 'rgba(255,180,90,0.75)');
  } else {
    // Giant flowers and clocks hanging from boughs.
    for (let i = 0; i < 6; i++) {
      const cx = 80 + i * 215 + r() * 50;
      const h = 230 + r() * 200;
      envuelto(x, cx, 140, (dx) => silueta(x, (p) => flor(p, cx + dx, base, h, 6 + ((r() * 3) | 0)), g, pal.borde[1], 3));
    }
    for (let i = 0; i < 4; i++) {
      const cx = 160 + i * 330 + r() * 60;
      const y = 120 + r() * 160;
      x.strokeStyle = pal.cuerpo[2];
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(cx, 0);
      x.lineTo(cx, y);
      x.stroke();
      esfera(x, cx, y + 38, 40, '#e8fff8', '#3a8aa0', [-0.5 - r(), 0.8 + r()]);
    }
  }
  niebla(x, pal.niebla, LH * 0.6, LH, 0.4);
  motas(x, 24, pal.rayos, r, LH * 0.2, LH);
  texturar(c, 0.7);
  return c;
}

function cerca(z: Zona, pal: Pal): HTMLCanvasElement {
  const c = lienzo(LW * PX, LH * PX);
  const x = c.getContext('2d')!;
  x.scale(PX, PX);
  const r = azar(z === 'jardin' ? 41 : 43);
  const base = LH + 6;
  const g = x.createLinearGradient(0, LH * 0.2, 0, LH);
  g.addColorStop(0, pal.cuerpo[2]);
  g.addColorStop(1, pal.cuerpo[3]);
  if (z === 'recibidor') {
    // Columns with capitals, and big stray clock faces leaning on them.
    for (let i = 0; i < 3; i++) {
      const cx = 140 + i * 430 + r() * 60;
      const w = 66 + r() * 30;
      envuelto(x, cx, w + 20, (dx) =>
        silueta(x, (p) => {
          p.rect(cx + dx - w / 2, 80, w, base - 80);
          p.rect(cx + dx - w * 0.75, 60, w * 1.5, 30);
          p.rect(cx + dx - w * 0.65, 40, w * 1.3, 24);
        }, g, pal.borde[2], 3),
      );
    }
  } else {
    // Big dark leaves and triangles.
    for (let i = 0; i < 5; i++) {
      const cx = 100 + i * 260 + r() * 70;
      const w = 130 + r() * 130;
      const h = 220 + r() * 260;
      envuelto(x, cx, w, (dx) => silueta(x, (p) => triangulo(p, cx + dx, base, w, h), g, pal.borde[2], 3));
    }
  }
  niebla(x, pal.niebla, LH * 0.7, LH, 0.3);
  texturar(c, 0.8);
  return c;
}

/** In front of the game: very dark shapes at the edges, mist and floating dust, very sparse so they never hide the play. */
function frente(z: Zona, pal: Pal): HTMLCanvasElement {
  const c = lienzo(LW * PX, LH * PX);
  const x = c.getContext('2d')!;
  x.scale(PX, PX);
  const r = azar(z === 'jardin' ? 51 : 53);
  const oscuro = pal.cuerpo[3];
  x.fillStyle = oscuro;
  if (z === 'recibidor') {
    // Heavy curtains at the top, swagged.
    x.beginPath();
    x.moveTo(0, 0);
    for (let i = 0; i <= 8; i++) x.quadraticCurveTo((i + 0.5) * (LW / 8), 70 + (i % 2) * 40, (i + 1) * (LW / 8), 0);
    x.lineTo(LW, 0);
    x.closePath();
    x.fill();
  } else if (z === 'bandeja') {
    // Stacks of letters leaning in from the sides and cables hanging from the top.
    for (const lado of [0, 1]) {
      for (let i = 0; i < 7; i++) {
        const w = 70 + r() * 60;
        const h = 26 + r() * 34 + i * 5;
        const x0 = lado ? LW - w - i * 22 : i * 22;
        x.save();
        x.translate(x0 + w / 2, LH);
        x.rotate((lado ? -1 : 1) * (0.02 + r() * 0.05));
        x.fillRect(-w / 2, -h, w, h);
        x.restore();
      }
    }
    x.strokeStyle = oscuro;
    x.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const cx = 120 + i * 210 + r() * 60;
      x.beginPath();
      x.moveTo(cx, 0);
      x.quadraticCurveTo(cx + 40, 70 + r() * 50, cx + 90, 12);
      x.stroke();
    }
  } else if (z === 'teatro') {
    // Heavy velvet curtains on both sides, swagged at the top.
    // (Only hanging from the top, so that the foreground never hides the floor Fran stands on.)
    for (const lado of [0, 1]) {
      x.beginPath();
      x.moveTo(lado ? LW : 0, 0);
      x.lineTo(lado ? LW - 90 : 90, 0);
      x.quadraticCurveTo(lado ? LW - 70 : 70, LH * 0.2, lado ? LW - 100 : 100, LH * 0.34);
      x.lineTo(lado ? LW : 0, LH * 0.34);
      x.closePath();
      x.fill();
    }
    x.beginPath();
    x.moveTo(0, 0);
    for (let i = 0; i <= 6; i++) x.quadraticCurveTo((i + 0.5) * (LW / 6), 60 + (i % 2) * 34, (i + 1) * (LW / 6), 0);
    x.lineTo(LW, 0);
    x.closePath();
    x.fill();
  } else if (z === 'grifo') {
    // Rock teeth hanging from the roof and a bank of foam at the bottom.
    for (let i = 0; i < 18; i++) {
      const cx = r() * LW;
      const h = 30 + r() * 110;
      x.beginPath();
      x.moveTo(cx - 20, 0);
      x.lineTo(cx + (r() - 0.5) * 16, h);
      x.lineTo(cx + 20, 0);
      x.closePath();
      x.fill();
    }
    for (let i = 0; i < 26; i++) {
      const cx = r() * LW;
      const rr = 26 + r() * 50;
      x.beginPath();
      x.arc(cx, LH + 14, rr, Math.PI, 0);
      x.fill();
    }
  } else {
    // Leaves hanging from above and grass at the bottom.
    for (let i = 0; i < 22; i++) {
      const cx = r() * LW;
      const h = 30 + r() * 90;
      x.beginPath();
      x.moveTo(cx - 14, 0);
      x.lineTo(cx, h);
      x.lineTo(cx + 14, 0);
      x.closePath();
      x.fill();
    }
    for (let i = 0; i < 40; i++) {
      const cx = r() * LW;
      const h = 40 + r() * 100;
      x.beginPath();
      x.moveTo(cx - 12, LH);
      x.quadraticCurveTo(cx + (r() - 0.5) * 30, LH - h * 0.6, cx + (r() - 0.5) * 40, LH - h);
      x.quadraticCurveTo(cx + 6, LH - h * 0.5, cx + 14, LH);
      x.closePath();
      x.fill();
    }
  }
  niebla(x, pal.niebla, LH * 0.78, LH, 0.28);
  texturar(c, 0.5);
  return c;
}

// ---------------------------------------------------------------- painted images

function cargarImagen(url: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
}

/** Is there an approved painting for this zone (and are they not switched off)? Then the baked middle layers are not even drawn. */
function hayPintado(z: Zona) {
  return !!CIELOS_PINTADOS[z as keyof typeof CIELOS_PINTADOS] && new URLSearchParams(location.search).get('fondos') !== '0';
}

/** A stand-in for the sky while a painting loads: one flat colour of the zone. */
function cieloPlano(pal: Pal): HTMLCanvasElement {
  const c = lienzo(4, 4);
  const x = c.getContext('2d')!;
  x.fillStyle = pal.cielo[2];
  x.fillRect(0, 0, 4, 4);
  return c;
}

/** The procedural layers (when there is no painting): sky, far, middle, near. */
function completas(z: Zona, pal: Pal): Capa[] {
  const S = 0.62;
  const reglas = [0.04, 0.14, 0.32, 0.55];
  return [cielo(z, pal), lejos(z, pal), medio(z, pal), cerca(z, pal)].map((img, i) => ({ img, w: LW * S, h: LH * S, f: reglas[i] }));
}

/** The rows of a mostly transparent layer that have any ink, as bands (merged when they are close): so a frame does not blit empty screen. */
function bandasLlenas(c: HTMLCanvasElement): [number, number][] {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  const bandas: [number, number][] = [];
  for (let y = 0; y < c.height; y++) {
    let hay = false;
    for (let x = 0; x < c.width && !hay; x += 4) hay = d[(y * c.width + x) * 4 + 3] > 6;
    if (!hay) continue;
    const u = bandas[bandas.length - 1];
    if (u && y - u[1] < 12) u[1] = y + 1;
    else bandas.push([y, y + 1]);
  }
  return bandas;
}

/** Bakes the layers of a zone. The painted ones (if any are listed in `FONDOS_PINTADOS`) are swapped in afterwards by `aplicarPintados`. */
export function hornearFondo(z: Zona): Fondo {
  const pal = PALETA[z];
  const S = 0.62;
  const conPintura = hayPintado(z);
  const capas: Capa[] = conPintura ? [{ img: cieloPlano(pal), w: LW * S, h: LH * S, f: 0.04 }] : completas(z, pal);
  const fr = frente(z, pal);
  capas.push({ img: fr, w: LW * S, h: LH * S, f: 1.35, frente: true, bandas: bandasLlenas(fr).map(([a, b]) => [a * S, b * S] as [number, number]) });
  return { zona: z, capas, niebla: pal.niebla, tinte: 'rgba(70,20,60,0.12)', motas: ['#ffd95a', '#fff6d8', '#ffb8f0'] };
}

/**
 * Puts the painted backdrop of the zone as the farthest layer (loaded and decoded once, only this zone's; `soltarFondo` frees it). The first room
 * of the Recibidor (`recibidor-1`) uses the variant inside the mouth. A missing file keeps the baked sky. `?fondos=0` forces the baked ones.
 */
export async function aplicarPintados(f: Fondo, sala = ''): Promise<void> {
  if (new URLSearchParams(location.search).get('fondos') === '0') return;
  const boca = f.zona === 'recibidor' && sala === 'recibidor-1';
  const pint = (f.pint ??= {});
  const url = boca ? CIELO_BOCA : CIELOS_PINTADOS[f.zona as keyof typeof CIELOS_PINTADOS];
  if (!url) return;
  const clave = boca ? 'boca' : 'normal';
  if (!pint[clave]) {
    const im = await cargarImagen(url);
    if (!im) {
      // No painting: the procedural layers take its place.
      console.warn(`[una más] no se pudo cargar el fondo pintado de ${f.zona}`);
      f.capas.splice(0, 1, ...completas(f.zona, PALETA[f.zona]));
      return;
    }
    await im.decode?.().catch(() => undefined);
    if (f.pint !== pint) return; // the zone changed meanwhile
    pint[clave] = im;
  }
  const im = pint[clave]!;
  const h = Math.round(VISTA_ALTO * 1.25);
  Object.assign(f.capas[0], { img: im, w: Math.round(h * (im.naturalWidth / im.naturalHeight)), h });
}

/** Releases the bitmaps of a zone's layers. */
export function soltarFondo(f: Fondo) {
  for (const c of f.capas) if (c.img instanceof HTMLCanvasElement) c.img.width = c.img.height = 0;
  f.pint = undefined;
}

/** Paints the layers behind the game (or the one in front, `delante`) for a camera at (cx, cy) in a view of vw × vh game units. */
export function dibujarCapas(ctx: CanvasRenderingContext2D, fondo: Fondo, cx: number, cy: number, vw: number, vh: number, altoSala: number, delante: boolean) {
  const subida = Math.max(0, altoSala - vh);
  const k = subida > 0 ? Math.min(1, Math.max(0, cy / subida)) : 1;
  for (const c of fondo.capas) {
    if (!!c.frente !== delante || c.alfa === 0) continue;
    // The layer is taller than the view: it rides up and down with the camera, bottom edge on the floor of the screen when the room is at its lowest.
    let dy = (vh - c.h) * k;
    let x0 = -(cx * c.f) % c.w;
    if (x0 > 0) x0 -= c.w;
    if (c.fija) {
      dy = vh - c.h;
      x0 = (vw - c.w) / 2;
      while (x0 > 0) x0 -= c.w;
    }
    if (c.alfa !== undefined) ctx.globalAlpha = c.alfa;
    // Only the part that lands on the screen is blitted (a 1.7-screen-wide painting would otherwise be shaded whole every frame).
    const iw = c.img instanceof HTMLImageElement ? c.img.naturalWidth : (c.img as HTMLCanvasElement).width;
    const ih = c.img instanceof HTMLImageElement ? c.img.naturalHeight : (c.img as HTMLCanvasElement).height;
    const bandas = c.bandas ?? [[0, c.h]];
    for (let x = x0; x < vw; x += c.w) {
      const px = Math.round(x);
      const a = Math.max(0, px);
      const b = Math.min(vw, px + c.w + 1);
      if (b <= a) continue;
      for (const [y0, y1] of bandas) {
        const ya = Math.max(0, Math.round(dy) + y0);
        const yb = Math.min(vh, Math.round(dy) + y1);
        if (yb <= ya) continue;
        const sy = ((ya - Math.round(dy)) / c.h) * ih;
        ctx.drawImage(c.img, ((a - px) / c.w) * iw, sy, ((b - a) / c.w) * iw, ((yb - ya) / c.h) * ih, a, ya, b - a, yb - ya);
      }
    }
    if (c.alfa !== undefined) ctx.globalAlpha = 1;
  }
}
