// PokéUsera · AVENTURA: one battle of the hunting mode, played on the usual battle screen (VistaCombate) with the usual engine.
// It is its own little loop instead of a `Partida` (partida.ts) because of the jarra: against a wild userito the third action
// reads CAZAR, and the throw is decided here, before the engine resolves the turn (the player passes the turn: `{ tipo: 'pasar' }`).
// No draft, no «La barra», no «¿Quién sale primero?»: your team comes out in the order you set in EQUIPO.
import type { Eleccion, EntrenadorId, EscenarioId, EstadoCombate, Evento } from '../tipos';
import { ESPECIE } from '../datos';
import { crearRnd } from '../motor/azar';
import { activo, crearCombate, eleccionAlAzar, eliminado, enGrada, reemplazar, resolverTurno, vivos } from '../motor/combate';
import { eleccionBot, reemplazoBot } from '../motor/bot';
import { PLAZO_REEMPLAZO, PLAZO_TURNO } from '../partida';
import { pantalla } from '../pantalla';
import { sonido } from '../sonido';
import { VistaCombate } from '../pantallas/combate';
import { dormir, nombreEnt, t } from '../pantallas/ui';
import { escalar, probCaptura } from './modelo';

export interface RivalCaza {
  entrenador: EntrenadorId;
  /** The name on its panels («SALVAJE» for a wild one). */
  nombre: string;
  especies: string[];
  /** Strength (1 = like yours), see `escalar`. */
  escala: number;
}

export interface OpcionesBatallaCaza {
  yo: EntrenadorId;
  /** Your team, in order (1..3). */
  equipo: string[];
  rivales: RivalCaza[];
  escenario: EscenarioId;
  /** A wild userito (one rival with one userito): CAZAR instead of CAÑA. */
  salvaje: boolean;
  /** You already have this wild userito: CAZAR is greyed out. */
  yaLoTienes?: boolean;
  /** The opening line in the text box. */
  textoInicio: string;
  semilla?: number;
}

/** 'cazado': the jarra worked. 'ganado': every rival fell (a wild one goes home). 'perdido': your team fell. 'huido': ABANDONAR in the pause box. */
export type ResultadoCaza = 'cazado' | 'ganado' | 'perdido' | 'huido';

class Huida extends Error {}

/** Plays the battle on the battle screen and returns how it ended. The screen stays on (the caller puts the next one). */
export async function batallaCaza(o: OpcionesBatallaCaza): Promise<{ resultado: ResultadoCaza; vista: VistaCombate }> {
  const semilla = o.semilla ?? Math.floor(Math.random() * 2 ** 31);
  const rnd = crearRnd(semilla ^ 0x2545f491);
  let estado = crearCombate(
    [
      { entrenador: o.yo, nombre: nombreEnt(o.yo), bot: false, especies: o.equipo },
      ...o.rivales.map((r) => ({ entrenador: r.entrenador, nombre: r.nombre, bot: true, especies: r.especies })),
    ],
    semilla,
    o.escenario,
  );
  o.rivales.forEach((r, k) => {
    const q = estado.jugadores[k + 1];
    q.equipo.forEach((u) => escalar(u, r.escala));
    // A wild userito has nobody to buy it a caña.
    if (o.salvaje) q.cana = false;
  });

  const vc = new VistaCombate(0);
  vc.cazar = o.salvaje;
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

  // One against one there are no places: no «¡X se queda sin useritos! Puesto 2.» and no big «2.º» over the loser.
  const uno = o.rivales.length === 1;
  const paraVer = (ev: Evento[]): Evento[] => (uno ? ev.filter((e) => e.k !== 'eliminado') : ev);
  const verEstado = (e: EstadoCombate): EstadoCombate => {
    if (!uno) return e;
    const c = structuredClone(e);
    c.jugadores.forEach((q, k) => {
      if (k !== c.ganador) q.puesto = 0;
    });
    return c;
  };

  pantalla().poner(vc);
  try {
    await esperar(vc.alInicio(estado));
    const n = estado.jugadores.length;
    while (estado.ganador === null) {
      // CAZAR works while the jarra is not refused (a userito you already have): the engine's `cana` flag drives the button.
      if (o.salvaje) estado.jugadores[0].cana = !o.yaLoTienes;
      const snap = estado;
      const elecciones: (Eleccion | null)[] = new Array(n).fill(null);
      elecciones[0] = await conPlazo(vc.pedirEleccion(0, snap, PLAZO_TURNO), PLAZO_TURNO, () => eleccionAlAzar(snap, 0));
      for (let j = 1; j < n; j++) if (!eliminado(snap, j) || enGrada(snap, j)) elecciones[j] = eleccionBot(snap, j, rnd);

      const previos: Evento[] = [];
      if (o.salvaje && elecciones[0]?.tipo === 'cana') {
        // The jarra: thrown before anything else happens in the turn.
        const u = activo(snap, 1);
        const vars = { jugador: snap.jugadores[0].nombre, quien: ESPECIE[u.especie].nombre };
        previos.push({ k: 'texto', clave: 'caza.lanza', vars, j: 1 }, { k: 'texto', clave: 'caza.tambalea', vars, j: 1 });
        if (rnd() < probCaptura(u)) {
          previos.push({ k: 'cae', j: 1 }, { k: 'texto', clave: 'caza.atrapado', vars, j: 1 });
          const fin = structuredClone(snap);
          activo(fin, 1).ps = 0;
          await esperar(vc.alTurno(previos, fin));
          sonido.musica('victoria');
          await esperar(vc.alFin(fin));
          return { resultado: 'cazado', vista: vc };
        }
        previos.push({ k: 'texto', clave: 'caza.escapa', vars, j: 1 });
        elecciones[0] = { tipo: 'pasar' };
      }
      const r = resolverTurno(estado, elecciones);
      estado = r.estado;
      await esperar(vc.alTurno(paraVer([...previos, ...r.eventos]), verEstado(estado)));
      if (estado.ganador !== null) break;
      // Out of useritos in the final (all against all): no need to watch the rest from the grada.
      if (eliminado(estado, 0)) break;
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
    const gane = estado.ganador === 0;
    if (gane) sonido.musica('victoria');
    await esperar(vc.alFin(verEstado(estado)));
    await dormir(300);
    return { resultado: gane ? 'ganado' : 'perdido', vista: vc };
  } catch (e) {
    if (e instanceof Huida) return { resultado: 'huido', vista: vc };
    throw e;
  }
}

/** The name a wild userito's panel shows. */
export const nombreSalvaje = (): string => t('caza.salvaje');
