import './ui/ui.css';
import logoUrl from '../assets/logo.png';
import textosCapitulo from './textos/capitulo1.md?raw';
import textosInterfaz from './textos/interfaz.md?raw';
import { cargarTextos, texto } from './juego/textos';
import { Aventura } from './juego/aventura';
import { cargarPartida, enJuego, guardarPartida, rejugar, volverAPrincipal, type Partida } from './juego/partida';
import { capitulo1 } from './capitulos/capitulo1';
import { h } from './ui/hud';
import type { Calidad } from './motor/motor';
import { storageGet, storageSet, wait } from './core/util';

interface Ajustes {
  muted: boolean;
  calidad: Calidad | 'auto';
  fps: boolean;
}

function cargarAjustes(): Ajustes {
  try {
    return { muted: false, calidad: 'auto', fps: false, ...JSON.parse(storageGet('cyc.ajustes') ?? '{}') };
  } catch {
    return { muted: false, calidad: 'auto', fps: false };
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

  if (ajustes.calidad !== 'auto') g.motor.setCalidad(ajustes.calidad);
  if (new URLSearchParams(location.search).has('relieve')) g.motor.setRelieve(true);
  g.mostrarFps = ajustes.fps;
  g.sound.setMuted(ajustes.muted);
  g.hud.setVisible(false);
  g.start();

  // Signs are lettered with the web fonts: wait for them, but never for long.
  await Promise.race([Promise.all([document.fonts.load("44px 'Graduate'"), document.fonts.load("800 34px 'Alegreya Sans'")]), wait(1800)]).catch(() => {});
  const lugar = g.estado.donde[g.estado.activo]?.escena ?? 'piso';
  const cargada = g.ejecutar(() => g.irA(lugar));
  const logo = await logoClaro().catch(() => logoUrl);

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
    const el = g.hud.cubrir(
      '',
      h(
        'div',
        { class: 'tarjeta vidrio' },
        h('h2', {}, texto('menu.titulo')),
        h(
          'div',
          { class: 'opciones' },
          h('div', { class: 'opcion' }, h('span', {}, texto('menu.sonido')), seg('m-sonido', [['on', texto('si')], ['off', texto('no')]], ajustes.muted ? 'off' : 'on', (v) => {
            ajustes.muted = v === 'off';
            g.sound.setMuted(ajustes.muted);
            guardarAjustes();
          })),
          h('div', { class: 'opcion' }, h('span', {}, texto('menu.calidad')), seg('m-calidad', [['auto', texto('auto')], ['alta', texto('alta')], ['media', texto('media')], ['baja', texto('baja')]], ajustes.calidad, (v) => {
            ajustes.calidad = v;
            g.motor.setCalidad(v === 'auto' ? (matchMedia('(pointer: coarse)').matches ? 'media' : 'alta') : v);
            guardarAjustes();
          })),
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
    if (matchMedia('(pointer: coarse)').matches) document.documentElement.requestFullscreen?.().catch(() => {});
    await cargada;
    g.hud.setVisible(true);
    if (nueva) await g.ejecutar(() => g.empezarPartida());
    // Saved between two stories: choose who goes next.
    else if (g.llegado(g.estado.activo) && !g.estado.final) await g.ejecutar(async () => g.cambiarA(await g.escogerQuien(texto('eleccion.siguiente'))));
  });

  // Test hook for scripts/playthrough.mjs.
  (window as unknown as { __cyc: unknown }).__cyc = { g, titulo, listo: () => cargada, partida };
}

void arrancar();
