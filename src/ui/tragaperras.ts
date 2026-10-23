// The slot machine of the Bar del Brío up close, full screen (chapter 2): the same machine as the
// trailer's (src/ui/tragaperras-pintura.ts), seen from the front. The reels spin and stop one by
// one. Without a prize they land on a lemon, a bell and a pig; with it, on three sevens: the
// sign lights up, the bulbs go wild and a shower of coins pours out of the tray, the screen
// shaking. It closes itself when it is over, or with a tap.
//
// The sound (tools/musica/tragaperras.py: reels, clunks, bells and coins) is one track that plays
// the whole shot from its first frame, so the picture follows the music's clock (Sound.posicion)
// and the stops stay on their clunk however slow the frames; without sound, the frames' own.
// PARADAS, the jackpot's moment and the length of the shower are the same as in tragaperras.py:
// change one, change both.
//
// Performance (docs/ESTILO.md, T5): the machine, the reel strip and the glass are painted once
// (again if the screen changes size); each frame draws those images and a few small shapes. The
// loop never passes 60 fps and the scene underneath is paused meanwhile by whoever calls it.
import { h } from './hud';
import { esVertical } from './orientacion';
import type { SonidoMinijuego } from '../core/audio';
import type { Pista } from '../sonido/musica';
import { crearFicha } from './fichas';
import type { PjId } from '../juego/reparto';
import { SIMBOLOS_CARA, SIMBOLOS_CERCA, dibujarTragaperras, pintarTragaperras, type GuionTragaperras, type Tragaperras } from './tragaperras-pintura';

/** When each reel stops (seconds), the same as the sound's. */
const PARADAS = [1.0, 1.7, 2.4];
const SIETE = SIMBOLOS_CERCA.indexOf('siete');
const LIMON = SIMBOLOS_CERCA.indexOf('limon');
const CAMPANA = SIMBOLOS_CERCA.indexOf('campana');
const CERDO = SIMBOLOS_CERCA.indexOf('cerdo');
/** No prize: lemon, bell and pig; the bulbs keep chasing and nothing pours out. */
const SIN_PREMIO: GuionTragaperras = { paradas: PARADAS, destinos: [LIMON, CAMPANA, CERDO], premio: null, monedas: 0, pasoMonedas: 0 };
/** The jackpot: three sevens, and 110 coins, one every 32 ms (3.5 s of shower; the sound's lasts 4). */
const CON_PREMIO: GuionTragaperras = { paradas: PARADAS, destinos: [SIETE, SIETE, SIETE], premio: PARADAS[2], monedas: 110, pasoMonedas: 0.032 };
/** The night's last spin, alone: all three reels land on a friend's face; a moment later the machine dies. */
const CARA = SIMBOLOS_CARA.indexOf('cara');
const A_CARA: GuionTragaperras = { paradas: PARADAS, destinos: [CARA, CARA, CARA], premio: null, monedas: 0, pasoMonedas: 0, apagon: 3.1 };
const FIN_CARA = 4.2;
/** When it closes by itself (seconds): a moment after the last reel, or once the coins have fallen. */
const FIN_SIN = 3.9;
const FIN_PREMIO = 7.3;
/** Taps before this are ignored, so the one that opened it does not close it. */
const TOCABLE = 0.5;

export interface OpcionesTragaperras {
  /** Three sevens and the shower of coins, or lemon, bell and pig. */
  premio: boolean;
  /** Instead: the three reels stop on this friend's face and the machine goes dark (chapter 2, the end of the night). */
  cara?: PjId;
  /** For the tests and the quick playthrough: skip it. */
  rapido?: boolean;
  /** For the sound of the reels, the bells and the coins. */
  sonido?: SonidoMinijuego;
  /** For scripts/rendimiento.mjs: play from here (seconds) and loop back at `hasta`, on the frames' clock. */
  prueba?: { desde: number; hasta: number };
}

export function mostrarTragaperras(parent: HTMLElement, o: OpcionesTragaperras): Promise<void> {
  if (o.rapido) return Promise.resolve();
  const { sonido } = o;
  const guion = o.cara ? A_CARA : o.premio ? CON_PREMIO : SIN_PREMIO;
  const fin = o.cara ? FIN_CARA : o.premio ? FIN_PREMIO : FIN_SIN;
  // The face spin has the clunks of the one without a prize: the same stops.
  const pista: Pista = o.premio && !o.cara ? 'tragaperrasPremio' : 'tragaperrasSin';
  const canvas = h('canvas', { class: 'plano', 'aria-hidden': 'true' });
  const ctx = canvas.getContext('2d')!;
  const capa = h('div', { class: 'cubierta tragaperras' }, canvas);
  parent.append(capa);

  // The machine, painted once (again if the screen changes size).
  let W = 0;
  let H = 0;
  let dpr = 1;
  let maquina: Tragaperras | null = null;
  let acabado = false;
  // The face on the reels, in a round frame as big as a cell: made once the size is known.
  let cara: HTMLCanvasElement | null = null;
  let caraLista: Promise<unknown> = Promise.resolve();
  const simbolos = o.cara ? SIMBOLOS_CARA : SIMBOLOS_CERCA;
  const pintar = () => (maquina = pintarTragaperras(W, H, Math.min(dpr, 1.5), simbolos, cara));
  const medir = () => {
    const caja = capa.getBoundingClientRect();
    const w = Math.max(2, caja.width);
    const hh = Math.max(2, caja.height);
    const d = Math.min(window.devicePixelRatio || 1, 2);
    if (maquina && w === W && hh === H && d === dpr) return;
    W = w;
    H = hh;
    dpr = d;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    pintar();
    if (o.cara) {
      const R = Math.max(8, Math.round(H * 0.43 * 0.62 * 0.46));
      caraLista = crearFicha(o.cara, { mood: 'neutral' }, R, Math.min(dpr, 1.5))
        .then((f) => {
          cara = f;
          if (!acabado) pintar();
        })
        .catch(() => {});
    }
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);
  // The sign is in the titles' font: painted again once it has loaded.
  void document.fonts?.load('400 32px Graduate').then(() => {
    if (maquina) pintar();
  });

  const dibujar = (t: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujarTragaperras(ctx, W, H, maquina!, t, guion);
  };

  return new Promise((resolve) => {
    const desde = o.prueba?.desde ?? 0;
    let t = desde;
    let empezado = false;
    let ultimo = 0;
    let fotogramas = 0;
    let reloj = false;
    const cerrar = () => {
      if (acabado) return;
      acabado = true;
      ro.disconnect();
      sonido?.pararMusica(0.4);
      delete (window as unknown as { __tragaperras?: unknown }).__tragaperras;
      capa.classList.add('sale');
      setTimeout(() => {
        capa.remove();
        // Give the painted machine's memory back.
        canvas.width = canvas.height = 0;
        maquina = null;
        resolve();
      }, 400);
    };
    const paso = (ahora: number) => {
      if (acabado) return;
      requestAnimationFrame(paso);
      // Phone held upright: the notice covers it and the sound is suspended. Time does not pass.
      if (esVertical()) {
        ultimo = ahora;
        return;
      }
      // 60 fps at most, also on 120 Hz screens.
      if (ultimo && ahora - ultimo < 1000 / 60 - 4) return;
      // The music's clock while it plays, so the reels stop on their clunks however slow the frames;
      // otherwise (no sound, the tests' loops) the frames' own, which stops with them.
      const oido = o.prueba ? null : (sonido?.posicion?.(pista) ?? null);
      if (oido !== null && (reloj || Math.abs(oido - (t - desde)) < 0.75)) {
        reloj = true;
        t = desde + oido;
      } else t += ultimo ? Math.min(0.1, (ahora - ultimo) / 1000) : 0;
      ultimo = ahora;
      if (o.prueba && t >= o.prueba.hasta) t = desde;
      if (t >= fin) return cerrar();
      dibujar(t);
      fotogramas++;
    };
    const empezar = () => {
      if (empezado || acabado) return;
      empezado = true;
      sonido?.musica(pista, 0);
      requestAnimationFrame(paso);
    };
    // The first frame at once; the clock starts when the sound has loaded (it is asked for in advance).
    dibujar(desde);
    void Promise.race([Promise.all([sonido?.lista?.(pista) ?? Promise.resolve(), caraLista]), new Promise((r) => setTimeout(r, 2500))]).then(empezar);
    capa.addEventListener('click', (e) => {
      e.stopPropagation();
      if (t >= TOCABLE) cerrar();
    });
    // Test hook for scripts/rendimiento.mjs and the screenshots.
    (window as unknown as { __tragaperras: unknown }).__tragaperras = () => ({ t, fotogramas, acabado, premio: o.premio, cerrar });
  });
}
