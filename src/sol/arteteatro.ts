// The pixel art of the Teatro's props: seats, marble columns, the ticket booth, the two masks on their
// pedestals, the actors' marks, the gold gate, a puddle of beer and its column of ice, a rock of papier-mâché,
// candlesticks, heaps of dry leaves, scenery flats, the stage door and the little sprites of the powers'
// effects. Like the rest of the world (arte.ts) everything is painted ONCE into cached canvases in day colours,
// put through the night grade and only drawImage()d by the frame loop (docs/ESTILO.md, T5).
import { TINTE_OBJETO } from './arte';
import { anchoTexto, escribir } from './fuente';
import { azar, ctx, elipse, lienzo, noche, pintar, rect, una } from './pixel';

const VEL = { a: '#b3243a', b: '#8a1a2c', c: '#d8485a', d: '#5e0f1e' };
const ORO = { a: '#e0b030', b: '#8a6a10', c: '#fff0a8' };
const MARMOL = { a: '#e8e2ee', b: '#b9b0c8', c: '#8e86a4', d: '#fbf8ff' };
const MAD = { a: '#a8683a', b: '#8a5630', c: '#c9975a', d: '#5a3418', e: '#3a2010' };

// ---------------------------------------------------------------- furniture

/** A row of `n` velvet seats (backs, cushions and arm-rests), n×16 wide, 20 tall. */
export const butacas = (n: number) =>
  una(`tt.butacas.${n}`, () => {
    const c = lienzo(n * 16, 20);
    const x = ctx(c);
    for (let i = 0; i < n; i++) {
      const ox = i * 16;
      // the back, with a rounded top and a lighter side where the lamps hit it
      rect(x, VEL.b, ox + 3, 2, 10, 11);
      rect(x, VEL.a, ox + 2, 2, 11, 10);
      rect(x, VEL.a, ox + 3, 1, 9, 1);
      rect(x, VEL.a, ox + 4, 0, 7, 1);
      rect(x, VEL.c, ox + 4, 2, 2, 7);
      rect(x, VEL.c, ox + 5, 1, 3, 1);
      rect(x, VEL.d, ox + 11, 3, 2, 9);
      rect(x, '#e8c24a', ox + 7, 5, 2, 2);
      rect(x, ORO.c, ox + 7, 5, 1, 1);
      // the gap between back and cushion
      rect(x, '#2a0710', ox + 2, 12, 12, 1);
      // the cushion
      rect(x, VEL.a, ox + 1, 13, 14, 5);
      rect(x, VEL.c, ox + 1, 13, 14, 1);
      rect(x, VEL.b, ox + 1, 17, 14, 1);
      rect(x, VEL.d, ox + 1, 18, 14, 1);
      // wooden arm-rests
      rect(x, MAD.b, ox, 9, 2, 10);
      rect(x, MAD.c, ox, 9, 1, 10);
      rect(x, MAD.d, ox + 14, 9, 2, 10);
      rect(x, MAD.b, ox + 14, 9, 1, 10);
    }
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A marble column with an ionic capital, 16×46. Its foot is the bottom row. */
export const columna = () =>
  una('tt.columna', () => {
    const c = lienzo(16, 46);
    const x = ctx(c);
    // capital
    rect(x, MARMOL.b, 0, 0, 16, 3);
    rect(x, MARMOL.d, 0, 0, 16, 1);
    rect(x, MARMOL.a, 1, 3, 14, 4);
    elipse(x, MARMOL.d, 3, 6, 3, 3);
    elipse(x, MARMOL.d, 13, 6, 3, 3);
    elipse(x, MARMOL.c, 3, 6, 1.5, 1.5);
    elipse(x, MARMOL.c, 13, 6, 1.5, 1.5);
    rect(x, MARMOL.b, 2, 7, 12, 2);
    // shaft with flutes
    rect(x, MARMOL.a, 3, 9, 10, 30);
    for (const px of [4, 7, 10]) rect(x, MARMOL.b, px, 9, 1, 30);
    rect(x, MARMOL.d, 3, 9, 1, 30);
    rect(x, MARMOL.c, 12, 9, 1, 30);
    rect(x, MARMOL.c, 3, 9, 10, 1);
    // base
    rect(x, MARMOL.b, 1, 39, 14, 3);
    rect(x, MARMOL.d, 1, 39, 14, 1);
    rect(x, MARMOL.a, 0, 42, 16, 4);
    rect(x, MARMOL.c, 0, 45, 16, 1);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** The ticket booth, 48×52: wooden front, a lit window with a grille and a marquee with the label. */
export const taquilla = (rotulo: string) =>
  una(`tt.taquilla.${rotulo}`, () => {
    const c = lienzo(48, 52);
    const x = ctx(c);
    // the awning and its marquee
    rect(x, MAD.d, 0, 0, 48, 14);
    rect(x, VEL.a, 1, 1, 46, 10);
    rect(x, VEL.c, 1, 1, 46, 1);
    for (let i = 0; i < 12; i++) rect(x, i % 2 ? '#f0e6d0' : VEL.a, 1 + i * 4, 11, 4, 3);
    rect(x, ORO.b, 5, 2, 38, 9);
    rect(x, '#1a0a14', 6, 3, 36, 7);
    escribir(x, rotulo, 24 - Math.floor(anchoTexto(rotulo) / 2), 1, '#fff0a8');
    // the body
    rect(x, MAD.b, 1, 14, 46, 38);
    rect(x, MAD.c, 1, 14, 46, 1);
    for (let i = 0; i < 11; i++) rect(x, MAD.d, 4 + i * 4, 16, 1, 20);
    rect(x, MAD.d, 1, 36, 46, 1);
    // the window: lit amber with a grille
    rect(x, MAD.d, 8, 19, 32, 18);
    rect(x, '#ffcf6a', 10, 21, 28, 12);
    rect(x, '#fff0b0', 10, 21, 28, 3);
    elipse(x, '#c88a3a', 24, 29, 6, 4);
    rect(x, '#6a4a2a', 22, 25, 4, 5);
    for (const px of [16, 22, 28, 34]) rect(x, '#8a5a1a', px, 21, 1, 12);
    rect(x, MAD.c, 6, 33, 36, 4);
    rect(x, '#e4b97a', 6, 33, 36, 1);
    // a few tickets on the counter
    rect(x, '#f4ecd0', 12, 32, 5, 2);
    rect(x, '#d84a3a', 13, 32, 1, 2);
    rect(x, '#f4ecd0', 30, 32, 5, 2);
    // the lower panels
    for (const px of [4, 20, 36]) {
      rect(x, MAD.a, px, 39, 9, 9);
      rect(x, MAD.d, px, 39, 9, 1);
      rect(x, MAD.d, px, 39, 1, 9);
    }
    rect(x, MAD.d, 0, 51, 48, 1);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A bust of one of the two masks on a marble pedestal, 16×32. */
export const estatua = (tipo: 'comedia' | 'tragedia') =>
  una(`tt.estatua.${tipo}`, () => {
    const c = lienzo(16, 32);
    const x = ctx(c);
    // pedestal
    rect(x, MARMOL.c, 2, 22, 12, 10);
    rect(x, MARMOL.a, 2, 22, 10, 9);
    rect(x, MARMOL.d, 2, 22, 1, 9);
    rect(x, MARMOL.b, 12, 22, 2, 10);
    rect(x, MARMOL.d, 1, 20, 14, 3);
    rect(x, MARMOL.b, 1, 22, 14, 1);
    rect(x, MARMOL.c, 1, 31, 14, 1);
    // the golden plate
    rect(x, ORO.b, 5, 25, 6, 4);
    rect(x, ORO.a, 5, 25, 6, 3);
    rect(x, ORO.c, 6, 26, 2, 1);
    // the bust: neck and shoulders
    rect(x, MARMOL.a, 5, 15, 6, 5);
    rect(x, MARMOL.b, 9, 15, 2, 5);
    rect(x, MARMOL.a, 3, 18, 10, 3);
    // the mask: a pale face with a gold ribbon
    const cara = tipo === 'comedia' ? '#fff0b8' : '#c8d4f0';
    const caraO = tipo === 'comedia' ? '#d8b860' : '#8a9ac4';
    elipse(x, caraO, 8, 9, 6, 7);
    elipse(x, cara, 8, 8.5, 5.5, 6.5);
    rect(x, '#2a1a30', 5, 7, 2, 2);
    rect(x, '#2a1a30', 9, 7, 2, 2);
    if (tipo === 'comedia') {
      // a wide smile
      rect(x, '#8a2a2a', 5, 11, 6, 1);
      rect(x, '#8a2a2a', 4, 10, 1, 1);
      rect(x, '#8a2a2a', 11, 10, 1, 1);
      rect(x, '#fff8e4', 6, 11, 4, 1);
      rect(x, '#d86a6a', 4, 9, 1, 1);
      rect(x, '#d86a6a', 11, 9, 1, 1);
    } else {
      // a sad mouth and a tear
      rect(x, '#2a2a5a', 6, 11, 4, 1);
      rect(x, '#2a2a5a', 5, 12, 1, 1);
      rect(x, '#2a2a5a', 10, 12, 1, 1);
      rect(x, '#6ab4ec', 5, 9, 1, 2);
      rect(x, '#2a2a5a', 4, 5, 3, 1);
      rect(x, '#2a2a5a', 9, 6, 3, 1);
    }
    rect(x, ORO.a, 3, 4, 10, 1);
    rect(x, ORO.c, 4, 3, 3, 1);
    rect(x, ORO.a, 7, 2, 2, 2);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** An actor's mark on the floor: a ring with a star, dull or lit (with someone standing on it), 16×16. */
export const marca = (encendida: boolean) =>
  una(`tt.marca.${encendida}`, () => {
    const c = lienzo(16, 16);
    const x = ctx(c);
    if (encendida) {
      elipse(x, 'rgba(255,226,122,0.35)', 8, 8, 8, 6);
      elipse(x, 'rgba(255,240,170,0.5)', 8, 8, 6, 4.5);
    }
    elipse(x, encendida ? '#ffe27a' : '#4a3a20', 8, 8, 7, 5);
    elipse(x, encendida ? '#7a5a10' : '#8a7a50', 8, 8, 5.5, 3.8);
    elipse(x, encendida ? '#ffe27a' : '#4a3a20', 8, 8, 5, 3.4);
    // the star: a plus with four small diagonals
    const col = encendida ? '#fffbe0' : '#b8a878';
    rect(x, col, 8, 5, 1, 7);
    rect(x, col, 5, 8, 7, 1);
    for (const [px, py] of [[6, 6], [10, 6], [6, 10], [10, 10]]) rect(x, col, px, py, 1, 1);
    return c;
  });

/** The gold gate across the two door tiles, 32×40. */
export const reja = () =>
  una('tt.reja', () => {
    const c = lienzo(32, 40);
    const x = ctx(c);
    rect(x, ORO.b, 0, 4, 32, 36);
    rect(x, '#1a0a18', 2, 6, 28, 33);
    for (let i = 0; i < 8; i++) {
      const px = 3 + i * 3.5;
      rect(x, ORO.a, Math.round(px), 6, 2, 33);
      rect(x, ORO.c, Math.round(px), 6, 1, 33);
      // the spear tip
      rect(x, ORO.c, Math.round(px), 3, 2, 3);
      rect(x, ORO.a, Math.round(px), 2, 1, 1);
    }
    for (const py of [10, 20, 32]) {
      rect(x, ORO.a, 0, py, 32, 3);
      rect(x, ORO.c, 0, py, 32, 1);
      rect(x, ORO.b, 0, py + 2, 32, 1);
    }
    // the lock in the middle: a gold mask
    elipse(x, ORO.b, 16, 22, 5, 6);
    elipse(x, ORO.a, 16, 21.5, 4, 5);
    rect(x, '#2a1a30', 14, 20, 1, 2);
    rect(x, '#2a1a30', 17, 20, 1, 2);
    rect(x, '#2a1a30', 15, 24, 3, 1);
    rect(x, ORO.b, 0, 0, 2, 40);
    rect(x, ORO.b, 30, 0, 2, 40);
    noche(c, TINTE_OBJETO);
    return c;
  });

// ---------------------------------------------------------------- the puzzles' pieces

/** A puddle of beer with foam, 16×16. */
export const charco = () =>
  una('tt.charco', () => {
    const c = lienzo(16, 16);
    const x = ctx(c);
    elipse(x, '#8a5a10', 8, 9, 7.5, 5);
    elipse(x, '#c88a1c', 8, 8.5, 7, 4.5);
    elipse(x, '#f0b838', 8, 8, 5.5, 3.2);
    elipse(x, '#ffd86a', 7, 7.5, 3, 1.8);
    // foam
    for (const [px, py, r] of [[4, 8, 1.4], [6, 10, 1.1], [11, 7, 1.5], [9, 10, 1], [12, 9, 1.2], [8, 6, 1]]) elipse(x, '#fff8e0', px, py, r, r);
    rect(x, '#ffffff', 11, 6, 1, 1);
    rect(x, '#ffffff', 4, 7, 1, 1);
    return c;
  });

/** A column of ice: a hexagonal crystal with a lit top face, 16×30 (its foot is the tile). */
export const hielo = () =>
  una('tt.hielo', () => {
    const c = lienzo(16, 30);
    const x = ctx(c);
    // frost puddle at the foot
    elipse(x, 'rgba(210,244,255,0.75)', 8, 23, 8, 5);
    elipse(x, 'rgba(255,255,255,0.8)', 8, 22.5, 6, 3.5);
    // the shaft
    rect(x, '#5aa4e0', 2, 8, 12, 15);
    rect(x, '#8cccf4', 3, 8, 6, 15);
    rect(x, '#c8eeff', 3, 8, 3, 15);
    rect(x, '#3e84c8', 11, 8, 3, 15);
    elipse(x, '#5aa4e0', 8, 22, 6, 3);
    elipse(x, '#8cccf4', 7, 21.5, 4.5, 2.2);
    // the top face
    elipse(x, '#9adaf8', 8, 8, 6.5, 3.6);
    elipse(x, '#e6f8ff', 8, 7.6, 5.4, 2.8);
    elipse(x, '#ffffff', 6.5, 7, 2.5, 1.2);
    // crystal glints
    rect(x, '#ffffff', 4, 12, 1, 6);
    rect(x, '#ffffff', 6, 14, 1, 3);
    rect(x, '#ffffff', 9, 11, 1, 2);
    rect(x, '#2e6cb0', 8, 10, 1, 12);
    rect(x, '#ffffff', 12, 14, 1, 1);
    // spikes of ice at the foot
    rect(x, '#c8eeff', 0, 20, 2, 3);
    rect(x, '#c8eeff', 14, 19, 2, 4);
    rect(x, '#ffffff', 0, 20, 1, 1);
    return c;
  });

/** The rock of papier-mâché: grey, too light, with a torn corner showing the cardboard, 22×20. */
export const rocaCarton = () =>
  una('tt.rocaCarton', () => {
    const c = lienzo(22, 20);
    const x = ctx(c);
    elipse(x, '#5a5470', 11, 12, 11, 7.5);
    elipse(x, '#8f8aa8', 10.5, 10, 10, 7);
    elipse(x, '#aeaac4', 9, 8, 7, 4.5);
    elipse(x, '#cdc8e0', 7, 6.5, 3.5, 2);
    // flat painted cracks (they are drawn on)
    rect(x, '#5a5470', 12, 7, 1, 4);
    rect(x, '#5a5470', 13, 10, 3, 1);
    rect(x, '#5a5470', 6, 12, 4, 1);
    // the torn corner: brown corrugated cardboard
    rect(x, MAD.c, 15, 12, 6, 6);
    rect(x, MAD.a, 15, 13, 6, 1);
    rect(x, MAD.a, 15, 15, 6, 1);
    rect(x, MAD.a, 15, 17, 6, 1);
    rect(x, '#e4c48a', 15, 12, 6, 1);
    rect(x, '#5a5470', 14, 11, 2, 1);
    // a staple and a sticker
    rect(x, '#d4d0e0', 5, 13, 3, 1);
    rect(x, '#f0e060', 3, 9, 3, 3);
    rect(x, '#5a5470', 4, 10, 1, 1);
    rect(x, '#3e3a50', 3, 17, 15, 2);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A hole in the floor where the planks have rotted, 16×16 (dark, with splinters). */
export const hueco = () =>
  una('tt.hueco', () => {
    const c = lienzo(16, 16);
    const x = ctx(c);
    elipse(x, '#1a0f0a', 8, 8.5, 8, 6.5);
    elipse(x, '#0a0608', 8, 9, 6, 4.5);
    // splinters around it
    for (const [px, py, w] of [[1, 5, 3], [3, 2, 2], [11, 2, 3], [13, 6, 2], [2, 12, 3], [11, 13, 3], [6, 14, 2]]) {
      rect(x, MAD.c, px, py, w, 1);
      rect(x, MAD.d, px, py + 1, w, 1);
    }
    rect(x, '#3a2010', 5, 6, 6, 1);
    return c;
  });

/** The rock set into the hole: a grey slab flush with the floor, 16×16. */
export const parche = () =>
  una('tt.parche', () => {
    const c = lienzo(16, 16);
    const x = ctx(c);
    elipse(x, '#3e3a50', 8, 9, 8, 6.5);
    elipse(x, '#8f8aa8', 8, 8.5, 7.5, 6);
    elipse(x, '#aeaac4', 7, 7.5, 5, 3.5);
    rect(x, '#5a5470', 6, 9, 5, 1);
    rect(x, '#5a5470', 9, 6, 1, 3);
    rect(x, MAD.c, 12, 10, 3, 2);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A tall candlestick with a thick candle (the flame is separate), 16×32. */
export const candelabro = () =>
  una('tt.candelabro', () => {
    const c = lienzo(16, 32);
    const x = ctx(c);
    // foot, stem and cup in gold
    rect(x, ORO.b, 3, 28, 10, 3);
    rect(x, ORO.a, 3, 28, 10, 2);
    rect(x, ORO.a, 5, 26, 6, 2);
    rect(x, ORO.a, 7, 14, 2, 12);
    rect(x, ORO.c, 7, 14, 1, 12);
    elipse(x, ORO.b, 8, 22, 3, 2);
    rect(x, ORO.a, 4, 12, 8, 3);
    rect(x, ORO.c, 4, 12, 8, 1);
    rect(x, ORO.b, 5, 15, 6, 1);
    // the candle with its drips
    rect(x, '#f0e6c8', 6, 5, 4, 8);
    rect(x, '#fffbe8', 6, 5, 1, 8);
    rect(x, '#c8b890', 9, 5, 1, 8);
    rect(x, '#f0e6c8', 5, 9, 1, 4);
    rect(x, '#2a1a10', 7, 4, 1, 2);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A candle flame, 5×8, three frames. */
export const llama = (f: number) =>
  una(`tt.llama.${f % 3}`, () => {
    const c = lienzo(5, 8);
    const x = ctx(c);
    const k = f % 3;
    const filas: string[][] = [
      ['..o..', '.ooo.', '.oyo.', 'oyyyo', 'oywyo', '.oyo.', '..o..'],
      ['...o.', '..oo.', '.ooo.', '.oyyo', 'oyyyo', 'oywyo', '.ooo.'],
      ['..o..', '.oo..', '.ooo.', 'oyyo.', 'oyyyo', 'oywyo', '.ooo.'],
    ];
    pintar(x, filas[k], { o: '#ff9a2a', y: '#ffd84a', w: '#fffbe0' }, 0, 0);
    return c;
  });

/** A soft warm halo (for a lit candle or a lamp) to be drawn on the floor with some alpha, 64×40. */
export const halo = (rgb: string) =>
  una(`tt.halo.${rgb}`, () => {
    const c = lienzo(64, 40);
    const x = ctx(c);
    for (let i = 0; i < 6; i++) elipse(x, `rgba(${rgb},0.07)`, 32, 20, 31 - i * 4.5, 19 - i * 2.8);
    return c;
  });

/** A heap of dry leaves left by an autumn scene, w×h tiles (plus a few pixels of height for the mound). */
export const hojas = (w: number, h: number) =>
  una(`tt.hojas.${w}.${h}`, () => {
    const W = w * 16;
    const H = h * 16 + 6;
    const c = lienzo(W, H);
    const x = ctx(c);
    const r = azar(w * 31 + h * 7 + 5);
    const cols = ['#c8641a', '#e08a24', '#a8421a', '#e8b030', '#8a4a1a', '#d4742a', '#f0c850'];
    // the mound: dark underneath, then layers of coloured leaves
    elipse(x, '#4a2a10', W / 2, H - 6, W / 2, h * 8 + 1);
    elipse(x, '#6a3a14', W / 2, H - 8, W / 2 - 1, h * 8);
    for (let i = 0; i < W * h * 2.2; i++) {
      const px = Math.floor(r() * (W - 4)) + 1;
      const py = Math.floor(r() * (H - 5)) + 1;
      // keep the leaves inside the mound's ellipse
      const nx = (px + 1 - W / 2) / (W / 2);
      const ny = (py + 1 - (H - 8)) / (h * 8 + 1);
      if (nx * nx + ny * ny > 0.95) continue;
      const col = cols[Math.floor(r() * cols.length)];
      rect(x, col, px, py, 3, 2);
      if (r() > 0.5) rect(x, col, px + 1, py - 1, 1, 1);
      rect(x, '#5a2a10', px + 2, py + 1, 1, 1);
    }
    // a few stray leaves in front
    for (let i = 0; i < w * 3; i++) rect(x, cols[Math.floor(r() * cols.length)], Math.floor(r() * (W - 3)), H - 3 - Math.floor(r() * 2), 3, 1);
    noche(c, [0.78, 0.76, 0.92]);
    return c;
  });

/** A leaf in the wind (4 colours), 4×3. */
export const hojaVuela = (i: number) =>
  una(`tt.hojaVuela.${i % 4}`, () => {
    const c = lienzo(4, 3);
    const x = ctx(c);
    const col = ['#e08a24', '#c8641a', '#e8b030', '#a8421a'][i % 4];
    rect(x, col, 0, 1, 3, 1);
    rect(x, col, 1, 0, 2, 1);
    rect(x, '#5a2a10', 3, 2, 1, 1);
    return c;
  });

/** A wisp of smoke from a candle put out, 5×9. */
export const humo = (f: number) =>
  una(`tt.humo.${f % 3}`, () => {
    const c = lienzo(7, 12);
    const x = ctx(c);
    const k = f % 3;
    const col = 'rgba(210,214,230,0.8)';
    const filas = [
      [[3, 10], [3, 9], [4, 8], [4, 7], [3, 6], [3, 5], [4, 4], [4, 3]],
      [[3, 10], [2, 9], [2, 8], [3, 7], [4, 6], [4, 5], [3, 4], [2, 3], [2, 2]],
      [[3, 10], [4, 9], [4, 8], [3, 7], [2, 6], [3, 5], [4, 4], [4, 3], [3, 2], [3, 1]],
    ][k];
    for (const [px, py] of filas) rect(x, col, px, py, 1, 1);
    return c;
  });

/** A four-pointed snowflake of the frost, 7×7, three sizes. */
export const copo = (i: number) =>
  una(`tt.copo.${i % 3}`, () => {
    const c = lienzo(7, 7);
    const x = ctx(c);
    const k = i % 3;
    if (k === 0) {
      rect(x, '#e6f8ff', 3, 0, 1, 7);
      rect(x, '#e6f8ff', 0, 3, 7, 1);
      rect(x, '#9adaf8', 1, 1, 1, 1);
      rect(x, '#9adaf8', 5, 1, 1, 1);
      rect(x, '#9adaf8', 1, 5, 1, 1);
      rect(x, '#9adaf8', 5, 5, 1, 1);
    } else if (k === 1) {
      rect(x, '#ffffff', 3, 1, 1, 5);
      rect(x, '#ffffff', 1, 3, 5, 1);
    } else {
      rect(x, '#bff0ff', 3, 2, 1, 3);
      rect(x, '#bff0ff', 2, 3, 3, 1);
    }
    rect(x, '#ffffff', 3, 3, 1, 1);
    return c;
  });

/** A swirl of wind, 26×14, three frames (translucent lilac and white arcs). */
export const remolino = (f: number) =>
  una(`tt.remolino.${f % 3}`, () => {
    const c = lienzo(26, 14);
    const x = ctx(c);
    const k = f % 3;
    const a = 'rgba(224,200,255,0.85)';
    const b = 'rgba(255,255,255,0.9)';
    const arco = (cx: number, cy: number, rx: number, ry: number, ini: number, fin: number, col: string) => {
      for (let t = ini; t <= fin; t += 0.12) rect(x, col, Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), 1, 1);
    };
    arco(13, 7, 11, 5, 0.3 + k * 2.1, 3.6 + k * 2.1, a);
    arco(13, 7, 8, 3.4, 2.4 + k * 2.1, 5.7 + k * 2.1, b);
    arco(13, 7, 5, 2, 4.4 + k * 2.1, 7.6 + k * 2.1, a);
    return c;
  });

/** A bear's arm closing in for the hug: translucent brown fur and a big paw, 22×26, reaching to the right. */
export const brazoOso = () =>
  una('tt.brazoOso', () => {
    const c = lienzo(22, 26);
    const x = ctx(c);
    const pal = { f: 'rgba(168,104,58,0.88)', g: 'rgba(120,70,36,0.9)', l: 'rgba(214,150,92,0.9)', p: 'rgba(60,34,22,0.92)', w: 'rgba(255,240,208,0.95)' };
    pintar(
      x,
      [
        '.........ffff.........',
        '.......ffllllff.......',
        '......fllllllllf......',
        '.....fllllllllllff....',
        '....fllllllllllllff...',
        '...fllllllllllllfffp..',
        '..fllllllllllllfflfp..',
        '..fllllllllllllllffwp.',
        '.fgllllllllllllllfffp.',
        '.fgllllllllllllllffwp.',
        '.fgfllllllllllllfffp..',
        '.ffgffllllllllfffpp...',
        '..fgfffffffffffpp.....',
        '...ffgggffffggp.......',
        '....fffffffffff.......',
      ].map((f) => f.padEnd(22, '.')),
      pal,
      0,
      4,
    );
    return c;
  });

/** A spark of dust where the rock lands, 5×5. */
export const polvoMota = () =>
  una('tt.polvoMota', () => {
    const c = lienzo(5, 5);
    const x = ctx(c);
    rect(x, 'rgba(214,200,180,0.8)', 1, 1, 3, 3);
    rect(x, 'rgba(236,226,210,0.9)', 2, 0, 1, 5);
    rect(x, 'rgba(236,226,210,0.9)', 0, 2, 5, 1);
    return c;
  });

// ---------------------------------------------------------------- scenery

/** A painted scenery flat leaning on the wall, 32×46: an autumn tree, a castle tower or a moon. */
export const bastidor = (tipo: number) =>
  una(`tt.bastidor.${tipo % 3}`, () => {
    const c = lienzo(32, 46);
    const x = ctx(c);
    rect(x, MAD.d, 1, 0, 30, 46);
    rect(x, MAD.b, 2, 1, 28, 44);
    const k = tipo % 3;
    const cielo = ['#6ab4e8', '#2c3a78', '#18204a'][k];
    rect(x, cielo, 3, 2, 26, 41);
    rect(x, 'rgba(255,255,255,0.18)', 3, 2, 26, 4);
    if (k === 0) {
      // an autumn tree
      rect(x, '#5a3a1c', 14, 22, 4, 21);
      elipse(x, '#c8641a', 16, 16, 10, 9);
      elipse(x, '#e08a24', 14, 14, 7, 6);
      elipse(x, '#e8b030', 12, 12, 3, 2.5);
      rect(x, '#4a8a3c', 3, 38, 26, 5);
    } else if (k === 1) {
      // a castle tower
      rect(x, '#a8a0b8', 9, 12, 14, 31);
      rect(x, '#d0c8e0', 9, 12, 4, 31);
      for (const px of [9, 13, 17, 21]) rect(x, '#a8a0b8', px, 8, 3, 4);
      rect(x, '#2a1a30', 14, 22, 4, 7);
      rect(x, '#2a1a30', 13, 21, 6, 2);
      rect(x, '#f0c850', 15, 16, 2, 3);
      rect(x, '#4a8a3c', 3, 40, 26, 3);
    } else {
      // a big moon over the sea
      elipse(x, '#f0e8b8', 20, 14, 7, 7);
      elipse(x, '#18204a', 23, 12, 6, 6);
      for (const [px, py] of [[6, 8], [10, 18], [24, 24], [14, 6]]) rect(x, '#ffffff', px, py, 1, 1);
      rect(x, '#2c4a8a', 3, 32, 26, 11);
      for (const [px, py] of [[6, 35], [14, 38], [22, 34]]) rect(x, '#6a8ad0', px, py, 5, 1);
    }
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A hanging sandbag on its rope, 12×40 (the rope goes up out of the picture). */
export const saco = () =>
  una('tt.saco', () => {
    const c = lienzo(12, 40);
    const x = ctx(c);
    rect(x, '#8a6a3a', 5, 0, 2, 22);
    rect(x, '#5a4020', 6, 0, 1, 22);
    rect(x, '#6a5028', 4, 20, 4, 3);
    elipse(x, '#8a7048', 6, 31, 5.5, 8);
    elipse(x, '#b8a070', 5.5, 30, 4.5, 7);
    rect(x, '#8a7048', 3, 24, 6, 2);
    rect(x, '#e8d8b0', 3, 28, 1, 5);
    rect(x, '#6a5028', 4, 38, 4, 1);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** The door to the stage, 32×40: two dark leaves with a gold star, shut or open (light spilling out). */
export const puertaEscenario = (abierta: boolean) =>
  una(`tt.puertaEscenario.${abierta}`, () => {
    const c = lienzo(32, 40);
    const x = ctx(c);
    // the arch and the frame
    rect(x, ORO.b, 0, 4, 32, 36);
    elipse(x, ORO.b, 16, 6, 16, 6);
    rect(x, ORO.a, 1, 6, 30, 34);
    elipse(x, ORO.a, 16, 6, 15, 5);
    rect(x, '#1a0a18', 3, 8, 26, 32);
    elipse(x, '#1a0a18', 16, 8, 13, 5);
    if (abierta) {
      rect(x, '#ffe9a0', 4, 9, 24, 31);
      rect(x, '#fff7d0', 8, 9, 16, 31);
      rect(x, '#5a1020', 3, 8, 4, 32);
      rect(x, '#5a1020', 25, 8, 4, 32);
    } else {
      rect(x, '#3a1a2a', 4, 9, 12, 31);
      rect(x, '#2e1422', 16, 9, 12, 31);
      rect(x, '#4e2a3a', 4, 9, 1, 31);
      rect(x, '#4e2a3a', 16, 9, 1, 31);
      rect(x, '#1a0a14', 15, 9, 2, 31);
      // a gold star on each leaf
      for (const cx of [10, 22]) {
        rect(x, ORO.a, cx, 17, 1, 8);
        rect(x, ORO.a, cx - 3, 20, 7, 1);
        rect(x, ORO.a, cx - 2, 18, 5, 1);
        rect(x, ORO.a, cx - 2, 22, 5, 1);
        rect(x, ORO.c, cx, 20, 1, 1);
      }
      // the lock plate with its keypad: a grid of little buttons
      rect(x, '#2a2a3a', 12, 28, 8, 9);
      rect(x, '#5a5a78', 12, 28, 8, 1);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) rect(x, i === 1 && j === 1 ? '#6af0a0' : '#c8c8e0', 13 + i * 2 + (i > 0 ? 0 : 0), 30 + j * 2, 1, 1);
    }
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A crate of props from the cellar, a bit smaller than the turrón's, 16×18. */
export const cajon = () =>
  una('tt.cajon', () => {
    const c = lienzo(16, 18);
    const x = ctx(c);
    rect(x, MAD.d, 0, 2, 16, 16);
    rect(x, MAD.a, 1, 3, 14, 14);
    rect(x, MAD.c, 1, 3, 14, 1);
    for (const py of [7, 12]) rect(x, MAD.d, 1, py, 14, 1);
    rect(x, MAD.d, 7, 3, 2, 14);
    rect(x, '#d4453a', 3, 5, 3, 2);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A rope hanging from the ceiling with a pulley (decoration of the flies), 10×32. */
export const polea = () =>
  una('tt.polea', () => {
    const c = lienzo(10, 32);
    const x = ctx(c);
    rect(x, '#8a6a3a', 4, 0, 2, 18);
    elipse(x, '#4a4458', 5, 20, 4.5, 4.5);
    elipse(x, '#8a849a', 5, 20, 3, 3);
    elipse(x, '#2a2630', 5, 20, 1, 1);
    rect(x, '#8a6a3a', 1, 22, 2, 10);
    rect(x, '#8a6a3a', 7, 22, 2, 8);
    noche(c, TINTE_OBJETO);
    return c;
  });
