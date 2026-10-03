// Inventory items, drawn like everything else: rounded shapes, 2–3 tones and a
// line in a darker tone of the material. Each returns SVG for a 100x100 box.
import { smooth, ellipse, path, stroke, shape, rrect } from './personajes/svg.mjs';

const movil = () => [
  shape(rrect(50, 50, 22, 40, 7), '#23252c', [path(rrect(44, 50, 16, 40, 6), '#33363f')], '#0e0f13', 2),
  path(rrect(50, 48, 18, 32, 3), '#3f6fb0'),
  path(rrect(50, 36, 14, 5, 2), '#7fe0a0'),
  path(rrect(48, 46, 12, 4, 2), '#e8f0ff', { opacity: 0.85 }),
  path(rrect(52, 55, 12, 4, 2), '#e8f0ff', { opacity: 0.6 }),
  path(ellipse(50, 85, 3, 3), '#4a4e58'),
].join('');

const tarro = (caliente = false) => [
  caliente ? stroke('M38 22q-6 -8 0 -14M50 20q-6 -8 0 -14M62 22q-6 -8 0 -14', '#ffffff', 2.4, { opacity: 0.8 }) : '',
  shape(rrect(50, 32, 22, 7, 3), '#c8433a', [path(rrect(50, 30, 22, 3, 2), '#e06a5c')], '#6e1c17', 1.6),
  shape(smooth([[30, 40], [70, 40], [74, 52], [74, 82], [68, 90, 'c'], [32, 90, 'c'], [26, 82], [26, 52]]), '#cfe6d8', [path(smooth([[60, 42], [72, 52], [72, 84], [64, 88]]), '#a8c8b8')], '#5a7a6a', 1.8),
  ...[[38, 56], [50, 54], [62, 57], [44, 66], [56, 67], [38, 77], [50, 78], [62, 76]].map(([x, y]) => shape(ellipse(x, y, 6.5, 5), '#6b7a2e', [path(ellipse(x - 2, y - 1.5, 2.2, 1.4), '#a6b65a')], '#3a4410', 1)),
  path(rrect(50, 64, 16, 8, 2), '#f2ead8', { opacity: 0.9 }),
  caliente ? path(rrect(50, 64, 24, 30, 6), '#ffb070', { opacity: 0.18 }) : '',
].join('');

const llaves = () => [
  stroke('M34 30a12 12 0 1 0 0.2 0', '#c9a14f', 5),
  stroke('M40 42L70 72M60 62l-6 6M66 68l-6 6', '#c8ccd0', 6),
  stroke('M30 44L44 78M40 68l-6 3', '#c9a14f', 5),
  shape(ellipse(74, 30, 12, 8, 0.4), '#c8433a', [], '#6e1c17', 1.4),
].join('');

const ropa = () => [
  shape(smooth([[22, 26, 'c'], [48, 26, 'c'], [56, 36], [50, 40], [48, 70, 'c'], [24, 70, 'c'], [22, 40], [16, 36]]), '#2e8a8c', [path(smooth([[38, 26], [48, 26], [48, 70], [40, 70]]), '#1f6567')], '#154647', 1.6),
  shape(smooth([[46, 50, 'c'], [84, 50, 'c'], [86, 90, 'c'], [70, 90, 'c'], [66, 66], [62, 90, 'c'], [46, 90, 'c']]), '#3e5279', [path(rrect(65, 53, 19, 3, 1), '#566c96'), path(smooth([[72, 52], [84, 52], [86, 90], [76, 90]]), '#2c3b5a')], '#1d2840', 1.6),
].join('');

const pilas = () => [0, 1].map((i) => {
  const x = 38 + i * 26;
  return [
    shape(rrect(x, 54, 11, 30, 4), '#2a2a30', [path(rrect(x - 4, 54, 4, 30, 2), '#3c3c46')], '#121216', 1.4),
    path(rrect(x, 30, 11, 6, 2), '#d8a83a'),
    path(rrect(x, 26, 4, 3, 1), '#c9ccd0'),
    path(rrect(x, 58, 9, 8, 1), '#e8c23a', { opacity: 0.9 }),
  ].join('');
}).join('');

const alcohol = () => [
  shape(smooth([[38, 30, 'c'], [62, 30, 'c'], [64, 40], [66, 86, 'c'], [34, 86, 'c'], [36, 40]]), '#e8f2f6', [path(smooth([[54, 34], [64, 40], [66, 86], [58, 86]]), '#c4d4dc')], '#6a7a84', 1.6),
  shape(rrect(50, 22, 10, 9, 2), '#3a7be0', [], '#1a3a70', 1.2),
  path(rrect(50, 60, 22, 22, 2), '#ffffff'),
  path(rrect(50, 60, 4, 14, 1), '#d8323a'),
  path(rrect(50, 60, 14, 4, 1), '#d8323a'),
].join('');

const romero = () => [
  stroke('M50 90L50 30M50 70L36 46M50 60L64 36M50 80L66 60', '#4a6a4a', 3.4),
  ...[[50, 30], [36, 46], [64, 36], [66, 60], [44, 40], [56, 48], [40, 58], [60, 70], [46, 66], [54, 24]].map(([x, y], i) => path(ellipse(x, y, 2.4, 7, i * 0.6), i % 2 ? '#5a7a56' : '#3e5c40')),
  ...[[48, 26], [62, 34], [38, 44], [66, 58]].map(([x, y]) => path(ellipse(x, y, 2.4, 2.4), '#9a8ad8')),
].join('');

const alcoholRomero = () => [alcohol(), stroke('M44 70L44 44M50 76L50 40M56 70L56 46', '#4a6a4a', 2.4, { opacity: 0.9 }), path(ellipse(50, 40, 2, 2), '#9a8ad8')].join('');

const colonia = () => [
  shape(smooth([[34, 44, 'c'], [66, 44, 'c'], [70, 84, 'c'], [30, 84, 'c']]), '#9ad0c0', [path(smooth([[56, 46], [66, 46], [70, 84], [60, 84]]), '#74b0a0'), path(ellipse(44, 60, 4, 10), '#d8f0e8', { opacity: 0.8 })], '#3a6a5e', 1.6),
  shape(rrect(50, 36, 12, 8, 2), '#c9a14f', [], '#6a4e1a', 1.2),
  stroke('M50 28c-6 -6 -2 -12 4 -14M42 24c-4 -4 0 -10 4 -10', '#bfe4ff', 2.2, { opacity: 0.8 }),
  path(rrect(50, 66, 22, 12, 2), '#f4ead0'),
  stroke('M44 66L56 66', '#3a6a5e', 2),
].join('');

export const OBJETOS = {
  pilas,
  alcohol,
  romero,
  alcoholRomero,
  colonia,
  movil,
  tarro: () => tarro(false),
  tarroCaliente: () => tarro(true),
  llaves,
  ropa,
};

/** Full <svg> for an item icon. */
export function icono(id) {
  const f = OBJETOS[id];
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${f ? f() : ''}</svg>`;
}
