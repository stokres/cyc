// PokéUsera · the canvas. Logical width 240 (a Game Boy Advance's), height 384–520 from the screen's shape;
// the canvas is drawn at that size with smoothing off and CSS-scaled to fit (pixelated). One
// requestAnimationFrame loop, capped at 60 fps, that only draws when something changed, something
// is animating, or a quarter of a second has passed (blinking cursors). docs/ESTILO.md, T5.
import type { Accion } from './entrada';

export const ANCHO = 240;
export const ALTO_MIN = 384;
export const ALTO_MAX = 520;

/** A screen of the game. Everything it needs to draw must come from its own state (it can be fed by the host or by network messages). */
export interface Escena {
  /** Draws the whole screen. Hit zones are registered here with `entrada.zona(...)`. */
  dibujar(ctx: CanvasRenderingContext2D, t: number): void;
  /** Called every frame before drawing; return true while something moves (keeps redrawing every frame). */
  paso?(dt: number, t: number): boolean | void;
  /** Nothing on this screen depends on the clock (no blinking, no breathing): skip the redraw every quarter second. */
  estatica?: boolean;
  /** Keyboard / back. Return true if handled. */
  accion?(a: Accion): boolean | void;
  /** A finger (or the mouse) dragging over the canvas: movement since the last call (logical px) and the total since the touch began. `fin` on release. */
  arrastre?(dx: number, dy: number, total: { x: number; y: number }, fin: boolean): void;
}

/** `?medir`: counters for scripts/rendimiento-pokeusera.mjs, on `window.__medir` (nothing is measured otherwise). */
export interface Medidas {
  /** Frames of the loop that ran (60 fps cap included) and frames that actually drew. */
  rafs: number;
  dibujos: number;
  /** Total and worst milliseconds of a drawn frame (`paso` + `dibujar`). */
  ms: number;
  max: number;
  /** Times the scene was swapped (`poner`): the script waits on it after a key press. Never reset. */
  cambios: number;
  reiniciar(): void;
}

let instancia: Pantalla | null = null;
/** The one canvas of the game (created in main.ts). */
export const pantalla = (): Pantalla => instancia!;

export class Pantalla {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  alto = ALTO_MIN;
  escena: Escena | null = null;
  private sucio = true;
  private ultimoFotograma = 0;
  private ultimoDibujo = 0;
  private marco: HTMLElement;
  private med: Medidas | null = null;
  /** Called after the canvas is resized, before the redraw. */
  alCambiarTamano: (() => void) | null = null;
  /** Called at the start of every draw (the input clears its hit zones here). */
  antesDeDibujar: (() => void) | null = null;

  constructor(raiz: HTMLElement) {
    instancia = this;
    document.documentElement.style.cssText = 'background:#101820;height:100%;';
    document.body.style.cssText = 'margin:0;height:100%;background:#101820;overflow:hidden;overscroll-behavior:none;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;';
    raiz.style.cssText =
      'position:fixed;inset:0;box-sizing:border-box;display:flex;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);background:#101820;touch-action:none;';
    this.marco = document.createElement('div');
    this.marco.style.cssText = 'flex:1;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center;';
    raiz.appendChild(this.marco);
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'image-rendering:pixelated;image-rendering:crisp-edges;display:block;touch-action:none;outline:none;';
    this.canvas.tabIndex = 0;
    this.marco.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.ajustar();
    addEventListener('resize', () => this.ajustar());
    addEventListener('orientationchange', () => setTimeout(() => this.ajustar(), 100));
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    // Back from the background the browser may have dropped the canvas's contents: draw again.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sucio = true;
    });
    if (new URLSearchParams(location.search).has('medir')) {
      const m: Medidas = {
        rafs: 0,
        dibujos: 0,
        ms: 0,
        max: 0,
        cambios: 0,
        reiniciar: () => {
          m.rafs = m.dibujos = m.ms = m.max = 0;
        },
      };
      this.med = m;
      (window as unknown as { __medir?: Medidas }).__medir = m;
    }
    requestAnimationFrame(this.vuelta);
  }

  /** One closure for the whole life of the loop (a new one every frame is garbage the phone has to collect). */
  private vuelta = (t: number) => this.bucle(t);

  /** Recomputes the logical height from the shape of the screen and the CSS size of the canvas. */
  private ajustar() {
    const cw = Math.max(1, this.marco.clientWidth || innerWidth);
    const ch = Math.max(1, this.marco.clientHeight || innerHeight);
    const alto = Math.min(ALTO_MAX, Math.max(ALTO_MIN, Math.round((ANCHO * ch) / cw)));
    const escala = Math.min(cw / ANCHO, ch / alto);
    this.canvas.style.width = `${Math.floor(ANCHO * escala)}px`;
    this.canvas.style.height = `${Math.floor(alto * escala)}px`;
    if (alto !== this.alto || this.canvas.width !== ANCHO) {
      this.alto = alto;
      this.canvas.width = ANCHO;
      this.canvas.height = alto;
      this.ctx.imageSmoothingEnabled = false;
    }
    this.alCambiarTamano?.();
    this.sucio = true;
  }

  poner(e: Escena | null) {
    if (this.med) this.med.cambios++;
    this.escena = e;
    this.sucio = true;
  }

  /** Asks for a redraw on the next frame. */
  redibujar() {
    this.sucio = true;
  }

  private bucle(ahora: number) {
    requestAnimationFrame(this.vuelta);
    // 60 fps at most, even on a 120 Hz screen.
    if (ahora - this.ultimoFotograma < 15) return;
    const dt = Math.min(100, ahora - this.ultimoFotograma);
    this.ultimoFotograma = ahora;
    const e = this.escena;
    if (!e) return;
    const m = this.med;
    const t0 = m ? performance.now() : 0;
    if (m) m.rafs++;
    const anima = e.paso?.(dt, ahora) === true;
    if (!anima && !this.sucio && (e.estatica || ahora - this.ultimoDibujo < 250)) return;
    this.sucio = false;
    this.ultimoDibujo = ahora;
    this.antesDeDibujar?.();
    this.ctx.imageSmoothingEnabled = false;
    e.dibujar(this.ctx, ahora);
    if (m) {
      const d = performance.now() - t0;
      m.dibujos++;
      m.ms += d;
      if (d > m.max) m.max = d;
    }
  }
}
