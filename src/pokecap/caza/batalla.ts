// PokéUsera · chapter 2, the hunt: one battle against the mythical Ultimosaurio, played on the usual battle screen (VistaCombate) with the usual engine.
// It is its own little loop instead of a `Partida` (partida.ts) because of the jarra: against the wild userito the third action reads CAZAR, and the
// throw is decided here, before the engine resolves the turn (the player passes the turn: `{ tipo: 'pasar' }`). And because the mythical one does not
// stay down: when it is knocked out it stands up again with a little HP (modelo.ts), so that the jarra is what ends the fight.
// No draft, no «La barra»: Guille's team (his drafted useritos, all of them back on their feet) comes out in the order he drafted them.
import type { Eleccion, EntrenadorId, EstadoCombate, Evento } from '../tipos';
import { ESPECIE } from '../datos';
import { crearRnd } from '../motor/azar';
import { activo, crearCombate, eleccionAlAzar, eliminado, enGrada, reemplazar, resolverTurno, revivir, vivos } from '../motor/combate';
import { eleccionBot, reemplazoBot } from '../motor/bot';
import { PLAZO_REEMPLAZO, PLAZO_TURNO } from '../partida';
import { pantalla } from '../pantalla';
import { sonido } from '../sonido';
import { VistaCombate } from '../pantallas/combate';
import { dormir, nombreEnt } from '../pantallas/ui';
import { ESCALA_ULTIMOSAURIO, REVIVE_PS, escalar, probCaptura } from './modelo';

export interface OpcionesBatallaCaza {
  /** The trainer who throws the jarra. */
  yo: EntrenadorId;
  /** His team, in order (1..3). */
  equipo: string[];
  /** The wild userito, its trainer's colours (only the name and the panel's colour show) and the name its panel carries. */
  salvaje: string;
  entrenadorSalvaje: EntrenadorId;
  nombreSalvaje: string;
  escenario: 'conceptos';
  /** The opening line in the text box. */
  textoInicio: string;
  semilla?: number;
  /** The plazos of the turn and of the replacement (ms); the chapter's are generous, nobody is waiting for Guille. */
  plazoTurno?: number;
  /** Called as soon as the battle's view exists (the tests' hook looks at it while the battle is on). */
  alCrear?: (vista: VistaCombate) => void;
}

/** 'cazado': the jarra worked. 'perdido': Guille's team fell. 'huido': ABANDONAR in the pause box. */
export type ResultadoCaza = 'cazado' | 'perdido' | 'huido';

class Huida extends Error {}

/** Plays the battle on the battle screen and returns how it ended. The screen stays on (the caller puts the next one). */
export async function batallaCaza(o: OpcionesBatallaCaza): Promise<{ resultado: ResultadoCaza; vista: VistaCombate }> {
  const semilla = o.semilla ?? Math.floor(Math.random() * 2 ** 31);
  const rnd = crearRnd(semilla ^ 0x2545f491);
  let estado = crearCombate(
    [
      { entrenador: o.yo, nombre: nombreEnt(o.yo), bot: false, especies: o.equipo },
      { entrenador: o.entrenadorSalvaje, nombre: o.nombreSalvaje, bot: true, especies: [o.salvaje] },
    ],
    semilla,
    o.escenario,
  );
  estado.jugadores[1].equipo.forEach((u) => escalar(u, ESCALA_ULTIMOSAURIO));
  // A wild userito has nobody to buy it a caña; for the player the same button is the jarra (CAZAR).
  estado.jugadores[1].cana = false;

  const plazoTurno = o.plazoTurno ?? PLAZO_TURNO;
  const vc = new VistaCombate(0);
  o.alCrear?.(vc);
  vc.cazar = true;
  vc.musicaFija = 'final';
  vc.textoInicio = o.textoInicio;
  let huir: () => void = () => undefined;
  const huida = new Promise<never>((_, rej) => {
    huir = () => rej(new Huida());
  });
  huida.catch(() => undefined);
  vc.alAbandonar = () => huir();
  const esperar = <T>(p: T | Promise<T>): Promise<T> => Promise.race([Promise.resolve(p), huida]);
  const conPlazo = async <T>(p: Promise<T>, ms: number, defecto: () => T): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tope = new Promise<T>((res) => {
      timer = setTimeout(() => res(defecto()), ms);
    });
    try {
      return await esperar(Promise.race([p, tope]));
    } finally {
      clearTimeout(timer);
    }
  };

  // One against one there are no places: no «¡X se queda sin useritos! Puesto 2.» and no big «2.º» over the loser, and the mythical one's fall is not
  // the end of the fight (it stands up again): the screen is shown the fight still going on.
  const paraVer = (ev: Evento[]): Evento[] => ev.filter((e) => e.k !== 'eliminado' && e.k !== 'fin');
  const verEstado = (e: EstadoCombate): EstadoCombate => {
    const c = structuredClone(e);
    c.ganador = e.ganador === 0 ? null : e.ganador;
    c.jugadores.forEach((q, k) => {
      if (k !== c.ganador) q.puesto = 0;
    });
    return c;
  };

  pantalla().poner(vc);
  try {
    await esperar(vc.alInicio(estado));
    while (true) {
      estado.jugadores[0].cana = true;
      const snap = estado;
      const elecciones: (Eleccion | null)[] = [null, null];
      elecciones[0] = await conPlazo(vc.pedirEleccion(0, snap, plazoTurno), plazoTurno, () => eleccionAlAzar(snap, 0));
      if (!eliminado(snap, 1) || enGrada(snap, 1)) elecciones[1] = eleccionBot(snap, 1, rnd);

      if (elecciones[0]?.tipo === 'cana') {
        // The jarra: thrown before anything else happens in the turn. If it does not hold, the wild userito attacks as usual.
        const u = activo(snap, 1);
        const vars = { jugador: snap.jugadores[0].nombre, quien: ESPECIE[u.especie].nombre };
        const atrapa = rnd() < probCaptura(u);
        await esperar(vc.jarra(1, atrapa, vars));
        if (atrapa) {
          const fin = structuredClone(snap);
          activo(fin, 1).ps = 0;
          sonido.musica('victoria');
          await esperar(vc.alFin(fin));
          return { resultado: 'cazado', vista: vc };
        }
        elecciones[0] = { tipo: 'pasar' };
      }
      const r = resolverTurno(estado, elecciones);
      estado = r.estado;
      await esperar(vc.alTurno(paraVer(r.eventos), verEstado(estado)));
      if (estado.ganador === 0) {
        // The mythical one is down... and stands up again, with a little HP: the fight goes on, now with the jarra in mind.
        estado = revivir(estado, 1, REVIVE_PS);
        await esperar(vc.levanta(1, estado));
        continue;
      }
      if (estado.ganador !== null || eliminado(estado, 0)) break;
      const pendientes = estado.reemplazos.filter((j) => vivos(estado.jugadores[j]).length > 0);
      if (pendientes.length) {
        const snap2 = estado;
        const elegidos: Record<number, number> = {};
        for (const j of pendientes) {
          elegidos[j] =
            j === 0
              ? await conPlazo(vc.pedirReemplazo(0, snap2, PLAZO_REEMPLAZO), PLAZO_REEMPLAZO, () => vivos(snap2.jugadores[0])[0] ?? 0)
              : reemplazoBot(snap2, j);
        }
        const rr = reemplazar(estado, elegidos);
        estado = rr.estado;
        await esperar(vc.alReemplazo(paraVer(rr.eventos), verEstado(estado)));
      }
    }
    await esperar(vc.alFin(verEstado(estado)));
    await dormir(300);
    return { resultado: 'perdido', vista: vc };
  } catch (e) {
    if (e instanceof Huida) return { resultado: 'huido', vista: vc };
    throw e;
  }
}
