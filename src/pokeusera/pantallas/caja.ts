// PokéUsera · the typewriter text box of the battle (and of short messages): paper box with the
// double frame, ~40 characters a second, ▼ while it waits, a tap finishes the line and a second
// tap moves on; it also moves on by itself after a short pause so the battle flows.
import { dibujarTexto, envolver } from '../arte/fuente';
import { flechaSigue, marco } from '../arte/marcos';
import { NEGRO } from '../arte/paleta';
import { cfg, parpadea } from './ui';

const CPS = 42;

interface Pendiente {
  s: string;
  espera: number;
  res: () => void;
}

export class CajaTexto {
  private lineas: string[] = [];
  private total = 0;
  private escrito = 0;
  private fase: 'vacia' | 'escribe' | 'espera' = 'vacia';
  private espera = 0;
  private res: (() => void) | null = null;
  private cola: Pendiente[] = [];
  /** Characters per line available in the box. */
  constructor(private anchoLinea = 17) {}

  /** Shows `s` typing out; resolves when it has been read (tap, or `esperaMs` after it is written; 0 = right after typing, −1 = only on tap). */
  decir(s: string, esperaMs = 650): Promise<void> {
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
    this.lineas = envolver(s, this.anchoLinea * 8);
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
    this.espera = p.espera;
    this.fase = 'escribe';
    if (cfg.rapido) this.escrito = this.total;
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
      this.escrito = Math.min(this.total, this.escrito + (dt * CPS) / 1000);
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
      return true;
    }
    return false;
  }

  dibujar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ahora: number, conMarco = true) {
    if (conMarco) marco(ctx, x, y, w, h);
    let resto = Math.floor(this.escrito);
    const paso = h >= 52 ? 12 : 11;
    const y0 = y + (h >= 52 ? 9 : 8);
    this.lineas.forEach((l, i) => {
      if (resto <= 0) return;
      const chars = Array.from(l);
      const parte = chars.slice(0, resto).join('');
      resto -= chars.length;
      dibujarTexto(ctx, parte, x + 8, y0 + i * paso, NEGRO);
    });
    if (this.fase === 'espera' && parpadea(ahora, 350)) flechaSigue(ctx, x + w - 14, y + h - 9);
  }
}
