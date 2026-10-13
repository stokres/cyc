// PokéUsera · trainer pick: the four friends in a 2×2 grid (full-body portraits breathing at two frames a
// second). Tap one to select it (its perk is explained in the strip below), tap it again or ELEGIR to pick it.
import { ENTRENADORES, type EntrenadorId } from '../tipos';
import { ANCHO_ENT2, entrenador2, icono2 } from '../arte2/entrenadores2';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI } from '../arte2/paleta2';
import { panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { pantalla, ANCHO, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { dibujarFondoBar, plataformaCacheada } from './fondos';
import { boton, centrado, colorEnt, colorEntOsc, envolver, nombreEnt, rect, reposo, t, texto2, TINTA2 } from './ui';
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
    // Lines the longest perk description takes in the strip (so the layout does not jump between trainers).
    const LINEAS_MAX = Math.max(...ENTRENADORES.map((id) => envolver(t(`entrenador.${id}.perk_d`), ANCHO - 26).length));
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
        // Bottom block: the perk strip (stable height: the longest description) and the buttons.
        const lin = envolver(t(`entrenador.${ENTRENADORES[sel]}.perk_d`), ANCHO - 26);
        const ph = 12 + 12 * LINEAS_MAX + 6;
        const bloque = ph + 6 + 26 + 8;
        const gridH = H - 40 - bloque - 4;
        const hueco = gridH > 300 ? 12 : 8;
        const ch = Math.max(124, Math.min(146, Math.floor((gridH - hueco) / 2)));
        // Everything stacked (grid, strip, buttons) and centred in the space under the title.
        const total = 2 * ch + hueco + 8 + ph + 8 + 26;
        const y0 = 40 + Math.max(0, Math.floor((H - 40 - 6 - total) / 2));
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
          ctx.drawImage(icono2(id), nx, y + ch - 33);
          texto2(ctx, nombre, nx + 20, y + ch - 29);
          const perk = t(`entrenador.${id}.perk`);
          texto2(ctx, perk, x + Math.floor((cw - anchoTexto2(perk)) / 2), y + ch - 14, colorEntOsc(id), null);
          entrada.zona(x, y, cw, ch, () => {
            if (sel === i) fin(id);
            else {
              sel = i;
              sonido.efecto('cursor');
            }
          });
        });
        // The selected trainer's perk, one line of text under the grid.
        const yp = y0 + 2 * ch + hueco + 8;
        panelCacheado(ctx, 8, yp, ANCHO - 16, ph, colorEnt(ENTRENADORES[sel]), colorEntOsc(ENTRENADORES[sel]));
        lin.forEach((l, k) => texto2(ctx, l, 13, yp + 9 + k * 12, TINTA2, null));
        const yv = yp + ph + 8;
        const bw = 106;
        boton(ctx, 8, yv, bw, 26, t('entrenador.elegir'), true);
        entrada.zona(8, yv, bw, 26, () => fin(ENTRENADORES[sel]));
        boton(ctx, ANCHO - 8 - bw, yv, bw, 26, t('entrenador.volver'), false);
        entrada.zona(ANCHO - 8 - bw, yv, bw, 26, () => fin(null));
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
