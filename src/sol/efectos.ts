// The visual effects of the fight: particles, the jumping damage numbers, the little pictures the powers
// use (ice column, flames, the cajón, paws, hearts, pages of the script...) and the swirl that opens a
// fight. Every picture is painted once into a cached canvas; per frame there are only drawImage calls and a
// few pixel rectangles. The scripted effects of each power are in efectosPoderes.ts.
import { texto } from '../juego/textos';
import { apagar, contorno } from './contorno';
import { escribir, anchoTexto } from './fuente';
import { ctx, elipse, lienzo, rect, una } from './pixel';

export const limitar = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeIn = (t: number) => t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ---------------------------------------------------------------- particles

export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Gravity (pixels per second squared, positive = down). */
  ay: number;
  t: number;
  dura: number;
  col: string;
  w: number;
  h: number;
  img?: HTMLCanvasElement;
  /** A text particle (a note, a word); it is drawn with the pixel font. */
  txt?: string;
  /** It blinks away over the last 25 % of its life. */
  parpadea: boolean;
  /** Slows down by this share of its speed per second. */
  freno: number;
}

/** A bag of particles. Spawning reuses nothing clever: a few dozen objects at most at any time. */
export class Particulas {
  lista: Particula[] = [];

  nueva(p: Partial<Particula>) {
    if (this.lista.length > 220) this.lista.shift();
    this.lista.push({ x: 0, y: 0, vx: 0, vy: 0, ay: 0, t: 0, dura: 0.6, col: '#ffffff', w: 1, h: 1, parpadea: true, freno: 0, ...p });
  }

  /** A burst of sparks around a point. */
  estallido(x: number, y: number, cols: string[], n = 10, vel = 60, dura = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = vel * (0.4 + Math.random() * 0.6);
      this.nueva({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, ay: 80, dura: dura * (0.7 + Math.random() * 0.6), col: cols[i % cols.length], w: Math.random() > 0.6 ? 2 : 1, h: Math.random() > 0.6 ? 2 : 1, freno: 1.5 });
    }
  }

  update(dt: number) {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const p = this.lista[i];
      p.t += dt;
      if (p.t >= p.dura) {
        this.lista.splice(i, 1);
        continue;
      }
      p.vy += p.ay * dt;
      if (p.freno) {
        const f = Math.max(0, 1 - p.freno * dt);
        p.vx *= f;
        p.vy *= f;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  dibujar(g: CanvasRenderingContext2D) {
    for (const p of this.lista) {
      if (p.parpadea && p.t > p.dura * 0.75 && Math.floor(p.t * 30) % 2) continue;
      if (p.img) g.drawImage(p.img, Math.round(p.x - p.img.width / 2), Math.round(p.y - p.img.height / 2));
      else if (p.txt) escribir(g, p.txt, Math.round(p.x), Math.round(p.y), p.col, '#0a1450');
      else {
        g.fillStyle = p.col;
        g.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
      }
    }
  }
}

// ---------------------------------------------------------------- damage numbers

export type TipoNumero = 'dano' | 'critico' | 'cura' | 'ip' | 'flojo';

const COLOR_NUMERO: Record<TipoNumero, string> = { dano: '#ffffff', critico: '#ffe27a', cura: '#8cf08c', ip: '#8ad8ff', flojo: '#c8c8e0' };

/** The picture of a number: white (or coloured) with a dark edge; the critical hit is twice as big. */
export function imagenNumero(n: number, tipo: TipoNumero): HTMLCanvasElement {
  return una(`numero.${tipo}.${n}`, () => {
    const s = String(Math.round(n));
    const w = anchoTexto(s) + 2;
    const c = lienzo(w, 12);
    const x = ctx(c);
    // dark edge: the text in the dark colour at the four sides, then the colour on top
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) escribir(x, s, dx, dy - 1, '#0a1450');
    escribir(x, s, 1, 0, COLOR_NUMERO[tipo]);
    if (tipo !== 'critico') return c;
    const g = lienzo(w * 2, 24);
    const y = ctx(g);
    y.drawImage(c, 0, 0, w * 2, 24);
    return g;
  });
}

interface Numero {
  n: number;
  tipo: TipoNumero;
  x: number;
  y: number;
  t: number;
}

/** The numbers that jump over a fighter when it is hit (two little hops, then they fade). */
export class Numeros {
  lista: Numero[] = [];
  nuevo(n: number, tipo: TipoNumero, x: number, y: number) {
    this.lista.push({ n, tipo, x, y, t: 0 });
  }
  update(dt: number) {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      this.lista[i].t += dt;
      if (this.lista[i].t > 1.25) this.lista.splice(i, 1);
    }
  }
  dibujar(g: CanvasRenderingContext2D) {
    for (const o of this.lista) {
      const t = o.t;
      // first hop up to 14 px in 0.4 s, a second one of 5 px, then rest
      const h = t < 0.4 ? Math.sin((t / 0.4) * Math.PI) * 14 : t < 0.65 ? Math.sin(((t - 0.4) / 0.25) * Math.PI) * 5 : 0;
      if (t > 1 && Math.floor(t * 30) % 2) continue;
      const img = imagenNumero(o.n, o.tipo);
      g.drawImage(img, Math.round(o.x - img.width / 2), Math.round(o.y - h - img.height));
    }
  }
}

// ---------------------------------------------------------------- the pictures of the effects

/** A cached white copy of any picture (the hit flash of a friend). */
export function blanco(c: HTMLCanvasElement, clave: string): HTMLCanvasElement {
  return una(`blanco.${clave}`, () => {
    const r = lienzo(c.width, c.height);
    const x = ctx(r);
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, r.width, r.height);
    return r;
  });
}

/** The cone of stage light that falls from above, 40 × 100. */
export const cono = () =>
  una('fx.cono', () => {
    const c = lienzo(44, 100);
    const x = ctx(c);
    for (let y = 0; y < 100; y++) {
      const ancho = 10 + Math.round((y / 100) * 32);
      x.fillStyle = `rgba(255,240,170,${0.1 + (y / 100) * 0.2})`;
      x.fillRect(Math.round(22 - ancho / 2), y, ancho, 1);
    }
    return c;
  });

/** A column of ice with facets, 12 × 30. */
export const columnaHielo = () =>
  una('fx.hielo', () => {
    const c = lienzo(12, 30);
    const x = ctx(c);
    const filas = [
      '.....kk.....',
      '....kwwk....',
      '...kwwbbk...',
      '...kwbbbk...',
      '..kwwbbbbk..',
      '..kwbbbbbk..',
      '..kwbbcbbk..',
      '.kwwbbccbbk.',
      '.kwbbbccbbk.',
      '.kwbbbcbbbk.',
      '.kwbbcccbbk.',
      '.kwbbbcbbbk.',
      '.kwbbbbbbbk.',
      '.kwwbbbbbbk.',
      '.kwbbbbbbbk.',
      '.kwbbbbcbbk.',
      '.kwbbbbccbk.',
      '.kwbbbbbbbk.',
      '.kwbbbbbbbk.',
      '.kwwbbbbbbk.',
      '.kwbbbcbbbk.',
      '.kwbbbbbbbk.',
      '.kwbbbbbbbk.',
      '.kwbbbbcbbk.',
      '.kwbbbbbbbk.',
      '.kwbbbbbbbk.',
      '.kwbbbbbbbk.',
      '.kkbbbbbbkk.',
      '..kkbbbbkk..',
      '...kkkkkk...',
    ];
    const pal: Record<string, string> = { k: '#164a8a', w: '#ffffff', b: '#9adcff', c: '#5ab0f0' };
    filas.forEach((f, j) => {
      for (let i = 0; i < f.length; i++) if (pal[f[i]]) rect(x, pal[f[i]], i, j, 1, 1);
    });
    return c;
  });

/** Three frames of a flame, 12 × 18. `frio` = blue-white (the flambéed shot). */
export const llama = (frame: number) =>
  una(`fx.llama.${frame % 3}`, () => {
    const c = lienzo(12, 18);
    const x = ctx(c);
    const f = frame % 3;
    const bal = [0, 1, -1][f];
    elipse(x, '#e8322c', 6 + bal, 12, 5, 6);
    elipse(x, '#f08a2a', 6 + bal, 11, 4, 6);
    rect(x, '#e8322c', 5 + bal, 1 + f, 2, 5);
    rect(x, '#f08a2a', 5 + bal, 3 + f, 2, 5);
    elipse(x, '#ffd84a', 6 + bal, 12, 2.6, 4);
    elipse(x, '#fff6c8', 6 + bal, 13, 1.5, 2.5);
    return c;
  });

/** The comet of fire that arrives late, 14 × 14. */
export const cometa = () =>
  una('fx.cometa', () => {
    const c = lienzo(14, 14);
    const x = ctx(c);
    elipse(x, '#e8322c', 7, 7, 6, 6);
    elipse(x, '#f08a2a', 7, 7, 4.6, 4.6);
    elipse(x, '#ffd84a', 7, 7, 3, 3);
    elipse(x, '#fff6c8', 6, 6, 1.6, 1.6);
    return c;
  });

/** The drum-box the cajón is, 16 × 14, with its sound hole. */
export const cajon = () =>
  una('fx.cajon', () => {
    const c = lienzo(16, 14);
    const x = ctx(c);
    rect(x, '#b87838', 0, 0, 16, 14);
    rect(x, '#d89a52', 0, 0, 16, 2);
    rect(x, '#8a5424', 0, 12, 16, 2);
    rect(x, '#8a5424', 14, 0, 2, 14);
    rect(x, '#d89a52', 0, 0, 1, 14);
    elipse(x, '#3a2010', 8, 7, 3, 3);
    rect(x, '#8a5424', 3, 4, 1, 1);
    rect(x, '#8a5424', 12, 9, 1, 1);
    return contorno(c, '#3a2008');
  });

/** A big soft paw of the bear hug, pointing right, 14 × 14. */
export const zarpa = () =>
  una('fx.zarpa', () => {
    const c = lienzo(14, 14);
    const x = ctx(c);
    elipse(x, '#9a6a3a', 7, 7, 7, 6.5);
    elipse(x, '#b88450', 6, 6, 5, 4.5);
    elipse(x, '#5a3a22', 8, 8, 3, 2.6);
    for (const [px, py] of [[11, 2], [12, 5], [12, 8], [11, 11]]) {
      rect(x, '#f4ead6', px, py, 2, 2);
    }
    return contorno(c, '#2a1810');
  });

/** A little heart, 7 × 6. */
export const corazon = () =>
  una('fx.corazon', () => {
    const c = lienzo(7, 6);
    const x = ctx(c);
    rect(x, '#ff5a8a', 1, 0, 2, 1);
    rect(x, '#ff5a8a', 4, 0, 2, 1);
    rect(x, '#ff5a8a', 0, 1, 7, 2);
    rect(x, '#ff5a8a', 1, 3, 5, 1);
    rect(x, '#ff5a8a', 2, 4, 3, 1);
    rect(x, '#ff5a8a', 3, 5, 1, 1);
    rect(x, '#ffb0c8', 1, 1, 1, 1);
    return c;
  });

/** A pint of beer, 9 × 13. */
export const cana = () =>
  una('fx.cana', () => {
    const c = lienzo(9, 13);
    const x = ctx(c);
    rect(x, '#fff6e0', 0, 0, 8, 3);
    rect(x, '#f0b030', 0, 3, 8, 9);
    rect(x, '#ffd860', 1, 3, 2, 8);
    rect(x, '#c88418', 6, 3, 2, 9);
    rect(x, '#e8e0f0', 8, 3, 1, 1);
    rect(x, '#e8e0f0', 8, 5, 1, 4);
    rect(x, '#e8e0f0', 7, 9, 1, 1);
    rect(x, '#f4f0e6', 0, 12, 8, 1);
    rect(x, '#fff6e0', 2, 1, 1, 1);
    return contorno(c, '#5a3408');
  });

/** The shot glass, 6 × 8. */
export const chupito = () =>
  una('fx.chupito', () => {
    const c = lienzo(6, 8);
    const x = ctx(c);
    rect(x, '#dff4ff', 0, 0, 6, 6);
    rect(x, '#8ad8ff', 1, 2, 4, 4);
    rect(x, '#dff4ff', 2, 6, 2, 1);
    rect(x, '#dff4ff', 1, 7, 4, 1);
    rect(x, '#ffffff', 1, 0, 1, 5);
    return contorno(c, '#164a8a');
  });

/** A page of the script flying, 6 × 7. */
export const pagina = () =>
  una('fx.pagina', () => {
    const c = lienzo(6, 7);
    const x = ctx(c);
    rect(x, '#f4f0e6', 0, 0, 6, 7);
    rect(x, '#8a90b8', 1, 1, 4, 1);
    rect(x, '#8a90b8', 1, 3, 3, 1);
    rect(x, '#8a90b8', 1, 5, 4, 1);
    return contorno(c, '#3a3050');
  });

/** A rose of those thrown to the stage, 5 × 6. */
export const rosa = () =>
  una('fx.rosa', () => {
    const c = lienzo(5, 6);
    const x = ctx(c);
    rect(x, '#e8283a', 1, 0, 3, 1);
    rect(x, '#e8283a', 0, 1, 5, 2);
    rect(x, '#ff7a8a', 1, 1, 1, 1);
    rect(x, '#e8283a', 1, 3, 3, 1);
    rect(x, '#2a7a3a', 2, 4, 1, 2);
    return c;
  });

/** A leaf carried by the wind, 4 × 3. */
export const hoja = (col = '#6ab84a') =>
  una(`fx.hoja.${col}`, () => {
    const c = lienzo(4, 3);
    const x = ctx(c);
    rect(x, col, 1, 0, 3, 1);
    rect(x, col, 0, 1, 4, 1);
    rect(x, col, 0, 2, 2, 1);
    return c;
  });

/** The speech bubble of a shout: a white rounded box with a tail, text inside, at (cx, y = bottom of the tail). */
export function globo(g: CanvasRenderingContext2D, s: string, cx: number, y: number) {
  const w = anchoTexto(s) + 8;
  const x0 = Math.round(cx - w / 2);
  const y0 = y - 18;
  rect(g, '#0a0f3a', x0 + 1, y0, w - 2, 14);
  rect(g, '#0a0f3a', x0, y0 + 1, w, 12);
  rect(g, '#ffffff', x0 + 1, y0 + 1, w - 2, 12);
  rect(g, '#ffffff', x0 + 2, y0 + 13, 1, 1);
  rect(g, '#0a0f3a', x0 + 1, y0 + 14, 4, 1);
  rect(g, '#0a0f3a', x0 + 3, y0 + 15, 1, 1);
  rect(g, '#ffffff', x0 + 2, y0 + 14, 2, 1);
  escribir(g, s, x0 + 4, y0 + 2, '#1a1450');
}

// ---------------------------------------------------------------- the swirl into the fight

/**
 * The transition into a fight: the picture of the world turns and shrinks into a whirl of bands that turn
 * the other way, with flashes, ending in black. `k` goes from 0 to 1.
 */
export function dibujarRemolino(g: CanvasRenderingContext2D, mundo: HTMLCanvasElement, k: number) {
  const W = g.canvas.width;
  const H = g.canvas.height;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  // two quick flashes first
  if (k < 0.22) {
    g.drawImage(mundo, 0, 0);
    const f = k < 0.07 ? k / 0.07 : k < 0.11 ? 1 - (k - 0.07) / 0.04 : k < 0.17 ? (k - 0.11) / 0.06 : 1 - (k - 0.17) / 0.05;
    g.fillStyle = `rgba(255,255,255,${limitar(f, 0, 1) * 0.9})`;
    g.fillRect(0, 0, W, H);
    return;
  }
  const u = (k - 0.22) / 0.78;
  const BANDAS = 9;
  const R = Math.hypot(W, H) / 2;
  for (let i = BANDAS - 1; i >= 0; i--) {
    const r1 = (R * (i + 1)) / BANDAS;
    const r0 = (R * i) / BANDAS;
    g.save();
    g.beginPath();
    g.arc(W / 2, H / 2, r1, 0, Math.PI * 2);
    if (i) g.arc(W / 2, H / 2, r0, 0, Math.PI * 2, true);
    g.clip('evenodd');
    // each band turns by a different amount, so the picture twists into a spiral; the whole shrinks and fades
    const giro = (u * 5.5 + i * 0.5 * u * 3) * (i % 2 ? -1 : 1);
    const esc = Math.max(0.0001, 1 - u * 0.75 + i * 0.015);
    g.translate(W / 2, H / 2);
    g.rotate(giro);
    g.scale(esc, esc);
    g.globalAlpha = limitar(1 - u * u * 1.05, 0, 1);
    g.drawImage(mundo, -W / 2, -H / 2);
    g.restore();
  }
  // the black closes from the edge, in a ring that narrows
  const cierre = limitar((u - 0.55) / 0.45, 0, 1);
  if (cierre > 0) {
    g.fillStyle = '#000';
    g.beginPath();
    g.rect(0, 0, W, H);
    g.arc(W / 2, H / 2, R * (1 - cierre), 0, Math.PI * 2, true);
    g.fill('evenodd');
  }
}

// ---------------------------------------------------------------- the audience of «La ovación»

const PIELES = ['#f0c49a', '#e0a878', '#c88a60', '#f4d2b0'];
const PELOS = ['#2a1a14', '#5a3a22', '#c8c0b8', '#e8c860', '#8a3a28', '#1c1c2a'];
const ROPAS = ['#3a4a8a', '#8a3a4a', '#3a7a5a', '#7a5a9a', '#c8883a', '#4a8aa8'];

/** A person of the audience with his arms up (frame 0) or clapping in front (frame 1). `s` is the size (1 = 10 × 15 px). */
export function persona(v: number, frame: number, s: number, sombra: number): HTMLCanvasElement {
  return una(`persona.${v % 12}.${frame % 2}.${s}.${sombra}`, () => {
    const r = (a: number) => Math.round(a * s);
    const c = lienzo(r(12), r(16));
    const x = ctx(c);
    const m = (col: string) => {
      // darker for the back rows: a flat blue-black mixed in
      if (sombra <= 0) return col;
      const n = parseInt(col.slice(1), 16);
      const k = 1 - sombra;
      const R = Math.round(((n >> 16) & 255) * k + 14 * sombra);
      const G = Math.round(((n >> 8) & 255) * k + 14 * sombra);
      const B = Math.round((n & 255) * k + 40 * sombra);
      return `rgb(${R},${G},${B})`;
    };
    const piel = m(PIELES[v % PIELES.length]);
    const pelo = m(PELOS[(v * 3 + 1) % PELOS.length]);
    const ropa = m(ROPAS[(v * 5 + 2) % ROPAS.length]);
    const R = (px: number, py: number, w: number, h: number, col: string) => rect(x, col, r(px), r(py), Math.max(1, r(w)), Math.max(1, r(h)));
    // torso
    R(2, 9, 8, 7, ropa);
    R(4, 9, 4, 1, m('#f4f0e6'));
    // arms
    if (frame % 2 === 0) {
      R(0, 2, 2, 8, ropa);
      R(10, 2, 2, 8, ropa);
      R(0, 0, 2, 3, piel);
      R(10, 0, 2, 3, piel);
    } else {
      R(1, 7, 3, 5, ropa);
      R(8, 7, 3, 5, ropa);
      R(4, 6, 4, 3, piel);
    }
    // head and hair (some with a cap or a hat, some bald)
    elipse(x, piel, r(6), r(5.5), r(3.2), r(3.4));
    if (v % 5 === 0) {
      R(3, 2, 6, 2, m('#2a2a3a'));
      R(2, 3, 8, 1, m('#2a2a3a'));
    } else if (v % 7 === 3) {
      R(3, 3, 6, 1, m('#6a5a4a'));
    } else {
      R(3, 2, 6, 2, pelo);
      R(3, 4, 1, 2, pelo);
      R(8, 4, 1, 2, pelo);
    }
    R(4, 5, 1, 1, m('#2a1c20'));
    R(7, 5, 1, 1, m('#2a1c20'));
    R(5, 7, 2, 1, m('#a04a4a'));
    return c;
  });
}

/** One red velvet drape for the side of the screen, 28 × 160, hanging from the top (the right one is its mirror). */
export const telonLado = (derecha: boolean) =>
  una(`fx.telon.${derecha}`, () => {
    const c = lienzo(28, 160);
    const x = ctx(c);
    for (let i = 0; i < 28; i++) {
      const ola = Math.sin(i * 0.9) * 0.5 + 0.5;
      const k = 0.5 + ola * 0.5;
      rect(x, `rgb(${Math.round(120 + 100 * k)},${Math.round(14 + 20 * k)},${Math.round(28 + 22 * k)})`, i, 0, 1, 160);
    }
    // the curve of the swag on its inner edge
    for (let j = 0; j < 160; j++) {
      const corte = Math.round(Math.max(0, 6 - j * 0.045 + Math.sin(j * 0.12) * 1.5));
      x.clearRect(0, j, corte, 1);
    }
    rect(x, '#f0c040', 22, 150, 6, 10);
    for (let i = 0; i < 6; i++) rect(x, i % 2 ? '#d89a20' : '#ffe27a', 22 + i, 152 + (i % 3), 1, 8);
    const r = lienzo(28, 160);
    const y = ctx(r);
    if (derecha) {
      y.translate(28, 0);
      y.scale(-1, 1);
    }
    y.drawImage(c, 0, 0);
    return r;
  });

/** The valance across the top of the stage with its gold fringe, 240 × 22. */
export const telonArriba = () =>
  una('fx.telonArriba', () => {
    const c = lienzo(240, 22);
    const x = ctx(c);
    rect(x, '#8a1a2a', 0, 0, 240, 12);
    for (let i = 0; i < 240; i++) {
      const caida = 12 + Math.round(Math.abs(Math.sin(i * 0.065)) * 7);
      rect(x, i % 4 < 2 ? '#c8283a' : '#a81e2e', i, 0, 1, caida);
      rect(x, '#f0c040', i, caida, 1, 1);
      if (i % 3 === 0) rect(x, '#ffe27a', i, caida + 1, 1, 1);
    }
    rect(x, '#f0c040', 0, 11, 240, 1);
    return c;
  });

/** A beam of spotlight from the ceiling to the floor, 50 × 160. */
export const haz = () =>
  una('fx.haz', () => {
    const c = lienzo(50, 160);
    const x = ctx(c);
    for (let y = 0; y < 160; y++) {
      const ancho = 6 + Math.round((y / 160) * 42);
      x.fillStyle = `rgba(255,244,190,${0.1 + (y / 160) * 0.14})`;
      x.fillRect(Math.round(25 - ancho / 2), y, ancho, 1);
    }
    return c;
  });

/** Pixel ring (no anti-aliasing) of radii rx × ry, drawn with 1 px dots. */
export function anillo(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string, grosor = 1) {
  g.fillStyle = col;
  const n = Math.max(16, Math.round((rx + ry) * 1.6));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), grosor, grosor);
  }
}

/** The shout of the audience, from `ovacion.grito.1..n` (texts file). */
export function grito(i: number): string {
  return texto(`ovacion.grito.${(i % 4) + 1}`);
}

export { apagar };
