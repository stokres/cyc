// The enemies of «Alacant Sun»: the night of the fiestas and the theatre, and the narrator who has stolen
// the end of the play. Five kinds, each with a second colour variant (a harder one with another name, as the
// original does), drawn once in pixel art into cached canvases (24 to 44 px) with a dark outline of their
// own colour. Data (stats, attacks, rewards) and drawing live here; the names and the lines of their
// attacks are in src/textos/sol.md (`enemigo.<id>.nombre`, `enemigo.<id>.<ataque>`).
import { type Elemento } from './grupo';
import { contorno } from './contorno';
import { apuntador } from './iconos';
import { ctx, elipse, lienzo, rect, una } from './pixel';

/** How an enemy attack works. */
export type TipoAtaque =
  /** One friend, `pot` × normal damage. */
  | 'golpe'
  /** Every friend, `pot` × normal damage. */
  | 'todos'
  /** Every friend, and the enemy falls apart. */
  | 'estallido'
  /** One friend, and it steals IP too. */
  | 'chupa'
  /** One friend; half of his defence does not count. */
  | 'perfora';

export interface AtaqueEnemigo {
  id: string;
  tipo: TipoAtaque;
  pot: number;
  /** Chance weight against the enemy's other attacks. */
  peso: number;
  el?: Elemento | null;
  /** Only when the enemy has half its health or less. */
  herido?: boolean;
}

export type Pintor = 'petardo' | 'movil' | 'spoiler' | 'critico' | 'mosquito' | 'apuntador';

export interface DefEnemigo {
  id: string;
  pintor: Pintor;
  /** Which palette of the painter. */
  paleta: 0 | 1;
  el: Elemento | null;
  pv: number;
  atk: number;
  def: number;
  agi: number;
  exp: number;
  monedas: number;
  botin?: { objeto: string; prob: number };
  ataques: AtaqueEnemigo[];
  /** Pixels it hovers over the ground (a mosquito). */
  flota: number;
  /** Frames of its idle animation. */
  frames: number;
}

export const ENEMIGOS: Record<string, DefEnemigo> = {
  petardo: {
    id: 'petardo', pintor: 'petardo', paleta: 0, el: 'fuego', pv: 22, atk: 14, def: 4, agi: 9, exp: 10, monedas: 6, flota: 0, frames: 2,
    ataques: [
      { id: 'chispazo', tipo: 'golpe', pot: 1, peso: 3, el: 'fuego' },
      { id: 'traca', tipo: 'estallido', pot: 1.2, peso: 3, el: 'fuego', herido: true },
    ],
  },
  traca: {
    id: 'traca', pintor: 'petardo', paleta: 1, el: 'fuego', pv: 30, atk: 17, def: 6, agi: 10, exp: 16, monedas: 9, flota: 0, frames: 2,
    botin: { objeto: 'chupito', prob: 0.25 },
    ataques: [
      { id: 'chispazo', tipo: 'golpe', pot: 1, peso: 3, el: 'fuego' },
      { id: 'traca', tipo: 'estallido', pot: 1.3, peso: 3, el: 'fuego', herido: true },
    ],
  },
  movil: {
    id: 'movil', pintor: 'movil', paleta: 0, el: 'agua', pv: 26, atk: 11, def: 6, agi: 12, exp: 11, monedas: 7, flota: 0, frames: 2,
    ataques: [
      { id: 'vibracion', tipo: 'golpe', pot: 1, peso: 2 },
      { id: 'politono', tipo: 'todos', pot: 0.55, peso: 2, el: 'viento' },
    ],
  },
  movil2: {
    id: 'movil2', pintor: 'movil', paleta: 1, el: 'agua', pv: 36, atk: 13, def: 8, agi: 13, exp: 17, monedas: 10, flota: 0, frames: 2,
    ataques: [
      { id: 'vibracion', tipo: 'golpe', pot: 1, peso: 2 },
      { id: 'politono', tipo: 'todos', pot: 0.65, peso: 2, el: 'viento' },
    ],
  },
  spoiler: {
    id: 'spoiler', pintor: 'spoiler', paleta: 0, el: null, pv: 24, atk: 13, def: 3, agi: 10, exp: 12, monedas: 8, flota: 4, frames: 2,
    ataques: [
      { id: 'destripe', tipo: 'perfora', pot: 1.05, peso: 3 },
      { id: 'susurro', tipo: 'golpe', pot: 0.8, peso: 1 },
    ],
  },
  spoiler2: {
    id: 'spoiler2', pintor: 'spoiler', paleta: 1, el: null, pv: 34, atk: 16, def: 4, agi: 12, exp: 18, monedas: 11, flota: 4, frames: 2,
    botin: { objeto: 'turron', prob: 0.25 },
    ataques: [
      { id: 'destripe', tipo: 'perfora', pot: 1.1, peso: 3 },
      { id: 'susurro', tipo: 'golpe', pot: 0.8, peso: 1 },
    ],
  },
  critico: {
    id: 'critico', pintor: 'critico', paleta: 0, el: 'tierra', pv: 38, atk: 14, def: 8, agi: 7, exp: 15, monedas: 10, flota: 0, frames: 2,
    ataques: [
      { id: 'tachon', tipo: 'golpe', pot: 1, peso: 3 },
      { id: 'critica', tipo: 'chupa', pot: 0.8, peso: 2 },
    ],
  },
  critico2: {
    id: 'critico2', pintor: 'critico', paleta: 1, el: 'tierra', pv: 50, atk: 17, def: 10, agi: 8, exp: 24, monedas: 14, flota: 0, frames: 2,
    botin: { objeto: 'turron', prob: 0.3 },
    ataques: [
      { id: 'tachon', tipo: 'golpe', pot: 1.05, peso: 3 },
      { id: 'critica', tipo: 'chupa', pot: 0.9, peso: 2 },
    ],
  },
  mosquito: {
    id: 'mosquito', pintor: 'mosquito', paleta: 0, el: 'viento', pv: 16, atk: 10, def: 2, agi: 15, exp: 7, monedas: 4, flota: 9, frames: 2,
    ataques: [
      { id: 'picotazo', tipo: 'golpe', pot: 1, peso: 3 },
      { id: 'zumbido', tipo: 'todos', pot: 0.5, peso: 1, el: 'viento' },
    ],
  },
  mosquito2: {
    id: 'mosquito2', pintor: 'mosquito', paleta: 1, el: 'viento', pv: 24, atk: 13, def: 3, agi: 17, exp: 12, monedas: 7, flota: 9, frames: 2,
    botin: { objeto: 'chupito', prob: 0.2 },
    ataques: [
      { id: 'picotazo', tipo: 'golpe', pot: 1.05, peso: 3 },
      { id: 'zumbido', tipo: 'todos', pot: 0.55, peso: 1, el: 'viento' },
    ],
  },
  // The wild prompter of the road (a boss alone: when it is beaten it joins the party).
  chist: {
    id: 'chist', pintor: 'apuntador', paleta: 0, el: 'tierra', pv: 90, atk: 15, def: 7, agi: 11, exp: 45, monedas: 0, flota: 0, frames: 2,
    ataques: [
      { id: 'soplo', tipo: 'golpe', pot: 1, peso: 3, el: 'tierra' },
      { id: 'chistido', tipo: 'chupa', pot: 0.8, peso: 2 },
      { id: 'notaalpie', tipo: 'todos', pot: 0.55, peso: 2, el: 'tierra' },
    ],
  },
};

/** The kinds that can turn up in the wild (a random fight picks from these). */
export const ENEMIGOS_COMUNES = ['petardo', 'movil', 'spoiler', 'critico', 'mosquito'] as const;

// ---------------------------------------------------------------- painting

type Paleta = Record<string, string>;

function petardo(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(22, 34);
  const x = ctx(c);
  // the paper cylinder
  rect(x, p.base, 3, 9, 16, 21);
  elipse(x, p.base, 11, 10, 8, 3.5);
  elipse(x, p.base, 11, 29, 8, 3.5);
  rect(x, p.luz, 4, 10, 2, 19);
  rect(x, p.sombra, 16, 10, 3, 19);
  rect(x, p.sombra, 5, 31, 12, 1);
  // gold bands, like the strings of the fiesta
  rect(x, p.banda, 3, 12, 16, 2);
  rect(x, p.bandaSombra, 3, 14, 16, 1);
  rect(x, p.banda, 3, 25, 16, 2);
  rect(x, p.bandaSombra, 3, 27, 16, 1);
  // the fuse, with a little sway
  const sway = f ? 1 : 0;
  const fuse: Array<[number, number]> = [[11, 7], [11, 6], [12, 5], [13, 4], [14 + sway, 4], [15 + sway, 3]];
  for (const [fx, fy] of fuse) rect(x, p.mecha, fx, fy, 1, 1);
  rect(x, p.mecha, 10, 8, 3, 1);
  // angry face
  rect(x, '#ffffff', 5, 16, 5, 5);
  rect(x, '#ffffff', 12, 16, 5, 5);
  rect(x, '#2a1020', 7, 18, 2, 3);
  rect(x, '#2a1020', 13, 18, 2, 3);
  rect(x, '#2a1020', 4, 14, 3, 1);
  rect(x, '#2a1020', 6, 15, 3, 1);
  rect(x, '#2a1020', 13, 15, 3, 1);
  rect(x, '#2a1020', 15, 14, 3, 1);
  rect(x, '#2a1020', 7, 22, 8, 3);
  rect(x, '#ffffff', 8, 22, 2, 1);
  rect(x, '#ffffff', 12, 22, 2, 1);
  rect(x, '#ffffff', 10, 24, 2, 1);
  // feet
  rect(x, p.pie, 5, 31, 5, 3);
  rect(x, p.pie, 12, 31, 5, 3);
  return contorno(c, p.linea);
}

function movil(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(26, 32);
  const x = ctx(c);
  const o = f ? 1 : 0;
  // body, shaking a little while it rings
  rect(x, p.caja, 5 + o, 2, 16, 26);
  rect(x, p.caja, 4 + o, 3, 18, 24);
  rect(x, p.cajaLuz, 5 + o, 3, 1, 22);
  rect(x, p.cajaSombra, 20 + o, 4, 1, 23);
  // screen
  rect(x, p.pantalla, 7 + o, 5, 12, 16);
  rect(x, p.pantallaLuz, 7 + o, 5, 12, 2);
  // speaker and button
  rect(x, p.cajaSombra, 10 + o, 3, 6, 1);
  elipse(x, p.boton, 13 + o, 24, 2.5, 2);
  // face on the screen
  rect(x, '#102030', 9 + o, 9, 3, 4);
  rect(x, '#102030', 14 + o, 9, 3, 4);
  rect(x, '#ffffff', 10 + o, 9, 1, 1);
  rect(x, '#ffffff', 15 + o, 9, 1, 1);
  rect(x, '#102030', 8 + o, 7, 4, 1);
  rect(x, '#102030', 14 + o, 7, 4, 1);
  elipse(x, '#102030', 13 + o, 17, 3, 2);
  rect(x, '#ff7090', 12 + o, 18, 3, 1);
  // little arms and legs
  elipse(x, p.cajaLuz, 3 + o, 15, 2, 2.5);
  elipse(x, p.cajaLuz, 23 + o, 15, 2, 2.5);
  rect(x, p.cajaSombra, 8 + o, 28, 4, 3);
  rect(x, p.cajaSombra, 15 + o, 28, 4, 3);
  // ringing marks, on the loud frame only
  if (f) {
    for (const [px, py] of [[1, 8], [0, 9], [0, 10], [1, 11], [2, 12], [24, 8], [25, 9], [25, 10], [24, 11], [23, 12]]) rect(x, p.timbre, px, py, 1, 1);
    for (const [px, py] of [[3, 4], [2, 5], [2, 6], [3, 7], [22, 4], [23, 5], [23, 6], [22, 7]]) rect(x, p.timbre, px, py, 1, 1);
  }
  return contorno(c, p.linea);
}

function spoiler(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(26, 32);
  const x = ctx(c);
  // the sheet: round head, straight sides, a wavy hem that sways
  elipse(x, p.base, 13, 12, 12, 11);
  rect(x, p.base, 1, 12, 24, 14);
  const hem = f ? [0, 1, 0, 1, 0] : [1, 0, 1, 0, 1];
  for (let i = 0; i < 5; i++) {
    const hx = 1 + i * 5;
    elipse(x, p.base, hx + 2.5, 26 + hem[i], 2.5, 3);
  }
  rect(x, p.luz, 3, 8, 2, 12);
  rect(x, p.sombra, 22, 12, 3, 13);
  for (let i = 0; i < 5; i++) rect(x, p.sombra, 1 + i * 5 + 4, 27, 1, 2);
  // cheeky face
  elipse(x, '#ffffff', 8, 11, 3, 3.5);
  elipse(x, '#ffffff', 18, 11, 3, 3.5);
  rect(x, '#2a1c40', 9, 11, 2, 3);
  rect(x, '#2a1c40', 19, 11, 2, 3);
  // half-closed lids
  rect(x, p.sombra, 5, 8, 7, 2);
  rect(x, p.sombra, 15, 8, 7, 2);
  rect(x, '#2a1c40', 5, 10, 7, 1);
  rect(x, '#2a1c40', 15, 10, 7, 1);
  // big grin with tongue
  elipse(x, '#2a1c40', 13, 18, 5, 3);
  rect(x, p.base, 8, 15, 11, 2);
  rect(x, '#ffffff', 9, 17, 9, 1);
  elipse(x, '#ff7a9a', 14, 20, 2, 1.2);
  // the warning badge: a red «!»
  elipse(x, '#e8322c', 13, 25, 3.5, 3.5);
  rect(x, '#ffffff', 13, 23, 1, 3);
  rect(x, '#ffffff', 13, 27, 1, 1);
  return contorno(c, p.linea);
}

function critico(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(30, 42);
  const x = ctx(c);
  const b = f ? 1 : 0;
  // legs and shoes
  rect(x, p.pantalon, 9, 30, 5, 9);
  rect(x, p.pantalon, 16, 30, 5, 9);
  rect(x, '#1c1420', 8, 38, 7, 3);
  rect(x, '#1c1420', 15, 38, 7, 3);
  // coat: long, wider at the bottom
  rect(x, p.abrigo, 7, 19 + b, 16, 14);
  rect(x, p.abrigo, 6, 24 + b, 18, 9);
  rect(x, p.abrigoLuz, 7, 19 + b, 2, 14);
  rect(x, p.abrigoSombra, 21, 20 + b, 3, 13);
  // shirt, tie and lapels
  rect(x, '#f4f0e6', 13, 19 + b, 4, 7);
  rect(x, p.corbata, 14, 21 + b, 2, 8);
  rect(x, p.abrigoSombra, 12, 19 + b, 1, 6);
  rect(x, p.abrigoSombra, 17, 19 + b, 1, 6);
  // head
  elipse(x, '#f0c49a', 15, 14 + b, 6.5, 6);
  rect(x, '#d49c74', 20, 12 + b, 1, 6);
  // glasses
  elipse(x, '#ffffff', 12, 14 + b, 2.5, 2.5);
  elipse(x, '#ffffff', 18, 14 + b, 2.5, 2.5);
  rect(x, '#2a1c20', 10, 12 + b, 5, 1);
  rect(x, '#2a1c20', 16, 12 + b, 5, 1);
  rect(x, '#2a1c20', 15, 14 + b, 1, 1);
  rect(x, '#2a1c20', 12, 14 + b, 1, 2);
  rect(x, '#2a1c20', 18, 14 + b, 1, 2);
  // sour mouth and a goatee
  rect(x, '#8a4a40', 13, 18 + b, 4, 1);
  rect(x, p.pelo, 13, 19 + b, 4, 2);
  // the hat: wide brim, tall crown with a band
  elipse(x, p.sombrero, 15, 9 + b, 10, 2.2);
  rect(x, p.sombrero, 9, 3 + b, 12, 7);
  elipse(x, p.sombrero, 15, 4 + b, 6, 1.6);
  rect(x, p.sombreroBanda, 9, 7 + b, 12, 2);
  rect(x, p.pelo, 10, 5 + b, 1, 2);
  // the notebook held up in front, with a pencil
  rect(x, '#7a1c24', 2, 21 + b, 10, 12);
  rect(x, '#f4f0e6', 3, 22 + b, 8, 10);
  for (let j = 0; j < 4; j++) rect(x, '#9aa0c0', 4, 24 + b + j * 2, 6, 1);
  rect(x, '#7a1c24', 2, 21 + b, 1, 12);
  elipse(x, '#f0c49a', 12, 27 + b, 2, 2);
  elipse(x, '#f0c49a', 21, 24 + b, 2, 2);
  rect(x, '#e8c030', 21, 15 + b, 1, 9);
  rect(x, '#e8322c', 21, 14 + b, 1, 1);
  return contorno(c, p.linea);
}

function mosquito(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(30, 27);
  const x = ctx(c);
  x.translate(0, 3);
  // wings first (behind the body); two frames, up and down
  const aY = f ? 1 : 6;
  elipse(x, p.ala, 14, aY, 6, 3.5);
  elipse(x, p.ala, 21, aY + 1, 6, 3);
  rect(x, p.alaVena, 10, aY, 8, 1);
  rect(x, p.alaVena, 18, aY + 1, 7, 1);
  // abdomen with stripes, thorax and head
  elipse(x, p.cuerpo, 21, 14, 7, 4);
  for (const sx of [17, 21, 25]) rect(x, p.raya, sx, 11, 2, 7);
  elipse(x, p.cuerpo, 13, 12, 4.5, 4);
  elipse(x, p.cuerpo, 7, 13, 3.5, 3.5);
  rect(x, p.cuerpoLuz, 12, 9, 4, 1);
  // red eye, sting
  elipse(x, '#e8322c', 6, 12, 2, 2);
  rect(x, '#ffffff', 5, 11, 1, 1);
  rect(x, p.aguijon, 3, 15, 1, 1);
  rect(x, p.aguijon, 2, 16, 1, 1);
  rect(x, p.aguijon, 1, 17, 1, 1);
  rect(x, p.aguijon, 0, 18, 1, 1);
  // thin legs
  const pata = f ? 0 : 1;
  for (const [lx, ly, dx] of [[11, 16, -1], [14, 16, 0], [17, 17, 1]] as const) {
    rect(x, p.pata, lx, ly, 1, 3 + pata);
    rect(x, p.pata, lx + dx, ly + 3 + pata, 1, 2);
  }
  return contorno(c, p.linea);
}

/** The wild prompter: the little prompter of the icons, twice as big. */
function apuntadorGrande(_p: Paleta, f: number): HTMLCanvasElement {
  const src = apuntador('tierra', f);
  const c = lienzo(src.width * 2, src.height * 2);
  const x = ctx(c);
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const PALETAS: Record<Pintor, [Paleta, Paleta]> = {
  apuntador: [{}, {}],
  petardo: [
    { base: '#e04a3a', luz: '#f48a6a', sombra: '#a82a2a', banda: '#f4c438', bandaSombra: '#b88a20', mecha: '#4a3a30', pie: '#7a2020', linea: '#3a1018' },
    { base: '#7a46c8', luz: '#a47ae8', sombra: '#4a2a8a', banda: '#7ae0a0', bandaSombra: '#3a9a68', mecha: '#4a3a30', pie: '#3a1c6a', linea: '#1c0c3a' },
  ],
  movil: [
    { caja: '#3a4a6a', cajaLuz: '#5a6a8a', cajaSombra: '#222c44', pantalla: '#8af0c0', pantallaLuz: '#c8fff0', boton: '#aab4cc', timbre: '#ffe27a', linea: '#10182c' },
    { caja: '#d8508a', cajaLuz: '#f490b8', cajaSombra: '#8a2a58', pantalla: '#a8e8ff', pantallaLuz: '#e0faff', boton: '#fff0f8', timbre: '#ffffff', linea: '#3a1030' },
  ],
  spoiler: [
    { base: '#ded8f6', luz: '#f6f4ff', sombra: '#a8a0d8', linea: '#2e2858' },
    { base: '#5a5078', luz: '#7c72a0', sombra: '#3a3258', linea: '#14102a' },
  ],
  critico: [
    { abrigo: '#4a6a4a', abrigoLuz: '#6a8a68', abrigoSombra: '#2e4a32', pantalon: '#3a3a4a', corbata: '#c8402a', pelo: '#4a3020', sombrero: '#5a4a38', sombreroBanda: '#c8402a', linea: '#1c2a1e' },
    { abrigo: '#8a4a3a', abrigoLuz: '#aa6a58', abrigoSombra: '#5a2a24', pantalon: '#2a2a3a', corbata: '#e8c030', pelo: '#c8c0c0', sombrero: '#2a2a34', sombreroBanda: '#e8c030', linea: '#2a1010' },
  ],
  mosquito: [
    { cuerpo: '#6a5a72', cuerpoLuz: '#9a8aa8', raya: '#3a2e44', ala: '#cfeaff', alaVena: '#8abade', aguijon: '#3a2e44', pata: '#3a2e44', linea: '#20182c' },
    { cuerpo: '#e0b030', cuerpoLuz: '#f8e070', raya: '#3a2a10', ala: '#ffe8c8', alaVena: '#d8a868', aguijon: '#3a2a10', pata: '#3a2a10', linea: '#3a2008' },
  ],
};

const PINTORES: Record<Pintor, (p: Paleta, f: number) => HTMLCanvasElement> = { petardo, movil, spoiler, critico, mosquito, apuntador: apuntadorGrande };

/** One frame of an enemy's idle animation, with its outline. */
export function spriteEnemigo(id: string, frame = 0): HTMLCanvasElement {
  const d = ENEMIGOS[id];
  const f = ((frame % d.frames) + d.frames) % d.frames;
  return una(`enemigo.${id}.${f}`, () => PINTORES[d.pintor](PALETAS[d.pintor][d.paleta], f));
}

/** The same sprite all white (the flash when it is hit). */
export function siluetaEnemigo(id: string, frame = 0): HTMLCanvasElement {
  const d = ENEMIGOS[id];
  const f = ((frame % d.frames) + d.frames) % d.frames;
  return una(`enemigo.${id}.${f}.blanco`, () => {
    const src = spriteEnemigo(id, f);
    const c = lienzo(src.width, src.height);
    const x = ctx(c);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  });
}

/** Where the sparks of a lit fuse go on the petardo (pixels from the top-left of its sprite). */
export const MECHA_PETARDO = { x: 16, y: 4 } as const;
