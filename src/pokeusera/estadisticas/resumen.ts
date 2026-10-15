// PokéUsera · estadísticas acumuladas: arma el resumen de una batalla (tipos.ts) al acabar. Casi todo ya lo lleva el motor en `estado.stats`
// (las mismas cifras de la pantalla del final, pantallas/estadisticas.ts); lo que el motor no cuenta lo recoge este recolector de los eventos
// de cada turno: el daño por movimiento, las veces que se activó cada habilidad y quién salió de inicio. Sin DOM.
import type { EntrenadorId, EstadoCombate, Evento } from '../tipos';
import type { Ganchos, Asiento } from '../partida';
import { DESESPERADA, ESPECIE } from '../datos';
import type { ModoBatalla, ResumenBatalla, ResumenJugador, ResumenUserito } from './tipos';
import { FORMATO } from './tipos';

declare const __POKEUSERA_VERSION__: string | undefined;

/** Ventaja de entrenador (docs/POKEUSERA.md, «Ventajas de entrenador»): la que lleva cada uno. */
const VENTAJA: Record<EntrenadorId, string> = { fran: 'cana', pablo: 'labia', chuchi: 'tarde', guille: 'manico' };

/** Version of the game that played the battle (the build's commit; `dev` on the dev server and in scripts). */
export const versionJuego = (): string => (typeof __POKEUSERA_VERSION__ === 'string' && __POKEUSERA_VERSION__ ? __POKEUSERA_VERSION__ : 'dev');

function idAzar(): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 14; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

/** What the engine does not count, gathered from the events of the battle. */
export class Recolector {
  /** Userito on the field of each player (index in `equipo`). */
  private activos: number[] = [];
  private inicial: number[] = [];
  /** `dano[j][i][mov]`: damage the userito `i` of player `j` did with each move. */
  private dano: Record<string, number>[][] = [];
  private habilidades: number[][] = [];
  private ultimoUso: { j: number; i: number; mov: string } | null = null;

  /** The battle begins: who is on the field. */
  inicio(estado: EstadoCombate): void {
    this.activos = estado.jugadores.map((q) => q.activo);
    this.inicial = [...this.activos];
    this.dano = estado.jugadores.map((q) => q.equipo.map(() => ({})));
    this.habilidades = estado.jugadores.map((q) => q.equipo.map(() => 0));
    this.ultimoUso = null;
  }

  /** The events of a turn (or of the replacements after it), in order. */
  eventos(evs: Evento[]): void {
    for (const ev of evs) {
      if (ev.k === 'sale') this.activos[ev.j] = ev.idx;
      else if (ev.k === 'texto' && ev.clave === 'combate.achispado_golpe') this.ultimoUso = null; // a tipsy userito hits itself instead of using its move
      else if (ev.k === 'usa') this.ultimoUso = { j: ev.j, i: this.activos[ev.j], mov: ev.mov };
      else if (ev.k === 'habilidad') {
        const i = this.activos[ev.j];
        if (this.habilidades[ev.j]?.[i] !== undefined) this.habilidades[ev.j][i]++;
      } else if (ev.k === 'golpe') {
        // A hit on another player right after a move is used: the move's damage (what burns or the bar do comes marked `fin`, and recoil lands on the user).
        const u = this.ultimoUso;
        if (u && !ev.fin && ev.j !== u.j && ev.dano > 0 && this.dano[u.j]?.[u.i]) this.dano[u.j][u.i][u.mov] = (this.dano[u.j][u.i][u.mov] ?? 0) + ev.dano;
      }
    }
  }

  /** The summary of a finished battle. `personas`: which seats were people (the rest, the machine). */
  resumen(estado: EstadoCombate, personas: boolean[], modo: ModoBatalla): ResumenBatalla {
    const ju: ResumenJugador[] = estado.jugadores.map((q, j) => ({
      en: q.entrenador,
      pe: personas[j] ? 1 : 0,
      pu: q.puesto || 1,
      ve: VENTAJA[q.entrenador],
      cu: null,
      us: q.equipo.map((u, i): ResumenUserito => {
        const s = estado.stats.u[j][i];
        const dano = this.dano[j]?.[i] ?? {};
        const mv: Record<string, [number, number]> = {};
        // Uses by slot (the species' four moves, then «A la desesperada»); damage by move id, which can also be a move it copied or improvised.
        const movs = this.movsDe(estado, j, i);
        s.mv.forEach((n, slot) => {
          if (n > 0 && movs[slot]) mv[movs[slot]] = [(mv[movs[slot]]?.[0] ?? 0) + n, 0];
        });
        for (const [id, d] of Object.entries(dano)) mv[id] = [mv[id]?.[0] ?? 0, d];
        return {
          e: u.especie,
          o: i,
          ob: u.objeto?.id ?? null,
          oa: u.objeto && (u.objeto.visto || u.objeto.gastado) ? 1 : 0,
          ini: this.inicial[j] === i ? 1 : 0,
          dh: s.dh,
          dr: s.dr,
          dp: s.dp,
          cu: s.cu,
          ko: s.ko,
          ca: s.cae > 0 ? 1 : 0,
          tf: s.tf,
          cr: s.cri,
          ha: this.habilidades[j]?.[i] ?? 0,
          mx: s.mx,
          mm: s.mx > 0 ? s.mm : '',
          mv,
        };
      }),
    }));
    return { v: FORMATO, id: idAzar(), ver: versionJuego(), f: Date.now(), mo: modo, es: estado.escenario, tu: estado.turno, su: [...estado.sucesosVistos], ju };
  }

  /** The ids of a species' moves by slot: its four, then «A la desesperada». */
  private movsDe(estado: EstadoCombate, j: number, i: number): string[] {
    return [...ESPECIE[estado.jugadores[j].equipo[i].especie].movs, DESESPERADA];
  }
}

/**
 * `ganchos` with the statistics collected on the way: when the battle ends, `alResumen` gets its summary (it must not block: the final animation goes on).
 * The seats that are not machines are people (the local player and the online guests).
 * `tokens`: asked when the battle ends, the account token of each seat (null: none); it goes into the summary's `cu` and the server swaps it for the public id.
 */
export function conEstadisticas(ganchos: Ganchos, asientos: Asiento[], modo: ModoBatalla, alResumen: (r: ResumenBatalla) => void, tokens?: () => (string | null)[]): Ganchos {
  const rec = new Recolector();
  const personas = asientos.map((a) => a.tipo !== 'bot');
  return {
    ...ganchos,
    alInicio: (estado) => {
      rec.inicio(estado);
      return ganchos.alInicio(estado);
    },
    alTurno: (eventos, estado) => {
      rec.eventos(eventos);
      return ganchos.alTurno(eventos, estado);
    },
    alReemplazo: (eventos, estado) => {
      rec.eventos(eventos);
      return ganchos.alReemplazo(eventos, estado);
    },
    alFin: (estado) => {
      try {
        const r = rec.resumen(estado, personas, modo);
        const cs = tokens?.();
        if (cs) r.ju.forEach((q, j) => (q.cu = q.pe && cs[j] ? cs[j] : null));
        alResumen(r);
      } catch (e) {
        console.warn('PokéUsera: no se pudo armar el resumen de la batalla', e);
      }
      return ganchos.alFin(estado);
    },
  };
}
