// The powers of the map («impronergía» used outside the fights), one for each friend's trick:
//   · Pablo, «Sí, y...»: a hand of stage light pushes statues and props from a distance (the original's Move).
//   · Fran, «Fresquito»: freezes a puddle of beer into a column of ice to step on (Frost).
//   · Guille, «Cierzo»: the wind of Zaragoza blows leaves away and puts candles out (Whirlwind).
//   · Guille, «Abrazo de oso»: lifts a rock of papier-mâché (Lift).
//   · Chuchi, «Leer el chat»: reads what somebody thinks, as WhatsApp-style bubbles (Mind Read).
// Here: the data (who, how much IP, which element), the icon and the HUD window of the chosen power, and the
// chat window. The effects on the map are painted by teatro.ts / sol.ts. Everything is painted once into
// cached canvases (docs/ESTILO.md, T5): per frame only drawImage and a few glyphs.
import { COLOR_ELEMENTO, type Elemento } from './grupo';
import { anchoTexto, escribir, partir } from './fuente';
import { ventana } from './interfaz';
import type { Amigo } from './personajes';
import { poderPorId } from './poderes';
import { ctx, elipse, lienzo, pintar, rect, una } from './pixel';

export type IdPoderMapa = 'siy' | 'fresquito' | 'cierzo' | 'abrazo' | 'chat';

export interface PoderMapa {
  id: IdPoderMapa;
  quien: Amigo;
  /** IP it costs (of the friend who casts it). */
  ip: number;
  el: Elemento;
}

/** In the order L cycles through them. */
export const PODERES_MAPA: readonly PoderMapa[] = [
  { id: 'siy', quien: 'pablo', ip: poderPorId('siy').ip, el: 'tierra' },
  { id: 'fresquito', quien: 'fran', ip: 3, el: 'agua' },
  { id: 'cierzo', quien: 'guille', ip: 3, el: 'viento' },
  { id: 'abrazo', quien: 'guille', ip: 4, el: 'viento' },
  { id: 'chat', quien: 'chuchi', ip: 2, el: 'fuego' },
];
export const poderMapa = (id: string) => PODERES_MAPA.find((p) => p.id === id)!;
export const esPoderMapa = (id: string): id is IdPoderMapa => PODERES_MAPA.some((p) => p.id === id);

// ---------------------------------------------------------------- icons

const MAPAS: Record<IdPoderMapa, string[]> = {
  // an open hand
  siy: [
    '...a.a.a....',
    '...a.a.a.a..',
    '.a.aaaaaaa..',
    '.aaaaaaaaaa.',
    '..aaaaaaaaa.',
    '...aaaaaaa..',
    '....aaaaa...',
  ],
  // a snowflake
  fresquito: [
    '.....a.....',
    '..a..a..a..',
    '...a.a.a...',
    '....aaa....',
    'aaaaabaaaaa',
    '....aaa....',
    '...a.a.a...',
    '..a..a..a..',
    '.....a.....',
  ],
  // three streaks of wind
  cierzo: [
    '..aaaaaa....',
    '.a......a...',
    '........a...',
    '.aaaaaaa....',
    '............',
    'aaaaaaaaaa..',
    '.........a..',
    '.aaaaaaa.a..',
    '.......aa...',
  ],
  // a bear's paw
  abrazo: [
    '..aa...aa..',
    '.aaaa.aaaa.',
    '.aaaa.aaaa.',
    '..aa...aa..',
    '...aaaaa...',
    '..aaaaaaa..',
    '.aaaaaaaaa.',
    '.aaaaaaaaa.',
    '..aaaaaaa..',
  ],
  // a chat bubble
  chat: [
    '.aaaaaaaaaa.',
    'aaaaaaaaaaaa',
    'aaaaaaaaaaaa',
    'aabaabaabaaa',
    'aaaaaaaaaaaa',
    'aaaaaaaaaaaa',
    '.aaaaaaaaaa.',
    '..aaa.......',
    '...aa.......',
    '....a.......',
  ],
};

const COLOR_ICONO: Record<IdPoderMapa, { a: string; b: string }> = {
  siy: { a: '#ffd84a', b: '#fff6c8' },
  fresquito: { a: '#bff0ff', b: '#ffffff' },
  cierzo: { a: '#e0c8ff', b: '#ffffff' },
  abrazo: { a: '#d89a5a', b: '#fff0d0' },
  chat: { a: '#8cf08c', b: '#17331c' },
};

/** The power's icon, 16×16: a dark square with the border of its element and the drawing inside. */
export function iconoPoder(id: IdPoderMapa): HTMLCanvasElement {
  return una(`poder.icono.${id}`, () => {
    const c = lienzo(16, 16);
    const x = ctx(c);
    const el = COLOR_ELEMENTO[poderMapa(id).el];
    rect(x, '#0a0f3a', 1, 0, 14, 16);
    rect(x, '#0a0f3a', 0, 1, 16, 14);
    rect(x, el.medio, 1, 1, 14, 14);
    rect(x, el.claro, 1, 1, 14, 1);
    rect(x, '#10184f', 2, 2, 12, 12);
    const m = MAPAS[id];
    const ox = Math.floor((16 - m[0].length) / 2);
    const oy = Math.floor((16 - m.length) / 2);
    pintar(x, m, { a: COLOR_ICONO[id].a, b: COLOR_ICONO[id].b }, ox, oy);
    return c;
  });
}

/**
 * The HUD window at the top-left: the chosen power's icon (with an R: the button that uses it), its name, the
 * IP of the friend who casts it and a bar. A small L reminds that L changes the power when there are several.
 */
export function contadorPoder(id: IdPoderMapa, nombre: string, ip: number, max: number, destello: boolean, letraIP: string, varios: boolean): HTMLCanvasElement {
  const n = Math.floor(ip);
  return una(`poder.hud.${id}.${nombre}.${n}.${max}.${destello}.${varios}`, () => {
    const w = Math.max(76, 28 + anchoTexto(nombre) + 8 + (varios ? 0 : 0));
    const h = 28;
    const c = lienzo(w, h);
    const x = ctx(c);
    x.drawImage(ventana(w, h), 0, 0);
    x.drawImage(iconoPoder(id), 5, 5);
    rect(x, '#0a0f3a', 3, 18, 7, 7);
    escribir(x, 'R', 4, 14, '#ffd84a', '#0a1450');
    escribir(x, nombre, 25, 3, COLOR_ELEMENTO[poderMapa(id).el].claro, '#0a1450');
    escribir(x, letraIP, 25, 13, '#ffd84a', '#0a1450');
    escribir(x, `${n}/${max}`, 40, 13, destello ? '#ffffff' : '#c9d6ff', '#0a1450');
    const bw = w - 31;
    rect(x, '#0a0f3a', 24, 22, bw + 2, 4);
    rect(x, '#25398f', 25, 23, bw, 2);
    const lleno = Math.round((Math.min(ip, max) / Math.max(1, max)) * bw);
    rect(x, '#6af0a0', 25, 23, lleno, 2);
    if (varios) escribir(x, 'L', w - 10, 13, '#9aa6e8', '#0a1450');
    return c;
  });
}

// ---------------------------------------------------------------- the chat

export interface MensajeChat {
  txt: string;
  /** True: the thinker's own message (green, on the right); false: the other side (white, on the left). */
  yo: boolean;
  hora: string;
}

const MAX_TXT = 118;

/** A tick pair (read), 7×4. */
const ticks = () =>
  una('chat.ticks', () => {
    const c = lienzo(8, 5);
    const x = ctx(c);
    pintar(x, ['.....a..', '.a..aa..', '..aaa.a.', '...a..a.'].map((f) => f), { a: '#4fb6ec' }, 0, 0);
    pintar(x, ['.a.....', '..a....'], { a: '#4fb6ec' }, 1, 0);
    return c;
  });

/** One bubble: the rounded box, its tail, the text, the time and the ticks. */
export function burbuja(m: MensajeChat): HTMLCanvasElement {
  return una(`chat.burbuja.${m.yo}.${m.hora}.${m.txt}`, () => {
    const lineas = partir(m.txt, MAX_TXT);
    const ancho = Math.max(34, Math.max(...lineas.map((l) => anchoTexto(l))) + 12, anchoTexto(m.hora) + (m.yo ? 24 : 14));
    const alto = lineas.length * 11 + 13;
    const c = lienzo(ancho + 4, alto + 1);
    const x = ctx(c);
    const ox = m.yo ? 0 : 4;
    const col = m.yo ? '#d9fdd3' : '#ffffff';
    const sombra = m.yo ? '#a8d8a0' : '#c8ccd0';
    // the box with its corners cut, a one-pixel shadow under it
    rect(x, sombra, ox + 1, 1, ancho - 2, alto);
    rect(x, sombra, ox, 2, ancho, alto - 2);
    rect(x, col, ox + 1, 0, ancho - 2, alto - 1);
    rect(x, col, ox, 1, ancho, alto - 3);
    // the tail
    if (m.yo) {
      rect(x, col, ancho, 0, 3, 1);
      rect(x, col, ancho, 1, 2, 1);
      rect(x, col, ancho, 2, 1, 1);
    } else {
      rect(x, col, 1, 0, 3, 1);
      rect(x, col, 2, 1, 2, 1);
      rect(x, col, 3, 2, 1, 1);
    }
    lineas.forEach((l, i) => escribir(x, l, ox + 6, 1 + i * 11, '#1e2a30'));
    const hx = ox + ancho - anchoTexto(m.hora) - (m.yo ? 14 : 5);
    escribir(x, m.hora, hx, alto - 10, '#7a8890');
    if (m.yo) x.drawImage(ticks(), ox + ancho - 11, alto - 8);
    return c;
  });
}

const PANEL = { x: 18, y: 5, w: 204, h: 112 };

/** The wallpaper of the chat, 204×112 with its header: painted once. */
function fondoChat(titulo: string): HTMLCanvasElement {
  return una(`chat.fondo.${titulo}`, () => {
    const c = lienzo(PANEL.w, PANEL.h);
    const x = ctx(c);
    rect(x, '#06131a', 0, 1, PANEL.w, PANEL.h - 2);
    rect(x, '#06131a', 1, 0, PANEL.w - 2, PANEL.h);
    rect(x, '#d8cfc2', 2, 14, PANEL.w - 4, PANEL.h - 16);
    // the scribbly wallpaper
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < 17; i++) {
        const px = 6 + i * 12 + (j % 2) * 6;
        const py = 18 + j * 14;
        rect(x, '#cdc3b4', px, py, 3, 1);
        rect(x, '#cdc3b4', px + 1, py + 1, 1, 2);
        rect(x, '#cdc3b4', px + 5, py + 4, 1, 1);
      }
    }
    // the header: dark green, the contact's round photo and name
    rect(x, '#0c5d52', 2, 1, PANEL.w - 4, 13);
    rect(x, '#0a4a42', 2, 13, PANEL.w - 4, 1);
    elipse(x, '#8fb0c8', 11, 7.5, 5, 5);
    elipse(x, '#c4d4ec', 11, 6.5, 2.5, 2.5);
    rect(x, '#5e6e9c', 8, 10, 6, 2);
    escribir(x, titulo, 20, 2, '#ffffff');
    return c;
  });
}

/** A flat white bubble with three dots («escribiendo...»), 24×14. */
const escribiendoBurbuja = () =>
  una('chat.escribiendo', () => {
    const c = lienzo(26, 14);
    const x = ctx(c);
    rect(x, '#c8ccd0', 5, 1, 20, 12);
    rect(x, '#c8ccd0', 4, 2, 22, 10);
    rect(x, '#ffffff', 5, 0, 20, 12);
    rect(x, '#ffffff', 4, 1, 22, 10);
    rect(x, '#ffffff', 1, 0, 3, 1);
    rect(x, '#ffffff', 2, 1, 2, 1);
    rect(x, '#ffffff', 3, 2, 1, 1);
    return c;
  });

/**
 * The chat window over the map: the messages that have appeared so far (`vistos`), new ones at the bottom
 * pushing the old ones up, and the typing bubble while the next one is being written.
 */
export function dibujarChat(g: CanvasRenderingContext2D, titulo: string, msgs: readonly MensajeChat[], vistos: number, escribiendo: boolean, t: number, cierre: string) {
  g.drawImage(fondoChat(titulo), PANEL.x, PANEL.y);
  g.save();
  g.beginPath();
  g.rect(PANEL.x + 2, PANEL.y + 14, PANEL.w - 4, PANEL.h - 28);
  g.clip();
  let y = PANEL.y + PANEL.h - 16;
  if (escribiendo) {
    const dx = escribiendoBurbuja();
    const lado = msgs[vistos]?.yo ?? false;
    const bx = lado ? PANEL.x + PANEL.w - 6 - dx.width : PANEL.x + 6;
    y -= dx.height;
    g.drawImage(dx, bx, y);
    for (let i = 0; i < 3; i++) {
      const sube = Math.floor(t * 6 + i) % 3 === 0 ? 1 : 0;
      rect(g, '#7a8890', bx + 9 + i * 4 + (lado ? 0 : 1), y + 5 - sube, 2, 2);
    }
    y -= 3;
  }
  for (let i = vistos - 1; i >= 0; i--) {
    const b = burbuja(msgs[i]);
    y -= b.height;
    const bx = msgs[i].yo ? PANEL.x + PANEL.w - 4 - b.width : PANEL.x + 4;
    g.drawImage(b, bx, y);
    y -= 3;
    if (y < PANEL.y) break;
  }
  g.restore();
  // the footer: a flashing prompt when everything has been read
  rect(g, '#0a4a42', PANEL.x + 2, PANEL.y + PANEL.h - 14, PANEL.w - 4, 12);
  if (cierre && Math.floor(t * 2) % 2 === 0) escribir(g, cierre, PANEL.x + Math.round((PANEL.w - anchoTexto(cierre)) / 2), PANEL.y + PANEL.h - 14, '#ffe27a');
}
