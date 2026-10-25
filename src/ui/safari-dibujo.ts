// The drawing kit of the safari comic (src/ui/safari.ts): the comic's ink, its halftone, the outlined shapes, the stroke
// letters of the onomatopoeias and the baked speech bubbles and caption boxes. Everything here paints ONCE to a bitmap
// (docs/ESTILO.md, T5.7); a frame only draws those bitmaps.
import { azar, elipse, lienzo } from './bar-pintura';

export { azar, elipse, lienzo };
export type X = CanvasRenderingContext2D;

/** The comic's ink: the very dark plum-brown of the colour manga (src/arte/anime/manga-comun.mjs), never black. */
export const TINTA = '#2b1c20';
/** The paper of the gutters, warm ivory (never pure white). */
export const PAPEL = '#f6ecd5';
export const MARFIL = '#fbf3df';
export const ORO = '#dbb46c';

/** Mixes two #rrggbb colours (0 = a, 1 = b). */
export function mezcla(a: string, b: string, u = 0.5) {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = n(a);
  const [br, bg, bb] = n(b);
  const c = (p: number, q: number) => Math.round(p + (q - p) * u).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/** A colour with transparency. */
export function alfa(h: string, a: number) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const acota = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const suave = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/** Easing that overshoots and settles (a bounce in). */
export const rebote = (u: number) => {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const c = 1.9;
  const v = u - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
};

/** Fills the current path and inks its outline. */
export function rellenar(x: X, fill: string | CanvasGradient | CanvasPattern, lw = 2, tinta: string | null = TINTA) {
  x.fillStyle = fill;
  x.fill();
  if (tinta && lw > 0) {
    x.lineWidth = lw;
    x.strokeStyle = tinta;
    x.lineJoin = 'round';
    x.lineCap = 'round';
    x.stroke();
  }
}

/** A vertical gradient from y0 to y1 with colour stops. */
export function vertical(x: X, y0: number, y1: number, ...stops: Array<[number, string]>) {
  const g = x.createLinearGradient(0, y0, 0, y1);
  for (const [u, c] of stops) g.addColorStop(u, c);
  return g;
}

/**
 * Halftone: dots on a lattice, over the rectangle (x0, y0)-(x1, y1) and under the current clip. The dot's radius goes
 * with `f(px, py)` (0 to 1, the size of the biggest dot being `rmax`): that is a soft gradient of shadow made of dots.
 */
export function trama(x: X, x0: number, y0: number, x1: number, y1: number, color: string, f: (px: number, py: number) => number, paso = 5, rmax = 1.9) {
  x.fillStyle = color;
  x.beginPath();
  let fila = 0;
  for (let py = y0; py < y1; py += paso * 0.866, fila++) {
    for (let px = x0 + (fila % 2 ? paso / 2 : 0); px < x1; px += paso) {
      const r = rmax * acota(f(px, py));
      if (r < 0.3) continue;
      x.moveTo(px + r, py);
      x.arc(px, py, r, 0, Math.PI * 2);
    }
  }
  x.fill();
}

/** A periodic bumpy line: a sum of sines whose periods fit a whole number of times in `ancho`, so it tiles sideways. */
export function onda(semilla: number, ancho: number, armonicos = 4) {
  const r = azar(semilla);
  const a: Array<[number, number, number]> = [];
  for (let k = 1; k <= armonicos; k++) a.push([k * (1 + Math.floor(r() * 2)), r() * Math.PI * 2, 1 / (k * 0.9 + 0.4)]);
  const norma = a.reduce((s, q) => s + q[2], 0);
  return (px: number) => a.reduce((s, [k, ph, am]) => s + Math.sin((px / ancho) * Math.PI * 2 * k + ph) * am, 0) / norma;
}

/** Calls `f` with `px` shifted by a tile so that what sticks out of a tile comes back in on the other side. */
export function envolver(ancho: number, px: number, mitad: number, f: (px: number) => void) {
  f(px);
  if (px - mitad < 0) f(px + ancho);
  if (px + mitad > ancho) f(px - ancho);
}

/** A cloud of circles with its outline around the whole, and a soft shade underneath. */
export function nube(x: X, cx: number, cy: number, s: number, claro = '#fff6e4', sombra = '#e2c7b4', lw = 2) {
  const bolas: Array<[number, number, number]> = [
    [-1.0, 0.1, 0.55],
    [-0.45, -0.25, 0.75],
    [0.2, -0.4, 0.85],
    [0.85, -0.05, 0.65],
    [1.3, 0.2, 0.42],
    [-1.35, 0.3, 0.4],
  ];
  const trazar = () => {
    x.beginPath();
    for (const [dx, dy, r] of bolas) {
      x.moveTo(cx + (dx + r) * s, cy + dy * s);
      x.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
    }
    x.moveTo(cx + 1.5 * s, cy + 0.55 * s);
    x.rect(cx - 1.5 * s, cy + 0.2 * s, 3 * s, 0.35 * s);
  };
  trazar();
  x.lineWidth = lw * 2;
  x.strokeStyle = TINTA;
  x.lineJoin = 'round';
  x.stroke();
  trazar();
  x.fillStyle = claro;
  x.fill();
  x.save();
  trazar();
  x.clip();
  x.fillStyle = sombra;
  x.beginPath();
  x.ellipse(cx + 0.1 * s, cy + 0.85 * s, 2 * s, 0.8 * s, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

/** A star with `n` points (a burst for the onomatopoeias, a twinkle for the sky). */
export function estrella(x: X, cx: number, cy: number, rf: number, rd: number, n: number, giro = 0, jitter = 0, semilla = 1) {
  const r = azar(semilla);
  x.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = giro + (i / (n * 2)) * Math.PI * 2;
    const rad = (i % 2 ? rd : rf) * (1 + (r() - 0.5) * jitter);
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i) x.lineTo(px, py);
    else x.moveTo(px, py);
  }
  x.closePath();
}

// ---------------------------------------------------------------- sprites that are shared

/** A wheel: tyre, hub and spokes, with the comic's ink. Turn it with the context and draw it as an image. */
export function pintarRueda(r: number, dpr: number) {
  const [c, x] = lienzo(r * 2 + 4, r * 2 + 4, dpr);
  x.translate(r + 2, r + 2);
  elipse(x, 0, 0, r, r, '#2a2226');
  x.lineWidth = Math.max(1.3, r * 0.1);
  x.strokeStyle = TINTA;
  x.beginPath();
  x.arc(0, 0, r, 0, Math.PI * 2);
  x.stroke();
  elipse(x, 0, 0, r * 0.62, r * 0.62, '#5a5058');
  elipse(x, 0, 0, r * 0.52, r * 0.52, '#aeb0b8');
  x.strokeStyle = '#6a6c74';
  x.lineWidth = Math.max(1.4, r * 0.15);
  x.lineCap = 'round';
  x.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    x.moveTo(0, 0);
    x.lineTo(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46);
  }
  x.stroke();
  elipse(x, 0, 0, r * 0.14, r * 0.14, '#e8e4dc');
  elipse(x, -r * 0.3, -r * 0.32, r * 0.1, r * 0.06, 'rgba(255,255,255,0.5)', -0.7);
  return { img: c, r: r + 2 };
}

/** A puff of dust or smoke: a lumpy cloud with a soft ink line and a halftone shade. */
export function pintarPuff(r: number, dpr: number, claro: string, sombra: string, lw = 1.4) {
  const [c, x] = lienzo(r * 2.6, r * 2.2, dpr);
  const cx = r * 1.3;
  const cy = r * 1.1;
  const bolas: Array<[number, number, number]> = [
    [-0.55, 0.15, 0.5],
    [0, -0.2, 0.62],
    [0.55, 0.1, 0.5],
    [0.15, 0.3, 0.5],
    [-0.2, 0.35, 0.42],
  ];
  const trazar = () => {
    x.beginPath();
    for (const [dx, dy, rr] of bolas) {
      x.moveTo(cx + (dx + rr) * r, cy + dy * r);
      x.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2);
    }
  };
  trazar();
  x.lineWidth = lw * 2;
  x.strokeStyle = 'rgba(43,28,32,0.8)';
  x.lineJoin = 'round';
  x.stroke();
  trazar();
  x.fillStyle = claro;
  x.fill();
  x.save();
  trazar();
  x.clip();
  x.fillStyle = sombra;
  x.beginPath();
  x.ellipse(cx + r * 0.25, cy + r * 0.75, r * 1.5, r * 0.7, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
  return { img: c, w: r * 2.6, h: r * 2.2 };
}

/** A drop of water: round at the bottom, pointed at the top, with a glint. */
export function pintarGota(r: number, dpr: number, color = '#cfeaf2') {
  const [c, x] = lienzo(r * 2.4, r * 3.2, dpr);
  x.translate(r * 1.2, r * 1.9);
  x.beginPath();
  x.moveTo(0, -r * 1.5);
  x.bezierCurveTo(r * 0.3, -r * 0.7, r, -r * 0.4, r, r * 0.3);
  x.arc(0, r * 0.3, r, 0, Math.PI);
  x.bezierCurveTo(-r, -r * 0.4, -r * 0.3, -r * 0.7, 0, -r * 1.5);
  rellenar(x, color, 1.2);
  elipse(x, -r * 0.3, r * 0.1, r * 0.18, r * 0.3, 'rgba(255,255,255,0.8)', 0.3);
  return { img: c, w: r * 2.4, h: r * 3.2, cx: r * 1.2, cy: r * 1.9 };
}

// ---------------------------------------------------------------- stroke letters for the onomatopoeias

/**
 * A marker alphabet drawn with strokes (grid 60 wide, 100 tall; some letters are narrower), so the comic's sound effects
 * are drawn, not typed. The words come from the text files; a letter missing here falls back to the heavy text font.
 */
const GLIFOS: Record<string, { d: string; a: number }> = {
  A: { d: 'M4 100 L30 6 L56 100 M15 68 H45', a: 62 },
  B: { d: 'M8 4 V96 M8 4 H32 C54 4 54 48 32 48 H8 M32 48 C60 48 60 96 32 96 H8', a: 60 },
  C: { d: 'M54 24 C46 -2 6 0 6 50 C6 100 46 102 54 76', a: 60 },
  D: { d: 'M8 4 V96 H26 C62 96 62 4 26 4 H8', a: 62 },
  E: { d: 'M52 4 H8 V96 H52 M8 50 H42', a: 56 },
  F: { d: 'M52 4 H8 V100 M8 50 H42', a: 56 },
  G: { d: 'M54 24 C46 -2 6 0 6 50 C6 100 50 104 54 70 V56 H32', a: 60 },
  H: { d: 'M8 4 V96 M52 4 V96 M8 50 H52', a: 60 },
  I: { d: 'M16 4 V96', a: 32 },
  J: { d: 'M44 4 V66 C44 108 6 104 6 70', a: 52 },
  K: { d: 'M8 4 V96 M52 4 L8 58 M24 42 L54 96', a: 60 },
  L: { d: 'M8 4 V96 H50', a: 54 },
  M: { d: 'M6 96 V4 L30 62 L54 4 V96', a: 62 },
  N: { d: 'M8 96 V4 L52 96 V4', a: 60 },
  O: { d: 'M30 3 C-8 3 -8 97 30 97 C68 97 68 3 30 3 Z', a: 62 },
  P: { d: 'M8 96 V4 H32 C60 4 60 52 32 52 H8', a: 58 },
  Q: { d: 'M30 3 C-8 3 -8 97 30 97 C68 97 68 3 30 3 Z M36 72 L58 102', a: 64 },
  R: { d: 'M8 96 V4 H32 C60 4 60 50 32 50 H8 M30 50 L54 96', a: 60 },
  S: { d: 'M52 22 C44 -4 8 0 8 26 C8 54 52 46 52 74 C52 102 14 104 6 78', a: 58 },
  T: { d: 'M4 4 H56 M30 4 V96', a: 60 },
  U: { d: 'M8 4 V62 C8 108 52 108 52 62 V4', a: 60 },
  V: { d: 'M4 4 L30 96 L56 4', a: 60 },
  W: { d: 'M2 4 L16 96 L30 40 L44 96 L58 4', a: 62 },
  X: { d: 'M6 4 L54 96 M54 4 L6 96', a: 60 },
  Y: { d: 'M4 4 L30 52 L56 4 M30 52 V96', a: 60 },
  Z: { d: 'M6 4 H54 L6 96 H54', a: 60 },
  '!': { d: 'M16 4 V64 M16 92 V93', a: 32 },
  '¡': { d: 'M16 36 V96 M16 7 V8', a: 32 },
  '?': { d: 'M6 26 C6 -6 52 -6 52 26 C52 48 30 48 30 66 M30 92 V93', a: 56 },
  '.': { d: 'M16 92 V93', a: 30 },
  '-': { d: 'M8 54 H44', a: 52 },
  '…': { d: 'M8 92 V93 M26 92 V93 M44 92 V93', a: 56 },
};
/** The accents of Spanish, drawn above the letter. */
const TILDES: Record<string, { base: string; d: string }> = {
  Á: { base: 'A', d: 'M22 -16 L38 -34' },
  É: { base: 'E', d: 'M20 -16 L36 -34' },
  Í: { base: 'I', d: 'M8 -16 L24 -34' },
  Ó: { base: 'O', d: 'M22 -16 L38 -34' },
  Ú: { base: 'U', d: 'M20 -16 L36 -34' },
  Ñ: { base: 'N', d: 'M12 -20 C20 -34 30 -26 32 -22 C34 -18 44 -12 50 -26' },
};

export interface OpcionesOno {
  /** Colour of the letters, of the burst behind them and of the burst's second tone. */
  letra: string;
  rafaga: string;
  rafaga2: string;
  /** Height of the letters in CSS px. */
  alto: number;
  dpr: number;
  /** Slight turn of the whole word (radians). */
  giro?: number;
  semilla?: number;
}

/** The bitmap of an onomatopoeia: a burst, and the word over it in big outlined stroke letters that dance. */
export function hornearOno(palabra: string, o: OpcionesOno) {
  const alto = o.alto;
  const k = alto / 100;
  const letras = [...palabra.toUpperCase()];
  const ancho = letras.reduce((s, ch) => s + ((GLIFOS[ch]?.a ?? GLIFOS[TILDES[ch]?.base]?.a ?? 56) + 12) * k, 0);
  const W = ancho + alto * 1.3;
  const Hh = alto * 2.1;
  const [c, x] = lienzo(W, Hh, o.dpr);
  const r = azar(o.semilla ?? 7);
  x.translate(W / 2, Hh / 2);
  x.rotate(o.giro ?? 0);
  // The burst: an uneven star with an ink outline, a second tone inside and a halftone on one side.
  const R = Math.min(W / 2 - 2, Hh / 2 + alto * 0.1);
  estrella(x, 0, 0, R, R * 0.66, 13, 0.2, 0.18, (o.semilla ?? 7) * 3 + 1);
  x.lineWidth = Math.max(3, alto * 0.06) * 2;
  x.strokeStyle = TINTA;
  x.lineJoin = 'round';
  x.stroke();
  x.fillStyle = o.rafaga;
  x.fill();
  x.save();
  estrella(x, 0, 0, R, R * 0.66, 13, 0.2, 0.18, (o.semilla ?? 7) * 3 + 1);
  x.clip();
  estrella(x, 0, 0, R * 0.82, R * 0.55, 13, 0.2, 0.18, (o.semilla ?? 7) * 3 + 1);
  x.fillStyle = o.rafaga2;
  x.fill();
  trama(x, -W / 2, -Hh / 2, W / 2, Hh / 2, 'rgba(43,28,32,0.3)', (px, py) => (px + py) / (W + Hh) * 1.4 - 0.15, 5.5, 1.6);
  x.restore();
  // The word.
  let cx = -ancho / 2;
  const fuerza = alto * 0.17;
  for (const ch of letras) {
    const g = GLIFOS[ch] ?? GLIFOS[TILDES[ch]?.base];
    const av = ((g?.a ?? 56) + 12) * k;
    const dy = (r() - 0.5) * alto * 0.18;
    const gi = (r() - 0.5) * 0.28;
    const esc = 0.92 + r() * 0.2;
    x.save();
    x.translate(cx + av / 2, dy);
    x.rotate(gi);
    x.scale(k * esc, k * esc);
    x.translate(-((g?.a ?? 56) / 2), -50);
    const caminos: Path2D[] = [];
    if (g) caminos.push(new Path2D(g.d));
    else caminos.push(new Path2D());
    if (TILDES[ch]) caminos.push(new Path2D(TILDES[ch].d));
    x.lineCap = 'round';
    x.lineJoin = 'round';
    const w = fuerza / (k * esc);
    // Shadow, ink, body and glint.
    x.save();
    x.translate(5, 6);
    x.strokeStyle = 'rgba(43,28,32,0.55)';
    x.lineWidth = w + 12;
    for (const p of caminos) x.stroke(p);
    x.restore();
    x.strokeStyle = TINTA;
    x.lineWidth = w + 12;
    for (const p of caminos) x.stroke(p);
    x.strokeStyle = o.letra;
    x.lineWidth = w;
    for (const p of caminos) x.stroke(p);
    x.strokeStyle = 'rgba(255,255,255,0.55)';
    x.lineWidth = w * 0.22;
    x.save();
    x.translate(-w * 0.18, -w * 0.2);
    for (const p of caminos) x.stroke(p);
    x.restore();
    if (!g) {
      x.font = '800 100px "Alegreya Sans", sans-serif';
      x.fillStyle = o.letra;
      x.fillText(ch, 0, 90);
    }
    x.restore();
    cx += av;
  }
  return { img: c, w: W, h: Hh };
}

// ---------------------------------------------------------------- bubbles and caption boxes

/** The text face of the comic: the game's body font, heavy and in capitals, like hand lettering. */
export const FUENTE = '"Alegreya Sans", "Trebuchet MS", "Segoe UI", sans-serif';

/** Breaks `texto` into lines no wider than `ancho` (greedy). */
function partir(x: X, texto: string, ancho: number) {
  const lineas: string[] = [];
  let actual = '';
  for (const p of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (actual && x.measureText(prueba).width > ancho) {
      lineas.push(actual);
      actual = p;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export interface Bocadillo {
  img: HTMLCanvasElement;
  /** Size of the bitmap (CSS px) and where the tail's tip is inside it (the pivot for its pop). */
  w: number;
  h: number;
  punta: [number, number];
  /** Where the bubble's centre is inside the bitmap. */
  centro: [number, number];
}

/**
 * A speech bubble, baked: a rounded oval around the text with a tail that points at `cola` (a point relative to the
 * bubble's centre, CSS px). The outline is made by inking the oval and the tail together and then filling both, so they
 * join cleanly. Nobody is drawn: the tail goes straight to the caravan.
 */
export function hornearBocadillo(texto: string, tam: number, maxAncho: number, cola: [number, number], dpr: number, grito = false): Bocadillo {
  const [m, mx] = lienzo(8, 8, 1);
  mx.font = `800 ${tam}px ${FUENTE}`;
  const t = texto.toLocaleUpperCase('es');
  const lineas = partir(mx, t, maxAncho);
  const tw = Math.max(...lineas.map((l) => mx.measureText(l).width));
  const th = lineas.length * tam * 1.08;
  m.width = m.height = 0;
  const n = 2.7;
  const a = (tw / 2) * 1.31 + tam * 0.62;
  const b = (th / 2) * 1.31 + tam * 0.5;
  // The tail: from the oval's edge toward the tip.
  const [tx, ty] = cola;
  const dl = Math.hypot(tx, ty) || 1;
  const dx = tx / dl;
  const dy = ty / dl;
  const s = Math.pow(Math.pow(Math.abs(dx) / a, n) + Math.pow(Math.abs(dy) / b, n), -1 / n);
  const bx = dx * s;
  const by = dy * s;
  const px = -dy;
  const py = dx;
  const ancha = Math.min(tam * 0.78, b * 0.6, a * 0.3);
  const lw = Math.max(2, tam * 0.13);
  const pad = lw * 2 + 6;
  const x0 = Math.min(-a, tx) - pad;
  const x1 = Math.max(a, tx) + pad + 3;
  const y0 = Math.min(-b, ty) - pad;
  const y1 = Math.max(b, ty) + pad + 4;
  const W = x1 - x0;
  const Hh = y1 - y0;
  const [c, x] = lienzo(W, Hh, dpr);
  x.translate(-x0, -y0);
  const forma = () => {
    x.beginPath();
    if (grito) {
      // A shout: a jagged oval.
      const pts = 22;
      for (let i = 0; i <= pts; i++) {
        const an = (i / pts) * Math.PI * 2;
        const rr = i % 2 ? 0.88 : 1.06;
        const ex = Math.cos(an) * a * rr;
        const ey = Math.sin(an) * b * rr;
        if (i) x.lineTo(ex, ey);
        else x.moveTo(ex, ey);
      }
    } else {
      const pasos = 72;
      for (let i = 0; i <= pasos; i++) {
        const an = (i / pasos) * Math.PI * 2;
        const cs = Math.cos(an);
        const sn = Math.sin(an);
        const ex = Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n) * a;
        const ey = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) * b;
        if (i) x.lineTo(ex, ey);
        else x.moveTo(ex, ey);
      }
    }
    x.closePath();
  };
  const rabo = () => {
    const b1x = bx - px * ancha - dx * 4;
    const b1y = by - py * ancha - dy * 4;
    const b2x = bx + px * ancha - dx * 4;
    const b2y = by + py * ancha - dy * 4;
    const curva = Math.min(14, dl * 0.2);
    x.beginPath();
    x.moveTo(b1x, b1y);
    x.quadraticCurveTo((b1x + tx) / 2 + px * curva, (b1y + ty) / 2 + py * curva, tx, ty);
    x.quadraticCurveTo((b2x + tx) / 2 + px * curva * 0.2, (b2y + ty) / 2 + py * curva * 0.2, b2x, b2y);
    x.closePath();
  };
  // A hard shadow, offset, like the caption boxes'.
  x.save();
  x.translate(2.5, 3.5);
  x.fillStyle = 'rgba(43,28,32,0.28)';
  forma();
  x.fill();
  rabo();
  x.fill();
  x.restore();
  x.lineJoin = 'round';
  x.strokeStyle = TINTA;
  x.lineWidth = lw * 2;
  forma();
  x.stroke();
  rabo();
  x.stroke();
  x.fillStyle = grito ? '#fff0b8' : '#fffaf0';
  forma();
  x.fill();
  rabo();
  x.fill();
  // A little halftone shade at the bottom of the bubble, and a glint at the top.
  x.save();
  forma();
  x.clip();
  trama(x, -a, -b, a, b, 'rgba(120,70,40,0.2)', (_px, py) => (py / b - 0.1) * 1.4, 4.5, 1.3);
  x.restore();
  // The text.
  x.fillStyle = TINTA;
  x.font = `800 ${tam}px ${FUENTE}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  lineas.forEach((l, i) => x.fillText(l, 0, (i - (lineas.length - 1) / 2) * tam * 1.08 + tam * 0.04));
  return { img: c, w: W, h: Hh, punta: [tx - x0, ty - y0], centro: [-x0, -y0] };
}

export interface Cartucha {
  img: HTMLCanvasElement;
  w: number;
  h: number;
}

/** A narrator's caption box: a mustard rectangle with a thick ink line and a hard shadow, like the old comics'. */
export function hornearCartucha(texto: string, tam: number, maxAncho: number, dpr: number): Cartucha {
  const [m, mx] = lienzo(8, 8, 1);
  mx.font = `800 ${tam}px ${FUENTE}`;
  const t = texto.toLocaleUpperCase('es');
  const lineas = partir(mx, t, maxAncho);
  const tw = Math.max(...lineas.map((l) => mx.measureText(l).width));
  const th = lineas.length * tam * 1.12;
  m.width = m.height = 0;
  const px = tam * 0.65;
  const py = tam * 0.45;
  const w = tw + px * 2;
  const hh = th + py * 2;
  const sombra = 4;
  const [c, x] = lienzo(w + sombra + 4, hh + sombra + 4, dpr);
  x.translate(2, 2);
  x.fillStyle = TINTA;
  x.beginPath();
  x.roundRect(sombra, sombra, w, hh, 3);
  x.fill();
  x.beginPath();
  x.roundRect(0, 0, w, hh, 3);
  x.fillStyle = '#f6cf63';
  x.fill();
  x.save();
  x.clip();
  trama(x, 0, 0, w, hh, 'rgba(160,90,30,0.28)', (_px, y) => (y / hh - 0.15) * 1.3, 4.5, 1.25);
  x.restore();
  x.strokeStyle = TINTA;
  x.lineWidth = 2.6;
  x.lineJoin = 'round';
  x.beginPath();
  x.roundRect(0, 0, w, hh, 3);
  x.stroke();
  x.strokeStyle = 'rgba(43,28,32,0.35)';
  x.lineWidth = 1;
  x.beginPath();
  x.roundRect(3.5, 3.5, w - 7, hh - 7, 2);
  x.stroke();
  x.fillStyle = TINTA;
  x.font = `800 ${tam}px ${FUENTE}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  lineas.forEach((l, i) => x.fillText(l, w / 2, py + (i + 0.5) * tam * 1.12 + 1));
  return { img: c, w: w + sombra + 4, h: hh + sombra + 4 };
}
