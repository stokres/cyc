// PokéUsera · chapter 2, the hunt: the numbers of the fight against the Ultimosaurio (the flow is capitulo.ts, the battle itself batalla.ts).
// The copy of the original game's AVENTURA mode that this comes from (a wild userito that you weaken and catch with a jarra) lost its map, bosses
// and saved progress: here there is one wild userito, the mythical one, and a jarra that is meant to catch it in a few throws.
import type { Userito } from '../tipos';

/**
 * Strength of the Ultimosaurio against the team Guille drafted (1 = its real stats, the highest of any userito). Set with scripts/pokeusera-caza-sim.mjs:
 * a team of three drafted at random, played by the machine, catches it in about 85 hunts out of 100 (with one or two jarras); when the team falls
 * the battle is repeated, with the team on its feet again.
 */
export const ESCALA_ULTIMOSAURIO = 0.78;

/** The share of its HP it stands up with when it is knocked down: it is mythical, it does not stay on the ground. */
export const REVIVE_PS = 0.35;

/** Makes a rival's userito weaker or stronger (the engine builds everybody at level 50): HP and the four stats. */
export function escalar(u: Userito, f: number): void {
  if (f === 1) return;
  u.psMax = Math.max(1, Math.round(u.psMax * f));
  u.ps = u.psMax;
  u.ata = Math.max(1, Math.round(u.ata * f));
  u.def = Math.max(1, Math.round(u.def * f));
  u.esp = Math.max(1, Math.round(u.esp * f));
  u.vel = Math.max(1, Math.round(u.vel * f));
}

/**
 * Chance (0..1) that a jarra catches the mythical userito: 30 % at full HP and about 90 % at the last bit of HP, more with a status (asleep counts
 * the most). It stands up with 35 % of its HP, so the first jarra after that has about a 70 % chance: it is caught in a few throws, not a few turns.
 */
export function probCaptura(u: Userito): number {
  const resto = u.psMax > 0 ? u.ps / u.psMax : 1;
  let p = 0.3 + 0.6 * (1 - resto);
  if (u.estado === 'dormido') p += 0.25;
  else if (u.estado) p += 0.12;
  if (u.achispado > 0) p += 0.05;
  return Math.max(0.3, Math.min(0.97, p));
}
