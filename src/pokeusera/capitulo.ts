// PokéUsera, el último juego del capítulo 2 (docs/CAPITULO2.md, «PokéUsera»). Es el juego de verdad (src/pokeusera/), sin cuentas, sin
// red y sin estadísticas, que se juega de pie (240 × 384–520, una Game Boy Advance) en un escenario propio (marco.ts) montado encima del juego del
// capítulo, que está en horizontal. Guille, con su jarra, se adelanta («Este es mío») y de esa frase sale esto:
//
//  1. La batalla a cuatro: Guille contra Fran, Pablo y Chuchi, con el draft entero, «La barra», «¿Quién sale primero?» y las ventajas de
//     entrenador, en el mundo de los conceptos. Tiene que quedar primero; si no, OTRA VEZ, y a partir de dos derrotas también SALTAR.
//  2. La silueta: los otros tres se caen de espaldas y algo enorme baja desde arriba (escenas de pantallas/capitulo.ts).
//  3. La caza: Guille y su equipo, recuperado, contra el Ultimosaurio salvaje (caza/batalla.ts): es mitológico, se levanta con un poco de vida
//     cuando cae, y la jarra lo caza en pocos lanzamientos. Si el equipo cae, OTRA VEZ (y SALTAR tras dos derrotas en total).
//  4. La ficha del Ultimosaurio cazado y SEGUIR.
//
// Termina con 'hecho' (cazado), 'saltado' o 'cancelado' (ABANDONAR en la caja de pausa): la historia sigue igual con cualquiera. Mientras dura,
// el aviso general de «gira el móvil» no sale (marco.ts, `permitirVertical`); al acabar, un móvil de pie vuelve a pedirlo.
//
// Rendimiento (docs/ESTILO.md, T5 y T6): todo es lo de PokéUsera (un solo bucle, 60 fps como mucho, todo horneado en lienzos; los dibujos, los
// efectos y el fondo se calientan en segundo plano mientras suena el caos, `precalentarPokeusera`). `window.__poke()` da acceso a las vistas.
import type { SonidoMinijuego } from '../core/audio';
import { cargarTextos } from '../juego/textos';
import textosInterfaz from '../textos/pokeusera.md?raw';
import textosCombate from '../textos/pokeusera-combate.md?raw';
import type { EntrenadorId, EstadoCombate } from './tipos';
import { ESPECIE, ESPECIES, ULTIMOSAURIO_ID } from './datos';
import { crearRnd, sacarAlAzar } from './motor/azar';
import { entrada } from './entrada';
import { abrirMarco, altoPrevisto, type Marco } from './marco';
import { Partida, esCancelada, type Asiento, type Ganchos } from './partida';
import { Pantalla } from './pantalla';
import { sonido } from './sonido';
import { batallaCaza } from './caza/batalla';
import { aplicarAjustes } from './pantallas/ajustes';
import { VistaBarra } from './pantallas/barra';
import { VistaCombate } from './pantallas/combate';
import { VistaDraft } from './pantallas/draft';
import { escenaSilueta, pantallaCazado, pantallaPregunta } from './pantallas/capitulo';
import { pantallaPodio, type BotonPodio } from './pantallas/podio';
import { precalentar } from './pantallas/precalentar';
import { VistaSalida } from './pantallas/salida';
import { cfg, dormir, nombreEnt, t } from './pantallas/ui';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

export interface OpcionesPokeusera {
  /** Sin esperas (las pruebas y el modo rápido del menú de minijuegos). */
  rapido?: boolean;
  /** El sonido del capítulo: su música se apaga mientras dura el juego (PokéUsera tiene el suyo). */
  sonido?: SonidoMinijuego;
  /** Prueba: va directo a la silueta y a la caza (el equipo de Guille sale al azar). */
  dino?: boolean;
  /** Prueba: Guille lo juega la máquina; llega hasta la silueta y para ahí (la caza necesita manos). */
  auto?: boolean;
  semilla?: number;
}

/** Derrotas tras las cuales sale SALTAR (como en el Pang, docs/JUGABILIDAD.md). */
const PARA_SALTAR = 2;
/** El tiempo que tiene Guille para cada cosa (nadie le espera): mucho más que en una partida entre amigos. */
const PLAZO_ELEGIR = 90000;
const PLAZO_TURNO = 120000;
const PLAZO_REEMPLAZO = 60000;

const GUILLE: EntrenadorId = 'guille';
const RIVALES: EntrenadorId[] = ['fran', 'pablo', 'chuchi'];

/** Lo que cuenta la prueba (`window.__poke()`). */
export interface EstadoPoke {
  /** 'marco' | 'cuatro' | 'silueta' | 'caza' | 'ficha' | 'fin' */
  momento: string;
  derrotas: number;
  partida: Partida | null;
  /** La vista de la batalla en curso (la de cuatro o la de la caza). */
  vc: VistaCombate | null;
  /** El equipo de Guille para la caza, si ya está. */
  equipo: string[] | null;
  resultado: Resultado | null;
  /** Fotogramas dibujados por el lienzo del juego (scripts/rendimiento.mjs). */
  readonly fotogramas: number;
  /** Cierra el juego como si se abandonara (lo usa scripts/capitulo2.mjs). */
  cerrar(): void;
}

let textosListos = false;
function cargar() {
  if (textosListos) return;
  textosListos = true;
  cargarTextos(textosInterfaz, textosCombate);
}

/** Empieza a calentar, en segundo plano, los textos, los dibujos, los efectos y el fondo del mundo de los conceptos (mientras suena el caos). */
export function precalentarPokeusera(): void {
  cargar();
  precalentar(altoPrevisto());
}

class Cancelado extends Error {}

/**
 * Juega PokéUsera. `juego` es la pantalla del capítulo (#game): se gira de golpe al empezar y se devuelve al acabar (marco.ts). Devuelve cuando el
 * escenario ya se ha quitado.
 */
export async function jugarPokeusera(juego: HTMLElement, o: OpcionesPokeusera = {}): Promise<Resultado> {
  cargar();
  aplicarAjustes();
  cfg.rapido = !!o.rapido;
  precalentar(altoPrevisto());
  o.sonido?.pararMusica(0.4);
  sonido.desbloquear();

  let marco: Marco | null = null;
  let pantalla: Pantalla | null = null;
  let partida: Partida | null = null;
  let derrotas = 0;
  const estadoPoke: EstadoPoke = {
    momento: 'marco',
    derrotas: 0,
    partida: null,
    vc: null,
    equipo: null,
    resultado: null,
    get fotogramas() {
      return pantalla?.dibujos ?? 0;
    },
    cerrar: () => cancelar(),
  };
  (window as unknown as { __poke?: () => EstadoPoke }).__poke = () => estadoPoke;

  // Abandonar (la caja de pausa) o cerrar desde fuera: todo lo que se espera se corta y el flujo acaba en 'cancelado'.
  let cancelar: () => void = () => undefined;
  const corte = new Promise<never>((_, rej) => {
    cancelar = () => {
      partida?.cancelar();
      rej(new Cancelado());
    };
  });
  corte.catch(() => undefined);
  const esperar = <T>(p: T | Promise<T>): Promise<T> => Promise.race([Promise.resolve(p), corte]);
  const momento = (m: string) => {
    estadoPoke.momento = m;
  };

  /** Una batalla a cuatro entera (draft, barra, salida, combate). Devuelve el estado final y el equipo de Guille. */
  const batallaACuatro = async (semilla: number | undefined): Promise<{ estado: EstadoCombate; equipo: string[] }> => {
    const asientos: Asiento[] = [
      { tipo: o.auto ? 'bot' : 'local', entrenador: GUILLE, nombre: nombreEnt(GUILLE) },
      ...RIVALES.map((e): Asiento => ({ tipo: 'bot', entrenador: e, nombre: nombreEnt(e) })),
    ];
    const miSeat = o.auto ? null : 0;
    const vd = new VistaDraft(asientos, miSeat);
    const vc = new VistaCombate(miSeat);
    const vb = new VistaBarra(GUILLE);
    const vs = new VistaSalida(GUILLE);
    estadoPoke.vc = vc;
    const p = pantalla!;
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
      pedirAzar: () => Promise.resolve(),
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
    partida = new Partida(asientos, ganchos, {
      semilla,
      rapido: o.rapido || o.auto,
      escenario: 'conceptos',
      plazoPickMs: PLAZO_ELEGIR,
      plazoBarraMs: PLAZO_ELEGIR,
      plazoSalidaMs: PLAZO_ELEGIR,
      plazoTurnoMs: PLAZO_TURNO,
      plazoReemplazoMs: PLAZO_REEMPLAZO,
    });
    estadoPoke.partida = partida;
    vd.escenario = partida.escenario;
    vd.alAbandonar = vb.alAbandonar = vs.alAbandonar = vc.alAbandonar = () => cancelar();
    try {
      const estado = await esperar(partida.jugar());
      return { estado, equipo: partida.equipos?.[0] ?? [] };
    } catch (e) {
      if (esCancelada(e)) throw new Cancelado();
      throw e;
    } finally {
      partida = null;
      estadoPoke.partida = null;
    }
  };

  /** Los botones de después de una derrota: OTRA VEZ y, a partir de dos derrotas, SALTAR. */
  const botonesDerrota = (): BotonPodio[] => [{ id: 'otra', texto: t('pokecap.otra'), principal: true }, ...(derrotas >= PARA_SALTAR ? [{ id: 'saltar', texto: t('pokecap.saltar') }] : [])];

  /** Las dos primeras partes: la batalla a cuatro hasta que Guille quede primero. Devuelve su equipo o 'saltado'. */
  const parteCuatro = async (): Promise<string[] | 'saltado'> => {
    let semilla = o.semilla;
    for (;;) {
      momento('cuatro');
      const { estado, equipo } = await batallaACuatro(semilla);
      semilla = undefined;
      const primero = estado.jugadores[0].puesto === 1;
      if (!primero) {
        derrotas++;
        estadoPoke.derrotas = derrotas;
      }
      if (o.auto) {
        // Prueba: un vistazo al podio (sin botones) y, si no ha ganado la máquina de Guille, otra.
        void pantallaPodio(estado, null, [], undefined, true);
        await esperar(dormir(900));
        if (primero || derrotas >= 4) return equipo;
        continue;
      }
      const botones: BotonPodio[] = primero ? [{ id: 'seguir', texto: t('pokecap.seguir'), principal: true }] : botonesDerrota();
      const id = await esperar(pantallaPodio(estado, 0, botones, primero ? undefined : t('pokecap.pista')));
      if (id === 'saltar') return 'saltado';
      if (id === 'seguir') return equipo;
    }
  };

  /** La silueta y la caza. Devuelve 'hecho' (cazado), 'saltado' o 'cancelado'. */
  const parteCaza = async (equipo: string[]): Promise<Resultado> => {
    const quien = ESPECIE[ULTIMOSAURIO_ID].nombre;
    momento('silueta');
    sonido.musica(null);
    await esperar(
      escenaSilueta({
        yo: GUILLE,
        rivales: RIVALES,
        lineas: [t('pokecap.silueta.1'), t('pokecap.silueta.2'), t('pokecap.silueta.3'), t('pokecap.silueta.4', { quien })],
      }),
    );
    if (o.auto) return 'hecho';
    for (;;) {
      momento('caza');
      const r = await esperar(
        batallaCaza({
          yo: GUILLE,
          equipo,
          salvaje: ULTIMOSAURIO_ID,
          entrenadorSalvaje: 'vinas',
          nombreSalvaje: t('caza.salvaje'),
          escenario: 'conceptos',
          textoInicio: t('pokecap.inicio', { quien }),
          semilla: o.semilla,
          plazoTurno: PLAZO_TURNO,
          alCrear: (vc) => (estadoPoke.vc = vc),
        }).then((x) => x.resultado),
      );
      if (r === 'huido') return 'cancelado';
      if (r === 'cazado') {
        await esperar(dormir(900));
        momento('ficha');
        await esperar(pantallaCazado({ id: 'seguir', texto: t('pokecap.seguir'), principal: true }));
        return 'hecho';
      }
      derrotas++;
      estadoPoke.derrotas = derrotas;
      const id = await esperar(pantallaPregunta([t('pokecap.perdido.1'), t('pokecap.perdido.2', { quien })], botonesDerrota()));
      if (id === 'saltar') return 'saltado';
    }
  };

  let resultado: Resultado = 'cancelado';
  try {
    marco = await abrirMarco(juego.parentElement ?? document.body, juego, !!o.rapido);
    const m = marco;
    pantalla = new Pantalla(m.escena);
    const p = pantalla;
    entrada.iniciar(p);
    m.alColocar = () => p.ajustar();
    // Con el móvil otra vez en horizontal (el velo de «Gira el móvil» tapa el juego) el sonido espera.
    m.alOrientar = (pie) => sonido.silenciar(!pie);
    p.ajustar();
    let equipo: string[] | 'saltado';
    if (o.dino) {
      const ids = ESPECIES.map((s) => s.id);
      equipo = sacarAlAzar(ids, 3, crearRnd(o.semilla ?? Math.floor(Math.random() * 2 ** 31)));
    } else equipo = await parteCuatro();
    if (equipo === 'saltado') resultado = 'saltado';
    else {
      estadoPoke.equipo = equipo;
      resultado = await parteCaza(equipo);
    }
  } catch (e) {
    if (!(e instanceof Cancelado)) {
      console.error('[pokeusera]', e);
    }
    resultado = 'cancelado';
  } finally {
    momento('fin');
    estadoPoke.resultado = resultado;
    sonido.musica(null);
    entrada.destruir();
    pantalla?.destruir();
    sonido.silenciar(false);
  }
  await marco?.cerrar();
  return resultado;
}
