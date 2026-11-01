export type TablaId = 'pang' | 'pangGrupo' | 'rana' | 'palabras' | 'robot' | 'cerdos';
export interface ExtraPang {
  pj: string;
  fase: number;
  /** Jugadores de la partida (2 a 4): solo en la tabla `pangGrupo`. */
  n?: number;
}
export const PJS_PANG: string[];
export const FASES_PANG: number;
export const GRUPO_MIN: number;
export const GRUPO_MAX: number;
export const TABLAS: Readonly<Record<TablaId, { readonly max: number; readonly extra: 'pang' | 'pangGrupo' | null }>>;
export const POR_CUENTA: number;
export const POR_TABLA: number;
export const TOP: number;
export function esTabla(x: unknown): x is TablaId;
export function limpiarPuntos(tabla: unknown, x: unknown): number | null;
export function limpiarExtra(tabla: unknown, x: unknown): ExtraPang | null | undefined;
export function limpiarFecha(x: unknown, ahora?: number): number;
