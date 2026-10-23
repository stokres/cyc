// Piezas comunes de las pruebas de primer plano «anime» (capítulo 2).
// Módulo independiente: solo devuelve cadenas SVG; se hornea una vez, nunca por fotograma.
// Todo se dibuja con la cabeza mirando a la DERECHA, en unidades de cara:
//   línea de ojos y=0 · cejas y≈-34 · base de la nariz y≈52 · boca y≈78 · barbilla y≈128.
// Para mirar a la izquierda se refleja el grupo entero con scale(-1, 1).
import { smooth, ellipse } from '../personajes/svg.mjs';

export { smooth, ellipse };

export const W = 844;
export const H = 390;

export const f = (v) => +v.toFixed(1);

/** Generador pseudoaleatorio determinista. */
export function rng(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const attrs = (a = {}) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');

export const P = (d, fill, a = {}) => `<path d="${d}" fill="${fill}"${attrs(a)}/>`;
export const S = (d, color, w, a = {}) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${attrs(a)}/>`;
export const G = (body, a = {}) => `<g${attrs(a)}>${Array.isArray(body) ? body.join('') : body}</g>`;
export const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
export const line = (x0, y0, x1, y1) => `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;

/** Contexto de dibujo: ids únicos y definiciones (degradados, recortes, tramas). */
export function ctx() {
  let n = 0;
  const defs = [];
  return {
    defs,
    id: (p = 'i') => `${p}${++n}`,
    def(s) {
      defs.push(s);
    },
    /** Degradado lineal o radial; devuelve la referencia url(#id). */
    grad(kind, stops, a = {}) {
      const id = `g${++n}`;
      const st = stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`).join('');
      defs.push(kind === 'radial' ? `<radialGradient id="${id}"${attrs(a)}>${st}</radialGradient>` : `<linearGradient id="${id}"${attrs(a)}>${st}</linearGradient>`);
      return `url(#${id})`;
    },
    clip(d) {
      const id = `k${++n}`;
      defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
      return `url(#${id})`;
    },
  };
}

/** Tramas de punto y de raya (screentone), como patrones SVG. */
export function tramaPuntos(c, color, esc = 3.2, ang = 30, r = 0.95) {
  const id = c.id('tp');
  c.def(`<pattern id="${id}" width="${esc}" height="${esc}" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})"><circle cx="${esc / 2}" cy="${esc / 2}" r="${r}" fill="${color}"/></pattern>`);
  return `url(#${id})`;
}
export function tramaRayas(c, color, esc = 2.6, ang = 45, w = 0.7) {
  const id = c.id('tr');
  c.def(`<pattern id="${id}" width="${esc}" height="${esc}" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})"><rect width="${w}" height="${esc}" fill="${color}"/></pattern>`);
  return `url(#${id})`;
}

/** Un mechón afilado y curvado: de la base (x, y) a la punta (tx, ty). */
export function mechon(x, y, tx, ty, w, curl = 0.2) {
  const dx = tx - x;
  const dy = ty - y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const mx = (x + tx) / 2 + nx * curl * L;
  const my = (y + ty) / 2 + ny * curl * L;
  const a = [x - (nx * w) / 2, y - (ny * w) / 2];
  const b = [x + (nx * w) / 2, y + (ny * w) / 2];
  const c1 = [mx - nx * w * 0.55, my - ny * w * 0.55];
  const c2 = [mx + nx * w * 0.55, my + ny * w * 0.55];
  return `M${f(a[0])} ${f(a[1])}Q${f(c1[0])} ${f(c1[1])} ${f(tx)} ${f(ty)}Q${f(c2[0])} ${f(c2[1])} ${f(b[0])} ${f(b[1])}Z`;
}

/** Línea central de un mechón (para el brillo del pelo). */
export function mechonEje(x, y, tx, ty, curl = 0.2, t0 = 0.12, t1 = 0.8) {
  const dx = tx - x;
  const dy = ty - y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const mx = (x + tx) / 2 + nx * curl * L;
  const my = (y + ty) / 2 + ny * curl * L;
  const at = (t) => [(1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * tx, (1 - t) * (1 - t) * y + 2 * (1 - t) * t * my + t * t * ty];
  const p0 = at(t0);
  const p1 = at((t0 + t1) / 2);
  const p2 = at(t1);
  return `M${f(p0[0])} ${f(p0[1])}Q${f(p1[0] + nx * 3)} ${f(p1[1] + ny * 3)} ${f(p2[0])} ${f(p2[1])}`;
}

/** Ceja afilada: de (x0, y0) a (x1, y1), gruesa en el origen y fina en la punta. */
export function ceja(x0, y0, x1, y1, th0, th1, arch = 0) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 - arch;
  return `M${f(x0)} ${f(y0 - th0 / 2)}Q${f(mx)} ${f(my - (th0 + th1) / 4)} ${f(x1)} ${f(y1 - th1 / 2)}L${f(x1)} ${f(y1 + th1 / 2)}Q${f(mx)} ${f(my + (th0 + th1) / 4)} ${f(x0)} ${f(y0 + th0 / 2)}Z`;
}

/** Estrella de cuatro puntas (destello). */
export function estrella(x, y, r, k = 0.22) {
  return `M${f(x)} ${f(y - r)}Q${f(x + r * k)} ${f(y - r * k)} ${f(x + r)} ${f(y)}Q${f(x + r * k)} ${f(y + r * k)} ${f(x)} ${f(y + r)}Q${f(x - r * k)} ${f(y + r * k)} ${f(x - r)} ${f(y)}Q${f(x - r * k)} ${f(y - r * k)} ${f(x)} ${f(y - r)}Z`;
}

/** Gota de sudor (punta arriba). */
export function gota(x, y, s = 1) {
  return `M${f(x)} ${f(y - 16 * s)}C${f(x + 4 * s)} ${f(y - 7 * s)} ${f(x + 11 * s)} ${f(y - 2 * s)} ${f(x + 11 * s)} ${f(y + 6 * s)}C${f(x + 11 * s)} ${f(y + 14 * s)} ${f(x + 5 * s)} ${f(y + 18 * s)} ${f(x)} ${f(y + 18 * s)}C${f(x - 5 * s)} ${f(y + 18 * s)} ${f(x - 11 * s)} ${f(y + 14 * s)} ${f(x - 11 * s)} ${f(y + 6 * s)}C${f(x - 11 * s)} ${f(y - 2 * s)} ${f(x - 4 * s)} ${f(y - 7 * s)} ${f(x)} ${f(y - 16 * s)}Z`;
}

/** La sílaba «ゴ» hecha a trazos (no hay fuente japonesa): se hornea como trazos, sin texto. */
export function goTrazos(x, y, s, fill, borde, bw = 5) {
  const w = 40 * s;
  const h = 44 * s;
  const th = 11 * s;
  const ko = `M${f(x)} ${f(y)}L${f(x + w)} ${f(y)}L${f(x + w - 2 * s)} ${f(y + h)}L${f(x - 4 * s)} ${f(y + h)}`;
  const d1 = `M${f(x + w * 0.8)} ${f(y - 14 * s)}l${f(8 * s)} ${f(-10 * s)}`;
  const d2 = `M${f(x + w * 1.0)} ${f(y - 8 * s)}l${f(8 * s)} ${f(-10 * s)}`;
  const trazos = [ko, d1, d2];
  return trazos.map((d) => S(d, borde, th + bw * 2)).join('') + trazos.map((d) => S(d, fill, th)).join('');
}

/** Marco de la viñeta: SVG completo de 844×390. */
export function hoja(c, cuerpo, fondo = '#000') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${c.defs.join('')}</defs><rect width="${W}" height="${H}" fill="${fondo}"/>${cuerpo}</svg>`;
}
