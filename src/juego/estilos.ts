// El caos total (capítulo 2, tramo final; docs/CAPITULO2.md): cortes rapidísimos entre todos los estilos del
// juego: el de siempre, un plano manga, el píxel de Alacant Sun, el píxel del Pang y un boceto a lápiz.
//
// Docs/ESTILO.md, T5: cada estilo se hornea UNA vez a un lienzo (una instantánea de la pantalla, el bar de
// antes y el mundo de los conceptos, pasada por un reductor de píxeles, un cuantizador de paleta o un detector de
// bordes, más el plano manga de verdad, que viene de src/arte/anime/manga.mjs) y se cuelga, escondido, dentro del
// escenario. Un corte es quitar el `hidden` de uno y ponérselo a otro: ni un fotograma de dibujo. Como están
// dentro del escenario, giran con la cámara loca (src/juego/camara.ts) igual que todo lo demás.
import type { Aventura } from './aventura';
import { leerMarca, plano } from '../arte/anime/manga.mjs';
import { svgABitmap } from '../motor/sprites';
import { H } from '../motor/motor';

export type Estilo = 'normal' | 'manga' | 'sol' | 'pang' | 'lapiz';

export interface Cortes {
  /** Empieza a cortar de un estilo a otro, rapidísimo, hasta `parar`. */
  iniciar(): void;
  parar(): void;
  /** Los estilos horneados (para las pruebas). */
  readonly estilos: Estilo[];
  /** Enseña uno ahora (para las pruebas y las capturas). */
  mostrar(e: Estilo | null): void;
  liberar(): void;
}

/** La paleta del Pang: dieciséis colores de máquina recreativa. */
const PALETA_PANG = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'].map((h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
});

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

/** La imagen a `ancho` píxeles de ancho, promediada (así cada píxel grande es el color medio de su zona). */
function reducir(src: HTMLCanvasElement, ancho: number) {
  const c = lienzo(ancho, (ancho * src.height) / src.width);
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, c.width, c.height);
  return { c, x };
}

/** El píxel de Alacant Sun: 240 de ancho como su pantalla, 5 niveles por canal y más viveza. */
function estiloSol(src: HTMLCanvasElement) {
  const { c, x } = reducir(src, 240);
  const d = x.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const gris = (p[i] + p[i + 1] + p[i + 2]) / 3;
    for (let k = 0; k < 3; k++) {
      const v = Math.max(0, Math.min(255, gris + (p[i + k] - gris) * 1.35));
      p[i + k] = Math.round((Math.round((v / 255) * 4) / 4) * 255);
    }
  }
  x.putImageData(d, 0, 0);
  return c;
}

/** El píxel del Pang: 384 de ancho como el suyo, y cada píxel al color más cercano de una paleta de dieciséis. */
function estiloPang(src: HTMLCanvasElement) {
  const { c, x } = reducir(src, 384);
  const d = x.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    let mejor = 0;
    let dm = Infinity;
    for (let k = 0; k < PALETA_PANG.length; k++) {
      const q = PALETA_PANG[k];
      const dr = p[i] - q[0];
      const dg = p[i + 1] - q[1];
      const db = p[i + 2] - q[2];
      const dd = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.8;
      if (dd < dm) {
        dm = dd;
        mejor = k;
      }
    }
    const q = PALETA_PANG[mejor];
    p[i] = q[0];
    p[i + 1] = q[1];
    p[i + 2] = q[2];
  }
  x.putImageData(d, 0, 0);
  return c;
}

/** El boceto a lápiz: papel crema, bordes en grafito (Sobel) y rayado en diagonal donde la imagen es oscura. */
function estiloLapiz(src: HTMLCanvasElement) {
  const { c, x } = reducir(src, 720);
  const w = c.width;
  const h = c.height;
  const d = x.getImageData(0, 0, w, h);
  const p = d.data;
  const gris = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gris[i] = (p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11) / 255;
  let s = 5;
  const az = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const g = (a: number, b: number) => gris[Math.max(0, Math.min(h - 1, j + b)) * w + Math.max(0, Math.min(w - 1, i + a))];
      const gx = -g(-1, -1) - 2 * g(-1, 0) - g(-1, 1) + g(1, -1) + 2 * g(1, 0) + g(1, 1);
      const gy = -g(-1, -1) - 2 * g(0, -1) - g(1, -1) + g(-1, 1) + 2 * g(0, 1) + g(1, 1);
      const borde = Math.min(1, Math.hypot(gx, gy) * 2.2);
      const sombra = gris[j * w + i] < 0.3 && (i + j) % 5 === 0 ? 0.55 : gris[j * w + i] < 0.5 && (i - j + 2000) % 7 === 0 ? 0.28 : 0;
      const tinta = Math.min(1, borde + sombra);
      const papel = 238 + (az() - 0.5) * 8;
      const k = i * 4 + j * w * 4;
      p[k] = papel - tinta * (papel - 44);
      p[k + 1] = papel * 0.97 - tinta * (papel * 0.97 - 46);
      p[k + 2] = papel * 0.9 - tinta * (papel * 0.9 - 58);
      p[k + 3] = 255;
    }
  }
  x.putImageData(d, 0, 0);
  return c;
}

/** El plano manga de verdad, con la marca de unos textos (`fran:cara:enfado vero:boca:picara !gogogo`). */
async function estiloManga(g: Aventura, marca: string[]) {
  const m = leerMarca(marca);
  if (!m) return null;
  const mo = g.motor;
  const W = (mo.cssW / mo.cssH) * H;
  const px = (mo.cssH * Math.min(window.devicePixelRatio || 1, 2)) / H;
  return svgABitmap(plano(m, W, H, {}), Math.min(W * px, 1400), Math.min(H * px, 700));
}

/**
 * Hornea los estilos. `bar` es una foto del bar de antes (para el que se vuelve a ver entre cortes); `marcaManga`
 * el plano manga. Los lienzos van dentro del escenario, escondidos, listos para cortar.
 */
export async function prepararCortes(g: Aventura, bar: HTMLCanvasElement | null, marcaManga: string[]): Promise<Cortes> {
  const ahora = await g.motor.instantanea(900);
  const fuente = bar ?? ahora;
  const hechos = new Map<Estilo, HTMLCanvasElement>();
  hechos.set('normal', fuente === ahora ? ahora : fuente);
  hechos.set('sol', estiloSol(ahora));
  hechos.set('pang', estiloPang(fuente));
  hechos.set('lapiz', estiloLapiz(fuente));
  const manga = await estiloManga(g, marcaManga);
  if (manga) hechos.set('manga', manga);
  // La foto de ahora ya solo servía para el estilo del Sol; si no es el «normal», se suelta.
  if (fuente !== ahora) ahora.width = ahora.height = 0;
  const el = new Map<Estilo, HTMLCanvasElement>();
  for (const [e, c] of hechos) {
    c.className = `corte-estilo corte-${e}`;
    c.hidden = true;
    g.motor.escenario.append(c);
    el.set(e, c);
  }
  let visible: Estilo | null = null;
  let temporizador = 0;
  let activo = false;
  const mostrar = (e: Estilo | null) => {
    visible = e;
    for (const [k, c] of el) c.hidden = k !== e;
  };
  const estilos = [...el.keys()];
  const siguiente = () => {
    if (!activo) return;
    // Un corte, un momento de mundo vivo, otro corte: nunca el mismo dos veces seguidas.
    if (visible) {
      mostrar(null);
      temporizador = window.setTimeout(siguiente, g.rapido ? 20 : 40 + Math.random() * 130);
      return;
    }
    const candidatos = estilos.filter((e) => e !== ultimo);
    const e = candidatos[Math.floor(Math.random() * candidatos.length)];
    ultimo = e;
    mostrar(e);
    temporizador = window.setTimeout(siguiente, g.rapido ? 20 : 60 + Math.random() * 150);
  };
  let ultimo: Estilo | null = null;
  return {
    iniciar() {
      if (activo) return;
      activo = true;
      siguiente();
    },
    parar() {
      activo = false;
      clearTimeout(temporizador);
      mostrar(null);
    },
    get estilos() {
      return estilos;
    },
    mostrar,
    liberar() {
      activo = false;
      clearTimeout(temporizador);
      for (const c of el.values()) {
        c.remove();
        c.width = c.height = 0;
      }
      el.clear();
    },
  };
}
