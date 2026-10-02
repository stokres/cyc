// Shared pieces for the front view of the heads (dialogue portraits): eyes with
// blink and moods, brows that tilt with the mood, and mouths for lip sync.
// Head-local units, same construction lines as the 3/4 view: eyes y=-2 at x=±16,
// brows y≈-15, mouth y≈30.
import { smooth, ellipse, path, stroke, g } from './svg.mjs';

/**
 * Eyes. `eye(x)` draws one open eye in the character's style.
 * Moods: neutral, happy (^^), surprised (wider), sad and angry (lids), smug.
 */
export function ojos({ C, eye, mood = 'neutral', blink = false, rx = 4.4, ry = 5.4, sep = 16, y = -2, lid = C.skin, lidLine = C.skinLine }) {
  if (blink) return [-sep, sep].map((x) => stroke(smooth([[x - rx - 1.5, y + 0.5], [x, y + ry * 0.55], [x + rx + 1.5, y + 0.5]], false), C.eye, 2.4)).join('');
  if (mood === 'happy') return [-sep, sep].map((x) => stroke(smooth([[x - rx - 1, y + 2], [x, y - ry + 0.5], [x + rx + 1, y + 2]], false), C.eye, 2.6)).join('');
  if (mood === 'surprised') return [-sep, sep].map((x) => g(null, eye(x), { transform: `translate(${x} ${y}) scale(1.22) translate(${-x} ${-y})` })).join('');
  const out = [eye(-sep), eye(sep)];
  // Lids: sad droops at the outer corners, angry drops towards the nose, smug half closed.
  for (const s of [-1, 1]) {
    const x = s * sep;
    const outer = x + s * (rx + 1.5);
    const inner = x - s * (rx + 1.5);
    let yo = null;
    let yi = null;
    if (mood === 'sad') [yo, yi] = [y - ry * 0.05, y - ry * 0.75];
    else if (mood === 'angry') [yo, yi] = [y - ry * 0.75, y - ry * 0.05];
    else if (mood === 'smug') [yo, yi] = [y - ry * 0.3, y - ry * 0.3];
    if (yo === null) continue;
    const top = y - ry - 3;
    out.push(path(smooth([[outer, top], [inner, top], [inner, yi], [x, (yi + yo) / 2 - 0.3], [outer, yo]]), lid), stroke(smooth([[inner, yi], [x, (yi + yo) / 2 - 0.3], [outer, yo]], false), lidLine, 1.3));
  }
  return out.join('');
}

/**
 * Brows: the character's own two brow shapes (left = viewer's left), tilted by mood.
 * `pivots` are their outer ends.
 */
export function cejas({ izq, der, mood = 'neutral', pivots = [[-26, -14], [26, -14]] }) {
  const t = {
    neutral: [0, 0],
    smug: [-1.5, 4],
    happy: [-2.5, 0],
    surprised: [-6, -3],
    sad: [-1.5, -12],
    angry: [1.5, 13],
  }[mood] ?? [0, 0];
  const [dy, ang] = t;
  const [pl, pr] = pivots;
  return [
    // Positive angle = inner ends down (angry); negative = inner ends up (sad).
    g(null, izq, { transform: `translate(0 ${dy}) rotate(${ang} ${pl[0]} ${pl[1]})` }),
    g(null, der, { transform: `translate(0 ${dy}) rotate(${-ang} ${pr[0]} ${pr[1]})` }),
  ].join('');
}

/**
 * Mouth for a viseme or mood. `reposo` and `sonrisa` are the character's own
 * (already drawn in its style); the rest are built here around (0, y), width w.
 */
export function boca({ C, kind, y = 30, w = 11, reposo, sonrisa }) {
  const M = C.mouth;
  const T = C.teeth ?? '#f4efe4';
  const L = C.lip ?? C.mouth;
  const tongue = C.tongue ?? '#c45a55';
  switch (kind) {
    case 'sonrisa':
      return sonrisa;
    case 'a':
      return [
        path(smooth([[-w * 0.7, y], [0, y - 1.5], [w * 0.7, y], [w * 0.5, y + 8], [0, y + 11], [-w * 0.5, y + 8]]), M),
        path(smooth([[-w * 0.6, y + 0.3], [0, y - 1], [w * 0.6, y + 0.3], [w * 0.5, y + 2.6], [0, y + 3.2], [-w * 0.5, y + 2.6]]), T),
        path(ellipse(0, y + 8, w * 0.35, 2.4), tongue),
      ].join('');
    case 'e':
      return [
        path(smooth([[-w * 0.85, y + 0.5], [0, y - 0.5], [w * 0.85, y + 0.5], [w * 0.6, y + 4.5], [0, y + 5.5], [-w * 0.6, y + 4.5]]), M),
        path(smooth([[-w * 0.75, y + 0.8], [0, y], [w * 0.75, y + 0.8], [w * 0.6, y + 2.6], [0, y + 3], [-w * 0.6, y + 2.6]]), T),
      ].join('');
    case 'o':
      return [path(ellipse(0, y + 4, w * 0.38, 5.5), M), path(ellipse(0, y + 6.5, w * 0.22, 2), tongue)].join('');
    case 'm':
      return [stroke(smooth([[-w * 0.7, y + 1], [0, y + 1.6], [w * 0.7, y + 1]], false), M, 2.2), path(smooth([[-w * 0.5, y + 2], [0, y + 4], [w * 0.5, y + 2], [0, y + 5.5]]), L)].join('');
    case 'triste':
      return stroke(smooth([[-w * 0.75, y + 3], [0, y - 0.5], [w * 0.75, y + 3]], false), M, 2.2);
    case 'enfado':
      return [stroke(smooth([[-w * 0.8, y + 2], [-w * 0.3, y], [w * 0.3, y], [w * 0.8, y + 2]], false), M, 2.4), stroke(smooth([[-w * 0.4, y + 1.6], [w * 0.4, y + 1.6]], false), T, 1.4)].join('');
    case 'sorpresa':
      return path(ellipse(0, y + 4, w * 0.32, 4.5), M);
    default:
      return reposo;
  }
}

/** Which mouth a mood shows when nobody is talking. */
export function bocaDelAnimo(mood) {
  return { happy: 'sonrisa', surprised: 'sorpresa', sad: 'triste', angry: 'enfado' }[mood] ?? 'reposo';
}
