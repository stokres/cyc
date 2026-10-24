// The short Pang of chapter 2 (docs/CAPITULO2.md): Fran falls asleep at the bar, the foam of his
// beer fills the screen, and he is inside the arcade machine. Five stages of the full Pang
// (docs/PANG.md, played whole from the minigames menu once this one is beaten, src/pang/completo.ts) one
// after another, the road from Usera to the United States: Usera (the dragon), Fran's flat (with Aceituna),
// Zaragoza (the cierzo wind blows the bubbles about), Nevada (the desert, with a caravan in the middle) and
// Las Vegas against la Penúltima. Only Fran, with his double harpoon and «¡Una más!».
//
// It is a minigame of the story: same cover (`.cubierta.minijuego`), same «Saltar» (after two lost
// games) and close button as the others, and it ends with 'hecho' (la Penúltima beaten),
// 'saltado' or 'cancelado'. Three lives per game; out of lives, the same stage starts again, with
// no limit. The stages are the full game's, eased where the story needs it (FASES_CAPITULO).
//
// Performance (docs/ESTILO.md, T5): the stages are the Pang's pixel art, painted once at a low
// resolution and blown up without smoothing (juego.ts); the entrance (espuma.ts) slides two
// textures made once. Loops never run faster than 60 fps. `window.__pang()` counts frames.
import type { SonidoMinijuego } from '../core/audio';
import { cargarTextos, texto } from '../juego/textos';
import textosPang from '../textos/pang.md?raw';
import { h } from '../ui/hud';
import { esVertical } from '../ui/orientacion';
import { fondo } from './arte/fondos';
import { burbuja, jefe, jugador, JUGADOR } from './arte/sprites';
import { Espuma, T_REVELA } from './espuma';
import { FASES } from './fases';
import { centrado, ORO, rotulo } from './hud';
import { jugarFase, type Control, type Partida } from './juego';
import { H, W, type Fase } from './tipos';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

export interface OpcionesPangCapitulo {
  /** Skips the waiting (tests and the minigames menu's quick mode). */
  rapido?: boolean;
  sonido?: SonidoMinijuego;
  /** For testing: start at this stage (0 Usera, 1 the flat, 2 Zaragoza, 3 Nevada, 4 Las Vegas) and without the foam. */
  fase?: number;
  /** For testing and the performance check: 'bot' lets the computer play. */
  control?: Control;
  /** With 'bot': seconds between its decisions (0.05 a machine, 0.25 a person on a phone). */
  reaccion?: number;
}

/**
 * The five stages: 1 (Usera, the dragon), 3 (Fran's flat), 9 (Zaragoza), 11 (Nevada) and 12 (Las Vegas). `n` stays
 * the full game's number (texts, backgrounds and the bubbles' pace come from it); `orden` is what the card says.
 * Eased for a minigame inside the story (numbers from scripts/pang-sim.mjs, where a bot with 0.15 s reflexes clears
 * each stage within three games 95–100 % of the time and one with 0.25 s 65–90 %): more time (150 s) in all but the
 * boss; the flat with two medium bubbles instead of a big and two medium; Zaragoza and Nevada, which have 3 big
 * bubbles (45 hits) and 3 big and 2 small (51) in the full game, with two medium ones each (14 hits, like the flat),
 * slower (×0.8 and ×0.7), Zaragoza's cierzo at half strength and Nevada's caravan parked at the right edge instead
 * of in the middle (with the bubbles coming from both sides, the player was boxed in under it); and the last boss, in
 * fifth place instead of twelfth, with 18 hit points instead of 30, slower bubbles (×0.72) and 1.4 times the wait
 * between spits.
 */
export const FASES_CAPITULO: Fase[] = [
  { ...FASES[0], orden: 1, tiempo: 150 },
  { ...FASES[2], orden: 2, musica: 'pangCalle', tiempo: 150, burbujas: [{ x: 96, y: 56, talla: 1, dir: 1 }, { x: 288, y: 56, talla: 1, dir: -1 }] },
  { ...FASES[8], orden: 3, tiempo: 150, prisa: 0.8, cierzo: 0.5, burbujas: [{ x: 96, y: 56, talla: 1, dir: 1 }, { x: 288, y: 56, talla: 1, dir: -1 }] },
  { ...FASES[10], orden: 4, tiempo: 150, prisa: 0.7, bloques: [{ x: 252, y: 100, w: 112, h: 20, estilo: 'caravana' }], burbujas: [{ x: 96, y: 56, talla: 1, dir: 1 }, { x: 288, y: 56, talla: 1, dir: -1 }] },
  { ...FASES[11], orden: 5, prisa: 0.72, jefeVida: 18, jefeEscupe: 1.4, tiempo: 150 },
];

const VIDAS = 3;
/** Lost games after which «Saltar» appears (docs/JUGABILIDAD.md). */
const PARA_SALTAR = 2;
/** Seconds the victory banner stays. */
const DURA_VICTORIA = 2.4;
/** The instructions strip fades after this long if the player has not fired by then. */
const DURA_AYUDA = 8;

const SILENCIO: SonidoMinijuego = { musica() {}, pararMusica() {} };

/** What the test hook (`window.__pang()`) tells. */
export interface EstadoPang {
  /** Frames drawn so far (the entrance's before the stage shows, then the stage's). */
  fotogramas: number;
  /** 0–4 */
  fase: number;
  /** Games lost so far. */
  derrotas: number;
  /** 'entrada' | 'jugando' | 'victoria' */
  momento: string;
  partida: Partida | null;
}

/** The pixel scale the Pang uses (juego.ts, `ajustar`): the biggest whole multiple that fits. */
function ajustarLienzo(c: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.floor(Math.min((window.innerWidth * dpr) / W, (window.innerHeight * dpr) / H)));
  c.width = W * k;
  c.height = H * k;
  c.style.width = `${(W * k) / dpr}px`;
  c.style.height = `${(H * k) / dpr}px`;
}

export function jugarPangCapitulo(root: HTMLElement, o: OpcionesPangCapitulo = {}): Promise<Resultado> {
  cargarTextos(textosPang);
  const sonido = o.sonido ?? SILENCIO;
  const rapido = !!o.rapido;
  const control = o.control ?? 'local';
  const corte = new AbortController();
  let motivo: Resultado = 'cancelado';
  let fotogramas = 0;
  let derrotas = 0;
  let faseActual = Math.max(0, Math.min(FASES_CAPITULO.length - 1, Math.floor(o.fase ?? 0)));
  let momento = 'entrada';
  let partida: Partida | null = null;

  const juego = h('div', { class: 'pang-juego' });
  const ayuda = h('p', { class: 'instrucciones' }, texto('pang.instrucciones'));
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const capa = h('div', { class: 'cubierta minijuego pang' }, juego, ayuda, saltar, cerrar);
  root.append(capa);

  (window as unknown as { __pang?: () => EstadoPang }).__pang = () => ({ fotogramas, fase: Math.min(faseActual, FASES_CAPITULO.length - 1), derrotas, momento, partida });

  saltar.addEventListener('click', (e) => {
    e.stopPropagation();
    motivo = 'saltado';
    corte.abort();
  });
  cerrar.addEventListener('click', (e) => {
    e.stopPropagation();
    motivo = 'cancelado';
    corte.abort();
  });

  /** Calls `f` every drawn frame (60 fps at most) until it returns false or the player leaves. */
  const bucle = (f: (dt: number) => boolean) =>
    new Promise<void>((fin) => {
      let ultimo = performance.now();
      const paso = (ahora: number) => {
        if (corte.signal.aborted) return fin();
        if (esVertical()) {
          ultimo = ahora;
          requestAnimationFrame(paso);
          return;
        }
        if (ahora - ultimo < 1000 / 60 - 4) {
          requestAnimationFrame(paso);
          return;
        }
        const dt = Math.min(0.05, (ahora - ultimo) / 1000);
        ultimo = ahora;
        if (!f(dt)) return fin();
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });

  // ---------------------------------------------------------------- the foam
  /** Pixel art and sprites are painted the first time they are asked for: do it now, one per frame, behind the foam. */
  const calentar = [
    () => fondo(FASES_CAPITULO[faseActual].fondo),
    () => jugador('fran'),
    () => burbuja('cerveza', 0, 'roja'),
    () => burbuja('cerveza', 1, 'roja'),
    () => burbuja('cerveza', 2, 'roja'),
    () => burbuja('cerveza', 3, 'roja'),
    () => fondo('piso'),
    () => fondo('zaragoza'),
    () => fondo('nevada'),
    () => fondo('vegas'),
    () => jefe('penultima'),
    () => burbuja('champan', 1, 'roja'),
  ];

  const entrada = async () => {
    if (o.fase !== undefined) return;
    const espuma = new Espuma();
    capa.append(espuma.canvas);
    let revelada!: () => void;
    const lista = new Promise<void>((r) => (revelada = r));
    const dentro = bucle((dt) => {
      calentar.shift()?.();
      const vivo = espuma.avanzar(dt * (rapido ? 8 : 1));
      if (espuma.t < T_REVELA) fotogramas++;
      else revelada();
      return vivo;
    }).then(() => espuma.canvas.remove());
    await Promise.race([lista, new Promise<void>((r) => corte.signal.addEventListener('abort', () => r(), { once: true }))]);
    void dentro;
  };

  // ---------------------------------------------------------------- the stages
  const jugarFases = async (): Promise<boolean> => {
    let puntos = 0;
    for (; faseActual < FASES_CAPITULO.length; faseActual++) {
      for (;;) {
        if (corte.signal.aborted) return false;
        momento = 'jugando';
        const r = await jugarFase({
          padre: juego,
          fase: FASES_CAPITULO[faseActual],
          jugadores: [{ pj: 'fran', vidas: VIDAS, puntos }],
          controles: [control],
          reaccion: o.reaccion,
          yo: 0,
          sonido,
          senal: corte.signal,
          alDibujar: () => fotogramas++,
          alCrear: (p) => (partida = p),
        });
        partida = null;
        if (r === 'salir') return false;
        if (r.superada) {
          puntos = r.jugadores[0].puntos;
          ayuda.hidden = true;
          break;
        }
        derrotas++;
        if (derrotas >= PARA_SALTAR) saltar.hidden = false;
      }
    }
    return true;
  };

  // ---------------------------------------------------------------- victory
  const victoria = async () => {
    momento = 'victoria';
    saltar.hidden = true;
    cerrar.hidden = true;
    ayuda.hidden = true;
    const lienzo = h('canvas', { class: 'pang-victoria' });
    lienzo.style.cssText = 'position:absolute;inset:0;margin:auto;display:block;image-rendering:pixelated;z-index:2';
    ajustarLienzo(lienzo);
    capa.append(lienzo);
    const g = lienzo.getContext('2d', { alpha: false })!;
    g.imageSmoothingEnabled = false;
    const lg = h('canvas');
    lg.width = W;
    lg.height = H;
    const l = lg.getContext('2d', { alpha: false })!;
    const fran = jugador('fran').victoria;
    let t = 0;
    await bucle((dt) => {
      t += dt * (rapido ? 8 : 1);
      l.drawImage(fondo('vegas'), 0, 0);
      l.fillStyle = 'rgba(0,0,0,0.62)';
      l.fillRect(0, 0, W, H);
      const salto = Math.round(Math.abs(Math.sin(t * 7)) * 5);
      const f = fran[Math.floor(t / 0.2) % fran.length];
      l.drawImage(f, Math.round(W / 2 - JUGADOR.w / 2), 184 - JUGADOR.h - salto);
      centrado(l, rotulo(texto('pang.victoria'), ORO, 24), W / 2, 50);
      centrado(l, rotulo(texto('pang.victoria.sub'), '#ffffff', 8), W / 2, 90);
      g.drawImage(lg, 0, 0, lienzo.width, lienzo.height);
      fotogramas++;
      return t < DURA_VICTORIA;
    });
  };

  // ---------------------------------------------------------------- the whole thing
  const fin = (r: Resultado) => {
    delete (window as unknown as { __pang?: unknown }).__pang;
    capa.remove();
    return r;
  };

  return (async () => {
    // The instructions strip, in the first stage only, until the player fires or it times out.
    if (faseActual > 0 || o.fase !== undefined) ayuda.hidden = true;
    else setTimeout(() => ayuda.classList.add('apartada'), DURA_AYUDA * 1000);
    await entrada();
    if (corte.signal.aborted) return fin(motivo);
    const ganada = await jugarFases();
    if (!ganada) return fin(motivo);
    await victoria();
    return fin('hecho');
  })();
}
