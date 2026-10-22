// The data of what a friend can do in a fight besides hitting: impronergía (our psynergy), prompters
// («apuntadores», our djinn), summons and items. All numbers live here; the names are in src/textos/sol.md
// (`poder.<id>.nombre`, `apuntador.<id>.nombre`, `invocacion.<id>.nombre`, `objeto.<id>.nombre`).
import type { Elemento } from './grupo';
import type { Amigo } from './personajes';

/** Which visual effect a power plays (efectos.ts). */
export type FxId =
  | 'siy' | 'cajonazo' | 'fresquito' | 'otracana' | 'cierzo' | 'abrazo' | 'cincominutos' | 'chupito'
  | 'chist' | 'ovacion' | 'calderon';

export type ModoPoder =
  /** One enemy. */
  | 'uno'
  /** The target and its two neighbours (the neighbours take less). */
  | 'abanico'
  /** One friend, healed. */
  | 'cura';

export interface Poder {
  id: string;
  quien: Amigo;
  /** Level at which he learns it. */
  nivel: number;
  /** IP it costs. */
  ip: number;
  el: Elemento;
  modo: ModoPoder;
  /** Flat power; the damage is `pot + atk × 0.6 − enemy def × 0.3` (a heal is `pot + atk`). */
  pot: number;
  /** Share of the damage for each hit (one entry per hit; `[1]` by default). */
  golpes?: number[];
  /** Acts after everybody else in the round, whatever his agility (Chuchi is always late). */
  tarde?: boolean;
  fx: FxId;
}

/** Damage share the neighbours of the target take from an area power. */
export const VECINOS = 0.6;

export const PODERES: Poder[] = [
  { id: 'siy', quien: 'pablo', nivel: 1, ip: 3, el: 'tierra', modo: 'uno', pot: 8, golpes: [0.75, 0.75], fx: 'siy' },
  { id: 'cajonazo', quien: 'pablo', nivel: 2, ip: 5, el: 'tierra', modo: 'abanico', pot: 9, fx: 'cajonazo' },
  { id: 'fresquito', quien: 'fran', nivel: 1, ip: 4, el: 'agua', modo: 'uno', pot: 12, fx: 'fresquito' },
  { id: 'otracana', quien: 'fran', nivel: 1, ip: 4, el: 'agua', modo: 'cura', pot: 18, fx: 'otracana' },
  { id: 'cierzo', quien: 'guille', nivel: 1, ip: 5, el: 'viento', modo: 'abanico', pot: 8, fx: 'cierzo' },
  { id: 'abrazo', quien: 'guille', nivel: 2, ip: 6, el: 'viento', modo: 'uno', pot: 16, fx: 'abrazo' },
  { id: 'cincominutos', quien: 'chuchi', nivel: 1, ip: 6, el: 'fuego', modo: 'uno', pot: 20, tarde: true, fx: 'cincominutos' },
  { id: 'chupito', quien: 'chuchi', nivel: 2, ip: 6, el: 'fuego', modo: 'abanico', pot: 10, fx: 'chupito' },
];

export const poderPorId = (id: string) => PODERES.find((p) => p.id === id)!;
/** The powers a friend knows at a level. */
export const poderesDe = (q: Amigo, nivel: number) => PODERES.filter((p) => p.quien === q && p.nivel <= nivel);

// ---------------------------------------------------------------- prompters

export interface DefApuntador {
  id: string;
  el: Elemento;
  /** Power of the special attack when released (damage `pot + atk × 0.6 − def × 0.3`, one enemy). */
  pot: number;
  fx: FxId;
}

export const APUNTADORES: DefApuntador[] = [{ id: 'chist', el: 'tierra', pot: 22, fx: 'chist' }];
export const apuntadorPorId = (id: string) => APUNTADORES.find((a) => a.id === id)!;
/** Rounds a prompter takes to come back after a summon. */
export const TURNOS_RECUPERA = 3;

// ---------------------------------------------------------------- summons

export interface Invocacion {
  id: string;
  /** Prompters «en espera» needed, by element. */
  req: Partial<Record<Elemento, number>>;
  el: Elemento;
  /** Damage to every enemy: `pot + atk × 1` (ignores defence). */
  pot: number;
  fx: FxId;
  /** False while its animation is not made: it is not offered. */
  lista: boolean;
}

export const INVOCACIONES: Invocacion[] = [
  { id: 'ovacion', req: { tierra: 1 }, el: 'tierra', pot: 30, fx: 'ovacion', lista: true },
  // The big one with all four friends' prompters: Calderón de la Barca coming down from the sky (to do).
  { id: 'calderon', req: { tierra: 1, fuego: 1, agua: 1, viento: 1 }, el: 'tierra', pot: 90, fx: 'calderon', lista: false },
];
export const invocacionPorId = (id: string) => INVOCACIONES.find((i) => i.id === id)!;

// ---------------------------------------------------------------- items

export interface Objeto {
  id: string;
  /** Coins it costs in the peña's shop. */
  precio: number;
  /** Health it gives back. */
  pv?: number;
  /** IP it gives back. */
  ip?: number;
}

export const OBJETOS: Objeto[] = [
  { id: 'turron', precio: 12, pv: 35 },
  { id: 'chupito', precio: 15, ip: 10 },
];
export const objetoPorId = (id: string) => OBJETOS.find((o) => o.id === id)!;
