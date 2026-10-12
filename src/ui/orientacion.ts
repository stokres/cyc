// Portrait phones: the game is played in landscape, so while a phone is held upright the
// «turn your phone» notice (main.ts) covers everything and nothing may run behind it:
// not the scene, the prologue's timers, the minigames' loops, the trailer or the sound.
// This module is the one place that knows whether the phone is upright. The answer is a
// plain boolean refreshed on resize / rotation, so frame loops can read it for free.

const medir = () => window.innerHeight > window.innerWidth && matchMedia('(pointer: coarse)').matches;

let vertical = medir();
const oyentes = new Set<(vertical: boolean) => void>();

const actualizar = () => {
  const ahora = medir();
  if (ahora === vertical) return;
  vertical = ahora;
  for (const f of [...oyentes]) f(ahora);
};
window.addEventListener('resize', actualizar);
window.addEventListener('orientationchange', actualizar);

/** True while a phone (a coarse pointer) is held upright. Cheap enough to read every frame. */
export const esVertical = () => vertical;

/** Calls `f` whenever the phone goes upright or back to landscape. Returns a function that stops it. */
export function alCambiarOrientacion(f: (vertical: boolean) => void): () => void {
  oyentes.add(f);
  return () => void oyentes.delete(f);
}
