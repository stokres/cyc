// PokéUsera · modal layer: draws a box over the screen that was showing (which keeps animating
// underneath), takes all taps and keys, and gives the screen back when it closes.
import { anchoTexto, dibujarTexto } from '../arte/fuente';
import { marco } from '../arte/marcos';
import { NEGRO } from '../arte/paleta';
import { entrada } from '../entrada';
import { pantalla, type Escena } from '../pantalla';

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
        entrada.zona(0, 0, 160, p.alto, () => undefined);
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
    });
  });
}

/** A short message box over `base`; closes on any tap or key. */
export function mensaje(base: Escena | null, lineas: string[]): Promise<void> {
  return sobre<void>(base, (cerrar) => ({
    dibujar(ctx) {
      const h = 14 + lineas.length * 12 + 10;
      const y = Math.round((pantalla().alto - h) / 2);
      ctx.fillStyle = 'rgba(34,26,20,0.55)';
      ctx.fillRect(0, 0, 160, pantalla().alto);
      marco(ctx, 8, y, 144, h);
      lineas.forEach((l, i) => dibujarTexto(ctx, l, 80 - Math.floor(anchoTexto(l) / 2), y + 12 + i * 12, NEGRO));
      entrada.zona(0, 0, 160, pantalla().alto, () => cerrar());
    },
    accion() {
      cerrar();
    },
  }));
}
