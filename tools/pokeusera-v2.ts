// Dev-only page to review the GBA art (not part of the build). Open /tools/pokeusera-v2.html on the Vite dev
// server. ?vista=detalle | fuente | entrenadores shows only that block (detalle is used by tools/pokeusera-v2-export.mjs).
//  - detalle:      the useritos big (front/back, two idle frames each).
//  - fuente:       the font specimen.
//  - entrenadores: trainers, icons, portraits and the logo.
//  - useritopedia: the real Useritopedia screen over a plain backdrop (&id=camioner opens straight on one; &medir=1 gives window.__medir).
//  - efectos:      the move effects (pantallas/efectosMov.ts) looping on a mock battle backdrop, one cell per move.
//                  &hoja=1 builds the contact sheet (3 frames per effect) in #hoja-efectos instead and exposes
//                  window.__hojaPNG() (data URL) and window.__fotograma(mov, ms) (data URL of one frame);
//                  &medir=1 exposes window.__medir() (cost of paso+dibujar in the worst case).
//  - fondos:       the four battle backdrops (arte2/escenarios2.ts) side by side in #hoja-fondos (&h=290 is the field height,
//                  &con=1 puts the four useritos, their plates and mock panels on top as in combat, &z=3 the zoom, &ids=terraza,juan
//                  limits them). Exposes window.__hojaFondosPNG().
// The real screens are the game itself (/pokeusera.html); there is no separate mock any more.
import { plataforma } from '../src/pokeusera/arte2/escena2';
import { dibujarTexto2 } from '../src/pokeusera/arte2/fuente2';
import { IDS_USERITOS2, coloresSprite2, spriteEspalda2, spriteFrente2 } from '../src/pokeusera/arte2/sprites2';

import { ANCHO_ENT2, ALTO_ENT2, coloresEntrenador2, entrenador2, icono2, retrato2 } from '../src/pokeusera/arte2/entrenadores2';
import { logo2 } from '../src/pokeusera/arte2/logo2';
import { fondoBar } from '../src/pokeusera/arte2/escena2';
import { ESCENARIOS, fondoEscenario, type EscenarioId } from '../src/pokeusera/arte2/escenarios2';
import { EfectosMov, MOVS_CON_EFECTO, precalentarEfectos, semillaFx, type PuntoFx } from '../src/pokeusera/pantallas/efectosMov';
import { MOVS } from '../src/pokeusera/datos';
import { ENTRENADORES, type EntrenadorId } from '../src/pokeusera/tipos';
import raw from '../src/textos/pokeusera.md?raw';
import rawCombate from '../src/textos/pokeusera-combate.md?raw';
import { cargarTextos } from '../src/juego/textos';
import { entrada } from '../src/pokeusera/entrada';
import { Pantalla } from '../src/pokeusera/pantalla';
import { abrirUseritopedia } from '../src/pokeusera/pantallas/useritopedia';
import { fondoPapel } from '../src/pokeusera/pantallas/ui';
import { precalentar } from '../src/pokeusera/pantallas/precalentar';

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

const NOMBRES: Record<string, string> = { draguserin: 'Draguserín', espumarro: 'Espumarro', 'ego-ego': 'Ego-Ego', aceituna: 'Aceituna' };
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
// Contact sheet (?vista=hoja&ids=a,b,c&z=4): per userito the front (frames 0 and 1) and the back, pixel-sharp
// at ×z on a neutral backdrop, the id underneath. Two userito blocks per row.
// ---------------------------------------------------------------------------------------------
if (vista === 'hoja') {
  document.getElementById('hoja-w')!.hidden = false;
  const NUEVOS = ['maletrio', 'teloneon', 'choquechu', 'torrezmon', 'papiroflexeon', 'ceceseta'];
  const ids = (params.get('ids') ?? NUEVOS.join(',')).split(',');
  const z = Number(params.get('z') ?? 4);
  const CELDA = 72; // 64 px of sprite + 4 px of air on every side
  const ETIQ = 30; // height of the id strip (screen px)
  const POR_FILA = 2;
  const filas = Math.ceil(ids.length / POR_FILA);
  const bloqueW = CELDA * 3 * z;
  const bloqueH = CELDA * z + ETIQ;
  const hoja = document.getElementById('hoja') as HTMLCanvasElement;
  hoja.width = bloqueW * POR_FILA;
  hoja.height = bloqueH * filas;
  hoja.style.width = `${hoja.width}px`;
  hoja.style.height = `${hoja.height}px`;
  const cx = hoja.getContext('2d')!;
  cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#b4b7c2';
  cx.fillRect(0, 0, hoja.width, hoja.height);
  ids.forEach((id, n) => {
    const x0 = (n % POR_FILA) * bloqueW;
    const y0 = Math.floor(n / POR_FILA) * bloqueH;
    for (let k = 0; k < 3; k++) {
      cx.fillStyle = (k + n) % 2 ? '#b9bcc7' : '#aeb1bd';
      cx.fillRect(x0 + k * CELDA * z, y0, CELDA * z, CELDA * z);
      const sp = k < 2 ? spriteFrente2(id, k) : spriteEspalda2(id, 0);
      cx.drawImage(sp, x0 + (k * CELDA + 4) * z, y0 + 4 * z, 64 * z, 64 * z);
    }
    cx.fillStyle = '#2b2b33';
    cx.fillRect(x0, y0 + CELDA * z, bloqueW, ETIQ);
    cx.fillStyle = '#f2f2f6';
    cx.font = '600 15px system-ui, sans-serif';
    cx.textBaseline = 'middle';
    cx.textAlign = 'center';
    cx.fillText(id, x0 + bloqueW / 2, y0 + CELDA * z + ETIQ / 2);
    cx.font = '500 11px system-ui, sans-serif';
    cx.fillStyle = '#a9acba';
    cx.textAlign = 'left';
    cx.fillText('frente 1 · frente 2 · espalda', x0 + 8, y0 + CELDA * z + ETIQ / 2);
    cx.textAlign = 'right';
    cx.fillText(`${coloresSprite2(id, false, 0)} / ${coloresSprite2(id, false, 1)} / ${coloresSprite2(id, true, 0)} colores`, x0 + bloqueW - 8, y0 + CELDA * z + ETIQ / 2);
    console.log(id, 'colores', coloresSprite2(id, false, 0), coloresSprite2(id, false, 1), coloresSprite2(id, true, 0), coloresSprite2(id, true, 1));
  });
  document.body.dataset.listo = '1';
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
  const ids: EntrenadorId[] = [...ENTRENADORES];
  const CW = 64,
    CH = 88;
  const ancho = Math.max(CW * ids.length, 240);
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

// ---------------------------------------------------------------------------------------------
// Move effects (?vista=efectos): a mock battle (player bottom-left, three rivals on the right).
// ---------------------------------------------------------------------------------------------
if (vista === 'efectos') {
  document.getElementById('efectos-w')!.style.display = 'block';
  const SW = 240;
  const SH = 270;
  const YO: PuntoFx = { x: 64, y: 214 };
  const RIVALES: PuntoFx[] = [
    { x: 160, y: 46 },
    { x: 160, y: 108 },
    { x: 160, y: 170 },
  ];
  // Sample moves with the generic effect, to see them next to the signature ones.
  const GENERICOS = ['bostezo', 'remolino', 'flipada', 'susto'];
  const TODOS = [...MOVS_CON_EFECTO, ...GENERICOS];
  // &movs=a,b,c: only those moves (for a contact sheet of the new effects). `mov@0.2` sets the strength (0 to 1) of a move of variable
  // power (Remate por bulerías); the same move can come several times with different strengths.
  const solo = params.get('movs')?.split(',');
  const LISTA = solo ? solo.filter((m) => TODOS.includes(m.split('@')[0])) : TODOS;
  const base = (m: string): string => m.split('@')[0];
  const fuerzaDe = (m: string): number => (m.includes('@') ? Number(m.split('@')[1]) : 0.5);

  /** The static stage (backdrop, platforms and sprites), baked once. */
  const escenario = document.createElement('canvas');
  escenario.width = SW;
  escenario.height = SH;
  {
    const cx = escenario.getContext('2d')!;
    cx.imageSmoothingEnabled = false;
    cx.drawImage(fondoBar(SW, SH), 0, 0);
    const pl = plataforma(28, 7);
    const rivales = ['tocinon', 'aceituna', 'ego-ego'];
    RIVALES.forEach((p, i) => {
      cx.drawImage(pl, p.x - pl.width / 2, p.y + 18);
      cx.drawImage(spriteFrente2(rivales[i], 0), p.x - 32, p.y - 32);
    });
    cx.drawImage(pl, YO.x - pl.width / 2, YO.y + 18);
    cx.drawImage(spriteEspalda2('draguserin', 0), YO.x - 32, YO.y - 32);
  }
  const objetivosDe = (mov: string): PuntoFx[] => {
    const o = MOVS[base(mov)]?.objetivo;
    return o === 'yo' ? [] : o === 'todos' ? RIVALES : [RIVALES[1]];
  };
  const tipoDe = (mov: string) => MOVS[base(mov)]?.tipo ?? 'mindundi';

  /** Pause between loops (ms). */
  const PAUSA = 450;
  if (params.get('medir')) {
    // measuring only: no loop, no sheet (so the first launch really bakes the sprites)
  } else if (params.get('hoja')) {
    // --- Contact sheet: LISTA × 3 frames, two effects per row.
    const FRAC_DE: Record<string, number[]> = { tendedero: [0.22, 0.42, 0.75], remate: [0.12, 0.45, 0.7], petardazo: [0.35, 0.55, 0.8], chupitazo: [0.35, 0.62, 0.85], garrafon: [0.35, 0.65, 0.88], fogonazo: [0.3, 0.6, 0.85], ayayay: [0.2, 0.4, 0.62], serenata: [0.25, 0.45, 0.7], picante: [0.25, 0.42, 0.7], ochotortas: [0.12, 0.35, 0.62], tinta: [0.14, 0.3, 0.7], morrina: [0.3, 0.55, 0.85], fiestapagana: [0.3, 0.45, 0.7], todosdentro: [0.22, 0.35, 0.6], flash: [0.17, 0.28, 0.45], nubarron: [0.3, 0.55, 0.85], carisimo: [0.2, 0.45, 0.7], calada: [0.15, 0.3, 0.55], vueltas: [0.25, 0.5, 0.8] };
    const COLS = 2;
    const filasN = Math.ceil(LISTA.length / COLS);
    const celda = SW * 3 + 16;
    const hoja = document.getElementById('hoja-efectos') as HTMLCanvasElement;
    hoja.width = celda * COLS + 16;
    hoja.height = filasN * (SH + 22) + 16;
    const hx = hoja.getContext('2d')!;
    hx.imageSmoothingEnabled = false;
    hx.fillStyle = '#3b2a3f';
    hx.fillRect(0, 0, hoja.width, hoja.height);
    const cuadro = document.createElement('canvas');
    cuadro.width = SW;
    cuadro.height = SH;
    const cc = cuadro.getContext('2d')!;
    cc.imageSmoothingEnabled = false;
    const fotograma = (mov: string, ms: number): HTMLCanvasElement => {
      semillaFx(1234);
      const fx = new EfectosMov();
      fx.lanzar(base(mov), tipoDe(mov), YO, objetivosDe(mov), fuerzaDe(mov));
      for (let t = 0; t < ms; t += 8) fx.paso(8);
      cc.drawImage(escenario, 0, 0);
      fx.dibujar(cc);
      return cuadro;
    };
    LISTA.forEach((mov, i) => {
      const ox = 16 + (i % COLS) * celda;
      const oy = 12 + Math.floor(i / COLS) * (SH + 22);
      semillaFx(1234);
      const dur = new EfectosMov().lanzar(base(mov), tipoDe(mov), YO, objetivosDe(mov), fuerzaDe(mov));
      dibujarTexto2(hx, `${mov.toUpperCase().replace(/_/g, " ").replace('@', ' FUERZA ')}  ${dur} ms`, ox, oy - 2, '#f6e6b4');
      (FRAC_DE[base(mov)] ?? [0.3, 0.55, 0.82]).forEach((f, k) => hx.drawImage(fotograma(mov, Math.round(dur * f)), ox + k * (SW + 4), oy + 12));
    });
    (window as any).__hojaPNG = () => hoja.toDataURL('image/png');
    (window as any).__fotograma = (mov: string, ms: number, z = 2) => {
      const c = fotograma(mov, ms);
      const o = document.createElement('canvas');
      o.width = SW * z;
      o.height = SH * z;
      const ox = o.getContext('2d')!;
      ox.imageSmoothingEnabled = false;
      ox.drawImage(c, 0, 0, o.width, o.height);
      return o.toDataURL('image/png');
    };
    (window as any).__duraciones = () => Object.fromEntries(LISTA.map((m) => [m, new EfectosMov().lanzar(base(m), tipoDe(m), YO, objetivosDe(m), fuerzaDe(m))]));
    document.body.dataset.listo = '1';
  } else {
    // --- Live loop, one cell per move.
    const cont = document.getElementById('efectos-grid')!;
    interface Celda {
      mov: string;
      fx: EfectosMov;
      cx: CanvasRenderingContext2D;
      resto: number;
    }
    const celdas: Celda[] = LISTA.map((mov) => {
      const fig = document.createElement('figure');
      const cap = document.createElement('figcaption');
      const cv = document.createElement('canvas');
      cv.width = SW;
      cv.height = SH;
      cv.style.cssText = `width:${SW * ZOOM}px;height:${SH * ZOOM}px`;
      fig.append(cap, cv);
      cont.append(fig);
      const cx = cv.getContext('2d')!;
      cx.imageSmoothingEnabled = false;
      const c: Celda = { mov, fx: new EfectosMov(), cx, resto: 0 };
      cap.textContent = mov;
      cv.onclick = () => lanzar(c);
      return c;
    });
    const lanzar = (c: Celda): void => {
      const dur = c.fx.lanzar(base(c.mov), tipoDe(c.mov), YO, objetivosDe(c.mov), fuerzaDe(c.mov));
      c.resto = dur + PAUSA;
      (c.cx.canvas.previousSibling as HTMLElement).textContent = `${c.mov} · ${dur} ms · ${MOVS[base(c.mov)]?.objetivo ?? ''}`;
    };
    celdas.forEach(lanzar);
    let ant = performance.now();
    const bucle = (ahora: number): void => {
      const dt = Math.min(50, ahora - ant);
      ant = ahora;
      for (const c of celdas) {
        c.fx.paso(dt);
        c.resto -= dt;
        if (c.resto <= 0) lanzar(c);
        c.cx.drawImage(escenario, 0, 0);
        c.fx.dibujar(c.cx);
      }
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
    document.getElementById('efectos-nota')!.textContent = 'Cada celda repite su efecto (clic: lo relanza). ?z=2 cambia el zoom, ?hoja=1 hace la hoja de contacto.';
    document.body.dataset.listo = '1';
  }

  (window as any).__precalentar = () => {
    const t0 = performance.now();
    precalentarEfectos();
    return performance.now() - t0;
  };

  /** Cost of paso+dibujar in the worst case: an all-targets effect on 3 targets plus generic hits, together. */
  (window as any).__medir = (fotogramas = 1500) => {
    const cv = document.createElement('canvas');
    cv.width = SW;
    cv.height = 384;
    const cx = cv.getContext('2d')!;
    cx.imageSmoothingEnabled = false;
    const fx = new EfectosMov();
    const lanza = (): void => {
      fx.lanzar('traca', 'petardo', YO, RIVALES);
      fx.lanzar('bostezo', 'mindundi', YO, RIVALES);
    };
    const medir = (vaciar: boolean): Record<string, number> => {
      const ts: number[] = [];
      let vivasMax = 0;
      lanza();
      for (let i = 0; i < fotogramas; i++) {
        if (!fx.activo) lanza();
        cx.clearRect(0, 0, SW, 384);
        const t0 = performance.now();
        fx.paso(16);
        fx.dibujar(cx);
        if (vaciar) cx.getImageData(0, 0, 1, 1);
        ts.push(performance.now() - t0);
        vivasMax = Math.max(vivasMax, fx.vivas);
      }
      const orden = [...ts].sort((a, b) => a - b);
      return { media: ts.reduce((a, b) => a + b, 0) / ts.length, max: orden[orden.length - 1], p95: orden[Math.floor(orden.length * 0.95)], p99: orden[Math.floor(orden.length * 0.99)], sobre1ms: ts.filter((v) => v > 1).length, vivasMax, n: ts.length };
    };
    // The first launches bake the sprites (lazily): measure that apart.
    const t0 = performance.now();
    lanza();
    fx.lanzar('fogonazo', 'petardo', YO, [RIVALES[1]]);
    fx.lanzar('cancion', 'juerga', YO, RIVALES);
    const horneado = performance.now() - t0;
    fx.limpiar();
    medir(false);
    // Total of a long batch with one pair of timestamps (finer than per-frame timers).
    const lote = 3000;
    const l0 = performance.now();
    lanza();
    for (let i = 0; i < lote; i++) {
      if (!fx.activo) lanza();
      cx.clearRect(0, 0, SW, 384);
      fx.paso(16);
      fx.dibujar(cx);
    }
    const porFotograma = (performance.now() - l0) / lote;
    return { horneadoPrimeraVezMs: horneado, mediaLoteMs: porFotograma, soloJS: medir(false), conRasterizado: medir(true) };
  };
}

// ---------------------------------------------------------------------------------------------
// Useritopedia (?vista=useritopedia[&id=camioner][&medir=1]): the real screen, reopened every time it is closed.
// ---------------------------------------------------------------------------------------------
if (vista === 'useritopedia') {
  for (const v of ['detalle', 'fuente']) document.getElementById(`${v}-w`)!.hidden = true;
  cargarTextos(raw, rawCombate);
  const raiz = document.createElement('div');
  document.body.appendChild(raiz);
  const pantalla = new Pantalla(raiz);
  entrada.iniciar(pantalla);
  pantalla.poner({
    estatica: true,
    dibujar(ctx) {
      fondoPapel(ctx, pantalla.alto);
    },
  });
  precalentar(); // like the game does from the title screen
  const id = params.get('id') ?? undefined;
  void (async () => {
    for (;;) await abrirUseritopedia(null, id);
  })();
}

// ---------------------------------------------------------------------------------------------
// Battle backdrops (?vista=fondos[&h=290][&con=1][&ids=...]): the four scenes side by side.
// ---------------------------------------------------------------------------------------------
if (vista === 'fondos') {
  for (const v of ['detalle', 'fuente']) document.getElementById(`${v}-w`)!.hidden = true;
  const H = Number(params.get('h') ?? 290);
  const con = params.get('con') === '1';
  const ids = (params.get('ids')?.split(',') ?? [...ESCENARIOS]) as EscenarioId[];
  const NOMBRE: Record<EscenarioId, string> = { brio: 'BAR DEL BRÍO', terraza: 'LA TERRAZA', rural: 'CASA RURAL DRAG QUEEN', juan: 'BAR DONDE JUAN' };
  const hoja = document.createElement('canvas');
  const sep = 6;
  const cab = 14;
  hoja.width = ids.length * (240 * ZOOM + sep) + sep;
  hoja.height = H * ZOOM + cab + sep * 2;
  hoja.style.display = 'block';
  hoja.id = 'hoja-fondos';
  document.body.appendChild(hoja);
  const hx = hoja.getContext('2d')!;
  hx.imageSmoothingEnabled = false;
  hx.fillStyle = '#2b2b33';
  hx.fillRect(0, 0, hoja.width, hoja.height);
  const panel = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    c.fillStyle = '#3b2a3f';
    c.fillRect(x, y, w, h);
    c.fillStyle = '#f6ecd0';
    c.fillRect(x + 1, y + 1, w - 2, h - 2);
    c.fillStyle = '#e0a83a';
    c.fillRect(x + 1, y + 1, w - 2, 1);
    c.fillStyle = '#7ac070'; // the HP bar
    c.fillRect(x + 18, y + 18, w - 28, 4);
    c.fillStyle = '#3b2a3f';
    c.fillRect(x + 18, y + 8, 40, 5);
  };
  ids.forEach((id, k) => {
    const tile = document.createElement('canvas');
    tile.width = 240;
    tile.height = H;
    const c = tile.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.drawImage(fondoEscenario(id, 240, H), 0, 0);
    if (con) {
      // Same geometry as the combat screen (see `calcularGeom` and `filaSprite` in pantallas/combate.ts).
      const P = Math.round((H - 100) / 3);
      const y0 = 22;
      const rivales = ['tocinon', 'aceituna', 'ego-ego'];
      const mat = (rx: number, ry: number) => plataforma(rx, ry);
      for (let i = 0; i < 4; i++) {
        const mia = i === 3;
        const top = y0 + i * P;
        const base = mia ? spriteEspalda2('draguserin', 0) : spriteFrente2(rivales[i], 0);
        const pies = top + 62;
        const m = mia ? mat(42, 10) : mat(30, 7);
        const cxm = mia ? 52 : 190;
        c.drawImage(m, cxm - Math.floor(m.width / 2), pies - 3 - (mia ? 14 : 10));
        c.drawImage(base, mia ? 20 : 158, top + 62 - pie(base));
        const w = mia ? 134 : 128;
        panel(c, mia ? 102 : 6, top + (mia ? 8 : Math.max(4, Math.min(11, P - 41))), w, mia ? 52 : 40);
      }
      // the HUD bar on top
      c.fillStyle = '#3b2a3f';
      c.fillRect(0, 0, 240, 18);
      c.fillStyle = '#5a4660';
      c.fillRect(0, 17, 240, 1);
    }
    const x = sep + k * (240 * ZOOM + sep);
    hx.fillStyle = '#f6e6b4';
    hx.font = '600 11px system-ui, sans-serif';
    hx.fillText(NOMBRE[id] ?? id, x + 2, 11);
    hx.drawImage(tile, x, cab, 240 * ZOOM, H * ZOOM);
  });
  (window as unknown as { __hojaFondosPNG: () => string }).__hojaFondosPNG = () => hoja.toDataURL('image/png');
}
