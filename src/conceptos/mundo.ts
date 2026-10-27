// The game state of «Una más» and its rules: Fran's platforming (coyote time, jump buffer, variable jump, soft acceleration), the jarrazo and the
// three skills (Cierzo, Teclazo, Mutis), the rooms and their doors, the bars that save, the talks and the cut-scenes, the camera. Fixed time step:
// `actualizar(dt)` is called with 1/60. Drawing lives in render.ts, the enemies' brains in enemigos.ts.
import { dialogo, texto, type Linea } from '../juego/textos';
import { type Arte } from './arte';
import { HABILIDADES, PRIMERA_SALA, SALAS, TILE, ZONAS, type Habilidad, type Sala, type Zona } from './datos';
import { crearEnemigo, actualizarEnemigos, actualizarProyectiles, type Charco, type Enem, type Proyectil } from './enemigos';
import type { Mandos } from './entrada';
import { chocaRect, crearRejilla, haySuelo, moverX, moverY, sueloEn, tocaPinchos, type Caja, type Rejilla } from './fisica';
import { Efectos } from './fx';
import type { Fondo } from './fondos';
import type { NivelBmp } from './nivel';
import type { SonidoUnaMas } from './sonido';

// ---------------------------------------------------------------- feel (units: game px and seconds)
export const V_CORRE = 330;
export const G_SUBE = 2200;
export const G_BAJA = 3100;
export const V_SALTO = 845;
export const V_SALTO_AIRE = 770;
export const V_CAIDA = 1150;
const ACEL_SUELO = 3200;
const FREN_SUELO = 3800;
const ACEL_AIRE = 2300;
const FREN_AIRE = 1100;
const COYOTE = 0.1;
const BUFFER = 0.13;
const V_MUTIS = 900;
const T_MUTIS = 0.22;
/** The screen shows 540 units of height; the world is drawn zoomed in so that Fran reads at about a sixth of it (the camera sees 540 / ZOOM). */
export const ZOOM = 1.3;
export const VISTA_ALTO = 540 / ZOOM;
const HW = 17;
const ALTO = 82;
const DUR_ATAQUE = 0.3;

export type EstadoJuego = 'jugando' | 'dialogo' | 'transicion' | 'muerte' | 'carta' | 'fin' | 'jefeIntro' | 'jefeMuerte' | 'rescate';

export interface Jugador extends Caja {
  vx: number;
  vy: number;
  cara: 1 | -1;
  suelo: boolean;
  coyote: number;
  buffer: number;
  saltando: boolean;
  dobleLibre: boolean;
  vida: number;
  inv: number;
  aturdido: number;
  /** Seconds into the swing; -1 when not attacking. */
  atq: number;
  atqArco: boolean;
  golpeados: Set<Enem>;
  cargando: boolean;
  cargaT: number;
  /** The Teclazo's own swing (seconds; -1 none). */
  tec: number;
  mutisT: number;
  mutisCool: number;
  mutisAire: boolean;
  bajarT: number;
  aterrizaT: number;
  /** In a puddle (slowed). */
  chof: boolean;
  animT: number;
  pasos: number;
  seguro: { x: number; y: number };
}

export interface Progreso {
  habs: Set<Habilidad>;
  vidaMax: number;
  /** Things done for good (the boss, Guille, sips taken). */
  hechos: Set<string>;
  guardado: { sala: string; x: number; y: number };
  muertes: number;
}

export interface Dialogo {
  lineas: Linea[];
  i: number;
  /** Characters of the current line already shown. */
  c: number;
  t: number;
  alAcabar: () => void;
}

export interface Aviso {
  texto: string;
  t: number;
  dur: number;
}

export interface BarraBar {
  x: number;
  y: number;
  id: string;
  /** The player is on it right now (to save once per visit). */
  dentro: boolean;
  brillo: number;
}

export interface SorboPick {
  x: number;
  y: number;
  id: string;
}

export interface PuertaViva {
  x: number;
  y: number;
  sala: string;
  col2: number;
  fila2: number;
  zona?: Zona;
}

export interface CartelVivo {
  x: number;
  y: number;
  clave: string;
  t: number;
  visto: boolean;
}

export interface OpcionesMundo {
  sala?: string;
  col?: number;
  fila?: number;
  habs?: Habilidad[];
  vidaMax?: number;
}

const aprox = (v: number, a: number, d: number) => (v < a ? Math.min(a, v + d) : Math.max(a, v - d));

export class Mundo {
  estado: EstadoJuego = 'jugando';
  reloj = 0;
  fx = new Efectos();
  prog: Progreso;
  sala!: Sala;
  rej!: Rejilla;
  W = 0;
  H = 0;
  nivel: NivelBmp | null = null;
  fondo: Fondo | null = null;
  j: Jugador;
  enems: Enem[] = [];
  charcos: Charco[] = [];
  proy: Proyectil[] = [];
  barras: BarraBar[] = [];
  sorbos: SorboPick[] = [];
  puertas: PuertaViva[] = [];
  carteles: CartelVivo[] = [];
  jefe: Enem | null = null;
  /** The fight: 0 not started, 1 on, 2 won. */
  pelea = 0;
  flor = { x: 0, y: 0, estado: 'ninguna' as 'ninguna' | 'cerrada' | 'abriendo' | 'abierta', t: 0, guille: 'atrapado' as 'atrapado' | 'libre', habla: false };
  cam = { x: 0, y: 0, mira: 0 };
  vw = 960;
  vh = VISTA_ALTO;
  dialogo: Dialogo | null = null;
  avisos: Aviso[] = [];
  /** Zone banner: shows the zone's name for a while. */
  banner: { titulo: string; sub: string; t: number } | null = null;
  /** Boss banner. */
  bannerJefe: { titulo: string; sub: string; t: number } | null = null;
  /** Ability card after earning a skill. */
  carta: { hab: Habilidad; t: number } | null = null;
  fade = 0;
  fadeObjetivo = 0;
  transicion: { sala: string; x: number; y: number; t: number; zona?: Zona; cargada: boolean } | null = null;
  tMuerte = 0;
  tEstado = 0;
  vistos = new Set<string>();
  puertaCool = 0;
  /** The performance hook and tests read these. */
  fotogramas = 0;
  /** The last landing speed, for the thud. */
  zonaActual: Zona | null = null;
  /** The skill card asked the game to refresh the touch buttons. */
  alCambiarHabs: () => void = () => {};
  /** Called when the delivery ends (the last door). */
  alTerminar: () => void = () => {};
  /** Called when a room opens (the renderer needs to bake it). */
  alCargarSala: (s: Sala, zonaNueva: boolean) => void = () => {};
  /** Called when the music should change. */
  /** A talk to start once the room has faded in. */
  dialogoPendiente: string | null = null;

  constructor(
    readonly arte: Arte,
    readonly snd: SonidoUnaMas,
    o: OpcionesMundo = {},
  ) {
    const salaId = o.sala ?? PRIMERA_SALA[1];
    const s = SALAS[salaId];
    const col = o.col ?? s.inicio.col;
    const fila = o.fila ?? s.inicio.fila;
    this.prog = {
      habs: new Set(o.habs ?? []),
      vidaMax: o.vidaMax ?? 5,
      hechos: new Set(),
      guardado: { sala: salaId, x: (col + 0.5) * TILE, y: (fila + 1) * TILE },
      muertes: 0,
    };
    // A start in the garden's later rooms assumes what came before.
    if ((o.habs ?? []).includes('cierzo')) this.prog.hechos.add('guille').add('jardin-3.gran.0');
    this.j = this.nuevoJugador((col + 0.5) * TILE, (fila + 1) * TILE);
  }

  private nuevoJugador(x: number, y: number): Jugador {
    return {
      x, y, hw: HW, h: ALTO, vx: 0, vy: 0, cara: 1, suelo: true, coyote: 0, buffer: 0, saltando: false, dobleLibre: true,
      vida: this.prog?.vidaMax ?? 5, inv: 0, aturdido: 0, atq: -1, atqArco: false, golpeados: new Set(), cargando: false, cargaT: 0, tec: -1,
      mutisT: 0, mutisCool: 0, mutisAire: false, bajarT: 0, aterrizaT: 0, chof: false, animT: 0, pasos: 0, seguro: { x, y },
    };
  }

  tiene(h: Habilidad) {
    return this.prog.habs.has(h);
  }

  /** Is the Cierzo (or whichever skill is the first earned) the label of the skill button? Null before any skill. */
  etiquetaHab(): string | null {
    if (this.tiene('mutis')) return texto('mando.habilidad.mutis');
    if (this.tiene('teclazo') && !this.tiene('cierzo')) return texto('mando.habilidad.teclazo');
    if (this.tiene('cierzo')) return texto('mando.habilidad');
    return null;
  }

  // ---------------------------------------------------------------- rooms

  /** Opens a room: grid, enemies, props. `x`,`y`: where the player stands (feet). */
  cargarSala(id: string, x: number, y: number, fijarCamara = true) {
    const s = SALAS[id];
    this.sala = s;
    this.rej = crearRejilla(s);
    this.W = s.cols * TILE;
    this.H = s.rows * TILE;
    this.enems = [];
    this.charcos = [];
    this.proy = [];
    this.jefe = null;
    this.pelea = this.prog.hechos.has(`${s.id}.gran.0`) ? 2 : 0;
    for (const e of s.enemigos) {
      if (this.prog.hechos.has(e.id)) continue;
      this.enems.push(crearEnemigo(e.tipo, e.id, (e.col + 0.5) * TILE, (e.fila + 1) * TILE));
    }
    if (s.jefe && !this.prog.hechos.has(`${s.id}.gran.0`)) {
      const b = crearEnemigo('gran', `${s.id}.gran.0`, (s.jefe.col + 0.5) * TILE, (s.jefe.fila + 1) * TILE);
      b.estado = 'dormido';
      this.enems.push(b);
      this.jefe = b;
      // Until it is beaten, the way on is shut.
      this.cerrarPuerta(s.jefe.puertas[1], true);
    }
    this.barras = s.barras.map((b) => ({ x: (b.col + 0.5) * TILE, y: (b.fila + 1) * TILE, id: b.id, dentro: false, brillo: 0 }));
    this.sorbos = s.sorbos.filter((b) => !this.prog.hechos.has(b.id)).map((b) => ({ x: (b.col + 0.5) * TILE, y: (b.fila + 1) * TILE, id: b.id }));
    this.puertas = s.puertas.map((p) => ({ x: (p.col + 0.5) * TILE, y: (p.fila + 1) * TILE, sala: p.sala, col2: p.col2, fila2: p.fila2, zona: p.zona }));
    this.carteles = s.carteles.map((c) => ({ x: (c.col + 0.5) * TILE, y: (c.fila + 1) * TILE, clave: c.clave, t: 0, visto: false }));
    this.flor = { x: 0, y: 0, estado: 'ninguna', t: 0, guille: 'atrapado', habla: false };
    if (s.flor) {
      const libre = this.prog.hechos.has('guille');
      this.flor = { x: (s.flor.col + 0.5) * TILE, y: (s.flor.fila + 1) * TILE, estado: libre ? 'abierta' : 'cerrada', t: 0, guille: libre ? 'libre' : 'atrapado', habla: false };
    }
    this.fx.limpiar();
    const j = this.j;
    j.x = x;
    j.y = y;
    j.vx = j.vy = 0;
    j.seguro = { x, y };
    j.atq = j.tec = -1;
    j.cargando = false;
    j.mutisT = 0;
    this.puertaCool = 1.0;
    for (const b of this.barras) b.dentro = Math.abs(x - b.x) < 90 && Math.abs(y - b.y) < 20;
    if (fijarCamara) this.encuadrar(true);
  }

  private cerrarPuerta(col: number, cerrada: boolean) {
    const ch = cerrada ? 'X' : '.';
    for (let f = 7; f <= 9; f++) this.rej.g[f][col] = ch;
  }

  /** Starts crossing to another room: fade out, load, fade in. */
  irA(sala: string, col: number, fila: number, zona?: Zona) {
    if (this.estado !== 'jugando') return;
    this.estado = 'transicion';
    this.transicion = { sala, x: (col + 0.5) * TILE, y: (fila + 1) * TILE, t: 0, zona, cargada: false };
  }

  // ---------------------------------------------------------------- the camera

  vista(vw: number) {
    this.vw = vw;
  }

  /** Where the camera wants to be: a little ahead of where Fran looks, and a little below the middle. */
  private objetivoCamara(): [number, number] {
    const j = this.j;
    let cx = j.x + this.cam.mira - this.vw / 2;
    let cy = j.y - this.vh * 0.62 + (j.vy > 700 ? 70 : 0);
    cx = this.W <= this.vw ? (this.W - this.vw) / 2 : Math.max(0, Math.min(this.W - this.vw, cx));
    cy = this.H <= this.vh ? (this.H - this.vh) / 2 : Math.max(0, Math.min(this.H - this.vh, cy));
    return [cx, cy];
  }

  encuadrar(brusco: boolean, dt = 1 / 60) {
    const j = this.j;
    const quiere = Math.abs(j.vx) > 60 ? j.cara * 110 : j.cara * 40;
    this.cam.mira += (quiere - this.cam.mira) * (1 - Math.exp(-dt * 2.6));
    if (brusco) this.cam.mira = j.cara * 60;
    const [tx, ty] = this.objetivoCamara();
    if (brusco) {
      this.cam.x = tx;
      this.cam.y = ty;
    } else {
      this.cam.x += (tx - this.cam.x) * (1 - Math.exp(-dt * 6.5));
      this.cam.y += (ty - this.cam.y) * (1 - Math.exp(-dt * (j.vy > 600 ? 9 : 4.2)));
    }
  }

  // ---------------------------------------------------------------- messages

  aviso(t: string, dur = 2.4) {
    this.avisos.push({ texto: t, t: 0, dur });
    if (this.avisos.length > 3) this.avisos.shift();
  }

  hablar(clave: string, alAcabar: () => void = () => {}) {
    const lineas = dialogo(clave);
    this.dialogo = { lineas, i: 0, c: 0, t: 0, alAcabar };
    this.estado = 'dialogo';
    this.j.vx = 0;
  }

  // ---------------------------------------------------------------- the update

  actualizar(dt: number, ent: { mandos: Mandos; tomar: (k: 'saltarP' | 'atacarP' | 'habP' | 'pausaP' | 'tocarP') => boolean }) {
    this.fotogramas++;
    this.fx.actualizar(dt);
    // Hit-stop holds the world still for a few frames (real time).
    if (this.fx.paron > 0) {
      this.fx.paron -= dt;
      ent.tomar('tocarP');
      return;
    }
    const d = dt * this.fx.lento;
    this.reloj += d;
    this.tEstado += d;
    for (const a of this.avisos) a.t += d;
    this.avisos = this.avisos.filter((a) => a.t < a.dur);
    if (this.banner) {
      this.banner.t += d;
      if (this.banner.t > 3.4) this.banner = null;
    }
    if (this.bannerJefe) {
      this.bannerJefe.t += d;
      if (this.bannerJefe.t > 3) this.bannerJefe = null;
    }
    this.fade += (this.fadeObjetivo - this.fade) * Math.min(1, d * 9);
    for (const b of this.barras) b.brillo = Math.max(0, b.brillo - d * 0.8);

    switch (this.estado) {
      case 'jugando':
        this.jugando(d, ent);
        break;
      case 'dialogo':
        this.avanzaDialogo(d, ent);
        this.encuadrar(false, d);
        this.pulsoAmbiente(d);
        break;
      case 'transicion':
        this.transiciona(d);
        break;
      case 'muerte':
        this.muriendo(d);
        break;
      case 'carta':
        this.carta!.t += d;
        if (this.carta!.t > 0.7 && ent.tomar('tocarP')) {
          this.carta = null;
          this.estado = 'jugando';
          this.snd.musica(this.sala.zona);
          this.alCambiarHabs();
        }
        ent.tomar('saltarP');
        ent.tomar('atacarP');
        ent.tomar('habP');
        this.pulsoAmbiente(d);
        break;
      case 'fin':
        if (this.tEstado > 0.8 && ent.tomar('tocarP')) this.alTerminar();
        break;
      case 'jefeIntro':
        this.jefeIntro(d);
        break;
      case 'jefeMuerte':
        this.jefeMuerte(d);
        break;
      case 'rescate':
        this.rescatando(d, ent);
        break;
    }
    if (this.estado !== 'dialogo' && this.estado !== 'carta' && this.estado !== 'fin') ent.tomar('tocarP');
  }

  /** Things that keep living while the player is not in control: bars glowing, particles, the camera. */
  private pulsoAmbiente(d: number) {
    for (const e of this.enems) e.animT += d;
  }

  // ---------------------------------------------------------------- talk

  private avanzaDialogo(d: number, ent: { tomar: (k: 'saltarP' | 'atacarP' | 'habP' | 'pausaP' | 'tocarP') => boolean }) {
    const dl = this.dialogo!;
    const l = dl.lineas[dl.i];
    dl.t += d;
    const total = l.texto.length;
    const antes = Math.floor(dl.c);
    if (dl.c < total) {
      dl.c = Math.min(total, dl.c + d * 64);
      if (Math.floor(dl.c) !== antes && l.quien && Math.floor(dl.c) % 2 === 0) this.snd.texto();
    }
    const toque = ent.tomar('tocarP');
    ent.tomar('saltarP');
    ent.tomar('atacarP');
    ent.tomar('habP');
    if (toque && dl.t > 0.18) {
      if (dl.c < total) dl.c = total;
      else {
        dl.i++;
        dl.c = 0;
        dl.t = 0;
        if (dl.i >= dl.lineas.length) {
          this.dialogo = null;
          this.estado = 'jugando';
          dl.alAcabar();
        }
      }
    }
  }

  // ---------------------------------------------------------------- playing

  private jugando(d: number, ent: { mandos: Mandos; tomar: (k: 'saltarP' | 'atacarP' | 'habP' | 'pausaP' | 'tocarP') => boolean }) {
    const j = this.j;
    const m = ent.mandos;
    const saltarP = ent.tomar('saltarP');
    const atacarP = ent.tomar('atacarP');
    const habP = ent.tomar('habP');
    const dir = (m.der ? 1 : 0) - (m.izq ? 1 : 0);
    j.inv = Math.max(0, j.inv - d);
    j.mutisCool = Math.max(0, j.mutisCool - d);
    j.aterrizaT = Math.max(0, j.aterrizaT - d);
    j.bajarT = Math.max(0, j.bajarT - d);
    const control = j.aturdido <= 0;
    j.aturdido = Math.max(0, j.aturdido - d);

    // ---- puddles slow Fran down
    j.chof = this.charcos.some((c) => Math.abs(j.x - c.x) < c.w / 2 + 6 && Math.abs(j.y - c.y) < 12);
    if (j.chof && j.suelo && Math.abs(j.vx) > 60 && Math.random() < 0.3) this.fx.espuma(j.x, j.y - 2, 1, -j.cara, 120);

    // ---- skills
    const mutisLibre = this.tiene('mutis') && j.mutisCool <= 0 && (j.suelo || !j.mutisAire);
    if (control && habP && mutisLibre && j.mutisT <= 0) {
      j.mutisT = T_MUTIS;
      j.mutisCool = 0.6;
      j.mutisAire = !j.suelo;
      j.inv = Math.max(j.inv, T_MUTIS + 0.08);
      j.atq = -1;
      j.cargando = false;
      this.snd.mutis();
      this.fx.zoom = 0.3;
    }

    // ---- horizontal movement
    const frena = j.chof ? 0.5 : 1;
    if (j.mutisT > 0) {
      j.mutisT -= d;
      j.vx = j.cara * V_MUTIS;
      j.vy = 0;
      // A trail of red curtain and gold.
      if (Math.random() < 0.9) this.fx.chispas(j.x - j.cara * 20, j.y - 40 + (Math.random() - 0.5) * 50, 1, -j.cara, 120, Math.random() < 0.5 ? '#ff5a6a' : '#ffd24a', 0.6);
    } else if (control) {
      const atacando = j.atq >= 0 || j.cargando || j.tec >= 0;
      const tope = dir * V_CORRE * frena * (j.cargando ? 0.4 : atacando ? 0.8 : 1);
      let acc = j.suelo ? (dir ? ACEL_SUELO : FREN_SUELO) : dir ? ACEL_AIRE : FREN_AIRE;
      if (dir && Math.sign(j.vx) === -dir) acc *= 1.7;
      j.vx = aprox(j.vx, tope, acc * d);
      if (dir && j.atq < 0 && j.tec < 0) j.cara = dir as 1 | -1;
    } else {
      j.vx = aprox(j.vx, 0, FREN_AIRE * 0.3 * d);
    }

    // ---- jump: coyote time, buffer, variable height, the Cierzo
    if (control) {
      if (saltarP) j.buffer = BUFFER;
      else j.buffer = Math.max(0, j.buffer - d);
      if (j.suelo) {
        j.coyote = COYOTE;
        j.dobleLibre = true;
        j.mutisAire = false;
      } else j.coyote = Math.max(0, j.coyote - d);
      const quiereBajar = m.abajo && saltarP && this.sobreRepisa();
      if (quiereBajar) {
        j.bajarT = 0.22;
        j.buffer = 0;
        j.suelo = false;
        j.y += 2;
      } else if (j.buffer > 0 && j.coyote > 0 && j.mutisT <= 0) {
        j.vy = -V_SALTO * (j.chof ? 0.88 : 1);
        j.coyote = 0;
        j.buffer = 0;
        j.saltando = true;
        j.suelo = false;
        this.fx.polvo(j.x, j.y, 5, 14);
        this.snd.salto();
      } else if ((saltarP || (habP && !this.tiene('mutis'))) && !j.suelo && j.coyote <= 0 && this.tiene('cierzo') && j.dobleLibre && j.mutisT <= 0) {
        j.vy = -V_SALTO_AIRE;
        j.dobleLibre = false;
        j.saltando = true;
        j.buffer = 0;
        this.fx.cierzo(j.x, j.y - 6);
        this.snd.cierzo();
      }
      if (j.saltando && j.vy < 0 && !m.saltar) {
        j.vy *= 0.45;
        j.saltando = false;
      }
    }
    if (j.vy >= 0) j.saltando = false;
    if (j.mutisT <= 0) {
      j.vy += (j.vy < 0 ? G_SUBE : G_BAJA) * d;
      if (j.vy > V_CAIDA) j.vy = V_CAIDA;
    }

    // ---- the jarrazo and the Teclazo
    if (control) this.ataque(d, m, atacarP);
    else {
      j.atq = j.tec = -1;
      j.cargando = false;
    }

    // ---- move through the tiles
    const paso = { bajar: j.bajarT > 0, telones: j.mutisT > 0 };
    if (moverX(this.rej, j, j.vx * d, paso)) {
      if (j.mutisT > 0) j.mutisT = 0;
      j.vx = 0;
    }
    const antesVy = j.vy;
    const r = moverY(this.rej, j, j.vy * d, paso);
    if (r === 1) {
      if (!j.suelo && antesVy > 300) {
        this.fx.polvo(j.x, j.y, 5 + Math.min(6, antesVy / 220), 16);
        this.snd.aterriza(antesVy / 1000);
        j.aterrizaT = antesVy > 560 ? 0.1 : 0;
      }
      j.suelo = true;
      j.vy = 0;
    } else if (r === -1) j.vy = Math.max(0, j.vy * 0.2);
    else j.suelo = j.vy >= 0 && haySuelo(this.rej, j, paso, 1);
    if (j.suelo && j.vy > 0) j.vy = 0;
    // The last safe place: on solid ground with ground on both sides (spikes and falls send Fran back there).
    if (j.suelo && sueloEn(this.rej, j.x - 30, j.y) && sueloEn(this.rej, j.x + 30, j.y) && !tocaPinchos(this.rej, j)) j.seguro = { x: j.x, y: j.y };

    // ---- walking animation clock and steps
    if (j.suelo && Math.abs(j.vx) > 40) {
      j.pasos += Math.abs(j.vx) * d;
      this.snd.paso(d);
      if (Math.random() < 0.05) this.fx.polvo(j.x - j.cara * 8, j.y, 1, 6);
    }
    j.animT += d;

    // ---- the world
    actualizarEnemigos(this, d);
    actualizarProyectiles(this, d);
    for (const c of this.charcos) c.vida -= d;
    this.charcos = this.charcos.filter((c) => c.vida > 0);
    this.interacciones(d);
    this.encuadrar(false, d);
    this.pulsoAmbiente(0);
    this.ambiente(d);
  }

  /** Ambient sparks of the bars and the doors. */
  private ambiente(d: number) {
    for (const b of this.barras) if (Math.random() < d * 5) this.fx.brasas(b.x + 44, b.y - 110, 14);
    for (const p of this.puertas) if (Math.random() < d * 6) this.fx.brasas(p.x, p.y - 20, 40, '#fff2b8');
    for (const c of this.carteles) c.t += d;
  }

  private sobreRepisa(): boolean {
    const j = this.j;
    const c = Math.floor(j.x / TILE);
    const f = Math.floor((j.y + 2) / TILE);
    return this.rej.g[f]?.[c] === '=';
  }

  // ---- combat of Fran

  private ataque(d: number, m: Mandos, atacarP: boolean) {
    const j = this.j;
    if (atacarP && j.atq < 0 && j.tec < 0 && j.mutisT <= 0 && !j.cargando) {
      j.atq = 0;
      j.atqArco = false;
      j.golpeados.clear();
      this.snd.jarrazo();
    }
    if (j.atq >= 0) {
      j.atq += d;
      if (j.atq >= 0.06 && !j.atqArco) {
        j.atqArco = true;
        this.fx.arco(j.x + j.cara * 14, j.y - 52, j.cara);
      }
      if (j.atq >= 0.06 && j.atq <= 0.2) this.golpear(j.x - j.cara * 8, j.x + j.cara * 104, j.y - ALTO - 12, j.y + 6, 1, false);
      if (j.atq >= DUR_ATAQUE) {
        j.atq = -1;
        // Still holding attack with the Teclazo: charge.
        if (this.tiene('teclazo') && m.atacar) {
          j.cargando = true;
          j.cargaT = 0;
        }
      }
    }
    if (j.cargando) {
      if (!m.atacar) {
        const lista = j.cargaT >= 0.55;
        j.cargando = false;
        if (lista) {
          j.tec = 0;
          j.golpeados.clear();
          this.snd.teclazo();
          this.fx.arco(j.x + j.cara * 20, j.y - 48, j.cara, 1, 'teclazo');
          this.fx.teclas(j.x + j.cara * 80, j.y - 50, 12);
        }
      } else {
        const antes = j.cargaT;
        j.cargaT += d;
        if (Math.floor(antes * 8) !== Math.floor(j.cargaT * 8)) this.snd.teclazoCarga(Math.min(1, j.cargaT / 0.55));
        if (j.cargaT > 0.55 && Math.random() < 0.5) this.fx.estrellas(j.x + (Math.random() - 0.5) * 50, j.y - 40 - Math.random() * 40, 1, '#9ff0ec');
      }
    }
    if (j.tec >= 0) {
      j.tec += d;
      if (j.tec >= 0.04 && j.tec <= 0.22) {
        this.golpear(j.x - j.cara * 20, j.x + j.cara * 190, j.y - ALTO - 30, j.y + 10, 3, true);
        this.romperBloques(j.cara > 0 ? j.x : j.x - 190, j.cara > 0 ? j.x + 190 : j.x, j.y - ALTO - 20, j.y);
      }
      if (j.tec >= 0.36) j.tec = -1;
    }
  }

  /** Hits every enemy in the box not yet hit by this swing. */
  private golpear(x0: number, x1: number, y0: number, y1: number, dano: number, fuerte: boolean) {
    const j = this.j;
    const xa = Math.min(x0, x1);
    const xb = Math.max(x0, x1);
    for (const e of this.enems) {
      if (e.muerto || e.estado === 'dormido' || j.golpeados.has(e)) continue;
      if (xb < e.x - e.hw || xa > e.x + e.hw || y1 < e.y - e.h || y0 > e.y) continue;
      j.golpeados.add(e);
      this.herirEnemigo(e, dano, fuerte);
    }
  }

  herirEnemigo(e: Enem, dano: number, fuerte: boolean) {
    const j = this.j;
    e.hp -= dano;
    e.hurtT = 0.12;
    const pesado = e.tipo === 'gran' ? 0.18 : 1;
    e.vx = j.cara * (fuerte ? 520 : 330) * pesado;
    e.kx = e.tipo === 'gran' ? 0 : 0.22;
    e.vy = e.tipo === 'gran' ? e.vy : -140;
    const px = Math.max(e.x - e.hw, Math.min(e.x + e.hw, j.x + j.cara * 60));
    const py = e.y - e.h * 0.55;
    this.fx.golpe(px, py, j.cara, fuerte);
    this.snd.golpe(fuerte);
    if (!fuerte && j.suelo) j.vx -= j.cara * 70;
    if (e.hp <= 0) this.matar(e);
    else if (e.tipo === 'despertador' || e.tipo === 'reloj') {
      e.estado = e.tipo === 'despertador' ? 'mareo' : 'repta';
      e.t = e.tipo === 'despertador' ? 0.5 : 0;
    }
  }

  matar(e: Enem) {
    e.muerto = true;
    const col = e.tipo === 'despertador' ? '#ff8a46' : e.tipo === 'reloj' ? '#8a7aff' : '#ff5a7a';
    const grande = e.tipo === 'gran';
    this.fx.muerteEnemigo(e.x, e.y - e.h * 0.5, col, grande);
    this.snd.muerteEnemigo(grande);
    if (grande) {
      this.prog.hechos.add(e.id);
      this.pelea = 2;
      this.estado = 'jefeMuerte';
      this.tEstado = 0;
      this.fx.camaraLenta(0.28, 1.6);
      this.fx.destello(0.7, '#fff6d8');
      this.proy = [];
      this.snd.parar(1.2);
    }
  }

  private romperBloques(x0: number, x1: number, y0: number, y1: number) {
    let rompio = false;
    for (let f = Math.floor(y0 / TILE); f <= Math.floor(y1 / TILE); f++) {
      for (let c = Math.floor(x0 / TILE); c <= Math.floor(x1 / TILE); c++) {
        if (this.rej.g[f]?.[c] === 'N') {
          this.rej.g[f][c] = '.';
          rompio = true;
          this.fx.muerteEnemigo((c + 0.5) * TILE, (f + 0.5) * TILE, '#e8453c');
          this.fx.teclas((c + 0.5) * TILE, (f + 0.5) * TILE, 8);
        }
      }
    }
    if (rompio) this.nivelSucio = true;
  }

  /** The renderer rebakes the tiles when this is set (a block broke). */
  nivelSucio = false;

  // ---- hurt

  herir(desdeX: number, dano = 1) {
    const j = this.j;
    if (j.inv > 0 || j.mutisT > 0 || this.estado !== 'jugando') return;
    j.vida -= dano;
    j.inv = 1.4;
    j.aturdido = 0.3;
    j.atq = j.tec = -1;
    j.cargando = false;
    const lado = j.x >= desdeX ? 1 : -1;
    j.vx = lado * 400;
    j.vy = -340;
    j.suelo = false;
    j.saltando = false;
    this.fx.danoJugador(j.x, j.y - 46, lado);
    this.snd.dano();
    if (j.vida <= 0) this.morir();
  }

  private pinchos() {
    const j = this.j;
    if (j.inv > 0 && j.mutisT > 0) return;
    j.vida -= 1;
    this.fx.danoJugador(j.x, j.y - 30, 0);
    this.fx.estrellas(j.x, j.y - 20, 6, '#ff8aa8');
    this.snd.pinchos();
    if (j.vida <= 0) return this.morir();
    this.aviso(texto('aviso.pinchos'), 1.4);
    // Back to the last safe place, with a blink of protection.
    j.x = j.seguro.x;
    j.y = j.seguro.y;
    j.vx = j.vy = 0;
    j.inv = 1.4;
    j.aturdido = 0.2;
    this.encuadrar(true);
  }

  private morir() {
    this.estado = 'muerte';
    this.tMuerte = 0;
    this.prog.muertes++;
    this.snd.muerte();
    this.snd.parar(0.6);
    this.fx.camaraLenta(0.35, 0.6);
    this.fx.destello(0.4, '#ff6a6a');
    this.fadeObjetivo = 0;
  }

  private muriendo(d: number) {
    this.tMuerte += d;
    const j = this.j;
    if (this.tMuerte < 0.2) {
      j.vy += G_BAJA * d * 0.4;
    }
    if (this.tMuerte > 0.7) this.fadeObjetivo = 1;
    if (this.tMuerte > 1.9) {
      // Back to the last bar with a full jar; the fights and the sips already won stay won.
      const g = this.prog.guardado;
      const vida = this.prog.vidaMax;
      this.j = this.nuevoJugador(g.x, g.y);
      this.j.vida = vida;
      this.cargarSala(g.sala, g.x, g.y);
      this.alCargarSala(this.sala, false);
      this.estado = 'jugando';
      this.fadeObjetivo = 0;
      this.fade = 1;
      this.j.inv = 1.0;
      this.snd.musica(this.sala.zona);
    }
    this.encuadrar(false, d);
  }

  // ---- doors, bars, pickups, signs, triggers

  private interacciones(d: number) {
    const j = this.j;
    this.puertaCool = Math.max(0, this.puertaCool - d);
    // Spikes and the void.
    if (tocaPinchos(this.rej, j) && j.inv <= 0) this.pinchos();
    else if (j.y > this.H + 140) {
      if (j.inv <= 0) this.pinchos();
      else {
        j.x = j.seguro.x;
        j.y = j.seguro.y;
        j.vx = j.vy = 0;
      }
    }
    // Contact with the enemies and the shots.
    // (done in enemigos.ts)
    // Bars: save and refill, once per visit.
    for (const b of this.barras) {
      const cerca = Math.abs(j.x - b.x) < 90 && Math.abs(j.y - b.y) < 20;
      if (cerca && !b.dentro) {
        b.dentro = true;
        b.brillo = 1;
        const nueva = this.prog.guardado.sala !== this.sala.id || Math.abs(this.prog.guardado.x - b.x) > 4;
        this.prog.guardado = { sala: this.sala.id, x: b.x, y: b.y };
        const llena = j.vida >= this.prog.vidaMax;
        j.vida = this.prog.vidaMax;
        this.fx.barra(b.x, b.y);
        this.snd.barra();
        this.aviso(texto(llena || !nueva ? 'aviso.guardado' : 'aviso.jarra'), 2.4);
        if (!llena) this.aviso(texto('aviso.guardado'), 2.4);
        // Resting brings the ordinary enemies back (not the bosses).
        this.reponerEnemigos();
      } else if (!cerca) b.dentro = false;
    }
    // Sips.
    for (let i = this.sorbos.length - 1; i >= 0; i--) {
      const s = this.sorbos[i];
      if (Math.abs(j.x - s.x) < 34 && Math.abs(j.y - 30 - s.y + 30) < 60) {
        this.sorbos.splice(i, 1);
        this.prog.hechos.add(s.id);
        this.prog.vidaMax = Math.min(9, this.prog.vidaMax + 1);
        j.vida = this.prog.vidaMax;
        this.fx.estrellas(s.x, s.y - 40, 14, '#ffe9a8');
        this.fx.onda(s.x, s.y - 40, 10, '#ffd95a', 14, 0.5);
        this.snd.sorbo();
        this.aviso(texto('aviso.jarraMas'), 2.8);
      }
    }
    // Doors.
    if (this.puertaCool <= 0) {
      for (const p of this.puertas) {
        if (Math.abs(j.x - p.x) < 36 && Math.abs(j.y - p.y) < 30) {
          this.snd.puerta();
          if (p.sala === 'fin') {
            this.estado = 'fin';
            this.tEstado = 0;
            this.j.vx = 0;
            this.snd.parar(1);
            this.snd.rescate();
          } else this.irA(p.sala, p.col2, p.fila2, p.zona);
          return;
        }
      }
    }
    // Room exits through the sides.
    const fila = Math.floor((j.y - 1) / TILE);
    if (j.x < 2 || j.x > this.W - 2) {
      const lado = j.x < 2 ? 'izq' : 'der';
      const s = this.sala.salidas.find((e) => e.lado === lado && fila >= e.fila0 && fila <= e.fila1);
      if (s) this.irA(s.sala, s.col, s.fila, SALAS[s.sala].zona !== this.sala.zona ? SALAS[s.sala].zona : undefined);
    }
    // Signs.
    for (const c of this.carteles) {
      const cerca = Math.abs(j.x - c.x) < 150;
      if (cerca && !c.visto) {
        c.visto = true;
        this.snd.cartel();
      }
    }
    // The first alarm clock / clock seen: a quip.
    this.disparadores();
  }

  /** Brings back the enemies that were killed (and are not boss fights), when Fran rests at a bar. */
  private reponerEnemigos() {
    const vivos = new Set(this.enems.filter((e) => !e.muerto).map((e) => e.id));
    for (const e of this.sala.enemigos) {
      if (vivos.has(e.id) || this.prog.hechos.has(e.id)) continue;
      this.enems.push(crearEnemigo(e.tipo, e.id, (e.col + 0.5) * TILE, (e.fila + 1) * TILE));
    }
    this.enems = this.enems.filter((e) => !e.muerto);
    this.charcos = [];
  }

  private disparadores() {
    const j = this.j;
    // The jokes the first time a kind of enemy comes close.
    for (const e of this.enems) {
      if (e.muerto || this.estado !== 'jugando') continue;
      if (Math.abs(e.x - j.x) < 380 && Math.abs(e.y - j.y) < 160) {
        const clave = e.tipo === 'despertador' ? 'despertador' : e.tipo === 'reloj' ? 'reloj' : '';
        if (clave && !this.vistos.has(clave)) {
          this.vistos.add(clave);
          this.hablar(clave);
          return;
        }
      }
    }
    // The boss: crossing the line shuts the arena and starts the show.
    const s = this.sala;
    if (s.jefe && this.pelea === 0 && this.jefe && j.x > (s.jefe.disparo + 0.5) * TILE && this.estado === 'jugando') {
      this.pelea = 1;
      this.cerrarPuerta(s.jefe.puertas[0], true);
      this.cerrarPuerta(s.jefe.puertas[1], true);
      j.vx = 0;
      this.hablar('jefe.antes', () => {
        this.estado = 'jefeIntro';
        this.tEstado = 0;
        this.banner = null;
        this.bannerJefe = { titulo: texto('jefe.gran'), sub: texto('jefe.gran.sub'), t: 0 };
        this.snd.jefeEntra();
        this.fx.sacudir(6);
        this.snd.musica('miniboss');
        if (this.jefe) {
          this.jefe.estado = 'alerta';
          this.jefe.t = 0;
        }
      });
      return;
    }
    // Guille's flower.
    if (s.flor && this.flor.estado === 'cerrada' && Math.abs(j.x - this.flor.x) < 190 && j.suelo && this.estado === 'jugando') {
      j.vx = 0;
      this.hablar('guille.antes', () => {
        this.estado = 'rescate';
        this.tEstado = 0;
        this.flor.estado = 'abriendo';
        this.flor.t = 0;
      });
      return;
    }
    if (s.flor && this.flor.estado === 'abierta' && this.flor.guille === 'libre' && !this.flor.habla && Math.abs(j.x - this.flor.x) < 150 && j.suelo && this.estado === 'jugando') {
      this.flor.habla = true;
      j.vx = 0;
      this.hablar('guille.sigue');
    }
  }

  // ---- cut-scenes

  private transiciona(d: number) {
    const t = this.transicion!;
    t.t += d;
    this.fadeObjetivo = t.t < 0.28 ? 1 : 0;
    this.fade = t.t < 0.28 ? Math.min(1, t.t / 0.28) : this.fade;
    if (t.t >= 0.28 && !t.cargada) {
      t.cargada = true;
      const nueva = !!t.zona && t.zona !== this.zonaActual;
      this.cargarSala(t.sala, t.x, t.y);
      this.alCargarSala(this.sala, nueva);
      this.j.inv = Math.max(this.j.inv, 0.5);
      this.fade = 1;
    }
    if (t.t >= 0.45) {
      this.estado = 'jugando';
      this.transicion = null;
      this.fadeObjetivo = 0;
      const p = this.dialogoPendiente;
      this.dialogoPendiente = null;
      if (p) this.hablar(p);
    }
  }

  private jefeIntro(d: number) {
    const e = this.jefe;
    if (e) {
      e.animT += d;
      if (Math.floor((this.tEstado - d) / 0.35) !== Math.floor(this.tEstado / 0.35)) this.fx.sacudir(3);
    }
    this.encuadrar(false, d);
    if (this.tEstado > 2.2) {
      this.estado = 'jugando';
      if (e) {
        e.estado = 'espera';
        e.t = 0.6;
      }
    }
  }

  private jefeMuerte(d: number) {
    // The boss comes apart in a chain of bursts, then the gate opens.
    const e = this.jefe!;
    const k = this.tEstado;
    if (Math.random() < d * 14 && k < 1.4) this.fx.muerteEnemigo(e.x + (Math.random() - 0.5) * 120, e.y - Math.random() * 110, Math.random() < 0.5 ? '#ff5a7a' : '#ffcf4a', false);
    if (k > 1.5) {
      const s = this.sala.jefe!;
      this.cerrarPuerta(s.puertas[0], false);
      this.cerrarPuerta(s.puertas[1], false);
      this.enems = this.enems.filter((x) => x !== e);
      this.jefe = null;
      this.snd.musica(this.sala.zona);
      this.estado = 'jugando';
      this.prog.vidaMax = Math.min(9, this.prog.vidaMax + 1);
      this.j.vida = this.prog.vidaMax;
      this.aviso(texto('aviso.jarraMas'), 3.2);
      this.snd.sorbo();
      this.hablar('jefe.despues');
    }
    this.encuadrar(false, d);
  }

  private rescatando(d: number, ent: { tomar: (k: 'saltarP' | 'atacarP' | 'habP' | 'pausaP' | 'tocarP') => boolean }) {
    const f = this.flor;
    f.t += d;
    this.encuadrar(false, d);
    ent.tomar('tocarP');
    if (f.estado === 'abriendo') {
      if (f.t > 0.55 && f.guille === 'atrapado') {
        f.guille = 'libre';
        this.fx.rescate(f.x, f.y - 140);
        this.snd.rescate();
      }
      if (f.t > 0.7 && f.t < 0.9) this.fx.sacudir(5);
      if (f.t > 1.4) {
        f.estado = 'abierta';
        this.prog.hechos.add('guille');
        f.habla = true;
        this.snd.musica('rescate');
        this.hablar('guille.despues', () => {
          this.darHabilidad('cierzo');
        });
      }
    }
  }

  /** Earning a skill: the card, the sound, the button. */
  darHabilidad(h: Habilidad) {
    this.prog.habs.add(h);
    this.carta = { hab: h, t: 0 };
    this.estado = 'carta';
    this.snd.habilidad();
    this.fx.estrellas(this.j.x, this.j.y - 50, 20, '#9ff0ec');
    this.alCambiarHabs();
  }

  // ---------------------------------------------------------------- test helpers

  /** Where the first free tile is, for the tests: look ahead of Fran at `dx` units. */
  mirar(dx: number) {
    const j = this.j;
    const x = j.x + dx;
    const suelo = sueloEn(this.rej, x, j.y);
    const muro = chocaRect(this.rej, j.x + Math.sign(dx) * (j.hw + 2), j.y - j.h + 2, x, j.y - 6);
    return { suelo, muro };
  }

  habilidades(): Habilidad[] {
    return HABILIDADES.filter((h) => this.prog.habs.has(h));
  }

  zonaDe(id: string): Zona {
    return SALAS[id].zona;
  }

  numeroZona(z: Zona) {
    return ZONAS[z].numero;
  }
}
