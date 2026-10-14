// The machine's brain: simple but not silly. Everything is deterministic given the `rnd`
// function (a () => number in [0,1), e.g. crearRnd(seed) from azar.ts).
//  - eleccionBot: estimates the real damage of each move on each rival (without dice), prefers
//    kills, weak targets and super-effective moves, adds noise so the bots do not all gang up on
//    the same rival, uses the caña when low, now and then buffs/inflicts statuses, rarely switches
//    out of a ×4 weakness, and acts from the grada when eliminated.
//    Objects: only the obvious (the Pañuelo's +20 % goes into its damage estimates); what to take in «La barra» is `objetoBot` (objetos.ts).
//    Tanda 6: it protects itself (Esconderse, ¡Que pague otro!, Aguantar el tipo) when two or more rivals hit it last turn or it is low
//    and threatened, uses the quick moves (+1) to finish off a rival, and Devolvérsela when it expects to be hit.
//  - pickBot: picks in the draft by raw quality plus type variety.
//  - reemplazoBot: who comes in after a fall.
//  - salidaBot: which userito starts the battle (type matchup against the rivals' whole teams).
import type { Eleccion, EstadoCombate, EstadoDraft, Stat, Tipo, Userito } from '../tipos';
import { TIPOS_FISICOS } from '../tipos';
import { EFECTOS, ESPECIE, MOVS, eficacia } from '../datos';
import { activo, calcularDano, enGrada, eliminado, hayDeSuceso, multNivel, multObjeto, multSuceso, potenciaDe, puedeCambiar, recienDespierto, rivalesEnPie, vivos } from './combate';
import { disponibles, turnoDraft } from './draft';

type Rnd = () => number;

const tiposDe = (u: Userito) => ESPECIE[u.especie].tipos;

/** How hard the best STAB attack of type(s) `atacante` hits a userito: 0..4. */
function amenaza(atacante: Userito, victima: Userito): number {
  return Math.max(...tiposDe(atacante).map((t) => eficacia(t, tiposDe(victima))));
}

interface Valor {
  valor: number;
  objetivo?: number;
}

/** How worried the machine is about the coming turn (`golpeado`: rivals that hit it last turn; `peligro`: a rival, or two together, could take it down). */
interface Presion {
  golpeado: number;
  peligro: boolean;
}

function presion(e: EstadoCombate, j: number, rivales: number[]): Presion {
  const u = activo(e, j);
  const mejores = rivales.map((r) => {
    const a = activo(e, r);
    let top = 0;
    for (const id of ESPECIE[a.especie].movs) {
      const mv = MOVS[id];
      if (mv.pot !== null) top = Math.max(top, calcularDano(a, u, mv, { pot: potenciaDe(a, mv), todos: mv.objetivo === 'todos', mult: multSuceso(e, mv.tipo) * multObjeto(a, mv) }).dano);
    }
    return top;
  });
  const total = mejores.reduce((x, y) => x + y, 0);
  return { golpeado: e.agresores[j].length, peligro: Math.max(0, ...mejores) >= u.ps || total / 2 >= u.ps };
}

function valorMovimiento(e: EstadoCombate, j: number, idx: number, rivales: number[], peso: Record<number, number>, rnd: Rnd, pres: Presion): Valor {
  const u = activo(e, j);
  const id = ESPECIE[u.especie].movs[idx];
  const m = MOVS[id];
  const ef = EFECTOS[id] ?? {};
  const hp = u.ps / u.psMax;
  const acc = m.prec === null ? 1 : Math.min(1, (m.prec / 100) * multNivel(u.niveles.prec));
  const sinEstado = (r: number) => !activo(e, r).estado;

  // Damaging moves.
  if (m.pot !== null || ef.especial === 'premio') {
    const golpes = ef.golpes === 'multi' ? 3.1 : (ef.golpes ?? 1);
    const pot0 = ef.especial === 'premio' ? 67 : potenciaDe(u, m);
    let mejor: Valor = { valor: 0 };
    let suma = 0;
    for (const r of rivales) {
      const v = activo(e, r);
      let pot = pot0;
      if (ef.especial === 'venganza' && e.agresores[j].includes(r)) pot *= 2;
      if (ef.especial === 'cancion' && e.cancionAntes) pot *= 2;
      const { dano } = calcularDano(u, v, m, { pot, todos: m.objetivo === 'todos' && !hayDeSuceso(e, 'karaoke'), mult: multSuceso(e, m.tipo) * multObjeto(u, m) });
      const total = dano * golpes;
      const frac = Math.min(1, total / v.ps);
      let val = acc * frac * (total >= v.ps ? 1.6 : 1) * (1 + (1 - v.ps / v.psMax) * 0.4);
      // A quick move (+1) that can finish the rival off before it acts or escapes.
      if ((m.prioridad ?? 0) > 0 && total >= v.ps) val *= 1.5;
      if (ef.estado && sinEstado(r)) val += (acc * ef.estado.prob) / 100 * 0.12;
      val *= peso[r];
      if (m.objetivo === 'todos') suma += val;
      else if (val > mejor.valor) mejor = { valor: val, objetivo: r };
    }
    let valor = m.objetivo === 'todos' ? suma : mejor.valor;
    if (ef.recarga) valor *= 0.6;
    if (ef.rebote) valor *= 0.9;
    if (ef.drena) valor *= 1 + (1 - hp) * 0.3;
    if (ef.nivel?.some((n) => n.a === 'yo' && n.cambio > 0)) valor *= 1.08;
    if (ef.especial === 'tendedero') {
      // Hit and run: it goes back to the bench if the blow lands, so it is worth most when it is threatened or hurt and has somebody to send in
      // (and not when it would throw away stat boosts or leave the only one standing).
      const q = e.jugadores[j];
      const banco = vivos(q).length > 1;
      const amenazado = pres.peligro || pres.golpeado >= 2 || hp < 0.5;
      const subidas = (Object.values(u.niveles) as number[]).reduce((n, x) => n + Math.max(0, x), 0);
      if (!banco) valor *= 0.9;
      else if (amenazado) valor += 0.3 + (1 - hp) * 0.2;
      else valor *= subidas >= 2 ? 0.7 : 0.9;
    }
    return { valor, objetivo: mejor.objetivo };
  }

  // Status and self moves.
  let valor = 0;
  let objetivo: number | undefined;
  const candidato = (f: (r: number) => number) => {
    for (const r of rivales) {
      const v = f(r) * acc * peso[r];
      if (v > (objetivo === undefined ? 0 : valor) || objetivo === undefined) {
        valor = v;
        objetivo = r;
      }
    }
  };
  switch (ef.especial) {
    case 'esconderse':
    case 'quepague':
    case 'aguantar': {
      // Protections: worth it when it is being ganged up on, or low and threatened; a second one in a row fails half of the times.
      const apuro = pres.golpeado >= 2 || (hp < 0.4 && pres.peligro) || (pres.golpeado >= 1 && hp < 0.25);
      if (ef.especial === 'esconderse') valor = apuro ? 0.55 + (1 - hp) * 0.3 : 0.08;
      else if (ef.especial === 'quepague') valor = rivales.length < 2 ? 0 : pres.golpeado >= 2 ? 0.8 : pres.golpeado === 1 && hp < 0.5 ? 0.45 : 0.05;
      else valor = hp < 0.45 && pres.peligro ? 0.65 + (0.45 - hp) : apuro ? 0.4 : 0.04;
      if (u.vol.protegidoAntes) valor *= 0.4;
      break;
    }
    case 'devolver':
      // It goes last and returns 1.5 times what it took: good when it expects to be hit (and to survive it).
      valor = pres.golpeado >= 1 && hp > 0.35 ? 0.28 + 0.14 * Math.min(3, pres.golpeado) : 0.05;
      break;
    case 'siesta':
      valor = hp < 0.45 ? 0.5 + (0.45 - hp) : 0;
      break;
    case 'siy':
      valor = e.ultimoMov ? 0.3 : 0;
      objetivo = rivales[Math.floor(rnd() * rivales.length)];
      break;
    case 'remolino':
      candidato((r) => 0.2 + 0.06 * (Object.values(activo(e, r).niveles) as number[]).reduce((s, x) => s + Math.max(0, x), 0));
      break;
    case 'bostezo':
      candidato((r) => (sinEstado(r) && activo(e, r).vol.bostezo < 0 && !recienDespierto(e, activo(e, r)) ? 0.5 : 0));
      break;
    case 'cizana':
      candidato((r) => (activo(e, r).vol.cizana > 0 ? 0 : 0.3));
      break;
    default:
      if (ef.estado) candidato((r) => (ef.estado!.estado === 'achispado' ? (activo(e, r).achispado > 0 ? 0 : 0.45) : sinEstado(r) ? (ef.estado!.estado === 'dormido' ? (recienDespierto(e, activo(e, r)) ? 0 : 0.65) : 0.5) : 0));
      else if (ef.nivel) {
        if (m.objetivo === 'yo') {
          let v = 0;
          for (const n of ef.nivel) {
            const actual = u.niveles[n.stat];
            const util = n.stat === 'ata' ? (TIPOS_FISICOS.includes(m.tipo) || ataqueFisico(u) ? 1 : 0.3) : n.stat === 'def' ? 0.8 : 0.9;
            v += n.cambio * 0.12 * util * (1 - Math.abs(actual) / 6) * (actual * Math.sign(n.cambio) >= 4 ? 0 : 1);
          }
          valor = hp > 0.35 ? Math.max(0, v) : 0;
        } else {
          for (const r of rivales) {
            const v = activo(e, r);
            let s = 0;
            for (const n of ef.nivel) s += Math.abs(n.cambio) * 0.09 * (v.niveles[n.stat as Stat] > -3 ? 1 : 0);
            valor += s * acc * peso[r];
          }
          if (ef.bloqueaCambio) valor += 0.05;
        }
      }
  }
  return { valor, objetivo };
}

function ataqueFisico(u: Userito): boolean {
  const movs = ESPECIE[u.especie].movs.map((id) => MOVS[id]).filter((x) => x.pot !== null);
  return movs.filter((x) => TIPOS_FISICOS.includes(x.tipo)).length >= movs.length / 2;
}

function eleccionGrada(e: EstadoCombate, j: number, rnd: Rnd): Eleccion | null {
  if (!enGrada(e, j)) return null;
  const rivales = rivalesEnPie(e, j);
  const pct = (r: number) => activo(e, r).ps / activo(e, r).psMax;
  if (rnd() < 0.6) {
    // Boo the leader.
    const lider = [...rivales].sort((a, b) => pct(b) - pct(a))[0];
    return { tipo: 'grada', accion: 'abucheo', objetivo: lider };
  }
  return { tipo: 'grada', accion: 'cana', objetivo: rivales[Math.floor(rnd() * rivales.length)] };
}

export function eleccionBot(estado: EstadoCombate, j: number, rnd: Rnd): Eleccion | null {
  if (estado.ganador !== null) return null;
  if (eliminado(estado, j)) return eleccionGrada(estado, j, rnd);
  const q = estado.jugadores[j];
  const u = activo(estado, j);
  if (u.ps <= 0) return null;
  const rivales = rivalesEnPie(estado, j);
  if (!rivales.length) return { tipo: 'atacar', mov: 0 };
  const hp = u.ps / u.psMax;

  if (q.cana && hp < 0.3 && rnd() < 0.85) return { tipo: 'cana' };

  // Switch out of a ×4 weakness (rarely, and only to something that does not suffer the same).
  if (puedeCambiar(estado, j) && rnd() < 0.35) {
    const peor = Math.max(...rivales.map((r) => amenaza(activo(estado, r), u)));
    if (peor >= 4) {
      let mejor = -1;
      let mejorV = Infinity;
      for (const i of vivos(q)) {
        if (i === q.activo) continue;
        const cand = q.equipo[i];
        const w = Math.max(...rivales.map((r) => amenaza(activo(estado, r), cand)));
        if (w < peor && w < mejorV) {
          mejorV = w;
          mejor = i;
        }
      }
      if (mejor >= 0) return { tipo: 'cambiar', a: mejor };
    }
  }

  const peso: Record<number, number> = {};
  for (const r of rivales) peso[r] = 0.8 + rnd() * 0.4;

  const ids = ESPECIE[u.especie].movs;
  const pres = presion(estado, j, rivales);
  let mejor: { idx: number; valor: number; objetivo?: number } | null = null;
  for (let i = 0; i < 4; i++) {
    if (u.pp[i] <= 0) continue;
    const v = valorMovimiento(estado, j, i, rivales, peso, rnd, pres);
    const valor = v.valor * (0.85 + rnd() * 0.3);
    if (!mejor || valor > mejor.valor) mejor = { idx: i, valor, objetivo: v.objetivo };
  }
  if (!mejor) {
    // «A la desesperada» at the weakest rival.
    const debil = [...rivales].sort((a, b) => activo(estado, a).ps - activo(estado, b).ps)[0];
    return { tipo: 'atacar', mov: 0, objetivo: debil };
  }
  const ch: Eleccion = { tipo: 'atacar', mov: mejor.idx };
  const id = ids[mejor.idx];
  const quiere = MOVS[id].objetivo === 'uno' || (id === 'siy' && estado.ultimoMov !== null && MOVS[estado.ultimoMov].objetivo === 'uno');
  if (quiere) ch.objetivo = mejor.objetivo ?? rivales[Math.floor(rnd() * rivales.length)];
  return ch;
}

/** Who comes in after a fall: HP, damage it could do to the rivals and how afraid of them it should be. Deterministic. */
export function reemplazoBot(estado: EstadoCombate, j: number): number {
  const q = estado.jugadores[j];
  // A userito that is still standing is leaving the field (Al tendedero): it cannot be the one that comes in.
  const candidatos = vivos(q).filter((i) => i !== q.activo || q.equipo[i].ps <= 0);
  if (!candidatos.length) return 0;
  const rivales = rivalesEnPie(estado, j);
  let mejor = candidatos[0];
  let mejorV = -Infinity;
  for (const i of candidatos) {
    const cand = q.equipo[i];
    let ofensiva = 0;
    let miedo = 0;
    for (const r of rivales) {
      const v = activo(estado, r);
      let top = 0;
      for (const id of ESPECIE[cand.especie].movs) {
        const m = MOVS[id];
        if (m.pot === null) continue;
        top = Math.max(top, Math.min(1, calcularDano(cand, v, m, { pot: potenciaDe(cand, m), todos: m.objetivo === 'todos' }).dano / v.ps));
      }
      ofensiva += top;
      miedo = Math.max(miedo, amenaza(v, cand));
    }
    const n = Math.max(1, rivales.length);
    const valor = 0.4 * (cand.ps / cand.psMax) + 0.8 * (ofensiva / n) - 0.15 * miedo;
    if (valor > mejorV) {
      mejorV = valor;
      mejor = i;
    }
  }
  return mejor;
}

/** A draft pick: raw quality (attack, speed, bulk) plus new types versus what it already has, plus noise. */
export function pickBot(draft: EstadoDraft, rnd: Rnd): string {
  const libres = disponibles(draft);
  const yo = turnoDraft(draft);
  const mios = draft.elegidos.filter((_, i) => draft.orden[i] === yo).map((id) => ESPECIE[id]);
  const tiposMios = new Set<Tipo>(mios.flatMap((s) => s.tipos));
  let mejor = libres[0];
  let mejorV = -Infinity;
  for (const id of libres) {
    const s = ESPECIE[id];
    const b = s.base;
    const calidad = (Math.max(b.ata, b.esp) + b.vel * 0.7 + (b.ps + b.def) * 0.4) / 250;
    const nuevos = s.tipos.filter((t) => !tiposMios.has(t)).length;
    const variedad = nuevos * 0.25 - (s.tipos.length - nuevos) * 0.3;
    const valor = calidad + variedad + rnd() * 0.7;
    if (valor > mejorV) {
      mejorV = valor;
      mejor = id;
    }
  }
  return mejor;
}

/**
 * Which of its useritos (index in `equipo`) the machine sends out first. The teams are public after the draft but nobody knows who the
 * rivals lead with, so each candidate is scored against all the useritos of all the rival teams: how hard its best same-type attack hits
 * them minus how hard theirs hit it (a ×0 counts as a wall, a ×4 as a risk), plus a little noise so the machines do not all open alike.
 */
export function salidaBot(equipo: readonly string[], rivales: readonly (readonly string[])[], rnd: Rnd): number {
  const contra = rivales.flat();
  let mejor = 0;
  let mejorV = -Infinity;
  for (let i = 0; i < Math.min(3, equipo.length); i++) {
    const mios = ESPECIE[equipo[i]].tipos;
    let v = 0;
    for (const r of contra) {
      const suyos = ESPECIE[r].tipos;
      v += Math.max(...mios.map((t) => eficacia(t, suyos))) - Math.max(...suyos.map((t) => eficacia(t, mios)));
    }
    v = (contra.length ? v / contra.length : 0) + rnd() * 0.25;
    if (v > mejorV) {
      mejorV = v;
      mejor = i;
    }
  }
  return mejor;
}
