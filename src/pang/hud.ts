// Pixel text and the score strip (y 192–216, on black). Text that does not change is
// painted once into a small canvas («rotulo») and only copied; the strip is repainted
// only when one of its numbers changes.
import { texto } from '../juego/textos';
import { cara } from './arte/sprites';
import { BARRA_LLENA, type Mundo } from './mundo';
import { FRANJA, W } from './tipos';

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
  private x: CanvasRenderingContext2D;
  private clave = '';
  private nombre: string;

  constructor(private m: Mundo) {
    this.lienzo.width = W;
    this.lienzo.height = 24;
    this.x = this.lienzo.getContext('2d')!;
    this.nombre = m.pj.toUpperCase();
  }

  actualizar(tiempoCorre: boolean) {
    const m = this.m;
    const seg = Math.max(0, Math.ceil(m.tiempo));
    const parpadeoTiempo = tiempoCorre && seg <= 15 && Math.floor(m.tiempo * 4) % 2 === 0;
    const llena = m.barra >= BARRA_LLENA;
    const parpadeoBarra = llena && Math.floor(performance.now() / 250) % 2 === 0;
    const clave = `${Math.floor(m.puntos)}|${m.vidas}|${seg}|${parpadeoTiempo ? 1 : 0}|${Math.floor(m.barra)}|${parpadeoBarra ? 1 : 0}`;
    if (clave === this.clave && !m.hudSucio) return;
    this.clave = clave;
    m.hudSucio = false;
    this.pintar(seg, parpadeoTiempo, Math.floor(m.barra), parpadeoBarra, llena);
  }

  private pintar(seg: number, apagadoTiempo: boolean, barra: number, parpadeoBarra: boolean, llena: boolean) {
    const x = this.x;
    const m = this.m;
    x.clearRect(0, 0, W, 24);
    x.font = `8px ${FUENTE}, monospace`;
    x.textBaseline = 'top';
    // Left: name and score, lives under them.
    x.textAlign = 'left';
    x.fillStyle = CLARO;
    x.fillText(this.nombre, 8, 3);
    x.fillStyle = ORO;
    x.fillText(digitos(m.puntos, 6), 8 + 8 * 7, 3);
    const caras = Math.min(m.vidas, 5);
    for (let i = 0; i < caras; i++) x.drawImage(cara(m.pj), 8 + i * 12, 13);
    if (m.vidas > caras) {
      x.fillStyle = CLARO;
      x.fillText(`+${m.vidas - caras}`, 8 + caras * 12, 14);
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
    x.fillStyle = '#5a5450';
    x.fillRect(bx - 1, 13, bw + 2, 9);
    x.fillStyle = '#05060c';
    x.fillRect(bx, 14, bw, 7);
    x.fillStyle = llena ? (parpadeoBarra ? '#ffffff' : ORO) : '#e9a13c';
    for (let i = 0; i < barra; i++) x.fillRect(bx + i * 3, 14, 2, 7);
  }

  dibujar(g: CanvasRenderingContext2D) {
    g.drawImage(this.lienzo, 0, FRANJA);
  }
}
