// Fran, hecho figura (docs/CAPITULO2.md): ver conceptos-rig.mjs. Corpulento, con su barba negra enorme y el bigote, la camiseta
// verde azulada y una jarra que nunca se vacía (la cerveza vuelve a caer en ella: «UNA MÁS»).
import { C as FRAN } from './personajes/fran.mjs';
import { aro, bloque, bola, circ, curva, elipse, nube, ojoPunto, ovoide, poli, redondo, relleno, tono, trazo, tubo } from './conceptos-estilo.mjs';
import { ROPA, mueve, parte, peanaDomo, s } from './conceptos-rig.mjs';

/** Una jarra gorda con asa, espuma que desborda y su cerveza (el centro del pie en (0, 0), unos 150 de alto). */
export function jarraGrande() {
  const ambar = '#f0a21e';
  const asa = tubo('M52 -118C106 -126 112 -34 50 -34', '#f1c04a', 20);
  const vaso = bloque(redondo([[-54, -150], [54, -150], [48, 0], [-48, 0]], 12), ambar, [
    [poli([[-54, -150], [-18, -150], [-12, 0], [-48, 0]]), 'luz', 0.36],
    [poli([[22, -150], [54, -150], [48, 0], [16, 0]]), 'osc', 0.26],
    [poli([[-54, -86], [54, -86], [52, -76], [-52, -76]]), 'luz', 0.14],
  ], { luz: 0.35, sombra: -0.4 });
  const burbujas = [[-22, -30, 4.5], [10, -60, 3.6], [-8, -104, 4], [24, -22, 3], [-26, -76, 3.2]].map(([x, y, r]) => circ(x, y, r, '#fff1b8', 0.7)).join('');
  const espuma = nube([[-52, -152, 18], [-30, -172, 20], [-4, -182, 22], [24, -174, 21], [48, -156, 19], [60, -138, 14], [-62, -138, 13], [0, -154, 19]], '#fff6e6', { luz: 0.15, sombra: -0.22 });
  const gotas = [[-56, -128, 7, 24], [-40, -124, 5, 14], [58, -122, 6, 20]].map(([x, y, r, l]) => `<path d="${curva([[x - r, y, 'c'], [x + r, y, 'c'], [x + r * 0.8, y + l * 0.7], [x, y + l], [x - r * 0.8, y + l * 0.7]])}" fill="#fff6e6"/>`).join('');
  return asa + vaso + burbujas + espuma + gotas;
}

export function fran() {
  const R = ROPA.fran;
  const piel = FRAN.skin;
  const partes = [];
  partes.push(parte('peana', [-270, -80, 270, 110], peanaDomo('#d9702f'), { fija: true }));
  // Las piernas, cortas y anchas, con zapatillas oscuras grandes.
  const pierna = (x, pie) => bloque(redondo([[x - 34, -196], [x + 34, -196], [x + 36, -42], [x - 32, -42]], 8), R.vaquero, [[poli([[x + 8, -196], [x + 34, -196], [x + 36, -42], [x + 12, -42]]), 'osc', 0.28]])
    + `<g transform="translate(0 12)">${bloque(redondo([[x - 38, -56], [x + 38, -56], [x + pie, -36], [x + pie, -22], [x - 42, -22], [x - 44, -38]], 10), R.zapato, [[poli([[x - 44, -28], [x + pie, -28], [x + pie, -22], [x - 42, -22]]), 'osc', 0.3], [poli([[x - 44, -38], [x - 10, -56], [x + 10, -56], [x - 20, -36]]), 'luz', 0.18]], { luz: 0.3, sombra: -0.3 })}</g>`;
  partes.push(parte('pierna.a', [-120, -210, 10, -2], pierna(-56, 56), { piv: [-56, -196], mov: { rot: s(0.02, 1.0, 1.2) } }));
  partes.push(parte('pierna.b', [-10, -210, 130, -2], pierna(50, 62), { piv: [50, -196], mov: { rot: s(0.02, 1.0, 2.8) } }));
  // La camiseta ancha: el bajo flotando como tela.
  partes.push(parte('tela', [-170, -230, 170, -110], bloque(curva([[-140, -232, 'c'], [140, -232, 'c'], [152, -196], [130, -160], [98, -134], [68, -164], [34, -126], [0, -160], [-34, -130], [-68, -166], [-104, -136], [-134, -166], [-152, -200]]), tono(R.camiseta, -0.12), [[poli([[40, -232], [140, -232], [152, -196], [130, -160], [98, -134], [68, -164]]), 'osc', 0.28]], { luz: 0.3, sombra: -0.36 }), { piv: [0, -228], onda: { amp: 0.08, w: 2.0, fase: 1.2 } }));
  // El brazo de atrás (colgando, de manga corta) y el torso: una bola gorda verde azulada.
  partes.push(parte('brazo.b', [-210, -400, -60, -220], tubo('M-112 -372C-166 -340 -176 -290 -158 -246', R.camiseta, 54) + circ(-156, -240, 19, piel), { piv: [-110, -372], mov: { rot: s(0.05, 1.2, 0.6) } }));
  const torso = ovoide(0, -296, 156, 140, R.camiseta, { luz: 0.45, sombra: -0.42 })
    + `<clipPath id="ft"><path d="${elipse(0, -296, 156, 140)}"/></clipPath><g clip-path="url(#ft)">`
    + relleno(curva([[40, -430, 'c'], [160, -430, 'c'], [170, -300], [120, -190], [30, -156], [80, -260]]), '#0c2c3a', 0.28)
    + relleno(curva([[-170, -380, 'c'], [-90, -430, 'c'], [-110, -330], [-150, -240, 'c'], [-170, -250, 'c']]), '#9ff0ec', 0.22)
    + trazo('M-110 -250Q-40 -210 40 -222Q100 -232 130 -270', tono(R.camiseta, 0.3), 6, { opacity: 0.5 })
    + `</g>` + trazo('M-52 -418Q0 -396 52 -418', tono(R.camiseta, -0.35), 10, { opacity: 0.8 });
  partes.push(parte('torso', [-190, -450, 190, -150], torso, { piv: [0, -200], mov: { esc: s(0.016, 1.5, 0), rot: s(0.015, 0.8, 0.5) } }));
  // La cabeza, con su pelo corto, la barba negra enorme (una nube de rizos) y el bigote.
  const cab = bloque(redondo([[-54, -540], [56, -540], [66, -490], [58, -440], [-4, -420], [-58, -442], [-66, -494]], 16), piel, [[poli([[30, -540], [66, -490], [58, -440], [14, -424], [10, -490]]), 'osc', 0.18], [poli([[-54, -540], [-12, -540], [-24, -492], [-66, -494]]), 'luz', 0.25]], { luz: 0.35, sombra: -0.3 })
    + relleno(poli([[56, -494], [90, -458], [54, -452]]), tono(piel, -0.14)) + relleno(poli([[56, -494], [86, -462], [60, -466]]), tono(piel, 0.22), 0.9)
    + bloque(redondo([[-60, -548], [58, -548], [66, -514], [30, -520], [-30, -524], [-66, -512]], 10), FRAN.hair, [[poli([[20, -548], [58, -548], [66, -514], [20, -520]]), 'osc', 0.2]], { luz: 0.25, sombra: -0.45 })
    + trazo('M-40 -536Q-20 -548 4 -540', FRAN.hairGrey, 4, { opacity: 0.85 });
  partes.push(parte('cabeza', [-100, -590, 120, -400], cab, { piv: [0, -410], mov: { rot: s(0.04, 1.0, 0), dy: s(3, 1.5, 1.4) } }));
  partes.push(parte('cara', [-70, -520, 100, -440], ojoPunto(-14, -496, 8, '#2a1a16') + ojoPunto(34, -496, 8, '#2a1a16') + trazo('M-36 -516L-2 -520M18 -520L52 -514', FRAN.brow, 9), { padre: 'cabeza', piv: [0, -410], mov: { dx: s(2, 1.2, 1) } }));
  const rizosBarba = [[-60, -476, 20], [-70, -446, 24], [-62, -414, 26], [-44, -388, 28], [-18, -372, 30], [14, -370, 30], [42, -384, 28], [62, -410, 26], [68, -444, 24], [58, -474, 20], [-30, -420, 28], [4, -408, 30], [34, -424, 26], [-4, -440, 24]];
  partes.push(parte('barba', [-110, -500, 120, -330], nube(rizosBarba, FRAN.beard, { luz: 0.55, sombra: -0.45 })
    + bloque(curva([[-54, -446, 'c'], [-10, -462], [4, -450], [24, -462], [64, -446, 'c'], [48, -424], [18, -430], [4, -424], [-18, -430], [-44, -422]]), '#15100e', [], { luz: 0.35, sombra: -0.3 })
    + trazo('M-8 -440Q16 -428 40 -442', '#f1c7b0', 4, { opacity: 0.35 }), { padre: 'cabeza', piv: [0, -410], mov: { rot: s(0.035, 1.3, 2), esc: s(0.01, 2.2, 0.5) } }));
  // El brazo de delante, con la jarra enorme que nunca se vacía.
  partes.push(parte('brazo.a', [30, -420, 250, -170], tubo('M96 -384C170 -370 196 -320 186 -262', R.camiseta, 56) + circ(184, -250, 21, piel) + circ(178, -258, 7, '#ffffff', 0.35), { piv: [96, -384], mov: { rot: s(0.04, 1.2, 0.2) } }));
  partes.push(parte('vaso', [80, -490, 400, -130], `<g transform="translate(230 -236) scale(1.25)">${jarraGrande()}</g>`, { padre: 'brazo.a', piv: [186, -254], mov: { rot: s(0.04, 1.5, 1.8) } }));
  // La cerveza que vuelve a caer en la jarra, gota a gota, y el símbolo del infinito sobre ella.
  const gota = (r) => `<path d="${curva([[0, -r * 2.2, 'c'], [r, -r * 0.2], [0, r], [-r, -r * 0.2]])}" fill="#f6b73c"/><circle cx="${-r * 0.3}" cy="${-r * 0.1}" r="${r * 0.28}" fill="#fff1b8" fill-opacity="0.8"/>`;
  [0, 0.34, 0.67].forEach((f, i) => partes.push(parte(`gota.${i}`, [-12, -30, 12, 20], gota(8), { cae: { x: 214 + (i - 1) * 16, y: -620, alto: 110, w: 0.5, fase: f } })));
  partes.push(parte('infinito', [-60, -34, 60, 34], trazo('M-34 0C-34 -26 -4 -26 0 0C4 26 34 26 34 0C34 -26 4 -26 0 0C-4 26 -34 26 -34 0', '#ffe9a8', 11, { opacity: 0.35 }) + trazo('M-34 0C-34 -26 -4 -26 0 0C4 26 34 26 34 0C34 -26 4 -26 0 0C-4 26 -34 26 -34 0', '#ffd95a', 6), { orb: { cx: 214, cy: -690, rx: 18, ry: 8, w: 0.9, fase: 0 }, mov: { rot: s(0.08, 1.1, 0) } }));
  partes.push(parte('semi', [-40, -30, 40, 30], bloque('M-34 14A34 34 0 0 1 34 14Z', '#ff7ab8', [[poli([[0, -20], [34, 14], [8, 14]]), 'osc', 0.25]]), { orb: { cx: -190, cy: -470, rx: 22, ry: 20, w: 0.7, fase: 1 }, mov: { rot: s(0.4, 0.6, 0) } }));
  partes.push(parte('aro', [-30, -30, 30, 30], aro(0, 0, 20, '#46e0d0', 8), { orb: { cx: -200, cy: -300, rx: 18, ry: 26, w: 0.8, fase: 3 }, mov: { rot: s(0.5, 0.8, 0) } }));
  partes.push(parte('bola', [-20, -20, 20, 20], bola(0, 0, 15, '#ff9f5a'), { orb: { cx: -150, cy: -600, rx: 20, ry: 14, w: 1.0, fase: 2 } }));
  const CAB = ['cabeza', 'cara', 'barba'];
  const final = partes.map((p) => (CAB.includes(p.id) ? mueve(p, 0, 0, 1.0, 0, -410) : p));
  return { id: 'fran', mira: 1, alto: 620, ancho: 460, color: '#35e0cf', bebida: 'cana', partes: final };
}
