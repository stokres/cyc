// The four kinds of enemy of the Teatro, each with a second colour (a harder one with another name), painted once in
// pixel art into cached canvases like the road's: a spotlight gone mad, a seat that bites, the ghost of a stagehand and
// a flying programme. Data lives in enemigos.ts; only the drawing is here.
import { contorno } from './contorno';
import { linea } from './iconos';
import { ctx, elipse, lienzo, rect } from './pixel';

type Paleta = Record<string, string>;

/** The spotlight: a cyclops lamp on a tripod, barn doors for eyebrows, a grille for teeth and its cable for a tail. */
export function foco(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(36, 48);
  const x = ctx(c);
  const o = f ? 1 : 0;
  // the cable tail, swaying
  for (let i = 0; i < 9; i++) rect(x, p.cable, 29 + i - (i > 6 ? 1 : 0), 40 - i + (i % 3 === 0 ? o : 0), 1, 2);
  rect(x, p.cableLuz, 30, 40, 5, 1);
  // tripod: a post and three legs
  rect(x, p.pata, 16, 32, 4, 9);
  rect(x, p.pataLuz, 16, 32, 1, 9);
  linea(x, p.pata, 17, 40, 8, 46);
  linea(x, p.pata, 18, 40, 28, 46);
  linea(x, p.pata, 18, 40, 18, 47);
  rect(x, p.pata, 6, 46, 5, 1);
  rect(x, p.pata, 26, 46, 5, 1);
  rect(x, p.pata, 16, 47, 5, 1);
  // the yoke that holds the lamp
  rect(x, p.yugo, 3, 14, 3, 17);
  rect(x, p.yugo, 30, 14, 3, 17);
  rect(x, p.yugo, 3, 29, 30, 3);
  rect(x, p.yugoLuz, 3, 14, 1, 17);
  rect(x, p.pomo, 1, 20, 3, 4);
  rect(x, p.pomo, 32, 20, 3, 4);
  // the housing with its cooling fins on top
  elipse(x, p.caja, 18, 19, 14.5, 17);
  elipse(x, p.cajaSombra, 21, 22, 12, 14);
  elipse(x, p.caja, 18, 18, 13.5, 16);
  elipse(x, p.cajaLuz, 12, 10, 5, 3);
  for (let i = 0; i < 4; i++) {
    rect(x, p.caja, 10 + i * 5, 0 + (i % 2), 3, 5);
    rect(x, p.cajaLuz, 10 + i * 5, 0 + (i % 2), 1, 5);
  }
  // the lens: one huge eye, glowing
  elipse(x, p.aro, 18, 15, 11, 11);
  elipse(x, '#fffbe0', 18, 15, 9.5, 9.5);
  elipse(x, p.luz, 18, 15, 7.5, 7.5);
  elipse(x, p.luzFuerte, 18, 15, 5.5, 5.5);
  // the pupil looks to the left (at the friends) and jumps a little
  rect(x, '#2a1020', 13 + o, 12, 4, 7);
  rect(x, '#2a1020', 12 + o, 14, 1, 3);
  rect(x, '#ffffff', 14 + o, 13, 1, 2);
  // barn doors as angry eyebrows
  const dy = o;
  for (let i = 0; i < 9; i++) rect(x, p.puerta, 6 + i, 7 + Math.floor(i * 0.5) + dy, 1, 3);
  for (let i = 0; i < 9; i++) rect(x, p.puerta, 21 + i, 11 - Math.floor(i * 0.5) + dy, 1, 3);
  rect(x, p.puertaLuz, 6, 7 + dy, 9, 1);
  rect(x, p.puertaLuz, 21, 11 + dy, 9, 1);
  // the grille mouth with teeth
  rect(x, '#1c1020', 10, 27, 16, 6);
  for (let i = 0; i < 7; i++) rect(x, p.dientes, 11 + i * 2, 27, 1, 3);
  for (let i = 0; i < 6; i++) rect(x, p.dientes, 12 + i * 2, 31, 1, 2);
  rect(x, p.cajaSombra, 10, 33, 16, 1);
  // a ray or two of light jumping out of the eye
  if (f) {
    rect(x, p.luzFuerte, 2, 9, 2, 1);
    rect(x, p.luzFuerte, 32, 8, 2, 1);
    rect(x, p.luzFuerte, 17, 1, 1, 2);
  } else {
    rect(x, p.luzFuerte, 3, 6, 1, 2);
    rect(x, p.luzFuerte, 33, 12, 2, 1);
  }
  return contorno(c, p.linea);
}

/** The seat that bites: red velvet, a number plate, an angry face and a mouth full of teeth that chomps. */
export function butaca(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(40, 40);
  const x = ctx(c);
  const boca = f ? 3 : 0;
  // cast-iron feet
  rect(x, p.hierro, 6, 33, 4, 6);
  rect(x, p.hierro, 30, 33, 4, 6);
  rect(x, p.hierro, 4, 38, 8, 2);
  rect(x, p.hierro, 28, 38, 8, 2);
  // the backrest: a tall rounded cushion
  elipse(x, p.terciopelo, 20, 12, 15, 12);
  rect(x, p.terciopelo, 5, 12, 30, 14);
  rect(x, p.terciopeloSombra, 31, 10, 4, 16);
  rect(x, p.terciopeloLuz, 6, 8, 2, 16);
  elipse(x, p.terciopeloLuz, 12, 5, 5, 2);
  // the gold number plate and the buttons of the tufting
  rect(x, p.oro, 16, 1, 8, 4);
  rect(x, p.oroSombra, 16, 4, 8, 1);
  rect(x, p.num, 18, 2, 1, 2);
  rect(x, p.num, 20, 2, 1, 2);
  rect(x, p.num, 22, 2, 1, 2);
  for (const [bx, by] of [[9, 8], [31, 8], [8, 17], [32, 17]]) {
    rect(x, p.oro, bx, by, 2, 2);
  }
  // angry eyes
  rect(x, '#ffffff', 11, 9, 7, 6);
  rect(x, '#ffffff', 22, 9, 7, 6);
  rect(x, '#2a1020', 14, 11, 3, 4);
  rect(x, '#2a1020', 22, 11, 3, 4);
  rect(x, '#ffffff', 15, 11, 1, 1);
  rect(x, '#ffffff', 23, 11, 1, 1);
  for (let i = 0; i < 8; i++) rect(x, p.terciopeloOscuro, 10 + i, 7 + Math.floor(i * 0.4), 1, 2);
  for (let i = 0; i < 8; i++) rect(x, p.terciopeloOscuro, 29 - i, 7 + Math.floor(i * 0.4), 1, 2);
  // the mouth between the backrest and the folding seat: open wide with two rows of teeth
  rect(x, '#2a0a14', 8, 18, 24, 6 + boca);
  rect(x, '#2a0a14', 9, 17, 22, 1);
  for (let i = 0; i < 6; i++) {
    rect(x, '#ffffff', 9 + i * 4, 18, 3, 3);
    rect(x, '#d8d0e0', 9 + i * 4, 20, 3, 1);
  }
  for (let i = 0; i < 5; i++) rect(x, '#ffffff', 11 + i * 4, 23 + boca, 3, 2);
  elipse(x, '#e85a7a', 20, 22 + boca, 5, 1.6);
  // the folding seat: the lower jaw
  elipse(x, p.terciopelo, 20, 28 + boca, 17, 5);
  rect(x, p.terciopelo, 3, 25 + boca, 34, 4);
  rect(x, p.terciopeloSombra, 3, 29 + boca, 34, 2);
  rect(x, p.terciopeloLuz, 5, 25 + boca, 30, 1);
  // wooden armrests like little arms, with gold knobs
  rect(x, p.madera, 0, 20 + boca, 6, 4);
  rect(x, p.madera, 34, 20 + boca, 6, 4);
  rect(x, p.maderaLuz, 0, 20 + boca, 6, 1);
  rect(x, p.maderaLuz, 34, 20 + boca, 6, 1);
  elipse(x, p.oro, 1, 22 + boca, 2, 2);
  elipse(x, p.oro, 38, 22 + boca, 2, 2);
  rect(x, p.madera, 2, 24 + boca, 2, 9 - boca);
  rect(x, p.madera, 36, 24 + boca, 2, 9 - boca);
  return contorno(c, p.linea);
}

/** The ghost of a stagehand: a flat cap, a handlebar moustache, a hammer and a rope, and a tail instead of legs. */
export function tramoyista(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(36, 50);
  const x = ctx(c);
  const o = f ? 1 : 0;
  // the tail: wavy wisps instead of legs
  const ondas = f ? [0, 1, 0, 1, 0, 1, 0] : [1, 0, 1, 0, 1, 0, 1];
  elipse(x, p.cuerpo, 18, 34, 12, 8);
  rect(x, p.cuerpo, 6, 34, 24, 8);
  for (let i = 0; i < 7; i++) elipse(x, p.cuerpo, 8.5 + i * 3.2, 43 + ondas[i], 2.6, 3.5);
  rect(x, p.cuerpoSombra, 25, 34, 5, 9);
  for (let i = 0; i < 7; i++) rect(x, p.cuerpoSombra, 10 + i * 3 + (i > 4 ? 1 : 0), 44 + ondas[i], 1, 3);
  // the work shirt, dark, fading into the ghost
  rect(x, p.camisa, 8, 22, 20, 14);
  rect(x, p.camisaLuz, 8, 22, 2, 14);
  rect(x, p.camisaSombra, 25, 22, 3, 14);
  rect(x, p.tirante, 12, 22, 2, 14);
  rect(x, p.tirante, 22, 22, 2, 14);
  // the tool belt with a pouch
  rect(x, p.cinturon, 7, 33, 22, 2);
  rect(x, p.hebilla, 17, 32, 3, 4);
  rect(x, p.bolsa, 22, 35, 5, 4);
  rect(x, p.bolsaLuz, 22, 35, 5, 1);
  // head
  elipse(x, p.cuerpo, 18, 14, 9, 9);
  elipse(x, p.cuerpoLuz, 14, 10, 4, 3);
  // hollow eyes under heavy brows
  rect(x, '#10182c', 12, 13, 4, 5);
  rect(x, '#10182c', 20, 13, 4, 5);
  rect(x, '#ffffff', 13, 14, 1, 1);
  rect(x, '#ffffff', 21, 14, 1, 1);
  rect(x, p.ceja, 11, 11, 6, 1);
  rect(x, p.ceja, 19, 10 + o, 6, 1);
  // handlebar moustache and a gloomy mouth
  rect(x, p.bigote, 11, 19, 14, 2);
  rect(x, p.bigote, 9, 18, 2, 2);
  rect(x, p.bigote, 25, 18, 2, 2);
  rect(x, p.bigote, 8, 17, 1, 2);
  rect(x, p.bigote, 27, 17, 1, 2);
  rect(x, '#10182c', 15, 22, 6, 1);
  // the flat cap
  elipse(x, p.gorra, 18, 7, 10, 4.5);
  rect(x, p.gorra, 8, 6, 20, 3);
  rect(x, p.gorraLuz, 10, 4, 8, 1);
  rect(x, p.visera, 5, 9, 14, 2);
  rect(x, p.gorraSombra, 22, 4, 6, 5);
  // the left arm holds a hammer up, the right one a coil of rope
  rect(x, p.camisa, 3, 24, 5, 3);
  rect(x, p.cuerpo, 1, 21 - o, 4, 5);
  rect(x, p.madera, 1, 10 - o, 2, 12);
  rect(x, p.hierro, 0, 8 - o, 6, 4);
  rect(x, p.hierroLuz, 0, 8 - o, 6, 1);
  rect(x, p.camisa, 28, 26, 5, 3);
  elipse(x, p.cuerpo, 33, 28, 2.5, 2.5);
  elipse(x, p.cuerda, 33, 35, 3, 3.4);
  rect(x, p.cuerdaSombra, 31, 35, 1, 2);
  rect(x, p.cuerdaSombra, 34, 33, 1, 2);
  return contorno(c, p.linea);
}

/** The flying programme: a folded leaflet with a face on its cover and two covers for wings, and a ribbon for a tail. */
export function programa(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(34, 34);
  const x = ctx(c);
  // the wings: the back cover opened to each side, up or down
  const ay = f ? 3 : 11;
  const ala = (cx: number, dir: number) => {
    for (let i = 0; i < 9; i++) {
      const alto = 12 - Math.floor(i * 0.7);
      rect(x, i % 3 === 0 ? p.alaSombra : p.ala, cx + dir * i - (dir < 0 ? 0 : 0), ay + Math.floor(i * (f ? 0.2 : -0.5)), 1, alto);
    }
  };
  ala(8, -1);
  ala(24, 1);
  // the little pages hanging under (staples)
  // the body: the front cover
  rect(x, p.portada, 9, 4, 16, 24);
  rect(x, p.portadaLuz, 9, 4, 2, 24);
  rect(x, p.portadaSombra, 23, 4, 2, 24);
  rect(x, p.lomo, 9, 4, 1, 24);
  // the printed title and a little crest
  rect(x, p.titulo, 12, 6, 10, 1);
  rect(x, p.titulo, 13, 8, 8, 1);
  elipse(x, p.escudo, 17, 25, 2.5, 2);
  // the face
  rect(x, '#ffffff', 11, 12, 5, 5);
  rect(x, '#ffffff', 18, 12, 5, 5);
  rect(x, '#2a1c40', 13, 13, 2, 4);
  rect(x, '#2a1c40', 18, 13, 2, 4);
  rect(x, '#2a1c40', 11, 11, 5, 1);
  rect(x, '#2a1c40', 18, 10, 5, 1);
  rect(x, '#2a1c40', 12, 19, 10, 3);
  for (let i = 0; i < 4; i++) rect(x, '#ffffff', 13 + i * 2, 19, 1, 2);
  rect(x, '#ff7a9a', 15, 22, 4, 1);
  // the ribbon bookmark hanging as a tail, waving
  const t = f ? 1 : 0;
  rect(x, p.cinta, 16, 28, 2, 4);
  rect(x, p.cinta, 16 + t, 32, 2, 1);
  rect(x, p.cinta, 15 + t, 33, 2, 1);
  rect(x, p.cintaSombra, 16, 32 + t, 1, 1);
  return contorno(c, p.linea);
}

export const PALETAS_TEATRO = {
  foco: [
    { caja: '#4a5a7a', cajaLuz: '#7a8aaa', cajaSombra: '#2c3652', aro: '#222a44', luz: '#ffe86a', luzFuerte: '#fff6b0', puerta: '#2c3652', puertaLuz: '#6a7a9a', dientes: '#e8ecf8', yugo: '#3a4660', yugoLuz: '#6a7a9a', pomo: '#c8a030', pata: '#2c3652', pataLuz: '#5a6a8a', cable: '#2a2030', cableLuz: '#6a5a78', linea: '#141a2c' },
    { caja: '#a8304a', cajaLuz: '#e0607a', cajaSombra: '#681a2c', aro: '#3a0e1a', luz: '#ff9ad8', luzFuerte: '#ffe0f4', puerta: '#681a2c', puertaLuz: '#d8607a', dientes: '#fff0f4', yugo: '#5a1a2a', yugoLuz: '#c8506a', pomo: '#ffd860', pata: '#4a1424', pataLuz: '#8a3048', cable: '#2a1020', cableLuz: '#8a4a68', linea: '#2a0a14' },
  ],
  butaca: [
    { terciopelo: '#b8283a', terciopeloLuz: '#e8586a', terciopeloSombra: '#7a1424', terciopeloOscuro: '#5a0e1c', oro: '#f0c040', oroSombra: '#b88a20', num: '#7a1424', hierro: '#3a3040', madera: '#7a4a2a', maderaLuz: '#a8704a', linea: '#2a0a12' },
    { terciopelo: '#5a3ab8', terciopeloLuz: '#8a6ae8', terciopeloSombra: '#34207a', terciopeloOscuro: '#22125a', oro: '#ffe27a', oroSombra: '#c8a030', num: '#34207a', hierro: '#2a2438', madera: '#4a3a5a', maderaLuz: '#7a6a8a', linea: '#140a2a' },
  ],
  tramoyista: [
    { cuerpo: '#c8dcf0', cuerpoLuz: '#f0f8ff', cuerpoSombra: '#8aa4cc', camisa: '#2a3858', camisaLuz: '#4a5a80', camisaSombra: '#1a2440', tirante: '#c8a030', cinturon: '#5a3a22', hebilla: '#f0c040', bolsa: '#7a5a3a', bolsaLuz: '#a8845a', ceja: '#3a4a6a', bigote: '#4a5a7a', gorra: '#2a3450', gorraLuz: '#4a587a', gorraSombra: '#1a2238', visera: '#1a2238', madera: '#8a5a32', hierro: '#8a94a8', hierroLuz: '#c8d0e0', cuerda: '#c8a870', cuerdaSombra: '#8a6a40', linea: '#141c34' },
    { cuerpo: '#c8f0d8', cuerpoLuz: '#f0fff4', cuerpoSombra: '#82c8a0', camisa: '#7a2a2a', camisaLuz: '#a84a4a', camisaSombra: '#4a1818', tirante: '#f4f0e6', cinturon: '#3a2a22', hebilla: '#f0c040', bolsa: '#5a4a3a', bolsaLuz: '#8a7658', ceja: '#2a5a42', bigote: '#2a6a4a', gorra: '#f0c030', gorraLuz: '#ffe88a', gorraSombra: '#b88a18', visera: '#b88a18', madera: '#6a4a2a', hierro: '#9aa4b8', hierroLuz: '#e0e8f4', cuerda: '#e84a3a', cuerdaSombra: '#9a2a22', linea: '#102a1c' },
  ],
  programa: [
    { portada: '#f4ecd2', portadaLuz: '#fffaf0', portadaSombra: '#d4c8a4', lomo: '#b8a878', titulo: '#7a1c24', escudo: '#c8283a', ala: '#e8dcb8', alaSombra: '#c8bc94', cinta: '#c8283a', cintaSombra: '#7a1c24', linea: '#4a3a24' },
    { portada: '#2a3a8a', portadaLuz: '#4a5ab0', portadaSombra: '#1a2466', lomo: '#10184a', titulo: '#ffe27a', escudo: '#f0c040', ala: '#3a4aa0', alaSombra: '#222e78', cinta: '#f0c040', cintaSombra: '#a07818', linea: '#0a1034' },
  ],
} as const;
