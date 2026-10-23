// El plano manga del capítulo 2 (estilo C de Jesús: blanco y negro, viñetas inclinadas, tramas, líneas de
// concentración y onomatopeyas), con los cinco personajes y la sombra de Pablo.
//
// Módulo puro (cadenas SVG): el juego (src/juego/manga.ts) lo hornea UNA vez a bitmap y dibuja ese bitmap; el
// script de la hoja de personajes (tools/anime/manga-hoja.mjs) lo pinta para revisarlo. Nunca se dibuja por fotograma.
//
// La marca de los textos (lo que sigue a `@manga`) son «viñetas» y «onomatopeyas» separadas por espacios:
//   pablo:ojos:suplica     personaje : tipo de viñeta : expresión   (cara · ojos · boca · mano; la expresión es opcional)
//   !gogogo                onomatopeya dibujada: gogogo · don · ha · zas (la palabra viene de src/textos)
//   fin                    vuelve al plano de siempre
// Se pueden poner de 1 a 3 viñetas. Los personajes: pablo, fran, chuchi, guille, vero y sombra.
import { ctx, rng, f, P, S, G, poly, W as W0, H as H0 } from './comun.mjs';
import { T, PAPEL, BLANCO, tonos, concentracion, lineasCaida, onomatopeya, impacto, brillo4, sudor } from './manga-comun.mjs';
import { cara, CAJAS, EXPRESIONES, PERSONAJES } from './manga-cara.mjs';
import { mano, CAJA_MANO } from './manga-mano.mjs';

export { PERSONAJES, EXPRESIONES };
export const TIPOS = ['cara', 'ojos', 'boca', 'mano'];
export const ONOMATOPEYAS = ['gogogo', 'don', 'ha', 'zas'];
const TODOS = [...PERSONAJES, 'sombra'];

/** Lee las palabras de una marca `@manga ...` (sin la propia palabra). Devuelve `null` si es `fin`. */
export function leerMarca(palabras) {
  const paneles = [];
  const ono = [];
  const opciones = {};
  for (const p of palabras) {
    if (p === 'fin' || p === 'off') return null;
    if (p.startsWith('!')) {
      if (ONOMATOPEYAS.includes(p.slice(1))) ono.push(p.slice(1));
      else console.error(`[manga] onomatopeya desconocida «${p}»`);
      continue;
    }
    if (p === 'solo') {
      opciones.solo = true;
      continue;
    }
    const [quien, tipo = 'cara', ex] = p.split(':');
    if (!TODOS.includes(quien)) {
      console.error(`[manga] personaje desconocido «${quien}»`);
      continue;
    }
    if (!TIPOS.includes(tipo)) {
      console.error(`[manga] tipo de viñeta desconocido «${tipo}» (usa: ${TIPOS.join(', ')})`);
      continue;
    }
    // La sombra no tiene manos: su cara.
    paneles.push({ quien, tipo: quien === 'sombra' && tipo === 'mano' ? 'cara' : tipo, expr: ex || EXPRESIONES[quien][0] });
  }
  return { paneles: paneles.slice(0, 3), ono, opciones };
}

/** Clave estable de un plano (para guardarlo ya horneado). */
export const claveMarca = (m) => `${m.paneles.map((p) => `${p.quien}:${p.tipo}:${p.expr}`).join(' ')}|${m.ono.join(',')}`;

// ------------------------------------------------------------------ geometría: viñetas inclinadas
/** Recorta un polígono por el semiplano `n·q >= d` (Sutherland–Hodgman). */
function recortar(pts, nx, ny, d) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const da = nx * a[0] + ny * a[1] - d;
    const db = nx * b[0] + ny * b[1] - d;
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** Parte un polígono con una recta (p0→p1) y un hueco `gap` entre las dos mitades: [lado de la normal, el otro]. */
function partir(pts, p0, p1, gap) {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const L = Math.hypot(dx, dy);
  const nx = -dy / L;
  const ny = dx / L;
  const d0 = nx * p0[0] + ny * p0[1];
  return [recortar(pts, nx, ny, d0 + gap / 2), recortar(pts, -nx, -ny, -d0 + gap / 2)];
}

const caja = (pts) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

/**
 * Reparte la pantalla (W×H) en viñetas inclinadas según lo que hay que enseñar. Devuelve los polígonos en el
 * orden de los paneles y los puntos donde caen los cortes (para las onomatopeyas).
 */
export function repartir(paneles, W, H) {
  const m = 8;
  const gap = 14;
  const d = H * 0.085;
  const marco = [[m, m], [W - m, m], [W - m, H - m], [m, H - m]];
  const n = paneles.length;
  const corteV = (fx) => [[W * fx + d / 2, 0], [W * fx - d / 2, H]];
  const corteH = (poli, fy, lean = 0.05) => {
    const b = caja(poli);
    const y = b.y0 + (b.y1 - b.y0) * fy;
    return [[b.x0 - 10, y + (b.x1 - b.x0) * lean * 0.5], [b.x1 + 10, y - (b.x1 - b.x0) * lean * 0.5]];
  };
  const cortes = [];
  const tieneOjos = paneles.some((p) => p.tipo === 'ojos');
  if (n <= 1) {
    // Una sola viñeta a toda pantalla, con los costados cortados en diagonal.
    const e = d * 0.5;
    return { polis: [[[m + e, m], [W - m, m], [W - m - e, H - m], [m, H - m]]], cortes: [[W * 0.5, H * 0.3]] };
  }
  if (n === 2) {
    const fx = paneles[0].tipo === 'ojos' ? 0.57 : paneles[1].tipo === 'ojos' ? 0.43 : 0.5;
    const [a, b] = partir(marco, ...corteV(fx), gap);
    cortes.push([W * fx, H * 0.28]);
    return { polis: [a, b], cortes };
  }
  if (!tieneOjos) {
    const [a, resto] = partir(marco, ...corteV(0.335), gap);
    const [b, c] = partir(resto, ...corteV(0.668), gap);
    cortes.push([W * 0.335, H * 0.26], [W * 0.668, H * 0.5]);
    return { polis: [a, b, c], cortes };
  }
  // Tres con ojos: a la izquierda las dos viñetas anchas (ojos arriba), a la derecha la alta.
  const [izq, der] = partir(marco, ...corteV(0.62), gap);
  const [aba, arr] = partir(izq, ...corteH(izq, 0.5), gap);
  cortes.push([W * 0.62, H * 0.28], [W * 0.3, H * 0.5]);
  return { polis: [arr, der, aba], cortes, orden: 'ojos-izq' };
}

// ------------------------------------------------------------------ fondos
function fondo(c, kind, b, foco, semilla) {
  const tn = tonos(c, 1);
  const { x0, y0, x1, y1 } = b;
  const [fx, fy] = foco;
  const area = `M${f(x0 - 20)} ${f(y0 - 20)}H${f(x1 + 20)}V${f(y1 + 20)}H${f(x0 - 20)}Z`;
  const R = Math.hypot(x1 - x0, y1 - y0);
  switch (kind) {
    case 'negro':
      return P(area, T) + concentracion(fx, fy, { n: 110, interior: 110, color: BLANCO, seed: semilla, grosor: 0.016, R });
    case 'rafaga':
      return P(area, PAPEL) + P(area, tn.punto(0.1)) + concentracion(fx, fy, { n: 150, interior: 120, color: T, seed: semilla, grosor: 0.03, R });
    case 'gris':
      return P(area, PAPEL) + P(area, tn.punto(0.34, 45)) + lineasCaida(x0, x1, y0, y1, { n: 22, seed: semilla, grosor: 1.8 });
    case 'seriedad':
      return P(area, PAPEL) + P(area, tn.punto(0.46, 45)) + P(area, tn.raya(0.28, 90, T, 5), { opacity: 0.8 }) + concentracion(fx, fy, { n: 70, interior: 160, color: T, seed: semilla, grosor: 0.012, R });
    case 'sombra':
      return P(area, PAPEL) + P(area, tn.punto(0.5, 45)) + concentracion(fx, fy, { n: 120, interior: 100, color: T, seed: semilla, grosor: 0.03, R });
    case 'luz':
    default: {
      const o = [P(area, PAPEL), P(area, tn.punto(0.12)), concentracion(fx, fy, { n: 90, interior: 130, color: T, seed: semilla, grosor: 0.01, R })];
      const rnd = rng(semilla + 7);
      for (let i = 0; i < 5; i++) o.push(brillo4(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0) * 0.8, 9 + rnd() * 12));
      return o.join('');
    }
  }
}

const FONDO = { suplica: 'luz', sorpresa: 'negro', enfado: 'rafaga', seriedad: 'seriedad', risa: 'luz', duda: 'gris', triste: 'gris', nervioso: 'gris', picara: 'luz', burla: 'sombra' };
const FONDO_MANO = { pablo: 'gris', fran: 'rafaga', chuchi: 'luz', guille: 'luz', vero: 'luz', sombra: 'sombra' };

// ------------------------------------------------------------------ una viñeta
/** Cuánto se acerca cada tipo hacia «cubrir» el hueco (0: entra entero; 1: llena y recorta). */
const CUBRE = { cara: 0, ojos: 0.85, boca: 0.55, mano: 0.25 };

/**
 * Dibuja el contenido de una viñeta dentro del polígono `poli`. `vis` es el hueco que se ve (no lo tapa el cuadro
 * de diálogo) y `rot` los grados que se inclina el dibujo dentro del marco.
 */
export function dibujarVineta(c, p, poli, { vis, rot = 0, semilla = 1 } = {}) {
  const b = caja(poli);
  const bw = b.x1 - b.x0;
  const v = vis ?? { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
  const vw = v.x1 - v.x0;
  const vh = v.y1 - v.y0;
  const [c0, c1, c2, c3] = p.tipo === 'mano' ? CAJA_MANO[p.quien] : CAJAS[p.quien][p.tipo];
  const cw = c2 - c0;
  const ch = c3 - c1;
  // Cuadro de la marca de los costados: el recorte en diagonal se come un poco del ancho.
  const util = Math.max(40, vw * 0.9);
  const kCont = Math.min(util / cw, vh / ch);
  const kCub = Math.max(util / cw, vh / ch);
  const k = kCont + (kCub - kCont) * CUBRE[p.tipo];
  const ccx = (c0 + c2) / 2;
  const ccy = p.tipo === 'cara' ? c1 + ch * 0.46 : (c1 + c3) / 2;
  const cx = (v.x0 + v.x1) / 2;
  const cy = p.tipo === 'cara' ? v.y0 + vh * 0.5 : (v.y0 + v.y1) / 2;
  const kind = p.tipo === 'mano' ? FONDO_MANO[p.quien] : FONDO[p.expr] ?? 'luz';
  const contenido = p.tipo === 'mano' ? mano(c, p.quien, k) : cara(c, p.quien, p.expr, k);
  const clip = c.clip(poly(poli));
  // Foco de las líneas de concentración: entre los ojos (o el centro de la mano).
  const foco = p.tipo === 'mano' ? [cx, cy] : [cx + 0 * k, cy + (0 - ccy) * k];
  return G(
    [
      fondo(c, kind, b, foco, semilla),
      G(contenido, { transform: `translate(${f(cx)} ${f(cy)}) rotate(${rot}) scale(${k.toFixed(4)}) translate(${f(-ccx)} ${f(-ccy)})` }),
    ],
    { 'clip-path': clip },
  );
}

// ------------------------------------------------------------------ el plano entero
/**
 * El plano manga de la marca `m` (la de `leerMarca`) para una pantalla de W×H unidades, como SVG completo.
 * `textos`: las palabras de las onomatopeyas en castellano, de src/textos (p. ej. `{ zas: '¡ZAS!' }`).
 */
export function plano(m, W = W0, H = H0, textos = {}) {
  const c = ctx();
  const { polis, cortes } = repartir(m.paneles, W, H);
  const visBottom = H * 0.72;
  // Con tres viñetas y ojos, la primera de las anchas es la de los ojos: ordena los paneles para que casen con sus huecos.
  let paneles = m.paneles;
  if (paneles.length === 3 && paneles.some((p) => p.tipo === 'ojos')) {
    const ojos = paneles.filter((p) => p.tipo === 'ojos');
    const resto = paneles.filter((p) => p.tipo !== 'ojos');
    const alta = resto.find((p) => p.tipo === 'cara') ?? resto.find((p) => p.tipo === 'mano') ?? resto[0];
    const otra = resto.filter((p) => p !== alta);
    paneles = [ojos[0], alta, ...(ojos[1] ? [ojos[1]] : otra)].filter(Boolean);
    if (paneles.length < 3) paneles = [...paneles, ...resto.filter((p) => !paneles.includes(p))];
  }
  const rnd = rng(paneles.reduce((a, p) => a + p.quien.length * 7 + p.expr.length, 11));
  const dib = paneles.map((p, i) => {
    const poli = polis[i];
    const b = caja(poli);
    const rot = (i % 2 ? -1 : 1) * (3 + rnd() * 5) * (paneles.length === 1 ? 0.6 : 1);
    const vis = { x0: b.x0, y0: b.y0, x1: b.x1, y1: Math.max(b.y0 + 60, Math.min(b.y1, visBottom)) };
    return dibujarVineta(c, p, poli, { vis, rot, semilla: 3 + i * 5 }) + S(poli.length ? `M${poli.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z` : '', T, 3.6);
  });
  // Onomatopeyas sobre los cortes (la primera en el primero, etc.).
  const ono = m.ono.map((tipo, i) => {
    const [x, y] = cortes[i % cortes.length] ?? [W / 2, H * 0.3];
    const rot = (i % 2 ? 1 : -1) * 4;
    const alto = tipo === 'gogogo' ? 170 : tipo === 'zas' ? 74 : 96;
    const bloque = [];
    if (tipo === 'zas' || tipo === 'don') bloque.push(impacto(x, y, alto * (tipo === 'zas' ? 1.5 : 1.1), { seed: 4 + i }));
    bloque.push(onomatopeya(tipo, { x, y, alto, rot, palabra: textos[tipo] ?? '' }));
    return bloque.join('');
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" width="${f(W)}" height="${f(H)}"><defs>${c.defs.join('')}</defs><rect width="${f(W)}" height="${f(H)}" fill="${PAPEL}"/>${dib.join('')}${ono.join('')}</svg>`;
}

// ------------------------------------------------------------------ la hoja de revisión de los personajes
/**
 * Hoja con los cinco (y la sombra) en todas sus viñetas y expresiones: una fila por personaje con sus caras, los
 * ojos en franja, la boca y la mano. Para revisarla a ojo (tools/anime/manga-hoja.mjs).
 */
export function hojaPersonajes() {
  const c = ctx();
  const cel = 300;
  const m = 6;
  const cols = 7;
  const o = [];
  const rect = (x, y, w, h) => [[x + m, y + m], [x + w - m, y + m], [x + w - m, y + h - m], [x + m, y + h - m]];
  const pon = (p, poli, rot, semilla) => o.push(dibujarVineta(c, p, poli, { rot, semilla }) + S(`M${poli.map(([px, py]) => `${f(px)} ${f(py)}`).join('L')}Z`, T, 3.4));
  TODOS.forEach((quien, fila) => {
    const y = fila * cel;
    const ex = EXPRESIONES[quien];
    ex.forEach((e, i) => pon({ quien, tipo: 'cara', expr: e }, rect(i * cel, y, cel, cel), i % 2 ? -2 : 2, i + fila));
    pon({ quien, tipo: 'ojos', expr: ex[0] }, rect(4 * cel, y, cel, cel / 2), 2, 40 + fila);
    pon({ quien, tipo: 'ojos', expr: ex[1] ?? ex[0] }, rect(4 * cel, y + cel / 2, cel, cel / 2), -2, 50 + fila);
    pon({ quien, tipo: 'boca', expr: ex[3] ?? ex[0] }, rect(5 * cel, y, cel, cel), -2, 60 + fila);
    if (quien !== 'sombra') pon({ quien, tipo: 'mano', expr: 'normal' }, rect(6 * cel, y, cel, cel), 3, 70 + fila);
  });
  const Wt = cel * cols;
  const Ht = cel * TODOS.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wt} ${Ht}" width="${Wt}" height="${Ht}"><defs>${c.defs.join('')}</defs><rect width="${Wt}" height="${Ht}" fill="${PAPEL}"/>${o.join('')}</svg>`;
}

export { sudor };
