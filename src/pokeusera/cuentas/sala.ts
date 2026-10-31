// PokéUsera · cuentas en las partidas online (docs/POKEUSERA.md, «Cuentas»): al entrar en la sala cada invitado manda a su anfitrión el token de su cuenta
// y su nombre (`{ k: 'cuenta' }`, con el mismo `juego` del resto de mensajes). El anfitrión usa el nombre como nombre del asiento y pone el token en el
// resumen de la batalla (`cu`); el servidor lo cambia por el id público. El token no se muestra a nadie ni viaja a otros invitados.
import { limpiarNombre } from '../../cuenta/reglas.mjs';
import { cuentaLocal } from './almacen';

/** What a guest tells the host: their account token and name. */
export interface MsgCuenta {
  k: 'cuenta';
  token: string;
  nombre: string;
}

/** The message to send on entering a room, or null if this phone has no account. */
export function mensajeCuenta(): MsgCuenta | null {
  const c = cuentaLocal();
  return c ? { k: 'cuenta', token: c.token, nombre: c.nombre } : null;
}

/** A `cuenta` message from the network, cleaned (the host trusts nothing): null if it is not one or the token is not of the right shape. */
export function leerMensajeCuenta(d: unknown): { token: string; nombre: string } | null {
  const m = d as Partial<MsgCuenta> | null;
  if (!m || typeof m !== 'object' || m.k !== 'cuenta' || typeof m.token !== 'string' || !/^[0-9a-f]{40}$/.test(m.token)) return null;
  return { token: m.token, nombre: limpiarNombre(m.nombre) ?? '' };
}

/** A name for a seat: the account's, if it is a good one. */
export const nombreDeCuenta = (nombre: unknown): string | null => limpiarNombre(nombre);
