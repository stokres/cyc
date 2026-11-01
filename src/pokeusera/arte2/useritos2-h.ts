// PokéUsera · Edición Jarra (arte v2): batch h of the 64×64 useritos (same conventions as useritos2.ts).
// Culotouchi, Baticao, Josex, Arcochin and Navicesta.
import type { Dibujo2 } from './useritos2';
import { Mascara, Pintor, bez3, cur, el, espejo, inter, men, poli, rc, rr, trazo, un, type Mat } from './pintor';

// ---------------------------------------------------------------------------------------------
// Josex · a fond caricature of the owner-waiter of a neighbourhood bar: a short, round, beaming old man with
// short grey hair receding at the temples, no glasses, a short-sleeved pale-blue shirt with a collar and a chest
// pocket, a belted pair of trousers, a checked cloth over one shoulder and, in his other hand, a plate with a
// pincho of potato omelette (a toothpick stuck in it). Frame 1: the grin widens, the brows rise and the plate
// lifts. From behind: the grey nape and ears, the shirt with its yoke seam, the cloth hanging down the back,
// the belt and the plate arm.
// ---------------------------------------------------------------------------------------------
const INK_J = '#1c1420';
const PIEL_J: Mat = { r: ['#b8604a', '#e8a07c', '#ffcfa6'], ol: INK_J, ol2: '#b8604a' };
const PELO_J: Mat = { r: ['#7a7e94', '#b8bcd0', '#eceef8'], ol: INK_J, ol2: '#7a7e94' };
const CAMISA_J: Mat = { r: ['#4e72a8', '#86aad8', '#bcd6f2'], ol: INK_J, ol2: '#4e72a8' };
const PANTA_J: Mat = { r: ['#2e2c44', '#46445e'], ol: INK_J, ol2: '#2e2c44' };
const TORTI_J = ['#f0b828', '#ffe27a'];
const ROJO_J = '#d4202e';
const BLANCO_J = '#ffffff';

function josex(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dy = f ? -1 : 0; // the whole upper body bobs a pixel in frame 1
  const dp = f ? -2 : 0; // the plate lifts
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);

  // Shoes and short legs.
  for (const x of [23.5, 40.5]) {
    P.forma(T(rr(x - 5, 54, 10, 6, 2)), PANTA_J, { rad: 3 });
    P.forma(T(el(x + (x < 32 ? -0.5 : 0.5), 60.6, 6.6, 3)), PANTA_J, { rad: 2.6, paso: 0 });
    if (!E) P.px(Math.round(x) + (x < 32 ? -4 : 3), 60, PANTA_J.r[1]);
  }
  P.llenar(T(cur([[32, 55], [32, 58]], 1)), INK_J);

  // Torso: a round belly in the shirt, with the belt just under it.
  const torso = el(32, 46.5 + dy, 17, 11);
  P.sombra(torso, 0, 1, 1);
  P.forma(torso, CAMISA_J, { rad: 8, grad: 0.4 });
  const cinto = inter(rc(14, 54 + dy, 36, 3), un(torso, rc(15, 50, 34, 7)));
  P.forma(cinto, PANTA_J, { modo: 'plano', paso: 0, borde: true });
  // Trousers show under the belt.
  P.forma(inter(rc(15, 57 + dy, 34, 3), el(32, 52 + dy, 17, 9)), PANTA_J, { rad: 3, grad: 0.3 });
  P.cara(() => {
    P.px(31, 55 + dy, '#f0b828');
    P.px(32, 55 + dy, '#ffe27a');
    P.px(33, 55 + dy, '#f0b828');
    // Open collar, buttons, a chest pocket with a pen.
    P.llenar(cur([[32, 40 + dy], [32, 53 + dy]], 1), CAMISA_J.r[0]);
    for (const y of [44, 48, 52]) P.px(31, y + dy, BLANCO_J);
    P.llenar(rc(38, 44 + dy, 6, 6), CAMISA_J.r[2]);
    P.aro(rc(38, 44 + dy, 6, 6), CAMISA_J.r[0]);
    P.px(40, 43 + dy, ROJO_J);
    P.px(40, 44 + dy, ROJO_J);
  });
  P.dorso(() => {
    // Yoke seam and a centre seam on the back of the shirt.
    P.llenar(cur([[19, 41 + dy], [32, 43 + dy], [45, 41 + dy]], 1), CAMISA_J.r[0]);
    P.llenar(cur([[32, 44 + dy], [32, 54 + dy]], 1), CAMISA_J.r[0]);
    P.llenar(cur([[24, 47 + dy], [28, 52 + dy]], 1), CAMISA_J.r[1]);
  });

  // Viewer's left arm: short sleeve, hairy-skinned forearm on the hip.
  P.forma(T(trazo([[17, 41 + dy], [13, 47 + dy]], 4.6, 4.2)), CAMISA_J, { rad: 3.6 });
  P.forma(T(trazo([[13, 48 + dy], [16, 54 + dy]], 3.2, 3)), PIEL_J, { rad: 2.8 });
  P.forma(T(el(17.5, 55 + dy, 3.2, 2.8)), PIEL_J, { rad: 2.4, borde: 'suave' });

  // Viewer's right arm: sleeve and a forearm held out with the plate.
  const brazoD = trazo([[46, 41 + dy], [51, 46 + dy]], 4.6, 4.2);
  P.forma(T(brazoD), CAMISA_J, { rad: 3.6 });
  P.forma(T(trazo([[51, 47 + dy], [53, 46 + dp]], 3, 2.8)), PIEL_J, { rad: 2.6 });
  // Plate with the pincho.
  const plato = el(53, 44 + dp, 9, 2.8);
  P.sombra(T(plato), 0, 1, 1);
  P.forma(T(plato), { r: [PELO_J.r[1], BLANCO_J, BLANCO_J], ol: INK_J, ol2: PELO_J.r[1] }, { rad: 2.4, grad: 0.4 });
  P.llenar(T(el(53, 44 + dp, 5.4, 1.2)), PELO_J.r[1]);
  const torti = un(el(52, 39 + dp, 6.4, 4.2), rc(46, 39 + dp, 13, 4));
  P.sombra(T(torti), 0, 1, 1);
  P.forma(T(torti), { r: [PIEL_J.r[0], TORTI_J[0], TORTI_J[1]], ol: INK_J, ol2: PIEL_J.r[0] }, { rad: 3, grad: 0.4 });
  if (!E) {
    P.px(49, 38 + dp, TORTI_J[1]);
    P.px(50, 38 + dp, TORTI_J[1]);
    P.px(54, 41 + dp, PIEL_J.r[0]);
    P.px(51, 40 + dp, PIEL_J.r[0]);
    P.px(56, 39 + dp, PIEL_J.r[0]);
  }
  P.llenar(T(cur([[52, 31 + dp], [52, 39 + dp]], 1)), INK_J);
  P.px(TX(52), 30 + dp, ROJO_J);
  P.px(TX(53), 30 + dp, ROJO_J);
  P.forma(T(el(53, 46 + dp, 3.4, 2.4)), PIEL_J, { rad: 2.2, borde: 'suave' });

  // The cloth over the shoulder: red and white checks, one end hanging in front.
  const trapo = poli([[13, 41 + dy], [19, 36 + dy], [26, 38 + dy], [26, 46 + dy], [24, 51 + dy], [17, 51 + dy], [16, 45 + dy], [13, 46 + dy]]);
  const trapoM = E ? trapo : trapo;
  P.sombra(T(trapoM), 1, 1, 1);
  P.forma(T(trapoM), { r: [PIEL_J.r[0], ROJO_J, BLANCO_J], ol: INK_J, ol2: PIEL_J.r[0] }, { modo: 'plano', paso: 1 });
  trapoM.each((x, y) => {
    if (((x >> 1) + (y >> 1)) % 2 === 0 && trapoM.tiene(x - 1, y) && trapoM.tiene(x + 1, y) && trapoM.tiene(x, y - 1) && trapoM.tiene(x, y + 1)) P.px(TX(x), y, BLANCO_J);
  });

  // Head: ears, then the face (or the grey nape from behind).
  for (const x of [15.4, 48.6]) P.forma(el(x + (x < 32 ? 0.6 : -0.6), 28 + dy, 2.8, 3.8), PIEL_J, { rad: 2.4, borde: 'suave' });
  // A squarish head: a rounded cranium over a straight, angular jaw.
  const cabeza = un(rr(16, 9 + dy, 32, 22, 8.5), rr(17, 19 + dy, 30, 20, 3));
  P.sombra(cabeza, 0, 1, 1);
  if (!E) {
    P.forma(cabeza, PIEL_J, { rad: 10, grad: 0.35 });
    // Short grey hair: a cap with a receding hairline, and tufts over the ears.
    const cara = un(rr(18, 15 + dy, 28, 26, 3), el(22.5, 17.5 + dy, 4.2, 3.2), el(41.5, 17.5 + dy, 4.2, 3.2));
    const pelo = inter(men(cabeza, cara), rc(0, 0, 64, 25 + dy));
    P.forma(pelo, PELO_J, { rad: 5, grad: 0.4, borde: true });
    P.px(31, 15 + dy, PELO_J.r[2]);
    P.px(32, 14 + dy, PELO_J.r[2]);
    P.px(26, 13 + dy, PELO_J.r[2]);
    // Beaming eyes: happy arcs, with the cheeks pushed up.
    for (const cx of [24.6, 39.4]) {
      P.llenar(cur([[cx - 3.4, 26 + dy], [cx, 22.6 + dy], [cx + 3.4, 26 + dy]], 1), INK_J);
      P.px(Math.round(cx - 4), 27 + dy, INK_J);
      P.px(Math.round(cx + 3.6), 27 + dy, INK_J);
    }
    // Brows, merry and high.
    const cej = f ? -1 : 0;
    P.llenar(cur([[20, 19.5 + dy + cej], [24.6, 17.5 + dy + cej], [29, 19 + dy + cej]], 1), PELO_J.r[1]);
    P.llenar(cur([[35, 19 + dy + cej], [39.4, 17.5 + dy + cej], [44, 19.5 + dy + cej]], 1), PELO_J.r[1]);
    // Big round nose and rosy cheeks.
    P.forma(el(32, 27.6 + dy, 4, 3.2), PIEL_J, { rad: 3, borde: false, sesgo: 0.05 });
    P.px(30, 29 + dy, PIEL_J.r[0]);
    P.px(34, 29 + dy, PIEL_J.r[0]);
    P.llenar(cur([[29, 29.6 + dy], [35, 29.6 + dy]], 1), PIEL_J.r[0]);
    P.px(31, 26 + dy, PIEL_J.r[2]);
    for (const x of [20, 41]) {
      P.llenar(rc(x, 29 + dy, 3, 2), ROJO_J);
      P.px(x + 1, 29 + dy, PIEL_J.r[1]);
    }
    // The grin: wide open, white teeth on top, a red tongue.
    const boca = inter(el(32, 34.6 + dy, 7 + (f ? 1.2 : 0), 3.6 + (f ? 1 : 0)), cabeza);
    P.llenar(boca, INK_J);
    P.llenar(inter(rc(0, 31 + dy, 64, 2 + (f ? 0 : -1)), boca), BLANCO_J);
    P.llenar(inter(el(32, 38.6 + dy + (f ? 1 : 0), 4, 2), boca), ROJO_J);
  } else {
    P.forma(cabeza, PIEL_J, { rad: 10, grad: 0.35 });
    // Grey hair round the back, a bald crown patch and the fold of the neck.
    const nuca = inter(cabeza, un(rc(0, 0, 64, 29 + dy), rr(19, 26 + dy, 26, 8, 3)));
    P.forma(nuca, PELO_J, { rad: 6, grad: 0.4, borde: true, sesgo: -0.25 });
    P.llenar(cur([[24, 35 + dy], [32, 37 + dy], [40, 35 + dy]], 1), PIEL_J.r[0]);
    P.llenar(cur([[25, 18 + dy], [32, 20 + dy], [39, 18 + dy]], 1), PELO_J.r[2]);
    P.llenar(cur([[22, 26 + dy], [24, 31 + dy]], 1), PELO_J.r[0]);
    P.llenar(cur([[42, 26 + dy], [40, 31 + dy]], 1), PELO_J.r[0]);
    P.px(21, 28 + dy, PELO_J.r[2]);
    P.px(43, 28 + dy, PELO_J.r[0]);
  }
}


// ---------------------------------------------------------------------------------------------
// Baticao · a chubby white ceramic mug of cocoa milk, half asleep: a wide mouth full of brown milk with cocoa lumps
// floating in it, a pale foam dome over it, a long spoon sticking out, a chocolate drip down the side and a drowsy
// face on the white (heavy lids, a small smile, blushes). Frame 1: the foam bobs, the spoon swings and a «z»
// floats up. From behind: the mug seen from the back, with the handle on the other side and the drip.
// ---------------------------------------------------------------------------------------------
const INK_B = '#24100e';
const TAZA: Mat = { r: ['#9a98b8', '#d0cee4', '#ffffff'], ol: INK_B, ol2: '#9a98b8' };
const LECHE: Mat = { r: ['#2e160e', '#4e2616', '#7a4026', '#a86a40'], ol: INK_B, ol2: '#2e160e' };
const ESPUMA_B: Mat = { r: ['#a87a50', '#dcae80', '#f8e4c4'], ol: INK_B, ol2: '#a87a50' };
const ROSA_B = '#f08a9a';

function baticao(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const bob = f ? 1 : 0;

  // Handle (a ceramic loop on the right from the front, on the left from behind).
  const asa = trazo(bez3([47, 29], [61, 27], [61, 49], [47, 48], 14), 2.5, 2.5);
  P.forma(T(asa), TAZA, { rad: 2.5, modo: 'cil', semi: 3 });
  P.llenar(T(cur(bez3([48, 32], [57, 31], [57, 45], [48, 45], 12), 1)), TAZA.r[0]);

  // Body of the mug, a foot ring and the rim.
  P.forma(rr(19, 58, 26, 4, 1.8), TAZA, { rad: 2, grad: 0.3 });
  const cuerpo = un(rr(14, 20, 36, 40, 9), el(32, 21, 18, 5.4));
  P.sombra(T(cuerpo), 0, 1, 1);
  P.forma(cuerpo, TAZA, { modo: 'cil', eje: 32, semi: 18, rad: 6, grad: 0.3, sesgo: 0.1 });

  // The mouth of the mug: dark brown milk with a shine, cocoa lumps floating in it.
  const boca = el(32, 21, 15.6, 4.6);
  P.forma(boca, LECHE, { rad: 2.6, grad: 0.5, sesgo: -0.1 });
  P.llenar(T(cur([[19, 20.4], [22, 22.2]], 1)), LECHE.r[3]);
  for (const [x, y] of [[20, 21], [42, 21], [26, 24], [37, 24], [41, 18]] as [number, number][]) {
    const yy = y + (f && x % 2 ? 1 : 0);
    P.llenar(T(rc(x, yy, 2, 2)), LECHE.r[3]);
    P.px(TX(x + 1), yy + 1, LECHE.r[0]);
  }

  // A chocolate drip running down the side of the mug.
  const gota = un(rc(41, 24, 4, 3), el(43, 28, 2.2, 2.6));
  P.forma(T(gota), LECHE, { rad: 2, grad: 0.3, sesgo: 0.1 });
  P.px(TX(42), 23, LECHE.r[3]);

  P.cara(() => {
    // Drowsy face on the white: heavy-lidded eyes, a small smile, two blushes.
    for (const cx of [24.2, 39.8]) {
      const ojo = el(cx, 36.6, 4.2, 3.6);
      P.aro(ojo, INK_B);
      P.llenar(ojo, TAZA.r[2]);
      P.llenar(inter(el(cx + (cx < 32 ? 1 : -1), 37.8, 2.1, 2.1), ojo), INK_B);
      P.px(Math.round(cx) + (cx < 32 ? 1 : -2), 37, TAZA.r[2]);
      P.llenar(inter(rc(Math.round(cx) - 5, 32, 10, 4), ojo), TAZA.r[0]);
      P.llenar(cur([[cx - 4.6, 35.8], [cx + 4.6, 35.8]], 1), INK_B);
    }
    P.llenar(cur([[28.4, 44.6], [32, 46.4], [35.6, 44.6]], 1), INK_B);
    for (const x of [17.5, 43.5]) {
      P.llenar(rc(x, 41, 3, 2), ROSA_B);
    }
  });
  P.dorso(() => {
    // Back: a simple pale band under the rim and a glint.
    P.llenar(T(cur([[17, 28], [26, 29.4]], 1)), TAZA.r[2]);
    P.llenar(rc(18, 48, 1, 6), TAZA.r[2]);
  });

  // Foam dome rising over the rim, with a few cocoa specks.
  const espuma = inter(el(30, 20 + bob * 0.6, 10, 8.4), rc(0, 0, 64, 21));
  P.sombra(espuma, 0, 1, 1);
  P.forma(espuma, ESPUMA_B, { rad: 5, grad: 0.4 });
  for (const [x, y] of [[24, 16], [30, 13], [34, 17], [29, 18]] as [number, number][]) {
    P.llenar(rc(x, y + bob, 2, 2), LECHE.r[2]);
    P.px(x, y + bob, LECHE.r[3]);
  }

  // The long spoon sticking out of the foam.
  const cx = f ? 42 : 46;
  const cy = f ? 3 : 5;
  P.llenar(T(cur([[33, 14], [cx, cy]], 2)), TAZA.r[1]);
  P.llenar(T(cur([[34, 15], [cx + 1, cy + 1]], 1)), TAZA.r[0]);
  P.forma(T(el(cx + (f ? -1 : 1.4), cy - 0.6, 3.4, 2.4)), TAZA, { rad: 2, borde: true });
  if (f) {
    // A sleepy «z» floating up from the top right.
    P.llenar(rc(TX(52), 6, 4, 1), TAZA.r[0]);
    P.llenar(T(cur([[55, 7], [52, 10]], 1)), TAZA.r[0]);
    P.llenar(rc(TX(52), 10, 4, 1), TAZA.r[0]);
  }
}

// ---------------------------------------------------------------------------------------------
// Culotouchi · a long, naughty hand (no gender: plain pink skin, no nails): an arm that comes out of a rolled blue
// sleeve and curls up in an S like a tentacle, ending in an open hand whose back has a sly face (sideways glance,
// one brow up, an «I didn't do it» smirk). Frame 1: the arm undulates the other way and the fingers wiggle. From
// behind: the palm, with its creases and the finger joints, and the sleeve's cuff button.
// ---------------------------------------------------------------------------------------------
const INK_C2 = '#3a1020';
const PIEL_C: Mat = { r: ['#b44a64', '#dc7088', '#f8a0b0', '#ffd2d8'], ol: INK_C2, ol2: '#b44a64' };
const MANGA: Mat = { r: ['#26346a', '#4660a4', '#7c98d8'], ol: INK_C2, ol2: '#26346a' };
const BLANCO_C = '#ffffff';

function culotouchi(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  // The hand is drawn in its own coordinates and placed a little smaller and higher (more arm below it).
  const HX = (x: number) => 32 + (x - 32) * 0.88;
  const HY = (y: number) => 23.6 + (y - 26) * 0.86;

  // The sleeve: a tube standing on the floor with a dark opening at the top.
  const manga = un(rr(19, 54, 26, 8, 2.6), el(32, 54.4, 13, 3.4));
  P.sombra(manga, 0, 1, 1);
  P.forma(manga, MANGA, { modo: 'cil', eje: 32, semi: 13, rad: 3 });
  P.llenar(el(32, 54.4, 10.4, 2.4), INK_C2);

  // The arm: an S-shaped tentacle, from the hand's wrist down into the sleeve.
  const ruta = f ? bez3([32, 31], [6, 35], [56, 46], [32, 56], 24) : bez3([32, 31], [58, 35], [8, 46], [32, 56], 24);
  const brazo = trazo(ruta, 5.2, 4.8);
  P.sombra(T(brazo), 1, 1, 1);
  P.forma(T(brazo), PIEL_C, { rad: 4.6, grad: 0.35 });
  // Gentle creases at the bends.
  for (const k of [8, 16]) {
    const [mx, my] = ruta[k];
    P.llenarSobre(T(cur([[mx - 3, my], [mx + 3, my + 1]], 1)), PIEL_C.r[0], PIEL_C);
  }

  // The front lip of the sleeve over the arm's base, a lighter cuff band and its button.
  P.forma(rr(19, 56, 26, 6, 2.4), MANGA, { modo: 'cil', eje: 32, semi: 13, rad: 3 });
  P.llenar(rc(20, 57, 24, 1), MANGA.r[2]);
  P.llenar(rc(21, 59, 22, 1), MANGA.r[0]);
  P.px(E ? 36 : 28, 58, BLANCO_C);
  P.px(E ? 37 : 29, 58, MANGA.r[2]);

  // The hand: fingers first (fanned out, wiggling), then the palm over their roots.
  const dedos: [number, number, number, number, number, number][] = [
    // base x, base y, tip x, tip y, wiggle, radius
    [22.5, 22, 15, 10, f ? 2.5 : -1.5, 2.5],
    [27.5, 18, 24.5, 3, f ? -2 : 1.5, 2.8],
    [33, 17, 34, 1.5, f ? 2 : -1.5, 2.9],
    [38.5, 18, 42, 4, f ? -2.5 : 1.5, 2.8],
    [43, 25, 56, 19, f ? 2.5 : -1.5, 3.1],
  ];
  for (const [bx, by, tx, ty, wg, r] of dedos) {
    const m = trazo(bez3([HX(bx), HY(by)], [HX((bx + tx) / 2), HY((by + ty) / 2 - 1)], [HX(tx + wg * 0.6), HY(ty + 3)], [HX(tx + wg), HY(ty)], 12), r * 0.92, r * 0.78);
    P.sombra(T(m), 0, 1, 1);
    P.forma(T(m), PIEL_C, { rad: 2.6, grad: 0.3 });
  }
  const palma = el(32, HY(26), 11.4, 9.4);
  P.sombra(T(palma), 0, 1, 1);
  P.forma(T(palma), PIEL_C, { rad: 8, grad: 0.35 });
  // Joint creases on the fingers.
  for (const [bx, by, tx, ty, wg] of dedos) {
    const jx = HX(bx + (tx + wg - bx) * 0.55);
    const jy = HY(by + (ty - by) * 0.55);
    P.llenarSobre(T(cur([[jx - 1.6, jy], [jx + 1.6, jy]], 1)), PIEL_C.r[1], PIEL_C);
  }

  P.cara(() => {
    // Sly face on the back of the hand: heavy lids, eyes glancing aside, one brow up, a lopsided smirk
    // (in frame 1 she whistles, as if nothing had happened).
    const mira = f ? -1 : 1;
    const y0 = HY(24.4);
    for (const cx of [28.2, 36.8]) {
      const ojo = el(cx, y0, 2.9, 3.3);
      P.aro(ojo, INK_C2);
      P.llenar(ojo, BLANCO_C);
      P.llenar(inter(el(cx + mira * 1.2, y0 + 1, 1.7, 2), ojo), INK_C2);
      P.llenar(inter(rc(Math.round(cx) - 4, Math.round(y0) - 4, 9, 3), ojo), PIEL_C.r[2]);
      P.llenar(cur([[cx - 3.2, y0 - 1], [cx + 3.2, y0 - 1.6]], 1), INK_C2);
    }
    P.llenar(cur([[24.4, y0 - 4], [27.6, y0 - 5.6], [30.8, y0 - 3.6]], 1), INK_C2);
    P.llenar(cur([[34, y0 - 5.4], [37.4, y0 - 6.8], [40.4, y0 - 4.8]], 1), INK_C2);
    const ym = HY(31);
    if (f) {
      P.llenar(el(32.5, ym, 1.6, 1.6), INK_C2);
      P.px(32, ym, PIEL_C.r[1]);
      // A whistled note drifts off to the left.
      P.llenar(rc(5, 27, 3, 2), INK_C2);
      P.llenar(rc(7, 20, 1, 8), INK_C2);
      P.llenar(cur([[8, 20], [11, 23]], 1), INK_C2);
    } else {
      P.llenar(cur([[28, ym], [32, ym + 1.8], [37, ym - 1]], 1), INK_C2);
      P.px(37, ym - 2, INK_C2);
      P.px(38, ym - 3, INK_C2);
    }
    for (const x of [22.4, 40.6]) {
      P.px(x, HY(29), PIEL_C.r[0]);
      P.px(x + 1, HY(29), PIEL_C.r[0]);
    }
  });
  P.dorso(() => {
    // The palm: heart, head and life lines, and a soft pad at the thumb's root.
    P.llenarSobre(cur([[23.5, HY(22)], [29, HY(19.6)], [36, HY(21)], [41, HY(19)]], 1), PIEL_C.r[1], PIEL_C);
    P.llenarSobre(cur([[23, HY(26.6)], [30, HY(25.4)], [38, HY(27.6)]], 1), PIEL_C.r[1], PIEL_C);
    P.llenarSobre(cur([[36, HY(22)], [33, HY(28)], [35, HY(33)]], 1), PIEL_C.r[1], PIEL_C);
    P.llenar(inter(el(40, HY(30), 3.2, 2.2), palma), PIEL_C.r[3]);
  });
  void TX;
}

// ---------------------------------------------------------------------------------------------
// Arcochin · the new Chinese arch of Usera (a paifang): two white concrete columns, a lintel and a curved roof of
// glazed turquoise tiles with upturned eaves, the columns and the lintel's sides covered with Okuda-style triangle
// facets (pink, turquoise, yellow, orange, purple) and little white clouds; on top, two gold dragons hugging a
// small brown bear; a friendly face on the plaque in the middle of the lintel and a red lantern hanging under it.
// Frame 1: the lantern swings and the dragons' heads bob. From behind: the plaque is a plain roundel with a cloud,
// the facets are laid out differently and the figures show their backs and tails.
// ---------------------------------------------------------------------------------------------
const INK_A = '#1e1430';
const CONCRETO: Mat = { r: ['#a8a4c4', '#d4d0e6', '#ffffff'], ol: INK_A, ol2: '#a8a4c4' };
const TEJA: Mat = { r: ['#0c5c68', '#2cc8c0', '#9af0e0'], ol: INK_A, ol2: '#0c5c68' };
const DRAGON: Mat = { r: ['#f08a24', '#ffd23a', '#ffd23a'], ol: INK_A, ol2: '#5a3018' };
const OSO: Mat = { r: ['#5a3018', '#9a5c2c', '#cc8c4c'], ol: INK_A, ol2: '#5a3018' };
const FAROL: Mat = { r: ['#a01428', '#e0282e', '#ff5aa0'], ol: INK_A, ol2: '#a01428' };
const OKUDA = ['#ff5aa0', TEJA.r[1], '#ffd23a', '#f08a24', '#8a4ad0'];

/** Triangle facets in Okuda colours over a mask (flat colours, a diagonal split in every cell). */
function facetas(P: Pintor, m: Mascara, s: number, semilla: number, ox = 0, oy = 0): void {
  m.each((x, y) => {
    const X = x - ox;
    const Y = y - oy;
    const i = Math.floor(X / s);
    const j = Math.floor(Y / s);
    const fx = (X - i * s) / s;
    const fy = (Y - j * s) / s;
    const t = (i + j) % 2 === 0 ? (fx + fy < 1 ? 0 : 1) : fx > fy ? 0 : 1;
    const h = (Math.imul(i + 11, 73856093) ^ Math.imul(j + 7, 19349663) ^ Math.imul(t + 3, 83492791) ^ Math.imul(semilla + 1, 40503)) >>> 0;
    P.px(x, y, OKUDA[h % 5]);
  });
}

function arcochin(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const sw = f ? 1 : 0;
  const sem = E ? 5 : 2;

  // Plinths and columns.
  for (const x of [10, 40]) P.forma(rr(x, 58, 14, 4, 1.6), CONCRETO, { rad: 2, grad: 0.3 });
  for (const x of [12, 42]) {
    P.forma(rr(x, 30, 10, 29, 1.4), CONCRETO, { modo: 'cil', eje: x + 5, semi: 5, rad: 3, grad: 0.3 });
    const cara = rc(x + 2, 45, 6, 12);
    facetas(P, cara, 3, sem, x, 0);
    P.aro(cara, INK_A);
  }

  // The lintel, with a facet panel on each side and a cloud over each.
  const dintel = rr(8, 32, 48, 12, 2);
  P.sombra(dintel, 0, 1, 1);
  P.forma(dintel, CONCRETO, { rad: 4, grad: 0.3 });
  for (const x of [10, 43]) {
    const pan = rc(x, 34, 11, 8);
    facetas(P, pan, 3, sem + 1, x, 34);
    P.aro(pan, INK_A);
    // A scalloped cloud pattern along the bottom of the panel.
    for (let k = 0; k < 3; k++) {
      const cx = x + 2.4 + k * 3.8;
      P.llenar(men(el(cx, 41, 2.3, 2.3), el(cx, 41, 1.3, 1.3), rc(0, 41, 64, 4)), CONCRETO.r[2]);
      P.llenar(cur([[cx, 41], [cx, 42]], 1), CONCRETO.r[2]);
    }
    P.llenar(rc(x, 42, 11, 0), CONCRETO.r[2]);
  }

  // Plaque in the middle of the lintel that hangs a bit below it.
  const placa = rr(23, 32, 18, 15, 3);
  P.sombra(placa, 0, 1, 1);
  P.forma(placa, CONCRETO, { rad: 5, grad: 0.3, sesgo: 0.15 });
  const marco = men(rc(24, 34, 16, 11), rc(25, 35, 14, 9));
  let k = 0;
  marco.each((x, y) => P.px(x, y, OKUDA[(((x + y) >> 1) + (E ? 1 : 0) + k++ * 0) % 5]));
  P.cara(() => {
    // Friendly face: round shining eyes, a wide smile, two pink cheeks.
    for (const cx of [28, 36]) {
      P.llenar(el(cx + 0.5, 39, 1.8, 2.5), INK_A);
      P.px(cx, 37, CONCRETO.r[2]);
      P.px(cx, 38, CONCRETO.r[2]);
    }
    P.llenar(cur([[27.5, 42], [30, 44.4], [34, 44.4], [36.5, 42]], 1), INK_A);
    for (const x of [24.4, 38.2]) {
      P.px(x, 42, OKUDA[0]);
      P.px(x + 1, 42, OKUDA[0]);
    }
  });
  P.dorso(() => {
    // Back of the plaque: a round seal with a swirl.
    P.aro(el(32, 39.5, 5, 5), INK_A);
    P.llenar(el(32, 39.5, 5, 5), OKUDA[2]);
    P.llenar(el(32, 39.5, 3, 3), OKUDA[0]);
    P.llenar(cur([[30, 40], [31.5, 38], [34, 39], [33, 41]], 1), INK_A);
  });

  // Lantern hanging from the plaque.
  const fx = sw ? 1.5 : 0;
  P.llenar(cur([[32, 47], [32 + fx * 0.5, 49]], 1), INK_A);
  const farol = el(32 + fx, 53, 4.2, 4.6);
  P.sombra(farol, 0, 1, 1);
  P.forma(farol, FAROL, { rad: 4, grad: 0.3 });
  P.llenar(rc(Math.round(30 + fx), 48.4, 5, 1), OKUDA[2]);
  P.llenar(rc(Math.round(30 + fx), 57.4, 5, 1), OKUDA[2]);
  P.llenar(cur([[32 + fx * 1.2, 58.4], [32 + fx * 1.8, 61.4]], 1), OKUDA[2]);
  P.cara(() => {
    P.px(Math.round(30 + fx), 52, FAROL.r[2]);
    P.llenar(cur([[32 + fx, 50], [32 + fx, 56]], 1), FAROL.r[0]);
  });

  // Brackets under the eaves: little coloured blocks.
  for (let x = 9; x < 55; x += 4) {
    P.llenar(rc(x, 29, 3, 3), OKUDA[((x - 9) / 4 + (E ? 2 : 0)) % 5 | 0]);
  }
  P.llenar(rc(8, 31, 48, 1), INK_A);

  // The roof: a curved band with upturned tips.
  const alisar = (a: number, b: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const sup: [number, number][] = [];
  const inf: [number, number][] = [];
  for (let x = 2; x <= 62; x += 1) {
    const u = Math.abs((x + 0.5 - 32) / 30);
    const tip = alisar(0.76, 1, u);
    sup.push([x, 17.5 + 6 * u * u - 5 * tip]);
    inf.push([x, 27.2 + 2.6 * u * u - 3.6 * tip]);
  }
  const tejado = poli([...sup, ...inf.slice().reverse()]);
  P.sombra(tejado, 0, 1, 1);
  P.forma(tejado, TEJA, { rad: 4, grad: 0.45 });
  // Tile rows (vertical grooves following the curve) and rounded end tiles along the lower edge.
  for (let x = 4; x < 61; x += 3) {
    const a = sup[x - 2];
    const b = inf[x - 2];
    P.llenarSobre(cur([[x, a[1] + 2], [x, b[1] - 1]], 1), TEJA.r[0], TEJA);
    P.llenarSobre(rc(x + 1, Math.round(a[1] + 2), 1, 2), TEJA.r[2], TEJA);
  }
  for (let x = 5; x < 60; x += 3) P.px(x, Math.round(inf[x - 2][1]) - 1, TEJA.r[2]);
  // Gold ridge along the top and ornaments at the tips.
  for (let x = 4; x <= 60; x++) P.px(x, Math.round(sup[x - 2][1]) + 0, TEJA.r[2]);
  for (const x of [3, 4, 59, 60]) P.px(x, Math.round(sup[x - 2][1]) - 1, OKUDA[2]);
  P.px(2, Math.round(sup[0][1]) - 1, OKUDA[3]);
  P.px(61, Math.round(sup[59][1]) - 1, OKUDA[3]);

  // On top: two gold dragons hugging a small brown bear.
  for (const lado of [0, 1]) {
    const M = (m: Mascara) => (lado ? espejo(m) : m);
    const MX = (x: number) => (lado ? 63 - x : x);
    const b = lado ? -sw : sw; // heads bob in opposition
    // Tail along the roof, then the neck rising beside the bear.
    const cola = trazo(bez3([13.6, 16.8], [17, 19.6], [22, 19.6], [22.6, 16], 12), 0.9, 1.7);
    const cuello = trazo(bez3([22.6, 16], [22.4, 12.6], [19.2, 11.6], [21.4, 8 - b * 0.6], 12), 1.7, 1.6);
    P.sombra(M(un(cola, cuello)), 0, 1, 1);
    P.forma(M(cola), DRAGON, { rad: 1.7, grad: 0.3, borde: true });
    P.forma(M(cuello), DRAGON, { rad: 1.7, grad: 0.3, borde: true });
    for (const [x, y] of [[17, 18.6], [20.4, 19], [20.2, 12.2], [19.6, 9.6]] as [number, number][]) P.px(MX(x), Math.round(y), DRAGON.r[0]);
    P.px(MX(13), 17, DRAGON.r[0]);
    // Head leaning on the bear's head.
    const hx = 22.6;
    const hy = 6.2 - b * 0.6;
    const cab = un(el(hx, hy, 3.3, 2.8), el(hx + 3.4, hy + 0.7, 2.3, 1.7));
    P.sombra(M(cab), 0, 1, 1);
    P.forma(M(cab), DRAGON, { rad: 2.2, grad: 0.3, sesgo: -0.45 });
    P.llenar(M(cur([[hx - 2, hy - 2.4], [hx - 3.6, hy - 4.6]], 1)), OKUDA[2]);
    P.llenar(M(cur([[hx + 0.6, hy - 2.6], [hx + 1.6, hy - 4.8]], 1)), OKUDA[2]);
    P.cara(() => {
      P.px(MX(Math.round(hx) + 1), Math.round(hy) - 1, CONCRETO.r[2]);
      P.px(MX(Math.round(hx) + 2), Math.round(hy) - 1, INK_A);
      P.px(MX(Math.round(hx) + 2), Math.round(hy), INK_A);
      P.px(MX(Math.round(hx) + 5), Math.round(hy) + 1, INK_A);
      P.px(MX(Math.round(hx) + 5), Math.round(hy) + 2, OKUDA[0]);
    });
  }
  const oso = un(el(32, 15.2, 6, 4.4), el(32, 8.8, 5, 4.4));
  P.sombra(T(oso), 0, 1, 1);
  for (const x of [27.8, 36.2]) P.forma(el(x, 5, 2, 2), OSO, { rad: 1.6, borde: true });
  P.forma(oso, OSO, { rad: 4.2, grad: 0.4 });
  P.cara(() => {
    P.px(30, 8, INK_A);
    P.px(34, 8, INK_A);
    P.llenar(el(32, 10.6, 1.9, 1.3), OSO.r[2]);
    P.px(32, 9.6, INK_A);
    P.llenar(el(32, 15.4, 3, 2), OSO.r[2]);
  });
  P.dorso(() => {
    P.llenar(cur([[32, 11], [32, 17]], 1), OSO.r[0]);
  });
  // The dragons' arms across the bear's belly.
  for (const lado of [0, 1]) {
    const M = (m: Mascara) => (lado ? espejo(m) : m);
    P.forma(M(trazo([[22.6, 15.2], [30, 16.2]], 1.4, 1.3)), DRAGON, { rad: 1.4, grad: 0.3 });
  }
}

// ---------------------------------------------------------------------------------------------
// Navicesta · a pretty wicker Christmas hamper with a visible weave, a braided arched handle with a big red bow and a
// cheerful face on its front, stuffed with festive goods: a strawberry-tequila bottle (the star), a bar of turrón, a
// ham leg with its frill, a few polvorones in their paper and a sprig of holly tucked into the rim. Frame 1: the
// goods hop and twinkle. From behind: the weave without a face, the bow's back and the goods peeking out.
// ---------------------------------------------------------------------------------------------
const INK_N2 = '#2a140c';
const MIMBRE: Mat = { r: ['#8a5420', '#c88a3a', '#f0c060', '#f8e4b8'], ol: INK_N2, ol2: '#8a5420' };
const LAZO: Mat = { r: ['#a01428', '#e0282e', '#ff94b8'], ol: INK_N2, ol2: '#a01428' };
const FRESA: Mat = { r: ['#a01428', '#f03c78', '#ff94b8'], ol: INK_N2, ol2: '#a01428' };
const ACEBO: Mat = { r: ['#14602c', '#2c9a44', '#2c9a44'], ol: INK_N2, ol2: '#14602c' };
const TURRON: Mat = { r: ['#c88a3a', '#f8e4b8', '#ffffff'], ol: INK_N2, ol2: '#8a5420' };
const JAMON: Mat = { r: ['#a01428', '#e0282e', '#e0784a'], ol: INK_N2, ol2: '#a01428' };
const ORO_N = '#ffd23a';
const BLANCO_N = '#ffffff';

function navicesta(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const hop = f ? -2 : 0;

  // The handle: a braided arch behind the goods.
  const asa = trazo(bez3([10, 38], [4, -8], [60, -8], [54, 38], 26), 2.3, 2.3);
  P.forma(T(asa), MIMBRE, { rad: 2.3, grad: 0.3, modo: 'cil', semi: 3 });
  asa.each((x, y) => {
    if ((x + y) % 4 === 0 && P.matEn(TX(x), y) === P.mat(MIMBRE)) P.px(TX(x), y, MIMBRE.r[0]);
  });

  // Turrón: a tilted bar in a red band.
  const barra = poli([[31, 21 + hop * 0.5], [44, 14 + hop * 0.5], [47, 20 + hop * 0.5], [34, 27 + hop * 0.5]]);
  P.sombra(T(barra), 0, 1, 1);
  P.forma(T(barra), TURRON, { rad: 3, grad: 0.4, borde: true });
  P.llenar(T(poli([[37, 17.8 + hop * 0.5], [40.6, 16 + hop * 0.5], [43.4, 21.6 + hop * 0.5], [39.8, 23.6 + hop * 0.5]])), LAZO.r[1]);
  P.px(TX(41), 19 + Math.round(hop * 0.5), ORO_N);
  P.px(TX(40), 20 + Math.round(hop * 0.5), ORO_N);

  // Ham leg: a plump red leg, a white fat edge, a bone with its paper frill.
  const jamon = el(16, 26 + hop * 0.5, 6.6, 7);
  P.sombra(T(jamon), 0, 1, 1);
  P.forma(T(trazo([[16, 20 + hop * 0.5], [12.6, 12.4 + hop]], 2, 1.7)), TURRON, { rad: 1.8, borde: true });
  P.forma(T(el(12, 11 + hop, 2.5, 2.2)), { r: [INK_N2, '#5a3018', '#5a3018'], ol: INK_N2 }, { rad: 2 });
  P.forma(T(jamon), JAMON, { rad: 5, grad: 0.4 });
  P.llenar(T(inter(el(16, 26 + hop * 0.5, 4.2, 4.6), rc(0, 0, 14, 64))), JAMON.r[2]);
  for (const [x, y] of [[11, 19], [12, 17], [14.5, 16]] as [number, number][]) P.px(TX(x), Math.round(y + hop * 0.6), BLANCO_N);
  P.llenar(T(cur([[11, 18 + hop * 0.6], [18, 17 + hop * 0.6]], 1)), BLANCO_N);
  for (let x = 10; x <= 18; x += 2) P.px(TX(x), 17 + (x % 4 === 0 ? 1 : 0) + Math.round(hop * 0.6), BLANCO_N);

  // The strawberry-tequila bottle, the star of the hamper.
  const botella = un(rr(22, 21 + hop, 11, 15, 3.4), rr(25, 13 + hop, 5, 10, 1.6));
  P.sombra(T(botella), 0, 1, 1);
  P.forma(T(botella), FRESA, { modo: 'cil', eje: 27.5, semi: 5.5, rad: 3, grad: 0.3 });
  P.forma(T(rc(25, 9 + hop, 5, 4)), { r: ['#c88a3a', ORO_N, ORO_N], ol: INK_N2, ol2: '#8a5420' }, { rad: 1.6 });
  P.cara(() => {
    // A white label with a little strawberry.
    P.llenar(rc(23, 26 + hop, 9, 7), BLANCO_N);
    P.aro(rc(23, 26 + hop, 9, 7), INK_N2);
    P.llenar(el(27.5, 30 + hop, 2.4, 2.2), FRESA.r[1]);
    P.px(26, 27 + hop, ACEBO.r[1]);
    P.px(27, 27 + hop, ACEBO.r[1]);
    P.px(28, 27 + hop, ACEBO.r[1]);
    P.px(27, 30 + hop, BLANCO_N);
  });
  P.dorso(() => {
    P.llenar(T(rc(23, 26 + hop, 9, 5)), FRESA.r[0]);
    P.llenar(T(rc(24, 27 + hop, 7, 1)), FRESA.r[2]);
  });
  P.llenar(T(cur([[24, 22 + hop], [24, 34 + hop]], 1)), FRESA.r[2]);

  // Polvorones in their paper, peeking over the rim on the right.
  for (const [x, y, k] of [[44, 29, 0], [50, 30, 1], [46.4, 25.4, 2]] as [number, number, number][]) {
    const yy = y + (f ? (k % 2 ? 1 : -1) : 0) * 0;
    const polvoron = el(x, yy + (f && k === 2 ? -1 : 0), 3.4, 2.8);
    P.forma(T(polvoron), TURRON, { rad: 2.6, grad: 0.4 });
    P.llenar(T(cur([[x - 5.2, yy - 1], [x - 3.4, yy]], 1)), TURRON.r[2]);
    P.llenar(T(cur([[x + 3.4, yy], [x + 5.2, yy - 1]], 1)), TURRON.r[2]);
    P.px(TX(Math.round(x) - 6), Math.round(yy - 1), LAZO.r[1]);
    P.px(TX(Math.round(x) + 5), Math.round(yy - 1), LAZO.r[1]);
  }

  // The basket: a rope rim and a weave body.
  const cuerpo = poli([[8, 38], [56, 38], [53, 56], [49, 61], [15, 61], [11, 56]]);
  P.sombra(cuerpo, 0, 1, 1);
  P.forma(cuerpo, MIMBRE, { rad: 7, grad: 0.35, sesgo: 0.1 });
  cuerpo.each((x, y) => {
    if (y < 40) return;
    const fila = Math.floor((y - 40) / 3);
    const cuerda = (y - 40) % 3 === 0;
    const en = P.matEn(x, y) === P.mat(MIMBRE);
    if (!en) return;
    if (cuerda) P.px(x, y, MIMBRE.r[0]);
    else if ((x + (fila % 2) * 3) % 6 === 0) P.px(x, y, MIMBRE.r[0]);
    else if ((x + (fila % 2) * 3) % 6 === 1) P.px(x, y, MIMBRE.r[3]);
  });
  const borde = rr(5, 31, 54, 8, 3.6);
  P.sombra(borde, 0, 1, 1);
  P.forma(borde, MIMBRE, { rad: 3.6, grad: 0.3, sesgo: 0.15 });
  for (let x = 7; x < 58; x += 3) {
    P.llenarSobre(rc(x, 33, 1, 5), MIMBRE.r[0], MIMBRE);
    P.px(x + 1, 33, MIMBRE.r[3]);
  }

  P.cara(() => {
    // Cheerful face on the front of the basket.
    for (const cx of [24.4, 39.6]) {
      const ojo = el(cx, 46, 3.8, 4.2);
      P.aro(ojo, INK_N2);
      P.llenar(ojo, BLANCO_N);
      P.llenar(inter(el(cx + (f ? 0.6 : -0.6), 46.8, 2.1, 2.5), ojo), INK_N2);
      P.px(Math.round(cx) + (f ? 0 : -1), 45, BLANCO_N);
    }
    const boca = inter(el(32, 51.4, 6.4, 4.6), rc(0, 51, 64, 8));
    P.llenar(boca, INK_N2);
    P.llenar(inter(el(32, 56.6, 3.6, 2.4), boca), FRESA.r[1]);
    P.llenar(inter(rc(0, 51, 64, 1), boca), BLANCO_N);
    for (const x of [16.6, 46.4]) {
      P.llenar(rc(x, 50, 3, 2), FRESA.r[2]);
    }
  });

  // A sprig of holly tucked into the rim.
  const hoja = (x: number, y: number, dx: number, dy: number): void => {
    const m = trazo([[x, y], [x + dx, y + dy]], 1.9, 0.5);
    P.forma(T(m), ACEBO, { rad: 1.6, grad: 0.3 });
  };
  hoja(12, 33, -5, -5);
  hoja(12, 33, 5, -6);
  hoja(12, 34, -6, 1);
  for (const [x, y] of [[12, 32], [14, 33], [11, 34]] as [number, number][]) {
    P.px(TX(x), y, LAZO.r[1]);
    P.px(TX(x), y - 1, LAZO.r[2]);
  }

  // The red bow at the top of the handle.
  const lazoI = poli([[31, 8], [22, 2.4], [19.6, 7], [22, 12], [31, 10]]);
  const lazoD = poli([[33, 8], [42, 2.4], [44.4, 7], [42, 12], [33, 10]]);
  for (const m of [lazoI, lazoD]) {
    P.sombra(m, 0, 1, 1);
    P.forma(m, LAZO, { rad: 3.2, grad: 0.4 });
  }
  P.llenar(cur([[30, 8.6], [22.5, 6.4]], 1), LAZO.r[0]);
  P.llenar(cur([[34, 8.6], [41.5, 6.4]], 1), LAZO.r[0]);
  P.forma(el(32, 8.6, 3, 3), LAZO, { rad: 2.4 });
  P.px(31, 7, LAZO.r[2]);

  if (f) {
    // Twinkles around the goods.
    for (const [x, y] of [[19, 6], [51, 12], [36, 11]] as [number, number][]) {
      P.px(TX(x), y, BLANCO_N);
      P.px(TX(x) - 1, y, ORO_N);
      P.px(TX(x) + 1, y, ORO_N);
      P.px(TX(x), y - 1, ORO_N);
      P.px(TX(x), y + 1, ORO_N);
    }
  }
}

export const LOTE_H: Dibujo2[] = [
  { id: 'culotouchi', nombre: 'Culotouchi', dibujar: culotouchi },
  { id: 'baticao', nombre: 'Baticao', dibujar: baticao },
  { id: 'josex', nombre: 'Josex', dibujar: josex },
  { id: 'arcochin', nombre: 'Arcochin', dibujar: arcochin },
  { id: 'navicesta', nombre: 'Navicesta', dibujar: navicesta },
];
void [bez3];
