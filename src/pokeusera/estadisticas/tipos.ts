// PokéUsera · estadísticas acumuladas (docs/POKEUSERA.md, «Estadísticas acumuladas»): los tipos del resumen de una batalla y de los agregados.
// El resumen (`ResumenBatalla`) es lo que el móvil manda a `POST /api/batallas` y lo que el servidor guarda, una línea por batalla, en su JSONL.
// Los agregados (`Agregado`) los calcula `agregado.mjs`, el mismo código en el servidor y en el móvil, para que cuenten igual.
import type { EntrenadorId, EscenarioId, ObjetoId, SucesoId } from '../tipos';

/** Versión del formato del resumen y del agregado. */
export const FORMATO = 1;

/** Un userito en una batalla. Claves cortas: viajan en el resumen. */
export interface ResumenUserito {
  /** Especie. */
  e: string;
  /** Orden en que se eligió en el draft (0 a 2; sin draft, su sitio en el equipo). */
  o: number;
  /** Objeto de «La barra» que llevaba (null: ninguno). */
  ob: ObjetoId | null;
  /** 1 si el objeto llegó a activarse. */
  oa: 0 | 1;
  /** 1 si salió de inicio. */
  ini: 0 | 1;
  /** Daño hecho a otros / recibido de otros / propio y de la barra / curado. */
  dh: number;
  dr: number;
  dp: number;
  cu: number;
  /** Derribos. */
  ko: number;
  /** 1 si cayó. */
  ca: 0 | 1;
  /** Turnos en campo. */
  tf: number;
  /** Críticos dados. */
  cr: number;
  /** Veces que se activó su habilidad. */
  ha: number;
  /** Su mejor golpe: daño y movimiento. */
  mx: number;
  mm: string;
  /** Por movimiento: `[usos, daño]`. */
  mv: Record<string, [number, number]>;
}

export interface ResumenJugador {
  /** Entrenador. */
  en: EntrenadorId;
  /** 1 si lo llevaba una persona, 0 si la máquina. */
  pe: 0 | 1;
  /** Puesto final (1 a 4). */
  pu: number;
  /** Ventaja de entrenador: `cana` (Fran), `labia` (Pablo), `tarde` (Chuchi), `manico` (Guille). */
  ve: string;
  /** Cuenta de usuario (aún no hay cuentas: null). */
  cu: string | null;
  us: ResumenUserito[];
}

export type ModoBatalla = 'maquina' | 'online' | 'aventura';

export interface ResumenBatalla {
  v: number;
  /** Identificador al azar: el servidor no guarda dos veces el mismo. */
  id: string;
  /** Versión del juego que la jugó. */
  ver: string;
  /** Fecha (milisegundos desde 1970). */
  f: number;
  mo: ModoBatalla;
  es: EscenarioId;
  /** Turnos que duró. */
  tu: number;
  /** Sucesos del bar que salieron. */
  su: SucesoId[];
  ju: ResumenJugador[];
}

/** Lo acumulado de una especie, de un objeto, de un entrenador... (sumas: el medio se calcula al mostrarlo). */
export interface AcEspecie {
  /** Veces elegido. */
  n: number;
  /** Veces que ganó su jugador. */
  g: number;
  /** Suma de puestos. */
  pu: number;
  dh: number;
  dr: number;
  dp: number;
  cu: number;
  ko: number;
  /** Batallas en que cayó. */
  ca: number;
  tf: number;
  cr: number;
  ha: number;
  /** Veces que salió de inicio. */
  ini: number;
  /** Veces que llevó objeto y veces que se le activó. */
  ob: number;
  oa: number;
  /** Veces elegido en primera, segunda y tercera ronda del draft. */
  ord: [number, number, number];
}
export interface AcObjeto {
  n: number;
  a: number;
  g: number;
  pu: number;
  dh: number;
  ko: number;
}
export interface AcEntrenador {
  n: number;
  g: number;
  pu: number;
  dh: number;
  dr: number;
  ko: number;
}
export interface AcMov {
  /** Usos y daño total. */
  u: number;
  d: number;
}
/** Un récord: su valor y el contexto (qué userito, qué movimiento, dónde, cuándo). */
export interface Marca {
  v: number;
  f: number;
  e?: string;
  m?: string;
  en?: EntrenadorId;
  es?: EscenarioId;
}

export interface Seccion {
  n: number;
  tu: number;
  esp: Record<string, AcEspecie>;
  mov: Record<string, AcMov>;
  obj: Record<string, AcObjeto>;
  esc: Record<string, { n: number; tu: number }>;
  ent: Record<string, AcEntrenador>;
  suc: Record<string, number>;
  rec: Record<string, Marca>;
}

export interface Agregado {
  v: number;
  /** Fecha de la primera y de la última batalla (0: ninguna). */
  desde: number;
  hasta: number;
  /** Todas las batallas. */
  todas: Seccion;
  /** Solo las batallas con alguna persona, contando solo a las personas y a sus useritos. */
  personas: Seccion;
}

/** Lo que el servidor necesita saber del juego para validar un resumen (`pokeusera-catalogo.json`, sale de datos.ts al compilar). */
export interface Catalogo {
  especies: string[];
  movs: string[];
  objetos: string[];
  entrenadores: string[];
  escenarios: string[];
  sucesos: string[];
}
