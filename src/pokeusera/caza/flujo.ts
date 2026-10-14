// PokéUsera · AVENTURA: the flow of the one-player hunting mode. Trainer → starter → MAP → bar (search wild useritos, challenge the
// boss, team) → … → the final. Everything is saved after each change (localStorage `pokeusera.caza.v1`), except in the test modes
// (`?aventura&demo`, `?aventura&demo=nueva`), which never touch the saved adventure.
import { ENTRENADORES, type EntrenadorId } from '../tipos';
import { ESPECIE, ESPECIES } from '../datos';
import { pantalla } from '../pantalla';
import { sonido } from '../sonido';
import { pantallaEntrenador } from '../pantallas/entrenador';
import { mensaje } from '../pantallas/modal';
import { envolver, nombreEnt, t } from '../pantallas/ui';
import { batallaCaza, nombreSalvaje, type ResultadoCaza } from './batalla';
import { confirmar } from './comun';
import { pantallaEquipo } from './equipo';
import { pantallaInicial } from './inicial';
import { pantallaMapa } from './mapa';
import {
  ESCALA_FINAL,
  MAX_EQUIPO,
  ZONAS,
  borrarAventura,
  cargarAventura,
  equipoJefe,
  equiposFinal,
  guardarAventura,
  jefeDe,
  nuevaAventura,
  salvajeDe,
  type Aventura,
} from './modelo';
import { pantallaZona } from './zona';

export interface OpcionesAventura {
  /** 'si': a test adventure in memory (a starter and seven caught, bar 2 open), never saved. 'nueva': the beginning, never saved. */
  demo?: 'si' | 'nueva';
  /** The trainer (only with `demo`: skips the pick; 'si' without it uses Fran). */
  pj?: EntrenadorId;
}

/** Wraps each text to the width of a message box and joins them. */
const parrafos = (...textos: string[]): string[] => textos.flatMap((s) => envolver(s, 190));

/** The test adventure: the starter plus seven caught from bars 1 and 2, a team of three and the first boss beaten. */
function aventuraDemo(pj: EntrenadorId): Aventura {
  const a = nuevaAventura(pj, 'draguserin');
  a.cazados.push('turito', 'aceituna', 'p', 'espumarro', 'cierzon', 'jesuspelo', 'cubatillo');
  a.equipo = ['draguserin', 'turito', 'aceituna'];
  a.jefes = [true, false, false, false];
  return a;
}

/** Plays the adventure until the player goes back to the menu. */
export async function jugarAventura(o: { demo?: 'si' | 'nueva'; pj?: EntrenadorId } = {}): Promise<void> {
  const demo = !!o.demo;
  const guardar = (a: Aventura) => {
    if (!demo) guardarAventura(a);
  };
  let pj = o.pj;
  let a: Aventura | null = o.demo === 'si' ? aventuraDemo(pj ?? 'fran') : demo ? null : cargarAventura();
  for (;;) {
    // No adventure yet (or «EMPEZAR DE NUEVO»): trainer, starter, welcome.
    while (!a) {
      const yo = pj ?? (await pantallaEntrenador());
      if (!yo) return;
      const inicial = await pantallaInicial(yo);
      if (!inicial) {
        // VOLVER: back to the trainer pick (when the trainer was given in the shortcut there is nothing to go back to).
        if (pj) return;
        continue;
      }
      a = nuevaAventura(yo, inicial);
      guardar(a);
      await mensaje(pantalla().escena, parrafos(t('caza.intro.1', { nombre: nombreEnt(yo) }), t('caza.intro.2'), t('caza.intro.3')));
    }
    pj = undefined;
    if ((await jugarMapa(a, guardar)) === 'volver') return;
    // «EMPEZAR DE NUEVO» (already confirmed): wipe it and start from the trainer pick.
    if (!demo) borrarAventura();
    a = null;
  }
}

/** The map loop; returns 'volver' (to the menu) or 'nueva' (start over, confirmed). */
async function jugarMapa(a: Aventura, guardar: (a: Aventura) => void): Promise<'volver' | 'nueva'> {
  let fila = -1;
  for (;;) {
    sonido.musica('titulo');
    const r = await pantallaMapa(a, fila);
    fila = r.fila;
    if (r.op === 'volver') return 'volver';
    if (r.op === 'zona') await jugarBar(a, r.i, guardar);
    else if (r.op === 'equipo') {
      await pantallaEquipo(a);
      guardar(a);
    } else if (r.op === 'final') await jugarFinal(a, guardar);
    else if (r.op === 'nueva') {
      if (await confirmar(pantalla().escena, parrafos(t('caza.nueva.1'), t('caza.nueva.2')))) return 'nueva';
    }
  }
}

/** A bar's loop: BUSCAR / RETAR / EQUIPO / VOLVER. */
async function jugarBar(a: Aventura, i: number, guardar: (a: Aventura) => void): Promise<void> {
  let fila = 0;
  for (;;) {
    sonido.musica('titulo');
    const r = await pantallaZona(a, i, fila);
    fila = r.fila;
    if (r.op === 'volver') return;
    if (r.op === 'equipo') {
      await pantallaEquipo(a);
      guardar(a);
    } else if (r.op === 'buscar') await buscar(a, i, guardar);
    else await retarJefe(a, i, guardar);
  }
}

/** One wild encounter in bar `i`. */
async function buscar(a: Aventura, i: number, guardar: (a: Aventura) => void): Promise<void> {
  const z = ZONAS[i];
  const id = salvajeDe(a, i, Math.random);
  const quien = ESPECIE[id].nombre;
  a.encuentros++;
  guardar(a);
  const { resultado, vista } = await batallaCaza({
    yo: a.entrenador,
    equipo: a.equipo,
    rivales: [{ entrenador: jefeDe(a, i), nombre: nombreSalvaje(), especies: [id], escala: z.escalaSalvaje }],
    escenario: z.escenario,
    salvaje: true,
    yaLoTienes: a.cazados.includes(id),
    textoInicio: t('caza.aparece', { quien }),
  });
  let lineas: string[];
  if (resultado === 'cazado') {
    const nuevo = !a.cazados.includes(id);
    if (nuevo) a.cazados.push(id);
    const alEquipo = nuevo && a.equipo.length < MAX_EQUIPO;
    if (alEquipo) a.equipo.push(id);
    lineas = parrafos(t('caza.cazado.1', { quien }), t(alEquipo ? 'caza.cazado.equipo' : 'caza.cazado.furgo'));
    if (nuevo && z.salvajes.every((s) => a.cazados.includes(s))) lineas.push(...parrafos(t('caza.cazado.completo')));
    lineas.push(...parrafos(t('caza.cazado.cuenta', { n: a.cazados.length, total: ESPECIES.length })));
    guardar(a);
  } else lineas = parrafos(...textosFin(resultado, { quien }));
  await mensaje(vista, lineas);
}

/** The lines that close a battle that was not a catch. */
function textosFin(r: Exclude<ResultadoCaza, 'cazado'>, vars: Record<string, string>): string[] {
  if (r === 'ganado') return [t('caza.ganado', vars)];
  if (r === 'perdido') return [t('caza.perdido.1'), t('caza.perdido.2')];
  return [t('caza.huido')];
}

/** The boss of bar `i`. A first win opens the next bar (or the final). */
async function retarJefe(a: Aventura, i: number, guardar: (a: Aventura) => void): Promise<void> {
  const z = ZONAS[i];
  const jefe = jefeDe(a, i);
  const quien = nombreEnt(jefe);
  const { resultado, vista } = await batallaCaza({
    yo: a.entrenador,
    equipo: a.equipo,
    rivales: [{ entrenador: jefe, nombre: quien, especies: equipoJefe(a, i), escala: z.escalaJefe }],
    escenario: z.escenario,
    salvaje: false,
    textoInicio: t('caza.jefe.inicio', { quien }),
  });
  let lineas: string[];
  if (resultado === 'ganado') {
    if (a.jefes[i]) lineas = parrafos(t('caza.jefe.gana.1', { quien }), t('caza.jefe.repite'));
    else {
      a.jefes[i] = true;
      guardar(a);
      lineas = parrafos(t('caza.jefe.gana.1', { quien }), i + 1 < ZONAS.length ? t('caza.jefe.abre', { bar: t(`escenario.${ZONAS[i + 1].escenario}`) }) : t('caza.jefe.final'));
    }
  } else if (resultado === 'perdido') lineas = parrafos(t('caza.jefe.pierde', { quien }), t('caza.perdido.2'));
  else lineas = parrafos(t('caza.huido'));
  await mensaje(vista, lineas);
}

/** The final: the three friends at once, all against all. */
async function jugarFinal(a: Aventura, guardar: (a: Aventura) => void): Promise<void> {
  const otros = ENTRENADORES.filter((e) => e !== a.entrenador);
  const equipos = equiposFinal(a);
  const { resultado, vista } = await batallaCaza({
    yo: a.entrenador,
    equipo: a.equipo,
    rivales: otros.map((e, k) => ({ entrenador: e, nombre: nombreEnt(e), especies: equipos[k], escala: ESCALA_FINAL })),
    escenario: 'brio',
    salvaje: false,
    textoInicio: t('caza.final.inicio'),
  });
  let lineas: string[];
  if (resultado === 'ganado') {
    a.campeon = true;
    guardar(a);
    lineas = parrafos(t('caza.final.gana.1'), t('caza.final.gana.2'));
  } else if (resultado === 'perdido') lineas = parrafos(t('caza.final.pierde'));
  else lineas = parrafos(t('caza.huido'));
  await mensaje(vista, lineas);
}
