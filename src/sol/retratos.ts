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

/** Colours of Pablo's portrait; the narrator (his shadow) wears the same face in the dark. */
interface PaletaPablo {
  piel: string; sombra: string; pelo: string; peloO: string; peloL: string; barba: string;
  chaqueta: string; chaquetaO: string; camisa: string; camisaO: string; camisaOO: string;
  iris: string; mejillas: string; labio: string; nariz: string; arete: string;
}
const PABLO_NORMAL: PaletaPablo = {
  piel: '#f2b88c', sombra: '#d9936b', pelo: '#8a5430', peloO: '#60381f', peloL: '#b57a48', barba: '#4e2e1c',
  chaqueta: '#454c6a', chaquetaO: '#3a405e', camisa: '#e9e4d2', camisaO: '#c4bfae', camisaOO: '#2f3550',
  iris: '#6a4a2a', mejillas: '#f09a86', labio: '#8a3a3a', nariz: '#c07a58', arete: '#f7c948',
};
/** Pablo made of shadow: violet-black skin and hair, a ghostly shirt, bright yellow eyes. */
const PABLO_SOMBRA: PaletaPablo = {
  piel: '#3d3168', sombra: '#2b2250', pelo: '#171128', peloO: '#0d0919', peloL: '#2e2552', barba: '#120c22',
  chaqueta: '#251d44', chaquetaO: '#190f33', camisa: '#4d4380', camisaO: '#382f66', camisaOO: '#120c26',
  iris: '#ffd84a', mejillas: '#4a3d80', labio: '#8a6ad8', nariz: '#2b2250', arete: '#ffe27a',
};

function pablo(e: Estado, v: PaletaPablo = PABLO_NORMAL) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = v.piel;
  const sombra = v.sombra;
  const pelo = v.pelo;
  const peloO = v.peloO;
  const peloL = v.peloL;
  const barba = v.barba;
  // jacket and tee
  elip(x, v.chaquetaO, 16, 36, 15, 11);
  elip(x, v.chaqueta, 16, 35, 14, 10);
  rect(x, v.camisa, 12, 26, 8, 6);
  rect(x, v.camisaO, 12, 26, 1, 6);
  rect(x, v.camisaO, 19, 26, 1, 6);
  rect(x, v.camisaOO, 11, 26, 1, 6);
  rect(x, v.camisaOO, 20, 26, 1, 6);
  // neck
  rect(x, sombra, 12, 22, 8, 5);
  elip(x, v.camisaO, 16, 26, 4, 2, 26, 27);
  // ears and the hoop
  elip(x, piel, 6, 16, 2.5, 3.5);
  elip(x, piel, 26, 16, 2.5, 3.5);
  rect(x, sombra, 5, 16, 1, 3);
  rect(x, v.arete, 4, 19, 1, 3);
  rect(x, v.arete, 5, 21, 2, 1);
  // face
  elip(x, piel, 16, 15, 10, 11);
  // the short beard hugs the jaw and chin like a «U»: no moustache, so nothing crosses the face
  elip(x, barba, 16, 16.5, 10, 12, 21, 28);
  elip(x, piel, 16, 18.5, 7.5, 7.5, 21, 28);
  rect(x, peloO, 12, 27, 8, 1);
  // eyes
  const o = { iris: v.iris, ceja: peloO, cejaAlta: true };
  ojo(x, 14, 16, -1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  ojo(x, 18, 16, 1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  // nose
  rect(x, sombra, 15, 18, 2, 3);
  rect(x, v.nariz, 14, 20, 4, 1);
  // mouth
  boca(x, 16, 23, e, v.labio);
  // blush
  rect(x, v.mejillas, 8, 19, 2, 1);
  rect(x, v.mejillas, 22, 19, 2, 1);
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

interface PaletaMadre { pelo: string; peloO: string; peloL: string; vestido: string; vestidoO: string; flor: string }
const MADRE_NORMAL: PaletaMadre = { pelo: '#8e4d2f', peloO: '#66331f', peloL: '#b8693d', vestido: '#cc5565', vestidoO: '#9b3b4d', flor: '#e6b84a' };
/** The shopkeeper of the peña: grey hair in a bun, a blue dress. */
const TENDERA: PaletaMadre = { pelo: '#a9a7b9', peloO: '#7c7a92', peloL: '#d8d6e6', vestido: '#3f7ac4', vestidoO: '#2c5a98', flor: '#ff8ab0' };

function madre(e: Estado, v: PaletaMadre = MADRE_NORMAL) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = '#f4c39c';
  const sombra = '#dba47e';
  const pelo = v.pelo;
  const peloO = v.peloO;
  const peloL = v.peloL;
  // the bun first (behind the head), a flower in it
  elip(x, pelo, 16, 3, 7, 5);
  elip(x, peloL, 14, 2, 3, 2);
  rect(x, peloO, 10, 5, 12, 1);
  rect(x, v.flor, 20, 1, 3, 3);
  rect(x, '#fff1a8', 21, 2, 1, 1);
  // dress, apron and its straps
  elip(x, v.vestidoO, 16, 36, 15, 11);
  elip(x, v.vestido, 16, 35, 14, 10);
  rect(x, '#f6edd4', 9, 26, 14, 8);
  rect(x, '#d9cba8', 9, 26, 1, 8);
  rect(x, '#d9cba8', 22, 26, 1, 8);
  rect(x, v.vestido, 8, 26, 3, 3);
  rect(x, v.vestido, 21, 26, 3, 3);
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

interface PaletaAldeano { piel?: string; sombra?: string; chaleco: string; chalecoO: string; panuelo: string; panueloO: string; sombrero: string; sombreroO: string; cinta: string; cintaO: string }
const ALDEANO_NORMAL: PaletaAldeano = { chaleco: '#b5472f', chalecoO: '#8a3224', panuelo: '#c64b3a', panueloO: '#8a2a20', sombrero: '#ecc96c', sombreroO: '#bd9540', cinta: '#c64b3a', cintaO: '#8a2a20' };
/** The innkeeper: a dark blue cap, a green waistcoat. */
const POSADERO: PaletaAldeano = { chaleco: '#3f8a5a', chalecoO: '#2a6440', panuelo: '#e6c24a', panueloO: '#b08a2a', sombrero: '#4a5a8a', sombreroO: '#33406a', cinta: '#e6c24a', cintaO: '#b08a2a' };

/** The Teatro's ghosts: the stagehand (pale blue) and the usher (pale violet). */
const TRAMOYISTA: PaletaAldeano = { piel: '#c4d4ec', sombra: '#98aacc', chaleco: '#5e6e9c', chalecoO: '#414e78', panuelo: '#a8b6d8', panueloO: '#7a88b0', sombrero: '#4a5a80', sombreroO: '#303c5c', cinta: '#a8b6d8', cintaO: '#7a88b0' };
const ACOMODADOR: PaletaAldeano = { piel: '#d6cae8', sombra: '#aa9ccc', chaleco: '#a8324e', chalecoO: '#74223a', panuelo: '#e6c24a', panueloO: '#b08a2a', sombrero: '#9a2e4c', sombreroO: '#6e1e36', cinta: '#e6c24a', cintaO: '#b08a2a' };

function aldeano(e: Estado, v: PaletaAldeano = ALDEANO_NORMAL) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = v.piel ?? '#dc9d6c';
  const sombra = v.sombra ?? '#b97b4e';
  const blanco = '#f4f4f6';
  // waistcoat, shirt and a red neckerchief
  elip(x, v.chalecoO, 16, 36, 15, 11);
  elip(x, v.chaleco, 16, 35, 14, 10);
  rect(x, '#f0e6d2', 12, 26, 8, 6);
  rect(x, '#cfc2a8', 12, 26, 1, 6);
  rect(x, v.chalecoO, 11, 26, 1, 6);
  rect(x, v.chalecoO, 20, 26, 1, 6);
  rect(x, v.panuelo, 11, 25, 10, 3);
  rect(x, v.panueloO, 12, 27, 8, 1);
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
  elip(x, v.sombrero, 16, 8, 10, 8, -99, 8);
  rect(x, v.sombreroO, 6, 6, 20, 1);
  rect(x, v.cinta, 6, 5, 20, 3);
  rect(x, v.cintaO, 6, 7, 20, 1);
  elip(x, v.sombrero, 16, 9, 15, 3.5);
  elip(x, v.sombreroO, 16, 10, 15, 3, 10, 12);
  rect(x, '#fff0a8', 12, 2, 4, 1);
  for (let i = 0; i < 7; i++) rect(x, v.sombreroO, 2 + i * 4, 8 + (i % 2), 2, 1);
  return contorno(c);
}

// ---------------------------------------------------------------- Chuchi

function chuchi(e: Estado) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = '#f1c6a9';
  const sombra = '#d59f86';
  const luz = '#fde2cf';
  const barba = '#b0683a';
  const barbaO = '#8a4a28';
  const barbaL = '#cf9560';
  const montura = '#5a3420';
  // the maroon sweater, round neck, no hood
  elip(x, '#541428', 16, 36, 15, 11);
  elip(x, '#7a1f38', 16, 35, 14, 10);
  elip(x, '#8e2a46', 10, 33, 4, 5, 29, 36);
  rect(x, '#541428', 14, 30, 1, 3);
  rect(x, '#541428', 20, 31, 1, 2);
  // neck and the collar's rim
  rect(x, sombra, 12, 22, 8, 5);
  elip(x, '#541428', 16, 27.5, 6, 2.5, 26, 29);
  rect(x, '#6c1a32', 11, 27, 10, 1);
  // ears that stand out
  elip(x, piel, 6, 16, 3, 4.5);
  elip(x, piel, 26, 16, 3, 4.5);
  rect(x, sombra, 5, 15, 1, 3);
  rect(x, sombra, 26, 15, 1, 3);
  // the bald egg: a tall skull, a sliver of shade on the right and a shine on the left
  elip(x, sombra, 16, 14, 10, 12.5);
  elip(x, piel, 15, 14, 9, 12.5);
  elip(x, luz, 11, 6, 4.5, 2.2);
  rect(x, '#fff4ea', 9, 5, 3, 1);
  rect(x, luz, 8, 9, 2, 3);
  // the trimmed ginger beard hugs the jaw like a «U»: no moustache, so nothing crosses the face
  elip(x, barba, 16, 16.5, 10, 12, 21, 28);
  elip(x, piel, 16, 18.5, 7.5, 7.5, 21, 28);
  rect(x, barbaO, 12, 27, 8, 1);
  rect(x, barbaL, 9, 22, 1, 3);
  rect(x, barbaL, 22, 22, 1, 3);
  // eyes (the brows are painted above the glasses)
  const o = { iris: '#5a3a22', ceja: piel };
  ojo(x, 14, 16, -1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  ojo(x, 18, 16, 1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  // square dark-brown glasses with thick tops and a little bridge
  for (const lx of [8, 18]) {
    rect(x, montura, lx, 12, 7, 2);
    rect(x, montura, lx, 14, 1, 5);
    rect(x, montura, lx + 6, 14, 1, 5);
    rect(x, montura, lx + 1, 19, 5, 1);
  }
  rect(x, montura, 15, 14, 3, 1);
  rect(x, montura, 5, 14, 3, 1);
  rect(x, montura, 25, 14, 3, 1);
  rect(x, '#ffffff', 9, 14, 1, 1);
  rect(x, '#ffffff', 19, 14, 1, 1);
  // light ginger brows over the frames
  rect(x, '#c58a58', 9, 10, 5, 1);
  rect(x, '#c58a58', 19, 10, 5, 1);
  // nose
  rect(x, sombra, 15, 17, 2, 3);
  rect(x, '#c4856a', 14, 20, 4, 1);
  // a half smile
  boca(x, 16, 23, e, '#a8584c');
  if (e.animo === 'contento' && !e.boca) rect(x, '#a8584c', 20, 23, 1, 1);
  rect(x, '#e8988a', 9, 20, 2, 1);
  rect(x, '#e8988a', 22, 20, 2, 1);
  return contorno(c);
}

// ---------------------------------------------------------------- Fran

function fran(e: Estado) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = '#e8b090';
  const sombra = '#c98a6c';
  const pelo = '#4a3a46';
  const peloO = '#33262f';
  const peloL = '#6c5864';
  const gris = '#b4aebc';
  const barba = '#2a1f27';
  const barbaO = '#1b1219';
  const barbaL = '#463640';
  // the teal tee
  elip(x, '#1d726d', 16, 36, 15, 11);
  elip(x, '#2c9b92', 16, 35, 14, 10);
  rect(x, '#48b8ad', 5, 29, 3, 2);
  // neck, ears and a broad, round face
  rect(x, sombra, 11, 22, 10, 6);
  elip(x, piel, 5.5, 16, 2.5, 3.5);
  elip(x, piel, 26.5, 16, 2.5, 3.5);
  elip(x, piel, 16, 15, 10.5, 11);
  // the big black beard, all in one piece: sideburns, the moustache that starts under the nose and a mass that
  // falls over the chest; its top edge is a tent around the nose, not a straight line across the face
  elip(x, barba, 6.5, 17, 2, 5.5);
  elip(x, barba, 25.5, 17, 2, 5.5);
  const masa: Array<[number, number]> = [[19, 4], [20, 6.5], [21, 8.5], [22, 9.5], [23, 10], [24, 10.5], [25, 10.5], [26, 10.5], [27, 10.5], [28, 10], [29, 9], [30, 7.5], [31, 5.5]];
  for (const [yy, half] of masa) rect(x, barba, Math.round(16 - half), yy, Math.round(half * 2), 1);
  rect(x, barbaL, 9, 24, 1, 3);
  rect(x, barbaL, 22, 24, 1, 3);
  rect(x, barbaL, 11, 28, 1, 2);
  rect(x, barbaL, 15, 29, 1, 2);
  rect(x, barbaL, 20, 28, 1, 2);
  rect(x, barbaO, 12, 31, 8, 1);
  // eyes under heavy brows
  const o = { iris: '#4a2e22', ceja: barba };
  ojo(x, 14, 16, -1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  ojo(x, 18, 16, 1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  // nose and ruddy cheeks
  rect(x, sombra, 15, 18, 3, 3);
  rect(x, '#b8785a', 14, 20, 5, 1);
  rect(x, '#e28a76', 9, 19, 3, 1);
  rect(x, '#e28a76', 21, 19, 3, 1);
  // the mouth, lost in the beard
  boca(x, 16, 24, e, '#d8786a');
  // short dark hair with a touch of grey: a low cap that leaves the forehead bare
  elip(x, pelo, 16, 8, 10.5, 6.5, 2, 9);
  rect(x, pelo, 5, 8, 3, 5);
  rect(x, pelo, 24, 8, 3, 5);
  rect(x, piel, 11, 9, 2, 1);
  rect(x, piel, 16, 9, 3, 1);
  rect(x, peloO, 5, 12, 1, 1);
  rect(x, peloO, 26, 12, 1, 1);
  rect(x, peloL, 12, 4, 3, 1);
  rect(x, gris, 9, 4, 1, 2);
  rect(x, gris, 21, 5, 1, 2);
  rect(x, gris, 7, 8, 1, 1);
  return contorno(c);
}

// ---------------------------------------------------------------- Guille

/** A hibiscus for the shirt: a red cross with a pale heart. */
function hibisco(x: CanvasRenderingContext2D, cx: number, cy: number) {
  rect(x, '#d8352b', cx - 1, cy, 3, 1);
  rect(x, '#d8352b', cx, cy - 1, 1, 3);
  rect(x, '#f6e6b0', cx, cy, 1, 1);
  rect(x, '#2f8a3c', cx + 2, cy + 1, 2, 1);
}

function guille(e: Estado) {
  const c = lienzo(32, 32);
  const x = ctx(c);
  const piel = '#e3a784';
  const sombra = '#bd7f5e';
  const barbilla = '#cb9270';
  const pelo = '#383040';
  const peloO = '#241c2c';
  const peloL = '#5a4c68';
  // the loud shirt: mustard, hibiscus and leaves, collar open on a V of chest
  elip(x, '#b57d18', 16, 34, 15, 11);
  elip(x, '#e2a728', 16, 33, 14, 10);
  hibisco(x, 6, 28);
  hibisco(x, 27, 27);
  hibisco(x, 9, 31);
  hibisco(x, 23, 30);
  rect(x, '#2f8a3c', 4, 30, 2, 1);
  rect(x, '#2f8a3c', 27, 31, 2, 1);
  // the neck and the V of the collar
  rect(x, sombra, 12, 21, 8, 5);
  [[8, 25], [6, 26], [4, 27], [2, 28]].forEach(([w, yy]) => rect(x, piel, 16 - w / 2, yy, w, 1));
  rect(x, '#b57d18', 10, 25, 2, 2);
  rect(x, '#b57d18', 20, 25, 2, 2);
  rect(x, '#f6e6b0', 10, 27, 1, 1);
  rect(x, '#f6e6b0', 21, 27, 1, 1);
  // ears
  elip(x, piel, 6, 16, 2.5, 3.5);
  elip(x, piel, 26, 16, 2.5, 3.5);
  rect(x, sombra, 5, 15, 1, 3);
  // a long face with a square jaw; the shadow of a beard is a darker «U» along the jaw, as in the others
  elip(x, piel, 16, 13.5, 9.5, 11, 0, 20);
  const mandibula = [9.5, 9.5, 9, 8, 6, 3.5];
  mandibula.forEach((half, i) => rect(x, barbilla, Math.round(16 - half), 20 + i, Math.round(half * 2), 1));
  [7, 7, 6.5, 5].forEach((half, i) => rect(x, piel, Math.round(16 - half), 20 + i, Math.round(half * 2), 1));
  // eyes with thick black brows
  const o = { iris: '#3a2a22', ceja: peloO };
  ojo(x, 14, 15, -1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  ojo(x, 18, 15, 1, e.ojos && e.animo !== 'contento', { ...o, feliz: e.animo === 'contento' && e.ojos });
  // nose and a wide mouth
  rect(x, sombra, 15, 17, 2, 3);
  rect(x, '#b57456', 14, 19, 4, 1);
  boca(x, 16, 22, e, '#9a4038');
  rect(x, '#ea9a7e', 8, 18, 2, 1);
  rect(x, '#ea9a7e', 22, 18, 2, 1);
  // black hair, but not much of it: a low cap, short sides and a fringe swept over the forehead to the left
  elip(x, pelo, 16, 8, 10.5, 6.5, 1, 9);
  rect(x, pelo, 6, 8, 2, 5);
  rect(x, pelo, 24, 8, 2, 5);
  rect(x, pelo, 8, 9, 14, 1);
  rect(x, pelo, 8, 10, 8, 1);
  rect(x, pelo, 8, 11, 2, 1);
  rect(x, peloO, 6, 12, 1, 1);
  rect(x, peloO, 25, 12, 1, 1);
  rect(x, pelo, 12, 1, 3, 1);
  rect(x, pelo, 18, 1, 2, 1);
  rect(x, peloL, 12, 3, 4, 1);
  rect(x, peloL, 20, 5, 2, 1);
  return contorno(c);
}

const FUNCS: Record<Quien, (e: Estado) => HTMLCanvasElement> = {
  pablo: (e) => pablo(e),
  madre: (e) => madre(e),
  aldeano: (e) => aldeano(e),
  chuchi,
  fran,
  guille,
  narrador: (e) => pablo(e, PABLO_SOMBRA),
  tendera: (e) => madre(e, TENDERA),
  posadero: (e) => aldeano(e, POSADERO),
  tramoyista: (e) => aldeano(e, TRAMOYISTA),
  acomodador: (e) => aldeano(e, ACOMODADOR),
};

/** One portrait: eyes open or shut, mouth open or shut, and a smile if `contento`. */
export function retrato(q: Quien, ojos: boolean, boca: boolean, animo: Animo = 'normal'): HTMLCanvasElement {
  return una(`retrato.${q}.${ojos}.${boca}.${animo}`, () => FUNCS[q]({ ojos, boca, animo }));
}
