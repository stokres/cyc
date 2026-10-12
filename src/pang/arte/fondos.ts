// The twelve backgrounds of the Pang, in pixel art, each painted ONCE into a W × H canvas
// (cached) and drawn with one drawImage per frame. The scenes live in ./fondos/*.ts; this
// file puts the frame of blocks, the floor tiles and the score strip around each one.
import { AREA, FRANJA, H, W, type FondoId } from '../tipos';
import { type Azar, type Ctx, type TemaMarco, type TipoSuelo, marco, rect, semilla, suelo } from './fondos/base';
import { calle, madridrio, usera } from './fondos/barrio';
import { bolilandia, piso, teatro } from './fondos/interior';
import { avila, granja, jijona, nevada, vegas, zaragoza } from './fondos/viaje';

interface Receta {
  escena: (x: Ctx, r: Azar) => void;
  marco: TemaMarco;
  suelo: TipoSuelo;
}

/** Each stage: its scene, the tint of its frame of blocks and its floor. */
const RECETAS: Record<FondoId, Receta> = {
  usera: { escena: usera, marco: { base: '#5a6a8a', base2: '#546384', luz: '#7a8aaa', sombra: '#3a4866' }, suelo: 'ladrillo' },
  calle: { escena: calle, marco: { base: '#4a4660', base2: '#433f58', luz: '#6a6684', sombra: '#2a2840' }, suelo: 'adoquin' },
  piso: { escena: piso, marco: { base: '#5a4a5e', base2: '#524356', luz: '#7a6a7e', sombra: '#34283a' }, suelo: 'parquet' },
  bolilandia: { escena: bolilandia, marco: { base: '#4a58a0', base2: '#8a3a52', luz: '#7a88c8', sombra: '#26305e' }, suelo: 'acolchado' },
  teatro: { escena: teatro, marco: { base: '#4a2430', base2: '#421e2a', luz: '#6a3a48', sombra: '#240e18' }, suelo: 'tablas' },
  granja: { escena: granja, marco: { base: '#6a4a38', base2: '#5e4232', luz: '#8a6a50', sombra: '#3a2619' }, suelo: 'paja' },
  madridrio: { escena: madridrio, marco: { base: '#4a5470', base2: '#424c68', luz: '#6a7490', sombra: '#262e48' }, suelo: 'paseo' },
  avila: { escena: avila, marco: { base: '#7a6a66', base2: '#706160', luz: '#9a8a84', sombra: '#463a3c' }, suelo: 'piedra' },
  zaragoza: { escena: zaragoza, marco: { base: '#8a6858', base2: '#7e5e50', luz: '#aa8a78', sombra: '#583e34' }, suelo: 'losas' },
  jijona: { escena: jijona, marco: { base: '#b0a090', base2: '#a49484', luz: '#d0c4b4', sombra: '#7a6c60' }, suelo: 'terracota' },
  nevada: { escena: nevada, marco: { base: '#8a5a44', base2: '#7e503c', luz: '#aa7a62', sombra: '#583528' }, suelo: 'arena' },
  vegas: { escena: vegas, marco: { base: '#3a2060', base2: '#32185a', luz: '#6a3a9a', sombra: '#1a0c34' }, suelo: 'alfombra' },
};

const SEMILLAS: Record<FondoId, number> = {
  usera: 101, calle: 202, piso: 303, bolilandia: 404, teatro: 505, granja: 606,
  madridrio: 707, avila: 808, zaragoza: 909, jijona: 1010, nevada: 1111, vegas: 1212,
};

const cache = new Map<FondoId, HTMLCanvasElement>();

/**
 * The whole screen for a stage: the scene inside the play area (x 8–376, y 8–184), the
 * frame of blocks around it, the floor tiles from 184 to 192 and black from 192 down
 * (the score strip, drawn by the game).
 */
export function fondo(id: FondoId): HTMLCanvasElement {
  let c = cache.get(id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const rec = RECETAS[id];
  const r = semilla(SEMILLAS[id]);
  // The scene is clipped to the play area; the frame and the floor are painted over it.
  x.save();
  x.beginPath();
  x.rect(AREA.izq, AREA.techo, AREA.der - AREA.izq, AREA.suelo - AREA.techo);
  x.clip();
  rec.escena(x, r);
  x.restore();
  marco(x, rec.marco, r);
  suelo(x, rec.suelo, r);
  rect(x, 0, FRANJA, W, H - FRANJA, '#05060c');
  cache.set(id, c);
  return c;
}
