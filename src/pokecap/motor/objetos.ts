// PokéUsera · the objects of «La barra» (docs/POKEUSERA.md, «Objetos de la barra»): which three are offered to each player, what the
// machine takes (and for whom), and how a state is shown to someone who must not see the others' objects yet. Pure: no DOM, no timers.
// The effects themselves live in combate.ts (they bend the turn's rules).
import type { EstadoCombate, ObjetoId } from '../tipos';
import { OBJETOS } from '../tipos';
import { ESPECIE, ESPECIES, MOVS, TIPOS, eficacia } from '../datos';
import { crearRnd } from './azar';

/** What a player chooses in «La barra»: one of the objects offered, and which of the three useritos (index in the team) carries it. */
export interface EleccionObjeto {
  objeto: ObjetoId;
  idx: number;
}

/** Seconds a player has to choose in «La barra» (like the draft). */
export const PLAZO_BARRA = 20000;

/** The three different objects offered to seat `seat`, drawn from the battle's seed (so the host and a replay agree) and independent per seat. */
export function ofertasObjetos(semilla: number, seat: number): ObjetoId[] {
  const rnd = crearRnd(((semilla | 0) ^ 0x0b1e70) + 7919 * (seat + 1));
  const lista = [...OBJETOS];
  for (let i = lista.length - 1; i > 0; i--) {
    const k = Math.floor(rnd() * (i + 1));
    [lista[i], lista[k]] = [lista[k], lista[i]];
  }
  return lista.slice(0, 3);
}

/** Seconds a player has to look at «TU EQUIPO AL AZAR» online (solo play has no limit: nobody waits for you). */
export const PLAZO_AZAR = 15000;

/** What «AL AZAR» deals: the teams (species ids per seat, never repeated across seats) and, per seat, the object of each of its three useritos (null: none). */
export interface RepartoAzar {
  equipos: string[][];
  objetos: (ObjetoId | null)[][];
}

/**
 * The deal of the AL AZAR mode (docs/POKEUSERA.md, «Modo AL AZAR»): `n` players get three different useritos each (all of them different, as in the
 * draft) and one object, any of the ten (it may repeat across players), held by one of their three useritos. Pure: the same `semilla` always gives
 * the same deal (the host and a replay agree; no Math.random). Uses its own generator, so it never shifts the numbers of the battle.
 */
export function repartoAzar(semilla: number, n: number): RepartoAzar {
  const rnd = crearRnd((semilla | 0) ^ 0x0a2a2a5);
  const ids = ESPECIES.map((s) => s.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const k = Math.floor(rnd() * (i + 1));
    [ids[i], ids[k]] = [ids[k], ids[i]];
  }
  const equipos = Array.from({ length: n }, (_, j) => ids.slice(j * 3, j * 3 + 3));
  const objetos = equipos.map((): (ObjetoId | null)[] => {
    const lleva: (ObjetoId | null)[] = [null, null, null];
    lleva[Math.floor(rnd() * 3)] = OBJETOS[Math.floor(rnd() * OBJETOS.length)];
    return lleva;
  });
  return { equipos, objetos };
}

/** Whether `e` is something the player may take: one of the offers and a valid index. */
export function eleccionObjetoValida(el: unknown, ofertas: readonly ObjetoId[]): el is EleccionObjeto {
  if (!el || typeof el !== 'object') return false;
  const { objeto, idx } = el as EleccionObjeto;
  return ofertas.includes(objeto) && Number.isInteger(idx) && idx >= 0 && idx < 3;
}

const acota = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * How well object `id` suits a userito, 0..1 (the machine's taste, nothing the rules care about): food and a coaster for the fragile,
 * the lighter for the sturdy one in front, the cork for the slow hard hitter (it makes the first blow quick), the toothpick for the fast
 * (more crits), the sneakers for the slow, the glasses for the one with shaky moves, the scarf for the one with many same-type attacks.
 */
export function valorObjeto(id: ObjetoId, especie: string): number {
  const sp = ESPECIE[especie];
  const b = sp.base;
  const fragil = acota((205 - (b.ps + b.def)) / 65);
  const robusto = 1 - fragil;
  const ataques = sp.movs.map((m) => MOVS[m]).filter((m) => m.pot !== null && m.pot > 0);
  switch (id) {
    case 'mechero':
      return 0.3 + 0.35 * robusto;
    case 'chicle':
      return 0.42 + 0.1 * robusto;
    case 'bocata':
      return 0.3 + 0.55 * fragil;
    case 'posavasos': {
      const debil = TIPOS.filter((tp) => eficacia(tp, sp.tipos) >= 2).length;
      return 0.2 + 0.1 * Math.min(5, debil) + 0.15 * fragil;
    }
    case 'tapon':
      return 0.25 + 0.5 * acota((Math.max(b.ata, b.esp) - 60) / 60) + 0.25 * acota((100 - b.vel) / 60);
    case 'palillo':
      return 0.15 + 0.7 * acota((b.vel - 50) / 65);
    case 'gafas':
      return 0.2 + 0.18 * ataques.filter((m) => m.prec !== null && m.prec < 100).length;
    case 'zapatillas':
      return 0.25 + 0.65 * acota((105 - b.vel) / 65);
    case 'panuelo':
      return 0.2 + 0.2 * Math.min(3, ataques.filter((m) => sp.tipos.includes(m.tipo)).length);
    case 'llavero':
      return 0.35 + 0.15 * fragil;
  }
}

/** The machine's choice (and the default when a player runs out of time): the best pair of offer and userito, with a little noise so the machines differ. */
export function objetoBot(especies: readonly string[], ofertas: readonly ObjetoId[], rnd: () => number): EleccionObjeto {
  let mejor: EleccionObjeto = { objeto: ofertas[0], idx: 0 };
  let mejorV = -Infinity;
  for (const objeto of ofertas) {
    for (let idx = 0; idx < especies.length && idx < 3; idx++) {
      const v = valorObjeto(objeto, especies[idx]) + rnd() * 0.12;
      if (v > mejorV) {
        mejorV = v;
        mejor = { objeto, idx };
      }
    }
  }
  return mejor;
}

/**
 * The state as the player in `seat` may see it (null: a spectator): the objects of the other players that have not worked yet
 * (`visto`) are left out. Returns `e` itself when there is nothing to hide, otherwise a copy; never changes `e`.
 */
export function ocultarObjetos(e: EstadoCombate, seat: number | null): EstadoCombate {
  if (!e.jugadores.some((q, j) => j !== seat && q.equipo.some((u) => u.objeto && !u.objeto.visto))) return e;
  const c = structuredClone(e);
  c.jugadores.forEach((q, j) => {
    if (j === seat) return;
    for (const u of q.equipo) if (u.objeto && !u.objeto.visto) delete u.objeto;
  });
  return c;
}
