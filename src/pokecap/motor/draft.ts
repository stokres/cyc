// Snake draft: 3 rounds, the order reverses every round (0,1,2,3, 3,2,1,0, 0,1,2,3), rotated so
// that `primero` starts. Pure: every function returns a new state instead of changing the old one.
import type { EstadoDraft } from '../tipos';
import { ESPECIES } from '../datos';

export function crearDraft(nJugadores: number, primero = 0): EstadoDraft {
  const ida = Array.from({ length: nJugadores }, (_, i) => i);
  const vuelta = [...ida].reverse();
  const base = [...ida, ...vuelta, ...ida];
  return { orden: base.map((x) => (x + primero) % nJugadores), elegidos: [] };
}

/** Whose turn it is to pick, or null when the draft is over. */
export function turnoDraft(d: EstadoDraft): number | null {
  return d.elegidos.length < d.orden.length ? d.orden[d.elegidos.length] : null;
}

/** Species ids still free. */
export function disponibles(d: EstadoDraft): string[] {
  return ESPECIES.map((s) => s.id).filter((id) => !d.elegidos.includes(id));
}

/** The current player picks `especie`. Taken, unknown or out-of-turn picks are ignored (same state back). */
export function elegir(d: EstadoDraft, especie: string): EstadoDraft {
  if (turnoDraft(d) === null || !disponibles(d).includes(especie)) return d;
  return { orden: [...d.orden], elegidos: [...d.elegidos, especie] };
}

/** The teams so far: species picked by each of the `n` players, in pick order. */
export function equipos(d: EstadoDraft, n: number): string[][] {
  const res: string[][] = Array.from({ length: n }, () => []);
  d.elegidos.forEach((id, i) => res[d.orden[i]]?.push(id));
  return res;
}
