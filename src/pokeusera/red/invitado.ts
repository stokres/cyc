// PokéUsera · online, a guest's side. Nothing is decided here: the host's messages drive the same
// screens as in solo play (VistaDraft, VistaCombate, the podium), one after another through a
// serial queue, and the guest only sends back what its player chose. A guest that falls behind
// catches up with fast animations, and a question that the host already settled (it ran out of
// time and moved on) is dropped instead of being sent. After playing each part of the battle the
// guest tells the host «listo»; its own countdown for a choice starts when it is ready to choose.
import type { EstadoCombate } from '../tipos';
import { pantalla } from '../pantalla';
import { sonido } from '../sonido';
import { VistaBarra } from '../pantallas/barra';
import { VistaCombate } from '../pantallas/combate';
import { VistaDraft } from '../pantallas/draft';
import { pantallaPodio } from '../pantallas/podio';
import { cfg, t } from '../pantallas/ui';
import type { Conexion } from './conexion';
import type { FinOnline, MsgAnfitrion, MsgInvitado } from './mensajes';

/** Time taken off the host's clock so the answer arrives before it. */
const MARGEN_MS = 600;
/** A guest is never given less than this to choose a move, however late it plays the turn (the host adds time for a late guest). */
const MIN_ELECCION_MS = 20000;
/** Turns waiting in the queue from which the guest plays fast to catch up. */
const TURNOS_ATRASO = 2;

interface Recibido {
  msg: MsgAnfitrion;
  /** Order of arrival. */
  idx: number;
  /** When it arrived (ms). */
  cuando: number;
}

/** Messages that settle any question asked before them. */
const CIERRAN = new Set<MsgAnfitrion['k']>(['asientos', 'draft', 'inicio', 'turno', 'reemplazo', 'fin', 'otra']);

/** Plays one session as a guest. Resolves when it is over: back to the room, to the menu, or the room is gone. */
export function jugarInvitado(con: Conexion): Promise<FinOnline> {
  return new Promise<FinOnline>((resolver) => {
    const p = pantalla();
    const idAnfitrion = con.jugadores.find((j) => j.anfitrion)?.id ?? 0;
    const rapidoBase = cfg.rapido;
    const offs: Array<() => void> = [];
    let muerto = false;
    const terminar = (r: FinOnline) => {
      if (muerto) return;
      muerto = true;
      cfg.rapido = rapidoBase;
      for (const f of offs) f();
      resolver(r);
    };

    // What the current game looks like from here.
    let vd: VistaDraft | null = null;
    let vc: VistaCombate | null = null;
    let vb: VistaBarra | null = null;
    let miSeat: number | null = null;
    let enDraft = false;
    let fase: 'draft' | 'combate' | 'podio' = 'draft';
    let podioVivo = false;
    let ultimoEstado: EstadoCombate | null = null;
    /** The game the host announced (echoed in `listo`) and how many parts of its battle this guest has played. */
    let idJuego = 0;
    let jugados = 0;
    const listo = () => {
      jugados++;
      if (miSeat !== null) enviar({ k: 'listo', g: idJuego, n: jugados });
    };

    // The queue.
    const cola: Recibido[] = [];
    let bombeando = false;
    let siguienteIdx = 0;
    /** Arrival order of the latest message that settles earlier questions. */
    let ultimoCierre = -1;
    /** The host settled the question asked at `idx` (or a later one): do not answer. */
    const caducada = (idx: number) => ultimoCierre > idx;

    const abandonar = () => {
      con.cerrar();
      terminar('menu');
    };

    const procesar = async ({ msg, idx, cuando }: Recibido) => {
      if (msg.k === 'asientos') {
        miSeat = msg.seats[String(con.id)] ?? null;
        idJuego = msg.id;
        jugados = 0;
        vd = new VistaDraft(msg.asientos, miSeat);
        vc = new VistaCombate(miSeat);
        vb = new VistaBarra(miSeat !== null ? (msg.asientos[miSeat]?.entrenador ?? null) : null);
        vd.escenario = msg.escenario;
        vd.alAbandonar = vc.alAbandonar = vb.alAbandonar = abandonar;
        (window as unknown as { __pokeusera?: unknown }).__pokeusera = { vc, vd, vb, cola };
        enDraft = false;
        fase = 'draft';
        podioVivo = false;
        ultimoEstado = null;
        return;
      }
      if (msg.k === 'otra') {
        podioVivo = false;
        return;
      }
      if (!vd || !vc || !vb) return;
      switch (msg.k) {
        case 'draft': {
          if (!enDraft) {
            enDraft = true;
            sonido.musica('draft');
            p.poner(vd);
          }
          await vd.alDraft(msg.draft, msg.turnoDe, msg.plazoMs);
          if (msg.turnoDe !== null && msg.turnoDe === miSeat && !caducada(idx)) {
            const n = msg.draft.elegidos.length;
            void vd.pedirPick().then((especie) => {
              if (!muerto && !caducada(idx)) enviar({ k: 'pick', n, especie });
            });
          }
          return;
        }
        case 'barra': {
          // «La barra»: only this guest got the offers. The choice goes back as 'objeto'; the 'inicio' that follows settles any question left open.
          if (miSeat === null || caducada(idx)) return;
          const tope = Math.max(1500, msg.plazoMs - MARGEN_MS);
          const resta = Math.min(tope, Math.max(Math.min(MIN_ELECCION_MS, tope), tope - (Date.now() - cuando)));
          p.poner(vb);
          void vb.pedir(msg.ofertas, msg.especies, resta).then((el) => {
            if (!muerto && !caducada(idx)) enviar({ k: 'objeto', objeto: el.objeto, idx: el.idx });
          });
          return;
        }
        case 'inicio':
          fase = 'combate';
          p.poner(vc);
          ultimoEstado = msg.estado;
          await vc.alInicio(msg.estado);
          listo();
          return;
        case 'pide': {
          if (miSeat === null || !msg.quienes.includes(miSeat) || !ultimoEstado || caducada(idx)) return;
          // The countdown is the host's minus what the message waited in the queue, but never under MIN_ELECCION_MS.
          const tope = Math.max(1500, msg.plazoMs - MARGEN_MS);
          const resta = Math.min(tope, Math.max(Math.min(MIN_ELECCION_MS, tope), tope - (Date.now() - cuando)));
          void vc.pedirEleccion(miSeat, ultimoEstado, resta).then((eleccion) => {
            if (!muerto && !caducada(idx)) enviar({ k: 'eleccion', turno: msg.turno, eleccion });
          });
          return;
        }
        case 'turno': {
          await vc.alTurno(msg.eventos, msg.estado);
          ultimoEstado = msg.estado;
          if (msg.estado.ganador === null) listo();
          return;
        }
        case 'pideRemp': {
          if (miSeat === null || !msg.quienes.includes(miSeat) || !ultimoEstado || caducada(idx)) return;
          const turno = ultimoEstado.turno;
          void vc.pedirReemplazo(miSeat, ultimoEstado, Math.max(1500, msg.plazoMs - MARGEN_MS)).then((i) => {
            if (!muerto && !caducada(idx)) enviar({ k: 'reemplazoIdx', turno, idx: i });
          });
          return;
        }
        case 'reemplazo':
          await vc.alReemplazo(msg.eventos, msg.estado);
          ultimoEstado = msg.estado;
          listo();
          return;
        case 'fin': {
          await vc.alFin(msg.estado);
          if (muerto) return;
          fase = 'podio';
          podioVivo = true;
          // Guests only get MENÚ: the host decides whether there is another game.
          void pantallaPodio(msg.estado, miSeat, false, true).then(() => {
            if (muerto || !podioVivo) return;
            con.cerrar();
            terminar('menu');
          });
          return;
        }
        case 'salio': {
          const linea = t('online.salio', { nombre: msg.nombre });
          if (fase === 'draft') vd.aviso(linea);
          else if (fase === 'combate') vc.aviso(linea);
          return;
        }
      }
    };

    const bombear = async () => {
      if (bombeando) return;
      bombeando = true;
      while (cola.length && !muerto) {
        // Far behind: play fast until we are back in step.
        cfg.rapido = rapidoBase || cola.filter((r) => r.msg.k === 'turno' || r.msg.k === 'reemplazo').length > TURNOS_ATRASO;
        const r = cola.shift()!;
        try {
          await procesar(r);
        } catch (e) {
          console.error(e);
        }
      }
      cfg.rapido = rapidoBase;
      bombeando = false;
    };

    const enviar = (d: MsgInvitado) => con.juego('anfitrion', d);

    offs.push(
      con.on('juego', (m) => {
        const d = m.datos as MsgAnfitrion | null;
        if (m.de !== idAnfitrion || !d || typeof d !== 'object' || typeof d.k !== 'string') return;
        const idx = siguienteIdx++;
        if (CIERRAN.has(d.k)) ultimoCierre = idx;
        cola.push({ msg: d, idx, cuando: Date.now() });
        void bombear();
      }),
      con.on('volver', () => terminar('sala')),
      con.on('cerrada', () => terminar('cerrada')),
      con.on('perdida', () => terminar('cerrada')),
    );
  });
}
