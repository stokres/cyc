// PokéUsera · Edición Jarra (arte v2): the four friends as GBA-era trainer cards.
//
//  - `entrenador2(id, frame)`: full body, front view, 56×80, two idle frames (frame 1 = the chest and head
//    sink one pixel, like a breath).
//  - `retrato2(id)`: 40×40 bust for panels and the podium (a crop of the same drawing, so it is the same face).
//  - `icono2(id)`: 16×16 face icon, hand-drawn.
// Traits follow docs/ESTILO.md (P7). Each sprite shares ramps between materials to stay near 16 colours.
import type { EntrenadorId } from '../tipos';
import { Pintor, el, espejo, inter, men, par, poli, rc, rr, trazo, un, type Mascara, type Mat } from './pintor';

export const ANCHO_ENT2 = 56;
export const ALTO_ENT2 = 80;
export const TAM_RETRATO2 = 40;
export const TAM_ICONO2 = 16;

const par2 = (m: Mascara): Mascara => par(m, ANCHO_ENT2);
const esp2 = (m: Mascara): Mascara => espejo(m, ANCHO_ENT2);

// Shared colours.
const INK = '#24192a';
const BLANCO = '#fbf8ff';
const GRIS = '#b8b2cc';

const mat = (r: string[], ol: string = INK, ol2?: string): Mat => ({ r, ol, ol2: ol2 ?? ol });

/** Hash-scattered pixels inside a mask (fur, stubble, fleece). Only on pixels that belong to `sobre`. */
function motas(P: Pintor, m: Mascara, col: string, mod: number, k: number, sobre: Mat): void {
  const id = P.mat(sobre);
  m.each((x, y) => {
    if ((x * 5 + y * 11 + k) % mod === 0 && P.matEn(x, y) === id) P.px(x, y, col);
  });
}

/** Eye: 3×4 dark with a white glint top-left. */
function ojo(P: Pintor, x: number, y: number, h = 4): void {
  P.llenar(rc(x, y, 3, h), INK);
  P.px(x, y, BLANCO);
}

/** Hand: a small rounded fist with a thumb line. */
function mano(P: Pintor, cx: number, cy: number, piel: Mat, lado: 1 | -1): void {
  P.forma(el(cx, cy, 3.3, 3.4), piel, { rad: 2.4 });
  P.px(Math.round(cx + lado * 1), Math.round(cy + 1), piel.ol);
  P.px(Math.round(cx), Math.round(cy + 2), piel.ol);
}

// ---------------------------------------------------------------------------------------------
// Fran · wide build, big dark bushy beard, teal t-shirt, knee-length shorts, a bit of shin and socks.
// ---------------------------------------------------------------------------------------------
const F_PIEL = mat(['#c9795a', '#eaa985', '#fad4af'], '#7a3636');
const F_PELO = mat(['#2a1d27', '#44323d', '#684f5b']);
const F_CAMI = mat(['#18606e', '#2c9a9a', '#69d2bf']);
const F_SHORT = mat(['#6f5d42', '#a38b5f', '#cfb887']);
const F_SOCK = mat([GRIS, BLANCO]);

function fran(P: Pintor): void {
  const u = P.f;
  const Y = (v: number): number => v + u;
  // Legs, from the ground up: shoes, socks, shins, shorts.
  P.forma(par2(rc(18, 66, 6, 7)), F_SOCK, { rad: 2, grad: 0.1 });
  P.forma(par2(rr(14, 72, 13, 6, 3)), F_PELO, { rad: 3 });
  P.llenar(par2(rc(15, 77, 11, 1)), GRIS);
  P.llenar(par2(rc(15, 73, 3, 1)), '#684f5b');
  P.llenar(par2(rc(18, 69, 6, 1)), GRIS);
  P.forma(par2(rc(18, 62, 6, 5)), F_PIEL, { rad: 3, grad: 0.1 });
  P.pxs(F_PELO.r[1], [20, 65], [34, 65], [22, 64], [36, 64]);
  P.forma(par2(rr(14, 50, 14, 14, 3)), F_SHORT, { rad: 6 });
  P.llenar(par2(rc(20, 61, 8, 1)), F_SHORT.r[0]);
  P.pxs(F_SHORT.r[0], [17, 56], [18, 57], [18, 58], [37, 56], [36, 57]);
  P.llenar(par2(rc(27, 58, 1, 6)), INK);
  P.llenar(par2(rc(26, 59, 1, 5)), F_SHORT.r[0]);

  // Wide teal t-shirt over a round belly.
  const torso = un(rr(13, Y(32), 30, 12, 6), el(28, Y(47), 15, 9.4));
  P.forma(torso, F_CAMI, { rad: 8, grad: 0.35 });
  P.llenar(rc(14, Y(54), 28, 1), F_CAMI.r[0]);
  P.pxs(F_CAMI.r[0], [23, Y(46)], [24, Y(47)], [25, Y(47)], [33, Y(44)], [32, Y(45)], [18, Y(50)], [19, Y(51)]);
  P.pxs(F_CAMI.r[2], [20, Y(38)], [21, Y(38)], [20, Y(39)], [36, Y(41)]);
  // Arms: bare forearms and hands, sleeves on top.
  const brazo = un(trazo([[10.5, Y(43)], [10, Y(51)]], 3.5, 3.2));
  P.forma(par2(brazo), F_PIEL, { rad: 3 });
  mano(P, 10, Y(53.5), F_PIEL, 1);
  mano(P, 45, Y(53.5), F_PIEL, -1);
  P.forma(par2(el(11.2, Y(38), 5.4, 6.2)), F_CAMI, { rad: 4, grad: 0.3 });
  P.llenar(par2(rc(7, Y(42), 8, 1)), F_CAMI.r[0]);

  // Head: ears, face, dark hair with grey, the huge beard.
  P.forma(par2(el(14.6, Y(21), 2.4, 3.2)), F_PIEL, { rad: 2 });
  P.forma(el(28, Y(20), 13.5, 12.5), F_PIEL, { rad: 7, grad: 0.2 });
  const pelo = inter(el(28, Y(18), 14.6, 11.8), rc(0, 0, 56, Y(15)));
  P.forma(un(pelo, par2(rc(14, Y(14), 2, 6))), F_PELO, { rad: 5 });
  motas(P, pelo, F_PELO.r[2], 7, 1, F_PELO);
  P.pxs(GRIS, [20, Y(9)], [21, Y(8)], [34, Y(8)], [24, Y(7)], [37, Y(11)], [17, Y(12)]);
  const arribaBarba = poli([[0, 0], [56, 0], [56, Y(19)], [42, Y(21)], [38, Y(23.5)], [33, Y(25)], [28, Y(25.6)], [23, Y(25)], [18, Y(23.5)], [14, Y(21)], [0, Y(19)]]);
  const barba = men(un(inter(el(28, Y(22), 14.5, 13.5), rc(0, Y(17), 56, 30)), el(28, Y(30), 10.5, 4.5)), arribaBarba);
  P.forma(barba, F_PELO, { rad: 7, grad: 0.3 });
  motas(P, barba, F_PELO.r[2], 6, 2, F_PELO);
  motas(P, barba, F_PELO.r[0], 9, 5, F_PELO);
  P.pxs(GRIS, [20, Y(31)], [19, Y(29)], [36, Y(32)], [28, Y(34)], [35, Y(28)], [24, Y(33)]);
  // Face: thick brows, eyes, round nose, a happy open mouth in the beard.
  P.llenar(un(rc(18, Y(14), 5, 2), rc(21, Y(13), 3, 1)), F_PELO.r[0]);
  P.llenar(esp2(un(rc(18, Y(14), 5, 2), rc(21, Y(13), 3, 1))), F_PELO.r[0]);
  ojo(P, 20, Y(17));
  ojo(P, 33, Y(17));
  P.forma(el(28, Y(22.5), 3.4, 2.8), F_PIEL, { rad: 2.4, borde: false, sesgo: 0.25 });
  P.pxs(F_PIEL.r[0], [25, Y(24)], [26, Y(25)], [27, Y(25)], [29, Y(25)], [30, Y(25)], [31, Y(24)]);
  P.pxs(F_PIEL.r[2], [27, Y(21)], [28, Y(21)]);
  P.llenar(inter(el(28, Y(28), 4.6, 3), rc(0, Y(28), 56, 5)), INK);
  P.llenar(rc(25, Y(28), 6, 1), BLANCO);
  P.llenar(rc(26, Y(30), 4, 1), F_PIEL.ol);
  P.px(22, Y(27), F_PELO.r[0]);
  P.px(33, Y(27), F_PELO.r[0]);
  // Cheek tint.
  P.pxs(F_PIEL.r[2], [18, Y(23)], [38, Y(23)]);
}

// ---------------------------------------------------------------------------------------------
// Pablo · messy brown hair up, short beard, hoop earring, open dark sherpa jacket, jeans, white trainers.
// ---------------------------------------------------------------------------------------------
const P_PIEL = mat(['#cc805f', '#ecb18f', '#fbd7b6'], '#7c3a38');
const P_PELO = mat(['#3c2519', '#6d4329', '#9c6a40']);
const P_CHAQ = mat([INK, '#3a3142', '#564c63']);
const P_LANA = mat([GRIS, '#f1e6cc']);
const P_VAQ = mat(['#2d4472', '#4767a6', '#7b9fd6']);
const P_ZAP = mat([GRIS, BLANCO, BLANCO]);
const ORO_HOP = '#f0c040';

function pablo(P: Pintor): void {
  const u = P.f;
  const Y = (v: number): number => v + u;
  // Jeans and white trainers.
  P.forma(par2(rr(17, 50, 10, 24, 3)), P_VAQ, { rad: 5 });
  P.llenar(par2(rc(17, 70, 10, 1)), P_VAQ.r[2]);
  P.pxs(P_VAQ.r[0], [21, 62], [22, 63], [34, 62], [33, 63], [19, 58], [36, 58]);
  P.pxs(P_VAQ.r[2], [20, 56], [21, 57], [35, 56]);
  P.forma(par2(rr(15, 72, 12, 6, 3)), P_ZAP, { rad: 3 });
  P.llenar(par2(rc(16, 77, 10, 1)), GRIS);
  P.llenar(par2(rc(17, 74, 4, 1)), GRIS);
  P.pxs(GRIS, [22, 73], [23, 74], [33, 73], [32, 74]);

  // Jacket body (dark sherpa), tee between the wool edges.
  P.forma(rr(15, Y(30), 26, 23, 4), P_CHAQ, { rad: 7 });
  P.llenar(rc(22, Y(31), 12, 22), GRIS);
  P.llenar(rc(22, Y(31), 12, 2), P_LANA.r[0]);
  P.llenar(rc(23, Y(34), 3, 18), BLANCO);
  P.llenar(rc(24, Y(31), 8, 1), INK);
  for (let y = Y(31); y < Y(53); y++) {
    P.px(20, y, (y & 1) ? P_LANA.r[1] : P_LANA.r[0]);
    P.px(21, y, (y & 1) ? P_LANA.r[0] : P_LANA.r[1]);
    P.px(34, y, (y & 1) ? P_LANA.r[0] : P_LANA.r[1]);
    P.px(35, y, (y & 1) ? P_LANA.r[1] : P_LANA.r[0]);
  }
  P.llenar(par2(rc(19, Y(30), 1, 22)), INK);
  motas(P, rc(15, Y(30), 26, 23), P_CHAQ.r[2], 5, 0, P_CHAQ);
  // Sherpa hem and two slanted pockets.
  P.llenar(rc(16, Y(52), 24, 1), P_CHAQ.r[2]);
  P.llenar(par2(rc(16, Y(51), 4, 1)), P_LANA.r[0]);
  P.pxs(P_CHAQ.r[2], [17, Y(46)], [18, Y(47)], [19, Y(47)], [38, Y(46)], [37, Y(47)], [36, Y(47)]);
  // Sleeves with wool cuffs, hands.
  P.forma(par2(trazo([[14.5, Y(35)], [11.6, Y(47)]], 4.6, 4.2)), P_CHAQ, { rad: 4 });
  motas(P, par2(rc(8, Y(31), 10, 17)), P_CHAQ.r[2], 5, 2, P_CHAQ);
  P.forma(par2(rr(7, Y(47), 9, 4, 1)), P_LANA, { rad: 2, grad: 0.1 });
  mano(P, 11.5, Y(54), P_PIEL, 1);
  mano(P, 44.5, Y(54), P_PIEL, -1);
  // Fleece collar across the shoulders.
  P.forma(un(el(28, Y(30), 13.5, 3.6), par2(el(18, Y(30.5), 4, 3))), P_LANA, { rad: 3.2 });
  P.pxs(GRIS, [18, Y(31)], [22, Y(32)], [34, Y(32)], [38, Y(31)], [26, Y(32)], [30, Y(32)]);

  // Head.
  P.forma(par2(el(15.5, Y(19), 2.3, 3)), P_PIEL, { rad: 2 });
  P.forma(el(28, Y(17.5), 13, 12), P_PIEL, { rad: 7, grad: 0.2 });
  // Short beard along the jaw and a moustache.
  const aro = men(el(28, Y(18), 13.6, 12.6), el(28, Y(16.2), 10.4, 9.6));
  const barba = un(inter(aro, rc(0, Y(20), 56, 20)), el(28, Y(24.6), 5.2, 1.7), el(28, Y(28), 4, 2.4));
  P.forma(barba, P_PELO, { rad: 3.4, sesgo: -0.35, grad: 0.1 });
  motas(P, barba, P_PELO.r[0], 4, 1, P_PELO);
  // Calm smile.
  P.llenar(rc(25, Y(27), 6, 1), P_PIEL.ol);
  P.llenar(rc(24, Y(26), 1, 1), P_PIEL.ol);
  P.llenar(rc(31, Y(26), 1, 1), P_PIEL.ol);
  P.llenar(rc(26, Y(28), 4, 1), P_PIEL.r[1]);
  P.px(28, Y(23), P_PIEL.r[0]);
  P.px(27, Y(22), P_PIEL.r[0]);
  P.px(28, Y(22), P_PIEL.r[0]);
  // Messy hair standing up.
  const casco = inter(el(28, Y(15), 14.6, 11.5), rc(0, 0, 56, Y(13)));
  const pinchos = poli([[14, Y(13)], [13, Y(8)], [16, Y(9)], [16, Y(3)], [20, Y(7)], [22, Y(0)], [26, Y(6)], [30, Y(1)], [32, Y(6)], [37, Y(2)], [37, Y(8)], [41, Y(5)], [41, Y(10)], [43, Y(14)], [42, Y(12)], [14, Y(12)]]);
  const flequillo = poli([[16, Y(12)], [21, Y(13)], [24, Y(15.5)], [26, Y(12)], [31, Y(14)], [33, Y(12)], [40, Y(13)], [40, Y(11)], [16, Y(11)]]);
  const pelo = un(casco, pinchos, flequillo, par2(rc(14, Y(11), 2, 5)));
  P.forma(pelo, P_PELO, { rad: 5, grad: 0.35 });
  motas(P, pelo, P_PELO.r[2], 6, 3, P_PELO);
  P.pxs(P_PELO.r[2], [18, Y(5)], [19, Y(6)], [23, Y(2)], [24, Y(3)], [33, Y(3)], [34, Y(4)]);
  // Hoop earring.
  P.pxs(ORO_HOP, [13, Y(21)], [12, Y(22)], [12, Y(23)], [13, Y(24)], [14, Y(24)]);
  // Calm face.
  P.llenar(esp2(rc(18, Y(14.5), 5, 1)), P_PELO.r[0]);
  P.llenar(rc(18, Y(14.5), 5, 1), P_PELO.r[0]);
  P.llenar(un(rc(18, Y(14), 2, 1), rc(36, Y(14), 2, 1)), P_PELO.r[0]);
  ojo(P, 20, Y(17), 3);
  ojo(P, 33, Y(17), 3);
  P.pxs(P_PIEL.r[2], [18, Y(22)], [38, Y(22)]);
}

// ---------------------------------------------------------------------------------------------
// Chuchi · bald with a shine, square dark-brown glasses, trimmed red beard, maroon sweatshirt; thin and tall.
// ---------------------------------------------------------------------------------------------
const C_PIEL = mat(['#d38b6c', '#f1c3a2', '#fee3c8'], '#80423c');
const C_BARBA = mat(['#7a2c14', '#bc4f26', '#e9814c']);
const C_GAFA = '#4a2a1c';
const C_SUDA = mat(['#5c1428', '#8f2a40', '#c24a60']);
const C_VAQ = mat([INK, '#352d42', '#544b66']);
const C_ZAP = mat([GRIS, BLANCO, BLANCO]);

function chuchi(P: Pintor): void {
  const u = P.f;
  const Y = (v: number): number => v + u;
  // Black jeans, white trainers.
  P.forma(par2(rr(20, 50, 7, 24, 2)), C_VAQ, { rad: 3.5 });
  P.pxs(C_VAQ.r[2], [22, 58], [22, 59], [34, 58], [23, 66], [33, 66]);
  P.forma(par2(rr(17, 72, 10, 6, 3)), C_ZAP, { rad: 3 });
  P.llenar(par2(rc(18, 77, 8, 1)), GRIS);
  P.llenar(par2(rc(18, 74, 3, 1)), GRIS);
  P.pxs(GRIS, [22, 73], [33, 73]);
  // Slim arms and the maroon sweatshirt.
  P.forma(par2(trazo([[17.5, Y(30)], [15.5, Y(47)]], 3.2, 2.8)), C_SUDA, { rad: 3 });
  mano(P, 15.5, Y(50.5), C_PIEL, 1);
  mano(P, 40.5, Y(50.5), C_PIEL, -1);
  P.llenar(par2(rc(13, Y(45), 5, 1)), C_SUDA.r[0]);
  P.forma(rr(19, Y(27), 18, 25, 4), C_SUDA, { rad: 6 });
  P.llenar(rc(20, Y(50), 16, 1), C_SUDA.r[0]);
  P.llenar(rc(20, Y(51), 16, 1), C_SUDA.r[1]);
  P.pxs(C_SUDA.r[0], [26, Y(36)], [27, Y(37)], [28, Y(37)], [31, Y(41)], [30, Y(42)], [24, Y(45)], [23, Y(46)]);
  P.pxs(C_SUDA.r[2], [23, Y(31)], [24, Y(31)], [23, Y(32)], [22, Y(40)], [22, Y(41)]);
  // Crew neck.
  P.forma(el(28, Y(27.5), 6, 2.2), C_SUDA, { rad: 1.4, sesgo: -0.5 });
  P.llenar(rc(24, Y(27), 8, 1), C_SUDA.r[0]);

  // Head: ears, bald dome with a shine.
  P.forma(par2(el(17.2, Y(15.5), 2, 2.8)), C_PIEL, { rad: 1.8 });
  P.forma(un(el(28, Y(14), 11.2, 12.2), rr(19, Y(18), 18, 8, 3)), C_PIEL, { rad: 7, grad: 0.15 });
  P.pxs(BLANCO, [22, Y(4)], [23, Y(3)], [24, Y(3)], [25, Y(3)], [21, Y(5)], [20, Y(6)], [19, Y(8)]);
  P.pxs(C_PIEL.r[2], [26, Y(3)], [26, Y(4)], [22, Y(5)], [21, Y(6)], [20, Y(7)], [19, Y(9)], [19, Y(10)]);
  P.pxs(C_PIEL.r[0], [36, Y(9)], [37, Y(12)], [37, Y(13)]);
  // Trimmed red beard: a band along the jaw and a moustache.
  const aro = men(el(28, Y(14.5), 11.8, 12.8), el(28, Y(12.6), 8.6, 9.8));
  const barba = un(inter(aro, rc(0, Y(17), 56, 20)), el(28, Y(21), 6.2, 1.8), el(28, Y(26), 4.5, 2));
  P.forma(barba, C_BARBA, { rad: 3.4, sesgo: -0.1, grad: 0.1 });
  motas(P, barba, C_BARBA.r[0], 5, 2, C_BARBA);
  motas(P, barba, C_BARBA.r[2], 7, 4, C_BARBA);
  // Half smile in the beard.
  P.llenar(rc(25, Y(23.5), 5, 1), INK);
  P.llenar(rc(30, Y(22.5), 2, 1), INK);
  P.llenar(rc(26, Y(24.5), 3, 1), C_PIEL.ol);
  // Nose.
  P.pxs(C_PIEL.r[0], [28, Y(19)], [27, Y(20)], [28, Y(20)]);
  // Square dark-brown glasses with a lens glint.
  const marco = (x: number) => men(rc(x, Y(11), 8, 8), rc(x + 1, Y(13), 6, 5));
  P.llenar(marco(19), C_GAFA);
  P.llenar(marco(29), C_GAFA);
  P.llenar(rc(27, Y(13), 2, 1), C_GAFA);
  P.llenar(un(rc(17, Y(13), 2, 1), rc(37, Y(13), 2, 1)), C_GAFA);
  P.llenar(un(rc(20, Y(11), 6, 1), rc(30, Y(11), 6, 1)), C_BARBA.r[0]);
  ojo(P, 22, Y(14), 3);
  ojo(P, 32, Y(14), 3);
  P.pxs(BLANCO, [21, Y(17)], [31, Y(17)]);
  // Brows.
  P.llenar(un(rc(19, Y(8), 6, 1), rc(31, Y(8), 6, 1)), C_BARBA.r[0]);
}

// ---------------------------------------------------------------------------------------------
// Guille · the tallest, athletic, dark longish hair, thick brows, stubble, strong jaw, Hawaiian shirt.
// ---------------------------------------------------------------------------------------------
const G_PIEL = mat(['#bd7350', '#e1a27a', '#f7cca4'], '#74352f');
const G_PELO = mat(['#2d1e1f', '#4a3228', '#6d4d3c']);
const G_CAMI = mat(['#a8700e', '#e0a424', '#f8d45a']);
const G_VAQ = mat([INK, '#4767a6', '#6f93cc']);
const G_ZAP = mat(['#4a3228', '#8a5a36', '#8a5a36']);
const HIB = '#d83a3c';
const HOJA = '#2f9444';

function guille(P: Pintor): void {
  const u = P.f;
  const Y = (v: number): number => v + u;
  // Long jeans and brown trainers.
  P.forma(par2(rr(19, 50, 8, 25, 3)), G_VAQ, { rad: 4 });
  P.pxs(G_VAQ.r[2], [21, 58], [21, 59], [22, 66], [34, 58], [34, 66]);
  P.pxs(INK, [23, 62], [24, 63], [32, 62], [31, 63]);
  P.forma(par2(rr(17, 72, 10, 6, 3)), G_ZAP, { rad: 3 });
  P.llenar(par2(rc(18, 77, 8, 1)), INK);
  P.llenar(par2(rc(18, 74, 3, 1)), G_ZAP.r[2]);
  P.pxs(BLANCO, [22, 73], [33, 73]);
  // Athletic arms: bare, a little thicker than Pablo's; the shirt sleeve stops above the biceps.
  for (const lado of [1, -1] as const) {
    const X = (x: number): number => (lado === 1 ? x : 55 - x);
    const T = (m: Mascara): Mascara => (lado === 1 ? m : esp2(m));
    P.forma(T(trazo([[12.8, Y(34)], [11.8, Y(47)]], 3.9, 3.3)), G_PIEL, { modo: 'cil', eje: X(12.4), semi: 3.9 });
    P.px(X(9), Y(43), G_PIEL.r[0]);
    P.pxs(G_PIEL.r[2], [X(11), Y(40)], [X(11), Y(41)]);
    mano(P, X(11.8), Y(50.5), G_PIEL, lado);
  }
  // Hawaiian shirt: a straight torso, mustard with red hibiscus and green leaves, short sleeves on the shoulders.
  const camisa = poli([[17, Y(26)], [39, Y(26)], [41, Y(30)], [40, Y(53)], [16, Y(53)], [15, Y(30)]]);
  P.forma(camisa, G_CAMI, { rad: 7, grad: 0.3 });
  P.llenar(rc(17, Y(52), 22, 1), G_CAMI.r[0]);
  P.forma(par2(el(13.8, Y(32), 4.2, 5.2)), G_CAMI, { rad: 4, grad: 0.25 });
  P.llenar(par2(rc(10, Y(36), 9, 1)), G_CAMI.r[0]);
  // Neck, then an open camp collar: two flat leaves lying on the chest with a small V between them.
  P.forma(rc(24, Y(20), 8, 7), G_PIEL, { rad: 3, borde: false, sesgo: -0.3 });
  P.forma(poli([[23, Y(24)], [33, Y(24)], [28, Y(33.5)]]), G_PIEL, { rad: 3, sesgo: -0.1 });
  P.pxs(G_PIEL.r[0], [27, Y(30)], [28, Y(31)], [27, Y(28)]);
  P.forma(par2(poli([[18.5, Y(26)], [23.4, Y(24.5)], [27, Y(33)], [24.5, Y(35.5)], [20.5, Y(31)]])), G_CAMI, { rad: 3, grad: 0.15 });
  P.pxs(G_CAMI.r[2], [21, Y(27)], [22, Y(27)], [22, Y(28)], [23, Y(29)], [34, Y(26)], [33, Y(27)]);
  // Flowers and leaves.
  const flor = (x: number, y: number) => {
    P.est(x, y, ['.rr..', 'rrrrr', 'rrcrr', '.rrrr', '..rr.'], { r: HIB, c: G_CAMI.r[2] });
    P.px(x + 1, y + 1, G_PIEL.ol);
    P.px(x + 3, y + 3, G_PIEL.ol);
  };
  const hojas = (x: number, y: number, e = false) => {
    P.est(x, y, ['..gg', '.ggg', 'ggg.', 'gd..'], { g: HOJA, d: INK }, e);
  };
  hojas(17, Y(40));
  hojas(34, Y(31), true);
  hojas(35, Y(41), true);
  hojas(25, Y(41));
  hojas(18, Y(47));
  flor(19, Y(36));
  flor(33, Y(36));
  flor(22, Y(44));
  flor(31, Y(45));
  flor(11, Y(30));
  flor(38, Y(30));
  // Head: strong but tapered jaw, ears, stubble.
  P.forma(par2(el(15.5, Y(14), 2.2, 3)), G_PIEL, { rad: 2 });
  const cabeza = un(el(28, Y(12.5), 12.2, 11), poli([[17.5, Y(15)], [38.5, Y(15)], [36.8, Y(20.5)], [33.5, Y(24.5)], [22.5, Y(24.5)], [19.2, Y(20.5)]]));
  P.forma(cabeza, G_PIEL, { rad: 7, grad: 0.2 });
  // Stubble: a shaded jaw line with scattered dark dots.
  const jaw = inter(cabeza, rc(0, Y(17), 56, 12));
  const sombra = men(jaw, el(28, Y(14.2), 11.4, 8.8));
  sombra.each((x, y) => {
    if (P.matEn(x, y) === P.mat(G_PIEL)) P.px(x, y, G_PIEL.r[0]);
  });
  motas(P, sombra, G_PELO.r[1], 3, 1, G_PIEL);
  motas(P, inter(jaw, el(28, Y(21), 6.5, 3.5)), G_PELO.r[1], 4, 2, G_PIEL);
  // Dark longish hair: swept quiff, side locks down to the jaw.
  const casco = inter(el(28, Y(9.5), 13.4, 10.2), rc(0, 0, 56, Y(7)));
  const tupe = un(el(31, Y(3.8), 10.5, 4), el(37, Y(5), 5, 4.5));
  const flequillo = poli([[17, Y(6)], [39, Y(6)], [40, Y(9)], [34, Y(7.5)], [31, Y(9.5)], [27, Y(7.5)], [22, Y(9)], [18, Y(8.5)]]);
  const mechones = par2(rc(15, Y(7), 2, 6));
  const pelo = un(casco, tupe, flequillo, mechones);
  P.forma(pelo, G_PELO, { rad: 4.5, grad: 0.35 });
  motas(P, pelo, G_PELO.r[2], 6, 0, G_PELO);
  P.pxs(G_PELO.r[2], [24, Y(2)], [25, Y(1)], [26, Y(1)], [33, Y(1)], [34, Y(2)], [21, Y(4)], [22, Y(4)], [23, Y(3)], [27, Y(2)], [28, Y(2)], [29, Y(3)], [30, Y(3)], [35, Y(4)], [36, Y(5)]);
  P.pxs(G_PELO.r[0], [27, Y(4)], [28, Y(5)], [29, Y(6)], [24, Y(5)], [25, Y(6)]);
  // Thick brows, eyes and a firm mouth.
  P.llenar(un(rc(18, Y(9), 6, 2), rc(22, Y(8), 2, 1)), INK);
  P.llenar(esp2(un(rc(18, Y(9), 6, 2), rc(22, Y(8), 2, 1))), INK);
  ojo(P, 20, Y(12), 4);
  ojo(P, 33, Y(12), 4);
  P.pxs(G_PIEL.r[0], [28, Y(17)], [27, Y(18)], [28, Y(18)]);
  P.llenar(rc(25, Y(21), 6, 1), G_PIEL.ol);
  P.llenar(un(rc(31, Y(20), 1, 1), rc(24, Y(20), 1, 1)), G_PIEL.ol);
  P.px(28, Y(22), G_PIEL.r[2]);
  P.pxs(G_PIEL.r[2], [18, Y(17)], [38, Y(17)]);
}

// ---------------------------------------------------------------------------------------------
// Baking, cache, public API.
// ---------------------------------------------------------------------------------------------
const DIBUJOS: Record<EntrenadorId, (P: Pintor) => void> = { fran, pablo, chuchi, guille };
/** First row of the 40×40 bust crop (head top minus a bit). */
const RECORTE_Y: Record<EntrenadorId, number> = { fran: 5, pablo: 2, chuchi: 0, guille: 0 };

const cache = new Map<string, HTMLCanvasElement>();
const colores = new Map<string, number>();

/** Full-body front sprite, 56×80, idle frame 0 or 1. */
export function entrenador2(id: EntrenadorId, frame = 0): HTMLCanvasElement {
  const clave = `${id}:${frame}`;
  let c = cache.get(clave);
  if (!c) {
    const P = new Pintor(ANCHO_ENT2, ALTO_ENT2, false, frame);
    DIBUJOS[id](P);
    P.suavizar();
    c = P.hornear();
    cache.set(clave, c);
    colores.set(clave, P.numColores);
  }
  return c;
}

/** Number of palette colours the baked full-body sprite uses. */
export function coloresEntrenador2(id: EntrenadorId, frame = 0): number {
  entrenador2(id, frame);
  return colores.get(`${id}:${frame}`) ?? 0;
}

/** Bust for panels and the podium, 40×40: head and shoulders of the same drawing. */
export function retrato2(id: EntrenadorId): HTMLCanvasElement {
  const clave = `${id}:retrato`;
  let c = cache.get(clave);
  if (!c) {
    c = document.createElement('canvas');
    c.width = TAM_RETRATO2;
    c.height = TAM_RETRATO2;
    const cx = c.getContext('2d')!;
    cx.imageSmoothingEnabled = false;
    cx.drawImage(entrenador2(id, 0), 8, RECORTE_Y[id], 40, 40, 0, 0, 40, 40);
    const fila = cx.getImageData(0, 38, 40, 1).data;
    cx.fillStyle = INK;
    for (let x = 0; x < 40; x++) if (fila[x * 4 + 3]) cx.fillRect(x, 39, 1, 1);
    cache.set(clave, c);
  }
  return c;
}

// 16×16 face icons, hand-pixelled: ink outline, 3-tone skin lit from the top-left, one shirt strip.
const I_PIEL = (p: Mat): Record<string, string> => ({ l: p.r[2], s: p.r[1], d: p.r[0], D: p.ol });
const ICONOS: Record<EntrenadorId, { filas: string[]; ley: Record<string, string> }> = {
  fran: {
    ley: { o: INK, m: F_PELO.r[0], h: '#4a3744', H: '#75596a', ...I_PIEL(F_PIEL), w: BLANCO, g: GRIS, T: F_CAMI.r[2], t: F_CAMI.r[1], u: F_CAMI.r[0] },
    filas: [
      '................',
      '....oooooooo....',
      '..ooHhHhhHhhoo..',
      '.ohHhhHhhhHhhho.',
      '.ohhmmhmmmhmhho.',
      '.ohhsmmssmmshho.',
      '.olhsossssoshdo.',
      '.oshlossssodhso.',
      '.ohmmssddssmmho.',
      '.ommhmmmmhmmmmo.',
      '.ommmmwwwwmmhmo.',
      '.ommhmmddmmmmmo.',
      '..ommmmmmmmmmo..',
      '...ooommmmooo...',
      '..oTTtttttttuo..',
      '.oTTttttttttuuo.',
    ],
  },
  pablo: {
    ley: { o: INK, m: P_PELO.r[0], h: P_PELO.r[1], H: P_PELO.r[2], ...I_PIEL(P_PIEL), w: BLANCO, G: ORO_HOP, c: '#f1e6cc', g: GRIS, j: P_CHAQ.r[1], J: P_CHAQ.r[2] },
    filas: [
      '...o...o....o...',
      '..oHo.oHHo.oHo..',
      '.ohHhoohHhooHho.',
      '.ohHhhhhhhhhhho.',
      '.ohhhmmmmmmhhho.',
      '.ohhsmmssmmshho.',
      '.ohhsossssoshho.',
      '.ohhlossssodhho.',
      'Gohmmssddssmmho.',
      'Gohmmmmmmmmmmho.',
      '.Gohmmmddmmmho..',
      '..ohmmmmmmmmho..',
      '...oommmmmmoo...',
      '..ocgcccccgcco..',
      '.ojJcwwwwwwcjjo.',
      '.ojjjjjwwjjjjjo.',
    ],
  },
  chuchi: {
    ley: { o: INK, m: C_BARBA.r[0], h: C_BARBA.r[1], H: C_BARBA.r[2], ...I_PIEL(C_PIEL), w: BLANCO, b: C_GAFA, R: C_SUDA.r[2], r: C_SUDA.r[1], u: C_SUDA.r[0] },
    filas: [
      '................',
      '....oooooooo....',
      '...olwwlsssso...',
      '..olwlssssssso..',
      '..olssssssssdo..',
      '..osssssssssdo..',
      '.obbbbbbbbbbbbo.',
      '.obwosbbbwosbbo.',
      '.obsosbddbsosbo.',
      '.obbbbbddbbbbbo.',
      '..ohhssddsshho..',
      '..ohhhhmmhhhho..',
      '...ohhhhhhhho...',
      '....ooHhhhoo....',
      '..oRRrrrrrrruo..',
      '.oRRrrrrrrrruuo.',
    ],
  },
  guille: {
    ley: { o: INK, m: G_PELO.r[0], h: G_PELO.r[1], H: G_PELO.r[2], ...I_PIEL(G_PIEL), w: BLANCO, Y: G_CAMI.r[2], y: G_CAMI.r[1], a: G_CAMI.r[0], r: HIB },
    filas: [
      '................',
      '....oooooooo....',
      '..ooHHhhhhhhoo..',
      '.ohHhhhhhhhhhho.',
      '.ohhhmmmmmmhhho.',
      '.ohhmmmssmmmhho.',
      '.ohhsossssoshho.',
      '.ohhlossssodhho.',
      '..ossssddssssdo.',
      '..osdsmmmmsdso..',
      '..osddsDDsddso..',
      '...oddsssdddo...',
      '....ooddddoo....',
      '..oYYyoddoyyyo..',
      '.oYyyyyoddoyyyo.',
      '.oyyryyyooyyyro.',
    ],
  },
};

/** Face icon, 16×16. */
export function icono2(id: EntrenadorId): HTMLCanvasElement {
  const clave = `${id}:icono`;
  let c = cache.get(clave);
  if (!c) {
    const P = new Pintor(16, 16);
    const { filas, ley } = ICONOS[id];
    if (filas.some((f) => f.length !== 16) || filas.length !== 16) console.warn('icono2', id, filas.map((f) => f.length).join());
    P.est(0, 0, filas, ley);
    c = P.hornear();
    cache.set(clave, c);
  }
  return c;
}
