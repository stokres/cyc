// The whole Pang (docs/PANG.md), the arcade game of the friends: title with an attract demo behind, menu,
// character select (the four), the twelve stages one after another, «¿Continuar?», end screen, records and
// its own save (guardado.ts). It is the game of the branch claude/pang-cyc-56o0iv without the online room
// (there is no server on GitHub Pages): no `red/`, no «Jugar online».
//
// It opens from the minigames menu (src/main.ts) once the chapter 2 Pang is beaten, and by itself with the
// address ending in ?pangcompleto. `jugarPangCompleto` resolves when the player picks «Volver a los
// minijuegos» in the menu (or, with `fase`, when the stage(s) end or are left).
//
// Performance (docs/ESTILO.md, T5): the same as the chapter's Pang: stages are pixel art painted once
// (juego.ts), the screens are plain DOM, and the loops never run faster than 60 fps.
import './pang.css';
import type { Sound, Volumen } from '../core/audio';
import { cargarTextos } from '../juego/textos';
import textosPang from '../textos/pang.md?raw';
import { FASES } from './fases';
import { alcanzarFase, anotarRecord, datos, type Marca } from './guardado';
import { jugarFase, type Control, type OpcionesFase } from './juego';
import { elegirPersonaje, pantallaAjustes, pantallaContinuar, pantallaFases, pantallaFinal, pantallaMenu, pantallaPausa, pantallaRecords, pantallaTitulo } from './pantallas';
import { PJS, type PjId, type ResultadoFase } from './tipos';
import { h } from './ui/dom';

export interface OpcionesPangCompleto {
  sonido: Sound;
  /**
   * The volumes the game had: the Pang plays at them (it keeps its own sliders, which move the shared Sound) and
   * they are put back on leaving. Without them the Pang's own saved ones are used.
   */
  volumenes?: Record<Volumen, number>;
  /** For testing: play this stage (1–12) and the ones after it straight away, with no menus, and end with them. */
  fase?: number;
  /** For testing with `fase`: the character (Fran if not given). */
  pj?: PjId;
  /** For testing with `fase`: 'bot' lets the computer play. */
  control?: Control;
  /** With 'bot': seconds between its decisions (bot.ts). */
  reaccion?: number;
  /** Aborting it closes the Pang wherever it is (tests and the performance check). */
  senal?: AbortSignal;
}

const VIDAS = 3;
/** The attract demo changes stage this often (ms). */
const CICLO_DEMO = 25000;

const azar = <T>(l: T[]) => l[Math.floor(Math.random() * l.length)];

export async function jugarPangCompleto(root: HTMLElement, o: OpcionesPangCompleto): Promise<void> {
  cargarTextos(textosPang);
  const sonido = o.sonido;
  const capaJuego = h('div', { class: 'pg-juego' });
  const ui = h('div', { class: 'pg-ui' });
  // pang.css styles #pang as the whole screen; over the chapter's cover (z-index 10), under the «gira el móvil» notice (100).
  const raiz = h('div', { id: 'pang' }, capaJuego, ui);
  raiz.style.zIndex = '50';
  root.append(raiz);
  if (o.volumenes) {
    datos.musica = o.volumenes.musica;
    datos.efectos = o.volumenes.efectos;
  }
  sonido.setVolumen('musica', datos.musica);
  sonido.setVolumen('efectos', datos.efectos);
  // Between stages (and in the menus) the scene underneath must not bring its music back: opened from the minigames menu,
  // that was the Brío's rock. Silence, or the Pang's own music, until leaving.
  sonido.retener(true);

  // ---------------------------------------------------------- one stage
  const pausa = () => pantallaPausa(ui, sonido);
  const jugar = (p: Pick<OpcionesFase, 'fase' | 'jugadores' | 'controles' | 'yo' | 'demo' | 'senal' | 'reaccion'>): Promise<ResultadoFase | 'salir'> =>
    jugarFase({ padre: capaJuego, sonido, pausa, ...p, senal: p.senal && o.senal ? AbortSignal.any([p.senal, o.senal]) : (p.senal ?? o.senal) });
  /** The next stage's players: a player who ended out of lives comes back with one. */
  const siguientes = (pjs: PjId[], r: ResultadoFase) => pjs.map((pj, i) => ({ pj, puntos: r.jugadores[i].puntos, vidas: Math.max(1, r.jugadores[i].vidas) }));

  const salir = () => {
    sonido.retener(false);
    sonido.pararMusica();
    raiz.remove();
    if (o.volumenes) {
      sonido.setVolumen('musica', o.volumenes.musica);
      sonido.setVolumen('efectos', o.volumenes.efectos);
    }
  };

  // ---------------------------------------------------------- attract demo
  // Behind the title and the menus a bot plays a random stage with a random character, and
  // another one every CICLO_DEMO ms.
  let demoActiva = false;
  let demoCiclo: Promise<void> | null = null;
  let demoCorte: AbortController | null = null;
  const demoBucle = async () => {
    let ultima = -1;
    while (demoActiva) {
      const corte = (demoCorte = new AbortController());
      let k: number;
      do k = Math.floor(Math.random() * FASES.length);
      while (k === ultima && FASES.length > 1);
      ultima = k;
      const juego = jugar({ fase: FASES[k], jugadores: [{ pj: azar(PJS), vidas: VIDAS, puntos: 0 }], controles: ['bot'], yo: 0, demo: true, senal: corte.signal }).catch(() => 'salir' as const);
      // Until the time is up (or the demo is stopped); a stage that ends sooner just waits.
      await new Promise<void>((fin) => {
        const t = setTimeout(fin, CICLO_DEMO);
        corte.signal.addEventListener('abort', () => (clearTimeout(t), fin()), { once: true });
      });
      corte.abort();
      await juego;
    }
  };
  const demo = {
    iniciar() {
      // The title and the menus have their music too: «A tope por Usera» (Jesús, 12 October 2026).
      sonido.musica('pangUsera');
      if (demoActiva) return;
      demoActiva = true;
      demoCiclo = demoBucle();
    },
    async parar() {
      demoActiva = false;
      demoCorte?.abort();
      await demoCiclo;
      demoCiclo = null;
      capaJuego.replaceChildren();
    },
  };

  // ---------------------------------------------------------- a run
  /** Writes the run in the table; if it makes the top five, shows the table with it highlighted. */
  const cerrarPartida = async (puntos: number, pj: PjId, fase: number, mostrar: boolean) => {
    const marca: Marca | null = anotarRecord(puntos, pj, fase);
    if (marca && mostrar) await pantallaRecords(ui, marca);
  };

  /** From stage `inicio` to the end (or until the player leaves). */
  const partida = async (inicio: number) => {
    await demo.parar();
    let pj = await elegirPersonaje(ui);
    if (!pj) return;
    let n = inicio;
    let puntos = 0;
    let vidas = VIDAS;
    while (n <= FASES.length) {
      alcanzarFase(n);
      const r = await jugar({ fase: FASES[n - 1], jugadores: [{ pj, vidas, puntos }], controles: ['local'], yo: 0 });
      if (r === 'salir') {
        // (The game does not say how many points the stage in progress had: those before it count.)
        await cerrarPartida(puntos, pj, n, false);
        return;
      }
      puntos = r.jugadores[0].puntos;
      vidas = r.jugadores[0].vidas;
      if (r.superada) {
        n++;
        continue;
      }
      // Out of lives.
      let decision = await pantallaContinuar(ui, n, puntos);
      while (decision === 'cambiar') {
        const otro = await elegirPersonaje(ui, pj);
        if (otro) {
          pj = otro;
          decision = 'si';
        } else decision = await pantallaContinuar(ui, n, puntos);
      }
      // (The run so far is kept in the table either way.)
      await cerrarPartida(puntos, pj, n, decision === 'no');
      if (decision === 'no') return;
      puntos = 0;
      vidas = VIDAS;
    }
    await pantallaFinal(ui, puntos);
    await cerrarPartida(puntos, pj, FASES.length, true);
  };

  // ---------------------------------------------------------- test mode, or title and menu
  const flujo = async () => {
    // Test mode: the stage(s) straight away, no menus.
    if (o.fase !== undefined) {
      const n = Math.min(FASES.length, Math.max(1, Math.floor(o.fase)));
      const pj = o.pj ?? 'fran';
      const control = o.control ?? 'local';
      let jugadores = [{ pj, vidas: VIDAS, puntos: 0 }];
      for (let i = n - 1; i < FASES.length; i++) {
        const r = await jugar({ fase: FASES[i], jugadores, controles: [control], yo: 0, reaccion: o.reaccion });
        if (r === 'salir' || !r.superada) break;
        jugadores = siguientes([pj], r);
      }
      return;
    }
    demo.iniciar();
    await pantallaTitulo(ui);
    for (;;) {
      const accion = await pantallaMenu(ui, true);
      if (accion === 'salir') break;
      if (accion === 'nueva') await partida(1);
      else if (accion === 'seguir') await partida(datos.faseMax);
      else if (accion === 'fases') {
        const n = await pantallaFases(ui);
        if (n) await partida(n);
      } else if (accion === 'records') await pantallaRecords(ui);
      else await pantallaAjustes(ui, sonido);
      demo.iniciar();
    }
  };
  const cierre = new Promise<void>((r) => o.senal?.addEventListener('abort', () => r(), { once: true }));
  await Promise.race([flujo(), cierre]);
  await demo.parar();
  salir();
}
