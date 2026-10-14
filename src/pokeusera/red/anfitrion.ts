// PokéUsera · online, the host's side. The host's browser runs the whole game (`Partida`): its own
// seat is 'local' (the same screens as solo play), every guest's seat is 'remoto' (answered from
// the network) and the empty seats are machines. Every hook of the Partida is also broadcast so
// the guests can play the same thing on their screens. After each part of the battle the host
// waits (at most ESPERA_LISTOS) for every guest to say «listo» (it finished playing it) before it
// opens the next turn, so nobody is asked a question while still watching the last one; a guest
// that is still late then gets extra time (GRACIA_TARDE) on top of the usual deadline.
//
// The objects of «La barra» are secret: each guest is asked about theirs privately ('barra', addressed to that guest only), and the
// states that travel to the guests (inicio, turno, reemplazo, fin) are sent one by one, each without the other players' objects that
// have not worked yet (`ocultarObjetos`); the 'objeto' event reveals one when it works. The host's own browser holds the whole state
// (it runs the game) but its screens only draw the objects that were revealed.
import { ENTRENADORES, OBJETOS, type Eleccion, type EntrenadorId, type EstadoCombate, type ObjetoId } from '../tipos';
import { crearRnd } from '../motor/azar';
import { equipos as equiposDraft } from '../motor/draft';
import { eleccionBot, pickBot, reemplazoBot, salidaBot } from '../motor/bot';
import { objetoBot, ocultarObjetos } from '../motor/objetos';
import { Partida, esCancelada, type Asiento, type Ganchos } from '../partida';
import { pantalla } from '../pantalla';
import { sonido } from '../sonido';
import { escenarioElegido } from '../pantallas/ajustes';
import { VistaBarra } from '../pantallas/barra';
import { VistaCombate } from '../pantallas/combate';
import { VistaDraft } from '../pantallas/draft';
import { VistaSalida } from '../pantallas/salida';
import { pantallaPodio } from '../pantallas/podio';
import { nombreEnt, t } from '../pantallas/ui';
import type { Conexion } from './conexion';
import type { FinOnline, MsgAnfitrion, MsgInvitado } from './mensajes';

// ---------------------------------------------------------------- the guests' answers

interface Espera {
  seat: number;
  res: (v: never) => void;
  /** What the machine answers if the guest leaves while we wait. */
  alternativa: () => unknown;
}

/**
 * Where the guests' answers arrive. An answer is addressed to a precise question (`pick:seat:n`,
 * `eleccion:seat:turno`, `reemplazo:seat:turno`), so an old one never counts for a new question.
 * An answer that comes before the question is asked is kept for it.
 */
class Buzon {
  private esperas = new Map<string, Espera>();
  private llegadas = new Map<string, unknown>();

  esperar<T>(clave: string, seat: number, alternativa: () => T): Promise<T> {
    if (this.llegadas.has(clave)) {
      const v = this.llegadas.get(clave) as T;
      this.llegadas.delete(clave);
      return Promise.resolve(v);
    }
    return new Promise<T>((res) => this.esperas.set(clave, { seat, res: res as (v: never) => void, alternativa }));
  }

  entregar(clave: string, valor: unknown) {
    const e = this.esperas.get(clave);
    if (e) {
      this.esperas.delete(clave);
      e.res(valor as never);
    } else if (this.llegadas.size < 64) this.llegadas.set(clave, valor);
  }

  /** The guest of `seat` left: whoever waited for them gets the machine's answer. */
  soltar(seat: number) {
    for (const [clave, e] of [...this.esperas]) {
      if (e.seat !== seat) continue;
      this.esperas.delete(clave);
      e.res(e.alternativa() as never);
    }
  }
}

/** How long the host waits, after finishing its own animation, for the guests to finish theirs. */
const ESPERA_LISTOS = 20000;
/** Extra time for the answer of a guest that was not ready when the question opened. */
const GRACIA_TARDE = 20000;

const esEntero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** A guest's choice in «La barra», cleaned up (undefined: nonsense; the Partida also checks it against the offers). */
function objetoLimpio(d: unknown): { objeto: ObjetoId; idx: number } | undefined {
  const e = d as { objeto?: unknown; idx?: unknown } | null;
  if (!e || typeof e !== 'object') return undefined;
  const objeto = OBJETOS.find((o) => o === e.objeto);
  return objeto && esEntero(e.idx) && e.idx >= 0 && e.idx < 3 ? { objeto, idx: e.idx } : undefined;
}

/** A guest's choice, cleaned up so nothing odd reaches the engine (null = «nothing»). */
function eleccionLimpia(v: unknown, n: number): Eleccion | null | undefined {
  if (v === null) return null;
  if (!v || typeof v !== 'object') return undefined;
  const e = v as Record<string, unknown>;
  const jugador = (x: unknown) => (esEntero(x) && x >= 0 && x < n ? x : undefined);
  switch (e.tipo) {
    case 'atacar':
      return { tipo: 'atacar', mov: esEntero(e.mov) ? e.mov : 0, objetivo: jugador(e.objetivo) };
    case 'cambiar':
      return esEntero(e.a) ? { tipo: 'cambiar', a: e.a } : undefined;
    case 'cana':
      return { tipo: 'cana' };
    case 'grada': {
      const objetivo = jugador(e.objetivo);
      return objetivo === undefined ? undefined : { tipo: 'grada', accion: e.accion === 'abucheo' ? 'abucheo' : 'cana', objetivo };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------- the host

/**
 * Runs the games of the room until the host goes back to it (`sala`), leaves (`menu`) or the
 * connection is lost (`cerrada`). `relleno`: fill the empty seats (up to four) with machines.
 */
export async function jugarAnfitrion(con: Conexion, relleno: boolean): Promise<FinOnline> {
  // Seats: the players who picked a trainer, in room-id order, then the machines.
  const humanos = con.jugadores.filter((j) => j.pj !== null).sort((a, b) => a.id - b.id);
  const asientos: Asiento[] = [];
  /** Room id of the player in each seat (−1 for a machine). */
  const idDe: number[] = [];
  for (const h of humanos) {
    const pj = h.pj as EntrenadorId;
    asientos.push({ tipo: h.id === con.id ? 'local' : 'remoto', entrenador: pj, nombre: nombreEnt(pj) });
    idDe.push(h.id);
  }
  if (relleno) {
    for (const pj of ENTRENADORES.filter((e) => !asientos.some((a) => a.entrenador === e))) {
      if (asientos.length >= 4) break;
      asientos.push({ tipo: 'bot', entrenador: pj, nombre: nombreEnt(pj) });
      idDe.push(-1);
    }
  }
  if (asientos.length < 2) {
    con.enviar({ tipo: 'volver' });
    return 'sala';
  }
  const miSeat = idDe.indexOf(con.id) >= 0 ? idDe.indexOf(con.id) : null;

  let perdida = false;
  let alPerder: () => void = () => undefined;
  const cuandoPerdida = new Promise<'cerrada'>((res) => {
    alPerder = () => {
      perdida = true;
      res('cerrada');
    };
  });
  const offPerdida = con.on('perdida', () => alPerder());

  try {
    for (;;) {
      const r = await unaPartida(con, asientos, idDe, miSeat, cuandoPerdida, () => perdida);
      if (r !== 'otra') return r;
    }
  } finally {
    offPerdida();
  }
}

async function unaPartida(
  con: Conexion,
  asientos: Asiento[],
  idDe: number[],
  miSeat: number | null,
  cuandoPerdida: Promise<'cerrada'>,
  seHaPerdido: () => boolean,
): Promise<FinOnline | 'otra'> {
  const p = pantalla();
  const n = asientos.length;
  const buzon = new Buzon();
  const rnd = crearRnd((Date.now() ^ 0x2545f491) & 0x7fffffff);
  const enviar = (d: MsgAnfitrion) => con.juego('todos', d);
  /** A message that carries the state: each player gets it without the objects they must not see yet (those still unrevealed). */
  const enviarConEstado = (hacer: (estado: EstadoCombate) => MsgAnfitrion, estado: EstadoCombate) => {
    if (ocultarObjetos(estado, null) === estado) return enviar(hacer(estado));
    for (const j of con.jugadores) {
      if (j.id === con.id) continue;
      const seat = idDe.indexOf(j.id);
      con.juego(j.id, hacer(ocultarObjetos(estado, seat >= 0 ? seat : null)));
    }
  };
  let fase: 'draft' | 'combate' | 'podio' = 'draft';
  let enDraft = false;
  /** The turn the guests were last asked about (the 'turno' message carries it). */
  let turnoPide = 0;
  let abandonada = false;
  // «Listo» bookkeeping: how many parts of the battle have been sent, and how many each guest says it has played.
  const idJuego = Math.floor(rnd() * 2 ** 30) + 1;
  let enviados = 0;
  const listos = new Map<number, number>();
  let despertar: (() => void) | null = null;
  const remotoAtrasado = (seat: number) => asientos[seat].tipo === 'remoto' && (listos.get(seat) ?? 0) < enviados;
  /** Waits until every guest has played what was sent (or `ESPERA_LISTOS` passes, or they leave). */
  const esperarListos = async () => {
    const limite = Date.now() + ESPERA_LISTOS;
    for (;;) {
      const resta = limite - Date.now();
      if (resta <= 0 || !asientos.some((_, s) => remotoAtrasado(s))) return;
      await new Promise<void>((res) => {
        const timer = setTimeout(res, resta);
        despertar = () => {
          clearTimeout(timer);
          res();
        };
      });
    }
  };

  /** The teams of the other seats (what the machine looks at when it picks the opener for a guest who left). */
  const salidaRivales = (j: number): string[][] => (partida.draft ? equiposDraft(partida.draft, n).filter((_e, k) => k !== j) : []);

  const vd = new VistaDraft(asientos, miSeat);
  const vc = new VistaCombate(miSeat);
  const vb = new VistaBarra(miSeat !== null ? asientos[miSeat].entrenador : null);
  const vs = new VistaSalida(miSeat !== null ? asientos[miSeat].entrenador : null);

  const ganchos: Ganchos = {
    pedirPick: () => vd.pedirPick(),
    pedirEleccion: (j, estado, ms) => vc.pedirEleccion(j, estado, ms),
    pedirReemplazo: (j, estado, ms) => vc.pedirReemplazo(j, estado, ms),
    pedirObjeto: (_j, ofertas, especies, ms) => {
      p.poner(vb);
      return vb.pedir(ofertas, especies, ms);
    },
    pedirSalida: (_j, especies, objetos, ms) => {
      p.poner(vs);
      return vs.pedir(especies, objetos, ms);
    },
    remoto: {
      pedirPick: (j, draft) => buzon.esperar(`pick:${j}:${draft.elegidos.length}`, j, () => pickBot(draft, rnd)),
      pedirEleccion: (j, estado) => buzon.esperar<Eleccion | null>(`eleccion:${j}:${estado.turno}`, j, () => eleccionBot(estado, j, rnd)),
      pedirReemplazo: (j, estado) => buzon.esperar(`reemplazo:${j}:${estado.turno}`, j, () => reemplazoBot(estado, j)),
      // Only that guest is told what is on offer (and their team); the answer comes back as 'objeto'.
      pedirObjeto: (j, ofertas, especies, ms) => {
        con.juego(idDe[j], { k: 'barra', ofertas, especies, plazoMs: ms } satisfies MsgAnfitrion);
        return buzon.esperar(`objeto:${j}`, j, () => objetoBot(especies, ofertas, rnd));
      },
      // Likewise «¿Quién sale primero?»: only that guest is asked (with the objects on their team); the answer comes back as 'salida'.
      pedirSalida: (j, especies, objetos, ms) => {
        con.juego(idDe[j], { k: 'salida', especies, objetos, plazoMs: ms } satisfies MsgAnfitrion);
        return buzon.esperar(`salida:${j}`, j, () => salidaBot(especies, salidaRivales(j), rnd));
      },
    },
    alDraft: (draft, turnoDe, ms) => {
      enviar({ k: 'draft', draft, turnoDe, plazoMs: ms });
      if (!enDraft) {
        enDraft = true;
        sonido.musica('draft');
        p.poner(vd);
      }
      return vd.alDraft(draft, turnoDe, ms);
    },
    graciaExtraMs: (j) => (remotoAtrasado(j) ? GRACIA_TARDE : 0),
    alInicio: async (estado) => {
      fase = 'combate';
      enviarConEstado((e) => ({ k: 'inicio', estado: e }), estado);
      enviados++;
      p.poner(vc);
      await vc.alInicio(estado);
      await esperarListos();
    },
    alPide: (estado, ms, quienes) => {
      turnoPide = estado.turno;
      enviar({ k: 'pide', turno: estado.turno, quienes, plazoMs: ms });
    },
    alTurno: async (eventos, estado) => {
      enviarConEstado((e) => ({ k: 'turno', turno: turnoPide, eventos, estado: e }), estado);
      enviados++;
      await vc.alTurno(eventos, estado);
      if (estado.ganador === null) await esperarListos();
    },
    alPideReemplazo: (_estado, ms, quienes) => enviar({ k: 'pideRemp', quienes, plazoMs: ms }),
    alReemplazo: async (eventos, estado) => {
      enviarConEstado((e) => ({ k: 'reemplazo', eventos, estado: e }), estado);
      enviados++;
      await vc.alReemplazo(eventos, estado);
      await esperarListos();
    },
    alFin: (estado) => {
      enviarConEstado((e) => ({ k: 'fin', estado: e }), estado);
      return vc.alFin(estado);
    },
  };
  // The bar of the battles is the host's setting (AJUSTES → ESCENARIO; at random by default).
  const partida = new Partida(asientos, ganchos, { escenario: escenarioElegido() });
  vd.escenario = partida.escenario;
  (window as unknown as { __pokeusera?: unknown }).__pokeusera = { partida, vc, vd, vb, vs };
  vd.alAbandonar = vb.alAbandonar = vs.alAbandonar = vc.alAbandonar = () => {
    abandonada = true;
    partida.cancelar();
  };

  // A guest's answers.
  const offJuego = con.on('juego', (m) => {
    const seat = idDe.indexOf(m.de);
    if (seat < 0 || asientos[seat].tipo !== 'remoto') return;
    const d = m.datos as MsgInvitado | null;
    if (!d || typeof d !== 'object') return;
    if (d.k === 'listo') {
      if (d.g === idJuego && esEntero(d.n) && d.n > (listos.get(seat) ?? 0)) {
        listos.set(seat, d.n);
        despertar?.();
      }
    } else if (d.k === 'pick') {
      if (typeof d.especie === 'string' && esEntero(d.n)) buzon.entregar(`pick:${seat}:${d.n}`, d.especie);
    } else if (d.k === 'eleccion') {
      const e = esEntero(d.turno) ? eleccionLimpia(d.eleccion, n) : undefined;
      if (e !== undefined) buzon.entregar(`eleccion:${seat}:${d.turno}`, e);
    } else if (d.k === 'objeto') {
      const el = objetoLimpio(d);
      if (el) buzon.entregar(`objeto:${seat}`, el);
    } else if (d.k === 'salida') {
      if (esEntero(d.idx) && d.idx >= 0 && d.idx < 3) buzon.entregar(`salida:${seat}`, d.idx);
    } else if (d.k === 'reemplazoIdx') {
      if (esEntero(d.turno) && esEntero(d.idx)) buzon.entregar(`reemplazo:${seat}:${d.turno}`, d.idx);
    }
  });
  // A guest leaves: the machine plays for them from now on, and everybody is told.
  const offSalio = con.on('salio', (m) => {
    const seat = idDe.indexOf(m.id);
    if (seat < 0 || asientos[seat].tipo !== 'remoto') return;
    asientos[seat].tipo = 'bot';
    const nombre = asientos[seat].nombre;
    buzon.soltar(seat);
    despertar?.();
    enviar({ k: 'salio', seat, nombre });
    const linea = t('online.salio', { nombre });
    if (fase === 'draft') vd.aviso(linea);
    else if (fase === 'combate') vc.aviso(linea);
  });
  const soltar = () => {
    offJuego();
    offSalio();
  };

  const seats: Record<string, number> = {};
  idDe.forEach((id, seat) => {
    if (id >= 0) seats[String(id)] = seat;
  });
  enviar({ k: 'asientos', id: idJuego, asientos: asientos.map((a) => ({ entrenador: a.entrenador, nombre: a.nombre, bot: a.tipo === 'bot' })), seats, escenario: partida.escenario });

  try {
    const jugando = partida.jugar();
    jugando.catch(() => undefined);
    const r = await Promise.race([jugando, cuandoPerdida]);
    if (r === 'cerrada') {
      partida.cancelar();
      return 'cerrada';
    }
    fase = 'podio';
    const podio = pantallaPodio(r, miSeat);
    const salida = await Promise.race([podio, cuandoPerdida]);
    if (salida === 'cerrada') return 'cerrada';
    if (salida === 'otra') {
      enviar({ k: 'otra' });
      return 'otra';
    }
    con.enviar({ tipo: 'volver' });
    return 'sala';
  } catch (e) {
    if (esCancelada(e)) {
      if (seHaPerdido()) return 'cerrada';
      // ABANDONAR: leaving closes the room for everybody.
      if (abandonada) con.cerrar();
      return 'menu';
    }
    throw e;
  } finally {
    soltar();
  }
}
