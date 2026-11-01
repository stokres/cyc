// PokéUsera · Edición Jarra (arte v2): batch h of the 64×64 useritos (same conventions as useritos2.ts).
// Culotouchi, Baticao, Josex and Arcochin.
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
  const cabeza = el(32, 24 + dy, 16, 15);
  P.sombra(cabeza, 0, 1, 1);
  if (!E) {
    P.forma(cabeza, PIEL_J, { rad: 10, grad: 0.35 });
    // Short grey hair: a cap with a receding hairline, and tufts over the ears.
    const cara = un(el(32, 29 + dy, 14.6, 15.6), el(22.5, 17.5 + dy, 4.2, 3.2), el(41.5, 17.5 + dy, 4.2, 3.2));
    const pelo = men(cabeza, cara);
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
    P.forma(el(32, 27.6 + dy, 4, 3.2), PIEL_J, { rad: 3, borde: 'suave', sesgo: 0.1 });
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
    const nuca = inter(cabeza, un(rc(0, 0, 64, 28 + dy), el(32, 28 + dy, 13, 4.6)));
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
// Baticao · a chubby glass mug of cocoa milk, wrapped up for a nap: brown milk with a pale foam dome on top, little
// dark cocoa lumps floating in it and in the foam, a long spoon sticking out, a red-and-cream plaid blanket over
// its shoulders with the tails hanging, and a drowsy face (heavy lids, a small smile). Frame 1: the foam bobs,
// the spoon swings and a «z» floats up. From behind: the plaid blanket, the handle on the other side, the lumps.
// ---------------------------------------------------------------------------------------------
const INK_B = '#24100e';
const VIDRIO_B: Mat = { r: ['#6a86a8', '#a8c4de', '#e8f4ff'], ol: INK_B, ol2: '#6a86a8' };
const LECHE: Mat = { r: ['#2e160e', '#4e2616', '#7a4026', '#a86a40'], ol: INK_B, ol2: '#2e160e' };
const ESPUMA_B: Mat = { r: ['#a87a50', '#dcae80', '#f8e4c4'], ol: INK_B, ol2: '#a87a50' };
const MANTA: Mat = { r: ['#7c1424', '#c02c3c', '#e04a54'], ol: INK_B, ol2: '#7c1424' };
const CREMA_B = '#f8e4c4';

function baticao(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const bob = f ? 1 : 0;

  // Handle (a glass loop on the right from the front, on the left from behind).
  const asa = trazo(bez3([48, 27], [60, 26], [60, 46], [48, 47], 14), 2.4, 2.4);
  P.forma(T(asa), VIDRIO_B, { rad: 2.4, modo: 'cil', semi: 3 });
  P.llenar(T(cur(bez3([49, 30], [57, 29], [57, 43], [49, 44], 12), 1)), LECHE.r[2]);

  // Glass body and the milk inside it.
  const vaso = un(rr(14, 15, 36, 44, 5.4), el(32, 15, 18, 3.6));
  P.sombra(T(vaso), 0, 1, 1);
  P.forma(vaso, VIDRIO_B, { modo: 'cil', eje: 32, semi: 18, rad: 3.4 });
  const leche = rr(16.4, 19, 31.2, 38.4, 3.6);
  P.forma(leche, LECHE, { modo: 'cil', eje: 32, semi: 15, borde: false, rim: false, grad: 0.15, rad: 2.2, sesgo: 0.1 });
  // Glass highlights along the wall and the thick base.
  P.llenar(rc(15, 21, 1, 16), VIDRIO_B.r[2]);
  P.llenar(rc(48, 22, 1, 14), VIDRIO_B.r[1]);

  // Cocoa lumps floating in the milk.
  const grumos: [number, number][] = [[19, 22], [43, 23], [20, 33], [44, 34], [31, 22]];
  for (const [x, y] of grumos) {
    const yy = y + (f && x % 2 ? -1 : 0);
    P.llenar(T(rc(x, yy, 3, 2)), LECHE.r[3]);
    P.llenar(T(rc(x, yy + 1, 3, 1)), LECHE.r[2]);
    P.px(TX(x + 2), yy + 1, LECHE.r[0]);
  }
  P.cara(() => {
    // Drowsy face on the milk: big heavy-lidded eyes, a small smile, two blushes.
    for (const cx of [24.6, 39.4]) {
      const ojo = el(cx, 28.4, 4, 3.4);
      P.aro(ojo, INK_B);
      P.llenar(ojo, CREMA_B);
      P.llenar(inter(el(cx + (cx < 32 ? 1 : -1), 29.6, 2, 2), ojo), INK_B);
      P.px(Math.round(cx) + (cx < 32 ? 1 : -2), 28, CREMA_B);
      P.llenar(inter(rc(Math.round(cx) - 5, 24, 10, 4), ojo), LECHE.r[2]);
      P.llenar(cur([[cx - 4.4, 27.6], [cx + 4.4, 27.6]], 1), INK_B);
    }
    P.llenar(cur([[28.5, 35], [32, 36.6], [35.5, 35]], 1), INK_B);
    for (const x of [19, 43]) {
      P.llenar(rc(x, 32, 3, 2), MANTA.r[1]);
      P.px(x + 1, 32, ESPUMA_B.r[1]);
    }
  });
  P.dorso(() => {
    P.llenar(cur([[24, 24], [26, 28]], 1), LECHE.r[3]);
    P.llenar(cur([[37, 30], [39, 34]], 1), LECHE.r[3]);
  });

  // Foam dome rising over the rim, with a few cocoa specks.
  const espuma = un(el(32, 16.4, 16, 3.2), inter(el(31, 14 + bob * 0.6, 14.2, 7), rc(0, 0, 64, 18)));
  P.sombra(espuma, 0, 1, 1);
  P.forma(espuma, ESPUMA_B, { rad: 5, grad: 0.4 });
  for (const [x, y] of [[24, 12], [31, 9], [38, 13], [42, 16], [27, 16]] as [number, number][]) {
    P.llenar(rc(x, y + bob, 2, 2), LECHE.r[2]);
    P.px(x, y + bob, LECHE.r[3]);
  }

  // The plaid blanket wrapped round the body up to the chin: a rolled collar, a flap hanging at one side.
  const envoltorio = un(rr(11, 38, 42, 22, 7), poli([[11, 43], [7, 47], [8, 57], [14, 57]]));
  P.sombra(T(envoltorio), 0, 1, 1);
  P.forma(T(envoltorio), MANTA, { rad: 5, grad: 0.4, borde: true });
  const cuello = un(inter(envoltorio, rc(0, 0, 64, 42)));
  T(envoltorio).each((x, y) => {
    const xx = E ? 63 - x : x;
    const v = xx % 4 === 0;
    const h = y % 4 === 0;
    if (v && h) P.px(x, y, MANTA.r[0]);
    else if (v || h) P.px(x, y, CREMA_B);
  });
  P.llenar(T(inter(cuello, rc(0, 38, 64, 1))), CREMA_B);
  P.llenar(T(cur([[12, 41.5], [32, 44], [52, 41.5]], 1)), MANTA.r[0]);
  // Fringe on the hanging flap.
  for (const y of [49, 51, 53, 55]) P.px(TX(7), y, CREMA_B);
  // Highlight fold on the rolled collar.
  

  // The long spoon sticking out of the foam.
  const cx = f ? 44 : 47;
  const cy = f ? 3 : 5;
  P.sombra(T(trazo([[33, 15], [cx, cy]], 1.2, 1.2)), 0, 1, 1);
  P.llenar(T(cur([[33, 15], [cx, cy]], 2)), VIDRIO_B.r[1]);
  P.llenar(T(cur([[34, 16], [cx + 1, cy + 1]], 1)), VIDRIO_B.r[0]);
  P.forma(T(el(cx + (f ? -1 : 1.4), cy - 0.6, 3.4, 2.4)), VIDRIO_B, { rad: 2, borde: true });
  if (f) {
    // A sleepy «z» floating up from the top right.
    P.llenar(rc(TX(52), 6, 4, 1), VIDRIO_B.r[2]);
    P.llenar(T(cur([[55, 7], [52, 10]], 1)), VIDRIO_B.r[2]);
    P.llenar(rc(TX(52), 10, 4, 1), VIDRIO_B.r[2]);
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

export const LOTE_H: Dibujo2[] = [
  { id: 'culotouchi', nombre: 'Culotouchi', dibujar: culotouchi },
  { id: 'baticao', nombre: 'Baticao', dibujar: baticao },
  { id: 'josex', nombre: 'Josex', dibujar: josex },
  { id: 'arcochin', nombre: 'Arcochin', dibujar: arcochin },
];
void [bez3];
