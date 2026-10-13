// PokéUsera · online, the host's side. The host's browser runs the whole game (`Partida`): its own
// seat is 'local' (the same screens as solo play), every guest's seat is 'remoto' (answered from
// the network) and the empty seats are machines. Every hook of the Partida is also broadcast so
// the guests can play the same thing on their screens. The host never waits for a guest's
// animations: only for their answers, and only until the deadline the Partida enforces.
import { ENTRENADORES, type Eleccion, type EntrenadorId } from '../tipos';
import { crearRnd } from '../motor/azar';
import { eleccionBot, pickBot, reemplazoBot } from '../motor/bot';
import { vivos } from '../motor/combate';
import { Partida, PLAZO_REEMPLAZO, esCancelada, type Asiento, type Ganchos } from '../partida';
import { pantalla } from '../pantalla';
import { sonido } from '../sonido';
import { VistaCombate } from '../pantallas/combate';
import { VistaDraft } from '../pantallas/draft';
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

const esEntero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

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
  let fase: 'draft' | 'combate' | 'podio' = 'draft';
  let enDraft = false;
  /** The turn the guests were last asked about (the 'turno' message carries it). */
  let turnoPide = 0;
  let abandonada = false;

  const vd = new VistaDraft(asientos, miSeat);
  const vc = new VistaCombate(miSeat);

  const ganchos: Ganchos = {
    pedirPick: () => vd.pedirPick(),
    pedirEleccion: (j, estado, ms) => vc.pedirEleccion(j, estado, ms),
    pedirReemplazo: (j, estado, ms) => vc.pedirReemplazo(j, estado, ms),
    remoto: {
      pedirPick: (j, draft) => buzon.esperar(`pick:${j}:${draft.elegidos.length}`, j, () => pickBot(draft, rnd)),
      pedirEleccion: (j, estado) => buzon.esperar<Eleccion | null>(`eleccion:${j}:${estado.turno}`, j, () => eleccionBot(estado, j, rnd)),
      pedirReemplazo: (j, estado) => buzon.esperar(`reemplazo:${j}:${estado.turno}`, j, () => reemplazoBot(estado, j)),
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
    alInicio: (estado) => {
      fase = 'combate';
      enviar({ k: 'inicio', estado });
      p.poner(vc);
      return vc.alInicio(estado);
    },
    alPide: (estado, ms, quienes) => {
      turnoPide = estado.turno;
      enviar({ k: 'pide', turno: estado.turno, quienes, plazoMs: ms });
    },
    alTurno: (eventos, estado) => {
      const reemplazan = estado.ganador === null ? estado.reemplazos.filter((j) => vivos(estado.jugadores[j]).length > 0) : [];
      enviar({ k: 'turno', turno: turnoPide, eventos, estado, reemplazan, rempMs: PLAZO_REEMPLAZO });
      return vc.alTurno(eventos, estado);
    },
    alReemplazo: (eventos, estado) => {
      enviar({ k: 'reemplazo', eventos, estado });
      return vc.alReemplazo(eventos, estado);
    },
    alFin: (estado) => {
      enviar({ k: 'fin', estado });
      return vc.alFin(estado);
    },
  };
  const partida = new Partida(asientos, ganchos, {});
  (window as unknown as { __pokeusera?: unknown }).__pokeusera = { partida, vc, vd };
  vd.alAbandonar = vc.alAbandonar = () => {
    abandonada = true;
    partida.cancelar();
  };

  // A guest's answers.
  const offJuego = con.on('juego', (m) => {
    const seat = idDe.indexOf(m.de);
    if (seat < 0 || asientos[seat].tipo !== 'remoto') return;
    const d = m.datos as MsgInvitado | null;
    if (!d || typeof d !== 'object') return;
    if (d.k === 'pick') {
      if (typeof d.especie === 'string' && esEntero(d.n)) buzon.entregar(`pick:${seat}:${d.n}`, d.especie);
    } else if (d.k === 'eleccion') {
      const e = esEntero(d.turno) ? eleccionLimpia(d.eleccion, n) : undefined;
      if (e !== undefined) buzon.entregar(`eleccion:${seat}:${d.turno}`, e);
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
  enviar({ k: 'asientos', asientos: asientos.map((a) => ({ entrenador: a.entrenador, nombre: a.nombre, bot: a.tipo === 'bot' })), seats });

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
