// PokéUsera · host-side orchestration of one game (draft → battle), with no UI inside. The host's
// browser (solo play, or the online host) runs a `Partida`; every «who decides» question goes to
// a hook that the screens (or the network, for guests) answer, and every result is announced to
// another hook so each view can play it. Bots are answered here with motor/bot.ts.
//
// Seats: 'local' = this browser's screens (`ganchos.pedirX`), 'bot' = the machine, 'remoto' = an
// online guest (`ganchos.remoto.pedirX`; with no `remoto` the machine plays for them).
import type { Eleccion, EntrenadorId, EscenarioId, EstadoCombate, EstadoDraft, Evento, ModoJuego, ObjetoId } from './tipos';
import { crearRnd } from './motor/azar';
import { crearDraft, elegir as elegirDraft, equipos as equiposDraft, turnoDraft } from './motor/draft';
import { crearCombate, eleccionAlAzar, eliminado, enGrada, escenarioDeSemilla, reemplazar, resolverTurno, vivos } from './motor/combate';
import { eleccionBot, pickBot, reemplazoBot, salidaBot } from './motor/bot';
import { PLAZO_AZAR, PLAZO_BARRA, eleccionObjetoValida, objetoBot, ofertasObjetos, repartoAzar, type EleccionObjeto } from './motor/objetos';

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
  /** «La barra»: which of the three `ofertas` the player takes and which of their three `especies` (index) carries it. */
  pedirObjeto(j: number, ofertas: ObjetoId[], especies: string[], plazoMs: number): Promise<EleccionObjeto>;
  /** «¿Quién sale primero?»: the index (0..2, in `especies`) of the userito the player sends out first; `objetos` are the ones «La barra» gave to their useritos. */
  pedirSalida(j: number, especies: string[], objetos: (ObjetoId | null)[], plazoMs: number): Promise<number>;
  /** «TU EQUIPO AL AZAR» (mode AL AZAR): shows the player their dealt team (`equipos[j]`, with the others' teams for reference) and their `objetos`; resolves when they press ¡A PELEAR! (`plazoMs` ≤ 0: no limit). */
  pedirAzar(j: number, equipos: string[][], objetos: (ObjetoId | null)[], plazoMs: number): Promise<void>;
}

export interface Ganchos extends Decisor {
  /** Decisor for 'remoto' seats (the online host plugs the network here). Without it the machine plays for them. */
  remoto?: Decisor;
  /** Extra milliseconds the host waits for a 'remoto' seat's answer (a guest that is still playing the last turn when the question opens). */
  graciaExtraMs?(j: number): number;
  /** The draft state changed (also once at the start): `turnoDe` picks next (null = draft over) and has `plazoMs`. */
  alDraft(draft: EstadoDraft, turnoDe: number | null, plazoMs: number): void | Promise<void>;
  /** The battle begins with these teams. */
  alInicio(estado: EstadoCombate): void | Promise<void>;
  /** The host is about to ask these players for their choice of `estado.turno` (for the network: «pide»). Their deadline starts right after this call. */
  alPide?(estado: EstadoCombate, plazoMs: number, quienes: number[]): void;
  /** The host is about to ask these players which userito comes in after a fall (for the network: «pideRemp»). Their deadline starts right after this call. */
  alPideReemplazo?(estado: EstadoCombate, plazoMs: number, quienes: number[]): void;
  /** A turn was resolved: the view plays `eventos`, then `estado` is the new truth. The host waits for its own animation. */
  alTurno(eventos: Evento[], estado: EstadoCombate): void | Promise<void>;
  /** Replacements came in after a fall. */
  alReemplazo(eventos: Evento[], estado: EstadoCombate): void | Promise<void>;
  /** The battle is over (`estado.ganador`). */
  alFin(estado: EstadoCombate): void | Promise<void>;
}

export interface OpcionesPartida {
  semilla?: number;
  /** The bar where the battle is played (default: drawn from the battle's seed). It travels in `EstadoCombate.escenario`. */
  escenario?: EscenarioId;
  /** Smoke tests: no thinking pauses for the bots. */
  rapido?: boolean;
  /** Skip the draft: the teams (species ids per seat). */
  equipos?: string[][];
  /** `'azar'`: nobody drafts or visits «La barra»: the game deals every seat 3 useritos and 1 object (`repartoAzar`) and each player only chooses who comes out first. Ignored with `equipos`. */
  modo?: ModoJuego;
  /** Milliseconds a player has on «TU EQUIPO AL AZAR» (default `PLAZO_AZAR`; 0 = no limit, as in solo play). */
  plazoAzarMs?: number;
  /** With `equipos` (no draft) «La barra» and «¿Quién sale primero?» are skipped too and the machine decides for every seat, unless this is set (`?barra`). */
  barra?: boolean;
  plazoBarraMs?: number;
  plazoSalidaMs?: number;
  plazoPickMs?: number;
  plazoTurnoMs?: number;
  plazoReemplazoMs?: number;
}

export const PLAZO_PICK = 20000;
export const PLAZO_TURNO = 30000;
export const PLAZO_REEMPLAZO = 15000;
export const PLAZO_SALIDA = 15000;
export { PLAZO_BARRA };
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
  /** The seed of the battle itself (known from the start: «La barra» offers are drawn from it) and its bar (known from the start too, so the screens can load its tune). */
  readonly semillaCombate: number;
  readonly escenario: EscenarioId;
  draft: EstadoDraft | null = null;
  /** The teams of the battle (species per seat) once the draft is over or the AL AZAR deal is made; null before. */
  equipos: string[][] | null = null;
  /** The game's mode: AL AZAR unless the teams were given (`opciones.equipos`). */
  readonly modo: ModoJuego;
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
    this.semillaCombate = Math.floor(crearRnd(this.semilla ^ 0x1b873593)() * 2 ** 31);
    this.escenario = opciones.escenario ?? escenarioDeSemilla(this.semillaCombate);
    this.modo = opciones.modo === 'azar' && !opciones.equipos ? 'azar' : 'normal';
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
    return this.asientos[j].tipo === 'remoto' ? GRACIA_REMOTO + (this.ganchos.graciaExtraMs?.(j) ?? 0) : 0;
  }

  /** Runs the whole game and returns the final state. */
  async jugar(): Promise<EstadoCombate> {
    const n = this.asientos.length;
    let listas: string[][];
    let objetos: (ObjetoId | null)[][];
    if (this.modo === 'azar') {
      // AL AZAR: no draft and no «La barra»; the deal comes from the battle's seed (the host's, online) and is the same for machines and people.
      const reparto = repartoAzar(this.semillaCombate, n);
      listas = reparto.equipos;
      objetos = reparto.objetos;
    } else {
      if (this.opciones.equipos) listas = this.opciones.equipos;
      else listas = await this.hacerDraft();
      objetos = await this.hacerBarra(listas);
    }
    this.equipos = listas;
    const iniciales = await this.hacerSalida(listas, objetos);
    const estado0 = crearCombate(
      this.asientos.map((a, j) => ({ entrenador: a.entrenador, nombre: a.nombre, bot: a.tipo === 'bot', especies: listas[j], objetos: objetos[j], inicial: iniciales[j] })),
      this.semillaCombate,
      this.escenario,
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
        this.ganchos.alPideReemplazo?.(snap2, plazoRemp, pendientes);
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

  // ------------------------------------------------------------------ la barra (objects)

  /**
   * Every seat takes one of its three offered objects for one of its three useritos, all at once (`PLAZO_BARRA`). The machines choose at
   * once; a player who runs out of time gets the machine's choice. Returns, per seat, the object of each userito (null: none).
   * With the draft skipped (`equipos`) and no `barra` option nobody is asked: the machine chooses for every seat.
   */
  private async hacerBarra(listas: string[][]): Promise<(ObjetoId | null)[][]> {
    const plazo = this.opciones.plazoBarraMs ?? PLAZO_BARRA;
    const preguntar = !this.opciones.equipos || !!this.opciones.barra;
    const res: (ObjetoId | null)[][] = listas.map(() => [null, null, null]);
    await Promise.all(
      this.asientos.map(async (_a, j) => {
        const ofertas = ofertasObjetos(this.semillaCombate, j);
        const rndBot = this.rndBots[j];
        const porDefecto = () => objetoBot(listas[j], ofertas, rndBot);
        const dec = preguntar ? this.decisor(j) : null;
        let el: EleccionObjeto;
        if (!dec) el = porDefecto();
        else {
          const pedido = await this.conPlazo<EleccionObjeto | null>(dec.pedirObjeto(j, ofertas, listas[j], plazo), plazo + this.gracia(j), () => null);
          el = eleccionObjetoValida(pedido, ofertas) ? pedido : porDefecto();
        }
        res[j][el.idx] = el.objeto;
      }),
    );
    return res;
  }

  // ------------------------------------------------------------------ who comes out first

  /**
   * Every seat chooses at once and in secret which of its three useritos starts the battle (`PLAZO_SALIDA`); the machines choose by type
   * matchup against the other teams, and a player who runs out of time (or answers nonsense) sends out the first one. Returns, per seat,
   * the index in its team. Skipped like «La barra» (the machine chooses for everybody) when the draft was. In mode AL AZAR each seat first sees «TU EQUIPO AL AZAR».
   */
  private async hacerSalida(listas: string[][], objetos: (ObjetoId | null)[][]): Promise<number[]> {
    const plazo = this.opciones.plazoSalidaMs ?? PLAZO_SALIDA;
    const preguntar = !this.opciones.equipos || !!this.opciones.barra;
    const plazoAzar = this.opciones.plazoAzarMs ?? PLAZO_AZAR;
    return Promise.all(
      this.asientos.map(async (_a, j) => {
        const dec = preguntar ? this.decisor(j) : null;
        // AL AZAR: first the player sees their team (each at their own pace), then chooses who opens.
        if (dec && this.modo === 'azar') {
          const visto = dec.pedirAzar(j, listas, objetos[j], plazoAzar);
          if (plazoAzar > 0) await this.conPlazo<void>(visto, plazoAzar + this.gracia(j), () => undefined);
          else await this.esperar(visto.catch(() => undefined));
        }
        if (!dec) return salidaBot(listas[j], listas.filter((_l, k) => k !== j), this.rndBots[j]);
        const idx = await this.conPlazo<number>(dec.pedirSalida(j, listas[j], objetos[j], plazo), plazo + this.gracia(j), () => 0);
        return Number.isInteger(idx) && idx >= 0 && idx < Math.min(3, listas[j].length) ? idx : 0;
      }),
    );
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
