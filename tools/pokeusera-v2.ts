// Dev-only page to review the GBA art (not part of the build). Open /tools/pokeusera-v2.html on the Vite dev
// server. ?vista=detalle | fuente | entrenadores shows only that block (detalle is used by tools/pokeusera-v2-export.mjs).
//  - detalle:      the useritos big (front/back, two idle frames each).
//  - fuente:       the font specimen.
//  - entrenadores: trainers, icons, portraits and the logo.
// The real screens are the game itself (/pokeusera.html); there is no separate mock any more.
import { plataforma } from '../src/pokeusera/arte2/escena2';
import { dibujarTexto2 } from '../src/pokeusera/arte2/fuente2';
import { IDS_USERITOS2, coloresSprite2, spriteEspalda2, spriteFrente2 } from '../src/pokeusera/arte2/sprites2';

import { ANCHO_ENT2, ALTO_ENT2, coloresEntrenador2, entrenador2, icono2, retrato2 } from '../src/pokeusera/arte2/entrenadores2';
import { logo2 } from '../src/pokeusera/arte2/logo2';
import type { EntrenadorId } from '../src/pokeusera/tipos';

const params = new URLSearchParams(location.search);
const vista = params.get('vista') ?? 'todo';
const ZOOM = Number(params.get('z') ?? 3);
const SOLO = params.get('solo');
for (const v of ['detalle', 'fuente']) {
  if (vista !== 'todo' && vista !== v) document.getElementById(`${v}-w`)!.hidden = true;
}

function lienzo(id: string, w: number, h: number, escala: number): CanvasRenderingContext2D {
  const cv = document.getElementById(id) as HTMLCanvasElement;
  cv.width = w;
  cv.height = h;
  cv.style.width = `${w * escala}px`;
  cv.style.height = `${h * escala}px`;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function cabecera(id: string, columnas: number, ancho: number, textos: string[]): void {
  const el = document.getElementById(id)!;
  el.style.gridTemplateColumns = `repeat(${columnas}, ${ancho}px)`;
  el.innerHTML = textos.map((t) => `<span>${t}</span>`).join('');
}

/** Lowest opaque row of a baked sprite (so every userito stands on the same line). */
const pies = new Map<HTMLCanvasElement, number>();
function pie(cv: HTMLCanvasElement): number {
  let p = pies.get(cv);
  if (p === undefined) {
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    p = 0;
    for (let y = cv.height - 1; y >= 0 && !p; y--) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3]) (p = y), (x = cv.width);
    pies.set(cv, p);
  }
  return p;
}

const NOMBRES: Record<string, string> = { draguserin: 'Draguserín', espumarro: 'Espumarro', 'ego-ego': 'Ego-Ego', aceitun: 'Aceitún' };
const IDS = SOLO ? SOLO.split(',') : [...IDS_USERITOS2];

// ---------------------------------------------------------------------------------------------
// Detail: front and back, idle frames 1 and 2, on a neutral backdrop with the platform.
// ---------------------------------------------------------------------------------------------
if (vista === 'todo' || vista === 'detalle') {
  const CW = 72,
    CH = 76;
  const ctx = lienzo('detalle', CW * 4, CH * IDS.length, ZOOM);
  ctx.fillStyle = '#d9d2b8';
  ctx.fillRect(0, 0, CW * 4, CH * IDS.length);
  cabecera('detalle-cab', 4, CW * ZOOM, ['FRENTE · reposo 1', 'FRENTE · reposo 2', 'ESPALDA · reposo 1', 'ESPALDA · reposo 2']);
  const pl = plataforma(28, 7);
  IDS.forEach((id, j) => {
    for (let k = 0; k < 4; k++) {
      const x = k * CW,
        y = j * CH;
      ctx.fillStyle = (k + j) % 2 ? '#d9d2b8' : '#d2cbb0';
      ctx.fillRect(x, y, CW, CH);
      const sp = k < 2 ? spriteFrente2(id, k) : spriteEspalda2(id, k - 2);
      const base = pie(spriteFrente2(id, 0));
      ctx.drawImage(pl, x + (CW - pl.width) / 2, y + 4 + base - 3 - 10);
      ctx.drawImage(sp, x + 4, y + 4);
    }
    console.log(id, 'colores', coloresSprite2(id, false, 0), coloresSprite2(id, false, 1), coloresSprite2(id, true, 0), coloresSprite2(id, true, 1));
  });
  document.getElementById('detalle-nota')!.textContent = 'Cada userito: 64×64, 13–15 colores en rampas de 3–5 tonos, contorno de color, luz arriba a la izquierda y luz de borde.';
}

// Font specimen (for review).
if (vista === 'fuente') {
  const ctx = lienzo('fuente', 240, 120, ZOOM);
  ctx.fillStyle = '#f8edd2';
  ctx.fillRect(0, 0, 240, 120);
  ['ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', 'abcdefghijklmnñopqrstuvwxyz', '0123456789 ÁÉÍÓÚÜ áéíóúü', '¡Hola, Ego-Ego! ¿Qué haces? 118/160 N50 100%', 'Jugamos al guiño, pequeño jamón (bar) +1 «:»'].forEach((l, i) => dibujarTexto2(ctx, l, 4, 8 + i * 14, '#3b2a3f', '#d8c8a2'));
}

// ---------------------------------------------------------------------------------------------
// Trainers sheet (?vista=entrenadores): 4 trainers (two idle frames), icons, portraits and the logo.
// ---------------------------------------------------------------------------------------------
if (vista === 'entrenadores') {
  document.getElementById('entrenadores-w')!.style.display = 'inline-block';
  const ids: EntrenadorId[] = ['fran', 'pablo', 'chuchi', 'guille'];
  const CW = 64,
    CH = 88;
  const ancho = Math.max(CW * 4, 240);
  const alto = CH * 2 + 30 + 52 + 100;
  const ctx = lienzo('entrenadores', ancho, alto, ZOOM);
  ctx.fillStyle = '#e9dfc6';
  ctx.fillRect(0, 0, ancho, alto);
  ids.forEach((id, i) => {
    for (let f = 0; f < 2; f++) {
      ctx.fillStyle = (i + f) % 2 ? '#e2d7ba' : '#ddd1b2';
      ctx.fillRect(i * CW, f * CH, CW, CH);
      ctx.drawImage(entrenador2(id, f), i * CW + 4, f * CH + 4);
    }
    console.log(id, 'colores', coloresEntrenador2(id, 0), coloresEntrenador2(id, 1));
    // icons ×1 and portraits on a dark panel
    ctx.fillStyle = '#3b2a3f';
    ctx.fillRect(i * CW, CH * 2, CW, 30);
    ctx.drawImage(icono2(id), i * CW + 8, CH * 2 + 7);
    ctx.fillStyle = '#e9dfc6';
    ctx.fillRect(i * CW + 28, CH * 2 + 7, 20, 18);
    ctx.drawImage(icono2(id), i * CW + 30, CH * 2 + 8);
    ctx.fillStyle = '#6e5a70';
    ctx.fillRect(i * CW, CH * 2 + 30, CW, 52);
    ctx.drawImage(retrato2(id), i * CW + 12, CH * 2 + 36);
  });
  const lg = logo2();
  ctx.fillStyle = '#3d7a4a';
  ctx.fillRect(0, CH * 2 + 82, ancho, 100 - 0);
  ctx.drawImage(lg, (ancho - lg.width) / 2, CH * 2 + 87);
  document.body.dataset.listo = '1';
}
