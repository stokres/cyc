// PokéUsera · Edición Jarra: all the data of docs/POKEUSERA.md (type chart, the 24 useritos,
// the move table and the engine-side effect of each move). Names are data; every sentence the
// game says lives in src/textos/pokeusera-combate.md.
import type { EscenarioId, Especie, Estado, Movimiento, ObjetoId, Stat, SucesoId, Tipo } from './tipos';

export const TIPOS: readonly Tipo[] = ['mindundi', 'petardo', 'droga', 'bronca', 'ventolera', 'chispa', 'alcohol', 'juerga', 'chanza', 'grasa', 'fantasma'];

export const TIPO_NOMBRE: Record<Tipo, string> = {
  mindundi: 'Mindundi',
  petardo: 'Petardo',
  droga: 'Droga',
  bronca: 'Bronca',
  ventolera: 'Ventolera',
  chispa: 'Chispa',
  alcohol: 'Alcohol',
  juerga: 'Juerga',
  chanza: 'Chanza',
  grasa: 'Grasa',
  fantasma: 'Fantasma',
};

// ---------------------------------------------------------------- type chart

const TABLA: Record<Tipo, { x2?: Tipo[]; x05?: Tipo[]; x0?: Tipo[] }> = {
  mindundi: { x05: ['bronca'], x0: ['fantasma'] },
  petardo: { x2: ['droga', 'alcohol'], x05: ['petardo', 'bronca', 'grasa'] },
  droga: { x2: ['bronca', 'grasa'], x05: ['petardo', 'droga', 'alcohol'] },
  bronca: { x2: ['petardo', 'chispa'], x05: ['droga'], x0: ['ventolera'] },
  ventolera: { x2: ['petardo', 'juerga'], x05: ['chispa', 'bronca'] },
  chispa: { x2: ['ventolera', 'alcohol'], x05: ['chispa', 'droga'], x0: ['bronca'] },
  alcohol: { x2: ['grasa', 'droga'], x05: ['alcohol', 'petardo'] },
  juerga: { x2: ['mindundi', 'bronca'], x05: ['grasa'] },
  chanza: { x2: ['juerga', 'fantasma'], x05: ['chanza'] },
  grasa: { x2: ['alcohol', 'juerga'], x05: ['petardo', 'droga'] },
  fantasma: { x2: ['chanza', 'fantasma'], x0: ['mindundi'] },
};

/** Effectiveness of an attack type against a (one or two types) defender: 0, 0.25, 0.5, 1, 2, 4. */
export function eficacia(tipoAtaque: Tipo, defensa: readonly Tipo[]): number {
  const t = TABLA[tipoAtaque];
  let m = 1;
  for (const d of defensa) {
    if (t.x0?.includes(d)) return 0;
    if (t.x2?.includes(d)) m *= 2;
    else if (t.x05?.includes(d)) m *= 0.5;
  }
  return m;
}

// ---------------------------------------------------------------- useritos
// Balance of batch 4 (13-oct, `node scripts/pokeusera-motor.mjs --especies=8000`, docs/POKEUSERA.md §3): stats shuffled
// keeping 420 in 19 useritos (the slow tanks give bulk for speed; the weak ones get bulk back), Caparazón +1 DEF and 5 PP,
// «A dos voces» 65 → 75. Win rate went from ×0.65–×1.68 of the average to ×0.75–×1.35.

const e = (id: string, nombre: string, tipos: Especie['tipos'], ps: number, ata: number, def: number, vel: number, esp: number, movs: Especie['movs']): Especie => ({
  id,
  nombre,
  tipos,
  base: { ps, ata, def, vel, esp },
  movs,
});

export const ESPECIES: Especie[] = [
  e('draguserin', 'Draguserín', ['petardo', 'ventolera'], 75, 80, 70, 95, 100, ['traca', 'petardazo', 'planeo', 'esconderse']),
  e('goudazard', 'Goudazard', ['grasa', 'petardo'], 75, 70, 85, 90, 100, ['goudamadre', 'fogonazo', 'pringue', 'rebozado']),
  e('aceituna', 'Aceituna', ['mindundi', 'chanza'], 90, 100, 90, 75, 65, ['lametazo', 'mecuelo', 'vacile', 'chapa']),
  e('cierzon', 'Cierzón', ['ventolera'], 75, 95, 70, 105, 75, ['cierzo', 'planeo', 'rebufo', 'venganza']),
  e('turroncho', 'Turroncho', ['bronca', 'droga'], 85, 80, 95, 70, 90, ['almendrazo', 'adoquin', 'caparazon', 'siesta']),
  e('tocinon', 'Tocinón', ['mindundi', 'grasa'], 105, 95, 70, 75, 75, ['barrigazo', 'pringue', 'temblor', 'siesta']),
  e('roscochoco', 'Roscochoco', ['grasa', 'juerga'], 100, 75, 85, 60, 100, ['indigestion', 'fritanga', 'conga', 'rebozado']),
  e('espumarro', 'Espumarro', ['alcohol', 'mindundi'], 95, 70, 80, 75, 100, ['ronda', 'garrafon', 'unamas', 'barrigazo']),
  e('cajonazo', 'Cajonazo', ['juerga'], 100, 115, 100, 50, 55, ['rumba', 'taconeo', 'aguantar', 'compas']),
  e('lentejasur', 'Lentejasur', ['droga', 'fantasma'], 70, 65, 70, 100, 115, ['lluvia', 'tropezon', 'susto', 'esporas']),
  e('tragaperras', 'Tragaperras', ['chispa', 'chanza'], 75, 60, 80, 90, 115, ['premio', 'chispazo', 'zasca', 'cizana']),
  e('turito', 'Turito', ['mindundi'], 105, 70, 95, 70, 80, ['chapa', 'pillo', 'turra', 'bostezo']),
  e('resacon', 'Resacón', ['alcohol', 'fantasma'], 85, 90, 80, 75, 90, ['dolor', 'chupitazo', 'venganza', 'aguantar']),
  e('evoscar', 'Evoscar', ['mindundi', 'bronca'], 100, 105, 95, 55, 65, ['coz', 'devolver', 'dosvoces', 'siy']),
  e('chupitochu', 'Chupitochu', ['alcohol', 'petardo'], 75, 55, 75, 90, 125, ['chupitazo', 'fogonazo', 'garrafon', 'esconderse']),
  e('caravaner', 'Caravaner', ['bronca', 'juerga'], 85, 85, 75, 85, 90, ['cancion', 'temblor', 'caparazon', 'siesta']),
  e('camioner', 'Camioner', ['mindundi', 'bronca'], 105, 125, 100, 35, 55, ['trompazo', 'adoquin', 'bocinazo', 'cancion']),
  e('criaturitah', 'Criaturitah', ['droga', 'chanza'], 80, 60, 80, 100, 100, ['esporas', 'raices', 'colleja', 'monada']),
  e('ego-ego', 'Ego-Ego', ['fantasma'], 80, 100, 75, 95, 70, ['eco', 'chuleria', 'flipada', 'quepague']),
  e('kbronero', 'Kbronero', ['chispa', 'juerga'], 80, 90, 70, 85, 95, ['solo', 'distorsion', 'pogo', 'compas']),
  // Batch 4 (13-oct): the four new ones go at the end, so the Nº of the others does not change.
  e('cubatillo', 'Cubatillo', ['alcohol', 'chispa'], 70, 55, 70, 115, 110, ['burbujeo', 'ronda', 'chispazo', 'unamas']),
  e('p', 'P', ['mindundi', 'chanza'], 95, 90, 100, 60, 75, ['pesao', 'chapa', 'quepague', 'cara_de_pena']),
  e('jesuspelo', 'JesúsPelo', ['droga', 'ventolera'], 85, 90, 75, 95, 75, ['tubo', 'setas', 'raices', 'planeo']),
  e('pantaloneto', 'Pantaloneto', ['mindundi', 'ventolera'], 95, 120, 90, 75, 40, ['pantalones', 'cierzo', 'chapa', 'mecuelo']),
];

export const ESPECIE: Record<string, Especie> = Object.fromEntries(ESPECIES.map((s) => [s.id, s]));

// ---------------------------------------------------------------- moves

const m = (id: string, nombre: string, tipo: Tipo, pot: number | null, prec: number | null, pp: number, objetivo: Movimiento['objetivo'], prioridad?: number): Movimiento => {
  const mov: Movimiento = { id, nombre, tipo, pot, prec, pp, objetivo };
  if (prioridad) mov.prioridad = prioridad;
  return mov;
};

const LISTA_MOVS: Movimiento[] = [
  m('barrigazo', 'Barrigazo', 'mindundi', 85, 100, 8, 'uno'),
  m('trompazo', 'Trompazo', 'mindundi', 120, 90, 3, 'uno'),
  m('galope', 'Galope', 'mindundi', 80, 100, 8, 'uno'),
  m('lametazo', 'Lametazo', 'mindundi', 30, 100, 10, 'uno'),
  m('chapa', 'Dar la chapa', 'mindundi', 80, 100, 8, 'uno'),
  m('pillo', 'Te pillo en la barra', 'mindundi', 25, 90, 8, 'uno'),
  m('bocinazo', 'Bocinazo', 'mindundi', null, 100, 8, 'todos'),
  m('turra', 'Turra', 'mindundi', null, 90, 5, 'todos'),
  m('bostezo', 'Bostezo', 'mindundi', null, 100, 5, 'uno'),
  m('cara_de_pena', 'Cara de pena', 'mindundi', null, 100, 10, 'uno'),
  m('esconderse', 'Esconderse', 'mindundi', null, null, 5, 'yo', 2),
  // Tanda 6 (14-oct): priority +2 protections, +1 quick moves and a −1 counter (docs/POKEUSERA.md, «Prioridad y protección»).
  m('quepague', '¡Que pague otro!', 'chanza', null, null, 5, 'yo', 2),
  m('aguantar', 'Aguantar el tipo', 'mindundi', null, null, 5, 'yo', 2),
  m('mecuelo', '¡Me cuelo!', 'mindundi', 40, 100, 10, 'uno', 1),
  m('rebufo', 'Rebufo', 'ventolera', 40, 100, 10, 'uno', 1),
  m('colleja', 'Colleja', 'chanza', 40, 100, 10, 'uno', 1),
  // Pot null (it deals a fixed 1.5× of what it took), target chosen by the engine.
  m('devolver', 'Devolvérsela', 'bronca', null, 100, 5, 'auto', -1),
  m('siesta', 'Siesta', 'mindundi', null, null, 5, 'yo'),
  m('pantalones', 'Bajarse los pantalones', 'mindundi', null, null, 5, 'yo'),
  m('traca', 'Traca', 'petardo', 70, 100, 5, 'todos'),
  m('fogonazo', 'Fogonazo', 'petardo', 90, 100, 8, 'uno'),
  m('petardazo', 'Petardazo', 'petardo', 110, 85, 3, 'uno'),
  m('raices', 'Raíces', 'droga', 60, 100, 8, 'uno'),
  m('almendrazo', 'Almendrazo', 'droga', 85, 100, 8, 'uno'),
  m('lluvia', 'Lluvia de lentejas', 'droga', 25, 90, 10, 'uno'),
  m('esporas', 'Esporas', 'droga', null, 75, 8, 'uno'),
  m('setas', 'Setas', 'droga', 70, 100, 8, 'uno'),
  m('temblor', 'Temblor', 'bronca', 80, 100, 5, 'todos'),
  m('adoquin', 'Adoquín', 'bronca', 100, 85, 5, 'uno'),
  m('caparazon', 'Caparazón', 'bronca', null, null, 5, 'yo'),
  m('cierzo', 'Cierzo', 'ventolera', 70, 95, 5, 'todos'),
  m('planeo', 'Planeo', 'ventolera', 80, 100, 8, 'uno'),
  m('tubo', 'Tubo perfecto', 'ventolera', 90, 95, 5, 'uno'),
  m('remolino', 'Remolino', 'ventolera', null, 100, 8, 'uno'),
  m('chispazo', 'Chispazo', 'chispa', 90, 100, 8, 'uno'),
  m('burbujeo', 'Burbujeo', 'chispa', 65, 100, 5, 'todos'),
  m('distorsion', 'Distorsión', 'chispa', 60, 100, 5, 'todos'),
  m('solo', 'Solo de teclado', 'chispa', 130, 90, 3, 'uno'),
  m('premio', 'Premio gordo', 'chispa', null, 100, 5, 'uno'),
  m('chupitazo', 'Chupitazo', 'alcohol', 80, 100, 8, 'uno'),
  m('ronda', 'Ronda', 'alcohol', 65, 100, 5, 'todos'),
  m('garrafon', 'Garrafón', 'alcohol', 110, 85, 3, 'uno'),
  m('unamas', '¡Una más!', 'alcohol', null, 100, 5, 'todos'),
  m('dolor', 'Dolor de cabeza', 'alcohol', null, 90, 8, 'uno'),
  m('rumba', 'Rumba', 'juerga', 20, 90, 10, 'uno'),
  m('taconeo', 'Taconeo', 'juerga', 85, 100, 8, 'uno'),
  m('conga', 'Conga', 'juerga', 70, 100, 5, 'todos'),
  m('pogo', 'Pogo', 'juerga', 75, 95, 5, 'todos'),
  m('coz', 'Coz doble', 'juerga', 45, 100, 8, 'uno'),
  m('chuleria', 'Chulería', 'juerga', 80, 100, 8, 'uno'),
  m('compas', 'Compás', 'juerga', null, null, 10, 'yo'),
  m('cancion', '¡Camioneees y caravanaaas!', 'juerga', 90, 100, 3, 'todos'),
  m('zasca', 'Zasca', 'chanza', 100, 90, 5, 'uno'),
  m('vacile', 'Vacile', 'chanza', 80, 100, 8, 'uno'),
  m('pesao', 'P de Pesao', 'chanza', 60, 100, 8, 'uno'),
  m('dosvoces', 'A dos voces', 'bronca', 75, 100, 5, 'todos'),
  m('monada', 'Monada', 'chanza', null, 100, 8, 'todos'),
  m('cizana', 'Cizaña', 'chanza', null, 90, 5, 'uno'),
  // «Sí, y…» has no fixed target: the engine treats it as «yo» and borrows the copied move's target kind.
  m('siy', 'Sí, y…', 'chanza', null, null, 8, 'yo'),
  m('fritanga', 'Fritanga', 'grasa', 90, 100, 8, 'uno'),
  m('goudamadre', 'De Goudamadre', 'grasa', 95, 100, 5, 'uno'),
  m('pringue', 'Pringue', 'grasa', 65, 100, 5, 'todos'),
  m('tropezon', 'Tropezón', 'grasa', 70, 100, 8, 'uno'),
  m('indigestion', 'Indigestión', 'grasa', null, 90, 5, 'uno'),
  m('rebozado', 'Rebozado', 'grasa', null, null, 10, 'yo'),
  m('susto', 'Susto', 'fantasma', 40, 100, 10, 'uno', 1),
  m('eco', 'Eco', 'fantasma', 40, 100, 10, 'uno'),
  m('venganza', 'Venganza', 'fantasma', 50, 100, 5, 'uno'),
  m('flipada', 'Flipada', 'fantasma', null, null, 5, 'yo'),
  m('selfie', 'Selfie', 'fantasma', null, 70, 8, 'todos'),
  // Used when no move has PP left (Mindundi, 50, never misses, recoil 1/4).
  m('desesperada', 'A la desesperada', 'mindundi', 50, null, 1, 'uno'),
];

export const MOVS: Record<string, Movimiento> = Object.fromEntries(LISTA_MOVS.map((x) => [x.id, x]));

/** Id of «A la desesperada», what a userito does when every move is out of PP. */
export const DESESPERADA = 'desesperada';

// ---------------------------------------------------------------- engine-side effects

export interface Efecto {
  /** Fixed number of hits, or 'multi' for 2–5 (Gen 1 odds). */
  golpes?: 2 | 'multi';
  /** Status inflicted on the target (prob in percent; 100 on pure status moves). */
  estado?: { estado: Estado | 'achispado'; prob: number };
  /** Stage changes. `prob` defaults to 100. */
  nivel?: { a: 'objetivo' | 'yo'; stat: Stat; cambio: number; prob?: number }[];
  /** Heals half of the damage dealt. */
  drena?: boolean;
  /** The user takes 1/4 of the damage it deals. */
  rebote?: boolean;
  /** Traps the target 2–5 turns. */
  atrapa?: boolean;
  /** Percent chance to make the target flinch (only if it has not acted yet). */
  retrocede?: number;
  /** The user must skip the next turn. */
  recarga?: boolean;
  /** The target cannot switch next turn. */
  bloqueaCambio?: boolean;
  /** Moves with their own logic. */
  especial?: 'premio' | 'siy' | 'venganza' | 'cancion' | 'esconderse' | 'quepague' | 'aguantar' | 'devolver' | 'siesta' | 'remolino' | 'bostezo' | 'cizana';
}

export const EFECTOS: Record<string, Efecto> = {
  barrigazo: { estado: { estado: 'paralizado', prob: 30 } },
  trompazo: { rebote: true },
  lametazo: { estado: { estado: 'paralizado', prob: 30 } },
  chapa: { nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1, prob: 20 }] },
  pillo: { atrapa: true },
  bocinazo: { nivel: [{ a: 'objetivo', stat: 'ata', cambio: -1 }] },
  turra: {
    nivel: [
      { a: 'objetivo', stat: 'ata', cambio: -1 },
      { a: 'objetivo', stat: 'esp', cambio: -1 },
    ],
  },
  bostezo: { especial: 'bostezo' },
  cara_de_pena: { nivel: [{ a: 'objetivo', stat: 'ata', cambio: -2 }] },
  esconderse: { especial: 'esconderse' },
  quepague: { especial: 'quepague' },
  aguantar: { especial: 'aguantar' },
  devolver: { especial: 'devolver' },
  siesta: { especial: 'siesta' },
  traca: { estado: { estado: 'quemado', prob: 10 } },
  fogonazo: { estado: { estado: 'quemado', prob: 10 } },
  petardazo: { estado: { estado: 'quemado', prob: 30 } },
  raices: { drena: true },
  lluvia: { golpes: 'multi' },
  esporas: { estado: { estado: 'dormido', prob: 100 } },
  setas: { estado: { estado: 'achispado', prob: 30 } },
  caparazon: { nivel: [{ a: 'yo', stat: 'def', cambio: 1 }] },
  cierzo: { nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1 }] },
  remolino: { especial: 'remolino' },
  chispazo: { estado: { estado: 'paralizado', prob: 10 } },
  burbujeo: { estado: { estado: 'paralizado', prob: 10 } },
  distorsion: { estado: { estado: 'achispado', prob: 10 } },
  solo: { recarga: true },
  premio: { especial: 'premio' },
  chupitazo: { estado: { estado: 'achispado', prob: 20 } },
  ronda: { estado: { estado: 'achispado', prob: 10 } },
  garrafon: { estado: { estado: 'achispado', prob: 30 } },
  unamas: { bloqueaCambio: true, nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1 }] },
  dolor: { estado: { estado: 'achispado', prob: 100 } },
  rumba: { golpes: 'multi' },
  taconeo: { retrocede: 20 },
  pogo: { retrocede: 20 },
  coz: { golpes: 2 },
  compas: { nivel: [{ a: 'yo', stat: 'ata', cambio: 2 }] },
  cancion: { especial: 'cancion' },
  vacile: { nivel: [{ a: 'objetivo', stat: 'esp', cambio: -1, prob: 20 }] },
  monada: { nivel: [{ a: 'objetivo', stat: 'ata', cambio: -1 }] },
  cizana: { especial: 'cizana' },
  siy: { especial: 'siy' },
  fritanga: { estado: { estado: 'quemado', prob: 20 } },
  goudamadre: { estado: { estado: 'quemado', prob: 20 } },
  pesao: { nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1 }] },
  // Self stage changes after a damaging hit (motor/combate.ts: `acerto`).
  tubo: { nivel: [{ a: 'yo', stat: 'vel', cambio: 1 }] },
  pantalones: {
    nivel: [
      { a: 'yo', stat: 'ata', cambio: 2 },
      { a: 'yo', stat: 'vel', cambio: 2 },
      { a: 'yo', stat: 'def', cambio: -2 },
    ],
  },
  pringue: { nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1, prob: 20 }] },
  tropezon: { estado: { estado: 'empachado', prob: 30 } },
  indigestion: { estado: { estado: 'empachado', prob: 100 } },
  rebozado: { nivel: [{ a: 'yo', stat: 'def', cambio: 2 }] },
  eco: { golpes: 2 },
  venganza: { especial: 'venganza' },
  flipada: {
    nivel: [
      { a: 'yo', stat: 'ata', cambio: 1 },
      { a: 'yo', stat: 'esp', cambio: 1 },
      { a: 'yo', stat: 'vel', cambio: 1 },
      { a: 'yo', stat: 'def', cambio: -1 },
    ],
  },
  selfie: { nivel: [{ a: 'objetivo', stat: 'prec', cambio: -1 }] },
  desesperada: { rebote: true },
};

// ---------------------------------------------------------------- sucesos del bar

/** Turns at whose start something happens in the bar (the engine draws it at the end of the turn before). From turn 30 «Hora de cerrar» rules. */
export const TURNOS_SUCESO: readonly number[] = [5, 10, 15, 20, 25];

/** `dura`: turns it lasts (0 = instant). `escenario`: the only place where it can happen (null = anywhere). */
export const SUCESOS: Record<SucesoId, { dura: number; escenario: EscenarioId | null }> = {
  ronda: { dura: 0, escenario: null },
  luz: { dura: 2, escenario: null },
  happy: { dura: 2, escenario: null },
  cumple: { dura: 0, escenario: null },
  pelea: { dura: 1, escenario: null },
  karaoke: { dura: 1, escenario: null },
  barre: { dura: 0, escenario: 'brio' },
  premio: { dura: 0, escenario: 'brio' },
  cierzo: { dura: 2, escenario: 'terraza' },
  rosas: { dura: 0, escenario: 'terraza' },
  desfile: { dura: 2, escenario: 'rural' },
  peluca: { dura: 0, escenario: 'rural' },
  comanda: { dura: 0, escenario: 'juan' },
  chinchin: { dura: 2, escenario: 'juan' },
};

/** The sucesos that can happen in a place: the general ones plus its own. */
export const sucesosDe = (escenario: EscenarioId): SucesoId[] => (Object.keys(SUCESOS) as SucesoId[]).filter((id) => SUCESOS[id].escenario === null || SUCESOS[id].escenario === escenario);

// ---------------------------------------------------------------- objetos de la barra

/** `permanente`: it works every time it can and is never used up (Palillo, Gafas, Zapatillas, Pañuelo); the others work once. Names and sentences: `objeto.<id>.*` in pokeusera-combate.md. */
export const OBJETO_PERMANENTE: Record<ObjetoId, boolean> = {
  mechero: false,
  chicle: false,
  bocata: false,
  posavasos: false,
  tapon: false,
  palillo: true,
  gafas: true,
  zapatillas: true,
  panuelo: true,
  llavero: false,
};
