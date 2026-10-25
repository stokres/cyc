// The keyboard of Alacant Sun, in ONE place: which keys are which buttons of the console, and how the buttons are
// named in the texts. consola.ts reads the codes; the texts get the names through `{A}`, `{B}`, `{R}`, `{L}` and
// `{START}` (see `teclasVars`). The fight uses the same assignment because it reads the same `Mandos`.
//
//   move           arrows or WASD
//   A (act)        Z, Enter or Space   (talk, read, accept, next line)
//   B (cancel)     X, Escape, Backspace or Shift   (back; held in the world it runs). In the world Escape also opens the
//                  START menu, and Tab does too (START, the console's own button, does the same by touch)
//   R / L          R / Q   (use the chosen power / change it)
import { esTactil } from '../ui/orientacion';

export const TECLAS_MOVER = {
  izq: ['ArrowLeft', 'KeyA'],
  der: ['ArrowRight', 'KeyD'],
  arriba: ['ArrowUp', 'KeyW'],
  abajo: ['ArrowDown', 'KeyS'],
};
export const TECLAS_A = ['KeyZ', 'Enter', 'Space', 'NumpadEnter'];
export const TECLAS_B = ['KeyX', 'Escape', 'Backspace', 'ShiftLeft', 'ShiftRight'];
export const TECLAS_START = ['Tab'];
/** Of the B keys, the ones that also open the START menu in the world. */
export const TECLAS_B_MENU = ['Escape'];
export const TECLA_R = 'KeyR';
export const TECLA_L = 'KeyQ';

export const TECLAS_MOVER_TODAS = new Set<string>(Object.values(TECLAS_MOVER).flat());
export const TECLAS_CONOCIDAS = new Set<string>([...TECLAS_MOVER_TODAS, ...TECLAS_A, ...TECLAS_B, ...TECLAS_START, TECLA_R, TECLA_L]);

/** What the buttons are called on this device: the console's letters on a touch screen, the keys on a computer. */
export function nombresBotones(): Record<'A' | 'B' | 'R' | 'L' | 'START', string> {
  nombres ??= esTactil() ? { A: 'A', B: 'B', R: 'R', L: 'L', START: 'START' } : { A: 'Z', B: 'X', R: 'R', L: 'Q', START: 'ESC' };
  return nombres;
}
let nombres: Record<'A' | 'B' | 'R' | 'L' | 'START', string> | undefined;

/** Values for the `{A}`, `{B}`... holes of a text. */
export const teclasVars = (): Record<string, string> => nombresBotones();
