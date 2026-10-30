import type { Agregado, Catalogo, ResumenBatalla, Seccion } from './tipos';

export const FORMATO: number;
export const RECORDS: readonly string[];
export function agregadoVacio(): Agregado;
export function sumarResumen(ag: Agregado, r: ResumenBatalla): void;
export function seccionDe(ag: Agregado, soloPersonas: boolean): Seccion;
export function agregadoValido(x: unknown): Agregado | null;
export function prepararCatalogo(c: Catalogo): unknown;
export function normalizarResumen(r: unknown, cat: unknown): { resumen: ResumenBatalla } | { error: string };
