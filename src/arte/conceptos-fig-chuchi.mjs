// Chuchi, hecho figura (docs/CAPITULO2.md): ver conceptos-rig.mjs.
import { C as CHUCHI } from './personajes/chuchi.mjs';
import { aro, bloque, bola, cana, circ, curva, elipse, ojoFeliz, ovoide, poli, redondo, relleno, sonrisa, tono, trazo, tubo } from './conceptos-estilo.mjs';
import { ROPA, mueve, parte, peanaCilindro, s } from './conceptos-rig.mjs';

// ---------------------------------------------------------------- Chuchi

export function chuchi() {
  const R = ROPA.chuchi;
  const piel = '#f0b496';
  const partes = [];
  partes.push(parte('peana', [-270, -80, 270, 110], peanaCilindro('#e0903e'), { fija: true }));
  // Las piernas, finas y negras, y sus zapatillas blancas.
  partes.push(parte('pierna.a', [-90, -220, 0, -2], bloque(redondo([[-64, -206], [-22, -206], [-30, -52], [-58, -52]], 8), R.pantalon, [[poli([[-30, -206], [-22, -206], [-30, -52], [-40, -52]]), 'osc', 0.35]]) + `<g transform="translate(0 14)">${bloque(redondo([[-74, -54], [-26, -54], [-8, -32], [-10, -20], [-80, -20], [-84, -36]], 9), R.zapatilla, [[poli([[-84, -26], [-10, -26], [-10, -20], [-80, -20]]), 'osc', 0.25]], { luz: 0.1, sombra: -0.25 })}</g>`, { piv: [-42, -206], mov: { rot: s(0.03, 1.1, 0.5) } }));
  partes.push(parte('pierna.b', [-10, -220, 100, -2], bloque(redondo([[8, -206], [52, -206], [60, -56], [30, -52]], 8), R.pantalon, [[poli([[34, -206], [52, -206], [60, -56], [46, -54]]), 'osc', 0.35]]) + `<g transform="translate(0 14)">${bloque(redondo([[22, -54], [66, -54], [90, -34], [86, -20], [18, -20], [14, -36]], 9), R.zapatilla, [[poli([[14, -26], [88, -26], [86, -20], [18, -20]]), 'osc', 0.25]], { luz: 0.1, sombra: -0.25 })}</g>`, { piv: [30, -206], mov: { rot: s(0.03, 1.1, 2.2) } }));
  // La bajera de la sudadera: tela que ondea (la pieza fluida).
  partes.push(parte('tela', [-170, -190, 170, -60], bloque(curva([[-142, -174, 'c'], [142, -174, 'c'], [150, -140], [128, -110], [100, -88], [70, -112], [36, -80], [4, -112], [-30, -84], [-62, -114], [-98, -90], [-132, -118], [-150, -144]]), tono(R.sudadera, -0.18), [[poli([[30, -174], [142, -174], [128, -110], [100, -88], [70, -112]]), 'osc', 0.28]], { luz: 0.25, sombra: -0.35 }), { piv: [0, -170], onda: { amp: 0.09, w: 2.1, fase: 0.3 } }));
  // El brazo de atrás y el torso: un trapecio granate con su zigzag.
  partes.push(parte('brazo.b', [-30, -330, 190, -170], tubo('M72 -310C126 -288 140 -236 118 -196', tono(R.sudadera, -0.2), 34) + circ(116, -192, 17, piel), { piv: [74, -308], mov: { rot: s(0.05, 1.3, 1) } }));
  partes.push(parte('torso', [-160, -350, 160, -150], bloque(redondo([[-72, -334], [76, -334], [140, -166], [-144, -166]], 16), R.sudadera, [[poli([[16, -334], [76, -334], [140, -166], [40, -166]]), 'osc', 0.27], [poli([[-72, -334], [-34, -334], [-104, -166], [-144, -166]]), 'luz', 0.18], [poli([[-26, -334], [32, -334], [4, -292]]), 'osc', 0.38]])
    + trazo('M-120 -196L-90 -224L-60 -196L-30 -224L0 -196L30 -224L60 -196L90 -224L120 -196', R.acento, 8, { opacity: 0.95 }), { piv: [0, -170], mov: { esc: s(0.012, 1.7, 0), rot: s(0.02, 0.8, 0) } }));
  // La cabeza (calva con su brillo), la cara con las gafas cuadradas y la barba pelirroja recortada.
  const cabeza = ovoide(6, -400, 64, 72, piel, { luz: 0.4, sombra: -0.32 })
    + circ(-52, -388, 12, tono(piel, -0.12)) + relleno(poli([[56, -410], [90, -374], [54, -366]]), tono(piel, -0.16))
    + relleno(poli([[56, -410], [86, -378], [60, -382]]), tono(piel, 0.2), 0.9) + `<ellipse cx="-22" cy="-446" rx="22" ry="9" fill="#ffffff" fill-opacity="0.6" transform="rotate(-24 -22 -446)"/>`;
  partes.push(parte('cabeza', [-90, -490, 120, -320], cabeza, { piv: [6, -336], mov: { rot: s(0.045, 1.2, 0.6), dy: s(2.5, 1.7, 1) } }));
  const gafa = (x) => `<path d="${redondo([[x - 27, -420], [x + 27, -420], [x + 27, -386], [x - 27, -386]], 9)}" fill="#cfe7f7" fill-opacity="0.35" stroke="#241846" stroke-width="9" stroke-linejoin="round"/>`;
  partes.push(parte('cara', [-90, -450, 120, -350], gafa(-20) + gafa(44) + trazo('M7 -408L17 -408', '#241846', 7) + trazo('M-47 -406L-62 -400', '#241846', 6) + ojoFeliz(-20, -402, 12, '#4a1a30', 5) + ojoFeliz(44, -402, 12, '#4a1a30', 5), { padre: 'cabeza', piv: [6, -336], mov: { dx: s(2.5, 1.2, 0.3) } }));
  partes.push(parte('barba', [-80, -400, 130, -310], bloque(curva([[-58, -392], [-30, -372], [40, -372], [74, -394], [78, -362], [52, -330], [10, -318], [-34, -330], [-62, -360]], true, 0.9), CHUCHI.beard, [[poli([[18, -372], [74, -394], [78, -362], [52, -330], [22, -322]]), 'osc', 0.3], [poli([[-58, -392], [-30, -372], [-22, -340], [-62, -360]]), 'luz', 0.2]], { luz: 0.3, sombra: -0.4 })
    + sonrisa(14, -356, 22, '#4a1a10', 5, 0.42) + trazo('M-8 -374Q16 -382 42 -374', tono(CHUCHI.beard, -0.45), 5, { opacity: 0.7 }), { padre: 'cabeza', piv: [6, -336], mov: { rot: s(0.03, 1.5, 2) } }));
  // El brazo de delante y su caña.
  partes.push(parte('brazo.a', [-200, -330, -40, -170], tubo('M-76 -312C-170 -302 -184 -230 -104 -208', tono(R.sudadera, 0.12), 36) + circ(-92, -206, 18, piel) + circ(-98, -212, 6, '#ffffff', 0.35), { piv: [-76, -312], mov: { rot: s(0.045, 1.1, 0.2) } }));
  partes.push(parte('vaso', [-130, -300, 0, -150], `<g transform="translate(-60 -182)">${cana(1)}</g>`, { padre: 'brazo.a', piv: [-86, -204], mov: { rot: s(0.05, 1.6, 1.4) } }));
  // Lo que flota a su alrededor: una aguja de reloj (siempre llega tarde), un cono, un aro y una bolita.
  partes.push(parte('reloj', [-34, -34, 34, 34], bola(0, 0, 28, '#f6e7c8') + trazo('M0 0L0 -18M0 0L12 8', '#8a2a3a', 4) + circ(0, 0, 3.5, '#8a2a3a') + trazo(elipse(0, 0, 28, 28), '#c98f3e', 5), { orb: { cx: -150, cy: -420, rx: 24, ry: 18, w: 0.8, fase: 0 }, mov: { rot: s(0.3, 0.9, 0) } }));
  partes.push(parte('cono', [-30, -40, 30, 36], bloque(redondo([[0, -36], [26, 28], [-26, 28]], 6), '#f2a13a', [[poli([[0, -36], [26, 28], [6, 28]]), 'osc', 0.28]]), { orb: { cx: 150, cy: -310, rx: 20, ry: 30, w: 0.6, fase: 2 }, mov: { rot: s(0.35, 0.7, 1) } }));
  partes.push(parte('aro', [-30, -30, 30, 30], aro(0, 0, 20, '#ffcf4a', 8), { orb: { cx: 130, cy: -470, rx: 28, ry: 14, w: 0.9, fase: 4 }, mov: { rot: s(0.5, 0.8, 0) } }));
  partes.push(parte('bola', [-20, -20, 20, 20], bola(0, 0, 14, '#a8ff9a'), { orb: { cx: -160, cy: -250, rx: 14, ry: 26, w: 1.1, fase: 1 } }));
  const CAB = ['cabeza', 'cara', 'barba'];
  const final = partes.map((p) => {
    if (p.fija || p.id.startsWith('pierna')) return p;
    const q = CAB.includes(p.id) ? mueve(p, 0, 0, 1.14, 6, -336) : p;
    return mueve(q, 0, -30);
  });
  return { id: 'chuchi', mira: 1, alto: 520, ancho: 380, color: '#ff4f6a', bebida: 'cana', pie: [0, 0], partes: final };
}
