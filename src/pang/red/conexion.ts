// The Pang's online connection (docs/PANG-ONLINE.md): a thin wrapper over the room's WebSocket.
// It only carries messages; the game itself is run by the host's browser.
import type { PjId } from '../tipos';

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
  | { tipo: 'juego'; a: 'anfitrion' | 'todos'; datos: unknown };

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

  /** Game traffic: to the host only, or to everybody else. */
  juego(a: 'anfitrion' | 'todos', datos: unknown) {
    this.enviar({ tipo: 'juego', a, datos });
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
    }
    this.emitir(m);
  }

  private emitir(m: MensajeServidor) {
    // A copy, so a handler may unsubscribe while we are going through them.
    for (const f of [...(this.oyentes.get(m.tipo) ?? [])]) (f as (m: MensajeServidor) => void)(m);
  }
}
