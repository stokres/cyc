// PokéUsera · AVENTURA: the MAP. At the top the trainer, how many useritos you have (of 30) and four bottle caps (one per boss
// beaten); then a row per bar (its name, how many of its useritos you have and a cap if its boss is beaten; closed bars are
// greyed out), the final, EQUIPO, EMPEZAR DE NUEVO and VOLVER.
//
// Performance: nothing moves, so the screen is `estatica` (it redraws only on input); panels, texts, icons and caps are baked/cached blits.
import { ESPECIES } from '../datos';
import { ORO_UI_OSC, SOMBRA_TEXTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { anchoTexto2, dibujarTexto2 } from '../arte2/fuente2';
import { filaMenu, panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { dibujarFondoBar } from '../pantallas/fondos';
import { colorEnt, ficha, mover, nombreEnt, t, texto2 } from '../pantallas/ui';
import { LADO_CHAPA, chapa } from './comun';
import { ZONAS, finalAbierta, jefeDe, zonaAbierta, type Aventura } from './modelo';

export type OpMapa = 'zona' | 'final' | 'equipo' | 'nueva' | 'volver';
export interface EleccionMapa {
  op: OpMapa;
  /** The bar (for `zona`). */
  i: number;
  /** The row that was marked, to come back to it. */
  fila: number;
}

const FILAS: { op: OpMapa; i: number }[] = [
  ...ZONAS.map((_, i) => ({ op: 'zona' as const, i })),
  { op: 'final', i: 0 },
  { op: 'equipo', i: 0 },
  { op: 'nueva', i: 0 },
  { op: 'volver', i: 0 },
];

/** The row the cursor starts on: the first open bar whose boss is still standing, else the final if it is open, else the first bar. */
function filaInicial(a: Aventura): number {
  const k = ZONAS.findIndex((_, i) => zonaAbierta(a, i) && !a.jefes[i]);
  if (k >= 0) return k;
  return finalAbierta(a) && !a.campeon ? ZONAS.length : 0;
}

/** How many of the 30 useritos the player has caught in bar `i` (x of «x/7»). */
export const cazadosDeZona = (a: Aventura, i: number): number => ZONAS[i].salvajes.filter((id) => a.cazados.includes(id)).length;

export function pantallaMapa(a: Aventura, fila0 = -1): Promise<EleccionMapa> {
  return new Promise((res) => {
    const p = pantalla();
    let sel = fila0 >= 0 && fila0 < FILAS.length ? fila0 : filaInicial(a);
    let hecho = false;
    const abierta = (k: number): boolean => {
      const f = FILAS[k];
      return f.op === 'zona' ? zonaAbierta(a, f.i) : f.op === 'final' ? finalAbierta(a) : true;
    };
    const elegir = (k: number) => {
      if (hecho) return;
      sel = k;
      if (!abierta(k)) {
        sonido.efecto('falla');
        p.redibujar();
        return;
      }
      hecho = true;
      sonido.efecto(FILAS[k].op === 'volver' ? 'atras' : 'aceptar');
      res({ op: FILAS[k].op, i: FILAS[k].i, fila: k });
    };
    sonido.musica('titulo');
    const e: Escena = {
      estatica: true,
      dibujar(ctx) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.32);

        // Header: the trainer's tile, name, «CAZADOS n/30» and the four caps.
        const yc = 6;
        panelCacheado(ctx, 8, yc, ANCHO - 16, 46, colorEnt(a.entrenador));
        ficha(ctx, a.entrenador, 16, yc + 11, 24);
        texto2(ctx, nombreEnt(a.entrenador).toUpperCase(), 48, yc + 10);
        texto2(ctx, t('caza.mapa.cazados', { n: a.cazados.length, total: ESPECIES.length }), 48, yc + 26);
        ZONAS.forEach((_, i) => chapa(ctx, ANCHO - 16 - 4 * (LADO_CHAPA + 3) + 3 + i * (LADO_CHAPA + 3), yc + 8, a.jefes[i] ? colorEnt(jefeDe(a, i)) : null));

        // The rows, in a panel; they share the height that is left.
        const yp = yc + 46 + 6;
        const fila = Math.max(30, Math.min(40, Math.floor((H - yp - 14 - 8) / FILAS.length)));
        const w = ANCHO - 16;
        panelCacheado(ctx, 8, yp, w, fila * FILAS.length + 14);
        const x = 8 + 6;
        const wf = w - 12;
        FILAS.forEach((f, k) => {
          const yy = yp + 8 + k * fila;
          const activa = k === sel;
          const ok = abierta(k);
          const sombra = activa ? '#f0c860' : ok ? SOMBRA_TEXTO : null;
          const yt = yy + Math.floor((fila - 6 - 7) / 2) + 1;
          if (f.op === 'zona') {
            const nombre = t(`escenario.${ZONAS[f.i].escenario}`);
            filaMenu(ctx, x, yy, wf, fila, nombre, 'cana', activa, ok);
            if (ok) {
              const vencido = a.jefes[f.i];
              let xr = x + wf - 8;
              if (vencido) {
                xr -= LADO_CHAPA;
                chapa(ctx, xr, yy + Math.floor((fila - 6 - LADO_CHAPA) / 2), colorEnt(jefeDe(a, f.i)));
                xr -= 4;
              }
              const s = t('caza.mapa.cuenta', { n: cazadosDeZona(a, f.i), total: ZONAS[f.i].salvajes.length });
              dibujarTexto2(ctx, s, xr - anchoTexto2(s), yt, TINTA2, sombra);
            } else {
              const s = t('caza.mapa.cerrado');
              dibujarTexto2(ctx, s, x + wf - 8 - anchoTexto2(s), yt, '#a898a8', null);
            }
          } else if (f.op === 'final') {
            // Two lines: FINAL and, smaller in spirit, who is in it.
            filaMenu(ctx, x, yy, wf, fila, '', 'luchar', activa, ok);
            const y1 = yy + Math.floor((fila - 6 - 17) / 2) + 1;
            dibujarTexto2(ctx, t('caza.mapa.final'), x + 37, y1, ok ? TINTA2 : '#a898a8', sombra);
            dibujarTexto2(ctx, t('caza.mapa.final2'), x + 37, y1 + 10, ok ? TINTA_SUAVE : '#a898a8', null);
            const s = ok ? (a.campeon ? t('caza.mapa.campeon') : '') : t('caza.mapa.cerrado');
            if (s) dibujarTexto2(ctx, s, x + wf - 8 - anchoTexto2(s), yt, ok ? ORO_UI_OSC : '#a898a8', ok ? sombra : null);
          } else if (f.op === 'equipo') filaMenu(ctx, x, yy, wf, fila, t('caza.equipo'), 'userito', activa);
          else if (f.op === 'nueva') filaMenu(ctx, x, yy, wf, fila, t('caza.nueva'), null, activa);
          else filaMenu(ctx, x, yy, wf, fila, t('caza.volver'), null, activa);
          entrada.zona(x - 2, yy, wf + 4, fila, () => elegir(k));
        });
      },
      accion(a2) {
        if (a2 === 'arriba' || a2 === 'abajo') {
          sel = mover(sel, FILAS.length, a2);
          sonido.efecto('cursor');
        } else if (a2 === 'aceptar') elegir(sel);
        else if (a2 === 'atras') elegir(FILAS.length - 1);
        return true;
      },
    };
    p.poner(e);
  });
}
