// Pablo, hecho figura (docs/CAPITULO2.md): ver conceptos-rig.mjs.
import { C as PABLO } from './personajes/pablo.mjs';
import { aro, bloque, bola, cana, circ, curva, nube, ojoFeliz, poli, redondo, relleno, sonrisa, tono, trazo, tubo } from './conceptos-estilo.mjs';
import { ROPA, mueve, parte, peanaCuna, s } from './conceptos-rig.mjs';

/** Pablo: pelo castaño en pinchos hacia arriba, barba, aro, chaqueta oscura de borreguillo y vaqueros, con su caña. */
export function pablo() {
  const R = ROPA.pablo;
  const piel = PABLO.skin;
  const partes = [];
  partes.push(parte('peana', [-270, -80, 270, 110], peanaCuna('#3446d6'), { fija: true }));
  // Los vaqueros: dos bloques con su rodilla, y las zapatillas blancas.
  const pierna = (x, extra = 0) => bloque(redondo([[x - 26, -214], [x + 28, -214], [x + 32, -128], [x + 30 + extra, -40], [x - 26 + extra, -40], [x - 30, -128]], 6), R.vaquero, [[poli([[x + 6, -214], [x + 28, -214], [x + 32, -128], [x + 30 + extra, -40], [x + 10 + extra, -40]]), 'osc', 0.26], [poli([[x - 30, -134], [x + 32, -134], [x + 32, -120], [x - 30, -120]]), 'osc', 0.22]]);
  const zapa = (x) => `<g transform="translate(0 12)">${bloque(redondo([[x - 32, -52], [x + 34, -52], [x + 62, -34], [x + 60, -20], [x - 36, -20], [x - 38, -38]], 9), R.zapatilla, [[poli([[x - 38, -26], [x + 60, -26], [x + 60, -20], [x - 36, -20]]), 'osc', 0.25]], { luz: 0.1, sombra: -0.25 })}</g>`;
  partes.push(parte('pierna.a', [-100, -220, 30, -2], pierna(-52) + zapa(-52), { piv: [-52, -214], mov: { rot: s(0.025, 1.0, 0.3) } }));
  partes.push(parte('pierna.b', [-20, -220, 140, -2], pierna(34, 6) + zapa(36), { piv: [34, -214], mov: { rot: s(0.025, 1.0, 2) } }));
  // Los faldones de la chaqueta, que ondean a los lados del torso.
  const faldon = (lado) => bloque(curva([[0, -230, 'c'], [lado * 40, -230, 'c'], [lado * 48, -190], [lado * 40, -150], [lado * 24, -122], [lado * 12, -150], [lado * 4, -180]]), R.chaqueta, [[poli([[0, -230], [lado * 60, -230], [lado * 74, -190], [lado * 30, -190]]), 'luz', 0.14]], { luz: 0.2, sombra: -0.4 });
  partes.push(parte('tela.a', [-130, -240, 10, -100], `<g transform="translate(-60 0)">${faldon(-1)}</g>`, { piv: [-60, -230], onda: { amp: 0.08, w: 1.9, fase: 0.5 } }));
  partes.push(parte('tela.b', [10, -240, 150, -100], `<g transform="translate(72 0)">${faldon(1)}</g>`, { piv: [72, -230], onda: { amp: 0.08, w: 1.9, fase: 2.4 } }));
  // El brazo de atrás: un arco oscuro a la izquierda.
  partes.push(parte('brazo.b', [-210, -350, -40, -170], tubo('M-84 -330C-178 -322 -196 -250 -140 -196', tono(R.chaqueta, 0.05), 36) + circ(-134, -190, 17, piel), { piv: [-82, -328], mov: { rot: s(0.05, 1.2, 1.6) } }));
  // El torso: una losa oscura de hombros anchos, con la camiseta clara en la abertura y el borreguillo en las solapas.
  const borrego = (xs) => nube(xs, R.borrego, { luz: 0.2, sombra: -0.22 });
  const cuerpo = bloque(redondo([[-112, -350], [114, -350], [90, -200], [-78, -200]], 12), R.chaqueta, [[poli([[30, -350], [114, -350], [90, -200], [44, -200]]), 'osc', 0.32], [poli([[-112, -350], [-70, -350], [-78, -200], [-92, -240]]), 'luz', 0.12]], { luz: 0.22, sombra: -0.35 });
  const camiseta = relleno(poli([[-20, -352], [26, -352], [8, -204], [-8, -204]]), R.camiseta) + relleno(poli([[8, -352], [26, -352], [8, -204]]), '#8a84a0', 0.35);
  const lapela = borrego([[-30, -338, 17], [-40, -314, 12], [-26, -300, 15], [-36, -274, 11], [-22, -262, 14], [-30, -240, 10], [-14, -234, 12]]);
  const lapelb = borrego([[36, -338, 17], [46, -312, 12], [32, -298, 15], [42, -272, 11], [28, -260, 14], [36, -238, 10], [20, -232, 12]]);
  const cuello = borrego([[-84, -340, 14], [-68, -352, 19], [-46, -348, 14], [-30, -356, 13], [40, -356, 13], [58, -350, 19], [80, -352, 15], [94, -338, 12]]);
  partes.push(parte('torso', [-130, -380, 130, -190], cuerpo + camiseta + lapela + lapelb + cuello, { piv: [0, -204], mov: { esc: s(0.012, 1.7, 0.6), rot: s(0.02, 0.8, 1) } }));
  // La cabeza: un bloque tallado de cara tranquila, con su pelo en pinchos hacia arriba, su barba y el aro.
  const cab = bloque(redondo([[-48, -436], [42, -444], [64, -398], [58, -346], [22, -318], [-34, -332], [-52, -386]], 14), piel, [[poli([[20, -444], [64, -398], [58, -346], [22, -318], [10, -380]]), 'osc', 0.2], [poli([[-48, -436], [-10, -440], [-20, -400], [-52, -386]]), 'luz', 0.25]], { luz: 0.35, sombra: -0.3 })
    + relleno(poli([[56, -402], [92, -364], [54, -356]]), tono(piel, -0.14)) + relleno(poli([[56, -402], [88, -368], [60, -372]]), tono(piel, 0.22), 0.9) + circ(-50, -380, 12, tono(piel, -0.14));
  partes.push(parte('cabeza', [-90, -470, 120, -300], cab, { piv: [0, -326], mov: { rot: s(0.05, 1.1, 0.2), dy: s(2.5, 1.6, 0.4) } }));
  partes.push(parte('cara', [-70, -430, 100, -340], ojoFeliz(-10, -388, 11, '#3a1c18', 5) + ojoFeliz(36, -388, 11, '#3a1c18', 5) + trazo('M-24 -408L2 -412M24 -412L50 -408', tono(PABLO.hair, -0.1), 6), { padre: 'cabeza', piv: [0, -326], mov: { dx: s(2, 1.1, 0) } }));
  partes.push(parte('barba', [-70, -392, 100, -290], bloque(curva([[-50, -380], [-14, -362], [44, -364], [64, -384], [66, -350], [38, -308], [4, -298], [-30, -312], [-50, -346]], true, 0.9), PABLO.beard, [[poli([[24, -364], [64, -384], [66, -350], [38, -308], [14, -300]]), 'osc', 0.3], [poli([[-50, -380], [-14, -362], [-20, -330], [-50, -346]]), 'luz', 0.18]], { luz: 0.3, sombra: -0.4 })
    + `<path d="M-8 -344Q14 -330 36 -346Q14 -354 -8 -344Z" fill="#fff6ea"/>` + sonrisa(14, -346, 22, '#3a1818', 3, 0.28), { padre: 'cabeza', piv: [0, -326], mov: { rot: s(0.03, 1.4, 1) } }));
  // El pelo: pinchos castaños revueltos hacia arriba (cada grupo se mueve a su aire).
  const pincho = (pts, c, k) => bloque(redondo(pts, 5), c, [[poli([pts[1], pts[2], [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2]]), 'osc', k]], { luz: 0.22, sombra: -0.35 });
  partes.push(parte('pelo.a', [-100, -560, 20, -400], pincho([[-54, -426], [-70, -500], [-44, -540], [-8, -440]], PABLO.hair, 0.25) + pincho([[-30, -436], [-26, -520], [10, -496], [14, -440]], PABLO.hairLight, 0.2), { padre: 'cabeza', piv: [-20, -430], mov: { rot: s(0.07, 1.8, 0.3) } }));
  partes.push(parte('pelo.b', [-10, -580, 120, -400], pincho([[4, -444], [20, -552], [66, -500], [48, -434]], PABLO.hair, 0.28) + pincho([[40, -446], [86, -520], [96, -442], [64, -410]], PABLO.hairLight, 0.2), { padre: 'cabeza', piv: [30, -440], mov: { rot: s(0.07, 2.1, 1.7) } }));
  partes.push(parte('aro', [-40, -40, 40, 40], aro(0, 12, 22, '#d9dde6', 7), { padre: 'cabeza', piv: [0, -10], orb: { cx: -60, cy: -372, rx: 0, ry: 0, w: 0, fase: 0 }, mov: { rot: s(0.35, 2.2, 0.5) } }));
  // El brazo de delante, estirado hacia delante con la caña.
  partes.push(parte('brazo.a', [40, -350, 220, -200], tubo('M82 -326C134 -318 156 -290 150 -258', tono(R.chaqueta, 0.12), 36) + circ(148, -250, 19, piel) + circ(143, -256, 6, '#ffffff', 0.35), { piv: [80, -326], mov: { rot: s(0.05, 1.2, 0.5) } }));
  partes.push(parte('vaso', [100, -380, 230, -200], `<g transform="translate(182 -236) scale(0.95)">${cana(1)}</g>`, { padre: 'brazo.a', piv: [150, -252], mov: { rot: s(0.05, 1.7, 0.9) } }));
  // Lo que flota: la máscara del teatro, un triángulo, un aro y una bola.
  const mascara = bola(0, 0, 30, '#f6e7c8') + trazo('M-17 -6Q-10 -14 -3 -6M3 -6Q10 -14 17 -6', '#8a2a3a', 4) + trazo('M-14 8Q0 22 14 8', '#8a2a3a', 4);
  partes.push(parte('mascara', [-36, -36, 36, 36], mascara, { orb: { cx: 150, cy: -480, rx: 26, ry: 16, w: 0.7, fase: 1 }, mov: { rot: s(0.3, 0.8, 0) } }));
  partes.push(parte('triangulo', [-34, -36, 34, 32], bloque(redondo([[0, -32], [30, 26], [-30, 26]], 6), '#4da0ff', [[poli([[0, -32], [30, 26], [8, 26]]), 'osc', 0.28]]), { orb: { cx: -165, cy: -330, rx: 18, ry: 28, w: 0.6, fase: 3 }, mov: { rot: s(0.4, 0.7, 2) } }));
  partes.push(parte('aro2', [-30, -30, 30, 30], aro(0, 0, 20, '#ff7ab8', 8), { orb: { cx: -150, cy: -520, rx: 26, ry: 14, w: 0.9, fase: 5 }, mov: { rot: s(0.5, 0.8, 1) } }));
  partes.push(parte('bola', [-20, -20, 20, 20], bola(0, 0, 15, '#7ae8ff'), { orb: { cx: 200, cy: -300, rx: 14, ry: 26, w: 1.1, fase: 2 } }));
  const CAB = ['cabeza', 'cara', 'barba', 'pelo.a', 'pelo.b'];
  const final = partes.map((p) => (CAB.includes(p.id) ? mueve(p, 0, 0, 1.1, 0, -326) : p));
  return { id: 'pablo', mira: 1, alto: 560, ancho: 420, color: '#ffb35a', bebida: 'cana', partes: final };
}
