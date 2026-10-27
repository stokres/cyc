// «Una más»: the world of the concepts as a short metroidvania (design: /capitulo2/conceptos-metroidvania.md). Fran has been swallowed and has to find
// Guille, Chuchi and Pablo, each of whom gives him a skill; at the heart of the world waits LA ÚLTIMA. This is the FIRST SLICE: the engine, the
// Recibidor (tutorial) and the Jardín del Cierzo (a mini-boss, Guille, the Cierzo and the double-jump stretch).
//
// A minigame like src/kart/ and src/sol/: its own cover (`.cubierta.minijuego`) and loop (never above 60 fps), the pause menu with «Saltar»,
// and it ends with 'hecho' (the delivery's last door), 'saltado' or 'cancelado'. Not hooked into chapter 2 yet: it only opens with `?unamas`
// (`&zona=1|2`, `&sala=id`, `&habs=cierzo,teclazo,pared`, `&fondos=0` for the baked backgrounds). `window.__unamas()` counts frames and gives
// the tests a hand.
//
// Performance (docs/ESTILO.md T5/T6): the backgrounds, the tiles, the characters' frames and the sprites are baked once; a frame is a few dozen
// drawImage calls plus the particles (capped); the canvas is at most 648 device pixels high.
import type { SonidoMinijuego } from '../core/audio';
import { cargarTextos, texto } from '../juego/textos';
import textosConceptos from '../textos/conceptos.md?raw';
import { h } from '../ui/hud';
import { esVertical } from '../ui/orientacion';
import { cargarArte, soltarArte, type Arte } from './arte';
import { HABILIDADES, PRIMERA_SALA, SALAS, TILE, type Habilidad, type Sala } from './datos';
import { crearEntrada } from './entrada';
import { aplicarPintados, hornearFondo, soltarFondo } from './fondos';
import { marcarFondoUltima, soltarJefe } from './jefe-ultima';
import { Mundo } from './mundo';
import { hornearNivel } from './nivel';
import { Pintor } from './render';
import { SonidoUnaMas } from './sonido';
import { dibujarCarga } from './hud';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

export interface OpcionesUnaMas {
  sonido?: SonidoMinijuego;
  /** Skips the waiting (tests). */
  rapido?: boolean;
  /** Starts in the first room of this zone (1 or 2). */
  zona?: number;
  /** Starts in this room. */
  sala?: string;
  /** Skills already in the bag (tests and jumping straight to a stretch). */
  habs?: Habilidad[];
}

/** What the test hook (`window.__unamas()`) tells and lets a script do. */
export interface GanchoUnaMas {
  fotogramas: number;
  mundo: Mundo | null;
  pintor: Pintor | null;
  cerrar(): void;
  /** Teleports Fran to a room (tile column and row of his feet). */
  ir(sala: string, col?: number, fila?: number): void;
  /** Gives a skill. */
  dar(h: Habilidad): void;
  /** Kills every enemy of the room (not the boss). */
  limpiar(): void;
  /** What lies ahead of Fran at `dx` units: ground under it, a wall in front. */
  mirar(dx: number): { suelo: boolean; muro: boolean };
  /** Pretends the controls. */
  tecla(k: 'izq' | 'der' | 'abajo' | 'saltar' | 'atacar', pulsada: boolean): void;
  /** Takes the dialogue one step on. */
  tocar(): void;
}

const SILENCIO: SonidoMinijuego = { musica() {}, pararMusica() {} };

const CSS = `
.minijuego.unamas{display:block;padding:0;background:#0a0612;touch-action:none}
.minijuego.unamas canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.minijuego.unamas .cerrar{z-index:8}
.minijuego.unamas .um-pausa{z-index:12}
.um-pausa .tarjeta{display:flex;flex-direction:column;gap:12px;align-items:stretch;min-width:min(340px,80vw)}
.um-pausa .tarjeta h2{margin:0 0 4px}
.minijuego.unamas .um-mapa{position:static;inset:auto;flex:none;width:100%;aspect-ratio:560/105;height:auto;background:rgba(10,4,26,.6);border-radius:10px;display:block}
`;

/** The pause map: a box per room already walked into, where it sits in the world, the one Fran is in lit up. */
function dibujarMapa(c: HTMLCanvasElement, m: Mundo) {
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, c.width, c.height);
  const salas = [...m.visitadas].map((id) => SALAS[id]).filter(Boolean);
  if (!salas.length) return;
  const x0 = Math.min(...salas.map((s) => s.mapa.x));
  const y0 = Math.min(...salas.map((s) => s.mapa.y));
  const x1 = Math.max(...salas.map((s) => s.mapa.x + s.cols));
  const y1 = Math.max(...salas.map((s) => s.mapa.y + s.rows));
  const k = Math.min(2.6, (c.width - 40) / (x1 - x0), (c.height - 40) / (y1 - y0));
  const ox = (c.width - (x1 - x0) * k) / 2 - x0 * k;
  const oy = (c.height - (y1 - y0) * k) / 2 - y0 * k;
  const color: Record<string, string> = { recibidor: '#e0706a', jardin: '#4cc27a', bandeja: '#9a96e0', teatro: '#d8506a', grifo: '#ffd070' };
  for (const s of salas) {
    const aqui = s.id === m.sala.id;
    x.fillStyle = color[s.zona] ?? '#bbb';
    x.globalAlpha = aqui ? 1 : 0.45;
    x.fillRect(ox + s.mapa.x * k, oy + s.mapa.y * k, s.cols * k, s.rows * k);
    x.globalAlpha = 1;
    x.strokeStyle = aqui ? '#fff6d8' : 'rgba(255,240,200,0.5)';
    x.lineWidth = aqui ? 3 : 1;
    x.strokeRect(ox + s.mapa.x * k, oy + s.mapa.y * k, s.cols * k, s.rows * k);
  }
}

export function jugarUnaMas(root: HTMLElement, o: OpcionesUnaMas = {}): Promise<Resultado> {
  cargarTextos(textosConceptos);
  const sonido = new SonidoUnaMas(o.sonido ?? SILENCIO);
  const corte = new AbortController();
  let motivo: Resultado = 'cancelado';
  let fotogramas = 0;
  let pausado = false;

  // ---------------------------------------------------------------- the screen
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
  const lienzo = h('canvas', { class: 'unamas-lienzo' });
  const pausaBtn = h('button', { class: 'cerrar', 'aria-label': texto('pausa.titulo') }, 'II');
  const capa = h('div', { class: 'cubierta minijuego unamas' }, lienzo, pausaBtn);
  root.append(capa);
  const entrada = crearEntrada(capa);
  entrada.mostrar(false);
  let pintor: Pintor | null = null;
  let mundo: Mundo | null = null;
  let arte: Arte | null = null;
  let progreso = 0;
  let reloj = 0;

  const ajustar = () => {
    const r = capa.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (pintor) pintor.ajustar(r.width, r.height, window.devicePixelRatio || 1);
    else {
      lienzo.width = Math.round(r.width);
      lienzo.height = Math.round(r.height);
    }
  };
  ajustar();
  window.addEventListener('resize', ajustar);

  // ---------------------------------------------------------------- the pause menu (with «Saltar», as the other minigames)
  let menu: HTMLElement | null = null;
  const cerrarMenu = () => {
    menu?.remove();
    menu = null;
    pausado = false;
    entrada.soltarTodo();
  };
  const abrirMenu = () => {
    if (menu) return;
    pausado = true;
    entrada.soltarTodo();
    const boton = (clave: string, clase: string, f: () => void) => h('button', { class: `btn ${clase}`, onclick: (e: Event) => (e.stopPropagation(), f()) }, texto(clave));
    menu = h(
      'div',
      { class: 'cubierta um-pausa' },
      h(
        'div',
        { class: 'tarjeta vidrio' },
        h('h2', {}, texto('pausa.titulo')),
        h('canvas', { class: 'um-mapa', width: '560', height: '105' }),
        boton('pausa.continuar', 'primario', cerrarMenu),
        boton('pausa.saltar', '', () => {
          motivo = 'saltado';
          corte.abort();
        }),
        boton('pausa.salir', 'fantasma', () => {
          motivo = 'cancelado';
          corte.abort();
        }),
      ),
    );
    capa.append(menu);
    const mp = menu.querySelector('canvas.um-mapa') as HTMLCanvasElement | null;
    if (mp && mundo) dibujarMapa(mp, mundo);
  };
  pausaBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu) cerrarMenu();
    else abrirMenu();
  });
  const alOcultar = () => {
    if (document.hidden && !menu && mundo) abrirMenu();
  };
  document.addEventListener('visibilitychange', alOcultar);

  // ---------------------------------------------------------------- the test hook
  const gancho: GanchoUnaMas = {
    get fotogramas() {
      return fotogramas;
    },
    get mundo() {
      return mundo;
    },
    get pintor() {
      return pintor;
    },
    cerrar() {
      motivo = 'cancelado';
      corte.abort();
    },
    ir(sala, col, fila) {
      const m = mundo;
      if (!m) return;
      const s = SALAS[sala];
      m.estado = 'jugando';
      m.dialogo = null;
      m.carta = null;
      const c = col ?? s.inicio.col;
      const f = fila ?? s.inicio.fila;
      m.cargarSala(sala, (c + 0.5) * TILE, (f + 1) * TILE);
      alCargar(m.sala, m.zonaActual !== m.sala.zona);
      m.fade = 0;
    },
    dar(hab) {
      mundo?.prog.habs.add(hab);
      mundo?.alCambiarHabs();
    },
    limpiar() {
      if (!mundo) return;
      mundo.enems = mundo.enems.filter((e) => e.tipo === 'gran');
    },
    mirar: (dx) => mundo?.mirar(dx) ?? { suelo: false, muro: false },
    tecla(k, pulsada) {
      const mm = entrada.mandos;
      mm[k] = pulsada;
      if (pulsada && k === 'saltar') mm.saltarP = true;
      if (pulsada && k === 'atacar') mm.atacarP = true;
    },
    tocar() {
      entrada.mandos.tocarP = true;
    },
  };
  (window as unknown as { __unamas?: () => GanchoUnaMas }).__unamas = () => gancho;

  // ---------------------------------------------------------------- loading a room: its tiles (and its zone's backdrop, the first time)
  const alCargar = (s: Sala, zonaNueva: boolean) => {
    const m = mundo!;
    if (m.nivel) m.nivel.c.width = m.nivel.c.height = 0;
    m.nivel = hornearNivel(m.rej, s.zona, s.id);
    if (!m.fondo || m.fondo.zona !== s.zona) {
      if (m.fondo) soltarFondo(m.fondo);
      m.fondo = hornearFondo(s.zona);
    }
    void aplicarPintados(m.fondo, s.id).then(() => m.fondo && marcarFondoUltima(m.fondo, !!s.ultima));
    if (zonaNueva || m.zonaActual !== s.zona) {
      m.zonaActual = s.zona;
      m.banner = { titulo: texto(`zona.${s.zona}`), sub: texto(`zona.${s.zona}.sub`), t: 0 };
      sonido.musica(s.zona);
      if (s.id === 'jardin-1' && !m.vistos.has('jardin.entra')) {
        m.vistos.add('jardin.entra');
        m.dialogoPendiente = 'jardin.entra';
      }
    }
    m.nivelSucio = false;
  };

  // ---------------------------------------------------------------- the loop
  const bucle = () =>
    new Promise<void>((fin) => {
      let ultimo = performance.now();
      let acum = 0;
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
        const dt = Math.min(0.1, (ahora - ultimo) / 1000);
        ultimo = ahora;
        reloj += dt;
        const m = mundo;
        if (!m || !pintor || !arte) {
          const c = lienzo.getContext('2d')!;
          c.setTransform(1, 0, 0, 1, 0, 0);
          const k = lienzo.height / 540;
          c.scale(k, k);
          dibujarCarga(c, lienzo.width / k, 540, progreso, reloj);
        } else {
          if (!pausado) {
            acum += dt;
            let n = Math.floor(acum * 60 + 0.2);
            acum -= n / 60;
            if (acum < 0) acum = 0;
            n = Math.min(n, 4);
            for (let i = 0; i < n; i++) {
              if (entrada.tomar('pausaP')) {
                abrirMenu();
                break;
              }
              m.actualizar(1 / 60, entrada);
            }
            // A «NO» block broke: bake the room's ground again (without it).
            if (m.nivelSucio) {
              m.nivelSucio = false;
              if (m.nivel) m.nivel.c.width = m.nivel.c.height = 0;
              m.nivel = hornearNivel(m.rej, m.sala.zona, m.sala.id);
            }
            // The touch buttons only show while Fran is in control.
            entrada.mostrar(m.estado === 'jugando' || m.estado === 'transicion');
          }
          pintor.dibujar(reloj);
        }
        fotogramas++;
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });

  // ---------------------------------------------------------------- the whole thing
  const fin = (r: Resultado) => {
    window.removeEventListener('resize', ajustar);
    document.removeEventListener('visibilitychange', alOcultar);
    const w = window as unknown as { __unamas?: () => GanchoUnaMas };
    if (w.__unamas?.() === gancho) delete w.__unamas;
    sonido.parar(0.4);
    entrada.destruir();
    if (mundo?.nivel) mundo.nivel.c.width = mundo.nivel.c.height = 0;
    if (mundo?.fondo) soltarFondo(mundo.fondo);
    soltarArte();
    soltarJefe();
    estilo.remove();
    capa.remove();
    return r;
  };

  return (async () => {
    const dibujando = bucle();
    arte = await cargarArte((f) => (progreso = f));
    if (corte.signal.aborted) {
      await dibujando;
      return fin(motivo);
    }
    const salaId = o.sala && SALAS[o.sala] ? o.sala : PRIMERA_SALA[o.zona === 2 ? 2 : 1];
    const habs = (o.habs ?? []).filter((x) => HABILIDADES.includes(x));
    mundo = new Mundo(arte, sonido, { sala: salaId, habs });
    const m = mundo;
    pintor = new Pintor(lienzo, arte, m);
    ajustar();
    m.alCargarSala = alCargar;
    m.alTerminar = () => {
      motivo = 'hecho';
      corte.abort();
    };
    const s0 = SALAS[salaId];
    m.cargarSala(salaId, m.j.x, m.j.y);
    alCargar(s0, true);
    // The very first start: a fade-in and the opening talk.
    m.fade = 1;
    m.fadeObjetivo = 0;
    if (!o.sala && salaId === 'recibidor-1') m.dialogoPendiente = 'intro';
    if (m.dialogoPendiente) {
      const clave = m.dialogoPendiente;
      m.dialogoPendiente = null;
      setTimeout(() => m.estado === 'jugando' && m.hablar(clave), o.rapido ? 100 : 900);
    }
    await dibujando;
    return fin(motivo);
  })();
}
