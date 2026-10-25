// Utilidades de las figuras (rig, peanas y colores de la ropa). Los cuatro amigos y Vero, hechos figura (capítulo 2, el mundo de los conceptos; docs/CAPITULO2.md).
//
// El estilo es el de la referencia 1 (esculturas de bloques, conos, cilindros y arcos sueltos, con caras mínimas: ojos
// cerrados en arco y sonrisa) con una pieza fluida de la referencia 2 en cada uno (la tela que ondea: la bajera de la
// sudadera, las solapas del borreguillo, la camisa al viento, la cola del vestido). Cada figura es un RIG de piezas
// sueltas (cabeza, cara, pelo o barba, torso, brazos, piernas, bebida y unos cuantos adornos que flotan): cada pieza es un
// dibujo en las coordenadas de la figura (origen en el centro de su peana, y negativo hacia arriba), con su punto de giro y
// sus movimientos (`mov`). El juego hornea cada pieza una vez a bitmap y por fotograma solo las traslada, gira y escala
// (src/capitulos/conceptos-rig.ts); aquí no hay animación, solo el dibujo y la descripción del movimiento.
//
// Rasgos de cada uno: docs/ESTILO.md P7 y los dibujos de src/arte/personajes/*.mjs (de ahí salen los colores `C`).
import { C as FRAN } from './personajes/fran.mjs';
import { C as PABLO } from './personajes/pablo.mjs';
import { C as CHUCHI } from './personajes/chuchi.mjs';
import { C as GUILLE } from './personajes/guille.mjs';
import { C as VERO } from './personajes/vero.mjs';
import {
  aro, bloque, bola, cana, circ, curva, elipse, gin, lienzo, mancha, nube, ojoFeliz, ojoPunto, ovoide, poli, redondo, relleno, sonrisa, tono, trazo, tubo,
} from './conceptos-estilo.mjs';

/** Una pieza de un rig: su dibujo (en coordenadas de la figura) y cómo se mueve. */
export const parte = (id, [x0, y0, x1, y1], body, o = {}) => ({ id, ...lienzo(x0, y0, x1 - x0, y1 - y0, body), caja: [x0, y0, x1, y1], cuerpo: body, ...o });
/** Una pieza movida (dx, dy) y/o agrandada `k` veces alrededor de (cx, cy): el cuerpo, la caja y el punto de giro. */
export function mueve(p, dx, dy, k = 1, cx = 0, cy = 0) {
  // Lo que flota (`orb`) se dibuja alrededor de su propio origen y lo coloca su órbita: solo se desplaza.
  if (p.orb) return { ...p, orb: { ...p.orb, cx: p.orb.cx + dx, cy: p.orb.cy + dy } };
  const T = (x, y) => [cx + (x - cx) * k + dx, cy + (y - cy) * k + dy];
  const [a, b] = T(p.caja[0], p.caja[1]);
  const [c, d] = T(p.caja[2], p.caja[3]);
  const cuerpo = `<g transform="translate(${dx + cx - cx * k} ${dy + cy - cy * k}) scale(${k})">${p.cuerpo}</g>`;
  const r = { ...p, ...lienzo(a, b, c - a, d - b, cuerpo), caja: [a, b, c, d], cuerpo };
  if (p.piv) r.piv = T(p.piv[0], p.piv[1]);
  if (p.orb) r.orb = { ...p.orb, cx: p.orb.cx + dx, cy: p.orb.cy + dy };
  return r;
}
/** Movimiento senoidal: [amplitud, frecuencia (rad/s), fase]. */
export const s = (amp, freq, fase = 0) => [amp, freq, fase];

/** Los colores de la ropa que no están en las paletas `C` (se sacan de los dibujos de cada uno). */
export const ROPA = {
  chuchi: { sudadera: '#8a2a3a', pantalon: '#2a2440', zapatilla: '#f4f1ff', acento: '#f2a13a' },
  pablo: { chaqueta: '#3a3446', borrego: '#efe3cc', vaquero: '#2f4fa8', zapatilla: '#f4f1ff', camiseta: '#d9d4e4' },
  fran: { camiseta: '#2e8a8c', vaquero: '#2c3f8a', zapato: '#26223e' },
  guille: { camisa: '#e0a82e', flor: '#c8433a', hoja: '#3f7a3c', vaquero: '#2c47a0', zapato: '#8a5a3a' },
  vero: { vestido: '#32274e', coletero: '#d6403a', dorado: VERO.gold, zapato: '#3a2a50' },
};

// ---------------------------------------------------------------- las peanas

/** Un cilindro tumbado a modo de peana redonda (Chuchi): tapa clara, lado en degradado y su sombra en el suelo. */
export function peanaCilindro(color) {
  const lado = bloque(curva([[-150, 0, 'c'], [-150, 34], [-110, 58], [0, 66], [110, 58], [150, 34], [150, 0, 'c']]), tono(color, -0.15), [[poli([[60, 0], [150, 0], [150, 34], [110, 58], [60, 62]]), 'osc', 0.3]], { luz: 0.1, sombra: -0.45, ang: 0 });
  const tapa = bloque(elipse(0, 0, 150, 34), tono(color, 0.18), [[elipse(30, 10, 120, 22), 'osc', 0.1]], { luz: 0.35, sombra: -0.1 });
  const disco = bloque('M-62 -2A62 20 0 0 1 62 -2Z', '#f0e6ff', [], { luz: 0.2, sombra: -0.25 });
  return mancha(0, 36, 230, 46, '#10052e', 0.55) + lado + tapa + disco;
}

/** Una cuña azul (Pablo): una rampa con su sombra. */
export function peanaCuna(color) {
  const frente = bloque(redondo([[-170, 12], [170, 12], [210, 62], [-130, 62]], 6), color, [[poli([[-170, 12], [-40, 12], [-80, 62], [-130, 62]]), 'luz', 0.2]]);
  const cara = bloque(redondo([[-170, 12], [-10, -26], [170, 12]], 5), tono(color, 0.16), [[poli([[-10, -26], [170, 12], [60, 12]]), 'osc', 0.18]], { luz: 0.3, sombra: -0.2 });
  const lado = bloque(redondo([[170, 12], [210, 62], [190, 40]], 3), tono(color, -0.3), [], { luz: 0, sombra: -0.2 });
  return mancha(20, 56, 250, 48, '#10052e', 0.55) + frente + cara + lado;
}

/** Un bloque rojo con un zigzag dorado (Guille). */
export function peanaCaja(color) {
  const frente = bloque(redondo([[-130, -4], [110, -4], [110, 66], [-130, 66]], 6), color, [[poli([[-130, -4], [-70, -4], [-70, 66], [-130, 66]]), 'luz', 0.16], [poli([[40, -4], [110, -4], [110, 66], [40, 66]]), 'osc', 0.15]]);
  const arriba = bloque(redondo([[-130, -4], [-92, -34], [148, -34], [110, -4]], 4), tono(color, 0.22), [], { luz: 0.3, sombra: -0.1 });
  const lado = bloque(redondo([[110, -4], [148, -34], [148, 34], [110, 66]], 4), tono(color, -0.3), [], { luz: 0, sombra: -0.2 });
  const zig = trazo('M-112 40L-84 18L-56 40L-28 18L0 40L28 18L56 40L84 18', '#ffc94a', 9);
  return mancha(10, 62, 240, 44, '#10052e', 0.55) + frente + arriba + lado + zig;
}

/** Una semiesfera sobre un cono invertido, oscuros (Fran). */
export function peanaDomo(color) {
  const cono = bloque(redondo([[-100, 6], [100, 6], [60, 70], [-60, 70]], 6), '#25203e', [[poli([[40, 6], [100, 6], [60, 70], [30, 70]]), 'osc', 0.3]], { luz: 0.3, sombra: -0.3 });
  const domo = bloque('M-130 6A130 56 0 0 1 130 6Z', color, [[poli([[20, -50], [130, 6], [30, 6]]), 'osc', 0.2], [poli([[-130, 6], [-70, -40], [-40, 6]]), 'luz', 0.2]], { luz: 0.4, sombra: -0.3 });
  const lazo = trazo('M-96 -4L-64 -22L-32 -4L0 -22L32 -4L64 -22L96 -4', '#f2a13a', 7, { opacity: 0.9 });
  return mancha(0, 60, 230, 44, '#10052e', 0.55) + cono + domo + lazo;
}

/** Una peana dorada, un plinto con un escalón (Vero). */
export function peanaOro(color) {
  const base = bloque(redondo([[-140, 10], [140, 10], [120, 66], [-120, 66]], 8), tono(color, -0.2), [[poli([[60, 10], [140, 10], [120, 66], [50, 66]]), 'osc', 0.28]], { luz: 0.25, sombra: -0.35 });
  const tapa = bloque(elipse(0, 8, 140, 30), tono(color, 0.1), [], { luz: 0.4, sombra: -0.2 });
  return mancha(0, 60, 230, 44, '#10052e', 0.55) + base + tapa;
}

