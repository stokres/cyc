// Cuenta de la web, la base: la cuenta guardada en este aparato (nombre, token secreto, código de recuperación) y las llamadas al servidor.
// La usan cuenta.ts (crear, recuperar, cambiar el nombre) y sincronizar.ts (el guardado de cada juego en el perfil). Sin DOM y sin red hasta que se pide:
// la portada puede importarla sin cargar ningún juego (docs/POKEUSERA.md, «Cuentas»).

export interface Cuenta {
  /** Secreto: solo sale de este aparato hacia el servidor (cabecera y resúmenes de batalla). */
  token: string;
  /** Código de recuperación de 6 letras (para entrar desde otro aparato). */
  codigo: string;
  nombre: string;
  /** Id público (el que usan las estadísticas). */
  id: string;
}

export const CLAVE_CUENTA = 'cyc.cuenta';

export function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
export function guardar(clave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    /* private window, full or blocked */
  }
}

// The accounts of PokéUsera before it was the whole web's (keys `pokeusera.cuenta`, `pokeusera.cuenta.pend`): nobody used them, they are dropped.
guardar('pokeusera.cuenta', null);
guardar('pokeusera.cuenta.pend', null);

// ------------------------------------------------------------------ the account kept in this device

let enMemoria: Cuenta | null | undefined;

/** The account of this device, or null if there is none (yet). */
export function cuentaLocal(): Cuenta | null {
  if (enMemoria !== undefined) return enMemoria;
  enMemoria = null;
  try {
    const c = JSON.parse(leer(CLAVE_CUENTA) ?? 'null') as Partial<Cuenta> | null;
    if (c && typeof c.token === 'string' && typeof c.nombre === 'string' && typeof c.codigo === 'string' && typeof c.id === 'string') {
      enMemoria = { token: c.token, codigo: c.codigo, nombre: c.nombre, id: c.id };
    }
  } catch {
    /* none */
  }
  return enMemoria;
}
export function ponerCuenta(c: Cuenta): void {
  enMemoria = c;
  guardar(CLAVE_CUENTA, JSON.stringify(c));
}

export const tokenLocal = (): string | null => cuentaLocal()?.token ?? null;
export const nombreLocal = (): string | null => cuentaLocal()?.nombre ?? null;

// ------------------------------------------------------------------ talking to the server

export interface Respuesta {
  estado: number;
  datos: Record<string, unknown> | null;
}

export interface Opciones {
  /** Cancels the call (the time cap of the download at start-up). */
  signal?: AbortSignal;
  /** The call survives the page closing (the upload when it is hidden). Only up to 64 KB of body: above that it goes as a normal call. */
  keepalive?: boolean;
}

/** One call to the server (absolute paths: `/api/...`). null: no network (or nobody answered). */
export async function pedir(ruta: string, metodo: 'GET' | 'POST' | 'PUT', cuerpo?: unknown, token?: string, op: Opciones = {}): Promise<Respuesta | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const cab: Record<string, string> = {};
    if (cuerpo !== undefined) cab['Content-Type'] = 'application/json';
    if (token) cab['X-Token'] = token;
    const texto = cuerpo === undefined ? undefined : JSON.stringify(cuerpo);
    const res = await fetch(ruta, { method: metodo, headers: cab, body: texto, cache: 'no-store', signal: op.signal, keepalive: op.keepalive && (texto?.length ?? 0) < 60_000 });
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
