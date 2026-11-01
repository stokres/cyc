// A whole online game, for the host and for the guests (docs/PANG-ONLINE.md). The host's browser runs every stage with the real Partida;
// the guests' Partida only paints the host's fotos (red/foto.ts) and what they press travels back as `mandos` messages. Everybody goes through the
// same stages; this module walks them through the screens between stages (continue, end) and tidies up. The rooms are the web's common service
// (src/sala/conexion.ts, docs/SALAS.md); the screens to get into one are red/sala.ts.
import type { Sound } from '../../core/audio';
import { enviarRecord } from '../../cuenta/records';
import { texto } from '../../juego/textos';
import { ConexionSala } from '../../sala/conexion';
import { FASES } from '../fases';
import { alcanzarFase, anotarRecord } from '../guardado';
import { jugarFase, type Control, type Partida } from '../juego';
import { pantallaContinuar, pantallaFases, pantallaFinal } from '../pantallas';
import { PJS, type Arma, type PjId, type ResultadoFase } from '../tipos';
import { boton, h, mostrar } from '../ui/dom';
import type { Foto } from './foto';
import { pantallaSala, pantallaSalas, type ConexionPang, type EntradaSalas } from './sala';

export interface EntornoOnline {
  ui: HTMLElement;
  capaJuego: HTMLElement;
  sonido: Sound;
  pausa: (senal?: AbortSignal) => Promise<'seguir' | 'salir'>;
}

/** One person in the game, as the host tells it at the start of each stage. */
interface Participante {
  id: number;
  pj: PjId;
  vidas: number;
  puntos: number;
  arma: Arma;
}

type Msg = Record<string, unknown>;
/** How a game ends for the flow around it: back to the room, the player left (back to the list), or the room is gone (or the connection). */
type Final = 'sala' | 'menu' | 'cerrada';

const VIDAS = 3;
/** The guest repeats its buttons this often even if nothing changed (ms), and the host lets go of them after a longer silence. */
const LATIDO_MS = 500;
const SILENCIO_MS = 3000;
/** The host says something every this long (ms), so a room that is quiet (a screen between stages) is not closed for being idle: the server closes after 30 minutes. */
const VIVO_MS = 60_000;

const esMsg = (x: unknown): x is Msg => !!x && typeof x === 'object';

// ---------------------------------------------------------------- the flow: list → room → game → room...

/** The notice for a room that is gone: closed by the host, closed for being idle, or the connection was lost. */
const claveCierre = (con: ConexionPang) => (!con.abierta ? 'online.perdida' : con.cierre === 'inactiva' ? 'online.cerrada.inactiva' : 'online.cerrada');

/**
 * Returns when the player is back at the menu (the connection is closed by then). `entrada`: what a link asked for (`?sala=K7MZ` joins that room,
 * `?sala=nueva` opens «crear sala»).
 */
export async function jugarOnline(ent: EntornoOnline, entrada: EntradaSalas = {}): Promise<void> {
  const con: ConexionPang = new ConexionSala<PjId>();
  let enlace = entrada;
  try {
    for (;;) {
      const lista = await pantallaSalas(ent.ui, con, enlace);
      enlace = {};
      if (lista === 'volver') return;
      // In a room until it is closed or the player leaves; then back to the list.
      for (;;) {
        // The room may have closed while nobody was listening (an idle room): back to the list.
        if (con.id < 0) {
          await mensaje(ent.ui, claveCierre(con));
          break;
        }
        const s = await pantallaSala(ent.ui, con);
        if (s.r === 'salir') break;
        if (s.r !== 'empezar') {
          await mensaje(ent.ui, claveCierre(con));
          break;
        }
        const fin = con.anfitrion ? await anfitrion(con, ent) : await invitado(con, ent);
        ent.capaJuego.replaceChildren();
        if (fin === 'sala') continue;
        if (fin === 'cerrada') await mensaje(ent.ui, claveCierre(con));
        break;
      }
      // The connection is dead: nothing to list.
      if (!con.abierta) return;
    }
  } finally {
    con.cerrar();
    ent.capaJuego.replaceChildren();
    ent.ui.replaceChildren();
  }
}

// ---------------------------------------------------------------- small helpers

/** Messages waiting for whoever runs the flow. */
class Cola<T> {
  private items: T[] = [];
  private espera: ((v: T) => void) | null = null;

  poner(v: T) {
    if (this.espera) {
      const e = this.espera;
      this.espera = null;
      e(v);
    } else this.items.push(v);
  }

  siguiente(): Promise<T> {
    return new Promise((resolver) => {
      if (this.items.length) resolver(this.items.shift()!);
      else this.espera = resolver;
    });
  }
}

/** A screen with a line of text and «Salir»; resolves with the next message, or 'salir'. */
function esperar(ui: HTMLElement, clave: string, cola: Cola<Msg>): Promise<Msg | 'salir'> {
  const el = h('div', { class: 'pg-pantalla pg-online' });
  return mostrar<Msg | 'salir'>(ui, el, (fin) => {
    el.append(h('div', { class: 'pg-panel pg-centro' }, h('h2', { class: 'pg-h2' }, texto(clave)), h('div', { class: 'pg-pie' }, boton(texto('online.salir.partida'), () => fin('salir'), 'fantasma'))));
    void cola.siguiente().then(fin);
  });
}

/** A short message and «Volver». */
function mensaje(ui: HTMLElement, clave: string): Promise<void> {
  const el = h('div', { class: 'pg-pantalla pg-online' });
  return mostrar<void>(ui, el, (fin) => {
    el.append(h('div', { class: 'pg-panel pg-centro' }, h('h2', { class: 'pg-h2' }, texto(clave)), h('div', { class: 'pg-pie' }, boton(texto('menu.volver'), () => fin(), 'primario'))));
  });
}

/**
 * This player's record: the run so far, written once when the game ends (or is left). `n`: the players of the game when it started.
 * With two or more it goes to the table of groups, `pangGrupo` (his own points, with `n`), and not to the phone's list, which is for solo games;
 * a game online with one person is a solo game and goes where those go.
 */
function libro(pj: PjId, n: number) {
  let marca: { puntos: number; fase: number } | null = null;
  return {
    poner(puntos: number, fase: number) {
      marca = { puntos, fase };
    },
    anotar() {
      const m = marca;
      marca = null;
      if (!m || !(m.puntos > 0)) return;
      if (n >= 2) {
        void enviarRecord('pangGrupo', m.puntos, { pj, fase: Math.min(FASES.length, Math.max(1, m.fase)), n: Math.min(4, n) });
        return;
      }
      const r = anotarRecord(m.puntos, pj, m.fase);
      if (r) void enviarRecord('pang', r.marca.puntos, { pj, fase: r.marca.fase }, r.marca.fecha);
    },
  };
}

// ---------------------------------------------------------------- the host

async function anfitrion(con: ConexionPang, ent: EntornoOnline): Promise<Final> {
  const yoId = con.id;
  let jugadores: Participante[] = con.jugadores
    .filter((j): j is typeof j & { pj: PjId } => j.pj !== null)
    .sort((a, b) => a.id - b.id)
    .map((j) => ({ id: j.id, pj: j.pj, vidas: VIDAS, puntos: 0, arma: 'normal' as Arma }));
  const record = libro(jugadores.find((p) => p.id === yoId)?.pj ?? 'fran', jugadores.length);
  /** The players of the stage in play (index = player number there). */
  let activos: Participante[] = [];
  let partida = null as Partida | null;
  const salieron = new Set<number>();
  let perdido = false;
  const contadores = new Map<number, { disparo: number; especial: number; sube: number }>();
  const visto = new Map<number, number>();

  const cortar = () => {
    perdido = true;
    partida?.terminarRed('salir');
  };
  const sueltos = [
    // What the guests press.
    con.on('juego', (m) => {
      const d = m.datos;
      if (!esMsg(d) || d.k !== 'mandos' || !partida) return;
      const i = activos.findIndex((p) => p.id === m.de);
      const mn = partida.mandos[i];
      if (!mn || m.de === yoId) return;
      visto.set(m.de, performance.now());
      mn.izq = d.izq === true;
      mn.der = d.der === true;
      mn.arriba = d.arriba === true;
      mn.abajo = d.abajo === true;
      mn.fuego = d.fuego === true;
      // Presses come as ever-growing counters: a press is a counter that went up.
      const antes = contadores.get(m.de) ?? { disparo: 0, especial: 0, sube: 0 };
      const ahora = { disparo: Number(d.disparo) || 0, especial: Number(d.especial) || 0, sube: Number(d.sube) || 0 };
      if (ahora.disparo > antes.disparo) mn.disparo = true;
      if (ahora.especial > antes.especial) mn.especial = true;
      if (ahora.sube > antes.sube) mn.subeOEspecial = true;
      contadores.set(m.de, ahora);
    }),
    // A guest left: his character disappears and he does not come back in the next stages.
    con.on('salio', (m) => {
      salieron.add(m.id);
      const i = activos.findIndex((p) => p.id === m.id);
      if (i >= 0) partida?.sacarJugador(i);
    }),
    // The room closed (idle) or the connection is gone.
    con.on('perdida', cortar),
    con.on('cerrada', cortar),
  ];
  // A guest whose buttons stopped arriving (his tab froze) lets go of them.
  const vigilante = window.setInterval(() => {
    if (!partida) return;
    const ahora = performance.now();
    activos.forEach((p, i) => {
      const t = visto.get(p.id);
      const mn = partida!.mandos[i];
      if (t !== undefined && mn && p.id !== yoId && ahora - t > SILENCIO_MS) mn.izq = mn.der = mn.arriba = mn.abajo = mn.fuego = false;
    });
  }, LATIDO_MS);
  // The server closes a room with no messages for 30 minutes: on a screen between stages nobody sends any, so the host does.
  const vivo = window.setInterval(() => con.juego('todos', { k: 'vivo' }), VIVO_MS);

  try {
    // The starting stage: the host picks among his unlocked ones while the guests wait. «Volver» goes back to the room.
    const primera = await pantallaFases(ent.ui);
    if (perdido) return 'cerrada';
    if (primera === null) {
      con.volver();
      return 'sala';
    }
    let n = primera;
    for (;;) {
      if (perdido) {
        record.anotar();
        return 'cerrada';
      }
      jugadores = jugadores.filter((p) => !salieron.has(p.id));
      activos = jugadores;
      const yo = activos.findIndex((p) => p.id === yoId);
      alcanzarFase(n);
      record.poner(activos[yo].puntos, n);
      contadores.clear();
      visto.clear();
      con.juego('todos', { k: 'fase', n, jugadores: activos });
      // With nobody else in the stage it is the plain, offline game.
      const varios = activos.length > 1;
      const r = await jugarFase({
        padre: ent.capaJuego,
        fase: FASES[n - 1],
        jugadores: activos.map(({ pj, vidas, puntos, arma }) => ({ pj, vidas, puntos, arma })),
        controles: activos.map((p): Control => (p.id === yoId ? 'local' : 'red')),
        yo,
        sonido: ent.sonido,
        pausa: ent.pausa,
        rol: varios ? 'anfitrion' : undefined,
        alFoto: varios ? (foto: Foto) => con.juego('todos', { k: 'estado', ...foto }) : undefined,
        alCrear: (p) => (partida = p),
      });
      const enCurso = partida;
      partida = null;
      if (r === 'salir') {
        // Leaving mid-stage: the points he has by now count.
        record.poner(Math.floor(enCurso?.mundo.jugadores[yo]?.puntos ?? 0), n);
        record.anotar();
        if (perdido) return 'cerrada';
        // The host left from the pause menu: the room closes for everybody.
        con.salir();
        return 'menu';
      }
      con.juego('todos', { k: 'fin', resultado: r });
      activos.forEach((p, i) => {
        p.puntos = r.jugadores[i].puntos;
        p.vidas = r.jugadores[i].vidas;
        p.arma = r.jugadores[i].arma;
      });
      const mios = r.jugadores[yo].puntos;
      if (r.superada) {
        // Whoever was out of lives comes back with one.
        for (const p of activos) p.vidas = Math.max(1, p.vidas);
        record.poner(mios, Math.min(FASES.length, n + 1));
        if (n >= FASES.length) {
          con.juego('todos', { k: 'final' });
          await pantallaFinal(ent.ui, mios);
          record.poner(mios, FASES.length);
          record.anotar();
          break;
        }
        n++;
        continue;
      }
      // Nobody is left standing: the run so far is kept either way; the host decides.
      record.poner(mios, n);
      record.anotar();
      const decision = await pantallaContinuar(ent.ui, n, mios, false);
      if (perdido) return 'cerrada';
      if (decision === 'no') {
        con.juego('todos', { k: 'menu' });
        break;
      }
      for (const p of jugadores) {
        p.vidas = VIDAS;
        p.puntos = 0;
        p.arma = 'normal';
      }
    }
    // The game is over: everybody back to the room.
    if (perdido) return 'cerrada';
    con.volver();
    return 'sala';
  } finally {
    clearInterval(vigilante);
    clearInterval(vivo);
    for (const f of sueltos) f();
    partida?.terminarRed('salir');
  }
}

// ---------------------------------------------------------------- a guest

async function invitado(con: ConexionPang, ent: EntornoOnline): Promise<Final> {
  const yoId = con.id;
  const total = con.jugadores.filter((j) => j.pj !== null).length;
  const record = libro(con.jugadores.find((j) => j.id === yoId)?.pj ?? 'fran', total);
  const cola = new Cola<Msg>();
  let partida = null as Partida | null;
  let sinAnfitrion = false;
  /** The host ended the game and brought everybody back to the room. */
  let volvio = false;
  let miIndice = 0;
  /** My points when the last stage ended, for the end screen. */
  let ultimos = 0;

  const perder = () => {
    if (sinAnfitrion) return;
    sinAnfitrion = true;
    partida?.terminarRed('salir');
    cola.poner({ k: '@fuera' });
  };
  const sueltos = [
    con.on('juego', (m) => {
      const d = m.datos;
      if (!esMsg(d)) return;
      if (d.k === 'estado') partida?.recibirFoto(d as unknown as Foto);
      else if (d.k === 'fin') {
        if (esMsg(d.resultado) && Array.isArray(d.resultado.jugadores)) partida?.terminarRed(d.resultado as unknown as ResultadoFase);
      } else if (d.k !== 'vivo') cola.poner(d);
    }),
    con.on('cerrada', perder),
    con.on('perdida', perder),
    // The host ends the game and brings everybody back to the room.
    con.on('volver', () => {
      volvio = true;
      partida?.terminarRed('salir');
      cola.poner({ k: '@volver' });
    }),
  ];

  try {
    let msg: Msg | 'salir' = await esperar(ent.ui, 'online.eligeFase', cola);
    for (;;) {
      if (msg === 'salir') {
        record.anotar();
        con.salir();
        return 'menu';
      }
      if (msg.k === '@fuera') {
        record.anotar();
        return 'cerrada';
      }
      if (msg.k === '@volver') {
        record.anotar();
        return 'sala';
      }
      if (msg.k === 'final') {
        await pantallaFinal(ent.ui, ultimos);
        record.anotar();
        msg = await esperar(ent.ui, 'online.volviendo', cola);
        continue;
      }
      if (msg.k === 'menu') {
        record.anotar();
        msg = await esperar(ent.ui, 'online.volviendo', cola);
        continue;
      }
      if (msg.k !== 'fase') {
        msg = await cola.siguiente();
        continue;
      }
      const n = Number(msg.n);
      const lista = Array.isArray(msg.jugadores) ? (msg.jugadores as Msg[]) : [];
      const activos: Participante[] = lista
        .filter((p) => PJS.includes(p.pj as PjId))
        .map((p) => ({ id: Number(p.id), pj: p.pj as PjId, vidas: Number(p.vidas) || 0, puntos: Number(p.puntos) || 0, arma: (['normal', 'doble', 'triple', 'fijo', 'rafaga'].includes(p.arma as string) ? p.arma : 'normal') as Arma }));
      miIndice = activos.findIndex((p) => p.id === yoId);
      if (!Number.isInteger(n) || n < 1 || n > FASES.length || miIndice < 0) {
        // Not in this stage (should not happen): wait for the next word.
        msg = await cola.siguiente();
        continue;
      }
      alcanzarFase(n);
      record.poner(activos[miIndice].puntos, n);
      let paraMandos = () => {};
      const r = await jugarFase({
        padre: ent.capaJuego,
        fase: FASES[n - 1],
        jugadores: activos.map(({ pj, vidas, puntos, arma }) => ({ pj, vidas, puntos, arma })),
        controles: activos.map((p): Control => (p.id === yoId ? 'local' : 'red')),
        yo: miIndice,
        sonido: ent.sonido,
        pausa: ent.pausa,
        rol: 'invitado',
        alCrear: (p) => {
          partida = p;
          paraMandos = mandarMandos(con, p, miIndice);
        },
      });
      paraMandos();
      const enCurso = partida;
      partida = null;
      if (r === 'salir') {
        record.poner(Math.floor(enCurso?.mundo.jugadores[miIndice]?.puntos ?? 0), n);
        record.anotar();
        if (sinAnfitrion) return 'cerrada';
        // The host brought everybody back, or this player left from the pause menu.
        if (volvio) return 'sala';
        con.salir();
        return 'menu';
      }
      ultimos = r.jugadores[miIndice]?.puntos ?? 0;
      if (r.superada) {
        record.poner(ultimos, Math.min(FASES.length, n + 1));
        // The host sends the next stage (or the end) at once.
        msg = await cola.siguiente();
        continue;
      }
      record.poner(ultimos, n);
      record.anotar();
      msg = await esperar(ent.ui, 'online.decide', cola);
    }
  } finally {
    for (const f of sueltos) f();
    partida?.terminarRed('salir');
  }
}

/**
 * Sends this screen's buttons to the host: the held ones as they are, the presses as ever-growing counters (so none is lost), whenever something
 * changes and every half second as a heartbeat. The presses are put back to false here so the guest's own Partida, which never plays, does not keep them.
 */
function mandarMandos(con: ConexionPang, p: Partida, yo: number): () => void {
  const mn = p.mandos[yo];
  const c = { disparo: 0, especial: 0, sube: 0 };
  let ultimo = '';
  let cuando = 0;
  const id = window.setInterval(() => {
    if (mn.disparo) {
      c.disparo++;
      mn.disparo = false;
    }
    if (mn.especial) {
      c.especial++;
      mn.especial = false;
    }
    if (mn.subeOEspecial) {
      c.sube++;
      mn.subeOEspecial = false;
    }
    const datos = { k: 'mandos', izq: mn.izq, der: mn.der, arriba: mn.arriba, abajo: mn.abajo, fuego: mn.fuego, disparo: c.disparo, especial: c.especial, sube: c.sube };
    const clave = JSON.stringify(datos);
    const ahora = performance.now();
    if (clave === ultimo && ahora - cuando < LATIDO_MS) return;
    ultimo = clave;
    cuando = ahora;
    con.juego('anfitrion', datos);
  }, 16);
  return () => clearInterval(id);
}
