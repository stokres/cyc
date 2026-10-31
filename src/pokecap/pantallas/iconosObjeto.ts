// PokéUsera · the ten pixel icons of the objects of «La barra» (docs/POKEUSERA.md, «Objetos de la barra»): 12×12, baked once each
// (a blit per use), plus a greyed twin for an object that has been used up. The maps are written here; the colours are the letters of PALETA.
import type { ObjetoId } from '../tipos';
import { OBJETOS } from '../tipos';
import { TINTA2 } from '../arte2/paleta2';
import { hornear, mezclar } from '../arte2/ui2';

/** Side of every icon. */
export const LADO_ICONO_OBJETO = 12;

// k = dark outline (TINTA2); '.' = transparent.
const MAPAS: Record<ObjetoId, string[]> = {
  mechero: [
    '.....yy.....',
    '....yooy....',
    '....yooy....',
    '.....yy.....',
    '...kkkkkk...',
    '...ksssgk...',
    '...kkkkkk...',
    '...krrrRk...',
    '...kwrrRk...',
    '...krrrRk...',
    '...kRRRRk...',
    '...kkkkkk...',
  ],
  chicle: [
    '....kkkk....',
    '..kkmmmmkk..',
    '.kmmmwwmmMk.',
    '.kmmwwmmmMk.',
    'kmmmwmmmmmMk',
    'kmmmmmmmmMMk',
    'kmmmmmmmMMMk',
    'kmmmmmmMMMMk',
    '.kmmmMMMMMk.',
    '.kMMMMMMMMk.',
    '..kkMMMMkk..',
    '....kkkk....',
  ],
  bocata: [
    '............',
    '...kkkkkk...',
    '.kkttttnnkk.',
    'kttnttttnttk',
    'kttttnttttnk',
    '.kkkkkkkkkk.',
    'kyyywyyywyyk',
    'kywywywywywk',
    'kyyyyyyyyyyk',
    '.kkkkkkkkkk.',
    'kttttttttttk',
    '.kkNNNNNNkk.',
  ],
  posavasos: [
    '....kkkk....',
    '..kkttttkk..',
    '.kttttttttk.',
    '.kttrrrrttk.',
    'kttrrwwrrttk',
    'ktrrwyywrrtk',
    'ktrrwyywrrtk',
    'kttrrwwrrttk',
    '.kttrrrrttk.',
    '.kttttttttk.',
    '..kknnnnkk..',
    '....kkkk....',
  ],
  tapon: [
    '...kkkkkk...',
    '..kyyyyyyk..',
    '.kyyyyyyyyk.',
    '.kYYYYYYYYk.',
    '.kkkkkkkkkk.',
    '..ktgttgtk..',
    '..ktgttgtk..',
    '..ktgttgtk..',
    '...kttttk...',
    '...kttttk...',
    '...kNNNNk...',
    '....kkkk....',
  ],
  palillo: [
    '.........kk.',
    '........krrk',
    '.......krRrk',
    '......kkrrk.',
    '.....kttk...',
    '....kttk....',
    '...kttk.....',
    '..kttk......',
    '.kttk.......',
    'kNtk........',
    'kNk.........',
    'kk..........',
  ],
  gafas: [
    'k..........k',
    'kkkkkkkkkkkk',
    'klllllkllllk',
    'klBllllkBllk',
    'kllllkkllllk',
    '.klllk..klk.',
    '..kkk....kk.',
    '............',
    '............',
    '............',
    '............',
    '............',
  ],
  zapatillas: [
    '............',
    '..kkk.......',
    '.kwwwk......',
    '.kwkwkk.....',
    '.kbwwwbkkk..',
    '.kbbbbbbbbk.',
    'kbbbbbbbbbbk',
    'kwwwwwwwwwwk',
    'kkkkkkkkkkkk',
    '............',
    '............',
    '............',
  ],
  panuelo: [
    'kk........kk',
    'krkkkkkkkkrk',
    '.krrrrrrrrk.',
    '.krwrrrrwrk.',
    '..krrrwrrk..',
    '..krwrrrrk..',
    '...krrrrk...',
    '...krrwrk...',
    '....krrk....',
    '....kRRk....',
    '.....kk.....',
    '............',
  ],
  llavero: [
    '....kkkk....',
    '...kssssk...',
    '...ks..sk...',
    '...kssssk...',
    '....kkkk....',
    '..kkkkkkkkk.',
    '.kwwwwwwwwwk',
    '.kwbbwwbbwwk',
    '.krrrrrrrrrk',
    '.kwwwwwwwwwk',
    '..kgGgkgGgk.',
    '...kkk.kkk..',
  ],
};

const PALETA: Record<string, string> = {
  k: TINTA2,
  w: '#fdf6e4',
  g: '#b8b0b8',
  G: '#7e7088',
  s: '#d8d8e8',
  r: '#d4503c',
  R: '#9c2c2c',
  y: '#ffd23a',
  Y: '#c8901c',
  o: '#f0903a',
  b: '#4f8fd8',
  B: '#a9d2f6',
  d: '#2f5fa8',
  l: '#2a3050',
  n: '#a8743a',
  N: '#6e4a2a',
  t: '#e8c890',
  m: '#8ad8a0',
  M: '#3f9e45',
};

/** The same colour in grey (for an object already used up). */
function gris(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const l = Math.round(0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255));
  const h = (v: number) => v.toString(16).padStart(2, '0');
  return mezclar(hex, `#${h(l)}${h(l)}${h(l)}`, 0.85);
}

/** The baked 12×12 icon of an object; `gastado`: its greyed twin. */
export function iconoObjeto(id: ObjetoId, gastado = false): HTMLCanvasElement {
  return hornear(`obj|${id}|${gastado ? 1 : 0}`, LADO_ICONO_OBJETO, LADO_ICONO_OBJETO, (cx) => {
    MAPAS[id].forEach((fila, y) => {
      for (let x = 0; x < fila.length; x++) {
        const c = fila[x];
        if (c === '.') continue;
        cx.fillStyle = gastado ? gris(PALETA[c]) : PALETA[c];
        cx.fillRect(x, y, 1, 1);
      }
    });
  });
}

/** One task per icon for the background baking (`precalentar.ts`). */
export const tareasPrecalentarObjetos = (): (() => void)[] => OBJETOS.map((id) => () => void iconoObjeto(id));

