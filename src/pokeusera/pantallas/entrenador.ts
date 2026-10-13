// PokéUsera · trainer pick: the four friends in a 2×2 grid (full-body portraits breathing at two frames a
// second); tap one.
import { ENTRENADORES, type EntrenadorId } from '../tipos';
import { ANCHO_ENT2, entrenador2, icono2 } from '../arte2/entrenadores2';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI } from '../arte2/paleta2';
import { panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { pantalla, ANCHO, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { dibujarFondoBar, plataformaCacheada } from './fondos';
import { boton, centrado, colorEnt, colorEntOsc, nombreEnt, rect, reposo, t, texto2 } from './ui';
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
      paso: () => true,
      dibujar(ctx, ahora) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.3);
        const tit = t('entrenador.titulo');
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 8, tw, 26);
        centrado(ctx, tit, 18);
        const cw = 112;
        const ch = Math.min(130, Math.floor((H - 96) / 2) - 6);
        const hueco = Math.max(8, Math.min(22, Math.floor((H - 40 - 40 - 2 * ch) / 3)));
        const y0 = 40 + Math.max(hueco, Math.floor((H - 40 - 44 - 2 * ch - hueco) / 2));
        ENTRENADORES.forEach((id, i) => {
          const x = i % 2 === 0 ? 5 : 123;
          const y = y0 + Math.floor(i / 2) * (ch + hueco);
          const col = colorEnt(id);
          const dentro = i === sel;
          if (dentro) {
            rect(ctx, ORO_UI, x - 3, y - 3, cw + 6, ch + 6);
            rect(ctx, '#3b2a3f', x - 2, y - 2, cw + 4, ch + 4);
          }
          panelCacheado(ctx, x, y, cw, ch, col, colorEntOsc(id));
          const foot = y + 12 + 80 - 4;
          const mat = plataformaCacheada(24, 5);
          ctx.drawImage(mat, x + Math.floor((cw - mat.width) / 2), foot - 13);
          ctx.drawImage(entrenador2(id, reposo(ahora, i * 170)), x + Math.floor((cw - ANCHO_ENT2) / 2), y + 12);
          const nombre = nombreEnt(id);
          const nw = anchoTexto2(nombre) + 20;
          const nx = x + Math.floor((cw - nw) / 2);
          ctx.drawImage(icono2(id), nx, y + ch - 28);
          texto2(ctx, nombre, nx + 20, y + ch - 24);
          entrada.zona(x, y, cw, ch, () => {
            sel = i;
            fin(id);
          });
        });
        const yv = Math.min(H - 36, y0 + 2 * (ch + hueco) - 2);
        boton(ctx, Math.floor((ANCHO - 100) / 2), yv, 100, 26, t('entrenador.volver'), false);
        entrada.zona(Math.floor((ANCHO - 100) / 2), yv, 100, 26, () => fin(null));
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
