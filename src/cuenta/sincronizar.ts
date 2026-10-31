// Cuenta de la web: el guardado de cada juego copiado al perfil (docs/POKEUSERA.md, «Cuentas»). Genérico: cada juego es una clave de localStorage de la lista
// cerrada de juegos.mjs, y el perfil guarda su texto tal cual (sin mirar dentro) con `act`, el instante del último cambio.
//   bajarPartidas()  al arrancar, ANTES de que el juego lea su guardado: baja lo que el perfil tenga más reciente (con tope de tiempo: sin red o con red lenta se juega con lo local).
//   vigilar()        una lectura de localStorage cada 4 s (nada de dibujo): al cambiar una clave la marca pendiente y, tras 3 s quieta, la sube. Reintenta cada 30 s y al volver la red;
//                    al ocultarse la página sube lo pendiente con `keepalive`.
// Gana el cambio más reciente (`act`). Sin cuenta no hace nada. La meta de cada juego vive en `cyc.sinc` ({ [juego]: { act, pend, h } }: `h` es una huella de lo que había
// en la clave la última vez que se miró, así un cambio hecho justo antes de cerrar se detecta al volver a abrir).
import { JUEGOS } from './juegos.mjs';
import { cuentaLocal, guardar, leer, pedir, type Respuesta } from './base';

type Juego = keyof typeof JUEGOS;
const LISTA = Object.keys(JUEGOS) as Juego[];

interface Meta {
  act: number;
  pend: boolean;
  h: string;
}

const CLAVE_META = 'cyc.sinc';
const DEBOUNCE_MS = 3000;
const REVISAR_MS = 4000;
const REINTENTO_MS = 30_000;
/** The download at start-up gives up after this long: the game starts with what the device has. */
const TOPE_BAJADA_MS = 2500;

function leerMeta(): Record<string, Meta> {
  try {
    const o = JSON.parse(leer(CLAVE_META) ?? '{}') as Record<string, Partial<Meta>>;
    const meta: Record<string, Meta> = {};
    for (const j of LISTA) {
      const m = o?.[j];
      if (m && typeof m.act === 'number' && typeof m.h === 'string') meta[j] = { act: m.act, pend: m.pend === true, h: m.h };
    }
    return meta;
  } catch {
    return {};
  }
}
const guardarMeta = (meta: Record<string, Meta>): void => guardar(CLAVE_META, JSON.stringify(meta));

/** A cheap fingerprint of what a key holds (length and a 32-bit hash); '-' when the key is missing. */
function huella(valor: string | null): string {
  if (valor === null) return '-';
  let x = 5381;
  for (let i = 0; i < valor.length; i++) x = ((x << 5) + x + valor.charCodeAt(i)) | 0;
  return `${valor.length}:${(x >>> 0).toString(36)}`;
}

/** Writes what came from the profile into the key of the game (null = the key was removed there). */
function escribirJuego(j: Juego, datos: string | null, act: number, meta: Record<string, Meta>): void {
  guardar(JUEGOS[j], datos);
  meta[j] = { act, pend: false, h: huella(datos) };
}

async function bajarUno(j: Juego, token: string, signal: AbortSignal | undefined): Promise<{ datos: string | null; act: number } | null> {
  const r = await pedir(`/api/cuentas/yo/juegos/${j}`, 'GET', undefined, token, { signal });
  if (r?.estado !== 200 || !r.datos || typeof r.datos.act !== 'number') return null;
  const d = r.datos.datos;
  return d === null || typeof d === 'string' ? { datos: d, act: r.datos.act } : null;
}

/**
 * Brings down from the profile the games it has more recent than this device (or all of them with `todo`: after entering with a code, the server wins).
 * Run it first thing, before the game reads its save. Never throws; with no account, no network or a slow one it gives up (2.5 s) and the game goes on with its own.
 */
export async function bajarPartidas(todo = false, tope = TOPE_BAJADA_MS): Promise<void> {
  const c = cuentaLocal();
  if (!c) return;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const reloj = setTimeout(() => ctrl?.abort(), tope);
  try {
    const r = await pedir('/api/cuentas/yo', 'GET', undefined, c.token, { signal: ctrl?.signal });
    const juegos = r?.estado === 200 ? (r.datos?.juegos as Record<string, unknown> | undefined) : undefined;
    if (!juegos || typeof juegos !== 'object') return;
    const meta = leerMeta();
    const quiero = LISTA.filter((j) => typeof juegos[j] === 'number' && (todo || (juegos[j] as number) > (meta[j]?.act ?? 0)));
    const bajados = await Promise.all(quiero.map((j) => bajarUno(j, c.token, ctrl?.signal)));
    // The local state is read again after the answers: only what did not change in the meantime is replaced.
    const ahora = leerMeta();
    quiero.forEach((j, i) => {
      const b = bajados[i];
      if (b) escribirJuego(j, b.datos, b.act, ahora);
    });
    guardarMeta(ahora);
  } finally {
    clearTimeout(reloj);
  }
}

/** The account was just made on this device: what is already here is that person's, and goes up now (not waiting for a change). */
export async function subirTodo(): Promise<void> {
  const c = cuentaLocal();
  if (!c) return;
  const meta: Record<string, Meta> = {};
  const ahora = Date.now();
  await Promise.all(
    LISTA.map(async (j) => {
      const valor = leer(JUEGOS[j]);
      meta[j] = { act: 0, pend: false, h: huella(valor) };
      if (valor === null) return;
      const r = await pedir(`/api/cuentas/yo/juegos/${j}`, 'PUT', { datos: valor, act: ahora }, c.token);
      if (r?.estado === 200) meta[j].act = typeof r.datos?.act === 'number' ? r.datos.act : ahora;
      else meta[j] = { act: ahora, pend: true, h: huella(valor) };
    }),
  );
  guardarMeta(meta);
}

/** The device changes account: its record of what went up is no longer true. */
export function olvidarMeta(): void {
  guardar(CLAVE_META, null);
}

// ------------------------------------------------------------------ watching the games

let temporizador: ReturnType<typeof setInterval> | undefined;
const visto: Record<string, string | null> = {};
const cambiado: Record<string, number> = {};
const subiendo = new Set<string>();
let hastaReintento = 0;

/** Looks at the keys: what changed since the last look is marked as pending with the moment of the change. */
function mirar(meta: Record<string, Meta>): boolean {
  let hubo = false;
  const ahora = Date.now();
  for (const j of LISTA) {
    const valor = leer(JUEGOS[j]);
    if (j in visto && visto[j] === valor) continue;
    const primera = !(j in visto);
    visto[j] = valor;
    const h = huella(valor);
    const m = meta[j];
    if (!m) {
      // A game the profile never heard of on this device: the baseline, not a change (it only goes up when it changes).
      meta[j] = { act: 0, pend: false, h };
      hubo = true;
    } else if (m.h !== h) {
      meta[j] = { act: ahora, pend: true, h };
      cambiado[j] = primera ? ahora - DEBOUNCE_MS : ahora;
      hubo = true;
    }
  }
  return hubo;
}

async function subirUno(j: Juego, token: string, meta: Record<string, Meta>, keepalive: boolean): Promise<void> {
  const valor = leer(JUEGOS[j]);
  const act = meta[j].act;
  subiendo.add(j);
  let r: Respuesta | null = null;
  try {
    r = await pedir(`/api/cuentas/yo/juegos/${j}`, 'PUT', { datos: valor, act }, token, { keepalive });
  } finally {
    subiendo.delete(j);
  }
  const m = leerMeta();
  if (r?.estado === 200) {
    // Done only if it did not change while it went up.
    if (m[j] && m[j].act === act) m[j] = { act: typeof r.datos?.act === 'number' ? r.datos.act : act, pend: false, h: huella(valor) };
  } else if (r?.estado === 409) {
    // The profile has something more recent (another device): it wins.
    const b = await bajarUno(j, token, undefined);
    if (b && b.act > (m[j]?.act ?? 0)) {
      escribirJuego(j, b.datos, b.act, m);
      visto[j] = b.datos;
    }
  } else hastaReintento = Date.now() + (r?.estado === 401 ? 10 * 60_000 : REINTENTO_MS);
  guardarMeta(m);
}

async function revisar(ya = false): Promise<void> {
  const c = cuentaLocal();
  if (!c) return;
  const meta = leerMeta();
  if (mirar(meta)) guardarMeta(meta);
  const ahora = Date.now();
  if (!ya && ahora < hastaReintento) return;
  for (const j of LISTA) {
    if (!meta[j]?.pend || subiendo.has(j)) continue;
    if (!ya && ahora - (cambiado[j] ?? 0) < DEBOUNCE_MS) continue;
    void subirUno(j, c.token, meta, ya);
  }
}

/**
 * Starts copying the games to the profile as they change (see the head of this file). Once per page, after `bajarPartidas()`.
 * Pending changes that were left from before (no network, page closed) go up too.
 */
export function vigilar(): void {
  if (temporizador) return;
  const meta = leerMeta();
  mirar(meta);
  guardarMeta(meta);
  for (const j of LISTA) if (meta[j]?.pend) cambiado[j] = 0;
  temporizador = setInterval(() => void revisar(), REVISAR_MS);
  addEventListener('online', () => {
    hastaReintento = 0;
    void revisar();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void revisar(true);
  });
  void revisar();
}
