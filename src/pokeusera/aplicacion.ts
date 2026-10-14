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

/** «Hay versión nueva: toca para actualizar»: the waiting service worker takes over and the page reloads with the new game. */
export function actualizarApp(): void {
  if (!espera) {
    location.reload();
    return;
  }
  // Only now: the first install also changes the controller (clients.claim) and must not reload the page.
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  espera.postMessage('actualizar');
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
  const nueva = (sw: ServiceWorker | null) => {
    // Without a controller this is the very first install: there is nothing to update.
    if (!sw || !navigator.serviceWorker.controller) return;
    espera = sw;
    app.hayActualizacion = true;
    avisar();
  };
  const registrar = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./pokeusera-sw.js', { updateViaCache: 'none' });
      nueva(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed') nueva(sw);
        });
      });
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
