// PokéUsera · host-side orchestration of one game (draft → battle), with no UI inside. The host's
// browser (solo play, or the online host) runs a `Partida`; every «who decides» question goes to
// a hook that the screens (or the network, for guests) answer, and every result is announced to
// another hook so each view can play it. Bots are answered here with motor/bot.ts.
//
// Seats: 'local' = this browser's screens (`ganchos.pedirX`), 'bot' = the machine, 'remoto' = an
// online guest (`ganchos.remoto.pedirX`; with no `remoto` the machine plays for them).
import type { Eleccion, EntrenadorId, EstadoCombate, EstadoDraft, Evento } from './tipos';
import { crearRnd } from './motor/azar';
import { crearDraft, elegir as elegirDraft, equipos as equiposDraft, turnoDraft } from './motor/draft';
import { crearCombate, eleccionAlAzar, eliminado, enGrada, reemplazar, resolverTurno, vivos } from './motor/combate';
import { eleccionBot, pickBot, reemplazoBot } from './motor/bot';

export interface Asiento {
  tipo: 'local' | 'bot' | 'remoto';
  entrenador: EntrenadorId;
  nombre: string;
}

/** Answers the questions of a seat. `plazoMs` is the time the player has (the host also enforces it). */
export interface Decisor {
  /** The species id picked in the draft. */
  pedirPick(j: number, draft: EstadoDraft, plazoMs: number): Promise<string>;
  /** The choice for the turn; null = «nothing» (eliminated players in the grada). */
  pedirEleccion(j: number, estado: EstadoCombate, plazoMs: number): Promise<Eleccion | null>;
  /** Index in `equipo` of the userito that comes in. */
  pedirReemplazo(j: number, estado: EstadoCombate, plazoMs: number): Promise<number>;
}

export interface Ganchos extends Decisor {
  /** Decisor for 'remoto' seats (the online host plugs the network here). Without it the machine plays for them. */
  remoto?: Decisor;
  /** The draft state changed (also once at the start): `turnoDe` picks next (null = draft over) and has `plazoMs`. */
  alDraft(draft: EstadoDraft, turnoDe: number | null, plazoMs: number): void | Promise<void>;
  /** The battle begins with these teams. */
  alInicio(estado: EstadoCombate): void | Promise<void>;
  /** The host is about to ask these players for their choice of `estado.turno` (for the network: «pide»). */
  alPide?(estado: EstadoCombate, plazoMs: number, quienes: number[]): void;
  /** A turn was resolved: the view plays `eventos`, then `estado` is the new truth. The host waits for its own animation. */
  alTurno(eventos: Evento[], estado: EstadoCombate): void | Promise<void>;
  /** Replacements came in after a fall. */
  alReemplazo(eventos: Evento[], estado: EstadoCombate): void | Promise<void>;
  /** The battle is over (`estado.ganador`). */
  alFin(estado: EstadoCombate): void | Promise<void>;
}

export interface OpcionesPartida {
  semilla?: number;
  /** Smoke tests: no thinking pauses for the bots. */
  rapido?: boolean;
  /** Skip the draft: the teams (species ids per seat). */
  equipos?: string[][];
  plazoPickMs?: number;
  plazoTurnoMs?: number;
  plazoReemplazoMs?: number;
}

export const PLAZO_PICK = 20000;
export const PLAZO_TURNO = 30000;
export const PLAZO_REEMPLAZO = 15000;
/** Extra time the host gives guests over the clock they see, for network lag. */
const GRACIA_REMOTO = 1200;

class Cancelada extends Error {
  constructor() {
    super('partida cancelada');
  }
}
export const esCancelada = (e: unknown): boolean => e instanceof Cancelada;

const pausa = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Partida {
  readonly semilla: number;
  draft: EstadoDraft | null = null;
  estado: EstadoCombate | null = null;
  private rnd: () => number;
  private rndBots: Record<number, () => number> = {};
  private cancelacion: Promise<never>;
  private cancelar_!: () => void;
  private cancelada = false;

  constructor(
    readonly asientos: Asiento[],
    private ganchos: Ganchos,
    private opciones: OpcionesPartida = {},
  ) {
    if (asientos.length < 2 || asientos.length > 4) throw new Error('De 2 a 4 asientos');
    this.semilla = opciones.semilla ?? Math.floor(Math.random() * 2 ** 31);
    this.rnd = crearRnd(this.semilla ^ 0x5bd1e995);
    asientos.forEach((_, j) => (this.rndBots[j] = crearRnd(this.semilla + 7919 * (j + 1))));
    this.cancelacion = new Promise<never>((_, rej) => {
      this.cancelar_ = () => rej(new Cancelada());
    });
    this.cancelacion.catch(() => undefined);
  }

  /** Stops the game: `jugar()` rejects with a «cancelada» error (see `esCancelada`). */
  cancelar() {
    if (this.cancelada) return;
    this.cancelada = true;
    this.cancelar_();
  }

  /** Waits for `p`, or throws if the game is cancelled meanwhile. */
  private async esperar<T>(p: T | Promise<T>): Promise<T> {
    return Promise.race([Promise.resolve(p), this.cancelacion]);
  }

  /** `p` or, if `ms` pass first, `defecto()`. */
  private async conPlazo<T>(p: Promise<T>, ms: number, defecto: () => T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tope = new Promise<T>((res) => {
      timer = setTimeout(() => res(defecto()), ms);
    });
    try {
      return await this.esperar(Promise.race([p.catch(() => defecto()), tope]));
    } finally {
      clearTimeout(timer);
    }
  }

  private decisor(j: number): Decisor | null {
    const a = this.asientos[j];
    if (a.tipo === 'local') return this.ganchos;
    if (a.tipo === 'remoto') return this.ganchos.remoto ?? null;
    return null;
  }

  private gracia(j: number) {
    return this.asientos[j].tipo === 'remoto' ? GRACIA_REMOTO : 0;
  }

  /** Runs the whole game and returns the final state. */
  async jugar(): Promise<EstadoCombate> {
    const n = this.asientos.length;
    let listas: string[][];
    if (this.opciones.equipos) listas = this.opciones.equipos;
    else listas = await this.hacerDraft();
    const estado0 = crearCombate(
      this.asientos.map((a, j) => ({ entrenador: a.entrenador, nombre: a.nombre, bot: a.tipo === 'bot', especies: listas[j] })),
      Math.floor(this.rnd() * 2 ** 31),
    );
    this.estado = estado0;
    await this.esperar(this.ganchos.alInicio(estado0));
    let estado = estado0;
    const plazoTurno = this.opciones.plazoTurnoMs ?? PLAZO_TURNO;
    const plazoRemp = this.opciones.plazoReemplazoMs ?? PLAZO_REEMPLAZO;

    while (estado.ganador === null) {
      // 1. Everybody chooses at once: the living, and the eliminated when the grada opens.
      const quienes: number[] = [];
      for (let j = 0; j < n; j++) if (!eliminado(estado, j) || enGrada(estado, j)) quienes.push(j);
      this.ganchos.alPide?.(estado, plazoTurno, quienes);
      const snap = estado;
      const elecciones: (Eleccion | null)[] = new Array(n).fill(null);
      await Promise.all(
        quienes.map(async (j) => {
          elecciones[j] = await this.eleccionDe(j, snap, plazoTurno);
        }),
      );
      // 2. Resolve and play.
      const r = resolverTurno(estado, elecciones);
      estado = r.estado;
      this.estado = estado;
      await this.esperar(this.ganchos.alTurno(r.eventos, estado));
      if (estado.ganador !== null) break;
      // 3. Replacements for the fallen.
      const pendientes = estado.reemplazos.filter((j) => vivos(estado.jugadores[j]).length > 0);
      if (pendientes.length) {
        const snap2 = estado;
        const elegidos: Record<number, number> = {};
        await Promise.all(
          pendientes.map(async (j) => {
            elegidos[j] = await this.reemplazoDe(j, snap2, plazoRemp);
          }),
        );
        const rr = reemplazar(estado, elegidos);
        estado = rr.estado;
        this.estado = estado;
        await this.esperar(this.ganchos.alReemplazo(rr.eventos, estado));
      }
    }
    await this.esperar(this.ganchos.alFin(estado));
    return estado;
  }

  // ------------------------------------------------------------------ draft

  private async hacerDraft(): Promise<string[][]> {
    const n = this.asientos.length;
    const plazo = this.opciones.plazoPickMs ?? PLAZO_PICK;
    let draft = crearDraft(n, 0);
    this.draft = draft;
    let turno = turnoDraft(draft);
    await this.esperar(this.ganchos.alDraft(draft, turno, plazo));
    while (turno !== null) {
      const j = turno;
      const especie = await this.pickDe(j, draft, plazo);
      let nuevo = elegirDraft(draft, especie);
      if (nuevo === draft) nuevo = elegirDraft(draft, pickBot(draft, this.rnd)); // an invalid pick: the machine picks
      draft = nuevo;
      this.draft = draft;
      turno = turnoDraft(draft);
      await this.esperar(this.ganchos.alDraft(draft, turno, plazo));
    }
    return equiposDraft(draft, n);
  }

  private async pickDe(j: number, draft: EstadoDraft, plazo: number): Promise<string> {
    const rndBot = this.rndBots[j];
    const dec = this.decisor(j);
    if (!dec) {
      // The machine thinks for a moment, like a person would.
      if (!this.opciones.rapido) await this.esperar(pausa(600 + Math.floor(rndBot() * 600)));
      return pickBot(draft, rndBot);
    }
    return this.conPlazo(dec.pedirPick(j, draft, plazo), plazo + this.gracia(j), () => pickBot(draft, rndBot));
  }

  // ------------------------------------------------------------------ battle

  private async eleccionDe(j: number, estado: EstadoCombate, plazo: number): Promise<Eleccion | null> {
    const dec = this.decisor(j);
    if (!dec) return eleccionBot(estado, j, this.rndBots[j]);
    return this.conPlazo(dec.pedirEleccion(j, estado, plazo), plazo + this.gracia(j), () => eleccionAlAzar(estado, j));
  }

  private async reemplazoDe(j: number, estado: EstadoCombate, plazo: number): Promise<number> {
    const dec = this.decisor(j);
    if (!dec) return reemplazoBot(estado, j);
    return this.conPlazo(dec.pedirReemplazo(j, estado, plazo), plazo + this.gracia(j), () => vivos(estado.jugadores[j])[0] ?? 0);
  }
}
