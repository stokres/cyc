// What is drawn over the race in Impropios Kart: the place, the lap, the item box, the minimap, the traffic light, the
// banners and the podium. Texts are painted once into small cached canvases (outlined, scaled by whole numbers) and
// only copied; nothing here builds a string or a canvas per frame except the place/lap labels when they change.
import { texto } from '../juego/textos';
import { anchoTexto, escribir } from '../sol/fuente';
import { ctx, lienzo, pintar, rect } from '../sol/pixel';
import { icono, spriteBrillo, spriteCopa, spritesKart, ITEMS, type ItemId } from './arte';
import { H, W } from './modo7';
import type { Kart } from './carrera';

const ORO = '#f2c14e';

const rotulos = new Map<string, HTMLCanvasElement>();

/** A line of pixel text with a dark outline, painted once per (text, colour, scale). */
export function rotulo(txt: string, col = '#ffffff', k = 1, borde = '#2a1030'): HTMLCanvasElement {
  const clave = `${txt}|${col}|${k}|${borde}`;
  const hit = rotulos.get(clave);
  if (hit) return hit;
  const w = anchoTexto(txt) + 2;
  const base = lienzo(w, 13);
  const x = ctx(base);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) escribir(x, txt, 1 + dx, 1 + dy, borde);
  escribir(x, txt, 1, 1, col);
  let out = base;
  if (k > 1) {
    out = lienzo(w * k, 13 * k);
    const o = ctx(out);
    o.drawImage(base, 0, 0, w, 13, 0, 0, w * k, 13 * k);
  }
  rotulos.set(clave, out);
  return out;
}

export const centrado = (g: CanvasRenderingContext2D, img: HTMLCanvasElement, cx: number, y: number) => g.drawImage(img, Math.round(cx - img.width / 2), Math.round(y));

/** A dark translucent panel with a gold edge (the same look as the instructions strip). */
export function panel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a = 0.62) {
  g.fillStyle = `rgba(10,8,24,${a})`;
  g.fillRect(x, y, w, h);
  g.fillStyle = ORO;
  g.fillRect(x, y, w, 1);
  g.fillRect(x, y + h - 1, w, 1);
  g.fillRect(x, y, 1, h);
  g.fillRect(x + w - 1, y, 1, h);
}

const bandera = (() => {
  const c = lienzo(9, 8);
  pintar(ctx(c), ['.bbbbbbbb', '.bwbwbwbw', '.bbwbwbwb', '.bwbwbwbw', '.bbwbwbwb', '.b.......', '.b.......', '.b.......'], { b: '#1c1418', w: '#f8f4ea' });
  return c;
})();

export interface DatosHud {
  puesto: number;
  vuelta: number;
  vueltas: number;
  item: ItemId | null;
  /** The icon the roulette shows right now, while it turns. */
  ruleta: ItemId | null;
  /** Seconds the item name has been on show (negative: none). */
  nombreItem: ItemId | null;
  tNombre: number;
  t: number;
}

/** Place, lap and item box. */
export function dibujarHud(g: CanvasRenderingContext2D, d: DatosHud) {
  centradoIzq(g, rotulo(texto('kart.puesto', { n: d.puesto }), d.puesto === 1 ? ORO : '#ffffff', 3), 4, 3);
  // lap: a chequered flag and «1/3»
  panel(g, W / 2 - 22, 3, 44, 15);
  g.drawImage(bandera, W / 2 - 19, 6);
  g.drawImage(rotulo(texto('kart.vueltaN', { n: d.vuelta, total: d.vueltas }), '#ffffff', 1, '#10081c'), W / 2 - 7, 3);
  // item box
  const ix = W - 31;
  panel(g, ix, 3, 28, 28);
  const brilla = d.item && Math.floor(d.t * 5) % 2 === 0;
  if (brilla) {
    g.fillStyle = '#ffffff';
    g.fillRect(ix + 1, 4, 26, 1);
    g.fillRect(ix + 1, 29, 26, 1);
    g.fillRect(ix + 1, 4, 1, 26);
    g.fillRect(ix + 26, 4, 1, 26);
  }
  const mostrar = d.ruleta ?? d.item;
  if (mostrar) g.drawImage(icono(mostrar), ix + 6, 9);
  if (d.nombreItem && d.tNombre < 1.8) {
    const r = rotulo(texto(`item.${d.nombreItem}`), '#ffffff', 1, '#10081c');
    g.drawImage(r, Math.round(W - 4 - r.width), 34);
  }
}

const centradoIzq = (g: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number) => g.drawImage(img, x, y);

/** The minimap with the dot of every kart; the human's blinks. */
export function dibujarMinimapa(g: CanvasRenderingContext2D, mapa: HTMLCanvasElement, karts: Kart[], tam: number, t: number) {
  const x0 = W - 6 - mapa.width;
  const y0 = H - 6 - mapa.height;
  g.fillStyle = 'rgba(10,8,24,0.55)';
  g.fillRect(x0 - 2, y0 - 2, mapa.width + 4, mapa.height + 4);
  g.globalAlpha = 0.9;
  g.drawImage(mapa, x0, y0);
  g.globalAlpha = 1;
  const k = mapa.width / tam;
  // the human's dot last so that it stays on top
  const orden = [...karts].sort((a, b) => Number(a.humano) - Number(b.humano));
  for (const kart of orden) {
    const px = Math.round(x0 + kart.x * k);
    const py = Math.round(y0 + kart.y * k);
    g.fillStyle = '#10081c';
    g.fillRect(px - 2, py - 2, 5, 5);
    g.fillStyle = kart.piloto.color;
    g.fillRect(px - 1, py - 1, 3, 3);
    if (kart.humano && Math.floor(t * 4) % 2 === 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(px, py, 1, 1);
    }
  }
}

/** The starting lights: three lamps that go red, red, green, and the word that goes with them. */
export function dibujarSemaforo(g: CanvasRenderingContext2D, luces: number, va: boolean) {
  const x = W / 2 - 22;
  const y = 22;
  g.fillStyle = '#10081c';
  g.fillRect(x - 1, y - 1, 46, 17);
  g.fillStyle = '#3a3040';
  g.fillRect(x, y, 44, 15);
  for (let i = 0; i < 3; i++) {
    const encendida = va ? i === 2 : i < luces;
    const col = va ? '#4cff7a' : '#ff3a3a';
    const cx = x + 8 + i * 14;
    g.fillStyle = '#10081c';
    g.fillRect(cx - 5, y + 2, 11, 11);
    g.fillStyle = encendida ? col : '#2a2030';
    g.fillRect(cx - 4, y + 3, 9, 9);
    if (encendida) {
      g.fillStyle = '#ffffffaa';
      g.fillRect(cx - 3, y + 4, 3, 3);
    }
  }
  if (va) centrado(g, rotulo(texto('kart.ya'), '#4cff7a', 3), W / 2, 44);
  else if (luces > 0) centrado(g, rotulo(texto('kart.listos'), '#ffffff', 2), W / 2, 46);
}

/** A banner in the middle of the top (the zone's name, «¡Vuelta final!», «¡META!»). */
export function banda(g: CanvasRenderingContext2D, txt: string, y: number, col = ORO, k = 1, a = 1) {
  let r = rotulo(txt, col, k);
  while (k > 1 && r.width + 14 > W - 8) r = rotulo(txt, col, --k);
  const w = r.width + 14;
  g.globalAlpha = a;
  panel(g, Math.round(W / 2 - w / 2), y - 3, w, r.height + 4, 0.7);
  g.drawImage(r, Math.round(W / 2 - r.width / 2), y - 1);
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- the podium

interface Confeti {
  x: number;
  y: number;
  vy: number;
  vx: number;
  col: string;
  fase: number;
}
let confeti: Confeti[] | null = null;
const COL_CONFETI = ['#ff6fb5', '#ffe36e', '#6fe0ff', '#a98bff', '#ff9a3c', '#ffffff', '#4cff7a'];

export function reiniciarConfeti() {
  confeti = null;
}

/**
 * The podium: the first three on blocks (first in the middle), a cup for the winner, beams of light and confetti.
 * `t` is the seconds since it appeared; `ganado` says whether the human is on the top step.
 */
export function dibujarPodio(g: CanvasRenderingContext2D, top: Kart[], t: number, dt: number, ganado: boolean) {
  // background: a dark stage with a floor of tiles and swinging beams
  for (let i = 0; i < 9; i++) rect(g, ['#1a0f2c', '#221238', '#2a1642', '#321a4c', '#3a2058', '#42265e', '#4a2c66', '#52326e', '#5a3a76'][i], 0, Math.floor((i * 100) / 9), W, 13);
  for (let y = 100; y < H; y += 8) for (let x = -8; x < W + 8; x += 16) rect(g, ((x + y) / 8) & 1 ? '#6a3a82' : '#5a2e72', x + ((y / 8) & 1 ? 8 : 0), y, 8, 8);
  rect(g, '#2a1642', 0, 100, W, 1);
  for (let i = 0; i < 3; i++) {
    const a = Math.sin(t * 1.3 + i * 2.1) * 0.5;
    const cx = 40 + i * 88;
    g.fillStyle = ['rgba(255,111,181,0.16)', 'rgba(111,224,255,0.14)', 'rgba(255,227,110,0.15)'][i];
    g.beginPath();
    g.moveTo(cx, 0);
    g.lineTo(cx + a * 70 - 26, 100);
    g.lineTo(cx + a * 70 + 26, 100);
    g.closePath();
    g.fill();
  }
  // the three blocks
  const sitios = [
    { k: top[0], x: W / 2, alto: 38, n: 1 },
    { k: top[1], x: W / 2 - 52, alto: 26, n: 2 },
    { k: top[2], x: W / 2 + 52, alto: 18, n: 3 },
  ];
  for (const s of sitios) {
    if (!s.k) continue;
    const y = 128 - s.alto;
    rect(g, '#f2c14e', s.x - 22, y, 44, 2);
    rect(g, '#d9a232', s.x - 22, y + 2, 44, s.alto - 2 + 16);
    rect(g, '#b5821e', s.x + 14, y + 2, 8, s.alto - 2 + 16);
    g.drawImage(rotulo(String(s.n), '#ffffff', 2, '#6a4410'), Math.round(s.x - 6), y + 4);
    const spr = spritesKart(s.k.piloto)[8];
    const e = 1.35;
    const salto = ganado && s.n === 1 || (!ganado && s.k.humano) ? Math.round(Math.abs(Math.sin(t * 6)) * 3) : 0;
    g.drawImage(spr, Math.round(s.x - 22 * e), Math.round(y - 36 * e - salto + 1), Math.round(spr.width * e), Math.round(spr.height * e));
    const nombre = rotulo(texto(s.k.piloto.nombre), '#ffffff', 1);
    g.drawImage(nombre, Math.round(s.x - nombre.width / 2), 131);
  }
  if (top[0]) {
    const copa = spriteCopa();
    // the cup stands on the stage floor to the left of the blocks
    const cx = 30;
    g.drawImage(copa, cx - 16, 84 + Math.round(Math.sin(t * 3) * 1.5), 32, 38);
    const b = spriteBrillo();
    for (let i = 0; i < 5; i++) {
      const aa = t * 2 + i * 1.3;
      if (Math.sin(aa * 3) > 0.2) g.drawImage(b, Math.round(cx + Math.cos(aa) * 20 - 3), Math.round(100 + Math.sin(aa * 1.7) * 16));
    }
  }
  // confetti
  if (!confeti) {
    confeti = Array.from({ length: 46 }, (_, i) => ({ x: (i * 37) % W, y: -((i * 53) % 90), vy: 30 + ((i * 17) % 30), vx: ((i * 7) % 20) - 10, col: COL_CONFETI[i % COL_CONFETI.length], fase: i }));
  }
  for (const c of confeti) {
    c.y += c.vy * dt;
    c.x += (c.vx + Math.sin(t * 3 + c.fase) * 12) * dt;
    if (c.y > H) {
      c.y = -4;
      c.x = (c.x + 97) % W;
    }
    g.fillStyle = c.col;
    g.fillRect(Math.round(c.x), Math.round(c.y), 2, Math.floor(t * 8 + c.fase) % 2 ? 2 : 3);
  }
}

/** For the HUD roulette: the item shown at moment `t` while it turns. */
export const ruletaItem = (t: number): ItemId => ITEMS[Math.floor(t * 14) % ITEMS.length];
