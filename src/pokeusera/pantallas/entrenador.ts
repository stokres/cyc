// PokéUsera · trainer pick: the seven friends in a 4+3 grid (full-body portraits breathing at two frames a
// second). Tap one to select it (its perk is named and explained in the strip below), tap it again or ELEGIR to pick it.
import { ENTRENADORES, type EntrenadorId } from '../tipos';
import { ANCHO_ENT2, entrenador2 } from '../arte2/entrenadores2';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI } from '../arte2/paleta2';
import { panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { pantalla, ANCHO, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { dibujarFondoBar, plataformaCacheada } from './fondos';
import { Firma, boton, centrado, colorEnt, colorEntOsc, envolver, nombreEnt, rect, reposo, t, texto2, TINTA2 } from './ui';
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
    // The draft's tune is fetched and decoded now, while the player chooses (it would otherwise start a second late).
    sonido.precargar('draft');
    // Lines the longest perk description takes in the strip (so the layout does not jump between trainers).
    const LINEAS_MAX = Math.max(...ENTRENADORES.map((id) => envolver(t(`entrenador.${id}.perk_d`), ANCHO - 26).length));
    // Only the portraits breathe (two frames a second, out of step): redraw when one of them changes frame.
    const firma = new Firma(ENTRENADORES.length);
    const e: Escena = {
      paso: (_dt, ahora) => {
        for (let i = 0; i < ENTRENADORES.length; i++) firma.v[i] = reposo(ahora, i * 170);
        return firma.cambio();
      },
      dibujar(ctx, ahora) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.3);
        const tit = t('entrenador.titulo');
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 8, tw, 26);
        centrado(ctx, tit, 18);
        const N = ENTRENADORES.length;
        const PORFILA = 4;
        const cw = 55;
        const sep = 4;
        // Bottom block: the perk strip (stable height: its name and the longest description) and the buttons.
        const lin = envolver(t(`entrenador.${ENTRENADORES[sel]}.perk_d`), ANCHO - 26);
        const ph = 8 + 12 + 12 * LINEAS_MAX + 6;
        const bloque = ph + 6 + 26 + 8;
        const gridH = H - 40 - bloque - 4;
        const hueco = gridH > 300 ? 10 : 6;
        const ch = Math.max(108, Math.min(138, Math.floor((gridH - hueco) / 2)));
        // Everything stacked (grid, strip, buttons) and centred in the space under the title.
        const total = 2 * ch + hueco + 8 + ph + 8 + 26;
        const y0 = 40 + Math.max(0, Math.floor((H - 40 - 6 - total) / 2));
        ENTRENADORES.forEach((id, i) => {
          const fila = Math.floor(i / PORFILA);
          const enFila = Math.min(PORFILA, N - fila * PORFILA);
          const x0 = Math.floor((ANCHO - (enFila * cw + (enFila - 1) * sep)) / 2);
          const x = x0 + (i % PORFILA) * (cw + sep);
          const y = y0 + fila * (ch + hueco);
          const col = colorEnt(id);
          const dentro = i === sel;
          if (dentro) {
            rect(ctx, ORO_UI, x - 3, y - 3, cw + 6, ch + 6);
            rect(ctx, '#3b2a3f', x - 1, y - 1, cw + 2, ch + 2);
          }
          panelCacheado(ctx, x, y, cw, ch, col, colorEntOsc(id));
          const foot = y + 12 + 80 - 4;
          const mat = plataformaCacheada(24, 5);
          ctx.drawImage(mat, x + Math.floor((cw - mat.width) / 2), foot - 13);
          ctx.drawImage(entrenador2(id, reposo(ahora, i * 170)), x + Math.floor((cw - ANCHO_ENT2) / 2), y + 12);
          const nombre = nombreEnt(id);
          texto2(ctx, nombre, x + Math.floor((cw - anchoTexto2(nombre)) / 2), y + ch - 20, TINTA2);
          rect(ctx, colorEntOsc(id), x + 8, y + ch - 9, cw - 16, 2);
          entrada.zona(x, y, cw, ch, () => {
            if (sel === i) fin(id);
            else {
              sel = i;
              sonido.efecto('cursor');
            }
          });
        });
        // The selected trainer's perk: its name and one description, under the grid.
        const yp = y0 + 2 * ch + hueco + 8;
        const elegido = ENTRENADORES[sel];
        panelCacheado(ctx, 8, yp, ANCHO - 16, ph, colorEnt(elegido), colorEntOsc(elegido));
        texto2(ctx, t(`entrenador.${elegido}.perk`), 13, yp + 8, colorEntOsc(elegido), null);
        lin.forEach((l, k) => texto2(ctx, l, 13, yp + 8 + 12 + k * 12, TINTA2, null));
        const yv = yp + ph + 8;
        const bw = 106;
        boton(ctx, 8, yv, bw, 26, t('entrenador.elegir'), true, true, 'principal');
        entrada.zona(8, yv, bw, 26, () => fin(ENTRENADORES[sel]));
        boton(ctx, ANCHO - 8 - bw, yv, bw, 26, t('entrenador.volver'), false);
        entrada.zona(ANCHO - 8 - bw, yv, bw, 26, () => fin(null));
      },
      accion(a) {
        if (a === 'atras') fin(null);
        else if (a === 'der') sel = (sel + 1) % ENTRENADORES.length;
        else if (a === 'izq') sel = (sel + ENTRENADORES.length - 1) % ENTRENADORES.length;
        else if (a === 'arriba' || a === 'abajo') sel = sel < 4 ? Math.min(sel + 4, ENTRENADORES.length - 1) : sel - 4;
        else if (a === 'aceptar') fin(ENTRENADORES[sel]);
        if (a !== 'atras' && a !== 'aceptar') sonido.efecto('cursor');
        return true;
      },
    };
    p.poner(e);
  });
}
