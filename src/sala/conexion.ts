// The online rooms of the whole web, the phone's side (docs/SALAS.md): one WebSocket to /sala, the list of open rooms of a game, creating or joining one by code,
// and the messages inside a room. It knows no game (a game puts its own on top: PokéUsera's is src/pokeusera/red/conexion.ts) and only reads the account from src/cuenta/.
import { tokenLocal } from '../cuenta/cuenta';
import { JUEGO_TODOS } from './reglas.mjs';

export { CODIGO_SALA_LARGO, JUEGOS_ONLINE, JUEGO_TODOS, MAX_JUGADORES, MAX_SALAS, SALA_NUEVA, SALAS_EN_WEB, enlaceSala, limpiarCodigoSala } from './reglas.mjs';

// ---------------------------------------------------------------- messages

export interface JugadorSala<Pj extends string = string> {
  id: number;
  /** The character this player picked (each game has its own list), or null. */
  pj: Pj | null;
  anfitrion: boolean;
  /** The account name, or null when the player has none (or the server could not tell). */
  nombre: string | null;
}

/** One line of the list of open rooms. */
export interface InfoSala {
  codigo: string;
  juego: string;
  /** The host's account name. */
  anfitrion: string | null;
  jugadores: number;
  max: number;
  enPartida: boolean;
}

export type MotivoRechazo = 'muchas' | 'noexiste' | 'otrojuego' | 'enpartida' | 'llena' | 'invalido';
export type MotivoCierre = 'anfitrion' | 'inactiva';

/** Browser → server. */
export type MensajeCliente<Pj extends string = string> =
  | { tipo: 'lista'; juego: string }
  | { tipo: 'crear'; juego: string; max: number; token?: string }
  | { tipo: 'unirse'; codigo: string; juego: string; token?: string }
  | { tipo: 'elegir'; pj: Pj | null }
  | { tipo: 'empezar' }
  | { tipo: 'volver' }
  | { tipo: 'juego'; a: 'anfitrion' | 'todos' | number; datos: unknown }
  | { tipo: 'salir' };

export interface MsgSalas {
  tipo: 'salas';
  /** The rooms of the game being watched (of every game when watching all). */
  salas: InfoSala[];
  /** The rooms open in the whole web (all games). */
  abiertas: number;
  /** The most rooms the web allows. */
  max: number;
}
export interface MsgBienvenida {
  tipo: 'bienvenida';
  id: number;
  anfitrion: boolean;
  codigo: string;
  juego: string;
  max: number;
}
export interface MsgRechazo {
  tipo: 'rechazo';
  motivo: MotivoRechazo;
}
export interface MsgSala<Pj extends string = string> {
  tipo: 'sala';
  codigo: string;
  juego: string;
  max: number;
  jugadores: JugadorSala<Pj>[];
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
  motivo: MotivoCierre;
}
/** Not sent by the server: the socket closed when nobody asked it to. */
export interface MsgPerdida {
  tipo: 'perdida';
}

/** Server → browser (plus the local `perdida`). */
export type MensajeServidor<Pj extends string = string> = MsgSalas | MsgBienvenida | MsgRechazo | MsgSala<Pj> | MsgEmpezar | MsgVolver | MsgJuego | MsgSalio | MsgCerrada | MsgPerdida;

type Tipos<Pj extends string> = { [M in MensajeServidor<Pj> as M['tipo']]: M };

export type ResultadoSala = { ok: true } | { ok: false; motivo: MotivoRechazo | 'red' };

// ---------------------------------------------------------------- connection

const ESPERA_MS = 8000;

export class ConexionSala<Pj extends string = string> {
  /** My id in the room I am in, or −1 when I am in the lobby. */
  id = -1;
  anfitrion = false;
  codigo = '';
  /** The game of the room I am in (`juego` is the method that sends game messages). */
  juegoSala = '';
  max = 0;
  /** The latest `sala` message. */
  jugadores: JugadorSala<Pj>[] = [];
  enPartida = false;
  /** The latest list of open rooms of the game being watched (`mirarLista`), and how many rooms are open in the whole web. */
  salas: InfoSala[] = [];
  abiertas = 0;
  maxSalas = 0;
  /** Why the last room I was in was closed (`cerrada`), or null if it was not (cleared on entering a room). */
  cierre: MotivoCierre | null = null;

  private ws: WebSocket | null = null;
  private oyentes = new Map<string, Set<(m: never) => void>>();
  /** Set when we close on purpose: then there is no `perdida`. */
  private terminada = false;
  /** The `crear` / `unirse` waiting for the server's answer. */
  private pendiente: { fin: (r: ResultadoSala) => void } | null = null;

  /** Subscribes to one kind of message. Returns the function that unsubscribes. */
  on<T extends keyof Tipos<Pj>>(tipo: T, f: (m: Tipos<Pj>[T]) => void): () => void {
    let s = this.oyentes.get(tipo as string);
    if (!s) this.oyentes.set(tipo as string, (s = new Set()));
    s.add(f as (m: never) => void);
    return () => void s.delete(f as (m: never) => void);
  }

  get abierta(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Opens the socket (8 s at most). Never rejects: false when there is no connection. */
  abrir(): Promise<boolean> {
    if (this.abierta) return Promise.resolve(true);
    this.terminada = false;
    return new Promise<boolean>((resolver) => {
      let respondido = false;
      const fin = (ok: boolean) => {
        if (respondido) return;
        respondido = true;
        clearTimeout(espera);
        if (!ok) {
          this.terminada = true;
          ws?.close();
          if (this.ws === ws) this.ws = null;
        }
        resolver(ok);
      };
      const espera = window.setTimeout(() => fin(false), ESPERA_MS);
      let ws: WebSocket | undefined;
      try {
        ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/sala`);
      } catch {
        return fin(false);
      }
      this.ws = ws;
      ws.addEventListener('open', () => fin(true));
      ws.addEventListener('message', (e) => {
        const m = this.leer(e.data);
        if (m) this.recibir(m);
      });
      ws.addEventListener('error', () => fin(false));
      ws.addEventListener('close', () => {
        if (!respondido) return fin(false);
        if (this.ws === ws) this.ws = null;
        this.pendiente?.fin({ ok: false, motivo: 'red' });
        if (this.terminada) return;
        this.terminada = true;
        this.emitir({ tipo: 'perdida' });
      });
    });
  }

  enviar(m: MensajeCliente<Pj>) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  /** Asks for the list of open rooms of a game: it comes as a `salas` message now and again whenever any room changes (while out of a room). */
  mirarLista(juego: string) {
    this.enviar({ tipo: 'lista', juego });
  }

  /** Like `mirarLista`, but the list holds the rooms of ALL the games (the cover page's sticker). */
  mirarTodas() {
    this.mirarLista(JUEGO_TODOS);
  }

  /** Opens a room of `max` players (1 to 4) and enters it as the host. */
  crear(juego: string, max: number): Promise<ResultadoSala> {
    return this.pedir({ tipo: 'crear', juego, max, ...this.token() });
  }

  /** Enters the room with this code. */
  unirse(codigo: string, juego: string): Promise<ResultadoSala> {
    return this.pedir({ tipo: 'unirse', codigo, juego, ...this.token() });
  }

  elegir(pj: Pj | null) {
    this.enviar({ tipo: 'elegir', pj });
  }

  empezar() {
    this.enviar({ tipo: 'empezar' });
  }

  volver() {
    this.enviar({ tipo: 'volver' });
  }

  /** Game traffic: to the host only, to everybody else, or (host only) to the player with this room id (what only they may see). */
  juego(a: 'anfitrion' | 'todos' | number, datos: unknown) {
    this.enviar({ tipo: 'juego', a, datos });
  }

  /** Leaves the room and goes back to the lobby; the socket stays open. If I was the host the room is closed for everybody. */
  salir() {
    if (this.id < 0) return;
    this.enviar({ tipo: 'salir' });
    this.dejarSala();
  }

  /** Closes the socket on purpose (no `perdida`). */
  cerrar() {
    this.terminada = true;
    this.pendiente?.fin({ ok: false, motivo: 'red' });
    this.ws?.close();
    this.ws = null;
    this.dejarSala();
  }

  /** A game may keep what it knows of a room here: called on entering a room and on leaving it. */
  protected alCambiarDeSala(): void {}

  /** A game may read its own messages (before the listeners): called for every message from the server. */
  protected alRecibir(_m: MensajeServidor<Pj>): void {}

  private token(): { token?: string } {
    const token = tokenLocal();
    return token ? { token } : {};
  }

  private pedir(m: MensajeCliente<Pj>): Promise<ResultadoSala> {
    if (!this.abierta || this.pendiente || this.id >= 0) return Promise.resolve({ ok: false, motivo: 'red' });
    return new Promise<ResultadoSala>((resolver) => {
      const espera = window.setTimeout(() => fin({ ok: false, motivo: 'red' }), ESPERA_MS);
      const fin = (r: ResultadoSala) => {
        if (this.pendiente?.fin !== fin) return;
        clearTimeout(espera);
        this.pendiente = null;
        resolver(r);
      };
      this.pendiente = { fin };
      this.enviar(m);
    });
  }

  private dejarSala() {
    this.id = -1;
    this.anfitrion = false;
    this.codigo = '';
    this.juegoSala = '';
    this.max = 0;
    this.jugadores = [];
    this.enPartida = false;
    this.alCambiarDeSala();
  }

  private leer(crudo: unknown): MensajeServidor<Pj> | null {
    if (typeof crudo !== 'string') return null;
    try {
      const m = JSON.parse(crudo) as MensajeServidor<Pj>;
      return m && typeof m === 'object' && typeof m.tipo === 'string' ? m : null;
    } catch {
      return null;
    }
  }

  private recibir(m: MensajeServidor<Pj>) {
    if (m.tipo === 'salas') {
      this.salas = m.salas;
      this.abiertas = m.abiertas;
      this.maxSalas = m.max;
    } else if (m.tipo === 'bienvenida') {
      this.dejarSala();
      this.cierre = null;
      this.id = m.id;
      this.anfitrion = m.anfitrion;
      this.codigo = m.codigo;
      this.juegoSala = m.juego;
      this.max = m.max;
      this.pendiente?.fin({ ok: true });
    } else if (m.tipo === 'rechazo') {
      this.pendiente?.fin({ ok: false, motivo: m.motivo });
    } else if (m.tipo === 'sala') {
      this.jugadores = m.jugadores;
      this.enPartida = m.enPartida;
      this.max = m.max;
      this.codigo = m.codigo;
    } else if (m.tipo === 'cerrada') {
      // The room is gone but the socket stays: the player is back in the lobby and may look at the list again.
      this.dejarSala();
      this.cierre = m.motivo;
    }
    this.alRecibir(m);
    this.emitir(m);
  }

  private emitir(m: MensajeServidor<Pj>) {
    // A copy, so a handler may unsubscribe while we are going through them.
    for (const f of [...(this.oyentes.get(m.tipo) ?? [])]) (f as (m: MensajeServidor<Pj>) => void)(m);
  }
}
