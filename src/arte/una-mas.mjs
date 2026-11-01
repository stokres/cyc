// «Una más» (el mundo de los conceptos como metroidvania): el dibujo de los enemigos, la barra de bar, la flor de Guille, la puerta, los iconos de las
// habilidades y la jarra de la vida, como cadenas SVG puras en el estilo pictórico-geométrico del mundo de los conceptos (conceptos-estilo.mjs).
// El juego (src/conceptos/arte.ts) las hornea UNA vez a bitmap y de ahí saca los fotogramas; aquí no hay animación.
//
// Los enemigos son rigs de piezas sueltas con el mismo formato que las figuras de los amigos (conceptos-rig.mjs): cada pieza con su punto de giro
// (`piv`) y su padre (`padre`); las poses las dibuja src/conceptos/rig.ts moviendo esas piezas.
import { aro, bloque, bola, cana, circ, curva, elipse, lienzo, mancha, nuevoId, ojoPunto, ovoide, poli, redondo, relleno, tono, trazo, tubo } from './conceptos-estilo.mjs';
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

// ================================================================ los sobres de EL TRABAJO, el NO gigante y el guion (props de varias zonas)

const CREMA = '#f6ead0';
const ROJO = '#e8453c';
const AZUL = '#3b6fd8';

/** Un sobre con mala uva: crema, con el borde de correo aéreo, ceño fruncido y sello. `abierto`: la solapa alzada y colmillos fuera (se lanza en picado). 96 × 100. */
export function sobre(abierto = false) {
  const borde = (d, c) => trazo(d, c, 4);
  const cuerpo = bloque(redondo([[-38, -22], [38, -22], [38, 26], [-38, 26]], 5), CREMA, [[poli([[12, -22], [38, -22], [38, 26], [-4, 26]]), 'osc', 0.22], [poli([[-38, -22], [-24, -22], [-38, 6]]), 'luz', 0.3]], { luz: 0.4, sombra: -0.3 });
  const franja = borde('M-34 22H-12M-4 22H18M26 22H34', ROJO) + borde('M-34 -18H-16M-8 -18H14', AZUL);
  const ojos = ojoPunto(-15, 0, 6.5, '#2a1230') + ojoPunto(13, 0, 6.5, '#2a1230') + trazo('M-26 -10L-8 -2M24 -10L6 -2', OSC, 5.5);
  const boca = abierto
    ? relleno(poli([[-28, 8], [28, 8], [22, 20], [-22, 20]]), '#3a0a28') + relleno(poli([[-24, 8], [-17, 8], [-20.5, 16]]), '#fff6e6') + relleno(poli([[17, 8], [24, 8], [20.5, 16]]), '#fff6e6')
    : trazo('M-12 14Q0 8 12 14', OSC, 4);
  const solapa = abierto
    ? bloque(redondo([[-38, -22], [38, -22], [0, -62]], 4), tono(CREMA, -0.14), [[poli([[0, -62], [38, -22], [4, -22]]), 'osc', 0.24]], { luz: 0.3, sombra: -0.25 })
    : bloque(redondo([[-38, -22], [38, -22], [0, 8]], 4), tono(CREMA, -0.1), [[poli([[0, -22], [38, -22], [0, 8]]), 'osc', 0.2]], { luz: 0.3, sombra: -0.25 }) + bola(0, -2, 7, ROJO, { luz: 0.4, sombra: -0.4 });
  return lienzo(-48, -70, 96, 100, mancha(0, 10, 44, 10, '#10052e', 0.35) + cuerpo + franja + (abierto ? solapa + boca + ojos : boca + solapa + ojos));
}

/** Un NO gigante: letras rojas facetadas; la O es una cara furiosa. 196 × 116. */
export function noGrande() {
  const N = poli([[-84, 46], [-84, -46], [-62, -46], [-30, 14], [-30, -46], [-8, -46], [-8, 46], [-30, 46], [-62, -14], [-62, 46]]);
  const n = bloque(N, ROJO, [[poli([[-8, -46], [-8, 46], [-30, 46], [-30, -46]]), 'osc', 0.3], [poli([[-84, -46], [-62, -46], [-62, 40], [-84, 46]]), 'luz', 0.3]], { luz: 0.45, sombra: -0.4 });
  const o = ovoide(50, 0, 40, 48, ROJO, { luz: 0.5, sombra: -0.5 }) + ovoide(50, 0, 24, 33, '#3a0a18', { luz: 0.1, sombra: -0.2 })
    + circ(41, -8, 6, '#fff6e6') + circ(60, -8, 6, '#fff6e6') + circ(43, -7, 3, '#2a1230') + circ(58, -7, 3, '#2a1230')
    + trazo('M33 -20L46 -14M67 -20L54 -14', '#fff6e6', 4.5) + trazo('M38 14Q50 6 62 14', '#fff6e6', 4);
  return lienzo(-96, -58, 196, 116, mancha(0, 50, 100, 10, '#10052e', 0.35) + n + o);
}

// ================================================================ zona 3: la Pista de Baile

const ROSA = '#ff4fa8';
const TURQ = '#46e0d0';
const AMAR = '#ffd23a';
const VIO = '#9a7cff';

/** Una bola de discoteca colgada: esfera de espejitos con la cara de mala uva. `alerta`: ojos rojos y ceño (va a barrer el haz). Centrada en la bola. 80 × 84. */
export function bolaDisco(alerta = false) {
  const R = 30;
  const id = nuevoId('bd');
  const rejilla = [-21, -10.5, 0, 10.5, 21].map((x) => trazo(`M${x} -32V32`, '#5a64a0', 1.4, { opacity: 0.6 })).join('')
    + [-22, -11, 0, 11, 22].map((y) => trazo(`M-32 ${y}H32`, '#5a64a0', 1.4, { opacity: 0.6 })).join('');
  const brillos = [[-16, -16], [5, -21], [17, 1], [-6, 12], [-22, 7], [11, 19], [-2, -5]]
    .map(([x, y], i) => `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${[LUZ_B, TURQ, '#ffb8f0', AMAR][i % 4]}" fill-opacity="0.8"/>`).join('');
  const cuerpo = bola(0, 0, R, '#aab4e0', { luz: 0.6, sombra: -0.5 })
    + `<clipPath id="${id}"><circle r="${R}"/></clipPath><g clip-path="url(#${id})">${rejilla}${brillos}</g>`;
  const ojo = (x) => circ(x, 3, 8, '#fff6e6') + (alerta ? circ(x, 4, 4.6, '#d02a3a') + circ(x - 1.4, 2.6, 1.4, '#ffffff', 0.9) : ojoPunto(x, 4, 4.2, '#2a1230'));
  const cara = ojo(-11) + ojo(11)
    + trazo(alerta ? 'M-22 -8L-6 -1M22 -8L6 -1' : 'M-20 -6L-5 -3M20 -6L5 -3', OSC, alerta ? 5.5 : 4.5)
    + (alerta ? relleno(poli([[-12, 17], [12, 17], [8, 24], [-8, 24]]), '#3a0a28') : trazo('M-9 19Q0 14 9 19', OSC, 3.5));
  const tapa = bloque(redondo([[-7, -42], [7, -42], [9, -28], [-9, -28]], 2), '#7a7a9e', [], { luz: 0.3, sombra: -0.3 }) + trazo('M0 -42V-48', '#7a7a9e', 3);
  return lienzo(-40, -50, 80, 84, tapa + cuerpo + cara);
}

/** Un chupito con patas: vaso de cristal con licor verde, cara gamberra, rodaja de lima y zapatillas. Origen en los pies. 72 × 70. */
export function chupito() {
  const pierna = (x) => trazo(`M${x} -18V-6`, '#3a2a5a', 6) + bloque(redondo([[x - 9, -7], [x + 9, -7], [x + 12, 3], [x - 12, 3]], 3), '#d9604a', [[poli([[x + 3, -7], [x + 9, -7], [x + 12, 3], [x + 4, 3]]), 'osc', 0.3]], { luz: 0.3, sombra: -0.3 });
  const vaso = bloque(redondo([[-25, -64], [25, -64], [19, -17], [-19, -17]], 4), '#cfeff6', [[poli([[-25, -64], [-10, -64], [-6, -17], [-19, -17]]), 'luz', 0.45], [poli([[12, -64], [25, -64], [19, -17], [8, -17]]), 'osc', 0.18]], { luz: 0.4, sombra: -0.25 });
  const licor = bloque(redondo([[-22, -46], [22, -46], [17, -19], [-17, -19]], 3), '#9be04a', [[poli([[8, -46], [22, -46], [17, -19], [4, -19]]), 'osc', 0.25]], { luz: 0.35, sombra: -0.35 });
  const cara = ojoPunto(-8, -34, 5.4, '#2a1230') + ojoPunto(8, -34, 5.4, '#2a1230') + trazo('M-15 -43L-3 -39M15 -43L3 -39', OSC, 3.6) + trazo('M-8 -25Q2 -20 11 -27', OSC, 3.2);
  const lima = `<g transform="translate(22 -64) rotate(20)">${bola(0, 0, 11, '#9bd13c')}${circ(0, 0, 8, '#d7f27a')}${[0, 1, 2, 3, 4, 5].map((i) => trazo(`M0 0L${(Math.cos((i / 6) * Math.PI * 2) * 7).toFixed(1)} ${(Math.sin((i / 6) * Math.PI * 2) * 7).toFixed(1)}`, '#9bd13c', 1.2)).join('')}</g>`;
  return lienzo(-36, -78, 72, 82, mancha(0, 1, 30, 6, '#10052e', 0.4) + pierna(-10) + pierna(10) + vaso + licor + cara + trazo('M-25 -64H25', '#ffffff', 2.4, { opacity: 0.7 }) + lima);
}

/** Un altavoz con cara: dos tweeters de ojos y el woofer de boca abierta; remates rosas. Origen en los pies. 88 × 118. */
export function altavoz() {
  const caja = bloque(redondo([[-32, -108], [32, -108], [34, -8], [-34, -8]], 8), '#3a2a6a', [[poli([[10, -108], [32, -108], [34, -8], [14, -8]]), 'osc', 0.3], [poli([[-32, -108], [-20, -108], [-22, -8], [-34, -8]]), 'luz', 0.22]], { luz: 0.3, sombra: -0.4 });
  const ribete = trazo('M-30 -104H30M-32 -12H32', ROSA, 3.4, { opacity: 0.9 });
  const pie = (x) => bloque(redondo([[x - 9, -8], [x + 9, -8], [x + 11, 2], [x - 11, 2]], 3), '#1c1238', [], { luz: 0.2, sombra: -0.2 });
  const ojo = (x) => circ(x, -84, 13, '#8a8ac8') + circ(x, -84, 11, '#fff6e6') + ojoPunto(x + 1, -83, 6, '#2a1230');
  const woofer = circ(0, -42, 25, '#120a28') + circ(0, -42, 21, '#2a1c52') + bola(0, -42, 13, '#4a3a8a', { luz: 0.6, sombra: -0.4 }) + circ(0, -42, 5, '#120a28');
  const boca = trazo('M-20 -62Q0 -52 20 -62', ROSA, 3.2, { opacity: 0.8 });
  return lienzo(-44, -116, 88, 122, mancha(0, 1, 40, 6, '#10052e', 0.4) + pie(-20) + pie(20) + caja + ribete + ojo(-14) + ojo(14) + trazo('M-26 -102L-6 -94M26 -102L6 -94', OSC, 4) + woofer + boca);
}

/** Un vinilo que vuela: disco negro con surcos y etiqueta rosa (o dorada si lo devuelve Fran). Centrado. 52 × 52. */
export function viniloDisco(devuelto = false) {
  const R = 24;
  const surcos = [20, 16, 12].map((r) => trazo(elipse(0, 0, r, r), '#3a2a5a', 1.1, { opacity: 0.8 })).join('');
  const etiqueta = devuelto ? AMAR : ROSA;
  return lienzo(-26, -26, 52, 52,
    (devuelto ? circ(0, 0, R + 2, '#ffe28a', 0.5) : '')
    + bola(0, 0, R, '#1c1238', { luz: 0.25, sombra: -0.2 }) + surcos
    + trazo('M-17 -9Q-2 -22 14 -15', '#ffffff', 2.4, { opacity: 0.45 })
    + bola(0, 0, 9, etiqueta, { luz: 0.5, sombra: -0.35 }) + circ(0, 0, 2.2, '#10052e'));
}

const LUZ_B = '#ffffff';
const PIEL_DJ = '#c98a68';

/**
 * EL DJ, de cintura para arriba tras su mesa de mezclas: chaqueta con neón, gafas de sol, cascos dorados y gorra, una cadena enorme y un disco en la mano
 * izquierda. Origen: el centro del borde de la mesa. Piezas: cuerpo (torso y mesa), cabeza, brazo.a (el del disco), brazo.b y disco.
 */
export function dj() {
  const partes = [];
  const SH = 46; // shoulders
  const brazo = (sg) => tubo(`M${sg * SH} -118Q${sg * (SH + 40)} -88 ${sg * (SH + 22)} -36`, '#3a3a82', 20) + bola(sg * (SH + 22), -32, 12, PIEL_DJ, { luz: 0.3, sombra: -0.3 });
  const discoMano = `<g transform="translate(${-(SH + 22)} -36)">${bola(0, 0, 20, '#1c1238', { luz: 0.25, sombra: -0.2 })}${bola(0, 0, 7, ROSA)}${circ(0, 0, 2, '#10052e')}</g>`;
  partes.push(parte('brazo.a', [-110, -140, -20, 0], brazo(-1), { piv: [-SH, -118], padre: 'cuerpo' }));
  partes.push(parte('disco', [-110, -80, -20, 20], discoMano, { piv: [-SH, -118], padre: 'brazo.a' }));
  partes.push(parte('brazo.b', [20, -140, 110, 0], brazo(1), { piv: [SH, -118], padre: 'cuerpo' }));
  // La cabeza: casco dorado, gorra, gafas de sol, perilla.
  const cabeza = ovoide(0, -156, 30, 33, PIEL_DJ, { luz: 0.4, sombra: -0.4 })
    + relleno(poli([[-26, -168], [26, -168], [30, -154], [-30, -154]]), '#1c1238')
    + bloque(redondo([[-24, -188], [24, -188], [30, -168], [-30, -168]], 8), '#2a2a6a', [[poli([[6, -188], [24, -188], [30, -168], [10, -168]]), 'osc', 0.3]], { luz: 0.3, sombra: -0.3 })
    + trazo('M-30 -166H30', ROSA, 3.4)
    + bloque(redondo([[-26, -162], [-3, -162], [-4, -150], [-24, -148]], 4), '#10072a', [], {}) + bloque(redondo([[3, -162], [26, -162], [24, -148], [4, -150]], 4), '#10072a', [], {})
    + trazo('M-22 -160L-12 -158M6 -160L16 -158', '#9a7cff', 2.2, { opacity: 0.8 })
    + trazo('M-8 -156H8', '#10072a', 3)
    + trazo('M-12 -132Q0 -126 12 -132', '#2a1230', 3.6) + relleno(poli([[-5, -128], [5, -128], [0, -118]]), '#2a1230')
    + trazo('M-34 -158Q-40 -176 -30 -184M34 -158Q40 -176 30 -184', AMAR, 7) + circ(-36, -152, 10, AMAR) + circ(36, -152, 10, AMAR) + circ(-36, -152, 5, tono(AMAR, -0.35)) + circ(36, -152, 5, tono(AMAR, -0.35))
    + trazo('M-32 -184Q0 -204 32 -184', AMAR, 6);
  partes.push(parte('cabeza', [-50, -214, 50, -110], cabeza, { piv: [0, -128], padre: 'cuerpo' }));
  // El cuerpo: torso, cadena y la mesa con dos platos.
  const torso = bloque(redondo([[-SH - 6, -118], [SH + 6, -118], [SH + 20, -20], [-SH - 20, -20]], 14), '#3a3a82', [[poli([[14, -118], [SH + 6, -118], [SH + 20, -20], [20, -20]]), 'osc', 0.3], [poli([[-SH - 6, -118], [-30, -118], [-34, -20], [-SH - 20, -20]]), 'luz', 0.2]], { luz: 0.35, sombra: -0.4 })
    + trazo('M-30 -112L-34 -24M30 -112L34 -24', TURQ, 3.2) + trazo('M-22 -118Q0 -92 22 -118', AMAR, 5) + circ(0, -90, 8, AMAR) + circ(0, -90, 4, tono(AMAR, -0.3));
  const mesa = bloque(redondo([[-96, -42], [96, -42], [104, 6], [-104, 6]], 8), '#1c1238', [[poli([[40, -42], [96, -42], [104, 6], [30, 6]]), 'osc', 0.3]], { luz: 0.25, sombra: -0.3 })
    + trazo('M-96 -40H96', ROSA, 3.4) + trazo('M-88 4H88', TURQ, 2.4, { opacity: 0.7 })
    + [-1, 1].map((sg) => circ(sg * 62, -20, 24, '#2a2a5a') + circ(sg * 62, -20, 20, '#0e0620') + bola(sg * 62, -20, 8, sg < 0 ? ROSA : TURQ, { luz: 0.4, sombra: -0.3 })).join('')
    + [-14, 0, 14].map((x) => trazo(`M${x} -34V-10`, '#8a8ac8', 3) + circ(x, -22 + (x % 3), 4, AMAR)).join('');
  partes.push(parte('cuerpo', [-110, -150, 110, 12], mancha(0, 4, 110, 10, '#10052e', 0.4) + torso + mesa, { piv: [0, 0] }));
  // De atrás adelante: el cuerpo y la mesa, el brazo libre, la cabeza, y delante el brazo del disco.
  const orden = ['cuerpo', 'brazo.b', 'cabeza', 'brazo.a', 'disco'];
  partes.sort((p, q) => orden.indexOf(p.id) - orden.indexOf(q.id));
  return { id: 'dj', alto: 215, ancho: 220, color: ROSA, mira: 1, partes };
}

// La jaula de go-go en la que baila Chuchi, bajo la bola gigante. Origen en el suelo, centro; Chuchi se ve entre lo de atrás y lo de delante.

const CROMO = '#cfd6ee';
const barras = (xs, y0, y1) => xs.map((x) => tubo(`M${x} ${y0}V${y1}`, CROMO, 7, { luz: 0.4, sombra: -0.35 })).join('');

/** Lo de atrás: la bola gigante colgada de su cadena, el fondo de barras, el aro de arriba y la tarima con luces. 260 × 440. */
export function jaulaFondo() {
  const R = 54;
  const id = nuevoId('jb');
  const rej = [-36, -18, 0, 18, 36].map((x) => trazo(`M${x} ${-R}V${R}`, '#5a64a0', 1.6, { opacity: 0.6 })).join('') + [-36, -18, 0, 18, 36].map((y) => trazo(`M${-R} ${y}H${R}`, '#5a64a0', 1.6, { opacity: 0.6 })).join('');
  const brillos = [[-26, -26, ROSA], [10, -36, TURQ], [30, 2, AMAR], [-10, 22, '#ffffff'], [-38, 10, VIO], [20, 34, ROSA], [-4, -8, '#ffffff'], [36, -22, TURQ]]
    .map(([x, y, c]) => `<rect x="${x - 8}" y="${y - 8}" width="16" height="16" fill="${c}" fill-opacity="0.75"/>`).join('');
  const bolaG = `<g transform="translate(0 -318)">${trazo(`M0 ${-R} V-120`, '#7a7a9e', 5)}${bola(0, 0, R, '#aab4e0', { luz: 0.6, sombra: -0.5 })}<clipPath id="${id}"><circle r="${R}"/></clipPath><g clip-path="url(#${id})">${rej}${brillos}</g></g>`;
  const aro = trazo(elipse(0, -236, 92, 16), CROMO, 7) + trazo(elipse(0, -236, 92, 16), '#ffffff', 2.4, { opacity: 0.6 });
  const tarima = bloque(redondo([[-104, -16], [104, -16], [112, 0], [-112, 0]], 6), '#3a2a6a', [[poli([[40, -16], [104, -16], [112, 0], [30, 0]]), 'osc', 0.3]], { luz: 0.3, sombra: -0.35 })
    + trazo('M-100 -12H100', ROSA, 4) + [-72, -36, 0, 36, 72].map((x, i) => circ(x, -6, 5, [ROSA, TURQ, AMAR, VIO, ROSA][i])).join('');
  return lienzo(-130, -440, 260, 446, mancha(0, -2, 120, 12, '#10052e', 0.4) + bolaG + barras([-72, -36, 0, 36, 72], -16, -236) + aro + tarima);
}

/** Las barras de delante, de la tarima al aro, con el cierre. 232 × 250. */
export function jaulaCerrada() {
  const frente = barras([-90, -60, -30, 0, 30, 60, 90], -12, -240);
  const aro = trazo('M-92 -236Q0 -212 92 -236', CROMO, 7) + trazo('M-92 -120Q0 -98 92 -120', CROMO, 5, { opacity: 0.9 });
  const candado = bloque(redondo([[-16, -142], [16, -142], [16, -118], [-16, -118]], 4), AMAR, [], { luz: 0.5, sombra: -0.3 }) + trazo('M-9 -142V-154A9 9 0 0 1 9 -154V-142', tono(AMAR, -0.3), 4);
  return lienzo(-116, -250, 232, 250, frente + aro + candado);
}

/** Lo que queda al abrirse: la puerta caída hacia un lado y barras torcidas, con confeti. 300 × 80. */
export function jaulaAbierta() {
  const puerta = `<g transform="translate(-112 -6) rotate(-74)">${barras([-12, 0, 12], 0, -116)}${trazo('M-18 -8H18M-18 -108H18', CROMO, 5)}</g>`;
  const torcida = tubo('M104 -4Q126 -36 108 -62', CROMO, 7) + tubo('M126 -4Q146 -22 140 -44', CROMO, 6);
  const confeti = [[-70, -10, ROSA], [-30, -4, TURQ], [10, -12, AMAR], [52, -6, VIO], [88, -14, ROSA], [-96, -4, AMAR]].map(([x, y, c]) => relleno(poli([[x - 5, y], [x + 5, y - 2], [x + 4, y + 3]]), c)).join('');
  return lienzo(-170, -70, 340, 80, mancha(0, -2, 140, 8, '#10052e', 0.3) + puerta + torcida + confeti);
}

// ================================================================ zona 4: el Teatro de los Conceptos

/** EL APUNTADOR: un tipo flaco con capa violeta, capucha, gafas redondas y un lápiz tras la oreja; sostiene guiones en cada mano. Mismas piezas que el despertador. */
export function apuntador() {
  const CAPA = '#3a2a78';
  const partes = [];
  const zapato = (x) => bloque(redondo([[x - 16, -14], [x + 16, -14], [x + 22, 3], [x - 20, 3]], 6), '#1a1030', [[poli([[x + 4, -14], [x + 16, -14], [x + 22, 3], [x + 6, 3]]), 'osc', 0.3]], { luz: 0.2, sombra: -0.2 });
  partes.push(parte('pie.a', [-50, -22, -2, 8], zapato(-22), { piv: [-22, -16] }));
  partes.push(parte('pie.b', [2, -22, 50, 8], zapato(22), { piv: [22, -16] }));
  const brazo = (sg) => `<g>${tubo(`M${sg * 34} -150Q${sg * 74} -128 ${sg * 70} -100`, tono(CAPA, 0.1), 20)}${bola(sg * 70, -96, 12, '#f1dcc4', { luz: 0.3, sombra: -0.3 })}`
    + `<g transform="translate(${sg * 74} -104) rotate(${sg * 18})">${bloque(redondo([[-9, -34], [9, -34], [9, 34], [-9, 34]], 5), CREMA, [[poli([[2, -34], [9, -34], [9, 34], [2, 34]]), 'osc', 0.24]], { luz: 0.4, sombra: -0.3 })}${trazo('M-9 -20H9M-9 -8H9M-9 4H9', tono(CREMA, -0.45), 2)}${trazo('M-9 24H9', ROJO, 4)}</g></g>`;
  partes.push(parte('campana.a', [-110, -170, -20, -50], brazo(-1), { piv: [-34, -150], padre: 'cuerpo' }));
  partes.push(parte('campana.b', [20, -170, 110, -50], brazo(1), { piv: [34, -150], padre: 'cuerpo' }));
  partes.push(parte('martillo', [-60, -222, -20, -170], trazo('M-46 -212L-34 -176', '#f2c14e', 6) + relleno(poli([[-36, -176], [-32, -170], [-28, -176]]), '#2a1230'), { piv: [-34, -178], padre: 'cuerpo' }));
  const cuerpo = mancha(0, 0, 70, 10, '#10052e', 0.45)
    + bloque('M-46 -18L-34 -150A40 22 0 0 1 34 -150L46 -18Z', CAPA, [[poli([[14, -172], [34, -150], [46, -18], [10, -18]]), 'osc', 0.3], [poli([[-34, -150], [-44, -60], [-46, -18], [-24, -18]]), 'luz', 0.22]], { luz: 0.4, sombra: -0.45 })
    + trazo('M0 -140L0 -24', tono(CAPA, -0.4), 3)
    + ovoide(0, -178, 34, 36, tono(CAPA, 0.1), { luz: 0.3, sombra: -0.4 })
    + ovoide(0, -174, 24, 27, '#f1dcc4', { luz: 0.3, sombra: -0.25 })
    + circ(-11, -176, 11, '#fff6e6') + circ(11, -176, 11, '#fff6e6') + trazo(elipse(-11, -176, 11, 11), '#f2c14e', 3) + trazo(elipse(11, -176, 11, 11), '#f2c14e', 3) + trazo('M-1 -176H1', '#f2c14e', 3)
    + circ(-10, -175, 4, '#2a1230') + circ(12, -175, 4, '#2a1230') + trazo('M-22 -190L-4 -184M22 -190L4 -184', OSC, 3.5)
    + ovoide(0, -160, 5, 7, '#7a2a3a', { luz: 0.1, sombra: -0.2 });
  partes.push(parte('cuerpo', [-70, -222, 70, 6], cuerpo, { piv: [0, -4] }));
  return { id: 'apuntador', alto: 230, ancho: 170, color: CAPA, mira: 1, partes };
}

/** Un guion enrollado que vuela. 60 × 32. */
export function guion() {
  return lienzo(-30, -16, 60, 32, bloque(redondo([[-26, -11], [26, -11], [26, 11], [-26, 11]], 6), CREMA, [[poli([[0, -11], [26, -11], [26, 11], [0, 11]]), 'osc', 0.24]], { luz: 0.4, sombra: -0.3 })
    + trazo('M-14 -6H10M-14 0H14M-14 6H6', tono(CREMA, -0.5), 2.2) + trazo('M-26 -11V11', ROJO, 5) + trazo('M20 -11V11', ROJO, 4));
}

/** El foco al que atan a Pablo: trípode, lámpara y el cono de luz. Origen en el suelo. */
export function focoFondo() {
  const patas = tubo('M0 -210L-86 0', '#5a4a7a', 11) + tubo('M0 -210L86 0', '#5a4a7a', 11) + tubo('M0 -210L0 -4', '#6a5a8a', 11);
  const lampara = `<g transform="translate(0 -236) rotate(-24)">${bloque(redondo([[-40, -30], [40, -30], [48, 38], [-48, 38]], 8), '#403458', [[poli([[14, -30], [40, -30], [48, 38], [22, 38]]), 'osc', 0.3]], { luz: 0.35, sombra: -0.4 })}${bola(0, 40, 36, '#fff3b0', { luz: 0.3, sombra: -0.15 })}${circ(0, 40, 22, '#ffffff', 0.7)}</g>`;
  const cono = `<defs><linearGradient id="fc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0" stop-opacity="0.55"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0.08"/></linearGradient></defs><path d="M-22 -206L-210 0H130Z" fill="url(#fc)"/>`;
  return lienzo(-230, -290, 380, 296, cono + patas + lampara);
}
export function focoCerrada() {
  const soga = (d) => tubo(d, '#9a6a3a', 9, { luz: 0.35, sombra: -0.4 });
  return lienzo(-110, -190, 220, 200, soga('M-66 -150Q0 -118 66 -156') + soga('M-70 -112Q0 -80 70 -118') + soga('M-64 -76Q0 -46 66 -82') + soga('M-62 -42Q0 -16 62 -46'));
}
export function focoAbierta() {
  const soga = (d) => tubo(d, '#9a6a3a', 9, { luz: 0.35, sombra: -0.4 });
  return lienzo(-170, -34, 340, 44, soga('M-120 -8Q-60 -26 0 -8T120 -10') + soga('M-90 2Q-30 -12 30 2T130 0'));
}
