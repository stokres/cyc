import './ui/ui.css';
import logoUrl from '../assets/logo.png';
import { Adventure } from './game/adventure';
import { clearState, loadState } from './game/state';
import { capitulo1 } from './data/capitulo1';
import { h } from './ui/hud';
import { Quality } from './core/stage';
import { storageGet, storageSet, wait } from './core/util';

interface Settings {
  muted: boolean;
  quality: Quality | 'auto';
  fps: boolean;
}

function loadSettings(): Settings {
  try {
    return { muted: false, quality: 'auto', fps: false, ...JSON.parse(storageGet('cyc.settings') ?? '{}') };
  } catch {
    return { muted: false, quality: 'auto', fps: false };
  }
}

/** The logo is black ink on white: turn it into cream ink on transparent. */
async function inkLogo(): Promise<string> {
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

async function boot() {
  const root = document.getElementById('game')!;
  const settings = loadSettings();
  const saveSettings = () => storageSet('cyc.settings', JSON.stringify(settings));
  const g = new Adventure(root, loadState());
  g.setChapter(capitulo1);
  g.setQuality(settings.quality);
  g.showFps = settings.fps;
  g.sound.setMuted(settings.muted);

  // Signs are painted with the web fonts: wait for them, but never for long.
  await Promise.race([Promise.all([document.fonts.load("44px 'Graduate'"), document.fonts.load("800 34px 'Alegreya Sans'")]), wait(1800)]).catch(() => {});
  g.bake();
  g.start();
  const logo = await inkLogo().catch(() => logoUrl);

  // ---------------------------------------------------------- menu
  g.onMenu = () => {
    if (g.isBusy && !g.hud.inDialogue) return;
    g.paused = true;
    const seg = <T extends string>(id: string, values: Array<[T, string]>, current: T, onPick: (v: T) => void) => {
      const wrap = h('div', { class: 'seg', role: 'group', id });
      for (const [v, label] of values) {
        const b = h('button', { 'aria-pressed': String(v === current) }, label);
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          for (const x of wrap.children) x.setAttribute('aria-pressed', 'false');
          b.setAttribute('aria-pressed', 'true');
          onPick(v);
        });
        wrap.append(b);
      }
      return wrap;
    };
    let confirmReset = false;
    const resetBtn = h('button', { class: 'btn ghost' }, 'Empezar de nuevo');
    const close = () => {
      el.remove();
      g.paused = false;
    };
    const el = g.hud.cover(
      '',
      h(
        'div',
        { class: 'card glass' },
        h('h2', {}, 'Pausa'),
        h(
          'div',
          { class: 'menu-list' },
          h('div', { class: 'opt' }, h('span', {}, 'Sonido'), seg('m-sound', [['on', 'Sí'], ['off', 'No']], settings.muted ? 'off' : 'on', (v) => {
            settings.muted = v === 'off';
            g.sound.setMuted(settings.muted);
            saveSettings();
          })),
          h('div', { class: 'opt' }, h('span', {}, 'Calidad'), seg('m-quality', [['auto', 'Auto'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], settings.quality, (v) => {
            settings.quality = v;
            g.setQuality(v);
            saveSettings();
          })),
          h('div', { class: 'opt' }, h('span', {}, 'Ver rendimiento'), seg('m-fps', [['on', 'Sí'], ['off', 'No']], settings.fps ? 'on' : 'off', (v) => {
            settings.fps = v === 'on';
            g.showFps = settings.fps;
            if (!g.showFps) g.hud.fps(null);
            saveSettings();
          })),
        ),
        h('p', { class: 'small' }, 'Toca para andar o usar. Mantén pulsado para examinar. Arriba a la izquierda cambias de amigo; abajo a la derecha está la bolsa. El ojo enseña lo que se puede tocar y la bombilla da pistas.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: (e) => (e.stopPropagation(), close()) }, 'Continuar'), resetBtn),
      ),
    );
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirmReset) {
        confirmReset = true;
        resetBtn.textContent = '¿Seguro? Toca otra vez';
        return;
      }
      clearState();
      location.reload();
    });
  };

  // ---------------------------------------------------------- end card
  g.onEnd = () => {
    const el = g.hud.cover(
      'title',
      h(
        'div',
        { class: 'card glass' },
        h('img', { src: logo, alt: 'Camiones y Caravanas, crew est. 2020', style: 'height:min(30vh,200px);width:auto;margin:0 auto' }),
        h('h2', {}, 'Fin de la demo'),
        h('p', {}, 'Esto es un mockup: escenario, personajes y un minijuego de prueba. Las anécdotas de verdad las ponéis vosotros.'),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn primary', onclick: (e) => (e.stopPropagation(), el.remove()) }, 'Seguir paseando'),
          h('button', {
            class: 'btn',
            onclick: (e) => {
              e.stopPropagation();
              el.remove();
              g.set('ronda', false);
              g.tableBeers = [];
              g.refreshHud();
              g.save();
            },
          }, 'Repetir la ronda'),
          h('button', { class: 'btn ghost', onclick: (e) => (e.stopPropagation(), clearState(), location.reload()) }, 'Empezar de nuevo'),
        ),
      ),
    );
  };

  // ---------------------------------------------------------- portrait phones
  let rotateEl: HTMLElement | null = null;
  const checkOrientation = () => {
    const portrait = window.innerHeight > window.innerWidth && matchMedia('(pointer: coarse)').matches;
    if (portrait && !rotateEl) {
      rotateEl = g.hud.cover('rotate', h('div', {}, h('div', { class: 'phone' }), h('p', {}, 'Gira el móvil para jugar')));
      g.paused = true;
    } else if (!portrait && rotateEl) {
      rotateEl.remove();
      rotateEl = null;
      g.paused = false;
    }
  };
  window.addEventListener('resize', checkOrientation);
  checkOrientation();

  // ---------------------------------------------------------- title
  if (g.flag('ronda')) g.tableBeers = [0.8, 0.8, 0.8, 0.8];
  g.hud.setHudVisible(false);
  const title = g.hud.cover(
    'title',
    h(
      'div',
      { class: 'stack' },
      h('img', { src: logo, alt: 'Camiones y Caravanas, crew est. 2020' }),
      h('div', { class: 'chapter' }, 'CAPÍTULO 1 · JUEVES EN USERA'),
      h('div', { class: 'tapme' }, g.flag('intro') ? 'Toca para continuar' : 'Toca para empezar'),
    ),
  );
  title.addEventListener('click', async (e) => {
    e.stopPropagation();
    title.remove();
    g.sound.start();
    // Try fullscreen on phones; harmless if refused.
    if (matchMedia('(pointer: coarse)').matches) document.documentElement.requestFullscreen?.().catch(() => {});
    g.hud.setHudVisible(true);
    if (!g.flag('intro')) await g.run(() => g.chapter.intro(g));
  });

  // Debug/test hook.
  (window as unknown as { __cyc: unknown }).__cyc = { g, title };
}

void boot();
