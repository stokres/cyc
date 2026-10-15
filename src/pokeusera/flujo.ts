// PokéUsera · the flow of the game: title → menu → (guide | settings | solo | online) → trainer → draft →
// battle → podium. Solo play is a `Partida` (partida.ts) whose hooks are answered by the screens
// in pantallas/; online play (red/online.ts) runs the same `Partida` on the host and, for guests,
// drives the same screens (VistaDraft, VistaCombate, pantallaPodio) from network messages.
import { ENTRENADORES, type EntrenadorId, type EscenarioId } from './tipos';
import { ESPECIES } from './datos';
import { crearRnd, sacarAlAzar } from './motor/azar';
import { conEstadisticas } from './estadisticas/resumen';
import { registrarBatalla } from './estadisticas/almacen';
import { cuentaLocal, tokenLocal } from './cuentas/almacen';
import { pantallaNombre } from './pantallas/cuenta';
import { Partida, esCancelada, type Asiento, type Ganchos } from './partida';
import { actualizarApp, hayConexion, instalarApp } from './aplicacion';
import { pantalla } from './pantalla';
import { sonido } from './sonido';
import { cargarAjustes, escenarioElegido, guardarAjustes, pantallaAjustes } from './pantallas/ajustes';
import { VistaBarra } from './pantallas/barra';
import { VistaCombate } from './pantallas/combate';
import { abrirGuia } from './pantallas/guia';
import { abrirAcumuladas } from './pantallas/acumuladas';
import { abrirUseritopedia } from './pantallas/useritopedia';
import { VistaDraft } from './pantallas/draft';
import { VistaSalida } from './pantallas/salida';
import { pantallaEntrenador } from './pantallas/entrenador';
import { pantallaMenu, type OpcionMenu } from './pantallas/menu';
import { mensaje } from './pantallas/modal';
import { pantallaPodio, type SalidaPodio } from './pantallas/podio';
import { pantallaTitulo } from './pantallas/titulo';
import { envolver, nombreEnt, t } from './pantallas/ui';
import { jugarOnline } from './red/online';
import { jugarAventura } from './caza/flujo';

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
  /** `?escenario=brio|terraza|rural|juan|feria`: the bar of the battle (default: drawn from the seed). */
  escenario?: EscenarioId;
  /** `?barra`: with `?combate`, «La barra» and «¿Quién sale primero?» are played too (otherwise the machine gives out the objects and picks the openers). */
  barra?: boolean;
  /** `?aventura`: no title or menu, straight into AVENTURA (the one-player hunting mode); `demo`: a test adventure in memory that is never saved ('si': a starter and seven caught; 'nueva': from the beginning), with `pj` as the trainer. */
  aventura?: { demo?: 'si' | 'nueva'; pj?: EntrenadorId };
}

/** Plays one solo game (you + three machines) and shows the podium. */
export async function jugarSolo(yo: EntrenadorId, o: Pick<OpcionesFlujo, 'combate' | 'auto' | 'semilla' | 'escenario' | 'barra'>): Promise<SalidaPodio> {
  // With seven trainers, you pick one and the other three seats get three of the six left, at random (docs/POKEUSERA.md, «Ventajas de entrenador»).
  // The seed is fixed here so `?semilla=N` repeats the whole game; it has its own generator, so the rest of the battle draws the same numbers as ever.
  const semilla = o.semilla ?? Math.floor(Math.random() * 2 ** 31);
  const otros = sacarAlAzar(ENTRENADORES.filter((e) => e !== yo), 3, crearRnd(semilla ^ 0x3c6ef372));
  const asientos: Asiento[] = [
    { tipo: o.auto ? 'bot' : 'local', entrenador: yo, nombre: nombreEnt(yo) },
    ...otros.map((e): Asiento => ({ tipo: 'bot', entrenador: e, nombre: nombreEnt(e) })),
  ];
  const miSeat = o.auto ? null : 0;
  const vd = new VistaDraft(asientos, miSeat);
  const vc = new VistaCombate(miSeat);
  const vb = new VistaBarra(yo);
  const vs = new VistaSalida(yo);
  let equipos: string[][] | undefined;
  if (o.combate) {
    // A random team of three each, from all of them.
    const rnd = crearRnd(semilla);
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
    pedirObjeto: (_j, ofertas, especies, ms) => {
      p.poner(vb);
      return vb.pedir(ofertas, especies, ms);
    },
    pedirSalida: (_j, especies, objetos, ms) => {
      p.poner(vs);
      return vs.pedir(especies, objetos, ms);
    },
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
  const partida = new Partida(asientos, conEstadisticas(ganchos, asientos, 'maquina', registrarBatalla, () => asientos.map((a) => (a.tipo === 'local' ? tokenLocal() : null))), { semilla, rapido: o.auto, equipos, escenario: o.escenario ?? escenarioElegido(), barra: o.barra });
  vd.escenario = partida.escenario;
  vd.alAbandonar = vb.alAbandonar = vs.alAbandonar = vc.alAbandonar = () => partida.cancelar();
  (window as unknown as { __pokeusera?: unknown }).__pokeusera = { partida, vc, vd, vb, vs };
  try {
    const estado = await partida.jugar();
    return await pantallaPodio(estado, miSeat, o.auto);
  } catch (e) {
    if (esCancelada(e)) return 'menu';
    throw e;
  }
}

async function jugarVarias(yo: EntrenadorId, o: Pick<OpcionesFlujo, 'combate' | 'auto' | 'semilla' | 'escenario' | 'barra'>) {
  // «OTRA»: same trainer, a new draft.
  while ((await jugarSolo(yo, o)) === 'otra') o = { ...o, combate: false, semilla: undefined };
}

export async function ejecutar(o: OpcionesFlujo): Promise<void> {
  if (o.aventura) await jugarAventura(o.aventura);
  else if (o.combate || o.draft || o.auto) {
    const yo = o.pj ?? cargarAjustes().entrenador ?? ENTRENADORES[0];
    if (o.auto) {
      await jugarSolo(yo, o);
      return;
    }
    await jugarVarias(yo, o);
  }
  /** «MÁS TARDE» in the name screen: not asked again until the game is opened anew. */
  let nombreAplazado = false;
  for (;;) {
    await pantallaTitulo();
    // First time (no account on this phone): «¿Cómo te llamas?» after the title, before the menu (docs/POKEUSERA.md, «Cuentas»).
    if (!cuentaLocal() && !nombreAplazado && (await pantallaNombre()) === 'luego') nombreAplazado = true;
    let ultima: OpcionMenu = 'solo';
    for (;;) {
      const m = await pantallaMenu(ultima);
      if (m === 'titulo') break;
      ultima = m;
      if (m === 'ajustes') await pantallaAjustes();
      else if (m === 'guia') await abrirGuia(null);
      else if (m === 'useritopedia') await abrirUseritopedia(null);
      else if (m === 'estadisticas') await abrirAcumuladas();
      else if (m === 'aventura') await jugarAventura({});
      else if (m === 'online') {
        // Without connection there is no room: say so (solo play, the Useritopedia and the guide work offline).
        if (hayConexion()) await enlaces.jugarOnline();
        else await mensaje(pantalla().escena, envolver(t('pwa.sinconexion'), 190));
      } else if (m === 'actualizar') actualizarApp();
      else if (m === 'instalar') {
        // Android/Chrome: the browser's prompt. iPhone/Safari has none: two steps.
        if ((await instalarApp()) === 'pasos') {
          const lineas = [t('pwa.ios.titulo'), ...envolver(t('pwa.ios.1'), 190), ...envolver(t('pwa.ios.2'), 190)];
          await mensaje(pantalla().escena, lineas);
        }
      } else if (m === 'solo') {
        const yo = await pantallaEntrenador();
        if (!yo) continue;
        guardarAjustes({ entrenador: yo });
        await jugarVarias(yo, { combate: false, auto: false });
      }
    }
  }
}
