// PokéUsera · Edición Jarra: the four friends as trainers (32×40 full body, 8×8 face icons),
// following the traits in docs/ESTILO.md (P7). Palette slots for trainers:
// 0 transparent, 1 outline, 2 white, 3 skin, 4 top, 5 top shade, 6 hair/beard, 7 accent,
// 8 trousers, 9 skin shade, 10 extra, 11 shoes, 12 extra 2.
import type { EntrenadorId } from '../tipos';
import { Lienzo, Mascara, bez, cur, el, esp, inter, lin, men, poli, rc, rr, un } from './pixel';

export interface DibujoEntrenador {
  paleta: string[];
  cuerpo: (L: Lienzo) => void;
  icono: (L: Lienzo) => void;
}

const K = 1,
  W = 2,
  SK = 3,
  TOP = 4,
  TOPS = 5,
  PELO = 6,
  ACC = 7,
  PANT = 8,
  SKS = 9,
  X1 = 10,
  ZAP = 11,
  X2 = 12;

const par = (m: Mascara): Mascara => un(m, esp(m));

/** Two small eyes with a white glint. */
function ojos(L: Lienzo, y: number, izq: number, der: number): void {
  L.est(izq, y, ['wk', 'kk']);
  L.est(der, y, ['wk', 'kk']);
}

/** Eyebrows: thick lines. */
function cejas(L: Lienzo, y: number, izq: number, der: number, ancho = 4, c = K): void {
  L.rect(izq, y, ancho, 1, c);
  L.rect(der, y, ancho, 1, c);
}

export const ENTRENADORES_ARTE: Record<EntrenadorId, DibujoEntrenador> = {
  // Fran: big dark beard, teal t-shirt, wide build, pantaloneta (shorts below the knee).
  fran: {
    paleta: ['', '#241a14', '#ffffff', '#eab48c', '#2f9d9a', '#1f6f78', '#3a2a24', '#b8b8b8', '#4c5a6e', '#c98462', '#d8d0c0', '#5a4a40', '#2a2a30'],
    cuerpo: (L) => {
      // Legs: shorts to below the knee, bare shins, white socks and shoes.
      L.parte(un(rc(8, 28, 7, 7), rc(17, 28, 7, 7)), PANT);
      L.parte(un(rc(10, 35, 3, 2), rc(19, 35, 3, 2)), SK, { tonos: false });
      L.llenar(un(rc(10, 37, 3, 1), rc(19, 37, 3, 1)), W);
      L.parte(un(rr(8, 38, 7, 2, 1), rr(17, 38, 7, 2, 1)), ZAP, { tonos: false });
      // Arms: short sleeves, bare forearms and hands.
      L.parte(un(rc(3, 22, 4, 7), rc(25, 22, 4, 7)), SK, { tonos: false });
      L.parte(un(el(4.8, 30, 2.3, 2), el(27.2, 30, 2.3, 2)), SK, { tonos: false });
      L.parte(un(rr(2, 19, 6, 6, 2), rr(24, 19, 6, 6, 2)), TOP);
      // Wide teal t-shirt.
      L.parte(rr(6, 19, 20, 11, 3), TOP);
      L.llenar(rc(7, 28, 18, 2), TOPS);
      L.pxs(TOPS, [12, 22], [13, 22], [19, 25], [20, 25]);
      // Head, ears, big dark beard.
      L.parte(par(el(7.8, 12.5, 1.6, 2.2)), SK, { tonos: false });
      L.parte(el(16, 12, 8.2, 8), SK, { tonos: false });
      const barba = un(inter(el(16, 15.5, 9.2, 8.2), rc(0, 13, 32, 12)), rc(7, 12, 2, 5), rc(23, 12, 2, 5));
      L.parte(barba, PELO, { tonos: false });
      L.pxs(10, [12, 22], [20, 22]);
      L.pxs(7, [10, 18], [21, 18]);
      // Hair on top with a few grey strands.
      L.parte(inter(el(16, 6.5, 8.6, 4.6), rc(0, 0, 32, 10)), PELO, { tonos: false });
      L.pxs(7, [11, 4], [14, 3], [19, 4], [22, 5]);
      // Face: thick brows, eyes, nose, mouth in the beard.
      cejas(L, 9, 10, 18, 4);
      L.rect(10, 8, 1, 1, K);
      L.rect(21, 8, 1, 1, K);
      ojos(L, 10, 11, 19);
      L.pxs(SKS, [15, 12], [16, 12], [15, 13], [16, 13]);
      L.est(13, 16, ['sssss'].map((f) => f.replace(/s/g, '9')));
      L.pxs(K, [14, 17], [15, 17], [16, 17], [17, 17]);
    },
    icono: (L) => {
      L.est(0, 0, ['..6666..', '.633336.', '.613316.', '.666666.', '.666666.', '..6666..', '..4444..', '.444444.']);
    },
  },

  // Pablo: messy brown hair up, short beard, hoop earring, dark sherpa jacket, jeans, white trainers.
  pablo: {
    paleta: ['', '#241a14', '#ffffff', '#ecb890', '#9aa0aa', '#6a7078', '#7a4a28', '#f0c030', '#3e5c9a', '#c98462', '#c8b48e', '#a8703c', '#3a3a46'],
    cuerpo: (L) => {
      // Jeans and white trainers.
      L.parte(un(rc(10, 31, 5, 7), rc(17, 31, 5, 7)), PANT);
      L.parte(un(rr(8, 37, 8, 3, 1), rr(16, 37, 8, 3, 1)), W, { tonos: [W, W, TOP] });
      // Open dark sherpa jacket: sleeves, body, wool edges, and the tee between.
      L.parte(un(rr(3, 20, 6, 12, 2), rr(23, 20, 6, 12, 2)), X2);
      L.parte(un(el(5.5, 33, 2.4, 2), el(26.5, 33, 2.4, 2)), SK, { tonos: false });
      L.parte(rr(8, 19, 16, 13, 2), X2);
      L.llenar(rc(12, 20, 8, 12), TOP);
      L.pxs(TOPS, [14, 25], [15, 25], [16, 25], [17, 25]);
      L.llenar(un(rc(11, 20, 2, 12), rc(19, 20, 2, 12), rc(3, 30, 6, 2), rc(23, 30, 6, 2)), X1);
      for (let y = 21; y < 32; y += 2) L.pxs(W, [11, y], [20, y + 1]);
      // Head.
      L.parte(par(el(7.8, 14, 1.5, 2)), SK, { tonos: false });
      L.parte(el(16, 13.5, 8, 7.5), SK, { tonos: false });
      // Hoop earring.
      L.pxs(ACC, [6, 16], [5, 17], [5, 18], [6, 19]);
      // Short beard.
      L.parte(inter(el(16, 16.8, 8.2, 6), rc(0, 16, 32, 12)), PELO, { tonos: false });
      L.llenar(rc(13, 18, 6, 1), SK);
      L.pxs(K, [14, 19], [15, 19], [16, 19], [17, 19]);
      L.llenar(inter(el(16, 16.5, 5, 3), rc(0, 15, 32, 3)), SK);
      // Messy hair standing up.
      L.parte(poli([[7, 12], [7, 6], [9, 7], [9, 2], [12, 6], [14, 0], [16, 5], [19, 1], [20, 6], [23, 3], [24, 7], [25, 12], [22, 9], [10, 9]]), PELO, { tonos: [ZAP, PELO, PELO] });
      L.pxs(ZAP, [10, 4], [14, 3], [19, 4], [22, 6]);
      // Calm face.
      cejas(L, 10, 10, 18, 4, PELO);
      ojos(L, 11, 11, 19);
      L.pxs(SKS, [15, 13], [16, 13], [16, 14]);
    },
    icono: (L) => {
      L.est(0, 0, ['.6.66.6.', '.666666.', '.631136.', '.633336.', '.666666.', '..6666..', '.444444.', '.444444.']);
      L.px(0, 5, 7);
    },
  },

  // Chuchi: bald with shine, square dark-brown glasses, red beard, maroon sweatshirt; thin and tall.
  chuchi: {
    paleta: ['', '#241a14', '#ffffff', '#f0c09c', '#8a2a3c', '#5e1a2a', '#c8582a', '#4a2a1c', '#2c2c38', '#cf8e6c', '#e0e0e6', '#eeeeee', '#e8944a'],
    cuerpo: (L) => {
      // Black jeans, white trainers.
      L.parte(un(rc(11, 29, 4, 9), rc(17, 29, 4, 9)), PANT, { tonos: false });
      L.parte(un(rr(9, 37, 7, 3, 1), rr(16, 37, 7, 3, 1)), ZAP, { tonos: [W, ZAP, X1] });
      // Slim arms and the maroon sweatshirt.
      L.parte(un(rc(7, 18, 3, 11), rc(22, 18, 3, 11)), TOP);
      L.parte(un(rc(7, 27, 3, 2), rc(22, 27, 3, 2)), TOPS, { borde: false });
      L.parte(un(el(8.5, 30.5, 1.9, 1.8), el(23.5, 30.5, 1.9, 1.8)), SK, { tonos: false });
      L.parte(rr(10, 16, 12, 14, 2), TOP);
      L.llenar(rc(10, 28, 12, 2), TOPS);
      L.pxs(TOPS, [15, 20], [16, 20], [16, 21]);
      // Neck, head, ears.
      L.parte(par(el(8.8, 10, 1.4, 2.2)), SK, { tonos: false });
      L.parte(el(16, 9.5, 7.2, 8), SK, { tonos: false });
      // Bald head with a shine.
      L.pxs(W, [11, 4], [12, 3], [13, 3], [11, 5], [10, 6]);
      L.pxs(SKS, [21, 5], [22, 7], [23, 9]);
      // Square dark-brown glasses.
      L.llenar(un(rc(9, 8, 6, 5), rc(17, 8, 6, 5), rc(15, 9, 2, 1), rc(7, 9, 2, 1), rc(23, 9, 2, 1)), ACC);
      L.llenar(un(rc(10, 9, 4, 3), rc(18, 9, 4, 3)), SK);
      L.pxs(K, [11, 10], [12, 10], [11, 11], [12, 11], [19, 10], [20, 10], [19, 11], [20, 11]);
      L.pxs(W, [10, 9], [18, 9]);
      // Trimmed red beard with a half smile.
      L.parte(inter(el(16, 13, 7.4, 6.2), rc(0, 13, 32, 12)), PELO, { tonos: false });
      L.llenar(rc(12, 14, 8, 2), SK);
      L.pxs(K, [13, 15], [14, 15], [15, 15], [16, 15], [17, 16], [18, 15]);
      L.pxs(12, [10, 14], [22, 14], [16, 18], [13, 17]);
      L.pxs(SKS, [15, 12], [16, 12]);
    },
    icono: (L) => {
      L.est(0, 0, ['..3333..', '.323333.', '.777777.', '.377377.', '.666666.', '..6666..', '..4444..', '.444444.']);
    },
  },

  // Guille: the tallest, dark longish hair, stubble, mustard Hawaiian shirt with red hibiscus.
  guille: {
    paleta: ['', '#241a14', '#ffffff', '#e6b08a', '#e2ac2c', '#b4801a', '#2c1e1a', '#d82a3c', '#4a6ca4', '#bd8664', '#3c8c4c', '#7a4a2a', '#3a2a24'],
    cuerpo: (L) => {
      // Long jeans and brown shoes.
      L.parte(un(rc(10, 28, 5, 10), rc(17, 28, 5, 10)), PANT);
      L.parte(un(rr(8, 37, 8, 3, 1), rr(16, 37, 8, 3, 1)), ZAP, { tonos: [ZAP, ZAP, X2] });
      // Athletic arms.
      L.parte(un(rc(3, 17, 4, 11), rc(25, 17, 4, 11)), SK, { tonos: false });
      L.parte(un(el(5, 29.5, 2.2, 2), el(27, 29.5, 2.2, 2)), SK, { tonos: false });
      L.parte(un(rr(2, 14, 7, 7, 2), rr(23, 14, 7, 7, 2)), TOP);
      // Hawaiian shirt: mustard with red flowers and green leaves, open at the collar.
      L.parte(poli([[7, 14], [25, 14], [23, 28], [9, 28]]), TOP);
      L.llenar(poli([[13, 14], [19, 14], [16, 20]]), SK);
      L.llenar(un(rc(9, 26, 14, 2)), TOPS);
      for (const [x, y] of [[9, 17], [20, 18], [12, 23], [18, 24], [22, 22], [8, 24]]) {
        L.est(x, y, ['.aa.', 'aaaa', '.aa.'].map((f) => f.replace(/a/g, '7')));
        L.pxs(10, [x + 3, y + 2], [x + 4, y + 1]);
        L.pxs(TOP, [x + 1, y + 1]);
      }
      // Neck and head: jaw, ears, stubble.
      L.parte(par(el(8.8, 7.5, 1.4, 2)), SK, { tonos: false });
      L.parte(el(16, 7.6, 7.2, 7), SK, { tonos: false });
      L.parte(el(16, 11.5, 6.4, 3.2), SK, { tonos: false, borde: false });
      L.llenar(inter(el(16, 10.6, 7, 5.4), rc(0, 10, 32, 8)), SKS);
      L.llenar(rc(12, 11, 8, 2), SK);
      L.pxs(SK, [10, 10], [21, 10]);
      // Dark longish hair.
      L.parte(un(inter(el(16, 4.8, 8.4, 5.6), rc(0, 0, 32, 7)), rc(7, 4, 2, 9), rc(23, 4, 2, 9), poli([[9, 4], [13, 6], [11, 8]]), poli([[23, 4], [19, 6], [21, 8]])), PELO, { tonos: [12, PELO, PELO] });
      L.pxs(12, [11, 2], [15, 1], [19, 2], [8, 8], [24, 8]);
      // Thick brows, eyes, a firm mouth.
      cejas(L, 6, 9, 18, 5, PELO);
      L.rect(9, 5, 1, 1, PELO);
      L.rect(22, 5, 1, 1, PELO);
      ojos(L, 7, 11, 19);
      L.pxs(SKS, [15, 9], [16, 9], [16, 10]);
      L.pxs(K, [14, 12], [15, 12], [16, 12], [17, 12]);
    },
    icono: (L) => {
      L.est(0, 0, ['.666666.', '66666666', '.631136.', '.333333.', '..3333..', '.444444.', '4474744.', '.444444.']);
    },
  },
};

// Silence unused-import warnings for helpers kept for future trainers.
void [bez, cur, lin, men, W];
