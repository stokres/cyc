// PokéUsera · Edición Jarra: the 20 useritos, drawn on a 32×32 grid with the toolkit in pixel.ts.
// Each entry has its own palette: [transparent, outline, white, light, main, shade, accent 1, accent 2].
// Parts are painted back to front; `L.cara()` holds the face and other front-only details (the
// back view skips it).
import { Lienzo, Mascara, bez, cur, el, esp, inter, lin, men, poli, rc, rr, un } from './pixel';

export interface Dibujo {
  paleta: string[];
  dibujar: (L: Lienzo) => void;
}

// Colour indices, for readability.
const K = 1,
  W = 2,
  LT = 3,
  MN = 4,
  SH = 5,
  A1 = 6,
  A2 = 7;

function hash(x: number, y: number): number {
  let h = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Scatters specks of colour `c` over the pixels of mask `m` that currently have colour `sobre`. */
function motas(L: Lienzo, m: Mascara, pct: number, c: number, ...sobre: number[]): void {
  m.each((x, y) => {
    if (sobre.includes(L.get(x, y)) && hash(x, y) % 100 < pct) L.px(x, y, c);
  });
}

/** A mask plus its mirror image on the 32-wide canvas. */
const par = (m: Mascara): Mascara => un(m, esp(m));

/** Clears a hole in what is painted and outlines its edge. */
function agujero(L: Lienzo, hueco: Mascara): void {
  hueco.each((x, y) => L.px(x, y, 0));
  hueco.each((x, y) => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!hueco.tiene(x + dx, y + dy) && L.get(x + dx, y + dy) !== 0) L.px(x + dx, y + dy, K);
    }
  });
}

// A big round cartoon eye, 4 wide: white with a pupil that looks to the right (mirror for the other).
const OJO_B = ['.kk.', 'kwwk', 'kwkk', '.kk.'];
// Big black eye with glints, 5×6.
const OJO_N = ['.kkk.', 'kwwkk', 'kwkkk', 'kkkkk', 'kkkwk', '.kkk.'];

const TONOS_ORO: [number, number, number] = [W, A1, A2];

export const USERITOS: Record<string, Dibujo> = {
  // 1 · Draguserín: red and gold festive dragon with whiskers.
  draguserin: {
    paleta: ['', '#251520', '#fff3d0', '#f4685a', '#d42a30', '#8c1830', '#f7c93a', '#b97a18'],
    dibujar: (L) => {
      // Tail with a gold tip, curling up on the right.
      L.parte(cur(bez([21, 26], [31, 28], [29, 17], 14), 4), MN);
      L.parte(un(el(27.5, 14.5, 2.6, 3.4), poli([[26, 12], [30, 8], [31, 14], [28, 17]])), A1, { tonos: TONOS_ORO });
      // Body and gold belly with scale lines.
      L.parte(el(15.5, 22.5, 9, 7), MN);
      L.parte(el(15.5, 24, 5, 5), A1, { borde: false, tonos: TONOS_ORO });
      for (const y of [22, 25, 28]) L.linea(12, y, 19, y, A2);
      // Feet with claws.
      L.parte(un(el(9.5, 29, 3.5, 2.2), el(21.5, 29, 3.5, 2.2)), MN);
      L.pxs(A1, [7, 30], [9, 31], [11, 30], [19, 30], [21, 31], [23, 30]);
      // Fins at the sides of the head, then horns and the head.
      L.parte(un(poli([[3, 8], [8, 7], [8, 15], [2, 13]]), poli([[28, 8], [23, 7], [23, 15], [29, 13]])), SH);
      L.parte(poli([[9, 8], [6, 1], [13, 6]]), A1, { tonos: TONOS_ORO });
      L.parte(poli([[22, 8], [25, 1], [18, 6]]), A1, { tonos: TONOS_ORO });
      L.parte(el(15.5, 12.5, 9.5, 8), MN);
      L.parte(el(15.5, 16, 6, 3.6), A1, { tonos: TONOS_ORO });
      L.cara(() => {
        L.est(9, 8, OJO_B);
        L.est(19, 8, OJO_B, true);
        L.pxs(K, [9, 7], [10, 6], [11, 6], [20, 6], [21, 6], [22, 7]);
        L.pxs(K, [12, 15], [19, 15]);
        L.pxs(K, [11, 17], [12, 18], [13, 18], [14, 18], [15, 18], [16, 18], [17, 18], [18, 18], [19, 17]);
        L.pxs(W, [13, 17], [18, 17]);
        L.pxs(A1, [15, 4], [16, 4], [15, 5], [16, 5]);
      });
      // Whiskers: long gold wisps.
      L.llenar(cur(bez([9, 17], [1, 16], [2, 25], 9), 1), A2);
      L.llenar(cur(bez([22, 17], [30, 16], [29, 25], 9), 1), A2);
    },
  },

  // 2 · Goudazard: fried breaded gouda stick, melted cheese oozing, cocky face.
  goudazard: {
    paleta: ['', '#2e1a0e', '#fff1c8', '#eeb04c', '#d48a2a', '#9c5a18', '#ffe23a', '#e8a416'],
    dibujar: (L) => {
      // Little feet.
      L.parte(un(rc(10, 27, 5, 3), rc(17, 27, 5, 3)), SH);
      const cuerpo = rr(7, 6, 18, 22, 5);
      // Arms with hands on the hips.
      L.parte(cur([[7, 15], [3, 18], [7, 22]], 2), MN);
      L.parte(cur([[24, 15], [28, 18], [24, 22]], 2), MN);
      L.parte(cuerpo, MN);
      motas(L, cuerpo, 16, SH, MN);
      motas(L, cuerpo, 9, LT, MN, SH);
      // Cheese cap, a few drips and a puddle at the foot.
      const queso = un(el(16, 7.5, 9, 2.6), rr(7, 7, 3, 7, 1), rr(22, 7, 3, 9, 1), rr(14, 8, 4, 3, 1));
      L.parte(queso, A1, { tonos: [W, A1, A2], t: 1 });
      L.parte(el(16, 28.5, 11, 2.3), A1, { tonos: [W, A1, A2], t: 1 });
      L.cara(() => {
        // Cocky face: wide eyes with heavy lids sliding to one side, one eyebrow up, smirk.
        L.est(9, 14, ['kkkkkk', 'kwwwkk', 'kwwwkk', '.wwww.']);
        L.est(17, 14, ['kkkkkk', 'kwwwkk', 'kwwwkk', '.wwww.']);
        L.pxs(K, [17, 12], [18, 11], [19, 11], [20, 11], [21, 12]);
        L.pxs(K, [9, 12], [10, 12], [11, 12], [12, 13]);
        L.pxs(K, [11, 21], [12, 22], [13, 22], [14, 22], [15, 22], [16, 22], [17, 22], [18, 21], [19, 20], [20, 19]);
        L.pxs(W, [13, 21], [14, 21]);
      });
    },
  },

  // 3 · Aceitún: little black puppy shaped like an olive, with a green leaf and a red tongue.
  aceitun: {
    paleta: ['', '#150f1c', '#ffffff', '#7a7490', '#3f3950', '#292335', '#5cb83a', '#e8485a'],
    dibujar: (L) => {
      L.parte(cur([[25, 23], [28, 18], [27, 16]], 2), MN);
      // Floppy ears.
      L.parte(un(el(6.5, 14, 3.2, 6), el(25.5, 14, 3.2, 6)), SH, { tonos: [MN, SH, SH] });
      // Olive body.
      L.parte(el(16, 18, 10.5, 11.5), MN);
      // Paws.
      L.parte(un(el(11.5, 29.3, 3.3, 1.9), el(20.5, 29.3, 3.3, 1.9)), LT, { tonos: [LT, LT, MN] });
      // Muzzle.
      L.parte(el(16, 21, 5.5, 3.6), LT, { tonos: [LT, LT, MN], borde: false });
      // Leaf with a stem.
      L.parte(cur([[16, 7], [17, 4]], 1), A1, { tonos: false });
      L.parte(poli([[17, 4], [21, 0], [28, 2], [24, 7]]), A1, { tonos: false });
      L.linea(19, 5, 26, 3, W);
      L.cara(() => {
        // Shiny eyes.
        L.est(7, 11, ['.kkkk.', 'kwwwwk', 'kwkkwk', 'kwkkwk', 'kwwwwk', '.kkkk.']);
        L.est(19, 11, ['.kkkk.', 'kwwwwk', 'kwkkwk', 'kwkkwk', 'kwwwwk', '.kkkk.']);
        L.pxs(W, [9, 14], [21, 14]);
        L.est(14, 18, ['.kkkk.', 'kkkkkk', '.kkkk.']);
        L.pxs(W, [15, 18]);
        L.est(15, 22, ['kkkk', 'kbbk', 'kbbk', '.bb.']);
        L.pxs(K, [16, 21], [17, 21]);
        L.pxs(K, [16, 22], [17, 22]);
      });
      L.pxs(3, [9, 8], [10, 7], [11, 7]);
      L.pxs(W, [9, 9]);
    },
  },

  // 4 · Cierzón: grey-blue whirlwind with a grumpy face and a baturro headscarf (cachirulo).
  cierzon: {
    paleta: ['', '#18202e', '#f2f8ff', '#bcd0e8', '#8099c0', '#586f9a', '#d82a30', '#1c1c24'],
    dibujar: (L) => {
      const bandas: [number, number, number, number][] = [
        [29, 15, 2.4, 1.8],
        [26.5, 16.5, 4.4, 2.6],
        [23.5, 14.5, 7, 3.2],
        [20.5, 17, 9.5, 3.4],
        [17.3, 14.5, 11.5, 3.6],
        [13, 16, 14, 7.2],
      ];
      for (const [cy, cx, rx, ry] of bandas) L.parte(el(cx, cy, rx, ry), MN, { t: 1 });
      // Wind streaks on the body.
      L.pxs(W, [7, 21], [8, 20], [9, 20], [10, 20], [21, 18], [22, 18], [23, 19], [12, 25], [13, 24], [18, 23], [19, 23], [15, 28]);
      // Checked headscarf (red and black), with a knot and two flapping tails.
      const cabeza = bandas[5];
      const cinta = inter(el(cabeza[1], cabeza[0], cabeza[2], cabeza[3]), rc(0, 5, 32, 5));
      const cola1 = poli([[25, 6], [31, 3], [31, 9], [27, 10]]);
      const cola2 = poli([[25, 8], [30, 11], [30, 15], [24, 12]]);
      for (const m of [cola2, cola1, cinta]) {
        L.parte(m, A1, { tonos: false });
        m.each((x, y) => {
          if (((x >> 1) + (y >> 1)) % 2 === 0) L.px(x, y, A2);
        });
      }
      L.parte(el(24.5, 8, 2.6, 2.6), A1, { tonos: false });
      L.pxs(A2, [24, 7], [25, 8]);
      L.cara(() => {
        // Grumpy: brows slanting in, glaring eyes, a deep frown.
        L.pxs(K, [7, 11], [8, 11], [9, 12], [10, 12], [11, 13], [12, 13], [19, 13], [20, 13], [21, 12], [22, 12], [23, 11], [24, 11]);
        L.est(8, 14, ['kkkkk', 'wkkww']);
        L.est(19, 14, ['kkkkk', 'wwkkw']);
        L.pxs(K, [12, 19], [13, 18], [14, 17], [15, 17], [16, 17], [17, 17], [18, 18], [19, 19]);
      });
    },
  },

  // 5 · Turroncho: soft turrón block with almonds, sleepy face.
  turroncho: {
    paleta: ['', '#33231a', '#fffbe8', '#f4e6b8', '#e2c98c', '#b49858', '#b07a3e', '#6c4220'],
    dibujar: (L) => {
      // Feet and arms.
      L.parte(un(rr(8, 26, 6, 4, 1), rr(18, 26, 6, 4, 1)), SH, { tonos: [MN, SH, SH] });
      L.parte(un(el(3.5, 19.5, 2.4, 3.2), el(28.5, 19.5, 2.4, 3.2)), MN, { t: 1 });
      // Top face and front face of the block.
      L.parte(poli([[5, 12], [8, 6], [24, 6], [27, 12]]), LT, { tonos: [W, LT, MN] });
      L.parte(rr(5, 12, 22, 15, 1), MN);
      // Wafer sheets top and bottom.
      L.llenar(rc(6, 12, 20, 2), W);
      L.llenar(rc(6, 25, 20, 2), W);
      L.llenar(rc(6, 14, 20, 1), SH);
      L.llenar(rc(6, 24, 20, 1), SH);
      // Almonds scattered around.
      const almendra = ['.bb.', 'bbbb', 'abba'];
      for (const [x, y] of [[10, 8], [15, 7], [20, 9], [6, 16], [7, 20], [22, 16], [23, 20], [9, 22]]) {
        L.est(x, y, almendra.map((f) => f.replace(/b/g, '6').replace(/a/g, '7')));
      }
      L.cara(() => {
        // Sleepy: closed eyes, a snore bubble and a little z z.
        L.pxs(K, [11, 17], [12, 18], [13, 18], [14, 17], [18, 17], [19, 18], [20, 18], [21, 17]);
        L.est(15, 20, ['kk', 'kk']);
        L.pxs(K, [27, 3], [28, 3], [29, 3], [28, 4], [27, 5], [28, 5], [29, 5]);
        L.pxs(K, [24, 1], [25, 1], [24, 2], [24, 3], [25, 3]);
      });
    },
  },

  // 6 · Tocinón: huge round pink pig, calm.
  tocinon: {
    paleta: ['', '#3a1822', '#fff2f2', '#ffc6d0', '#f4a0b4', '#cc6a84', '#8a4a58', '#e8788c'],
    dibujar: (L) => {
      L.parte(un(poli([[3, 12], [5, 3], [14, 8]]), poli([[28, 12], [26, 3], [17, 8]])), MN);
      L.llenar(un(poli([[6, 9], [7, 5], [11, 8]]), poli([[25, 9], [24, 5], [20, 8]])), A2);
      L.parte(un(rr(6, 27, 6, 4, 2), rr(20, 27, 6, 4, 2)), A1, { tonos: false });
      L.parte(el(16, 17.5, 14.5, 12), MN);
      L.parte(el(16, 20.5, 6.5, 4.6), LT, { tonos: [W, LT, MN], borde: true });
      L.cara(() => {
        L.est(13, 19, ['kk', 'kk', 'kk']);
        L.est(17, 19, ['kk', 'kk', 'kk']);
        // Calm closed eyes and rosy cheeks.
        L.pxs(K, [8, 13], [9, 14], [10, 14], [11, 14], [12, 13], [19, 13], [20, 14], [21, 14], [22, 14], [23, 13]);
        L.est(5, 17, ['bbb', 'bbb']);
        L.est(24, 17, ['bbb', 'bbb']);
      });
    },
  },

  // 7 · Roscochoco: chocolate Christmas ring cake with candied fruit, greasy, sick-green cheeks.
  roscochoco: {
    paleta: ['', '#2a140c', '#fff6e0', '#a8683e', '#6e3c22', '#42200f', '#e0303c', '#6cc040'],
    dibujar: (L) => {
      L.parte(el(16, 19, 14.5, 11.5), MN);
      agujero(L, el(16, 14.2, 5, 2.8));
      // Greasy shine.
      L.pxs(W, [6, 15], [7, 14], [8, 13], [9, 12], [24, 14], [25, 15], [26, 16]);
      L.pxs(W, [5, 18], [5, 19]);
      // Candied fruit and sugar.
      const cereza = ['.kk.', 'kaak', 'kawk', '.kk.'];
      const verde = ['.kk.', 'kbbk', 'kbbk', '.kk.'];
      L.est(8, 9, cereza.map((f) => f.replace('w', '2')));
      L.est(14, 6, verde);
      L.est(21, 7, cereza.map((f) => f.replace('w', '2')));
      L.est(25, 12, verde);
      L.est(2, 17, verde);
      L.pxs(W, [12, 10], [18, 9], [11, 8], [22, 12], [27, 20], [4, 21], [16, 9]);
      L.cara(() => {
        // Sick face: heavy lids, green cheeks, a wobbly mouth.
        L.est(8, 20, ['kkkkkk', 'wwkkww', 'wwkkww', '.wwww.']);
        L.est(18, 20, ['kkkkkk', 'wwkkww', 'wwkkww', '.wwww.']);
        L.est(5, 25, ['bbbb', 'bbbb']);
        L.est(23, 25, ['bbbb', 'bbbb']);
        L.pxs(K, [11, 27], [12, 26], [13, 27], [14, 26], [15, 27], [16, 26], [17, 27], [18, 26], [19, 27], [20, 26]);
      });
    },
  },

  // 8 · Espumarro: beer jar with an overflowing foam head; the edition mascot.
  espumarro: {
    paleta: ['', '#3a2008', '#fffdf2', '#fbd25a', '#f1a81c', '#bb7510', '#d6cfb4', '#f48c8c'],
    dibujar: (L) => {
      // Handle.
      L.parte(men(rr(20, 14, 9, 13, 4), rr(23, 17, 4, 7, 1)), MN);
      // Glass.
      L.parte(rr(5, 11, 18, 18, 2), MN);
      L.parte(rc(5, 26, 18, 3), LT, { tonos: [W, LT, MN], borde: false });
      L.llenar(rc(5, 26, 18, 1), K);
      L.pxs(W, [7, 15], [7, 16], [7, 17], [7, 18], [7, 22]);
      L.pxs(W, [19, 24], [20, 23], [9, 24], [21, 20]);
      // Foam, overflowing and dripping.
      const espuma = un(el(9.5, 9, 5, 4.2), el(15, 6.5, 5.6, 5), el(20.5, 8.5, 5, 4.2), rc(6, 9, 16, 4), rr(5, 11, 4, 8, 2), rr(18, 11, 4, 10, 2), rr(12, 11, 3, 5, 1));
      L.parte(espuma, W, { tonos: [W, W, A1], t: 1 });
      L.pxs(A1, [10, 9], [16, 5], [20, 8], [13, 12]);
      L.cara(() => {
        // Happy ^ ^ eyes, big open smile, pink cheeks.
        L.pxs(K, [8, 19], [9, 18], [10, 18], [11, 19], [16, 19], [17, 18], [18, 18], [19, 19]);
        L.est(11, 22, ['kkkkkk', 'kkkkkk', '.kbbk.', '..kk..']);
        L.est(7, 21, ['bb']);
        L.est(20, 21, ['bb']);
      });
    },
  },

  // 9 · Cajonazo: flamenco cajón with arms and hands.
  cajonazo: {
    paleta: ['', '#2a1608', '#fff0cc', '#e8b068', '#c8803a', '#8a5224', '#f2c498', '#5e3414'],
    dibujar: (L) => {
      // Legs.
      L.parte(un(rc(10, 26, 3, 3), rc(19, 26, 3, 3)), SH);
      L.parte(un(rr(8, 29, 6, 2, 1), rr(18, 29, 6, 2, 1)), A2, { tonos: false });
      // Arms: left clapping up, right resting out.
      L.parte(cur([[9, 15], [4, 12], [4, 8]], 2), SH, { tonos: false });
      L.parte(cur([[23, 17], [27, 19], [28, 22]], 2), SH, { tonos: false });
      L.parte(el(4, 6.5, 2.8, 2.8), A1, { tonos: [W, A1, A1] });
      L.parte(el(28, 23.5, 2.8, 2.8), A1, { tonos: [W, A1, A1] });
      // The box.
      L.parte(rr(8, 5, 16, 21, 1), MN);
      L.llenar(rc(9, 6, 14, 3), LT);
      for (const x of [11, 15, 19]) for (const y of [11, 12, 16, 21, 22]) L.px(x, y, SH);
      L.pxs(A2, [10, 7], [21, 7], [10, 24], [21, 24]);
      L.cara(() => {
        L.est(10, 10, OJO_B);
        L.est(18, 10, OJO_B, true);
        // The sound hole is the mouth.
        L.parte(el(16, 20.2, 4.2, 3.2), K, { tonos: false, borde: false });
        L.pxs(W, [14, 17], [15, 17], [17, 17], [18, 17]);
      });
    },
  },

  // 10 · Lentejasur: dirty brown lentil with shifty eyes, a piece of chorizo and a ghostly wisp.
  lentejasur: {
    paleta: ['', '#2a1a10', '#f6efe8', '#c8965a', '#9a6a38', '#6a4222', '#c8342a', '#cdbfdc'],
    dibujar: (L) => {
      // Ghostly wisp underneath.
      L.parte(poli([[7, 19], [25, 19], [24, 24], [26, 28], [22, 26], [19, 31], [16, 27], [13, 31], [11, 26], [6, 28], [8, 24]]), W, { tonos: [W, W, A2], t: 1 });
      // Chorizo on the right.
      L.parte(poli([[22, 21], [26, 17], [31, 21], [27, 25]]), A1, { tonos: false });
      L.pxs(SH, [25, 20], [27, 22], [28, 20], [24, 22]);
      L.pxs(W, [24, 19]);
      // The lentil: a rim underneath and the top surface.
      L.parte(el(16, 16, 12.5, 9), SH, { tonos: false });
      const lenteja = el(16, 13.5, 12.5, 9.3);
      L.parte(lenteja, MN);
      motas(L, lenteja, 9, SH, MN);
      motas(L, lenteja, 6, LT, MN);
      L.cara(() => {
        // Shifty eyes looking to the side, heavy suspicious lids.
        L.est(7, 8, ['kkkkkkk', 'kwwwwkk', 'kwwwwkk', 'kwwwwkk', '.kkkkk.']);
        L.est(17, 8, ['kkkkkkk', 'kwwwwkk', 'kwwwwkk', 'kwwwwkk', '.kkkkk.']);
        L.pxs(K, [6, 7], [7, 7], [8, 8], [23, 8], [24, 7], [25, 7]);
        L.pxs(W, [11, 10], [21, 10]);
        L.pxs(K, [12, 17], [13, 17], [14, 17], [15, 16], [16, 16], [17, 17]);
      });
    },
  },

  // 11 · Tragaperras: slot machine with a mocking face, a lever and cherry reels.
  tragaperras: {
    paleta: ['', '#1e1018', '#fff8e8', '#f26a5c', '#d62e34', '#8e1a28', '#f6c840', '#b8861c'],
    dibujar: (L) => {
      // Lever.
      L.parte(rc(23, 11, 4, 5), A1, { tonos: [W, A1, A2] });
      L.parte(cur([[27, 12], [29, 5]], 2), A2, { tonos: false });
      L.parte(el(29, 3.3, 2.7, 2.7), MN);
      L.pxs(W, [28, 2]);
      // Feet and body.
      L.parte(un(rc(6, 28, 6, 3), rc(19, 28, 6, 3)), A2, { tonos: false });
      L.parte(rr(4, 3, 21, 26, 2), MN);
      L.llenar(rc(5, 28, 19, 1), SH);
      L.cara(() => {
        // Gold marquee with bulbs and the eyes.
        L.parte(rc(6, 4, 17, 9), A1, { tonos: [W, A1, A2] });
        for (let x = 7; x < 22; x += 3) L.px(x, 4, W);
        L.est(7, 6, ['.kkk.', 'kwwkk', 'kwkkk', '.kkk.']);
        L.est(16, 6, ['.kkk.', 'kwwkk', 'kwkkk', '.kkk.']);
        L.pxs(K, [6, 5], [7, 5], [8, 5], [9, 5], [16, 5], [17, 5], [18, 5], [19, 5], [20, 4]);
        // Reel window with three cherries.
        L.parte(rc(6, 14, 17, 9), A2, { tonos: false });
        L.llenar(rc(7, 15, 15, 7), K);
        for (const x of [8, 13, 18]) {
          L.llenar(rc(x, 16, 4, 5), W);
          L.pxs(K, [x + 2, 16], [x + 3, 16]);
          L.pxs(MN, [x, 18], [x + 1, 18], [x, 19], [x + 1, 19], [x + 2, 19], [x + 3, 19], [x + 1, 20], [x + 2, 20]);
          L.px(x, 18, SH);
        }
        // The tray: a slit and a tongue sticking out.
        L.llenar(rc(8, 24, 13, 2), K);
        L.parte(el(14.5, 27.4, 3.4, 2.5), LT, { tonos: false });
        L.pxs(K, [14, 26], [14, 27], [14, 28]);
      });
      L.dorso(() => {
        L.llenar(rc(8, 7, 13, 12), SH);
        L.llenar(rc(8, 22, 13, 4), SH);
      });
    },
  },

  // 12 · Turito: bland beige-grey blob, bored half-closed eyes, yawning.
  turito: {
    paleta: ['', '#2a2620', '#f6f0e0', '#dcd4bc', '#bdb59a', '#8a8268', '#e8949a', '#6a6050'],
    dibujar: (L) => {
      L.parte(un(el(4, 21.5, 2.6, 4.6), el(28, 21.5, 2.6, 4.6)), MN, { t: 1 });
      L.parte(un(el(10, 28.5, 4, 2), el(22, 28.5, 4, 2)), SH, { tonos: [MN, SH, SH] });
      L.parte(inter(el(16, 18, 12.7, 10.8), rc(0, 0, 32, 29)), MN);
      L.cara(() => {
        // Bored: lids, heavy bags, droopy brows.
        L.est(8, 14, ['kkkkk', 'wwkkw', '.kkk.']);
        L.est(18, 14, ['kkkkk', 'wkkww', '.kkk.']);
        L.pxs(SH, [9, 18], [10, 18], [20, 18], [21, 18]);
        L.pxs(K, [7, 12], [8, 12], [9, 13], [10, 13], [21, 13], [22, 13], [23, 12], [24, 12]);
        // A big yawn.
        L.est(12, 20, ['..kkkk..', '.kkkkkk.', 'kkkaakkk', 'kkaaaakk', '.kkaakk.', '..kkkk..']);
      });
    },
  },

  // 13 · Resacón: grey hangover cloud with dark circles, a bandage and a tiny rain.
  resacon: {
    paleta: ['', '#222233', '#f4f6fa', '#cdd5e0', '#a6b0c0', '#667188', '#5aa4e4', '#f2e2c0'],
    dibujar: (L) => {
      const nube = un(el(8.5, 15, 6, 5.5), el(14, 9.5, 6.5, 6.5), el(22, 11, 7, 6.5), el(25, 17, 5, 4.6), el(16, 18, 12.5, 6.6), el(7, 19.5, 5, 3.5));
      L.parte(nube, MN);
      // Head bandage across the forehead, tied with a knot.
      const venda = inter(nube, poli([[0, 13], [0, 9], [32, 4], [32, 8]]));
      L.parte(venda, A2, { tonos: [W, A2, A2] });
      venda.each((x, y) => {
        if ((x + y) % 5 === 0) L.px(x, y, SH);
      });
      L.parte(un(poli([[2, 12], [7, 10], [6, 15], [2, 16]]), el(4, 16.5, 2, 2.4)), A2, { tonos: false });
      L.cara(() => {
        // Dark circles, bleary eyes, a wobbly mouth.
        L.llenar(el(11.5, 17.6, 3.6, 1.8), SH);
        L.llenar(el(20.5, 17.6, 3.6, 1.8), SH);
        L.est(10, 14, ['kkkk', 'wkkw']);
        L.est(19, 14, ['kkkk', 'wkkw']);
        L.pxs(K, [12, 21], [13, 22], [14, 21], [15, 22], [16, 21], [17, 22], [18, 21], [19, 22]);
      });
      // Rain.
      for (const [x, y] of [[7, 25], [12, 27], [18, 25], [23, 27], [15, 29], [27, 24]]) {
        L.px(x, y, A1);
        L.px(x, y + 1, A1);
        L.px(x, y + 2, A1);
      }
    },
  },

  // 14 · Evoscar: a horse body with two heads, a woman and a man.
  evoscar: {
    paleta: ['', '#2a160e', '#fff0e0', '#dc9460', '#b8683a', '#7e4424', '#f6c8a4', '#f0b848'],
    dibujar: (L) => {
      // Tail and back legs.
      L.parte(cur(bez([25, 21], [32, 22], [30, 29], 10), 3), A2, { tonos: false });
      L.parte(un(rc(6, 25, 4, 5), rc(22, 25, 4, 5)), SH, { tonos: false });
      // Front legs and hooves.
      L.parte(el(16, 21.5, 12, 5.4), MN);
      L.parte(un(rc(10, 24, 4, 6), rc(18, 24, 4, 6)), MN);
      L.parte(un(rc(9, 29, 6, 2), rc(17, 29, 6, 2)), SH, { tonos: false });
      // Body and the two necks.
      L.parte(poli([[3, 12], [12, 13], [15, 22], [6, 21]]), MN);
      L.parte(poli([[28, 12], [19, 13], [16, 22], [25, 21]]), MN);
      // Woman: long golden hair behind her face.
      L.parte(un(el(8, 9, 6.5, 7.6), rc(1, 9, 14, 9)), A2, { tonos: false });
      L.parte(el(8.5, 9, 5, 5.8), A1, { tonos: false });
      L.llenar(inter(el(8.5, 4.8, 5.4, 3), el(8.5, 9, 5, 5.8)), A2);
      L.pxs(A2, [5, 6], [5, 7], [12, 6], [12, 7]);
      // Man: short dark hair with a quiff.
      L.parte(el(23.5, 9, 5, 5.8), A1, { tonos: false });
      L.llenar(un(inter(el(23.5, 5, 5.4, 3.2), el(23.5, 9, 5, 5.8)), rc(23, 2, 5, 2)), SH);
      L.pxs(SH, [19, 6], [19, 7], [28, 6]);
      L.cara(() => {
        L.pxs(K, [6, 8], [6, 9], [11, 8], [11, 9], [21, 8], [21, 9], [26, 8], [26, 9]);
        L.pxs(K, [5, 7], [12, 7], [20, 7], [27, 7]);
        L.pxs(K, [7, 12], [8, 13], [9, 13], [10, 12]);
        L.pxs(K, [22, 12], [23, 13], [24, 13], [25, 12]);
        L.pxs(SH, [8, 11], [24, 11]);
        L.pxs(W, [8, 12], [9, 12], [23, 12], [24, 12]);
        L.pxs(MN, [5, 11], [12, 11], [20, 11], [27, 11]);
      });
    },
  },

  // 15 · Chupitochu: small shot glass of fiery liquor with flames and fierce eyes.
  chupitochu: {
    paleta: ['', '#1c0e14', '#fff8e8', '#ff9a4a', '#e8502a', '#a22420', '#bfe4f0', '#ffd43a'],
    dibujar: (L) => {
      // Flames.
      L.parte(poli([[8, 12], [8, 7], [10, 3], [11, 8], [13, 12]]), LT, { tonos: false });
      L.parte(poli([[12, 12], [12, 6], [16, 0], [17, 6], [20, 12]]), LT, { tonos: false });
      L.parte(poli([[18, 12], [21, 7], [22, 3], [24, 7], [24, 12]]), LT, { tonos: false });
      L.llenar(poli([[14, 12], [14, 8], [16, 4], [17, 8], [18, 12]]), A2);
      L.llenar(poli([[9, 12], [9, 9], [10, 7], [11, 12]]), A2);
      L.llenar(poli([[20, 12], [21, 9], [22, 8], [23, 12]]), A2);
      // The liquor, with the glass base and rim.
      L.parte(poli([[7, 12], [25, 12], [22, 28], [10, 28]]), MN);
      L.parte(rc(10, 26, 12, 3), A1, { tonos: [W, A1, A1] });
      L.parte(rc(6, 11, 20, 2), W, { tonos: [W, W, A1] });
      L.pxs(W, [9, 15], [9, 16], [10, 18], [10, 19]);
      L.cara(() => {
        // Fierce: slanted brows, glowing slit eyes and a toothy grin.
        L.pxs(K, [9, 15], [10, 15], [11, 16], [12, 16], [13, 17], [19, 17], [20, 16], [21, 16], [22, 15], [23, 15]);
        L.est(10, 17, ['kkkk', 'wwkk']);
        L.est(18, 17, ['kkkk', 'kkww']);
        L.est(11, 22, ['kkkkkkkkk', 'kwkwkwkwk', '.kkkkkkk.']);
      });
    },
  },

  // 16 · Caravaner: a cream-and-teal caravan with headlight eyes.
  caravaner: {
    paleta: ['', '#1c2024', '#fffdf0', '#fff4d4', '#eadcb0', '#bfae7e', '#2ba39c', '#17707a'],
    dibujar: (L) => {
      // Tow hitch.
      L.parte(poli([[13, 26], [19, 26], [16, 31]]), SH, { tonos: false });
      // Wheels.
      L.parte(un(rr(1, 20, 4, 9, 1), rr(27, 20, 4, 9, 1)), K, { tonos: false });
      L.pxs(SH, [2, 22], [2, 23], [28, 22], [28, 23]);
      // Body, roof vent, teal stripes.
      L.parte(rr(4, 4, 24, 22, 5), MN);
      L.parte(rc(12, 1, 8, 3), LT, { tonos: [W, LT, MN] });
      L.llenar(rc(5, 4, 22, 2), A1);
      L.llenar(rc(4, 20, 24, 5), A1);
      L.llenar(rc(4, 25, 24, 1), A2);
      L.llenar(rc(4, 19, 24, 1), A2);
      // Windscreen.
      L.parte(rr(7, 7, 18, 8, 2), A2, { tonos: false });
      L.pxs(W, [9, 12], [10, 11], [11, 10], [12, 9], [16, 12], [17, 11], [18, 10]);
      L.cara(() => {
        // Headlight eyes with pupils, and a grille mouth.
        L.est(7, 16, ['.kkkk.', 'kwwwwk', 'kwkkwk', 'kwkkwk', 'kwwwwk', '.kkkk.']);
        L.est(19, 16, ['.kkkk.', 'kwwwwk', 'kwkkwk', 'kwkkwk', 'kwwwwk', '.kkkk.']);
        L.est(13, 21, ['kkkkkk', 'kskskk', 'kkkkkk']);
      });
    },
  },

  // 17 · Camioner: a red truck cab seen from the front, headlight eyes and a grille mouth.
  camioner: {
    paleta: ['', '#220e10', '#fff4e8', '#f0664c', '#d42a2c', '#8a1824', '#c2cad4', '#74b4d8'],
    dibujar: (L) => {
      // Exhaust stacks and mirrors.
      L.parte(un(rc(4, 0, 2, 7), rc(26, 0, 2, 7)), A1, { tonos: [W, A1, A1] });
      L.parte(un(rr(1, 9, 3, 6, 1), rr(28, 9, 3, 6, 1)), K, { tonos: false });
      // Tyres.
      L.parte(un(rr(0, 19, 5, 10, 1), rr(27, 19, 5, 10, 1)), K, { tonos: false });
      L.pxs(SH, [1, 22], [1, 23], [30, 22], [30, 23]);
      // Cab: roof visor, windscreen, front panel.
      L.parte(rr(5, 2, 22, 6, 2), MN);
      L.parte(rr(5, 8, 22, 20, 2), MN);
      L.pxs(A1, [8, 4], [12, 4], [16, 4], [20, 4], [23, 4]);
      L.parte(rr(7, 9, 18, 7, 1), A2, { tonos: false });
      L.pxs(W, [9, 14], [10, 13], [11, 12], [12, 11], [15, 14], [16, 13], [17, 12], [18, 11]);
      L.pxs(K, [15, 15], [16, 15], [17, 15]);
      // Chrome grille mouth and bumper.
      L.parte(rc(4, 27, 24, 3), A1, { tonos: [W, A1, A1] });
      L.cara(() => {
        L.parte(rc(11, 21, 10, 5), A1, { tonos: [W, A1, A1] });
        for (const x of [13, 15, 17, 19]) L.llenar(rc(x, 22, 1, 3), K);
      });
      L.dorso(() => L.llenar(rc(9, 20, 14, 5), SH));
      L.cara(() => {
        // Headlight eyes.
        L.est(6, 16, ['.kkkk.', 'kwwwwk', 'kwkkwk', 'kwkkwk', 'kwwwwk', '.kkkk.']);
        L.est(20, 16, ['.kkkk.', 'kwwwwk', 'kwkkwk', 'kwkkwk', 'kwwwwk', '.kkkk.']);
      });
    },
  },

  // 18 · Criaturitah: tiny moss-green forest creature with big eyes and leaf ears.
  criaturitah: {
    paleta: ['', '#14281a', '#f4fbe0', '#b4dc68', '#7fae42', '#4f7a2a', '#f29090', '#c49a5c'],
    dibujar: (L) => {
      // Leaf ears with a midrib.
      L.parte(par(poli([[8, 12], [3, 2], [13, 7]])), MN);
      L.llenar(par(lin(10, 9, 5, 4)), SH);
      L.parte(un(el(10, 29, 3.4, 1.9), el(22, 29, 3.4, 1.9)), A2, { tonos: false });
      L.parte(el(16, 24, 6.5, 5.2), MN);
      L.llenar(el(16, 25, 3.6, 3.4), LT);
      L.parte(un(el(8.5, 23, 2, 2.6), el(23.5, 23, 2, 2.6)), MN, { t: 1 });
      L.parte(el(16, 14.5, 9.5, 8.3), MN);
      // A little sprout.
      L.parte(cur([[16, 7], [16, 4]], 1), A2, { tonos: false });
      L.parte(poli([[16, 4], [19, 1], [21, 3], [18, 5]]), LT, { tonos: false });
      L.cara(() => {
        L.est(8, 10, OJO_N);
        L.est(19, 10, OJO_N);
        L.pxs(K, [15, 18], [16, 18], [14, 17], [17, 17]);
        L.est(7, 17, ['aaa']);
        L.est(22, 17, ['aaa']);
      });
    },
  },

  // 19 · Ego-Ego: purple ghost with sunglasses and a gold chain, flexing.
  'ego-ego': {
    paleta: ['', '#1f1034', '#f6f0ff', '#b99af0', '#8858d0', '#5a34a0', '#f6c842', '#161018'],
    dibujar: (L) => {
      // Flexing arms: upper arm out, forearm up, a bulging bicep and a fist.
      const brazo = un(cur([[9, 17], [4, 16]], 3), cur([[4, 16], [4, 9]], 3), el(4.5, 13, 3.3, 3.6));
      L.parte(un(brazo, esp(brazo)), MN);
      L.parte(par(el(3.8, 8, 3, 3)), LT, { t: 1 });
      L.pxs(W, [4, 12], [5, 12], [3, 7]);
      L.pxs(W, [27, 12], [26, 12], [28, 7]);
      // Ghost body: dome, trunk and a scalloped hem.
      const cuerpo = un(el(16, 12.5, 10, 9.5), rc(6, 12, 20, 11), el(8.5, 23, 2.8, 3), el(13.5, 24, 2.6, 3), el(18.5, 24, 2.6, 3), el(23.5, 23, 2.8, 3));
      L.parte(cuerpo, MN);
      L.cara(() => {
        // Sunglasses, a smirk with a tooth.
        L.parte(un(rr(8, 10, 7, 4, 1), rr(17, 10, 7, 4, 1), rc(14, 10, 4, 1)), A2, { tonos: false });
        L.pxs(W, [9, 11], [10, 10], [18, 11], [19, 10]);
        L.pxs(K, [12, 18], [13, 19], [14, 19], [15, 19], [16, 19], [17, 19], [18, 18], [19, 17]);
        L.pxs(W, [14, 18], [15, 18]);
        // Gold chain and pendant.
        L.llenar(cur(bez([9, 20], [16, 25], [23, 20], 10), 1), A1);
        L.parte(el(16, 24, 2, 2), A1, { tonos: [W, A1, A1], t: 1 });
      });
      L.pxs(W, [29, 3], [28, 4], [29, 4], [30, 4], [29, 5], [2, 22], [1, 23], [2, 23], [3, 23], [2, 24]);
    },
  },

  // 20 · Kbronero: black synth with heavy-metal hair, horns hand sign and red eyes.
  kbronero: {
    paleta: ['', '#120c16', '#f4f0f8', '#7a7694', '#3a3650', '#221e32', '#f0b890', '#e0303c'],
    dibujar: (L) => {
      // Metal mane behind the panel.
      L.parte(poli([[3, 14], [1, 8], [4, 10], [4, 3], [8, 8], [10, 1], [13, 7], [16, 0], [19, 7], [22, 1], [24, 8], [28, 3], [28, 10], [31, 8], [29, 14]]), SH, { tonos: [MN, SH, SH] });
      L.llenar(lin(8, 8, 7, 4), MN);
      L.llenar(lin(22, 7, 24, 3), MN);
      // Feet.
      L.parte(un(rc(6, 27, 5, 3), rc(21, 27, 5, 3)), SH, { tonos: false });
      // Keyboard body and keys.
      L.parte(rc(3, 13, 26, 8), MN);
      L.cara(() => {
        L.parte(rc(3, 21, 26, 6), W, { tonos: false });
        for (let x = 6; x < 29; x += 3) L.llenar(rc(x, 22, 1, 5), SH);
        for (let x = 5; x < 28; x += 3) if ((x - 5) % 9 !== 6) L.llenar(rc(x, 21, 2, 3), K);
      });
      L.dorso(() => {
        L.parte(rc(3, 21, 26, 6), MN);
        L.pxs(LT, [6, 23], [7, 23], [10, 23], [11, 23], [14, 23], [15, 23]);
        L.pxs(A2, [24, 23], [26, 23]);
      });
      // Horns hand sign on the right.
      L.parte(cur([[27, 14], [27, 10]], 3), A1, { tonos: false });
      L.parte(un(rc(24, 2, 2, 6), rc(29, 2, 2, 6)), A1, { tonos: false });
      L.parte(el(27.5, 9, 3.4, 3), A1, { tonos: [W, A1, A1], t: 1 });
      L.cara(() => {
        L.pxs(A2, [8, 15], [9, 15], [20, 15], [21, 15]);
        L.pxs(K, [10, 14], [11, 14], [12, 15], [13, 15], [18, 15], [19, 15], [20, 14], [21, 14]);
        L.est(11, 16, ['bbb', 'bkb']);
        L.est(18, 16, ['bbb', 'bkb']);
        L.est(13, 19, ['kkkkkk']);
        L.pxs(W, [14, 19], [16, 19]);
      });
      L.pxs(A2, [5, 15], [6, 15], [23, 18], [24, 18], [5, 18], [6, 18]);
    },
  },
};
