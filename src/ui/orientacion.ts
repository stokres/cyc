// Portrait phones: the game is played in landscape, so while a phone is held upright the
// «turn your phone» notice (main.ts) covers everything and nothing may run behind it:
// not the scene, the prologue's timers, the minigames' loops, the trailer or the sound.
// This module is the one place that knows whether the phone is upright. The answer is a
// plain boolean refreshed on resize / rotation, so frame loops can read it for free.

/** How many things want the phone upright on purpose right now (PokéUsera, in chapter 2: `permitirVertical`). */
let permisos = 0;
const medir = () => permisos === 0 && window.innerHeight > window.innerWidth && matchMedia('(pointer: coarse)').matches;

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

/** True while a phone (a coarse pointer) is held upright and nothing asked for it. Cheap enough to read every frame. */
export const esVertical = () => vertical;

/** Calls `f` whenever the phone goes upright or back to landscape. Returns a function that stops it. */
export function alCambiarOrientacion(f: (vertical: boolean) => void): () => void {
  oyentes.add(f);
  return () => void oyentes.delete(f);
}

/**
 * Something that is played upright on purpose (PokéUsera, the last game of chapter 2) asks for it: while it lasts, a phone held upright is not
 * the «turn your phone» case (`esVertical` answers false, so the notice stays away and the sound and the other loops go on). Returns the function
 * that gives the permission back; when it does, an upright phone is the «turn your phone» case again, and the notice (main.ts) asks to turn it back.
 */
export function permitirVertical(): () => void {
  permisos++;
  actualizar();
  let devuelto = false;
  return () => {
    if (devuelto) return;
    devuelto = true;
    permisos--;
    actualizar();
  };
}

/** A phone (or tablet): a coarse pointer. The turn of chapter 2 asks to turn the device only there; a computer, or any screen with a fine pointer, just shows the game upright in a column. */
export const esTactil = (): boolean => matchMedia('(pointer: coarse)').matches;
