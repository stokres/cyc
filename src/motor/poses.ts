// Characters bent into poses of our own, outside the rig: Pablo's shadow in his
// battle (src/ui/sombra-histrionica.ts), Fran tossing ham (src/ui/rana.ts).
// The pose is applied to the body's SVG once and the result is turned into a
// bitmap (docs/ESTILO.md, T5): nothing is posed per frame.

/** The rig's bones and their parents (src/arte/personajes/rig-runtime.mjs). */
export const HUESOS: Array<[string, string]> = [
  ['torso', 'root'], ['cabeza', 'torso'],
  ['brazo_sup_detras', 'torso'], ['antebrazo_detras', 'brazo_sup_detras'], ['mano_detras', 'antebrazo_detras'],
  ['brazo_sup_delante', 'torso'], ['antebrazo_delante', 'brazo_sup_delante'], ['mano_delante', 'antebrazo_delante'],
  ['muslo_detras', 'root'], ['pierna_detras', 'muslo_detras'], ['pie_detras', 'pierna_detras'],
  ['muslo_delante', 'root'], ['pierna_delante', 'muslo_delante'], ['pie_delante', 'pierna_delante'],
];

/** Angles in degrees as in the rig: limbs positive = forward (facing right); torso and head positive = back. */
export type Huesos = Record<string, number>;

/**
 * The skeleton bent into a pose: the body's SVG with every bone moved, and each
 * bone's matrix (to find where a hand or the head ends up). Each bone hangs from
 * where its parent's end lands, turned by the sum of the angles above it, and
 * `largo` stretches a bone along its length only (so a long upper arm does not
 * skew the forearm).
 */
export function enPose(cuerpo: string, J: Record<string, number[]>, P: Huesos, largo: Record<string, number> = {}) {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${cuerpo}</svg>`, 'image/svg+xml');
  const M: Record<string, DOMMatrix> = { root: new DOMMatrix() };
  const A: Record<string, number> = { root: 0 };
  for (const [b, padre] of HUESOS) {
    const [px, py] = J[b];
    const w = M[padre].transformPoint(new DOMPoint(px, py));
    A[b] = A[padre] + (P[b] ?? 0);
    M[b] = new DOMMatrix().translate(w.x, w.y).rotate(-A[b]).scale(1, largo[b] ?? 1).translate(-px, -py);
    doc.querySelector(`[id="${b}"]`)?.setAttribute('transform', M[b].toString());
  }
  return { svg: doc.documentElement.innerHTML, M };
}
