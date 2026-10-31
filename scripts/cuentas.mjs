// Cuentas de usuario del servidor, de toda la web (docs/POKEUSERA.md, «Cuentas»): el archivo de perfiles y sus reglas, sin HTTP.
// Los perfiles viven en `${POKEUSERA_DATOS}/cuentas.json` (se reescribe entero con tmp + rename: nunca queda a medias).
// Cada cuenta: id público (el que va en batallas.jsonl y en las estadísticas), token secreto (solo lo tiene su móvil), código de recuperación
// de 6 letras, nombre (único sin mayúsculas, tildes ni espacios sobrantes), fecha de alta y lo guardado de cada juego (`juegos`: { [juego]: { datos, act } },
// el texto de su clave de localStorage tal cual y el instante del último cambio; la lista cerrada de juegos está en src/cuenta/juegos.mjs).
// El token no sale nunca de aquí salvo hacia su dueño (al crear la cuenta y al recuperarla con el código).
import { randomBytes, randomInt } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ALFABETO_CODIGO, CODIGO_LARGO, claveNombre, limpiarNombre } from '../src/cuenta/reglas.mjs';
import { MAX_PERFIL, esJuego, limpiarAct, limpiarDatos } from '../src/cuenta/juegos.mjs';

/** 2: los perfiles guardan `juegos` (el 1 guardaba solo `progreso` de la Aventura y nadie lo usaba: se empezó de cero). */
const FORMATO = 2;
const TOKEN_RE = /^[0-9a-f]{40}$/;

/** Lo guardado de los juegos tal como se lee del archivo: solo juegos de la lista, con datos y act que valgan. */
function juegosLimpios(bruto) {
  const juegos = {};
  if (!bruto || typeof bruto !== 'object') return juegos;
  for (const [j, v] of Object.entries(bruto)) {
    const datos = limpiarDatos(v?.datos);
    const act = limpiarAct(v?.act);
    if (esJuego(j) && datos !== undefined && act !== null) juegos[j] = { datos, act };
  }
  return juegos;
}
const pesoPerfil = (c) => Object.values(c.juegos).reduce((n, g) => n + new TextEncoder().encode(g.datos ?? '').length, 0);

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
    if (bruto?.v !== FORMATO) {
      // Un archivo de otro formato (el 1, sin `v` o con `v: 1`): se aparta como copia de seguridad (nunca se borra ni se pisa otra) y se empieza vacío.
      let copia = join(carpeta, 'cuentas-v1.json.bak');
      if (await access(copia).then(() => true, () => false)) copia = join(carpeta, `cuentas-v1.${Date.now()}.json.bak`);
      await rename(archivo, copia);
      aviso(`[cuentas] ${archivo} era del formato antiguo: guardado como ${copia}, se empieza sin cuentas`);
    } else {
      for (const c of Array.isArray(bruto.cuentas) ? bruto.cuentas : []) {
        const nombre = limpiarNombre(c?.nombre);
        if (!nombre || typeof c.id !== 'string' || !TOKEN_RE.test(c.token ?? '') || typeof c.codigo !== 'string' || porNombre.has(claveNombre(nombre))) continue;
        indexar({ id: c.id, token: c.token, codigo: c.codigo, nombre, alta: Number(c.alta) || Date.now(), juegos: juegosLimpios(c.juegos), act: Number(c.act) || 0 });
      }
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
      const cuenta = { id, token: nuevoToken(), codigo, nombre, alta: Date.now(), juegos: {}, act: 0 };
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
    /** Cambia el nombre. `{ cuenta }` o `{ error: 'nombre' | 'repetido' | 'disco' }`. */
    async cambiar(cuenta, cambios) {
      const nombre = limpiarNombre(cambios.nombre);
      if (!nombre) return { error: 'nombre' };
      const otra = porNombre.get(claveNombre(nombre));
      if (otra && otra !== cuenta) return { error: 'repetido' };
      const antes = cuenta.nombre;
      if (porNombre.get(claveNombre(antes)) === cuenta) porNombre.delete(claveNombre(antes));
      cuenta.nombre = nombre;
      porNombre.set(claveNombre(nombre), cuenta);
      cuenta.act = Date.now();
      try {
        await guardar();
      } catch (e) {
        porNombre.delete(claveNombre(nombre));
        cuenta.nombre = antes;
        porNombre.set(claveNombre(antes), cuenta);
        aviso(`[cuentas] no puedo escribir en ${archivo}: ${e.code ?? e.message}`);
        return { error: 'disco' };
      }
      if (nombre !== antes) alCambiar();
      return { cuenta };
    },
    /** `{ [juego]: act }` de lo que tiene guardado la cuenta. */
    actsDe(cuenta) {
      return Object.fromEntries(Object.entries(cuenta.juegos).map(([j, g]) => [j, g.act]));
    },
    /** Lo guardado de un juego (`{ datos, act }`) o null si nunca se subió. */
    juego: (cuenta, juego) => (esJuego(juego) ? (cuenta.juegos[juego] ?? null) : null),
    /**
     * Guarda un juego. `{ act }` (el que queda) o `{ error: 'juego' | 'datos' | 'act' | 'grande' | 'viejo' | 'disco', act? }`.
     * Gana el cambio más reciente: un `act` anterior al guardado se rechaza (`viejo`, con el `act` que hay) para que un aparato que estuvo sin red no pise lo nuevo.
     */
    async guardarJuego(cuenta, juego, bruto) {
      if (!esJuego(juego)) return { error: 'juego' };
      const datos = limpiarDatos(bruto?.datos);
      if (datos === undefined) return { error: 'datos' };
      const act = limpiarAct(bruto?.act);
      if (act === null) return { error: 'act' };
      const actual = cuenta.juegos[juego];
      if (actual && act < actual.act) return { error: 'viejo', act: actual.act };
      const antes = actual;
      cuenta.juegos[juego] = { datos, act };
      if (pesoPerfil(cuenta) > MAX_PERFIL) {
        if (antes) cuenta.juegos[juego] = antes;
        else delete cuenta.juegos[juego];
        return { error: 'grande' };
      }
      try {
        await guardar();
      } catch (e) {
        if (antes) cuenta.juegos[juego] = antes;
        else delete cuenta.juegos[juego];
        aviso(`[cuentas] no puedo escribir en ${archivo}: ${e.code ?? e.message}`);
        return { error: 'disco' };
      }
      return { act };
    },
    get cuentas() {
      return porId.size;
    },
  };
}
