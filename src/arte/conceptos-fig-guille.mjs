// Guille, hecho figura (docs/CAPITULO2.md): ver conceptos-rig.mjs.
import { C as GUILLE } from './personajes/guille.mjs';
import { aro, bloque, bola, circ, curva, elipse, gin, nube, ojoFeliz, poli, redondo, relleno, sonrisa, tono, trazo, tubo } from './conceptos-estilo.mjs';
import { ROPA, mueve, parte, peanaCaja, s } from './conceptos-rig.mjs';

/** Un hibisco rojo de cinco pétalos con el centro dorado, centrado en (0, 0). */
export const hibisco = (r = 22, rojo = ROPA.guille.flor) => {
  const petalos = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * 360 - 90;
    return `<g transform="rotate(${a})">${bloque(curva([[0, 0, 'c'], [r * 0.5, -r * 0.45], [r * 0.62, -r * 0.95], [0, -r * 1.05], [-r * 0.6, -r * 0.9], [-r * 0.45, -r * 0.4]]), i % 2 ? rojo : tono(rojo, 0.12), [], { luz: 0.3, sombra: -0.3 })}</g>`;
  }).join('');
  return petalos + circ(0, 0, r * 0.2, '#ffd95a') + trazo(`M0 0L${r * 0.35} ${-r * 0.5}`, '#ffd95a', 2.4) + circ(r * 0.35, -r * 0.5, r * 0.08, '#ffffff');
};
/** Una hoja verde (para la camisa hawaiana), apuntando a la derecha. */
export const hoja = (l = 40, verde = ROPA.guille.hoja) => bloque(curva([[0, 0, 'c'], [l * 0.4, -l * 0.3], [l, 0, 'c'], [l * 0.4, l * 0.3]]), verde, [[poli([[0, 0], [l, 0], [l * 0.4, l * 0.3]]), 'osc', 0.25]], { luz: 0.3, sombra: -0.35 }) + trazo(`M2 0L${l * 0.9} 0`, tono(verde, 0.3), 2);

export function guille() {
  const R = ROPA.guille;
  const piel = GUILLE.skin;
  const partes = [];
  partes.push(parte('peana', [-270, -80, 270, 110], peanaCaja('#c43f4a'), { fija: true }));
  // Vaqueros largos (es el más alto) y zapatos marrones.
  const pierna = (x, pie) => bloque(redondo([[x - 28, -250], [x + 26, -250], [x + 30, -140], [x + 28, -42], [x - 26, -42], [x - 30, -140]], 6), R.vaquero, [[poli([[x + 4, -250], [x + 26, -250], [x + 30, -140], [x + 28, -42], [x + 8, -42]]), 'osc', 0.26], [poli([[x - 30, -150], [x + 30, -150], [x + 30, -138], [x - 30, -138]]), 'osc', 0.18]])
    + `<g transform="translate(0 12)">${bloque(redondo([[x - 30, -54], [x + 30, -54], [x + pie, -36], [x + pie - 2, -22], [x - 34, -22], [x - 36, -38]], 9), R.zapato, [[poli([[x - 36, -28], [x + pie, -28], [x + pie - 2, -22], [x - 34, -22]]), 'osc', 0.28]], { luz: 0.2, sombra: -0.3 })}</g>`;
  partes.push(parte('pierna.a', [-100, -260, 20, -2], pierna(-46, 52), { piv: [-46, -250], mov: { rot: s(0.025, 1.0, 0.8) } }));
  partes.push(parte('pierna.b', [-10, -260, 120, -2], pierna(38, 58), { piv: [38, -250], mov: { rot: s(0.025, 1.0, 2.5) } }));
  // La camisa al viento: el faldón amarillo con sus flores, que ondea.
  partes.push(parte('tela', [-110, -280, 130, -140], bloque(curva([[-50, -270, 'c'], [66, -270, 'c'], [90, -230], [70, -190], [48, -160], [26, -196], [0, -172], [-26, -206], [-52, -176], [-70, -214]]), R.camisa, [[poli([[20, -270], [66, -270], [90, -230], [70, -190], [48, -160]]), 'osc', 0.25]], { luz: 0.3, sombra: -0.35 })
    + `<g transform="translate(-6 -214) scale(0.8)">${hibisco(22)}</g>` + `<g transform="translate(40 -204)"><g transform="rotate(60)">${hoja(26)}</g></g>`, { piv: [8, -270], onda: { amp: 0.1, w: 2.2, fase: 0.9 } }));
  // El brazo de atrás (colgando) y el torso: un triángulo amarillo con hibiscos y hojas.
  partes.push(parte('brazo.b', [60, -400, 170, -220], tubo('M82 -388C122 -350 128 -290 116 -244', piel, 30) + circ(114, -238, 15, piel) + bloque(curva([[60, -396], [108, -400], [118, -356], [78, -340]]), R.camisa, [], {}), { piv: [80, -388], mov: { rot: s(0.05, 1.2, 0.3) } }));
  const cuerpo = bloque(redondo([[-96, -410], [112, -396], [62, -240], [-46, -240]], 14), R.camisa, [[poli([[22, -406], [112, -396], [62, -240], [10, -240]]), 'osc', 0.26], [poli([[-96, -410], [-52, -408], [-72, -250], [-46, -240]]), 'luz', 0.2]], { luz: 0.3, sombra: -0.32 });
  const piel2 = relleno(poli([[-26, -408], [30, -404], [-2, -330]]), tono(piel, -0.05)) + relleno(poli([[-26, -408], [-10, -406], [-2, -330]]), tono(piel, 0.15), 0.6);
  const estampado = [[-58, -366, 24, 0.8], [58, -352, 26, 1], [-22, -300, 22, 0.9], [34, -288, 24, 0.8]].map(([x, y, r, k]) => `<g transform="translate(${x} ${y}) scale(${k})">${hibisco(r)}</g>`).join('')
    + [[-76, -310, 20, 30], [60, -318, 24, -150], [-14, -262, 18, 140], [20, -380, 22, 50]].map(([x, y, l, a]) => `<g transform="translate(${x} ${y}) rotate(${a})">${hoja(l + 8)}</g>`).join('');
  partes.push(parte('torso', [-130, -430, 140, -230], cuerpo + estampado + piel2 + trazo('M-26 -408L-2 -330L30 -404', tono(R.camisa, 0.25), 6), { piv: [0, -244], mov: { esc: s(0.012, 1.7, 1.2), rot: s(0.02, 0.8, 2) } }));
  // La cabeza (bloque con sombra de barba), su cara mínima y el pelo negro rizado, abundante, en tres matas.
  const cab = bloque(redondo([[-50, -540], [46, -544], [62, -500], [58, -440], [30, -408], [-30, -414], [-54, -470]], 16), piel, [[poli([[24, -544], [62, -500], [58, -440], [30, -408], [14, -480]]), 'osc', 0.18], [poli([[-50, -540], [-8, -542], [-18, -500], [-54, -470]]), 'luz', 0.25]], { luz: 0.35, sombra: -0.3 })
    + relleno(poli([[56, -506], [88, -468], [54, -460]]), tono(piel, -0.14)) + relleno(poli([[56, -506], [84, -472], [60, -476]]), tono(piel, 0.22), 0.9) + circ(-52, -480, 12, tono(piel, -0.14))
    + relleno(curva([[-52, -448], [-28, -430], [0, -424], [34, -430], [60, -448], [58, -440], [30, -408], [-30, -414]]), tono(GUILLE.hair, 0.2), 0.35);
  partes.push(parte('cabeza', [-90, -580, 120, -390], cab, { piv: [0, -410], mov: { rot: s(0.05, 1.1, 1.2), dy: s(2.5, 1.6, 2) } }));
  partes.push(parte('cara', [-70, -520, 100, -430], ojoFeliz(-12, -494, 11, '#2a1410', 5) + ojoFeliz(36, -494, 11, '#2a1410', 5) + trazo('M-28 -514L0 -518M22 -518L50 -514', GUILLE.hair, 7) + sonrisa(14, -456, 19, '#6a2828', 5, 0.5), { padre: 'cabeza', piv: [0, -410], mov: { dx: s(2, 1.1, 0.7) } }));
  const cabellos = (rizos, c) => nube(rizos, c, { luz: 0.4, sombra: -0.55 });
  partes.push(parte('pelo.a', [-120, -640, 20, -450], cabellos([[-62, -520, 26], [-76, -552, 24], [-58, -584, 26], [-30, -604, 24], [-82, -500, 18]], GUILLE.hair), { padre: 'cabeza', piv: [-30, -520], mov: { rot: s(0.06, 1.7, 0.2) } }));
  partes.push(parte('pelo.b', [-60, -660, 110, -520], cabellos([[-30, -580, 28], [0, -604, 32], [34, -592, 28], [14, -566, 24], [-14, -570, 22]], GUILLE.hair), { padre: 'cabeza', piv: [0, -540], mov: { rot: s(0.04, 1.4, 1.5), dy: s(3, 1.9, 0.4) } }));
  partes.push(parte('pelo.c', [0, -640, 140, -450], cabellos([[40, -586, 26], [64, -560, 26], [76, -528, 22], [56, -604, 22], [82, -500, 16]], GUILLE.hair), { padre: 'cabeza', piv: [40, -520], mov: { rot: s(0.06, 1.6, 2.4) } }));
  // El brazo de delante: manga de la camisa, antebrazo y la copa de gin tonic.
  partes.push(parte('brazo.a', [30, -430, 230, -250], tubo('M70 -396C130 -380 160 -340 168 -304', piel, 32) + bloque(curva([[44, -412], [100, -416], [112, -372], [64, -360]]), R.camisa, [], {}) + circ(170, -298, 17, piel) + circ(165, -304, 5, '#ffffff', 0.35), { piv: [72, -396], mov: { rot: s(0.05, 1.3, 1.1) } }));
  partes.push(parte('vaso', [110, -460, 260, -270], `<g transform="translate(206 -280) scale(1.05)">${gin(1)}</g>`, { padre: 'brazo.a', piv: [170, -300], mov: { rot: s(0.05, 1.7, 2.2) } }));
  // Lo que flota: un hibisco suelto, una hoja, un triángulo amarillo y un aro verde.
  partes.push(parte('flor', [-34, -34, 34, 34], hibisco(26), { orb: { cx: -170, cy: -400, rx: 20, ry: 26, w: 0.7, fase: 2 }, mov: { rot: s(0.5, 0.6, 0) } }));
  partes.push(parte('hoja', [-30, -30, 40, 30], `<g transform="translate(-20 0)">${hoja(52)}</g>`, { orb: { cx: 190, cy: -480, rx: 24, ry: 18, w: 0.8, fase: 0 }, mov: { rot: s(0.6, 0.9, 1) } }));
  partes.push(parte('triangulo', [-34, -36, 34, 32], bloque(redondo([[0, -32], [30, 26], [-30, 26]], 6), '#ffd23a', [[poli([[0, -32], [30, 26], [8, 26]]), 'osc', 0.28]]), { orb: { cx: -150, cy: -560, rx: 18, ry: 22, w: 0.6, fase: 3 }, mov: { rot: s(0.4, 0.7, 2) } }));
  partes.push(parte('aro', [-30, -30, 30, 30], aro(0, 0, 20, '#7dffb0', 8), { orb: { cx: 180, cy: -230, rx: 20, ry: 24, w: 0.9, fase: 4 }, mov: { rot: s(0.5, 0.8, 0) } }));
  const CAB = ['cabeza', 'cara', 'pelo.a', 'pelo.b', 'pelo.c'];
  const final = partes.map((p) => (CAB.includes(p.id) ? mueve(p, 0, 0, 1.08, 0, -410) : p));
  return { id: 'guille', mira: -1, alto: 640, ancho: 420, color: '#ffd23a', bebida: 'gin', partes: final };
}
