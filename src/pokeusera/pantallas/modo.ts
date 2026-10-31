// PokéUsera · «¿CÓMO JUGAMOS?»: in solo play, right after the trainer and before the game, two big cards: NORMAL (the draft and La barra) and AL AZAR
// (the game deals the teams and the object). Tap one to play it; the one used last time is marked and starts selected (arrows and Enter also work).
// Online the host picks the mode in the room instead (red/sala.ts). Texts: `modo.*`.
//
// Performance (docs/ESTILO.md, T5/T6): the two cards are baked once and the screen is `estatica`: it redraws only when the selection changes.
import type { ModoJuego } from '../tipos';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI, PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { hornear, panel, panelCacheado, relleno } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { modoElegido } from './ajustes';
import { dibujarFondoBar } from './fondos';
import { boton, centrado, envolver, rect, t, texto2 } from './ui';

const X0 = 8;
const AN = ANCHO - 16;
const MODOS: readonly ModoJuego[] = ['normal', 'azar'];

/** The icon of NORMAL: a little grid of picks with one taken. */
function iconoNormal(cx: CanvasRenderingContext2D, x: number, y: number) {
  for (let i = 0; i < 9; i++) {
    const gx = x + (i % 3) * 10;
    const gy = y + Math.floor(i / 3) * 10;
    relleno(cx, TINTA2, gx, gy, 8, 8);
    relleno(cx, i === 4 ? ORO_UI : PAPEL_ALTO, gx + 1, gy + 1, 6, 6);
  }
}

/** The icon of AL AZAR: a die showing five. */
function iconoAzar(cx: CanvasRenderingContext2D, x: number, y: number) {
  relleno(cx, TINTA2, x, y, 28, 28);
  relleno(cx, PAPEL_ALTO, x + 1, y + 1, 26, 26);
  rect(cx, '#ffffff', x + 3, y + 2, 22, 1);
  for (const [dx, dy] of [[5, 5], [19, 5], [12, 12], [5, 19], [19, 19]]) {
    rect(cx, '#a8323a', x + dx, y + dy, 4, 4);
  }
}

/** One card, baked: icon, name, description and (if it was the last one used) the «ÚLTIMA VEZ» tag. */
function tarjeta(modo: ModoJuego, h: number, ultimo: boolean): HTMLCanvasElement {
  return hornear(`modo|${modo}|${h}|${ultimo ? 1 : 0}`, AN, h + 2, (cx) => {
    panel(cx, 0, 0, AN, h);
    const y = Math.floor((h - 28) / 2);
    (modo === 'azar' ? iconoAzar : iconoNormal)(cx, 12, Math.max(10, y));
    const x = 54;
    texto2(cx, t(`modo.${modo}`), x, 10, TINTA2);
    if (ultimo) {
      const s = t('modo.ultimo');
      const w = anchoTexto2(s) + 8;
      relleno(cx, TINTA2, AN - w - 8, 8, w, 12);
      relleno(cx, '#5a4660', AN - w - 7, 9, w - 2, 10);
      texto2(cx, s, AN - w - 4, 11, '#fdf0c0', null);
    }
    envolver(t(`modo.${modo}.d`), AN - x - 10)
      .slice(0, Math.max(2, Math.floor((h - 34) / 12)))
      .forEach((l, i) => texto2(cx, l, x, 28 + i * 12, TINTA2, null));
  });
}

/** The mode screen. Resolves with the chosen mode, or null if the player goes back. */
export function pantallaModo(): Promise<ModoJuego | null> {
  return new Promise((res) => {
    const p = pantalla();
    const ultimo = modoElegido();
    let sel = MODOS.indexOf(ultimo);
    let hecho = false;
    const fin = (v: ModoJuego | null) => {
      if (hecho) return;
      hecho = true;
      sonido.efecto(v ? 'elegido' : 'atras');
      res(v);
    };
    const e: Escena = {
      estatica: true,
      dibujar(ctx) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.3);
        const tit = t('modo.titulo');
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 8, tw, 26);
        centrado(ctx, tit, 18);
        // Two tall cards in the space between the title and the bottom block, centred.
        const yBajo = H - 36;
        const disponible = yBajo - 40 - 18;
        const hc = Math.max(84, Math.min(104, Math.floor((disponible - 10) / 2)));
        const y0 = 40 + Math.max(0, Math.floor((disponible - (2 * hc + 10)) / 2));
        MODOS.forEach((m, i) => {
          const y = y0 + i * (hc + 10);
          if (i === sel) {
            rect(ctx, ORO_UI, X0 - 3, y - 3, AN + 6, hc + 6);
            rect(ctx, '#3b2a3f', X0 - 1, y - 1, AN + 2, hc + 2);
          }
          ctx.drawImage(tarjeta(m, hc, m === ultimo), X0, y);
          entrada.zona(X0, y, AN, hc, () => {
            sel = i;
            fin(m);
          });
        });
        centrado(ctx, t('modo.pista'), yBajo - 14, TINTA_SUAVE, { sombra: null });
        const bw = 106;
        boton(ctx, Math.floor((ANCHO - bw) / 2), yBajo, bw, 26, t('modo.volver'), false);
        entrada.zona(Math.floor((ANCHO - bw) / 2), yBajo, bw, 26, () => fin(null));
      },
      accion(a) {
        if (a === 'atras') fin(null);
        else if (a === 'aceptar') fin(MODOS[sel]);
        else if (a === 'arriba') sel = 0;
        else if (a === 'abajo') sel = 1;
        else if (a === 'izq' || a === 'der') sel = 1 - sel;
        if (a !== 'atras' && a !== 'aceptar') {
          sonido.efecto('cursor');
          p.redibujar();
        }
        return true;
      },
    };
    p.poner(e);
  });
}
