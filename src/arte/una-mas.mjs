// «Una más» (el mundo de los conceptos como metroidvania): el dibujo de los enemigos, la barra de bar, la flor de Guille, la puerta, los iconos de las
// habilidades y la jarra de la vida, como cadenas SVG puras en el estilo pictórico-geométrico del mundo de los conceptos (conceptos-estilo.mjs).
// El juego (src/conceptos/arte.ts) las hornea UNA vez a bitmap y de ahí saca los fotogramas; aquí no hay animación.
//
// Los enemigos son rigs de piezas sueltas con el mismo formato que las figuras de los amigos (conceptos-rig.mjs): cada pieza con su punto de giro
// (`piv`) y su padre (`padre`); las poses las dibuja src/conceptos/rig.ts moviendo esas piezas.
import { aro, bloque, bola, cana, circ, curva, elipse, lienzo, mancha, ojoPunto, ovoide, poli, redondo, relleno, tono, trazo, tubo } from './conceptos-estilo.mjs';
import { parte } from './conceptos-rig.mjs';

const OSC = '#2a1250';

// ---------------------------------------------------------------- el despertador de MAÑANA (y, en grande, el Gran Despertador)

/** Un despertador con patas, de cara redonda, dos campanas y un martillo: cuerpo del color `color`. Origen en el centro de los pies. */
export function despertador(o = {}) {
  const color = o.color ?? '#ff8a46';
  const oro = o.oro ?? '#ffcf4a';
  const cara = '#fff1d6';
  const partes = [];
  const pie = (x) => bloque(redondo([[x - 22, -22], [x + 22, -22], [x + 27, 3], [x - 27, 3]], 8), '#5b2c6f', [[poli([[x + 4, -22], [x + 22, -22], [x + 27, 3], [x + 7, 3]]), 'osc', 0.32], [poli([[x - 22, -22], [x - 6, -22], [x - 14, 3], [x - 27, 3]]), 'luz', 0.2]], { luz: 0.3, sombra: -0.3 });
  partes.push(parte('pie.a', [-62, -32, -2, 8], pie(-30), { piv: [-30, -24] }));
  partes.push(parte('pie.b', [2, -32, 62, 8], pie(30), { piv: [30, -24] }));
  const campana = (cx, ang) => `<g transform="translate(${cx} -112) rotate(${ang})">${
    bloque('M-30 0A30 30 0 0 1 30 0Z', oro, [[poli([[0, -30], [30, 0], [9, 0]]), 'osc', 0.3], [poli([[-30, 0], [-19, -25], [-7, 0]]), 'luz', 0.3]], { luz: 0.55, sombra: -0.3 })
    + circ(0, -32, 6, tono(oro, 0.3)) + trazo('M-30 0H30', tono(oro, -0.45), 5)}</g>`;
  partes.push(parte('campana.a', [-100, -170, -10, -90], campana(-46, -30), { piv: [-46, -112], padre: 'cuerpo' }));
  partes.push(parte('campana.b', [10, -170, 100, -90], campana(46, 30), { piv: [46, -112], padre: 'cuerpo' }));
  partes.push(parte('martillo', [-20, -170, 20, -100], trazo('M0 -108L0 -150', tono(oro, -0.4), 7) + bola(0, -154, 9, '#8a6ad0'), { piv: [0, -108], padre: 'cuerpo' }));
  // El cuerpo: una bola gorda con la esfera, el ceño y las manecillas (enfadado: ya son las siete).
  const cuerpo = ovoide(0, -60, 58, 56, color, { luz: 0.5, sombra: -0.5 })
    + `<clipPath id="dc"><path d="${elipse(0, -60, 58, 56)}"/></clipPath><g clip-path="url(#dc)">${relleno(curva([[30, -118, 'c'], [64, -100, 'c'], [66, -50], [40, -4], [12, -2], [40, -60]]), '#4a0f3a', 0.3)}${relleno(curva([[-62, -90, 'c'], [-40, -116, 'c'], [-50, -78], [-64, -52, 'c']]), '#fff0d0', 0.3)}</g>`
    + circ(0, -60, 40, tono(cara, -0.25)) + circ(-2, -62, 38, cara) + relleno(curva([[16, -98, 'c'], [38, -70, 'c'], [34, -40], [8, -24, 'c'], [22, -60]]), tono(cara, -0.18), 0.65)
    + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => circ(-2 + Math.sin((i / 12) * Math.PI * 2) * 32, -62 - Math.cos((i / 12) * Math.PI * 2) * 32, i % 3 === 0 ? 3.2 : 2, OSC)).join('')
    + trazo('M-2 -62L-2 -90', OSC, 5) + trazo('M-2 -62L16 -50', OSC, 4.5) + circ(-2, -62, 4, OSC)
    + ojoPunto(-16, -70, 6.5, '#2a1230') + ojoPunto(12, -70, 6.5, '#2a1230')
    + trazo('M-30 -88L-8 -78M24 -88L2 -78', OSC, 7.5) + trazo('M-16 -42Q-2 -52 12 -42', OSC, 4.5);
  partes.push(parte('cuerpo', [-70, -125, 70, 2], cuerpo, { piv: [0, -4] }));
  return { id: 'despertador', alto: 175, ancho: 130, color, mira: 1, partes };
}

// ---------------------------------------------------------------- el reloj de LAS TANTAS

/** Un reloj derretido que repta: charco de cuerpo violeta, esfera crema con los ojos cerrados de sueño y dos gotas que cuelgan. */
export function reloj() {
  const cuerpo = '#4f43b0';
  const oro = '#e9bd4e';
  const partes = [];
  const goo = curva([[-66, 0, 'c'], [-70, -34], [-46, -64], [-6, -76], [40, -66], [68, -34], [72, 0, 'c'], [52, -6], [40, 6, 'c'], [24, -4], [4, 4, 'c'], [-14, -6], [-32, 6, 'c'], [-50, -6]]);
  const cuerpoSvg = mancha(0, 2, 92, 14, '#10052e', 0.55)
    + bloque(goo, cuerpo, [[poli([[20, -70], [72, -34], [72, 0], [10, 0]]), 'osc', 0.28], [poli([[-70, -34], [-46, -64], [-20, -72], [-40, -30]]), 'luz', 0.3]], { luz: 0.38, sombra: -0.42 })
    + trazo('M-62 -26Q-48 -56 -8 -66', tono(cuerpo, 0.5), 5, { opacity: 0.7 })
    + circ(2, -34, 34, tono(oro, -0.2)) + circ(2, -35, 32, '#fff0cf') + relleno(curva([[22, -66, 'c'], [36, -40, 'c'], [28, -12], [8, -2, 'c'], [18, -34]]), tono('#fff0cf', -0.2), 0.7)
    + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => circ(2 + Math.sin((i / 12) * Math.PI * 2) * 25, -35 - Math.cos((i / 12) * Math.PI * 2) * 25, i % 3 === 0 ? 2.8 : 1.8, '#5a2a70')).join('')
    + trazo('M2 -35L-4 -56', '#3a1860', 4) + trazo('M2 -35L18 -28', '#3a1860', 3.5) + circ(2, -35, 3.2, '#3a1860')
    + trazo('M-17 -42Q-10 -36 -3 -42M9 -42Q16 -36 23 -42', '#3a1860', 4) + trazo('M-18 -36Q-10 -29 -2 -36M8 -36Q16 -29 24 -36', '#7a4a9a', 2.2, { opacity: 0.6 })
    + trazo('M-8 -22Q2 -16 12 -22', '#3a1860', 3.5);
  partes.push(parte('cuerpo', [-80, -90, 84, 14], cuerpoSvg, { piv: [0, 0] }));
  const gota = (x, y, r) => bloque(curva([[x, y - r * 2, 'c'], [x + r, y - r * 0.2], [x, y + r], [x - r, y - r * 0.2]]), '#7a66e0', [], { luz: 0.5, sombra: -0.3 }) + circ(x - r * 0.3, y - r * 0.2, r * 0.28, '#e9e0ff', 0.8);
  partes.push(parte('gota.a', [-58, -30, -22, 24], gota(-40, -2, 10), { piv: [-40, -12], padre: 'cuerpo' }));
  partes.push(parte('gota.b', [24, -30, 66, 24], gota(46, -2, 12), { piv: [46, -12], padre: 'cuerpo' }));
  return { id: 'reloj', alto: 95, ancho: 160, color: '#8a7aff', mira: 1, partes };
}

/** El charco que dejan: baba violeta con un brillo dorado. 150 × 26. */
export function charco() {
  const d = curva([[-72, 0, 'c'], [-60, -9], [-24, -12], [10, -10], [48, -12], [74, -4, 'c'], [60, 6], [20, 9], [-30, 8]]);
  return lienzo(-80, -16, 160, 30, bloque(d, '#5a44c0', [[poli([[-70, -2], [-30, -12], [-20, -4]]), 'luz', 0.35]], { luz: 0.4, sombra: -0.35 }) + trazo('M-50 -6Q-10 -12 30 -8', '#f6e6a0', 3, { opacity: 0.75 }) + circ(46, -4, 3, '#f6e6a0', 0.7));
}

/** Una gota que cae. */
export function gotaCae() {
  return lienzo(-12, -26, 24, 40, `<path d="${curva([[0, -24, 'c'], [10, -4], [0, 10], [-10, -4]])}" fill="#7a66e0"/><circle cx="-3" cy="-2" r="2.6" fill="#e9e0ff" fill-opacity="0.85"/>`);
}

// ---------------------------------------------------------------- la barra de bar (guardado)

/** Una barra de bar con una jarra encendida encima y dos taburetes. Origen en el suelo, centro. 240 × 170. */
export function barra() {
  const madera = '#8a4a3a';
  const taburete = (x) => bloque(redondo([[x - 7, -44], [x + 7, -44], [x + 9, 0], [x - 9, 0]], 3), '#3a2a5a', [], { luz: 0.2, sombra: -0.2 })
    + bloque(redondo([[x - 24, -64], [x + 24, -64], [x + 22, -48], [x - 22, -48]], 8), '#d9604a', [[poli([[x + 6, -64], [x + 24, -64], [x + 22, -48], [x + 2, -48]]), 'osc', 0.28]], { luz: 0.45, sombra: -0.3 });
  const frente = bloque(redondo([[-96, -84], [96, -84], [92, 0], [-92, 0]], 6), madera, [
    [poli([[-96, -84], [-50, -84], [-52, 0], [-92, 0]]), 'luz', 0.18], [poli([[40, -84], [96, -84], [92, 0], [36, 0]]), 'osc', 0.28],
    [poli([[-92, -44], [92, -44], [92, -36], [-92, -36]]), 'osc', 0.2],
  ], { luz: 0.3, sombra: -0.38 });
  const tablero = bloque(redondo([[-108, -100], [108, -100], [100, -82], [-100, -82]], 6), tono(madera, 0.35), [[poli([[30, -100], [108, -100], [100, -82], [20, -82]]), 'osc', 0.22]], { luz: 0.4, sombra: -0.15 });
  const barandilla = trazo('M-96 -26H96', '#f2c14e', 6) + trazo('M-96 -26H96', '#fff3c0', 2, { opacity: 0.7 });
  const botellas = [[-78, '#46e0d0'], [-56, '#ff7ab8'], [-34, '#ffd23a']].map(([x, c]) => bloque(redondo([[x - 8, -150], [x + 8, -150], [x + 11, -102], [x - 11, -102]], 4), c, [[poli([[x - 8, -150], [x - 2, -150], [x - 4, -102], [x - 11, -102]]), 'luz', 0.35]], { luz: 0.4, sombra: -0.3 }) + bloque(redondo([[x - 4, -166], [x + 4, -166], [x + 5, -148], [x - 5, -148]], 2), tono(c, -0.2), [], {})).join('');
  const rotulo = bloque(redondo([[-44, -204], [44, -204], [44, -172], [-44, -172]], 8), '#2a1250', [], { luz: 0.1, sombra: -0.1 }) + trazo('M-34 -188H34', '#ffd95a', 5) + trazo('M-34 -188H34', '#fffbe0', 2);
  return lienzo(-130, -214, 260, 218, taburete(-70) + taburete(70) + frente + tablero + barandilla + botellas + rotulo + `<g transform="translate(46 -100) scale(0.78)">${cana(1.3)}</g>`);
}

// ---------------------------------------------------------------- el sorbo (la jarra extra)

export function sorbo() {
  return lienzo(-34, -92, 68, 100, mancha(0, -44, 34, 46, '#ffd95a', 0.55) + `<g transform="scale(0.8)">${cana(1.0)}</g>`);
}

// ---------------------------------------------------------------- la flor de Guille

const MAGENTA = '#ff4fa8';
const TALLO = '#2fb89a';

/** Los pétalos de atrás y el tallo: 420 × 460, origen en la base del tallo. */
export function florFondo() {
  const tallo = tubo('M0 0C-10 -60 14 -110 0 -170', TALLO, 26)
    + bloque(redondo([[-4, -50], [-80, -86], [-26, -26]], 4), tono(TALLO, -0.1), [[poli([[-4, -50], [-80, -86], [-44, -60]]), 'luz', 0.3]], {})
    + bloque(redondo([[4, -90], [84, -132], [30, -70]], 4), TALLO, [[poli([[4, -90], [84, -132], [50, -96]]), 'osc', 0.25]], {});
  const petalo = (ang, c, k = 1) => `<g transform="translate(0 -200) rotate(${ang}) scale(${k})">${bloque(curva([[0, 0, 'c'], [-40, -50], [-34, -120], [0, -170, 'c'], [38, -118], [42, -50]]), c, [[poli([[0, 0], [42, -50], [38, -118], [0, -170], [6, -80]]), 'osc', 0.28], [poli([[0, 0], [-40, -50], [-34, -120], [-10, -90]]), 'luz', 0.2]], { luz: 0.4, sombra: -0.42 })}</g>`;
  return lienzo(-210, -400, 420, 410, tallo + petalo(-62, tono(MAGENTA, -0.2), 1.05) + petalo(62, tono(MAGENTA, -0.2), 1.05) + petalo(-30, tono(MAGENTA, -0.08)) + petalo(30, tono(MAGENTA, -0.08)) + petalo(0, tono(MAGENTA, 0.05), 1.1));
}

/** Los pétalos de delante, cerrados en copa: tapan a Guille hasta el pecho. */
export function florCerrada() {
  const petalo = (x, ang, c, k = 1) => `<g transform="translate(${x} -110) rotate(${ang}) scale(${k * 0.8})">${bloque(curva([[0, 0, 'c'], [-50, -40], [-46, -100], [-4, -150, 'c'], [48, -100], [52, -40]]), c, [[poli([[0, 0], [52, -40], [48, -100], [-4, -150], [8, -70]]), 'osc', 0.3], [poli([[0, 0], [-50, -40], [-46, -100], [-20, -80]]), 'luz', 0.22]], { luz: 0.4, sombra: -0.4 })}</g>`;
  return lienzo(-210, -330, 420, 340, petalo(-70, -16, tono(MAGENTA, -0.15), 1.0) + petalo(70, 16, tono(MAGENTA, -0.15), 1.0) + petalo(-26, -6, MAGENTA, 1.04) + petalo(28, 6, MAGENTA, 1.04) + petalo(0, 0, tono(MAGENTA, 0.12), 0.98)
    + trazo('M-84 -118Q0 -70 84 -118', tono(MAGENTA, 0.4), 5, { opacity: 0.6 }));
}

/** Los pétalos de delante, abiertos y caídos. */
export function florAbierta() {
  const petalo = (ang, c, k = 1) => `<g transform="translate(0 -110) rotate(${ang}) scale(${k})">${bloque(curva([[0, 0, 'c'], [-36, -40], [-30, -100], [0, -140, 'c'], [34, -98], [38, -40]]), c, [[poli([[0, 0], [38, -40], [34, -98], [0, -140], [6, -70]]), 'osc', 0.28]], { luz: 0.4, sombra: -0.4 })}</g>`;
  return lienzo(-260, -260, 520, 280, petalo(-100, tono(MAGENTA, -0.2), 1.1) + petalo(100, tono(MAGENTA, -0.2), 1.1) + petalo(-70, MAGENTA, 1.05) + petalo(70, MAGENTA, 1.05)
    + bloque('M-46 -104A46 20 0 0 1 46 -104Z', '#ffd23a', [], { luz: 0.5, sombra: -0.2 }));
}

// ---------------------------------------------------------------- la puerta (portal) y los iconos

/** Un arco de piedra con la luz del otro lado. Origen: el suelo, centro. 200 × 270. */
export function portal(color = '#ffcf6a') {
  const arco = 'M-70 0V-130A70 70 0 0 1 70 -130V0Z';
  const marco = bloque(redondo([[-96, 0], [-96, -140], [-60, -206], [60, -206], [96, -140], [96, 0]], 14), '#4a3a80', [[poli([[40, -206], [96, -140], [96, 0], [40, 0]]), 'osc', 0.3], [poli([[-96, 0], [-96, -140], [-60, -206], [-70, -100]]), 'luz', 0.22]], { luz: 0.3, sombra: -0.38 });
  const luz = `<defs><linearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d8"/><stop offset="0.5" stop-color="${color}"/><stop offset="1" stop-color="${tono(color, -0.35)}"/></linearGradient></defs><path d="${arco}" fill="url(#pl)"/>`;
  const rayos = [-40, -14, 14, 40].map((x) => trazo(`M${x} -6V-150`, '#ffffff', 5, { opacity: 0.35 })).join('');
  const clave = bloque(redondo([[-16, -222], [16, -222], [10, -196], [-10, -196]], 3), '#f2c14e', [], { luz: 0.5, sombra: -0.2 });
  return lienzo(-110, -230, 220, 236, mancha(0, -80, 110, 140, color, 0.4) + marco + luz + rayos + clave);
}

const ICONO = (cuerpo) => lienzo(-48, -48, 96, 96, cuerpo);

/** Cierzo: tres ráfagas y una hoja. */
export function iconoCierzo() {
  const c = '#46e0d0';
  return ICONO(circ(0, 0, 44, '#12304a', 0.8) + tubo('M-28 -12C-6 -26 20 -26 24 -10C26 0 14 4 6 -4', c, 7) + tubo('M-30 6C-8 -4 18 -4 26 10', tono(c, 0.2), 6) + tubo('M-20 22C0 14 14 18 20 26', c, 6)
    + bloque(curva([[14, -34, 'c'], [30, -26], [34, -10, 'c'], [18, -16]]), '#a8ff4a', [], { luz: 0.4, sombra: -0.3 }));
}

/** Teclazo: una tecla de teclado con un rayo. */
export function iconoTeclazo() {
  return ICONO(circ(0, 0, 44, '#2a1250', 0.8) + bloque(redondo([[-30, -26], [30, -26], [32, 28], [-32, 28]], 10), '#f4f1ff', [[poli([[10, -26], [30, -26], [32, 28], [12, 28]]), 'osc', 0.22]], { luz: 0.3, sombra: -0.3 })
    + bloque(redondo([[-22, -20], [22, -20], [22, 14], [-22, 14]], 7), '#d9d4f0', [], { luz: 0.3, sombra: -0.15 }) + relleno(poli([[4, -14], [-12, 4], [-2, 4], [-6, 14], [12, -4], [2, -4]]), '#ff4f6a'));
}

/** Salto de pared: dos muros y una flecha en zigzag que rebota entre ellos. */
export function iconoPared() {
  const c = '#ff9f5a';
  return ICONO(circ(0, 0, 44, '#2a1250', 0.8)
    + bloque(redondo([[-34, -30], [-22, -30], [-22, 30], [-34, 30]], 3), '#8a6ad0', [], { luz: 0.3, sombra: -0.3 })
    + bloque(redondo([[22, -30], [34, -30], [34, 30], [22, 30]], 3), '#8a6ad0', [], { luz: 0.3, sombra: -0.3 })
    + tubo('M-16 26L16 10L-16 -6L12 -22', c, 7) + relleno(poli([[4, -32], [24, -26], [10, -12]]), tono(c, 0.2)));
}

/** Mutis por el foro: un telón rojo recogido con un lazo dorado (sin uso: queda para otra entrega). */
export function iconoMutis() {
  return ICONO(circ(0, 0, 44, '#2a1250', 0.8) + bloque(curva([[-32, -30, 'c'], [0, -34, 'c'], [-8, 0], [-18, 30, 'c'], [-34, 30, 'c'], [-34, 0]]), '#d83a4a', [[poli([[-32, -30], [-10, -30], [-18, 30], [-34, 30]]), 'luz', 0.2]], { luz: 0.3, sombra: -0.4 })
    + bloque(curva([[32, -30, 'c'], [0, -34, 'c'], [8, 0], [18, 30, 'c'], [34, 30, 'c'], [34, 0]]), '#b82a3a', [[poli([[32, -30], [10, -30], [18, 30], [34, 30]]), 'osc', 0.25]], { luz: 0.3, sombra: -0.4 })
    + trazo('M-30 -6Q0 4 30 -6', '#ffd95a', 5) + aro(0, -2, 6, '#ffd95a', 4));
}

/** Un sorbo de la vida: la jarra llena o vacía. 64 × 76. */
export function jarraVida(llena) {
  const dentro = llena ? '#f0a21e' : '#3a2a62';
  const vaso = bloque(redondo([[-20, -62], [20, -62], [16, 0], [-16, 0]], 6), dentro, llena ? [[poli([[-20, -62], [-6, -62], [-4, 0], [-16, 0]]), 'luz', 0.36], [poli([[8, -62], [20, -62], [16, 0], [6, 0]]), 'osc', 0.26]] : [[poli([[-20, -62], [-8, -62], [-6, 0], [-16, 0]]), 'luz', 0.18]], { luz: 0.35, sombra: -0.4 });
  const asa = tubo('M20 -50C42 -52 44 -14 18 -14', llena ? '#f1c04a' : '#5a4a8a', 8);
  const espuma = llena ? `<g>${[[-14, -66, 9], [0, -72, 10], [13, -66, 9]].map(([x, y, r]) => bola(x, y, r, '#fff6e6', { luz: 0.1, sombra: -0.2 })).join('')}</g>` : trazo('M-18 -62H18', '#8a7ac0', 3, { opacity: 0.6 });
  return lienzo(-26, -80, 76, 86, asa + vaso + espuma);
}
