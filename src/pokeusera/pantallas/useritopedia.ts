// PokéUsera · the USERITOPEDIA: the encyclopedia of the 20 useritos. It opens over whatever is on screen (or over
// nothing) like the guide and gives it back when closed. Two views:
//   LISTA   – the 20 useritos in their numeric order (Nº01…Nº20): number, thumbnail, name, type chips and best stat.
//             Drag to scroll (with inertia), ↑↓ to move, Enter/tap to open one, VOLVER to leave.
//   FICHA   – one userito: big front sprite and small back sprite (both with their 2-frame idle), Nº, name, types,
//             description, the five base stats (tap one for its explanation), the four moves (type, power, accuracy,
//             PP, target, category, description) and its type matchups. ◀ ▶ / swipe / ←→ go to the previous or next one;
//             drag up/down to scroll; VOLVER goes back to the list (or closes, if it was opened on one userito).
// All the sentences are in src/textos/pokeusera.md (`useritopedia.*`) and pokeusera-combate.md (`userito.*.desc`,
// `mov.*.desc`); the numbers come from datos.ts.
//
// Performance (the owner insists): `estatica` is true, so the screen is redrawn only when something moves. `paso`
// returns true only while the list/ficha coasts after a drag, during the 160 ms slide between two useritos, and at
// the instant the idle frame of the sprites changes (twice a second). Every static part is baked once into a canvas:
// each list row (240×42), and each ficha (a tall canvas with everything but the two animated sprites and the
// stat-explanation bubble). A frame is a few drawImage calls. When idle, `paso` bakes the next row / the neighbours
// of the open ficha, one per frame, so scrolling and ◀ ▶ never hitch. No text is wrapped or measured per frame.
import { TIPOS_FISICOS, type Tipo } from '../tipos';
import { ESPECIES, MOVS, TIPOS, eficacia } from '../datos';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI_OSC, PAPEL_MEDIO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { spriteEspalda2, spriteFrente2 } from '../arte2/sprites2';
import { mezclar, panelCacheado, relleno } from '../arte2/ui2';
import { COLOR_TIPO, NOMBRE_TIPO } from '../arte/paleta';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { atacantesFuertes, defensoresCon, hileraTipos } from './guia';
import { miniatura, pieSprite, plataformaCacheada } from './fondos';
import { sobre } from './modal';
import { barraArriba, barraValor, boton, envolver, fondoPapel, flecha, insignaTipo, rect, reposo, t, texto2, textoGrande } from './ui';

const X0 = 4;
const AN = ANCHO - 8;
const N = ESPECIES.length;

type ClaveStat = 'ps' | 'ata' | 'def' | 'vel' | 'esp';
const STATS: readonly ClaveStat[] = ['ps', 'ata', 'def', 'vel', 'esp'];

const numero = (i: number): string => t('useritopedia.num', { n: String(i + 1).padStart(2, '0') });

/** Position (1 = best) of each userito in each base stat, among the 20 (ties share the place). Computed once. */
let rangos: Record<ClaveStat, number[]> | null = null;
function rangoDe(k: ClaveStat, i: number): number {
  if (!rangos) {
    rangos = { ps: [], ata: [], def: [], vel: [], esp: [] };
    for (const s of STATS) rangos[s] = ESPECIES.map((e) => 1 + ESPECIES.filter((o) => o.base[s] > e.base[s]).length);
  }
  return rangos[k][i];
}

/** The stat where a userito is best (first of the five on a tie). */
function mejorStat(i: number): ClaveStat {
  const b = ESPECIES[i].base;
  return STATS.reduce((m, s) => (b[s] > b[m] ? s : m), STATS[0]);
}

// ------------------------------------------------------------------ list rows (baked)

const FILA_H = 40;
const PASO_FILA = 42;
const TOPE_LISTA = 16; // room above the first row for the hint line

const filas: (HTMLCanvasElement | undefined)[] = [];

function fila(i: number): HTMLCanvasElement {
  let c = filas[i];
  if (c) return c;
  const sp = ESPECIES[i];
  c = document.createElement('canvas');
  c.width = AN;
  c.height = FILA_H + 2;
  const cx = c.getContext('2d')!;
  cx.imageSmoothingEnabled = false;
  panelCacheado(cx, 0, 0, AN, FILA_H);
  texto2(cx, numero(i), 11, 16, TINTA_SUAVE, null);
  // The thumbnail on a plate tinted with the first type's colour.
  relleno(cx, TINTA2, 37, 3, 36, 34);
  relleno(cx, mezclar(PAPEL_MEDIO, COLOR_TIPO[sp.tipos[0]], 0.4), 38, 4, 34, 32);
  cx.drawImage(miniatura(sp.id), 39, 5);
  texto2(cx, sp.nombre, 80, 9);
  let x = 80;
  for (const tp of sp.tipos) x += insignaTipo(cx, tp, x, 23) + 3;
  const k = mejorStat(i);
  const mejor = t('useritopedia.mejor', { stat: t(`useritopedia.stat.${k}`), v: sp.base[k] });
  texto2(cx, mejor, AN - 10 - anchoTexto2(mejor), 9, TINTA_SUAVE, null);
  filas[i] = c;
  return c;
}

// ------------------------------------------------------------------ ficha (baked)

interface Ficha {
  cv: HTMLCanvasElement;
  alto: number;
  /** Top of the front sprite (128×128) and of the back sprite (64×64) inside the baked canvas. */
  ySprite: number;
  /** Top of each of the five stat rows. */
  yStat: number[];
  /** The type colour used for the bars. */
  color: string;
}

const HERO_H = 140;
const ESCENARIO_X = 9;
const ESCENARIO_W = 138;
const ATRAS_X = 151;
const ATRAS_W = 80;
const ATRAS_H = 70;

function encabezado(cx: CanvasRenderingContext2D, y: number, s: string): number {
  const w = anchoTexto2(s);
  const x = Math.floor((ANCHO - w) / 2);
  texto2(cx, s, x, y + 3, TINTA2);
  rect(cx, '#c4a860', X0 + 4, y + 6, x - X0 - 12, 1);
  rect(cx, '#c4a860', x + w + 8, y + 6, ANCHO - X0 - 4 - (x + w + 8), 1);
  return 18;
}

/** Lays the ficha out from the top; draws it if `cx` is given, only measures if not. Returns the geometry. */
function maquetar(cx: CanvasRenderingContext2D | null, i: number): Omit<Ficha, 'cv'> {
  const sp = ESPECIES[i];
  const color = COLOR_TIPO[sp.tipos[0]];
  const yStat: number[] = [];
  let y = 2;

  // --- Name and number.
  if (cx) {
    panelCacheado(cx, X0, y, AN, 30);
    const num = numero(i);
    const nw = anchoTexto2(num) + 10;
    const nx = X0 + AN - 10 - nw;
    relleno(cx, TINTA2, nx, y + 8, nw, 14);
    relleno(cx, '#e8c25a', nx + 1, y + 9, nw - 2, 12);
    rect(cx, '#fff3c8', nx + 2, y + 9, nw - 4, 1);
    texto2(cx, num, nx + 5, y + 12, TINTA2, null);
    const grande = anchoTexto2(sp.nombre) * 2 <= nx - (X0 + 12) - 6;
    if (grande) textoGrande(cx, sp.nombre, X0 + 12, y + 8, TINTA2, 2);
    else texto2(cx, sp.nombre, X0 + 12, y + 12);
  }
  y += 34;

  // --- Hero: front sprite big (animated, drawn live), back sprite small (live), types.
  const yHero = y;
  const ySprite = yHero + 6;
  if (cx) {
    panelCacheado(cx, X0, yHero, AN, HERO_H);
    const tinte = mezclar(PAPEL_MEDIO, color, 0.3);
    relleno(cx, TINTA2, ESCENARIO_X, yHero + 4, ESCENARIO_W, 132);
    relleno(cx, tinte, ESCENARIO_X + 1, yHero + 5, ESCENARIO_W - 2, 130);
    const pie = pieSprite(spriteFrente2(sp.id, 0)) * 2 + ySprite;
    const m = plataformaCacheada(44, 9);
    cx.drawImage(m, ESCENARIO_X + Math.floor((ESCENARIO_W - m.width) / 2), pie - 13);
    relleno(cx, TINTA2, ATRAS_X, yHero + 4, ATRAS_W, ATRAS_H + 2);
    relleno(cx, tinte, ATRAS_X + 1, yHero + 5, ATRAS_W - 2, ATRAS_H);
    const m2 = plataformaCacheada(20, 5);
    const pie2 = pieSprite(spriteEspalda2(sp.id, 0)) + yHero + 7;
    cx.drawImage(m2, ATRAS_X + Math.floor((ATRAS_W - m2.width) / 2), pie2 - 8);
    let ty = yHero + 4 + ATRAS_H + 12;
    for (const tp of sp.tipos) {
      const ancho = anchoTexto2(NOMBRE_TIPO[tp].toUpperCase()) + 7;
      insignaTipo(cx, tp, ATRAS_X + Math.floor((ATRAS_W - ancho) / 2), ty);
      ty += 14;
    }
  }
  y += HERO_H + 4;

  // --- Description.
  const desc = envolver(t(`userito.${sp.id}.desc`), AN - 24);
  const hDesc = 10 + desc.length * 12 + 2;
  if (cx) {
    panelCacheado(cx, X0, y, AN, hDesc);
    desc.forEach((l, k) => texto2(cx, l, X0 + 12, y + 9 + k * 12));
  }
  y += hDesc + 6;

  // --- Base stats.
  y += cx ? encabezado(cx, y, t('useritopedia.h.stats')) : 18;
  const total = STATS.reduce((a, s) => a + sp.base[s], 0);
  const igual = ESPECIES.every((e) => STATS.reduce((a, s) => a + e.base[s], 0) === total);
  const k = mejorStat(i);
  const notaTotal = envolver(t(igual ? 'useritopedia.total.igual' : 'useritopedia.total.dist'), AN - 24);
  const lineaMejor = envolver(t('useritopedia.mejor.linea', { stat: t(`useritopedia.stat.${k}`), v: sp.base[k], p: rangoDe(k, i), n: N }), AN - 24);
  const pista = envolver(t('useritopedia.stats.toca'), AN - 24);
  const hStats = 8 + STATS.length * 16 + 6 + 12 + (notaTotal.length + lineaMejor.length + pista.length) * 12 + 6;
  for (let s = 0; s < STATS.length; s++) yStat.push(y + 8 + s * 16);
  if (cx) {
    panelCacheado(cx, X0, y, AN, hStats);
    STATS.forEach((st, s) => {
      const yy = yStat[s];
      texto2(cx, t(`useritopedia.stat.${st}`), X0 + 10, yy, TINTA_SUAVE);
      barraValor(cx, X0 + 44, yy, 134, Math.min(sp.base[st], 150) / 150, color);
      const v = String(sp.base[st]);
      texto2(cx, v, X0 + AN - 10 - anchoTexto2(v), yy, TINTA2);
    });
    let yy = y + 8 + STATS.length * 16;
    rect(cx, '#d6c08a', X0 + 10, yy, AN - 20, 1);
    yy += 6;
    texto2(cx, t('useritopedia.total', { n: total }), X0 + 12, yy, TINTA2);
    yy += 12;
    for (const l of [...notaTotal, ...lineaMejor]) {
      texto2(cx, l, X0 + 12, yy, TINTA2, null);
      yy += 12;
    }
    for (const l of pista) {
      texto2(cx, l, X0 + 12, yy, TINTA_SUAVE, null);
      yy += 12;
    }
  }
  y += hStats + 6;

  // --- Moves.
  y += cx ? encabezado(cx, y, t('useritopedia.h.movs')) : 18;
  for (const mid of sp.movs) {
    const m = MOVS[mid];
    const dm = envolver(t(`mov.${mid}.desc`), AN - 24);
    const h = 56 + dm.length * 12;
    if (cx) {
      panelCacheado(cx, X0, y, AN, h);
      const w = insignaTipo(cx, m.tipo, X0 + 10, y + 7);
      texto2(cx, m.nombre, X0 + 10 + w + 6, y + 9, TINTA2);
      // Power, accuracy, PP and target.
      let x = X0 + 10;
      const par = (rotulo: string, valor: string, ancho: number) => {
        const w2 = texto2(cx, rotulo, x, y + 23, TINTA_SUAVE, null);
        texto2(cx, valor, x + w2 + 4, y + 23, TINTA2, null);
        x += ancho;
      };
      par(t('useritopedia.pot'), m.id === 'premio' ? t('useritopedia.pot.azar') : m.pot === null ? t('useritopedia.sin') : String(m.pot), 56);
      par(t('useritopedia.prec'), m.prec === null ? t('useritopedia.sin') : String(m.prec), 68);
      par(t('useritopedia.pp'), String(m.pp), 40);
      const obj = t(`useritopedia.obj.${m.objetivo}`);
      texto2(cx, obj, X0 + AN - 10 - anchoTexto2(obj), y + 23, TINTA2, null);
      // Category and priority.
      const cat = m.pot === null && m.id !== 'premio' ? 'estado' : TIPOS_FISICOS.includes(m.tipo) ? 'fisico' : 'especial';
      const wc = texto2(cx, t(`useritopedia.cat.${cat}`), X0 + 10, y + 37, TINTA_SUAVE, null);
      if (m.prioridad) texto2(cx, t('useritopedia.prio'), X0 + 10 + wc + 10, y + 37, ORO_UI_OSC, null);
      rect(cx, '#d6c08a', X0 + 10, y + 49, AN - 20, 1);
      dm.forEach((l, j) => texto2(cx, l, X0 + 12, y + 53 + j * 12, TINTA2, null));
    }
    y += h + 3;
  }
  y += 3;

  // --- Type matchups (from the engine's chart, like the draft card).
  y += cx ? encabezado(cx, y, t('useritopedia.h.tipos')) : 18;
  const pega = [...new Set(sp.tipos.flatMap((a) => defensoresCon(a, 2)))];
  const pegan = atacantesFuertes(sp.tipos);
  const inmune = TIPOS.filter((a) => eficacia(a, sp.tipos) === 0);
  const grupos: [string, readonly Tipo[], boolean][] = [
    [t('draft.pega'), pega, false],
    [t('draft.pegan'), pegan, true],
    [t('draft.inmune'), inmune, false],
  ];
  const x4 = (tp: Tipo) => (eficacia(tp, sp.tipos) >= 4 ? t('draft.x4') : '');
  const ancho = AN - 20;
  let hT = 8;
  for (const [, l, d] of grupos) hT += 12 + hileraTipos(null, l, 0, 0, ancho, d ? x4 : undefined) + 4;
  if (cx) {
    panelCacheado(cx, X0, y, AN, hT);
    let yy = y + 8;
    for (const [lab, l, d] of grupos) {
      texto2(cx, lab, X0 + 10, yy, TINTA_SUAVE, null);
      yy += 12;
      yy += hileraTipos(cx, l, X0 + 10, yy, ancho, d ? x4 : undefined) + 4;
    }
  }
  y += hT + 8;
  return { alto: y, ySprite, yStat, color };
}

const fichas = new Map<number, Ficha>();
const MAX_FICHAS = 6;

function ficha(i: number): Ficha {
  let f = fichas.get(i);
  if (f) {
    fichas.delete(i); // most recent last
    fichas.set(i, f);
    return f;
  }
  const medida = maquetar(null, i);
  const cv = document.createElement('canvas');
  cv.width = ANCHO;
  cv.height = medida.alto;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;
  maquetar(cx, i);
  f = { cv, ...medida };
  fichas.set(i, f);
  if (fichas.size > MAX_FICHAS) fichas.delete(fichas.keys().next().value!);
  return f;
}

// ------------------------------------------------------------------ the screen

const DURACION_DESLIZ = 160;
const ALTO_BOTON = 26;

/**
 * Opens the Useritopedia over `base` (whatever screen is showing, or null) and resolves when the player closes it.
 * With `id` it opens straight on that userito's ficha (VOLVER then closes instead of going to the list).
 */
export function abrirUseritopedia(base: Escena | null, id?: string): Promise<void> {
  return sobre<void>(base, (cerrar) => {
    const inicial = id ? ESPECIES.findIndex((e) => e.id === id) : -1;
    const directo = inicial >= 0;
    let modo: 'lista' | 'ficha' = directo ? 'ficha' : 'lista';
    let idx = Math.max(0, inicial);
    let sel = -1; // keyboard / last-opened row in the list
    let scroll = 0;
    let scrollLista = 0;
    let vel = 0; // px per ms
    let statSel: ClaveStat | null = null;
    let desliz: { desde: number; scrollDesde: number; dir: 1 | -1; t: number } | null = null;
    let fotograma = -1;
    let eje: 'x' | 'y' | null = null;
    let ultT = 0;
    let altoVista = 100;
    let precalentada = 0;
    const etapas = new Map<number, number>();

    const volver = () => {
      sonido.efecto('atras');
      cerrar();
    };
    const alto = () => (modo === 'lista' ? TOPE_LISTA + N * PASO_FILA + 6 : ficha(idx).alto);
    const maxScroll = () => Math.max(0, alto() - altoVista);
    const limitar = (v: number) => Math.max(0, Math.min(maxScroll(), v));

    const abrirFicha = (i: number) => {
      scrollLista = scroll;
      modo = 'ficha';
      idx = i;
      sel = i;
      scroll = 0;
      vel = 0;
      statSel = null;
      desliz = null;
      sonido.efecto('aceptar');
      sonido.grito(ESPECIES[i].id);
    };
    const volverALista = () => {
      modo = 'lista';
      scroll = scrollLista;
      vel = 0;
      statSel = null;
      desliz = null;
      sonido.efecto('atras');
    };
    const atras = () => (modo === 'ficha' && !directo ? volverALista() : volver());
    const irA = (delta: number) => {
      if (desliz) return;
      desliz = { desde: idx, scrollDesde: scroll, dir: delta > 0 ? 1 : -1, t: 0 };
      idx = (idx + delta + N) % N;
      scroll = 0;
      vel = 0;
      statSel = null;
      sel = idx;
      sonido.efecto('cursor');
      sonido.grito(ESPECIES[idx].id);
    };
    const asegurarFila = (i: number) => {
      const y = TOPE_LISTA + i * PASO_FILA;
      if (y < scroll + 2) scroll = y - 2;
      else if (y + PASO_FILA > scroll + altoVista) scroll = y + PASO_FILA - altoVista;
      scroll = limitar(scroll);
    };

    /** The fixed pieces of a ficha drawn live on top of the baked canvas: the two sprites. */
    const dibujarFicha = (ctx: CanvasRenderingContext2D, i: number, offX: number, sc: number, yTop: number, frame: number) => {
      const f = ficha(i);
      const sh = Math.min(altoVista, f.alto - sc);
      if (sh > 0) ctx.drawImage(f.cv, 0, sc, ANCHO, sh, offX, yTop, ANCHO, sh);
      const yf = yTop + f.ySprite - sc;
      if (yf + 128 > yTop && yf < yTop + altoVista) ctx.drawImage(spriteFrente2(ESPECIES[i].id, frame), 0, 0, 64, 64, offX + 12, yf, 128, 128);
      const yb = yTop + f.ySprite + 1 - sc;
      if (yb + 64 > yTop && yb < yTop + altoVista) ctx.drawImage(spriteEspalda2(ESPECIES[i].id, frame), offX + ATRAS_X + Math.floor((ATRAS_W - 64) / 2), yb);
    };

    /** One step of warming up the ficha of userito `j` (its four sprites, then the baked canvas); false when it is all done. */
    const calentar = (j: number): boolean => {
      const id = ESPECIES[j].id;
      if (fichas.has(j)) return false;
      const k = etapas.get(j) ?? 0;
      etapas.set(j, k + 1);
      if (k === 0) spriteFrente2(id, 0);
      else if (k === 1) spriteFrente2(id, 1);
      else if (k === 2) spriteEspalda2(id, 0);
      else if (k === 3) spriteEspalda2(id, 1);
      else ficha(j);
      return true;
    };

    const e: Escena = {
      estatica: true,
      paso(dt, ahora) {
        let mueve = false;
        if (eje === null && Math.abs(vel) > 0.02) {
          const antes = scroll;
          scroll = limitar(scroll + vel * dt);
          vel = scroll === antes ? 0 : vel * Math.exp(-dt / 260);
          mueve = true;
        } else if (eje === null) vel = 0;
        if (desliz) {
          desliz.t += dt;
          if (desliz.t >= DURACION_DESLIZ) desliz = null;
          mueve = true;
        }
        if (modo === 'ficha' && reposo(ahora) !== fotograma) mueve = true;
        if (!mueve) {
          // Idle: one bit of baking per frame (the rows of the list; sprites, then the ficha, of the neighbours of the open one).
          if (modo === 'lista') {
            while (precalentada < N && filas[precalentada]) precalentada++;
            if (precalentada < N) fila(precalentada++);
            else {
              // Rows done: warm the fichas of the visible rows (while the cache has room), so a tap opens at once.
              const i0 = Math.max(0, Math.floor((scroll - TOPE_LISTA) / PASO_FILA));
              const i1 = Math.min(N - 1, Math.floor((scroll + altoVista - TOPE_LISTA) / PASO_FILA));
              for (let j = i0; j <= i1 && fichas.size < MAX_FICHAS; j++) if (calentar(j)) break;
            }
          } else {
            for (const j of [(idx + 1) % N, (idx + N - 1) % N]) if (calentar(j)) break;
          }
        }
        return mueve;
      },
      dibujar(ctx, ahora) {
        const H = pantalla().alto;
        const yTop = 20;
        const yFin = H - 36;
        altoVista = yFin - yTop;
        scroll = limitar(scroll);
        fotograma = reposo(ahora);
        fondoPapel(ctx, H);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, yTop, ANCHO, altoVista);
        ctx.clip();
        if (modo === 'lista') {
          const pista = t('useritopedia.lista.pista');
          texto2(ctx, pista, Math.floor((ANCHO - anchoTexto2(pista)) / 2), yTop + 4 - scroll, TINTA_SUAVE, null);
          const i0 = Math.max(0, Math.floor((scroll - TOPE_LISTA) / PASO_FILA));
          const i1 = Math.min(N - 1, Math.floor((scroll + altoVista - TOPE_LISTA) / PASO_FILA));
          for (let i = i0; i <= i1; i++) {
            const y = yTop + TOPE_LISTA + i * PASO_FILA - scroll;
            ctx.drawImage(fila(i), X0, y);
            if (i === sel) {
              const c = ORO_UI_OSC;
              rect(ctx, c, X0 - 1, y - 1, AN + 2, 2);
              rect(ctx, c, X0 - 1, y + FILA_H - 1, AN + 2, 2);
              rect(ctx, c, X0 - 1, y - 1, 2, FILA_H + 2);
              rect(ctx, c, X0 + AN - 1, y - 1, 2, FILA_H + 2);
            }
            const zy = Math.max(y, yTop);
            entrada.zona(X0, zy, AN, Math.min(y + FILA_H, yFin) - zy, () => {
              if (Math.abs(vel) > 0.15) vel = 0;
              else abrirFicha(i);
            });
          }
        } else {
          const frame = fotograma;
          if (desliz) {
            const p = Math.min(1, desliz.t / DURACION_DESLIZ);
            const q = 1 - (1 - p) * (1 - p);
            dibujarFicha(ctx, desliz.desde, Math.round(-desliz.dir * q * ANCHO), desliz.scrollDesde, yTop, frame);
            dibujarFicha(ctx, idx, Math.round(desliz.dir * (1 - q) * ANCHO), scroll, yTop, frame);
          } else {
            dibujarFicha(ctx, idx, 0, scroll, yTop, frame);
            const f = ficha(idx);
            // Tap the big sprite to hear its cry again.
            const yf = yTop + f.ySprite - scroll;
            const zy = Math.max(yf, yTop);
            entrada.zona(12, zy, 128, Math.min(yf + 128, yFin) - zy, () => sonido.grito(ESPECIES[idx].id));
            STATS.forEach((st, s) => {
              const ys = yTop + f.yStat[s] - scroll;
              if (statSel === st) {
                const c = ORO_UI_OSC;
                rect(ctx, c, X0 + 6, ys - 4, AN - 12, 2);
                rect(ctx, c, X0 + 6, ys + 9, AN - 12, 2);
                rect(ctx, c, X0 + 6, ys - 4, 2, 15);
                rect(ctx, c, X0 + AN - 8, ys - 4, 2, 15);
              }
              if (ys + 12 > yTop && ys - 4 < yFin) {
                const zy2 = Math.max(ys - 4, yTop);
                entrada.zona(X0 + 4, zy2, AN - 8, Math.min(ys + 12, yFin) - zy2, () => {
                  statSel = statSel === st ? null : st;
                  sonido.efecto('cursor');
                });
              }
            });
            if (statSel) {
              const lineas = envolver(t(`ayuda.stat.${statSel}`), AN - 24);
              const h = 12 + lineas.length * 12;
              const by = yFin - h - 3;
              panelCacheado(ctx, X0, by, AN, h);
              lineas.forEach((l, j) => texto2(ctx, l, X0 + 12, by + 8 + j * 12, TINTA2, null));
              entrada.zona(X0, by, AN, h, () => {
                statSel = null;
              });
            }
          }
        }
        ctx.restore();

        // Scrollbar.
        const total = alto();
        if (total > altoVista) {
          const bh = Math.max(12, Math.round((altoVista * altoVista) / total));
          const by = yTop + Math.round(((altoVista - bh) * scroll) / maxScroll());
          rect(ctx, TINTA2, ANCHO - 3, by, 3, bh);
        }

        // Top bar.
        barraArriba(ctx);
        if (modo === 'lista') {
          const s = t('useritopedia.titulo');
          texto2(ctx, s, Math.floor((ANCHO - anchoTexto2(s)) / 2), 6, TINTA2);
        } else {
          const s = t('useritopedia.de', { n: idx + 1, total: N });
          texto2(ctx, s, Math.floor((ANCHO - anchoTexto2(s)) / 2), 6, TINTA2);
          flecha(ctx, 6, 5, -1);
          flecha(ctx, ANCHO - 11, 5, 1);
          entrada.zona(0, 0, 44, 26, () => irA(-1));
          entrada.zona(ANCHO - 44, 0, 44, 26, () => irA(1));
        }

        // Bottom buttons.
        const bw = 110;
        if (modo === 'lista') {
          const bx = Math.floor((ANCHO - bw) / 2);
          boton(ctx, bx, H - 32, bw, ALTO_BOTON, t('useritopedia.volver'), true);
          entrada.zona(bx, H - 32, bw, ALTO_BOTON, volver);
        } else {
          const bx = Math.floor((ANCHO - bw) / 2);
          boton(ctx, bx, H - 32, bw, ALTO_BOTON, t('useritopedia.volver'), true);
          entrada.zona(bx, H - 32, bw, ALTO_BOTON, atras);
          const ax = bx - 6 - 40;
          const bx2 = bx + bw + 6;
          panelCacheado(ctx, ax, H - 32, 40, ALTO_BOTON);
          panelCacheado(ctx, bx2, H - 32, 40, ALTO_BOTON);
          flecha(ctx, ax + 17, H - 32 + 10, -1);
          flecha(ctx, bx2 + 18, H - 32 + 10, 1);
          entrada.zona(ax, H - 32, 40, ALTO_BOTON, () => irA(-1));
          entrada.zona(bx2, H - 32, 40, ALTO_BOTON, () => irA(1));
        }
      },
      accion(a: Accion) {
        if (modo === 'lista') {
          if (a === 'arriba' || a === 'abajo') {
            sel = sel < 0 ? (a === 'abajo' ? 0 : N - 1) : (sel + (a === 'abajo' ? 1 : N - 1)) % N;
            vel = 0;
            asegurarFila(sel);
            sonido.efecto('cursor');
          } else if (a === 'aceptar') abrirFicha(sel < 0 ? 0 : sel);
          else if (a === 'atras') volver();
        } else if (a === 'izq') irA(-1);
        else if (a === 'der') irA(1);
        else if (a === 'arriba' || a === 'abajo') {
          scroll = limitar(scroll + (a === 'abajo' ? 40 : -40));
          vel = 0;
        } else if (a === 'aceptar') sonido.grito(ESPECIES[idx].id);
        else if (a === 'atras') {
          if (statSel) statSel = null;
          else atras();
        }
        return true;
      },
      arrastre(_dx, dy, total, fin) {
        const ahora = performance.now();
        if (!fin) {
          if (eje === null) {
            eje = Math.abs(total.x) > Math.abs(total.y) && modo === 'ficha' ? 'x' : 'y';
            vel = 0;
            ultT = ahora;
          }
          if (eje === 'y') {
            const dtm = Math.max(1, ahora - ultT);
            ultT = ahora;
            scroll = limitar(scroll - dy);
            vel = vel * 0.5 - (dy / dtm) * 0.5;
          }
          return;
        }
        if (eje === 'x') {
          if (Math.abs(total.x) > 30 && Math.abs(total.x) > Math.abs(total.y) * 1.5) irA(total.x < 0 ? 1 : -1);
        } else if (ahora - ultT > 90) vel = 0;
        else vel = Math.max(-3, Math.min(3, vel));
        eje = null;
      },
    };
    if (directo) sonido.grito(ESPECIES[idx].id);
    return e;
  });
}
