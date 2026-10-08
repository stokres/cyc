import './ui/ui.css';
import logoUrl from '../assets/logo.png';
import textosCapitulo from './textos/capitulo1.md?raw';
import textosInterfaz from './textos/interfaz.md?raw';
import { cargarTextos, texto } from './juego/textos';
import { Aventura } from './juego/aventura';
import { apuntarPuntos, borrarPartida, cargarPartida, enJuego, guardarPartida, rejugar, volverAPrincipal, type Partida } from './juego/partida';
import { REPARTO, type PjId } from './juego/reparto';
import type { Infinito } from './ui/infinito';
import { jugarRana } from './ui/rana';
import { jugarPalabras } from './ui/palabras';
import { jugarRobot } from './ui/robot';
import { jugarCerdos } from './ui/cerdos';
import { mostrarPrologo } from './ui/prologo';
import { capitulo1 } from './capitulos/capitulo1';
import { h } from './ui/hud';
import type { Calidad } from './motor/motor';
import type { Volumen } from './core/audio';
import { storageGet, storageSet, wait } from './core/util';

interface Ajustes {
  /** 2 since the two volumes and «media» as the default quality (8 October 2026). */
  v: 2;
  /** Music and sound effects, 0–1. */
  musica: number;
  efectos: number;
  calidad: Calidad | 'auto';
  fps: boolean;
  /** Play full screen (unset: on phones yes, with a mouse no). */
  pantallaCompleta?: boolean;
}

/** Quality to start from on «auto»: medium on phones, high with a mouse. */
const calidadInicial = (): Calidad => (matchMedia('(pointer: coarse)').matches ? 'media' : 'alta');

const AJUSTES: Ajustes = { v: 2, musica: 0.7, efectos: 1, calidad: 'media', fps: false };

function cargarAjustes(): Ajustes {
  try {
    const viejos = JSON.parse(storageGet('cyc.ajustes') ?? '{}') as Partial<Ajustes> & { muted?: boolean };
    if (viejos.v !== 2) {
      // Settings from before: «auto» was the default (now «media»), and one sound switch.
      if (viejos.calidad === 'auto') delete viejos.calidad;
      if (viejos.muted) Object.assign(viejos, { musica: 0, efectos: 0 });
      delete viejos.muted;
      delete viejos.v;
    }
    return { ...AJUSTES, ...viejos, v: 2 };
  } catch {
    return { ...AJUSTES };
  }
}

/** The logo is black ink on white: turn it into cream ink on transparent. */
async function logoClaro(): Promise<string> {
  const img = new Image();
  img.src = logoUrl;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const lum = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255;
    const a = (1 - lum) * (d.data[i + 3] / 255);
    d.data[i] = 243;
    d.data[i + 1] = 234;
    d.data[i + 2] = 214;
    d.data[i + 3] = Math.round(a * 255);
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}

async function arrancar() {
  cargarTextos(textosInterfaz, textosCapitulo);
  const root = document.getElementById('game')!;
  const ajustes = cargarAjustes();
  const guardarAjustes = () => storageSet('cyc.ajustes', JSON.stringify(ajustes));
  // ---------------------------------------------------------- the saved game
  // Two games (see src/juego/partida.ts): the main one and, if any, a chapter
  // being replayed. Switching between them saves and reloads the page.
  // The emergency exit (docs/JUGABILIDAD.md): the address ending in ?nueva starts from nothing.
  const params = new URLSearchParams(location.search);
  if (params.has('nueva')) {
    borrarPartida();
    params.delete('nueva');
    history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : '') + location.hash);
  }
  const partida = cargarPartida();
  const enCurso = enJuego(partida);
  const g = new Aventura(root, capitulo1, enCurso?.estado ?? capitulo1.estadoInicial());
  g.rejugando = partida.jugando === 'rejuego';
  let saliendo = false;
  const guardar = () => !saliendo && guardarPartida(partida);
  g.alGuardar = (estado) => {
    partida[partida.jugando] = { capitulo: 1, estado };
    guardar();
  };
  g.onProgreso = ({ capitulo, minijuego }) => {
    const { capitulos, minijuegos } = partida.progreso;
    if (capitulo) capitulos[capitulo] = { ...capitulos[capitulo], superado: true, fecha: capitulos[capitulo]?.fecha ?? new Date().toISOString() };
    if (minijuego) minijuegos[minijuego] = { ...minijuegos[minijuego], superado: true };
    guardar();
  };
  /** Save the game as it is now (if nothing is half done) and reload into `cambio`. */
  const cambiarPartida = (cambio: (p: Partida) => void) => {
    if (!g.ocupadoAhora) g.guardar();
    cambio(partida);
    guardarPartida(partida);
    saliendo = true;
    location.reload();
  };
  // Closing the tab or switching apps mid-walk: keep the last position too.
  const alSalir = () => !g.ocupadoAhora && g.guardar();
  addEventListener('pagehide', alSalir);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && alSalir());

  // «Auto» starts where this phone was left last time (it only ever steps down), else medium on phones.
  if (ajustes.calidad !== 'auto') g.motor.setCalidad(ajustes.calidad);
  else g.motor.setCalidad((storageGet('cyc.calidad.auto') as Calidad | null) ?? calidadInicial());
  g.calidadAuto = ajustes.calidad === 'auto';
  g.onCalidadAuto = (q) => storageSet('cyc.calidad.auto', q);
  if (new URLSearchParams(location.search).has('relieve')) g.motor.setRelieve(true);
  g.mostrarFps = ajustes.fps;
  g.sound.setVolumen('musica', ajustes.musica);
  g.sound.setVolumen('efectos', ajustes.efectos);
  g.hud.setVisible(false);
  g.start();

  // Signs are lettered with the web fonts: wait for them, but never for long.
  await Promise.race([Promise.all([document.fonts.load("44px 'Graduate'"), document.fonts.load("800 34px 'Alegreya Sans'")]), wait(1800)]).catch(() => {});
  const lugar = g.estado.donde[g.estado.activo]?.escena ?? 'piso';
  // Behind the title the curtain stays down: nothing of the scene shows until the game starts.
  const cargada = g.ejecutar(() => g.irA(lugar, true, false));
  const logo = await logoClaro().catch(() => logoUrl);

  // ---------------------------------------------------------- full screen
  // On phones the game plays full screen, asked for with the title's tap. Some browsers drop
  // it when the app is left for a moment (Firefox on Android) and it can only be asked for
  // from a tap: so the next tap asks again. The menu turns it off and on.
  const quierePantallaCompleta = () => ajustes.pantallaCompleta ?? matchMedia('(pointer: coarse)').matches;
  let empezado = false;
  const pedirPantallaCompleta = () => {
    if (document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const recuperarPantallaCompleta = (e: Event) => {
    // (Not the menu's own switch: «No» must not ask for it on its way.)
    if (empezado && quierePantallaCompleta() && !(e.target as Element | null)?.closest?.('#m-pantalla')) pedirPantallaCompleta();
  };
  for (const ev of ['click', 'touchend']) document.addEventListener(ev, recuperarPantallaCompleta, true);

  // ---------------------------------------------------------- pause menu
  g.onMenu = () => {
    if (g.ocupadoAhora && !g.hud.enDialogo) return;
    g.pausado = true;
    const seg = <T extends string>(id: string, valores: Array<[T, string]>, actual: T, elegir: (v: T) => void) => {
      const wrap = h('div', { class: 'seg', role: 'group', id });
      for (const [v, label] of valores) {
        const b = h('button', { 'aria-pressed': String(v === actual) }, label);
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          for (const x of wrap.children) x.setAttribute('aria-pressed', 'false');
          b.setAttribute('aria-pressed', 'true');
          elegir(v);
        });
        wrap.append(b);
      }
      return wrap;
    };
    // Music and effects volume: a slider each, heard while it moves, saved when let go.
    const volumen = (que: Volumen, clave: string) => {
      const pct = (v: number) => `${Math.round(v * 100)} %`;
      const valor = h('output', { class: 'valor' }, pct(ajustes[que]));
      const barra = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(ajustes[que] * 100)), id: `m-${que}`, 'aria-label': texto(clave) });
      barra.addEventListener('input', () => {
        ajustes[que] = Number(barra.value) / 100;
        valor.textContent = pct(ajustes[que]);
        g.sound.setVolumen(que, ajustes[que]);
      });
      barra.addEventListener('change', () => {
        if (que === 'efectos') g.sound.pickup();
        guardarAjustes();
      });
      for (const ev of ['click', 'pointerdown', 'pointerup']) barra.addEventListener(ev, (e) => e.stopPropagation());
      return h('div', { class: 'opcion' }, h('span', {}, texto(clave)), h('div', { class: 'volumen' }, barra, valor));
    };
    let seguro = false;
    const reiniciar = h('button', { class: 'btn fantasma', id: 'm-reiniciar' }, texto(g.rejugando ? 'menu.reiniciarRejuego' : 'menu.reiniciar'));
    const cerrar = () => {
      el.remove();
      g.pausado = false;
    };
    const capitulos = h('button', { class: 'btn', id: 'm-capitulos' }, texto('menu.capitulos'));
    capitulos.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      menuCapitulos();
    });
    const minijuegos = h('button', { class: 'btn', id: 'm-minijuegos' }, texto('menu.minijuegos'));
    minijuegos.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      menuMinijuegos();
    });
    const el = g.hud.cubrir(
      '',
      h(
        'div',
        { class: 'tarjeta vidrio menu' },
        h('h2', {}, texto('menu.titulo')),
        h(
          'div',
          { class: 'opciones' },
          volumen('musica', 'menu.musica'),
          volumen('efectos', 'menu.efectos'),
          h('div', { class: 'opcion' }, h('span', {}, texto('menu.calidad')), seg('m-calidad', [['auto', texto('auto')], ['alta', texto('alta')], ['media', texto('media')], ['baja', texto('baja')]], ajustes.calidad, (v) => {
            ajustes.calidad = v;
            // Choosing «auto» again starts it over: it will step down again only if it has to.
            if (v === 'auto') storageSet('cyc.calidad.auto', calidadInicial());
            g.calidadAuto = v === 'auto';
            g.motor.setCalidad(v === 'auto' ? calidadInicial() : v);
            guardarAjustes();
          })),
          ...(document.fullscreenEnabled
            ? [
                h('div', { class: 'opcion' }, h('span', {}, texto('menu.pantallaCompleta')), seg('m-pantalla', [['on', texto('si')], ['off', texto('no')]], quierePantallaCompleta() ? 'on' : 'off', (v) => {
                  ajustes.pantallaCompleta = v === 'on';
                  guardarAjustes();
                  if (v === 'on') pedirPantallaCompleta();
                  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                })),
              ]
            : []),
          h('div', { class: 'opcion' }, h('span', {}, texto('menu.rendimiento')), seg('m-fps', [['on', texto('si')], ['off', texto('no')]], ajustes.fps ? 'on' : 'off', (v) => {
            ajustes.fps = v === 'on';
            g.mostrarFps = ajustes.fps;
            if (!ajustes.fps) g.hud.fps(null);
            guardarAjustes();
          })),
        ),
        h('p', { class: 'pequeno' }, texto('menu.ayuda')),
        ...(g.rejugando ? [h('p', { class: 'aviso-rejuego' }, texto('capitulos.rejugandoAviso', { n: partida.rejuego!.capitulo }))] : []),
        h(
          'div',
          { class: 'fila' },
          h('button', { class: 'btn primario', onclick: (e) => (e.stopPropagation(), cerrar()) }, texto('menu.continuar')),
          capitulos,
          minijuegos,
          reiniciar,
        ),
      ),
    );
    reiniciar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!seguro) {
        seguro = true;
        reiniciar.textContent = texto('menu.seguro');
        return;
      }
      // Only the game being played starts again: chapters and minigames finished stay finished.
      cambiarPartida((p) => (p[p.jugando] = null));
    });
  };

  // ---------------------------------------------------------- chapters
  // Every chapter finished can be replayed from the start, as a separate game.
  const CAPITULOS = [1];
  const menuCapitulos = () => {
    const fila = (n: number) => {
      const superado = !!partida.progreso.capitulos[n]?.superado;
      const aqui = partida.jugando === 'rejuego' && partida.rejuego?.capitulo === n;
      const principal = (partida.principal?.capitulo ?? 1) === n;
      const estado = aqui ? 'capitulos.rejugando' : superado ? 'capitulos.superado' : principal ? 'capitulos.encurso' : 'capitulos.bloqueado';
      const boton = superado
        ? h('button', { class: aqui ? 'btn' : 'btn primario', 'data-capitulo': String(n) }, texto(aqui ? 'capitulos.otraVez' : 'capitulos.rejugar'))
        : null;
      boton?.addEventListener('click', (e) => {
        e.stopPropagation();
        cambiarPartida((p) => rejugar(p, n, capitulo1.estadoInicial()));
      });
      return h(
        'div',
        { class: `capitulo-fila${superado ? ' superado' : ''}` },
        h('div', {}, h('div', { class: 'cap-num' }, texto('capitulos.numero', { n })), h('div', { class: 'cap-nombre' }, texto(`capitulo.${n}`)), h('div', { class: 'cap-estado' }, texto(estado))),
        ...(boton ? [boton] : []),
      );
    };
    const volver = h('button', { class: 'btn primario', id: 'm-volver' }, texto('capitulos.volver'));
    volver.addEventListener('click', (e) => {
      e.stopPropagation();
      cambiarPartida(volverAPrincipal);
    });
    const cerrar = h('button', { class: 'btn fantasma' }, texto('menu.continuar'));
    const el = g.hud.cubrir(
      '',
      h(
        'div',
        { class: 'tarjeta vidrio capitulos' },
        h('h2', {}, texto('capitulos.titulo')),
        h('div', { class: 'lista-capitulos' }, ...CAPITULOS.map(fila)),
        h('p', { class: 'pequeno' }, texto('capitulos.nota')),
        h('div', { class: 'fila' }, ...(g.rejugando ? [volver] : []), cerrar),
      ),
    );
    cerrar.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      g.pausado = false;
    });
  };

  // ---------------------------------------------------------- minigames
  // The minigames won in the story, endless (src/ui/infinito.ts), with a local
  // ranking per minigame (src/juego/partida.ts). The game stays paused meanwhile.
  const MINIJUEGOS: Array<{ id: string; quien: PjId }> = [
    { id: 'rana', quien: 'fran' },
    { id: 'palabras', quien: 'pablo' },
    { id: 'robot', quien: 'chuchi' },
    { id: 'cerdos', quien: 'guille' },
  ];
  const tarjeta = (...kids: Node[]) => g.hud.cubrir('', h('div', { class: 'tarjeta vidrio' }, ...kids));
  const boton = (etiqueta: string, clase: string, alTocar: () => void, id?: string) => {
    const b = h('button', { class: `btn ${clase}`, ...(id ? { id } : {}) }, etiqueta);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      alTocar();
    });
    return b;
  };
  const volverAlJuego = (el: HTMLElement) => {
    el.remove();
    g.pausado = false;
  };

  const menuMinijuegos = () => {
    g.pausado = true;
    const fila = ({ id, quien }: (typeof MINIJUEGOS)[number]) => {
      const mj = partida.progreso.minijuegos[id];
      const abierto = !!mj?.superado;
      const estado = !abierto ? texto('minijuegos.bloqueado', { quien: REPARTO[quien].nombre }) : mj.record ? texto('minijuegos.record', { n: mj.record }) : texto('minijuegos.sinrecord');
      return h(
        'div',
        { class: `capitulo-fila minijuego-fila${abierto ? ' superado' : ' bloqueado'}` },
        h('div', {}, h('div', { class: 'cap-num' }, REPARTO[quien].nombre), h('div', { class: 'cap-nombre' }, texto(`minijuego.${id}`)), h('div', { class: 'cap-estado' }, estado)),
        ...(abierto
          ? [
              boton(texto('minijuegos.jugar'), 'primario', () => {
                el.remove();
                void jugarInfinito(id);
              }, `mj-${id}`),
            ]
          : []),
      );
    };
    const el = tarjeta(
      h('h2', {}, texto('minijuegos.titulo')),
      h('div', { class: 'lista-capitulos' }, ...MINIJUEGOS.map(fila)),
      h('p', { class: 'pequeno' }, texto('minijuegos.nota')),
      h('div', { class: 'fila' }, boton(texto('menu.continuar'), 'fantasma', () => volverAlJuego(el))),
    );
  };

  const jugarInfinito = async (id: string) => {
    g.pausado = true;
    const antes = partida.progreso.minijuegos[id]?.record ?? 0;
    const inf: Infinito = { record: antes };
    let r: string;
    if (id === 'rana') {
      const F = REPARTO.fran;
      r = await jugarRana(g.root, {
        cuerpoFran: (animo) => F.arte.body({ mood: animo }, g.estado.ropa.fran ?? F.ropa),
        joints: (F.arte as unknown as { JOINTS: Record<string, number[]> }).JOINTS,
        rapido: g.rapido,
        infinito: inf,
        sonido: g.sound,
      });
    } else if (id === 'palabras') r = await jugarPalabras(g.root, REPARTO.pablo.arte.body({}, g.estado.ropa.pablo ?? REPARTO.pablo.ropa), g.rapido, inf, g.sound);
    else if (id === 'robot') r = await jugarRobot(g.root, g.rapido, inf, g.sound);
    else r = await jugarCerdos(g.root, g.rapido, inf, g.sound);
    // Closed halfway: no score, back to the list.
    if (r !== 'hecho') return menuMinijuegos();
    const puntos = inf.puntos ?? 0;
    const puesto = apuntarPuntos(partida, id, puntos);
    guardar();
    resultado(id, puntos, puesto, puntos > antes && antes > 0);
  };

  const resultado = (id: string, puntos: number, puesto: number, recordNuevo: boolean) => {
    const ranking = partida.progreso.minijuegos[id]?.ranking ?? [];
    const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const el = tarjeta(
      h('h2', {}, texto(`minijuego.${id}`)),
      h('p', { class: 'puntos-grandes' }, puntos === 1 ? texto('resultado.punto') : texto('resultado.puntos', { n: puntos })),
      ...(recordNuevo ? [h('p', { class: 'record-nuevo' }, texto('resultado.record'))] : []),
      ...(ranking.length
        ? [
            h('p', { class: 'pequeno' }, texto('resultado.ranking')),
            h(
              'ol',
              { class: 'ranking' },
              ...ranking.map((p, i) => h('li', { class: i === puesto ? 'esta' : '' }, h('span', {}, `${i + 1}. ${p.puntos}`), h('span', { class: 'fecha' }, fecha(p.fecha)))),
            ),
          ]
        : []),
      h('p', { class: 'pequeno' }, texto(`minijuego.${id}.puntos`)),
      h(
        'div',
        { class: 'fila' },
        boton(texto('resultado.otra'), 'primario', () => {
          el.remove();
          void jugarInfinito(id);
        }, 'res-otra'),
        boton(texto('resultado.volver'), '', () => {
          el.remove();
          menuMinijuegos();
        }, 'res-volver'),
        boton(texto('menu.continuar'), 'fantasma', () => volverAlJuego(el)),
      ),
    );
    el.querySelector('.tarjeta')?.classList.add('resultado');
  };

  // ---------------------------------------------------------- end of the pilot
  g.onFin = () => {
    const el = g.hud.cubrir(
      'titulo',
      h(
        'div',
        { class: 'tarjeta vidrio' },
        h('img', { src: logo, alt: 'Camiones y Caravanas', class: 'logo-fin' }),
        h('h2', {}, texto('fin.titulo')),
        h('p', {}, texto('fin.texto')),
        h('p', { class: 'pequeno' }, texto(g.rejugando ? 'fin.notaRejuego' : 'fin.nota')),
        h(
          'div',
          { class: 'fila' },
          g.rejugando
            ? h('button', { class: 'btn primario', id: 'fin-volver', onclick: (e) => (e.stopPropagation(), cambiarPartida(volverAPrincipal)) }, texto('capitulos.volver'))
            : h('button', { class: 'btn primario', id: 'fin-seguir', onclick: (e) => (e.stopPropagation(), el.remove()) }, texto('fin.seguir')),
          h('button', { class: 'btn fantasma', id: 'fin-rejugar', onclick: (e) => (e.stopPropagation(), cambiarPartida((p) => rejugar(p, 1, capitulo1.estadoInicial()))) }, texto(g.rejugando ? 'capitulos.otraVez' : 'fin.rejugar')),
        ),
      ),
    );
  };

  // ---------------------------------------------------------- portrait phones
  let girar: HTMLElement | null = null;
  const orientacion = () => {
    const vertical = window.innerHeight > window.innerWidth && matchMedia('(pointer: coarse)').matches;
    if (vertical && !girar) {
      girar = g.hud.cubrir('girar', h('div', {}, h('div', { class: 'movil-icono' }), h('p', {}, texto('girar'))));
      g.pausado = true;
    } else if (!vertical && girar) {
      girar.remove();
      girar = null;
      g.pausado = false;
    }
  };
  window.addEventListener('resize', orientacion);
  orientacion();

  // ---------------------------------------------------------- title
  // A new game until someone's story has started (the save exists as soon as a scene loads).
  const nueva = !g.estado.jugables.some((id) => g.flag(`empezado.${id}`));
  const titulo = g.hud.cubrir(
    'titulo',
    h(
      'div',
      { class: 'pila' },
      h('img', { src: logo, alt: 'Camiones y Caravanas, crew est. 2020' }),
      h('div', { class: 'capitulo' }, texto('titulo.capitulo')),
      ...(g.rejugando ? [h('div', { class: 'aviso-rejuego' }, texto('titulo.rejugando'))] : []),
      h('div', { class: 'toca' }, texto(nueva ? 'titulo.empezar' : 'titulo.seguir')),
    ),
  );
  titulo.addEventListener('click', async (e) => {
    e.stopPropagation();
    titulo.remove();
    g.sound.start();
    empezado = true;
    if (quierePantallaCompleta()) pedirPantallaCompleta();
    // A new game: the prologue first (src/ui/prologo.ts), while the scene finishes loading behind it.
    if (nueva) {
      g.pausado = true;
      await mostrarPrologo(root.parentElement!, g.rapido);
      g.pausado = false;
    }
    await cargada;
    g.hud.setVisible(true);
    if (nueva) await g.ejecutar(() => g.empezarPartida());
    // Saved between two stories: choose who goes next.
    else if (g.llegado(g.estado.activo) && !g.estado.final) await g.ejecutar(async () => g.cambiarA(await g.escogerQuien(texto('eleccion.siguiente'))));
    // A story started again by the repair of an old save (aventura.ts, reparar): its opening.
    else if (!g.flag(`empezado.${g.estado.activo}`)) await g.ejecutar(() => g.cambiarA(g.estado.activo));
    // Carrying on where it was left: up goes the curtain.
    else await g.ejecutar(() => g.velar(false));
  });

  // Test hook for scripts/playthrough.mjs.
  (window as unknown as { __cyc: unknown }).__cyc = { g, titulo, listo: () => cargada, partida };
}

void arrancar();
