// PokéUsera · trainer pick: the four friends in a 2×2 grid; tap one.
import { ENTRENADORES, type EntrenadorId } from '../tipos';
import { dibujarTexto } from '../arte/fuente';
import { marco } from '../arte/marcos';
import { CLARO, NEGRO } from '../arte/paleta';
import { entrenador, icono } from '../arte/sprites';
import { entrada } from '../entrada';
import { pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { fondoCampo } from './titulo';
import { boton, colorEnt, centrado, dibujaEscalado, nombreEnt, rect, t } from './ui';
import { cargarAjustes } from './ajustes';

export function pantallaEntrenador(): Promise<EntrenadorId | null> {
  return new Promise((res) => {
    const p = pantalla();
    let sel = Math.max(0, ENTRENADORES.indexOf(cargarAjustes().entrenador ?? 'fran'));
    let hecho = false;
    const fin = (v: EntrenadorId | null) => {
      if (hecho) return;
      hecho = true;
      sonido.efecto(v ? 'elegido' : 'atras');
      res(v);
    };
    sonido.musica('titulo');
    const e: Escena = {
      dibujar(ctx) {
        const H = p.alto;
        fondoCampo(ctx, H, Math.round(H * 0.3));
        centrado(ctx, t('entrenador.titulo'), 8, NEGRO, { sombra: CLARO });
        const cw = 72;
        const ch = H < 280 ? 99 : 104;
        const dy = H < 280 ? 6 : 9;
        const hueco = Math.max(4, Math.min(14, Math.floor((H - 22 - 2 * ch - 28) / 2)));
        const y0 = 22 + Math.floor(hueco / 2);
        ENTRENADORES.forEach((id, i) => {
          const x = i % 2 === 0 ? 6 : 82;
          const y = y0 + Math.floor(i / 2) * (ch + hueco);
          marco(ctx, x, y, cw, ch);
          const col = colorEnt(id);
          rect(ctx, col, x + 4, y + 4, cw - 8, 3);
          dibujaEscalado(ctx, entrenador(id), x + 4, y + dy, 64, 80);
          ctx.drawImage(icono(id), x + 8, y + dy + 83);
          dibujarTexto(ctx, nombreEnt(id), x + 20, y + dy + 83, NEGRO);
          if (i === sel) {
            rect(ctx, col, x - 2, y - 2, cw + 4, 2);
            rect(ctx, col, x - 2, y + ch, cw + 4, 2);
            rect(ctx, col, x - 2, y, 2, ch);
            rect(ctx, col, x + cw, y, 2, ch);
          }
          entrada.zona(x, y, cw, ch, () => {
            sel = i;
            fin(id);
          });
        });
        const yv = Math.min(H - 24, y0 + 2 * (ch + hueco) - hueco + 5);
        boton(ctx, 50, yv, 60, 20, t('entrenador.volver'), false);
        entrada.zona(50, yv, 60, 20, () => fin(null));
      },
      accion(a) {
        if (a === 'atras') fin(null);
        else if (a === 'der') sel = sel % 2 === 0 ? sel + 1 : sel - 1;
        else if (a === 'izq') sel = sel % 2 === 1 ? sel - 1 : sel + 1;
        else if (a === 'arriba' || a === 'abajo') sel = (sel + 2) % 4;
        else if (a === 'aceptar') fin(ENTRENADORES[sel]);
        if (a !== 'atras' && a !== 'aceptar') sonido.efecto('cursor');
        return true;
      },
    };
    p.poner(e);
  });
}
