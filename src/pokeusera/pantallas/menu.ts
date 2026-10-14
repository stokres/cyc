// PokéUsera · main menu: JUGAR SOLO / AVENTURA / JUGAR ONLINE / USERITOPEDIA / GUÍA / AJUSTES, plus two rows that only exist when they
// make sense: «Hay versión nueva» (a new version is waiting) and INSTALAR EN EL MÓVIL (see ../aplicacion.ts).
import { app, instalable } from '../aplicacion';
import { filaMenu, hornear, panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { ORO_UI, SOMBRA_TEXTO, TINTA2 } from '../arte2/paleta2';
import { dibujarTexto2 } from '../arte2/fuente2';
import { ALTO_LOGO2 } from '../arte2/logo2';
import { dibujarFondoBar } from './fondos';
import { iconoGuia } from './guia';
import { dibujarLogo } from './titulo';
import { mover, rect, t } from './ui';

export type OpcionMenu = 'solo' | 'aventura' | 'online' | 'useritopedia' | 'guia' | 'ajustes' | 'instalar' | 'actualizar' | 'titulo';
const BASE: OpcionMenu[] = ['solo', 'aventura', 'online', 'useritopedia', 'guia', 'ajustes'];
/** The rows now: the update notice on top, the install option at the end, each only while it applies. */
const opciones = (): OpcionMenu[] => [...(app.hayActualizacion ? (['actualizar'] as const) : []), ...BASE, ...(instalable() ? (['instalar'] as const) : [])];
const ICONOS: Record<string, string> = { solo: 'luchar', aventura: 'cana', online: 'online', useritopedia: 'userito', ajustes: 'ajustes' };

/** A down arrow into a tray, baked once. */
function iconoInstalar(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const c = hornear('icono|instalar', 13, 13, (cx) => {
    const filas = [
      '....kkkkk....',
      '....kgggk....',
      '....kgggk....',
      '.kkkkgggkkkk.',
      '.kgggggggggk.',
      '..kgggggggk..',
      '...kgggggk...',
      '....kgggk....',
      '.....kgk.....',
      '......k......',
      '.............',
      'kkkkkkkkkkkkk',
      'kGGGGGGGGGGGk',
    ];
    const col: Record<string, string> = { k: TINTA2, g: '#e8c25a', G: '#b08428' };
    filas.forEach((fila, j) => {
      for (let i = 0; i < fila.length; i++) if (col[fila[i]]) rect(cx, col[fila[i]], i, j, 1, 1);
    });
  });
  ctx.drawImage(c, x, y);
}

export function pantallaMenu(inicial: OpcionMenu = 'solo'): Promise<OpcionMenu> {
  return new Promise((res) => {
    const p = pantalla();
    let sel: OpcionMenu = opciones().includes(inicial) ? inicial : 'solo';
    let hecho = false;
    // The notice or the install option can appear (or go) while the menu is on: redraw when they do.
    const cambio = () => p.redibujar();
    app.oyentes.add(cambio);
    const elegir = (o: OpcionMenu) => {
      if (hecho) return;
      hecho = true;
      app.oyentes.delete(cambio);
      sonido.efecto(o === 'titulo' ? 'atras' : 'aceptar');
      res(o);
    };
    sonido.musica('titulo');
    const e: Escena = {
      estatica: true,
      dibujar(ctx) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.12);
        dibujarLogo(ctx, 18 + Math.round((H - 384) * 0.08));
        const w = 200;
        const x = Math.floor((ANCHO - w) / 2);
        const lista = opciones();
        if (!lista.includes(sel)) sel = 'solo';
        // 34 px a row; with the update notice and the install row on top of the six it shrinks so the panel stays under the logo.
        const bajoLogo = 18 + Math.round((H - 384) * 0.08) + ALTO_LOGO2 + 4;
        const fila = Math.min(34, Math.floor((H - 8 - bajoLogo - 14) / lista.length));
        const h = fila * lista.length + 14;
        // With the extra rows on a short screen the panel moves up instead of running off the bottom.
        const y = Math.min(Math.round(H * 0.5) + Math.round((H - 384) * 0.05), H - h - 8);
        panelCacheado(ctx, x, y, w, h);
        lista.forEach((o, i) => {
          const yy = y + 8 + i * fila;
          const activa = o === sel;
          if (o === 'actualizar') {
            // The notice: gold frame even when it is not selected, two short lines.
            filaMenu(ctx, x + 6, yy, w - 12, fila, '', null, activa);
            if (!activa) {
              rect(ctx, ORO_UI, x + 6, yy, w - 12, fila - 6);
              rect(ctx, '#fff3c8', x + 7, yy + 1, w - 14, fila - 8);
            }
            dibujarTexto2(ctx, t('menu.actualizar.1'), x + 6 + 18, yy + 4, TINTA2, activa ? '#f0c860' : SOMBRA_TEXTO);
            dibujarTexto2(ctx, t('menu.actualizar.2'), x + 6 + 18, yy + 15, TINTA2, activa ? '#f0c860' : SOMBRA_TEXTO);
          } else if (o === 'instalar') {
            filaMenu(ctx, x + 6, yy, w - 12, fila, '', null, activa);
            iconoInstalar(ctx, x + 6 + 17, yy + Math.floor((fila - 6 - 13) / 2));
            dibujarTexto2(ctx, t('menu.instalar'), x + 6 + 37, yy + Math.floor((fila - 6 - 7) / 2) + 1, TINTA2, activa ? '#f0c860' : SOMBRA_TEXTO);
          } else if (o === 'guia') {
            // The «?» icon is drawn by the guide itself (the menu's icon set has no such one).
            filaMenu(ctx, x + 6, yy, w - 12, fila, '', null, activa);
            iconoGuia(ctx, x + 6 + 17, yy + Math.floor((fila - 6 - 13) / 2));
            dibujarTexto2(ctx, t('menu.guia'), x + 6 + 37, yy + Math.floor((fila - 6 - 7) / 2) + 1, TINTA2, activa ? '#f0c860' : SOMBRA_TEXTO);
          } else filaMenu(ctx, x + 6, yy, w - 12, fila, t(`menu.${o}`), ICONOS[o], activa);
          entrada.zona(x + 4, yy, w - 8, fila, () => {
            sel = o;
            elegir(o);
          });
        });
      },
      accion(a) {
        if (a === 'arriba' || a === 'abajo') {
          const lista = opciones();
          sel = lista[mover(Math.max(0, lista.indexOf(sel)), lista.length, a)];
          sonido.efecto('cursor');
          return true;
        }
        if (a === 'aceptar') elegir(sel);
        else if (a === 'atras') elegir('titulo');
        return true;
      },
    };
    p.poner(e);
  });
}
