// PokéUsera · cuentas de usuario, el lado del móvil (docs/POKEUSERA.md, «Cuentas»): la cuenta guardada en este móvil (nombre, token secreto, código de
// recuperación), las llamadas al servidor (crear, recuperar, cambiar el nombre) y la copia del progreso de la Aventura en el perfil.
// Sin red todo sigue funcionando: la cuenta solo se crea con conexión, y lo demás (la copia del progreso) espera a que vuelva.
import { FORMATO, type Agregado } from '../estadisticas/tipos';
import { agregadoValido } from '../estadisticas/agregado.mjs';

export interface Cuenta {
  /** Secreto: solo sale de este móvil hacia el servidor (cabecera y resúmenes de batalla). */
  token: string;
  /** Código de recuperación de 6 letras (para entrar desde otro móvil). */
  codigo: string;
  nombre: string;
  /** Id público (el que usan las estadísticas). */
  id: string;
}

export type Fallo = 'nombre' | 'repetido' | 'codigo' | 'noexiste' | 'red' | 'limite' | 'servidor';
export type Resultado = { ok: true } | { ok: false; motivo: Fallo };

const CLAVE = 'pokeusera.cuenta';
/** The Aventura's progress (written by src/pokeusera/caza/; its format is not ours to touch). */
const CLAVE_CAZA = 'pokeusera.caza.v1';
const CLAVE_PEND = 'pokeusera.cuenta.pend';
const CLAVE_YO = 'pokeusera.est.yo';

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    /* private window, full or blocked */
  }
}

// ------------------------------------------------------------------ the account kept in this phone

let enMemoria: Cuenta | null | undefined;

/** The account of this phone, or null if there is none (yet). */
export function cuentaLocal(): Cuenta | null {
  if (enMemoria !== undefined) return enMemoria;
  enMemoria = null;
  try {
    const c = JSON.parse(leer(CLAVE) ?? 'null') as Partial<Cuenta> | null;
    if (c && typeof c.token === 'string' && typeof c.nombre === 'string' && typeof c.codigo === 'string' && typeof c.id === 'string') {
      enMemoria = { token: c.token, codigo: c.codigo, nombre: c.nombre, id: c.id };
    }
  } catch {
    /* none */
  }
  return enMemoria;
}
function ponerCuenta(c: Cuenta): void {
  enMemoria = c;
  guardar(CLAVE, JSON.stringify(c));
}

export const tokenLocal = (): string | null => cuentaLocal()?.token ?? null;
export const nombreLocal = (): string | null => cuentaLocal()?.nombre ?? null;

// ------------------------------------------------------------------ talking to the server

interface Respuesta {
  estado: number;
  datos: Record<string, unknown> | null;
}

/** One call. null: no network (or nobody answered). */
async function pedir(ruta: string, metodo: 'GET' | 'POST' | 'PUT', cuerpo?: unknown, token?: string): Promise<Respuesta | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const cab: Record<string, string> = {};
    if (cuerpo !== undefined) cab['Content-Type'] = 'application/json';
    if (token) cab['X-Token'] = token;
    const res = await fetch(ruta, { method: metodo, headers: cab, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), cache: 'no-store' });
    let datos: Record<string, unknown> | null = null;
    try {
      const d: unknown = await res.json();
      if (d && typeof d === 'object') datos = d as Record<string, unknown>;
    } catch {
      /* not JSON: a static copy of the game, or a proxy page */
    }
    return { estado: res.status, datos };
  } catch {
    return null;
  }
}

/** A failed answer as a reason. Without JSON (404/405: there is no server here) it counts as no network. */
function fallo(r: Respuesta | null, buscando: Fallo): Fallo {
  if (!r || !r.datos) return 'red';
  if (r.estado === 429) return 'limite';
  if (r.estado === 409) return 'repetido';
  if (r.estado === 404) return buscando === 'codigo' ? 'noexiste' : 'red';
  if (r.estado === 400) return buscando;
  return 'servidor';
}

const texto = (x: unknown): string => (typeof x === 'string' ? x : '');

/** Makes the account (needs the network). Gives the phone its token and code. */
export async function crearCuenta(nombre: string): Promise<Resultado> {
  const r = await pedir('api/cuentas', 'POST', { nombre });
  if (r?.estado !== 200 || !r.datos) return { ok: false, motivo: fallo(r, 'nombre') };
  const c = { token: texto(r.datos.token), codigo: texto(r.datos.codigo), nombre: texto(r.datos.nombre), id: texto(r.datos.id) };
  if (!c.token || !c.nombre) return { ok: false, motivo: 'servidor' };
  ponerCuenta(c);
  alCambiarCuenta();
  return { ok: true };
}

/** Enters with a recovery code (needs the network): the phone takes that account and, if it has one, its Aventura. */
export async function recuperarCuenta(codigo: string): Promise<Resultado> {
  const r = await pedir('api/cuentas/recuperar', 'POST', { codigo });
  if (r?.estado !== 200 || !r.datos) return { ok: false, motivo: fallo(r, 'codigo') };
  const c = { token: texto(r.datos.token), codigo: texto(r.datos.codigo) || codigo, nombre: texto(r.datos.nombre), id: texto(r.datos.id) };
  if (!c.token || !c.nombre) return { ok: false, motivo: 'servidor' };
  ponerCuenta(c);
  // The progress goes down into the key the Aventura reads (as it is, without looking inside).
  const p = r.datos.progreso;
  if (p && typeof p === 'object') guardar(CLAVE_CAZA, JSON.stringify(p));
  alCambiarCuenta();
  return { ok: true };
}

/** Changes the name (needs the network). */
export async function cambiarNombre(nombre: string): Promise<Resultado> {
  const c = cuentaLocal();
  if (!c) return { ok: false, motivo: 'servidor' };
  const r = await pedir('api/cuentas/yo', 'PUT', { nombre }, c.token);
  if (r?.estado !== 200 || !r.datos) return { ok: false, motivo: r?.estado === 401 ? 'servidor' : fallo(r, 'nombre') };
  ponerCuenta({ ...c, nombre: texto(r.datos.nombre) || nombre });
  return { ok: true };
}

// ------------------------------------------------------------------ the Aventura's progress, copied to the profile

const DEBOUNCE_MS = 3000;
const REVISAR_MS = 4000;
const REINTENTO_MS = 30_000;
let visto: string | null = null;
let desde = 0;
let hastaReintento = 0;
let subiendo = false;
let temporizador: ReturnType<typeof setInterval> | undefined;

/** The account changed (new, or another one): what is already on the phone is not uploaded as if it were new. */
function alCambiarCuenta(): void {
  visto = leer(CLAVE_CAZA);
  guardar(CLAVE_PEND, null);
}

async function revisar(): Promise<void> {
  const c = cuentaLocal();
  if (!c) return;
  const ahora = Date.now();
  const s = leer(CLAVE_CAZA);
  if (s !== visto) {
    visto = s;
    desde = ahora;
    if (s) guardar(CLAVE_PEND, '1');
  }
  if (subiendo || ahora - desde < DEBOUNCE_MS || ahora < hastaReintento || leer(CLAVE_PEND) !== '1' || !s) return;
  let progreso: unknown;
  try {
    progreso = JSON.parse(s);
  } catch {
    return;
  }
  subiendo = true;
  try {
    const r = await pedir('api/cuentas/yo', 'PUT', { progreso }, c.token);
    if (r?.estado === 200) {
      // Only done if it did not change while it went up.
      if (leer(CLAVE_CAZA) === s) guardar(CLAVE_PEND, null);
    } else hastaReintento = Date.now() + (r?.estado === 401 ? 10 * 60_000 : REINTENTO_MS);
  } finally {
    subiendo = false;
  }
}

/**
 * Starts copying the progress of the Aventura to the profile: when it changes (and stays still 3 s), or when it was waiting for the network
 * (it survives closing the game). Once, when the game opens. A cheap check (one localStorage read every 4 s), nothing in the drawing.
 */
export function iniciarCuentas(): void {
  if (temporizador) return;
  visto = leer(CLAVE_CAZA);
  desde = Date.now() - DEBOUNCE_MS;
  temporizador = setInterval(() => void revisar(), REVISAR_MS);
  addEventListener('online', () => {
    hastaReintento = 0;
    void revisar();
  });
}

// ------------------------------------------------------------------ my statistics

export interface DeCuenta {
  ag: Agregado;
  nombre: string;
  racha: { a: number; m: number };
  /** True when it is the last copy saved (the server could not be reached now). */
  copia: boolean;
}

function propias(x: unknown, id: string): DeCuenta | null {
  const o = x as { id?: string; ag?: unknown; nombre?: unknown; racha?: { a?: unknown; m?: unknown } } | null;
  const ag = agregadoValido(o?.ag);
  if (!o || o.id !== id || !ag || typeof o.nombre !== 'string') return null;
  return { ag, nombre: o.nombre, racha: { a: Number(o.racha?.a) || 0, m: Number(o.racha?.m) || 0 }, copia: false };
}

/** My aggregates from the server (`/api/estadisticas?cuenta=`), or the last copy saved, or null (no account, no network and no copy). */
export async function estadisticasDeCuenta(): Promise<DeCuenta | null> {
  const c = cuentaLocal();
  if (!c) return null;
  const r = await pedir(`api/estadisticas?cuenta=${encodeURIComponent(c.id)}`, 'GET');
  if (r?.estado === 200 && r.datos && r.datos.v === FORMATO) {
    const d = propias({ ...r.datos, id: c.id }, c.id);
    if (d) {
      guardar(CLAVE_YO, JSON.stringify({ ...r.datos, id: c.id }));
      return d;
    }
  }
  try {
    const d = propias(JSON.parse(leer(CLAVE_YO) ?? 'null'), c.id);
    return d ? { ...d, copia: true } : null;
  } catch {
    return null;
  }
}
