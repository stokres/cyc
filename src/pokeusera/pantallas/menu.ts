// PokéUsera · main menu: JUGAR SOLO / JUGAR ONLINE / AJUSTES.
import { filaMenu, panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { dibujarFondoBar } from './fondos';
import { dibujarLogo } from './titulo';
import { mover, t } from './ui';

export type OpcionMenu = 'solo' | 'online' | 'ajustes' | 'titulo';
const OPCIONES: OpcionMenu[] = ['solo', 'online', 'ajustes'];
const ICONOS: Record<string, string> = { solo: 'luchar', online: 'online', ajustes: 'ajustes' };

export function pantallaMenu(inicial: OpcionMenu = 'solo'): Promise<OpcionMenu> {
  return new Promise((res) => {
    const p = pantalla();
    let sel = Math.max(0, OPCIONES.indexOf(inicial));
    let hecho = false;
    const elegir = (o: OpcionMenu) => {
      if (hecho) return;
      hecho = true;
      sonido.efecto(o === 'titulo' ? 'atras' : 'aceptar');
      res(o);
    };
    sonido.musica('titulo');
    const e: Escena = {
      dibujar(ctx) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.12);
        dibujarLogo(ctx, 18 + Math.round((H - 384) * 0.08));
        const w = 200;
        const x = Math.floor((ANCHO - w) / 2);
        const fila = 34;
        const h = fila * OPCIONES.length + 14;
        const y = Math.round(H * 0.5) + Math.round((H - 384) * 0.05);
        panelCacheado(ctx, x, y, w, h);
        OPCIONES.forEach((o, i) => {
          const yy = y + 8 + i * fila;
          filaMenu(ctx, x + 6, yy, w - 12, fila, t(`menu.${o}`), ICONOS[o], i === sel);
          entrada.zona(x + 4, yy, w - 8, fila, () => {
            sel = i;
            elegir(o);
          });
        });
      },
      accion(a) {
        if (a === 'arriba' || a === 'abajo') {
          sel = mover(sel, OPCIONES.length, a);
          sonido.efecto('cursor');
          return true;
        }
        if (a === 'aceptar') elegir(OPCIONES[sel]);
        else if (a === 'atras') elegir('titulo');
        return true;
      },
    };
    p.poner(e);
  });
}
