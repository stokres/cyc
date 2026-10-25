// Los cuatro amigos y Vero, hechos figura (capítulo 2, el mundo de los conceptos; docs/CAPITULO2.md): un rig de piezas sueltas
// por cada uno (conceptos-rig.mjs explica el formato). Solo se dibujan una vez.
import { chuchi } from './conceptos-fig-chuchi.mjs';
import { pablo } from './conceptos-fig-pablo.mjs';
import { fran } from './conceptos-fig-fran.mjs';
import { guille } from './conceptos-fig-guille.mjs';
import { vero } from './conceptos-fig-vero.mjs';

export const FIGURAS = { chuchi, pablo, fran, guille, vero };
const hechas = {};
/** El rig de una figura (se dibuja la primera vez que se pide). */
export const figura = (id) => (hechas[id] ??= FIGURAS[id]());
