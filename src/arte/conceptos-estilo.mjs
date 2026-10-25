// El estilo pictórico-geométrico del mundo de los conceptos (capítulo 2; docs/CAPITULO2.md): bloques, conos, cilindros y
// arcos con degradado y facetas, con la sombra teñida de violeta (nunca negro, docs/ESTILO.md F3) y sin contorno negro.
// Son funciones puras que devuelven cadenas SVG; el juego las hornea UNA vez a bitmap (src/capitulos/conceptos-rig.ts),
// donde además se les da la textura de pintura y grano a nivel de lienzo (no hace falta ningún filtro SVG).
//
// Las unidades son las del dibujo de cada pieza. Un dibujo se entrega como `{ x, y, w, h, svg }`.
export const NS = 'http://www.w3.org/2000/svg';
export const f = (v) => +(+v).toFixed(1);

// ---------------------------------------------------------------- color

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const aHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** El violeta hondo en el que se hunde toda sombra del mundo. */
export const HONDO = '#1b0c40';
export const LUZ = '#fff2dc';
export const mezcla = (a, b, k) => {
  const A = hex(a);
  const B = hex(b);
  return aHex(A.map((v, i) => v + (B[i] - v) * k));
};
/** Aclara (k > 0, hacia la luz cálida) u oscurece (k < 0, hacia el violeta hondo) un color. */
export const tono = (c, k) => (k >= 0 ? mezcla(c, LUZ, k) : mezcla(c, HONDO, -k));

// ---------------------------------------------------------------- formas

let uid = 0;
export const nuevoId = (p = 'g') => `${p}${++uid}`;

/** Un dibujo suelto con su caja (x, y, w, h en sus propias unidades). */
export const lienzo = (x, y, w, h, body) => ({ x, y, w, h, svg: `<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${body}</svg>` });

/** Un polígono con las esquinas redondeadas (radio r), como un bloque pintado a mano. */
export function redondo(pts, r = 10, cerrado = true) {
  const n = pts.length;
  const P = (i) => pts[(i + n) % n];
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = P(i - 1);
    const b = P(i);
    const c = P(i + 1);
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const rr = Math.min(r, ab / 2.2, bc / 2.2);
    const p1 = [b[0] + ((a[0] - b[0]) / ab) * rr, b[1] + ((a[1] - b[1]) / ab) * rr];
    const p2 = [b[0] + ((c[0] - b[0]) / bc) * rr, b[1] + ((c[1] - b[1]) / bc) * rr];
    d += `${i ? 'L' : 'M'}${f(p1[0])} ${f(p1[1])}Q${f(b[0])} ${f(b[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (cerrado ? 'Z' : '');
}

export const poli = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';

/** Una elipse como trazado (para recortes y facetas). */
export const elipse = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0Z`;

/** Una curva suave por unos puntos (Catmull-Rom); las puntas son [x, y, 'c'] para esquinas vivas. */
export function curva(pts, cerrada = true, t = 1) {
  const n = pts.length;
  const P = (i) => (cerrada ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const fin = cerrada ? n : n - 1;
  for (let i = 0; i < fin; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    const k1 = p1[2] === 'c' ? 0 : t / 6;
    const k2 = p2[2] === 'c' ? 0 : t / 6;
    d += `C${f(p1[0] + (p2[0] - p0[0]) * k1)} ${f(p1[1] + (p2[1] - p0[1]) * k1)} ${f(p2[0] - (p3[0] - p1[0]) * k2)} ${f(p2[1] - (p3[1] - p1[1]) * k2)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (cerrada ? 'Z' : '');
}

// ---------------------------------------------------------------- relleno con degradado y facetas

/**
 * Un degradado lineal en cajas relativas: de la luz (arriba a la izquierda, por defecto) a la sombra. Devuelve su
 * `<defs>` y la referencia para `fill`.
 */
export function degradado(color, o = {}) {
  const { luz = 0.32, sombra = -0.38, ang = -50, medio = 0.45 } = o;
  const a = (ang * Math.PI) / 180;
  const dx = Math.cos(a) / 2;
  const dy = Math.sin(a) / 2;
  const id = nuevoId();
  const defs = `<defs><linearGradient id="${id}" x1="${f(0.5 - dx)}" y1="${f(0.5 - dy)}" x2="${f(0.5 + dx)}" y2="${f(0.5 + dy)}"><stop offset="0" stop-color="${tono(color, luz)}"/><stop offset="${medio}" stop-color="${color}"/><stop offset="1" stop-color="${tono(color, sombra)}"/></linearGradient></defs>`;
  return { defs, ref: `url(#${id})` };
}

/**
 * El bloque básico: un trazado con su degradado y, encima, facetas recortadas a su contorno ([trazado, 'osc'|'luz', alfa]).
 * Las facetas son lo que da el aire de piezas talladas de la referencia 1.
 */
export function bloque(d, color, facetas = [], o = {}) {
  const { defs, ref } = degradado(color, o);
  const id = nuevoId('k');
  const cuerpo = facetas.length
    ? `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${facetas.map(([fd, tipo, a = 0.2]) => `<path d="${fd}" fill="${tipo === 'luz' ? LUZ : HONDO}" fill-opacity="${a}"/>`).join('')}</g>`
    : '';
  return `${defs}<path d="${d}" fill="${ref}"/>${cuerpo}`;
}

/** Una esfera o un círculo con volumen: degradado radial con el brillo desplazado hacia la luz. */
export function bola(cx, cy, r, color, o = {}) {
  const { luz = 0.5, sombra = -0.45 } = o;
  const id = nuevoId();
  return `<defs><radialGradient id="${id}" cx="0.36" cy="0.3" r="0.85"><stop offset="0" stop-color="${tono(color, luz)}"/><stop offset="0.45" stop-color="${color}"/><stop offset="1" stop-color="${tono(color, sombra)}"/></radialGradient></defs><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#${id})"/>`;
}

/** Una elipse con volumen (un óvalo de cabeza, un cojín). */
export function ovoide(cx, cy, rx, ry, color, o = {}) {
  const { luz = 0.5, sombra = -0.45 } = o;
  const id = nuevoId();
  return `<defs><radialGradient id="${id}" cx="0.36" cy="0.3" r="0.85"><stop offset="0" stop-color="${tono(color, luz)}"/><stop offset="0.5" stop-color="${color}"/><stop offset="1" stop-color="${tono(color, sombra)}"/></radialGradient></defs><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id})"/>`;
}

/**
 * Un tubo curvo (un brazo, un asa, una pinzelada fluida): trazo gordo con su base oscura, su color y un brillo a un lado.
 */
export function tubo(d, color, w, o = {}) {
  const { luz = 0.45, sombra = -0.4 } = o;
  const l = (c, a, k = 1, dx = 0) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f(a)}" stroke-linecap="round" stroke-linejoin="round"${dx ? ` transform="translate(${f(dx)} ${f(dx)})"` : ''} opacity="${k}"/>`;
  return l(tono(color, sombra), w) + l(color, w * 0.8, 1, -w * 0.04) + l(tono(color, luz), w * 0.28, 0.8, -w * 0.18);
}

/** Un trazo fino de línea con la tinta oscura de su color (las caras mínimas, los adornos). */
export function trazo(d, color, w, a = {}) {
  const extra = Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
}

export const relleno = (d, color, op = 1) => `<path d="${d}" fill="${color}"${op !== 1 ? ` fill-opacity="${op}"` : ''}/>`;
export const circ = (cx, cy, r, color, op = 1) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${color}"${op !== 1 ? ` fill-opacity="${op}"` : ''}/>`;

/** Una sombra de contacto o un halo: elipse con degradado radial a transparente. */
export function mancha(cx, cy, rx, ry, color, op = 0.5) {
  const id = nuevoId();
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="0.55" stop-color="${color}" stop-opacity="${f(op * 0.45)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id})"/>`;
}

// ---------------------------------------------------------------- cuerpos de las figuras

/**
 * Una nube de rizos (el pelo de Guille, la barba de Fran): círculos que se pisan, de atrás adelante, cada uno con su volumen.
 * `rizos` son [x, y, r].
 */
export function nube(rizos, color, o = {}) {
  return rizos.map(([x, y, r], i) => bola(x, y, r, i % 3 === 1 ? tono(color, 0.1) : color, { luz: o.luz ?? 0.38, sombra: o.sombra ?? -0.5 })).join('');
}

/** Un ojo cerrado en arco, como un guiño contento (las caras de la referencia 1). */
export const ojoFeliz = (x, y, w, color, g = 5) => trazo(`M${f(x - w)} ${f(y)}Q${f(x)} ${f(y + w * 1.1)} ${f(x + w)} ${f(y)}`, color, g);
/** Un ojo abierto mínimo: un punto con su brillo. */
export const ojoPunto = (x, y, r, color) => circ(x, y, r, color) + circ(x - r * 0.3, y - r * 0.35, r * 0.32, '#ffffff', 0.9);
export const sonrisa = (x, y, w, color, g = 5, h = 0.5) => trazo(`M${f(x - w)} ${f(y)}Q${f(x)} ${f(y + w * h * 2)} ${f(x + w)} ${f(y)}`, color, g);

/** Una caña (vaso recto de tubo con espuma) con su centro abajo en (0, 0): mide unos 60 × 110. */
export function cana(s = 1, espuma = true) {
  const dentro = bloque(redondo([[-24, -96], [24, -96], [19, 0], [-19, 0]], 6), '#f0a21e', [
    [poli([[-24, -96], [-8, -96], [-4, 0], [-19, 0]]), 'luz', 0.34],
    [poli([[10, -96], [24, -96], [19, 0], [6, 0]]), 'osc', 0.22],
    [poli([[-24, -50], [24, -50], [22, -44], [-23, -44]]), 'luz', 0.14],
  ]);
  const burbujas = [[-8, -24, 3], [6, -44, 2.4], [-2, -66, 2.8], [10, -18, 2]].map(([x, y, r]) => circ(x, y, r, '#fff1b8', 0.7)).join('');
  const espum = espuma ? nube([[-17, -100, 12], [-2, -108, 13], [14, -101, 12], [5, -92, 9]], '#fff6e6', { luz: 0.15, sombra: -0.2 }) : '';
  return `<g transform="scale(${s})">${dentro}${burbujas}${espum}</g>`;
}

/** Una copa de gin tonic (balón) con su rodaja de lima y su pajita, con el centro del pie en (0, 0). */
export function gin(s = 1) {
  const copa = bloque(curva([[-38, -104, 'c'], [38, -104, 'c'], [40, -66], [26, -30], [6, -16], [6, 0, 'c'], [-6, 0, 'c'], [-6, -16], [-26, -30], [-40, -66]]), '#bfeff0', [
    [poli([[-38, -104], [-12, -104], [-16, -20], [-30, -40]]), 'luz', 0.45],
    [poli([[8, -80], [40, -66], [26, -30], [6, -16]]), 'osc', 0.18],
  ], { luz: 0.4, sombra: -0.25 });
  const liquido = relleno(curva([[-35, -84, 'c'], [36, -84, 'c'], [38, -66], [25, -32], [6, -18], [-6, -18], [-25, -32], [-38, -66]]), '#8ee0d8', 0.55);
  const hielos = `<g fill="#ffffff" fill-opacity="0.65">${redondo([[-20, -80], [-4, -86], [0, -68], [-18, -62]], 3).replace(/^/, '<path d="').replace(/$/, '"/>')}<path d="${redondo([[8, -74], [24, -78], [26, -60], [10, -56]], 3)}"/></g>`;
  const pie = relleno(poli([[-24, 0], [24, 0], [20, -5], [-20, -5]]), '#a8d8e0', 0.9);
  const lima = `<g transform="translate(34 -98) rotate(-24)">${bola(0, 0, 18, '#9bd13c')}${circ(0, 0, 13, '#d7f27a')}${[0, 1, 2, 3, 4, 5].map((i) => trazo(`M0 0L${f(Math.cos((i / 6) * Math.PI * 2) * 12)} ${f(Math.sin((i / 6) * Math.PI * 2) * 12)}`, '#9bd13c', 1.8)).join('')}</g>`;
  const pajita = trazo('M-8 -90L-24 -138', '#ff4fa8', 6) + trazo('M-8 -90L-24 -138', '#ffd1ea', 2, { opacity: 0.7 });
  return `<g transform="scale(${s})">${pajita}${copa}${liquido}${hielos}${pie}${lima}</g>`;
}

/** Un aro de metal (el pendiente, un anillo suelto). */
export function aro(cx, cy, r, color, g = 6) {
  return trazo(elipse(cx, cy, r, r), tono(color, -0.45), g) + trazo(elipse(cx, cy, r, r), color, g * 0.65) + trazo(`M${f(cx - r * 0.7)} ${f(cy - r * 0.5)}Q${f(cx - r * 0.2)} ${f(cy - r * 1.05)} ${f(cx + r * 0.4)} ${f(cy - r * 0.85)}`, '#ffffff', g * 0.3, { opacity: 0.8 });
}
