// Rasgos de los cinco amigos para los primeros planos (colores de src/arte/personajes/*.mjs,
// subidos de saturación; contornos de cara propios, con la cabeza mirando a la derecha).
import { smooth } from './comun.mjs';

export const PUNTOS = {
  pablo: [[-92, -34], [-88, -82], [-56, -114], [-6, -127], [46, -116], [78, -86], [89, -46], [87, -8], [90, 22], [86, 56], [76, 88], [60, 112], [40, 127], [12, 123], [-18, 107], [-46, 86], [-74, 56], [-91, 16]],
  vero: [[-88, -34], [-84, -82], [-54, -113], [-6, -125], [44, -114], [74, -86], [84, -46], [83, -8], [86, 24], [82, 58], [72, 90], [57, 114], [44, 130], [20, 124], [-12, 108], [-42, 86], [-70, 56], [-87, 16]],
  fran: [[-96, -34], [-92, -84], [-58, -116], [-6, -128], [48, -118], [82, -88], [94, -46], [94, -6], [98, 26], [96, 60], [88, 92], [70, 114], [44, 126], [14, 122], [-18, 108], [-50, 88], [-80, 58], [-96, 16]],
  guille: [[-90, -36], [-88, -84], [-56, -118], [-6, -132], [46, -122], [78, -90], [88, -48], [86, -8], [90, 24], [88, 62], [82, 100], [66, 126], [44, 138], [14, 136], [-16, 122], [-46, 100], [-72, 64], [-89, 18]],
};

export const CARAS = Object.fromEntries(Object.entries(PUNTOS).map(([k, v]) => [k, smooth(v)]));

export const COL = {
  pablo: {
    skin: '#eaa87c', sombra: '#c97c5a', hondo: '#9f4f3a', luz: '#f8cda4', linea: '#6e301f', rubor: '#f06a5a',
    pelo: '#6b4126', peloSombra: '#3f2314', peloLuz: '#c28b52', peloBrillo: '#f1d09a',
    barba: '#4b2f1f', barbaSombra: '#2b190f', barbaLuz: '#86583a',
    ceja: '#3a2012', iris: ['#2a1308', '#9a5a2c', '#e0a35a'],
    labio: '#b9604f', boca: '#4a1218', diente: '#fbf6ea', lengua: '#d4635b',
    chaqueta: '#2b2c33', chaquetaLuz: '#4a4c58', borrego: '#e6dfcf', borregoSombra: '#b8ae98', sudadera: '#8f94a2',
  },
  vero: {
    skin: '#c98558', sombra: '#a05c3a', hondo: '#74402a', luz: '#e6a676', linea: '#4e2616', rubor: '#e0603e',
    pelo: '#241713', peloSombra: '#0d0706', peloLuz: '#5a4a7a', peloBrillo: '#b9aee0',
    ceja: '#1c100b', iris: ['#1a0d07', '#6a3a1c', '#d99443'],
    labioSup: '#7a1f33', labio: '#9a2a42', labioLuz: '#f08aa4', boca: '#3a0f17', diente: '#fbf6ea',
    goma: '#a8344e', gomaSombra: '#6e1e2c', oro: '#e8b84a', oroSombra: '#a8761c', oroLuz: '#fff1b8',
    camiseta: '#1c1c24', camisetaLuz: '#3a3a4a',
  },
  fran: {
    skin: '#eeb698', sombra: '#cb8a70', hondo: '#a2634c', luz: '#fad4ba', linea: '#6e3626', rubor: '#f07a6a',
    pelo: '#2d2420', peloSombra: '#15100e', peloLuz: '#5a4c70', peloBrillo: '#b6aad8', cana: '#bfb6ae',
    barba: '#2a201c', barbaSombra: '#120d0b', barbaLuz: '#5c463c', barbaCana: '#9a928a',
    ceja: '#1c1512', iris: ['#1d0f0a', '#5a3826', '#c08a5a'],
    labio: '#b5675b', boca: '#4a1c1a', diente: '#fbf6ea', lengua: '#d4635b',
    camiseta: '#2a9c98', camisetaSombra: '#1c746f', camisetaLuz: '#5cd0c8',
  },
  guille: {
    skin: '#eab48e', sombra: '#c88c68', hondo: '#a8704f', luz: '#f8d0ac', linea: '#6e3a22', rubor: '#f2705e',
    pelo: '#241a15', peloSombra: '#0f0a08', peloLuz: '#4e4c78', peloBrillo: '#b2b0e2',
    ceja: '#1a120e', iris: ['#1b0e08', '#5a3a22', '#c9955a'],
    labio: '#bb6c5a', boca: '#4a1c1a', diente: '#fbf6ea', lengua: '#d4635b', barbilla: '#3a2820',
    camisa: '#e5a92c', camisaSombra: '#b27d14', camisaLuz: '#ffd465', hibisco: '#e0344a', hoja: '#3f8a45',
  },
};
