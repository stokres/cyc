// Saving for the Pang (docs/PANG.md, «Guardado»): one JSON in localStorage with the highest
// stage reached, the five best runs and the two volumes. Everything goes through try/catch
// (storageGet/storageSet) so private mode or blocked storage never breaks the game.
import { storageGet, storageSet } from '../core/util';
import { PJS, type PjId } from './tipos';

export const CLAVE = 'cyc.pang.v1';
export const FASES_TOTAL = 12;
export const MAX_RECORDS = 5;

/** One saved run. */
export interface Marca {
  puntos: number;
  pj: PjId;
  fase: number;
  /** ISO date. */
  fecha: string;
}

export interface Guardado {
  v: 1;
  /** Highest stage reached (1–12): «Seguir» starts there and «Elegir fase» unlocks up to it. */
  faseMax: number;
  records: Marca[];
  /** 0–1. */
  musica: number;
  efectos: number;
}

const nuevo = (): Guardado => ({ v: 1, faseMax: 1, records: [], musica: 0.7, efectos: 1 });

const num = (x: unknown, def: number, min: number, max: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def);

/** Whatever was stored, made safe: a broken or foreign save just falls back to the defaults. */
function limpiar(x: unknown): Guardado {
  const g = nuevo();
  if (!x || typeof x !== 'object') return g;
  const o = x as Record<string, unknown>;
  g.faseMax = Math.round(num(o.faseMax, 1, 1, FASES_TOTAL));
  g.musica = num(o.musica, g.musica, 0, 1);
  g.efectos = num(o.efectos, g.efectos, 0, 1);
  if (Array.isArray(o.records)) {
    for (const r of o.records as Array<Record<string, unknown>>) {
      if (!r || typeof r !== 'object' || !PJS.includes(r.pj as PjId) || typeof r.puntos !== 'number' || !(r.puntos > 0)) continue;
      g.records.push({ puntos: Math.round(r.puntos), pj: r.pj as PjId, fase: Math.round(num(r.fase, 1, 1, FASES_TOTAL)), fecha: typeof r.fecha === 'string' ? r.fecha : '' });
    }
    g.records.sort((a, b) => b.puntos - a.puntos);
    g.records.length = Math.min(g.records.length, MAX_RECORDS);
  }
  return g;
}

function leer(): Guardado {
  try {
    const crudo = storageGet(CLAVE);
    return limpiar(crudo ? JSON.parse(crudo) : null);
  } catch {
    return nuevo();
  }
}

/** The save in memory: read once on load, written back by the functions below. */
export const datos: Guardado = leer();

export function guardar() {
  storageSet(CLAVE, JSON.stringify(datos));
}

/** The player reached stage `n`: «Seguir» and «Elegir fase» now go that far. */
export function alcanzarFase(n: number) {
  const f = Math.min(FASES_TOTAL, Math.max(1, Math.round(n)));
  if (f <= datos.faseMax) return;
  datos.faseMax = f;
  guardar();
}

/** Remembers a volume (0–1). */
export function guardarVolumen(que: 'musica' | 'efectos', v: number) {
  datos[que] = Math.min(1, Math.max(0, v));
  guardar();
}

/**
 * Adds a run to the table if it makes the top five (and has points). Returns the run (`marca`, the one that also goes to the
 * table of everybody, src/cuenta/records.ts) and whether it `entra` in this phone's top five; null if it has no points.
 */
export function anotarRecord(puntos: number, pj: PjId, fase: number): { marca: Marca; entra: boolean } | null {
  if (!(puntos > 0)) return null;
  const marca: Marca = { puntos: Math.round(puntos), pj, fase: Math.min(FASES_TOTAL, Math.max(1, fase)), fecha: new Date().toISOString() };
  // A tie goes below the older run.
  const lista = [...datos.records, marca].sort((a, b) => b.puntos - a.puntos);
  datos.records = lista.slice(0, MAX_RECORDS);
  const entra = datos.records.includes(marca);
  guardar();
  return { marca, entra };
}
