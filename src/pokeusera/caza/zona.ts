// PokéUsera · AVENTURA: one BAR. Its backdrop (dimmed), its name, the panel of the wild useritos that live there (caught ones in colour,
// the missing ones as dark silhouettes), the boss's row and the menu: BUSCAR USERITOS / RETAR A <JEFE> / EQUIPO / VOLVER.
//
// Performance: nothing moves, so the screen is `estatica`; the thumbnails and silhouettes are baked canvases (one blit each).
import { TINTA_SUAVE } from '../arte2/paleta2';
import { anchoTexto2 } from '../arte2/fuente2';
import { filaMenu, panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { dibujarFondoEscenario, miniatura } from '../pantallas/fondos';
import { centrado, colorEnt, colorEntOsc, ficha, mover, nombreEnt, t, texto2 } from '../pantallas/ui';
import { chapa, silueta } from './comun';
import { ZONAS, jefeDe, type Aventura } from './modelo';

export type OpZona = 'buscar' | 'jefe' | 'equipo' | 'volver';
export interface EleccionZona {
  op: OpZona;
  /** The row that was marked, to come back to it. */
  fila: number;
}

const OPS: OpZona[] = ['buscar', 'jefe', 'equipo', 'volver'];
const COLUMNAS = 4;
const CELDA_W = 52;
const CELDA_H = 36;
const ALTO_FILA = 34;

export function pantallaZona(a: Aventura, i: number, fila0 = 0): Promise<EleccionZona> {
  return new Promise((res) => {
    const p = pantalla();
    const z = ZONAS[i];
    const jefe = jefeDe(a, i);
    const nombreJefe = nombreEnt(jefe).toUpperCase();
    let sel = fila0 >= 0 && fila0 < OPS.length ? fila0 : 0;
    let hecho = false;
    const elegir = (k: number) => {
      if (hecho) return;
      sel = k;
      hecho = true;
      sonido.efecto(OPS[k] === 'volver' ? 'atras' : 'aceptar');
      res({ op: OPS[k], fila: k });
    };
    sonido.musica('titulo');
    const filasSalvajes = Math.ceil(z.salvajes.length / COLUMNAS);
    const hSalvajes = 20 + filasSalvajes * CELDA_H + 6;
    const hMenu = ALTO_FILA * OPS.length + 14;
    const hTitulo = 26;
    const hJefe = 36;
    const e: Escena = {
      estatica: true,
      dibujar(ctx) {
        const H = p.alto;
        dibujarFondoEscenario(ctx, z.escenario, H, 0.45);
        // The four blocks share the height: equal gaps, and what is left over goes above and below.
        const suma = hTitulo + hSalvajes + hJefe + hMenu;
        const libre = H - 14 - suma;
        const hueco = Math.max(4, Math.min(12, Math.floor(libre / 3)));
        let y = 6 + Math.max(0, Math.floor((libre - 3 * hueco) / 2));

        const nombre = t(`escenario.${z.escenario}`);
        const tw = anchoTexto2(nombre) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), y, tw, hTitulo);
        centrado(ctx, nombre, y + 10);
        y += hTitulo + hueco;

        // The wild ones of the bar.
        const cuenta = z.salvajes.filter((id) => a.cazados.includes(id)).length;
        panelCacheado(ctx, 8, y, ANCHO - 16, hSalvajes);
        texto2(ctx, t('caza.zona.salvajes', { n: cuenta, total: z.salvajes.length }), 18, y + 8, TINTA_SUAVE, null);
        const x0 = 8 + Math.floor((ANCHO - 16 - COLUMNAS * CELDA_W) / 2);
        z.salvajes.forEach((id, k) => {
          const cx = x0 + (k % COLUMNAS) * CELDA_W + Math.floor((CELDA_W - 32) / 2);
          const cy = y + 20 + Math.floor(k / COLUMNAS) * CELDA_H + 2;
          ctx.drawImage(a.cazados.includes(id) ? miniatura(id) : silueta(id), cx, cy);
        });
        y += hSalvajes + hueco;

        // The boss.
        panelCacheado(ctx, 8, y, ANCHO - 16, hJefe, colorEnt(jefe), colorEntOsc(jefe));
        ficha(ctx, jefe, 17, y + Math.floor((hJefe - 22) / 2), 22);
        texto2(ctx, t('caza.zona.jefe', { quien: nombreJefe }), 46, y + 8);
        const vencido = a.jefes[i];
        texto2(ctx, vencido ? t('caza.zona.vencido') : t('caza.zona.lleva', { n: z.jefeN }), 46, y + 21, vencido ? '#2f7a2f' : TINTA_SUAVE, null);
        if (vencido) chapa(ctx, ANCHO - 8 - 10 - 13, y + Math.floor((hJefe - 13) / 2), colorEnt(jefe));
        y += hJefe + hueco;

        // The menu.
        panelCacheado(ctx, 8, y, ANCHO - 16, hMenu);
        const textos = [t('caza.zona.buscar'), t('caza.zona.retar', { quien: nombreJefe }), t('caza.equipo'), t('caza.volver')];
        const iconos = ['cana', 'luchar', 'userito', null] as const;
        OPS.forEach((_, k) => {
          const yy = y + 8 + k * ALTO_FILA;
          filaMenu(ctx, 14, yy, ANCHO - 28, ALTO_FILA, textos[k], iconos[k], sel === k);
          entrada.zona(12, yy, ANCHO - 24, ALTO_FILA, () => elegir(k));
        });
      },
      accion(a2) {
        if (a2 === 'arriba' || a2 === 'abajo') {
          sel = mover(sel, OPS.length, a2);
          sonido.efecto('cursor');
        } else if (a2 === 'aceptar') elegir(sel);
        else if (a2 === 'atras') elegir(OPS.length - 1);
        return true;
      },
    };
    p.poner(e);
  });
}
