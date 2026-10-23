// The party of «Alacant Sun»: who is in it, their levels, health, psynergy points (IP), experience, items,
// coins and prompters (the «apuntadores», our djinn). It is plain data with a few helpers; the fight
// (combate.ts) reads and changes it and the world will keep one for the whole game.
//
// Numbers: a friend's stats at level n are `base + crece × (n − 1)` rounded down, plus the bonus of the
// prompters that are set on them (the prompter's bonus goes away while it is «en espera» or recovering).
import type { Amigo } from './personajes';

export type Elemento = 'tierra' | 'fuego' | 'agua' | 'viento';

/** Fire against water and earth against wind hit hard; the same element resists. */
export const OPUESTO: Record<Elemento, Elemento> = { tierra: 'viento', viento: 'tierra', fuego: 'agua', agua: 'fuego' };

/** Damage multiplier of an element against another (neutral things, `null`, take and give 1). */
export function eficacia(atq: Elemento | null, def: Elemento | null): number {
  if (!atq || !def) return 1;
  if (OPUESTO[atq] === def) return 1.5;
  if (atq === def) return 0.5;
  return 1;
}

/** The colours of each element (windows, sparks, icons). */
export const COLOR_ELEMENTO: Record<Elemento, { claro: string; medio: string; oscuro: string }> = {
  tierra: { claro: '#ffe27a', medio: '#d8a23a', oscuro: '#6a4414' },
  fuego: { claro: '#ffb070', medio: '#f0562a', oscuro: '#7a1a14' },
  agua: { claro: '#bff0ff', medio: '#4ab4f0', oscuro: '#164a8a' },
  viento: { claro: '#e0c8ff', medio: '#a47ae8', oscuro: '#3e2478' },
};

export interface Stats {
  pv: number;
  ip: number;
  atk: number;
  def: number;
  agi: number;
}

export interface DatosAmigo {
  elemento: Elemento;
  /** Stats at level 1. */
  base: Stats;
  /** Growth per level. */
  crece: Stats;
}

/** The party in the order they stand in the fight (Chuchi joins last, of course). */
export const ORDEN_AMIGOS: readonly Amigo[] = ['pablo', 'fran', 'guille', 'chuchi'];

export const AMIGOS: Record<Amigo, DatosAmigo> = {
  pablo: { elemento: 'tierra', base: { pv: 44, ip: 14, atk: 13, def: 8, agi: 9 }, crece: { pv: 9, ip: 2.5, atk: 2.6, def: 1.6, agi: 1.1 } },
  fran: { elemento: 'agua', base: { pv: 50, ip: 16, atk: 12, def: 8, agi: 6 }, crece: { pv: 10, ip: 3, atk: 2.2, def: 1.8, agi: 0.9 } },
  guille: { elemento: 'viento', base: { pv: 40, ip: 14, atk: 11, def: 6, agi: 14 }, crece: { pv: 8, ip: 2.8, atk: 2.2, def: 1.3, agi: 1.8 } },
  chuchi: { elemento: 'fuego', base: { pv: 36, ip: 18, atk: 14, def: 5, agi: 8 }, crece: { pv: 7, ip: 3.2, atk: 2.8, def: 1.2, agi: 1 } },
};

export const NIVEL_MAX = 20;
/** Experience a friend needs in total to be at level n (n ≥ 1). */
export const expTotal = (n: number) => 20 * n * (n - 1);

/** The state of a prompter: set on its owner, ready to summon («en espera»), or coming back after a summon. */
export type EstadoApuntador = 'puesto' | 'espera' | 'recupera';

export interface ApuntadorGrupo {
  id: string;
  dueno: Amigo;
  estado: EstadoApuntador;
  /** Rounds left to be set again (when `recupera`). */
  turnos: number;
}

export interface Miembro {
  q: Amigo;
  nivel: number;
  exp: number;
  pv: number;
  ip: number;
}

export interface Grupo {
  miembros: Miembro[];
  /** Item id → how many. */
  objetos: Record<string, number>;
  monedas: number;
  apuntadores: ApuntadorGrupo[];
}

/** Bonus of the prompters set on a friend, by id (kept here so the data stays next to the stats). */
export const BONO_APUNTADOR: Record<string, Partial<Stats>> = {
  chist: { pv: 6, ip: 2, atk: 3, def: 2, agi: 2 },
  ejem: { pv: 4, ip: 3, atk: 5, def: 1, agi: 2 },
  psst: { pv: 10, ip: 3, atk: 1, def: 3, agi: 1 },
  shhh: { pv: 5, ip: 2, atk: 3, def: 1, agi: 5 },
};

/** Base stats of a friend at a level, with no prompters. */
export function statsBase(q: Amigo, nivel: number): Stats {
  const d = AMIGOS[q];
  const f = (k: keyof Stats) => Math.floor(d.base[k] + d.crece[k] * (nivel - 1));
  return { pv: f('pv'), ip: f('ip'), atk: f('atk'), def: f('def'), agi: f('agi') };
}

/** Stats of a member now: base plus the prompters that are set on him. */
export function statsDe(g: Grupo, m: Miembro): Stats {
  const s = statsBase(m.q, m.nivel);
  for (const a of g.apuntadores) {
    if (a.dueno !== m.q || a.estado !== 'puesto') continue;
    const b = BONO_APUNTADOR[a.id] ?? {};
    for (const k of Object.keys(b) as Array<keyof Stats>) s[k] += b[k] ?? 0;
  }
  return s;
}

export const miembro = (g: Grupo, q: Amigo) => g.miembros.find((m) => m.q === q)!;
export const vivo = (m: Miembro) => m.pv > 0;

/** Keeps health and IP between 0 and the maximum (the maximum drops when a prompter is released). */
export function ajustar(g: Grupo, m: Miembro) {
  const s = statsDe(g, m);
  m.pv = Math.max(0, Math.min(s.pv, Math.round(m.pv)));
  m.ip = Math.max(0, Math.min(s.ip, Math.round(m.ip)));
}

/** A full party with those friends at that level, health and IP full, a few items and (if asked) the first prompter on Pablo. */
export function crearGrupo(o: { amigos?: readonly Amigo[]; nivel?: number; apuntadores?: boolean } = {}): Grupo {
  const nivel = o.nivel ?? 1;
  const g: Grupo = {
    miembros: (o.amigos ?? ORDEN_AMIGOS).map((q) => ({ q, nivel, exp: expTotal(nivel), pv: 1, ip: 1 })),
    objetos: { turron: 3, chupito: 2 },
    monedas: 0,
    apuntadores: o.apuntadores === false ? [] : [{ id: 'chist', dueno: 'pablo', estado: 'puesto', turnos: 0 }],
  };
  for (const m of g.miembros) {
    const s = statsDe(g, m);
    m.pv = s.pv;
    m.ip = s.ip;
  }
  return g;
}

/** A friend joins the party at the level of the leader (the first member), full of health and IP. Does nothing if he is in. */
export function unirAmigo(g: Grupo, q: Amigo): Miembro {
  const ya = g.miembros.find((m) => m.q === q);
  if (ya) return ya;
  const nivel = g.miembros[0]?.nivel ?? 1;
  const m: Miembro = { q, nivel, exp: expTotal(nivel), pv: 1, ip: 1 };
  g.miembros.push(m);
  g.miembros.sort((a, b) => ORDEN_AMIGOS.indexOf(a.q) - ORDEN_AMIGOS.indexOf(b.q));
  const s = statsDe(g, m);
  m.pv = s.pv;
  m.ip = s.ip;
  return m;
}

/** The party now holds a prompter (set on `dueno`). Returns false if it already had it. */
export function darApuntador(g: Grupo, id: string, dueno: Amigo): boolean {
  if (g.apuntadores.some((a) => a.id === id)) return false;
  g.apuntadores.push({ id, dueno, estado: 'puesto', turnos: 0 });
  const m = g.miembros.find((x) => x.q === dueno);
  if (m) {
    const s = statsDe(g, m);
    m.pv += BONO_APUNTADOR[id]?.pv ?? 0;
    m.ip += BONO_APUNTADOR[id]?.ip ?? 0;
    m.pv = Math.min(m.pv, s.pv);
    m.ip = Math.min(m.ip, s.ip);
  }
  return true;
}

/** Heals everybody completely and puts every prompter back (an inn, a rest). */
export function descansar(g: Grupo) {
  for (const a of g.apuntadores) {
    a.estado = 'puesto';
    a.turnos = 0;
  }
  for (const m of g.miembros) {
    const s = statsDe(g, m);
    m.pv = s.pv;
    m.ip = s.ip;
  }
}

export interface SubidaDeNivel {
  q: Amigo;
  nivel: number;
  antes: Stats;
  despues: Stats;
}

/** Gives experience to a member and returns every level he goes up (empty if none). Health and IP rise with the maximum. */
export function darExp(g: Grupo, m: Miembro, exp: number): SubidaDeNivel[] {
  const subidas: SubidaDeNivel[] = [];
  m.exp += exp;
  while (m.nivel < NIVEL_MAX && m.exp >= expTotal(m.nivel + 1)) {
    const antes = statsBase(m.q, m.nivel);
    m.nivel++;
    const despues = statsBase(m.q, m.nivel);
    // the extra points are given to the current ones too (like the original: the new maximum is gained)
    if (m.pv > 0) m.pv += despues.pv - antes.pv; // a friend who is down stays down
    m.ip += despues.ip - antes.ip;
    ajustar(g, m);
    subidas.push({ q: m.q, nivel: m.nivel, antes, despues });
  }
  return subidas;
}
