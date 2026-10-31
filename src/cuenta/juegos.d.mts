export const JUEGOS: { readonly capitulo1: string; readonly capitulo2: string; readonly pang: string; readonly aventura: string; readonly pokeusera: string };
export const MAX_JUEGO: number;
export const MAX_PERFIL: number;
export function esJuego(x: unknown): x is keyof typeof JUEGOS;
export function limpiarAct(x: unknown, ahora?: number): number | null;
export function limpiarDatos(x: unknown): string | null | undefined;
