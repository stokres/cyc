// PokéUsera's online connection (docs/POKEUSERA.md, «Online»; copied from the Pang's): a thin wrapper over the room's WebSocket.
// It only carries messages; the game itself is run by the host's browser.
import { MODOS_JUEGO, type EntrenadorId as PjId, type ModoJuego } from '../tipos';
import { nombreLocal } from '../cuentas/almacen';
import { leerMensajeCuenta, nombreDeCuenta } from '../cuentas/sala';
import { VELOCIDADES, cfg, type Velocidad } from '../pantallas/ui';

// ---------------------------------------------------------------- messages

export interface JugadorSala {
  id: number;
  pj: PjId | null;
  anfitrion: boolean;
}

export type MotivoRechazo = 'clave' | 'llena' | 'en-partida';

/** Browser → server. */
export type MensajeCliente =
  | { tipo: 'entrar'; clave: string }
  | { tipo: 'elegir'; pj: PjId | null }
  | { tipo: 'empezar' }
  | { tipo: 'volver' }
  | { tipo: 'juego'; a: 'anfitrion' | 'todos' | number; datos: unknown };

export interface MsgBienvenida {
  tipo: 'bienvenida';
  id: number;
  anfitrion: boolean;
}
export interface MsgRechazo {
  tipo: 'rechazo';
  motivo: MotivoRechazo;
}
export interface MsgSala {
  tipo: 'sala';
  jugadores: JugadorSala[];
  enPartida: boolean;
}
export interface MsgEmpezar {
  tipo: 'empezar';
}
export interface MsgVolver {
  tipo: 'volver';
}
export interface MsgJuego {
  tipo: 'juego';
  de: number;
  datos: unknown;
}
export interface MsgSalio {
  tipo: 'salio';
  id: number;
}
export interface MsgCerrada {
  tipo: 'cerrada';
}
/** Not sent by the server: the socket closed when nobody asked it to (and the room was not closed). */
export interface MsgPerdida {
  tipo: 'perdida';
}

/** Server → browser (plus the local `perdida`). */
export type MensajeServidor = MsgBienvenida | MsgRechazo | MsgSala | MsgEmpezar | MsgVolver | MsgJuego | MsgSalio | MsgCerrada | MsgPerdida;

type Tipos = { [M in MensajeServidor as M['tipo']]: M };

export type ResultadoEntrada = { ok: true; id: number; anfitrion: boolean } | { ok: false; motivo: MotivoRechazo | 'red' };

// ---------------------------------------------------------------- connection

const ESPERA_MS = 8000;

export class Conexion {
  /** My id in the room, once `entrar` worked. */
  id = -1;
  anfitrion = false;
  /** The latest `sala` message. */
  jugadores: JugadorSala[] = [];
  enPartida = false;
  /** Host only: the account (token and name) each guest told us about on entering, by room id (docs/POKEUSERA.md, «Cuentas»). Never shown. */
  readonly cuentas = new Map<number, { token: string; nombre: string }>();
  /** Guest only: the account names of the room by room id, as the host announced them with the mode (names only, never tokens). */
  private readonly nombres = new Map<number, string>();
  /** The room's way of playing (docs/POKEUSERA.md, «Modo AL AZAR»): the host's choice, which `anunciarModo` sends; a guest learns it from the host's 'modo' message (NORMAL until then). */
  modo: ModoJuego = 'normal';
  /** The battle speed of the room: the host's choice (it starts as his own setting), the same for everybody; a guest learns it from the host's 'modo' message. */
  velocidad: Velocidad = cfg.velocidad;

  private ws: WebSocket | null = null;
  private oyentes = new Map<string, Set<(m: never) => void>>();
  /** Set when we close on purpose, or the server told us the room is over. */
  private terminada = false;

  /** Subscribes to one kind of message. Returns the function that unsubscribes. */
  on<T extends keyof Tipos>(tipo: T, f: (m: Tipos[T]) => void): () => void {
    let s = this.oyentes.get(tipo);
    if (!s) this.oyentes.set(tipo, (s = new Set()));
    s.add(f as (m: never) => void);
    return () => void s.delete(f as (m: never) => void);
  }

  /** Opens the socket and asks to join. Never rejects. */
  entrar(clave: string): Promise<ResultadoEntrada> {
    return new Promise<ResultadoEntrada>((resolver) => {
      let respondido = false;
      const fin = (r: ResultadoEntrada) => {
        if (respondido) return;
        respondido = true;
        clearTimeout(espera);
        if (!r.ok) {
          this.terminada = true;
          this.ws?.close();
        }
        resolver(r);
      };
      const espera = window.setTimeout(() => fin({ ok: false, motivo: 'red' }), ESPERA_MS);
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/sala`);
      } catch {
        return fin({ ok: false, motivo: 'red' });
      }
      this.ws = ws;
      ws.addEventListener('open', () => this.enviar({ tipo: 'entrar', clave }));
      ws.addEventListener('message', (e) => {
        const m = this.leer(e.data);
        if (!m) return;
        if (!respondido) {
          if (m.tipo === 'bienvenida') {
            this.id = m.id;
            this.anfitrion = m.anfitrion;
            return fin({ ok: true, id: m.id, anfitrion: m.anfitrion });
          }
          if (m.tipo === 'rechazo') return fin({ ok: false, motivo: m.motivo });
          return;
        }
        this.recibir(m);
      });
      ws.addEventListener('error', () => {
        if (!respondido) fin({ ok: false, motivo: 'red' });
      });
      ws.addEventListener('close', () => {
        if (!respondido) return fin({ ok: false, motivo: 'red' });
        if (this.terminada) return;
        this.terminada = true;
        this.emitir({ tipo: 'perdida' });
      });
    });
  }

  enviar(m: MensajeCliente) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  /** Game traffic: to the host only, to everybody else, or (host only) to the player with this room id (what only they may see). */
  juego(a: 'anfitrion' | 'todos' | number, datos: unknown) {
    this.enviar({ tipo: 'juego', a, datos });
  }

  /** The account name of somebody in the room (for the lobby), or null if there is none to show: my own, the host's `cuentas` or, for a guest, what the host announced. */
  nombreDe(id: number): string | null {
    if (id === this.id) return nombreDeCuenta(nombreLocal());
    return nombreDeCuenta(this.anfitrion ? this.cuentas.get(id)?.nombre : this.nombres.get(id));
  }

  /** Host only: the account names of the room, keyed by room id, as sent in the 'modo' message (what the lobby shows; the tokens never travel). */
  private nombresSala(): Record<number, string> {
    const r: Record<number, string> = {};
    for (const j of this.jugadores) {
      const n = this.nombreDe(j.id);
      if (n) r[j.id] = n;
    }
    return r;
  }

  /** Host only: tells the room the mode and the account names (the guests see them in the lobby). Sent again whenever somebody joins or tells us their name. */
  anunciarModo() {
    if (this.anfitrion) this.juego('todos', { k: 'modo', modo: this.modo, velocidad: this.velocidad, nombres: this.nombresSala() });
  }

  /** Leaves on purpose (no `perdida`). */
  cerrar() {
    this.terminada = true;
    this.ws?.close();
    this.ws = null;
  }

  private leer(crudo: unknown): MensajeServidor | null {
    if (typeof crudo !== 'string') return null;
    try {
      const m = JSON.parse(crudo) as MensajeServidor;
      return m && typeof m === 'object' && typeof m.tipo === 'string' ? m : null;
    } catch {
      return null;
    }
  }

  private recibir(m: MensajeServidor) {
    if (m.tipo === 'sala') {
      this.jugadores = m.jugadores;
      this.enPartida = m.enPartida;
    } else if (m.tipo === 'cerrada') {
      this.terminada = true;
    } else if (m.tipo === 'juego') {
      const c = leerMensajeCuenta(m.datos);
      if (c) this.cuentas.set(m.de, c);
      // The host's mode, from the host only (a guest's message is nothing to believe).
      const d = m.datos as { k?: unknown; modo?: unknown; velocidad?: unknown; nombres?: unknown } | null;
      if (d && typeof d === 'object' && d.k === 'modo' && MODOS_JUEGO.includes(d.modo as ModoJuego) && this.jugadores.find((j) => j.anfitrion)?.id === m.de) {
        this.modo = d.modo as ModoJuego;
        if (VELOCIDADES.includes(d.velocidad as Velocidad)) this.velocidad = d.velocidad as Velocidad;
        this.nombres.clear();
        if (d.nombres && typeof d.nombres === 'object') {
          for (const [k, v] of Object.entries(d.nombres)) {
            const n = nombreDeCuenta(v);
            if (n && Number.isInteger(Number(k))) this.nombres.set(Number(k), n);
          }
        }
      }
    } else if (m.tipo === 'salio') {
      this.cuentas.delete(m.id);
      this.nombres.delete(m.id);
    }
    this.emitir(m);
  }

  private emitir(m: MensajeServidor) {
    // A copy, so a handler may unsubscribe while we are going through them.
    for (const f of [...(this.oyentes.get(m.tipo) ?? [])]) (f as (m: MensajeServidor) => void)(m);
  }
}
