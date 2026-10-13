// PokéUsera · Edición Jarra: all the data of docs/POKEUSERA.md (type chart, the 20 useritos,
// the move table and the engine-side effect of each move). Names are data; every sentence the
// game says lives in src/textos/pokeusera-combate.md.
import type { Especie, Estado, Movimiento, Stat, Tipo } from './tipos';

export const TIPOS: readonly Tipo[] = ['normal', 'fuego', 'droga', 'bronca', 'aire', 'chispa', 'alcohol', 'juerga', 'chanza', 'grasa', 'fantasma'];

export const TIPO_NOMBRE: Record<Tipo, string> = {
  normal: 'Normal',
  fuego: 'Fuego',
  droga: 'Droga',
  bronca: 'Bronca',
  aire: 'Aire',
  chispa: 'Chispa',
  alcohol: 'Alcohol',
  juerga: 'Juerga',
  chanza: 'Chanza',
  grasa: 'Grasa',
  fantasma: 'Fantasma',
};

// ---------------------------------------------------------------- type chart

const TABLA: Record<Tipo, { x2?: Tipo[]; x05?: Tipo[]; x0?: Tipo[] }> = {
  normal: { x05: ['bronca'], x0: ['fantasma'] },
  fuego: { x2: ['droga', 'alcohol'], x05: ['fuego', 'bronca', 'grasa'] },
  droga: { x2: ['bronca', 'grasa'], x05: ['fuego', 'droga', 'alcohol'] },
  bronca: { x2: ['fuego', 'chispa'], x05: ['droga'], x0: ['aire'] },
  aire: { x2: ['fuego', 'juerga'], x05: ['chispa', 'bronca'] },
  chispa: { x2: ['aire', 'alcohol'], x05: ['chispa', 'droga'], x0: ['bronca'] },
  alcohol: { x2: ['grasa', 'droga'], x05: ['alcohol', 'fuego'] },
  juerga: { x2: ['normal', 'bronca'], x05: ['grasa'] },
  chanza: { x2: ['juerga', 'fantasma'], x05: ['chanza'] },
  grasa: { x2: ['alcohol', 'juerga'], x05: ['fuego', 'droga'] },
  fantasma: { x2: ['chanza', 'fantasma'], x0: ['normal'] },
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

const e = (id: string, nombre: string, tipos: Especie['tipos'], ps: number, ata: number, def: number, vel: number, esp: number, movs: Especie['movs']): Especie => ({
  id,
  nombre,
  tipos,
  base: { ps, ata, def, vel, esp },
  movs,
});

export const ESPECIES: Especie[] = [
  e('draguserin', 'Draguserín', ['fuego', 'aire'], 75, 80, 70, 95, 100, ['traca', 'petardazo', 'planeo', 'esconderse']),
  e('goudazard', 'Goudazard', ['grasa', 'fuego'], 85, 70, 90, 65, 110, ['fritanga', 'fogonazo', 'pringue', 'rebozado']),
  e('aceitun', 'Aceitún', ['droga', 'grasa'], 70, 85, 70, 110, 85, ['raices', 'pringue', 'lametazo', 'cara_de_pena']),
  e('cierzon', 'Cierzón', ['aire'], 70, 90, 65, 120, 75, ['cierzo', 'planeo', 'remolino', 'venganza']),
  e('turroncho', 'Turroncho', ['bronca', 'droga'], 100, 80, 125, 35, 80, ['almendrazo', 'adoquin', 'caparazon', 'siesta']),
  e('tocinon', 'Tocinón', ['normal', 'grasa'], 150, 95, 80, 30, 65, ['barrigazo', 'pringue', 'temblor', 'siesta']),
  e('roscochoco', 'Roscochoco', ['grasa', 'juerga'], 105, 75, 90, 50, 100, ['indigestion', 'fritanga', 'conga', 'rebozado']),
  e('espumarro', 'Espumarro', ['alcohol', 'normal'], 95, 70, 80, 75, 100, ['ronda', 'garrafon', 'unamas', 'barrigazo']),
  e('cajonazo', 'Cajonazo', ['juerga'], 85, 105, 90, 80, 60, ['rumba', 'taconeo', 'temblor', 'compas']),
  e('lentejasur', 'Lentejasur', ['droga', 'fantasma'], 60, 65, 60, 120, 115, ['lluvia', 'tropezon', 'susto', 'esporas']),
  e('tragaperras', 'Tragaperras', ['chispa', 'chanza'], 85, 60, 95, 65, 115, ['premio', 'chispazo', 'zasca', 'cizana']),
  e('turito', 'Turito', ['normal'], 115, 70, 110, 45, 80, ['chapa', 'pillo', 'turra', 'bostezo']),
  e('resacon', 'Resacón', ['alcohol', 'fantasma'], 80, 90, 75, 85, 90, ['dolor', 'chupitazo', 'venganza', 'siesta']),
  e('evoscar', 'Evoscar', ['juerga', 'chanza'], 85, 90, 75, 90, 80, ['coz', 'galope', 'dosvoces', 'siy']),
  e('chupitochu', 'Chupitochu', ['alcohol', 'fuego'], 60, 55, 60, 120, 125, ['chupitazo', 'fogonazo', 'garrafon', 'esconderse']),
  e('caravaner', 'Caravaner', ['bronca', 'juerga'], 110, 90, 115, 30, 75, ['cancion', 'temblor', 'caparazon', 'siesta']),
  e('camioner', 'Camioner', ['normal', 'bronca'], 100, 125, 100, 50, 45, ['trompazo', 'adoquin', 'bocinazo', 'cancion']),
  e('criaturitah', 'Criaturitah', ['droga', 'chanza'], 80, 60, 80, 100, 100, ['esporas', 'raices', 'vacile', 'monada']),
  e('ego-ego', 'Ego-Ego', ['fantasma'], 70, 105, 65, 110, 70, ['eco', 'chuleria', 'flipada', 'selfie']),
  e('kbronero', 'Kbronero', ['chispa', 'juerga'], 80, 90, 70, 85, 95, ['solo', 'distorsion', 'pogo', 'compas']),
];

export const ESPECIE: Record<string, Especie> = Object.fromEntries(ESPECIES.map((s) => [s.id, s]));

// ---------------------------------------------------------------- moves

const m = (id: string, nombre: string, tipo: Tipo, pot: number | null, prec: number | null, pp: number, objetivo: Movimiento['objetivo'], prioridad?: number): Movimiento => {
  const mov: Movimiento = { id, nombre, tipo, pot, prec, pp, objetivo };
  if (prioridad) mov.prioridad = prioridad;
  return mov;
};

const LISTA_MOVS: Movimiento[] = [
  m('barrigazo', 'Barrigazo', 'normal', 85, 100, 8, 'uno'),
  m('trompazo', 'Trompazo', 'normal', 120, 90, 3, 'uno'),
  m('galope', 'Galope', 'normal', 80, 100, 8, 'uno'),
  m('lametazo', 'Lametazo', 'normal', 30, 100, 10, 'uno'),
  m('chapa', 'Dar la chapa', 'normal', 80, 100, 8, 'uno'),
  m('pillo', 'Te pillo en la barra', 'normal', 25, 90, 8, 'uno'),
  m('bocinazo', 'Bocinazo', 'normal', null, 100, 8, 'todos'),
  m('turra', 'Turra', 'normal', null, 90, 5, 'todos'),
  m('bostezo', 'Bostezo', 'normal', null, 100, 5, 'uno'),
  m('cara_de_pena', 'Cara de pena', 'normal', null, 100, 10, 'uno'),
  m('esconderse', 'Esconderse', 'normal', null, null, 5, 'yo', 2),
  m('siesta', 'Siesta', 'normal', null, null, 5, 'yo'),
  m('traca', 'Traca', 'fuego', 70, 100, 5, 'todos'),
  m('fogonazo', 'Fogonazo', 'fuego', 90, 100, 8, 'uno'),
  m('petardazo', 'Petardazo', 'fuego', 110, 85, 3, 'uno'),
  m('raices', 'Raíces', 'droga', 60, 100, 8, 'uno'),
  m('almendrazo', 'Almendrazo', 'droga', 85, 100, 8, 'uno'),
  m('lluvia', 'Lluvia de lentejas', 'droga', 25, 90, 10, 'uno'),
  m('esporas', 'Esporas', 'droga', null, 75, 8, 'uno'),
  m('temblor', 'Temblor', 'bronca', 80, 100, 5, 'todos'),
  m('adoquin', 'Adoquín', 'bronca', 100, 85, 5, 'uno'),
  m('caparazon', 'Caparazón', 'bronca', null, null, 10, 'yo'),
  m('cierzo', 'Cierzo', 'aire', 70, 95, 5, 'todos'),
  m('planeo', 'Planeo', 'aire', 80, 100, 8, 'uno'),
  m('remolino', 'Remolino', 'aire', null, 100, 8, 'uno'),
  m('chispazo', 'Chispazo', 'chispa', 90, 100, 8, 'uno'),
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
  m('dosvoces', 'A dos voces', 'chanza', 65, 100, 5, 'todos'),
  m('monada', 'Monada', 'chanza', null, 100, 8, 'todos'),
  m('cizana', 'Cizaña', 'chanza', null, 90, 5, 'uno'),
  // «Sí, y…» has no fixed target: the engine treats it as «yo» and borrows the copied move's target kind.
  m('siy', 'Sí, y…', 'chanza', null, null, 8, 'yo'),
  m('fritanga', 'Fritanga', 'grasa', 90, 100, 8, 'uno'),
  m('pringue', 'Pringue', 'grasa', 65, 100, 5, 'todos'),
  m('tropezon', 'Tropezón', 'grasa', 70, 100, 8, 'uno'),
  m('indigestion', 'Indigestión', 'grasa', null, 90, 5, 'uno'),
  m('rebozado', 'Rebozado', 'grasa', null, null, 10, 'yo'),
  m('susto', 'Susto', 'fantasma', 40, 100, 10, 'uno', 1),
  m('eco', 'Eco', 'fantasma', 40, 100, 10, 'uno'),
  m('venganza', 'Venganza', 'fantasma', 50, 100, 5, 'uno'),
  m('flipada', 'Flipada', 'fantasma', null, null, 5, 'yo'),
  m('selfie', 'Selfie', 'fantasma', null, 70, 8, 'todos'),
  // Used when no move has PP left (Normal, 50, never misses, recoil 1/4).
  m('desesperada', 'A la desesperada', 'normal', 50, null, 1, 'uno'),
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
  especial?: 'premio' | 'siy' | 'venganza' | 'cancion' | 'esconderse' | 'siesta' | 'remolino' | 'bostezo' | 'cizana';
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
  siesta: { especial: 'siesta' },
  traca: { estado: { estado: 'quemado', prob: 10 } },
  fogonazo: { estado: { estado: 'quemado', prob: 10 } },
  petardazo: { estado: { estado: 'quemado', prob: 30 } },
  raices: { drena: true },
  lluvia: { golpes: 'multi' },
  esporas: { estado: { estado: 'dormido', prob: 100 } },
  caparazon: { nivel: [{ a: 'yo', stat: 'def', cambio: 2 }] },
  cierzo: { nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1 }] },
  remolino: { especial: 'remolino' },
  chispazo: { estado: { estado: 'paralizado', prob: 10 } },
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
