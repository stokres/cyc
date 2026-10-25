// Loading the minigames that live in chunks of their own (Alacant Sun, Impropios Kart, PokéUsera, the whole Pang).
//
// Why this exists: the game is published on GitHub Pages many times a day and every build renames its chunks
// (`sol-Bp4ZcAkc.js`). A page opened before a publication still asks for the old names, which no longer exist, so
// the `import()` fails. Nothing used to catch that: the story stopped halfway with the HUD hidden and the game paused
// (Jesús, 25 October 2026: «se me ha quedado el juego colgado justo antes de mostrar la GBA»).
//
// Everything that loads a chunk on demand goes through `cargarModulo` (the only place with an `import()` of these):
//  - the chunks are preloaded in the background shortly after chapter 2 starts (`precargarModulos`), and the promises
//    are kept, so a publication in the middle of a game no longer matters: a module already loaded stays loaded;
//  - a failed load is tried once more and, if it still fails, a short notice covers the game with a «Recargar»
//    button instead of leaving the story waiting for ever.
import { h } from '../ui/hud';
import { texto } from './textos';

/** One loader per chunk. The only `import()` of these modules in the whole game. */
const CARGADORES = {
  sol: () => import('../sol/sol'),
  kart: () => import('../kart/kart'),
  pokeusera: () => import('../pokeusera/capitulo'),
  pang: () => import('../pang/completo'),
  // Already in the main chunk (chapter 2 imports it statically), so this never fails; it goes through here for the single way in.
  safari: () => import('../ui/safari'),
};

export type ModuloId = keyof typeof CARGADORES;
type Modulo<K extends ModuloId> = Awaited<ReturnType<(typeof CARGADORES)[K]>>;

const promesas = new Map<ModuloId, Promise<unknown>>();
/** Loads in flight: the `vite:preloadError` listener leaves their failures to their own retry. */
let cargando = 0;

const DESCANSO_REINTENTO = 500;

/** One load, with a second try after a short rest. Rejects only if both fail. */
async function intentar<K extends ModuloId>(id: K): Promise<Modulo<K>> {
  cargando++;
  try {
    try {
      return (await CARGADORES[id]()) as Modulo<K>;
    } catch (e) {
      console.warn(`[modulos] ${id}: falla, se reintenta`, e);
      await new Promise((r) => setTimeout(r, DESCANSO_REINTENTO));
      return (await CARGADORES[id]()) as Modulo<K>;
    }
  } finally {
    cargando--;
  }
}

/** The module's promise, shared: started if nobody has, forgotten if it fails (the next ask starts again). */
function promesa<K extends ModuloId>(id: K): Promise<Modulo<K>> {
  let p = promesas.get(id) as Promise<Modulo<K>> | undefined;
  if (!p) {
    p = intentar(id);
    promesas.set(id, p);
    p.catch(() => promesas.get(id) === p && promesas.delete(id));
  }
  return p;
}

/**
 * The module `id`, loaded now if it was not yet. If it cannot be had (a newer version of the game has replaced
 * its file) the notice with «Recargar» goes up and the promise never settles: the game cannot go on without it,
 * and the notice is what the player has to act on.
 */
export async function cargarModulo<K extends ModuloId>(id: K): Promise<Modulo<K>> {
  // A failed background preload is forgotten, so the second round is a fresh try.
  for (let ronda = 0; ronda < 2; ronda++) {
    const habia = promesas.has(id);
    try {
      return await promesa(id);
    } catch (e) {
      console.error(`[modulos] ${id}: no se pudo cargar`, e);
      if (!habia) break;
    }
  }
  avisarVersionNueva();
  return new Promise<Modulo<K>>(() => {});
}

/**
 * Loads the modules in the background, one by one and in the browser's idle moments, so that nothing stutters.
 * A failure here is silent: the notice only goes up if the game really needs the module (`cargarModulo`).
 */
export async function precargarModulos(ids: ModuloId[], espera = 1200) {
  for (const id of ids) {
    await new Promise<void>((r) => {
      const idle = (window as unknown as { requestIdleCallback?: (f: () => void, o: { timeout: number }) => void }).requestIdleCallback;
      setTimeout(() => (idle ? idle(() => r(), { timeout: 3000 }) : r()), espera);
    });
    await promesa(id).catch(() => {});
  }
}

let aviso: HTMLElement | null = null;

/** «There is a new version of the game»: covers everything, with one button that reloads the page. */
export function avisarVersionNueva() {
  if (aviso) return;
  const boton = h('button', { class: 'btn primario', id: 'version-recargar', onclick: () => location.reload() }, texto('version.recargar'));
  aviso = h(
    'div',
    { class: 'cubierta aviso-version', role: 'alertdialog' },
    h('div', { class: 'tarjeta vidrio' }, h('h2', {}, texto('version.titulo')), h('p', {}, texto('version.texto')), h('div', { class: 'fila' }, boton)),
  );
  document.body.append(aviso);
}

// Vite fires this when a chunk it was asked for is gone (the same case, from a load that does not go through here).
// While a load of ours is in flight it has its own retry and its own notice, so this one waits for that.
addEventListener('vite:preloadError', () => {
  if (cargando === 0) avisarVersionNueva();
});
