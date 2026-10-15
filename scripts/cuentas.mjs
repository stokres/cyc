// PokéUsera · cuentas de usuario del servidor (docs/POKEUSERA.md, «Cuentas»): el archivo de perfiles y sus reglas, sin HTTP.
// Los perfiles viven en `${POKEUSERA_DATOS}/cuentas.json` (se reescribe entero con tmp + rename: nunca queda a medias).
// Cada cuenta: id público (el que va en batallas.jsonl y en las estadísticas), token secreto (solo lo tiene su móvil), código de recuperación
// de 6 letras, nombre (único sin mayúsculas, tildes ni espacios sobrantes), fecha de alta y progreso de la Aventura (JSON opaco).
// El token no sale nunca de aquí salvo hacia su dueño (al crear la cuenta y al recuperarla con el código).
import { randomBytes, randomInt } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ALFABETO_CODIGO, CODIGO_LARGO, claveNombre, limpiarNombre } from '../src/pokeusera/cuentas/reglas.mjs';

const FORMATO = 1;
/** El progreso de la Aventura es pequeño (unos 600 bytes): este tope solo frena abusos. */
export const MAX_PROGRESO = 16 * 1024;
const TOKEN_RE = /^[0-9a-f]{40}$/;

const nuevoToken = () => randomBytes(20).toString('hex');
const nuevoId = () => 'u' + randomBytes(5).toString('hex');
const nuevoCodigo = () => {
  let c = '';
  for (let i = 0; i < CODIGO_LARGO; i++) c += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  return c;
};

/**
 * Abre el archivo de perfiles. `alCambiar`: se llama cuando cambia un nombre o entra una cuenta (las estadísticas rehacen su JSON).
 * @param {{ carpeta: string, aviso?: (m: string) => void, alCambiar?: () => void }} o
 */
export async function crearAlmacenCuentas({ carpeta, aviso = (m) => console.log(m), alCambiar = () => undefined }) {
  const archivo = join(carpeta, 'cuentas.json');
  /** @type {Map<string, any>} id → cuenta */
  const porId = new Map();
  const porToken = new Map();
  const porCodigo = new Map();
  const porNombre = new Map();
  let escribible = true;

  const indexar = (c) => {
    porId.set(c.id, c);
    porToken.set(c.token, c);
    porCodigo.set(c.codigo, c);
    porNombre.set(claveNombre(c.nombre), c);
  };
  const desindexar = (c) => {
    porId.delete(c.id);
    porToken.delete(c.token);
    porCodigo.delete(c.codigo);
    if (porNombre.get(claveNombre(c.nombre)) === c) porNombre.delete(claveNombre(c.nombre));
  };

  try {
    await mkdir(carpeta, { recursive: true });
  } catch (e) {
    escribible = false;
    aviso(`[cuentas] no puedo crear ${carpeta} (${e.code ?? e.message}): las cuentas se pierden al reiniciar`);
  }
  try {
    const bruto = JSON.parse(await readFile(archivo, 'utf8'));
    for (const c of Array.isArray(bruto?.cuentas) ? bruto.cuentas : []) {
      const nombre = limpiarNombre(c?.nombre);
      if (!nombre || typeof c.id !== 'string' || !TOKEN_RE.test(c.token ?? '') || typeof c.codigo !== 'string' || porNombre.has(claveNombre(nombre))) continue;
      indexar({ id: c.id, token: c.token, codigo: c.codigo, nombre, alta: Number(c.alta) || Date.now(), progreso: c.progreso ?? null, act: Number(c.act) || 0 });
    }
  } catch (e) {
    if (e.code !== 'ENOENT') aviso(`[cuentas] no puedo leer ${archivo}: ${e.code ?? e.message}`);
  }
  aviso(`[cuentas] ${porId.size} cuentas en ${archivo}`);

  // Un solo escritor: cada escritura guarda el estado de ese momento, en orden.
  let cola = Promise.resolve();
  const guardar = () => {
    if (!escribible) return Promise.resolve();
    const p = cola.then(async () => {
      const texto = JSON.stringify({ v: FORMATO, cuentas: [...porId.values()] });
      const tmp = `${archivo}.${process.pid}.tmp`;
      await writeFile(tmp, texto, 'utf8');
      await rename(tmp, archivo);
    });
    cola = p.catch(() => undefined);
    return p;
  };

  return {
    /** Crea una cuenta. `{ cuenta }` o `{ error: 'nombre' | 'repetido' | 'disco' }`. */
    async crear(bruto) {
      const nombre = limpiarNombre(bruto);
      if (!nombre) return { error: 'nombre' };
      if (porNombre.has(claveNombre(nombre))) return { error: 'repetido' };
      let codigo = nuevoCodigo();
      while (porCodigo.has(codigo)) codigo = nuevoCodigo();
      let id = nuevoId();
      while (porId.has(id)) id = nuevoId();
      const cuenta = { id, token: nuevoToken(), codigo, nombre, alta: Date.now(), progreso: null, act: 0 };
      indexar(cuenta);
      try {
        await guardar();
      } catch (e) {
        desindexar(cuenta);
        aviso(`[cuentas] no puedo escribir en ${archivo}: ${e.code ?? e.message}`);
        return { error: 'disco' };
      }
      alCambiar();
      return { cuenta };
    },
    recuperar: (codigo) => porCodigo.get(codigo) ?? null,
    /** La cuenta de un token (o null). */
    deToken: (token) => (typeof token === 'string' && TOKEN_RE.test(token) ? (porToken.get(token) ?? null) : null),
    /** El id público de un token, o null: así se cambia el token de un resumen por el `cu` que se guarda. */
    idDeToken(token) {
      return this.deToken(token)?.id ?? null;
    },
    nombreDe: (id) => porId.get(id)?.nombre ?? null,
    existe: (id) => porId.has(id),
    /**
     * Cambia el nombre y/o el progreso. `{ cuenta }` o `{ error: 'nombre' | 'repetido' | 'progreso' | 'disco' }`.
     * @param {{ nombre?: unknown, progreso?: unknown }} cambios
     */
    async cambiar(cuenta, cambios) {
      let nombre = null;
      if (cambios.nombre !== undefined) {
        nombre = limpiarNombre(cambios.nombre);
        if (!nombre) return { error: 'nombre' };
        const otra = porNombre.get(claveNombre(nombre));
        if (otra && otra !== cuenta) return { error: 'repetido' };
      }
      let progreso;
      if (cambios.progreso !== undefined) {
        const p = cambios.progreso;
        if (p !== null && (typeof p !== 'object' || Array.isArray(p))) return { error: 'progreso' };
        const s = JSON.stringify(p);
        if (s.length > MAX_PROGRESO) return { error: 'progreso' };
        progreso = p;
      }
      const antes = { nombre: cuenta.nombre, progreso: cuenta.progreso };
      if (nombre) {
        if (porNombre.get(claveNombre(cuenta.nombre)) === cuenta) porNombre.delete(claveNombre(cuenta.nombre));
        cuenta.nombre = nombre;
        porNombre.set(claveNombre(nombre), cuenta);
      }
      if (progreso !== undefined) cuenta.progreso = progreso;
      cuenta.act = Date.now();
      try {
        await guardar();
      } catch (e) {
        if (nombre) {
          porNombre.delete(claveNombre(nombre));
          cuenta.nombre = antes.nombre;
          porNombre.set(claveNombre(antes.nombre), cuenta);
        }
        cuenta.progreso = antes.progreso;
        aviso(`[cuentas] no puedo escribir en ${archivo}: ${e.code ?? e.message}`);
        return { error: 'disco' };
      }
      if (nombre && nombre !== antes.nombre) alCambiar();
      return { cuenta };
    },
    get cuentas() {
      return porId.size;
    },
  };
}
