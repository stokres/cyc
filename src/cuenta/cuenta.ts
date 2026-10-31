// Cuenta de la web (docs/POKEUSERA.md, «Cuentas»): un nombre único y nada más, para toda la web. Este módulo es lo que usan la portada y los juegos:
// la cuenta de este aparato, crearla, entrar con el código y cambiar el nombre. Sin red todo sigue funcionando: solo esas tres cosas necesitan conexión
// (un mensaje, nunca un error). El guardado de cada juego en el perfil está en sincronizar.ts. No importa ningún juego.
import { cuentaLocal, nombreLocal, pedir, ponerCuenta, tokenLocal, type Cuenta, type Respuesta } from './base';
import { marcasDelAparato, subirMarcas } from './records';
import { bajarPartidas, olvidarMeta, subirTodo } from './sincronizar';

export { cuentaLocal, nombreLocal, tokenLocal, type Cuenta };
export { bajarPartidas, vigilar } from './sincronizar';
export { pedir };
export { enviarRecord, iniciarRecords, leerPrimeros, leerRecords, TABLAS_IDS, type Envio, type ExtraPang, type Fila, type TablaId } from './records';

export type Fallo = 'nombre' | 'repetido' | 'codigo' | 'noexiste' | 'red' | 'limite' | 'servidor';
export type Resultado = { ok: true } | { ok: false; motivo: Fallo };

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

/** Makes the account (needs the network). What the device already has saved goes up to it (the game saves and the scores): it is that person's. */
export async function crearCuenta(nombre: string): Promise<Resultado> {
  const r = await pedir('/api/cuentas', 'POST', { nombre });
  if (r?.estado !== 200 || !r.datos) return { ok: false, motivo: fallo(r, 'nombre') };
  const c = { token: texto(r.datos.token), codigo: texto(r.datos.codigo), nombre: texto(r.datos.nombre), id: texto(r.datos.id) };
  if (!c.token || !c.nombre) return { ok: false, motivo: 'servidor' };
  const marcas = marcasDelAparato();
  ponerCuenta(c);
  await subirTodo();
  await subirMarcas(marcas);
  return { ok: true };
}

/** Enters with a recovery code (needs the network): the device takes that account and, as the server wins, all that the profile has saved comes down.
 *  The scores the device had go up to the account first-hand (read before the download replaces the saves). */
export async function recuperarCuenta(codigo: string): Promise<Resultado> {
  const r = await pedir('/api/cuentas/recuperar', 'POST', { codigo });
  if (r?.estado !== 200 || !r.datos) return { ok: false, motivo: fallo(r, 'codigo') };
  const c = { token: texto(r.datos.token), codigo: texto(r.datos.codigo) || codigo, nombre: texto(r.datos.nombre), id: texto(r.datos.id) };
  if (!c.token || !c.nombre) return { ok: false, motivo: 'servidor' };
  const marcas = marcasDelAparato();
  ponerCuenta(c);
  olvidarMeta();
  await bajarPartidas(true, 6000);
  await subirMarcas(marcas);
  return { ok: true };
}

/** Changes the name (needs the network). */
export async function cambiarNombre(nombre: string): Promise<Resultado> {
  const c = cuentaLocal();
  if (!c) return { ok: false, motivo: 'servidor' };
  const r = await pedir('/api/cuentas/yo', 'PUT', { nombre }, c.token);
  if (r?.estado !== 200 || !r.datos) return { ok: false, motivo: r?.estado === 401 ? 'servidor' : fallo(r, 'nombre') };
  ponerCuenta({ ...c, nombre: texto(r.datos.nombre) || nombre });
  return { ok: true };
}
