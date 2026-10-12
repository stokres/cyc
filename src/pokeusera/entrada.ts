// PokéUsera · input. Taps (pointerup on the same zone where the pointer went down) and keys
// (arrows, Enter/Z/Space = accept, Escape/X/Backspace = back). The screen being drawn registers
// its hit zones on every draw (`zona`), later zones on top of earlier ones. The browser's back
// button also counts as «atrás» while a screen handles it.
import { ANCHO, type Pantalla } from './pantalla';
import { sonido } from './sonido';

export type Accion = 'arriba' | 'abajo' | 'izq' | 'der' | 'aceptar' | 'atras';

interface Zona {
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
}

const TECLAS: Record<string, Accion> = {
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  ArrowLeft: 'izq',
  ArrowRight: 'der',
  Enter: 'aceptar',
  z: 'aceptar',
  Z: 'aceptar',
  ' ': 'aceptar',
  Escape: 'atras',
  x: 'atras',
  X: 'atras',
  Backspace: 'atras',
};

class Entrada {
  private zonas: Zona[] = [];
  private pantalla!: Pantalla;
  private bajada: Zona | null = null;
  private yaTocado = false;
  /** Runs once, on the very first tap or key (fullscreen request, audio unlock). */
  primerToque: (() => void) | null = null;

  iniciar(pantalla: Pantalla) {
    this.pantalla = pantalla;
    pantalla.antesDeDibujar = () => (this.zonas.length = 0);
    const cv = pantalla.canvas;
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = this.punto(e);
      this.bajada = this.buscar(p.x, p.y);
    });
    cv.addEventListener('pointerup', (e) => {
      e.preventDefault();
      this.despertar();
      const p = this.punto(e);
      const z = this.buscar(p.x, p.y);
      const b = this.bajada;
      this.bajada = null;
      if (z && b && z.x === b.x && z.y === b.y && z.w === b.w && z.h === b.h) z.fn();
      this.pantalla.redibujar();
    });
    cv.addEventListener('pointercancel', () => (this.bajada = null));
    addEventListener('keydown', (e) => {
      const a = TECLAS[e.key];
      if (!a || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      this.despertar();
      this.accion(a);
    });
    // The browser's back button: a screen that handles «atrás» keeps the page where it is.
    try {
      history.replaceState({ pu: 0 }, '');
      history.pushState({ pu: 1 }, '');
    } catch {
      /* no history */
    }
    addEventListener('popstate', () => {
      const manejado = this.accion('atras');
      if (manejado) {
        try {
          history.pushState({ pu: 1 }, '');
        } catch {
          /* ignore */
        }
      } else {
        try {
          history.back();
        } catch {
          /* ignore */
        }
      }
    });
  }

  private despertar() {
    sonido.desbloquear();
    if (!this.yaTocado) {
      this.yaTocado = true;
      try {
        this.primerToque?.();
      } catch {
        /* ignore */
      }
    }
  }

  /** Registers a tappable rectangle (logical px). Call it from `dibujar`. */
  zona(x: number, y: number, w: number, h: number, fn: () => void) {
    this.zonas.push({ x, y, w, h, fn });
  }

  /** Sends a key action to the current screen; returns whether it was handled. */
  accion(a: Accion): boolean {
    const r = this.pantalla.escena?.accion?.(a) === true;
    this.pantalla.redibujar();
    return r;
  }

  private punto(e: PointerEvent) {
    const r = this.pantalla.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * ANCHO) / r.width, y: ((e.clientY - r.top) * this.pantalla.alto) / r.height };
  }

  private buscar(x: number, y: number): Zona | null {
    for (let i = this.zonas.length - 1; i >= 0; i--) {
      const z = this.zonas[i];
      if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z;
    }
    return null;
  }
}

export const entrada = new Entrada();
