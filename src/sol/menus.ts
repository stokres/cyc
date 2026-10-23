// The menus of the world (outside the fights): the START menu with its four sections, the shop, the inn and the
// small windows they share. Here only the drawing and the buttons; the scripts that use them are in sol.ts.
// Windows are painted once into cached canvases; per frame only drawImage of those and a few glyphs
// (docs/ESTILO.md, T5). The text always comes from the texts file.
import { texto } from '../juego/textos';
import type { Mandos } from './consola';
import { anchoTexto, escribir } from './fuente';
import { AMIGOS, expTotal, statsDe, type Grupo, type Miembro } from './grupo';
import { manoCursor, PANTALLA_W, ventana } from './interfaz';
import { apuntador as imgApuntador } from './iconos';
import { apuntadorPorId, poderesDe } from './poderes';
import { marco, type Amigo } from './personajes';
import { ctx, lienzo, rect } from './pixel';
import { retrato } from './retratos';

// ---------------------------------------------------------------- the buttons as events

export type Tecla = 'a' | 'b' | 'arriba' | 'abajo' | 'izq' | 'der' | 'start';

/** The buttons turned into events a menu script can await, with repeat on the directions (as in the fight). */
export class Teclas {
  private cola: Tecla[] = [];
  private esperando: ((t: Tecla) => void) | null = null;
  private previa = { x: 0, y: 0 };
  private repite = { x: 0, y: 0 };

  /** Reads the buttons; call it every frame while a menu is open and no text window is. */
  leer(dt: number, m: Mandos) {
    if (m.tomarA()) this.emitir('a');
    if (m.tomarB()) this.emitir('b');
    if (m.tomarStart()) this.emitir('start');
    m.tomarR();
    m.tomarL();
    m.tomarArribaAbajo();
    const eje = (v: number, prev: number, rep: 'x' | 'y', neg: Tecla, pos: Tecla) => {
      if (v !== 0 && v !== prev) {
        this.repite[rep] = 0.34;
        this.emitir(v < 0 ? neg : pos);
      } else if (v !== 0) {
        this.repite[rep] -= dt;
        if (this.repite[rep] <= 0) {
          this.repite[rep] = 0.11;
          this.emitir(v < 0 ? neg : pos);
        }
      }
    };
    eje(m.x, this.previa.x, 'x', 'izq', 'der');
    eje(m.y, this.previa.y, 'y', 'arriba', 'abajo');
    this.previa = { x: m.x, y: m.y };
  }

  private emitir(t: Tecla) {
    if (this.esperando) {
      const r = this.esperando;
      this.esperando = null;
      r(t);
    } else this.cola.push(t);
  }

  /** The next button (those pressed while nothing was waiting are kept). */
  siguiente(): Promise<Tecla> {
    if (this.cola.length) return Promise.resolve(this.cola.shift()!);
    return new Promise((res) => {
      this.esperando = res;
    });
  }

  /** Forgets what was pressed meanwhile. */
  vaciar() {
    this.cola = [];
  }
}

// ---------------------------------------------------------------- lists

export interface ItemLista {
  txt: string;
  /** Right-aligned text (a price, a count). */
  der?: string;
  gris?: boolean;
}

/** A window with a list and the pointing hand at `cursor` (−1: no hand). Returns the size of the window. */
export function dibujarLista(g: CanvasRenderingContext2D, items: ItemLista[], cursor: number, x: number, y: number, t: number, anchoMin = 0): { w: number; h: number } {
  const izq = Math.max(0, ...items.map((i) => anchoTexto(i.txt)));
  const der = Math.max(0, ...items.map((i) => (i.der ? anchoTexto(i.der) : 0)));
  const w = Math.max(anchoMin, 24 + izq + (der ? der + 10 : 0) + 6);
  const h = items.length * 11 + 10;
  g.drawImage(ventana(w, h), x, y);
  items.forEach((it, i) => {
    const col = it.gris ? '#7a86c0' : '#ffffff';
    escribir(g, it.txt, x + 20, y + 5 + i * 11, col, '#0a1450');
    if (it.der) escribir(g, it.der, x + w - 7 - anchoTexto(it.der), y + 5 + i * 11, it.gris ? '#7a86c0' : '#ffe27a', '#0a1450');
  });
  if (cursor >= 0) g.drawImage(manoCursor(), x + 6 + (Math.floor(t / 0.25) % 2), y + 6 + cursor * 11);
  return { w, h };
}

/** A small window with one line of text. */
export function dibujarCartel(g: CanvasRenderingContext2D, s: string, x: number, y: number, w?: number) {
  const ancho = w ?? anchoTexto(s) + 16;
  g.drawImage(ventana(ancho, 19), x, y);
  escribir(g, s, x + 8, y + 5, '#ffffff', '#0a1450');
}

/** A window with a label and a number (coins), the number in gold. */
export function dibujarMonedas(g: CanvasRenderingContext2D, n: number, x: number, y: number, w = 74) {
  g.drawImage(ventana(w, 19), x, y);
  escribir(g, texto('menu.monedas'), x + 8, y + 5, '#9ab4ff', '#0a1450');
  const s = String(n);
  escribir(g, s, x + w - 8 - anchoTexto(s), y + 5, '#ffe27a', '#0a1450');
}

// ---------------------------------------------------------------- the friend's card

const CARTAS = new Map<string, HTMLCanvasElement>();
const LARGO_CARTA = 150;
const ALTO_CARTA = 35;

function barra(x: CanvasRenderingContext2D, px: number, py: number, w: number, v: number, max: number, col: string, colBajo: string) {
  rect(x, '#0a0f3a', px, py, w, 5);
  rect(x, '#25398f', px + 1, py + 1, w - 2, 3);
  const n = Math.round(Math.max(0, Math.min(1, v / Math.max(1, max))) * (w - 2));
  rect(x, v <= max * 0.25 ? colBajo : col, px + 1, py + 1, n, 3);
}

/** The card of a friend: his little walking sprite, name, level and the bars of health and IP. Cached by its numbers. */
export function carta(g: Grupo, m: Miembro, resaltada: boolean): HTMLCanvasElement {
  const s = statsDe(g, m);
  const clave = `${m.q}.${m.nivel}.${m.pv}.${m.ip}.${s.pv}.${s.ip}.${resaltada}`;
  let c = CARTAS.get(clave);
  if (c) return c;
  if (CARTAS.size > 96) CARTAS.clear();
  c = lienzo(LARGO_CARTA, ALTO_CARTA);
  const x = ctx(c);
  x.drawImage(ventana(LARGO_CARTA, ALTO_CARTA), 0, 0);
  x.drawImage(marco(m.q, 'S', 0), 6, 6);
  const ko = m.pv <= 0;
  escribir(x, texto(`nombre.${m.q}`), 26, 4, ko ? '#ff9a9a' : resaltada ? '#ffe27a' : '#ffffff', '#0a1450');
  const nv = `${texto('estado.nivel')} ${m.nivel}`;
  escribir(x, nv, LARGO_CARTA - 8 - anchoTexto(nv), 4, '#c9d6ff', '#0a1450');
  const fila = (py: number, etiqueta: string, v: number, max: number, col: string, colBajo: string) => {
    escribir(x, etiqueta, 26, py, '#9ab4ff', '#0a1450');
    const val = `${v}/${max}`;
    escribir(x, val, 66, py, v <= max * 0.25 ? '#ff9a9a' : '#ffffff', '#0a1450');
    barra(x, 112, py + 3, 32, v, max, col, colBajo);
  };
  fila(14, texto('etiqueta.pv'), m.pv, s.pv, '#6af0a0', '#ff6a6a');
  fila(24, texto('etiqueta.ip'), m.ip, s.ip, '#6ab4ff', '#6ab4ff');
  CARTAS.set(clave, c);
  return c;
}

// ---------------------------------------------------------------- the START menu's screen

/** The party's cards stacked at the right of the screen. */
export function dibujarCartas(g: CanvasRenderingContext2D, grupo: Grupo, sel: number, manoEnCarta: boolean, t: number) {
  grupo.miembros.forEach((m, i) => {
    const y = 4 + i * 38;
    g.drawImage(carta(grupo, m, i === sel), PANTALLA_W - LARGO_CARTA - 4, y);
    if (manoEnCarta && i === sel) g.drawImage(manoCursor(), PANTALLA_W - LARGO_CARTA - 4 - 13 + (Math.floor(t / 0.25) % 2), y + 13);
  });
}

// ---------------------------------------------------------------- the status screen

/** The complete card of a friend: portrait, level, element, the five numbers, his prompters and what he knows. */
export function dibujarEstado(g: CanvasRenderingContext2D, grupo: Grupo, idx: number, t: number) {
  const m = grupo.miembros[idx];
  const s = statsDe(grupo, m);
  const x0 = 6;
  const y0 = 5;
  g.drawImage(ventana(228, 150), x0, y0);
  const sh = '#0a1450';
  const lab = '#9ab4ff';
  // the portrait in its own window, and the little sprite beside it
  g.drawImage(ventana(40, 40), x0 + 8, y0 + 8);
  g.drawImage(retrato(m.q, true, false), x0 + 12, y0 + 12);
  g.drawImage(marco(m.q, 'S', 0), x0 + 52, y0 + 22);
  escribir(g, texto(`nombre.${m.q}`), x0 + 52, y0 + 8, '#ffe27a', sh);
  escribir(g, `${texto('estado.nivel')} ${m.nivel}`, x0 + 82, y0 + 22, '#ffffff', sh);
  escribir(g, texto(`elemento.${AMIGOS[m.q].elemento}`), x0 + 82, y0 + 34, '#c9d6ff', sh);
  // the numbers, in two columns
  const filas: Array<[string, string]> = [
    [texto('etiqueta.pv'), `${m.pv}/${s.pv}`],
    [texto('etiqueta.ip'), `${m.ip}/${s.ip}`],
    [texto('etiqueta.atk'), String(s.atk)],
    [texto('etiqueta.def'), String(s.def)],
    [texto('etiqueta.agi'), String(s.agi)],
    [texto('etiqueta.exp'), `${m.exp}/${expTotal(m.nivel + 1)}`],
  ];
  filas.forEach(([l, v], i) => {
    const cx = x0 + 126 + Math.floor(i / 3) * 0;
    const cy = y0 + 8 + i * 10;
    escribir(g, l, cx, cy, lab, sh);
    escribir(g, v, cx + 50, cy, '#ffffff', sh);
  });
  // what he knows: the powers
  escribir(g, texto('orden.poder'), x0 + 10, y0 + 74, lab, sh);
  const poderes = poderesDe(m.q, m.nivel);
  poderes.forEach((p, i) => {
    escribir(g, texto(`poder.${p.id}.nombre`), x0 + 16, y0 + 87 + i * 11, '#ffffff', sh);
    escribir(g, String(p.ip), x0 + 100 - anchoTexto(String(p.ip)), y0 + 87 + i * 11, '#ffe27a', sh);
  });
  // his prompters
  escribir(g, texto('orden.apuntadores'), x0 + 126, y0 + 74, lab, sh);
  const mias = grupo.apuntadores.filter((a) => a.dueno === m.q);
  mias.forEach((a, i) => {
    g.drawImage(imgApuntador(apuntadorPorId(a.id).el, Math.floor(t * 2) % 2), x0 + 128, y0 + 84 + i * 20);
    escribir(g, texto(`apuntador.${a.id}.nombre`), x0 + 144, y0 + 86 + i * 20, '#ffffff', sh);
    escribir(g, texto(`apuntador.estado.${a.estado}`), x0 + 144, y0 + 96 + i * 20, a.estado === 'puesto' ? '#8cf08c' : '#ffe27a', sh);
  });
  if (!mias.length) escribir(g, texto('estado.ninguno'), x0 + 128, y0 + 87, '#7a86c0', sh);
  // arrows to change friend
  if (grupo.miembros.length > 1) {
    const bob = Math.floor(t / 0.35) % 2;
    escribir(g, '<', x0 + 1 - bob, y0 + 70, '#ffffff', sh);
    escribir(g, '>', x0 + 219 + bob, y0 + 70, '#ffffff', sh);
  }
}

// ---------------------------------------------------------------- the prompters' screen

/** The detail of a prompter: its sprite, its element, whose it is, how it is and the bonus it gives. */
export function dibujarDetalleApuntador(g: CanvasRenderingContext2D, id: string, dueno: Amigo, estado: string, turnos: number, bonos: string[], x: number, y: number, t: number) {
  const sh = '#0a1450';
  g.drawImage(ventana(150, 102), x, y);
  const def = apuntadorPorId(id);
  g.drawImage(imgApuntador(def.el, Math.floor(t * 2) % 2), x + 10, y + 10);
  escribir(g, texto(`apuntador.${id}.nombre`), x + 30, y + 8, '#ffe27a', sh);
  escribir(g, texto(`elemento.${def.el}`), x + 30, y + 19, '#c9d6ff', sh);
  escribir(g, texto('apuntador.dueno'), x + 10, y + 34, '#9ab4ff', sh);
  escribir(g, texto(`nombre.${dueno}`), x + 66, y + 34, '#ffffff', sh);
  escribir(g, texto('apuntador.estado'), x + 10, y + 45, '#9ab4ff', sh);
  const est = texto(`apuntador.estado.${estado}`) + (estado === 'recupera' ? ` ${turnos}` : '');
  escribir(g, est, x + 66, y + 45, estado === 'puesto' ? '#8cf08c' : '#ffe27a', sh);
  escribir(g, texto('apuntador.bono'), x + 10, y + 56, '#9ab4ff', sh);
  bonos.forEach((b, i) => escribir(g, b, x + 14 + (i % 2) * 66, y + 67 + Math.floor(i / 2) * 11, '#ffffff', sh));
}
