// PokéUsera · the flow of the game: title → menu → (guide | settings | solo | online) → trainer → draft →
// battle → podium. Solo play is a `Partida` (partida.ts) whose hooks are answered by the screens
// in pantallas/; online play (red/online.ts) runs the same `Partida` on the host and, for guests,
// drives the same screens (VistaDraft, VistaCombate, pantallaPodio) from network messages.
import { ENTRENADORES, type EntrenadorId } from './tipos';
import { ESPECIES } from './datos';
import { crearRnd } from './motor/azar';
import { Partida, esCancelada, type Asiento, type Ganchos } from './partida';
import { pantalla } from './pantalla';
import { sonido } from './sonido';
import { cargarAjustes, guardarAjustes, pantallaAjustes } from './pantallas/ajustes';
import { VistaCombate } from './pantallas/combate';
import { abrirGuia } from './pantallas/guia';
import { abrirUseritopedia } from './pantallas/useritopedia';
import { VistaDraft } from './pantallas/draft';
import { pantallaEntrenador } from './pantallas/entrenador';
import { pantallaMenu, type OpcionMenu } from './pantallas/menu';
import { pantallaPodio, type SalidaPodio } from './pantallas/podio';
import { pantallaTitulo } from './pantallas/titulo';
import { nombreEnt } from './pantallas/ui';
import { jugarOnline } from './red/online';

/** Entry points other parts of the game replace. */
export const enlaces = {
  /** «JUGAR ONLINE» in the menu: password, room, game (src/pokeusera/red/); it returns when the player is back at the menu. */
  jugarOnline,
};

export interface OpcionesFlujo {
  /** `?combate`: no title, no draft: a random team and straight into battle. */
  combate: boolean;
  /** `?draft`: no title or menu, straight to the draft. */
  draft: boolean;
  /** `?auto`: your seat is a machine too, fast animations (smoke test). */
  auto: boolean;
  semilla?: number;
  pj?: EntrenadorId;
}

/** Plays one solo game (you + three machines) and shows the podium. */
export async function jugarSolo(yo: EntrenadorId, o: Pick<OpcionesFlujo, 'combate' | 'auto' | 'semilla'>): Promise<SalidaPodio> {
  const otros = ENTRENADORES.filter((e) => e !== yo);
  const asientos: Asiento[] = [
    { tipo: o.auto ? 'bot' : 'local', entrenador: yo, nombre: nombreEnt(yo) },
    ...otros.map((e): Asiento => ({ tipo: 'bot', entrenador: e, nombre: nombreEnt(e) })),
  ];
  const miSeat = o.auto ? null : 0;
  const vd = new VistaDraft(asientos, miSeat);
  const vc = new VistaCombate(miSeat);
  let equipos: string[][] | undefined;
  if (o.combate) {
    // A random team of three each, from the 20.
    const rnd = crearRnd(o.semilla ?? Math.floor(Math.random() * 2 ** 31));
    const ids = ESPECIES.map((s) => s.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const k = Math.floor(rnd() * (i + 1));
      [ids[i], ids[k]] = [ids[k], ids[i]];
    }
    equipos = asientos.map((_, j) => ids.slice(j * 3, j * 3 + 3));
  }
  const p = pantalla();
  let enDraft = false;
  const ganchos: Ganchos = {
    pedirPick: () => vd.pedirPick(),
    pedirEleccion: (j, estado, ms) => vc.pedirEleccion(j, estado, ms),
    pedirReemplazo: (j, estado, ms) => vc.pedirReemplazo(j, estado, ms),
    alDraft: (draft, turnoDe, ms) => {
      if (!enDraft) {
        enDraft = true;
        sonido.musica('draft');
        p.poner(vd);
      }
      return vd.alDraft(draft, turnoDe, ms);
    },
    alInicio: (estado) => {
      p.poner(vc);
      return vc.alInicio(estado);
    },
    alTurno: (ev, estado) => vc.alTurno(ev, estado),
    alReemplazo: (ev, estado) => vc.alReemplazo(ev, estado),
    alFin: (estado) => vc.alFin(estado),
  };
  const partida = new Partida(asientos, ganchos, { semilla: o.semilla, rapido: o.auto, equipos });
  vd.alAbandonar = vc.alAbandonar = () => partida.cancelar();
  (window as unknown as { __pokeusera?: unknown }).__pokeusera = { partida, vc, vd };
  try {
    const estado = await partida.jugar();
    return await pantallaPodio(estado, miSeat, o.auto);
  } catch (e) {
    if (esCancelada(e)) return 'menu';
    throw e;
  }
}

async function jugarVarias(yo: EntrenadorId, o: Pick<OpcionesFlujo, 'combate' | 'auto' | 'semilla'>) {
  // «OTRA»: same trainer, a new draft.
  while ((await jugarSolo(yo, o)) === 'otra') o = { ...o, combate: false, semilla: undefined };
}

export async function ejecutar(o: OpcionesFlujo): Promise<void> {
  if (o.combate || o.draft || o.auto) {
    const yo = o.pj ?? cargarAjustes().entrenador ?? ENTRENADORES[0];
    if (o.auto) {
      await jugarSolo(yo, o);
      return;
    }
    await jugarVarias(yo, o);
  }
  for (;;) {
    await pantallaTitulo();
    let ultima: OpcionMenu = 'solo';
    for (;;) {
      const m = await pantallaMenu(ultima);
      if (m === 'titulo') break;
      ultima = m;
      if (m === 'ajustes') await pantallaAjustes();
      else if (m === 'guia') await abrirGuia(null);
      else if (m === 'useritopedia') await abrirUseritopedia(null);
      else if (m === 'online') await enlaces.jugarOnline();
      else if (m === 'solo') {
        const yo = await pantallaEntrenador();
        if (!yo) continue;
        guardarAjustes({ entrenador: yo });
        await jugarVarias(yo, { combate: false, auto: false });
      }
    }
  }
}
