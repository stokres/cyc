// PokéUsera · AVENTURA, the one-player hunting mode (docs/POKEUSERA.md, «Aventura»): the data and rules, with no screens.
// You start with one userito and hunt the rest bar by bar: wild useritos come out, you weaken them and throw a jarra to
// catch them; each bar has a boss (one of the other three friends) who opens the next bar; at the end, the three at once.
// The progress lives in localStorage (`pokeusera.caza.v1`), apart from the settings.
import { ENTRENADORES, type EntrenadorId, type EscenarioId, type Userito } from '../tipos';
import { ESPECIE } from '../datos';
import { crearRnd } from '../motor/azar';

/** The three useritos you can start with (never wild: the bosses can carry them). */
export const INICIALES = ['draguserin', 'criaturitah', 'camioner'] as const;

export interface Zona {
  /** The bar: backdrop, music and sucesos of its battles. */
  escenario: EscenarioId;
  /** The useritos that live in it (wild encounters). */
  salvajes: string[];
  /** Strength of the wild ones (1 = like yours). */
  escalaSalvaje: number;
  /** How many useritos the boss has, and their strength. */
  jefeN: number;
  escalaJefe: number;
}

/** The four bars, in the order they open. 27 wild useritos (the 30 minus the three starters). */
export const ZONAS: readonly Zona[] = [
  { escenario: 'brio', salvajes: ['turito', 'aceituna', 'p', 'espumarro', 'tocinon', 'pantaloneto', 'evoscar'], escalaSalvaje: 0.72, jefeN: 2, escalaJefe: 0.85 },
  { escenario: 'terraza', salvajes: ['cierzon', 'jesuspelo', 'papiroflexeon', 'lentejasur', 'cubatillo', 'turroncho', 'goudazard'], escalaSalvaje: 0.82, jefeN: 3, escalaJefe: 0.92 },
  { escenario: 'rural', salvajes: ['cajonazo', 'kbronero', 'caravaner', 'roscochoco', 'ego-ego', 'teloneon', 'ceceseta'], escalaSalvaje: 0.9, jefeN: 3, escalaJefe: 1 },
  { escenario: 'juan', salvajes: ['tragaperras', 'chupitochu', 'resacon', 'torrezmon', 'choquechu', 'maletrio'], escalaSalvaje: 0.97, jefeN: 3, escalaJefe: 1.05 },
];

/** Strength of the three friends in the final battle (all against all). */
export const ESCALA_FINAL = 1;

/** The team you take into a battle: at most three (the engine's limit). */
export const MAX_EQUIPO = 3;

export interface Aventura {
  v: 1;
  entrenador: EntrenadorId;
  /** Species caught, in the order they were caught (the starter first). */
  cazados: string[];
  /** The battle team (1..3 species ids from `cazados`; the first one comes out first). */
  equipo: string[];
  /** Bosses beaten, per bar (`jefes[i]` opens bar i + 1; the four beaten open the final). */
  jefes: boolean[];
  /** The final battle won. */
  campeon: boolean;
  /** Wild battles played, for the seeds. */
  encuentros: number;
}

const CLAVE = 'pokeusera.caza.v1';

export function nuevaAventura(entrenador: EntrenadorId, inicial: string): Aventura {
  return { v: 1, entrenador, cazados: [inicial], equipo: [inicial], jefes: ZONAS.map(() => false), campeon: false, encuentros: 0 };
}

export function cargarAventura(): Aventura | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<Aventura>;
    if (a?.v !== 1 || !a.entrenador || !ENTRENADORES.includes(a.entrenador) || !Array.isArray(a.cazados)) return null;
    const cazados = a.cazados.filter((id) => typeof id === 'string' && ESPECIE[id]);
    if (!cazados.length) return null;
    const equipo = (Array.isArray(a.equipo) ? a.equipo : []).filter((id) => cazados.includes(id)).slice(0, MAX_EQUIPO);
    return {
      v: 1,
      entrenador: a.entrenador,
      cazados,
      equipo: equipo.length ? equipo : [cazados[0]],
      jefes: ZONAS.map((_, i) => !!a.jefes?.[i]),
      campeon: !!a.campeon,
      encuentros: Number.isInteger(a.encuentros) ? a.encuentros! : 0,
    };
  } catch {
    return null;
  }
}

export function guardarAventura(a: Aventura): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(a));
  } catch {
    /* private mode: the adventure lasts while the page is open */
  }
}

export function borrarAventura(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nothing to do */
  }
}

/** Bar i is open: the first always, the next ones once the boss before is beaten. */
export const zonaAbierta = (a: Aventura, i: number): boolean => i === 0 || !!a.jefes[i - 1];

/** The final (the three friends at once) opens when the four bosses are beaten. */
export const finalAbierta = (a: Aventura): boolean => a.jefes.every(Boolean);

/** The boss of bar i: the other three friends in a fixed order, and the fourth bar's boss is the first one again (with a stronger team). */
export function jefeDe(a: Aventura, i: number): EntrenadorId {
  const otros = ENTRENADORES.filter((e) => e !== a.entrenador);
  return otros[i % otros.length];
}

/**
 * The next wild userito of bar i. Three out of four times it is one you do not have yet (while any is left in the bar),
 * so the bar can be completed without grinding; `rnd` is any 0..1 generator.
 */
export function salvajeDe(a: Aventura, i: number, rnd: () => number): string {
  const todos = ZONAS[i].salvajes;
  const faltan = todos.filter((id) => !a.cazados.includes(id));
  const lista = faltan.length && rnd() < 0.75 ? faltan : todos;
  return lista[Math.floor(rnd() * lista.length)];
}

/** The boss's team in bar i: `jefeN` useritos drawn from that bar and the ones before (stable for a given adventure and bar). */
export function equipoJefe(a: Aventura, i: number): string[] {
  const pool = ZONAS.slice(0, i + 1).flatMap((z) => z.salvajes);
  return barajar(pool, semillaDe(a.entrenador, i)).slice(0, ZONAS[i].jefeN);
}

/** The three friends' teams for the final: three each, none repeated, from every bar and the starters you did not take. */
export function equiposFinal(a: Aventura): string[][] {
  const pool = [...ZONAS.flatMap((z) => z.salvajes), ...INICIALES.filter((id) => id !== a.cazados[0])];
  const b = barajar(pool, semillaDe(a.entrenador, 99));
  return [0, 1, 2].map((k) => b.slice(k * 3, k * 3 + 3));
}

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
 * Chance (0..1) that a jarra catches the wild userito: 10 % at full HP, about 80 % at the last bit of HP, more with a status
 * (asleep counts the most, like in the original).
 */
export function probCaptura(u: Userito): number {
  const resto = u.psMax > 0 ? u.ps / u.psMax : 1;
  let p = 0.1 + 0.72 * (1 - resto);
  if (u.estado === 'dormido') p += 0.25;
  else if (u.estado) p += 0.12;
  if (u.achispado > 0) p += 0.05;
  return Math.max(0.05, Math.min(0.95, p));
}

function semillaDe(e: EntrenadorId, i: number): number {
  return (ENTRENADORES.indexOf(e) + 1) * 7919 + i * 104729;
}

function barajar<T>(l: readonly T[], semilla: number): T[] {
  const r = [...l];
  const rnd = crearRnd(semilla);
  for (let i = r.length - 1; i > 0; i--) {
    const k = Math.floor(rnd() * (i + 1));
    [r[i], r[k]] = [r[k], r[i]];
  }
  return r;
}
