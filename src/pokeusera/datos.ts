// PokéUsera · Edición Jarra: all the data of docs/POKEUSERA.md (type chart, the 32 useritos,
// the move table and the engine-side effect of each move). Names are data; every sentence the
// game says lives in src/textos/pokeusera-combate.md.
import type { EscenarioId, Especie, Estado, HabilidadId, Movimiento, ObjetoId, Stat, SucesoId, Tipo } from './tipos';

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
  ventolera: { x2: ['petardo', 'juerga', 'grasa'], x05: ['chispa', 'bronca'] },
  chispa: { x2: ['ventolera', 'alcohol'], x05: ['chispa', 'droga'], x0: ['bronca'] },
  alcohol: { x2: ['grasa', 'droga'], x05: ['alcohol', 'petardo'] },
  juerga: { x2: ['mindundi', 'bronca'], x05: ['grasa'] },
  chanza: { x2: ['juerga', 'fantasma'], x05: ['chanza'] },
  grasa: { x2: ['alcohol', 'juerga'], x05: ['petardo', 'droga'] },
  fantasma: { x2: ['chanza', 'fantasma', 'chispa'], x0: ['mindundi'] },
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

const e = (id: string, nombre: string, tipos: Especie['tipos'], ps: number, ata: number, def: number, vel: number, esp: number, movs: Especie['movs'], habilidad: HabilidadId): Especie => ({
  id,
  nombre,
  tipos,
  base: { ps, ata, def, vel, esp },
  movs,
  habilidad,
});

export const ESPECIES: Especie[] = [
  e('draguserin', 'Draguserín', ['petardo', 'ventolera'], 75, 80, 70, 105, 90, ['traca', 'petardazo', 'planeo', 'esconderse'], 'fuego_dragon'),
  e('goudazard', 'Goudazard', ['grasa', 'petardo'], 75, 70, 85, 90, 100, ['goudamadre', 'fogonazo', 'pringue', 'rebozado'], 'gratinado'),
  e('aceituna', 'Aceituna', ['mindundi', 'chanza'], 90, 100, 90, 75, 65, ['lametazo', 'mecuelo', 'vacile', 'chapa'], 'buena_chica'),
  e('cierzon', 'Cierzón', ['ventolera'], 75, 95, 70, 105, 75, ['cierzo', 'planeo', 'rebufo', 'venganza'], 'manico'),
  e('turroncho', 'Turroncho', ['bronca', 'droga'], 75, 90, 90, 95, 70, ['almendrazo', 'adoquin', 'caparazon', 'siesta'], 'duro_de_roer'),
  e('tocinon', 'Tocinón', ['mindundi', 'grasa'], 105, 95, 70, 75, 75, ['barrigazo', 'pringue', 'temblor', 'siesta'], 'kilos'),
  e('roscochoco', 'Roscochoco', ['grasa', 'juerga'], 100, 75, 85, 60, 100, ['indigestion', 'fritanga', 'conga', 'rebozado'], 'indigesto'),
  e('espumarro', 'Espumarro', ['alcohol', 'mindundi'], 95, 70, 80, 75, 100, ['ronda', 'garrafon', 'unamas', 'barrigazo'], 'espuma'),
  e('cajonazo', 'Cajonazo', ['juerga'], 105, 110, 100, 45, 60, ['remate', 'taconeo', 'aguantar', 'temblor'], 'cajon'),
  e('lentejasur', 'Lentejasur', ['droga', 'fantasma'], 80, 55, 70, 100, 115, ['lluvia', 'tropezon', 'susto', 'esporas'], 'inesperado'),
  e('tragaperras', 'Tragaperras', ['chispa', 'chanza'], 75, 60, 80, 90, 115, ['premio', 'chispazo', 'zasca', 'cizana'], 'bote'),
  e('turito', 'Turito', ['mindundi'], 100, 70, 90, 80, 80, ['chapa', 'pillo', 'turra', 'bostezo'], 'conazo'),
  e('resacon', 'Resacón', ['alcohol', 'fantasma'], 85, 80, 80, 75, 100, ['dolor', 'chupitazo', 'venganza', 'aguantar'], 'curado'),
  e('evoscar', 'Evoscar', ['mindundi', 'bronca'], 100, 95, 95, 55, 75, ['coz', 'devolver', 'dosvoces', 'siy'], 'dos_cabezas'),
  e('chupitochu', 'Chupitochu', ['alcohol', 'petardo'], 85, 45, 75, 90, 125, ['chupitazo', 'fogonazo', 'garrafon', 'esconderse'], 'ardiente'),
  e('caravaner', 'Caravaner', ['bronca', 'juerga'], 85, 85, 70, 95, 85, ['cancion', 'temblor', 'caparazon', 'siesta'], 'pareja'),
  e('camioner', 'Camioner', ['mindundi', 'bronca'], 105, 120, 95, 35, 65, ['trompazo', 'adoquin', 'bocinazo', 'cancion'], 'pareja'),
  e('criaturitah', 'Criaturitah', ['droga', 'chanza'], 70, 80, 70, 100, 100, ['esporas', 'raices', 'colleja', 'monada'], 'fotosintesis'),
  e('ego-ego', 'Ego-Ego', ['fantasma'], 80, 100, 75, 95, 70, ['eco', 'chuleria', 'flipada', 'quepague'], 'flipado'),
  e('kbronero', 'Kbronero', ['chispa', 'juerga'], 80, 90, 70, 85, 95, ['solo', 'distorsion', 'pogo', 'compas'], 'volumen'),
  // Batch 4 (13-oct): the four new ones go at the end, so the Nº of the others does not change.
  e('cubatillo', 'Cubatillo', ['alcohol', 'chispa'], 70, 55, 70, 115, 110, ['burbujeo', 'ronda', 'chispazo', 'unamas'], 'hielo'),
  e('p', 'P', ['mindundi', 'chanza'], 90, 90, 100, 65, 75, ['pesao', 'chapa', 'quepague', 'cara_de_pena'], 'pesadisimo'),
  e('jesuspelo', 'JesúsPelo', ['droga', 'ventolera'], 85, 95, 80, 95, 65, ['tubo', 'setas', 'raices', 'planeo'], 'ola'),
  e('pantaloneto', 'Pantaloneto', ['mindundi', 'ventolera'], 95, 110, 90, 75, 50, ['pantalones', 'tendedero', 'chapa', 'mecuelo'], 'lavado'),
  // Batch 8 (14-oct): six more, Nº 25-30, again at the end so the Nº of the others does not change. Each one has an ability (docs/POKEUSERA.md, «Habilidades»).
  e('maletrio', 'Maletrio', ['bronca', 'fantasma'], 90, 100, 105, 55, 70, ['maletazo', 'embarque', 'cinturones', 'venganza'], 'maleta'),
  e('teloneon', 'Teloneon', ['chanza', 'fantasma'], 70, 75, 65, 110, 100, ['improvisa', 'monologo', 'zasca', 'susto'], 'publico'),
  e('choquechu', 'Choquechu', ['chispa', 'petardo'], 80, 80, 80, 100, 80, ['carambola', 'ficha', 'chispazo', 'fogonazo'], 'corriente'),
  e('torrezmon', 'Torrezmón', ['grasa', 'droga'], 85, 75, 70, 100, 90, ['crujiente', 'limon', 'fritanga', 'pringue'], 'grasiento'),
  e('papiroflexeon', 'Papiroflexeon', ['ventolera'], 85, 105, 75, 95, 60, ['cortepapel', 'papiroflexia', 'rebufo', 'chuleria'], 'viento'),
  e('ceceseta', 'Ceceseta', ['juerga', 'chanza'], 95, 95, 80, 85, 65, ['pasodoble', 'mancha', 'cancion', 'zasca'], 'fan'),
  // Batch 9 (15-oct): Nº 31-32, again at the end.
  e('mariachi', 'Mariachi', ['juerga', 'petardo'], 105, 95, 80, 70, 70, ['ayayay', 'serenata', 'picante', 'taconeo'], 'cantaynollores'),
  e('pulpino', 'Pulpiño', ['bronca', 'grasa'], 95, 105, 85, 65, 70, ['ochotortas', 'tinta', 'morrina', 'adoquin'], 'malaleche'),
  // Tanda 12 (19-oct, Nº 33-37): Cilantrox, Fotomatón, Cloudtrio, Cigarr and OllaLocah.
  e('cilantrox', 'Cilantrox', ['droga', 'juerga'], 80, 85, 70, 90, 95, ['fiestapagana', 'esporas', 'conga', 'almendrazo'], 'jabon'),
  e('fotomaton', 'Fotomatón', ['bronca', 'chispa'], 80, 100, 80, 70, 90, ['todosdentro', 'flash', 'adoquin', 'temblor'], 'tira'),
  e('cloudtrio', 'Cloudtrio', ['ventolera', 'chanza'], 75, 110, 60, 85, 90, ['nubarron', 'carisimo', 'planeo', 'zasca'], 'blandito'),
  e('cigarr', 'Cigarr', ['petardo', 'fantasma'], 90, 45, 75, 100, 110, ['calada', 'fogonazo', 'susto', 'esconderse'], 'humo'),
  e('ollalocah', 'OllaLocah', ['juerga', 'ventolera'], 95, 90, 90, 70, 75, ['vueltas', 'conga', 'rebufo', 'remolino'], 'feria'),
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
  m('esporas', 'Droja', 'droga', null, 75, 5, 'uno'),
  m('setas', 'Setas', 'droga', 70, 100, 8, 'uno'),
  m('temblor', 'Temblor', 'bronca', 80, 100, 5, 'todos'),
  m('adoquin', 'Adoquinazo', 'bronca', 100, 85, 5, 'uno'),
  m('caparazon', 'Caparazón', 'bronca', null, null, 5, 'yo'),
  m('cierzo', 'Cierzo', 'ventolera', 60, 95, 5, 'todos'),
  // Tanda 7 (Pantaloneto): hits one rival and, if it lands, goes back to the bench (the player picks who comes in, like after a fall).
  m('tendedero', 'Al tendedero', 'ventolera', 90, 100, 8, 'uno'),
  m('planeo', 'Planeo', 'ventolera', 80, 100, 8, 'uno'),
  m('tubo', 'Golpe de Tabla', 'ventolera', 90, 95, 5, 'uno'),
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
  m('rumba', 'Rumba', 'juerga', 30, 90, 10, 'uno'),
  // Tanda 7 (Cajonazo): the lower its HP, the harder it hits (see `potenciaRemate`). `pot` is only the nominal middle of the range.
  m('remate', 'Remate por bulerías', 'juerga', 110, 100, 5, 'uno'),
  m('taconeo', 'Taconeo', 'juerga', 95, 100, 8, 'uno'),
  m('conga', 'Conga', 'juerga', 70, 100, 5, 'todos'),
  m('pogo', 'Pogo', 'juerga', 75, 95, 5, 'todos'),
  m('coz', 'Coz doble', 'juerga', 55, 100, 8, 'uno'),
  m('chuleria', 'Chulería', 'juerga', 80, 100, 8, 'uno'),
  m('compas', 'Compás', 'juerga', null, null, 10, 'yo'),
  m('cancion', '¡Camioneees y caravanaaas!', 'juerga', 75, 100, 3, 'todos'),
  m('zasca', 'Zasca', 'chanza', 100, 90, 5, 'uno'),
  m('vacile', 'Vacile', 'chanza', 80, 100, 8, 'uno'),
  m('pesao', 'P de Pesao', 'chanza', 60, 100, 8, 'uno'),
  m('dosvoces', 'A dos voces', 'bronca', 85, 100, 5, 'todos'),
  m('monada', 'Monada', 'chanza', null, 100, 8, 'todos'),
  m('cizana', 'Cizaña', 'chanza', null, 90, 5, 'uno'),
  // «Sí, y…» has no fixed target: the engine treats it as «yo» and borrows the copied move's target kind.
  m('siy', 'Sin Narrativa', 'chanza', null, null, 8, 'yo'),
  m('fritanga', 'Fritanga', 'grasa', 90, 100, 8, 'uno'),
  m('goudamadre', 'De Goudamadre', 'grasa', 95, 100, 5, 'uno'),
  m('pringue', 'Pringue', 'grasa', 65, 100, 5, 'todos'),
  m('tropezon', 'Tropezón', 'grasa', 70, 100, 8, 'uno'),
  m('indigestion', 'Indigestión', 'grasa', null, 90, 5, 'uno'),
  m('rebozado', 'Rebozado', 'grasa', null, null, 10, 'yo'),
  m('susto', 'Susto', 'fantasma', 40, 100, 10, 'uno', 1),
  m('eco', 'Eco', 'fantasma', 35, 100, 10, 'uno'),
  m('venganza', 'Venganza', 'fantasma', 50, 100, 5, 'uno'),
  m('flipada', 'Flipada', 'fantasma', null, null, 5, 'yo'),
  m('selfie', 'Selfie', 'fantasma', null, 70, 8, 'todos'),
  // Tanda 8 (14-oct, the six new useritos): 13 moves, all with one owner.
  m('maletazo', 'Maletazo', 'bronca', 90, 100, 8, 'uno'),
  m('embarque', '¡3, 2, 1... Despegamos!', 'bronca', 40, 100, 10, 'uno', 1),
  m('cinturones', 'Abróchense los cinturones', 'bronca', null, null, 5, 'yo'),
  // Like «Sí, y…» it has no target of its own: the engine picks a move at random and, if it is a single-target one, a rival at random.
  m('improvisa', '¡Improvisa!', 'chanza', null, null, 8, 'yo'),
  m('monologo', 'Monólogo', 'chanza', 55, 100, 5, 'todos'),
  m('carambola', 'Voy to loco', 'chispa', 70, 100, 5, 'todos'),
  m('ficha', 'Otra ficha', 'chispa', null, null, 5, 'yo'),
  m('crujiente', 'Crujiente', 'grasa', 25, 90, 10, 'uno'),
  m('limon', 'Con limón', 'droga', null, null, 5, 'yo'),
  m('cortepapel', 'Corte de papel', 'ventolera', 90, 100, 8, 'uno'),
  m('papiroflexia', 'Papiroflexia', 'ventolera', null, null, 5, 'yo'),
  m('pasodoble', 'Pasodoble', 'juerga', 80, 100, 8, 'uno'),
  m('mancha', 'Mancha de cerveza', 'alcohol', 75, 100, 8, 'uno'),
  // Tanda 9 (15-oct, Mariachi and Pulpiño): six moves, all with one owner.
  m('ayayay', '¡Ay, ay, ay!', 'juerga', 85, 100, 5, 'todos'),
  m('serenata', 'Serenata', 'juerga', null, 100, 5, 'uno'),
  m('picante', 'Salsa picante', 'petardo', 90, 100, 8, 'uno'),
  m('ochotortas', 'Ocho tortas', 'bronca', 12, 90, 5, 'uno'),
  m('tinta', 'Chorro de tinta', 'grasa', 60, 100, 8, 'uno'),
  m('morrina', 'Morriña', 'mindundi', null, 100, 8, 'uno'),
  // Tanda 12 (19-oct, Cilantrox, Fotomatón, Cloudtrio, Cigarr and OllaLocah): seven moves, all with one owner.
  m('fiestapagana', 'Fiesta pagana', 'juerga', 75, 100, 5, 'todos'),
  m('todosdentro', '¡Todos dentro!', 'bronca', 70, 100, 5, 'todos'),
  m('flash', 'Flash', 'chispa', 55, 100, 10, 'uno'),
  m('nubarron', 'Nubarrón', 'ventolera', 60, 100, 8, 'todos'),
  m('carisimo', 'Está carísimo', 'chanza', 70, 100, 8, 'uno'),
  m('calada', 'Calada', 'petardo', 60, 100, 10, 'uno'),
  m('vueltas', 'Dar vueltas', 'ventolera', 60, 100, 10, 'uno'),
  // Used when no move has PP left (Mindundi, 50, never misses, recoil 1/4).
  m('desesperada', 'A la desesperada', 'mindundi', 50, null, 1, 'uno'),
];

export const MOVS: Record<string, Movimiento> = Object.fromEntries(LISTA_MOVS.map((x) => [x.id, x]));

/** Id of «A la desesperada», what a userito does when every move is out of PP. */
export const DESESPERADA = 'desesperada';

// ---------------------------------------------------------------- engine-side effects

export interface Efecto {
  /** Fixed number of hits, or 'multi' for 2–5 (Gen 1 odds). */
  golpes?: 2 | 8 | 'multi';
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
  /** Critical-hit chance multiplier (Corte de papel: ×3). */
  critico?: number;
  /** Moves with their own logic. */
  especial?: 'premio' | 'siy' | 'venganza' | 'cancion' | 'esconderse' | 'quepague' | 'aguantar' | 'devolver' | 'siesta' | 'remolino' | 'bostezo' | 'cizana' | 'tendedero' | 'remate' | 'improvisa' | 'ficha' | 'limon' | 'serenata' | 'morrina';
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
  cierzo: { nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1, prob: 50 }] },
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
      { a: 'yo', stat: 'vel', cambio: 1 },
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
    ],
  },
  selfie: { nivel: [{ a: 'objetivo', stat: 'prec', cambio: -1 }] },
  desesperada: { rebote: true },
  tendedero: { especial: 'tendedero' },
  remate: { especial: 'remate' },
  // Tanda 8.
  maletazo: { nivel: [{ a: 'objetivo', stat: 'def', cambio: -1, prob: 20 }] },
  cinturones: {
    nivel: [
      { a: 'yo', stat: 'ata', cambio: 1 },
      { a: 'yo', stat: 'def', cambio: 1 },
    ],
  },
  improvisa: { especial: 'improvisa' },
  monologo: { nivel: [{ a: 'objetivo', stat: 'esp', cambio: -1, prob: 20 }] },
  carambola: { nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1, prob: 20 }] },
  ficha: { especial: 'ficha' },
  crujiente: { golpes: 'multi' },
  limon: { nivel: [{ a: 'yo', stat: 'esp', cambio: 1 }], especial: 'limon' },
  cortepapel: { critico: 3 },
  papiroflexia: {
    nivel: [
      { a: 'yo', stat: 'ata', cambio: 1 },
      { a: 'yo', stat: 'vel', cambio: 1 },
    ],
  },
  pasodoble: { nivel: [{ a: 'yo', stat: 'vel', cambio: 1, prob: 30 }] },
  mancha: { nivel: [{ a: 'objetivo', stat: 'prec', cambio: -1, prob: 30 }] },
  // Tanda 9.
  ayayay: { retrocede: 10 },
  serenata: { especial: 'serenata' },
  picante: { estado: { estado: 'quemado', prob: 20 } },
  ochotortas: { golpes: 8 },
  tinta: { nivel: [{ a: 'objetivo', stat: 'prec', cambio: -1 }] },
  fiestapagana: { nivel: [{ a: 'objetivo', stat: 'def', cambio: -1, prob: 20 }] },
  todosdentro: { nivel: [{ a: 'objetivo', stat: 'vel', cambio: -1, prob: 30 }] },
  flash: { nivel: [{ a: 'objetivo', stat: 'prec', cambio: -1, prob: 30 }] },
  carisimo: { nivel: [{ a: 'objetivo', stat: 'esp', cambio: -1, prob: 30 }] },
  calada: { estado: { estado: 'quemado', prob: 30 } },
  vueltas: { retrocede: 20 },
  morrina: {
    nivel: [
      { a: 'objetivo', stat: 'ata', cambio: -1 },
      { a: 'objetivo', stat: 'vel', cambio: -1 },
    ],
    especial: 'morrina',
  },
};

/** The moves ¡Improvisa! can pick: every move that has not exactly one owner among the useritos (so not the ones made for one userito, like Al tendedero
 *  or Remate por bulerías), without the protections (priority +2), «Sí, y…», «A la desesperada» and itself. */
export const MOVS_IMPROVISA: readonly string[] = Object.keys(MOVS).filter((id) => {
  const duenos = ESPECIES.filter((sp) => sp.movs.includes(id)).length;
  return duenos !== 1 && (MOVS[id].prioridad ?? 0) < 2 && id !== 'siy' && id !== DESESPERADA && id !== 'improvisa';
});

/** The sound moves (music, horns, shouts, voices): the ones Fer's «Cancelación de ruido» halves, and the ones the Useritopedia labels SONIDO (docs/POKEUSERA.md, «Ventajas de entrenador»).
 *  Bocinazo, ¡Ay, ay, ay!, Serenata, Distorsión, Solo de teclado, Pasodoble, ¡Camioneees y caravanaaas!, A dos voces, Eco and Monólogo. Not sounds: Turra, Dar la chapa,
 *  Zasca or Susto (talk or scares), the Petardo explosions and the dances. */
export const MOVS_SONIDO: readonly string[] = ['bocinazo', 'ayayay', 'serenata', 'distorsion', 'solo', 'pasodoble', 'cancion', 'dosvoces', 'eco', 'monologo'];
export const esSonido = (id: string): boolean => MOVS_SONIDO.includes(id);

/** «Remate por bulerías»: 20 at full HP up to 200 on the brink, 20 + 180 × (1 − HP / max HP), rounded. */
export const potenciaRemate = (ps: number, psMax: number): number => Math.round(20 + 180 * (1 - Math.max(0, Math.min(psMax, ps)) / psMax));

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
  choque: { dura: 0, escenario: 'feria' },
  pista: { dura: 3, escenario: 'feria' },
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
