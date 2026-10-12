// PokéUsera · Edición Jarra: frames, HP bars, cursors and type badges, all drawn with rects at
// integer coordinates (pixel-exact at 1×).
import type { Tipo } from '../tipos';
import { dibujarMini, anchoMini } from './fuente';
import { COLOR_TIPO, NEGRO, NOMBRE_TIPO, OSCURO, PAPEL, PS_FONDO, colorPS } from './paleta';

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** A one-pixel ring with its corners rounded by one diagonal pixel. */
function anillo(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  px(ctx, color, x + 2, y, w - 4, 1);
  px(ctx, color, x + 2, y + h - 1, w - 4, 1);
  px(ctx, color, x, y + 2, 1, h - 4);
  px(ctx, color, x + w - 1, y + 2, 1, h - 4);
  px(ctx, color, x + 1, y + 1, 1, 1);
  px(ctx, color, x + w - 2, y + 1, 1, 1);
  px(ctx, color, x + 1, y + h - 2, 1, 1);
  px(ctx, color, x + w - 2, y + h - 2, 1, 1);
}

/** The classic text box: paper, a near-black outer line and a dark inner line, rounded corners. */
export function marco(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  // Paper, with the corners clipped.
  px(ctx, PAPEL, x + 1, y, w - 2, h);
  px(ctx, PAPEL, x, y + 1, w, h - 2);
  anillo(ctx, NEGRO, x, y, w, h);
  anillo(ctx, OSCURO, x + 2, y + 2, w - 4, h - 4);
}

/** Height of the HP bar block. */
export const ALTO_PS = 6;

/** HP bar with the little «PS» label. `w` is the total width (label included); `frac` is 0..1. */
export function barraPS(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number): void {
  const f = Math.max(0, Math.min(1, frac));
  dibujarMini(ctx, 'PS', x, y, OSCURO);
  const bx = x + 10;
  const bw = w - 10;
  // Frame.
  px(ctx, NEGRO, bx + 1, y, bw - 2, ALTO_PS);
  px(ctx, NEGRO, bx, y + 1, bw, ALTO_PS - 2);
  px(ctx, PS_FONDO, bx + 1, y + 1, bw - 2, ALTO_PS - 2);
  const interior = bw - 2;
  let n = Math.round(interior * f);
  if (f > 0 && n < 1) n = 1;
  if (n > 0) {
    const c = colorPS(f);
    px(ctx, c, bx + 1, y + 1, n, ALTO_PS - 2);
    // A one-pixel light edge on top gives the bar a little roundness.
    px(ctx, 'rgba(255,255,255,0.45)', bx + 1, y + 1, n, 1);
  }
}

/** The ▶ selection arrow (5×7). */
export function cursor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string = NEGRO): void {
  const anchos = [2, 3, 4, 5, 4, 3, 2];
  anchos.forEach((a, i) => px(ctx, color, x, y + i, a, 1));
}

/** The ▼ «more text» arrow (6×3). Blinking is the caller's job. */
export function flechaSigue(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  px(ctx, NEGRO, x, y, 6, 1);
  px(ctx, NEGRO, x + 1, y + 1, 4, 1);
  px(ctx, NEGRO, x + 2, y + 2, 2, 1);
}

function claro(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150;
}

/** Height of a type badge. */
export const ALTO_INSIGNIA = 9;

/** Tiny coloured badge with the type name. Returns its width (at most ~36 px). */
export function insignaTipo(ctx: CanvasRenderingContext2D, tipo: Tipo, x: number, y: number): number {
  const nombre = NOMBRE_TIPO[tipo].toUpperCase();
  const w = anchoMini(nombre) + 5;
  const h = ALTO_INSIGNIA;
  const c = COLOR_TIPO[tipo];
  px(ctx, NEGRO, x + 1, y, w - 2, h);
  px(ctx, NEGRO, x, y + 1, w, h - 2);
  px(ctx, c, x + 1, y + 1, w - 2, h - 2);
  // Top-left light edge, bottom shade: a touch of volume.
  px(ctx, 'rgba(255,255,255,0.35)', x + 1, y + 1, w - 2, 1);
  px(ctx, 'rgba(0,0,0,0.22)', x + 1, y + h - 2, w - 2, 1);
  dibujarMini(ctx, nombre, x + 2, y + 2, claro(c) ? NEGRO : PAPEL);
  return w;
}
