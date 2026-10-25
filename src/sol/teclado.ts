// Whether the player is using a keyboard or touch, and the keys of the fights, in one place so that the world can
// share them. The keys themselves are mapped in consola.ts: arrows or WASD to move, Z / Enter / Space = A (accept),
// X / Shift = B (back). Escape is B too: this file adds it (a fight listens to it with `alEscapar`; if the world also
// maps it, nothing breaks, because a press is only a flag in `Mandos`).
//
// `usaTeclado()` is true on a computer and flips with the last thing the player touched: any key puts it on, a
// finger on the screen puts it off. The hints with the keys (combate.teclas.*) only show while it is true.

let iniciado = false;
let teclado = true;

function iniciar() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  try {
    teclado = !matchMedia('(pointer: coarse)').matches;
  } catch {
    teclado = true;
  }
  addEventListener('keydown', () => (teclado = true), true);
  addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch') teclado = false;
    },
    true,
  );
}

/** True while the player is on the keyboard (not on the touch buttons). */
export function usaTeclado(): boolean {
  iniciar();
  return teclado;
}

/** Calls `f` whenever Escape is pressed; returns what undoes it. */
export function alEscapar(f: () => void): () => void {
  const h = (e: KeyboardEvent) => {
    if (e.code === 'Escape' && !e.repeat) {
      e.preventDefault();
      f();
    }
  };
  addEventListener('keydown', h);
  return () => removeEventListener('keydown', h);
}
