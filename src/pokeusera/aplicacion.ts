// PokéUsera · the game as an installed app (docs/POKEUSERA.md, «Publicación»): the service worker
// (public/pokeusera-sw.js, only in production), the notice «Hay versión nueva», and the install option of the menu
// (Android/Chrome: the browser's own prompt; iPhone/Safari: two steps shown by the flow).

interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const app = {
  /** A new version is downloaded and waiting for the player to tap «actualizar». */
  hayActualizacion: false,
  /** Called whenever `hayActualizacion` or `instalable()` change (the menu redraws). */
  oyentes: new Set<() => void>(),
};

let guardado: EventoInstalar | null = null;
let instalada = false;
let espera: ServiceWorker | null = null;
/** A new version found this soon after opening the game reloads the page by itself (nothing has been played yet). */
const RECARGA_SOLA_MS = 20_000;

const avisar = () => app.oyentes.forEach((f) => f());

/** Already running as an app (home-screen icon), not in a browser tab. Read once at start: the game's own first-tap fullscreen also makes `display-mode: fullscreen` match. */
let modoApp = false;
function leerModoApp(): boolean {
  try {
    if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true;
    return ['standalone', 'fullscreen', 'minimal-ui'].some((m) => matchMedia(`(display-mode: ${m})`).matches);
  } catch {
    return false;
  }
}

const esIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** What the menu offers: 'android' (the browser's prompt is ready), 'ios' (two steps), or nothing (installed, or no way to install from here). */
export function instalable(): 'android' | 'ios' | null {
  if (instalada || modoApp) return null;
  if (guardado) return 'android';
  return esIOS() ? 'ios' : null;
}

/** «INSTALAR EN EL MÓVIL»: on Android it opens the browser's prompt; on iPhone it returns 'pasos' (the caller shows them). */
export async function instalarApp(): Promise<'pasos' | 'hecha' | 'rechazada' | 'nada'> {
  const modo = instalable();
  if (modo === 'ios') return 'pasos';
  if (modo !== 'android' || !guardado) return 'nada';
  const ev = guardado;
  guardado = null; // a prompt can be used once
  avisar();
  try {
    await ev.prompt();
    const r = await ev.userChoice;
    if (r.outcome === 'accepted') instalada = true;
    return r.outcome === 'accepted' ? 'hecha' : 'rechazada';
  } catch {
    return 'nada';
  } finally {
    avisar();
  }
}

/** «Hay versión nueva: toca para actualizar»: the new version is already in charge (it takes over by itself), so a reload opens it. */
export function actualizarApp(): void {
  // A new version still waiting (a service worker from before this one): it is told to take over; the reload comes with the change.
  if (espera && espera.state === 'installed') {
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    espera.postMessage('actualizar');
    return;
  }
  location.reload();
}

/** Is this page older than the version in charge? The service worker writes the cache of that version in `pokeusera-meta`; its copy of the
 * page names its own main script, which is this page's only if they are the same build. */
async function paginaVieja(): Promise<boolean> {
  try {
    const de = (f: string) => new URL(f, location.href).href;
    const activa = await (await caches.open('pokeusera-meta')).match(de('__activa'));
    if (!activa) return false;
    const nombre = await activa.text();
    if (!(await caches.has(nombre))) return false;
    const pagina = await (await caches.open(nombre)).match(de('pokeusera.html'));
    const mio = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute('src');
    return !!pagina && !!mio && !(await pagina.text()).includes(mio);
  } catch {
    return false;
  }
}

/** Without connection the online room cannot be reached (solo play, the Useritopedia and the guide do not need it). */
export const hayConexion = (): boolean => navigator.onLine !== false;

/** Registers the service worker (production only: in `npm run dev` it would serve old files) and listens for the install prompt. */
export function iniciarApp(): void {
  modoApp = leerModoApp();
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    guardado = e as EventoInstalar;
    avisar();
  });
  addEventListener('appinstalled', () => {
    guardado = null;
    instalada = true;
    avisar();
  });
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const inicio = performance.now();
  // A new version takes over by itself as soon as it is downloaded (public/pokeusera-sw.js). This page may then be an older copy: found while
  // the game is just opening (the check made on loading), the page reloads with the new one straight away; later (a check on coming back to
  // the game, maybe in the middle of a battle) the menu offers «actualizar» and the reload waits for that tap. Checked by content, not by
  // events: the change of version can happen before this code runs.
  const revisar = async () => {
    if (app.hayActualizacion || !(await paginaVieja())) return;
    if (performance.now() - inicio < RECARGA_SOLA_MS) {
      location.reload();
      return;
    }
    app.hayActualizacion = true;
    avisar();
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => void revisar());
  const registrar = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./pokeusera-sw.js', { updateViaCache: 'none' });
      // A version left waiting by an older service worker: told to take over now.
      if (reg.waiting && navigator.serviceWorker.controller) {
        espera = reg.waiting;
        reg.waiting.postMessage('actualizar');
      }
      // Checked now (it may have changed already), and again when a version being installed (now or later) takes over.
      const seguir = (sw: ServiceWorker | null) =>
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'activated') void revisar();
        });
      seguir(reg.installing ?? reg.waiting);
      reg.addEventListener('updatefound', () => seguir(reg.installing));
      void revisar();
      // An installed app can stay open for days: look for a new version every time it comes back to the front.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
      });
    } catch (e) {
      console.warn('PokéUsera: sin service worker', e);
    }
  };
  if (document.readyState === 'complete') void registrar();
  else addEventListener('load', () => void registrar(), { once: true });
}
