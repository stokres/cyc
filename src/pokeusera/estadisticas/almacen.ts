// PokéUsera · estadísticas acumuladas, el lado del móvil (docs/POKEUSERA.md, «Estadísticas acumuladas»):
//  - al acabar una batalla, el resumen se suma a la copia local de los agregados (localStorage) y se manda al servidor sin esperar a nadie;
//  - sin red (el juego es instalable y funciona sin conexión) los resúmenes esperan en localStorage, con tope, y se reenvían cuando vuelve;
//  - la pantalla pide los agregados de todos al servidor (con la última copia guardada por si no hay red) y los de este móvil a la copia local.
// Nada de esto toca el dibujo ni bloquea: la suma local se hace un momento después, y el envío es un fetch.
import { FORMATO, type Agregado, type ResumenBatalla, type ResumenCuenta } from './tipos';
import { cuentaLocal } from '../cuentas/almacen';
import { agregadoVacio, agregadoValido, sumarResumen } from './agregado.mjs';

const CLAVE_LOCAL = 'pokeusera.est.local';
const CLAVE_PENDIENTES = 'pokeusera.est.pend';
const CLAVE_TODOS = 'pokeusera.est.todos';
const CLAVE_CUENTAS = 'pokeusera.est.cuentas';
/** Summaries kept waiting for the network: the oldest go when there are more (about 3 KB each). */
export const TOPE_PENDIENTES = 40;
const REINTENTO_MS = 90_000;

function leer(clave: string): unknown {
  try {
    const s = localStorage.getItem(clave);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* private window, full or blocked: the section just shows what it has */
  }
}

// ------------------------------------------------------------------ this phone

let local: Agregado | null = null;

/** The aggregates of the battles played on this phone (empty if none). */
export function agregadoLocal(): Agregado {
  if (!local) local = agregadoValido(leer(CLAVE_LOCAL)) ?? agregadoVacio();
  return local;
}

function pendientes(): ResumenBatalla[] {
  const p = leer(CLAVE_PENDIENTES);
  return Array.isArray(p) ? (p as ResumenBatalla[]) : [];
}

// ------------------------------------------------------------------ sending

let enviando = false;
let reintento: ReturnType<typeof setTimeout> | undefined;

/** Sends the waiting summaries, oldest first, until one cannot go (no network, server busy, no server here). */
export async function enviarPendientes(): Promise<void> {
  if (enviando || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  enviando = true;
  try {
    for (;;) {
      const lista = pendientes();
      if (!lista.length) return;
      let res: Response;
      try {
        res = await fetch('/api/batallas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lista[0]) });
      } catch {
        break; // no network
      }
      // 2xx: it is there. 400/413: the server will never take it, so it is dropped. 404/405 (no server here), 429 and 5xx: it waits.
      if (res.ok || res.status === 400 || res.status === 413) guardar(CLAVE_PENDIENTES, pendientes().filter((r) => r.id !== lista[0].id));
      else break;
    }
  } finally {
    enviando = false;
  }
  if (pendientes().length) {
    clearTimeout(reintento);
    reintento = setTimeout(() => void enviarPendientes(), REINTENTO_MS);
  }
}

/** A battle is over: counts it on this phone and sends it. Quick: the work that takes a moment (storage, network) is left for later. */
export function registrarBatalla(r: ResumenBatalla): void {
  setTimeout(() => {
    // The secret token never goes into the local aggregate: a record only keeps the public id of this phone's account.
    const mia = cuentaLocal()?.id ?? null;
    sumarResumen(agregadoLocal(), { ...r, ju: r.ju.map((j) => ({ ...j, cu: j.cu ? mia : null })) });
    guardar(CLAVE_LOCAL, agregadoLocal());
    guardar(CLAVE_PENDIENTES, [...pendientes(), r].slice(-TOPE_PENDIENTES));
    void enviarPendientes();
  }, 400);
}

/** Starts listening for the network coming back, and sends what is waiting (once, when the game opens). */
export function iniciarEstadisticas(): void {
  addEventListener('online', () => void enviarPendientes());
  setTimeout(() => void enviarPendientes(), 4000);
}

// ------------------------------------------------------------------ everybody's

export interface DeTodos {
  ag: Agregado;
  /** What each account (with battles) has done, for the ENTRENADORES table; empty when there are no accounts. */
  cuentas: ResumenCuenta[];
  /** True when it is the last copy saved (the server could not be reached now). */
  copia: boolean;
}

/** The accounts list from the server (or from a saved copy), cleaned: only what is well formed. */
function cuentasValidas(x: unknown): ResumenCuenta[] {
  if (!Array.isArray(x)) return [];
  return x.filter((c): c is ResumenCuenta => !!c && typeof c.id === 'string' && typeof c.nombre === 'string' && [c.n, c.g, c.pu, c.dh, c.dr, c.ko].every(Number.isFinite) && c.n > 0);
}

/** Everybody's aggregates from the server; if it cannot be reached, the last copy saved; null if there is none. */
export async function agregadoDeTodos(): Promise<DeTodos | null> {
  try {
    const res = await fetch('/api/estadisticas', { cache: 'no-store' });
    if (res.ok) {
      const cuerpo = (await res.json()) as { v?: number; ag?: unknown; cuentas?: unknown };
      const ag = cuerpo.v === FORMATO ? agregadoValido(cuerpo.ag) : null;
      if (ag) {
        const cuentas = cuentasValidas(cuerpo.cuentas);
        guardar(CLAVE_TODOS, ag);
        guardar(CLAVE_CUENTAS, cuentas);
        return { ag, cuentas, copia: false };
      }
    }
  } catch {
    /* no network */
  }
  const guardado = agregadoValido(leer(CLAVE_TODOS));
  return guardado ? { ag: guardado, cuentas: cuentasValidas(leer(CLAVE_CUENTAS)), copia: true } : null;
}
