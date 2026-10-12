// PokéUsera · main menu: JUGAR SOLO / JUGAR ONLINE / AJUSTES.
import { marco } from '../arte/marcos';
import { dibujarTexto } from '../arte/fuente';
import { NEGRO } from '../arte/paleta';
import { logo } from '../arte/sprites';
import { cursor } from '../arte/marcos';
import { entrada } from '../entrada';
import { pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { fondoCampo } from './titulo';
import { mover, t } from './ui';

export type OpcionMenu = 'solo' | 'online' | 'ajustes' | 'titulo';
const OPCIONES: OpcionMenu[] = ['solo', 'online', 'ajustes'];

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
        fondoCampo(ctx, H, Math.round(H * 0.42));
        ctx.drawImage(logo(), 0, Math.round(H * 0.06));
        const w = 140;
        const x = 10;
        const fila = 24;
        const y = Math.round(H * 0.40);
        marco(ctx, x, y, w, fila * OPCIONES.length + 12);
        OPCIONES.forEach((o, i) => {
          const yy = y + 6 + i * fila;
          dibujarTexto(ctx, t(`menu.${o}`), x + 26, yy + 8, NEGRO);
          if (i === sel) cursor(ctx, x + 12, yy + 8);
          entrada.zona(x + 2, yy, w - 4, fila, () => {
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
