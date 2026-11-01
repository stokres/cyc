// PokéUsera · «JUGAR ONLINE»: list of rooms → room → (host | guest) game → back to the room, as many times as the host wants, until the player leaves
// (back to the list) or the room is closed (back to the list too). VOLVER in the list goes back to the menu (docs/POKEUSERA.md, «Online», docs/SALAS.md).
import { envolver } from '../pantallas/ui';
import { pantalla } from '../pantalla';
import { mensaje } from '../pantallas/modal';
import { t } from '../pantallas/ui';
import { mensajeCuenta } from '../cuentas/sala';
import { jugarAnfitrion } from './anfitrion';
import { Conexion } from './conexion';
import { jugarInvitado } from './invitado';
import { pantallaSala, pantallaSalas } from './sala';

const aviso = (clave: string) => mensaje(pantalla().escena, envolver(t(clave), 190));
/** The notice for a room that is gone: closed by the host, closed for being idle, or the connection was lost (then the socket is dead too). */
const avisoCierre = (con: Conexion) => aviso(!con.abierta ? 'online.perdida' : con.cierre === 'inactiva' ? 'online.cerrada.inactiva' : 'online.cerrada');

/**
 * Returns when the player is back at the menu. `codigo`: a link to a room (`?sala=K7MZ`): that room is tried first.
 */
export async function jugarOnline(codigo?: string): Promise<void> {
  const con = new Conexion();
  let enlace = codigo;
  for (;;) {
    const lista = await pantallaSalas(con, enlace);
    enlace = undefined;
    if (lista === 'volver') {
      con.desconectar();
      return;
    }
    // A guest tells the host whose account this is (the host reads it in Conexion); the host's own is its own.
    const cuenta = mensajeCuenta();
    if (cuenta && !con.anfitrion) con.juego('anfitrion', cuenta);
    // In a room until it is closed or the player leaves; then back to the list.
    for (;;) {
      // The room may have closed while nobody was listening (an idle room): back to the list.
      if (con.id < 0) {
        await avisoCierre(con);
        break;
      }
      const s = await pantallaSala(con);
      if (s.r === 'salir') break;
      if (s.r === 'cerrada' || s.r === 'perdida') {
        await avisoCierre(con);
        break;
      }
      const fin = con.anfitrion ? await jugarAnfitrion(con, s.relleno) : await jugarInvitado(con);
      if (fin === 'sala') continue;
      // 'menu': the player left the game (the game code left the room); 'cerrada': the room is gone or the connection is.
      if (fin === 'cerrada') await avisoCierre(con);
      break;
    }
    // The connection is dead: nothing to list.
    if (!con.abierta) {
      con.desconectar();
      return;
    }
  }
}
