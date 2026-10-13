// PokéUsera · Edición Jarra (arte v2): the 240-px-wide UI in handheld-32-bit style. Rounded panels with a
// two-tone border (dark plum outside, gold or trainer colour inside), a soft vertical gradient and an inner
// shade; HP bar with a «PS» tag and a three-row gradient fill; text box; menu with small icons.
// Everything is fillRect at integer coordinates (pixel-exact at 1×); a real build would bake the panels
// into canvases once per size.
import { anchoTexto2, dibujarTexto2 } from './fuente2';
import {
  JUGADORES2,
  ORO_UI,
  ORO_UI_OSC,
  PAPEL_ALTO,
  PAPEL_BAJO,
  PS_PISTA,
  PS_PISTA_CLARA,
  SOMBRA_TEXTO,
  TINTA2,
  TINTA_SUAVE,
  tonosPS,
} from './paleta2';

function mezclar(a: string, b: string, t: number): string {
  const A = parseInt(a.slice(1), 16),
    B = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((A >> s) & 255) + (((B >> s) & 255) - ((A >> s) & 255)) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
const BANDAS = [0.25, 0.5, 0.75, 0.9].map((t) => mezclar(PAPEL_BAJO, PAPEL_ALTO, t));

function r(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** A one-pixel ring with its corners cut diagonally (radius 2). */
function anillo(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  r(ctx, color, x + 2, y, w - 4, 1);
  r(ctx, color, x + 2, y + h - 1, w - 4, 1);
  r(ctx, color, x, y + 2, 1, h - 4);
  r(ctx, color, x + w - 1, y + 2, 1, h - 4);
  r(ctx, color, x + 1, y + 1, 1, 1);
  r(ctx, color, x + w - 2, y + 1, 1, 1);
  r(ctx, color, x + 1, y + h - 2, 1, 1);
  r(ctx, color, x + w - 2, y + h - 2, 1, 1);
}

/** Filled body of a rounded shape (same corner cut as `anillo`). */
function relleno(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  r(ctx, color, x + 1, y, w - 2, h);
  r(ctx, color, x, y + 1, w, h - 2);
}

/** The panel: dark plum outline, accent line, paper gradient, white top-left edge and a soft inner shade. */
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, acento: string = ORO_UI, acentoOsc: string = ORO_UI_OSC): void {
  // a faint drop shadow under the panel
  r(ctx, 'rgba(59,42,63,0.22)', x + 2, y + h, w - 3, 2);
  relleno(ctx, TINTA2, x, y, w, h);
  // paper: a soft vertical gradient in five bands
  const ix = x + 2,
    iy = y + 2,
    iw = w - 4,
    ih = h - 4;
  relleno(ctx, PAPEL_BAJO, ix, iy, iw, ih);
  [0.78, 0.6, 0.42, 0.24].forEach((k, i) => relleno(ctx, BANDAS[i], ix, iy, iw, Math.round(ih * k)));
  relleno(ctx, PAPEL_ALTO, ix, iy, iw, Math.round(ih * 0.12));
  // accent ring (gold by default) drawn with its own shade on the lower edge
  anillo(ctx, acento, x + 1, y + 1, w - 2, h - 2);
  r(ctx, acentoOsc, x + 3, y + h - 2, w - 6, 1);
  r(ctx, acentoOsc, x + w - 2, y + 3, 1, h - 6);
  // light edge inside the ring and a 2-px soft shade on the bottom
  r(ctx, '#ffffff', x + 3, y + 2, w - 8, 1);
  r(ctx, '#ffffff', x + 2, y + 3, 1, Math.max(1, h - 10));
  r(ctx, '#d6c08a', x + 3, y + h - 4, w - 6, 1);
}

const P3 = { P: ['XXX', 'X.X', 'XXX', 'X..', 'X..'], S: ['.XX', 'X..', '.X.', '..X', 'XX.'] };
function letra3(ctx: CanvasRenderingContext2D, g: string[], x: number, y: number, color: string): void {
  g.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) if (fila[i] === 'X') r(ctx, color, x + i, y + j, 1, 1);
  });
}

/** HP bar with the «PS» tag. `w` is the total width; returns the width taken. Height is 9. */
export function barraPS2(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number): void {
  const f = Math.max(0, Math.min(1, frac));
  // tag
  relleno(ctx, TINTA2, x, y, 13, 9);
  relleno(ctx, '#5a4660', x + 1, y + 1, 11, 7);
  r(ctx, TINTA2, x + 1, y + 5, 11, 3);
  letra3(ctx, P3.P, x + 3, y + 2, '#f6e6b4');
  letra3(ctx, P3.S, x + 7, y + 2, '#f6e6b4');
  // track
  const bx = x + 14;
  const bw = w - 14;
  relleno(ctx, TINTA2, bx, y, bw, 9);
  r(ctx, PS_PISTA, bx + 1, y + 1, bw - 2, 7);
  r(ctx, PS_PISTA_CLARA, bx + 1, y + 1, bw - 2, 1);
  // fill
  const interior = bw - 4;
  let n = Math.round(interior * f);
  if (f > 0 && n < 2) n = 2;
  if (n > 0) {
    const [hl, base, som] = tonosPS(f);
    const fx = bx + 2,
      fy = y + 2;
    r(ctx, base, fx, fy, n, 5);
    r(ctx, hl, fx, fy, n, 1);
    r(ctx, hl, fx, fy + 1, Math.max(0, n - 2), 1);
    r(ctx, som, fx, fy + 3, n, 2);
    // rounded right end
    r(ctx, PS_PISTA, fx + n - 1, fy, 1, 1);
    r(ctx, PS_PISTA, fx + n - 1, fy + 4, 1, 1);
  }
}

/** A small round pip (a jar still standing, or an empty slot). */
function pip(ctx: CanvasRenderingContext2D, x: number, y: number, vivo: boolean, color: string): void {
  relleno(ctx, TINTA2, x, y, 7, 7);
  if (vivo) {
    r(ctx, color, x + 1, y + 1, 5, 5);
    r(ctx, '#ffffff', x + 1, y + 1, 2, 1);
    r(ctx, '#ffffff', x + 1, y + 2, 1, 1);
    r(ctx, 'rgba(0,0,0,0.25)', x + 2, y + 5, 4, 1);
  } else {
    r(ctx, '#8a7690', x + 1, y + 1, 5, 5);
  }
}

export interface DatosFicha {
  nombre: string;
  nivel: string;
  frac: number;
  /** Seat 0..3 (picks the trainer colour). */
  asiento: number;
  /** Trainer name and initial. */
  entrenador: string;
  vivos: number;
  /** For the own panel: «120/120». */
  numeros?: string;
}

/** The coloured trainer band on the left of a panel (vertical gradient, initial on top). */
function bandaEntrenador(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, asiento: number, inicial: string): void {
  const c = JUGADORES2[asiento];
  r(ctx, c.oscuro, x, y, 9, h);
  r(ctx, c.base, x, y, 8, h - 1);
  r(ctx, c.claro, x, y, 3, h - 1);
  r(ctx, c.claro, x, y, 8, 1);
  r(ctx, TINTA2, x + 9, y, 1, h);
  dibujarTexto2(ctx, inicial, x + 2, y + 4, '#ffffff', c.oscuro);
}

/** Rival panel: 128×40. */
export function fichaRival(ctx: CanvasRenderingContext2D, x: number, y: number, d: DatosFicha): void {
  const w = 128,
    h = 40;
  panel(ctx, x, y, w, h, ORO_UI, ORO_UI_OSC);
  bandaEntrenador(ctx, x + 4, y + 4, h - 8, d.asiento, d.entrenador[0]);
  dibujarTexto2(ctx, d.nombre, x + 18, y + 7, TINTA2, SOMBRA_TEXTO);
  dibujarTexto2(ctx, d.nivel, x + w - 8 - anchoTexto2(d.nivel), y + 7, TINTA_SUAVE, SOMBRA_TEXTO);
  barraPS2(ctx, x + 17, y + 18, w - 17 - 9, d.frac);
  dibujarTexto2(ctx, d.entrenador.toUpperCase(), x + 18, y + 30, JUGADORES2[d.asiento].oscuro, SOMBRA_TEXTO);
  for (let i = 0; i < 3; i++) pip(ctx, x + w - 8 - 3 * 9 + i * 9 + 1, y + 29, i < d.vivos, JUGADORES2[d.asiento].base);
}

/** Own panel: 134×52, with the HP numbers. */
export function fichaPropia(ctx: CanvasRenderingContext2D, x: number, y: number, d: DatosFicha): void {
  const w = 134,
    h = 52;
  panel(ctx, x, y, w, h, ORO_UI, ORO_UI_OSC);
  bandaEntrenador(ctx, x + 4, y + 4, h - 8, d.asiento, d.entrenador[0]);
  dibujarTexto2(ctx, d.nombre, x + 18, y + 7, TINTA2, SOMBRA_TEXTO);
  dibujarTexto2(ctx, d.nivel, x + w - 8 - anchoTexto2(d.nivel), y + 7, TINTA_SUAVE, SOMBRA_TEXTO);
  barraPS2(ctx, x + 17, y + 18, w - 17 - 9, d.frac);
  if (d.numeros) dibujarTexto2(ctx, d.numeros, x + w - 8 - anchoTexto2(d.numeros), y + 30, TINTA2, SOMBRA_TEXTO);
  dibujarTexto2(ctx, d.entrenador.toUpperCase(), x + 18, y + 30, JUGADORES2[d.asiento].oscuro, SOMBRA_TEXTO);
  for (let i = 0; i < 3; i++) pip(ctx, x + 18 + i * 9, y + 40, i < d.vivos, JUGADORES2[d.asiento].base);
}

/** ▶ selection arrow (5×7) with a light edge. */
export function cursor2(ctx: CanvasRenderingContext2D, x: number, y: number, color: string = TINTA2): void {
  [2, 3, 4, 5, 4, 3, 2].forEach((a, i) => r(ctx, color, x, y + i, a, 1));
  r(ctx, 'rgba(255,255,255,0.35)', x, y, 1, 3);
}

/** ▼ «more text» arrow (7×4). */
export function flecha2(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  r(ctx, TINTA2, x, y, 7, 1);
  r(ctx, TINTA2, x + 1, y + 1, 5, 1);
  r(ctx, TINTA2, x + 2, y + 2, 3, 1);
  r(ctx, TINTA2, x + 3, y + 3, 1, 1);
}

/** Text box: panel with up to three lines of text and the ▼ arrow. */
export function cajaTexto2(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lineas: string[], flecha = true): void {
  panel(ctx, x, y, w, h);
  lineas.forEach((l, i) => dibujarTexto2(ctx, l, x + 11, y + 13 + i * 14, TINTA2, SOMBRA_TEXTO));
  if (flecha) flecha2(ctx, x + w - 17, y + h - 12);
}

/** 13×13 icons for the menu, as ASCII. */
const ICONOS: Record<string, { leyenda: Record<string, string>; filas: string[] }> = {
  luchar: {
    leyenda: { o: '#a8300c', r: '#e8501c', y: '#ffd23a', w: '#fff6c8' },
    filas: [
      '......o......',
      '..o...oo...o.',
      '..oo..or..oo.',
      '...or.ory.ro.',
      'o...ryyyyr...',
      'oo.ryyyyyyr.o',
      '.orryywwyyrro',
      'oo.ryyyyyyr.o',
      'o...ryyyyr...',
      '...or.ory.ro.',
      '..oo..or..oo.',
      '..o...oo...o.',
      '......o......',
    ],
  },
  userito: {
    leyenda: { k: TINTA2, g: '#e8b83a', G: '#a8741c', r: '#d8402c', R: '#8c1c1c', w: '#fff6c8' },
    filas: [
      '...kkkkkkk...',
      '..kgGgGgGgk..',
      '.kgggggggggk.',
      'kgggrrrrrgggk',
      'kGgrrwrrrRgGk',
      'kgggrrrrRgggk',
      'kGgrrrrrRRgGk',
      'kgggrRRRRgggk',
      'kGgggrRRgggGk',
      '.kgggggggggk.',
      '..kgGgGgGgk..',
      '...kkkkkkk...',
      '.............',
    ],
  },
  cana: {
    leyenda: { k: TINTA2, c: '#dce8ec', g: '#fbb82a', G: '#c8801c', w: '#ffffff', f: '#f4ead0' },
    filas: [
      '..kkkkkkkkk..',
      '.kfwfwfwfwfk.',
      '.kffffwffffk.',
      '..kgggggggk..',
      '..kgwggggGk..',
      '..kgwgggggk..',
      '...kgggggGk..',
      '...kgggggGk..',
      '...kgggGgGk..',
      '...kGgggGGk..',
      '...kccccccck.',
      '....kkkkkkk..',
      '.............',
    ],
  },
};

export function icono2(ctx: CanvasRenderingContext2D, nombre: keyof typeof ICONOS, x: number, y: number): void {
  const ic = ICONOS[nombre];
  ic.filas.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) {
      const c = ic.leyenda[fila[i]];
      if (c) r(ctx, c, x + i, y + j, 1, 1);
    }
  });
}

/** One touch-sized menu row (27 px tall at 1×: 44 CSS px at ×1.625). */
export function filaMenu(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, texto: string, icono: keyof typeof ICONOS, activa: boolean): void {
  if (activa) {
    relleno(ctx, ORO_UI_OSC, x, y, w, 25);
    relleno(ctx, '#fbe19a', x + 1, y + 1, w - 2, 23);
    r(ctx, '#fff3c8', x + 3, y + 1, w - 6, 1);
    r(ctx, '#f0c860', x + 2, y + 21, w - 4, 3);
    cursor2(ctx, x + 6, y + 9);
  }
  icono2(ctx, icono, x + 17, y + 6);
  dibujarTexto2(ctx, texto, x + 37, y + 9, TINTA2, activa ? '#f0c860' : SOMBRA_TEXTO);
}

/** Top bar: menu button on the left, TURNO n, and a timer chip on the right. */
export function barraSuperior(ctx: CanvasRenderingContext2D, ancho: number, turno: string, tiempo: string): void {
  r(ctx, TINTA2, 0, 0, ancho, 18);
  r(ctx, '#5a4660', 0, 0, ancho, 1);
  r(ctx, BANDAS[1], 0, 1, ancho, 16);
  r(ctx, PAPEL_ALTO, 0, 1, ancho, 7);
  r(ctx, ORO_UI, 0, 17, ancho, 1);
  for (const dy of [5, 8, 11]) r(ctx, TINTA2, 7, dy, 11, 2);
  dibujarTexto2(ctx, turno, 28, 6, TINTA2, SOMBRA_TEXTO);
  const w = anchoTexto2(tiempo) + 14;
  relleno(ctx, TINTA2, ancho - w - 6, 3, w, 12);
  relleno(ctx, '#5a4660', ancho - w - 5, 4, w - 2, 10);
  dibujarTexto2(ctx, tiempo, ancho - w + 1, 6, '#fdf0c0');
}
