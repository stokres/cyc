// Dev-only page for the graphics v2 sample (not part of the build). Open /tools/pokeusera-v2.html on the
// Vite dev server. ?vista=detalle | antes | combate shows only that block (used by tools/pokeusera-v2-export.mjs).
//  - detalle: the new useritos big (front/back, two idle frames each).
//  - antes:   the current 32×32 art (×2) next to the new 64×64 (×1), same on-screen size.
//  - combate: the new 240-px portrait battle screen (the current one is a screenshot injected by the export script).
import { spriteEspalda as espaldaVieja, spriteFrente as frenteViejo } from '../src/pokeusera/arte/sprites';
import { FONDO, SUELO } from '../src/pokeusera/arte/paleta';
import { fondoBar, plataforma } from '../src/pokeusera/arte2/escena2';
import { dibujarTexto2 } from '../src/pokeusera/arte2/fuente2';
import { ALTO2, ANCHO2 } from '../src/pokeusera/arte2/paleta2';
import { IDS_USERITOS2, coloresSprite2, spriteEspalda2, spriteFrente2 } from '../src/pokeusera/arte2/sprites2';
import { barraSuperior, cajaTexto2, fichaPropia, fichaRival, filaMenu, panel } from '../src/pokeusera/arte2/ui2';

import { ANCHO_ENT2, ALTO_ENT2, coloresEntrenador2, entrenador2, icono2, retrato2 } from '../src/pokeusera/arte2/entrenadores2';
import { logo2 } from '../src/pokeusera/arte2/logo2';
import type { EntrenadorId } from '../src/pokeusera/tipos';

const params = new URLSearchParams(location.search);
const vista = params.get('vista') ?? 'todo';
const ZOOM = Number(params.get('z') ?? 3);
const SOLO = params.get('solo');
for (const v of ['detalle', 'antes', 'combate', 'fuente']) {
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

// ---------------------------------------------------------------------------------------------
// Before / after: old 32×32 drawn ×2, new 64×64 drawn ×1 (both 64 px on the logical screen).
// ---------------------------------------------------------------------------------------------
if (vista === 'todo' || vista === 'antes') {
  const CW = 80,
    CH = 88;
  const ctx = lienzo('antes', CW * 4, CH * IDS.length, ZOOM);
  cabecera('antes-cab', 4, CW * ZOOM, ['ANTES · frente', 'DESPUÉS · frente', 'ANTES · espalda', 'DESPUÉS · espalda']);
  const bar = fondoBar(240, 360);
  const pl = plataforma(30, 7);
  IDS.forEach((id, j) => {
    const y = j * CH;
    for (let k = 0; k < 4; k++) {
      const x = k * CW;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, CW, CH);
      ctx.clip();
      const nuevo = k % 2 === 1;
      if (nuevo) {
        // a slice of the bar floor so the new art is seen on its backdrop
        ctx.drawImage(bar, 80 + (k > 2 ? 20 : 0), 220, CW, CH, x, y, CW, CH);
      } else {
        ctx.fillStyle = FONDO;
        ctx.fillRect(x, y, CW, CH);
      }
      if (nuevo) {
        const sp = k === 1 ? spriteFrente2(id, 0) : spriteEspalda2(id, 0);
        const base = pie(spriteFrente2(id, 0));
        ctx.drawImage(pl, x + (CW - pl.width) / 2, y + 8 + base - 3 - 10);
        ctx.drawImage(sp, x + 8, y + 8);
      } else {
        const sp = k === 0 ? frenteViejo(id) : espaldaVieja(id);
        // old ground ellipse
        ctx.fillStyle = SUELO;
        ctx.fillRect(x + 8, y + 8 + 58, 64, 4);
        ctx.fillRect(x + 12, y + 8 + 62, 56, 2);
        ctx.drawImage(sp, x + 8, y + 8, 64, 64);
      }
      ctx.restore();
    }
  });
}

// Font specimen (for review).
if (vista === 'fuente') {
  const ctx = lienzo('fuente', 240, 120, ZOOM);
  ctx.fillStyle = '#f8edd2';
  ctx.fillRect(0, 0, 240, 120);
  ['ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', 'abcdefghijklmnñopqrstuvwxyz', '0123456789 ÁÉÍÓÚÜ áéíóúü', '¡Hola, Ego-Ego! ¿Qué haces? 118/160 N50 100%', 'Jugamos al guiño, pequeño jamón (bar) +1 «:»'].forEach((l, i) => dibujarTexto2(ctx, l, 4, 8 + i * 14, '#3b2a3f', '#d8c8a2'));
}

// ---------------------------------------------------------------------------------------------
// The 240×520 portrait battle mock.
// ---------------------------------------------------------------------------------------------
if (vista === 'todo' || vista === 'combate') {
  const ESC = ZOOM;
  const ctx = lienzo('nuevo', ANCHO2, ALTO2, ESC);
  const CAMPO = 340;
  ctx.drawImage(fondoBar(ANCHO2, CAMPO), 0, 0);
  // bottom tray under the text box and the menu
  const g = ctx.createLinearGradient(0, CAMPO, 0, ALTO2);
  g.addColorStop(0, '#5a4660');
  g.addColorStop(1, '#3b2a3f');
  ctx.fillStyle = g;
  ctx.fillRect(0, CAMPO, ANCHO2, ALTO2 - CAMPO);
  ctx.fillStyle = '#e0a83a';
  ctx.fillRect(0, CAMPO, ANCHO2, 1);
  ctx.fillStyle = '#8a6a8a';
  ctx.fillRect(0, CAMPO + 1, ANCHO2, 1);
  barraSuperior(ctx, ANCHO2, 'TURNO 1', '26');

  const rivales = [
    { id: 'draguserin', asiento: 1, entrenador: 'Pablo', frac: 1, vivos: 3 },
    { id: 'espumarro', asiento: 2, entrenador: 'Chuchi', frac: 0.62, vivos: 3 },
    { id: 'aceitun', asiento: 3, entrenador: 'Guille', frac: 0.18, vivos: 2 },
  ];
  const plR = plataforma(30, 7);
  const BASE = 62; // row of the sprite where the feet stand
  rivales.forEach((rv, i) => {
    const top = 22 + i * 80;
    const sp = spriteFrente2(rv.id, 0);
    const dy = BASE - pie(sp);
    const cx = 190;
    ctx.drawImage(plR, cx - plR.width / 2, top + BASE - 3 - 10);
    ctx.drawImage(sp, cx - 32, top + dy);
    fichaRival(ctx, 6, top + 8 + (i ? 2 : 2), { nombre: NOMBRES[rv.id], nivel: 'N50', frac: rv.frac, asiento: rv.asiento, entrenador: rv.entrenador, vivos: rv.vivos });
  });
  // own userito, seen from behind, bigger platform
  const plP = plataforma(42, 10);
  const propio = spriteEspalda2('ego-ego', 0);
  const topP = 258;
  ctx.drawImage(plP, 52 - plP.width / 2, topP + BASE - 3 - 14);
  ctx.drawImage(propio, 20, topP + BASE - pie(propio));
  fichaPropia(ctx, 100, topP + 12, { nombre: 'Ego-Ego', nivel: 'N50', frac: 0.74, asiento: 0, entrenador: 'Fran', vivos: 3, numeros: '118/160' });

  cajaTexto2(ctx, 4, CAMPO + 6, 232, 56, ['¡Ego-Ego usó Flipada!', '¡Es muy eficaz!']);
  // menu
  const my = CAMPO + 68;
  const etiquetas: ['LUCHAR' | 'USERITOS' | 'CAÑA', 'luchar' | 'userito' | 'cana'][] = [
    ['LUCHAR', 'luchar'],
    ['USERITOS', 'userito'],
    ['CAÑA', 'cana'],
  ];
  panel(ctx, 4, my, 232, 104);
  etiquetas.forEach(([t, ic], i) => filaMenu(ctx, 10, my + 6 + i * 31, 220, t, ic, i === 0));
  document.body.dataset.listo = '1';
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
