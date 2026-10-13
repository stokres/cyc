// PokéUsera · Edición Jarra (arte v2): batch b of the 64×64 useritos (same conventions as useritos2.ts).
import type { Dibujo2 } from './useritos2';
import { Pintor, Mascara, bez3, cur, el, espejo, inter, men, mover, par, poli, rc, rr, trazo, un, type Mat } from './pintor';

// ---------------------------------------------------------------------------------------------
// Cajonazo · flamenco cajón with arms and a lively face, mid-beat. Back view shows the sound hole.
// ---------------------------------------------------------------------------------------------
const MADERA: Mat = { r: ['#5c2a12', '#8e4a1c', '#bf7430', '#e5a653'], ol: '#2c1208', ol2: '#5c2a12', rim: '#d98c3e' };
const TAPA: Mat = { r: ['#bf7430', '#e5a653', '#f7c97c', '#ffe6a8'], ol: '#5c2a12', ol2: '#8e4a1c' };
const PIEL: Mat = { r: ['#c0683c', '#f0a064', '#ffd29a'], ol: '#2c1208', ol2: '#8e4a1c' };
const BLANCO_C = '#fff4e0';
const TINTA_C = '#2c1208';

function cajonazo(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? 1 : 0; // the whole box dips on the second beat
  // Hands: one high, one low, swapping on every beat.
  const hiY = 15 + (f ? 4 : 0);
  const loY = 33 - (f ? 4 : 0);
  const brazoI = un(trazo([[17, 31 + dy], [8, 29 + dy], [7, hiY + 8]], 3.6, 3.1));
  const brazoD = un(trazo([[46, 34 + dy], [56, 40 + dy], [57, loY + 7]], 3.6, 3.1));
  P.forma(T(brazoI), PIEL, { rad: 2.6 });
  P.forma(T(brazoD), PIEL, { rad: 2.6 });

  // Feet.
  P.forma(un(el(24, 56, 6.5, 3), el(40, 56, 6.5, 3)), MADERA, { rad: 2.5, sesgo: -0.5 });

  // The box: top face in perspective, then the frame, then the lighter front plate.
  const cuerpoM = rr(15, 15 + dy, 34, 38 - dy, 2);
  const tapaSup = poli([[16, 15 + dy], [48, 15 + dy], [45, 10 + dy], [19, 10 + dy]]);
  P.sombra(cuerpoM, 1, 1, 1);
  P.forma(tapaSup, TAPA, { modo: 'plano', paso: 3 });
  P.forma(cuerpoM, MADERA, { rad: 6, grad: 0.35 });
  const placa = rr(19, 19 + dy, 26, 30 - dy, 1);
  P.forma(placa, TAPA, { rad: 4, grad: 0.25 });
  // Grain: vertical streaks in the plate and the frame, with breaks.
  const vetas: [number, number, number][] = [[22, 22, 8], [22, 36, 7], [27, 20, 5], [27, 31, 6], [27, 42, 4], [37, 21, 6], [37, 33, 5], [42, 24, 9], [42, 38, 6]];
  for (const [x, y, l] of vetas) P.llenarSobre(rc(TX(x), y + dy, 1, l), '#bf7430', TAPA);
  for (const [x, y, l] of [[29, 24, 3], [34, 40, 3], [24, 44, 3]] as [number, number, number][]) P.llenarSobre(rc(TX(x), y + dy, 1, l), '#f7c97c', TAPA);
  for (const [x, y, l] of [[17, 22, 9], [17, 38, 6], [47, 26, 8]] as [number, number, number][]) P.llenarSobre(rc(x, y + dy, 1, l), '#8e4a1c', MADERA);
  // Screws on the plate corners.
  for (const [x, y] of [[21, 21], [43, 21], [21, 46], [43, 46]] as [number, number][]) {
    P.px(x, y + dy, '#5c2a12');
  }

  P.cara(() => {
    // Big eyes, looking at the hand that is up; thick happy brows.
    for (const cx of [25.5, 38.5]) {
      const ojo = el(cx, 28 + dy, 4.2, 5.2);
      P.llenar(ojo, BLANCO_C);
      P.aro(ojo, TINTA_C);
      const mira = f ? 1 : -1;
      P.llenar(el(cx + mira * 1.4, 28.8 + dy, 2.4, 3), TINTA_C);
      P.px(cx + mira * 1.4 - 1, 27 + dy, BLANCO_C);
      P.px(cx + mira * 1.4 - 1, 28 + dy, BLANCO_C);
    }
    P.llenar(cur([[21, 21 + dy], [25, 20 + dy], [29, 22 + dy]], 1), TINTA_C);
    P.llenar(cur([[35, 22 + dy], [39, 20 + dy], [43, 21 + dy]], 1), TINTA_C);
    // Open mouth shouting «¡olé!»: teeth on top, tongue at the bottom.
    const boca = inter(el(32, 38 + dy, 8.5, 6.4), rc(20, 36 + dy, 24, 10));
    P.llenar(boca, TINTA_C);
    P.llenar(rc(25, 37 + dy, 14, 2), BLANCO_C);
    P.llenar(inter(el(32, 44 + dy, 5, 3), boca), '#e8647a');
    P.px(32, 43 + dy, '#ffb0b8');
    P.llenar(rc(22, 35 + dy, 2, 2), '#e8647a');
    P.llenar(rc(41, 35 + dy, 2, 2), '#e8647a');
  });
  P.dorso(() => {
    // The sound hole of the back plate: a dark round mouth with a lit rim, a brace across the top.
    P.llenar(rc(20, 24 + dy, 24, 2), '#bf7430');
    P.llenar(rc(20, 25 + dy, 24, 1), '#8e4a1c');
    const hueco = el(32, 37 + dy, 6.6, 6.6);
    P.llenar(hueco, TINTA_C);
    P.aro(hueco, '#8e4a1c');
    P.aro(un(hueco, el(32, 37 + dy, 7.6, 7.6)), '#f7c97c');
    P.llenar(inter(el(32, 38.5 + dy, 4.6, 4.6), rc(20, 38 + dy, 24, 10)), '#5c2a12');
    P.px(27, 33 + dy, '#f7c97c');
  });

  // Hands (open, fingers spread), in front of everything.
  const mano = (x: number, y: number, arriba: boolean, dir: number) => {
    const sy = arriba ? -1 : 1;
    const palma = el(x, y, 4.8, 4.2);
    const dedo = (dx: number, largo: number) => trazo([[x + dx, y + sy * 2], [x + dx * 1.08, y + sy * largo]], 1.15, 1.05);
    const dedos = un(dedo(-3.3, 8), dedo(0, 9), dedo(3.3, 8));
    const pulgar = trazo([[x + dir * 4, y + 0.5], [x + dir * 7, y - sy * 2.2]], 1.5, 1.2);
    P.forma(un(palma, dedos, pulgar), PIEL, { rad: 2.4 });
  };
  const hxI = 7,
    hxD = 57;
  const dxm = (x: number) => (E ? 63 - x : x);
  mano(dxm(hxI), hiY, true, E ? -1 : 1);
  mano(dxm(hxD), loY, true, E ? 1 : -1);
  // Beat marks: little sparks next to each hand.
  const m1 = f ? '#ffe6a8' : '#f7c97c';
  P.llenar(cur([[dxm(hxD - 4), loY - 9], [dxm(hxD - 6), loY - 12]], 1), m1);
  P.llenar(cur([[dxm(hxD), loY - 12], [dxm(hxD), loY - 15]], 1), m1);
  P.llenar(cur([[dxm(hxI + 5), hiY - 8], [dxm(hxI + 7), hiY - 10]], 1), m1);
  void men;
  void mover;
  void bez3;
  void par;
  void poli;
}

// ---------------------------------------------------------------------------------------------
// Lentejasur · dirty brown lentil, shifty eyes, a slice of chorizo stuck on it, a ghostly wisp below.
// ---------------------------------------------------------------------------------------------
const LENTEJA: Mat = { r: ['#5a3c18', '#8c6430', '#bc9040', '#e6c070'], ol: '#1e1008', ol2: '#5a3c18' };
const CHORIZO: Mat = { r: ['#7a1420', '#c02c2c', '#e8584a'], ol: '#1e1008', ol2: '#7a1420' };
const ESPECTRO: Mat = { r: ['#8e84b8', '#bfb6e0', '#e8e2fa'], ol: '#3c2c5c', ol2: '#8e84b8', rim: '#a0e8ff' };
const BLANCO_L = '#f6efe8';
const GRASA = '#f6b090';
const NEGRO_L = '#1e1008';

function lentejasur(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? 1 : 0;
  const sway = f ? 2 : -1;

  // Ghostly wisp trailing below: a scalloped little skirt that tapers into a curling tail, plus puffs.
  const falda = un(el(19, 43 - sway * 0.5, 5, 4.4), el(29.5, 46, 6, 5.4), el(40, 43 + sway * 0.5, 5, 4.4), rc(18, 36, 24, 8));
  const rabo = trazo(bez3([30, 46], [24, 52], [40, 53 - sway], [33, 59 + sway * 0.5], 16), 5.2, 1.0);
  const punta = trazo(bez3([33, 59 + sway * 0.5], [30, 63], [37, 64], [38, 61], 8), 1.2, 0.6);
  P.forma(un(falda, rabo, punta), ESPECTRO, { rad: 4.5, grad: 0.4 });
  P.forma(el(TX(10), 51 - sway, 2.8, 2.6), ESPECTRO, { rad: 2 });
  P.forma(el(TX(5), 45 + sway, 1.8, 1.8), ESPECTRO, { rad: 1.4 });
  P.forma(el(TX(53), 49 + sway, 2.2, 2.2), ESPECTRO, { rad: 1.6 });

  // The lentil: a thick edge underneath and the dished top face.
  const canto = el(30, 29 + dy, 22.5, 16);
  const cara = el(30, 26 + dy, 22.5, 15.5);
  P.sombra(canto, 0, 2, 1);
  P.forma(canto, LENTEJA, { rad: 7, grad: 0.2, sesgo: -0.45 });
  P.forma(cara, LENTEJA, { rad: 10, grad: 0.45 });
  // The raised lip of the disc: lit along the top-left, shaded along the bottom-right.
  const labio = men(cara, el(30, 26.6 + dy, 20.6, 13.8));
  P.tono(T(inter(labio, un(rc(0, 0, 30, 27 + dy), rc(0, 0, 64, 16 + dy)))), LENTEJA, 1);
  P.tono(T(inter(labio, rc(24, 33 + dy, 40, 10))), LENTEJA, -1);
  // Dirt: smudges and specks.
  P.tono(T(el(42, 36 + dy, 6, 3)), LENTEJA, -1);
  P.tono(T(el(15, 21 + dy, 4.5, 2.5)), LENTEJA, -1);
  P.tono(T(el(21, 15 + dy, 7, 3)), LENTEJA, 1);
  const motas: [number, number, number][] = [[14, 31, 0], [19, 37, 0], [27, 38, 3], [36, 35, 0], [47, 29, 3], [41, 22, 0], [12, 26, 3], [33, 13, 0], [24, 11, 3], [49, 34, 0], [9, 23, 0], [29, 33, 3], [39, 30, 0]];
  for (const [x, y, c] of motas) P.llenarSobre(rc(TX(x), y + dy, 1, 1), LENTEJA.r[c === 0 ? 0 : 3], LENTEJA);
  // Wrinkles of the skin near the rim.
  for (const [pts, c] of [
    [[[11, 22], [13, 25], [12, 29]], 0],
    [[[50, 24], [49, 28], [50, 31]], 0],
    [[[14, 18], [18, 15]], 3],
    [[[26, 40], [31, 41], [36, 40]], 0],
  ] as [[number, number][], number][]) {
    P.llenarSobre(T(cur(pts.map(([x, y]) => [x, y + dy] as [number, number]), 1)), LENTEJA.r[c], LENTEJA);
  }
  for (const [x, y] of [[17, 34], [38, 38], [45, 26]] as [number, number][]) {
    P.llenarSobre(rc(TX(x), y + dy, 2, 1), LENTEJA.r[0], LENTEJA);
  }
  P.dorso(() => {
    // The little scar of the lentil (its hilum), a crack and a worn patch.
    const cicatriz = el(31, 22 + dy, 3.4, 2.2);
    P.llenarSobre(cicatriz, '#5a3c18', LENTEJA);
    P.llenarSobre(el(31, 22.8 + dy, 2, 1), '#bc9040', LENTEJA);
    P.llenarSobre(cur([[22, 33 + dy], [25, 35 + dy], [24, 38 + dy]], 1), '#5a3c18', LENTEJA);
    P.llenarSobre(cur([[36, 32 + dy], [40, 34 + dy], [44, 33 + dy]], 1), '#5a3c18', LENTEJA);
    P.llenarSobre(rc(37, 33 + dy, 6, 1), '#8c6430', LENTEJA);
  });

  P.cara(() => {
    // Shifty eyes glancing sideways (they swap sides each frame), heavy suspicious lids.
    const mira = f ? -1 : 1;
    for (const cx of [21, 35]) {
      const ojo = el(cx, 29 - 2 + dy, 5.2, 4.4);
      P.llenar(ojo, BLANCO_L);
      P.aro(ojo, NEGRO_L);
      P.llenar(el(cx + mira * 2.4, 29.6 - 2 + dy, 2.3, 2.6), NEGRO_L);
      P.px(Math.round(cx + mira * 2.4) - 1, 28 - 2 + dy, BLANCO_L);
      // Lid: the top half of the eye is covered by the lentil's own skin, with a dark lash line.
      const lid = inter(ojo, rc(cx - 7, 20 - 2 + dy, 15, 8));
      P.llenar(lid, '#8c6430');
      P.llenar(inter(el(cx, 29 - 2 + dy, 5.2, 4.4), rc(cx - 7, 27 - 2 + dy, 15, 1)), NEGRO_L);
      P.llenar(rc(cx - 4, 26 - 2 + dy, 9, 1), '#bc9040');
    }
    // Brows slanting down towards the nose: suspicious.
    P.llenar(cur([[15, 22 - 2 + dy], [20, 23 - 2 + dy], [25, 25 - 2 + dy]], 1), NEGRO_L);
    P.llenar(cur([[31, 25 - 2 + dy], [36, 23 - 2 + dy], [41, 22 - 2 + dy]], 1), NEGRO_L);
    P.llenar(cur([[15, 23 - 2 + dy], [20, 24 - 2 + dy]], 1), '#5a3c18');
    // A lopsided sly smirk with one fang.
    const sonrisa = cur([[22, 37 - 2 + dy], [27, 39 - 2 + dy], [33, 38 - 2 + dy], [37, 35 - 2 + dy]], 1);
    P.llenar(sonrisa, NEGRO_L);
    P.px(38, 34 - 2 + dy, NEGRO_L);
    P.px(30, 40 - 2 + dy, BLANCO_L);
    P.px(30, 39 - 2 + dy, BLANCO_L);
    P.px(21, 36 - 2 + dy, '#5a3c18');
    // A drop of nervous sweat.
    P.px(51, 26 - 2 + dy, '#e8e2fa');
    P.px(51, 27 - 2 + dy, '#bfb6e0');
    P.px(50, 28 - 2 + dy, '#bfb6e0');
    P.px(51, 28 - 2 + dy, '#e8e2fa');
  });

  // The slice of chorizo stuck to its head (viewer's right from the front).
  const rodaja = T(el(47, 15 + dy, 8.2, 7.4));
  const miga = T(el(47, 15 + dy, 5.6, 4.8));
  P.sombra(rodaja, -1, 2, 1);
  P.forma(rodaja, CHORIZO, { rad: 4, grad: 0.35 });
  P.llenar(miga, '#e8584a');
  P.aro(miga, '#7a1420');
  for (const [x, y] of [[44, 13], [48, 12], [50, 16], [45, 17], [48, 18]] as [number, number][]) {
    P.px(TX(x), y + dy, GRASA);
    P.px(TX(x + 1), y + dy, GRASA);
  }
  P.px(TX(44), 12 + dy, '#f6efe8');
  P.px(TX(52), 19 + dy, '#c02c2c');
  P.px(TX(53), 18 + dy, '#c02c2c');
  void men;
  void par;
  void poli;
  void rr;
}

// ---------------------------------------------------------------------------------------------
// Tragaperras · the bar's slot machine: smug eyes, reels (cherry, bell, 7), a grin, a lever, flashing lights.
// ---------------------------------------------------------------------------------------------
const MAQUINA: Mat = { r: ['#6a1220', '#a8222e', '#d83a3a', '#f26a5c'], ol: '#2a0a12', ol2: '#6a1220', rim: '#ff9a86' };
const LATON: Mat = { r: ['#8a5a10', '#d4901c', '#ffcc40', '#fff0a0'], ol: '#2a0a12', ol2: '#8a5a10' };
const BLANCO_T = '#fff6e0';
const NEGRO_T = '#2a0a12';
const LENGUA_T = '#e8647a';
const VERDE_T = '#3ea03a';

function tragaperras(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? 1 : 0; // the cabinet shakes down a pixel with the lever
  const L = '#f26a5c';
  void L;

  // Lever arm on the side (left from behind): base plate, rod and a red ball.
  const bx = f ? 58 : 57;
  const by = f ? 14 : 9;
  P.forma(T(rr(45, 23 + dy, 6, 11, 2)), LATON, { rad: 2.4 });
  P.forma(T(trazo([[49, 28 + dy], [bx - 1, by + 3]], 1.7, 1.5)), LATON, { rad: 1.4, paso: 2 });
  P.forma(T(el(bx, by, 4.4, 4.4)), MAQUINA, { rad: 3.4 });
  P.px(TX(bx - 2), by - 2, '#ffd0c0');
  P.px(TX(bx - 1), by - 3, '#ffd0c0');

  // Feet and cabinet.
  P.forma(un(rr(14, 56, 10, 5, 2), rr(34, 56, 10, 5, 2)), LATON, { rad: 2, sesgo: -0.3 });
  const cuerpo = rr(10, 11 + dy, 37, 46 - dy, 4);
  P.sombra(cuerpo, 1, 1, 1);
  P.forma(cuerpo, MAQUINA, { rad: 8, grad: 0.4 });
  // Gold trim down the sides of the cabinet.
  P.llenarSobre(rc(12, 14 + dy, 1, 38), '#f26a5c', MAQUINA);
  P.llenarSobre(rc(44, 14 + dy, 1, 38), '#6a1220', MAQUINA);

  // The crown: a gold bar with five bulbs that flash in turns.
  P.forma(rr(14, 3, 29, 9, 3), LATON, { rad: 3.2 });
  for (let i = 0; i < 5; i++) {
    const x = 18 + i * 5;
    const on = (i + f) % 2 === 0;
    P.llenar(rc(x - 1, 6, 3, 3), on ? '#fff0a0' : '#8a5a10');
    if (on) {
      P.px(x, 7, BLANCO_T);
      P.px(x, 4, '#fff0a0');
    } else {
      P.px(x, 7, '#d4901c');
    }
  }
  // Sparks of light from the lit bulbs.
  if (f) {
    P.pxs('#fff0a0', [TX(9), 4], [TX(8), 3], [TX(10), 5], [TX(50), 3], [TX(51), 2]);
  } else {
    P.pxs('#fff0a0', [TX(11), 2], [TX(12), 1], [TX(48), 5], [TX(49), 4]);
  }

  P.cara(() => {
    // Eye panel: a gold plate with two smug, half-lidded eyes and a raised brow.
    P.forma(rr(13, 14 + dy, 31, 12, 3), LATON, { rad: 4, grad: 0.3 });
    const mira = f ? 1 : 0;
    for (const cx of [22.5, 34.5]) {
      const ojo = el(cx, 20.5 + dy, 4.8, 4.6);
      P.llenar(ojo, BLANCO_T);
      P.aro(ojo, NEGRO_T);
      P.llenar(el(cx + 1.5 + mira, 21.6 + dy, 2.2, 2.4), NEGRO_T);
      P.px(Math.round(cx) + 1 + mira, 20 + dy, BLANCO_T);
      // Heavy lid over the top half.
      const x0 = Math.round(cx) - 6;
      P.llenar(inter(ojo, rc(x0, 14 + dy, 13, 5)), '#d4901c');
      P.llenar(inter(ojo, rc(x0, 19 + dy, 13, 1)), NEGRO_T);
    }
    P.llenar(cur([[17, 17 + dy], [21, 15 + dy], [26, 16 + dy]], 1), NEGRO_T);
    P.llenar(cur([[31, 15 + dy], [35, 14 + dy], [40, 16 + dy]], 1), NEGRO_T);

    // Reel window: dark frame, three cream reels with a cherry, a bell and a seven.
    P.forma(rr(14, 28 + dy, 30, 14, 2), LATON, { rad: 2, paso: 1 });
    P.llenar(rc(15, 29 + dy, 28, 12), NEGRO_T);
    const rueda = (x0: number, dyr: number, simbolo: string[], leyenda: Record<string, string>) => {
      P.llenar(rc(x0, 30 + dy, 8, 10), BLANCO_T);
      P.llenar(rc(x0, 30 + dy, 8, 1), '#fff0a0');
      P.llenar(rc(x0, 39 + dy, 8, 1), '#d4901c');
      P.llenar(rc(x0, 38 + dy, 8, 1), '#fff0a0');
      P.est(x0 + 1, 31 + dy + dyr, simbolo, leyenda);
    };
    const leyendaCereza = { r: '#d83a3a', s: '#a8222e', w: BLANCO_T, g: VERDE_T, k: NEGRO_T };
    rueda(16, 0, ['....gg..', '...kg...', '..k..k..', '.rr..rr.', 'rwrk.rwr', 'rrsk.rrs', '.s....s.'], leyendaCereza);
    rueda(25, 0, ['...kk...', '..kyyk..', '.kywyyk.', '.kyyyok.', '.kyyyyk.', 'kkkkkkkk', '..kyyk..'], { y: '#ffcc40', w: '#fff0a0', o: '#d4901c', k: '#8a5a10' });
    rueda(34, f ? 1 : 0, ['rrrrrrr.', 'rrrrrrs.', '....rs..', '...rr...', '..rrs...', '..rr....', '..rs....'], { r: '#d83a3a', s: '#a8222e' });
    // Glass glint over the window.
    P.llenar(rc(16, 29 + dy, 6, 1), '#f26a5c');
    // Coin slot below the window.
    P.forma(rr(26, 43 + dy, 7, 4, 1), LATON, { rad: 1.5, paso: 2 });
    P.llenar(rc(28, 45 + dy, 3, 1), NEGRO_T);

    // The grin: a wide dark bowl, a row of teeth and a tongue sticking out.
    const boca = men(inter(el(29, 46 + dy, 15.5, 9.5), rc(12, 44 + dy, 34, 14)), el(29, 43 + dy, 17, 6.2));
    P.llenar(boca, NEGRO_T);
    const dientes = new Mascara();
    boca.each((x, y) => {
      if (boca.tiene(x, y - 1) || !boca.tiene(x, y + 2)) return;
      if (x > 14 && x < 44) dientes.add(x, y).add(x, y + 1);
    });
    P.llenar(dientes, BLANCO_T);
    dientes.each((x, y) => {
      if (!dientes.tiene(x, y - 1) && x % 4 === 0) P.px(x, y + 1, '#d4901c');
    });
    P.llenar(inter(el(37, 55 + dy, 5, 4.2), rc(13, 53 + dy, 32, 8)), LENGUA_T);
    P.px(37, 54 + dy, '#ffb0b8');
    P.px(38, 54 + dy, '#ffb0b8');
    P.llenar(cur([[36, 54 + dy], [36, 57 + dy]], 1), '#a8222e');
    P.llenar(cur([[13, 47 + dy], [14, 49 + dy]], 1), NEGRO_T);
    P.llenar(cur([[44, 47 + dy], [43, 49 + dy]], 1), NEGRO_T);
  });
  P.dorso(() => {
    // From behind: a hinged service door with slats and a lock, a sticker, the power cable.
    P.forma(rr(15, 16 + dy, 27, 34, 2), MAQUINA, { rad: 3, sesgo: -0.4, grad: 0.2 });
    for (let y = 21; y < 46; y += 3) {
      P.llenarSobre(rc(19, y + dy, 19, 1), '#6a1220', MAQUINA);
      P.llenarSobre(rc(19, y + 1 + dy, 19, 1), '#d83a3a', MAQUINA);
    }
    P.forma(rr(26, 47 + dy, 5, 5, 1), LATON, { rad: 2 });
    P.px(28, 49 + dy, NEGRO_T);
    P.px(28, 50 + dy, NEGRO_T);
    // Hinge pins.
    for (const y of [20, 44]) P.forma(rr(13, y + dy, 3, 4, 1), LATON, { rad: 1.2, paso: 2 });
    P.llenar(cur(bez3([34, 57], [40, 62], [48, 58], [56, 62], 12), 1), NEGRO_T);
    // Warning sticker.
    P.llenar(rc(33, 16 + dy, 6, 3), BLANCO_T);
    P.px(35, 17 + dy, '#d83a3a');
  });
  void men;
  void par;
  void poli;
}

// ---------------------------------------------------------------------------------------------
// Turito · the bland, boring userito: a slumped beige-grey blob, bored half-closed eyes, mid-yawn.
// ---------------------------------------------------------------------------------------------
const GRIS: Mat = { r: ['#7a6a52', '#a8987a', '#d0c2a0', '#eee4c8'], ol: '#2e2619', ol2: '#7a6a52', rim: '#e0d4b4' };
const NEGRO_U = '#2e2619';
const BLANCO_U = '#f6f0e0';

function turito(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? 1 : 0; // breath: the blob sinks a pixel on frame 1
  const bos = f ? 1 : 0; // yawn opens wider

  // Flat feet.
  P.forma(un(rr(16, 56, 14, 5, 2), rr(34, 56, 14, 5, 2)), GRIS, { rad: 2.4, paso: 1 });

  // The slumped blob: broad low belly, shoulders sagging, head sunk and leaning to the left.
  const panza = el(32, 45 + dy, 21, 14 - dy * 0.5);
  const torso = el(33, 36 + dy, 18, 13);
  const cabeza = el(29, 27 + dy, 16, 11);
  const cuerpo = un(panza, torso, cabeza);
  P.sombra(cuerpo, 1, 1, 1);
  P.forma(cuerpo, GRIS, { rad: 10, grad: 0.4 });
  // A droopy fold of flesh under the head and a soft lighter belly.
  P.tono(T(el(36, 46 + dy, 9, 6)), GRIS, 1);
  // Limp arms hanging at the sides (one a bit shorter), drawn in front of the body's flanks.
  P.forma(T(trazo([[15, 37 + dy], [10, 44 + dy], [10, 51 + dy]], 3, 2.6)), GRIS, { rad: 2.6 });
  P.forma(T(trazo([[49, 37 + dy], [54, 43 + dy], [54 + (f ? 1 : 0), 49 + dy]], 3, 2.6)), GRIS, { rad: 2.6 });
  P.forma(T(el(10, 53 + dy, 3.8, 3.6)), GRIS, { rad: 2.6 });
  P.forma(T(el(54 + (f ? 1 : 0), 51 + dy, 3.8, 3.6)), GRIS, { rad: 2.6 });
  // The single limp hair strand hanging from the top.
  P.forma(T(trazo([[27, 17 + dy], [25, 12 + dy], [20, 12 + dy], [18, 19 + dy]], 1.5, 0.8)), GRIS, { rad: 1.4, paso: 1 });

  P.cara(() => {
    // Half-closed bored eyes (frame 2: closed by the yawn), heavy bags beneath, flat tired brows.
    for (const cx of [23, 37]) {
      const x0 = cx - 5;
      if (!f) {
        const ojo = inter(el(cx, 29 + dy, 4.6, 3.6), rc(x0, 29 + dy, 11, 5));
        P.llenar(ojo, BLANCO_U);
        P.llenar(el(cx + 0.5, 31 + dy, 1.8, 1.8), NEGRO_U);
        P.px(Math.round(cx), 30 + dy, BLANCO_U);
        P.llenar(rc(x0 + 1, 28 + dy, 9, 1), NEGRO_U);
        P.llenar(rc(x0 + 1, 29 + dy, 9, 1), '#a8987a');
      } else {
        P.llenar(cur([[x0 + 1, 29 + dy], [cx, 31 + dy], [x0 + 9, 29 + dy]], 1), NEGRO_U);
        P.px(x0 - 1, 28 + dy, NEGRO_U);
        P.px(x0 + 11, 28 + dy, NEGRO_U);
      }
      P.llenar(cur([[x0, 34 + dy], [cx, 35 + dy], [x0 + 10, 34 + dy]], 1), '#7a6a52');
      P.llenar(rc(x0 + 2, 36 + dy, 7, 1), '#a8987a');
    }
    P.llenar(cur([[16, 25 + dy], [22, 24 + dy], [28, 25 + dy]], 1), NEGRO_U);
    P.llenar(cur([[32, 25 + dy], [38, 24 + dy], [44, 26 + dy]], 1), NEGRO_U);
    // The big yawn.
    const boca = el(30, 43 + dy, 6 + bos * 0.8, 6.8 + bos * 1.4);
    P.llenar(boca, NEGRO_U);
    P.llenar(inter(el(30, 47 + bos + dy, 3.6, 2.6), boca), '#d87a80');
    P.px(30, 45 + dy, '#eee4c8');
    P.px(29, 38 + dy, BLANCO_U);
    P.px(31, 38 + dy, BLANCO_U);
    // A sleepy tear in the corner of the eye.
    P.px(44, 33 + dy, '#bfe4f4');
    P.px(44, 34 + dy, '#bfe4f4');
    P.px(45, 35 + dy, '#8ec4e0');
  });
  P.dorso(() => {
    // From behind: sagging back folds, a crumpled shirt tag and the limp hair strand.
    P.llenarSobre(cur([[16, 34 + dy], [24, 38 + dy], [32, 38 + dy], [41, 36 + dy]], 1), '#7a6a52', GRIS);
    P.llenarSobre(cur([[20, 45 + dy], [28, 49 + dy], [38, 48 + dy], [47, 44 + dy]], 1), '#7a6a52', GRIS);
    P.llenarSobre(cur([[17, 35 + dy], [25, 39 + dy], [33, 39 + dy]], 1), '#eee4c8', GRIS);
    P.forma(rr(30, 24 + dy, 5, 6, 1), GRIS, { rad: 2, sesgo: 0.5 });
    P.px(32, 26 + dy, '#a8987a');
    P.px(32, 28 + dy, '#a8987a');
  });

  // «zzz» drifting upward.
  const zy = f ? -3 : 0;
  const z = (x: number, y: number, n: number, c: string) => {
    const w = n;
    for (let i = 0; i < w; i++) {
      P.px(x + i, y, c);
      P.px(x + w - 1 - i, y + 1 + i, c);
      P.px(x + i, y + w, c);
    }
  };
  z(TX(47) - (E ? 3 : 0), 14 + zy, 4, '#8a8aa8');
  z(TX(54) - (E ? 4 : 0), 7 + zy, 5, '#6e6e90');
  void men;
  void par;
  void poli;
}

// ---------------------------------------------------------------------------------------------
// Resacón · grey hangover cloud: bloodshot eyes, dark circles, a headband with an ice pack, drizzle, an aspirin.
// ---------------------------------------------------------------------------------------------
const NUBE: Mat = { r: ['#4c5470', '#7c86a4', '#a4aec8', '#cdd5e6'], ol: '#1c2034', ol2: '#4c5470', rim: '#b8c8e8' };
const VENDA: Mat = { r: ['#a4aec8', '#e8edf6', '#ffffff'], ol: '#1c2034', ol2: '#4c5470' };
const HIELO: Mat = { r: ['#3a78b4', '#78c0ec', '#d4f0fc'], ol: '#1c2034', ol2: '#3a78b4' };
const TINTA_R = '#1c2034';
const SANGRE = '#d84040';

function resacon(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? 1 : 0;

  // Drizzle: dashes of rain falling from under the cloud, offset by frame.
  const caidas = [[14, 0], [22, 5], [31, 2], [40, 7], [49, 3], [27, 9], [44, 11], [18, 12]];
  for (const [x, ph] of caidas) {
    const y = 50 + ((ph + (f ? 4 : 0)) % 12);
    if (y > 60) continue;
    P.px(TX(x), y, '#d4f0fc');
    P.px(TX(x), y + 1, '#78c0ec');
    P.px(TX(x), y + 2, '#3a78b4');
  }
  // Tiny aspirin tumbling down with the rain.
  const ay = 52 + (f ? 4 : 0);
  P.est(TX(55) - 2, ay, ['.kkkk.', 'kwwbbk', '.kkkk.'], { k: TINTA_R, w: '#ffffff', b: '#78c0ec' }, E);

  // The cloud: big lumpy cumulus with a scalloped belly.
  const nube = un(
    el(18, 22 + dy, 11, 10),
    el(32, 16 + dy, 12.5, 11.5),
    el(46, 21 + dy, 11, 10),
    el(53, 31 + dy, 7.5, 7.5),
    el(10, 31 + dy, 7.5, 7.5),
    el(32, 31 + dy, 24, 12),
    el(19, 43 + dy, 7, 4.4),
    el(32, 45 + dy, 8, 4.6),
    el(45, 43 + dy, 7, 4.4),
  );
  P.sombra(nube, 0, 2, 1);
  P.forma(nube, NUBE, { rad: 11, grad: 0.35, sesgo: 0.1 });
  P.tono(T(el(22, 14 + dy, 8, 3.5)), NUBE, 1);
  P.tono(T(el(48, 40 + dy, 8, 3)), NUBE, -1);

  // The headband across the forehead: a white strap with a knot and two short tails.
  const banda = cur(bez3([9, 25 + dy], [22, 18 + dy], [42, 18 + dy], [56, 25 + dy], 20), 3);
  P.forma(T(inter(banda, nube)), VENDA, { rad: 2, grad: 0.2 });
  // Ice pack strapped to the right of the head, tilted, with frost.
  const hielo = poli([[34, 2 + dy], [50, 7 + dy], [46, 18 + dy], [30, 13 + dy]]);
  P.forma(T(hielo), HIELO, { rad: 4, grad: 0.4 });
  P.llenar(T(cur([[35, 5 + dy], [47, 9 + dy]], 1)), '#d4f0fc');
  P.llenar(T(cur([[33, 11 + dy], [44, 15 + dy]], 1)), '#3a78b4');
  P.pxs('#ffffff', [TX(38), 7 + dy], [TX(41), 9 + dy], [TX(44), 11 + dy]);
  // Frost sparkle drifting off the ice pack.
  P.pxs('#d4f0fc', [TX(54 - f), 5 - f], [TX(55 - f), 4 - f], [TX(53 - f), 4 - f], [TX(54 - f), 3 - f]);
  // Knot and tails at the left.
  P.forma(T(poli([[6, 24 + dy], [12, 21 + dy], [13, 28 + dy], [7, 29 + dy]])), VENDA, { rad: 2 });
  P.forma(T(trazo([[8, 28 + dy], [5, 32 + dy + f], [5, 35 + dy]], 2, 1.2)), VENDA, { rad: 1.6 });
  P.forma(T(trazo([[11, 28 + dy], [12, 32 + dy], [10, 35 + dy - f]], 2, 1.2)), VENDA, { rad: 1.6 });

  P.cara(() => {
    // Dark circles first, then bloodshot eyes with heavy lids, then the droopy brows.
    P.tono(el(31, 31 + dy, 18, 7), NUBE, 1);
    for (const cx of [23.5, 39.5]) {
      P.llenarSobre(el(cx, 35.5 + dy, 6, 2.6), '#4c5470', NUBE);
      P.llenarSobre(el(cx, 36.3 + dy, 4.4, 1.1), '#1c2034', NUBE);
      const ojo = el(cx, 31 + dy, 5, 4.6);
      P.llenar(ojo, '#ffffff');
      P.aro(ojo, TINTA_R);
      // Red veins radiating in from the corners.
      const dir = cx < 31 ? -1 : 1;
      const ccx = Math.round(cx);
      P.pxs(SANGRE, [ccx + dir * 4, 30 + dy], [ccx + dir * 3, 30 + dy], [ccx + dir * 3, 31 + dy], [ccx + dir * 4, 32 + dy], [ccx + dir * 2, 33 + dy], [ccx - dir * 3, 29 + dy], [ccx - dir * 2, 29 + dy]);
      P.llenar(el(cx - dir * 0.5 + (f ? dir * 0.8 : 0), 32.4 + dy, 2, 2.1), TINTA_R);
      P.px(ccx - 1, 31 + dy, '#ffffff');
      // Heavy upper lid.
      const x0 = ccx - 6;
      P.llenar(inter(ojo, rc(x0, 25 + dy, 13, 5 + f)), '#7c86a4');
      P.llenar(inter(ojo, rc(x0, 30 + f + dy, 13, 1)), TINTA_R);
    }
    P.llenar(cur([[17, 26 + dy], [22, 27 + dy], [28, 29 + dy]], 1), TINTA_R);
    P.llenar(cur([[35, 29 + dy], [41, 27 + dy], [46, 26 + dy]], 1), TINTA_R);
    // A queasy wobbly mouth with a flat, sick tongue.
    const ondas = cur([[21, 40 + dy], [24, 38 + dy], [27, 40 + dy], [30, 38 + dy], [33, 40 + dy], [36, 38 + dy], [39, 40 + dy], [42, 38 + dy]], 1);
    P.llenar(ondas, TINTA_R);
    P.llenar(mover(ondas, 0, 1), '#1c2034');
    P.llenar(inter(el(29, 41.5 + dy, 3.8, 3.4), rc(20, 41 + dy, 24, 6)), '#9aa86a');
    P.px(29, 42 + dy, '#1c2034');
    P.px(29, 43 + dy, '#1c2034');
    // Cold sweat.
    P.pxs('#78c0ec', [51, 25 + dy], [51, 26 + dy], [50, 27 + dy]);
  });
  P.dorso(() => {
    // From behind: swirls of puffy cloud and the knot with its tails at the middle of the nape.
    P.llenarSobre(cur(bez3([14, 36 + dy], [20, 29 + dy], [26, 36 + dy], [30, 30 + dy], 10), 1), '#4c5470', NUBE);
    P.llenarSobre(cur(bez3([34, 40 + dy], [40, 33 + dy], [46, 38 + dy], [50, 32 + dy], 10), 1), '#4c5470', NUBE);
    P.llenarSobre(cur(bez3([20, 25 + dy], [24, 29 + dy], [30, 26 + dy], [34, 30 + dy], 8), 1), '#cdd5e6', NUBE);
    P.forma(poli([[28, 20 + dy], [35, 20 + dy], [36, 26 + dy], [27, 26 + dy]]), VENDA, { rad: 2 });
    P.forma(trazo([[29, 26 + dy], [25, 32 + dy], [27, 36 + dy + f]], 2.2, 1.2), VENDA, { rad: 1.6 });
    P.forma(trazo([[34, 26 + dy], [38, 31 + dy], [36, 35 + dy - f]], 2.2, 1.2), VENDA, { rad: 1.6 });
  });
  void men;
  void par;
}

// ---------------------------------------------------------------------------------------------
// Evoscar · a compact brown horse with two big chibi heads side by side: a woman and a man, party couple.
// ---------------------------------------------------------------------------------------------
const CABALLO: Mat = { r: ['#5a2e16', '#8e5428', '#b87a40', '#dca468'], ol: '#2a140a', ol2: '#5a2e16', rim: '#e8b078' };
const MELENA: Mat = { r: ['#3a1c10', '#5a2e16', '#8e5428'], ol: '#2a140a', ol2: '#3a1c10' };
const RUBIA: Mat = { r: ['#8e5428', '#d88a28', '#f6c048'], ol: '#2a140a', ol2: '#8e5428' };
const CARNE: Mat = { r: ['#d87c52', '#f4ac7c', '#ffd8b0'], ol: '#2a140a', ol2: '#8e5428' };
const NEGRO_E = '#2a140a';
const BLANCO_E = '#fff4e8';
const ROSA_E = '#e8647a';

function evoscar(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dL = f ? -1 : 0; // the heads nod in turns
  const dR = f ? 1 : 0;
  const cola = f ? 1 : 0;
  const xm = 20; // centre of the woman's head
  const xh = 44; // centre of the man's head

  // Tail: from the front it swishes out on the right; from behind it hangs down the middle.
  P.dorso(() => {
    P.forma(trazo(bez3([32, 44], [40, 52 + cola], [24, 57 - cola], [31, 63], 14), 6, 2.4), MELENA, { rad: 3, grad: 0.4 });
    P.llenarSobre(cur(bez3([32, 48], [36, 54], [28, 57], [31, 61], 8), 1), '#8e5428', MELENA);
  });
  P.cara(() => {
    P.forma(trazo(bez3([48, 46], [60, 44 + cola], [62, 54], [55, 62 - cola], 16), 4.6, 1.8), MELENA, { rad: 3, grad: 0.4 });
    P.llenarSobre(cur(bez3([52, 48], [58, 47], [59, 54], [55, 59], 10), 1), '#8e5428', MELENA);
  });

  // Legs and hooves: the outer pair is darker (further back).
  P.forma(un(rr(11, 49, 8, 11, 3), rr(45, 49, 8, 11, 3)), CABALLO, { rad: 3.4, grad: 0.3, sesgo: -0.35 });
  P.forma(un(rr(22, 49, 8, 12, 3), rr(34, 49, 8, 12, 3)), CABALLO, { rad: 3.4, grad: 0.3 });
  for (const x of [11, 45, 22, 34]) {
    P.llenar(rc(x, x === 22 || x === 34 ? 59 : 58, 8, 2), NEGRO_E);
    P.llenar(rc(x + 1, x === 22 || x === 34 ? 59 : 58, 3, 1), '#5a2e16');
  }
  // Barrel and the two necks as one shape.
  const barril = un(el(32, 45, 19.5, 10.5), poli([[17, 45], [28, 28], [36, 28], [47, 45]]), el(xm + 1, 36, 6.5, 10), el(xh - 1, 36, 6.5, 10));
  P.sombra(barril, 0, 1, 1);
  P.forma(barril, CABALLO, { rad: 8, grad: 0.4 });
  P.dorso(() => {
    P.tono(el(32, 40, 14, 3), CABALLO, 1);
    P.llenarSobre(cur([[32, 38], [32, 46]], 1), '#5a2e16', CABALLO);
  });
  // The mane between the necks.
  P.forma(poli([[28, 30], [36, 30], [37, 38], [32, 44], [27, 38]]), MELENA, { rad: 3 });
  P.llenarSobre(cur([[31, 33], [31, 39]], 1), '#8e5428', MELENA);
  P.llenarSobre(cur([[34, 34], [33, 38]], 1), '#8e5428', MELENA);

  // A horse ear: a leaf-shaped stroke from the base to the tip, pink inside.
  const oreja = (bx: number, by: number, tx: number, ty: number) => {
    P.forma(trazo([[bx, by], [tx, ty]], 3.2, 0.8), CABALLO, { rad: 2.4 });
    P.px(Math.round((bx * 2 + tx) / 3), Math.round((by * 2 + ty) / 3), ROSA_E);
    P.px(Math.round((bx + tx * 2) / 3 - 0.2), Math.round((by + ty * 2) / 3), ROSA_E);
  };

  // ---- The woman (left head): horse ears, long golden hair with locks on the outside, face, fringe.
  oreja(xm - 9, 12 + dL, xm - 12, 2 + dL);
  oreja(xm + 7.5, 9 + dL, xm + 9.5, 0 + dL);
  const caboM = un(el(xm, 18 + dL, 11.6, 11.4), trazo([[xm - 9.5, 22 + dL], [xm - 12, 31 + dL], [xm - 11, 40 + dL]], 4.2, 3.4), trazo([[xm + 9.5, 23 + dL], [xm + 11, 30 + dL], [xm + 9.5, 37 + dL]], 2.8, 2.2));
  P.forma(caboM, RUBIA, { rad: 6, grad: 0.4 });
  P.cara(() => {
    const cara = el(xm, 24 + dL, 10, 10.6);
    P.forma(cara, CARNE, { rad: 7, grad: 0.35 });
    // Fringe: what is left of the hair cap above a face-shaped bite, swept to the side.
    const fq = men(el(xm, 18 + dL, 11.6, 11.4), el(xm + 2.5, 28.5 + dL, 10.8, 10.8));
    P.forma(fq, RUBIA, { rad: 4, grad: 0.4 });
    P.llenarSobre(cur([[xm - 8, 16 + dL], [xm - 2, 11 + dL], [xm + 6, 12 + dL]], 1), '#f6c048', RUBIA);
    // Eyes with lashes, brows, rosy cheeks, a wide open smile.
    for (const cx of [xm - 4, xm + 4.5]) {
      P.llenar(el(cx, 25 + dL, 2.2, 3), NEGRO_E);
      P.px(Math.round(cx) - 1, 23 + dL, BLANCO_E);
    }
    P.pxs(NEGRO_E, [xm - 7, 22 + dL], [xm - 8, 21 + dL], [xm + 8, 22 + dL], [xm + 9, 21 + dL]);
    P.llenar(cur([[xm - 7, 20 + dL], [xm - 4, 19 + dL], [xm - 2, 20 + dL]], 1), '#8e5428');
    P.llenar(cur([[xm + 3, 20 + dL], [xm + 6, 19 + dL], [xm + 8, 20 + dL]], 1), '#8e5428');
    P.llenar(rc(xm - 8, 29 + dL, 3, 2), ROSA_E);
    P.llenar(rc(xm + 6, 29 + dL, 3, 2), ROSA_E);
    const boca = inter(el(xm, 29 + dL, 4.8, 4), rc(xm - 7, 29 + dL, 14, 6));
    P.llenar(boca, NEGRO_E);
    P.llenar(rc(xm - 4, 29 + dL, 8, 1), BLANCO_E);
    P.llenar(inter(el(xm, 32.6 + dL, 2.6, 1.6), boca), ROSA_E);
  });
  P.dorso(() => {
    // Back of her head: the long hair parted down the middle, a lock over each shoulder.
    P.llenarSobre(cur(bez3([xm, 8 + dL], [xm - 1, 20 + dL], [xm + 1, 30 + dL], [xm, 38 + dL], 12), 1), '#8e5428', RUBIA);
    P.llenarSobre(cur(bez3([xm - 7, 12 + dL], [xm - 10, 22 + dL], [xm - 8, 32 + dL], [xm - 11, 38 + dL], 10), 1), '#f6c048', RUBIA);
    P.llenarSobre(cur(bez3([xm + 7, 12 + dL], [xm + 9, 22 + dL], [xm + 7, 30 + dL], [xm + 9, 35 + dL], 10), 1), '#8e5428', RUBIA);
    P.llenarSobre(el(xm - 4, 14 + dL, 3, 2), '#f6c048', RUBIA);
  });

  // ---- The man (right head): horse ears, short dark hair with a quiff, beard, big grin.
  oreja(xh + 9, 12 + dR, xh + 12, 2 + dR);
  oreja(xh - 7.5, 9 + dR, xh - 9.5, 0 + dR);
  const caraH = el(xh, 24 + dR, 10.2, 10.8);
  const caboH = un(el(xh, 19 + dR, 11.4, 11), el(xh + 3, 9.5 + dR, 6, 3.4));
  P.dorso(() => {
    P.forma(caraH, CARNE, { rad: 7, sesgo: -0.15 });
    P.forma(un(caboH, rc(xh - 9, 22 + dR, 18, 5)), MELENA, { rad: 5, grad: 0.4 });
    P.llenarSobre(cur([[xh - 6, 28 + dR], [xh, 31 + dR], [xh + 6, 28 + dR]], 1), '#8e5428', MELENA);
    P.forma(un(el(xh - 10, 27 + dR, 2.4, 3), el(xh + 10, 27 + dR, 2.4, 3)), CARNE, { rad: 2, paso: 1 });
  });
  P.cara(() => {
    P.forma(caraH, CARNE, { rad: 7, grad: 0.35, sesgo: -0.15 });
    // Beard around the jaw.
    const barba = men(inter(caraH, rc(xh - 12, 22 + dR, 25, 17)), el(xh, 20 + dR, 10.6, 8.2));
    P.llenar(barba, '#5a2e16');
    barba.each((x, y) => {
      if ((x * 3 + y * 5) % 7 === 0) P.px(x, y, '#8e5428');
      else if ((x + y * 2) % 9 === 0) P.px(x, y, '#3a1c10');
    });
    // Short hair: the cap minus a face-shaped bite, with a quiff on top.
    const pelo = men(caboH, el(xh, 29.5 + dR, 10.8, 11));
    P.forma(pelo, MELENA, { rad: 4, grad: 0.4 });
    P.llenarSobre(cur([[xh - 7, 15 + dR], [xh, 11 + dR], [xh + 6, 14 + dR]], 1), '#8e5428', MELENA);
    for (const cx of [xh - 4.5, xh + 4.5]) {
      P.llenar(el(cx, 25 + dR, 2.2, 3), NEGRO_E);
      P.px(Math.round(cx) - 1, 23 + dR, BLANCO_E);
    }
    P.llenar(cur([[xh - 8, 22 + dR], [xh - 5, 20 + dR], [xh - 2, 21 + dR]], 1), '#3a1c10');
    P.llenar(cur([[xh + 2, 21 + dR], [xh + 5, 20 + dR], [xh + 8, 22 + dR]], 1), '#3a1c10');
    P.llenar(rc(xh - 9, 26 + dR, 3, 2), ROSA_E);
    P.llenar(rc(xh + 6, 26 + dR, 3, 2), ROSA_E);
    // Moustache over a wide grin.
    P.llenar(cur([[xh - 6, 29 + dR], [xh - 3, 28 + dR], [xh, 29 + dR], [xh + 3, 28 + dR], [xh + 6, 29 + dR]], 1), '#3a1c10');
    const bocaH = inter(el(xh, 30.5 + dR, 5.6, 4.2), rc(xh - 8, 30 + dR, 16, 6));
    P.llenar(bocaH, NEGRO_E);
    P.llenar(rc(xh - 5, 30 + dR, 10, 2), BLANCO_E);
    P.llenar(inter(el(xh, 34.2 + dR, 2.8, 1.7), bocaH), ROSA_E);
  });

  // Party confetti.
  const co = ['#f6c048', ROSA_E, '#ffd8b0'];
  const conf: [number, number][] = [[3, 8], [59, 22], [60, 36], [3, 24], [2, 44 - cola], [57, 6]];
  conf.forEach(([x, y], i) => {
    const o = f ? (i % 2 ? -1 : 1) : 0;
    P.px(x, y + o, co[i % 3]);
    P.px(x + 1, y + o + 1, co[(i + 1) % 3]);
  });
  void E;
  void par;
}

export const LOTE_B: Dibujo2[] = [
  { id: 'cajonazo', nombre: 'Cajonazo', dibujar: cajonazo },
  { id: 'lentejasur', nombre: 'Lentejasur', dibujar: lentejasur },
  { id: 'tragaperras', nombre: 'Tragaperras', dibujar: tragaperras },
  { id: 'turito', nombre: 'Turito', dibujar: turito },
  { id: 'resacon', nombre: 'Resacón', dibujar: resacon },
  { id: 'evoscar', nombre: 'Evoscar', dibujar: evoscar },
];
