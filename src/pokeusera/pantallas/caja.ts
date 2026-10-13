// PokéUsera · the typewriter text box of the battle (and of short messages): paper box with the
// double frame, ~40 characters a second, ▼ while it waits, a tap finishes the line and a second
// tap moves on; it also moves on by itself after a short pause so the battle flows.
import { envolver2 } from '../arte2/fuente2';
import { SOMBRA_TEXTO, TINTA2 } from '../arte2/paleta2';
import { dibujarTextoParcial2 } from '../arte2/fuente2';
import { flecha2, panelCacheado } from '../arte2/ui2';
import { cfg, parpadea, ritmo } from './ui';

interface Pendiente {
  s: string;
  espera: number | undefined;
  res: () => void;
}

export class CajaTexto {
  private lineas: string[] = [];
  private total = 0;
  private escrito = 0;
  /** Blink phase of the «more» arrow last drawn (see `paso`). */
  private faseFlecha = -1;
  private fase: 'vacia' | 'escribe' | 'espera' = 'vacia';
  private espera = 0;
  private res: (() => void) | null = null;
  private cola: Pendiente[] = [];
  /** Pixels per line available in the box. */
  constructor(private anchoLinea = 210) {}

  /** Shows `s` typing out; resolves when it has been read (tap, or `esperaMs` after it is written; 0 = right after typing, −1 = only on tap;
   *  by default what the speed setting says). */
  decir(s: string, esperaMs?: number): Promise<void> {
    return new Promise((res) => {
      this.cola.push({ s, espera: esperaMs, res });
      if (this.fase === 'vacia') this.siguiente();
    });
  }

  /** Shows `s` at once and leaves it there (prompts, menus' captions). Cancels anything pending. */
  fijar(s: string) {
    const prev = this.res;
    const cola = this.cola;
    this.cola = [];
    this.res = null;
    this.poner(s);
    this.escrito = this.total;
    this.fase = 'vacia';
    prev?.();
    for (const c of cola) c.res();
  }

  vaciar() {
    this.fijar('');
  }

  private poner(s: string) {
    this.lineas = envolver2(s, this.anchoLinea);
    this.total = this.lineas.reduce((n, l) => n + Array.from(l).length, 0);
    this.escrito = 0;
  }

  private siguiente() {
    const p = this.cola.shift();
    if (!p) {
      this.fase = 'vacia';
      return;
    }
    this.poner(p.s);
    this.res = p.res;
    this.espera = p.espera ?? ritmo().espera;
    this.fase = 'escribe';
    if (cfg.rapido) {
      this.escrito = this.total;
      // Fast mode never waits for a tap.
      if (this.espera < 0) this.espera = 650;
    }
  }

  /** Whether `s` fits in `maxLineas` lines of the box. */
  cabe(s: string, maxLineas: number): boolean {
    return envolver2(s, this.anchoLinea).length <= maxLineas;
  }

  /** True while the box is showing something that waits for a tap or a pause. */
  get ocupada(): boolean {
    return this.fase !== 'vacia';
  }

  /** A tap: finishes typing, or moves on. */
  toque() {
    if (this.fase === 'escribe') {
      this.escrito = this.total;
      this.fase = 'espera';
      if (this.espera === 0) this.terminar();
    } else if (this.fase === 'espera') this.terminar();
  }

  private terminar() {
    const r = this.res;
    this.res = null;
    this.fase = 'vacia';
    r?.();
    if (this.fase === 'vacia') this.siguiente();
  }

  /** Advances the typing; returns true while it moves. */
  paso(dt: number): boolean {
    if (this.fase === 'escribe') {
      this.escrito = Math.min(this.total, this.escrito + (dt * ritmo().cps) / 1000);
      if (this.escrito >= this.total) {
        this.fase = 'espera';
        if (this.espera === 0) this.terminar();
      }
      return true;
    }
    if (this.fase === 'espera') {
      if (this.espera > 0) {
        this.espera -= dt * (cfg.rapido ? 10 : 1);
        if (this.espera <= 0) this.terminar();
      }
      // Waiting only moves the blinking arrow: redraw when it blinks, not every frame.
      const fase = Math.floor(performance.now() / 350) % 2;
      if (fase !== this.faseFlecha) {
        this.faseFlecha = fase;
        return true;
      }
      return false;
    }
    return false;
  }

  dibujar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ahora: number, conMarco = true) {
    if (conMarco) panelCacheado(ctx, x, y, w, h);
    let resto = Math.floor(this.escrito);
    const alta = h > 70;
    const paso = alta ? 14 : 13;
    const bloque = Math.max(0, this.lineas.length - 1) * paso + 9;
    const y0 = alta ? y + 14 : y + 3 + Math.floor((h - 8 - bloque) / 2) + 1;
    this.lineas.forEach((l, i) => {
      if (resto <= 0) return;
      const n = Array.from(l).length;
      dibujarTextoParcial2(ctx, l, Math.min(n, resto), x + 11, y0 + i * paso, TINTA2, SOMBRA_TEXTO);
      resto -= n;
    });
    if (this.fase === 'espera' && parpadea(ahora, 350)) flecha2(ctx, x + w - 17, y + h - 12);
  }
}
