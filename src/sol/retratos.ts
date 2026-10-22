// The speakers' portraits (32×32), shown in a small window above the text box like the original's. Each is
// built from a few shapes, once, in four states (eyes open or shut × mouth shut or open) plus a smiling
// one, so the text can make them blink and talk. Cached canvases; nothing is drawn per frame but a blit.
import { ctx, lienzo, rect, una } from './pixel';
import type { Quien } from './personajes';

export const ANCHO_RETRATO = 32;

type Animo = 'normal' | 'contento';

interface Estado {
  ojos: boolean; // open
  boca: boolean; // open
  animo: Animo;
}

/** A filled ellipse over a range of rows (scanlines), for the beard's half-moons. */
function elip(x: CanvasRenderingContext2D, col: string, cx: number, cy: number, rx: number, ry: number, y0 = -99, y1 = 99) {
  x.fillStyle = col;
  for (let j = Math.floor(cy - ry); j < Math.ceil(cy + ry); j++) {
    if (j < y0 || j > y1) continue;
    const dy = (j + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const a = Math.round(cx - half);
    const b = Math.round(cx + half);
    if (b > a) x.fillRect(a, j, b - a, 1);
  }
}

const espejoX = (cx: number, lado: 1 | -1, dx: number, w = 1) => (lado === 1 ? cx + dx : cx - dx - w + 1);

/** The dark outline around everything, drawn behind (a silhouette shifted in four directions). */
function contorno(c: HTMLCanvasElement, col = 'rgb(34,20,48)') {
  const sil = lienzo(c.width, c.height);
  const s = ctx(sil);
  s.drawImage(c, 0, 0);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = col;
  s.fillRect(0, 0, c.width, c.height);
  const out = lienzo(c.width, c.height);
  const o = ctx(out);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) o.drawImage(sil, dx, dy);
  o.drawImage(c, 0, 0);
  return out;
}

function ojo(x: CanvasRenderingContext2D, cx: number, cy: number, lado: 1 | -1, abiertos: boolean, o: { iris: string; pestana?: boolean; feliz?: boolean; ceja: string; cejaAlta?: boolean }) {
  const px = (d: number, w = 1) => espejoX(cx, lado, d, w);
  if (o.feliz) {
    // ^ ^ : a happy arc
    rect(x, '#2a1a22', px(2), cy, 1, 1);
    rect(x, '#2a1a22', px(3), cy - 1, 2, 1);
    rect(x, '#2a1a22', px(5), cy, 1, 1);
  } else if (abiertos) {
    rect(x, '#ffffff', px(1, 5), cy - 1, 5, 4);
    rect(x, '#e6e2f0', px(1, 5), cy + 2, 5, 1);
    rect(x, o.iris, px(2, 3), cy - 1, 3, 4);
    rect(x, '#1a1020', px(3, 2), cy, 2, 2);
    rect(x, '#ffffff', px(2), cy - 1, 1, 1);
    if (o.pestana) {
      rect(x, '#2a1a22', px(0), cy - 2, 1, 1);
      rect(x, '#2a1a22', px(1, 5), cy - 2, 5, 1);
    } else rect(x, '#2a1a22', px(1, 5), cy - 2, 5, 1);
  } else {
    rect(x, '#2a1a22', px(1, 5), cy, 5, 1);
    rect(x, '#2a1a22', px(0), cy - 1, 1, 1);
    rect(x, '#2a1a22', px(6), cy - 1, 1, 1);
  }
  // brow
  const by = cy - (o.cejaAlta && lado === 1 ? 5 : 4);
  rect(x, o.ceja, px(1, 5), by, 5, 2);
  if (o.cejaAlta && lado === 1) rect(x, o.ceja, px(0), by + 1, 1, 1);
}

function boca(x: CanvasRenderingContext2D, cx: number, cy: number, e: Estado, labio: string) {
  if (e.animo === 'contento' && e.boca) {
    // an open grin with teeth
    rect(x, '#5a1e2a', cx - 4, cy, 9, 4);
    rect(x, '#ffffff', cx - 3, cy, 7, 2);
    rect(x, '#d8506a', cx - 2, cy + 3, 5, 1);
    rect(x, '#5a1e2a', cx - 5, cy - 1, 1, 1);
    rect(x, '#5a1e2a', cx + 5, cy - 1, 1, 1);
  } else if (e.boca) {
    rect(x, '#5a1e2a', cx - 2, cy, 5, 3);
    rect(x, '#d8506a', cx - 1, cy + 2, 3, 1);
    rect(x, '#ffffff', cx - 2, cy, 5, 1);
  } else if (e.animo === 'contento') {
    rect(x, labio, cx - 3, cy + 1, 7, 1);
    rect(x, labio, cx - 4, cy, 1, 1);
    rect(x, labio, cx + 4, cy, 1, 1);
    rect(x, '#ffffff', cx - 2, cy + 1, 5, 1);
  } else {
    rect(x, labio, cx - 3, cy + 1, 7, 1);
    rect(x, labio, cx - 4, cy, 1, 1);
    rect(x, labio, cx + 4, cy, 1, 1);
  }
}

// ---------------------------------------------------------------- Pablo

function pablo(e: Estado) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = '#f2b88c';
  const sombra = '#d9936b';
  const pelo = '#8a5430';
  const peloO = '#60381f';
  const peloL = '#b57a48';
  const barba = '#4e2e1c';
  // jacket and tee
  elip(x, '#3a405e', 16, 36, 15, 11);
  elip(x, '#454c6a', 16, 35, 14, 10);
  rect(x, '#e9e4d2', 12, 26, 8, 6);
  rect(x, '#c4bfae', 12, 26, 1, 6);
  rect(x, '#c4bfae', 19, 26, 1, 6);
  rect(x, '#2f3550', 11, 26, 1, 6);
  rect(x, '#2f3550', 20, 26, 1, 6);
  // neck
  rect(x, sombra, 12, 22, 8, 5);
  elip(x, '#c4bfae', 16, 26, 4, 2, 26, 27);
  // ears and the hoop
  elip(x, piel, 6, 16, 2.5, 3.5);
  elip(x, piel, 26, 16, 2.5, 3.5);
  rect(x, sombra, 5, 16, 1, 3);
  rect(x, '#f7c948', 4, 19, 1, 3);
  rect(x, '#f7c948', 5, 21, 2, 1);
  // face
  elip(x, piel, 16, 15, 10, 11);
  // the short beard hugs the jaw and chin like a «U»: no moustache, so nothing crosses the face
  elip(x, barba, 16, 16.5, 10, 12, 21, 28);
  elip(x, piel, 16, 18.5, 7.5, 7.5, 21, 28);
  rect(x, peloO, 12, 27, 8, 1);
  // eyes
  const o = { iris: '#6a4a2a', ceja: peloO, cejaAlta: true };
  ojo(x, 14, 16, -1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  ojo(x, 18, 16, 1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  // nose
  rect(x, sombra, 15, 18, 2, 3);
  rect(x, '#c07a58', 14, 20, 4, 1);
  // mouth
  boca(x, 16, 23, e, '#8a3a3a');
  // blush
  rect(x, '#f09a86', 8, 19, 2, 1);
  rect(x, '#f09a86', 22, 19, 2, 1);
  // messy hair, but little of it: a low cap, three short tufts, a ragged fringe and thin sideburns
  elip(x, pelo, 16, 10, 10.5, 7, 3, 7);
  for (const [cx, top, ancho] of [[10, 2, 3], [16, 1, 3], [22, 2, 3]] as const) {
    for (let y = top; y < 5; y++) {
      const w = Math.min(ancho, 1 + (y - top) * 2);
      rect(x, y - top < 1 ? peloL : pelo, cx - Math.floor(w / 2), y, w, 1);
    }
  }
  // the fringe falls over the forehead in points
  for (const [fx, fy, fw] of [[8, 8, 3], [12, 7, 3], [17, 8, 3], [21, 7, 3]] as const) {
    rect(x, pelo, fx, 7, fw, fy - 6);
    rect(x, peloO, fx, fy + 1, fw, 1);
  }
  rect(x, pelo, 6, 8, 3, 6);
  rect(x, pelo, 23, 8, 3, 6);
  rect(x, peloO, 6, 13, 1, 1);
  rect(x, peloO, 25, 13, 1, 1);
  rect(x, peloL, 11, 5, 3, 1);
  rect(x, peloL, 18, 4, 3, 1);
  return contorno(c);
}

// ---------------------------------------------------------------- the mother

function madre(e: Estado) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = '#f4c39c';
  const sombra = '#dba47e';
  const pelo = '#8e4d2f';
  const peloO = '#66331f';
  const peloL = '#b8693d';
  // the bun first (behind the head), a flower in it
  elip(x, pelo, 16, 3, 7, 5);
  elip(x, peloL, 14, 2, 3, 2);
  rect(x, peloO, 10, 5, 12, 1);
  rect(x, '#e6b84a', 20, 1, 3, 3);
  rect(x, '#fff1a8', 21, 2, 1, 1);
  // dress, apron and its straps
  elip(x, '#9b3b4d', 16, 36, 15, 11);
  elip(x, '#cc5565', 16, 35, 14, 10);
  rect(x, '#f6edd4', 9, 26, 14, 8);
  rect(x, '#d9cba8', 9, 26, 1, 8);
  rect(x, '#d9cba8', 22, 26, 1, 8);
  rect(x, '#cc5565', 8, 26, 3, 3);
  rect(x, '#cc5565', 21, 26, 3, 3);
  // neck and collar
  rect(x, sombra, 12, 22, 8, 5);
  elip(x, '#f6edd4', 16, 26, 5, 2, 25, 27);
  // ears and a pearl
  elip(x, piel, 6, 16, 2.5, 3.5);
  elip(x, piel, 26, 16, 2.5, 3.5);
  rect(x, '#ffffff', 5, 19, 2, 2);
  rect(x, '#ffffff', 25, 19, 2, 2);
  // a round, kind face
  elip(x, piel, 16, 15, 10, 11);
  elip(x, sombra, 16, 25, 5, 1.5, 24, 26);
  // eyes with lashes, soft brows
  const o = { iris: '#5a4030', ceja: peloO, pestana: true };
  ojo(x, 14, 16, -1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  ojo(x, 18, 16, 1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  rect(x, sombra, 15, 18, 2, 2);
  rect(x, '#c98a68', 14, 20, 4, 1);
  boca(x, 16, 23, e, '#b04a52');
  // rosy cheeks
  rect(x, '#ee8a86', 8, 19, 3, 2);
  rect(x, '#ee8a86', 21, 19, 3, 2);
  // hair: parted, brought over the ears
  elip(x, pelo, 16, 8, 12, 9, -99, 10);
  rect(x, pelo, 4, 9, 4, 11);
  rect(x, pelo, 24, 9, 4, 11);
  // swept fringe: a block on each side that thins towards the parting
  for (let y = 9; y < 14; y++) {
    const k = y - 9;
    rect(x, pelo, 6, y, 8 - k * 2 + (k > 2 ? 1 : 0), 1);
    rect(x, pelo, 18 + k * 2 - (k > 2 ? 1 : 0), y, 8 - k * 2 + (k > 2 ? 1 : 0), 1);
  }
  rect(x, peloO, 15, 6, 2, 4);
  rect(x, peloL, 9, 8, 3, 1);
  rect(x, peloL, 20, 8, 3, 1);
  rect(x, peloO, 4, 18, 1, 2);
  rect(x, peloO, 27, 18, 1, 2);
  return contorno(c);
}

// ---------------------------------------------------------------- the villager

function aldeano(e: Estado) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = '#dc9d6c';
  const sombra = '#b97b4e';
  const blanco = '#f4f4f6';
  // waistcoat, shirt and a red neckerchief
  elip(x, '#8a3224', 16, 36, 15, 11);
  elip(x, '#b5472f', 16, 35, 14, 10);
  rect(x, '#f0e6d2', 12, 26, 8, 6);
  rect(x, '#cfc2a8', 12, 26, 1, 6);
  rect(x, '#6a2418', 11, 26, 1, 6);
  rect(x, '#6a2418', 20, 26, 1, 6);
  rect(x, '#c64b3a', 11, 25, 10, 3);
  rect(x, '#8a2a20', 12, 27, 8, 1);
  // neck, ears
  rect(x, sombra, 12, 22, 8, 4);
  elip(x, piel, 6, 16, 2.5, 3.5);
  elip(x, piel, 26, 16, 2.5, 3.5);
  // a weathered face, a big nose
  elip(x, piel, 16, 16, 10, 11);
  rect(x, sombra, 15, 15, 3, 5);
  rect(x, '#c98a58', 14, 19, 5, 2);
  elip(x, '#e8a878', 16, 18, 2, 2);
  // wrinkles and rosy cheeks
  rect(x, sombra, 8, 19, 2, 1);
  rect(x, sombra, 22, 19, 2, 1);
  rect(x, sombra, 10, 11, 4, 1);
  rect(x, sombra, 18, 11, 4, 1);
  rect(x, '#e58a72', 9, 17, 3, 2);
  rect(x, '#e58a72', 20, 17, 3, 2);
  // bushy white brows and small blue eyes
  const o = { iris: '#3a6aa8', ceja: blanco };
  ojo(x, 14, 16, -1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  ojo(x, 18, 16, 1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  rect(x, blanco, 8, 12, 8, 2);
  rect(x, blanco, 17, 12, 8, 2);
  // the big white moustache
  rect(x, blanco, 8, 20, 16, 3);
  elip(x, blanco, 16, 22, 9, 3, 21, 24);
  rect(x, '#cfcfd8', 8, 23, 16, 1);
  // mouth under it
  if (e.boca) {
    rect(x, '#5a1e2a', 13, 24, 6, 2);
    rect(x, '#d8506a', 14, 25, 4, 1);
  } else rect(x, '#8a3a3a', 14, 25, 4, 1);
  rect(x, blanco, 12, 26, 8, 2);
  // the straw hat: a dome, a ribbon and a wide brim
  elip(x, '#ecc96c', 16, 8, 10, 8, -99, 8);
  rect(x, '#bd9540', 6, 6, 20, 1);
  rect(x, '#c64b3a', 6, 5, 20, 3);
  rect(x, '#8a2a20', 6, 7, 20, 1);
  elip(x, '#ecc96c', 16, 9, 15, 3.5);
  elip(x, '#bd9540', 16, 10, 15, 3, 10, 12);
  rect(x, '#fff0a8', 12, 2, 4, 1);
  for (let i = 0; i < 7; i++) rect(x, '#bd9540', 2 + i * 4, 8 + (i % 2), 2, 1);
  return contorno(c);
}

// Placeholders until the three friends have their portraits.
const FUNCS: Record<Quien, (e: Estado) => HTMLCanvasElement> = { pablo, madre, aldeano, chuchi: aldeano, fran: aldeano, guille: aldeano };

/** One portrait: eyes open or shut, mouth open or shut, and a smile if `contento`. */
export function retrato(q: Quien, ojos: boolean, boca: boolean, animo: Animo = 'normal'): HTMLCanvasElement {
  return una(`retrato.${q}.${ojos}.${boca}.${animo}`, () => FUNCS[q]({ ojos, boca, animo }));
}
