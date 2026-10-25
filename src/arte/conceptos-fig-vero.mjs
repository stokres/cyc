// Vero, hecha figura (docs/CAPITULO2.md): ver conceptos-rig.mjs. Camarera: moño con coletero rojo, aro dorado, vestido negro que
// fluye con destellos de llama y una caña en la bandeja. Es la dueña del marco dorado que envuelve el mundo.
import { C as VERO } from './personajes/vero.mjs';
import { aro, bloque, bola, cana, circ, curva, elipse, nube, ovoide, poli, redondo, relleno, sonrisa, tono, trazo, tubo } from './conceptos-estilo.mjs';
import { ROPA, mueve, parte, peanaOro, s } from './conceptos-rig.mjs';

export function vero() {
  const R = ROPA.vero;
  const piel = VERO.skin;
  const oro = VERO.gold;
  const partes = [];
  partes.push(parte('peana', [-270, -80, 270, 110], peanaOro(oro), { fija: true }));
  // Los zapatos asoman bajo el vestido.
  partes.push(parte('zapatos', [-80, -50, 90, -2], bloque(redondo([[-64, -34], [-18, -34], [-6, -18], [-70, -18]], 6), R.zapato, [], {}) + bloque(redondo([[14, -34], [62, -34], [78, -18], [10, -18]], 6), R.zapato, [], {}), { mov: { dy: s(1.2, 1.7, 0) } }));
  // La falda: dos telas negras con destello violeta, una cinta dorada en el bajo y tres cintas de llamas (la referencia 2) que ondean.
  const falda = (ancho, largo, c, k, luz) => bloque(curva([[-44, -252, 'c'], [44, -252, 'c'], [ancho * 0.5, -170], [ancho * 0.56, -96], [ancho * 0.5 + k * 10, -largo], [ancho * 0.24, -largo + 22], [0, -largo + 2], [-ancho * 0.24, -largo + 26], [-ancho * 0.5 - k * 8, -largo], [-ancho * 0.56, -98], [-ancho * 0.5, -172]]), c, [[poli([[14, -252], [44, -252], [ancho * 0.5, -170], [ancho * 0.56, -96], [ancho * 0.28, -largo + 24]]), 'osc', 0.34], [poli([[-44, -252], [-12, -252], [-ancho * 0.28, -140], [-ancho * 0.5, -172]]), 'luz', luz]], { luz: 0.3, sombra: -0.45 });
  partes.push(parte('tela.b', [-160, -260, 160, -20], falda(250, 34, tono(R.vestido, 0.12), 1, 0.28) + trazo('M-136 -86Q-70 -62 0 -78Q70 -94 140 -70', oro, 7, { opacity: 0.85 }), { piv: [0, -250], onda: { amp: 0.06, w: 1.4, fase: 1.4 } }));
  partes.push(parte('tela.a', [-150, -260, 150, -20], falda(200, 40, R.vestido, 0, 0.2) + trazo('M-110 -140Q-40 -120 20 -138', '#9a8ae0', 5, { opacity: 0.35 }), { piv: [0, -250], onda: { amp: 0.07, w: 1.9, fase: 0 } }));
  const cinta = (c1, c2, L, A, grosor) => bloque(curva([[0, 0, 'c'], [L * 0.28, -A], [L * 0.62, A * 0.9], [L, -A * 0.5, 'c'], [L * 0.64, A * 0.9 + grosor * 0.7], [L * 0.3, -A + grosor]]), c1, [[curva([[0, 0, 'c'], [L * 0.28, -A], [L * 0.62, A * 0.9], [L * 0.64, A * 0.9 + grosor * 0.2], [L * 0.3, -A + grosor * 0.3]]), 'luz', 0.38], [curva([[L * 0.3, -A + grosor * 0.6], [L * 0.64, A * 0.9 + grosor * 0.7], [L, -A * 0.5, 'c'], [L * 0.4, -A + grosor * 1.1]]), 'osc', 0.3]], { luz: 0.35, sombra: -0.3 }) + trazo(`M2 0Q${L * 0.3} ${-A * 1.1} ${L * 0.62} ${A * 0.85}`, c2, 3, { opacity: 0.8 });
  partes.push(parte('llama.a', [-10, -150, 230, 50], `<g transform="translate(0 -62) rotate(10)">${cinta('#ff8a3a', '#ffd36a', 200, 26, 30)}</g>`, { piv: [0, -62], onda: { amp: 0.14, w: 2.4, fase: 1 } }));
  partes.push(parte('llama.b', [-240, -170, 10, 50], `<g transform="translate(0 -70) scale(-1 1) rotate(-6)">${cinta(oro, '#fff1b8', 210, 24, 28)}</g>`, { piv: [0, -70], onda: { amp: 0.14, w: 2.0, fase: 2.5 } }));
  partes.push(parte('llama.c', [-10, -90, 200, 60], `<g transform="translate(0 -30) rotate(26)">${cinta('#ff4f8a', '#ffb0cf', 150, 18, 22)}</g>`, { piv: [0, -30], onda: { amp: 0.16, w: 2.8, fase: 0.3 } }));
  // El brazo de atrás y el torso: un corpiño negro estrecho con su escote dorado.
  partes.push(parte('brazo.b', [-140, -390, -30, -200], tubo('M-52 -366C-100 -340 -110 -280 -92 -232', R.vestido, 26) + circ(-90, -226, 13, piel), { piv: [-52, -366], mov: { rot: s(0.05, 1.2, 0.2) } }));
  const corpino = bloque(redondo([[-58, -384], [60, -384], [44, -250], [-34, -250]], 12), R.vestido, [[poli([[20, -384], [60, -384], [44, -250], [26, -250]]), 'osc', 0.35], [poli([[-58, -384], [-30, -384], [-44, -270], [-34, -250]]), 'luz', 0.14]], { luz: 0.2, sombra: -0.38 })
    + relleno(poli([[-22, -384], [24, -384], [0, -330]]), tono(piel, -0.05)) + trazo('M-24 -384L0 -330L26 -384', oro, 6)
    + trazo('M-34 -262Q4 -250 44 -262', oro, 8, { opacity: 0.95 });
  partes.push(parte('torso', [-100, -400, 100, -240], corpino, { piv: [0, -250], mov: { esc: s(0.012, 1.7, 0.4), rot: s(0.02, 0.8, 0.2) } }));
  // La cabeza: pelo recogido en un moño con coletero rojo, aro dorado y una cara mínima de labios rojos.
  const cab = bloque(redondo([[-44, -462], [40, -464], [56, -430], [50, -380], [20, -352], [-24, -360], [-48, -410]], 14), piel, [[poli([[18, -464], [56, -430], [50, -380], [20, -352], [8, -420]]), 'osc', 0.2], [poli([[-44, -462], [-8, -464], [-16, -428], [-48, -410]]), 'luz', 0.22]], { luz: 0.35, sombra: -0.3 })
    + relleno(poli([[50, -432], [80, -402], [48, -396]]), tono(piel, -0.14)) + relleno(poli([[50, -432], [76, -406], [54, -410]]), tono(piel, 0.22), 0.9) + circ(-46, -416, 11, tono(piel, -0.14));
  partes.push(parte('cabeza', [-80, -500, 100, -340], cab, { piv: [0, -358], mov: { rot: s(0.05, 1.05, 2), dy: s(2.5, 1.6, 0.8) } }));
  partes.push(parte('cara', [-60, -450, 90, -380], ojoFeliz2(-10, -430) + ojoFeliz2(32, -430) + trazo('M-24 -450L0 -454M22 -454L46 -450', VERO.hair, 6) + `<path d="${curva([[-6, -396], [12, -402], [30, -396], [12, -382]])}" fill="${VERO.lip}"/>` + trazo('M-6 -396Q12 -390 30 -396', tono(VERO.lip, -0.4), 2.6), { padre: 'cabeza', piv: [0, -358], mov: { dx: s(2, 1.1, 0.4) } }));
  partes.push(parte('pelo', [-80, -500, 80, -380], bloque(redondo([[-52, -400], [-46, -470], [-10, -496], [40, -490], [58, -456], [48, -430], [18, -446], [-14, -446], [-40, -424]], 16), VERO.hair, [[poli([[10, -496], [58, -456], [48, -430], [18, -446]]), 'osc', 0.2], [poli([[-46, -470], [-10, -496], [0, -470]]), 'luz', 0.28]], { luz: 0.4, sombra: -0.4 }), { padre: 'cabeza', piv: [0, -440], mov: { rot: s(0.03, 1.3, 1) } }));
  partes.push(parte('mono', [-50, -60, 50, 50], bola(0, 0, 36, VERO.hair, { luz: 0.55, sombra: -0.5 }) + `<ellipse cx="0" cy="26" rx="32" ry="9" fill="${R.coletero}"/>` + trazo('M-30 26Q0 36 30 26', tono(R.coletero, -0.4), 3), { padre: 'cabeza', piv: [0, 20], orb: { cx: 4, cy: -516, rx: 0, ry: 0, w: 0, fase: 0 }, mov: { rot: s(0.12, 1.4, 0.4) } }));
  partes.push(parte('aro.o', [-30, -30, 30, 30], aro(0, 14, 18, oro, 7), { padre: 'cabeza', piv: [0, -4], orb: { cx: -46, cy: -392, rx: 0, ry: 0, w: 0, fase: 0 }, mov: { rot: s(0.3, 2.1, 0.8) } }));
  // El brazo de delante levanta la bandeja con una caña.
  partes.push(parte('brazo.a', [10, -400, 220, -250], tubo('M42 -366C100 -350 140 -330 150 -300', R.vestido, 28) + tubo('M120 -332C140 -326 150 -312 152 -296', piel, 22) + circ(154, -290, 14, piel), { piv: [42, -366], mov: { rot: s(0.045, 1.2, 0.9) } }));
  partes.push(parte('bandeja', [90, -420, 270, -240], `<g transform="translate(184 -292)">${bloque(elipse(0, 0, 76, 12), oro, [[elipse(8, 4, 60, 6), 'osc', 0.2]], { luz: 0.4, sombra: -0.3 })}<g transform="translate(6 -4) scale(0.8)">${cana(1)}</g></g>`, { padre: 'brazo.a', piv: [154, -292], mov: { rot: s(0.04, 1.6, 2.1) } }));
  // Lo que flota: estrellitas doradas, un semicírculo, un aro y una bolita.
  const estrella = bloque('M0 -24L7 -7L24 0L7 7L0 24L-7 7L-24 0L-7 -7Z', '#ffe18a', [[poli([[0, -24], [7, -7], [0, 0]]), 'luz', 0.3]], { luz: 0.3, sombra: -0.2 });
  partes.push(parte('estrella', [-30, -30, 30, 30], estrella, { orb: { cx: -150, cy: -460, rx: 20, ry: 20, w: 0.8, fase: 0 }, mov: { rot: s(0.4, 0.7, 0), esc: s(0.12, 2.3, 0) } }));
  partes.push(parte('semi', [-40, -30, 40, 30], bloque('M-34 14A34 34 0 0 1 34 14Z', '#ff6aa0', [[poli([[0, -20], [34, 14], [8, 14]]), 'osc', 0.25]]), { orb: { cx: 180, cy: -480, rx: 22, ry: 20, w: 0.7, fase: 2 }, mov: { rot: s(0.4, 0.6, 1) } }));
  partes.push(parte('aro', [-30, -30, 30, 30], aro(0, 0, 20, '#ff9a3a', 8), { orb: { cx: -170, cy: -260, rx: 18, ry: 26, w: 0.8, fase: 3 }, mov: { rot: s(0.5, 0.8, 0) } }));
  partes.push(parte('bola', [-20, -20, 20, 20], bola(0, 0, 15, '#b48cff'), { orb: { cx: 200, cy: -330, rx: 16, ry: 22, w: 1.0, fase: 1 } }));
  const CAB = ['cabeza', 'cara', 'pelo'];
  const final = partes.map((p) => (CAB.includes(p.id) ? mueve(p, 0, 0, 1.12, 0, -358) : p));
  return { id: 'vero', mira: -1, alto: 600, ancho: 420, color: '#ffc94a', bebida: 'cana', partes: final };
}

const ojoFeliz2 = (x, y) => trazo(`M${x - 11} ${y}Q${x} ${y + 12} ${x + 11} ${y}`, '#2a1410', 4.5) + trazo(`M${x + 9} ${y - 1}L${x + 14} ${y - 6}`, '#2a1410', 3);
