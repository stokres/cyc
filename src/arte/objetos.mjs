// Inventory items, drawn like everything else: rounded shapes, 2–3 tones and a
// line in a darker tone of the material. Each returns SVG for a 100x100 box.
import { smooth, ellipse, path, stroke, shape, rrect } from './personajes/svg.mjs';
import { zapatoBrilli } from './robot.mjs';

const movil = () => [
  shape(rrect(50, 50, 22, 40, 7), '#23252c', [path(rrect(44, 50, 16, 40, 6), '#33363f')], '#0e0f13', 2),
  path(rrect(50, 48, 18, 32, 3), '#3f6fb0'),
  path(rrect(50, 36, 14, 5, 2), '#7fe0a0'),
  path(rrect(48, 46, 12, 4, 2), '#e8f0ff', { opacity: 0.85 }),
  path(rrect(52, 55, 12, 4, 2), '#e8f0ff', { opacity: 0.6 }),
  path(ellipse(50, 85, 3, 3), '#4a4e58'),
].join('');

/** A pack of serrano ham cubes: a plastic tray with a label. */
const jamon = () => [
  shape(smooth([[18, 44, 'c'], [82, 44, 'c'], [76, 78, 'c'], [24, 78, 'c']]), '#e8e4dc', [path(smooth([[60, 44], [82, 44], [76, 78], [62, 78]]), '#cfc9be')], '#7a746a', 1.6),
  ...[[32, 54], [46, 50], [60, 54], [38, 64], [54, 64], [68, 62]].map(([x, y]) => shape(rrect(x, y, 6.5, 6, 1.6), '#b8424a', [path(rrect(x - 2, y - 2, 3.5, 2.5, 1), '#e07a80'), path(rrect(x + 1, y + 1.4, 5, 1, 0.5), '#f6e6d6')], '#5a1820', 1)),
  path(smooth([[16, 42, 'c'], [84, 42, 'c'], [80, 50], [20, 50]]), '#ffffff', { opacity: 0.35 }),
  shape(rrect(50, 32, 22, 10, 3), '#c8433a', [path(rrect(50, 30, 22, 4, 2), '#e06a5c')], '#6e1c17', 1.4),
  path(rrect(50, 33, 12, 2.5, 1), '#f4e2b0'),
].join('');

/** The long net for fishing balls out of the pit. */
const red = () => [
  stroke('M22 88L58 36', '#5a6070', 6),
  shape(ellipse(68, 26, 18, 16, 0.5), 'none', [], '#5a6070', 5),
  stroke('M58 16L74 40M66 12L80 34M54 26L70 44', '#c8ccd4', 1.6),
].join('');

/** The piñata stick, with its grip of duct tape. */
const palo = () => [stroke('M16 82L84 18', '#c49a6a', 9), stroke('M16 82L32 67', '#9aa0a8', 11), stroke('M16 82L32 67', '#c8ccd4', 3, { opacity: 0.6 })].join('');

/** The net and the stick, taped together: very long. */
const redLarga = () => [
  stroke('M8 94L40 62', '#c49a6a', 8),
  stroke('M36 66L44 58', '#9aa0a8', 12),
  stroke('M42 60L74 24', '#5a6070', 6),
  shape(ellipse(82, 16, 14, 12, 0.6), 'none', [], '#5a6070', 4),
].join('');

/** The key to the staff room, with a red plastic tag. */
const llave = () => [
  stroke('M34 34a14 14 0 1 0 0.2 0', '#c9a14f', 6),
  stroke('M44 44L80 80M70 70l-8 8M78 78l-8 8', '#d9dcd8', 7),
  shape(rrect(24, 22, 14, 8, 4), '#e8452e', [], '#6a1a10', 1.4),
].join('');

/** The little one's party shoe, pink, with glitter and a light in the sole. */
const zapato = () => `<g transform="translate(50 54) scale(1.15)">${zapatoBrilli()}</g>`;

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

const libreto = () => [
  shape(rrect(50, 52, 30, 38, 3), '#efe6d2', [path(rrect(50, 52, 30, 4, 1), '#dcd2bc')], '#8a7e66', 1.6),
  path(rrect(22, 52, 5, 38, 2), '#c8433a'),
  ...[0, 1, 2, 3, 4].map((i) => stroke(`M34 ${36 + i * 8}L${62 - (i % 2) * 8} ${36 + i * 8}`, '#6a6050', 2)),
  stroke('M34 78L52 78', '#c8433a', 2.4),
].join('');

const tijeras = () => [
  stroke('M44 46L76 22M44 34L76 58', '#c9ccd0', 5),
  stroke('M44 46L76 22M44 34L76 58', '#e8eaec', 2),
  shape(ellipse(34, 52, 10, 9), 'none', [], '#c8433a', 5),
  shape(ellipse(34, 28, 10, 9), 'none', [], '#c8433a', 5),
  path(ellipse(46, 40, 3, 3), '#6a6e74'),
].join('');

const hojas = () => [
  shape(rrect(54, 54, 26, 34, 2), '#f6f2ea', [], '#8a7e66', 1.4),
  shape(rrect(48, 48, 26, 34, 2), '#faf8f2', [], '#8a7e66', 1.4),
  ...[0, 1, 2, 3].map((i) => stroke(`M30 ${36 + i * 8}L${62 - (i % 2) * 10} ${36 + i * 8}`, '#a8a090', 1.6, { opacity: 0.5 })),
].join('');

export const OBJETOS = {
  libreto,
  tijeras,
  hojas,
  pilas,
  alcohol,
  romero,
  alcoholRomero,
  colonia,
  movil,
  jamon,
  red,
  palo,
  redLarga,
  llave,
  zapato,
  llaves,
  ropa,
};

/** Full <svg> for an item icon. */
export function icono(id) {
  const f = OBJETOS[id];
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${f ? f() : ''}</svg>`;
}
