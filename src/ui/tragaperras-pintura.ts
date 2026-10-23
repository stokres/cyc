// The slot machine of the Bar del Brío seen from the front, painted once to bitmaps and drawn from
// them: the trailer's shot (src/ui/trailer.ts) and the close-up of chapter 2 (src/ui/tragaperras.ts)
// share it. A frame draws the cabinet, the reel strips scrolling in their window, the glass, the
// marquee's bulbs and the coins; nothing is drawn as a vector (docs/ESTILO.md, T5.7).
import { texto } from '../juego/textos';
import { azar, elipse, lienzo, suave } from './bar-pintura';

// ---------------------------------------------------------------- the slot machine

export type Simbolo = 'siete' | 'cereza' | 'campana' | 'limon' | 'diamante' | 'estrella' | 'cerdo' | 'cara';
/** The symbols on each reel, top to bottom, in the trailer; the jackpot is three sevens. */
export const SIMBOLOS_TRAILER: readonly Simbolo[] = ['siete', 'cereza', 'campana', 'limon', 'diamante', 'estrella'];
/** The close-up's reels have the pig too (and a lemon and a bell to land on). */
export const SIMBOLOS_CERCA: readonly Simbolo[] = ['siete', 'cereza', 'campana', 'limon', 'diamante', 'estrella', 'cerdo'];
/** The close-up's reels with a face among the symbols (the night's last spin: the machine stops on a friend). */
export const SIMBOLOS_CARA: readonly Simbolo[] = [...SIMBOLOS_CERCA, 'cara'];
/** Symbols a second while a reel spins. */
const GIRO = 16;

/**
 * What a shot of the machine does: when each reel stops (seconds into the shot), the symbol
 * it lands on (an index into the reel's symbols), when the jackpot starts (null for none: the
 * bulbs keep chasing and nothing pours out) and how many coins pour out, one every `pasoMonedas`.
 */
export interface GuionTragaperras {
  paradas: readonly number[];
  destinos: readonly number[];
  premio: number | null;
  monedas: number;
  pasoMonedas: number;
  /** When the machine dies (seconds): the bulbs go out and the picture fades to black over 0.8 s. None: it never does. */
  apagon?: number;
}

/** The trailer's: on the beat, the third reel on the jackpot (three sevens). */
export const GUION_TRAILER: GuionTragaperras = { paradas: [0.5, 1.0, 1.5], destinos: [0, 0, 0], premio: 1.5, monedas: 70, pasoMonedas: 0.028 };

export interface Tragaperras {
  maquina: HTMLCanvasElement;
  cartelOn: HTMLCanvasElement;
  tira: HTMLCanvasElement;
  cristal: HTMLCanvasElement;
  /** The reels' window: where it is and how big, and each symbol's height on the reel. */
  vx: number;
  vy: number;
  vw: number;
  vh: number;
  celda: number;
  /** The marquee's bulbs, and where the coins come out. */
  bombillas: Array<[number, number]>;
  bocaX: number;
  bocaY: number;
  /** The symbols on the reel strip, in order. */
  simbolos: readonly Simbolo[];
}

function simbolo(x: CanvasRenderingContext2D, que: Simbolo, cx: number, cy: number, t: number, cerca = false) {
  if (que === 'siete') {
    // A fat red seven with a gold edge (drawn, not a font: it must look the same everywhere).
    const sete = (k: number, color: string) => {
      x.fillStyle = color;
      x.beginPath();
      x.moveTo(cx - t * 0.32 * k, cy - t * 0.38 * k);
      x.lineTo(cx + t * 0.34 * k, cy - t * 0.38 * k);
      x.lineTo(cx + t * 0.34 * k, cy - t * 0.22 * k);
      x.lineTo(cx - t * 0.02 * k, cy + t * 0.4 * k);
      x.lineTo(cx - t * 0.24 * k, cy + t * 0.4 * k);
      x.lineTo(cx + t * 0.1 * k, cy - t * 0.2 * k);
      x.lineTo(cx - t * 0.32 * k, cy - t * 0.2 * k);
      x.closePath();
      x.fill();
    };
    sete(1.12, '#e8b84a');
    sete(1, '#d8282e');
  } else if (que === 'cereza') {
    x.strokeStyle = '#3a8a3a';
    x.lineWidth = t * 0.05;
    x.beginPath();
    x.moveTo(cx - t * 0.16, cy + t * 0.08);
    x.quadraticCurveTo(cx - t * 0.05, cy - t * 0.3, cx + t * 0.12, cy - t * 0.34);
    x.moveTo(cx + t * 0.16, cy + t * 0.12);
    x.quadraticCurveTo(cx + t * 0.12, cy - t * 0.2, cx + t * 0.12, cy - t * 0.34);
    x.stroke();
    elipse(x, cx - t * 0.16, cy + t * 0.16, t * 0.15, t * 0.15, '#c8202e');
    elipse(x, cx + t * 0.16, cy + t * 0.2, t * 0.15, t * 0.15, '#a8182a');
    elipse(x, cx - t * 0.2, cy + t * 0.1, t * 0.035, t * 0.035, 'rgba(255,255,255,0.6)');
  } else if (que === 'campana') {
    x.fillStyle = '#e8b030';
    x.beginPath();
    x.moveTo(cx - t * 0.32, cy + t * 0.22);
    x.quadraticCurveTo(cx - t * 0.22, cy + t * 0.12, cx - t * 0.22, cy - t * 0.08);
    x.quadraticCurveTo(cx - t * 0.2, cy - t * 0.34, cx, cy - t * 0.34);
    x.quadraticCurveTo(cx + t * 0.2, cy - t * 0.34, cx + t * 0.22, cy - t * 0.08);
    x.quadraticCurveTo(cx + t * 0.22, cy + t * 0.12, cx + t * 0.32, cy + t * 0.22);
    x.closePath();
    x.fill();
    elipse(x, cx, cy + t * 0.28, t * 0.07, t * 0.07, '#b07a1a');
    x.fillStyle = '#b07a1a';
    x.fillRect(cx - t * 0.32, cy + t * 0.2, t * 0.64, t * 0.04);
  } else if (que === 'limon') {
    elipse(x, cx, cy, t * 0.32, t * 0.22, '#f2d23a', -0.3);
    elipse(x, cx + t * 0.27, cy - t * 0.14, t * 0.05, t * 0.04, '#d8b42a', -0.3);
    elipse(x, cx - t * 0.27, cy + t * 0.14, t * 0.05, t * 0.04, '#d8b42a', -0.3);
    if (cerca) {
      // Seen up close: a leaf and a highlight (the trailer's reels only blur past).
      elipse(x, cx + t * 0.18, cy - t * 0.25, t * 0.13, t * 0.055, '#4a9a3a', -0.7);
      elipse(x, cx - t * 0.1, cy - t * 0.07, t * 0.12, t * 0.04, 'rgba(255,255,255,0.45)', -0.3);
    }
  } else if (que === 'cerdo') {
    // A pig's face: ears, head, snout with two nostrils, eyes.
    x.fillStyle = '#e07890';
    for (const lado of [-1, 1]) {
      x.beginPath();
      x.moveTo(cx + lado * t * 0.3, cy - t * 0.14);
      x.lineTo(cx + lado * t * 0.36, cy - t * 0.42);
      x.lineTo(cx + lado * t * 0.08, cy - t * 0.3);
      x.closePath();
      x.fill();
    }
    elipse(x, cx, cy + t * 0.02, t * 0.37, t * 0.33, '#f4a3b3');
    elipse(x, cx - t * 0.22, cy + t * 0.1, t * 0.07, t * 0.05, 'rgba(224,100,130,0.5)');
    elipse(x, cx + t * 0.22, cy + t * 0.1, t * 0.07, t * 0.05, 'rgba(224,100,130,0.5)');
    elipse(x, cx, cy + t * 0.1, t * 0.18, t * 0.125, '#f9bccb');
    elipse(x, cx - t * 0.06, cy + t * 0.1, t * 0.03, t * 0.045, '#b8465f');
    elipse(x, cx + t * 0.06, cy + t * 0.1, t * 0.03, t * 0.045, '#b8465f');
    elipse(x, cx - t * 0.16, cy - t * 0.1, t * 0.04, t * 0.05, '#2a1a20');
    elipse(x, cx + t * 0.16, cy - t * 0.1, t * 0.04, t * 0.05, '#2a1a20');
    elipse(x, cx - t * 0.15, cy - t * 0.115, t * 0.012, t * 0.015, '#ffffff');
    elipse(x, cx + t * 0.17, cy - t * 0.115, t * 0.012, t * 0.015, '#ffffff');
  } else if (que === 'diamante') {
    x.fillStyle = '#4ab4e0';
    x.beginPath();
    x.moveTo(cx - t * 0.32, cy - t * 0.1);
    x.lineTo(cx - t * 0.18, cy - t * 0.28);
    x.lineTo(cx + t * 0.18, cy - t * 0.28);
    x.lineTo(cx + t * 0.32, cy - t * 0.1);
    x.lineTo(cx, cy + t * 0.34);
    x.closePath();
    x.fill();
    x.fillStyle = '#8ad8f4';
    x.beginPath();
    x.moveTo(cx - t * 0.18, cy - t * 0.28);
    x.lineTo(cx + t * 0.18, cy - t * 0.28);
    x.lineTo(cx + t * 0.06, cy - t * 0.1);
    x.lineTo(cx - t * 0.06, cy - t * 0.1);
    x.closePath();
    x.fill();
  } else {
    x.fillStyle = '#f0a020';
    x.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? t * 0.15 : t * 0.36;
      x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath();
    x.fill();
  }
}

/**
 * A slot machine seen from the front, so close it fills the screen, painted once: the red
 * cabinet, the chrome around the reels, the marquee with its sign and its bulbs, the coin tray;
 * the reels' strip (the six symbols, once more at the end so it wraps); the glass over the
 * reels, darker at the top and bottom, with the pay line.
 */
export function pintarTragaperras(W: number, H: number, dpr: number, simbolos: readonly Simbolo[] = SIMBOLOS_TRAILER, cara: HTMLCanvasElement | null = null): Tragaperras {
  const [maquina, x] = lienzo(W, H, dpr);
  const fondo = x.createRadialGradient(W / 2, H * 0.5, H * 0.2, W / 2, H * 0.5, W * 0.7);
  fondo.addColorStop(0, '#2a0e1e');
  fondo.addColorStop(1, '#0c050c');
  x.fillStyle = fondo;
  x.fillRect(0, 0, W, H);
  const mx = W * 0.12;
  const mw = W * 0.76;
  const cuerpo = x.createLinearGradient(mx, 0, mx + mw, 0);
  cuerpo.addColorStop(0, '#7a1018');
  cuerpo.addColorStop(0.5, '#c0222c');
  cuerpo.addColorStop(1, '#7a1018');
  x.fillStyle = cuerpo;
  x.beginPath();
  x.roundRect(mx, -H * 0.05, mw, H * 1.1, H * 0.06);
  x.fill();
  // The marquee: a dark panel with the sign; its bulbs are drawn every frame.
  const cy0 = H * 0.04;
  const ch = H * 0.2;
  x.fillStyle = '#1a0a10';
  x.beginPath();
  x.roundRect(mx + mw * 0.06, cy0, mw * 0.88, ch, ch * 0.2);
  x.fill();
  const letrero = texto('trailer.tragaperras.premio');
  const cartel = (c: CanvasRenderingContext2D, color: string) => {
    c.fillStyle = color;
    c.font = `400 ${Math.round(ch * 0.5)}px Graduate, Rockwell, Georgia, serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(letrero, W / 2, cy0 + ch * 0.54, mw * 0.7);
  };
  cartel(x, '#7a5a2a');
  const [cartelOn, co] = lienzo(W, H * 0.3, dpr);
  co.shadowColor = 'rgba(255,200,90,0.9)';
  co.shadowBlur = ch * 0.25;
  cartel(co, '#ffe08a');
  const bombillas: Array<[number, number]> = [];
  const bx0 = mx + mw * 0.06;
  const bw = mw * 0.88;
  for (let k = 0; k <= 15; k++) {
    bombillas.push([bx0 + (bw * k) / 15, cy0]);
    bombillas.push([bx0 + bw - (bw * k) / 15, cy0 + ch]);
  }
  // The chrome frame around the reels.
  const vx = W * 0.19;
  const vy = H * 0.31;
  const vw = W * 0.62;
  const vh = H * 0.43;
  const cromo = x.createLinearGradient(0, vy - H * 0.04, 0, vy + vh + H * 0.04);
  cromo.addColorStop(0, '#f2f4f8');
  cromo.addColorStop(0.5, '#8a8e98');
  cromo.addColorStop(1, '#d8dce4');
  x.fillStyle = cromo;
  x.beginPath();
  x.roundRect(vx - H * 0.035, vy - H * 0.035, vw + H * 0.07, vh + H * 0.07, H * 0.04);
  x.fill();
  x.fillStyle = '#121014';
  x.fillRect(vx, vy, vw, vh);
  // The coin tray at the bottom, and the dark mouth the coins come out of.
  const bocaX = W / 2;
  const bocaY = H * 0.86;
  x.fillStyle = cromo;
  x.beginPath();
  x.roundRect(W * 0.3, H * 0.82, W * 0.4, H * 0.2, H * 0.03);
  x.fill();
  x.fillStyle = '#100608';
  x.beginPath();
  x.roundRect(W * 0.36, H * 0.84, W * 0.28, H * 0.06, H * 0.02);
  x.fill();
  // The lever's knob on the right edge.
  elipse(x, mx + mw + W * 0.035, H * 0.36, H * 0.045, H * 0.045, '#d8282e');
  x.fillStyle = '#9a9ea8';
  x.fillRect(mx + mw, H * 0.4, W * 0.04, H * 0.03);

  // The reels' strip: each symbol on an ivory cell; the first comes again at the end.
  const rw = (vw - H * 0.04) / 3;
  const celda = vh * 0.62;
  const n = simbolos.length;
  const cerca = simbolos !== SIMBOLOS_TRAILER;
  const [tira, t] = lienzo(rw, celda * (n + 1), dpr);
  const marfil = t.createLinearGradient(0, 0, rw, 0);
  marfil.addColorStop(0, '#cfc6b0');
  marfil.addColorStop(0.5, '#fbf6ea');
  marfil.addColorStop(1, '#cfc6b0');
  t.fillStyle = marfil;
  t.fillRect(0, 0, rw, celda * (n + 1));
  for (let k = 0; k <= n; k++) {
    const que = simbolos[k % n];
    if (que === 'cara') {
      // A friend's face in its round frame, as a bitmap made before (src/ui/fichas.ts); an empty cell until it is there.
      if (cara) t.drawImage(cara, rw / 2 - celda * 0.46, celda * (k + 0.5) - celda * 0.46, celda * 0.92, celda * 0.92);
    } else simbolo(t, que, rw / 2, celda * (k + 0.5), celda * 0.9, cerca);
  }

  // The glass: shade at the top and bottom of the drum, the gaps between reels, the pay line.
  const [cristal, g] = lienzo(vw, vh, dpr);
  const sombra = g.createLinearGradient(0, 0, 0, vh);
  sombra.addColorStop(0, 'rgba(0,0,0,0.75)');
  sombra.addColorStop(0.25, 'rgba(0,0,0,0)');
  sombra.addColorStop(0.75, 'rgba(0,0,0,0)');
  sombra.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = sombra;
  g.fillRect(0, 0, vw, vh);
  g.fillStyle = '#2a0a10';
  for (let k = 1; k < 3; k++) g.fillRect(k * (rw + H * 0.02) - H * 0.02, 0, H * 0.02, vh);
  g.fillStyle = 'rgba(216,40,46,0.8)';
  g.fillRect(0, vh / 2 - 1, vw, 2);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.beginPath();
  g.moveTo(vw * 0.05, 0);
  g.lineTo(vw * 0.22, 0);
  g.lineTo(vw * 0.1, vh);
  g.lineTo(0, vh);
  g.lineTo(0, vh * 0.3);
  g.fill();
  return { maquina, cartelOn, tira, cristal, vx, vy, vw, vh, celda, bombillas, bocaX, bocaY, simbolos };
}

/** Where reel `i` stands at `s` (in symbols down the strip): spinning, then landing on its symbol with a bounce. */
function rodillo(i: number, s: number, g: GuionTragaperras, n: number) {
  const fin = g.paradas[i];
  const destino = g.destinos[i] + n * 40;
  if (s < fin) return destino + GIRO * (fin - s);
  const d = s - fin;
  return destino + Math.sin(d * 30) * Math.exp(-d * 14) * 0.12;
}

/** The coins of a jackpot: when each jumps out of the tray, and how (worked out once per script). */
const monedasHechas = new WeakMap<GuionTragaperras, Array<{ t: number; vx: number; vy: number; giro: number; vel: number }>>();
function monedasDe(g: GuionTragaperras) {
  let m = monedasHechas.get(g);
  if (!m) {
    const r = azar(77);
    const t0 = g.premio ?? 0;
    m = Array.from({ length: g.monedas }, (_, k) => ({ t: t0 + k * g.pasoMonedas, vx: (r() - 0.5) * 1.4, vy: -(0.7 + r() * 0.7), giro: r() * 6, vel: 8 + r() * 10 }));
    monedasHechas.set(g, m);
  }
  return m;
}

/**
 * The slot machine paying out: the reels spinning in a blur and stopping one per beat; on the
 * third seven the bulbs go wild, the sign lights up, the sevens flash and a fountain of coins
 * pours out of the tray, the camera shaking.
 */
export function dibujarTragaperras(x: CanvasRenderingContext2D, W: number, H: number, m: Tragaperras, s: number, g: GuionTragaperras = GUION_TRAILER) {
  const t0 = g.premio ?? 0;
  const premio = g.premio !== null && s >= g.premio;
  const golpe = g.paradas.reduce((a, p) => (s >= p ? Math.max(0, 1 - (s - p) / 0.15) : a), 0);
  const tiembla = premio ? Math.max(0.25, 1 - (s - t0) / 0.6) : 0;
  const z = 1 + 0.02 * golpe + 0.03 * suave(s / 3.5);
  x.save();
  x.translate(W / 2 + (tiembla ? Math.sin(s * 70) * H * 0.006 * tiembla : 0), H / 2 + (tiembla ? Math.cos(s * 83) * H * 0.006 * tiembla : 0));
  x.scale(z, z);
  x.translate(-W / 2, -H / 2);
  x.drawImage(m.maquina, 0, 0, W, H);
  // The reels.
  const rw = (m.vw - H * 0.04) / 3;
  const n = m.simbolos.length;
  x.save();
  x.beginPath();
  x.rect(m.vx, m.vy, m.vw, m.vh);
  x.clip();
  for (let i = 0; i < 3; i++) {
    const p = rodillo(i, s, g, n);
    const gira = s < g.paradas[i];
    const rx = m.vx + i * (rw + H * 0.02);
    // The symbol at the pay line is p; the strip is drawn so it sits at the window's middle.
    const pinta = (desfase: number, alfa: number) => {
      const q = (((p + desfase) % n) + n) % n;
      const y0 = m.vy + m.vh / 2 - (q + 0.5) * m.celda;
      x.globalAlpha = alfa;
      for (const k of [-1, 0, 1]) x.drawImage(m.tira, rx, y0 + k * n * m.celda, rw, m.celda * (n + 1));
      x.globalAlpha = 1;
    };
    if (gira) {
      pinta(0, 1);
      pinta(0.3, 0.45);
      pinta(0.6, 0.25);
    } else pinta(0, 1);
  }
  x.restore();
  x.drawImage(m.cristal, m.vx, m.vy, m.vw, m.vh);
  // The jackpot: a gold frame pulsing round the three sevens.
  if (premio) {
    const pulso = 0.5 + 0.5 * Math.sin((s - t0) * 24);
    x.strokeStyle = `rgba(255,214,110,${0.5 + 0.5 * pulso})`;
    x.lineWidth = H * 0.012;
    x.strokeRect(m.vx + H * 0.01, m.vy + m.vh / 2 - m.celda / 2, m.vw - H * 0.02, m.celda);
    x.globalAlpha = 0.55 + 0.45 * pulso;
    x.drawImage(m.cartelOn, 0, 0, W, H * 0.3);
    x.globalAlpha = 1;
  }
  // The marquee's bulbs: chasing round while it spins, all flashing on the jackpot.
  m.bombillas.forEach(([bx, by], k) => {
    const on = g.apagon !== undefined && s >= g.apagon ? false : premio ? (Math.floor((s - t0) * 12) + k) % 2 === 0 : (k + Math.floor(s * 14)) % 4 === 0;
    elipse(x, bx, by, H * 0.012, H * 0.012, on ? '#fff0b0' : '#6a4a2a');
    if (on && premio && k % 3 === 0) elipse(x, bx, by, H * 0.024, H * 0.024, 'rgba(255,220,120,0.25)');
  });
  // The coins: jumping out of the tray, spinning, falling back.
  if (premio) {
    for (const c of monedasDe(g)) {
      const d = s - c.t;
      if (d < 0 || d > 1.2) continue;
      const cx = m.bocaX + c.vx * H * d;
      const cy = m.bocaY + c.vy * H * d + 1.6 * H * d * d;
      if (cy > H * 1.05) continue;
      const ancho = Math.abs(Math.cos(c.giro + d * c.vel));
      elipse(x, cx, cy, H * 0.036 * Math.max(0.15, ancho), H * 0.036, '#b07a1a');
      elipse(x, cx, cy, H * 0.028 * Math.max(0.1, ancho), H * 0.028, '#f2c84a');
    }
  }
  x.restore();
  // It dies: everything goes dark, slowly, with a last flicker of the marquee.
  if (g.apagon !== undefined && s >= g.apagon) {
    const u = Math.min(1, (s - g.apagon) / 0.8);
    x.fillStyle = `rgba(0,0,0,${(u * u * (3 - 2 * u)).toFixed(3)})`;
    x.fillRect(0, 0, W, H);
  }
}

