// PokéUsera · Edición Jarra (arte v2): batch d of the 64×64 useritos (same conventions as useritos2.ts).
// Cubatillo, P, JesúsPelo, Pantaloneto and Aceituna.
import type { Dibujo2 } from './useritos2';
import { Pintor, Mascara, bez3, cur, el, espejo, inter, men, mover, par, poli, rc, rr, trazo, un, type Mat } from './pintor';

// ---------------------------------------------------------------------------------------------
// Cubatillo · a fizzy rum-and-coke in a tall glass: ice cubes, a red straw, a lemon slice on the rim, a cheeky face
// in the cola, bubbles rising (the fizz).
// ---------------------------------------------------------------------------------------------
const TINTA_V = '#2e1010';
const VIDRIO: Mat = { r: ['#6f9ec4', '#b9e0f0', '#f4ffff'], ol: TINTA_V, ol2: '#6f9ec4' };
const COLA: Mat = { r: [TINTA_V, '#5a2210', '#8c3a16', '#d4782a'], ol: TINTA_V };
const LIMON: Mat = { r: ['#e0a418', '#ffd83a', '#fff3a0'], ol: TINTA_V, ol2: '#e0a418' };
const PAJITA: Mat = { r: ['#9a2424', '#e0483c', '#f4ffff'], ol: TINTA_V, ol2: '#9a2424' };
const BLANCO_V = '#f4ffff';
const LENGUA_V = '#f06a8a';

function cubatillo(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const sy = f ? 1 : 0; // the cola surface and the ice bob
  const cima = 12;
  const bote = f ? 1 : 0;

  // Glass: a tall tumbler, slightly tapered, with a thick base and an elliptical rim.
  const vaso = un(poli([[18, cima], [46, cima], [43, 58], [21, 58]]), rr(21, 54, 22, 6, 2.6), el(32, cima, 14.4, 3.4));
  P.forma(vaso, VIDRIO, { modo: 'cil', eje: 32, semi: 14, rad: 3.2 });

  // The cola, with a thick glass wall at the sides and base.
  const cola = un(poli([[21.2, cima + 5], [42.8, cima + 5], [40.4, 53], [23.6, 53]]), el(32, 53, 8.8, 2.4));
  P.forma(cola, COLA, { modo: 'cil', eje: 32, semi: 12, borde: false, rim: false, grad: 0.55 });
  // The surface of the cola: a lighter ellipse inside the rim, a bright foam ring.
  P.llenar(el(32, cima + 5 + sy, 11, 2.7), COLA.r[3]);
  P.llenar(inter(el(30.5, cima + 4.6 + sy, 7.6, 1.6), rc(0, 0, 64, cima + 7 + sy)), LIMON.r[2]);

  // Straw: it rises out of the cola near the left wall and bends over at the top.
  const paja = un(trazo([[26.5, cima + 6], [25.5, cima - 2], [24.5, 5 - bote]], 1.5, 1.5), trazo([[24.5, 5 - bote], [26, 2 - bote], [32, 2 - bote]], 1.5, 1.5));
  P.forma(paja, PAJITA, { modo: 'cil', rad: 1.5, semi: 1.6 });
  paja.each((x, y) => {
    if ((x + y) % 5 < 2) P.px(x, y, PAJITA.r[2]);
  });
  // Rim: the front edge of the glass over the liquid and the straw.
  for (let x = 18; x <= 46; x++) {
    const u = (x + 0.5 - 32) / 14.4;
    const y = Math.round(cima + 3.4 * Math.sqrt(Math.max(0, 1 - u * u)));
    P.px(x, y, x < 27 ? VIDRIO.r[2] : x < 38 ? VIDRIO.r[1] : VIDRIO.r[0]);
  }
  P.llenar(rc(18, cima + 5, 1, 34), VIDRIO.r[2]);
  P.llenar(rc(18, cima + 41, 1, 3), VIDRIO.r[1]);
  P.llenar(rc(45, cima + 10, 1, 16), VIDRIO.r[1]);
  P.llenar(rc(24, 57, 7, 1), VIDRIO.r[2]);
  P.llenar(rc(33, 58, 6, 1), VIDRIO.r[0]);

  // Ice cubes: one inside the cola, two sticking out above the rim.
  const cubo = (x: number, y: number, w: number, h: number) => {
    P.forma(rr(x, y, w, h, 1.6), VIDRIO, { rad: 3, grad: 0.5 });
    P.px(x + 1, y + 1, BLANCO_V);
    P.px(x + 2, y + 1, BLANCO_V);
    P.px(x + 1, y + 2, BLANCO_V);
  };
  cubo(23, cima + 6 + sy, 7, 6);
  cubo(30, 5 - sy, 8, 8);
  cubo(37, 8 + sy, 7, 7);

  // Fizz bubbles in the cola.
  const burbujas: [number, number][] = [[39, 49], [24, 47], [38, 29], [28, 52]];
  burbujas.forEach(([x, y], i) => {
    const yy = y - (f ? 1 + (i % 2) : 0);
    P.px(x, yy, COLA.r[3]);
    P.px(x + 1, yy, COLA.r[2]);
    P.px(x, yy + 1, COLA.r[2]);
  });

  if (!E) {
    // Face on the cola: big white eyes looking sideways, one brow up, a smirk with the tongue out.
    for (const cx of [26.4, 37.8]) {
      if (f && cx > 30) {
        // Frame 2: the right eye winks.
        P.llenar(cur([[cx - 2.4, 32], [cx, 30], [cx + 2.6, 32]], 1), COLA.r[3]);
        continue;
      }
      const ojo = el(cx, 31, 3.6, 4.4);
      P.llenar(ojo, BLANCO_V);
      P.aro(ojo, TINTA_V);
      P.llenar(el(cx + 0.8, 31.8, 2, 2.5), TINTA_V);
      P.px(Math.round(cx), 30, BLANCO_V);
    }
    // Brows: the left one flat and cheeky, the right one arched.
    P.llenar(cur([[22, 25], [25.5, 24], [29, 25]], 1), COLA.r[3]);
    P.llenar(cur([[34, 25], [37.5, 22.6], [41.5, 23.6]], 1), COLA.r[3]);
    // The grin: wide, a little crooked, with a row of teeth and a pink tongue poking out to the right.
    const boca = poli([[25, 38.6], [40.6, 37.8], [38.6, 43], [34, 44.6], [28.4, 43]]);
    P.llenar(boca, TINTA_V);
    P.llenar(inter(boca, rc(0, 37, 64, 2)), BLANCO_V);
    P.llenar(inter(el(36, 44, 4.2, 3.2), boca), LENGUA_V);
    P.px(36, 42, TINTA_V);
    P.px(36, 43, TINTA_V);
    P.px(24, 38, TINTA_V);
    P.px(41, 37, TINTA_V);
    P.llenar(rc(22, 39, 2, 2), LENGUA_V);
    P.llenar(rc(42, 39, 2, 2), LENGUA_V);
  } else {
    // Back of the glass: a lemon sticker on the cola and a long glint.
    P.llenar(cur([[24, 24], [23, 38]], 1), COLA.r[3]);
    P.llenar(cur([[41, 26], [41, 32]], 1), COLA.r[2]);
    P.forma(el(32.5, 38, 6.6, 6.6), LIMON, { rad: 3.6, grad: 0.2 });
    P.llenar(el(32.5, 38, 5, 5), LIMON.r[2]);
    P.llenar(el(32.5, 38, 4, 4), LIMON.r[1]);
    P.llenar(cur([[32, 34], [32, 42]], 1), LIMON.r[2]);
    P.llenar(cur([[29, 38], [36, 38]], 1), LIMON.r[2]);
    P.px(31, 38, LIMON.r[2]);
  }

  // Lemon slice wedged on the rim: a wheel with segments and a pale pith ring.
  const lx = E ? 17.5 : 46.5;
  const ly = cima + 1 + sy;
  const rueda = el(lx, ly, 6.6, 6.6);
  P.sombra(rueda, 1, 1, 1);
  P.forma(rueda, LIMON, { rad: 3.4, grad: 0.3, sesgo: 0.1 });
  P.llenar(el(lx, ly, 5, 5), LIMON.r[2]);
  P.llenar(el(lx, ly, 4, 4), LIMON.r[1]);
  for (const [dx, dy] of [[0, -3.6], [0, 3.6], [-3.6, 0], [3.6, 0]] as [number, number][]) P.llenar(cur([[lx, ly], [lx + dx, ly + dy]], 1), LIMON.r[2]);
  P.px(Math.round(lx), Math.round(ly), LIMON.r[2]);

  // Fizz above: little bubbles drifting up on the side opposite the lemon.
  const aro = (x: number, y: number) => {
    P.px(x, y - 1, BLANCO_V);
    P.px(x - 1, y, VIDRIO.r[1]);
    P.px(x + 1, y, VIDRIO.r[1]);
    P.px(x, y + 1, VIDRIO.r[1]);
  };
  const ox = E ? 63 : 0;
  const X = (x: number) => (E ? ox - x : x);
  aro(X(14), 10 - (f ? 2 : 0));
  aro(X(9), 20 - (f ? 3 : 0));
  aro(X(17), 2 + (f ? 2 : 0));
  P.px(X(12), 4 - (f ? 1 : 0), BLANCO_V);
  P.px(X(6), 12 - (f ? 2 : 0), BLANCO_V);
}

// ---------------------------------------------------------------------------------------------
// P · a chunky capital «P» in pink block-letter style, with little legs, round spectacles and a raised finger:
// a know-it-all bore who never stops talking (the mouth opens and closes between idle frames).
// From behind it is the same letter mirrored, the way a real block letter looks from the other side.
// ---------------------------------------------------------------------------------------------
const ROSA: Mat = { r: ['#701438', '#a8245a', '#d63a78', '#f46ea0'], ol: '#3a0a22', ol2: '#701438', rim: '#ffb4d0' };
const GUANTE: Mat = { r: ['#8c8cc0', '#d8d8f0', '#ffffff'], ol: '#3a0a22', ol2: '#8c8cc0' };
const TINTA_P = '#3a0a22';
const LENGUA_P = '#ff6a7a';
const GAFAS_P: Mat = { r: ['#b8741a', '#ffc83c', '#fff2a0'], ol: TINTA_P, ol2: '#b8741a' };

function pe(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dy = f ? 1 : 0; // the letter bounces a pixel with every word
  const T = (m: Mascara) => (E ? espejo(m) : m);

  // Legs: two stubby legs with white trainers, on the ground line.
  for (const x of [17, 31]) {
    P.forma(T(rr(x, 49, 8, 9, 2)), ROSA, { rad: 3, sesgo: -0.1 });
    P.forma(T(un(el(x + 3.6, 57.8, 6.4, 3), rr(x - 2, 56, 11, 3, 1))), GUANTE, { rad: 2.4 });
    P.llenar(T(rc(x - 1, 60, 10, 1)), GUANTE.r[0]);
  }

  // Arms: one hangs relaxed on the right (from the front), the other lifts a finger to correct somebody.
  const brazoD = un(trazo([[33, 40 + dy], [38, 45 + dy], [42, 47 + dy]], 2.8, 2.4));
  P.forma(T(brazoD), ROSA, { rad: 2.4 });
  P.forma(T(el(43.5, 48.6 + dy, 3.6, 3.6)), GUANTE, { rad: 3 });
  const dedo = f ? 1 : 0;
  const brazoI = trazo([[12, 41 + dy], [6.5, 37 + dy], [5, 32 + dy]], 2.8, 2.4);
  P.forma(T(brazoI), ROSA, { rad: 2.4 });
  P.forma(T(un(el(4.6, 30 + dy, 3.8, 3.4), rr(3 + dedo, 21 + dy, 3, 9, 1.4))), GUANTE, { rad: 2.4 });
  P.llenar(T(rc(4 + dedo, 26 + dy, 3, 1)), GUANTE.r[0]);

  // The letter itself: a stem and a bowl with a hole, thick as a block (the dark side shows to the lower right).
  const tallo = rr(10, 7 + dy, 24, 45, 4);
  const panza = rr(10, 7 + dy, 40, 29, 13);
  const agujero = el(40.6, 19.4 + dy, 4.4, 5);
  const letra = men(un(tallo, panza), agujero);
  const grosor = mover(letra, 3, 2);
  P.forma(T(grosor), ROSA, { modo: 'plano', paso: 0 });
  P.forma(T(letra), ROSA, { rad: 8, grad: 0.35, rim: false });
  P.tono(T(el(19, 11 + dy, 7, 2.6)), ROSA, 1);
  P.tono(T(el(44, 31 + dy, 4, 2.4)), ROSA, -1);

  if (!E) {
    // Round gold spectacles, half-lidded eyes looking down the nose at you, one brow up.
    for (const cx of [17.8, 27.8]) {
      const cy = 28 + dy;
      P.llenar(el(cx, cy, 5.4, 5.4), GAFAS_P.r[1]);
      P.llenar(inter(el(cx, cy, 5.4, 5.4), rc(0, cy + 1, 64, 6)), GAFAS_P.r[0]);
      P.aro(el(cx, cy, 5.4, 5.4), TINTA_P);
      const ojo = el(cx, cy, 4.1, 4.1);
      P.llenar(ojo, '#ffffff');
      P.llenar(el(cx + 1.2, cy + 0.6, 2, 2.2), TINTA_P);
      P.px(Math.round(cx) + 1, Math.round(cy), '#ffffff');
      P.llenar(inter(ojo, rc(0, 0, 64, cy - 1.4)), ROSA.r[2]);
      P.llenar(rc(Math.round(cx) - 4, Math.round(cy - 1.4), 8, 1), TINTA_P);
      P.px(Math.round(cx) - 4, Math.round(cy) - 4, GAFAS_P.r[2]);
      P.px(Math.round(cx) - 3, Math.round(cy) - 4, GAFAS_P.r[2]);
    }
    P.llenar(rc(22, 27 + dy, 1, 2), GAFAS_P.r[0]);
    P.llenar(cur([[12.5, 27 + dy], [10, 26 + dy]], 1), GAFAS_P.r[0]);
    P.llenar(cur([[13, 20.4 + dy], [17, 21 + dy], [21, 22 + dy]], 1), TINTA_P);
    P.llenar(cur([[25, 21 + dy], [28.6, 18.4 + dy], [32.4, 19.4 + dy]], 1), TINTA_P);
    // The mouth never stops: open and droning on frame 1, a smug closed grin on frame 2.
    if (!f) {
      const boca = el(22, 38.4 + dy, 5, 3.2);
      P.llenar(boca, TINTA_P);
      P.llenar(inter(boca, rc(0, 0, 64, 36.6 + dy)), '#ffffff');
      P.llenar(inter(el(23, 40.6 + dy, 3.2, 1.9), boca), LENGUA_P);
    } else {
      P.llenar(cur([[16.6, 37 + dy], [20, 39.6 + dy], [25, 39.6 + dy], [29, 36.6 + dy]], 1), TINTA_P);
      P.px(30, 36 + dy, TINTA_P);
      P.px(16, 36 + dy, TINTA_P);
      P.llenar(rc(24, 41 + dy, 4, 1), ROSA.r[1]);
    }
    P.llenar(rc(11, 35 + dy, 3, 2), ROSA.r[3]);
    P.llenar(rc(30, 35 + dy, 3, 2), ROSA.r[3]);
  } else {
    // Back of the letter: a stitched label, a crease and a couple of scuffs.
    P.forma(T(rr(15, 36 + dy, 14, 9, 2)), ROSA, { rad: 2, sesgo: 0.12 });
    P.llenar(T(rc(17, 38 + dy, 10, 1)), ROSA.r[1]);
    P.llenar(T(rc(17, 41 + dy, 7, 1)), ROSA.r[1]);
    P.llenar(T(cur([[14, 14 + dy], [14, 30 + dy]], 1)), ROSA.r[3]);
    P.llenar(T(cur([[38, 27 + dy], [46, 26 + dy]], 1)), ROSA.r[1]);
  }

  // The speech bubble, forever: dots that add up.
  const bx = E ? 7 : 56;
  const burbuja = un(el(bx, 5.6, 6.2, 4.4), poli([[bx + (E ? 3 : -3), 9], [bx + (E ? 6 : -6), 12], [bx + (E ? 0 : 0), 10]]));
  P.forma(burbuja, GUANTE, { rad: 2.6, sesgo: 0.2, grad: 0.1 });
  const n = f ? 3 : 2;
  for (let i = 0; i < n; i++) P.px(bx - 3 + i * 3, 5, TINTA_P);
}

// ---------------------------------------------------------------------------------------------
// JesúsPelo · a laid-back surfer: long wavy sun-bleached WHITE hair, a tan, board shorts, a shell necklace, a
// shaka sign and his turquoise board standing next to him. A friendly homage to the group's own Jesús.
// ---------------------------------------------------------------------------------------------
const TINTA_J = '#3a1a24';
const PELO_J: Mat = { r: ['#8c9ccc', '#c0ceee', '#eef4ff', '#ffffff'], ol: TINTA_J, ol2: '#8c9ccc', rim: '#ffffff' };
const PIEL_J: Mat = { r: ['#b8603a', '#e0985a', '#ffc890'], ol: TINTA_J, ol2: '#b8603a' };
const BAÑADOR: Mat = { r: ['#a02a1c', '#e04a2c', '#ff8c58'], ol: TINTA_J, ol2: '#a02a1c' };
const TABLA: Mat = { r: ['#167a8c', '#2cb4bc', '#86e8de'], ol: TINTA_J, ol2: '#167a8c' };

/** A surfboard: a long leaf shape from (x0, y0) (the nose) to (x1, y1) (the tail), half-width w at the widest point. */
function tablaMasa(x0: number, y0: number, x1: number, y1: number, w: number): Mascara {
  const izq: [number, number][] = [];
  const der: [number, number][] = [];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy);
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const hw = w * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.5);
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    izq.push([cx + (dy / l) * hw, cy - (dx / l) * hw]);
    der.push([cx - (dy / l) * hw, cy + (dx / l) * hw]);
  }
  return poli([...izq, ...der.reverse()]);
}

function jesuspelo(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dy = f ? 1 : 0; // he sways: the body sinks a pixel on frame 2
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const X = (x: number) => (E ? 63 - x : x);
  const sw = f ? 1 : 0; // hair and board swing

  // Surfboard standing on its tail at his side, leaning a little.
  const tabla = tablaMasa(54 - sw, 3, 50, 59, 5.6);
  P.sombra(T(tabla), -1, 1, 1);
  P.forma(T(tabla), TABLA, { rad: 6, grad: 0.4 });
  P.llenar(T(trazo([[53.2 - sw, 9], [51.2, 36], [49.6, 52]], 0.6, 0.6)), '#ffffff');
  P.llenar(T(trazo([[54 - sw, 9], [52, 36], [50.4, 52]], 0.5, 0.5)), TABLA.r[0]);
  P.llenar(T(trazo([[52.6 - sw, 7], [53.2 - sw, 6]], 0.6, 0.6)), TABLA.r[2]);
  P.forma(T(poli([[48, 56], [45, 61], [49, 60]])), TABLA, { modo: 'plano', paso: 0 });

  // Legs and bare feet.
  for (const x of [22, 31]) {
    P.forma(T(rr(x, 50 + dy, 7, 9 - dy, 2.4)), PIEL_J, { rad: 2.6 });
    P.forma(T(el(x + 3.4 + (x < 26 ? -0.6 : 0.6), 59.4, 4.6, 2)), PIEL_J, { rad: 2 });
  }
  // Board shorts: a wide loose pair with a white wave pattern.
  const shorts = un(poli([[19.5, 41 + dy], [39.5, 41 + dy], [41, 54 + dy], [31.2, 54 + dy], [29.5, 49 + dy], [27.8, 54 + dy], [18, 54 + dy]]));
  P.forma(T(shorts), BAÑADOR, { rad: 6, grad: 0.4 });
  const ola = T(cur(bez3([20, 51 + dy], [24, 47 + dy], [27, 52 + dy], [31, 48 + dy], 12), 1));
  P.llenarSobre(ola, '#ffffff', BAÑADOR);
  P.llenarSobre(T(cur(bez3([30.5, 51.4 + dy], [34, 47 + dy], [37, 51 + dy], [40, 48 + dy], 12), 1)), '#ffffff', BAÑADOR);
  P.llenar(T(cur([[22, 42 + dy], [37, 42 + dy]], 1)), BAÑADOR.r[0]);
  P.px(X(29), 43 + dy, '#ffffff');
  P.px(X(30), 43 + dy, '#ffffff');

  const cabezaY = 21 + dy;
  // Long hair seen from the front hangs behind the shoulders (drawn first); from behind it covers the whole back.
  const melenaFondo = un(el(29.5, cabezaY + 3, 13.6, 14), rr(20, cabezaY + 4, 20, 14, 5));
  if (!E) P.forma(melenaFondo, PELO_J, { rad: 7, grad: 0.3, sesgo: -0.2 });

  // Torso, bare and tanned.
  const torso = rr(21, 31 + dy, 18, 14, 5.4);
  P.sombra(T(torso), 1, 1, 1);
  P.forma(T(torso), PIEL_J, { rad: 6, grad: 0.4 });
  P.llenar(T(cur([[27, 41 + dy], [32, 42.4 + dy]], 1)), PIEL_J.r[0]);

  // Arms: the left one (viewer's left) does the shaka; the right one holds the board.
  const hombroI = trazo([[22, 36 + dy], [14, 35 + dy], [11, 29 + dy]], 3.2, 2.8);
  P.forma(T(hombroI), PIEL_J, { rad: 2.6 });
  const puno = el(10.4, 25.4 + dy, 4.1, 4.3);
  P.forma(T(un(trazo([[8, 27 + dy], [3, 30.6 + dy + sw]], 2, 1.4), trazo([[11.6, 22.6 + dy], [15.4, 16.6 + dy - sw]], 1.9, 1.3))), PIEL_J, { rad: 1.5 });
  P.forma(T(puno), PIEL_J, { rad: 3 });
  P.llenar(T(cur([[8, 24 + dy], [12, 24 + dy]], 1)), PIEL_J.r[0]);
  P.llenar(T(cur([[8, 26 + dy], [12, 26 + dy]], 1)), PIEL_J.r[0]);
  const brazoD = trazo([[37, 36 + dy], [44, 40 + dy], [48, 40 + dy]], 3.2, 2.8);
  P.forma(T(brazoD), PIEL_J, { rad: 2.6 });
  P.forma(T(el(48.6, 40.6 + dy, 3.2, 3.2)), PIEL_J, { rad: 2.6 });

  if (!E) {
    // Neck and head.
    P.forma(rr(26, 29 + dy, 8, 6, 2), PIEL_J, { rad: 2.6, sesgo: -0.2 });
    const cabeza = un(el(29.5, cabezaY, 11.6, 12), rr(19, cabezaY, 21, 12, 6));
    P.sombra(cabeza, 1, 1, 1);
    P.forma(cabeza, PIEL_J, { rad: 7, grad: 0.35, sesgo: 0.05 });
    // Face: relaxed half-closed eyes (lids and a sliver of pupil), white eyebrows, a lazy half-smile.
    for (const cx of [24.6, 34.8]) {
      P.llenar(inter(el(cx, cabezaY + 1.4, 3.4, 2.6), rc(0, Math.round(cabezaY + 1), 64, 4)), '#ffffff');
      P.llenar(rc(Math.round(cx) - 1, Math.round(cabezaY) + 1, 2, 2), TINTA_J);
      P.llenar(cur([[cx - 3.6, cabezaY + 1], [cx + 3.4, cabezaY + 1]], 1), TINTA_J);
      P.llenar(cur([[cx - 3, cabezaY - 2.6], [cx, cabezaY - 3.6], [cx + 3, cabezaY - 2.8]], 1), PELO_J.r[1]);
    }
    P.px(29, Math.round(cabezaY) + 4, PIEL_J.r[0]);
    P.px(30, Math.round(cabezaY) + 5, PIEL_J.r[0]);
    P.llenar(cur([[25, cabezaY + 7], [28, cabezaY + 8.6], [32, cabezaY + 8.6], [35.4, cabezaY + 6.4]], 1), TINTA_J);
    P.llenar(rc(28, Math.round(cabezaY) + 9, 5, 1), '#ffffff');
    P.llenar(rc(21, Math.round(cabezaY) + 5, 2, 2), BAÑADOR.r[2]);
    P.llenar(rc(37, Math.round(cabezaY) + 5, 2, 2), BAÑADOR.r[2]);
    // Shell necklace.
    P.llenar(cur(bez3([25, 33 + dy], [28, 37 + dy], [32, 37 + dy], [34, 33 + dy], 8), 1), '#ffffff');
    P.forma(el(29.6, 38 + dy, 1.9, 1.9), PELO_J, { rad: 1.5, paso: 2 });
    // Hair: a wavy white cap over the forehead and temples, long locks falling in front of the shoulders.
    const gorro = men(un(el(29.5, cabezaY - 5, 14.4, 9.6), el(29.5, cabezaY - 1, 13.2, 7)), un(el(29.5, cabezaY + 2.6, 9.6, 7), el(23, cabezaY - 1.6, 3.4, 2.4)));
    P.forma(gorro, PELO_J, { rad: 5, grad: 0.4 });
    const mechonI = trazo(bez3([16.6, cabezaY - 3], [12, cabezaY + 4], [18, cabezaY + 11 + sw], [13.4, cabezaY + 19 + sw], 12), 3, 2);
    const mechonD = trazo(bez3([42.4, cabezaY - 3], [47, cabezaY + 4], [41, cabezaY + 11 - sw], [45.6, cabezaY + 19 - sw], 12), 3, 2);
    P.forma(un(mechonI, mechonD), PELO_J, { rad: 2.4, sesgo: -0.05 });
    // Strands of the wave, a lit edge.
    P.llenar(cur(bez3([24, cabezaY - 12], [22, cabezaY - 8], [27, cabezaY - 6], [25, cabezaY - 3], 8), 1), PELO_J.r[1]);
    P.llenar(cur(bez3([33, cabezaY - 13], [35, cabezaY - 9], [31, cabezaY - 7], [33, cabezaY - 4], 8), 1), PELO_J.r[1]);
    P.llenar(cur(bez3([39, cabezaY - 10], [42, cabezaY - 6], [39, cabezaY - 4], [42, cabezaY - 2], 8), 1), PELO_J.r[1]);
  } else {
    // From behind: the head is a dome of white hair that runs down the back in long waves, tips flicking out.
    const dorso = un(el(29.5, cabezaY, 13.2, 13.6), rr(21, cabezaY + 4, 17, 16, 5));
    const puntas = un(el(24.4, cabezaY + 22 + sw, 3.6, 3), el(30, cabezaY + 23 - sw, 3.8, 3.2), el(35.4, cabezaY + 22 + sw, 3.6, 3));
    const pelo = un(dorso, puntas);
    P.sombra(pelo, 1, 1, 1);
    P.forma(pelo, PELO_J, { rad: 9, grad: 0.4 });
    for (const [x0, k] of [[24, 0], [28, 1], [32, 0], [36, 1]] as [number, number][]) {
      P.llenarSobre(cur(bez3([x0, cabezaY - 5], [x0 - 3 + k * 5, cabezaY + 4], [x0 + 3 - k * 5, cabezaY + 12], [x0 + (k ? 2 : -2), cabezaY + 22], 12), 1), PELO_J.r[1], PELO_J);
    }
    P.tono(el(24, cabezaY - 7, 7, 3), PELO_J, 1);
  }
}

// ---------------------------------------------------------------------------------------------
// Pantaloneto · a pair of jeans that escaped from the clothesline and walks on its own: a wooden peg still clipped to
// the waistband with a snipped bit of line, a cheeky face on the front, white trainers, a patched knee.
// From behind: back pockets, a leather label on the waistband and the peg on the other side.
// ---------------------------------------------------------------------------------------------
const TINTA_Q = '#0e1634';
const VAQUERO: Mat = { r: ['#1c2c64', '#2e4a9c', '#4e72c8', '#86a8ec'], ol: TINTA_Q, ol2: '#1c2c64', rim: '#86a8ec' };
const MADERA: Mat = { r: ['#a86a30', '#e0a860', '#ffd896'], ol: TINTA_Q, ol2: '#a86a30' };
const ZAPA: Mat = { r: ['#86a8ec', '#ffffff', '#ffffff'], ol: TINTA_Q, ol2: '#86a8ec' };
const COSTURA = '#f0b84a';
const PARCHE = '#d83a3a';
const LENGUA_Q = '#f0607e';

function pantaloneto(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const X = (x: number) => (E ? 63 - x : x);
  const T = (m: Mascara) => (E ? espejo(m) : m);
  // Walking: one foot lifts while the other is down, then they swap.
  const yI = f ? 0 : 2;
  const yD = f ? 2 : 0;
  const dy = f ? 0 : 0;

  // Rope: the bit of clothesline still tied to the peg, swinging.
  const cuerda = f ? [[46, 5], [41, 1], [36, 2]] : [[46, 5], [41, 2], [35, 4]];
  const cuerda2 = f ? [[46, 5], [51, 1], [55, 3]] : [[46, 5], [51, 2], [56, 1]];
  P.llenar(T(cur(cuerda as [number, number][], 1)), '#ffffff');
  P.llenar(T(cur(cuerda2 as [number, number][], 1)), '#ffffff');

  // Trainers (white, with a blue sole), one lifted.
  for (const [x, y] of [[22, yI], [42, yD]] as [number, number][]) {
    const zapa = un(el(x, 58.2 - y, 8, 3.2), rr(x - 7, 55 - y, 14, 4, 2));
    P.forma(T(zapa), ZAPA, { rad: 3 });
    P.llenar(T(rc(x - 7, 60 - y, 15, 1)), ZAPA.r[0]);
    P.llenar(T(cur([[x - 2, 56.6 - y], [x + 2, 56.6 - y]], 1)), ZAPA.r[0]);
  }

  // The trousers: one shape (hips and both legs, a gap between them).
  const cuerpo = un(
    poli([[15, 8], [49, 8], [50.6, 28], [46, 34], [33.6, 33], [30.4, 33], [18, 34], [13.4, 28]]),
    poli([[13.6, 28], [30.6, 33], [28.4, 56 - yI], [15, 56 - yI]]),
    poli([[50.4, 28], [33.4, 33], [35.6, 56 - yD], [49, 56 - yD]]),
  );
  P.sombra(T(cuerpo), 1, 1, 1);
  P.forma(T(cuerpo), VAQUERO, { rad: 9, grad: 0.45 });
  // Fading: lighter patches at the knees and thighs (worn denim), darker on the inner thighs.
  P.tono(T(el(21, 33, 4, 5)), VAQUERO, 1);
  P.tono(T(el(43, 33, 4, 5)), VAQUERO, 1);
  P.tono(T(rc(28, 34, 8, 12)), VAQUERO, -1);

  // Cuffs: rolled up, lighter, with a stitched edge.
  for (const [x0, x1, y] of [[15, 28, yI], [36, 49, yD]] as [number, number, number][]) {
    const pu = rr(x0 - 1, 49 - y, x1 - x0 + 2, 7, 1.4);
    P.forma(T(pu), VAQUERO, { rad: 2, sesgo: 0.35, grad: 0.2 });
    P.llenar(T(rc(x0, 51 - y, x1 - x0, 1)), COSTURA);
    P.llenar(T(rc(x0, 49 - y, x1 - x0, 1)), VAQUERO.r[3]);
  }

  // Waistband and belt loops.
  P.forma(T(rr(13, 6, 38, 7, 2)), VAQUERO, { rad: 2.4, sesgo: -0.1, grad: 0.2 });
  P.llenar(T(rc(15, 11, 34, 1)), COSTURA);
  for (const x of [20, 31, 43]) P.forma(T(rr(x, 5, 3, 10, 1)), VAQUERO, { rad: 1.6, sesgo: 0.2, grad: 0.1 });

  if (!E) {
    // Pocket openings (curved cuts from the waistband down to the side seam) and a stitched fly.
    for (const lado of [0, 1]) {
      const Z = (x: number) => (lado ? 63 - x : x);
      P.llenar(cur(bez3([Z(18), 14], [Z(18), 22], [Z(15), 27], [Z(12.6), 28.4], 10), 1), COSTURA);
      P.llenar(cur(bez3([Z(19), 14], [Z(19), 22.4], [Z(15.6), 28], [Z(12.8), 29.8], 10), 1), VAQUERO.r[0]);
    }
    P.llenar(cur(bez3([31, 31], [31.4, 35], [32.6, 35.6], [34, 34], 8), 1), COSTURA);
    // A patch on the left knee, stitched on.
    P.forma(rr(17, 41, 8, 7, 1), { r: ['#8a1c2c', PARCHE, PARCHE], ol: TINTA_Q, ol2: '#8a1c2c' }, { rad: 2.4, grad: 0.2 });
    P.llenar(rc(16, 40, 10, 1), COSTURA);
    P.llenar(rc(16, 48, 10, 1), COSTURA);
    // The face: big cheeky eyes (pupils looking sideways), one brow up, a lopsided grin with the tongue out.
    for (const cx of [26.4, 37.6]) {
      const ojo = el(cx, 22, 4.4, 5);
      P.llenar(ojo, '#ffffff');
      P.aro(ojo, TINTA_Q);
      const px = cx + (f ? -1.4 : 1.4);
      P.llenar(el(px, 22.6, 2.2, 2.7), TINTA_Q);
      P.px(Math.round(px) - 1, 21, '#ffffff');
    }
    P.llenar(cur([[22, 16.4], [25.6, 15.2], [29.6, 15.8]], 1), TINTA_Q);
    P.llenar(cur([[34, 15.8], [38, 13.2], [42.4, 14.4]], 1), TINTA_Q);
    const boca = poli([[25.4, 28.6], [40.4, 27.4], [39, 32], [33.4, 34], [27.8, 32]]);
    P.llenar(boca, TINTA_Q);
    P.llenar(inter(boca, rc(0, 27, 64, 2)), '#ffffff');
    P.llenar(inter(el(36.4, 33, 4, 3), boca), LENGUA_Q);
    P.px(36, 31, TINTA_Q);
    P.px(24, 28, TINTA_Q);
    P.px(41, 27, TINTA_Q);
    // Button on the waistband.
    P.forma(el(32, 9.4, 2.6, 2.2), MADERA, { rad: 1.5, paso: 1 });
    P.px(31, 8, MADERA.r[2]);
  } else {
    // Back pockets with a double stitched pentagon, a yoke V and a seat seam.
    for (const x0 of [16, 35]) {
      const bolsillo = poli([[x0, 17], [x0 + 13, 17], [x0 + 13, 29], [x0 + 6.5, 33], [x0, 29]]);
      P.forma(bolsillo, VAQUERO, { rad: 3, sesgo: 0.12, grad: 0.2 });
      P.llenarSobre(cur([[x0 + 1, 18], [x0 + 12, 18]], 1), COSTURA, VAQUERO);
      P.llenarSobre(cur([[x0 + 2, 21], [x0 + 6.5, 25], [x0 + 11, 21]], 1), COSTURA, VAQUERO);
    }
    P.llenar(cur([[32, 14], [32, 37]], 1), VAQUERO.r[0]);
    P.llenar(cur([[16, 14], [32, 19], [48, 14]], 1), COSTURA);
    // Leather label on the waistband.
    P.forma(rr(26, 6, 10, 6, 1), MADERA, { rad: 2, grad: 0.2 });
    P.llenar(rc(28, 8, 6, 1), MADERA.r[0]);
    P.llenar(rc(28, 10, 4, 1), MADERA.r[0]);
  }

  // The peg: wooden, a metal spring, clipped to the top edge of the waistband (right corner from the front).
  const pinza = un(rr(44, 2, 6, 14, 2), rr(43, 3, 8, 4, 1.4));
  P.sombra(T(pinza), 1, 1, 1);
  P.forma(T(pinza), MADERA, { modo: 'cil', eje: 47, semi: 3, rad: 2.6 });
  P.llenar(T(rc(46, 9, 2, 7)), MADERA.r[0]);
  P.llenar(T(cur([[46, 8], [46, 15]], 1)), TINTA_Q);
  P.llenar(T(rc(44, 4, 6, 1)), VAQUERO.r[3]);
  P.llenar(T(rc(44, 6, 6, 1)), MADERA.r[0]);
  P.px(X(45), 5, VAQUERO.r[2]);
  P.px(X(49), 5, VAQUERO.r[2]);
  void dy;
}

// ---------------------------------------------------------------------------------------------
// Aceituna · Fran's little black dog, very sweet: big shiny eyes, a tongue out, a red collar with a tag.
// Black fur needs help: a dark blue-grey ramp, a cool rim light on the shaded side and tan eyebrow dots.
// ---------------------------------------------------------------------------------------------
const PELO: Mat = { r: ['#161a2e', '#262f4c', '#3c4a72', '#6078aa'], ol: '#080a16', ol2: '#161a2e', rim: '#8ea6d6' };
const COLLAR: Mat = { r: ['#8a1c2c', '#d83a3a', '#f0705a'], ol: '#080a16', ol2: '#8a1c2c' };
const ORO_A: Mat = { r: ['#b8741a', '#ffc83c', '#fff2a0'], ol: '#080a16', ol2: '#b8741a' };
const TINTA_A = '#080a16';
const BLANCO_A = '#ffffff';
const IRIS = '#ffc83c';
const IRIS_O = '#b8741a';
const LENGUA = '#f0705a';
const LENGUA_O = '#8a1c2c';

function aceituna(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const by = f; // frame 1: the head and body settle a pixel (breathing), the tail swings the other way
  const sw = f ? 1 : 0;

  // Tail: a happy little curl that wags (on her right from the front, standing up behind her from the back).
  const cola = E
    ? trazo(bez3([25, 57], [11, 59], [6 - sw, 48], [10 + sw * 3, 40 - sw * 2], 14), 3.6, 1.8)
    : trazo(bez3([43, 55], [53, 55], [55 + sw, 47], [53 + sw * 3, 40 - sw * 2], 14), 3.4, 1.8);
  if (!E) P.forma(cola, PELO, { rad: 2.2, sesgo: 0.1 });

  // Hind legs (the haunches stick out on both sides of the body) and their paws.
  const anca = par(un(el(17.5, 52, 6.4, 7.4)));
  P.forma(anca, PELO, { rad: 4.5, sesgo: -0.05 });
  P.forma(par(el(18.5, 59, 5.4, 2.4)), PELO, { rad: 2, sesgo: 0.05 });

  // Body: a pear, narrow at the chest, wide at the haunches.
  const cuerpo = un(el(32, 50 + by * 0, 12.5, 10.5), el(32, 44, 9.5, 8));
  P.sombra(cuerpo, 1, 1, 1);
  P.forma(cuerpo, PELO, { rad: 8, grad: 0.4 });
  if (E) {
    // Back: a patch of light on the shoulder blades and the spine, soft shade on the rump.
    P.tono(el(26, 42, 5, 4), PELO, 1);
    P.tono(el(40, 55, 5, 3), PELO, -1);
    P.px(31, 38, PELO.r[3]);
    P.px(32, 39, PELO.r[3]);
    P.px(32, 41, PELO.r[3]);
  } else {
    // Front legs and paws.
    for (const x of [24.5, 39.5]) {
      P.forma(rr(Math.round(x) - 3, 48, 7, 11, 3), PELO, { rad: 3, sesgo: 0.05 });
      P.forma(el(x + 0.2, 58.6, 4.8, 2.4), PELO, { rad: 2, sesgo: 0.1 });
      P.px(Math.round(x) - 1, 60, PELO.r[1]);
      P.px(Math.round(x) + 1, 60, PELO.r[1]);
    }
    // A pale chest tuft.
    P.tono(el(32, 47, 3.4, 3), PELO, 1);
  }
  if (E) {
    P.forma(cola, PELO, { rad: 2.2, sesgo: 0.2 });
    P.forma(par(el(24.5, 59, 4.6, 2.2)), PELO, { rad: 2, sesgo: 0.1 });
  }

  // Head: wide and round, like a puppy's.
  const cabeza = un(el(32, 26 + by, 16.5, 14), el(32, 30 + by, 15, 11));
  P.sombra(cabeza, 1, 2, 1);
  P.forma(cabeza, PELO, { rad: 10, grad: 0.42, sesgo: 0.05 });
  P.tono(el(24, 17 + by, 7, 3.2), PELO, 1);

  // Floppy ears hanging over the sides of the head, swinging a little between frames.
  const oreja = un(trazo([[18.5, 15 + by], [13 - sw, 22 + by], [11 - sw, 31 + by]], 3.4, 4.6), el(11.6 - sw, 31 + by, 4.4, 4.4));
  P.sombra(oreja, 1, 1, 1);
  P.forma(par(oreja), PELO, { rad: 4, sesgo: -0.12 });
  P.tono(par(rc(10, 22 + by, 3, 7)), PELO, 1);

  P.cara(() => {
    const y = by;
    // Muzzle (lighter fur), glossy nose, a little open mouth with the tongue hanging out.
    P.forma(el(32, 35 + y, 8.6, 6.2), PELO, { rad: 5, grad: 0.3, borde: false, sesgo: 0.28 });
    P.forma(el(32, 32 + y, 3.6, 2.5), { r: [TINTA_A, TINTA_A, '#262f4c'], ol: TINTA_A }, { modo: 'plano', paso: 1 });
    P.px(31, 31 + y, BLANCO_A);
    P.px(32, 31 + y, PELO.r[3]);
    P.llenar(cur([[32, 34 + y], [32, 36 + y]], 1), TINTA_A);
    const boca = cur([[26, 36 + y], [28, 38 + y], [32, 37 + y], [36, 38 + y], [38, 36 + y]], 1);
    P.llenar(boca, TINTA_A);
    const lengua = rr(30, 38 + y, 6, 6 + sw, 2.6);
    P.llenar(men(lengua, rc(0, 0, 64, 38 + y)), LENGUA);
    P.llenar(rc(33, 38 + y, 1, 4 + sw), LENGUA_O);
    P.aro(men(lengua, rc(0, 0, 64, 38 + y)), TINTA_A);
    // Big shiny eyes: an amber iris ringed with dark, a black pupil and two glints, pale eyebrow dots above.
    for (const cx of [23.5, 40.5]) {
      const dir = cx < 32 ? 1 : -1;
      const ojo = el(cx, 27 + y, 5.2, 5.8);
      P.llenar(ojo, TINTA_A);
      P.llenar(el(cx + dir * 0.2, 27.6 + y, 4, 4.6), IRIS_O);
      P.llenar(inter(el(cx + dir * 0.2, 28.4 + y, 3.4, 3.8), rc(0, 27 + y, 64, 8)), IRIS);
      P.llenar(el(cx + dir * 0.4, 27.2 + y, 2.4, 2.8), TINTA_A);
      const gx = Math.round(cx) - (dir > 0 ? 3 : 1);
      P.llenar(rc(gx, 24 + y, 2, 2), BLANCO_A);
      P.px(Math.round(cx) + (dir > 0 ? 1 : -2), 30 + y, BLANCO_A);
      P.px(Math.round(cx) + (dir > 0 ? 2 : -3), 29 + y, ORO_A.r[2]);
      P.px(Math.round(cx) - 2 + (dir > 0 ? 0 : 3), 20 + y - (dir > 0 ? 0 : 0), IRIS);
      P.px(Math.round(cx) - 1 + (dir > 0 ? 0 : 3), 20 + y, IRIS);
    }
    // Blush.
    P.llenar(rc(16, 33 + y, 3, 2), LENGUA);
    P.llenar(rc(45, 33 + y, 3, 2), LENGUA);
  });
  P.dorso(() => {
    // The back of the head: a swirl of lighter fur on the crown.
    P.tono(el(32, 16, 8, 3.4), PELO, 1);
    P.px(30, 22, PELO.r[3]);
    P.px(31, 21, PELO.r[3]);
    P.px(34, 23, PELO.r[1]);
  });

  // Collar with a little gold tag.
  const collar = cur(bez3([21, 39 + by], [26, 44 + by], [38, 44 + by], [43, 39 + by], 14), 3);
  P.forma(collar, COLLAR, { modo: 'plano', paso: 1 });
  P.llenar(cur(bez3([22, 38 + by], [27, 43 + by], [37, 43 + by], [42, 38 + by], 14), 1), COLLAR.r[2]);
  if (!E) {
    P.forma(el(32, 46.4 + by, 2.9, 3), ORO_A, { rad: 2.4 });
    P.px(31, 45 + by, ORO_A.r[2]);
  }
}

export const LOTE_D: Dibujo2[] = [
  { id: 'pantaloneto', nombre: 'Pantaloneto', dibujar: pantaloneto },
  { id: 'jesuspelo', nombre: 'JesúsPelo', dibujar: jesuspelo },
  { id: 'p', nombre: 'P', dibujar: pe },
  { id: 'cubatillo', nombre: 'Cubatillo', dibujar: cubatillo },
 { id: 'aceituna', nombre: 'Aceituna', dibujar: aceituna }];
void [Mascara, espejo, mover, poli];
