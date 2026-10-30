// PokéUsera · the little pixel icons of the priority of a move (docs/POKEUSERA.md, «Prioridad y protección»): a bolt for the quick
// ones (+1), a shield for the protections (+2) and an hourglass for the slow ones (−1). 9×9, baked once each (a blit per use).
import { hornear } from '../arte2/ui2';
import { TINTA2 } from '../arte2/paleta2';

export type ClasePrioridad = 'rapido' | 'proteccion' | 'lento';

/** Side of every icon. */
export const LADO_ICONO_PRIO = 9;

/** What a priority is called on screen: +2 or more protection, +1 quick, below 0 slow, 0 nothing. */
export function clasePrioridad(prioridad: number | undefined): ClasePrioridad | null {
  if (!prioridad) return null;
  return prioridad >= 2 ? 'proteccion' : prioridad > 0 ? 'rapido' : 'lento';
}

// k = dark outline, the rest are the colours of PALETA below.
const MAPAS: Record<ClasePrioridad, string[]> = {
  rapido: [
    '....kkkk.',
    '...kyyyk.',
    '..kyyyk..',
    '.kyyyyyk.',
    'kyyyyyyyk',
    'kkkkyyyk.',
    '...kyyk..',
    '..kyyk...',
    '..kkk....',
  ],
  proteccion: [
    '.kkkkkkk.',
    'kBBbbbbbk',
    'kBbbbbbbk',
    'kBbbbbbbk',
    'kbbbbbbdk',
    '.kbbbbdk.',
    '..kbbdk..',
    '...kdk...',
    '....k....',
  ],
  lento: [
    'kkkkkkkkk',
    '.kqqqqqk.',
    '..kqqsk..',
    '...kqk...',
    '....k....',
    '...ksk...',
    '..ksssk..',
    '.ksssssk.',
    'kkkkkkkkk',
  ],
};

const PALETA: Record<string, string> = {
  k: TINTA2,
  y: '#ffd23a',
  b: '#4f8fd8',
  B: '#a9d2f6',
  d: '#2f5fa8',
  q: '#f6ead0',
  s: '#e8862a',
};

const iconos: Partial<Record<ClasePrioridad, HTMLCanvasElement>> = {};

/** The baked 9×9 icon of a class of priority. */
export function iconoPrioridad(clase: ClasePrioridad): HTMLCanvasElement {
  return (iconos[clase] ??= hornear(`prio|${clase}`, LADO_ICONO_PRIO, LADO_ICONO_PRIO, (cx) => {
    MAPAS[clase].forEach((fila, y) => {
      for (let x = 0; x < fila.length; x++) {
        const c = fila[x];
        if (c === '.') continue;
        cx.fillStyle = PALETA[c];
        cx.fillRect(x, y, 1, 1);
      }
    });
  }));
}
