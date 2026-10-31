// PokéUsera · Edición Jarra (docs/POKEUSERA.md): the shared types. This file is the contract
// between the battle engine (motor/), the art (arte/), the sound (sonido.ts) and the screens.
// The engine is pure: no DOM, no timers, no Math.random (it uses the seeded RNG in its state),
// so the host's browser can run it and send the result to everybody.

export type Tipo = 'mindundi' | 'petardo' | 'droga' | 'bronca' | 'ventolera' | 'chispa' | 'alcohol' | 'juerga' | 'chanza' | 'grasa' | 'fantasma';

/** Physical types use Ataque/Defensa; the rest use Especial (like the first Game Boy games). */
export const TIPOS_FISICOS: readonly Tipo[] = ['mindundi', 'bronca', 'ventolera', 'juerga', 'fantasma'];

/** Main status: one at a time. «Achispado» (confusion) is separate and can stack with it. */
export type Estado = 'dormido' | 'paralizado' | 'quemado' | 'empachado';

export type EntrenadorId = 'fran' | 'pablo' | 'chuchi' | 'guille' | 'vinas' | 'ari' | 'fer';
export const ENTRENADORES: readonly EntrenadorId[] = ['fran', 'pablo', 'chuchi', 'guille', 'vinas', 'ari', 'fer'];

/** One mild perk per trainer (docs/POKEUSERA.md, «Ventajas de entrenador»); the engine applies it by `Jugador.entrenador`. */
export const PERK_CANA_FRAN = 60; // Fran: his caña heals 60 % of max HP instead of 50 %
export const PERK_PRECISION_PABLO = 10; // Pablo: status moves +10 accuracy points
export const PERK_RUIDO_FER = 80; // Fer: a rival's sound move does 80 % of the damage, 20 % less (a sound move without damage gets through 80 % of the time)
export const PERK_TARDE_CHUCHI = 85; // Chuchi: first hit each userito receives does 15 % less (85 % of the damage)
export const PERK_VERSO_VINAS = 110; // Viñas: his Chanza and Juerga attacks hit 10 % harder (110 % of the damage)
export const PERK_COSECHA_ARI = 10; // Ari: % chance that each blow of her attacks is critical, on top of the usual chance
// Guille: once per userito, a hit from full HP that would KO leaves it at 1 HP.

/** The objects of «La barra» (docs/POKEUSERA.md, «Objetos de la barra»): one per player, held by one of the three useritos. */
export type ObjetoId = 'mechero' | 'chicle' | 'bocata' | 'posavasos' | 'tapon' | 'palillo' | 'gafas' | 'zapatillas' | 'panuelo' | 'llavero';
export const OBJETOS: readonly ObjetoId[] = ['mechero', 'chicle', 'bocata', 'posavasos', 'tapon', 'palillo', 'gafas', 'zapatillas', 'panuelo', 'llavero'];
export const OBJ_MECHERO_QUEMA = 50; // Mechero: % chance that the first attacker to hit its holder is burnt
export const OBJ_BOCATA_CURA = 5; // Bocata de calamares: heals 1/5 of max HP when the holder drops under half
export const OBJ_TAPON_USOS = 2; // Tapón de cava: its first two attacks are quick (+1)
export const OBJ_GAFAS_PREC = 10; // Gafas de sol: +10 accuracy points on its attacks
export const OBJ_PANUELO = 120; // Pañuelo de la peña: its same-type attacks do 120 % damage
export const OBJ_PALILLO_CRIT = 2; // Palillo: twice as many critical hits

/** What a userito carries. One-use objects are `gastado` once they work; `visto` is set the first time everybody sees them work
 *  (until then the rivals' screens do not show them; online, the host does not even send them: `ocultarObjetos` in motor/objetos.ts). */
export interface ObjetoLlevado {
  id: ObjetoId;
  gastado?: true;
  visto?: true;
  /** Tapón de cava: how many of its `OBJ_TAPON_USOS` quick attacks it has made so far. */
  usos?: number;
  /** Zapatillas nuevas: it has already come out once (the first time it also raises the Attack). */
  salio?: true;
}

export interface Base {
  ps: number;
  ata: number;
  def: number;
  vel: number;
  esp: number;
}

/** The 31 passive abilities (docs/POKEUSERA.md, «Habilidades»): one per userito (Caravaner and Camioner share `pareja`). Names and sentences: `hab.<id>.*` in pokeusera-combate.md. */
export type HabilidadId =
  | 'fuego_dragon' | 'gratinado' | 'buena_chica' | 'manico' | 'duro_de_roer' | 'kilos' | 'indigesto' | 'espuma' | 'cajon' | 'inesperado'
  | 'bote' | 'conazo' | 'curado' | 'dos_cabezas' | 'ardiente' | 'pareja' | 'fotosintesis' | 'flipado' | 'volumen' | 'hielo'
  | 'pesadisimo' | 'ola' | 'lavado' | 'maleta' | 'publico' | 'corriente' | 'grasiento' | 'viento' | 'fan'
  | 'cantaynollores' | 'malaleche'
  | 'jabon' | 'tira' | 'blandito' | 'humo' | 'feria';
export const HAB_PAREJA = 20; // Pareja de carretera / Fan de la gira: % more damage on its attacks while the partner is on the field
export const HAB_PROB_REACCION = 30; // Buena chica / Indigesto / Ardiente: % chance that whoever hits them pays for it
export const HAB_GRASIENTO = 10; // Grasiento: % chance that its Grasa attacks give the target an empacho
export const HAB_MALETA_ATA = 2; // Se abre la maleta: Attack stages it gains the first time it drops under half of its HP
export const HAB_MANICO_ATA = 2; // Mañico: Attack stages it gains each time a rival lowers one of its stats
export const HAB_LAVADO_CURA = 8; // Recién lavado: heals 1/8 of its max HP when it goes back to the bench
export const HAB_CANTA_MULT = 150; // Canta y no llores: % of damage of its Juerga attacks while it has less than 1/3 of its HP
export const HAB_BLANDITO = 20; // Caro y blandito: % less damage from physical attacks at one rival
export const HAB_FOTOSINTESIS = 16; // Fotosíntesis: heals 1/16 of its max HP at the end of every turn

export interface Especie {
  /** Lowercase ascii id, e.g. 'draguserin', 'ego-ego'. Also the key for the sprite and the texts. */
  id: string;
  /** Shown name, e.g. 'Draguserín'. */
  nombre: string;
  tipos: [Tipo] | [Tipo, Tipo];
  base: Base;
  /** Four move ids. */
  movs: [string, string, string, string];
  /** Its passive ability, visible to everybody. */
  habilidad: HabilidadId;
}

/** «uno»: one rival the player picks; «todos»: the three rivals (75 % power); «yo»: the user;
 *  «auto»: the engine picks the target (Devolvérsela: whoever hit the user last), nothing to choose. */
export type Objetivo = 'uno' | 'todos' | 'yo' | 'auto';

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
  /** Turn order bracket: +2 protections (Esconderse, ¡Que pague otro!, Aguantar el tipo), +1 quick (Susto, ¡Me cuelo!,
   *  Rebufo, Colleja), 0 normal (absent), −1 slow (Devolvérsela). Switches and the caña go before all. Same bracket: faster first. */
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
  /** Trainer perks already used by this userito in this battle (Chuchi «Llega tarde», Guille «Mañico»).
   *  Not in `vol`: they must survive switching out. Absent until used. */
  perk?: { tarde?: true; manico?: true };
  /** «Se abre la maleta» (Maletrio) already worked: it is once per userito and battle, so it survives switching out. */
  habUsada?: true;
  /** The object of «La barra» it carries, if any (like `perk`, it survives switching out). */
  objeto?: ObjetoLlevado;
  /** «Recién despierto»: it woke up this turn (on the field or on the bench, or the Chicle de menta cured its sleep) and, until this turn
   *  (inclusive), nothing can put it to sleep again. Absent until it wakes. Survives switching out. See `recienDespierto` in motor/combate.ts. */
  sinSuenoHasta?: number;
  /** Volatile effects, reset on switching out. */
  vol: {
    /** Turns trapped by «Te pillo en la barra» (and who trapped it). */
    atrapado: number;
    atrapadoPor: number;
    /** Turns of «Cizaña» left. */
    cizana: number;
    /** Turns of «Serenata» left: its single-target attacks aimed at the player `embobadoPor` (while a Mariachi is out there) go to another rival. */
    embobado: number;
    embobadoPor: number;
    /** «Bostezo»: falls asleep at the end of the turn when this reaches 0 (−1 = none). */
    bostezo: number;
    /** «Solo de teclado»: must skip the next turn. */
    recarga: boolean;
    /** «¡Una más!»: cannot switch next turn. */
    sinCambio: boolean;
    /** A protection (Esconderse, ¡Que pague otro!, Aguantar el tipo) worked last turn: the next one fails half of the times. */
    protegidoAntes: boolean;
    /** «Cuando menos te lo esperas» (Lentejasur): it came out and has not attacked yet, so its first attack is quick (+1). */
    sorpresa: boolean;
    /** Hidden this turn («Esconderse»). */
    escondido: boolean;
    /** «¡Que pague otro!» this turn: the single-target attacks aimed at it go to another userito. */
    desvia: boolean;
    /** «Aguantar el tipo» this turn: no hit leaves it under 1 HP. */
    aguanta: boolean;
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
  /** Biggest single hit: its GROSS damage (what the blow would have done without the cap of the HP the target had left, see the `bruto` of the 'golpe' event; the
   *  damage dealt and counted in `dh` is the real one), move id, target player. */
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

/** The bars the battle can be played in (the background, the music and the events of the place; docs/POKEUSERA.md, «Sucesos del bar»). */
export type EscenarioId = 'brio' | 'terraza' | 'rural' | 'juan' | 'feria';
export const ESCENARIOS: readonly EscenarioId[] = ['brio', 'terraza', 'rural', 'juan', 'feria'];

/** Things that happen in the bar on turns 5, 10, 15, 20 and 25 (datos.ts: `SUCESOS`). */
export type SucesoId = 'ronda' | 'luz' | 'happy' | 'cumple' | 'pelea' | 'karaoke' | 'barre' | 'premio' | 'cierzo' | 'rosas' | 'desfile' | 'peluca' | 'comanda' | 'chinchin' | 'choque' | 'pista';

/** A suceso that lasts: `turnos` = turns it still counts for, including the one about to be chosen (2 at the start of its first turn).
 *  `j`: the player it is about, when it picks one (Pelea en la barra: the leader, who is not «acorralado»). */
export interface SucesoActivo {
  id: SucesoId;
  turnos: number;
  j?: number;
}

export interface EstadoCombate {
  /** Where the battle is played. */
  escenario: EscenarioId;
  /** Sucesos that are on now (the instant ones are not here), for the badge and for the rules they bend. */
  sucesos: SucesoActivo[];
  /** Every suceso already drawn in this battle (none repeats). */
  sucesosVistos: SucesoId[];
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
  /** Players who must pick a replacement before the next turn: their active fainted, or (Al tendedero) is going back to the bench. */
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
  | { tipo: 'grada'; accion: 'cana' | 'abucheo'; objetivo: number }
  /** The player gives up the turn on purpose (the hunting mode: throwing a jarra at a wild userito is decided outside the engine). */
  | { tipo: 'pasar' };

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
  /** `j`: the player the line is about (the target of «no afecta», who retires or drinks a caña, the target of a critical hit or a status...), when the screen can use it:
   *  the lines of an area move are told apart by target with it. */
  | { k: 'texto'; j?: number }
  /** `obj`: the players the move was aimed at (after redirections), `[]` for moves on itself. */
  | { k: 'usa'; j: number; mov: string; obj?: number[] }
  /** `dano`: the HP really lost (the bar and the statistics use it). `bruto` (only when it is more than `dano`): the damage of the blow before the cap of the HP the userito
   *  had left, with critical, effectiveness and the defence's reductions already applied (and before the 1 HP caps of Duro como un cajón, Aguantar el tipo and Guille's
   *  Mañico): 150 when a userito with 30 HP left takes a hit of 150 (`dano` 30). The screen shows `bruto ?? dano`; only the «biggest hit» record counts it.
   *  `acorralado`: this hit was halved because another player had already hit the same userito this turn (Acorralado); the screen marks it with a symbol next to the damage. */
  | { k: 'golpe'; j: number; dano: number; ps: number; ef: number; critico: boolean; acorralado?: true; bruto?: number }
  | { k: 'falla'; j: number }
  | { k: 'cura'; j: number; ps: number }
  /** `estado: null` = a status ended; `de` says which (always set by the engine in that case). */
  | { k: 'estado'; j: number; estado: Estado | 'achispado' | null; de?: Estado | 'achispado' }
  | { k: 'nivel'; j: number; stat: Stat; cambio: number }
  | { k: 'cae'; j: number }
  | { k: 'sale'; j: number; idx: number }
  | { k: 'eliminado'; j: number; puesto: number }
  | { k: 'fin'; ganador: number }
  /** A suceso of the bar starts, at the end of the turn before it (so it is on screen before anyone chooses). `turnos`: how long it lasts
   *  (0 = instant). `clave` is its phrase (`suceso.<id>.frase`); the effects that follow (heals, stages) are ordinary events. */
  | { k: 'suceso'; id: SucesoId; turnos: number }
  /** The object carried by `j`'s userito works (and from now on everybody can see it). `clave`: its line (`objeto.<id>.activa`, `.falla`...). */
  | { k: 'objeto'; j: number; objeto: ObjetoId }
  /** The ability of `j`'s userito works (and everybody sees its name over the userito): `id` is the ability, `clave` an optional phrase (`hab.<id>.activa`).
   *  What it does (stages, heals, a status that does not land...) follows as ordinary events. */
  | { k: 'habilidad'; j: number; id: HabilidadId }
);

/** How a game is set up (docs/POKEUSERA.md, «Modo AL AZAR»): NORMAL = draft and La barra; AL AZAR = the game deals everybody 3 useritos and 1 object, the player only chooses who comes out first. */
export type ModoJuego = 'normal' | 'azar';
export const MODOS_JUEGO: readonly ModoJuego[] = ['normal', 'azar'];

/** Draft (snake order) shared state. */
export interface EstadoDraft {
  /** Player index for each pick, e.g. 0,1,2,3,3,2,1,0,0,1,2,3. */
  orden: number[];
  /** Picks made so far: species ids, aligned with `orden`. */
  elegidos: string[];
}
