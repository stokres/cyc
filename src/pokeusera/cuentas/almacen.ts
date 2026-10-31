// PokéUsera · cuentas de usuario, el lado del móvil (docs/POKEUSERA.md, «Cuentas»). La cuenta es la de toda la web (src/cuenta/: crear, recuperar, cambiar el nombre y el
// guardado de cada juego en el perfil, la Aventura incluida); aquí se re-exporta para el juego y queda lo que es solo de PokéUsera: mis estadísticas.
import { FORMATO, type Agregado } from '../estadisticas/tipos';
import { agregadoValido } from '../estadisticas/agregado.mjs';
import { cuentaLocal, pedir } from '../../cuenta/cuenta';

export { cambiarNombre, crearCuenta, cuentaLocal, nombreLocal, recuperarCuenta, tokenLocal, type Cuenta, type Fallo, type Resultado } from '../../cuenta/cuenta';

const CLAVE_YO = 'pokeusera.est.yo';

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* private window, full or blocked */
  }
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
  const r = await pedir(`/api/estadisticas?cuenta=${encodeURIComponent(c.id)}`, 'GET');
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
