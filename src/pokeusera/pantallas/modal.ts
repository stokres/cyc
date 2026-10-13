// PokéUsera · modal layer: draws a box over the screen that was showing (which keeps animating
// underneath), takes all taps and keys, and gives the screen back when it closes.
import { anchoTexto2 } from '../arte2/fuente2';
import { panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { oscurecer, texto2 } from './ui';

export function sobre<T>(base: Escena | null, crear: (cerrar: (v: T) => void) => Escena): Promise<T> {
  return new Promise((res) => {
    const p = pantalla();
    const anterior = p.escena;
    const cerrar = (v: T) => {
      p.poner(anterior);
      res(v);
    };
    const modal = crear(cerrar);
    p.poner({
      dibujar(ctx, ahora) {
        base?.dibujar(ctx, ahora);
        // Anything under the modal must not react to taps.
        entrada.zona(0, 0, ANCHO, p.alto, () => undefined);
        modal.dibujar(ctx, ahora);
      },
      paso(dt, ahora) {
        const a = base?.paso?.(dt, ahora);
        const b = modal.paso?.(dt, ahora);
        return a === true || b === true;
      },
      accion(a) {
        modal.accion?.(a);
        return true;
      },
      arrastre(dx, dy, total, fin) {
        modal.arrastre?.(dx, dy, total, fin);
      },
    });
  });
}

/** A short message box over `base`; closes on any tap or key. */
export function mensaje(base: Escena | null, lineas: string[]): Promise<void> {
  return sobre<void>(base, (cerrar) => ({
    dibujar(ctx) {
      const h = 24 + lineas.length * 14 + 8;
      const y = Math.round((pantalla().alto - h) / 2);
      oscurecer(ctx, pantalla().alto);
      panelCacheado(ctx, 12, y, ANCHO - 24, h);
      lineas.forEach((l, i) => texto2(ctx, l, Math.floor((ANCHO - anchoTexto2(l)) / 2), y + 15 + i * 14));
      entrada.zona(0, 0, ANCHO, pantalla().alto, () => cerrar());
    },
    accion() {
      cerrar();
    },
  }));
}
