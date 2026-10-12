// Pixel text and the score strip (y 192–216, on black). Text that does not change is
// painted once into a small canvas («rotulo») and only copied; the strip is repainted
// only when one of its numbers changes.
import { texto } from '../juego/textos';
import { cara } from './arte/sprites';
import { BARRA_LLENA, type Mundo } from './mundo';
import { AREA, FRANJA, W } from './tipos';

export const FUENTE = '"Press Start 2P"';
export const ORO = '#ffd36a';
export const CLARO = '#f3ead6';

const rotulos = new Map<string, HTMLCanvasElement>();

/**
 * Press Start 2P has no accented capitals (Á, É, Í, Ó, Ú came out as small letters or not
 * at all): the arcade writes them plain, as the old machines did. Ñ is kept.
 */
export const pixel = (s: string) => s.normalize('NFD').replace(/[\u0300-\u0302\u0308]/g, '').normalize('NFC').replace(/…/g, '...');

/** A line of pixel text with a black outline, painted once per (text, colour, size). */
export function rotulo(txt: string, color = CLARO, tam = 8): HTMLCanvasElement {
  txt = pixel(txt);
  const k = `${tam}|${color}|${txt}`;
  let c = rotulos.get(k);
  if (c) return c;
  c = document.createElement('canvas');
  const x = c.getContext('2d')!;
  x.font = `${tam}px ${FUENTE}, monospace`;
  c.width = Math.ceil(x.measureText(txt).width) + 2;
  c.height = tam + 2;
  x.font = `${tam}px ${FUENTE}, monospace`; // resizing a canvas resets its state
  x.textBaseline = 'top';
  x.fillStyle = '#000';
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2], [0, 0], [2, 0], [0, 2], [2, 2]]) x.fillText(txt, dx, dy);
  x.fillStyle = color;
  x.fillText(txt, 1, 1);
  rotulos.set(k, c);
  return c;
}

/** Draws a cached line centred on `cx`. */
export function centrado(g: CanvasRenderingContext2D, img: HTMLCanvasElement, cx: number, y: number) {
  g.drawImage(img, Math.round(cx - img.width / 2), Math.round(y));
}

/** Outlined pixel text drawn straight onto the canvas, centred on `cx` (for numbers that change every frame). */
export function pintarTexto(g: CanvasRenderingContext2D, txt: string, cx: number, y: number, color = CLARO) {
  txt = pixel(txt);
  g.font = `8px ${FUENTE}, monospace`;
  g.textBaseline = 'top';
  g.textAlign = 'center';
  g.fillStyle = '#000';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.fillText(txt, Math.round(cx) + dx, y + dy);
  g.fillStyle = color;
  g.fillText(txt, Math.round(cx), y);
}

const digitos = (n: number, ancho: number) => String(Math.max(0, Math.min(10 ** ancho - 1, Math.floor(n)))).padStart(ancho, '0');

/** The score strip. Call `actualizar` each frame; it repaints only on change and `dibujar` copies it. */
export class Marcador {
  readonly lienzo = document.createElement('canvas');
  /** Several players: the time, top right of the play area (the strip has no room for it). */
  private readonly lienzoTiempo = document.createElement('canvas');
  private x: CanvasRenderingContext2D;
  private xt: CanvasRenderingContext2D;
  private clave = '';
  private claveTiempo = '';
  private readonly varios: boolean;

  constructor(private m: Mundo) {
    this.lienzo.width = W;
    this.lienzo.height = 24;
    this.x = this.lienzo.getContext('2d')!;
    this.lienzoTiempo.width = 34;
    this.lienzoTiempo.height = 12;
    this.xt = this.lienzoTiempo.getContext('2d')!;
    this.varios = m.jugadores.length > 1;
  }

  actualizar(tiempoCorre: boolean) {
    const m = this.m;
    const seg = Math.max(0, Math.ceil(m.tiempo));
    const parpadeoTiempo = tiempoCorre && seg <= 15 && Math.floor(m.tiempo * 4) % 2 === 0;
    const llena = m.jugadores.some((j) => j.barra >= BARRA_LLENA);
    const parpadeoBarra = llena && Math.floor(performance.now() / 250) % 2 === 0;
    const claveTiempo = `${seg}|${parpadeoTiempo ? 1 : 0}`;
    const clave = `${m.jugadores.map((j) => `${Math.floor(j.puntos)},${j.vidas},${Math.floor(j.barra)},${j.fuera ? 1 : 0}`).join('|')}|${this.varios ? '' : claveTiempo}|${parpadeoBarra ? 1 : 0}`;
    if (this.varios && (claveTiempo !== this.claveTiempo || m.hudSucio)) {
      this.claveTiempo = claveTiempo;
      this.pintarTiempo(seg, parpadeoTiempo);
    }
    if (clave === this.clave && !m.hudSucio) return;
    this.clave = clave;
    m.hudSucio = false;
    if (this.varios) this.pintarPaneles(parpadeoBarra);
    else this.pintar(seg, parpadeoTiempo, parpadeoBarra);
  }

  /** One player: name and score, lives, stage, time and the special bar. */
  private pintar(seg: number, apagadoTiempo: boolean, parpadeoBarra: boolean) {
    const x = this.x;
    const m = this.m;
    const j = m.jugadores[0];
    const barra = Math.floor(j.barra);
    const llena = j.barra >= BARRA_LLENA;
    x.clearRect(0, 0, W, 24);
    x.font = `8px ${FUENTE}, monospace`;
    x.textBaseline = 'top';
    // Left: name and score, lives under them.
    x.textAlign = 'left';
    x.fillStyle = CLARO;
    x.fillText(j.pj.toUpperCase(), 8, 3);
    x.fillStyle = ORO;
    x.fillText(digitos(j.puntos, 6), 8 + 8 * 7, 3);
    const caras = Math.min(j.vidas, 5);
    for (let i = 0; i < caras; i++) x.drawImage(cara(j.pj), 8 + i * 12, 13);
    if (j.vidas > caras) {
      x.fillStyle = CLARO;
      x.fillText(`+${j.vidas - caras}`, 8 + caras * 12, 14);
    }
    // Centre: stage.
    x.textAlign = 'center';
    x.fillStyle = CLARO;
    x.fillText(pixel(texto('hud.fase', { n: m.fase.n })), W / 2, 3);
    x.fillStyle = ORO;
    x.fillText(pixel(texto(`fase.${m.fase.n}.nombre`)), W / 2, 14);
    // Right: time and the special bar.
    x.textAlign = 'right';
    x.fillStyle = seg <= 15 ? '#ff6a5a' : CLARO;
    if (!apagadoTiempo) x.fillText(`${texto('hud.tiempo')} ${digitos(seg, 3)}`, W - 8, 3);
    const bw = BARRA_LLENA * 3 - 1;
    const bx = W - 8 - bw;
    x.fillStyle = llena && parpadeoBarra ? '#ffffff' : llena ? ORO : CLARO;
    x.fillText(pixel(texto('hud.especial')), bx - 5, 14);
    this.barra(bx, 14, barra, llena, parpadeoBarra);
  }

  /** The special bar: a frame with `barra` of 16 segments, white-gold blinking when full. */
  private barra(bx: number, y: number, barra: number, llena: boolean, parpadeo: boolean) {
    const x = this.x;
    const bw = BARRA_LLENA * 3 - 1;
    x.fillStyle = '#5a5450';
    x.fillRect(bx - 1, y - 1, bw + 2, 9);
    x.fillStyle = '#05060c';
    x.fillRect(bx, y, bw, 7);
    x.fillStyle = llena ? (parpadeo ? '#ffffff' : ORO) : '#e9a13c';
    for (let i = 0; i < barra; i++) x.fillRect(bx + i * 3, y, 2, 7);
  }

  /** Several players: the strip in equal panels, each with face, score, lives and bar. */
  private pintarPaneles(parpadeoBarra: boolean) {
    const x = this.x;
    const js = this.m.jugadores;
    const ancho = Math.floor(W / js.length);
    x.clearRect(0, 0, W, 24);
    x.font = `8px ${FUENTE}, monospace`;
    x.textBaseline = 'top';
    x.textAlign = 'left';
    for (let i = 0; i < js.length; i++) {
      const j = js[i];
      const x0 = i * ancho;
      if (i > 0) {
        x.fillStyle = '#2c2a36';
        x.fillRect(x0, 1, 1, 22);
      }
      // A player who is out of lives is dimmed.
      x.globalAlpha = j.fuera ? 0.35 : 1;
      x.drawImage(cara(j.pj), x0 + 5, 2);
      x.fillStyle = ORO;
      x.fillText(digitos(j.puntos, 6), x0 + 19, 3);
      if (j.fuera) {
        x.fillStyle = CLARO;
        x.fillText(pixel(texto('hud.fuera')), x0 + 5, 14);
      } else {
        x.fillStyle = CLARO;
        x.fillText(`x${Math.min(99, j.vidas)}`, x0 + 5, 14);
        const llena = j.barra >= BARRA_LLENA;
        this.barra(x0 + 5 + 8 * 3 + 5, 14, Math.floor(j.barra), llena, parpadeoBarra);
      }
      x.globalAlpha = 1;
    }
  }

  /** The time with its outline, right-aligned in its own small canvas. */
  private pintarTiempo(seg: number, apagado: boolean) {
    const x = this.xt;
    x.clearRect(0, 0, this.lienzoTiempo.width, this.lienzoTiempo.height);
    if (apagado) return;
    x.font = `8px ${FUENTE}, monospace`;
    x.textBaseline = 'top';
    x.textAlign = 'right';
    const txt = digitos(seg, 3);
    const dx = this.lienzoTiempo.width - 2;
    x.fillStyle = '#000';
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) x.fillText(txt, dx + ox, 2 + oy);
    x.fillStyle = seg <= 15 ? '#ff6a5a' : CLARO;
    x.fillText(txt, dx, 2);
  }

  dibujar(g: CanvasRenderingContext2D) {
    g.drawImage(this.lienzo, 0, FRANJA);
    if (this.varios) g.drawImage(this.lienzoTiempo, AREA.der - this.lienzoTiempo.width - 1, AREA.techo + 2);
  }
}
