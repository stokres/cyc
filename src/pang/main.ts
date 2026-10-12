// Camiones y Caravanas · PANG: entry point (pang.html). See docs/PANG.md.
// The flow: title (with an attract demo behind) → menu → [intro] → character → stages with
// their conversations → «¿Continuar?» when the lives run out → final → records.
// For testing, pang.html?fase=N&pj=fran plays that stage straight away (add &demo to let a bot play it).
import '../ui/ui.css';
import './pang.css';
import textosPang from '../textos/pang.md?raw';
import { cargarTextos, dialogo, hayDialogo, texto } from '../juego/textos';
import { Sound } from '../core/audio';
import { alCambiarOrientacion, esVertical } from '../ui/orientacion';
import { FASES } from './fases';
import { jugarFase, type OpcionesFase } from './juego';
import { PJS, type PjId, type ResultadoFase } from './tipos';
import { alcanzarFase, anotarRecord, datos, type Marca } from './guardado';
import { elegirPersonaje, mostrarDialogo, pantallaAjustes, pantallaContinuar, pantallaFases, pantallaFinal, pantallaMenu, pantallaPausa, pantallaRecords, pantallaTitulo } from './pantallas';
import { h } from './ui/dom';

const VIDAS = 3;
/** The attract demo changes stage this often (ms). */
const CICLO_DEMO = 25000;

const azar = <T>(l: T[]) => l[Math.floor(Math.random() * l.length)];

async function arrancar() {
  cargarTextos(textosPang);
  const raiz = document.getElementById('pang')!;
  const capaJuego = h('div', { class: 'pg-juego' });
  const ui = h('div', { class: 'pg-ui' });
  raiz.append(capaJuego, ui);
  const q = new URLSearchParams(location.search);

  // ---------------------------------------------------------- sound, full screen
  const sonido = new Sound();
  sonido.setVolumen('musica', datos.musica);
  sonido.setVolumen('efectos', datos.efectos);
  // Phones only allow sound and full screen after a tap: every tap tries (a browser that drops
  // full screen when the app is left asks again with the next one). Not on iPhone, where the
  // page cannot go full screen at all.
  const conPantallaCompleta = matchMedia('(pointer: coarse)').matches && !!document.fullscreenEnabled;
  const alToque = () => {
    if (esVertical()) return;
    sonido.start();
    if (conPantallaCompleta && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  };
  for (const ev of ['click', 'touchend']) document.addEventListener(ev, alToque, true);

  // ---------------------------------------------------------- portrait phones
  // The main game's notice (ui.css, .girar): it covers everything while the phone is upright.
  let girar: HTMLElement | null = null;
  const orientacion = (vertical: boolean) => {
    if (vertical && !girar) {
      girar = h('div', { class: 'cubierta girar' }, h('div', {}, h('div', { class: 'movil-icono' }), h('p', {}, texto('girar'))));
      document.body.append(girar);
    } else if (!vertical && girar) {
      girar.remove();
      girar = null;
    }
  };
  alCambiarOrientacion(orientacion);
  orientacion(esVertical());

  // ---------------------------------------------------------- one stage
  const pausa = () => pantallaPausa(ui, sonido);
  const jugar = (o: Pick<OpcionesFase, 'fase' | 'pj' | 'vidas' | 'puntos' | 'demo' | 'senal'>): Promise<ResultadoFase | 'salir'> =>
    jugarFase({ padre: capaJuego, sonido, pausa, ...o });

  // Test mode: the stage(s) straight away, no menus.
  if (q.has('fase')) {
    const n = Math.min(FASES.length, Math.max(1, Number(q.get('fase')) || 1));
    const pj = (PJS.includes(q.get('pj') as PjId) ? q.get('pj') : 'fran') as PjId;
    let puntos = 0;
    for (let i = n - 1; i < FASES.length; i++) {
      const r = await jugar({ fase: FASES[i], pj, vidas: VIDAS, puntos, demo: q.has('demo') });
      if (r === 'salir' || !r.superada) break;
      puntos = r.puntos;
    }
    return;
  }

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
      const juego = jugar({ fase: FASES[k], pj: azar(PJS), vidas: VIDAS, puntos: 0, demo: true, senal: corte.signal }).catch(() => 'salir' as const);
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
  const cabecera = (n: number) => ({ nombre: texto(`fase.${n}.nombre`), lugar: texto(`fase.${n}.lugar`) });

  /** Writes the run in the table; if it makes the top five, shows the table with it highlighted. */
  const cerrarPartida = async (puntos: number, pj: PjId, fase: number, mostrar: boolean) => {
    const marca: Marca | null = anotarRecord(puntos, pj, fase);
    if (marca && mostrar) await pantallaRecords(ui, marca);
  };

  /** From stage `inicio` to the end (or until the player leaves). */
  const partida = async (inicio: number, conIntro: boolean) => {
    await demo.parar();
    if (conIntro) await mostrarDialogo(ui, dialogo('intro'));
    let pj = await elegirPersonaje(ui);
    if (!pj) return;
    let n = inicio;
    let puntos = 0;
    let vidas = VIDAS;
    // (After «Continuar» the stage starts again without its conversation.)
    let hablar = true;
    while (n <= FASES.length) {
      alcanzarFase(n);
      if (hablar && hayDialogo(`fase.${n}`)) await mostrarDialogo(ui, dialogo(`fase.${n}`), cabecera(n));
      const r = await jugar({ fase: FASES[n - 1], pj, vidas, puntos });
      if (r === 'salir') {
        // (The game does not say how many points the stage in progress had: those before it count.)
        await cerrarPartida(puntos, pj, n, false);
        return;
      }
      puntos = r.puntos;
      vidas = r.vidas;
      if (r.superada) {
        if (hayDialogo(`fase.${n}.fin`)) await mostrarDialogo(ui, dialogo(`fase.${n}.fin`), cabecera(n));
        n++;
        hablar = true;
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
      hablar = false;
    }
    await mostrarDialogo(ui, dialogo('final'));
    await pantallaFinal(ui, puntos);
    await cerrarPartida(puntos, pj, FASES.length, true);
  };

  // ---------------------------------------------------------- title and menu
  demo.iniciar();
  await pantallaTitulo(ui);
  for (;;) {
    const accion = await pantallaMenu(ui);
    if (accion === 'nueva') await partida(1, true);
    else if (accion === 'seguir') await partida(datos.faseMax, false);
    else if (accion === 'fases') {
      const n = await pantallaFases(ui);
      if (n) await partida(n, false);
    } else if (accion === 'records') await pantallaRecords(ui);
    else await pantallaAjustes(ui, sonido);
    demo.iniciar();
  }
}

void arrancar();
