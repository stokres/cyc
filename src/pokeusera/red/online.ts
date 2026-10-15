// PokéUsera · «JUGAR ONLINE»: password → room → (host | guest) game → back to the room, as many
// times as the host wants, until the player leaves or the room is closed (docs/POKEUSERA.md, «Online»).
import { envolver } from '../pantallas/ui';
import { pantalla } from '../pantalla';
import { mensaje } from '../pantallas/modal';
import { t } from '../pantallas/ui';
import { mensajeCuenta } from '../cuentas/sala';
import { jugarAnfitrion } from './anfitrion';
import { jugarInvitado } from './invitado';
import { pantallaClave, pantallaSala } from './sala';

const avisoCerrada = () => mensaje(pantalla().escena, envolver(t('online.cerrada'), 190));

/** Returns when the player is back at the menu. */
export async function jugarOnline(): Promise<void> {
  const con = await pantallaClave();
  if (!con) return;
  // A guest tells the host whose account this is (the host reads it in Conexion); the host's own is its own.
  const cuenta = mensajeCuenta();
  if (cuenta && !con.anfitrion) con.juego('anfitrion', cuenta);
  for (;;) {
    const s = await pantallaSala(con);
    if (s.r === 'salir') return;
    if (s.r === 'cerrada') {
      con.cerrar();
      await avisoCerrada();
      return;
    }
    const fin = con.anfitrion ? await jugarAnfitrion(con, s.relleno) : await jugarInvitado(con);
    if (fin === 'sala') continue;
    con.cerrar();
    if (fin === 'cerrada') await avisoCerrada();
    return;
  }
}
