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

export const OBJETOS = {
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
