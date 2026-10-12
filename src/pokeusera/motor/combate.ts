// PokéUsera · battle engine. Pure functions: no DOM, no timers, no Math.random. Every function
// that "changes" the state clones it first (structuredClone) and returns the new one; all the
// randomness comes from `estado.semilla` (see azar.ts), so (state, choices) fully determine the
// result. The rules are in docs/POKEUSERA.md.
//
// Event conventions (what the screens get in `eventos`, in order):
//  - 'usa'    j = the user. Text «¡X usó Y!».
//  - 'golpe'  j = the VICTIM of any HP loss (attacks, recoil, burn, trap, hangover, Hora de cerrar...).
//             `dano` = HP really lost, `ps` = HP after. The attacker is the j of the last 'usa'.
//  - 'cura'   j = who recovers (drain, caña, grada, Siesta). `ps` = HP after.
//  - 'falla'  j = the one who dodged (a miss on a target), or the user when its own move fails.
//  - 'estado' a status starts (estado = it) or ends (estado = null, `de` = which one).
//  - 'nivel'  a stat stage changed (`cambio` = what really changed, never 0).
//  - 'cae' / 'sale' / 'eliminado' / 'fin' as in tipos.ts. 'texto' = only a text line.
// Every event may carry `clave` + `vars` (quien = userito name, jugador = player name, mov, ...).
import type { Eleccion, EstadoCombate, EntrenadorId, Estado, Evento, Jugador, Movimiento, Stat, Userito } from '../tipos';
import { TIPOS_FISICOS } from '../tipos';
import { DESESPERADA, EFECTOS, ESPECIE, MOVS, eficacia } from '../datos';
import { azar, elegir, entero, probar, type ConSemilla } from './azar';

/** Turn from which Vero closes the bar (1/8 of max HP at the end of every turn). */
export const TURNO_CIERRE = 25;

// ------------------------------------------------------------------ construction

const niveles0 = (): Record<Stat, number> => ({ ata: 0, def: 0, vel: 0, esp: 0, prec: 0 });
const vol0 = (): Userito['vol'] => ({ atrapado: 0, atrapadoPor: -1, cizana: 0, bostezo: -1, recarga: false, sinCambio: false, escondidoAntes: false, escondido: false });

function crearUserito(especie: string): Userito {
  const sp = ESPECIE[especie];
  if (!sp) throw new Error(`Especie desconocida: ${especie}`);
  const ps = sp.base.ps + 60;
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
  };
}

export function crearCombate(equipos: { entrenador: EntrenadorId; nombre: string; bot: boolean; especies: string[] }[], semilla: number): EstadoCombate {
  if (equipos.length < 2 || equipos.length > 4) throw new Error('Una batalla es de 2 a 4 jugadores');
  return {
    turno: 1,
    jugadores: equipos.map((q, idx) => ({
      idx,
      entrenador: q.entrenador,
      nombre: q.nombre,
      equipo: q.especies.slice(0, 3).map(crearUserito),
      activo: 0,
      cana: true,
      bot: q.bot,
      puesto: 0,
    })),
    semilla: semilla | 0,
    ultimoMov: null,
    cancionAntes: false,
    agresores: equipos.map(() => []),
    reemplazos: [],
    ganador: null,
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
}

/** The damage formula, without any randomness of its own. `ef` is the type effectiveness. */
export function calcularDano(a: Userito, d: Userito, mov: Movimiento, o: OpcionesDano = {}): { dano: number; ef: number } {
  const pot = o.pot ?? mov.pot ?? 0;
  const ef = eficacia(mov.tipo, ESPECIE[d.especie].tipos);
  if (pot <= 0 || ef === 0) return { dano: 0, ef };
  const fisico = TIPOS_FISICOS.includes(mov.tipo);
  const A = fisico ? a.ata * multNivel(a.niveles.ata) * (a.estado === 'quemado' ? 0.5 : 1) : a.esp * multNivel(a.niveles.esp);
  const D = Math.max(1, fisico ? d.def * multNivel(d.niveles.def) : d.esp * multNivel(d.niveles.esp));
  let dano = Math.floor(Math.floor((22 * pot * A) / D) / 50) + 2;
  if (ESPECIE[a.especie].tipos.includes(mov.tipo)) dano *= 1.5;
  dano *= ef;
  if (o.todos) dano *= 0.75;
  if (o.acorralado) dano *= 0.5;
  dano *= o.azar ?? 0.925;
  if (o.critico) dano *= 2;
  return { dano: Math.max(1, Math.floor(dano)), ef };
}

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
  usoEsc: boolean[];
  recargaIni: boolean[];
  cizanaIni: boolean[];
  pctIni: number[];
  agresoresIni: number[][];
  cancionAntes: boolean;
  cancionAhora: boolean;
}

type Accion =
  | { tipo: 'cambiar'; j: number; a: number }
  | { tipo: 'cana'; j: number }
  | { tipo: 'grada'; j: number; accion: 'cana' | 'abucheo'; objetivo: number }
  | { tipo: 'atacar'; j: number; mov: number; objetivo?: number };

const act = (c: Ctx, j: number): Userito => activo(c.e, j);
const nom = (u: Userito): string => ESPECIE[u.especie].nombre;
const varsDe = (c: Ctx, j: number, extra: Record<string, string | number> = {}) => ({ quien: nom(act(c, j)), jugador: c.e.jugadores[j].nombre, ...extra });

function decir(c: Ctx, clave: string, vars?: Record<string, string | number>) {
  c.ev.push({ k: 'texto', clave, vars });
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
function danar(c: Ctx, t: number, dano: number, op: { ef?: number; critico?: boolean; clave?: string; vars?: Record<string, string | number> } = {}): number {
  const u = act(c, t);
  const antes = u.ps;
  u.ps = Math.max(0, u.ps - dano);
  const ev: Evento = { k: 'golpe', j: t, dano: antes - u.ps, ps: u.ps, ef: op.ef ?? 1, critico: op.critico ?? false };
  if (op.clave) {
    ev.clave = op.clave;
    ev.vars = op.vars ?? varsDe(c, t);
  }
  c.ev.push(ev);
  return antes - u.ps;
}

function curar(c: Ctx, j: number, cantidad: number, clave?: string): number {
  const u = act(c, j);
  const antes = u.ps;
  u.ps = Math.min(u.psMax, u.ps + cantidad);
  if (u.ps === antes) return 0;
  const ev: Evento = { k: 'cura', j, ps: u.ps };
  if (clave) {
    ev.clave = clave;
    ev.vars = varsDe(c, j);
  }
  c.ev.push(ev);
  return u.ps - antes;
}

function revisarCaida(c: Ctx, j: number) {
  const u = act(c, j);
  if (u.ps > 0 || c.cayo[j]) return;
  c.cayo[j] = true;
  u.estado = null;
  u.sueno = 0;
  reiniciar(u);
  soltarAtrapados(c, j);
  c.ev.push({ k: 'cae', j, clave: 'combate.cae', vars: varsDe(c, j) });
}

function cambiarNivel(c: Ctx, t: number, stat: Stat, cambio: number) {
  const u = act(c, t);
  if (u.ps <= 0) return;
  const antes = u.niveles[stat];
  const nuevo = Math.max(-6, Math.min(6, antes + cambio));
  const real = nuevo - antes;
  if (real === 0) {
    decir(c, cambio > 0 ? 'combate.tope_sube' : 'combate.tope_baja', varsDe(c, t));
    return;
  }
  u.niveles[stat] = nuevo;
  c.ev.push({ k: 'nivel', j: t, stat, cambio: real, clave: `combate.${real > 0 ? 'sube' : 'baja'}${Math.min(2, Math.abs(real))}.${stat}`, vars: varsDe(c, t) });
}

/** Tries to start a status. Returns whether it worked. `silencio`: no «no tuvo efecto» line when it fails. */
function ponerEstado(c: Ctx, t: number, est: Estado | 'achispado', silencio: boolean): boolean {
  const u = act(c, t);
  if (u.ps <= 0) return false;
  if (est === 'achispado') {
    if (u.achispado > 0) {
      if (!silencio) decir(c, 'combate.sin_efecto', varsDe(c, t));
      return false;
    }
    u.achispado = 2 + entero(c.e, 3);
  } else {
    if (u.estado) {
      if (!silencio) decir(c, 'combate.sin_efecto', varsDe(c, t));
      return false;
    }
    u.estado = est;
    if (est === 'dormido') u.sueno = 1 + entero(c.e, 3);
  }
  c.ev.push({ k: 'estado', j: t, estado: est, clave: `combate.estado.${est}`, vars: varsDe(c, t) });
  return true;
}

/** Sends in a userito (voluntary switch, forced switch or replacement). */
function sacar(c: Ctx, j: number, idx: number) {
  const q = c.e.jugadores[j];
  reiniciar(act(c, j));
  q.activo = idx;
  c.golpeado[j] = [];
  c.e.agresores[j] = [];
  c.agresoresIni[j] = [];
  c.recargaIni[j] = false;
  c.cizanaIni[j] = false;
  c.usoEsc[j] = false;
  c.cayo[j] = false;
  soltarAtrapados(c, j);
  c.ev.push({ k: 'sale', j, idx, clave: 'combate.sale', vars: varsDe(c, j) });
}

const standing = (c: Ctx, j: number) => rivalesEnPie(c.e, j);

// ------------------------------------------------------------------ using a move

function tiradaGolpes(e: EstadoCombate): number {
  const r = azar(e);
  return r < 3 / 8 ? 2 : r < 6 / 8 ? 3 : r < 7 / 8 ? 4 : 5;
}

function fallaUsuario(c: Ctx, j: number, clave = 'combate.falla') {
  c.ev.push({ k: 'falla', j, clave, vars: varsDe(c, j) });
}

function efectosPropios(c: Ctx, j: number, m: Movimiento) {
  const e = c.e;
  const u = act(c, j);
  const ef = EFECTOS[m.id] ?? {};
  if (ef.especial === 'esconderse') {
    if (u.vol.escondidoAntes && probar(e, 50)) {
      fallaUsuario(c, j, 'combate.esconde_falla');
      return;
    }
    u.vol.escondido = true;
    c.usoEsc[j] = true;
    decir(c, 'combate.esconde', varsDe(c, j));
    return;
  }
  if (ef.especial === 'siesta') {
    if (u.ps >= u.psMax && !u.estado && u.achispado === 0) {
      fallaUsuario(c, j);
      return;
    }
    u.estado = 'dormido';
    u.sueno = 2;
    u.achispado = 0;
    c.ev.push({ k: 'estado', j, estado: 'dormido', clave: 'combate.siesta', vars: varsDe(c, j) });
    curar(c, j, u.psMax);
    return;
  }
  for (const n of ef.nivel ?? []) if (n.a === 'yo') cambiarNivel(c, j, n.stat, n.cambio);
}

function forzarCambio(c: Ctx, t: number) {
  const q = c.e.jugadores[t];
  const banco = vivos(q).filter((i) => i !== q.activo);
  if (!banco.length) {
    decir(c, 'combate.sin_efecto', varsDe(c, t));
    return;
  }
  decir(c, 'combate.remolino', varsDe(c, t));
  sacar(c, t, elegir(c.e, banco));
  if (!c.actuo[t]) c.anulada[t] = true;
}

/** Applies the secondary effects of a move that reached a target that is still standing. */
function efectosSecundarios(c: Ctx, j: number, t: number, m: Movimiento, danino: boolean) {
  const e = c.e;
  const ef = EFECTOS[m.id] ?? {};
  const v = act(c, t);
  if (v.ps <= 0) return;
  if (ef.estado && (!danino || probar(e, ef.estado.prob))) ponerEstado(c, t, ef.estado.estado, danino);
  for (const n of ef.nivel ?? []) if (n.a === 'objetivo' && act(c, t).ps > 0 && (n.prob === undefined || probar(e, n.prob))) cambiarNivel(c, t, n.stat, n.cambio);
  if (ef.retrocede && !c.actuo[t] && probar(e, ef.retrocede)) c.retrocede[t] = true;
  if (ef.bloqueaCambio) v.vol.sinCambio = true;
  if (ef.atrapa && v.vol.atrapado === 0) {
    v.vol.atrapado = 2 + entero(e, 4);
    v.vol.atrapadoPor = j;
    decir(c, 'combate.atrapa', varsDe(c, t));
  }
  if (ef.especial === 'bostezo') {
    if (v.estado || v.vol.bostezo >= 0) decir(c, 'combate.sin_efecto', varsDe(c, t));
    else {
      v.vol.bostezo = 2;
      decir(c, 'combate.bostezo', varsDe(c, t));
    }
  }
  if (ef.especial === 'cizana') {
    if (v.vol.cizana > 0) decir(c, 'combate.sin_efecto', varsDe(c, t));
    else {
      v.vol.cizana = 2;
      decir(c, 'combate.cizana', varsDe(c, t));
    }
  }
  if (ef.especial === 'remolino') forzarCambio(c, t);
}

/** Runs move `m` for player `j` (already paid, announced and not skipped). */
function usarMovimiento(c: Ctx, j: number, m: Movimiento, pedido: number | undefined, redirigir: boolean) {
  const e = c.e;
  const u = act(c, j);
  const ef = EFECTOS[m.id] ?? {};

  if (m.objetivo === 'yo') {
    efectosPropios(c, j, m);
    return;
  }

  let objetivos: number[];
  if (m.objetivo === 'todos') objetivos = standing(c, j);
  else {
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
    objetivos = t >= 0 ? [t] : [];
  }
  if (!objetivos.length) {
    fallaUsuario(c, j);
    return;
  }

  const danina = m.pot !== null || ef.especial === 'premio';
  let totalDano = 0;
  let algunoVivo = false;
  let cancionDicha = false;

  for (const t of objetivos) {
    let v = act(c, t);
    if (v.ps <= 0) continue;
    if (v.vol.escondido) {
      decir(c, 'combate.esconde_protege', varsDe(c, t));
      continue;
    }
    if (danina && eficacia(m.tipo, ESPECIE[v.especie].tipos) === 0) {
      decir(c, 'combate.no_afecta', varsDe(c, t));
      continue;
    }
    if (m.prec !== null) {
      const p = m.prec * multNivel(u.niveles.prec);
      if (p < 100 && azar(e) * 100 >= p) {
        c.ev.push({ k: 'falla', j: t, clave: 'combate.esquiva', vars: varsDe(c, t) });
        continue;
      }
    }

    let hechos = 0;
    if (danina) {
      let pot = m.pot ?? 0;
      if (ef.especial === 'premio') {
        pot = elegir(e, [0, 40, 80, 150]);
        decir(c, `combate.premio${pot}`, varsDe(c, j));
      }
      if (ef.especial === 'venganza' && c.agresoresIni[j].includes(t)) {
        pot *= 2;
        decir(c, 'combate.venganza', varsDe(c, t));
      }
      if (ef.especial === 'cancion' && c.cancionAntes) {
        pot *= 2;
        if (!cancionDicha) decir(c, 'combate.cancion_doble', varsDe(c, j));
        cancionDicha = true;
      }
      if (pot > 0) {
        const acorralado = c.golpeado[t].some((a) => a !== j);
        if (acorralado) decir(c, 'combate.acorralado', varsDe(c, t));
        const n = ef.golpes === 'multi' ? tiradaGolpes(e) : (ef.golpes ?? 1);
        let efi = 1;
        for (let h = 0; h < n && v.ps > 0; h++) {
          const critico = azar(e) * 512 < ESPECIE[u.especie].base.vel;
          const r = calcularDano(u, v, m, { pot, azar: 0.85 + azar(e) * 0.15, critico, todos: m.objetivo === 'todos', acorralado });
          efi = r.ef;
          totalDano += danar(c, t, r.dano, { ef: r.ef, critico });
          hechos++;
          if (critico) decir(c, 'combate.critico', varsDe(c, t));
        }
        if (efi > 1) decir(c, 'combate.muy_eficaz', varsDe(c, t));
        else if (efi < 1) decir(c, 'combate.poco_eficaz', varsDe(c, t));
        if (n > 1) decir(c, 'combate.veces', { n: hechos });
        if (hechos && !c.golpeado[t].includes(j)) c.golpeado[t].push(j);
        revisarCaida(c, t);
        v = act(c, t);
      }
    }
    if (v.ps > 0) algunoVivo = true;
    // Damaging moves need to have hit; status moves only the accuracy roll.
    if (!danina || hechos > 0) efectosSecundarios(c, j, t, m, danina);
  }

  if (totalDano > 0 && u.ps > 0) {
    if (ef.drena) curar(c, j, Math.max(1, Math.floor(totalDano / 2)), 'combate.drena');
    if (ef.rebote) {
      danar(c, j, Math.max(1, Math.floor(totalDano / 4)), { clave: 'combate.rebote' });
      revisarCaida(c, j);
    }
  }
  if (ef.recarga && totalDano > 0 && algunoVivo && u.ps > 0) u.vol.recarga = true;
}

/** A player's attack slot: the checks that can stop it (sleep, paralysis...), the PP, the announcement. */
function actuar(c: Ctx, a: Extract<Accion, { tipo: 'atacar' }>) {
  const e = c.e;
  const j = a.j;
  const u = act(c, j);
  c.actuo[j] = true;
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
  } else {
    let idx = a.mov;
    if (!(u.pp[idx] > 0)) idx = elegir(e, disp);
    u.pp[idx]--;
    m = MOVS[ids[idx]];
  }
  c.ev.push({ k: 'usa', j, mov: m.id, clave: 'combate.usa', vars: varsDe(c, j, { mov: m.nombre.replace(/^¡(.*)!$/, '$1') }) });

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
  } else e.ultimoMov = m.id;
  if (efectivo.id === 'cancion') c.cancionAhora = true;

  usarMovimiento(c, j, efectivo, a.objetivo, redirigir);
  cierre();
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
  if (a.tipo === 'cambiar') {
    if (act(c, j).ps <= 0) return;
    decir(c, 'combate.retira', varsDe(c, j));
    sacar(c, j, a.a);
  } else if (a.tipo === 'cana') {
    const u = act(c, j);
    if (!q.cana || u.ps <= 0) return;
    q.cana = false;
    decir(c, 'combate.cana', varsDe(c, j));
    curar(c, j, Math.floor(u.psMax / 2));
  } else {
    const t = a.objetivo;
    if (activo(e, t).ps <= 0) return;
    const v = act(c, t);
    if (a.accion === 'cana') {
      decir(c, 'combate.grada_cana', { jugador: q.nombre, quien: nom(v) });
      curar(c, t, Math.max(1, Math.floor(v.psMax / 10)));
    } else {
      decir(c, 'combate.grada_abucheo', { jugador: q.nombre, quien: nom(v) });
      cambiarNivel(c, t, 'prec', -1);
    }
  }
}

function finDeTurno(c: Ctx) {
  const e = c.e;
  const n = e.jugadores.length;
  const sigue = (j: number) => act(c, j).ps > 0 && !eliminado(e, j);

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

  if (e.turno >= TURNO_CIERRE) {
    decir(c, e.turno === TURNO_CIERRE ? 'combate.cierre' : 'combate.cierre_sigue');
    for (let j = 0; j < n; j++) {
      if (!sigue(j)) continue;
      danar(c, j, Math.max(1, Math.floor(act(c, j).psMax / 8)));
      revisarCaida(c, j);
    }
  }

  for (let j = 0; j < n; j++) {
    const u = act(c, j);
    u.vol.escondido = false;
    u.vol.escondidoAntes = c.usoEsc[j];
    if (c.cizanaIni[j] && u.vol.cizana > 0) u.vol.cizana--;
  }
  e.cancionAntes = c.cancionAhora;
  e.agresores = c.golpeado.map((l, j) => (act(c, j).ps > 0 ? [...l] : []));
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
  } else e.reemplazos = enPie.filter((j) => act(c, j).ps <= 0);
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
    usoEsc: e.jugadores.map(() => false),
    recargaIni: [],
    cizanaIni: [],
    pctIni: e.jugadores.map(pctEquipo),
    agresoresIni: e.agresores.map((l) => [...l]),
    cancionAntes: e.cancionAntes,
    cancionAhora: false,
  };
  if (e.ganador !== null) return { estado: e, eventos: [] };
  if (e.reemplazos.length) c.ev.push(...reemplazarEn(c, {}));
  const n = e.jugadores.length;

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
    return u.pp[a.mov] > 0 && !c.recargaIni[a.j] ? (MOVS[id].prioridad ?? 0) : 0;
  };
  const porPrio = orden(ataques, (a) => prio(a as Extract<Accion, { tipo: 'atacar' }>) * 100000 + velDe(a));
  for (const a of porPrio) if (a.tipo === 'atacar') actuar(c, a);

  // 4. End of turn.
  finDeTurno(c);
  cerrarEliminaciones(c);
  e.turno++;
  return { estado: e, eventos: c.ev };
}

function reemplazarEn(c: Ctx, elegidos: Record<number, number>): Evento[] {
  const e = c.e;
  const inicio = c.ev.length;
  for (const j of e.reemplazos) {
    const q = e.jugadores[j];
    const vivosJ = vivos(q);
    if (!vivosJ.length) continue;
    const pedido = elegidos[j];
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
    usoEsc: e.jugadores.map(() => false),
    recargaIni: [],
    cizanaIni: [],
    pctIni: [],
    agresoresIni: [],
    cancionAntes: false,
    cancionAhora: false,
  };
  return { estado: e, eventos: reemplazarEn(c, elegidos) };
}
