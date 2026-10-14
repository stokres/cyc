// PokéUsera · battle engine. Pure functions: no DOM, no timers, no Math.random. Every function
// that "changes" the state clones it first (structuredClone) and returns the new one; all the
// randomness comes from `estado.semilla` (see azar.ts), so (state, choices) fully determine the
// result. The rules are in docs/POKEUSERA.md.
//
// Event conventions (what the screens get in `eventos`, in order):
//  - 'usa'    j = the user. Text «¡X usó Y!».
//  - 'golpe'  j = the VICTIM of any HP loss (attacks, recoil, burn, trap, hangover, Hora de cerrar...).
//             `dano` = HP really lost, `ps` = HP after. The attacker is the j of the last 'usa'.
//             `acorralado` = the hit was halved because someone else had already hit this userito this turn.
//  - 'cura'   j = who recovers (drain, caña, grada, Siesta). `ps` = HP after.
//  - 'falla'  j = the one who dodged (a miss on a target), or the user when its own move fails.
//  - 'estado' a status starts (estado = it) or ends (estado = null, `de` = which one).
//  - 'nivel'  a stat stage changed (`cambio` = what really changed, never 0).
//  - 'cae' / 'sale' / 'eliminado' / 'fin' as in tipos.ts. 'texto' = only a text line; the ones about what happens
//    to a target of the move (critical, effectiveness, «n times», no effect, perks, caps...) carry that target in `j`,
//    so the screen can play the results of an area move on all its targets at once.
//  - 'objeto' the object of j's userito works (Mechero, Chicle de menta...): its line is in `clave` (`objeto.<id>.activa`); from then on the
//             object is `visto` (the rivals may see it). The effects that go with it (a heal, a stage, a status ending) are ordinary events.
//  - 'habilidad' the ability of j's userito works (everybody sees its name over the userito; docs/POKEUSERA.md, «Habilidades»). `id`
//             is the ability; an optional phrase goes in `clave` (`hab.<id>.activa`). What it does (a stage, a heal, a status that does
//             not land...) follows as ordinary events. Announced once per move and ability, even if it works on several targets.
//  - 'suceso' a bar event starts (turns 5, 10, 15, 20, 25: drawn at the end of the turn before). `id`, `turnos` (0 = instant),
//             phrase in `clave`. The heals / stage changes it causes follow as ordinary 'cura' / 'nivel' events (all flagged `fin`).
// Every event may carry `clave` + `vars` (quien = userito name, jugador = player name, mov, ...).
import type { Eleccion, EscenarioId, EstadoCombate, Estadisticas, EntrenadorId, Estado, Evento, HabilidadId, Jugador, Movimiento, ObjetoId, Stat, StatsUserito, SucesoId, Tipo, Userito } from '../tipos';
import { ESCENARIOS, HAB_FOTOSINTESIS, HAB_GRASIENTO, HAB_LAVADO_CURA, HAB_MALETA_ATA, HAB_MANICO_ATA, HAB_PAREJA, HAB_PROB_REACCION, OBJ_BOCATA_CURA, OBJ_GAFAS_PREC, OBJ_MECHERO_QUEMA, OBJ_PALILLO_CRIT, OBJ_PANUELO, OBJ_TAPON_USOS, PERK_CANA_FRAN, PERK_PRECISION_PABLO, PERK_TARDE_CHUCHI, TIPOS_FISICOS } from '../tipos';
import { DESESPERADA, EFECTOS, ESPECIE, MOVS, MOVS_IMPROVISA, SUCESOS, TURNOS_SUCESO, eficacia, potenciaRemate, sucesosDe } from '../datos';
import { azar, elegir, entero, probar, type ConSemilla } from './azar';

/** Turn from which Vero closes the bar (1/8 of max HP at the end of every turn). */
export const TURNO_CIERRE = 30;
/** From the closing turn, the loss grows by another 1/8 every this many turns (so Siesta cannot stall forever). */
export const TURNOS_ESCALADA = 4;

/** Eighths of max HP everybody loses at the end of turn `turno` (0 before «Hora de cerrar»). */
export const octavosCierre = (turno: number): number => (turno < TURNO_CIERRE ? 0 : 1 + Math.floor((turno - TURNO_CIERRE) / TURNOS_ESCALADA));

/** «Recién despierto»: for this many turns after waking up (on the field, on the bench or by the Chicle de menta) a userito cannot be put to sleep again. */
export const TURNOS_RECIEN = 2;

/** HP at level 50: round(base × PS_MULT) + PS_SUMA (the other stats are base + 5). Sturdier than the
 *  originals' base + 60 so that a battle of four lasts ~16–24 turns instead of 9–18 (scripts/pokeusera-motor.mjs --sim=200). */
export const PS_MULT = 2;
export const PS_SUMA = 80;

// ------------------------------------------------------------------ construction

const niveles0 = (): Record<Stat, number> => ({ ata: 0, def: 0, vel: 0, esp: 0, prec: 0 });
const vol0 = (): Userito['vol'] => ({ atrapado: 0, atrapadoPor: -1, cizana: 0, bostezo: -1, recarga: false, sinCambio: false, protegidoAntes: false, sorpresa: false, escondido: false, desvia: false, aguanta: false });

function crearUserito(especie: string, objeto?: ObjetoId | null): Userito {
  const sp = ESPECIE[especie];
  if (!sp) throw new Error(`Especie desconocida: ${especie}`);
  const ps = Math.round(sp.base.ps * PS_MULT) + PS_SUMA;
  return {
    especie,
    ps,
    psMax: ps,
    ata: sp.base.ata + 5,
    def: sp.base.def + 5,
    vel: sp.base.vel + 5,
    esp: sp.base.esp + 5,
    pp: sp.movs.map((id) => MOVS[id].pp) as Userito['pp'],
    estado: null,
    sueno: 0,
    achispado: 0,
    niveles: niveles0(),
    vol: vol0(),
    ...(objeto ? { objeto: { id: objeto } } : {}),
  };
}

export const statsUserito0 = (): StatsUserito => ({
  dh: 0, dr: 0, dp: 0, cu: 0, ko: 0, cae: 0, gol: 0, rg: 0, fal: 0, esq: 0, cri: 0, crr: 0, sup: 0, sur: 0, pob: 0, por: 0,
  est: 0, nvo: 0, nvy: 0, cam: 0, cana: 0, pp: 0, mx: 0, mm: '', mo: -1, mv: [0, 0, 0, 0, 0], tf: 0, dv: 0,
});

function crearStats(jugadores: Jugador[]): Estadisticas {
  const n = jugadores.length;
  const matriz = () => jugadores.map(() => new Array<number>(n).fill(0));
  return { u: jugadores.map((q) => q.equipo.map(statsUserito0)), dm: matriz(), km: matriz(), gr: jugadores.map((): [number, number] => [0, 0]) };
}

/** The place of a battle when nobody chose one: drawn from the seed without touching the battle's own random stream. */
export const escenarioDeSemilla = (semilla: number): EscenarioId => ESCENARIOS[Math.floor(azar({ semilla: (semilla | 0) ^ 0x5ce9a1d3 }) * ESCENARIOS.length)];

/**
 * `escenario`: the place (default: drawn from `semilla`). It travels in the state, so online guests get it in the 'inicio' message.
 * `inicial`: the index in `especies` of the userito that starts on the field (default 0); an invalid one counts as 0. The team keeps
 * its order, so the objects (by index) and the statistics stay with their useritos.
 */
export function crearCombate(equipos: { entrenador: EntrenadorId; nombre: string; bot: boolean; especies: string[]; objetos?: (ObjetoId | null | undefined)[]; inicial?: number }[], semilla: number, escenario?: EscenarioId): EstadoCombate {
  if (equipos.length < 2 || equipos.length > 4) throw new Error('Una batalla es de 2 a 4 jugadores');
  const jugadores: Jugador[] = equipos.map((q, idx) => ({
    idx,
    entrenador: q.entrenador,
    nombre: q.nombre,
    equipo: q.especies.slice(0, 3).map((id, i) => crearUserito(id, q.objetos?.[i])),
    activo: Number.isInteger(q.inicial) && q.inicial! >= 0 && q.inicial! < Math.min(3, q.especies.length) ? q.inicial! : 0,
    cana: true,
    bot: q.bot,
    puesto: 0,
  }));
  return {
    escenario: escenario ?? escenarioDeSemilla(semilla),
    sucesos: [],
    sucesosVistos: [],
    turno: 1,
    jugadores,
    semilla: semilla | 0,
    ultimoMov: null,
    cancionAntes: false,
    agresores: equipos.map(() => []),
    reemplazos: [],
    ganador: null,
    stats: crearStats(jugadores),
  };
}

// ------------------------------------------------------------------ queries (for screens and bots)

export const activo = (estado: EstadoCombate, j: number): Userito => estado.jugadores[j].equipo[estado.jugadores[j].activo];

/** Indices (in `equipo`) of the useritos that can still fight. */
export const vivos = (jugador: Jugador): number[] => jugador.equipo.flatMap((u, i) => (u.ps > 0 ? [i] : []));

/** Out of the fight (no useritos left, or already placed). */
export const eliminado = (estado: EstadoCombate, j: number): boolean => estado.jugadores[j].puesto > 0 || vivos(estado.jugadores[j]).length === 0;

/** Rival players still in the fight whose active userito is standing (valid targets). */
export function rivalesEnPie(estado: EstadoCombate, j: number): number[] {
  return estado.jugadores.flatMap((q, k) => (k !== j && q.puesto === 0 && activo(estado, k).ps > 0 && vivos(q).length > 0 ? [k] : []));
}

/** Whether the player may choose «cambiar» now (not trapped, not under «¡Una más!», has a bench). */
export function puedeCambiar(estado: EstadoCombate, j: number): boolean {
  const q = estado.jugadores[j];
  if (estado.ganador !== null || eliminado(estado, j)) return false;
  const u = activo(estado, j);
  if (u.ps <= 0 || u.vol.atrapado > 0 || u.vol.sinCambio) return false;
  return vivos(q).some((i) => i !== q.activo);
}

/** PP > 0 for each of the four moves. If all four are false the userito uses «A la desesperada»
 *  (the screen should then offer only that: send `{ tipo: 'atacar', mov: 0, objetivo }`). */
export const movsDisponibles = (estado: EstadoCombate, j: number): boolean[] => activo(estado, j).pp.map((p) => p > 0);

/** Whether the move needs the player to pick a rival. For «Sí, y…» it depends on the move it
 *  would copy (`estado.ultimoMov`); without `estado` it answers false. */
export function necesitaObjetivo(movId: string, estado?: EstadoCombate): boolean {
  if (movId === 'siy') {
    const ult = estado?.ultimoMov ? MOVS[estado.ultimoMov] : null;
    return ult?.objetivo === 'uno';
  }
  return MOVS[movId]?.objetivo === 'uno';
}

/** An eliminated player gets a grada action every third turn (`turno % 3 === 0`). */
export function enGrada(estado: EstadoCombate, j: number): boolean {
  return estado.ganador === null && estado.jugadores[j].puesto > 0 && estado.turno % 3 === 0 && rivalesEnPie(estado, j).length > 0;
}

/** Share of the whole team's HP left (0..1): used to break ties between players who fall together. */
export const pctEquipo = (q: Jugador): number => q.equipo.reduce((s, u) => s + u.ps, 0) / q.equipo.reduce((s, u) => s + u.psMax, 0);

/** Stage multiplier (2+n)/2 or 2/(2−n). */
export const multNivel = (n: number): number => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));

/** Speed with stages and paralysis. */
export const velocidadEfectiva = (u: Userito): number => Math.floor(u.vel * multNivel(u.niveles.vel) * (u.estado === 'paralizado' ? 0.25 : 1));

export interface OpcionesDano {
  /** Overrides the move's power (Premio gordo, Venganza, the song...). */
  pot?: number;
  /** The 0.85..1 random factor (default 0.925, the mean, for estimates). */
  azar?: number;
  critico?: boolean;
  /** «Todos» move: ×0.75. */
  todos?: boolean;
  /** Second or later hit on the same target this turn from another player: ×0.5. */
  acorralado?: boolean;
  /** Bonus of the sucesos on (Happy hour, Cierzo de golpe, Desfile Drag: ×1.5), see `multSuceso`. */
  mult?: number;
}

/** The damage formula, without any randomness of its own. `ef` is the type effectiveness. */
export function calcularDano(a: Userito, d: Userito, mov: Movimiento, o: OpcionesDano = {}): { dano: number; ef: number } {
  const pot = o.pot ?? mov.pot ?? 0;
  const ef = eficacia(mov.tipo, ESPECIE[d.especie].tipos);
  if (pot <= 0 || ef === 0 || absorbe(d, mov.tipo)) return { dano: 0, ef };
  const fisico = TIPOS_FISICOS.includes(mov.tipo);
  const A = fisico ? a.ata * multNivel(a.niveles.ata) * (a.estado === 'quemado' ? 0.5 : 1) : a.esp * multNivel(a.niveles.esp);
  const D = Math.max(1, fisico ? d.def * multNivel(d.niveles.def) : d.esp * multNivel(d.niveles.esp));
  let dano = Math.floor(Math.floor((22 * pot * A) / D) / 50) + 2;
  if (ESPECIE[a.especie].tipos.includes(mov.tipo)) dano *= 1.5;
  dano *= ef;
  if (o.todos) dano *= 0.75;
  if (o.acorralado) dano *= 0.5;
  if (o.mult) dano *= o.mult;
  dano *= o.azar ?? 0.925;
  if (o.critico) dano *= 2;
  return { dano: Math.max(1, Math.floor(dano)), ef };
}

// ------------------------------------------------------------------ objetos (queries)

/** ×1.2 for the Pañuelo de la peña on an attack of the holder's own type (1 for anything else). */
export function multObjeto(u: Userito, mov: Movimiento): number {
  return u.objeto?.id === 'panuelo' && ESPECIE[u.especie].tipos.includes(mov.tipo) ? OBJ_PANUELO / 100 : 1;
}

/** «Recién despierto»: whether `u` woke up recently (this turn or the last `TURNOS_RECIEN`) and nothing can put it to sleep now.
 *  `turno` is the turn being resolved or about to be chosen (`estado.turno`). */
export const recienDespierto = (e: EstadoCombate, u: Userito): boolean => u.sinSuenoHasta !== undefined && e.turno <= u.sinSuenoHasta;

/** The power move `m` has when `u` uses it now: «Remate por bulerías» depends on its HP, the rest is fixed (0 for status moves). */
export const potenciaDe = (u: Userito, m: Movimiento): number => (EFECTOS[m.id]?.especial === 'remate' ? potenciaRemate(u.ps, u.psMax) : (m.pot ?? 0));

/** Whether the Tapón de cava can make this move quick: a damaging attack (not Devolvérsela, which has to go last). */
const esAtaque = (m: Movimiento): boolean => m.pot !== null || EFECTOS[m.id]?.especial === 'premio';

// ------------------------------------------------------------------ habilidades (queries)

/** The passive ability of a userito (visible to everybody). */
export const habilidadDe = (u: Userito): HabilidadId => ESPECIE[u.especie].habilidad;

/** Whether `d`'s ability swallows an attack of type `tipo`: no damage, no side effects (Buena ola: Ventolera; Toma de corriente: Chispa). */
export const absorbe = (d: Userito, tipo: Tipo): boolean => {
  const h = habilidadDe(d);
  return (h === 'ola' && tipo === 'ventolera') || (h === 'corriente' && tipo === 'chispa');
};

/** Pareja de carretera (Caravaner needs Camioner on the field and the other way round) and Fan de la gira (Camioner or Caravaner): true if the partner
 *  is the active userito of any OTHER player, whoever's it is. `j` is the player of `a`. */
export function bonusCompania(e: EstadoCombate, j: number, a: Userito): boolean {
  const h = habilidadDe(a);
  if (h !== 'pareja' && h !== 'fan') return false;
  const socios = h === 'fan' ? ['camioner', 'caravaner'] : [a.especie === 'caravaner' ? 'camioner' : 'caravaner'];
  return e.jugadores.some((_q, k) => k !== j && !eliminado(e, k) && activo(e, k).ps > 0 && socios.includes(activo(e, k).especie));
}

/** The damage multiplier the abilities put on an attack of player `j`'s userito `a` against `d`: +20 % with the partner on the field, ×½ of Petardo against Con hielo. */
export function multHabilidad(e: EstadoCombate, j: number, a: Userito, d: Userito, mov: Movimiento): number {
  return (bonusCompania(e, j, a) ? 1 + HAB_PAREJA / 100 : 1) * (habilidadDe(d) === 'hielo' && mov.tipo === 'petardo' ? 0.5 : 1);
}

// ------------------------------------------------------------------ sucesos (queries)

/** Whether suceso `id` is on now. */
export const hayDeSuceso = (e: EstadoCombate, id: SucesoId): boolean => e.sucesos.some((s) => s.id === id);

/** ×1.5 on the damage of a move of this type while Happy hour (Alcohol), Cierzo de golpe (Ventolera) or Desfile Drag (Juerga, Chanza) is on. */
export function multSuceso(e: EstadoCombate, tipo: Tipo): number {
  let m = 1;
  if (tipo === 'alcohol' && hayDeSuceso(e, 'happy')) m *= 1.5;
  if (tipo === 'ventolera' && hayDeSuceso(e, 'cierzo')) m *= 1.5;
  if ((tipo === 'juerga' || tipo === 'chanza') && hayDeSuceso(e, 'desfile')) m *= 1.5;
  return m;
}

/** Whole-team HP of a player (the «who is winning» measure of the sucesos). */
const vidaTotal = (q: Jugador): number => q.equipo.reduce((s, u) => s + u.ps, 0);

function danoAutogolpe(u: Userito, r: number): number {
  const A = u.ata * multNivel(u.niveles.ata) * (u.estado === 'quemado' ? 0.5 : 1);
  const D = Math.max(1, u.def * multNivel(u.niveles.def));
  return Math.max(1, Math.floor((Math.floor((22 * 40 * A) / D) / 50 + 2) * r));
}

// ------------------------------------------------------------------ random choice

function eleccionAzar(e: EstadoCombate, j: number, rnd: () => number): Eleccion | null {
  if (eliminado(e, j)) return null;
  const u = activo(e, j);
  const disp = u.pp.flatMap((p, i) => (p > 0 ? [i] : []));
  const mov = disp.length ? disp[Math.floor(rnd() * disp.length)] : 0;
  const id = disp.length ? ESPECIE[u.especie].movs[mov] : DESESPERADA;
  const ch: Eleccion = { tipo: 'atacar', mov };
  const rivales = rivalesEnPie(e, j);
  if (rivales.length && necesitaObjetivo(id, e)) ch.objetivo = rivales[Math.floor(rnd() * rivales.length)];
  return ch;
}

/** A random move at a random rival (what a living player does when time runs out). Pure: it draws
 *  from a copy of the seed, so asking twice for the same state gives the same answer. Null if the
 *  player is eliminated. */
export function eleccionAlAzar(estado: EstadoCombate, j: number): Eleccion | null {
  const s: ConSemilla = { semilla: estado.semilla ^ (0x9e3779b9 + j * 7919) };
  return eleccionAzar(estado, j, () => azar(s));
}

// ------------------------------------------------------------------ turn context

interface Ctx {
  e: EstadoCombate;
  ev: Evento[];
  /** Per victim: players who damaged its active userito this turn (Acorralado, Venganza). */
  golpeado: number[][];
  actuo: boolean[];
  anulada: boolean[];
  retrocede: boolean[];
  cayo: boolean[];
  /** A protection worked this turn (for the next one's 50 % fail). */
  usoProt: boolean[];
  /** HP lost this turn to other players' attacks, and who hit last (for «Devolvérsela»). */
  recibido: number[];
  ultimoAgresor: number[];
  /** «Aguantar el tipo» cut a hit this turn / already said so. */
  salvado: boolean[];
  dichoAguante: boolean[];
  /** The Tapón de cava made this player's attack quick this turn (it is spent when the attack is really used). */
  tapon: boolean[];
  /** «Al tendedero» landed: this player's userito goes back to the bench at the end of the turn (the player picks who comes in). */
  tendedero: boolean[];
  /** «Público entregado» already worked for this player this turn (at most once a turn). */
  publico: boolean[];
  recargaIni: boolean[];
  cizanaIni: boolean[];
  pctIni: number[];
  agresoresIni: number[][];
  cancionAntes: boolean;
  cancionAhora: boolean;
  /** «Cuando menos te lo esperas»: the attack of this player goes as a quick one (+1) this turn. */
  sorpresa: boolean[];
  /** A counter of the moves / actions played so far, and the (player, ability, counter) already announced: an ability is announced once per move. */
  uso: number;
  avisos: Set<string>;
}

type Accion =
  | { tipo: 'cambiar'; j: number; a: number }
  | { tipo: 'cana'; j: number }
  | { tipo: 'grada'; j: number; accion: 'cana' | 'abucheo'; objetivo: number }
  | { tipo: 'atacar'; j: number; mov: number; objetivo?: number };

const act = (c: Ctx, j: number): Userito => activo(c.e, j);
/** The statistics of player j's userito on the field. */
const st = (c: Ctx, j: number): StatsUserito => c.e.stats.u[j][c.e.jugadores[j].activo];
const nom = (u: Userito): string => ESPECIE[u.especie].nombre;
const varsDe = (c: Ctx, j: number, extra: Record<string, string | number> = {}) => ({ quien: nom(act(c, j)), jugador: c.e.jugadores[j].nombre, ...extra });

function decir(c: Ctx, clave: string, vars?: Record<string, string | number>, j?: number) {
  c.ev.push(j === undefined ? { k: 'texto', clave, vars } : { k: 'texto', clave, vars, j });
}

/** The object of player j's active userito works: it becomes `visto` (and `gastado` if it is a one-use one) and the event tells it. */
function activarObjeto(c: Ctx, j: number, gasta: boolean, clave: string, extra: Record<string, string | number> = {}) {
  const o = act(c, j).objeto!;
  o.visto = true;
  if (gasta) o.gastado = true;
  c.ev.push({ k: 'objeto', j, objeto: o.id, clave, vars: varsDe(c, j, extra) });
}

/**
 * The ability of player j's userito works: the event shows its name over the userito. Announced once per move (`c.uso`) and ability, so a move
 * with several effects (or several targets) does not repeat the tag; the effect itself is the caller's. `clave`: an optional phrase.
 */
function habilidad(c: Ctx, j: number, id: HabilidadId, clave?: string, extra: Record<string, string | number> = {}) {
  const marca = `${j}|${id}|${c.uso}`;
  if (c.avisos.has(marca)) return;
  c.avisos.add(marca);
  const ev: Extract<Evento, { k: 'habilidad' }> = { k: 'habilidad', j, id };
  if (clave) {
    ev.clave = clave;
    ev.vars = varsDe(c, j, extra);
  }
  c.ev.push(ev);
}

/** Bocata de calamares: when the holder is left under half of its HP, it eats it and heals 1/5. */
function comerBocata(c: Ctx, j: number) {
  const u = act(c, j);
  const o = u.objeto;
  if (o?.id !== 'bocata' || o.gastado || u.ps <= 0 || u.ps * 2 >= u.psMax) return;
  activarObjeto(c, j, true, 'objeto.bocata.activa');
  curar(c, j, Math.max(1, Math.floor(u.psMax / OBJ_BOCATA_CURA)));
}

/** Zapatillas nuevas: every time the userito comes out to fight (and at the start of the battle) its Speed goes up 1; the first time it also raises the Attack 1. */
function alSalirAlCampo(c: Ctx, j: number) {
  const u = act(c, j);
  if (u.ps <= 0) return;
  const o = u.objeto;
  if (o?.id === 'zapatillas') {
    activarObjeto(c, j, false, 'objeto.zapatillas.activa');
    cambiarNivel(c, j, 'vel', 1);
    if (!o.salio) {
      o.salio = true;
      cambiarNivel(c, j, 'ata', 1);
    }
  }
  // The abilities «al salir al combate»: at the start of the battle and every time it comes in (a switch, Al tendedero, after a fall).
  switch (habilidadDe(u)) {
    case 'inesperado':
      u.vol.sorpresa = true; // announced when its first attack goes quick
      break;
    case 'viento':
      habilidad(c, j, 'viento');
      cambiarNivel(c, j, 'vel', 1, j);
      break;
    case 'conazo': {
      const rivales = rivalesEnPie(c.e, j);
      if (!rivales.length) break;
      habilidad(c, j, 'conazo', 'hab.conazo.activa');
      for (const r of rivales) cambiarNivel(c, r, 'ata', -1, j);
      break;
    }
  }
}

/** It has just woken up (on the field, on the bench, or the Chicle cured its sleep): for `TURNOS_RECIEN` turns nothing can put it to sleep again. */
function despertado(c: Ctx, u: Userito) {
  u.sinSuenoHasta = c.e.turno + TURNOS_RECIEN;
}

function reiniciar(u: Userito) {
  u.niveles = niveles0();
  u.vol = vol0();
  u.achispado = 0;
}

function soltarAtrapados(c: Ctx, j: number) {
  c.e.jugadores.forEach((_q, k) => {
    if (k === j) return;
    const v = activo(c.e, k);
    if (v.vol.atrapado > 0 && v.vol.atrapadoPor === j) {
      v.vol.atrapado = 0;
      v.vol.atrapadoPor = -1;
    }
  });
}

/** Subtracts HP and emits the 'golpe' event. Fainting ('cae') is announced later by revisarCaida. */
function danar(c: Ctx, t: number, dano: number, op: { ef?: number; critico?: boolean; clave?: string; vars?: Record<string, string | number>; de?: number; mov?: string; acorralado?: boolean } = {}): number {
  const u = act(c, t);
  const antes = u.ps;
  u.ps = Math.max(0, u.ps - dano);
  const real = antes - u.ps;
  // Statistics: an attack from another player, or damage the userito brought on itself / the bar.
  if (op.de !== undefined && op.de !== t) {
    const a = st(c, op.de);
    const v = st(c, t);
    const ef = op.ef ?? 1;
    a.dh += real;
    a.gol++;
    v.dr += real;
    v.rg++;
    c.e.stats.dm[op.de][t] += real;
    c.recibido[t] += real;
    c.ultimoAgresor[t] = op.de;
    if (op.critico) {
      a.cri++;
      v.crr++;
    }
    if (ef > 1) {
      a.sup++;
      v.sur++;
    } else if (ef < 1) {
      a.pob++;
      v.por++;
    }
    if (op.mov === 'venganza') a.dv += real;
    if (real > a.mx) {
      a.mx = real;
      a.mm = op.mov ?? '';
      a.mo = t;
    }
  } else st(c, t).dp += real;
  const ev: Extract<Evento, { k: 'golpe' }> = { k: 'golpe', j: t, dano: antes - u.ps, ps: u.ps, ef: op.ef ?? 1, critico: op.critico ?? false };
  if (op.acorralado) ev.acorralado = true;
  if (op.clave) {
    ev.clave = op.clave;
    ev.vars = op.vars ?? varsDe(c, t);
  }
  c.ev.push(ev);
  return real;
}

function curar(c: Ctx, j: number, cantidad: number, clave?: string): number {
  const u = act(c, j);
  const antes = u.ps;
  u.ps = Math.min(u.psMax, u.ps + cantidad);
  if (u.ps === antes) return 0;
  st(c, j).cu += u.ps - antes;
  const ev: Evento = { k: 'cura', j, ps: u.ps };
  if (clave) {
    ev.clave = clave;
    ev.vars = varsDe(c, j);
  }
  c.ev.push(ev);
  return u.ps - antes;
}

/** `por`: the player whose attack just hit it (gets the KO). */
function revisarCaida(c: Ctx, j: number, por?: number) {
  const u = act(c, j);
  if (u.ps > 0) {
    abrirMaleta(c, j);
    comerBocata(c, j);
    return;
  }
  if (c.cayo[j]) return;
  c.cayo[j] = true;
  st(c, j).cae++;
  if (por !== undefined && por !== j) {
    st(c, por).ko++;
    c.e.stats.km[por][j]++;
  }
  u.estado = null;
  u.sueno = 0;
  reiniciar(u);
  soltarAtrapados(c, j);
  c.ev.push({ k: 'cae', j, clave: 'combate.cae', vars: varsDe(c, j) });
  // Llavero de la caravana: whoever knocked it out loses 1 Ataque and 1 Especial.
  const o = u.objeto;
  if (o?.id === 'llavero' && !o.gastado && por !== undefined && por !== j && act(c, por).ps > 0) {
    activarObjeto(c, j, true, 'objeto.llavero.activa', { otro: nom(act(c, por)) });
    cambiarNivel(c, por, 'ata', -1, undefined, true);
    cambiarNivel(c, por, 'esp', -1, undefined, true);
  }
  // Flipado (Ego-Ego): every userito it knocks out raises its Attack.
  if (por !== undefined && por !== j) {
    const a = act(c, por);
    if (a.ps > 0 && habilidadDe(a) === 'flipado') {
      habilidad(c, por, 'flipado');
      cambiarNivel(c, por, 'ata', 1, por);
    }
  }
}

/** Se abre la maleta (Maletrio): the first time it drops under half of its HP, its Attack goes up 2 (once per userito and battle). */
function abrirMaleta(c: Ctx, j: number) {
  const u = act(c, j);
  if (habilidadDe(u) !== 'maleta' || u.habUsada || u.ps <= 0 || u.ps * 2 >= u.psMax) return;
  u.habUsada = true;
  habilidad(c, j, 'maleta', 'hab.maleta.activa');
  cambiarNivel(c, j, 'ata', HAB_MALETA_ATA, j);
}

/** `por`: the player who causes the change (counts as a change on itself or on others). `deRival`: the change is a rival's doing (by default, when `por` is
 *  another player; the Llavero says it by itself): La espuma no baja blocks the drops, Mañico answers them. */
function cambiarNivel(c: Ctx, t: number, stat: Stat, cambio: number, por?: number, deRival = por !== undefined && por !== t) {
  const u = act(c, t);
  if (u.ps <= 0) return;
  const h = habilidadDe(u);
  if (cambio < 0 && deRival && h === 'espuma') {
    habilidad(c, t, 'espuma', 'hab.espuma.activa');
    return;
  }
  const antes = u.niveles[stat];
  const nuevo = Math.max(-6, Math.min(6, antes + cambio));
  const real = nuevo - antes;
  if (real === 0) {
    decir(c, cambio > 0 ? 'combate.tope_sube' : 'combate.tope_baja', varsDe(c, t), t);
    return;
  }
  u.niveles[stat] = nuevo;
  if (por !== undefined) {
    if (por === t) st(c, t).nvy++;
    else st(c, por).nvo++;
  }
  c.ev.push({ k: 'nivel', j: t, stat, cambio: real, clave: `combate.${real > 0 ? 'sube' : 'baja'}${Math.min(2, Math.abs(real))}.${stat}`, vars: varsDe(c, t) });
  // Mañico (Cierzón): each time a rival lowers one of its stats, its Attack goes up 2.
  if (real < 0 && deRival && h === 'manico' && u.niveles.ata < 6) {
    habilidad(c, t, 'manico');
    cambiarNivel(c, t, 'ata', HAB_MANICO_ATA, t);
  }
}

/** Tries to start a status. Returns whether it worked. `silencio`: no «no tuvo efecto» line when it fails. `antes`: called when it is going to land, just
 *  before its event (the ability that caused it announces itself there). Gratinado (burn), Ya estoy curado (tipsy) and Dos cabezas (sleep) stop it. */
function ponerEstado(c: Ctx, t: number, est: Estado | 'achispado', silencio: boolean, por?: number, antes?: () => void): boolean {
  const u = act(c, t);
  if (u.ps <= 0) return false;
  const h = habilidadDe(u);
  if (est === 'achispado') {
    if (u.achispado > 0) {
      if (!silencio) decir(c, 'combate.sin_efecto', varsDe(c, t), t);
      return false;
    }
    if (h === 'curado') {
      habilidad(c, t, 'curado', 'hab.curado.activa');
      return false;
    }
    u.achispado = 2 + entero(c.e, 3);
  } else {
    if (u.estado) {
      if (!silencio) decir(c, 'combate.sin_efecto', varsDe(c, t), t);
      return false;
    }
    if ((est === 'quemado' && h === 'gratinado') || (est === 'dormido' && h === 'dos_cabezas')) {
      habilidad(c, t, h, `hab.${h}.activa`);
      return false;
    }
    // «Recién despierto»: nothing puts it to sleep again so soon (it says so even when the status was a side effect).
    if (est === 'dormido' && recienDespierto(c.e, u)) {
      decir(c, 'combate.recien', varsDe(c, t), t);
      return false;
    }
    u.estado = est;
    if (est === 'dormido') u.sueno = 1 + entero(c.e, 3);
  }
  if (por !== undefined && por !== t) st(c, por).est++;
  antes?.();
  c.ev.push({ k: 'estado', j: t, estado: est, clave: `combate.estado.${est}`, vars: varsDe(c, t) });
  // Chicle de menta: the first status it gets is gone at once.
  const o = u.objeto;
  if (o?.id === 'chicle' && !o.gastado) {
    activarObjeto(c, t, true, 'objeto.chicle.activa');
    if (est === 'achispado') u.achispado = 0;
    else {
      u.estado = null;
      u.sueno = 0;
      if (est === 'dormido') despertado(c, u);
    }
    c.ev.push({ k: 'estado', j: t, estado: null, de: est });
  }
  return true;
}

/** Sends in a userito (voluntary switch, forced switch or replacement). */
function sacar(c: Ctx, j: number, idx: number) {
  const q = c.e.jugadores[j];
  // Recién lavado (Pantaloneto): going back to the bench by any way (a switch, Al tendedero, Remolino) takes its status off and heals 1/8.
  const sale = act(c, j);
  if (sale.ps > 0 && habilidadDe(sale) === 'lavado' && (sale.estado || sale.ps < sale.psMax)) {
    habilidad(c, j, 'lavado', 'hab.lavado.activa');
    if (sale.estado) {
      const de = sale.estado;
      sale.estado = null;
      sale.sueno = 0;
      c.ev.push({ k: 'estado', j, estado: null, de });
    }
    curar(c, j, Math.max(1, Math.floor(sale.psMax / HAB_LAVADO_CURA)));
  }
  reiniciar(act(c, j));
  q.activo = idx;
  c.golpeado[j] = [];
  c.e.agresores[j] = [];
  c.agresoresIni[j] = [];
  c.recargaIni[j] = false;
  c.cizanaIni[j] = false;
  c.usoProt[j] = false;
  c.recibido[j] = 0;
  c.ultimoAgresor[j] = -1;
  c.cayo[j] = false;
  c.tendedero[j] = false;
  soltarAtrapados(c, j);
  c.ev.push({ k: 'sale', j, idx, clave: 'combate.sale', vars: varsDe(c, j) });
  alSalirAlCampo(c, j);
}

const standing = (c: Ctx, j: number) => rivalesEnPie(c.e, j);

// ------------------------------------------------------------------ using a move

function tiradaGolpes(e: EstadoCombate): number {
  const r = azar(e);
  return r < 3 / 8 ? 2 : r < 6 / 8 ? 3 : r < 7 / 8 ? 4 : 5;
}

function fallaUsuario(c: Ctx, j: number, clave = 'combate.falla') {
  st(c, j).fal++;
  c.ev.push({ k: 'falla', j, clave, vars: varsDe(c, j) });
}

function efectosPropios(c: Ctx, j: number, m: Movimiento) {
  const e = c.e;
  const u = act(c, j);
  const ef = EFECTOS[m.id] ?? {};
  if (ef.especial === 'esconderse' || ef.especial === 'quepague' || ef.especial === 'aguantar') {
    // «¡Que pague otro!» needs a third userito to take the blows; with two players left it fails.
    if (ef.especial === 'quepague' && standing(c, j).length < 2) {
      fallaUsuario(c, j);
      return;
    }
    // Common rule of the protections: after one worked last turn, the next fails half of the times (a fail resets the chain).
    if (u.vol.protegidoAntes && probar(e, 50)) {
      fallaUsuario(c, j, ef.especial === 'esconderse' ? 'combate.esconde_falla' : 'combate.proteccion_falla');
      return;
    }
    c.usoProt[j] = true;
    if (ef.especial === 'esconderse') {
      u.vol.escondido = true;
      decir(c, 'combate.esconde', varsDe(c, j));
    } else if (ef.especial === 'quepague') {
      u.vol.desvia = true;
      decir(c, 'combate.quepague', varsDe(c, j));
    } else {
      u.vol.aguanta = true;
      decir(c, 'combate.aguantar', varsDe(c, j));
    }
    return;
  }
  if (ef.especial === 'siesta') {
    if (u.ps >= u.psMax && !u.estado && u.achispado === 0) {
      fallaUsuario(c, j);
      return;
    }
    // Dos cabezas (Evoscar, who only gets here copying it): one head always stays awake, so it recovers without sleeping.
    if (habilidadDe(u) === 'dos_cabezas') {
      habilidad(c, j, 'dos_cabezas', 'hab.dos_cabezas.activa');
      limpiarEstados(c, j);
      curar(c, j, Math.floor(u.psMax / 2));
      return;
    }
    u.estado = 'dormido';
    u.sueno = 2;
    u.achispado = 0;
    c.ev.push({ k: 'estado', j, estado: 'dormido', clave: 'combate.siesta', vars: varsDe(c, j) });
    curar(c, j, Math.floor(u.psMax / 2));
    return;
  }
  // «Otra ficha»: heals half of the max HP and takes every status off, but the next turn it does nothing (like Solo de teclado).
  if (ef.especial === 'ficha') {
    if (u.ps >= u.psMax && !u.estado && u.achispado === 0) {
      fallaUsuario(c, j);
      return;
    }
    decir(c, 'combate.ficha', varsDe(c, j));
    limpiarEstados(c, j);
    curar(c, j, Math.floor(u.psMax / 2));
    u.vol.recarga = true;
    return;
  }
  // «Con limón»: takes every status off (and then the stage change of the table, +1 Especial).
  if (ef.especial === 'limon') {
    decir(c, 'combate.limon', varsDe(c, j));
    limpiarEstados(c, j);
  }
  for (const n of ef.nivel ?? []) if (n.a === 'yo') cambiarNivel(c, j, n.stat, n.cambio, j);
}

/** Takes the status, the tipsiness and a pending yawn off player j's userito (with the event that says the status ended). */
function limpiarEstados(c: Ctx, j: number) {
  const u = act(c, j);
  if (u.estado) {
    const de = u.estado;
    u.estado = null;
    u.sueno = 0;
    c.ev.push({ k: 'estado', j, estado: null, de });
  }
  if (u.achispado > 0) {
    u.achispado = 0;
    c.ev.push({ k: 'estado', j, estado: null, de: 'achispado' });
  }
  u.vol.bostezo = -1;
}

function forzarCambio(c: Ctx, t: number) {
  const q = c.e.jugadores[t];
  // 152 kilos (Tocinón): nobody moves it.
  if (habilidadDe(act(c, t)) === 'kilos') {
    habilidad(c, t, 'kilos', 'hab.kilos.activa');
    return;
  }
  const banco = vivos(q).filter((i) => i !== q.activo);
  if (!banco.length) {
    decir(c, 'combate.sin_efecto', varsDe(c, t), t);
    return;
  }
  decir(c, 'combate.remolino', varsDe(c, t), t);
  sacar(c, t, elegir(c.e, banco));
  if (!c.actuo[t]) c.anulada[t] = true;
}

/** Applies the secondary effects of a move that reached a target that is still standing. */
function efectosSecundarios(c: Ctx, j: number, t: number, m: Movimiento, danino: boolean) {
  const e = c.e;
  const ef = EFECTOS[m.id] ?? {};
  const v = act(c, t);
  if (v.ps <= 0) return;
  // Happy hour: the attacks that make tipsy do it twice as often.
  // Fuego de dragón (Draguserín): its Petardo attacks burn twice as often.
  const dragon = ef.estado?.estado === 'quemado' && m.tipo === 'petardo' && habilidadDe(act(c, j)) === 'fuego_dragon';
  const prob = ef.estado && ef.estado.estado === 'achispado' && hayDeSuceso(e, 'happy') ? Math.min(100, ef.estado.prob * 2) : dragon ? Math.min(100, (ef.estado?.prob ?? 0) * 2) : (ef.estado?.prob ?? 0);
  if (ef.estado && (!danino || probar(e, prob))) ponerEstado(c, t, ef.estado.estado, danino, j, dragon ? () => habilidad(c, j, 'fuego_dragon') : undefined);
  // Grasiento (Torrezmón): its Grasa attacks give an empacho 20 % of the times (once per move and target, whatever the hits).
  if (danino && m.tipo === 'grasa' && ef.estado?.estado !== 'empachado' && habilidadDe(act(c, j)) === 'grasiento' && act(c, j).ps > 0 && probar(e, HAB_GRASIENTO)) ponerEstado(c, t, 'empachado', true, j, () => habilidad(c, j, 'grasiento'));
  for (const n of ef.nivel ?? []) if (n.a === 'objetivo' && act(c, t).ps > 0 && (n.prob === undefined || probar(e, n.prob))) cambiarNivel(c, t, n.stat, n.cambio, j);
  if (ef.retrocede && !c.actuo[t] && probar(e, ef.retrocede)) {
    if (habilidadDe(v) === 'kilos') habilidad(c, t, 'kilos', 'hab.kilos.activa'); // 152 kilos: nothing makes it flinch
    else c.retrocede[t] = true;
  }
  if (ef.bloqueaCambio) v.vol.sinCambio = true;
  if (ef.atrapa && v.vol.atrapado === 0) {
    v.vol.atrapado = 2 + entero(e, 4);
    v.vol.atrapadoPor = j;
    decir(c, 'combate.atrapa', varsDe(c, t), t);
  }
  if (ef.especial === 'bostezo') {
    if (v.estado || v.vol.bostezo >= 0) decir(c, 'combate.sin_efecto', varsDe(c, t), t);
    else if (habilidadDe(v) === 'dos_cabezas') habilidad(c, t, 'dos_cabezas', 'hab.dos_cabezas.activa');
    else if (recienDespierto(e, v)) decir(c, 'combate.recien', varsDe(c, t), t);
    else {
      v.vol.bostezo = 2;
      decir(c, 'combate.bostezo', varsDe(c, t), t);
    }
  }
  if (ef.especial === 'cizana') {
    if (v.vol.cizana > 0) decir(c, 'combate.sin_efecto', varsDe(c, t), t);
    else {
      v.vol.cizana = 2;
      decir(c, 'combate.cizana', varsDe(c, t), t);
    }
  }
  if (ef.especial === 'remolino') forzarCambio(c, t);
}

/** Trainer perks that change a hit from another player on player `t`'s active userito (`dano` is
 *  already final: after type, spread, Acorralado, random and critical). Chuchi «Llega tarde»: the
 *  first such hit each of his useritos receives does 20 % less (min 1). Guille «Mañico»: once per
 *  userito, a hit that would KO it from full HP leaves it at 1 HP. Each is spent once per battle. */
function aplicarPerks(c: Ctx, t: number, dano: number): { dano: number; perk: 'chuchi' | 'guille' | null } {
  const v = act(c, t);
  const ent = c.e.jugadores[t].entrenador;
  let perk: 'chuchi' | 'guille' | null = null;
  if (ent === 'chuchi' && !v.perk?.tarde) {
    v.perk = { ...v.perk, tarde: true };
    dano = Math.max(1, Math.floor((dano * PERK_TARDE_CHUCHI) / 100));
    perk = 'chuchi';
  } else if (ent === 'guille' && !v.perk?.manico && v.ps === v.psMax && dano >= v.ps && habilidadDe(v) !== 'cajon') {
    v.perk = { ...v.perk, manico: true };
    dano = v.ps - 1;
    perk = 'guille';
  }
  return { dano, perk };
}

/** Duro como un cajón (Cajonazo): a hit that would knock it out from full HP leaves it at 1 HP (every time it is at full HP before the blow). */
function topeCajon(c: Ctx, t: number, dano: number): number {
  const v = act(c, t);
  if (habilidadDe(v) !== 'cajon' || v.ps !== v.psMax || dano < v.ps) return dano;
  habilidad(c, t, 'cajon', 'hab.cajon.activa');
  return v.ps - 1;
}

/** «Aguantar el tipo»: while it is on, a hit never takes the userito under 1 HP (`dano` is cut to leave it there). */
function topeAguante(c: Ctx, t: number, dano: number): number {
  const v = act(c, t);
  if (!v.vol.aguanta || dano < v.ps) return dano;
  c.salvado[t] = true;
  return Math.max(0, v.ps - 1);
}

/** The line that says a userito held on, once per move that did it (the flag is set by `topeAguante`). */
function avisoAguante(c: Ctx, t: number) {
  if (!c.salvado[t]) return;
  c.salvado[t] = false;
  if (!c.dichoAguante[t]) {
    c.dichoAguante[t] = true;
    decir(c, 'combate.aguanta', varsDe(c, t), t);
  }
}

/** Runs move `m` for player `j` (already paid, announced and not skipped). */
function usarMovimiento(c: Ctx, j: number, m: Movimiento, pedido: number | undefined, redirigir: boolean, evUsa: Extract<Evento, { k: 'usa' }>) {
  const e = c.e;
  const u = act(c, j);
  const ef = EFECTOS[m.id] ?? {};

  if (m.objetivo === 'yo') {
    efectosPropios(c, j, m);
    return;
  }

  let objetivos: number[];
  if (m.objetivo === 'todos') objetivos = standing(c, j);
  else if (m.objetivo === 'auto') {
    // «Devolvérsela»: whoever hit it last this turn, if somebody did and is still standing.
    const ult = c.ultimoAgresor[j];
    objetivos = c.recibido[j] > 0 && ult >= 0 && standing(c, j).includes(ult) ? [ult] : [];
  } else {
    const rivales = standing(c, j);
    let t = pedido !== undefined && rivales.includes(pedido) ? pedido : rivales.length ? elegir(e, rivales) : -1; // fallen target -> any rival in pie
    if (t >= 0 && u.vol.cizana > 0) {
      const antes = t;
      t = elegir(e, rivales);
      if (t !== antes) decir(c, 'combate.cizana_desvia', varsDe(c, j));
    }
    if (t >= 0 && redirigir) {
      const otros = rivales.filter((r) => r !== t);
      if (otros.length) {
        t = elegir(e, otros);
        decir(c, 'combate.desvia', varsDe(c, j));
      }
    }
    // «¡Que pague otro!»: a single-target attack aimed at a userito that is using it goes to a random third one (not the target, not the attacker).
    if (t >= 0 && act(c, t).vol.desvia) {
      const otros = rivales.filter((r) => r !== t);
      if (otros.length) {
        const antes = t;
        t = elegir(e, otros);
        decir(c, 'combate.quepague_desvia', varsDe(c, j, { otro: nom(act(c, antes)) }), antes);
      }
    }
    objetivos = t >= 0 ? [t] : [];
  }
  evUsa.obj = [...objetivos];
  if (!objetivos.length) {
    fallaUsuario(c, j);
    return;
  }

  const danina = m.pot !== null || ef.especial === 'premio' || ef.especial === 'devolver';
  const luz = hayDeSuceso(e, 'luz') && !ESPECIE[u.especie].tipos.includes('fantasma'); // Se va la luz: −20 accuracy, except for Fantasma
  const karaoke = hayDeSuceso(e, 'karaoke'); // Dale al karaoke: area moves hit at 100 %, not 75 %
  const multS = multSuceso(e, m.tipo);
  const peleaJ = e.sucesos.find((x) => x.id === 'pelea')?.j; // Pelea en la barra: no «Acorralado» against this player
  let totalDano = 0;
  let algunoVivo = false;
  let cancionDicha = false;
  let acerto = false;
  // A Kbronero's area moves hit at 100 %, not 75 % (A todo volumen).
  const volumen = m.objetivo === 'todos' && !karaoke && habilidadDe(u) === 'volumen';
  // The targets that took a blow: the abilities that answer a hit (Buena chica, Indigesto...) work once the whole move is told.
  const golpeados: number[] = [];

  for (const t of objetivos) {
    let v = act(c, t);
    if (v.ps <= 0) continue;
    if (v.vol.escondido) {
      st(c, j).fal++;
      st(c, t).esq++;
      decir(c, 'combate.esconde_protege', varsDe(c, t), t);
      continue;
    }
    if (danina && ef.especial !== 'devolver' && eficacia(m.tipo, ESPECIE[v.especie].tipos) === 0) {
      st(c, j).fal++;
      st(c, t).esq++;
      decir(c, 'combate.no_afecta', varsDe(c, t), t);
      continue;
    }
    // Buena ola (Ventolera) and Toma de corriente (Chispa): the blow does nothing to it, with no side effects, and raises a stat.
    if (danina && absorbe(v, m.tipo)) {
      const h = habilidadDe(v);
      st(c, j).fal++;
      st(c, t).esq++;
      habilidad(c, t, h, `hab.${h}.activa`);
      cambiarNivel(c, t, h === 'ola' ? 'vel' : 'esp', 1, t);
      continue;
    }
    if (m.prec !== null) {
      // Pablo «Labia»: his status moves (pot null) get +10 accuracy points, capped at 100.
      const base0 = e.jugadores[j].entrenador === 'pablo' && m.pot === null ? Math.min(100, m.prec + PERK_PRECISION_PABLO) : m.prec;
      // Gafas de sol: +10 accuracy points on its attacks; they show themselves the first time they make a blow land that would have missed.
      const gafas = danina && u.objeto?.id === 'gafas';
      const base = gafas ? Math.min(100, base0 + OBJ_GAFAS_PREC) : base0;
      const p = base * multNivel(u.niveles.prec) - (luz ? 20 : 0);
      const sin = base0 * multNivel(u.niveles.prec) - (luz ? 20 : 0);
      // The roll is drawn exactly when it would be without the glasses (sin < 100), so they never shift the random stream.
      if (sin < 100 || p < 100) {
        const tirada = azar(e) * 100;
        if (tirada >= p) {
          st(c, j).fal++;
          st(c, t).esq++;
          c.ev.push({ k: 'falla', j: t, clave: 'combate.esquiva', vars: varsDe(c, t) });
          if (danina) publicoEntregado(c, j);
          continue;
        }
        if (gafas && !u.objeto!.visto && tirada >= sin) activarObjeto(c, j, false, 'objeto.gafas.activa');
      }
    }

    let hechos = 0;
    if (danina) {
      let pot = m.pot ?? 0;
      if (ef.especial === 'remate') pot = potenciaRemate(u.ps, u.psMax);
      if (ef.especial === 'premio') {
        pot = elegir(e, [0, 40, 80, 150]);
        decir(c, `combate.premio${pot}`, varsDe(c, j));
      }
      if (ef.especial === 'venganza' && c.agresoresIni[j].includes(t)) {
        pot *= 2;
        decir(c, 'combate.venganza', varsDe(c, t), t);
      }
      if (ef.especial === 'cancion' && c.cancionAntes) {
        pot *= 2;
        if (!cancionDicha) decir(c, 'combate.cancion_doble', varsDe(c, j));
        cancionDicha = true;
      }
      if (pot > 0) {
        const acorralado = c.golpeado[t].some((a) => a !== j) && peleaJ !== t;
        const n = ef.golpes === 'multi' ? tiradaGolpes(e) : (ef.golpes ?? 1);
        let efi = 1;
        const palillo = u.objeto?.id === 'palillo' ? OBJ_PALILLO_CRIT : 1; // Palillo en la boca: twice the critical hits
        const panuelo = multObjeto(u, m); // Pañuelo de la peña: ×1.2 on attacks of its own type
        const bote = habilidadDe(u) === 'bote' ? 2 : 1; // Bote acumulado: twice the critical hits
        const papel = ef.critico ?? 1; // Corte de papel: three times
        const multH = multHabilidad(e, j, u, v, m); // Pareja de carretera / Fan de la gira: +20 %; Con hielo: Petardo ×½
        if (bonusCompania(e, j, u)) habilidad(c, j, habilidadDe(u));
        if (habilidadDe(v) === 'hielo' && m.tipo === 'petardo') habilidad(c, t, 'hielo');
        if (volumen) habilidad(c, j, 'volumen');
        for (let h = 0; h < n && v.ps > 0; h++) {
          const tirada = azar(e) * 512;
          const critico = tirada < ESPECIE[u.especie].base.vel * palillo * bote * papel;
          // Duro de roer (Turroncho): a critical blow hits it ×1.5 instead of ×2.
          const roer = critico && habilidadDe(v) === 'duro_de_roer' ? 0.75 : 1;
          if (roer < 1) {
            habilidad(c, t, 'duro_de_roer', 'hab.duro_de_roer.activa');
          } else if (critico && bote > 1 && tirada >= ESPECIE[u.especie].base.vel * palillo * papel) habilidad(c, j, 'bote');
          const r = calcularDano(u, v, m, { pot, azar: 0.85 + azar(e) * 0.15, critico, todos: m.objetivo === 'todos' && !karaoke && !volumen, acorralado, mult: multS * panuelo * multH * roer });
          efi = r.ef;
          let dano0 = r.dano;
          // Posavasos: the first very effective blow (×2 or more) does half.
          if (r.ef >= 2 && v.objeto?.id === 'posavasos' && !v.objeto.gastado) {
            activarObjeto(c, t, true, 'objeto.posavasos.activa');
            dano0 = Math.max(1, Math.floor(dano0 / 2));
          }
          const { dano, perk } = aplicarPerks(c, t, dano0);
          totalDano += danar(c, t, topeAguante(c, t, topeCajon(c, t, dano)), { ef: r.ef, critico, de: j, mov: m.id, acorralado });
          hechos++;
          if (critico) decir(c, 'combate.critico', varsDe(c, t), t);
          if (perk) decir(c, `combate.perk.${perk}`, varsDe(c, t), t);
          avisoAguante(c, t);
          // The attacker's permanent objects show themselves the first time they matter.
          if (u.objeto && !u.objeto.visto && ((critico && palillo > 1) || panuelo > 1)) activarObjeto(c, j, false, critico && palillo > 1 ? 'objeto.palillo.activa' : 'objeto.panuelo.activa');
          // Mechero: the first rival that hits the holder may get burnt.
          if (v.ps > 0 && u.ps > 0 && v.objeto?.id === 'mechero' && !v.objeto.gastado) {
            const prende = probar(e, OBJ_MECHERO_QUEMA) && !u.estado;
            activarObjeto(c, t, true, prende ? 'objeto.mechero.activa' : 'objeto.mechero.falla', { otro: nom(u) });
            if (prende) ponerEstado(c, j, 'quemado', true, t);
          }
        }
        if (efi > 1) decir(c, 'combate.muy_eficaz', varsDe(c, t), t);
        else if (efi < 1) decir(c, 'combate.poco_eficaz', varsDe(c, t), t);
        if (n > 1) decir(c, 'combate.veces', { n: hechos }, t);
        if (hechos && !c.golpeado[t].includes(j)) c.golpeado[t].push(j);
        if (hechos) golpeados.push(t);
        revisarCaida(c, t, j);
        v = act(c, t);
      }
      // «Devolvérsela»: 1.5 times what it took this turn, whatever the types (a fixed amount: no dice, no critical).
      if (ef.especial === 'devolver') {
        const { dano, perk } = aplicarPerks(c, t, Math.max(1, Math.floor(c.recibido[j] * 1.5)));
        totalDano += danar(c, t, topeAguante(c, t, topeCajon(c, t, dano)), { ef: 1, critico: false, de: j, mov: m.id });
        hechos++;
        if (perk) decir(c, `combate.perk.${perk}`, varsDe(c, t), t);
        avisoAguante(c, t);
        if (!c.golpeado[t].includes(j)) c.golpeado[t].push(j);
        golpeados.push(t);
        revisarCaida(c, t, j);
        v = act(c, t);
      }
    }
    if (v.ps > 0) algunoVivo = true;
    // Damaging moves need to have hit; status moves only the accuracy roll.
    if (!danina || hechos > 0) {
      acerto = true;
      efectosSecundarios(c, j, t, m, danina);
    }
  }

  // Whoever hit Aceituna, Roscochoco, Chupitochu or P pays for it (Buena chica, Indigesto, Ardiente, Pesadísimo), target by target once the move is told.
  for (const t of golpeados) reaccionAlGolpe(c, j, t, m);

  // Self stage changes of a move that hits others (e.g. «Tubo perfecto»): once, if it reached anybody, even if the target fell.
  if (acerto && u.ps > 0) for (const n of ef.nivel ?? []) if (n.a === 'yo' && (n.prob === undefined || probar(e, n.prob))) cambiarNivel(c, j, n.stat, n.cambio, j);

  if (totalDano > 0 && u.ps > 0) {
    if (ef.drena) curar(c, j, Math.max(1, Math.floor(totalDano / 2)), 'combate.drena');
    if (ef.rebote) {
      danar(c, j, Math.max(1, Math.floor(totalDano / 4)), { clave: 'combate.rebote' });
      revisarCaida(c, j);
    }
  }
  if (ef.recarga && totalDano > 0 && algunoVivo && u.ps > 0) u.vol.recarga = true;
  // «Al tendedero»: if the blow landed and there is somebody to take its place, it goes back to the bench when the turn ends.
  if (ef.especial === 'tendedero' && acerto && u.ps > 0) {
    const q = e.jugadores[j];
    if (vivos(q).some((i) => i !== q.activo)) {
      c.tendedero[j] = true;
      decir(c, 'combate.tendedero_vuelve', varsDe(c, j));
    }
  }
}

/** The abilities that answer a blow: `j` hit player `t`'s userito with move `m` (it is still standing; `j` too). Physical = of a physical type (docs/POKEUSERA.md). */
function reaccionAlGolpe(c: Ctx, j: number, t: number, m: Movimiento) {
  const a = act(c, j);
  const v = act(c, t);
  if (v.ps <= 0 || a.ps <= 0) return;
  const fisico = TIPOS_FISICOS.includes(m.tipo);
  const extra = { otro: nom(a) };
  switch (habilidadDe(v)) {
    case 'buena_chica':
      // Nobody can hit that little face: 30 % to lower the Attack of whoever hits it with an attack at one.
      if (m.objetivo !== 'todos' && probar(c.e, HAB_PROB_REACCION)) {
        habilidad(c, t, 'buena_chica', 'hab.buena_chica.activa', extra);
        cambiarNivel(c, j, 'ata', -1, t);
      }
      break;
    case 'indigesto':
      if (fisico && probar(c.e, HAB_PROB_REACCION)) ponerEstado(c, j, 'empachado', true, t, () => habilidad(c, t, 'indigesto', 'hab.indigesto.activa', extra));
      break;
    case 'ardiente':
      if (fisico && probar(c.e, HAB_PROB_REACCION)) ponerEstado(c, j, 'quemado', true, t, () => habilidad(c, t, 'ardiente', 'hab.ardiente.activa', extra));
      break;
    case 'pesadisimo':
      if (fisico && a.niveles.vel > -6) {
        habilidad(c, t, 'pesadisimo', 'hab.pesadisimo.activa', extra);
        cambiarNivel(c, j, 'vel', -1, t);
      }
      break;
  }
}

/** Público entregado (Teloneon): every time an attack of another player misses (by accuracy, at any target), the Especial of each Teloneon on the field goes up 1. */
function publicoEntregado(c: Ctx, atacante: number) {
  c.e.jugadores.forEach((_q, r) => {
    if (r === atacante || eliminado(c.e, r)) return;
    const v = act(c, r);
    if (v.ps <= 0 || habilidadDe(v) !== 'publico' || c.publico[r] || v.niveles.esp >= 2) return;
    c.publico[r] = true;
    habilidad(c, r, 'publico');
    cambiarNivel(c, r, 'esp', 1, r);
  });
}

/** A player's attack slot: the checks that can stop it (sleep, paralysis...), the PP, the announcement. */
function actuar(c: Ctx, a: Extract<Accion, { tipo: 'atacar' }>) {
  const e = c.e;
  const j = a.j;
  const u = act(c, j);
  c.actuo[j] = true;
  c.uso++;
  if (u.ps <= 0 || c.anulada[j]) return;
  if (c.recargaIni[j]) {
    decir(c, 'combate.recarga', varsDe(c, j));
    return;
  }
  if (u.estado === 'dormido') {
    if (u.sueno > 0) {
      u.sueno--;
      decir(c, 'combate.dormido_sigue', varsDe(c, j));
      return;
    }
    u.estado = null;
    despertado(c, u);
    c.ev.push({ k: 'estado', j, estado: null, de: 'dormido', clave: 'combate.despierta', vars: varsDe(c, j) });
  }
  if (c.retrocede[j]) {
    decir(c, 'combate.retrocede', varsDe(c, j));
    return;
  }
  if (u.estado === 'paralizado' && probar(e, 25)) {
    decir(c, 'combate.paralizado_no', varsDe(c, j));
    return;
  }

  let redirigir = false;
  let sobrio = false;
  const cierre = () => {
    if (sobrio && act(c, j).ps > 0) c.ev.push({ k: 'estado', j, estado: null, de: 'achispado', clave: 'combate.sobrio', vars: varsDe(c, j) });
  };
  if (u.achispado > 0) {
    u.achispado--;
    sobrio = u.achispado === 0;
    const r = entero(e, 3);
    if (r === 0) {
      decir(c, 'combate.achispado_golpe', varsDe(c, j));
      danar(c, j, danoAutogolpe(u, 0.85 + azar(e) * 0.15));
      revisarCaida(c, j);
      cierre();
      return;
    }
    redirigir = r === 1;
  }

  // The move: the chosen one, another with PP if the chosen one has none, or «A la desesperada».
  const ids = ESPECIE[u.especie].movs;
  const disp = u.pp.flatMap((p, i) => (p > 0 ? [i] : []));
  let m: Movimiento;
  if (!disp.length) {
    decir(c, 'combate.sin_pp', varsDe(c, j));
    m = MOVS[DESESPERADA];
    st(c, j).mv[4]++;
  } else {
    let idx = a.mov;
    if (!(u.pp[idx] > 0)) idx = elegir(e, disp);
    u.pp[idx]--;
    st(c, j).pp++;
    st(c, j).mv[idx]++;
    m = MOVS[ids[idx]];
  }
  // Tapón de cava: its first two attacks are quick; each one pops (the second one uses it up).
  if (c.tapon[j]) {
    c.tapon[j] = false;
    const o = u.objeto;
    if (o?.id === 'tapon' && !o.gastado && esAtaque(m)) {
      o.usos = (o.usos ?? 0) + 1;
      activarObjeto(c, j, o.usos >= OBJ_TAPON_USOS, o.usos === 1 ? 'objeto.tapon.activa' : 'objeto.tapon.activa2');
      u.vol.sorpresa = false; // the cork already made this first attack a quick one
    }
  }
  // Cuando menos te lo esperas (Lentejasur): the first attack after coming out is quick (+1; the order was settled in `prio`).
  if (c.sorpresa[j]) {
    c.sorpresa[j] = false;
    if (u.vol.sorpresa && esAtaque(m)) {
      u.vol.sorpresa = false;
      habilidad(c, j, 'inesperado', 'hab.inesperado.activa');
    }
  }
  const evUsa: Extract<Evento, { k: 'usa' }> = { k: 'usa', j, mov: m.id, obj: [], clave: 'combate.usa', vars: varsDe(c, j, { mov: m.nombre.replace(/^¡(.*)!$/, '$1') }) };
  c.ev.push(evUsa);

  let efectivo = m;
  if (m.id === 'siy') {
    const ult = e.ultimoMov ? MOVS[e.ultimoMov] : null;
    if (!ult || (ult.objetivo === 'uno' && !standing(c, j).length)) {
      fallaUsuario(c, j);
      cierre();
      return;
    }
    decir(c, 'combate.copia', varsDe(c, j, { mov: ult.nombre }));
    efectivo = ult;
  } else if (m.id === 'improvisa') {
    // ¡Improvisa!: any move of the game that is not made for one userito, a protection, «Sí, y…» or itself; a rival at random if it needs one.
    const elegido = MOVS[elegir(e, MOVS_IMPROVISA)];
    if (elegido.objetivo === 'uno' && !standing(c, j).length) {
      fallaUsuario(c, j);
      cierre();
      return;
    }
    decir(c, 'combate.improvisa', varsDe(c, j, { mov: elegido.nombre }));
    e.ultimoMov = elegido.id;
    efectivo = elegido;
  } else e.ultimoMov = m.id;
  if (efectivo.id === 'cancion') c.cancionAhora = true;

  usarMovimiento(c, j, efectivo, m.id === 'improvisa' ? undefined : a.objetivo, redirigir, evUsa);
  cierre();
}

// ------------------------------------------------------------------ sucesos del bar

/** 1/8 of the max HP, at least 1 (the heal of most sucesos). */
const octavo = (u: Userito): number => Math.max(1, Math.floor(u.psMax / 8));

/** Players whose active userito is standing and still in the battle. */
const enCampo = (c: Ctx): number[] => c.e.jugadores.map((_q, j) => j).filter((j) => !eliminado(c.e, j) && act(c, j).ps > 0);

/**
 * Draws and applies the suceso of the turn that is about to begin (`e.turno` is already the new turn): turns 5, 10, 15, 20 and 25.
 * Called at the end of the turn before, so the cartel is on screen before anyone chooses. It picks one of the general sucesos and of
 * the place's own that has not happened yet in this battle; instant ones act now, the others stay in `e.sucesos` for their turns.
 */
function iniciarSuceso(c: Ctx) {
  const e = c.e;
  if (e.ganador !== null || !TURNOS_SUCESO.includes(e.turno)) return;
  const libres = sucesosDe(e.escenario).filter((id) => !e.sucesosVistos.includes(id));
  if (!libres.length) return;
  const id = elegir(e, libres);
  e.sucesosVistos.push(id);
  const dura = SUCESOS[id].dura;
  const enPie = enCampo(c);
  const inicio = c.ev.length;
  // The player or userito it is about, for the phrase.
  let sobre = -1;
  if (id === 'pelea') sobre = [...enPie].sort((a, b) => vidaTotal(e.jugadores[b]) - vidaTotal(e.jugadores[a]) || a - b)[0] ?? -1;
  if (id === 'cumple') sobre = [...enPie].sort((a, b) => act(c, a).ps / act(c, a).psMax - act(c, b).ps / act(c, b).psMax || a - b)[0] ?? -1;
  if (id === 'rosas' && enPie.length) sobre = elegir(e, enPie);
  const vars = sobre >= 0 ? varsDe(c, sobre) : {};
  c.ev.push({ k: 'suceso', id, turnos: dura, clave: `suceso.${id}.frase`, vars });
  if (dura > 0) e.sucesos.push(sobre >= 0 && id === 'pelea' ? { id, turnos: dura, j: sobre } : { id, turnos: dura });

  switch (id) {
    case 'ronda':
      for (const j of enPie) curar(c, j, octavo(act(c, j)));
      break;
    case 'cumple':
      if (sobre >= 0) {
        curar(c, sobre, Math.max(1, Math.floor(act(c, sobre).psMax / 4)));
        cambiarNivel(c, sobre, 'ata', 1);
      }
      break;
    case 'barre':
      // Vero sweeps away every stage change (no per-stat events: the phrase says it and the state carries the zeros).
      for (const j of enPie) act(c, j).niveles = niveles0();
      break;
    case 'premio': {
      const gastadas = e.jugadores.map((_q, j) => j).filter((j) => !eliminado(e, j) && !e.jugadores[j].cana);
      if (gastadas.length) {
        const j = elegir(e, gastadas);
        e.jugadores[j].cana = true;
        c.ev.push({ k: 'texto', j, clave: 'suceso.premio.cana', vars: { jugador: e.jugadores[j].nombre } });
      } else {
        c.ev.push({ k: 'texto', clave: 'suceso.premio.cura' });
        for (const j of enPie) curar(c, j, octavo(act(c, j)));
      }
      break;
    }
    case 'cierzo':
      for (const j of enPie) cambiarNivel(c, j, 'vel', -1);
      break;
    case 'rosas':
      if (sobre >= 0) cambiarNivel(c, sobre, 'esp', 1);
      break;
    case 'peluca':
      for (const j of enPie) if (!ESPECIE[act(c, j).especie].tipos.includes('juerga')) cambiarNivel(c, j, 'prec', -1);
      break;
    case 'comanda':
      for (const j of enPie) {
        const tipos = ESPECIE[act(c, j).especie].tipos;
        if (tipos.includes('juerga') || tipos.includes('chanza')) curar(c, j, octavo(act(c, j)));
      }
      break;
    default:
      break; // luz, happy, pelea, karaoke, chinchin: rules that bend the turns they last (see usarMovimiento, finDeTurno)
  }
  for (let i = inicio; i < c.ev.length; i++) c.ev[i].fin = true;
}

// ------------------------------------------------------------------ the turn

function saneaEleccion(c: Ctx, j: number, ch: Eleccion | null | undefined): Accion | null {
  const e = c.e;
  const q = e.jugadores[j];
  if (eliminado(e, j)) {
    if (ch && ch.tipo === 'grada' && enGrada(e, j) && rivalesEnPie(e, j).includes(ch.objetivo)) return { tipo: 'grada', j, accion: ch.accion === 'abucheo' ? 'abucheo' : 'cana', objetivo: ch.objetivo };
    return null;
  }
  if (act(c, j).ps <= 0) return null;
  if (ch && ch.tipo === 'cambiar' && puedeCambiar(e, j) && vivos(q).includes(ch.a) && ch.a !== q.activo) return { tipo: 'cambiar', j, a: ch.a };
  if (ch && ch.tipo === 'cana' && q.cana) return { tipo: 'cana', j };
  if (ch && ch.tipo === 'atacar') return { tipo: 'atacar', j, mov: Number.isInteger(ch.mov) && ch.mov >= 0 && ch.mov < 4 ? ch.mov : 0, objetivo: ch.objetivo };
  const az = eleccionAzar(e, j, () => azar(e));
  return az && az.tipo === 'atacar' ? { tipo: 'atacar', j, mov: az.mov, objetivo: az.objetivo } : null;
}

function ejecutarPrevia(c: Ctx, a: Exclude<Accion, { tipo: 'atacar' }>) {
  const e = c.e;
  const j = a.j;
  const q = e.jugadores[j];
  c.actuo[j] = true;
  c.uso++;
  if (a.tipo === 'cambiar') {
    if (act(c, j).ps <= 0) return;
    decir(c, 'combate.retira', varsDe(c, j), j);
    st(c, j).cam++;
    sacar(c, j, a.a);
  } else if (a.tipo === 'cana') {
    const u = act(c, j);
    if (!q.cana || u.ps <= 0) return;
    q.cana = false;
    st(c, j).cana++;
    decir(c, 'combate.cana', varsDe(c, j), j);
    curar(c, j, Math.floor((u.psMax * (q.entrenador === 'fran' ? PERK_CANA_FRAN : 50)) / 100));
  } else {
    const t = a.objetivo;
    if (activo(e, t).ps <= 0) return;
    const v = act(c, t);
    if (a.accion === 'cana') {
      decir(c, 'combate.grada_cana', { jugador: q.nombre, quien: nom(v) }, t);
      e.stats.gr[j][0]++;
      curar(c, t, Math.max(1, Math.floor(v.psMax / 10)));
    } else {
      decir(c, 'combate.grada_abucheo', { jugador: q.nombre, quien: nom(v) }, t);
      e.stats.gr[j][1]++;
      cambiarNivel(c, t, 'prec', -1);
    }
  }
}

function finDeTurno(c: Ctx, alInicio: number[]) {
  const e = c.e;
  const n = e.jugadores.length;
  const sigue = (j: number) => act(c, j).ps > 0 && !eliminado(e, j);
  c.uso++;

  for (let j = 0; j < n; j++) {
    if (!sigue(j)) continue;
    const u = act(c, j);
    if (u.vol.bostezo >= 0) {
      u.vol.bostezo--;
      if (u.vol.bostezo <= 0) {
        u.vol.bostezo = -1;
        if (!u.estado) ponerEstado(c, j, 'dormido', true);
      }
    }
    if (u.estado === 'quemado') {
      danar(c, j, Math.max(1, Math.floor(u.psMax / 16)), { clave: 'combate.quemado_dano' });
      revisarCaida(c, j);
    } else if (u.estado === 'empachado') {
      danar(c, j, Math.max(1, Math.floor(u.psMax / 8)), { clave: 'combate.empachado_dano' });
      revisarCaida(c, j);
    }
    if (u.ps > 0 && u.vol.atrapado > 0) {
      danar(c, j, Math.max(1, Math.floor(u.psMax / 16)), { clave: 'combate.atrapado_dano' });
      u.vol.atrapado--;
      if (u.vol.atrapado === 0) u.vol.atrapadoPor = -1;
      revisarCaida(c, j);
      if (u.ps > 0 && u.vol.atrapado === 0) decir(c, 'combate.suelta', varsDe(c, j));
    }
  }

  // Fotosíntesis (Criaturitah): it heals 1/16 of its max HP at the end of every turn.
  for (let j = 0; j < n; j++) {
    if (!sigue(j)) continue;
    const u = act(c, j);
    if (habilidadDe(u) !== 'fotosintesis' || u.ps >= u.psMax) continue;
    habilidad(c, j, 'fotosintesis');
    curar(c, j, Math.max(1, Math.floor(u.psMax / HAB_FOTOSINTESIS)), 'hab.fotosintesis.cura');
  }

  // Chin chin: the two players with the least HP in total heal 1/8 of their active userito's max HP.
  if (hayDeSuceso(e, 'chinchin')) {
    const flojos = e.jugadores
      .map((_q, j) => j)
      .filter(sigue)
      .sort((a, b) => vidaTotal(e.jugadores[a]) - vidaTotal(e.jugadores[b]) || a - b)
      .slice(0, 2);
    for (const j of flojos) curar(c, j, octavo(act(c, j)), 'suceso.chinchin.cura');
  }

  const octavos = octavosCierre(e.turno);
  if (octavos > 0) {
    decir(c, e.turno === TURNO_CIERRE ? 'combate.cierre' : (e.turno - TURNO_CIERRE) % TURNOS_ESCALADA === 0 ? 'combate.cierre_mas' : 'combate.cierre_sigue');
    for (let j = 0; j < n; j++) {
      if (!sigue(j)) continue;
      danar(c, j, Math.max(1, Math.floor((act(c, j).psMax * octavos) / 8)));
      revisarCaida(c, j);
    }
  }

  correrBanquillo(c, alInicio);

  for (let j = 0; j < n; j++) {
    const u = act(c, j);
    u.vol.escondido = false;
    u.vol.desvia = false;
    u.vol.aguanta = false;
    u.vol.protegidoAntes = c.usoProt[j];
    if (c.cizanaIni[j] && u.vol.cizana > 0) u.vol.cizana--;
  }
  e.cancionAntes = c.cancionAhora;
  e.agresores = c.golpeado.map((l, j) => (act(c, j).ps > 0 ? [...l] : []));
}

/**
 * The bench keeps living: at the end of every turn the useritos that are standing but out of the fight count the turns of their
 * sleep (`sueno`) and drunkenness (`achispado`), so a sleeper wakes up on the bench instead of waiting for its next appearance.
 * Burn and indigestion do not hurt on the bench. The userito that was on the field at the start of the turn (`alInicio`, even if
 * it switched out during it) and the one on the field now (even if it came in during it) are not benched: their turn is counted
 * when they try to act. No random numbers are used.
 */
function correrBanquillo(c: Ctx, alInicio: number[]) {
  const e = c.e;
  e.jugadores.forEach((q, j) => {
    if (eliminado(e, j)) return;
    q.equipo.forEach((u, i) => {
      if (u.ps <= 0 || i === q.activo || i === alInicio[j]) return;
      if (u.achispado > 0) u.achispado--;
      if (u.estado === 'dormido') {
        if (u.sueno > 0) u.sueno--;
        if (u.sueno <= 0) {
          u.estado = null;
          u.sueno = 0;
          despertado(c, u);
          c.ev.push({ k: 'texto', clave: 'combate.despierta_banco', vars: { quien: nom(u), jugador: q.nombre } });
        }
      }
    });
  });
}

/** «Al tendedero» sends this player's userito back to the bench at the end of the turn (it is still standing and somebody can take its place). */
function retiraAlTendedero(c: Ctx, j: number): boolean {
  const q = c.e.jugadores[j];
  return c.tendedero[j] && act(c, j).ps > 0 && vivos(q).some((i) => i !== q.activo);
}

/** Places the players who fell this turn and decides whether the battle is over. */
function cerrarEliminaciones(c: Ctx) {
  const e = c.e;
  const n = e.jugadores.length;
  const nuevos: number[] = [];
  const enPie: number[] = [];
  for (let j = 0; j < n; j++) {
    const q = e.jugadores[j];
    if (q.puesto > 0) continue;
    if (vivos(q).length === 0) nuevos.push(j);
    else enPie.push(j);
  }
  const claves = nuevos.map(() => azar(e));
  // Best first: more team HP at the start of the turn, ties at random.
  const orden = nuevos.map((_, i) => i).sort((a, b) => c.pctIni[nuevos[b]] - c.pctIni[nuevos[a]] || claves[a] - claves[b]);
  const S = enPie.length;
  const puestos: Record<number, number> = {};
  orden.forEach((i, rango) => {
    puestos[nuevos[i]] = S + 1 + rango;
  });
  for (const i of [...orden].reverse()) {
    const j = nuevos[i];
    e.jugadores[j].puesto = puestos[j];
    if (puestos[j] > 1) c.ev.push({ k: 'eliminado', j, puesto: puestos[j], clave: 'combate.eliminado', vars: varsDe(c, j, { puesto: puestos[j] }) });
  }
  if (S <= 1) {
    const g = S === 1 ? enPie[0] : nuevos[orden[0]];
    e.jugadores[g].puesto = 1;
    e.ganador = g;
    e.reemplazos = [];
    c.ev.push({ k: 'fin', ganador: g, clave: 'combate.fin', vars: varsDe(c, g) });
  } else e.reemplazos = enPie.filter((j) => act(c, j).ps <= 0 || retiraAlTendedero(c, j));
}

/**
 * Resolves one turn. `elecciones[j]` is player j's choice; null/missing means «no choice»: a
 * random move at a random rival for a living player, nothing for an eliminated one. Invalid
 * choices (a switch while trapped, a move without PP...) are corrected as the rules say.
 */
export function resolverTurno(estado: EstadoCombate, elecciones: (Eleccion | null)[]): { estado: EstadoCombate; eventos: Evento[] } {
  const e = structuredClone(estado);
  const c: Ctx = {
    e,
    ev: [],
    golpeado: e.jugadores.map(() => []),
    actuo: e.jugadores.map(() => false),
    anulada: e.jugadores.map(() => false),
    retrocede: e.jugadores.map(() => false),
    cayo: e.jugadores.map(() => false),
    usoProt: e.jugadores.map(() => false),
    recibido: e.jugadores.map(() => 0),
    ultimoAgresor: e.jugadores.map(() => -1),
    salvado: e.jugadores.map(() => false),
    dichoAguante: e.jugadores.map(() => false),
    tapon: e.jugadores.map(() => false),
    tendedero: e.jugadores.map(() => false),
    publico: e.jugadores.map(() => false),
    recargaIni: [],
    cizanaIni: [],
    pctIni: e.jugadores.map(pctEquipo),
    agresoresIni: e.agresores.map((l) => [...l]),
    cancionAntes: e.cancionAntes,
    cancionAhora: false,
    sorpresa: e.jugadores.map(() => false),
    uso: 0,
    avisos: new Set(),
  };
  if (e.ganador !== null) return { estado: e, eventos: [] };
  if (e.reemplazos.length) c.ev.push(...reemplazarEn(c, {}));
  const n = e.jugadores.length;
  // The first turn of the battle: the Zapatillas nuevas of the useritos that start out in the field.
  if (e.turno === 1) for (let j = 0; j < n; j++) if (!eliminado(e, j)) alSalirAlCampo(c, j);
  // Turns on the field: the userito that starts the turn out, for everybody still playing.
  const alInicio = e.jugadores.map((q, j) => (eliminado(e, j) ? -1 : q.activo));

  // 1. Validate what everyone chose (before the start-of-turn flags are consumed).
  const acciones: Accion[] = [];
  for (let j = 0; j < n; j++) {
    const a = saneaEleccion(c, j, elecciones[j]);
    if (a) acciones.push(a);
  }
  // 2. Flags that last "the next turn" are read from the start of the turn; effects set during it survive.
  c.recargaIni = e.jugadores.map((_, j) => act(c, j).vol.recarga);
  c.cizanaIni = e.jugadores.map((_, j) => act(c, j).vol.cizana > 0);
  for (let j = 0; j < n; j++) {
    act(c, j).vol.recarga = false;
    act(c, j).vol.sinCambio = false;
  }

  // 3. Switches, caña and grada, then Esconderse, Susto, and the rest by speed (ties at random).
  const orden = (lista: Accion[], clave: (a: Accion) => number) => {
    const azarLista = lista.map(() => azar(e));
    return lista.map((a, i) => ({ a, i })).sort((x, y) => clave(y.a) - clave(x.a) || azarLista[x.i] - azarLista[y.i]).map((x) => x.a);
  };
  const velDe = (a: Accion) => velocidadEfectiva(act(c, a.j));
  const previas = orden(acciones.filter((a) => a.tipo !== 'atacar'), velDe);
  for (const a of previas) if (a.tipo !== 'atacar') ejecutarPrevia(c, a);

  const ataques = acciones.filter((a): a is Extract<Accion, { tipo: 'atacar' }> => a.tipo === 'atacar');
  const prio = (a: Extract<Accion, { tipo: 'atacar' }>) => {
    const u = act(c, a.j);
    const id = ESPECIE[u.especie].movs[a.mov];
    if (!(u.pp[a.mov] > 0) || c.recargaIni[a.j]) return 0;
    const p = MOVS[id].prioridad ?? 0;
    // Tapón de cava: its first attack goes as a quick one (+1).
    if (p < 1 && u.objeto?.id === 'tapon' && !u.objeto.gastado && esAtaque(MOVS[id])) {
      c.tapon[a.j] = true;
      return 1;
    }
    // Cuando menos te lo esperas: the first attack after coming out is quick too.
    if (p < 1 && u.vol.sorpresa && esAtaque(MOVS[id])) {
      c.sorpresa[a.j] = true;
      return 1;
    }
    return p;
  };
  const porPrio = orden(ataques, (a) => prio(a as Extract<Accion, { tipo: 'atacar' }>) * 100000 + velDe(a));
  for (const a of porPrio) if (a.tipo === 'atacar') actuar(c, a);

  // 4. End of turn.
  const iFin = c.ev.length;
  finDeTurno(c, alInicio);
  cerrarEliminaciones(c);
  for (let i = iFin; i < c.ev.length; i++) c.ev[i].fin = true;
  alInicio.forEach((idx, j) => {
    if (idx >= 0) e.stats.u[j][idx].tf++;
  });
  // The sucesos that were on have lived one more turn.
  e.sucesos = e.sucesos.flatMap((x) => (x.turnos > 1 ? [{ ...x, turnos: x.turnos - 1 }] : []));
  e.turno++;
  // 5. Something happens in the bar at the start of turns 5, 10...: told now, before anyone chooses.
  iniciarSuceso(c);
  return { estado: e, eventos: c.ev };
}

function reemplazarEn(c: Ctx, elegidos: Record<number, number>): Evento[] {
  const e = c.e;
  const inicio = c.ev.length;
  for (const j of e.reemplazos) {
    const q = e.jugadores[j];
    // A userito that is still standing is leaving the field (Al tendedero): it cannot be chosen to come back in.
    const vivosJ = vivos(q).filter((i) => i !== q.activo || act(c, j).ps <= 0);
    if (!vivosJ.length) continue;
    const pedido = elegidos[j];
    c.uso++;
    sacar(c, j, Number.isInteger(pedido) && vivosJ.includes(pedido) ? pedido : vivosJ[0]);
  }
  e.reemplazos = [];
  return c.ev.splice(inicio);
}

/** Sends in the userito chosen by each player in `estado.reemplazos` (index in `equipo`);
 *  invalid or missing choices send the first one alive. Emits 'sale' for each. */
export function reemplazar(estado: EstadoCombate, elegidos: Record<number, number>): { estado: EstadoCombate; eventos: Evento[] } {
  const e = structuredClone(estado);
  const c: Ctx = {
    e,
    ev: [],
    golpeado: e.jugadores.map(() => []),
    actuo: e.jugadores.map(() => false),
    anulada: e.jugadores.map(() => false),
    retrocede: e.jugadores.map(() => false),
    cayo: e.jugadores.map(() => false),
    usoProt: e.jugadores.map(() => false),
    recibido: e.jugadores.map(() => 0),
    ultimoAgresor: e.jugadores.map(() => -1),
    salvado: e.jugadores.map(() => false),
    dichoAguante: e.jugadores.map(() => false),
    tapon: e.jugadores.map(() => false),
    tendedero: e.jugadores.map(() => false),
    publico: e.jugadores.map(() => false),
    recargaIni: [],
    cizanaIni: [],
    pctIni: [],
    agresoresIni: [],
    cancionAntes: false,
    cancionAhora: false,
    sorpresa: e.jugadores.map(() => false),
    uso: 0,
    avisos: new Set(),
  };
  return { estado: e, eventos: reemplazarEn(c, elegidos) };
}
