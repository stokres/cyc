// PokéUsera's online connection (docs/POKEUSERA.md, «Online»): the web's common room connection (src/sala/conexion.ts, docs/SALAS.md) plus what is only PokéUsera's:
// the mode and speed of the room, the accounts the host needs for the statistics, and the names of the lobby. It only carries messages; the host's browser runs the game.
import { MODOS_JUEGO, type EntrenadorId as PjId, type ModoJuego } from '../tipos';
import { nombreLocal } from '../cuentas/almacen';
import { leerMensajeCuenta, nombreDeCuenta } from '../cuentas/sala';
import { VELOCIDADES, cfg, type Velocidad } from '../pantallas/ui';
import { ConexionSala, type JugadorSala as JugadorSalaComun, type MensajeCliente as MensajeClienteComun, type MensajeServidor as MensajeServidorComun, type MotivoRechazo as MotivoRechazoComun } from '../../sala/conexion';

export { MAX_JUGADORES, MAX_SALAS, SALA_NUEVA, limpiarCodigoSala } from '../../sala/conexion';
export type { InfoSala, MotivoCierre, ResultadoSala } from '../../sala/conexion';

export type JugadorSala = JugadorSalaComun<PjId>;
export type MotivoRechazo = MotivoRechazoComun;
export type MensajeCliente = MensajeClienteComun<PjId>;
export type MensajeServidor = MensajeServidorComun<PjId>;

/** The game of PokéUsera in the common rooms. */
export const JUEGO = 'pokeusera';

export class Conexion extends ConexionSala<PjId> {
  /** Host only: the account (token and name) each guest told us about on entering, by room id (docs/POKEUSERA.md, «Cuentas»). Never shown. */
  readonly cuentas = new Map<number, { token: string; nombre: string }>();
  /** Guest only: the account names of the room by room id, as the host announced them with the mode (names only, never tokens). */
  private readonly nombres = new Map<number, string>();
  /** The room's way of playing (docs/POKEUSERA.md, «Modo AL AZAR»): the host's choice, which `anunciarModo` sends; a guest learns it from the host's 'modo' message (NORMAL until then). */
  modo: ModoJuego = 'normal';
  /** The battle speed of the room: the host's choice (it starts as his own setting), the same for everybody; a guest learns it from the host's 'modo' message. */
  velocidad: Velocidad = cfg.velocidad;

  /** The name to show for somebody in the room (for the lobby), or null if there is none: the server's (the account of their token), else my own, the host's `cuentas` or, for a guest, what the host announced. */
  nombreDe(id: number): string | null {
    const delServidor = nombreDeCuenta(this.jugadores.find((j) => j.id === id)?.nombre);
    if (delServidor) return delServidor;
    if (id === this.id) return nombreDeCuenta(nombreLocal());
    return nombreDeCuenta(this.anfitrion ? this.cuentas.get(id)?.nombre : this.nombres.get(id));
  }

  /** Host only: the account names of the room, keyed by room id, as sent in the 'modo' message (what the lobby shows; the tokens never travel). */
  private nombresSala(): Record<number, string> {
    const r: Record<number, string> = {};
    for (const j of this.jugadores) {
      const n = this.nombreDe(j.id);
      if (n) r[j.id] = n;
    }
    return r;
  }

  /** Host only: tells the room the mode and the account names (the guests see them in the lobby). Sent again whenever somebody joins or tells us their name. */
  anunciarModo() {
    if (this.anfitrion) this.juego('todos', { k: 'modo', modo: this.modo, velocidad: this.velocidad, nombres: this.nombresSala() });
  }

  /** What the game code calls to leave («the connection is over»): it leaves the room and goes back to the lobby, the socket stays (online.ts goes back to the list). */
  override cerrar() {
    this.salir();
  }

  /** Closes the socket for good (leaving ONLINE). */
  desconectar() {
    super.cerrar();
  }

  protected override alCambiarDeSala() {
    this.cuentas.clear();
    this.nombres.clear();
    this.modo = 'normal';
    this.velocidad = cfg.velocidad;
  }

  protected override alRecibir(m: MensajeServidor) {
    if (m.tipo === 'juego') {
      const c = leerMensajeCuenta(m.datos);
      if (c) this.cuentas.set(m.de, c);
      // The host's mode, from the host only (a guest's message is nothing to believe).
      const d = m.datos as { k?: unknown; modo?: unknown; velocidad?: unknown; nombres?: unknown } | null;
      if (d && typeof d === 'object' && d.k === 'modo' && MODOS_JUEGO.includes(d.modo as ModoJuego) && this.jugadores.find((j) => j.anfitrion)?.id === m.de) {
        this.modo = d.modo as ModoJuego;
        if (VELOCIDADES.includes(d.velocidad as Velocidad)) this.velocidad = d.velocidad as Velocidad;
        this.nombres.clear();
        if (d.nombres && typeof d.nombres === 'object') {
          for (const [k, v] of Object.entries(d.nombres)) {
            const n = nombreDeCuenta(v);
            if (n && Number.isInteger(Number(k))) this.nombres.set(Number(k), n);
          }
        }
      }
    } else if (m.tipo === 'salio') {
      this.cuentas.delete(m.id);
      this.nombres.delete(m.id);
    }
  }
}
