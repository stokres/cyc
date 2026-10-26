// El mundo de los conceptos (capítulo 2, tramo final): el dibujo de todo lo que hay en él, como cadenas SVG puras. Los cuatro
// amigos y Vero son figuras de bloques, conos y arcos sueltos (conceptos-figuras.mjs); los conceptos y las formas que flotan
// están dibujados en el mismo estilo pictórico-geométrico (degradado, facetas, sombra violeta; conceptos-estilo.mjs). El juego
// lo hornea todo UNA vez a bitmap (src/capitulos/conceptos-rig.ts, docs/ESTILO.md T5.7) y le da la textura de pintura y grano
// ya en el lienzo; por fotograma solo se mueve, se gira y se escala: aquí no hay animación.
//
// Las palabras («MAÑANA», «LA ÚLTIMA»...) no se dibujan aquí: están en src/textos/capitulo2.md y las pone el juego encima del
// bitmap con la letra de la página (un SVG como imagen no carga las fuentes web).
import { C as FRAN } from './personajes/fran.mjs';
import { C as PABLO } from './personajes/pablo.mjs';
import { C as CHUCHI } from './personajes/chuchi.mjs';
import { C as GUILLE } from './personajes/guille.mjs';
import { C as VERO } from './personajes/vero.mjs';
import { aro, bloque, bola, circ, curva, elipse, lienzo, mancha, nube, nuevoId, poli, redondo, relleno, tono, trazo, tubo } from './conceptos-estilo.mjs';
import { jarraGrande } from './conceptos-fig-fran.mjs';

export { dinosaurio } from './conceptos-dino.mjs';
export { FIGURAS, figura } from './conceptos-figuras.mjs';

// ---------------------------------------------------------------- colores de cada uno (de sus paletas `C`)

/** Cada amigo con el color que lo delata, para que otros módulos (la boca, los cortes) pinten con él. */
export const COLORES = {
  fran: { principal: '#2e8a8c', claro: '#4fb0ae', hondo: '#154647', barba: FRAN.beard, halo: '#35e0cf' },
  pablo: { principal: PABLO.hair, claro: PABLO.hairLight, hondo: PABLO.hairShadow, aro: PABLO.earring, borrego: '#efe3cc', chaqueta: '#3a3446', vaquero: '#2f4fa8', halo: '#ffb35a' },
  chuchi: { principal: CHUCHI.skin, claro: CHUCHI.skinLight, hondo: CHUCHI.skinLine, gafas: CHUCHI.frame, barba: CHUCHI.beard, sudadera: '#8a2a3a', halo: '#ff4f6a' },
  guille: { principal: '#e0a82e', claro: '#f5c95f', hondo: '#8a5a12', hibisco: '#c8433a', hoja: '#3f7a3c', pelo: GUILLE.hair, halo: '#ffd23a' },
  vero: { principal: VERO.gold, claro: VERO.goldLight, hondo: VERO.goldShadow, labios: '#86283a', vestido: '#2a2140', halo: '#ffc94a' },
};

// ---------------------------------------------------------------- el marco dorado de Vero

/**
 * El marco de Vero: el mundo está dentro de ella, así que arriba y abajo hay tela dorada, como una cortina de teatro (arriba, con sus
 * pliegues y su festón; abajo, una ola de seda). Mide `ancho` unidades y se ondula en vivo cortándolo en tiras.
 */
export function marcoSuperior(ancho) {
  const w = ancho;
  const oro = VERO.gold;
  const festones = 9;
  let bajo = '';
  for (let i = festones; i >= 1; i--) bajo += `Q${((w * (i - 0.5)) / festones).toFixed(1)} ${(166 + (i % 2) * 22).toFixed(0)} ${((w * (i - 1)) / festones).toFixed(1)} 112`;
  const d = `M0 0H${w}V112${bajo}Z`;
  const id = nuevoId('mc');
  const gr = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b07a1c"/><stop offset="0.35" stop-color="#e3b445"/><stop offset="0.62" stop-color="#ffe9a0"/><stop offset="0.8" stop-color="#e3b445"/><stop offset="1" stop-color="#8a5a14"/></linearGradient></defs>`;
  // Los pliegues: una banda clara y otra oscura por festón, más anchas abajo (la tela cae en abanico).
  let pliegues = '';
  for (let i = 0; i < festones; i++) {
    const x0 = (w * i) / festones;
    const x1 = (w * (i + 1)) / festones;
    const xm = (x0 + x1) / 2;
    pliegues += `<path d="M${xm.toFixed(1)} 0L${(xm - (x1 - x0) * 0.22).toFixed(1)} 190L${(xm + (x1 - x0) * 0.22).toFixed(1)} 190Z" fill="#fff6cf" fill-opacity="0.34"/>`;
    pliegues += `<path d="M${x0.toFixed(1)} 0L${x0.toFixed(1)} 190L${(x0 + (x1 - x0) * 0.12).toFixed(1)} 190Z" fill="#4a2a04" fill-opacity="0.38"/>`;
    pliegues += `<path d="M${x1.toFixed(1)} 0L${x1.toFixed(1)} 190L${(x1 - (x1 - x0) * 0.12).toFixed(1)} 190Z" fill="#4a2a04" fill-opacity="0.38"/>`;
  }
  const clip = `<clipPath id="${id}c"><path d="${d}"/></clipPath>`;
  const canto = trazo(`M0 112${bajo.replace(/Q/g, 'Q')}`, '#7a4c10', 5, { opacity: 0.8 });
  const brillo = trazo(`M0 106H${w}`, '#fff6cf', 4, { opacity: 0.85 });
  const borla = Array.from({ length: festones }, (_, i) => {
    const x = (w * (i + 0.5)) / festones;
    const y = 166 + ((i + 1) % 2) * 0 + (i % 2) * 6;
    return trazo(`M${x.toFixed(1)} ${(y - 22).toFixed(1)}V${y.toFixed(1)}`, '#c8923a', 3) + bola(x, y + 8, 9, '#ffd36a') + circ(x - 2.5, y + 4, 2.6, '#ffffff', 0.9);
  }).join('');
  return lienzo(0, -4, w, 230, gr + clip + `<path d="${d}" fill="url(#${id})"/><g clip-path="url(#${id}c)">${pliegues}</g>` + canto + brillo + borla);
}

export function marcoInferior(ancho) {
  const w = ancho;
  const oro = VERO.gold;
  // Dos olas de seda superpuestas, la de atrás más oscura, y reflejos que corren por ellas.
  const ola = (y, a, n, fase, cierra = true) => {
    let d = `M0 ${y}`;
    const pasos = 48;
    for (let i = 1; i <= pasos; i++) {
      const x = (w * i) / pasos;
      d += `L${x.toFixed(1)} ${(y + Math.sin((i / pasos) * Math.PI * 2 * n + fase) * a).toFixed(1)}`;
    }
    return cierra ? d + `V220H0Z` : d;
  };
  const id = nuevoId('mi');
  const gr = (c, k) => `<defs><linearGradient id="${id}${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tono(c, 0.45)}"/><stop offset="0.25" stop-color="${c}"/><stop offset="1" stop-color="${tono(c, -0.55)}"/></linearGradient></defs>`;
  const atras = gr(tono(oro, -0.2), 'a') + `<path d="${ola(74, 20, 2.1, 0.8)}" fill="url(#${id}a)"/>`;
  const delante = gr(oro, 'b') + `<path d="${ola(104, 24, 1.6, 3)}" fill="url(#${id}b)"/>`;
  const pliegue = Array.from({ length: 6 }, (_, i) => {
    const x = (w * (i + 0.5)) / 6;
    return `<path d="M${x.toFixed(0)} 124Q${(x + 90).toFixed(0)} 170 ${(x + 30).toFixed(0)} 230" fill="none" stroke="#fff1b8" stroke-width="26" stroke-linecap="round" opacity="0.13"/><path d="M${(x + 110).toFixed(0)} 124Q${(x + 190).toFixed(0)} 172 ${(x + 130).toFixed(0)} 230" fill="none" stroke="#3a1c02" stroke-width="22" stroke-linecap="round" opacity="0.2"/>`;
  }).join('');
  const brillo = trazo(ola(104, 24, 1.6, 3, false), '#fff6cf', 4.5, { opacity: 0.9 }) + trazo(ola(74, 20, 2.1, 0.8, false), '#ffe9a0', 3, { opacity: 0.45 });
  return lienzo(0, 20, w, 210, atras + delante + pliegue + brillo);
}

// ---------------------------------------------------------------- los conceptos, hechos objeto

/** MAÑANA: una puerta que no se abre, con su sol pintado encima, la luz que se cuela por debajo y tres cerrojos. */
export function puertaManana() {
  const dorado = '#f5b93a';
  const rayos = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI + (i / 8) * Math.PI;
    return trazo(`M${(Math.cos(a) * 42).toFixed(1)} ${(-128 + Math.sin(a) * 42).toFixed(1)}L${(Math.cos(a) * 62).toFixed(1)} ${(-128 + Math.sin(a) * 62).toFixed(1)}`, dorado, 7);
  });
  const marco = bloque(redondo([[-74, -120], [74, -120], [74, 168], [-74, 168]], 8), '#8a5a3a', [[poli([[40, -120], [74, -120], [74, 168], [40, 168]]), 'osc', 0.3]], { luz: 0.25, sombra: -0.4 });
  const hoja = bloque(curva([[-60, 160, 'c'], [-60, -80], [-30, -112], [0, -118], [30, -112], [60, -80], [60, 160, 'c']]), '#4a6ad0', [
    [poli([[10, -118], [60, -80], [60, 160], [10, 160]]), 'osc', 0.26],
    [poli([[-60, -80], [-28, -112], [-32, 160], [-60, 160]]), 'luz', 0.2],
  ], { luz: 0.3, sombra: -0.4 });
  const paneles = [[-46, -86, 38, 90], [8, -86, 38, 90], [-46, 20, 38, 120], [8, 20, 38, 120]].map(([x, y, w, h]) => bloque(redondo([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], 5), '#34469c', [[poli([[x, y + h - 14], [x + w, y + h - 14], [x + w, y + h], [x, y + h]]), 'luz', 0.2]], { luz: 0.15, sombra: -0.3 })).join('');
  const solido = bloque('M-40 -118a40 40 0 0 1 80 0Z', dorado, [], { luz: 0.5, sombra: -0.15 });
  const luzSuelo = mancha(0, 172, 100, 16, '#ffe08a', 0.9);
  return lienzo(-110, -200, 220, 400, mancha(0, -128, 100, 70, '#ffcf6a', 0.55) + marco + hoja + paneles + rayos.join('') + solido + luzSuelo
    + bola(40, 30, 10, '#f5c94a') + [-70, 10, 90].map((y) => bloque(redondo([[-62, y], [-36, y], [-36, y + 14], [-62, y + 14]], 3), '#b0b6c4', [], { luz: 0.3, sombra: -0.3 })).join('') + bloque(redondo([[-46, 100], [-28, 100], [-28, 124], [-46, 124]], 3), '#e0483a', [], {}));
}

/** LA PENÚLTIMA: una jarra ámbar que se rellena sola, con el chorro de cerveza que sale por arriba, da la vuelta y vuelve a entrar. */
export function jarraPenultima() {
  const bucle = tubo('M-4 -170C-90 -250 80 -250 16 -176', '#f6b73c', 8, { luz: 0.4 });
  const flecha = relleno(poli([[8, -184], [30, -172], [6, -164]]), '#f6b73c');
  return lienzo(-110, -280, 240, 340, mancha(0, -60, 110, 120, '#ffb35a', 0.4) + `<g opacity="0.95" stroke-dasharray="3 12">${bucle}</g>` + flecha + `<g transform="translate(0 20) scale(1.1)">${jarraGrande()}</g>`);
}

/** El reloj derretido, colgado de una rama y goteando por los dos lados. */
export function relojDerretido() {
  const cara = curva([[-62, -20], [-44, -58], [4, -64], [46, -50], [66, -6], [60, 34], [64, 80, 'c'], [48, 60], [38, 100, 'c'], [24, 60], [4, 76], [-14, 52], [-30, 92, 'c'], [-44, 52], [-62, 62, 'c'], [-66, 20]]);
  const cuerpo = bloque(cara, '#f6e8c4', [[curva([[-66, 30], [-40, 20], [0, 36], [40, 20], [62, 34], [62, 80], [-60, 70]]), 'osc', 0.18], [curva([[-62, -20], [-44, -58], [4, -64], [46, -50], [66, -6], [30, -20], [-20, -30]]), 'luz', 0.4]], { luz: 0.3, sombra: -0.28 });
  const rama = bloque(redondo([[-100, -92], [100, -92], [100, -78], [-100, -78]], 7), '#7a5a8a', [[poli([[-100, -78], [100, -78], [100, -84], [-100, -84]]), 'luz', 0.3]], { luz: 0.25, sombra: -0.4 });
  const marca = [0, 1, 2, 3, 4, 5].map((i) => circ(Math.cos((i / 6) * Math.PI * 2 - 1.2) * 44, Math.sin((i / 6) * Math.PI * 2 - 1.2) * 34 - 6, 3.2, '#5a2a50')).join('');
  return lienzo(-100, -100, 200, 210, mancha(0, 0, 100, 100, '#ffd9a0', 0.35) + rama + trazo('M-60 -80C-72 -62 -62 -44 -50 -44', '#7a5a8a', 8) + cuerpo + marca + circ(0, -4, 4.5, '#5a2a50') + trazo('M0 -4L-4 -38', '#5a2a50', 5.5) + trazo('M0 -4L26 8', '#5a2a50', 5.5));
}

/** El «NO» que rebota: dos letras gordas dibujadas con trazos (la ene y la o), rojo con su brillo y su sombra. */
export function noRebota() {
  const n = 'M-70 40V-40L-22 40V-40';
  const o = elipse(36, 0, 28, 40);
  const trazos = (dx = 0, dy = 0, color, w, extra = {}) => `<g transform="translate(${dx} ${dy})">${trazo(n, color, w, extra)}${trazo(o, color, w, extra)}</g>`;
  return lienzo(-100, -76, 200, 156, mancha(0, 4, 100, 70, '#ff5a4a', 0.4) + trazos(6, 8, '#4a0a3a', 28, { opacity: 0.85 }) + trazos(0, 0, '#fff1e0', 28) + trazos(0, 0, '#e8453c', 19) + trazos(-1.5, -2, '#ff9a8a', 6, { opacity: 0.8 }));
}

/** LA ÚLTIMA: la jarra que nadie ha visto nunca, solo su contorno a trazos y una luz blanca dentro. */
export function jarraUltima() {
  const cuerpo = curva([[-54, -150, 'c'], [54, -150, 'c'], [60, -70], [52, 0, 'c'], [-52, 0, 'c'], [-60, -70]]);
  return lienzo(-110, -260, 260, 300,
    mancha(0, -90, 130, 140, '#ffffff', 0.5)
    + relleno(cuerpo, '#ffffff', 0.22)
    + trazo(cuerpo, '#fff6e0', 9, { 'stroke-dasharray': '1 15' })
    + trazo('M56 -118C112 -126 118 -34 52 -34', '#fff6e0', 9, { 'stroke-dasharray': '1 15' })
    + trazo('M-52 -152C-44 -182 -16 -176 -2 -194C14 -176 44 -184 52 -152', '#fff6e0', 9, { 'stroke-dasharray': '1 15' }));
}

// ---------------------------------------------------------------- formas que flotan

export const FORMAS = ['circulo', 'anillo', 'triangulo', 'cubo', 'rombo', 'espiral', 'reloj', 'zigzag', 'semi', 'cruz', 'cono', 'arcos'];

/** Una forma geométrica de fondo en un color (se hornea una por tipo y color y se reutiliza a distintos tamaños y giros). */
export function forma(tipo, color) {
  const osc = tono(color, -0.5);
  const cuerpos = {
    circulo: bola(0, 0, 46, color) + `<path d="M-30 -22A38 38 0 0 1 4 -40" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.4"/>`,
    anillo: tubo(elipse(0, 0, 36, 36), color, 17),
    triangulo: bloque(redondo([[0, -48], [48, 36], [-48, 36]], 6), color, [[poli([[0, -48], [48, 36], [6, 36]]), 'osc', 0.3], [poli([[0, -48], [-48, 36], [-18, 36]]), 'luz', 0.22]]),
    cubo: bloque(poli([[0, -46], [40, -24], [0, -2], [-40, -24]]), tono(color, 0.3), [], { luz: 0.2, sombra: -0.1 }) + bloque(poli([[-40, -24], [0, -2], [0, 44], [-40, 22]]), color, [], { luz: 0.1, sombra: -0.2 }) + bloque(poli([[40, -24], [0, -2], [0, 44], [40, 22]]), tono(color, -0.32), [], { luz: 0, sombra: -0.2 }),
    rombo: bloque(poli([[0, -52], [38, 0], [0, 52], [-38, 0]]), color, [[poli([[0, -52], [38, 0], [0, 0]]), 'osc', 0.28], [poli([[0, -52], [-38, 0], [0, 0]]), 'luz', 0.25], [poli([[0, 52], [38, 0], [0, 0]]), 'osc', 0.45]]),
    espiral: tubo(`M0 0${Array.from({ length: 56 }, (_, i) => { const t = (i + 1) / 56; const a = t * Math.PI * 5; return `L${(Math.cos(a) * (4 + t * 40)).toFixed(1)} ${(Math.sin(a) * (4 + t * 40)).toFixed(1)}`; }).join('')}`, color, 9),
    reloj: bola(0, 0, 40, tono(color, 0.15)) + trazo(elipse(0, 0, 40, 40), osc, 6) + trazo('M0 0V-24M0 0L16 10', osc, 5) + circ(0, 0, 4, osc),
    zigzag: tubo('M-46 22L-22 -20L2 22L26 -20L50 22', color, 13),
    semi: bloque('M-48 22A48 48 0 0 1 48 22Z', color, [[poli([[0, -26], [48, 22], [10, 22]]), 'osc', 0.3], [poli([[-48, 22], [-24, -14], [-10, 22]]), 'luz', 0.2]]) + bloque('M-30 22A30 30 0 0 1 30 22Z', tono(color, -0.35), [], { luz: 0, sombra: -0.2 }),
    cruz: bloque(redondo([[-14, -46], [14, -46], [14, -14], [46, -14], [46, 14], [14, 14], [14, 46], [-14, 46], [-14, 14], [-46, 14], [-46, -14], [-14, -14]], 5), color, [[poli([[0, -46], [14, -46], [14, 46], [0, 46]]), 'osc', 0.22], [poli([[-46, -14], [46, -14], [46, -6], [-46, -6]]), 'luz', 0.2]]),
    cono: bloque(curva([[0, -50, 'c'], [34, 26], [26, 40], [0, 44], [-26, 40], [-34, 26]]), color, [[poli([[0, -50], [34, 26], [26, 40], [0, 44]]), 'osc', 0.3], [poli([[0, -50], [-34, 26], [-26, 40], [-8, 42]]), 'luz', 0.18]]),
    arcos: [44, 32, 20].map((r, i) => trazo(`M${-r} 14A${r} ${r} 0 0 1 ${r} 14`, i % 2 ? tono(color, 0.25) : color, 8)).join(''),
  };
  return lienzo(-64, -64, 128, 128, cuerpos[tipo]);
}

/** Una mota de luz: un puntito que brilla (se pinta con mezcla aditiva). */
export const mota = (color) => lienzo(-24, -24, 48, 48, mancha(0, 0, 24, 24, color, 0.95) + circ(0, 0, 3.2, '#ffffff', 0.95));

export { aro, nube };
