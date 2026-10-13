// PokéUsera · Edición Jarra (docs/POKEUSERA.md): the shared types. This file is the contract
// between the battle engine (motor/), the art (arte/), the sound (sonido.ts) and the screens.
// The engine is pure: no DOM, no timers, no Math.random (it uses the seeded RNG in its state),
// so the host's browser can run it and send the result to everybody.

export type Tipo = 'normal' | 'fuego' | 'planta' | 'tierra' | 'aire' | 'rayo' | 'alcohol' | 'juerga' | 'chanza' | 'grasa' | 'fantasma';

/** Physical types use Ataque/Defensa; the rest use Especial (like the first Game Boy games). */
export const TIPOS_FISICOS: readonly Tipo[] = ['normal', 'tierra', 'aire', 'juerga', 'fantasma'];

/** Main status: one at a time. «Achispado» (confusion) is separate and can stack with it. */
export type Estado = 'dormido' | 'paralizado' | 'quemado' | 'empachado';

export type EntrenadorId = 'fran' | 'pablo' | 'chuchi' | 'guille';
export const ENTRENADORES: readonly EntrenadorId[] = ['fran', 'pablo', 'chuchi', 'guille'];

export interface Base {
  ps: number;
  ata: number;
  def: number;
  vel: number;
  esp: number;
}

export interface Especie {
  /** Lowercase ascii id, e.g. 'draguserin', 'ego-ego'. Also the key for the sprite and the texts. */
  id: string;
  /** Shown name, e.g. 'Draguserín'. */
  nombre: string;
  tipos: [Tipo] | [Tipo, Tipo];
  base: Base;
  /** Four move ids. */
  movs: [string, string, string, string];
}

/** «uno»: one rival the player picks; «todos»: the three rivals (75 % power); «yo»: the user. */
export type Objetivo = 'uno' | 'todos' | 'yo';

export interface Movimiento {
  id: string;
  nombre: string;
  tipo: Tipo;
  /** null for status moves; Premio gordo rolls its own. */
  pot: number | null;
  /** Percentage; null never misses. */
  prec: number | null;
  pp: number;
  objetivo: Objetivo;
  /** Turn order bracket: 0 normal, 1 Susto, 2 Esconderse (switches and the caña go before all). */
  prioridad?: number;
}

export type Stat = 'ata' | 'def' | 'vel' | 'esp' | 'prec';

/** A userito in a battle. */
export interface Userito {
  especie: string;
  ps: number;
  psMax: number;
  /** Stats at level 50, before stages. */
  ata: number;
  def: number;
  vel: number;
  esp: number;
  pp: [number, number, number, number];
  estado: Estado | null;
  /** Turns left asleep. */
  sueno: number;
  /** Turns of «Achispado» left (0 = sober). */
  achispado: number;
  /** Stat stages, −6..+6. Reset on switching out. */
  niveles: Record<Stat, number>;
  /** Volatile effects, reset on switching out. */
  vol: {
    /** Turns trapped by «Te pillo en la barra» (and who trapped it). */
    atrapado: number;
    atrapadoPor: number;
    /** Turns of «Cizaña» left. */
    cizana: number;
    /** «Bostezo»: falls asleep at the end of the turn when this reaches 0 (−1 = none). */
    bostezo: number;
    /** «Solo de teclado»: must skip the next turn. */
    recarga: boolean;
    /** «¡Una más!»: cannot switch next turn. */
    sinCambio: boolean;
    /** «Esconderse» used last turn (for the 50 % fail). */
    escondidoAntes: boolean;
    /** Hidden this turn. */
    escondido: boolean;
  };
}

export interface Jugador {
  /** 0..3, also the seat and the colour. */
  idx: number;
  entrenador: EntrenadorId;
  /** The player's name (the trainer's, or the online nick). */
  nombre: string;
  equipo: Userito[];
  /** Index in `equipo` of the one in battle. */
  activo: number;
  /** The caña is still unused. */
  cana: boolean;
  bot: boolean;
  /** Finishing place once eliminated (2..4; the winner gets 1 at the end), else 0. */
  puesto: number;
}

/**
 * What one userito did in the battle. Short keys because this travels inside every online turn
 * message. «Damage to others» only counts attacks between players; what a userito does to itself
 * (recoil, a hit on itself while tipsy) or what the bar does to it (burns, empacho, trap, «Hora de
 * cerrar») goes to `dp`. Conservation: psMax − ps = dr + dp − cu.
 */
export interface StatsUserito {
  /** Damage dealt to other players' useritos (HP really lost by them). */
  dh: number;
  /** Damage received from other players' attacks. */
  dr: number;
  /** Damage received from itself or from the bar (burn, empacho, trap, recoil, self-hit, Hora de cerrar). */
  dp: number;
  /** HP healed (drain, caña, Siesta, grada). */
  cu: number;
  /** Useritos it knocked out. */
  ko: number;
  /** Times it fainted. */
  cae: number;
  /** Hits landed on others (each hit of a multi-hit move counts). */
  gol: number;
  /** Hits received from others. */
  rg: number;
  /** Moves that missed, hit a hidden or immune target, or failed on their own. */
  fal: number;
  /** Attacks it dodged: accuracy misses against it, hidden, or immune. */
  esq: number;
  /** Critical hits landed / received. */
  cri: number;
  crr: number;
  /** Super-effective hits landed / received. */
  sup: number;
  sur: number;
  /** Not-very-effective hits landed / received. */
  pob: number;
  por: number;
  /** Statuses inflicted on others. */
  est: number;
  /** Stat changes it made on others / on itself. */
  nvo: number;
  nvy: number;
  /** Times it was switched out on purpose. */
  cam: number;
  /** Caña used on it by its player (0/1). */
  cana: number;
  /** PP spent. */
  pp: number;
  /** Biggest single hit: damage, move id, target player. */
  mx: number;
  mm: string;
  mo: number;
  /** Times each move slot was used (the four moves, then «A la desesperada»). */
  mv: number[];
  /** Turns it was the one on the field at the start of the turn. */
  tf: number;
  /** Damage dealt with «Venganza». */
  dv: number;
}

/** Statistics of the whole battle, filled in by the engine as it resolves turns. */
export interface Estadisticas {
  /** `u[player][index in equipo]`. */
  u: StatsUserito[][];
  /** `dm[a][b]`: damage player a dealt to player b's useritos. */
  dm: number[][];
  /** `km[a][b]`: useritos of player b that player a knocked out. */
  km: number[][];
  /** `gr[player]`: [cañas invited, boos] from the grada. */
  gr: [number, number][];
}

export interface EstadoCombate {
  turno: number;
  jugadores: Jugador[];
  /** Seeded RNG state (mulberry32). */
  semilla: number;
  /** Last move used in the battle, by anyone (for «Sí, y…»), excluding «Sí, y…» itself. */
  ultimoMov: string | null;
  /** Whether «¡Camioneees y caravanaaas!» was sung the previous turn. */
  cancionAntes: boolean;
  /** Per player: the players whose moves damaged its active userito last turn (for «Venganza»). */
  agresores: number[][];
  /** Players whose active userito fainted and must pick a replacement before the next turn. */
  reemplazos: number[];
  /** Index of the winner, once the battle is over. */
  ganador: number | null;
  /** The statistics so far (final once `ganador` is set). */
  stats: Estadisticas;
}

/** What a player decides for a turn. `objetivo` is a player index (for «uno» moves and the grada). */
export type Eleccion =
  | { tipo: 'atacar'; mov: number; objetivo?: number }
  | { tipo: 'cambiar'; a: number }
  | { tipo: 'cana' }
  /** Eliminated players, every 3rd turn: invite a caña (heal 1/10) or boo (accuracy −1). */
  | { tipo: 'grada'; accion: 'cana' | 'abucheo'; objetivo: number };

/**
 * What happened in a turn, in order, for the screen to play one by one. Every event can carry
 * a text line (`clave` + `vars`, resolved with `texto()` from src/textos/pokeusera-combate.md)
 * that the text box shows; `ps` is always the new value after the event.
 */
export type Evento = {
  clave?: string;
  vars?: Record<string, string | number>;
  /** Set on everything that happens after the last action of the turn (burns, Hora de cerrar, eliminations): no spotlight on an actor. */
  fin?: true;
} & (
  /** `j`: the player the line is about (the target of «no afecta», who retires or drinks a caña...), when the screen can use it. */
  | { k: 'texto'; j?: number }
  /** `obj`: the players the move was aimed at (after redirections), `[]` for moves on itself. */
  | { k: 'usa'; j: number; mov: string; obj?: number[] }
  | { k: 'golpe'; j: number; dano: number; ps: number; ef: number; critico: boolean }
  | { k: 'falla'; j: number }
  | { k: 'cura'; j: number; ps: number }
  /** `estado: null` = a status ended; `de` says which (always set by the engine in that case). */
  | { k: 'estado'; j: number; estado: Estado | 'achispado' | null; de?: Estado | 'achispado' }
  | { k: 'nivel'; j: number; stat: Stat; cambio: number }
  | { k: 'cae'; j: number }
  | { k: 'sale'; j: number; idx: number }
  | { k: 'eliminado'; j: number; puesto: number }
  | { k: 'fin'; ganador: number }
);

/** Draft (snake order) shared state. */
export interface EstadoDraft {
  /** Player index for each pick, e.g. 0,1,2,3,3,2,1,0,0,1,2,3. */
  orden: number[];
  /** Picks made so far: species ids, aligned with `orden`. */
  elegidos: string[];
}
