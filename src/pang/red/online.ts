// A whole online game, for the host and for the guests (docs/PANG-ONLINE.md). The host's browser runs
// every stage with the real Partida; the guests' Partida only paints the host's fotos (red/foto.ts)
// and what they press travels back as `mandos` messages. Everybody goes through the same stages;
// this module walks them through the screens between stages (continue, end) and tidies up.
import type { Sound } from '../../core/audio';
import { texto } from '../../juego/textos';
import { FASES } from '../fases';
import { alcanzarFase, anotarRecord } from '../guardado';
import { jugarFase, type Control, type Partida } from '../juego';
import { pantallaContinuar, pantallaFases, pantallaFinal } from '../pantallas';
import { PJS, type PjId, type ResultadoFase } from '../tipos';
import { boton, h, mostrar } from '../ui/dom';
import type { Conexion } from './conexion';
import type { Foto } from './foto';
import type { SalaLista } from './sala';

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
}

type Msg = Record<string, unknown>;

const VIDAS = 3;
/** The guest repeats its buttons this often even if nothing changed (ms), and the host lets go of them after a longer silence. */
const LATIDO_MS = 500;
const SILENCIO_MS = 3000;

/** Plays the whole game; returns when everybody is back at the menu (the connection is closed by then). */
export async function jugarOnline(sala: SalaLista, ent: EntornoOnline): Promise<void> {
  try {
    if (sala.anfitrion) await anfitrion(sala, ent);
    else await invitado(sala, ent);
  } finally {
    sala.con.cerrar();
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
    el.append(h('div', { class: 'pg-panel pg-centro' }, h('h2', { class: 'pg-h2' }, texto(clave)), h('div', { class: 'pg-pie' }, boton(texto('online.salir'), () => fin('salir'), 'fantasma'))));
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

/** This player's record: the run so far, written once when the game ends (or is left). */
function libro(pj: PjId) {
  let marca: { puntos: number; fase: number } | null = null;
  return {
    poner(puntos: number, fase: number) {
      marca = { puntos, fase };
    },
    anotar() {
      if (marca) anotarRecord(marca.puntos, pj, marca.fase);
      marca = null;
    },
  };
}

const esMsg = (x: unknown): x is Msg => !!x && typeof x === 'object';

// ---------------------------------------------------------------- the host

async function anfitrion(sala: SalaLista, ent: EntornoOnline) {
  const { con } = sala;
  const miPj = sala.jugadores.find((j) => j.id === sala.yo)?.pj ?? 'fran';
  const record = libro(miPj);
  let jugadores: Participante[] = sala.jugadores.map(({ id, pj }) => ({ id, pj, vidas: VIDAS, puntos: 0 }));
  /** The players of the stage in play (index = player number there). */
  let activos: Participante[] = [];
  let partida = null as Partida | null;
  const salieron = new Set<number>();
  let perdido = false;
  const contadores = new Map<number, { disparo: number; especial: number; sube: number }>();
  const visto = new Map<number, number>();

  const sueltos = [
    // What the guests press.
    con.on('juego', (m) => {
      const d = m.datos;
      if (!esMsg(d) || d.k !== 'mandos' || !partida) return;
      const i = activos.findIndex((p) => p.id === m.de);
      const mn = partida.mandos[i];
      if (!mn || m.de === sala.yo) return;
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
    con.on('perdida', () => {
      perdido = true;
      partida?.terminarRed('salir');
    }),
  ];
  // A guest whose buttons stopped arriving (his tab froze) lets go of them.
  const vigilante = window.setInterval(() => {
    if (!partida) return;
    const ahora = performance.now();
    activos.forEach((p, i) => {
      const t = visto.get(p.id);
      const mn = partida!.mandos[i];
      if (t !== undefined && mn && p.id !== sala.yo && ahora - t > SILENCIO_MS) mn.izq = mn.der = mn.arriba = mn.abajo = mn.fuego = false;
    });
  }, LATIDO_MS);

  try {
    // The starting stage: the host picks among his unlocked ones while the guests wait.
    let n = (await pantallaFases(ent.ui)) ?? 1;
    for (;;) {
      if (perdido) {
        record.anotar();
        await mensaje(ent.ui, 'online.perdida');
        break;
      }
      jugadores = jugadores.filter((p) => !salieron.has(p.id));
      activos = jugadores;
      const yo = activos.findIndex((p) => p.id === sala.yo);
      alcanzarFase(n);
      record.poner(activos[yo].puntos, n);
      contadores.clear();
      visto.clear();
      con.juego('todos', { k: 'fase', n, jugadores: activos });
      const r = await jugarFase({
        padre: ent.capaJuego,
        fase: FASES[n - 1],
        jugadores: activos.map(({ pj, vidas, puntos }) => ({ pj, vidas, puntos })),
        controles: activos.map((p): Control => (p.id === sala.yo ? 'local' : 'red')),
        yo,
        sonido: ent.sonido,
        pausa: ent.pausa,
        rol: 'anfitrion',
        alCrear: (p) => (partida = p),
        alFoto: (foto) => con.juego('todos', { k: 'estado', ...foto }),
      });
      partida = null;
      if (r === 'salir') {
        record.anotar();
        if (perdido) await mensaje(ent.ui, 'online.perdida');
        break;
      }
      con.juego('todos', { k: 'fin', resultado: r });
      activos.forEach((p, i) => {
        p.puntos = r.jugadores[i].puntos;
        p.vidas = r.jugadores[i].vidas;
      });
      const mios = r.jugadores[yo].puntos;
      if (r.superada) {
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
      if (perdido) {
        await mensaje(ent.ui, 'online.perdida');
        break;
      }
      if (decision === 'no') {
        con.juego('todos', { k: 'menu' });
        break;
      }
      for (const p of jugadores.filter((q) => !salieron.has(q.id))) {
        p.vidas = VIDAS;
        p.puntos = 0;
      }
    }
  } finally {
    clearInterval(vigilante);
    for (const f of sueltos) f();
    partida?.terminarRed('salir');
  }
}

// ---------------------------------------------------------------- a guest

async function invitado(sala: SalaLista, ent: EntornoOnline) {
  const { con } = sala;
  const miPj = sala.jugadores.find((j) => j.id === sala.yo)?.pj ?? 'fran';
  const record = libro(miPj);
  const cola = new Cola<Msg>();
  let partida = null as Partida | null;
  /** The host announced the end of the game: his closing the room is normal from now on. */
  let acabada = false;
  let sinAnfitrion = false;
  let miIndice = 0;
  /** My points when the last stage ended, for the end screen. */
  let ultimos = 0;

  const perder = () => {
    if (acabada || sinAnfitrion) return;
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
      } else cola.poner(d);
    }),
    con.on('cerrada', perder),
    con.on('perdida', perder),
  ];

  try {
    let msg: Msg | 'salir' = await esperar(ent.ui, 'online.eligeFase', cola);
    for (;;) {
      if (msg === 'salir') break;
      if (msg.k === '@fuera') {
        record.anotar();
        await mensaje(ent.ui, 'online.anfitrionFuera');
        break;
      }
      if (msg.k === 'menu') {
        acabada = true;
        break;
      }
      if (msg.k === 'final') {
        acabada = true;
        await pantallaFinal(ent.ui, ultimos);
        record.anotar();
        break;
      }
      if (msg.k !== 'fase') {
        msg = await cola.siguiente();
        continue;
      }
      const n = Number(msg.n);
      const lista = Array.isArray(msg.jugadores) ? (msg.jugadores as Msg[]) : [];
      const activos: Participante[] = lista
        .filter((p) => PJS.includes(p.pj as PjId))
        .map((p) => ({ id: Number(p.id), pj: p.pj as PjId, vidas: Number(p.vidas) || 0, puntos: Number(p.puntos) || 0 }));
      miIndice = activos.findIndex((p) => p.id === sala.yo);
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
        jugadores: activos.map(({ pj, vidas, puntos }) => ({ pj, vidas, puntos })),
        controles: activos.map((p): Control => (p.id === sala.yo ? 'local' : 'red')),
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
      partida = null;
      if (r === 'salir') {
        record.anotar();
        if (sinAnfitrion) await mensaje(ent.ui, 'online.anfitrionFuera');
        break;
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
 * Sends this screen's buttons to the host: the held ones as they are, the presses as ever-growing
 * counters (so none is lost), whenever something changes and every half second as a heartbeat. The
 * presses are put back to false here so the guest's own Partida, which never plays, does not keep them.
 */
function mandarMandos(con: Conexion, p: Partida, yo: number): () => void {
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
