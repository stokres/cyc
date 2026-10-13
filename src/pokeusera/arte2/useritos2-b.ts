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
const LENTEJA: Mat = { r: ['#4a2a14', '#7a4a24', '#a8703a', '#d29c5c'], ol: '#1e1008', ol2: '#4a2a14' };
const CHORIZO: Mat = { r: ['#7a1420', '#c02c2c', '#e8584a'], ol: '#1e1008', ol2: '#7a1420' };
const ESPECTRO: Mat = { r: ['#8e84b8', '#bfb6e0', '#e8e2fa'], ol: '#3c2c5c', ol2: '#8e84b8' };
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

  // Ghostly wisps trailing below: two curling tails.
  const cola1 = bez3([30, 44], [28, 52], [38, 53 + sway], [34, 60], 16);
  const cola2 = bez3([22, 44], [20, 50], [14, 52 - sway], [17, 58], 14);
  P.forma(trazo(cola1, 5.2, 1.0), ESPECTRO, { rad: 3, grad: 0.4 });
  P.forma(trazo(cola2, 3.8, 0.8), ESPECTRO, { rad: 2.4, grad: 0.4 });
  P.forma(trazo(bez3([42, 43], [46, 49 - sway], [42, 54], [45, 57 + sway], 12), 2.6, 0.7), ESPECTRO, { rad: 2, grad: 0.4 });
  // A tiny ghost sparkle.
  P.px(TX(50), 55 - sway, '#e8e2fa');
  P.px(TX(11), 47 + sway, '#bfb6e0');

  // The lentil: a thick edge underneath and the dished top face.
  const canto = el(31, 31 + dy, 23, 17);
  const cara = el(31, 28 + dy, 23, 16.5);
  P.sombra(canto, 0, 2, 1);
  P.forma(canto, LENTEJA, { rad: 7, grad: 0.2, sesgo: -0.45 });
  P.forma(cara, LENTEJA, { rad: 10, grad: 0.45 });
  // Dirt: smudges and specks.
  P.tono(T(el(44, 38 + dy, 7, 3.5)), LENTEJA, -1);
  P.tono(T(el(16, 22 + dy, 5, 3)), LENTEJA, -1);
  P.tono(T(el(22, 17 + dy, 7, 3)), LENTEJA, 1);
  const motas: [number, number, number][] = [[14, 33, 0], [19, 40, 0], [27, 41, 3], [36, 37, 0], [48, 31, 3], [42, 24, 0], [12, 28, 3], [33, 15, 0], [24, 13, 3], [50, 36, 0], [9, 25, 0]];
  for (const [x, y, c] of motas) {
    if (cara.tiene(TX(x), y + dy) || true) P.llenarSobre(rc(TX(x), y + dy, 1, 1), LENTEJA.r[c === 0 ? 0 : 3], LENTEJA);
  }
  for (const [x, y] of [[17, 36], [38, 41], [46, 28]] as [number, number][]) {
    P.llenarSobre(rc(TX(x), y + dy, 2, 1), LENTEJA.r[0], LENTEJA);
  }
  P.dorso(() => {
    // The seam of the shell, curving down the middle, and a worn patch.
    const costura = cur(bez3([32, 12 + dy], [30, 22 + dy], [34, 30 + dy], [31, 43 + dy], 14), 1);
    P.llenarSobre(costura, '#4a2a14', LENTEJA);
    P.llenarSobre(mover(costura, 1, 0), '#d29c5c', LENTEJA);
    P.llenarSobre(el(20, 30 + dy, 5, 3), '#7a4a24', LENTEJA);
  });

  P.cara(() => {
    // Shifty eyes glancing sideways (they swap sides each frame), heavy suspicious lids.
    const mira = f ? -1 : 1;
    for (const cx of [21, 35]) {
      const ojo = el(cx, 29 + dy, 5.2, 4.4);
      P.llenar(ojo, BLANCO_L);
      P.aro(ojo, NEGRO_L);
      P.llenar(el(cx + mira * 2.4, 29.6 + dy, 2.3, 2.6), NEGRO_L);
      P.px(Math.round(cx + mira * 2.4) - 1, 28 + dy, BLANCO_L);
      // Lid: the top half of the eye is covered by the lentil's own skin, with a dark lash line.
      const lid = inter(ojo, rc(cx - 7, 20 + dy, 15, 8));
      P.llenar(lid, '#7a4a24');
      P.llenar(inter(el(cx, 29 + dy, 5.2, 4.4), rc(cx - 7, 27 + dy, 15, 1)), NEGRO_L);
      P.llenar(rc(cx - 4, 26 + dy, 9, 1), '#a8703a');
    }
    // Brows slanting down towards the nose: suspicious.
    P.llenar(cur([[15, 22 + dy], [20, 23 + dy], [25, 25 + dy]], 1), NEGRO_L);
    P.llenar(cur([[31, 25 + dy], [36, 23 + dy], [41, 22 + dy]], 1), NEGRO_L);
    P.llenar(cur([[15, 23 + dy], [20, 24 + dy]], 1), '#4a2a14');
    // A lopsided sly smirk with one fang.
    const sonrisa = cur([[22, 37 + dy], [27, 39 + dy], [33, 38 + dy], [37, 35 + dy]], 1);
    P.llenar(sonrisa, NEGRO_L);
    P.px(38, 34 + dy, NEGRO_L);
    P.px(30, 40 + dy, BLANCO_L);
    P.px(30, 39 + dy, BLANCO_L);
    P.px(21, 36 + dy, '#4a2a14');
    // A drop of nervous sweat.
    P.px(51, 26 + dy, '#bfe4f4');
    P.px(51, 27 + dy, '#bfe4f4');
    P.px(50, 28 + dy, '#bfe4f4');
    P.px(51, 28 + dy, '#fff');
  });

  // The slice of chorizo stuck to its head (viewer's right from the front).
  const rodaja = T(el(48, 17 + dy, 8.2, 7.4));
  const miga = T(el(48, 17 + dy, 5.6, 4.8));
  P.sombra(rodaja, -1, 2, 1);
  P.forma(rodaja, CHORIZO, { rad: 4, grad: 0.35 });
  P.llenar(miga, '#e8584a');
  P.aro(miga, '#7a1420');
  for (const [x, y] of [[45, 15], [49, 14], [51, 18], [46, 19], [49, 20]] as [number, number][]) {
    P.px(TX(x), y + dy, GRASA);
    P.px(TX(x + 1), y + dy, GRASA);
  }
  P.px(TX(45), 14 + dy, '#fff');
  P.px(TX(53), 21 + dy, '#c02c2c');
  P.px(TX(54), 20 + dy, '#c02c2c');
  void men;
  void par;
  void poli;
  void rr;
}

export const LOTE_B: Dibujo2[] = [
  { id: 'cajonazo', nombre: 'Cajonazo', dibujar: cajonazo },
  { id: 'lentejasur', nombre: 'Lentejasur', dibujar: lentejasur },
];
