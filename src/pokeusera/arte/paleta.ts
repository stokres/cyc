// PokéUsera · Edición Jarra: the UI palette (Game Boy Color feel, warm paper instead of green).
import type { Tipo } from '../tipos';

/** The four UI shades: warm paper, light, dark, near-black. */
export const PAPEL = '#f8f0d8';
export const CLARO = '#c4b48c';
export const OSCURO = '#6a5a44';
export const NEGRO = '#221a14';

/** Background of the battle field (pale grass-green, easy on the eyes behind the sprites). */
export const FONDO = '#dfe9bd';
/** A slightly darker field tone for the ground ellipses under the useritos. */
export const SUELO = '#b9cc8c';

/** Player colours (seat 0..3), all readable on the paper colour: red, blue, green, orange. */
export const COLOR_JUGADOR: string[] = ['#d4382c', '#2f62cf', '#2e9a3c', '#dc7a14'];

/** HP bar colours: green above 50 %, yellow above 20 %, red below. */
export const PS_VERDE = '#38b43c';
export const PS_AMARILLO = '#eeba1c';
export const PS_ROJO = '#e03a2c';
export const PS_FONDO = '#8c7e66';

export function colorPS(frac: number): string {
  return frac > 0.5 ? PS_VERDE : frac > 0.2 ? PS_AMARILLO : PS_ROJO;
}

/** Colour of each type badge. */
export const COLOR_TIPO: Record<Tipo, string> = {
  mindundi: '#aaa08a',
  petardo: '#e8562a',
  droga: '#4fb34a',
  bronca: '#b98c4c',
  ventolera: '#7eaee6',
  chispa: '#eec31c',
  alcohol: '#a85cc4',
  juerga: '#ee6aa4',
  chanza: '#32b4aa',
  grasa: '#d58a2c',
  fantasma: '#6860a8',
};

/** Display names of the types (data, not prose). */
export const NOMBRE_TIPO: Record<Tipo, string> = {
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
