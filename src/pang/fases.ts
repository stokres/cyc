// The twelve stages: a world tour from Usera to Las Vegas (docs/PANG.md). Each one adds
// something, as in the original. The three themes take turns; the bosses get «Última ronda». Play area: x 8–376, ceiling 8, floor 184 (tipos.ts).
// Floating blocks keep their underside at y ≤ 148, so the player walks under them;
// platforms the player stands on are reached by ladders (the player never jumps).
import type { Fase } from './tipos';

const BASE: Fase[] = [
  {
    n: 1,
    fondo: 'usera',
    musica: 'pangUsera',
    tiempo: 100,
    inicio: 192,
    burbujas: [{ x: 96, y: 60, talla: 0, dir: 1 }],
    bloques: [],
    escaleras: [],
  },
  {
    n: 2,
    fondo: 'calle',
    musica: 'pangCalle',
    tiempo: 110,
    inicio: 192,
    burbujas: [
      { x: 110, y: 56, talla: 0, dir: -1 },
      { x: 274, y: 56, talla: 0, dir: 1 },
    ],
    bloques: [
      { x: 56, y: 112, w: 48, h: 12, estilo: 'contenedor' },
      { x: 280, y: 112, w: 48, h: 12, estilo: 'contenedor' },
    ],
    escaleras: [],
  },
  {
    n: 3,
    fondo: 'piso',
    musica: 'pangUsera',
    tiempo: 110,
    inicio: 192,
    especial: 'aceituna',
    burbujas: [
      { x: 80, y: 56, talla: 0, dir: 1 },
      { x: 300, y: 50, talla: 1, dir: -1 },
      { x: 200, y: 40, talla: 1, dir: 1 },
    ],
    bloques: [0, 1, 2, 3, 4, 5].map((k) => ({ x: 120 + k * 24, y: 96, w: 24, h: 12, estilo: 'cojin' as const, rompible: true })),
    escaleras: [],
  },
  {
    n: 4,
    fondo: 'bolilandia',
    musica: 'pangRonda',
    tiempo: 150,
    inicio: 192,
    jefe: 'robi',
    burbujas: [],
    bloques: [
      { x: 32, y: 104, w: 40, h: 12, estilo: 'bola' },
      { x: 312, y: 104, w: 40, h: 12, estilo: 'bola' },
    ],
    escaleras: [],
  },
  {
    n: 5,
    fondo: 'teatro',
    musica: 'pangCalle',
    tiempo: 120,
    inicio: 192,
    especial: 'oscuro',
    burbujas: [
      { x: 90, y: 56, talla: 0, dir: 1 },
      { x: 294, y: 56, talla: 0, dir: -1 },
      { x: 192, y: 40, talla: 1, dir: 1 },
    ],
    bloques: [{ x: 152, y: 84, w: 80, h: 8, estilo: 'madera' }],
    escaleras: [],
  },
  {
    n: 6,
    fondo: 'granja',
    musica: 'pangRonda',
    tiempo: 160,
    inicio: 192,
    jefe: 'peor',
    burbujas: [],
    bloques: [
      { x: 40, y: 116, w: 32, h: 14, estilo: 'bala' },
      { x: 312, y: 116, w: 32, h: 14, estilo: 'bala' },
    ],
    escaleras: [],
  },
  {
    n: 7,
    fondo: 'madridrio',
    musica: 'pangUsera',
    tiempo: 120,
    inicio: 192,
    burbujas: [
      { x: 80, y: 50, talla: 0, dir: 1, variante: 'posavasos' },
      { x: 304, y: 70, talla: 0, dir: -1, variante: 'posavasos' },
      { x: 192, y: 40, talla: 1, dir: 1 },
    ],
    bloques: [{ x: 112, y: 76, w: 160, h: 8, estilo: 'piedra' }],
    escaleras: [],
  },
  {
    n: 8,
    fondo: 'avila',
    musica: 'pangCalle',
    tiempo: 130,
    inicio: 192,
    burbujas: [
      { x: 60, y: 50, talla: 0, dir: 1 },
      { x: 324, y: 50, talla: 0, dir: -1 },
      { x: 160, y: 60, talla: 1, dir: -1 },
      { x: 224, y: 60, talla: 1, dir: 1 },
    ],
    bloques: [
      { x: 8, y: 120, w: 112, h: 10, estilo: 'muralla' },
      { x: 264, y: 120, w: 112, h: 10, estilo: 'muralla' },
    ],
    escaleras: [
      { x: 96, arriba: 120, abajo: 184 },
      { x: 272, arriba: 120, abajo: 184 },
    ],
  },
  {
    n: 9,
    fondo: 'zaragoza',
    musica: 'pangRonda',
    tiempo: 130,
    inicio: 192,
    especial: 'cierzo',
    burbujas: [
      { x: 70, y: 56, talla: 0, dir: 1 },
      { x: 192, y: 40, talla: 0, dir: -1 },
      { x: 314, y: 56, talla: 0, dir: -1 },
    ],
    bloques: [],
    escaleras: [],
  },
  {
    n: 10,
    fondo: 'jijona',
    musica: 'pangUsera',
    tiempo: 140,
    inicio: 192,
    burbujas: [
      { x: 64, y: 40, talla: 0, dir: 1 },
      { x: 320, y: 40, talla: 0, dir: -1 },
      { x: 150, y: 120, talla: 1, dir: -1 },
      { x: 234, y: 120, talla: 1, dir: 1 },
    ],
    bloques: [
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ x: 96 + k * 24, y: 72, w: 24, h: 10, estilo: 'turron' as const, rompible: true })),
      { x: 40, y: 104, w: 40, h: 10, estilo: 'turron' },
      { x: 304, y: 104, w: 40, h: 10, estilo: 'turron' },
    ],
    escaleras: [],
  },
  {
    n: 11,
    fondo: 'nevada',
    musica: 'pangCalle',
    tiempo: 90,
    inicio: 192,
    prisa: 1.15,
    burbujas: [
      { x: 64, y: 56, talla: 0, dir: 1 },
      { x: 192, y: 44, talla: 0, dir: -1 },
      { x: 320, y: 56, talla: 0, dir: -1 },
      { x: 128, y: 100, talla: 2, dir: 1 },
      { x: 256, y: 100, talla: 2, dir: -1 },
    ],
    bloques: [
      { x: 136, y: 100, w: 112, h: 20, estilo: 'caravana' },
    ],
    escaleras: [],
  },
  {
    n: 12,
    fondo: 'vegas',
    musica: 'pangRonda',
    tiempo: 200,
    inicio: 192,
    jefe: 'penultima',
    burbujas: [],
    bloques: [
      { x: 24, y: 96, w: 48, h: 8, estilo: 'neon' },
      { x: 312, y: 96, w: 48, h: 8, estilo: 'neon' },
    ],
    escaleras: [],
  },
];

/**
 * Difficulty (Jesús, 25 October 2026: always two medium bubbles at the start was too easy): from stage 3 the stages
 * without a boss begin with more bubbles, medium ones high up: one more in stages 3–6, two more from stage 7.
 */
const extras = (n: number) => (n < 3 ? 0 : n < 7 ? 1 : 2);
export const FASES: Fase[] = BASE.map((f) =>
  f.jefe || extras(f.n) === 0
    ? f
    : { ...f, burbujas: [...f.burbujas, { x: 140, y: 30, talla: 1 as const, dir: -1 as const }, { x: 244, y: 30, talla: 1 as const, dir: 1 as const }].slice(0, f.burbujas.length + extras(f.n)) },
);
