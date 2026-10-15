// PokéUsera · ESTADÍSTICAS del menú: lo acumulado de todas las batallas (docs/POKEUSERA.md, «Estadísticas acumuladas»). No es la pantalla del final de
// una batalla (estadisticas.ts): esta suma las de todos (las que guarda el servidor) o las de este móvil, y se pasa por páginas como aquella:
// USERITOS, MOVIMIENTOS, TIPOS, OBJETOS, ESCENARIOS, ENTRENADORES, RÉCORDS y YO (lo de mi cuenta, docs/POKEUSERA.md, «Cuentas»). Arriba, fijo: ◀ página ▶, «DE TODOS / EN ESTE MÓVIL», «TODAS / SOLO PERSONAS»,
// el total de batallas y, en las páginas con ranking, los botones de orden (tocar el que ya está elegido lo invierte).
// Rendimiento (como la Useritopedia): `estatica`, y `paso` solo devuelve true mientras se desliza, mientras se hornean filas y al hornear de fondo.
// La cabecera es un lienzo horneado por estado; cada fila, otro (240×alto), horneado al hacerse visible (4 por fotograma como mucho) y el resto en
// los fotogramas libres, así que un fotograma son unos pocos drawImage. Nada se mide ni se envuelve por fotograma.
import { ENTRENADORES, ESCENARIOS, OBJETOS, type EntrenadorId, type EscenarioId, type ObjetoId, type SucesoId, type Tipo } from '../tipos';
import { ESPECIE, ESPECIES, MOVS, SUCESOS, TIPOS } from '../datos';
import { agregadoDeTodos, agregadoLocal, type DeTodos } from '../estadisticas/almacen';
import { cuentaLocal, estadisticasDeCuenta, type DeCuenta } from '../cuentas/almacen';
import { cargarAventura, ZONAS } from '../caza/modelo';
import { RECORDS, seccionDe } from '../estadisticas/agregado.mjs';
import type { Agregado, Marca, ResumenCuenta, Seccion } from '../estadisticas/tipos';
import { anchoTexto2 } from '../arte2/fuente2';
import { TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { hornear, panelCacheado, relleno } from '../arte2/ui2';
import { COLOR_TIPO } from '../arte/paleta';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { miniatura } from './fondos';
import { iconoObjeto } from './iconosObjeto';
import { barraArriba, barraValor, boton, chipTipo, colorEnt, envolver, ficha, fondoPapel, flecha, recortar, rect, t, texto2 } from './ui';

// ------------------------------------------------------------------ the pages and what they list

type Pagina = 'useritos' | 'movs' | 'tipos' | 'objetos' | 'escenarios' | 'entrenadores' | 'records' | 'yo';
const PAGINAS: Pagina[] = ['useritos', 'movs', 'tipos', 'objetos', 'escenarios', 'entrenadores', 'records', 'yo'];
type Fuente = 'todos' | 'movil';
type Filtro = 'todas' | 'personas';

/** How a measure is written: whole numbers, one decimal, or a percentage. */
type Formato = 'int' | 'dec' | 'pct';
/** The measures: `asc`: lower is better (the place), so it sorts upwards first and its bar grows as the value falls. */
const MEDIDAS: Record<string, { fmt: Formato; asc?: boolean }> = {
  eleg: { fmt: 'int' },
  vict: { fmt: 'pct' },
  puesto: { fmt: 'dec', asc: true },
  dano: { fmt: 'int' },
  ko: { fmt: 'dec' },
  cae: { fmt: 'pct' },
  cura: { fmt: 'int' },
  crit: { fmt: 'dec' },
  ini: { fmt: 'pct' },
  usos: { fmt: 'int' },
  total: { fmt: 'int' },
  media: { fmt: 'int' },
  act: { fmt: 'pct' },
  bat: { fmt: 'int' },
  tur: { fmt: 'dec' },
  pct: { fmt: 'pct' },
  reci: { fmt: 'int' },
  part: { fmt: 'int' },
};

/** One thing in a ranking (a userito, a move, a type...): `n` samples (0 = no data) and its measures. */
interface Item {
  id: string;
  nombre: string;
  n: number;
  m: Record<string, number>;
  color: string;
  /** Paints its picture in the 32×32 box at (x, y). */
  icono?: (cx: CanvasRenderingContext2D, x: number, y: number) => void;
}
interface Grupo {
  titulo?: string;
  items: Item[];
}
interface Vista {
  grupos: Grupo[];
  /** The sort buttons, and the measures written in each row (one array per line). */
  chips: string[];
  lineas: string[][];
}
/** A card of the RÉCORDS page. */
interface Tarjeta {
  titulo: string;
  valor: string;
  detalle: string;
  pie: string;
  icono?: (cx: CanvasRenderingContext2D, x: number, y: number) => void;
}

const COLOR_BARRA = '#e8c25a';
const media = (suma: number, n: number): number => (n > 0 ? suma / n : 0);
const pct = (parte: number, n: number): number => (n > 0 ? (100 * parte) / n : 0);

function itemEspecie(id: string, nombre: string, tipos: readonly Tipo[], e: Seccion['esp'][string] | undefined): Item {
  const n = e?.n ?? 0;
  return {
    id,
    nombre,
    n,
    color: COLOR_TIPO[tipos[0]],
    m: e
      ? { eleg: n, vict: pct(e.g, n), puesto: media(e.pu, n), dano: media(e.dh, n), ko: media(e.ko, n), cae: pct(e.ca, n), cura: media(e.cu, n), crit: media(e.cr, n), ini: pct(e.ini, n) }
      : {},
    icono: (cx, x, y) => cx.drawImage(miniatura(id), x, y),
  };
}

function vistaUseritos(s: Seccion): Vista {
  return {
    grupos: [{ items: ESPECIES.map((sp) => itemEspecie(sp.id, sp.nombre, sp.tipos, s.esp[sp.id])) }],
    chips: ['eleg', 'vict', 'puesto', 'dano', 'ko', 'cae'],
    lineas: [
      ['eleg', 'vict', 'puesto'],
      ['dano', 'ko', 'cae'],
      ['cura', 'crit', 'ini'],
    ],
  };
}

function vistaMovs(s: Seccion): Vista {
  const items: Item[] = Object.entries(s.mov).flatMap(([id, a]) => {
    const mov = MOVS[id];
    if (!mov) return [];
    return [
      {
        id,
        nombre: mov.nombre,
        n: a.u,
        color: COLOR_TIPO[mov.tipo],
        // A move that never did damage (a status move) shows only its uses.
        m: (a.d > 0 ? { usos: a.u, total: a.d, media: a.u > 0 ? a.d / a.u : 0 } : { usos: a.u }) as Record<string, number>,
        icono: (cx: CanvasRenderingContext2D, x: number, y: number) => chipTipo(cx, mov.tipo, x + 6, y + 10),
      },
    ];
  });
  return { grupos: [{ items }], chips: ['usos', 'total', 'media'], lineas: [['usos', 'total', 'media']] };
}

function vistaTipos(s: Seccion): Vista {
  const items = TIPOS.map((tipo): Item => {
    const a = { n: 0, g: 0, pu: 0, dh: 0, ko: 0, ca: 0 };
    for (const sp of ESPECIES) {
      const e = s.esp[sp.id];
      if (!e || !(sp.tipos as readonly Tipo[]).includes(tipo)) continue;
      a.n += e.n;
      a.g += e.g;
      a.pu += e.pu;
      a.dh += e.dh;
      a.ko += e.ko;
      a.ca += e.ca;
    }
    return {
      id: tipo,
      nombre: t(`tipo.${tipo}`),
      n: a.n,
      color: COLOR_TIPO[tipo],
      m: a.n ? { eleg: a.n, vict: pct(a.g, a.n), puesto: media(a.pu, a.n), dano: media(a.dh, a.n), ko: media(a.ko, a.n), cae: pct(a.ca, a.n) } : {},
      icono: (cx, x, y) => chipTipo(cx, tipo, x + 6, y + 10),
    };
  });
  return {
    grupos: [{ items }],
    chips: ['eleg', 'vict', 'puesto', 'dano', 'ko', 'cae'],
    lineas: [
      ['eleg', 'vict', 'puesto'],
      ['dano', 'ko', 'cae'],
    ],
  };
}

function vistaObjetos(s: Seccion): Vista {
  const items = OBJETOS.map((id: ObjetoId): Item => {
    const a = s.obj[id];
    const n = a?.n ?? 0;
    return {
      id,
      nombre: t(`objeto.${id}.nombre`),
      n,
      color: COLOR_BARRA,
      m: a ? { eleg: n, act: pct(a.a, n), vict: pct(a.g, n), puesto: media(a.pu, n), dano: media(a.dh, n), ko: media(a.ko, n) } : {},
      icono: (cx, x, y) => cx.drawImage(iconoObjeto(id), 0, 0, 12, 12, x + 4, y + 4, 24, 24),
    };
  });
  return {
    grupos: [{ items }],
    chips: ['eleg', 'act', 'vict', 'puesto', 'dano', 'ko'],
    lineas: [
      ['eleg', 'act', 'vict'],
      ['puesto', 'dano', 'ko'],
    ],
  };
}

function vistaEscenarios(s: Seccion): Vista {
  const bares = ESCENARIOS.map((id: EscenarioId): Item => {
    const a = s.esc[id];
    const n = a?.n ?? 0;
    return { id, nombre: t(`escenario.${id}`), n, color: COLOR_BARRA, m: a ? { bat: n, tur: media(a.tu, n), pct: pct(n, s.n) } : {} };
  });
  const sucesos = (Object.keys(SUCESOS) as SucesoId[]).map((id): Item => {
    const n = s.suc[id] ?? 0;
    return { id, nombre: t(`suceso.${id}.nombre`), n, color: COLOR_BARRA, m: n ? { bat: n, pct: pct(n, s.n) } : {} };
  });
  return {
    grupos: [
      { titulo: t('acum.grupo.escenarios'), items: bares },
      { titulo: t('acum.grupo.sucesos'), items: sucesos },
    ],
    chips: ['bat', 'tur', 'pct'],
    lineas: [['bat', 'tur', 'pct']],
  };
}

/** With accounts (everybody's, from the server) the table lists the players by their account names; without them, the four trainers. */
function vistaEntrenadores(s: Seccion, cuentas: ResumenCuenta[]): Vista {
  const deCuentas = cuentas.map((c): Item => {
    const fav = ENTRENADORES.includes(c.fav as EntrenadorId) ? (c.fav as EntrenadorId) : null;
    return {
      id: c.id,
      nombre: c.nombre,
      n: c.n,
      color: fav ? colorEnt(fav) : COLOR_BARRA,
      m: { part: c.n, vict: pct(c.g, c.n), puesto: media(c.pu, c.n), dano: media(c.dh, c.n), ko: media(c.ko, c.n), reci: media(c.dr, c.n) },
      icono: fav ? (cx, x, y) => ficha(cx, fav, x + 4, y + 4, 24) : undefined,
    };
  });
  const items = cuentas.length
    ? deCuentas
    : ENTRENADORES.map((id: EntrenadorId): Item => {
        const a = s.ent[id];
        const n = a?.n ?? 0;
        return {
          id,
          nombre: t(`entrenador.${id}`),
          n,
          color: colorEnt(id),
          m: a ? { part: n, vict: pct(a.g, n), puesto: media(a.pu, n), dano: media(a.dh, n), ko: media(a.ko, n), reci: media(a.dr, n) } : {},
          icono: (cx, x, y) => ficha(cx, id, x + 4, y + 4, 24),
        };
      });
  return {
    grupos: [{ items }],
    chips: ['part', 'vict', 'puesto', 'dano', 'ko'],
    lineas: [
      ['part', 'vict', 'puesto'],
      ['dano', 'reci', 'ko'],
    ],
  };
}

const fecha = (f: number): string => {
  const d = new Date(f);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};
const entero = (v: number): string => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** The records that exist, in the order of `RECORDS` (agregado.mjs). */
function tarjetas(s: Seccion, orden: readonly string[], nombreDe: (cu: string) => string | undefined): Tarjeta[] {
  const out: Tarjeta[] = [];
  for (const id of orden) {
    const r: Marca | undefined = s.rec[id];
    if (!r) continue;
    const persona = r.cu ? nombreDe(r.cu) : undefined;
    const vars = {
      v: entero(r.v),
      userito: r.e ? (ESPECIE[r.e]?.nombre ?? r.e) : '',
      mov: r.m ? (MOVS[r.m]?.nombre ?? r.m) : '',
      quien: persona ?? (r.en ? t(`entrenador.${r.en}`) : ''),
      bar: r.es ? t(`escenario.${r.es}`) : '',
    };
    const e = r.e;
    out.push({
      titulo: t(`acum.rec.${id}`),
      valor: vars.v,
      detalle: t(`acum.rec.${id}.d`, vars),
      pie: (persona || r.en) && id !== 'danoj' ? t('acum.rec.pie.con', { quien: vars.quien, fecha: fecha(r.f) }) : t('acum.rec.pie.sin', { fecha: fecha(r.f) }),
      icono: e ? (cx, x, y) => cx.drawImage(miniatura(e), x, y) : r.en ? (cx, x, y) => ficha(cx, r.en!, x + 4, y + 4, 24) : undefined,
    });
  }
  return out;
}

/** The YO page: my numbers as cards (the same rows as the records). `yo`: what the server has of my account; the Aventura is read from this phone. */
function tarjetasYo(yo: DeCuenta): Tarjeta[] {
  const s = seccionDe(yo.ag, true);
  const n = s.n;
  let g = 0;
  let dh = 0;
  let ko = 0;
  for (const e of Object.values(s.ent)) {
    g += e.g;
    dh += e.dh;
    ko += e.ko;
  }
  const out: Tarjeta[] = [];
  const tj = (clave: string, valor: string, vars: Record<string, string | number>, icono?: Tarjeta['icono'], pie = ''): void => {
    out.push({ titulo: t(`acum.yo.${clave}`), valor, detalle: t(`acum.yo.${clave}.d`, vars), pie, icono });
  };
  out.push({ titulo: t('acum.yo.bat'), valor: entero(n), detalle: t('acum.yo.bat.d', { g, p: n - g }), pie: t('acum.yo.bat.pie', { fecha: fecha(yo.ag.desde) }) });
  tj('vict', `${Math.round(pct(g, n))}%`, { g, n });
  tj('racha', entero(yo.racha.a), { m: yo.racha.m });
  // Favourite: the most picked; the one that wins most: best win rate among those picked at least twice (any, if there are none).
  const lista = Object.entries(s.esp).filter(([id]) => ESPECIE[id]);
  const fav = [...lista].sort((a, b) => b[1].n - a[1].n)[0];
  if (fav) {
    const [id, e] = fav;
    out.push({
      titulo: t('acum.yo.fav'),
      valor: `x${entero(e.n)}`,
      detalle: t('acum.yo.fav.d', { userito: ESPECIE[id].nombre, v: entero(e.n) }),
      pie: t('acum.yo.fav.pie', { pct: Math.round(pct(e.n, n)) }),
      icono: (cx, x, y) => cx.drawImage(miniatura(id), x, y),
    });
  }
  const repetidos = lista.filter(([, e]) => e.n >= 2 && e.g > 0);
  const gana = [...(repetidos.length ? repetidos : lista.filter(([, e]) => e.g > 0))].sort((a, b) => b[1].g / b[1].n - a[1].g / a[1].n || b[1].g - a[1].g)[0];
  if (gana) {
    const [id, e] = gana;
    out.push({
      titulo: t('acum.yo.gana'),
      valor: `${Math.round(pct(e.g, e.n))}%`,
      detalle: t('acum.yo.gana.d', { userito: ESPECIE[id].nombre }),
      pie: t('acum.yo.gana.pie', { g: e.g, n: e.n }),
      icono: (cx, x, y) => cx.drawImage(miniatura(id), x, y),
    });
  }
  tj('dano', entero(dh), { media: entero(media(dh, n)) });
  tj('ko', entero(ko), { media: escribir(media(ko, n), 'dec') });
  // The Aventura: read from this phone (the key the hunting mode writes).
  const av = cargarAventura();
  if (av) {
    out.push({
      titulo: t('acum.yo.aventura'),
      valor: `${av.cazados.length}/${ESPECIES.length}`,
      detalle: t('acum.yo.aventura.d', { bares: av.jefes.filter(Boolean).length, total: ZONAS.length }),
      pie: av.campeon ? t('acum.yo.aventura.campeon') : '',
    });
  } else out.push({ titulo: t('acum.yo.aventura'), valor: '-', detalle: t('acum.yo.aventura.sin'), pie: '' });
  return out;
}

// ------------------------------------------------------------------ writing numbers

function escribir(v: number, f: Formato): string {
  if (f === 'pct') return `${Math.round(v)}%`;
  if (f === 'dec') return (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  return entero(v);
}

// ------------------------------------------------------------------ the screen

const X0 = 4;
const AN = ANCHO - 8;
const XTEXTO = 46;
/** Distance between the columns of measures: 60 px next to a picture, 72 without one. */
const PASO_COL = 60;
const PASO_COL_SIN = 72;
const ALTO_LINEA = 10;
const MAX_HORNEO = 4;
const PREHORNEO = 8;

interface FilaPlan {
  y: number;
  h: number;
  pintar: (cx: CanvasRenderingContext2D) => void;
}

/** Shows the accumulated statistics and resolves when the player goes back (VOLVER). */
export function abrirAcumuladas(): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    const anterior = p.escena;
    let pag = 0;
    let fuente: Fuente = 'todos';
    let filtro: Filtro = 'todas';
    try {
      const g = JSON.parse(localStorage.getItem('pokeusera.est.vista') ?? 'null') as { fuente?: string; filtro?: string } | null;
      if (g?.fuente === 'movil') fuente = 'movil';
      if (g?.filtro === 'personas') filtro = 'personas';
    } catch {
      /* default view */
    }
    const guardarVista = () => {
      try {
        localStorage.setItem('pokeusera.est.vista', JSON.stringify({ fuente, filtro }));
      } catch {
        /* not saved */
      }
    };
    /** Everybody's: loading, the answer, or nothing (no network and no saved copy). */
    let remoto: DeTodos | 'cargando' | 'fallo' = 'cargando';
    /** Sort of each ranking page: the chip and the direction. */
    const orden: Record<string, { k: string; asc: boolean }> = {};
    let scroll = 0;
    let vel = 0;
    let eje: 'x' | 'y' | null = null;
    let ultT = 0;
    let altoVista = 100;
    let yTop = 80;
    /** The page as rows, and each row's baked canvas (filled as it comes into view). */
    let plan: FilaPlan[] = [];
    let altoPlan = 0;
    let hornos: (HTMLCanvasElement | undefined)[] = [];
    let faltan = false;
    let chipsPag: string[] = [];
    let nota: 'copia' | 'sinred' | 'cargando' | 'copiayo' | null = null;
    let textoVacio: string | null = null;
    let totalN = 0;
    let totalTurnos = 0;
    /** My numbers (page YO): not asked for until the page is opened. */
    let yo: DeCuenta | 'cargando' | 'fallo' | null = null;

    const volver = () => {
      sonido.efecto('atras');
      p.poner(anterior);
      res();
    };
    const marcar = () => p.redibujar();

    /** The aggregate being shown (null: nothing yet) and the section of it for the filter. */
    const actual = (): Agregado | null => (fuente === 'movil' ? agregadoLocal() : remoto !== 'cargando' && remoto !== 'fallo' ? remoto.ag : null);

    // ---- from the data to rows
    const filaItem = (it: Item, v: Vista, k: string, max: number, min: number): FilaPlan => {
      const nl = it.n > 0 ? v.lineas.length : 1;
      const h = Math.max(40, 27 + nl * ALTO_LINEA + 3);
      return {
        y: 0,
        h,
        pintar: (cx) => {
          panelCacheado(cx, 0, 0, AN, h);
          const conIcono = !!it.icono;
          const tx = conIcono ? XTEXTO : 10;
          if (it.icono) it.icono(cx, 7, Math.floor((h - 32) / 2));
          texto2(cx, recortar(it.nombre, AN - tx - 56), tx, 6, TINTA2);
          if (it.n <= 0) {
            texto2(cx, t('acum.sin'), tx, 18, TINTA_SUAVE, null);
            return;
          }
          const med = MEDIDAS[k];
          const val = it.m[k] ?? 0;
          const s = escribir(val, med.fmt);
          texto2(cx, s, AN - 9 - anchoTexto2(s), 6, TINTA2);
          // The bar: the sorted measure against the best of the page (for the place, the lower the longer).
          const rango = max - min;
          const frac = med.asc ? (rango <= 0 ? 1 : 1 - (val - min) / rango) : max > 0 ? val / max : 0;
          barraValor(cx, tx, 16, AN - tx - 9, 0.06 + 0.94 * Math.max(0, Math.min(1, frac)), it.color);
          v.lineas.forEach((fila, li) => {
            fila.forEach((mk, ci) => {
              if (it.m[mk] === undefined) return;
              const x = tx + ci * (conIcono ? PASO_COL : PASO_COL_SIN);
              const y = 27 + li * ALTO_LINEA;
              const etiqueta = `${t(`acum.m.${mk}`)} `;
              texto2(cx, etiqueta, x, y, TINTA_SUAVE, null);
              texto2(cx, escribir(it.m[mk], MEDIDAS[mk].fmt), x + anchoTexto2(etiqueta), y, mk === k ? TINTA2 : TINTA_SUAVE, null);
            });
          });
        },
      };
    };

    const filaTitulo = (s: string): FilaPlan => ({
      y: 0,
      h: 18,
      pintar: (cx) => {
        const w = anchoTexto2(s);
        const x = Math.floor((AN - w) / 2);
        texto2(cx, s, x, 5, TINTA2);
        rect(cx, '#c4a860', 6, 8, x - 14, 1);
        rect(cx, '#c4a860', x + w + 8, 8, AN - 6 - (x + w + 8), 1);
      },
    });

    const filaTarjeta = (c: Tarjeta): FilaPlan => ({
      y: 0,
      h: 44,
      pintar: (cx) => {
        panelCacheado(cx, 0, 0, AN, 44);
        const tx = c.icono ? XTEXTO : 10;
        if (c.icono) c.icono(cx, 7, 6);
        texto2(cx, c.valor, AN - 9 - anchoTexto2(c.valor), 6, TINTA2);
        texto2(cx, recortar(c.titulo, AN - tx - anchoTexto2(c.valor) - 18), tx, 6, TINTA_SUAVE, null);
        texto2(cx, recortar(c.detalle, AN - tx - 8), tx, 18, TINTA2, null);
        texto2(cx, recortar(c.pie, AN - tx - 8), tx, 30, TINTA_SUAVE, null);
      },
    });

    const mensajeVacio = (clave: string) => {
      textoVacio = t(clave);
      plan = [];
      altoPlan = 0;
    };

    /** Rebuilds the rows for the page, the data, the filter and the sort (cheap: at most ~100 items). */
    const recalcular = () => {
      hornos = [];
      plan = [];
      altoPlan = 0;
      textoVacio = null;
      chipsPag = [];
      nota = null;
      totalN = 0;
      totalTurnos = 0;
      if (PAGINAS[pag] === 'yo') return recalcularYo();
      if (remoto === 'fallo') nota = 'sinred';
      else if (fuente === 'todos') {
        if (remoto === 'cargando') nota = 'cargando';
        else if (remoto.copia) nota = 'copia';
      }
      const ag = actual();
      if (!ag) {
        mensajeVacio(remoto === 'cargando' ? 'acum.cargando' : 'acum.vacio.todos');
        return;
      }
      const s = seccionDe(ag, filtro === 'personas');
      totalN = s.n;
      totalTurnos = s.n > 0 ? s.tu / s.n : 0;
      if (s.n === 0) {
        mensajeVacio(filtro === 'personas' && ag.todas.n > 0 ? 'acum.vacio.personas' : 'acum.vacio');
        return;
      }
      const id = PAGINAS[pag];
      let y = 3;
      const poner = (f: FilaPlan) => {
        f.y = y;
        plan.push(f);
        y += f.h + 3;
      };
      if (id === 'yo') return;
      if (id === 'records') {
        const nombreDe = (cu: string): string | undefined =>
          fuente === 'movil' ? (cu === cuentaLocal()?.id ? cuentaLocal()?.nombre : undefined) : remoto !== 'cargando' && remoto !== 'fallo' ? remoto.cuentas.find((c) => c.id === cu)?.nombre : undefined;
        for (const c of tarjetas(s, RECORDS, nombreDe)) poner(filaTarjeta(c));
        if (!plan.length) mensajeVacio('acum.vacio');
      } else {
        const cuentas = fuente === 'todos' && remoto !== 'cargando' && remoto !== 'fallo' ? remoto.cuentas : [];
        const v = { useritos: vistaUseritos, movs: vistaMovs, tipos: vistaTipos, objetos: vistaObjetos, escenarios: vistaEscenarios, entrenadores: (x: Seccion) => vistaEntrenadores(x, cuentas) }[id](s);
        chipsPag = v.chips;
        const o = (orden[id] ??= { k: v.chips[0], asc: !!MEDIDAS[v.chips[0]].asc });
        for (const g of v.grupos) {
          if (g.titulo) poner(filaTitulo(g.titulo));
          // With data first, by the chosen measure (the groups that lack it use the first chip); those without data at the end.
          const k = g.items.some((it) => it.m[o.k] !== undefined) ? o.k : v.chips[0];
          const mejorAbajo = !!MEDIDAS[k].asc;
          const con = g.items.filter((it) => it.n > 0).sort((a, b) => (mejorAbajo ? (a.m[k] ?? 0) - (b.m[k] ?? 0) : (b.m[k] ?? 0) - (a.m[k] ?? 0)) || b.n - a.n);
          // The player flipped the direction: the other way round (worst first).
          if (k === o.k && o.asc !== mejorAbajo) con.reverse();
          const vals = con.map((it) => it.m[k]);
          const max = vals.length ? Math.max(...vals) : 0;
          const min = vals.length ? Math.min(...vals) : 0;
          for (const it of con) poner(filaItem(it, v, k, max, min));
          for (const it of g.items.filter((x) => x.n <= 0)) poner(filaItem(it, v, k, 0, 0));
        }
      }
      altoPlan = y + 4;
    };

    /** The YO page: my account's numbers (loaded the first time the page is opened). */
    const recalcularYo = () => {
      if (!cuentaLocal()) return mensajeVacio('acum.yo.sincuenta');
      if (yo === null) {
        yo = 'cargando';
        void estadisticasDeCuenta().then((r) => {
          yo = r ?? 'fallo';
          if (PAGINAS[pag] === 'yo') nuevoDato();
        });
      }
      if (yo === 'cargando') return mensajeVacio('acum.cargando');
      if (yo === 'fallo') return mensajeVacio('acum.yo.sinred');
      if (yo.copia) nota = 'copiayo';
      const s = seccionDe(yo.ag, true);
      totalN = s.n;
      totalTurnos = s.n > 0 ? s.tu / s.n : 0;
      if (s.n === 0) return mensajeVacio('acum.yo.vacio');
      let y = 3;
      for (const c of tarjetasYo(yo)) {
        const f = filaTarjeta(c);
        f.y = y;
        plan.push(f);
        y += f.h + 3;
      }
      altoPlan = y + 4;
    };

    const nuevoDato = () => {
      recalcular();
      marcar();
    };

    // ---- going around
    const irPagina = (d: number) => {
      const nueva = Math.max(0, Math.min(PAGINAS.length - 1, pag + d));
      if (nueva === pag) return;
      pag = nueva;
      scroll = 0;
      vel = 0;
      sonido.efecto('cursor');
      nuevoDato();
    };
    const cambiarFuente = (f: Fuente) => {
      if (f === fuente) return;
      fuente = f;
      guardarVista();
      scroll = 0;
      sonido.efecto('cursor');
      nuevoDato();
    };
    const cambiarFiltro = (f: Filtro) => {
      if (f === filtro) return;
      filtro = f;
      guardarVista();
      scroll = 0;
      sonido.efecto('cursor');
      nuevoDato();
    };
    const elegirOrden = (k: string) => {
      const id = PAGINAS[pag];
      const o = orden[id];
      if (!o) return;
      if (o.k === k) o.asc = !o.asc;
      else {
        o.k = k;
        o.asc = !!MEDIDAS[k].asc;
      }
      scroll = 0;
      vel = 0;
      sonido.efecto('cursor');
      nuevoDato();
    };

    // ---- the fixed top, baked once per state
    const cabecera = (): HTMLCanvasElement => {
      const o = orden[PAGINAS[pag]];
      const esYo = PAGINAS[pag] === 'yo';
      const nombreYo = esYo ? (cuentaLocal()?.nombre ?? '') : '';
      const llave = `acum|${PAGINAS[pag]}|${nombreYo}|${fuente}|${filtro}|${totalN}|${Math.round(totalTurnos * 10)}|${nota ?? ''}|${chipsPag.length ? `${o?.k}${o?.asc ? 'a' : 'd'}` : ''}`;
      return hornear(llave, ANCHO, altoCabecera(), (cx) => {
        barraArriba(cx);
        const titulo = t('acum.pagina', { n: pag + 1, total: PAGINAS.length, nombre: t(`acum.pag.${PAGINAS[pag]}`) });
        texto2(cx, titulo, Math.floor((ANCHO - anchoTexto2(titulo)) / 2), 6, TINTA2);
        flecha(cx, 6, 5, -1, pag > 0 ? TINTA2 : '#a898a8');
        flecha(cx, ANCHO - 11, 5, 1, pag < PAGINAS.length - 1 ? TINTA2 : '#a898a8');
        if (esYo) {
          // My page: no «de todos / en este móvil» here, just whose numbers they are.
          relleno(cx, TINTA2, X0, Y_FUENTE, AN - 2, 30);
          relleno(cx, '#fbe19a', X0 + 1, Y_FUENTE + 1, AN - 4, 28);
          const nm = t('acum.yo.cabecera', { nombre: nombreYo });
          texto2(cx, nm, X0 + Math.floor((AN - 2 - anchoTexto2(nm)) / 2), Y_FUENTE + 11, TINTA2, null);
        } else {
          segmentos(cx, Y_FUENTE, [t('acum.fuente.todos'), t('acum.fuente.movil')], fuente === 'todos' ? 0 : 1);
          segmentos(cx, Y_FILTRO, [t('acum.filtro.todas'), t('acum.filtro.personas')], filtro === 'todas' ? 0 : 1);
        }
        const tot = totalN === 1 ? t('acum.total.una', { t: escribir(totalTurnos, 'dec') }) : t('acum.total.turnos', { n: entero(totalN), t: escribir(totalTurnos, 'dec') });
        const lineaTotal = totalN > 0 ? tot : '';
        if (lineaTotal) texto2(cx, lineaTotal, Math.floor((ANCHO - anchoTexto2(lineaTotal)) / 2), Y_TOTAL, TINTA2, null);
        if (nota) {
          const s = t(`acum.nota.${nota}`);
          texto2(cx, s, Math.floor((ANCHO - anchoTexto2(s)) / 2), Y_TOTAL + 11, '#a83a2c', null);
        }
        if (chipsPag.length) {
          const cw = Math.floor(AN / chipsPag.length);
          chipsPag.forEach((k, i) => {
            const x = X0 + i * cw;
            const sel = o?.k === k;
            const yc = yChips();
            relleno(cx, TINTA2, x, yc, cw - 2, 14);
            relleno(cx, sel ? '#fbe19a' : '#8a7690', x + 1, yc + 1, cw - 4, 12);
            const s = t(`acum.m.${k}`);
            const w = anchoTexto2(s);
            // The chosen one carries a little arrow after its name: ▲ going up, ▼ going down.
            const total = w + (sel ? 7 : 0);
            const xt = x + Math.floor((cw - 2 - total) / 2);
            texto2(cx, s, xt, yc + 4, sel ? TINTA2 : '#e8dcc0', null);
            if (sel) for (let i = 0; i < 3; i++) rect(cx, TINTA2, xt + w + 3 + (o.asc ? 2 - i : i), yc + 5 + i, 1 + 2 * (o.asc ? i : 2 - i), 1);
          });
        }
      });
    };
    const Y_FUENTE = 21;
    const Y_FILTRO = 37;
    const Y_TOTAL = 55;
    const yChips = (): number => Y_TOTAL + (nota ? 22 : 12);
    const altoCabecera = (): number => yChips() + (chipsPag.length ? 18 : 2);

    const segmentos = (cx: CanvasRenderingContext2D, y: number, textos: string[], sel: number) => {
      const w = Math.floor(AN / textos.length);
      textos.forEach((s, i) => {
        const x = X0 + i * w;
        relleno(cx, TINTA2, x, y, w - 2, 14);
        relleno(cx, i === sel ? '#fbe19a' : '#8a7690', x + 1, y + 1, w - 4, 12);
        texto2(cx, s, x + Math.floor((w - 2 - anchoTexto2(s)) / 2), y + 4, i === sel ? TINTA2 : '#e8dcc0', null);
      });
    };

    // ---- rows: baked when they come into view
    const hornearFila = (i: number): HTMLCanvasElement => {
      let c = hornos[i];
      if (c) return c;
      const f = plan[i];
      c = document.createElement('canvas');
      c.width = AN;
      c.height = f.h + 2;
      const cx = c.getContext('2d')!;
      cx.imageSmoothingEnabled = false;
      f.pintar(cx);
      hornos[i] = c;
      return c;
    };
    const limite = () => Math.max(0, altoPlan - altoVista);
    const acotar = (v: number) => Math.max(0, Math.min(limite(), v));
    /** First and last row that touch the view (plus `extra` rows around). */
    const visibles = (extra: number): [number, number] => {
      let a = plan.length;
      let b = -1;
      for (let i = 0; i < plan.length; i++) {
        const f = plan[i];
        if (f.y + f.h >= scroll && f.y <= scroll + altoVista) {
          if (i < a) a = i;
          b = i;
        }
      }
      if (b < 0) return [0, -1];
      return [Math.max(0, a - extra), Math.min(plan.length - 1, b + extra)];
    };

    const e: Escena = {
      estatica: true,
      paso(dt) {
        let mueve = false;
        if (eje === null && Math.abs(vel) > 0.02) {
          const antes = scroll;
          scroll = acotar(scroll + vel * dt);
          vel = scroll === antes ? 0 : vel * Math.exp(-dt / 260);
          mueve = true;
        } else if (eje === null) vel = 0;
        if (faltan) return true;
        if (!mueve && plan.length) {
          // Idle: bake one more row around the view per frame, so a scroll never stops to paint.
          const [a, b] = visibles(PREHORNEO);
          for (let i = a; i <= b; i++) {
            if (!hornos[i]) {
              hornearFila(i);
              return true;
            }
          }
        }
        return mueve;
      },
      dibujar(ctx) {
        const H = p.alto;
        fondoPapel(ctx, H);
        const cab = cabecera();
        yTop = cab.height + 2;
        const yFin = H - 36;
        altoVista = yFin - yTop;
        scroll = acotar(scroll);
        // The rows.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, yTop, ANCHO, altoVista);
        ctx.clip();
        faltan = false;
        if (plan.length) {
          const [a, b] = visibles(0);
          let horneadas = 0;
          for (let i = a; i <= b; i++) {
            if (!hornos[i]) {
              if (horneadas >= MAX_HORNEO) {
                faltan = true;
                continue;
              }
              horneadas++;
            }
            ctx.drawImage(hornearFila(i), X0, yTop + plan[i].y - scroll);
          }
        } else if (textoVacio) {
          const lineas = envolver(textoVacio, 190);
          lineas.forEach((l, i) => texto2(ctx, l, Math.floor((ANCHO - anchoTexto2(l)) / 2), yTop + 40 + i * 14, TINTA_SUAVE, null));
        }
        ctx.restore();
        // Scroll bar.
        if (altoPlan > altoVista) {
          const bh = Math.max(12, Math.round((altoVista * altoVista) / altoPlan));
          const by = yTop + Math.round(((altoVista - bh) * scroll) / limite());
          rect(ctx, TINTA2, ANCHO - 3, by, 3, bh);
        }
        ctx.drawImage(cab, 0, 0);
        // Top zones.
        entrada.zona(0, 0, 44, 18, () => irPagina(-1));
        entrada.zona(ANCHO - 44, 0, 44, 18, () => irPagina(1));
        if (PAGINAS[pag] !== 'yo') {
          const wf = Math.floor(AN / 2);
          entrada.zona(X0, Y_FUENTE, wf, 15, () => cambiarFuente('todos'));
          entrada.zona(X0 + wf, Y_FUENTE, wf, 15, () => cambiarFuente('movil'));
          entrada.zona(X0, Y_FILTRO, wf, 15, () => cambiarFiltro('todas'));
          entrada.zona(X0 + wf, Y_FILTRO, wf, 15, () => cambiarFiltro('personas'));
        }
        if (chipsPag.length) {
          const cw = Math.floor(AN / chipsPag.length);
          chipsPag.forEach((k, i) => entrada.zona(X0 + i * cw, yChips(), cw, 15, () => elegirOrden(k)));
        }
        // VOLVER.
        const bw = 110;
        const bx = Math.floor((ANCHO - bw) / 2);
        boton(ctx, bx, H - 32, bw, 26, t('acum.volver'), true);
        entrada.zona(bx, H - 32, bw, 26, volver);
      },
      accion(a: Accion) {
        if (a === 'izq') irPagina(-1);
        else if (a === 'der') irPagina(1);
        else if (a === 'arriba' || a === 'abajo') {
          scroll = acotar(scroll + (a === 'abajo' ? 40 : -40));
          vel = 0;
          marcar();
        } else if (a === 'aceptar' || a === 'atras') volver();
        return true;
      },
      arrastre(_dx, dy, total, fin) {
        const ahora = performance.now();
        if (!fin) {
          if (eje === null) {
            eje = Math.abs(total.x) > Math.abs(total.y) ? 'x' : 'y';
            vel = 0;
            ultT = ahora;
          }
          if (eje === 'y') {
            const dtm = Math.max(1, ahora - ultT);
            ultT = ahora;
            scroll = acotar(scroll - dy);
            vel = vel * 0.5 - (dy / dtm) * 0.5;
          }
          return;
        }
        if (eje === 'x') {
          if (Math.abs(total.x) > 30 && Math.abs(total.x) > Math.abs(total.y) * 1.5) irPagina(total.x < 0 ? 1 : -1);
        } else if (ahora - ultT > 90) vel = 0;
        else vel = Math.max(-3, Math.min(3, vel));
        eje = null;
      },
    };

    // First what this phone has (it shows at once), then everybody's from the server.
    recalcular();
    p.poner(e);
    void agregadoDeTodos().then((r) => {
      remoto = r ?? 'fallo';
      // Nothing from the server and nothing saved: the phone's own numbers, with the note.
      if (!r && fuente === 'todos' && agregadoLocal().todas.n > 0) {
        fuente = 'movil';
      }
      nuevoDato();
    });
  });
}

/** The menu's icon: three bars of a chart on a base line (13×13), baked once. */
export function iconoAcumuladas(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const c = hornear('icono|acumuladas', 13, 13, (cx) => {
    const filas = [
      '.............',
      '.........kkk.',
      '.........kgk.',
      '.....kkk.kgk.',
      '.....kgk.kgk.',
      '.kkk.kgk.kgk.',
      '.kgk.kgk.kgk.',
      '.kgk.kgk.kgk.',
      '.kgk.kgk.kgk.',
      '.kgk.kgk.kgk.',
      'kkkkkkkkkkkkk',
      'kGGGGGGGGGGGk',
      '.............',
    ];
    const col: Record<string, string> = { k: TINTA2, g: '#e8c25a', G: '#b08428' };
    filas.forEach((fila, j) => {
      for (let i = 0; i < fila.length; i++) if (col[fila[i]]) rect(cx, col[fila[i]], i, j, 1, 1);
    });
  });
  ctx.drawImage(c, x, y);
}
