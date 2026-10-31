// Récords de todos (docs/POKEUSERA.md, «Cuentas»): las marcas de cada juego con puntos van al servidor con el nombre de la cuenta, y cada juego enseña las mejores de todos.
//   enviarRecord()  al acabar una partida. Sin cuenta no envía nada. Sin red (o sin respuesta) la marca queda pendiente en `cyc.records.pend` (con tope) y se
//                   reintenta al volver la red y al arrancar (`iniciarRecords`). El servidor ignora la marca repetida (misma cuenta, tabla, puntos y fecha).
//   leerRecords()   la tabla de todos, y la última vista (`cyc.records.cache`) si ahora no hay red.
//   leerPrimeros()  el primero de cada tabla, para la portada.
//   marcasDelAparato() / subirMarcas()  lo que el aparato ya tenía guardado de cada juego, para subirlo una vez al crear la cuenta o entrar con el código.
// No importa ningún juego: lee sus claves de localStorage por la lista de juegos.mjs (la portada usa este módulo).
import { JUEGOS } from './juegos.mjs';
import { TABLAS, esTabla, type ExtraPang, type TablaId } from './tablas.mjs';
import { cuentaLocal, guardar, leer, pedir } from './base';

export type { ExtraPang, TablaId };
/** Los ids de las tablas: el Pang y los minijuegos sin fin del capítulo 1. */
export const TABLAS_IDS = Object.keys(TABLAS) as TablaId[];

/** Una marca de la tabla de todos tal como llega del servidor. */
export interface Fila {
  nombre: string;
  puntos: number;
  /** ISO. */
  fecha: string;
  extra: ExtraPang | null;
  /** Es de la cuenta de este aparato. */
  mia?: boolean;
}

interface Pendiente {
  /** La cuenta que la jugó: si el aparato cambia de cuenta, las pendientes de la otra se descartan. */
  cu: string;
  tabla: TablaId;
  puntos: number;
  extra: ExtraPang | null;
  fecha: string;
}

export type Envio = 'enviado' | 'pendiente' | 'sincuenta' | 'descartado';

const CLAVE_PEND = 'cyc.records.pend';
const CLAVE_CACHE = 'cyc.records.cache';
/** Las pendientes que se guardan como mucho (las más antiguas se pierden): sin red durante semanas no llena el almacenamiento. */
const TOPE_PEND = 60;

// ------------------------------------------------------------------ pending marks

function leerPend(): Pendiente[] {
  try {
    const l = JSON.parse(leer(CLAVE_PEND) ?? '[]') as unknown;
    if (!Array.isArray(l)) return [];
    return l.filter((p): p is Pendiente => !!p && typeof p.cu === 'string' && esTabla(p.tabla) && typeof p.puntos === 'number' && typeof p.fecha === 'string');
  } catch {
    return [];
  }
}
const guardarPend = (l: Pendiente[]): void => guardar(CLAVE_PEND, l.length ? JSON.stringify(l.slice(-TOPE_PEND)) : null);

const mismaMarca = (a: Pendiente, b: Pendiente): boolean => a.cu === b.cu && a.tabla === b.tabla && a.puntos === b.puntos && a.fecha === b.fecha;

/** 'ok': el servidor la tiene (o no la quiere, 400: no se reintenta); 'luego': sin red o sin respuesta buena, se queda pendiente. */
async function enviarUna(p: Pendiente, token: string): Promise<'ok' | 'descartada' | 'luego'> {
  const r = await pedir('/api/records', 'POST', { tabla: p.tabla, puntos: p.puntos, ...(p.extra ? { extra: p.extra } : {}), fecha: p.fecha }, token);
  if (r?.estado === 200 && r.datos) return 'ok';
  if (r?.estado === 400 && r.datos) return 'descartada';
  return 'luego';
}

const resultado = new Map<Pendiente, 'ok' | 'descartada'>();
let cola: Promise<void> = Promise.resolve();

/** Sends the pending marks of this account, in order; stops at the first one that cannot go (no network). One at a time. */
function vaciar(): Promise<void> {
  cola = cola.then(async () => {
    const c = cuentaLocal();
    let lista = leerPend();
    if (!c) return;
    // The marks of another account are not this one's.
    if (lista.some((p) => p.cu !== c.id)) guardarPend((lista = lista.filter((p) => p.cu === c.id)));
    for (const p of [...lista]) {
      const r = await enviarUna(p, c.token);
      if (r === 'luego') return;
      if (resultado.size > 200) resultado.clear();
      resultado.set(p, r);
      // The list is read again: another mark may have been queued while this one went up.
      guardarPend(leerPend().filter((x) => !mismaMarca(x, p)));
    }
  });
  return cola;
}

/**
 * The mark of a finished game goes to the server with the name of the account. `fecha` (ISO) lets a mark from before keep its day. Never throws.
 * 'sincuenta': nothing is sent; 'pendiente': it stays here until there is network.
 */
export async function enviarRecord(tabla: TablaId, puntos: number, extra: ExtraPang | null = null, fecha = new Date().toISOString()): Promise<Envio> {
  const c = cuentaLocal();
  if (!c) return 'sincuenta';
  const p: Pendiente = { cu: c.id, tabla, puntos: Math.round(puntos), extra, fecha };
  if (!(p.puntos > 0)) return 'descartado';
  encolar([p]);
  await vaciar();
  const clave = [...resultado.keys()].find((k) => mismaMarca(k, p));
  const r = clave && resultado.get(clave);
  if (clave) resultado.delete(clave);
  return r === 'ok' ? 'enviado' : r === 'descartada' ? 'descartado' : 'pendiente';
}

function encolar(marcas: Pendiente[]): void {
  const l = leerPend();
  for (const p of marcas) if (!l.some((x) => mismaMarca(x, p))) l.push(p);
  guardarPend(l);
}

let iniciado = false;
/** At start-up: sends what was left pending, and again whenever the network comes back. Once per page. */
export function iniciarRecords(): void {
  if (iniciado) return;
  iniciado = true;
  addEventListener('online', () => void vaciar());
  if (leerPend().length) void vaciar();
}

// ------------------------------------------------------------------ what is already in the device

const parse = (clave: string): unknown => {
  try {
    return JSON.parse(leer(clave) ?? 'null');
  } catch {
    return null;
  }
};
const lista = (x: unknown): Array<Record<string, unknown>> => (Array.isArray(x) ? x.filter((m): m is Record<string, unknown> => !!m && typeof m === 'object') : []);

/** The marks the device has saved from before (the Pang's five, each minigame's five): they are that person's. */
export function marcasDelAparato(): Array<{ tabla: TablaId; puntos: number; extra: ExtraPang | null; fecha: string }> {
  const salida: Array<{ tabla: TablaId; puntos: number; extra: ExtraPang | null; fecha: string }> = [];
  const pang = parse(JUEGOS.pang) as { records?: unknown } | null;
  for (const m of lista(pang?.records)) {
    if (typeof m.puntos === 'number' && typeof m.pj === 'string' && typeof m.fase === 'number') salida.push({ tabla: 'pang', puntos: m.puntos, extra: { pj: m.pj, fase: m.fase }, fecha: String(m.fecha ?? '') });
  }
  const partida = parse(JUEGOS.capitulo1) as { progreso?: { minijuegos?: Record<string, { ranking?: unknown }> } } | null;
  for (const t of TABLAS_IDS) {
    if (t === 'pang') continue;
    for (const m of lista(partida?.progreso?.minijuegos?.[t]?.ranking)) {
      if (typeof m.puntos === 'number') salida.push({ tabla: t, puntos: m.puntos, extra: null, fecha: String(m.fecha ?? '') });
    }
  }
  return salida;
}

/** Sends marks from before (see `marcasDelAparato`) to the account of this device. They are queued first, so closing the page does not lose them. */
export async function subirMarcas(marcas: ReturnType<typeof marcasDelAparato>): Promise<void> {
  const c = cuentaLocal();
  if (!c || !marcas.length) return;
  encolar(marcas.filter((m) => m.puntos > 0).map((m) => ({ cu: c.id, tabla: m.tabla, puntos: Math.round(m.puntos), extra: m.extra, fecha: m.fecha })));
  await vaciar();
}

// ------------------------------------------------------------------ reading the tables

const esExtra = (x: unknown): x is ExtraPang => !!x && typeof x === 'object' && typeof (x as ExtraPang).pj === 'string' && typeof (x as ExtraPang).fase === 'number';

function fila(x: unknown): Fila | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.nombre !== 'string' || typeof o.puntos !== 'number' || typeof o.fecha !== 'string') return null;
  return { nombre: o.nombre, puntos: o.puntos, fecha: o.fecha, extra: esExtra(o.extra) ? { pj: o.extra.pj, fase: o.extra.fase } : null, ...(o.mia === true ? { mia: true } : {}) };
}

type Cache = Partial<Record<TablaId, { cu: string | null; filas: Fila[] }>>;
const leerCache = (): Cache => {
  const c = parse(CLAVE_CACHE);
  return c && typeof c === 'object' ? (c as Cache) : {};
};

/**
 * The ten best marks of a table, from the server (`enVivo`) or, with no network, the last ones seen on this device. null if there is neither.
 * With an account, its own marks come flagged `mia`.
 */
export async function leerRecords(tabla: TablaId): Promise<{ filas: Fila[]; enVivo: boolean } | null> {
  const c = cuentaLocal();
  const r = await pedir(`/api/records?tabla=${tabla}`, 'GET', undefined, c?.token);
  if (r?.estado === 200 && Array.isArray(r.datos?.records)) {
    const filas = (r.datos.records as unknown[]).map(fila).filter((f): f is Fila => !!f);
    const cache = leerCache();
    cache[tabla] = { cu: c?.id ?? null, filas };
    guardar(CLAVE_CACHE, JSON.stringify(cache));
    return { filas, enVivo: true };
  }
  const visto = leerCache()[tabla];
  if (!visto || !Array.isArray(visto.filas)) return null;
  // A `mia` seen under another account (the device changed account since) is not this one's.
  const propia = visto.cu === (c?.id ?? null);
  const filas = visto.filas
    .map(fila)
    .filter((f): f is Fila => !!f)
    .map(({ mia, ...resto }) => (mia && propia ? { ...resto, mia } : resto));
  return { filas, enVivo: false };
}

/** The first mark of each table that has one (the cover). null without network or without an answer. */
export async function leerPrimeros(): Promise<Partial<Record<TablaId, Fila>> | null> {
  const r = await pedir('/api/records', 'GET');
  const p = r?.estado === 200 ? r.datos?.primeros : null;
  if (!p || typeof p !== 'object') return null;
  const salida: Partial<Record<TablaId, Fila>> = {};
  for (const t of TABLAS_IDS) {
    const f = fila((p as Record<string, unknown>)[t]);
    if (f) salida[t] = f;
  }
  return salida;
}
