// The look of the original's interface at 240×160: the blue window with its light bevelled border, the text
// that comes letter by letter with its blip, the speaker's portrait in a small window above, the blinking
// arrow, the choice window with its hand, the emotion icons over heads and the IP counter. Windows and
// icons are painted once into canvases; per frame only drawImage and a few glyphs.
import { ALTO_CELDA, anchoTexto, avance, escribir, partir } from './fuente';
import { ctx, lienzo, rect, una } from './pixel';
import { retrato } from './retratos';
import type { Quien } from './personajes';
import type { Mandos } from './consola';
import type { SonidoSol } from './sonido';
import { EFECTO_MENU, EFECTO_TEXTO } from './sonido';

export const PANTALLA_W = 240;
export const PANTALLA_H = 160;

// ---------------------------------------------------------------- the window

/** The blue window with the light bevelled frame, w × h pixels. */
export function ventana(w: number, h: number): HTMLCanvasElement {
  return una(`ventana.${w}.${h}`, () => {
    const c = lienzo(w, h);
    const x = ctx(c);
    // outline in dark navy, corners cut
    rect(x, '#0a0f3a', 1, 0, w - 2, h);
    rect(x, '#0a0f3a', 0, 1, w, h - 2);
    // light frame: bright on the top/left, softer on the bottom/right
    rect(x, '#eaeaff', 2, 1, w - 4, 1);
    rect(x, '#eaeaff', 1, 2, 1, h - 4);
    rect(x, '#9aa0d8', 2, h - 2, w - 4, 1);
    rect(x, '#9aa0d8', w - 2, 2, 1, h - 4);
    rect(x, '#d2d4f4', 2, 2, w - 4, 1);
    rect(x, '#d2d4f4', 2, 2, 1, h - 4);
    rect(x, '#7a80c4', 3, h - 3, w - 6, 1);
    rect(x, '#7a80c4', w - 3, 3, 1, h - 6);
    rect(x, '#e6e6ff', 2, 2, 1, 1);
    // an inner dark line, then the gradient in bands
    rect(x, '#1c2a78', 3, 3, w - 6, h - 6);
    const i0 = 4;
    const alto = h - 8;
    const bandas = [
      '#3a64d8', '#355ed2', '#3059cb', '#2b53c3', '#274ebb', '#2349b3', '#1f44ab', '#1b3fa3', '#183a9b', '#153593',
      '#12308b', '#102c83', '#0e287b', '#0c2473',
    ];
    for (let j = 0; j < alto; j++) {
      const b = bandas[Math.min(bandas.length - 1, Math.floor((j / alto) * bandas.length))];
      rect(x, b, i0, i0 + j, w - 8, 1);
    }
    // a little sparkle of light in the top-left of the glass
    rect(x, 'rgba(255,255,255,0.18)', i0, i0, w - 8, 1);
    return c;
  });
}

// ---------------------------------------------------------------- emotion icons

export type Icono = 'exclama' | 'pregunta' | 'puntos' | 'gota' | 'nota';

function icono(tipo: Icono): HTMLCanvasElement {
  return una(`icono.${tipo}`, () => {
    const maps: Record<Icono, { filas: string[]; pal: Record<string, string> }> = {
      exclama: {
        filas: [
          '..kkk..',
          '.krrrk.',
          '.krRrk.',
          '.krRrk.',
          '.krrrk.',
          '..krk..',
          '..krk..',
          '...k...',
          '..kkk..',
          '.krrrk.',
          '..kkk..',
        ],
        pal: { k: '#3a1428', r: '#e8322c', R: '#ff9a88' },
      },
      pregunta: {
        filas: [
          '..kkkk..',
          '.kbbbbk.',
          'kbbkkbbk',
          'kbk..kbk',
          '....kbbk',
          '...kbbk.',
          '..kbbk..',
          '..kbk...',
          '...k....',
          '..kbk...',
          '...k....',
        ],
        pal: { k: '#14284a', b: '#5ec0f5' },
      },
      puntos: {
        filas: [
          '.kkkkkkkkkkkkk.',
          'kwwwwwwwwwwwwwk',
          'kwwwwwwwwwwwwwk',
          'kwwkkwwkkwwkkwk',
          'kwwkkwwkkwwkkwk',
          'kwwwwwwwwwwwwwk',
          'kwwwwwwwwwwwwwk',
          '.kkkkkwwkkkkkk.',
          '......kwk......',
          '.......k.......',
        ],
        pal: { k: '#3a2a50', w: '#ffffff' },
      },
      gota: {
        filas: [
          '...k...',
          '..kbk..',
          '..kbk..',
          '.kbbbk.',
          '.kbwbk.',
          'kbbwbbk',
          'kbbbbbk',
          '.kbbbk.',
          '..kkk..',
        ],
        pal: { k: '#14305a', b: '#5ec0f5', w: '#ffffff' },
      },
      nota: {
        filas: [
          '...kkkkk',
          '...kyyyk',
          '...kyykk',
          '...kyk.k',
          '...kyk..',
          '...kyk..',
          '.kkkyk..',
          'kyyykk..',
          'kyyyk...',
          '.kkk....',
        ],
        pal: { k: '#4a2050', y: '#ffd84a' },
      },
    };
    const m = maps[tipo];
    const c = lienzo(m.filas[0].length, m.filas.length);
    const x = ctx(c);
    m.filas.forEach((f, j) => {
      for (let i = 0; i < f.length; i++) {
        const col = m.pal[f[i]];
        if (col) rect(x, col, i, j, 1, 1);
      }
    });
    return c;
  });
}

/** An emotion over somebody's head: the icon, a hop for the «!», and how long it lives. */
export interface Emocion {
  tipo: Icono;
  t: number;
  dura: number;
}
const SALTO = [0, 2, 4, 5, 4, 2, 0, 1, 2, 1, 0];

export function dibujarEmocion(g: CanvasRenderingContext2D, e: Emocion, x: number, yCabeza: number) {
  const img = icono(e.tipo);
  let dy = 0;
  if (e.tipo === 'exclama') dy = e.t < 0.55 ? SALTO[Math.min(SALTO.length - 1, Math.floor((e.t / 0.55) * SALTO.length))] : 0;
  else if (e.tipo === 'nota') dy = Math.round(Math.sin(e.t * 6) * 1.5);
  else if (e.tipo === 'gota') dy = Math.min(3, Math.floor(e.t * 8));
  // pops in
  if (e.t < 0.06) return;
  g.drawImage(img, Math.round(x - img.width / 2), Math.round(yCabeza - img.height - 2 - dy));
}

// ---------------------------------------------------------------- the text box

const CAJA = { x: 6, y: 111, w: 228, h: 45 };
const TEXTO_X = CAJA.x + 10;
const TEXTO_Y = CAJA.y + 6;
const TEXTO_MAX = CAJA.w - 24;
const LINEAS = 3;
/** Letters per second. */
const VELOCIDAD = 38;

export interface Linea {
  quien: Quien | null;
  texto: string;
  /** 'contento' = a smile with a grin. */
  animo?: 'normal' | 'contento';
}

interface Pagina {
  lineas: string[];
}

/** Breaks a text into pages of three lines. */
function paginar(s: string): Pagina[] {
  const todas = partir(s, TEXTO_MAX);
  const paginas: Pagina[] = [];
  for (let i = 0; i < todas.length; i += LINEAS) paginas.push({ lineas: todas.slice(i, i + LINEAS) });
  return paginas.length ? paginas : [{ lineas: [''] }];
}

/**
 * The dialogue machine: `decir` and `preguntar` are promises the game scripts await. It is updated and drawn
 * by the game loop; it consumes the A button when it is open.
 */
export class Dialogo {
  /** Open: the game's world stops listening to the buttons. */
  activo = false;
  private linea: Linea | null = null;
  private paginas: Pagina[] = [];
  private pagina = 0;
  private reveladas = 0;
  private acumulado = 0;
  private completa = false;
  private t = 0;
  private resolver: (() => void) | null = null;
  private opciones: string[] = [];
  private cursor = 0;
  private respuesta: ((i: number) => void) | null = null;
  /** The text canvas of the page being typed, painted letter by letter. */
  private lienzoTexto = lienzo(CAJA.w, CAJA.h);
  private pintadas = 0;
  private ultimoBlip = 0;
  private cerradoEn = -1;

  constructor(
    private readonly sonido: SonidoSol,
    private readonly nombre: (q: Quien) => string,
  ) {}

  /** A question is open (the choice window is up). */
  get preguntando() {
    return this.opciones.length > 0;
  }

  /** A line, until the player has read it all. */
  decir(l: Linea): Promise<void> {
    return new Promise((res) => {
      this.abrir(l);
      this.resolver = res;
    });
  }

  /** A question with options; resolves to the chosen index (the cursor starts on the first). */
  preguntar(l: Linea, opciones: string[]): Promise<number> {
    return new Promise((res) => {
      this.abrir(l);
      this.opciones = opciones;
      this.cursor = 0;
      this.respuesta = res;
    });
  }

  private abrir(l: Linea) {
    this.activo = true;
    this.linea = l;
    this.paginas = paginar(l.texto);
    this.pagina = 0;
    this.empezarPagina();
    this.opciones = [];
    this.respuesta = null;
    this.resolver = null;
  }

  private empezarPagina() {
    this.reveladas = 0;
    this.acumulado = 0;
    this.completa = false;
    this.pintadas = 0;
    this.lienzoTexto.getContext('2d')!.clearRect(0, 0, CAJA.w, CAJA.h);
  }

  /** Total letters of the current page. */
  private get total() {
    return this.paginas[this.pagina].lineas.reduce((s, l) => s + [...l].length, 0);
  }

  update(dt: number, m: Mandos) {
    if (!this.activo) return;
    this.t += dt;
    const a = m.tomarA();
    if (!this.completa) {
      this.acumulado += dt * VELOCIDAD;
      const n = Math.min(this.total, Math.floor(this.acumulado));
      if (a) {
        this.reveladas = this.total;
      } else this.reveladas = n;
      this.pintar();
      if (this.reveladas >= this.total) this.completa = true;
      return;
    }
    // A finished page: A goes on (the choice window answers to its own buttons).
    if (this.opciones.length && this.pagina === this.paginas.length - 1) {
      const dy = m.tomarArribaAbajo();
      if (dy) {
        this.cursor = (this.cursor + dy + this.opciones.length) % this.opciones.length;
        this.sonido.efecto(EFECTO_MENU, 0.7);
      }
      if (a) {
        this.sonido.efecto(EFECTO_MENU);
        const r = this.respuesta;
        const i = this.cursor;
        this.cerrar();
        r?.(i);
      }
      return;
    }
    if (a) {
      if (this.pagina < this.paginas.length - 1) {
        this.pagina++;
        this.empezarPagina();
      } else {
        const r = this.resolver;
        this.cerrar();
        r?.();
      }
    }
  }

  private cerrar() {
    this.activo = false;
    this.linea = null;
    this.opciones = [];
    this.resolver = null;
    this.respuesta = null;
    this.cerradoEn = this.t;
  }

  /** Paints the letters revealed since the last time onto the text canvas, with the blip. */
  private pintar() {
    const x = this.lienzoTexto.getContext('2d')!;
    const pag = this.paginas[this.pagina];
    let cuenta = 0;
    for (let j = 0; j < pag.lineas.length; j++) {
      const letras = [...pag.lineas[j]];
      let px = 0;
      for (let i = 0; i < letras.length; i++) {
        cuenta++;
        if (cuenta > this.pintadas && cuenta <= this.reveladas) {
          escribir(x, letras[i], TEXTO_X - CAJA.x + px, TEXTO_Y - CAJA.y + j * ALTO_CELDA, '#ffffff', '#0a1450');
          if (letras[i] !== ' ' && !/[.,;:!?¡¿]/.test(letras[i]) && cuenta - this.ultimoBlip >= 2) {
            this.ultimoBlip = cuenta;
            this.sonido.efecto(EFECTO_TEXTO, 0.45);
          }
        }
        px += avance(letras[i]);
      }
    }
    this.pintadas = this.reveladas;
  }

  /** True if a dialogue was just closed this very frame (so the same A does not start another thing). */
  get recienCerrado() {
    return this.cerradoEn >= 0 && this.t - this.cerradoEn < 0.2;
  }

  dibujar(g: CanvasRenderingContext2D) {
    if (!this.activo || !this.linea) return;
    const l = this.linea;
    // the portrait window above the text box, and the name tag beside it
    if (l.quien) {
      const talk = !this.completa && Math.floor(this.t / 0.1) % 2 === 0;
      const parpadeo = Math.floor((this.t * 1000) / 130) % 26 === 0 && this.t > 0.3;
      const img = retrato(l.quien, !parpadeo, talk, l.animo ?? 'normal');
      const px = CAJA.x;
      const py = CAJA.y - 38;
      g.drawImage(ventana(38, 38), px, py);
      g.drawImage(img, px + 3, py + 3);
      const nombre = this.nombre(l.quien);
      const w = anchoTexto(nombre) + 14;
      g.drawImage(ventana(w, 15), px + 36, CAJA.y - 15);
      escribir(g, nombre, px + 36 + 7, CAJA.y - 15 + 2, '#ffffff', '#0a1450');
    }
    g.drawImage(ventana(CAJA.w, CAJA.h), CAJA.x, CAJA.y);
    g.drawImage(this.lienzoTexto, CAJA.x, CAJA.y);
    // the blinking arrow when the page is complete
    if (this.completa && !(this.opciones.length && this.pagina === this.paginas.length - 1)) {
      if (Math.floor(this.t / 0.35) % 2 === 0) {
        const ax = CAJA.x + CAJA.w - 16;
        const ay = CAJA.y + CAJA.h - 12 + (Math.floor(this.t / 0.35) % 4 === 0 ? 0 : 1);
        rect(g, '#0a0f3a', ax - 1, ay - 1, 9, 6);
        rect(g, '#ffffff', ax, ay, 7, 1);
        rect(g, '#ffffff', ax + 1, ay + 1, 5, 1);
        rect(g, '#ffffff', ax + 2, ay + 2, 3, 1);
        rect(g, '#ffffff', ax + 3, ay + 3, 1, 1);
      }
    }
    // the choice window, above the text box on the right
    if (this.opciones.length && this.completa && this.pagina === this.paginas.length - 1) {
      const wmax = Math.max(...this.opciones.map(anchoTexto));
      const w = wmax + 30;
      const h = this.opciones.length * ALTO_CELDA + 10;
      const x0 = CAJA.x + CAJA.w - w;
      const y0 = CAJA.y - h + 1;
      g.drawImage(ventana(w, h), x0, y0);
      this.opciones.forEach((op, i) => {
        escribir(g, op, x0 + 22, y0 + 6 + i * ALTO_CELDA, '#ffffff', '#0a1450');
      });
      // the pointing hand
      const bob = Math.floor(this.t / 0.25) % 2;
      mano(g, x0 + 7 + bob, y0 + 7 + this.cursor * ALTO_CELDA);
    }
  }

}

/** The pointing hand (a white glove with a dark outline), 11×8, pointing right. */
export const manoCursor = () =>
  una('manoMenu', () => {
    const c = lienzo(11, 9);
    const k = ctx(c);
    const filas = [
      '...kkk.....',
      '...kwk.....',
      '...kwkkkk..',
      'kkkkwwwwwk.',
      'kwwwwwwwwwk',
      'kwwwwwwwwwk',
      'kkkkwwwwwk.',
      '...kkkkkk..',
    ];
    filas.forEach((f, j) => {
      for (let i = 0; i < f.length; i++) {
        if (f[i] === 'k') rect(k, '#0a0f3a', i, j, 1, 1);
        else if (f[i] === 'w') rect(k, '#ffffff', i, j, 1, 1);
      }
    });
    return c;
  });

function mano(g: CanvasRenderingContext2D, x: number, y: number) {
  g.drawImage(manoCursor(), x, y);
}

// ---------------------------------------------------------------- the IP counter and the psynergy banner

/** The shortcut's icon: a little open hand in gold on a dark square, 11×11. */
const iconoPoder = () =>
  una('iconoPoder', () => {
    const c = lienzo(13, 13);
    const x = ctx(c);
    rect(x, '#0a0f3a', 0, 1, 13, 11);
    rect(x, '#0a0f3a', 1, 0, 11, 13);
    rect(x, '#f5c542', 1, 1, 11, 11);
    rect(x, '#fff0a8', 1, 1, 11, 1);
    const mano = [
      '...k.k.k....',
      '...k.k.k.k..',
      '.k.kkkkkkk..',
      '.kkkkkkkkkk.',
      '..kkkkkkkkk.',
      '...kkkkkkk..',
      '....kkkkk...',
    ];
    mano.forEach((f, j) => {
      for (let i = 0; i < f.length; i++) if (f[i] === 'k') rect(x, '#5a3a10', 1 + i, 3 + j, 1, 1);
    });
    return c;
  });

/** The IP counter window: the shortcut icon with an R, «IP», the numbers and a bar. */
export function contadorIP(ip: number, max: number, destello: boolean, letraIP: string): HTMLCanvasElement {
  const n = Math.floor(ip);
  return una(`ip.${n}.${max}.${destello}`, () => {
    const w = 62;
    const h = 26;
    const c = lienzo(w, h);
    const x = ctx(c);
    x.drawImage(ventana(w, h), 0, 0);
    x.drawImage(iconoPoder(), 5, 6);
    rect(x, '#0a0f3a', 3, 17, 7, 6);
    escribir(x, 'R', 4, 14, '#ffd84a', '#0a1450');
    escribir(x, letraIP, 21, 4, '#ffd84a', '#0a1450');
    escribir(x, `${n}/${max}`, 34, 4, destello ? '#ffffff' : '#c9d6ff', '#0a1450');
    // the bar
    rect(x, '#0a0f3a', 20, 16, 38, 6);
    rect(x, '#25398f', 21, 17, 36, 4);
    const lleno = Math.round((Math.min(ip, max) / max) * 36);
    rect(x, '#6af0a0', 21, 17, lleno, 4);
    rect(x, '#c8ffe0', 21, 17, lleno, 1);
    return c;
  });
}

/** A small window with a line of text, centred at x (the psynergy banner). */
export function cartelito(g: CanvasRenderingContext2D, s: string, cx: number, y: number) {
  const w = anchoTexto(s) + 20;
  g.drawImage(ventana(w, 17), Math.round(cx - w / 2), y);
  escribir(g, s, Math.round(cx - w / 2) + 10, y + 3, '#ffffff', '#0a1450');
}
