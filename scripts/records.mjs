// Récords de todos de la web (docs/POKEUSERA.md, «Cuentas»): las mejores marcas de cada tabla (el Pang y los minijuegos sin fin del capítulo 1), con el nombre de la cuenta. Sin HTTP.
// Viven en `${POKEUSERA_DATOS}/records.json` (`{ v: 1, tablas: { [tabla]: [{ c: id de cuenta, p: puntos, f: instante, x: extra }] } }`, cada tabla de mayor a menor),
// reescrito entero con tmp + rename como cuentas.json: nunca queda a medias. Una cuenta guarda como mucho sus 10 mejores marcas de cada tabla (puede salir
// varias veces, como en una recreativa) y cada tabla se recorta a 100. El nombre no se guarda: se lee de la cuenta al responder, así que un cambio de nombre
// se nota a la vez y las cuentas que ya no existen no salen. Las tablas y sus reglas, en src/cuenta/tablas.mjs (las comparte el cliente).
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { POR_CUENTA, POR_TABLA, TABLAS, TOP, esTabla, limpiarExtra, limpiarFecha, limpiarPuntos } from '../src/cuenta/tablas.mjs';

const FORMATO = 1;

/** Una marca del archivo, si vale. */
function marcaLimpia(tabla, m) {
  const p = limpiarPuntos(tabla, m?.p);
  const f = typeof m?.f === 'number' ? limpiarFecha(m.f) : null;
  const x = limpiarExtra(tabla, m?.x);
  if (typeof m?.c !== 'string' || p === null || f === null || x === undefined) return null;
  return { c: m.c, p, f, x };
}

/**
 * Abre el archivo de récords. `cuentas`: el almacén de cuentas (`existe(id)`, `nombreDe(id)`).
 * @param {{ carpeta: string, cuentas: { existe(id: string): boolean, nombreDe(id: string): string | null }, aviso?: (m: string) => void }} o
 */
export async function crearAlmacenRecords({ carpeta, cuentas, aviso = (m) => console.log(m) }) {
  const archivo = join(carpeta, 'records.json');
  /** @type {Record<string, Array<{ c: string, p: number, f: number, x: object | null }>>} */
  let tablas = Object.fromEntries(Object.keys(TABLAS).map((t) => [t, []]));
  let escribible = true;

  try {
    await mkdir(carpeta, { recursive: true });
  } catch (e) {
    escribible = false;
    aviso(`[records] no puedo crear ${carpeta} (${e.code ?? e.message}): los récords se pierden al reiniciar`);
  }
  try {
    const bruto = JSON.parse(await readFile(archivo, 'utf8'));
    if (bruto?.v === FORMATO) {
      for (const t of Object.keys(TABLAS)) {
        const lista = Array.isArray(bruto.tablas?.[t]) ? bruto.tablas[t].map((m) => marcaLimpia(t, m)).filter(Boolean) : [];
        tablas[t] = lista.sort((a, b) => b.p - a.p).slice(0, POR_TABLA);
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') aviso(`[records] no puedo leer ${archivo}: ${e.code ?? e.message}`);
  }
  aviso(`[records] ${Object.values(tablas).reduce((n, l) => n + l.length, 0)} marcas en ${archivo}`);

  // Un solo escritor: cada escritura guarda el estado de ese momento, en orden.
  let cola = Promise.resolve();
  const guardar = () => {
    if (!escribible) return Promise.resolve();
    const texto = JSON.stringify({ v: FORMATO, tablas });
    const p = cola.then(async () => {
      const tmp = `${archivo}.${process.pid}.tmp`;
      await writeFile(tmp, texto, 'utf8');
      await rename(tmp, archivo);
    });
    cola = p.catch(() => undefined);
    return p;
  };

  const vista = (m, idMio) => ({
    nombre: cuentas.nombreDe(m.c),
    puntos: m.p,
    fecha: new Date(m.f).toISOString(),
    extra: m.x,
    ...(idMio && m.c === idMio ? { mia: true } : {}),
  });

  return {
    /**
     * Apunta una marca de una cuenta. `{ puesto }` (1 a 100, o null si no entra en la tabla; `repetida` si ya estaba: el mismo envío dos veces)
     * o `{ error: 'disco' }`. Los datos ya vienen limpios (tablas.mjs).
     */
    async anotar(cuenta, tabla, { puntos, extra, fecha }) {
      if (!esTabla(tabla)) return { error: 'tabla' };
      // (Las marcas de cuentas que ya no existen se van aquí, de paso.)
      const antes = tablas[tabla];
      const lista = antes.filter((m) => cuentas.existe(m.c));
      const igual = lista.findIndex((m) => m.c === cuenta.id && m.p === puntos && m.f === fecha);
      if (igual >= 0) return { puesto: igual + 1, repetida: true };
      const mias = lista.filter((m) => m.c === cuenta.id);
      if (mias.length >= POR_CUENTA && puntos <= mias[mias.length - 1].p) return { puesto: null };
      // Un empate va debajo de la marca más antigua.
      let i = lista.findIndex((m) => puntos > m.p || (puntos === m.p && fecha < m.f));
      if (i < 0) i = lista.length;
      if (i >= POR_TABLA) return { puesto: null };
      lista.splice(i, 0, { c: cuenta.id, p: puntos, f: fecha, x: extra });
      if (mias.length >= POR_CUENTA) {
        // Sobra la peor de las suyas (nunca la nueva: es mejor que ella).
        for (let k = lista.length - 1; k >= 0; k--) {
          if (lista[k].c === cuenta.id) {
            lista.splice(k, 1);
            break;
          }
        }
      }
      lista.length = Math.min(lista.length, POR_TABLA);
      tablas[tabla] = lista;
      try {
        await guardar();
      } catch (e) {
        tablas[tabla] = antes;
        aviso(`[records] no puedo escribir en ${archivo}: ${e.code ?? e.message}`);
        return { error: 'disco' };
      }
      return { puesto: lista.findIndex((m) => m.c === cuenta.id && m.p === puntos && m.f === fecha) + 1 || null };
    },
    /** Las `TOP` mejores marcas de una tabla (`mia: true` en las de la cuenta `idMio`). */
    mejores(tabla, idMio = null) {
      return (tablas[tabla] ?? []).filter((m) => cuentas.nombreDe(m.c)).slice(0, TOP).map((m) => vista(m, idMio));
    },
    /** La primera marca de cada tabla que tenga alguna: `{ [tabla]: marca }`. */
    primeros() {
      const o = {};
      for (const t of Object.keys(TABLAS)) {
        const m = tablas[t].find((x) => cuentas.nombreDe(x.c));
        if (m) o[t] = vista(m, null);
      }
      return o;
    },
  };
}
