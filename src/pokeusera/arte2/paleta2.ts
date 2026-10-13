// PokéUsera · Edición Jarra (arte v2): UI palette. Same warm-paper identity as v1, but with a dark plum
// outline instead of near-black, a gold accent line and a soft vertical gradient on the panels.

/** Logical screen of the v2 art: GBA width, portrait. */
export const ANCHO2 = 240;
export const ALTO2 = 520;

export const TINTA2 = '#3b2a3f';
export const TINTA_SUAVE = '#6e5a70';
export const SOMBRA_TEXTO = '#d8c8a2';
export const PAPEL_ALTO = '#fdf6e4';
export const PAPEL_MEDIO = '#f8edd2';
export const PAPEL_BAJO = '#efdfb8';
export const ORO_UI = '#e0a83a';
export const ORO_UI_OSC = '#a8741c';

/** Seat colours (red, blue, green, orange), each with a light and a dark tone for bevels. */
export const JUGADORES2: { base: string; claro: string; oscuro: string }[] = [
  { base: '#d4382c', claro: '#f0705c', oscuro: '#8c1c1c' },
  { base: '#2f62cf', claro: '#6e98f0', oscuro: '#1c3a8c' },
  { base: '#2e9a3c', claro: '#6ccc6c', oscuro: '#1a5c28' },
  { base: '#dc7a14', claro: '#fcae4c', oscuro: '#8c4806' },
];

/** HP bar tones: [highlight, base, shade] for high, medium and low health. */
export const PS_TONOS = {
  alto: ['#a6f08c', '#42c43c', '#1f7a2e'],
  medio: ['#fff08a', '#f0c01c', '#a87a0c'],
  bajo: ['#ff9a86', '#e83a2c', '#9c1c1c'],
};
export const PS_PISTA = '#4a3a50';
export const PS_PISTA_CLARA = '#6e5a70';

export function tonosPS(frac: number): string[] {
  return frac > 0.5 ? PS_TONOS.alto : frac > 0.2 ? PS_TONOS.medio : PS_TONOS.bajo;
}
