// The entrance of the chapter 2 Pang: the foam of a beer (Fran's, with his eyes shut) rises
// from below until it fills the screen, the picture turns into pixels for a moment and settles
// into the Pang's own grid, and the first stage shows through as the blocks dissolve.
//
//   0.00 – 1.35 s   the amber rises, with the foam coming up through it (smooth)
//   1.35 – 1.87 s   pixelating: four steps, from big blocks down to the Pang's pixels
//   1.87 – 2.50 s   the foam's blocks vanish one by one; the stage is underneath by then
//
// Performance (docs/ESTILO.md, T5): the foam and the beer are painted ONCE into two textures;
// each frame only slides them, draws a few dozen bubbles and copies the picture through a
// smaller canvas to pixelate it. No SVG, nothing is painted per pixel.
import { H, W } from './tipos';

const SUBE = 1.35;
const PIXELA = 0.13;
const PASOS_PIXEL = 4;
const REVELA = SUBE + PIXELA * PASOS_PIXEL;
const DISUELVE = 0.63;
/** Total length of the entrance, seconds. */
export const DURA_ESPUMA = REVELA + DISUELVE;
/** The moment the stage should exist (it shows through as the blocks vanish). */
export const T_REVELA = REVELA;
/** Cells of the dissolve, in the Pang's pixels. */
const CELDA = 6;

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

/** Small deterministic random numbers: the foam looks the same every time. */
function azarSemilla(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const suave = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

interface Burbujita {
  x: number;
  y: number;
  r: number;
  v: number;
}

export class Espuma {
  /** The element to put over the game: it covers its box. */
  readonly canvas = lienzo(2, 2);
  private readonly vis: CanvasRenderingContext2D;
  /** The smooth picture, as big as `canvas`. */
  private readonly hr: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  /** The picture shrunk to a few blocks. */
  private readonly sm = lienzo(2, 2);
  private readonly gw: number;
  private readonly gh: number;
  private readonly hw: number;
  private readonly hh: number;
  private readonly borde: number;
  private readonly texEspuma: HTMLCanvasElement;
  private readonly texCerveza: HTMLCanvasElement;
  private readonly burbujitas: Burbujita[] = [];
  /** The dissolve's cells (indices into the grid) in the order they vanish, and the moment each one goes (0–1). */
  private readonly orden: Uint16Array;
  private readonly cuando: Float32Array;
  private readonly cols: number;
  private readonly filas: number;
  private cortadas = 0;
  private fijo = false;
  t = 0;

  constructor() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    // The picture is made a little under the screen's resolution (it is blurred and then blocky anyway).
    const k = Math.min(dpr, 2) * 0.6;
    this.hw = Math.max(64, Math.round(cssW * k));
    this.hh = Math.max(36, Math.round(cssH * k));
    // The Pang's pixel on this screen, in CSS px (juego.ts, `ajustar`), and how many of them cover it.
    const escala = Math.max(1, Math.floor(Math.min((cssW * dpr) / W, (cssH * dpr) / H)));
    const pixel = escala / dpr;
    this.gw = Math.max(16, Math.ceil(cssW / pixel));
    this.gh = Math.max(9, Math.ceil(cssH / pixel));
    this.canvas.width = this.hw;
    this.canvas.height = this.hh;
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:6;display:block';
    this.vis = this.canvas.getContext('2d', { alpha: true })!;
    this.hr = lienzo(this.hw, this.hh);
    this.g = this.hr.getContext('2d', { alpha: false })!;
    this.borde = Math.round(this.hh * 0.3);
    this.texEspuma = this.pintarEspuma();
    this.texCerveza = this.pintarCerveza();
    const azar = azarSemilla(7);
    for (let i = 0; i < 46; i++) this.burbujitas.push({ x: azar() * this.hw, y: azar() * this.hh, r: (2 + azar() * 5) * (this.hh / 300), v: (0.25 + azar() * 0.55) * this.hh });
    this.cols = Math.ceil(this.gw / CELDA);
    this.filas = Math.ceil(this.gh / CELDA);
    const n = this.cols * this.filas;
    const al = Float32Array.from({ length: n }, () => azar());
    this.orden = Uint16Array.from({ length: n }, (_, i) => i).sort((a, b) => al[a] - al[b]);
    this.cuando = Float32Array.from(this.orden, (i) => al[i]);
  }

  /** The foam head: a lumpy top edge over a body full of bubbles. */
  private pintarEspuma(): HTMLCanvasElement {
    const { hw, hh, borde } = this;
    const c = lienzo(hw, hh + borde);
    const x = c.getContext('2d')!;
    const azar = azarSemilla(11);
    const u = hh / 300;
    // Body.
    x.fillStyle = '#fff6e0';
    x.fillRect(0, borde * 0.8, hw, hh + borde);
    // The lumpy edge: rows of overlapping domes, back ones darker.
    for (const [fila, y0, sombra, lleno] of [[0, borde * 0.58, '#d9b878', '#f6e2b0'], [1, borde * 0.74, '#e6c98a', '#fff0c6']] as const) {
      const paso = 26 * u;
      for (let cx = -paso * (fila ? 0.5 : 0); cx < hw + paso; cx += paso * (0.7 + azar() * 0.5)) {
        const r = (16 + azar() * 20) * u;
        x.fillStyle = sombra;
        x.beginPath();
        x.arc(cx, y0 + azar() * 6 * u, r + 2 * u, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = lleno;
        x.beginPath();
        x.arc(cx, y0 + azar() * 6 * u, r, 0, Math.PI * 2);
        x.fill();
      }
    }
    // Bubbles in the body: rings with a glint.
    for (let i = 0; i < 190; i++) {
      const r = (2 + azar() * azar() * 22) * u;
      const bx = azar() * hw;
      const by = borde * 0.5 + azar() * (hh + borde * 0.5);
      x.fillStyle = 'rgba(255,255,255,0.7)';
      x.beginPath();
      x.arc(bx, by, r, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = 'rgba(190,140,60,0.7)';
      x.lineWidth = Math.max(1, u * 1.2);
      x.stroke();
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(bx - r * 0.35, by - r * 0.35, Math.max(0.8, r * 0.22), 0, Math.PI * 2);
      x.fill();
    }
    // A few tinted spots of beer in the cream.
    x.fillStyle = 'rgba(224,170,70,0.18)';
    for (let i = 0; i < 40; i++) {
      x.beginPath();
      x.arc(azar() * hw, borde + azar() * hh, (6 + azar() * 16) * u, 0, Math.PI * 2);
      x.fill();
    }
    return c;
  }

  /** The beer: amber, lighter at the top, with a wavy surface. */
  private pintarCerveza(): HTMLCanvasElement {
    const { hw, hh } = this;
    const onda = Math.round(hh * 0.08);
    const c = lienzo(hw, hh + onda);
    const x = c.getContext('2d')!;
    const gr = x.createLinearGradient(0, 0, 0, hh + onda);
    gr.addColorStop(0, '#ffc547');
    gr.addColorStop(0.45, '#e08c12');
    gr.addColorStop(1, '#8f4c06');
    x.fillStyle = gr;
    x.beginPath();
    x.moveTo(0, hh + onda);
    x.lineTo(0, onda / 2);
    for (let px = 0; px <= hw; px += 4) x.lineTo(px, onda / 2 + Math.sin(px / hw * Math.PI * 5) * onda * 0.4);
    x.lineTo(hw, hh + onda);
    x.closePath();
    x.fill();
    return c;
  }

  /** Moves the clock on by `dt` seconds and paints. Returns true while there is something to show. */
  avanzar(dt: number): boolean {
    this.t += dt;
    const t = this.t;
    if (t >= DURA_ESPUMA) {
      this.vis.clearRect(0, 0, this.hw, this.hh);
      return false;
    }
    if (t < SUBE) {
      this.canvas.style.imageRendering = 'auto';
      this.pintarEscena(t, dt);
      this.vis.drawImage(this.hr, 0, 0);
    } else if (t < REVELA) {
      const paso = Math.min(PASOS_PIXEL - 1, Math.floor((t - SUBE) / PIXELA));
      this.pixelar(this.gw / [10, 5, 2.5, 1][paso]);
    } else {
      this.disolver((t - REVELA) / DISUELVE);
    }
    return true;
  }

  /** The smooth picture at time `t`. */
  private pintarEscena(t: number, dt: number) {
    const g = this.g;
    const { hw, hh, borde } = this;
    g.fillStyle = '#120b06';
    g.fillRect(0, 0, hw, hh);
    const onda = Math.round(hh * 0.08);
    // The beer comes up first, the foam a little later and faster, through it.
    const pa = suave(t / 0.95);
    const pf = suave((t - 0.3) / 1.05);
    const yCerveza = hh - pa * (hh + onda) - Math.sin(t * 7) * onda * 0.12;
    const yEspuma = hh - pf * (hh + borde * 0.9) + Math.sin(t * 9) * borde * 0.05;
    g.drawImage(this.texCerveza, 0, Math.round(yCerveza - onda / 2));
    // Bubbles rising in the beer (only where there is beer).
    g.strokeStyle = 'rgba(255,236,170,0.75)';
    g.fillStyle = 'rgba(255,236,170,0.28)';
    g.lineWidth = Math.max(1, hh / 240);
    for (const b of this.burbujitas) {
      b.y -= b.v * dt;
      if (b.y < -b.r) {
        b.y = hh + b.r;
        b.x = (b.x * 7.31 + 13) % hw;
      }
      if (b.y < yCerveza + onda) continue;
      g.beginPath();
      g.arc(b.x + Math.sin(b.y / 17 + b.x) * 3, b.y, b.r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.drawImage(this.texEspuma, 0, Math.round(yEspuma));
  }

  /** The picture as `ancho` blocks across. */
  private pixelar(ancho: number) {
    const w = Math.max(2, Math.round(ancho));
    const h = Math.max(2, Math.round((w * this.hh) / this.hw));
    this.pintarEscena(SUBE, 0);
    this.reducir(w, h);
    this.canvas.style.imageRendering = 'pixelated';
    this.vis.imageSmoothingEnabled = false;
    this.vis.drawImage(this.sm, 0, 0, this.hw, this.hh);
  }

  private reducir(w: number, h: number) {
    if (this.sm.width !== w || this.sm.height !== h) {
      this.sm.width = w;
      this.sm.height = h;
    }
    const x = this.sm.getContext('2d')!;
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(this.hr, 0, 0, w, h);
  }

  /** The blocks of the Pang's grid vanish in a random order (`p` 0–1). */
  private disolver(p: number) {
    const v = this.vis;
    if (!this.fijo) {
      // The last picture, crisp on the Pang's grid, painted once.
      this.fijo = true;
      this.pintarEscena(SUBE, 0);
      this.reducir(this.gw, this.gh);
      this.canvas.style.imageRendering = 'pixelated';
      v.imageSmoothingEnabled = false;
      v.clearRect(0, 0, this.hw, this.hh);
      v.drawImage(this.sm, 0, 0, this.hw, this.hh);
    }
    const cw = (CELDA * this.hw) / this.gw;
    const ch = (CELDA * this.hh) / this.gh;
    for (; this.cortadas < this.orden.length && this.cuando[this.cortadas] <= p; this.cortadas++) {
      const i = this.orden[this.cortadas];
      const cx = i % this.cols;
      const cy = Math.floor(i / this.cols);
      v.clearRect(Math.floor(cx * cw), Math.floor(cy * ch), Math.ceil(cw) + 1, Math.ceil(ch) + 1);
    }
  }
}
