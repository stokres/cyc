// PokéUsera · AVENTURA: EQUIPO. At the top the three slots of the battle team (the first one «SALE PRIMERO»); under them the grid of
// every userito you have caught. Tap one in the grid to put it in the team (if there is room) or take it out (if it is in and not the
// last one); tap a slot to take that one out (at least one stays). The grid scrolls by dragging (and with the arrow keys).
// It changes `a.equipo` in place; the flow saves when the screen closes.
//
// Performance: slots and cells are baked once per (userito, place in the team); the screen is `estatica` and `paso` returns true only
// while the grid coasts after a drag. The grid is clipped to its window, so only the visible cells cost a blit.
import { anchoTexto2 as anchoLinea } from '../arte2/fuente2';
import { ORO_UI, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { ESPECIE } from '../datos';
import { hornear, panel } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { miniatura } from '../pantallas/fondos';
import { barraArriba, boton, centrado, derecha, fondoPapel, recortar, rect, t, texto2 } from '../pantallas/ui';
import { MAX_EQUIPO, type Aventura } from './modelo';

const COLUMNAS = 3;
const CELDA_W = 72;
const CELDA_H = 48;
const PASO_X = 76;
const PASO_Y = 54;
const X0 = 8;
const SLOT_H = 52;
/** Where the slots' panels start; their captions («SALE PRIMERO») sit 12 px above. */
const Y_SLOTS = 36;

/** A slot of the team: its caption (where it goes in the order), panel, thumbnail and name; `id` null: an empty one. The caption sits above the panel (it is wider than the panel for «SALE PRIMERO»). */
function hueco(id: string | null, k: number): HTMLCanvasElement {
  return hornear(`caza|hueco|${id ?? '-'}|${k}`, PASO_X, SLOT_H + 14, (cx) => {
    const orden = t(k === 0 ? 'caza.equipo.primero' : k === 1 ? 'caza.equipo.segundo' : 'caza.equipo.tercero');
    texto2(cx, orden, 2, 0, k === 0 ? '#a8741c' : TINTA_SUAVE, null);
    cx.translate(0, 12);
    panel(cx, 0, 0, CELDA_W, SLOT_H);
    if (!id) {
      const s = t('caza.equipo.libre');
      texto2(cx, s, Math.floor((CELDA_W - anchoLinea(s)) / 2), 22, '#a898a8', null);
      return;
    }
    cx.drawImage(miniatura(id), Math.floor((CELDA_W - 32) / 2), 3);
    const nom = recortar(ESPECIE[id].nombre, CELDA_W - 8);
    texto2(cx, nom, Math.floor((CELDA_W - anchoLinea(nom)) / 2), 37);
  });
}

/** A cell of the grid; `orden` 0 = not in the team, 1..3 = its place in it. */
function celda(id: string, orden: number): HTMLCanvasElement {
  return hornear(`caza|celda|${id}|${orden}`, CELDA_W, CELDA_H + 2, (cx) => {
    if (orden > 0) panel(cx, 0, 0, CELDA_W, CELDA_H);
    else panel(cx, 0, 0, CELDA_W, CELDA_H, '#b8a888', '#8a7a60');
    cx.drawImage(miniatura(id), Math.floor((CELDA_W - 32) / 2), 3);
    const nom = recortar(ESPECIE[id].nombre, CELDA_W - 8);
    texto2(cx, nom, Math.floor((CELDA_W - anchoLinea(nom)) / 2), 36);
    if (orden > 0) {
      rect(cx, TINTA2, 4, 4, 11, 12);
      rect(cx, ORO_UI, 5, 5, 9, 10);
      texto2(cx, String(orden), 8, 7, TINTA2, null);
    }
  });
}

export function pantallaEquipo(a: Aventura): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    const n = a.cazados.length;
    const filas = Math.ceil(n / COLUMNAS);
    /** Focus: 0..n-1 a cell of the grid, n the VOLVER button. */
    let sel = Math.max(0, a.cazados.indexOf(a.equipo[0]));
    let scroll = 0;
    let vel = 0;
    let arrastrando = false;
    let ultT = 0;
    let aviso: 'lleno' | 'ultimo' | null = null;
    let hecho = false;
    let yg = 0;
    let yFin = 0;
    const alto = () => filas * PASO_Y - 4 + 4;
    const maxScroll = () => Math.max(0, alto() - (yFin - yg));
    const limitar = (v: number) => Math.max(0, Math.min(maxScroll(), v));
    const salir = () => {
      if (hecho) return;
      hecho = true;
      sonido.efecto('atras');
      res();
    };
    const alternar = (id: string) => {
      const k = a.equipo.indexOf(id);
      if (k >= 0) {
        if (a.equipo.length <= 1) {
          aviso = 'ultimo';
          sonido.efecto('falla');
        } else {
          a.equipo.splice(k, 1);
          aviso = null;
          sonido.efecto('atras');
        }
      } else if (a.equipo.length >= MAX_EQUIPO) {
        aviso = 'lleno';
        sonido.efecto('falla');
      } else {
        a.equipo.push(id);
        aviso = null;
        sonido.efecto('elegido');
        sonido.grito(id);
      }
      p.redibujar();
    };
    /** Scrolls so the focused cell is in the window. */
    const verSel = () => {
      if (sel >= n) {
        scroll = maxScroll();
        return;
      }
      const y = 2 + Math.floor(sel / COLUMNAS) * PASO_Y;
      if (y < scroll) scroll = y;
      else if (y + CELDA_H + 2 > scroll + (yFin - yg)) scroll = y + CELDA_H + 2 - (yFin - yg);
      scroll = limitar(scroll);
    };
    sonido.musica('titulo');
    const e: Escena = {
      estatica: true,
      paso(dt) {
        if (!arrastrando && Math.abs(vel) > 0.02) {
          const antes = scroll;
          scroll = limitar(scroll + vel * dt);
          vel = scroll === antes ? 0 : vel * Math.exp(-dt / 260);
          return true;
        }
        if (!arrastrando) vel = 0;
        return false;
      },
      dibujar(ctx) {
        const H = p.alto;
        fondoPapel(ctx, H);
        yg = Y_SLOTS + SLOT_H + 22;
        yFin = H - 40;
        scroll = limitar(scroll);

        // The grid first (clipped to its window), the rest on top.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, yg, ANCHO, yFin - yg);
        ctx.clip();
        a.cazados.forEach((id, k) => {
          const x = X0 + (k % COLUMNAS) * PASO_X;
          const y = yg + 2 + Math.floor(k / COLUMNAS) * PASO_Y - scroll;
          if (y + CELDA_H + 2 < yg || y > yFin) return;
          ctx.drawImage(celda(id, a.equipo.indexOf(id) + 1), x, y);
          if (k === sel) {
            rect(ctx, ORO_UI, x - 2, y - 2, CELDA_W + 4, 2);
            rect(ctx, ORO_UI, x - 2, y + CELDA_H, CELDA_W + 4, 2);
            rect(ctx, ORO_UI, x - 2, y, 2, CELDA_H);
            rect(ctx, ORO_UI, x + CELDA_W, y, 2, CELDA_H);
          }
          const zy = Math.max(y, yg);
          const zh = Math.min(y + CELDA_H, yFin) - zy;
          if (zh > 8)
            entrada.zona(x, zy, CELDA_W, zh, () => {
              sel = k;
              alternar(id);
            });
        });
        ctx.restore();
        const ms = maxScroll();
        if (ms > 0) {
          const th = Math.max(16, Math.round(((yFin - yg) * (yFin - yg)) / alto()));
          rect(ctx, '#d2c096', ANCHO - 5, yg, 3, yFin - yg);
          rect(ctx, '#8a7690', ANCHO - 5, yg + Math.round(((yFin - yg - th) * scroll) / ms), 3, th);
        }

        barraArriba(ctx);
        texto2(ctx, t('caza.equipo.titulo'), 8, 6);
        derecha(ctx, `${a.equipo.length}/${MAX_EQUIPO}`, ANCHO - 8, 6);

        // The slots.
        for (let k = 0; k < MAX_EQUIPO; k++) {
          const id = a.equipo[k] ?? null;
          const x = X0 + k * PASO_X;
          ctx.drawImage(hueco(id, k), x, Y_SLOTS - 12);
          if (id) entrada.zona(x, Y_SLOTS, CELDA_W, SLOT_H, () => alternar(id));
        }
        const pista = aviso ? t(`caza.equipo.${aviso}`) : t('caza.equipo.pista');
        centrado(ctx, pista, Y_SLOTS + SLOT_H + 8, aviso ? '#9c1c1c' : TINTA_SUAVE, { sombra: null });

        const bw = 110;
        const bx = Math.floor((ANCHO - bw) / 2);
        boton(ctx, bx, H - 36, bw, 30, t('caza.volver'), sel >= n);
        entrada.zona(bx, H - 36, bw, 30, salir);
      },
      accion(a2) {
        if (a2 === 'atras') {
          salir();
          return true;
        }
        if (a2 === 'aceptar') {
          if (sel >= n) salir();
          else alternar(a.cazados[sel]);
          return true;
        }
        const antes = sel;
        if (a2 === 'izq') sel = Math.max(0, sel - 1);
        else if (a2 === 'der') sel = Math.min(n, sel + 1);
        else if (a2 === 'arriba') sel = sel >= n ? n - 1 : sel - COLUMNAS >= 0 ? sel - COLUMNAS : sel;
        else if (a2 === 'abajo') sel = sel >= n ? n : sel + COLUMNAS < n ? sel + COLUMNAS : n;
        if (sel !== antes) {
          sonido.efecto('cursor');
          verSel();
          vel = 0;
        }
        return true;
      },
      arrastre(_dx, dy, _total, fin) {
        const ahora = performance.now();
        if (!fin) {
          if (!arrastrando) {
            arrastrando = true;
            vel = 0;
            ultT = ahora;
          }
          const dtm = Math.max(1, ahora - ultT);
          ultT = ahora;
          scroll = limitar(scroll - dy);
          vel = vel * 0.5 - (dy / dtm) * 0.5;
          return;
        }
        arrastrando = false;
        if (ahora - ultT > 90) vel = 0;
        else vel = Math.max(-3, Math.min(3, vel));
      },
    };
    p.poner(e);
    // The window's height is known once the screen has been drawn once; until then the first focus is not scrolled to.
    yg = Y_SLOTS + SLOT_H + 22;
    yFin = p.alto - 40;
    verSel();
  });
}
