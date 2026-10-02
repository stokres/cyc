import './ui/ui.css';
import logoUrl from '../assets/logo.png';
import textosCapitulo from './textos/capitulo1.md?raw';
import textosInterfaz from './textos/interfaz.md?raw';
import { cargarTextos, texto } from './juego/textos';
import { Aventura } from './juego/aventura';
import { borrarEstado, cargarEstado } from './juego/estado';
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

/** Test mode: the four of them on the terrace of the Río, to try the character dock. */
async function modoPrueba(g: Aventura) {
  const e = g.estado;
  e.jugables = ['fran', 'pablo', 'chuchi', 'guille'];
  e.donde.pablo = { escena: 'calle', X: 6620, y: 900, face: 1 };
  e.donde.chuchi = { escena: 'calle', X: 6860, y: 872, face: -1 };
  e.donde.guille = { escena: 'calle', X: 7230, y: 930, face: -1 };
  await g.ejecutar(async () => {
    if (g.escena === 'calle') await g.irA('calle');
    g.refrescar();
  });
  g.hud.aviso(texto('prueba.aviso'));
}

async function arrancar() {
  cargarTextos(textosInterfaz, textosCapitulo);
  const root = document.getElementById('game')!;
  const ajustes = cargarAjustes();
  const guardarAjustes = () => storageSet('cyc.ajustes', JSON.stringify(ajustes));
  const guardado = cargarEstado();
  const g = new Aventura(root, capitulo1, guardado ?? capitulo1.estadoInicial());
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
    const reiniciar = h('button', { class: 'btn fantasma' }, texto('menu.reiniciar'));
    const cerrar = () => {
      el.remove();
      g.pausado = false;
    };
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
        h(
          'div',
          { class: 'fila' },
          h('button', { class: 'btn primario', onclick: (e) => (e.stopPropagation(), cerrar()) }, texto('menu.continuar')),
          h('button', { class: 'btn', onclick: (e) => (e.stopPropagation(), cerrar(), void modoPrueba(g)) }, texto('menu.prueba')),
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
      borrarEstado();
      location.reload();
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
        h(
          'div',
          { class: 'fila' },
          h('button', { class: 'btn primario', onclick: (e) => (e.stopPropagation(), el.remove()) }, texto('fin.seguir')),
          h('button', { class: 'btn', onclick: (e) => (e.stopPropagation(), el.remove(), void modoPrueba(g)) }, texto('menu.prueba')),
          h('button', { class: 'btn fantasma', onclick: (e) => (e.stopPropagation(), borrarEstado(), location.reload()) }, texto('fin.reiniciar')),
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
  const nueva = !guardado;
  const titulo = g.hud.cubrir(
    'titulo',
    h(
      'div',
      { class: 'pila' },
      h('img', { src: logo, alt: 'Camiones y Caravanas, crew est. 2020' }),
      h('div', { class: 'capitulo' }, texto('titulo.capitulo')),
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
    if (nueva) await g.ejecutar(() => g.cap.empezar(g));
  });

  // Test hook for scripts/playthrough.mjs.
  (window as unknown as { __cyc: unknown }).__cyc = { g, titulo, listo: () => cargada };
}

void arrancar();
