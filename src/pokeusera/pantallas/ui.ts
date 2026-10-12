// PokéUsera · small drawing and timing helpers shared by the screens.
import type { EntrenadorId, Estado } from '../tipos';
import { ENTRENADORES } from '../tipos';
import { texto } from '../../juego/textos';
import { anchoMini, anchoTexto, dibujarMini, dibujarTexto } from '../arte/fuente';
import { COLOR_JUGADOR, CLARO, NEGRO, PAPEL } from '../arte/paleta';
import { marco } from '../arte/marcos';

/** Global switches (set from the URL in main.ts). */
export const cfg = { rapido: false };

/** Waits `ms` (much shorter in the fast smoke-test mode). */
export function dormir(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, cfg.rapido ? Math.min(ms, 20) : ms));
}

export const t = texto;

/** A trainer's colour: always the same for the same friend (Fran red, Pablo blue, Chuchi green, Guille orange). */
export const colorEnt = (id: EntrenadorId): string => COLOR_JUGADOR[Math.max(0, ENTRENADORES.indexOf(id))];
export const nombreEnt = (id: EntrenadorId): string => texto(`entrenador.${id}`);

export const parpadea = (ahora: number, periodo = 500): boolean => Math.floor(ahora / periodo) % 2 === 0;

/** Text centred on x (default: the middle of the 160-px screen). */
export function centrado(ctx: CanvasRenderingContext2D, s: string, y: number, color: string, opts: { x?: number; escala?: number; sombra?: string } = {}) {
  const e = opts.escala ?? 1;
  const x = (opts.x ?? 80) - Math.floor(anchoTexto(s, e) / 2);
  dibujarTexto(ctx, s, x, y, color, { escala: e, sombra: opts.sombra });
}

export function miniCentrado(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string) {
  dibujarMini(ctx, s, x - Math.floor(anchoMini(s) / 2), y, color);
}

export function derecha(ctx: CanvasRenderingContext2D, s: string, xFin: number, y: number, color: string) {
  dibujarTexto(ctx, s, xFin - anchoTexto(s), y, color);
}

export function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** A ◀ (dir −1) or ▶ (dir +1) arrow, 5×7. */
export function flecha(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, color: string = NEGRO) {
  const anchos = [2, 3, 4, 5, 4, 3, 2];
  anchos.forEach((a, i) => rect(ctx, color, dir > 0 ? x : x + 5 - a, y + i, a, 1));
}

/** The pause button's three bars. */
export function menuIcono(ctx: CanvasRenderingContext2D, x: number, y: number, color: string = NEGRO) {
  for (let i = 0; i < 3; i++) rect(ctx, color, x, y + i * 3, 9, 1);
}

/** «4.º»: the font has no º and its period is wide, so both are drawn by hand (width 15 × escala). */
export function ordinal(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, color: string, escala = 1) {
  const e = escala;
  dibujarTexto(ctx, String(n), x, y, color, { escala });
  const x2 = x + 7 * e;
  rect(ctx, color, x2, y + 6 * e, 2 * e, 2 * e);
  rect(ctx, color, x2 + 3 * e, y + 1 * e, 3 * e, e);
  rect(ctx, color, x2 + 2 * e, y + 2 * e, e, 2 * e);
  rect(ctx, color, x2 + 6 * e, y + 2 * e, e, 2 * e);
  rect(ctx, color, x2 + 3 * e, y + 4 * e, 3 * e, e);
}

/** Draws a baked canvas scaled to w×h without smoothing. */
export function dibujaEscalado(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  ctx.drawImage(cv, 0, 0, cv.width, cv.height, Math.round(x), Math.round(y), w, h);
}

/** A framed button (paper box, ▶ when selected). `activo` false greys it out. */
export function boton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: string, sel: boolean, activo = true) {
  marco(ctx, x, y, w, h);
  const color = activo ? NEGRO : CLARO;
  const tx = x + Math.floor((w - anchoTexto(s)) / 2) + (sel ? 3 : 0);
  dibujarTexto(ctx, s, tx, y + Math.floor((h - 8) / 2) + 1, color);
  if (sel) cursorCh(ctx, tx - 8, y + Math.floor((h - 7) / 2));
}

function cursorCh(ctx: CanvasRenderingContext2D, x: number, y: number) {
  flecha(ctx, x, y, 1, NEGRO);
}

/** Pill colours for the status tags (background, text). */
export const COLOR_ESTADO: Record<Estado | 'achispado', [string, string]> = {
  dormido: ['#8aa0c8', NEGRO],
  paralizado: ['#eec31c', NEGRO],
  quemado: ['#e8562a', PAPEL],
  empachado: ['#7aa83c', NEGRO],
  achispado: ['#a85cc4', PAPEL],
};

/** A little status tag («DOR», «PAR»...). Returns its width. */
export function etiquetaEstado(ctx: CanvasRenderingContext2D, e: Estado | 'achispado', x: number, y: number): number {
  const s = texto(`estado.${e}`);
  const w = anchoMini(s) + 5;
  const [bg, fg] = COLOR_ESTADO[e];
  rect(ctx, NEGRO, x + 1, y, w - 2, 9);
  rect(ctx, NEGRO, x, y + 1, w, 7);
  rect(ctx, bg, x + 1, y + 1, w - 2, 7);
  dibujarMini(ctx, s, x + 2, y + 2, fg);
  return w;
}

/** A semi-transparent veil over a rectangle (greyed-out rows). */
export function velo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = PAPEL, alfa = 0.6) {
  ctx.save();
  ctx.globalAlpha = alfa;
  rect(ctx, color, x, y, w, h);
  ctx.restore();
}

/** Tweens driven by the screen's `paso`: `animar(ms, fn(p))` resolves when p reaches 1. */
export class Animador {
  private lista: { dur: number; t: number; fn: (p: number) => void; fin: () => void }[] = [];

  animar(ms: number, fn: (p: number) => void): Promise<void> {
    const dur = cfg.rapido ? ms * 0.1 : ms;
    return new Promise((res) => {
      if (dur <= 0) {
        fn(1);
        res();
        return;
      }
      fn(0);
      this.lista.push({ dur, t: 0, fn, fin: res });
    });
  }

  paso(dt: number): boolean {
    const l = this.lista;
    for (let i = 0; i < l.length; i++) {
      const a = l[i];
      a.t += dt;
      const p = Math.min(1, a.t / a.dur);
      a.fn(p);
      if (p >= 1) {
        l.splice(i--, 1);
        a.fin();
      }
    }
    return l.length > 0;
  }

  get activo(): boolean {
    return this.lista.length > 0;
  }
}

/** Keyboard cursor for a vertical list: returns the new index for an arrow action. */
export function mover(sel: number, n: number, a: 'arriba' | 'abajo'): number {
  return a === 'arriba' ? (sel + n - 1) % n : (sel + 1) % n;
}

