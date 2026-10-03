// Guille's pigs, side view facing right: rounded body, big snout, floppy ear,
// stubby legs and a curly tail. Same language as the characters (2–3 tones and
// a line in a darker tone of the pig itself). Feet at y=0, centred on x=0; at
// s=1 a pig is about 120 wide and 78 tall.
import { smooth, ellipse, path, stroke, shape, g } from './personajes/svg.mjs';

const ROSA = { base: '#f2a7aa', shadow: '#dc838b', light: '#fcd0cc', line: '#9c4a55', deep: '#7a3440', snout: '#ea8c95' };
const SUCIO = { base: '#d99596', shadow: '#bf737b', light: '#ecb7b0', line: '#7e3a45', deep: '#5e2834', snout: '#cf7a83' };
const BARRO = ['#8a6a4a', '#73563a', '#9c7c58'];

/** Size of the box a pig takes when stacked (art units at its scale). */
export function medidas(s = 1) {
  return { w: 112 * s, h: 70 * s };
}

/**
 * @param {{ s?: number, peor?: boolean, manchas?: number, semilla?: number, nervioso?: boolean }} o
 *   peor: the worst pig of them all (bigger, muddy, scowling).
 */
export function cerdo({ s = 1, peor = false, manchas = 0, semilla = 1, nervioso = false } = {}) {
  const C = peor ? SUCIO : ROSA;
  let st = semilla * 9301 + 49297;
  const r = () => ((st = (st * 16807) % 2147483647) / 2147483647);
  const out = [];
  // Legs: far ones first, a shade darker.
  const leg = (x, far) => shape(smooth([[x - 7, -26], [x + 7, -26], [x + 7, -4], [x + 5, 0, 'c'], [x - 5, 0, 'c'], [x - 7, -4]]), far ? C.shadow : C.base, [path(smooth([[x - 7, -6], [x + 7, -6], [x + 6, 0, 'c'], [x - 6, 0, 'c']]), C.deep)], C.line, 1.3);
  out.push(leg(-30, true), leg(26, true));
  // Curly tail.
  out.push(stroke('M-54 -50c-12 -2 -14 -14 -6 -16c8 -2 6 10 -2 8', C.line, 4.5), stroke('M-54 -50c-12 -2 -14 -14 -6 -16c8 -2 6 10 -2 8', C.base, 2.6));
  // Body.
  const body = smooth([[-56, -46], [-40, -66], [0, -72], [34, -68], [52, -54], [56, -36], [44, -22], [0, -18], [-44, -22], [-58, -32]]);
  const shading = [
    path(smooth([[-60, -34], [-30, -26], [10, -22], [50, -28], [60, -10], [-60, -10]]), C.shadow),
    path(ellipse(-6, -58, 30, 8, -0.05), C.light, { opacity: 0.9 }),
  ];
  for (let i = 0; i < manchas; i++) shading.push(path(ellipse(-36 + r() * 60, -60 + r() * 30, 7 + r() * 8, 5 + r() * 6, r() * 2), C.deep, { opacity: 0.55 }));
  if (peor) for (let i = 0; i < 6; i++) shading.push(path(ellipse(-48 + r() * 90, -50 + r() * 30, 6 + r() * 9, 4 + r() * 5, r() * 3), BARRO[i % 3], { opacity: 0.85 }));
  out.push(shape(body, C.base, shading, C.line, 1.6));
  // Near legs over the body.
  out.push(leg(-20, false), leg(36, false));
  // Head: cheek, ear, snout, eye.
  const head = [
    shape(smooth([[34, -70], [56, -76], [72, -64], [76, -46], [66, -32], [46, -30], [36, -44]]), C.base, [path(smooth([[40, -40], [66, -36], [70, -30], [44, -28]]), C.shadow), path(ellipse(56, -64, 9, 5, 0.3), C.light, { opacity: 0.8 })], C.line, 1.5),
    shape(smooth([[50, -74], [64, -90], [68, -72]]), C.shadow, [], C.line, 1.4),
    shape(ellipse(80, -50, 9, 11, 0.1), C.snout, [path(ellipse(78, -54, 4, 3, 0.1), C.light, { opacity: 0.7 })], C.line, 1.5),
    path(ellipse(82, -53, 1.6, 2.6), C.deep),
    path(ellipse(82, -45, 1.6, 2.6), C.deep),
  ];
  if (peor) {
    // Small mean eye under a heavy brow, a notch in the ear.
    head.push(path(ellipse(62, -58, 3.2, 2.4), '#2a1418'), stroke('M54 -66L68 -61', C.deep, 3.4), path(smooth([[58, -84], [62, -80], [60, -86]]), C.base));
  } else {
    head.push(path(ellipse(62, -59, 3.4, 4), '#2a1418'), path(ellipse(63, -60.5, 1.2, 1.2), '#ffffff'));
  }
  if (nervioso) head.push(path(smooth([[70, -78], [74, -70], [70, -66], [66, -70]]), '#bfe4ff'), path(ellipse(-64, -74, 3, 4), '#bfe4ff', { opacity: 0.8 }));
  out.push(...head);
  return g(null, out, { transform: s === 1 ? undefined : `scale(${s})` });
}

/** The eight pigs Guille has left, in the order they are weighed: the worst one last. */
export const PIARA = [
  { s: 0.86, manchas: 0, semilla: 2, kg: 98 },
  { s: 1.0, manchas: 2, semilla: 3, kg: 112 },
  { s: 0.8, manchas: 0, semilla: 5, kg: 91 },
  { s: 0.94, manchas: 3, semilla: 7, kg: 104 },
  { s: 1.06, manchas: 0, semilla: 11, kg: 121 },
  { s: 0.9, manchas: 1, semilla: 13, kg: 101 },
  { s: 1.0, manchas: 2, semilla: 17, kg: 115 },
  { s: 1.3, peor: true, semilla: 19, kg: 152 },
];
