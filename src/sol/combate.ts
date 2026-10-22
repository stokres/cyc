// The turn-based fight of «Alacant Sun», as faithful to the first *Golden Sun* as we can make it:
// a swirl into a wide field at night; the enemies up on the right and the friends down on the left, seen
// from behind; the camera turning around the field while the orders are chosen and centring on the target;
// a first menu (Luchar / Huir / Estado), then for each friend a row of icons (Atacar, Impronergía,
// Apuntadores, Invocar, Objeto, Defender) with the hand over the enemy to hit; and then the whole round
// plays out by agility, with the damage numbers jumping and the beaten enemy melting away.
//
// HOW TO CALL IT FROM THE WORLD (src/sol/sol.ts keeps the loop; the fight is a mode of it):
//
//   const combate = empezarCombate({ grupo, enemigos: ['petardo', 'movil'], fondo: 'campo', sonido, mandos });
//   // every frame of the loop, while `combate.activo`:
//   combate.update(dt);      // instead of the world's update
//   combate.dibujar(g);      // instead of the world's drawing, on the 240×160 canvas (fades included)
//   const r = await combate.resultado;   // 'victoria' | 'derrota' | 'huida'
//
// `luchar(grupo, enemigos, fondo)` in sol.ts wraps exactly that and returns the promise. Facts to know:
//  - `grupo` (grupo.ts) is read and changed in place: health, IP, items, coins, experience, level and the
//    state of the prompters («apuntadores»). After a victory the friends who were down stand up with 1 PV.
//  - After a defeat everybody is at 0 PV: the world decides (an inn, a game over); `descansar(grupo)` heals all.
//  - `enemigos` are ids of ENEMIGOS (enemigos.ts), one to five; `sinHuida: true` for a boss.
//  - `fondo` is a FondoCombate (fondo.ts); only 'campo' exists now.
//  - The fight swirls in from whatever the screen last showed (draw the world once before starting), stops
//    the world's music and puts back the track it found when it ends. Texts: src/textos/sol.md (combate.*).
//  - The window of the fight takes the buttons while `activo`; the world must not read them.
// Test hook: Combate.estado(), elegir(), ganar(), perder() (window.__sol().combate in sol.ts).
//
// Performance (docs/ESTILO.md, T5/T6): everything is cached pictures; per frame only drawImage, a few pixel
// rectangles for the effects and a bounded number of particles.
import { texto } from '../juego/textos';
import { type Mandos } from './consola';
import { dibujarRemolino, easeInOut, easeOut, limitar, Numeros, Particulas, blanco, type TipoNumero } from './efectos';
import * as FX from './efectosPoderes';
import type { Donde, Escena, OpcionesAnim, Punto } from './efectosPoderes';
import { ENEMIGOS, siluetaEnemigo, spriteEnemigo, type AtaqueEnemigo, type DefEnemigo, MECHA_PETARDO } from './enemigos';
import { anchoTexto, escribir } from './fuente';
import { dibujarFondo, type FondoCombate } from './fondo';
import {
  AMIGOS, ajustar, darExp, eficacia, expTotal, statsDe, vivo, type ApuntadorGrupo, type Elemento, type Grupo, type Miembro,
  type SubidaDeNivel,
} from './grupo';
import { apuntador as imgApuntador, escudito, flechita, iconoOrden, ORDENES, type Orden } from './iconos';
import { Dialogo, manoCursor, ventana } from './interfaz';
import { FRAMES, LUCHADOR_H, LUCHADOR_PIES, luchador, type PoseCombate } from './luchadores';
import type { Amigo } from './personajes';
import { chispa } from './arte';
import { ctx, girar, lienzo, rect, una } from './pixel';
import {
  apuntadorPorId, INVOCACIONES, OBJETOS, poderesDe, TURNOS_RECUPERA, VECINOS, type Invocacion, type Objeto, type Poder,
} from './poderes';
import {
  EFECTO_CAE, EFECTO_ENCUENTRO, EFECTO_GOLPE, EFECTO_HUIR, EFECTO_MENU, PISTA_COMBATE, PISTA_NIVEL, PISTA_VICTORIA, type SonidoSol,
} from './sonido';

export type ResultadoCombate = 'victoria' | 'derrota' | 'huida';

export interface OpcionesCombate {
  grupo: Grupo;
  /** Ids of ENEMIGOS, one to five. */
  enemigos: string[];
  fondo?: FondoCombate;
  sonido: SonidoSol;
  mandos: Mandos;
  /** A boss: there is no running away. */
  sinHuida?: boolean;
  /** Plays everything four times faster (tests). */
  rapido?: boolean;
}

/** What the test hook tells about the fight. */
export interface EstadoCombate {
  /** 'entrada' | 'menu' | 'ordenes' | 'ronda' | 'victoria' | 'derrota' | 'huida' | 'fin' */
  fase: string;
  ronda: number;
  /** The friend who is choosing now. */
  turno: string | null;
  /** What the window shows: 'luchar' | 'ordenes' | 'lista' | 'objetivo' | 'estado' | ''. */
  menu: string;
  mensaje: string;
  enemigos: Array<{ id: string; pv: number; pvMax: number; vivo: boolean }>;
  grupo: Array<{ q: string; nivel: number; exp: number; pv: number; pvMax: number; ip: number; ipMax: number; defiende: boolean }>;
  apuntadores: Array<{ id: string; dueno: string; estado: string; turnos: number }>;
  objetos: Record<string, number>;
  monedas: number;
  camara: number;
  resultado: ResultadoCombate | null;
}

// ---------------------------------------------------------------- geometry of the field

/** The ring of the enemies and the ring of the friends: centre and radii on the screen. */
const PE = { x: 130, y: 118, rx: 86, ry: 52 };
const PH = { x: 130, y: 82, rx: 90, ry: 39 };
const CENTRO_ENEMIGOS = 0.6;
const CAJA_Y = 123;

interface Heroe {
  lado: 'heroe';
  m: Miembro;
  idx: number;
  angulo: number;
  pose: PoseCombate;
  /** Seconds in this pose. */
  tPose: number;
  /** A fixed frame of the pose while it is being played (attack), or -1 to loop. */
  frameFijo: number;
  dx: number;
  dy: number;
  flash: number;
  defiende: boolean;
  pvVisto: number;
  ipVisto: number;
  ultimoIcono: number;
  /** Seconds of the «hurt» pose left. */
  herido: number;
}

interface Enemigo {
  lado: 'enemigo';
  def: DefEnemigo;
  idx: number;
  angulo: number;
  radio: number;
  pv: number;
  pvMax: number;
  vivo: boolean;
  /** Seconds since it began to melt (−1: standing). */
  muriendo: number;
  flash: number;
  dx: number;
  dy: number;
}

type Luchador = Heroe | Enemigo;

type OrdenHeroe =
  | { tipo: 'atacar'; obj: Enemigo }
  | { tipo: 'poder'; poder: Poder; obj: Luchador }
  | { tipo: 'soltar'; ap: ApuntadorGrupo; obj: Enemigo }
  | { tipo: 'poner'; ap: ApuntadorGrupo }
  | { tipo: 'invocar'; inv: Invocacion; aps: ApuntadorGrupo[] }
  | { tipo: 'objeto'; objeto: Objeto; obj: Heroe }
  | { tipo: 'defender' };

type Tecla = 'a' | 'b' | 'arriba' | 'abajo' | 'izq' | 'der' | 'start' | 'l' | 'r';
/** An order given by the test hook instead of the buttons. */
interface Forzada {
  forzada: string;
  objetivo?: number;
}
/** What the menus wait for. */
type Evento = Tecla | Forzada | 'fin';

/** Thrown inside a menu to end the fight at once (`ganar()` / `perder()` of the hook). */
class Corte extends Error {
  constructor(readonly resultado: ResultadoCombate) {
    super('corte');
  }
}

interface Anim {
  t: number;
  dur: number;
  o: OpcionesAnim;
  res: () => void;
  disparados: boolean[];
}

interface ItemLista {
  txt: string;
  der?: string;
  gris?: boolean;
}

const nombreAmigo = (q: Amigo) => texto(`nombre.${q}`);
const nombreEnemigo = (d: DefEnemigo) => texto(`enemigo.${d.id}.nombre`);
const azar = (a: number, b: number) => a + Math.random() * (b - a);
const sombraImg = (w: number) =>
  una(`combate.sombra.${w}`, () => {
    const c = lienzo(w, Math.max(3, Math.round(w / 4)));
    const x = ctx(c);
    x.fillStyle = 'rgba(6,8,26,0.4)';
    x.fillRect(1, 0, w - 2, c.height);
    x.fillRect(0, 1, w, c.height - 2);
    return c;
  });

// ---------------------------------------------------------------- the fight

export class Combate implements Escena {
  readonly resultado: Promise<ResultadoCombate>;
  /** True until the fight is over and has said so. */
  activo = true;

  private readonly g: Grupo;
  readonly sonido: SonidoSol;
  private readonly mandos: Mandos;
  private readonly sinHuida: boolean;
  private readonly VEL: number;
  readonly parts = new Particulas();
  private readonly numeros = new Numeros();
  private readonly dialogo: Dialogo;
  private readonly heroes: Heroe[];
  private readonly enemigos: Enemigo[];
  private readonly musicaPrevia: SonidoSol['actual'];

  private t = 0;
  private fase = 'entrada';
  private ronda = 0;
  private msg = '';
  private resultadoFinal: ResultadoCombate | null = null;
  private cam = { th: 0.95, obj: 0, rapida: 1.6 };
  private sacudida = { amp: 0, t: 0, dur: 0 };
  private flashPantalla = { col: '#fff', a: 0, t: 0, dur: 0 };
  private fundido = 1;
  private snap: HTMLCanvasElement | null = null;
  private ui = {
    modo: '' as '' | 'luchar' | 'ordenes' | 'lista' | 'objetivo' | 'estado',
    menu: { items: [] as ItemLista[], cursor: 0, x: 6, y: 22 },
    iconos: { heroe: null as Heroe | null, cursor: 0, activos: [] as boolean[] },
    objetivo: { luchador: null as Luchador | null, vecinos: [] as Luchador[] },
    estado: { idx: 0 },
    oculta: false,
    turno: null as Heroe | null,
  };
  private anims: Anim[] = [];
  private cola: Evento[] = [];
  private esperando: ((e: Evento) => void) | null = null;
  private dirPrev = { x: 0, y: 0 };
  private dirRepite = { x: 0, y: 0 };
  /** Prompters already chosen in this round's orders (so two friends do not use the same one). */
  private reservados = new Set<ApuntadorGrupo>();
  private intentosHuida = 0;

  constructor(o: OpcionesCombate) {
    this.g = o.grupo;
    this.sonido = o.sonido;
    this.mandos = o.mandos;
    this.sinHuida = !!o.sinHuida;
    this.VEL = o.rapido ? 4 : 1;
    this.musicaPrevia = o.sonido.actual;
    this.dialogo = new Dialogo(o.sonido, (q) => nombreAmigo(q as Amigo));
    this.heroes = o.grupo.miembros.map((m, i) => ({
      lado: 'heroe', m, idx: i, angulo: Math.PI + 0.35 + i * 0.34, pose: 'quieto', tPose: 0, frameFijo: -1, dx: 0, dy: 0, flash: 0, defiende: false,
      pvVisto: m.pv, ipVisto: m.ip, ultimoIcono: 0, herido: 0,
    }));
    const n = o.enemigos.length;
    const sep = n >= 5 ? 0.3 : n === 4 ? 0.33 : n === 3 ? 0.4 : 0.5;
    const centro = n === 1 ? 0.4 : CENTRO_ENEMIGOS;
    this.enemigos = o.enemigos.map((id, i) => {
      const d = ENEMIGOS[id];
      return {
        lado: 'enemigo',
        def: d,
        idx: i,
        angulo: centro + (i - (n - 1) / 2) * sep,
        radio: i % 2 ? 0.84 : 1,
        pv: d.pv,
        pvMax: d.pv,
        vivo: true,
        muriendo: -1,
        flash: 0,
        dx: 0,
        dy: 0,
      };
    });
    // a friend who comes in already down stays down
    for (const h of this.heroes) if (h.m.pv <= 0) this.ponerPose(h, 'caido');
    this.resultado = this.correr();
  }

  // ------------------------------------------------------------ helpers of time and scene (the Escena)

  animar(dur: number, o: OpcionesAnim = {}): Promise<void> {
    return new Promise((res) => {
      this.anims.push({ t: 0, dur, o, res, disparados: (o.eventos ?? []).map(() => false) });
    });
  }
  private espera(s: number) {
    return this.animar(s);
  }
  sacudir(amp: number, dur: number) {
    this.sacudida = { amp, t: 0, dur };
  }
  destello(col: string, alfa: number, dur: number) {
    this.flashPantalla = { col, a: alfa, t: 0, dur };
  }
  ocultarUI(si: boolean) {
    this.ui.oculta = si;
  }

  // ------------------------------------------------------------ positions

  private pies(l: Luchador): Punto {
    if (l.lado === 'enemigo') {
      const a = l.angulo - this.cam.th;
      return { x: PE.x + PE.rx * l.radio * Math.sin(a) + l.dx, y: PE.y - PE.ry * l.radio * Math.cos(a) + l.dy };
    }
    const a = l.angulo - this.cam.th * 0.45;
    return { x: PH.x + PH.rx * Math.sin(a) + l.dx, y: PH.y - PH.ry * Math.cos(a) + l.dy };
  }
  private alto(l: Luchador) {
    return l.lado === 'enemigo' ? spriteEnemigo(l.def.id).height + l.def.flota : LUCHADOR_H - 2;
  }
  /** The centre of the body. */
  private centro(l: Luchador): Punto {
    const p = this.pies(l);
    return { x: p.x, y: p.y - this.alto(l) / 2 };
  }
  private donde(l: Luchador): Donde {
    return () => this.centro(l);
  }
  /** The camera angle that puts an enemy in the middle of the screen. */
  private giroA(e: Enemigo) {
    return e.angulo + 0.04;
  }

  // ------------------------------------------------------------ the loop

  update(dtReal: number) {
    const dt = Math.min(0.05, dtReal) * this.VEL;
    this.t += dt;
    // buttons
    if (this.dialogo.activo) this.dialogo.update(dt, this.mandos);
    else this.leerMandos(dt);
    // animations
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      a.o.tick?.(Math.min(a.t, a.dur), dt);
      (a.o.eventos ?? []).forEach((ev, k) => {
        if (!a.disparados[k] && (a.t >= ev.t || a.t >= a.dur)) {
          a.disparados[k] = true;
          ev.f();
        }
      });
      if (a.t >= a.dur) {
        this.anims.splice(i, 1);
        a.res();
      }
    }
    this.parts.update(dt);
    this.numeros.update(dt);
    // the camera
    if (this.fase === 'menu' || this.fase === 'ordenes') {
      if (this.ui.modo !== 'objetivo' || this.ui.objetivo.luchador?.lado !== 'enemigo') this.cam.obj = 0.1 * Math.sin(this.t * 0.35);
    }
    this.cam.th += (this.cam.obj - this.cam.th) * (1 - Math.exp(-dt * this.cam.rapida));
    if (this.sacudida.dur > 0) {
      this.sacudida.t += dt;
      if (this.sacudida.t >= this.sacudida.dur) this.sacudida.amp = 0;
    }
    if (this.flashPantalla.dur > 0) {
      this.flashPantalla.t += dt;
      if (this.flashPantalla.t >= this.flashPantalla.dur) this.flashPantalla.dur = 0;
    }
    // the fighters
    for (const h of this.heroes) {
      h.tPose += dt;
      if (h.flash > 0) h.flash -= dt;
      if (h.herido > 0) {
        h.herido -= dt;
        if (h.herido <= 0 && h.m.pv > 0 && h.pose === 'herido') this.ponerPose(h, 'quieto');
      }
      // the numbers roll toward the real ones
      h.pvVisto = this.rodar(h.pvVisto, h.m.pv, dt);
      h.ipVisto = this.rodar(h.ipVisto, h.m.ip, dt);
    }
    for (const e of this.enemigos) {
      if (e.flash > 0) e.flash -= dt;
      if (e.muriendo >= 0) {
        e.muriendo += dt;
        if (e.muriendo > 0.9) e.vivo = false;
      }
    }
  }

  private rodar(visto: number, real: number, dt: number) {
    if (visto === real) return visto;
    const paso = Math.max(1, Math.ceil(Math.abs(real - visto) * 0.12)) * Math.max(1, dt * 60);
    return visto < real ? Math.min(real, visto + paso) : Math.max(real, visto - paso);
  }

  /** The buttons become events, with repeat for the directions. */
  private leerMandos(dt: number) {
    const m = this.mandos;
    const emitir = (e: Evento) => {
      if (this.esperando) {
        const r = this.esperando;
        this.esperando = null;
        r(e);
      } else this.cola.push(e);
    };
    if (m.tomarA()) emitir('a');
    if (m.tomarB()) emitir('b');
    if (m.tomarStart()) emitir('start');
    m.tomarR();
    m.tomarArribaAbajo();
    const eje = (v: number, prev: number, rep: 'x' | 'y', neg: Tecla, pos: Tecla) => {
      if (v !== 0 && v !== prev) {
        this.dirRepite[rep] = 0.34;
        emitir(v < 0 ? neg : pos);
      } else if (v !== 0) {
        this.dirRepite[rep] -= dt;
        if (this.dirRepite[rep] <= 0) {
          this.dirRepite[rep] = 0.11;
          emitir(v < 0 ? neg : pos);
        }
      }
    };
    eje(m.x, this.dirPrev.x, 'x', 'izq', 'der');
    eje(m.y, this.dirPrev.y, 'y', 'arriba', 'abajo');
    this.dirPrev = { x: m.x, y: m.y };
  }

  /** The next thing a menu is waiting for: a button or an order of the test hook. */
  private siguiente(): Promise<Evento> {
    if (this.corteP) return Promise.resolve('fin');
    if (this.cola.length) return Promise.resolve(this.cola.shift()!);
    return new Promise((res) => {
      this.esperando = res;
    });
  }
  /** Forgets the buttons pressed while something was playing (an order of the test hook is kept). */
  private vaciar() {
    this.cola = this.cola.filter((e) => typeof e === 'object');
  }
  private corteP: ResultadoCombate | null = null;
  private cortar(): never {
    throw new Corte(this.corteP ?? 'victoria');
  }
  private emitirForzado(e: Evento) {
    if (this.esperando) {
      const r = this.esperando;
      this.esperando = null;
      r(e);
    } else this.cola.push(e);
  }
  private cursorSuena() {
    this.sonido.efecto(EFECTO_MENU, 0.7);
  }

  // ------------------------------------------------------------ the script of a whole fight

  private async correr(): Promise<ResultadoCombate> {
    let r: ResultadoCombate;
    try {
      this.sonido.parar(0.15);
      this.sonido.efecto(EFECTO_ENCUENTRO);
      await this.animar(1.55, {
        capa: 'tope',
        draw: (g, t) => {
          if (this.snap) dibujarRemolino(g, this.snap, t / 1.55);
        },
      });
      this.sonido.musica(PISTA_COMBATE);
      // the scene comes in from the black, with the camera swinging round to the front
      this.cam.th = 0.95;
      this.cam.obj = 0;
      this.cam.rapida = 1.8;
      this.fase = 'menu';
      this.fundido = 1;
      await this.animar(0.5, {
        tick: (t) => {
          this.fundido = 1 - limitar(t / 0.4, 0, 1);
        },
      });
      this.fundido = 0;
      this.cam.rapida = 2.2;
      const nombres = this.enemigos.map((e) => nombreEnemigo(e.def));
      const primero = nombres[0];
      this.msg = nombres.every((n) => n === primero) && this.enemigos.length === 1 ? texto('combate.aparece.uno', { nombre: primero }) : texto('combate.aparece.varios', { nombre: primero });
      await this.espera(1.1);
      this.msg = '';
      r = await this.rondas();
    } catch (e) {
      if (!(e instanceof Corte)) throw e;
      r = await this.terminarCorte(e.resultado);
    }
    this.fase = 'fin';
    await this.salir(r);
    this.resultadoFinal = r;
    this.activo = false;
    return r;
  }

  /** Rounds until somebody wins. */
  private async rondas(): Promise<ResultadoCombate> {
    for (;;) {
      this.ronda++;
      this.fase = 'menu';
      const ordenes = await this.pedirOrdenes();
      if (ordenes === 'huida') return 'huida';
      this.fase = 'ronda';
      this.ui.modo = '';
      this.ui.turno = null;
      const fin = await this.resolver(ordenes);
      if (this.corteP) this.cortar();
      if (fin) return fin;
    }
  }

  // ------------------------------------------------------------ the menus

  /** Luchar / Huir / Estado, then the orders of each friend. Returns null when fleeing failed (the enemies act). */
  private async pedirOrdenes(): Promise<Map<Heroe, OrdenHeroe> | null | 'huida'> {
    for (;;) {
      this.fase = 'menu';
      this.cam.rapida = 2.2;
      const op = await this.menuPrincipal();
      if (op === 'estado') {
        await this.pantallaEstado();
        continue;
      }
      if (op === 'huir') {
        if (this.sinHuida) {
          this.msg = texto('combate.sin.huida');
          await this.espera(0.9);
          this.msg = '';
          continue;
        }
        this.ui.modo = '';
        const ok = await this.intentarHuir();
        if (ok) return 'huida';
        return null;
      }
      // Luchar: the orders in turn; B goes back one friend
      this.fase = 'ordenes';
      const vivos = this.heroes.filter((h) => vivo(h.m));
      const lista: Array<OrdenHeroe | undefined> = [];
      this.reservados.clear();
      let i = 0;
      while (i < vivos.length) {
        const h = vivos[i];
        this.ui.turno = h;
        const o = await this.elegirOrden(h);
        if (o === 'atras') {
          if (i === 0) break;
          i--;
          this.liberar(lista[i]);
          lista[i] = undefined;
          continue;
        }
        lista[i] = o;
        i++;
      }
      this.ui.turno = null;
      if (i < vivos.length) continue;
      const m = new Map<Heroe, OrdenHeroe>();
      vivos.forEach((h, k) => m.set(h, lista[k]!));
      return m;
    }
  }

  private async menuPrincipal(): Promise<'luchar' | 'huir' | 'estado'> {
    const items: ItemLista[] = [{ txt: texto('combate.luchar') }, { txt: texto('combate.huir'), gris: this.sinHuida }, { txt: texto('combate.estado') }];
    this.ui.modo = 'luchar';
    this.ui.menu = { items, cursor: 0, x: 6, y: 22 };
    this.vaciar();
    for (;;) {
      const e = await this.siguiente();
      if (e === 'fin') this.cortar();
      if (typeof e === 'object') {
        // an order of the hook while at the first menu: it means «Luchar»
        if (e.forzada === 'huir') return 'huir';
        this.cola.unshift(e);
        return 'luchar';
      }
      if (e === 'arriba' || e === 'abajo') {
        this.ui.menu.cursor = (this.ui.menu.cursor + (e === 'abajo' ? 1 : -1) + items.length) % items.length;
        this.cursorSuena();
      } else if (e === 'a') {
        this.sonido.efecto(EFECTO_MENU);
        return (['luchar', 'huir', 'estado'] as const)[this.ui.menu.cursor];
      }
    }
  }

  private async intentarHuir(): Promise<boolean> {
    const vivos = this.heroes.filter((h) => vivo(h.m));
    const mi = vivos.reduce((s, h) => s + statsDe(this.g, h.m).agi, 0) / Math.max(1, vivos.length);
    const ellos = this.enemigos.filter((e) => e.vivo && e.pv > 0).reduce((s, e) => s + e.def.agi, 0) / Math.max(1, this.enemigos.filter((e) => e.vivo && e.pv > 0).length);
    const p = limitar(0.5 + (mi - ellos) * 0.04 + this.intentosHuida * 0.12, 0.2, 0.95);
    this.intentosHuida++;
    this.msg = texto('combate.huye.intento');
    await this.espera(0.7);
    if (Math.random() < p) {
      this.msg = texto('combate.huye.ok');
      this.sonido.efecto(EFECTO_HUIR);
      // everybody turns and runs to the left
      for (const h of vivos) this.ponerPose(h, 'quieto');
      await this.animar(0.9, {
        tick: (t) => {
          for (const h of vivos) {
            h.dx = -t * 150;
            h.dy = Math.sin(t * 24 + h.idx) * 1.5;
          }
        },
      });
      return true;
    }
    this.msg = texto('combate.huye.no');
    await this.espera(0.9);
    this.msg = '';
    return false;
  }

  private liberar(o?: OrdenHeroe) {
    if (!o) return;
    if (o.tipo === 'soltar' || o.tipo === 'poner') this.reservados.delete(o.ap);
    if (o.tipo === 'invocar') for (const a of o.aps) this.reservados.delete(a);
  }

  private objetivosEnemigos() {
    return this.enemigos.filter((e) => e.vivo && e.muriendo < 0 && e.pv > 0);
  }

  /** The row of icons of a friend. Returns his order, or 'atras' for B. */
  private async elegirOrden(h: Heroe): Promise<OrdenHeroe | 'atras'> {
    this.ui.modo = 'ordenes';
    const ic = this.ui.iconos;
    ic.heroe = h;
    ic.cursor = h.ultimoIcono;
    this.vaciar();
    for (;;) {
      // which icons can be used
      const mias = this.g.apuntadores.filter((a) => a.dueno === h.m.q);
      ic.activos = [
        true,
        poderesDe(h.m.q, h.m.nivel).length > 0,
        mias.length > 0 && mias.some((a) => a.estado !== 'recupera' && !this.reservados.has(a)),
        this.invocacionesPosibles().length > 0,
        OBJETOS.some((o) => (this.g.objetos[o.id] ?? 0) > 0),
        true,
      ];
      const e = await this.siguiente();
      if (e === 'fin') this.cortar();
      if (typeof e === 'object') {
        const o = await this.ordenForzada(h, e);
        if (o) return o;
        continue;
      }
      if (e === 'b') {
        this.cursorSuena();
        return 'atras';
      }
      if (e === 'izq' || e === 'der') {
        ic.cursor = (ic.cursor + (e === 'der' ? 1 : -1) + ORDENES.length) % ORDENES.length;
        this.cursorSuena();
      } else if (e === 'a') {
        const orden = ORDENES[ic.cursor];
        if (!ic.activos[ic.cursor]) {
          this.sonido.efecto(EFECTO_MENU, 0.4);
          this.msg = texto(`combate.nada.${orden}`);
          void this.espera(1.2).then(() => {
            if (this.fase === 'ordenes') this.msg = '';
          });
          continue;
        }
        this.sonido.efecto(EFECTO_MENU);
        h.ultimoIcono = ic.cursor;
        const o = await this.subMenu(h, orden);
        if (o) return o;
        this.ui.modo = 'ordenes';
        this.msg = '';
      }
    }
  }

  private invocacionesPosibles(): Invocacion[] {
    return INVOCACIONES.filter((inv) => inv.lista && this.apsPara(inv) !== null);
  }
  /** The prompters «en espera» that would pay a summon, or null if they are not there. */
  private apsPara(inv: Invocacion): ApuntadorGrupo[] | null {
    const usados: ApuntadorGrupo[] = [];
    for (const el of Object.keys(inv.req) as Elemento[]) {
      const n = inv.req[el] ?? 0;
      const libres = this.g.apuntadores.filter((a) => a.estado === 'espera' && apuntadorPorId(a.id).el === el && !this.reservados.has(a) && !usados.includes(a));
      if (libres.length < n) return null;
      usados.push(...libres.slice(0, n));
    }
    return usados;
  }

  /** The list or the target that follows an icon. Null = B (back to the icons). */
  private async subMenu(h: Heroe, orden: Orden): Promise<OrdenHeroe | null> {
    const q = h.m.q;
    if (orden === 'defender') return { tipo: 'defender' };
    if (orden === 'atacar') {
      const obj = await this.elegirObjetivo('enemigo', null);
      return obj ? { tipo: 'atacar', obj: obj as Enemigo } : null;
    }
    if (orden === 'poder') {
      const ps = poderesDe(q, h.m.nivel);
      const items: ItemLista[] = ps.map((p) => ({ txt: texto(`poder.${p.id}.nombre`), der: String(p.ip), gris: h.m.ip < p.ip }));
      const i = await this.elegirLista(items);
      if (i === null) return null;
      const p = ps[i];
      const obj = await this.elegirObjetivo(p.modo === 'cura' ? 'heroe' : 'enemigo', p.modo === 'abanico' ? 'abanico' : null);
      return obj ? { tipo: 'poder', poder: p, obj } : null;
    }
    if (orden === 'apuntadores') {
      const mias = this.g.apuntadores.filter((a) => a.dueno === q);
      const items: ItemLista[] = mias.map((a) => ({
        txt: texto(`apuntador.${a.id}.nombre`),
        der: texto(`apuntador.accion.${a.estado}`),
        gris: a.estado === 'recupera' || this.reservados.has(a),
      }));
      const i = await this.elegirLista(items);
      if (i === null) return null;
      const a = mias[i];
      if (a.estado === 'puesto') {
        const obj = await this.elegirObjetivo('enemigo', null);
        if (!obj) return null;
        this.reservados.add(a);
        return { tipo: 'soltar', ap: a, obj: obj as Enemigo };
      }
      this.reservados.add(a);
      return { tipo: 'poner', ap: a };
    }
    if (orden === 'invocar') {
      const posibles = this.invocacionesPosibles();
      const items: ItemLista[] = posibles.map((inv) => ({ txt: texto(`invocacion.${inv.id}.nombre`) }));
      const i = await this.elegirLista(items);
      if (i === null) return null;
      const inv = posibles[i];
      const aps = this.apsPara(inv)!;
      for (const a of aps) this.reservados.add(a);
      return { tipo: 'invocar', inv, aps };
    }
    // objeto
    const hay = OBJETOS.filter((o) => (this.g.objetos[o.id] ?? 0) > 0);
    const items: ItemLista[] = hay.map((o) => ({ txt: texto(`objeto.${o.id}.nombre`), der: `x${this.g.objetos[o.id]}` }));
    const i = await this.elegirLista(items);
    if (i === null) return null;
    const obj = await this.elegirObjetivo('heroe', null);
    return obj ? { tipo: 'objeto', objeto: hay[i], obj: obj as Heroe } : null;
  }

  /** A list window under the icons. Returns the index or null for B. Grey entries cannot be chosen. */
  private async elegirLista(items: ItemLista[]): Promise<number | null> {
    this.ui.modo = 'lista';
    this.ui.menu = { items, cursor: Math.max(0, items.findIndex((i) => !i.gris)), x: 6, y: 62 };
    this.vaciar();
    for (;;) {
      const e = await this.siguiente();
      if (e === 'fin') this.cortar();
      if (typeof e === 'object') {
        this.cola.unshift(e);
        return null;
      }
      if (e === 'b') {
        this.cursorSuena();
        this.ui.modo = 'ordenes';
        return null;
      }
      if (e === 'arriba' || e === 'abajo') {
        this.ui.menu.cursor = (this.ui.menu.cursor + (e === 'abajo' ? 1 : -1) + items.length) % items.length;
        this.cursorSuena();
      } else if (e === 'a') {
        if (items[this.ui.menu.cursor].gris) {
          this.sonido.efecto(EFECTO_MENU, 0.4);
          continue;
        }
        this.sonido.efecto(EFECTO_MENU);
        return this.ui.menu.cursor;
      }
    }
  }

  /** The hand over the enemy (or friend) to aim at; the camera turns to it. Null = B. */
  private async elegirObjetivo(lado: 'enemigo' | 'heroe', modo: 'abanico' | null): Promise<Luchador | null> {
    const lista = (): Luchador[] => (lado === 'enemigo' ? this.objetivosEnemigos() : this.heroes.filter((h) => vivo(h.m)));
    let i = 0;
    if (lado === 'heroe' && this.ui.turno) i = Math.max(0, lista().indexOf(this.ui.turno));
    this.ui.modo = 'objetivo';
    this.vaciar();
    const poner = () => {
      const l = lista();
      if (!l.length) return;
      i = (i + l.length) % l.length;
      const o = l[i];
      this.ui.objetivo.luchador = o;
      this.ui.objetivo.vecinos = modo === 'abanico' ? this.vecinosDe(o as Enemigo) : [];
      if (o.lado === 'enemigo') {
        this.cam.obj = this.giroA(o);
        this.cam.rapida = 4.5;
        this.msg = nombreEnemigo(o.def);
      } else {
        this.cam.obj = 0;
        this.msg = nombreAmigo(o.m.q);
      }
    };
    poner();
    for (;;) {
      const e = await this.siguiente();
      if (e === 'fin') this.cortar();
      if (typeof e === 'object') {
        const l = lista();
        const k = e.objetivo ?? 0;
        if (l[k]) {
          this.ui.objetivo.luchador = null;
          this.msg = '';
          this.cam.rapida = 2.2;
          return l[k];
        }
        continue;
      }
      if (e === 'b') {
        this.cursorSuena();
        this.salirObjetivo();
        return null;
      }
      if (e === 'izq' || e === 'arriba') {
        i--;
        poner();
        this.cursorSuena();
      } else if (e === 'der' || e === 'abajo') {
        i++;
        poner();
        this.cursorSuena();
      } else if (e === 'a') {
        const o = this.ui.objetivo.luchador;
        this.sonido.efecto(EFECTO_MENU);
        this.salirObjetivo();
        return o;
      }
    }
  }
  private salirObjetivo() {
    this.ui.objetivo.luchador = null;
    this.ui.objetivo.vecinos = [];
    this.ui.modo = 'lista';
    this.msg = '';
    this.cam.rapida = 2.2;
  }

  /** The target and its two neighbours among the enemies still standing. */
  private vecinosDe(e: Enemigo): Enemigo[] {
    const v = this.objetivosEnemigos();
    const k = v.indexOf(e);
    return [v[k - 1], v[k + 1]].filter(Boolean);
  }

  /** The screen of Estado: the numbers of each friend, left and right to change. */
  private async pantallaEstado() {
    this.ui.modo = 'estado';
    this.ui.estado.idx = 0;
    this.vaciar();
    for (;;) {
      const e = await this.siguiente();
      if (e === 'fin') this.cortar();
      if (typeof e === 'object') continue;
      if (e === 'b' || e === 'a' || e === 'start') {
        this.cursorSuena();
        this.ui.modo = 'luchar';
        return;
      }
      if (e === 'izq' || e === 'der') {
        const n = this.heroes.length;
        this.ui.estado.idx = (this.ui.estado.idx + (e === 'der' ? 1 : -1) + n) % n;
        this.cursorSuena();
      }
    }
  }

  // ------------------------------------------------------------ the test hook's orders

  /** Turns an order of the hook into an order of the game, or null if it is not possible now. */
  private async ordenForzada(h: Heroe, f: Forzada): Promise<OrdenHeroe | null> {
    const [tipo, id] = f.forzada.split(':');
    const en = this.objetivosEnemigos();
    const enemigo = (): Enemigo | undefined => en[f.objetivo ?? 0] ?? en[0];
    const amigo = (): Heroe | undefined => this.heroes.filter((x) => vivo(x.m))[f.objetivo ?? 0] ?? h;
    const q = h.m.q;
    if (tipo === 'defender') return { tipo: 'defender' };
    if (tipo === 'atacar') {
      const o = enemigo();
      return o ? { tipo: 'atacar', obj: o } : null;
    }
    if (tipo === 'poder') {
      const p = poderesDe(q, h.m.nivel).find((x) => x.id === id) ?? poderesDe(q, h.m.nivel)[0];
      if (!p || h.m.ip < p.ip) return null;
      const o = p.modo === 'cura' ? amigo() : enemigo();
      return o ? { tipo: 'poder', poder: p, obj: o } : null;
    }
    if (tipo === 'soltar') {
      const a = this.g.apuntadores.find((x) => x.dueno === q && x.estado === 'puesto' && !this.reservados.has(x));
      const o = enemigo();
      if (!a || !o) return null;
      this.reservados.add(a);
      return { tipo: 'soltar', ap: a, obj: o };
    }
    if (tipo === 'poner') {
      const a = this.g.apuntadores.find((x) => x.dueno === q && x.estado === 'espera' && !this.reservados.has(x));
      if (!a) return null;
      this.reservados.add(a);
      return { tipo: 'poner', ap: a };
    }
    if (tipo === 'invocar') {
      const inv = this.invocacionesPosibles().find((x) => x.id === id) ?? this.invocacionesPosibles()[0];
      if (!inv) return null;
      const aps = this.apsPara(inv)!;
      for (const a of aps) this.reservados.add(a);
      return { tipo: 'invocar', inv, aps };
    }
    if (tipo === 'objeto') {
      const ob = OBJETOS.find((x) => x.id === id && (this.g.objetos[x.id] ?? 0) > 0) ?? OBJETOS.find((x) => (this.g.objetos[x.id] ?? 0) > 0);
      if (!ob) return null;
      return { tipo: 'objeto', objeto: ob, obj: amigo()! };
    }
    return null;
  }

  // ------------------------------------------------------------ the round

  private prioridad(o: OrdenHeroe | null, agi: number) {
    const base = agi * azar(0.85, 1.15);
    if (o?.tipo === 'defender') return 1000 + base;
    if (o?.tipo === 'poder' && o.poder.tarde) return -1000 + base;
    return base;
  }

  /** Plays the round. Returns the result if the fight ends. */
  private async resolver(ordenes: Map<Heroe, OrdenHeroe> | null | 'huida'): Promise<ResultadoCombate | null> {
    type Accion = { actor: Luchador; orden: OrdenHeroe | null; p: number };
    const acciones: Accion[] = [];
    if (ordenes && ordenes !== 'huida') {
      for (const [h, o] of ordenes) {
        acciones.push({ actor: h, orden: o, p: this.prioridad(o, statsDe(this.g, h.m).agi) });
        if (o.tipo === 'defender') h.defiende = true;
      }
    }
    for (const e of this.enemigos) if (e.vivo && e.pv > 0) acciones.push({ actor: e, orden: null, p: this.prioridad(null, e.def.agi) });
    acciones.sort((a, b) => b.p - a.p);
    this.cam.rapida = 4;
    await this.espera(0.25);
    for (const a of acciones) {
      if (this.corteP) this.cortar();
      if (a.actor.lado === 'heroe') {
        if (!vivo(a.actor.m) || !a.orden) continue;
        await this.accionHeroe(a.actor, a.orden);
      } else {
        if (a.actor.pv <= 0 || !a.actor.vivo || a.actor.muriendo >= 0) continue;
        await this.accionEnemigo(a.actor);
      }
      this.msg = '';
      await this.esperarBajas();
      this.cam.obj = 0;
      if (!this.objetivosEnemigos().length) return this.victoria();
      if (!this.heroes.some((h) => vivo(h.m))) return this.derrota();
    }
    // end of the round: a little IP back, the prompters that were coming back, the guards down
    for (const h of this.heroes) {
      h.defiende = false;
      if (vivo(h.m)) {
        h.m.ip += 2;
        ajustar(this.g, h.m);
      }
    }
    for (const a of this.g.apuntadores) {
      if (a.estado !== 'recupera') continue;
      a.turnos--;
      if (a.turnos <= 0) {
        a.estado = 'puesto';
        for (const h of this.heroes) ajustar(this.g, h.m);
        this.msg = texto('combate.vuelve', { apuntador: texto(`apuntador.${a.id}.nombre`), quien: nombreAmigo(a.dueno) });
        this.sonido.efecto(EFECTO_MENU);
        await this.espera(0.9);
        this.msg = '';
      }
    }
    this.cam.rapida = 2.2;
    return null;
  }

  private async esperarBajas() {
    if (this.enemigos.some((e) => e.muriendo >= 0 && e.vivo)) await this.espera(0.95);
  }

  // ------------------------------------------------------------ poses and damage

  private ponerPose(h: Heroe, p: PoseCombate, frame = -1) {
    h.pose = p;
    h.tPose = 0;
    h.frameFijo = frame;
  }

  /** Adds the damage to somebody: the number, the flash, the health going down and, if it dies, its fall. */
  private herir(o: Luchador, dano: number, tipo: TipoNumero = 'dano') {
    const d = Math.max(0, Math.round(dano));
    const c = this.centro(o);
    this.numeros.nuevo(d, tipo, c.x, c.y - this.alto(o) / 2 - 1);
    this.sonido.efecto(EFECTO_GOLPE, 0.8);
    if (o.lado === 'enemigo') {
      o.pv = Math.max(0, o.pv - d);
      o.flash = 0.32;
      if (o.pv <= 0) this.matar(o);
    } else {
      o.m.pv = Math.max(0, o.m.pv - d);
      o.flash = 0.32;
      if (o.m.pv <= 0) {
        this.ponerPose(o, 'caido');
        this.sonido.efecto(EFECTO_CAE);
        o.defiende = false;
      } else if (d > 0) {
        this.ponerPose(o, 'herido');
        o.herido = 0.45;
      }
    }
  }

  private matar(e: Enemigo) {
    if (e.muriendo >= 0) return;
    e.muriendo = 0;
    this.sonido.efecto(EFECTO_CAE);
  }

  private curar(h: Heroe, pv: number) {
    const antes = h.m.pv;
    h.m.pv = Math.min(statsDe(this.g, h.m).pv, h.m.pv + Math.round(pv));
    const c = this.centro(h);
    this.numeros.nuevo(h.m.pv - antes, 'cura', c.x, c.y - 20);
  }
  private darIP(h: Heroe, ip: number) {
    const antes = h.m.ip;
    h.m.ip = Math.min(statsDe(this.g, h.m).ip, h.m.ip + Math.round(ip));
    const c = this.centro(h);
    this.numeros.nuevo(h.m.ip - antes, 'ip', c.x, c.y - 20);
  }

  /** The blow of a friend: attack − half the defence, ±10 %, and now and then a critical hit. */
  private golpeFisico(h: Heroe, e: Enemigo): { d: number; crit: boolean } {
    const s = statsDe(this.g, h.m);
    const crit = Math.random() < 0.1;
    const base = Math.max(1, s.atk - e.def.def * 0.5);
    return { d: Math.max(1, Math.round(base * azar(0.9, 1.1) * (crit ? 1.75 : 1))), crit };
  }

  private danoPoder(h: Heroe, p: { pot: number; el: Elemento }, e: Enemigo, parte = 1): number {
    const s = statsDe(this.g, h.m);
    const base = p.pot + s.atk * 0.6 - e.def.def * 0.3;
    return Math.max(1, Math.round(base * parte * azar(0.92, 1.08) * eficacia(p.el, e.def.el)));
  }

  /** An enemy still standing close to this one (the blow goes there when its target has already fallen). */
  private reemplazo(e: Enemigo): Enemigo | null {
    const v = this.objetivosEnemigos();
    if (!v.length) return null;
    return v.reduce((a, b) => (Math.abs(a.idx - e.idx) <= Math.abs(b.idx - e.idx) ? a : b));
  }

  // ------------------------------------------------------------ the actions of the friends

  /** The friend runs up to the enemy, comes back. `fx` runs at the enemy. */
  private async embestir(h: Heroe, e: Enemigo, accion: () => Promise<void>) {
    this.cam.obj = this.giroA(e);
    this.cam.rapida = 5;
    const ir = 0.34;
    await this.animar(ir, {
      tick: (t) => {
        const k = easeInOut(limitar(t / ir, 0, 1));
        const f = this.pies(this.sinDesvio(h));
        const m = this.pies(this.sinDesvio(e));
        h.dx = (m.x - 16 - f.x) * k;
        h.dy = (m.y + 5 - f.y) * k;
        h.pose = 'ataque';
        h.frameFijo = 0;
      },
    });
    await accion();
    const vuelve = 0.3;
    await this.animar(vuelve, {
      tick: (t) => {
        const k = 1 - easeInOut(limitar(t / vuelve, 0, 1));
        const f = this.pies({ ...this.sinDesvio(h) });
        const m = this.pies(this.sinDesvio(e));
        h.dx = (m.x - 16 - f.x) * k;
        h.dy = (m.y + 5 - f.y) * k;
      },
    });
    h.dx = 0;
    h.dy = 0;
    this.ponerPose(h, 'quieto');
    this.cam.obj = 0;
    this.cam.rapida = 3.5;
  }
  /** A fighter as if it were at home (no offset): used to compute where to run to. */
  private sinDesvio<T extends Luchador>(l: T): T {
    return { ...l, dx: 0, dy: 0 };
  }

  private async accionHeroe(h: Heroe, o: OrdenHeroe) {
    const nombre = nombreAmigo(h.m.q);
    const s = statsDe(this.g, h.m);
    if (o.tipo === 'defender') {
      this.msg = texto('combate.defiende', { quien: nombre });
      await this.espera(0.8);
      return;
    }
    if (o.tipo === 'atacar') {
      this.msg = texto('combate.ataca', { quien: nombre });
      await this.espera(0.45);
      let obj: Enemigo | null = o.obj;
      if (obj.pv <= 0 || obj.muriendo >= 0) obj = this.reemplazo(obj);
      if (!obj) return;
      const e = obj;
      await this.embestir(h, e, async () => {
        this.ponerPose(h, 'ataque', 1);
        await FX.fxTajo(this, this.donde(e), () => {
          const { d, crit } = this.golpeFisico(h, e);
          if (crit) this.msg = texto('combate.critico');
          this.herir(e, d, crit ? 'critico' : 'dano');
          if (crit) this.sacudir(2, 0.2);
        });
        this.ponerPose(h, 'ataque', 2);
        await this.espera(0.12);
      });
      return;
    }
    if (o.tipo === 'poder') {
      const p = o.poder;
      this.msg = texto('combate.usa', { quien: nombre, poder: texto(`poder.${p.id}.nombre`) });
      if (h.m.ip < p.ip) {
        await this.espera(0.6);
        this.msg = texto('combate.sin.ip');
        await this.espera(0.8);
        return;
      }
      h.m.ip -= p.ip;
      this.ponerPose(h, 'poder');
      await this.espera(0.5);
      if (p.modo === 'cura') {
        let obj = o.obj as Heroe;
        if (!vivo(obj.m)) obj = this.heroes.filter((x) => vivo(x.m)).sort((a, b) => a.m.pv / statsDe(this.g, a.m).pv - b.m.pv / statsDe(this.g, b.m).pv)[0];
        const cura = p.pot + s.atk * 1 * azar(0.95, 1.05);
        await FX.fxOtraCana(this, this.donde(obj), () => this.curar(obj, cura));
        this.ponerPose(h, 'quieto');
        await this.espera(0.2);
        return;
      }
      let e = o.obj as Enemigo;
      if (e.pv <= 0 || e.muriendo >= 0) e = this.reemplazo(e)!;
      if (!e) {
        this.ponerPose(h, 'quieto');
        return;
      }
      this.cam.obj = this.giroA(e);
      this.cam.rapida = 5;
      const objs: Enemigo[] = p.modo === 'abanico' ? [e, ...this.vecinosDe(e)] : [e];
      const dano = (x: Enemigo, i: number, parte = 1) => this.danoPoder(h, p, x, i === 0 ? parte : parte * VECINOS);
      switch (p.fx) {
        case 'siy':
          await FX.fxSiY(this, this.donde(e), (k) => this.herir(e, dano(e, 0, p.golpes![k])));
          break;
        case 'cajonazo':
          await FX.fxCajonazo(this, objs.map((x) => this.donde(x)), (i) => this.herir(objs[i], dano(objs[i], i)));
          break;
        case 'fresquito':
          await FX.fxFresquito(this, this.donde(e), () => this.herir(e, dano(e, 0)));
          break;
        case 'cierzo':
          await FX.fxCierzo(this, objs.map((x) => this.donde(x)), (i) => this.herir(objs[i], dano(objs[i], i)));
          break;
        case 'abrazo':
          await FX.fxAbrazo(this, this.donde(e), () => this.herir(e, dano(e, 0)));
          break;
        case 'cincominutos':
          await FX.fxCincoMinutos(this, this.donde(h), this.donde(e), () => this.herir(e, dano(e, 0)));
          break;
        case 'chupito':
          await FX.fxChupito(this, this.donde(h), objs.map((x) => this.donde(x)), (i) => this.herir(objs[i], dano(objs[i], i)));
          break;
        default:
          break;
      }
      this.ponerPose(h, 'quieto');
      await this.espera(0.2);
      return;
    }
    if (o.tipo === 'soltar') {
      const def = apuntadorPorId(o.ap.id);
      this.msg = texto('combate.suelta', { quien: nombre, apuntador: texto(`apuntador.${o.ap.id}.nombre`) });
      if (o.ap.estado !== 'puesto') return;
      await this.espera(0.4);
      let e = o.obj;
      if (e.pv <= 0 || e.muriendo >= 0) e = this.reemplazo(e)!;
      if (!e) return;
      // the damage is worked out with the stats he had while it was set on him
      const sAntes = statsDe(this.g, h.m);
      o.ap.estado = 'espera';
      for (const x of this.heroes) ajustar(this.g, x.m);
      this.ponerPose(h, 'poder');
      this.cam.obj = this.giroA(e);
      this.cam.rapida = 5;
      const objetivo = e;
      await FX.fxApuntador(this, def.el, this.donde(h), this.donde(objetivo), () => {
        const d = Math.max(1, Math.round((def.pot + sAntes.atk * 0.6 - objetivo.def.def * 0.3) * azar(0.93, 1.07) * eficacia(def.el, objetivo.def.el)));
        this.herir(objetivo, d);
      });
      this.ponerPose(h, 'quieto');
      await this.espera(0.2);
      return;
    }
    if (o.tipo === 'poner') {
      this.msg = texto('combate.pone', { quien: nombre, apuntador: texto(`apuntador.${o.ap.id}.nombre`) });
      if (o.ap.estado !== 'espera') return;
      await FX.fxPonerApuntador(this, apuntadorPorId(o.ap.id).el, this.donde(h));
      o.ap.estado = 'puesto';
      for (const x of this.heroes) ajustar(this.g, x.m);
      await this.espera(0.2);
      return;
    }
    if (o.tipo === 'invocar') {
      const inv = o.inv;
      this.msg = texto('combate.invoca', { quien: nombre, invocacion: texto(`invocacion.${inv.id}.nombre`) });
      if (o.aps.some((a) => a.estado !== 'espera')) {
        await this.espera(0.6);
        this.msg = texto('combate.sin.apuntadores');
        await this.espera(0.8);
        return;
      }
      for (const a of o.aps) {
        a.estado = 'recupera';
        a.turnos = TURNOS_RECUPERA;
      }
      for (const x of this.heroes) ajustar(this.g, x.m);
      this.ponerPose(h, 'poder');
      await this.espera(0.7);
      const vivos = this.objetivosEnemigos();
      if (inv.fx === 'ovacion') {
        await FX.fxOvacion(this, vivos.map((x) => this.donde(x)), (i) => {
          const e = vivos[i];
          if (e.pv <= 0) return;
          const d = Math.max(1, Math.round((inv.pot + s.atk - e.def.def * 0.2) * azar(0.93, 1.07) * eficacia(inv.el, e.def.el)));
          this.herir(e, d);
        });
      }
      this.ponerPose(h, 'quieto');
      await this.espera(0.3);
      return;
    }
    if (o.tipo === 'objeto') {
      const ob = o.objeto;
      this.msg = texto('combate.objeto', { quien: nombre, objeto: texto(`objeto.${ob.id}.nombre`) });
      if ((this.g.objetos[ob.id] ?? 0) <= 0) return;
      this.g.objetos[ob.id]--;
      await this.espera(0.5);
      const obj = vivo(o.obj.m) ? o.obj : h;
      if (ob.pv) await FX.fxCura(this, this.donde(obj), () => this.curar(obj, ob.pv!));
      if (ob.ip) await FX.fxIP(this, this.donde(obj), () => this.darIP(obj, ob.ip!));
      await this.espera(0.2);
    }
  }

  // ------------------------------------------------------------ the actions of the enemies

  private elegirAtaque(e: Enemigo): AtaqueEnemigo {
    const ok = e.def.ataques.filter((a) => !a.herido || e.pv <= e.pvMax * 0.5);
    const total = ok.reduce((s, a) => s + a.peso, 0);
    let r = Math.random() * total;
    for (const a of ok) {
      r -= a.peso;
      if (r <= 0) return a;
    }
    return ok[0];
  }

  /** The damage an enemy attack does to a friend. */
  private danoAEnemigo(e: Enemigo, a: AtaqueEnemigo, h: Heroe): { d: number; crit: boolean } {
    const s = statsDe(this.g, h.m);
    const defensa = a.tipo === 'perfora' ? s.def * 0.25 : s.def * 0.5;
    const crit = Math.random() < 0.05;
    let d = Math.max(1, (e.def.atk - defensa) * a.pot * azar(0.9, 1.1) * eficacia(a.el ?? e.def.el, AMIGOS[h.m.q].elemento) * (crit ? 1.6 : 1));
    if (h.defiende) d *= 0.5;
    return { d: Math.max(1, Math.round(d)), crit };
  }

  private async accionEnemigo(e: Enemigo) {
    const a = this.elegirAtaque(e);
    const vivos = this.heroes.filter((h) => vivo(h.m));
    if (!vivos.length) return;
    const nombre = nombreEnemigo(e.def);
    this.msg = texto('combate.usa', { quien: nombre, poder: texto(`enemigo.${e.def.id}.${a.id}`) });
    this.cam.obj = this.giroA(e);
    this.cam.rapida = 4;
    await this.espera(0.65);
    const golpear = (h: Heroe, extra = 0) => {
      const { d, crit } = this.danoAEnemigo(e, a, h);
      this.herir(h, d + extra, crit ? 'critico' : 'dano');
    };
    // who it goes for: a friend at random, but low health attracts it
    const elegir = () => {
      const bajos = vivos.filter((h) => h.m.pv < statsDe(this.g, h.m).pv * 0.35);
      return Math.random() < 0.3 && bajos.length ? bajos[Math.floor(Math.random() * bajos.length)] : vivos[Math.floor(Math.random() * vivos.length)];
    };
    if (a.tipo === 'golpe' || a.tipo === 'chupa' || a.tipo === 'perfora') {
      let h = elegir();
      this.cam.obj = 0;
      this.cam.rapida = 3;
      // it hops forward, hits and comes back (the others stay)
      const ir = 0.26;
      const home = this.pies(this.sinDesvio(e));
      await this.animar(ir, {
        tick: (t) => {
          const k = easeOut(limitar(t / ir, 0, 1));
          const m = this.pies(h);
          e.dx = (m.x - home.x) * 0.35 * k;
          e.dy = (m.y - 28 - home.y) * 0.35 * k;
        },
      });
      if (!vivo(h.m)) h = vivos.find((x) => vivo(x.m)) ?? h;
      if (a.tipo === 'perfora') await FX.fxHaz(this, this.donde(e), this.donde(h), () => golpear(h));
      else if (a.tipo === 'chupa') {
        await FX.fxChupa(this, this.donde(e), this.donde(h), () => {
          golpear(h);
          const robo = Math.min(h.m.ip, 3);
          if (robo > 0) {
            h.m.ip -= robo;
            const c = this.centro(h);
            this.numeros.nuevo(robo, 'ip', c.x + 10, c.y - 12);
          }
        });
      } else await FX.fxGolpeEnemigo(this, this.donde(h), () => golpear(h));
      const vuelve = 0.25;
      const dx0 = e.dx;
      const dy0 = e.dy;
      await this.animar(vuelve, {
        tick: (t) => {
          const k = 1 - limitar(t / vuelve, 0, 1);
          e.dx = dx0 * k;
          e.dy = dy0 * k;
        },
      });
      e.dx = 0;
      e.dy = 0;
    } else if (a.tipo === 'todos') {
      const objs = vivos.slice();
      const hacer = (i: number) => golpear(objs[i]);
      if (e.def.pintor === 'mosquito') await FX.fxZumbido(this, this.donde(e), objs.map((h) => this.donde(h)), hacer);
      else await FX.fxTimbre(this, this.donde(e), objs.map((h) => this.donde(h)), hacer);
    } else if (a.tipo === 'estallido') {
      const objs = vivos.slice();
      await FX.fxEstallido(this, this.donde(e), objs.map((h) => this.donde(h)), (i) => golpear(objs[i]), () => {
        e.pv = 0;
        e.vivo = false;
        e.muriendo = 99;
      });
    }
    this.cam.obj = 0;
    this.cam.rapida = 3;
    await this.espera(0.15);
  }

  // ------------------------------------------------------------ the end

  /** Everything the victory gives: the music, the numbers, the level-ups. */
  private async victoria(): Promise<ResultadoCombate> {
    this.fase = 'victoria';
    this.ui.modo = '';
    this.ui.turno = null;
    this.msg = '';
    this.cam.obj = 0;
    this.sonido.parar(0.05);
    this.sonido.musica(PISTA_VICTORIA);
    const vivos = this.heroes.filter((h) => vivo(h.m));
    for (const h of vivos) this.ponerPose(h, 'victoria');
    await this.espera(0.8);
    let exp = 0;
    let monedas = 0;
    const botin: string[] = [];
    for (const e of this.enemigos) {
      exp += e.def.exp;
      monedas += e.def.monedas;
      if (e.def.botin && Math.random() < e.def.botin.prob) botin.push(e.def.botin.objeto);
    }
    this.g.monedas += monedas;
    for (const b of botin) this.g.objetos[b] = (this.g.objetos[b] ?? 0) + 1;
    const dlg = (clave: string, vars: Record<string, string | number> = {}) => this.dialogo.decir({ quien: null, texto: texto(clave, vars) });
    await dlg('combate.victoria');
    // experience for everybody (the ones who fell too)
    const subidas: SubidaDeNivel[] = [];
    for (const m of this.g.miembros) subidas.push(...darExp(this.g, m, exp));
    await dlg('combate.exp', { n: exp });
    await dlg('combate.monedas', { n: monedas });
    for (const b of botin) await dlg('combate.hallado', { objeto: texto(`objeto.${b}.nombre`) });
    for (const s of subidas) {
      this.sonido.musica(PISTA_NIVEL);
      await dlg('combate.nivel', { quien: nombreAmigo(s.q), n: s.nivel });
      await this.panelNivel(s);
      for (const p of poderesDe(s.q, s.nivel).filter((p) => p.nivel === s.nivel && s.nivel > 1)) await dlg('combate.aprende', { quien: nombreAmigo(s.q), poder: texto(`poder.${p.id}.nombre`) });
    }
    // the friends who were down get up, barely
    for (const h of this.heroes) {
      if (!vivo(h.m)) {
        h.m.pv = 1;
        this.ponerPose(h, 'quieto');
      }
      ajustar(this.g, h.m);
    }
    for (const a of this.g.apuntadores) if (a.estado === 'recupera') a.turnos = Math.min(a.turnos, 1);
    return 'victoria';
  }

  private panelAbierto: SubidaDeNivel | null = null;
  private async panelNivel(s: SubidaDeNivel) {
    this.panelAbierto = s;
    this.vaciar();
    for (;;) {
      const e = await this.siguiente();
      if (e === 'fin' || typeof e === 'object') break;
      if (e === 'a' || e === 'b') break;
    }
    this.panelAbierto = null;
    this.sonido.efecto(EFECTO_MENU);
  }

  private async derrota(): Promise<ResultadoCombate> {
    this.fase = 'derrota';
    this.ui.modo = '';
    this.ui.turno = null;
    this.sonido.parar(0.6);
    this.msg = texto('combate.derrota');
    await this.espera(2.2);
    return 'derrota';
  }

  /** `ganar()` / `perder()` of the hook: the end is cut short and then goes through the usual steps. */
  private async terminarCorte(r: ResultadoCombate): Promise<ResultadoCombate> {
    this.corteP = null;
    this.esperando = null;
    if (r === 'victoria') {
      for (const e of this.enemigos) if (e.pv > 0 || e.muriendo < 0) {
        e.pv = 0;
        this.matar(e);
      }
      await this.espera(0.9);
      return this.victoria();
    }
    for (const h of this.heroes) {
      h.m.pv = 0;
      this.ponerPose(h, 'caido');
    }
    return this.derrota();
  }

  /** Fades out and gives the world back its music. */
  private async salir(r: ResultadoCombate) {
    this.ui.modo = '';
    this.msg = '';
    await this.animar(0.45, {
      tick: (t) => {
        this.fundido = limitar(t / 0.4, 0, 1);
      },
    });
    this.fundido = 1;
    for (const h of this.heroes) {
      h.dx = 0;
      h.dy = 0;
      h.defiende = false;
    }
    if (r === 'victoria' || r === 'huida') {
      if (this.musicaPrevia) this.sonido.musica(this.musicaPrevia);
      else this.sonido.parar(0.3);
    } else this.sonido.parar(0.1);
  }

  // ------------------------------------------------------------ the hook

  estado(): EstadoCombate {
    return {
      fase: this.fase,
      ronda: this.ronda,
      turno: this.ui.turno?.m.q ?? null,
      menu: this.panelAbierto ? 'nivel' : this.ui.modo,
      mensaje: this.msg,
      enemigos: this.enemigos.map((e) => ({ id: e.def.id, pv: e.pv, pvMax: e.pvMax, vivo: e.vivo && e.pv > 0 })),
      grupo: this.heroes.map((h) => {
        const s = statsDe(this.g, h.m);
        return { q: h.m.q, nivel: h.m.nivel, exp: h.m.exp, pv: h.m.pv, pvMax: s.pv, ip: h.m.ip, ipMax: s.ip, defiende: h.defiende };
      }),
      apuntadores: this.g.apuntadores.map((a) => ({ id: a.id, dueno: a.dueno, estado: a.estado, turnos: a.turnos })),
      objetos: { ...this.g.objetos },
      monedas: this.g.monedas,
      camara: this.cam.th,
      resultado: this.resultadoFinal,
    };
  }

  /**
   * Gives an order to the friend who is choosing: 'atacar', 'poder:<id>', 'soltar', 'poner', 'invocar:<id>',
   * 'objeto:<id>', 'defender' (and 'huir' at the first menu); `objetivo` is the index among the enemies
   * standing (or among the friends for a heal or an item). True if it was taken.
   */
  elegir(orden: string, objetivo = 0): boolean {
    if (this.fase !== 'menu' && this.fase !== 'ordenes') return false;
    this.emitirForzado({ forzada: orden, objetivo });
    return true;
  }
  /** Beats every enemy at once and goes through the victory. */
  ganar() {
    this.corteP = 'victoria';
    this.emitirForzado('fin');
  }
  /** Knocks the whole party down. */
  perder() {
    this.corteP = 'derrota';
    this.emitirForzado('fin');
  }

  // ------------------------------------------------------------ drawing

  dibujar(g: CanvasRenderingContext2D) {
    // the picture the world left on the screen, kept for the swirl
    if (!this.snap) {
      this.snap = lienzo(240, 160);
      ctx(this.snap).drawImage(g.canvas, 0, 0);
    }
    if (this.fase === 'entrada') {
      this.dibujarAnims(g, 'tope');
      return;
    }
    // the world, shaking
    g.save();
    if (this.sacudida.amp > 0) {
      const a = this.sacudida.amp * (1 - this.sacudida.t / Math.max(0.01, this.sacudida.dur));
      g.translate(Math.round((Math.random() - 0.5) * 2 * a), Math.round((Math.random() - 0.5) * 2 * a));
    }
    dibujarFondo(g, 'campo', this.cam.th, this.t);
    this.dibujarAnims(g, 'bajo');
    this.dibujarLuchadores(g);
    this.dibujarAnims(g, 'sobre');
    this.parts.dibujar(g);
    g.restore();
    this.dibujarAnims(g, 'tope');
    this.numeros.dibujar(g);
    if (this.flashPantalla.dur > 0) {
      g.globalAlpha = this.flashPantalla.a * (1 - this.flashPantalla.t / this.flashPantalla.dur);
      g.fillStyle = this.flashPantalla.col;
      g.fillRect(0, 0, 240, 160);
      g.globalAlpha = 1;
    }
    this.dibujarInterfaz(g);
    if (this.fundido > 0.001) {
      g.fillStyle = `rgba(0,0,0,${this.fundido})`;
      g.fillRect(0, 0, 240, 160);
    }
  }

  private dibujarAnims(g: CanvasRenderingContext2D, capa: 'bajo' | 'sobre' | 'tope') {
    for (const a of this.anims) if ((a.o.capa ?? 'sobre') === capa && a.o.draw) a.o.draw(g, Math.min(a.t, a.dur));
  }

  private dibujarLuchadores(g: CanvasRenderingContext2D) {
    const todos: Array<{ y: number; f: () => void }> = [];
    for (const e of this.enemigos) {
      if (!e.vivo) continue;
      const p = this.pies(e);
      todos.push({ y: p.y, f: () => this.dibujarEnemigo(g, e, p) });
    }
    for (const h of this.heroes) {
      const p = this.pies(h);
      todos.push({ y: p.y, f: () => this.dibujarHeroe(g, h, p) });
    }
    todos.sort((a, b) => a.y - b.y);
    for (const o of todos) o.f();
  }

  private dibujarEnemigo(g: CanvasRenderingContext2D, e: Enemigo, p: Punto) {
    const d = e.def;
    const rate = d.pintor === 'mosquito' ? 14 : d.pintor === 'movil' ? 7 : d.pintor === 'petardo' ? 5 : 2.5;
    const frame = Math.floor(this.t * rate + e.idx);
    const img = spriteEnemigo(d.id, frame);
    const bob = d.flota ? Math.round(Math.sin(this.t * 3 + e.idx * 1.7) * 2) : Math.round(Math.sin(this.t * 2.2 + e.idx) * 0.6);
    const x = Math.round(p.x - img.width / 2);
    const y = Math.round(p.y - img.height - d.flota + bob);
    // its shadow stays on the ground
    const sw = Math.max(12, Math.round(img.width * 0.8));
    g.drawImage(sombraImg(sw), Math.round(p.x - sw / 2), Math.round(p.y - 2));
    if (e.muriendo >= 0) {
      // it melts: each row slides down and the whole thing fades
      const k = limitar(e.muriendo / 0.85, 0, 1);
      g.globalAlpha = 1 - k * k;
      const fuente = k < 0.12 ? siluetaEnemigo(d.id, frame) : img;
      for (let j = 0; j < img.height; j++) {
        const comp = 1 - k * 0.85;
        const yy = y + img.height - Math.round((img.height - j) * comp);
        g.drawImage(fuente, 0, j, img.width, 1, x + (Math.floor(j / 2 + this.t * 20) % 2 ? 1 : 0), yy, img.width, 1);
      }
      g.globalAlpha = 1;
      return;
    }
    if (e.flash > 0 && Math.floor(e.flash * 24) % 2 === 0) g.drawImage(siluetaEnemigo(d.id, frame), x, y);
    else if (e.flash > 0) {
      // the blink: it vanishes on every other step
    } else g.drawImage(img, x, y);
    // a lit fuse sparkles
    if (d.pintor === 'petardo' && Math.floor(this.t * 14 + e.idx) % 2 === 0) {
      g.drawImage(chispa(Math.floor(this.t * 9) % 2 ? '#ffd84a' : '#ffffff'), x + MECHA_PETARDO.x - 2, y + MECHA_PETARDO.y - 3);
    }
  }

  private dibujarHeroe(g: CanvasRenderingContext2D, h: Heroe, p: Punto) {
    const n = FRAMES[h.pose];
    const frame = h.frameFijo >= 0 ? Math.min(n - 1, h.frameFijo) : Math.floor(h.tPose * (h.pose === 'victoria' ? 4 : 2) + h.idx * 0.5) % n;
    const img = luchador(h.m.q, h.pose, frame);
    const x = Math.round(p.x - LUCHADOR_PIES.x);
    const y = Math.round(p.y - LUCHADOR_PIES.y);
    g.drawImage(sombraImg(18), Math.round(p.x - 9), Math.round(p.y - 3));
    const salto = h.pose === 'victoria' && Math.floor(h.tPose * 4 + h.idx) % 2 ? -3 : 0;
    if (h.flash > 0 && Math.floor(h.flash * 24) % 2 === 0) g.drawImage(blanco(img, `${h.m.q}.${h.pose}.${frame}`), x, y + salto);
    else g.drawImage(img, x, y + salto);
    // the arrow over the friend who is choosing and the shield of the one who defends
    const cab = y + salto + 2;
    if (this.ui.turno === h && (this.ui.modo === 'ordenes' || this.ui.modo === 'lista' || this.ui.modo === 'objetivo')) {
      g.drawImage(flechita(), Math.round(p.x - 4), cab - 7 + (Math.floor(this.t * 4) % 2));
    }
    if (h.defiende && vivo(h.m)) g.drawImage(escudito(), Math.round(p.x + 6), cab - 2 + Math.round(Math.sin(this.t * 4 + h.idx)));
  }

  // ------------------------------------------------------------ the interface

  private cajas = this.crearCajas();
  private crearCajas() {
    return [0, 1, 2, 3].map(() => ({ clave: '', c: lienzo(60, 36) }));
  }

  private dibujarInterfaz(g: CanvasRenderingContext2D) {
    if (this.ui.oculta) {
      this.dialogo.dibujar(g);
      return;
    }
    // the message line at the top
    if (this.msg) {
      const w = Math.max(80, anchoTexto(this.msg) + 22);
      g.drawImage(ventana(w, 17), Math.round(120 - w / 2), 2);
      escribir(g, this.msg, Math.round(120 - anchoTexto(this.msg) / 2), 5, '#ffffff', '#0a1450');
    }
    // the status boxes of the four friends
    this.heroes.forEach((h, i) => this.dibujarCaja(g, h, i));
    // the menus
    const u = this.ui;
    if (u.modo === 'luchar') this.dibujarMenu(g, u.menu.items, u.menu.cursor, u.menu.x, u.menu.y);
    if (u.modo === 'ordenes' || u.modo === 'lista') this.dibujarIconos(g);
    if (u.modo === 'lista') this.dibujarMenu(g, u.menu.items, u.menu.cursor, u.menu.x, u.menu.y);
    if (u.modo === 'objetivo' && u.objetivo.luchador) this.dibujarMano(g, u.objetivo.luchador, u.objetivo.vecinos);
    if (u.modo === 'estado') this.dibujarEstado(g);
    if (this.panelAbierto) this.dibujarPanelNivel(g, this.panelAbierto);
    this.dialogo.dibujar(g);
  }

  private dibujarCaja(g: CanvasRenderingContext2D, h: Heroe, i: number) {
    const s = statsDe(this.g, h.m);
    const pv = Math.round(h.pvVisto);
    const ip = Math.round(h.ipVisto);
    const activo = this.ui.turno === h;
    const clave = `${h.m.q}.${pv}.${ip}.${s.pv}.${s.ip}.${activo}.${h.m.nivel}`;
    const caja = this.cajas[i];
    if (caja.clave !== clave) {
      caja.clave = clave;
      const x = ctx(caja.c);
      x.clearRect(0, 0, 60, 36);
      x.drawImage(ventana(60, 36), 0, 0);
      const ko = h.m.pv <= 0;
      escribir(x, nombreAmigo(h.m.q), 6, 4, ko ? '#ff9a9a' : activo ? '#ffe27a' : '#ffffff', '#0a1450');
      const fila = (y: number, etiqueta: string, v: number, max: number, col: string, colBajo: string) => {
        escribir(x, etiqueta, 6, y, '#9ab4ff', '#0a1450');
        escribir(x, String(v), 22, y, v <= max * 0.25 ? '#ff9a9a' : '#ffffff', '#0a1450');
        rect(x, '#0a0f3a', 40, y + 3, 16, 5);
        rect(x, '#25398f', 41, y + 4, 14, 3);
        const n = Math.round((limitar(v / Math.max(1, max), 0, 1)) * 14);
        rect(x, v <= max * 0.25 ? colBajo : col, 41, y + 4, n, 3);
      };
      fila(14, texto('etiqueta.pv'), pv, s.pv, '#6af0a0', '#ff6a6a');
      fila(24, texto('etiqueta.ip'), ip, s.ip, '#6ab4ff', '#6ab4ff');
    }
    g.drawImage(caja.c, i * 60, CAJA_Y);
  }

  private dibujarMenu(g: CanvasRenderingContext2D, items: ItemLista[], cursor: number, x: number, y: number) {
    const izq = Math.max(...items.map((i) => anchoTexto(i.txt)));
    const der = Math.max(0, ...items.map((i) => (i.der ? anchoTexto(i.der) : 0)));
    const w = 24 + izq + (der ? der + 10 : 0) + 6;
    const h = items.length * 11 + 10;
    g.drawImage(ventana(w, h), x, y);
    items.forEach((it, i) => {
      const col = it.gris ? '#7a86c0' : '#ffffff';
      escribir(g, it.txt, x + 20, y + 5 + i * 11, col, '#0a1450');
      if (it.der) escribir(g, it.der, x + w - 7 - anchoTexto(it.der), y + 5 + i * 11, it.gris ? '#7a86c0' : '#ffe27a', '#0a1450');
    });
    const bob = Math.floor(this.t / 0.25) % 2;
    g.drawImage(manoCursor(), x + 6 + bob, y + 6 + cursor * 11);
  }

  private dibujarIconos(g: CanvasRenderingContext2D) {
    const ic = this.ui.iconos;
    const w = ORDENES.length * 20 + 10;
    const x0 = 4;
    const y0 = 19;
    g.drawImage(ventana(w, 41), x0, y0);
    ORDENES.forEach((o, i) => {
      const img = iconoOrden(o, !ic.activos[i]);
      const sel = i === ic.cursor;
      const bote = sel ? (Math.floor(this.t * 6) % 2) * -1 : 0;
      g.drawImage(img, x0 + 6 + i * 20, y0 + 5 + bote);
    });
    // the hand under the chosen icon and its name below
    const sel = ic.cursor;
    const bob = Math.floor(this.t / 0.25) % 2;
    const nombre = texto(`orden.${ORDENES[sel]}`);
    escribir(g, nombre, Math.round(x0 + w / 2 - anchoTexto(nombre) / 2), y0 + 27, ic.activos[sel] ? '#ffe27a' : '#7a86c0', '#0a1450');
    const mano = una('combate.manoArriba', () => girar(manoCursor(), 3));
    if (this.ui.modo === 'ordenes') g.drawImage(mano, x0 + 6 + sel * 20 + 4, y0 + 24 + bob - 7);
  }

  private dibujarMano(g: CanvasRenderingContext2D, o: Luchador, vecinos: Luchador[]) {
    const mano = una('combate.manoAbajo', () => girar(manoCursor(), 1));
    const p = this.pies(o);
    const arriba = p.y - this.alto(o) - (o.lado === 'enemigo' ? 0 : 0);
    const bob = Math.floor(this.t / 0.25) % 2;
    g.drawImage(mano, Math.round(p.x - 4), Math.round(arriba - 11 + bob));
    for (const v of vecinos) {
      const q = this.pies(v);
      if (Math.floor(this.t * 4) % 2) g.drawImage(chispa('#ffe27a'), Math.round(q.x - 2), Math.round(q.y - this.alto(v) - 5));
    }
  }

  private dibujarEstado(g: CanvasRenderingContext2D) {
    const h = this.heroes[this.ui.estado.idx];
    const s = statsDe(this.g, h.m);
    const x = 14;
    const y = 20;
    g.drawImage(ventana(212, 96), x, y);
    const col = '#ffffff';
    const lab = '#9ab4ff';
    const sh = '#0a1450';
    escribir(g, nombreAmigo(h.m.q), x + 12, y + 8, '#ffe27a', sh);
    escribir(g, `${texto('estado.nivel')} ${h.m.nivel}`, x + 70, y + 8, col, sh);
    escribir(g, texto(`elemento.${AMIGOS[h.m.q].elemento}`), x + 112, y + 8, col, sh);
    const filas: Array<[string, string]> = [
      [texto('etiqueta.pv'), `${h.m.pv}/${s.pv}`],
      [texto('etiqueta.ip'), `${h.m.ip}/${s.ip}`],
      [texto('etiqueta.atk'), String(s.atk)],
      [texto('etiqueta.def'), String(s.def)],
      [texto('etiqueta.agi'), String(s.agi)],
      [texto('etiqueta.exp'), `${h.m.exp}/${expTotal(h.m.nivel + 1)}`],
    ];
    filas.forEach(([l, v], i) => {
      const cx = x + 12 + Math.floor(i / 3) * 84;
      const cy = y + 26 + (i % 3) * 12;
      escribir(g, l, cx, cy, lab, sh);
      escribir(g, v, cx + 40, cy, col, sh);
    });
    // his prompters
    const mias = this.g.apuntadores.filter((a) => a.dueno === h.m.q);
    escribir(g, texto('orden.apuntadores'), x + 12, y + 64, lab, sh);
    mias.forEach((a, i) => {
      g.drawImage(imgApuntador(apuntadorPorId(a.id).el, 0), x + 12 + i * 70, y + 74);
      escribir(g, texto(`apuntador.estado.${a.estado}`), x + 30 + i * 70, y + 78, a.estado === 'puesto' ? '#8cf08c' : '#ffe27a', sh);
    });
    if (!mias.length) escribir(g, texto('estado.ninguno'), x + 12, y + 77, '#7a86c0', sh);
    // arrows to change friend
    escribir(g, '-', x + 4, y + 40, col, sh);
    escribir(g, '+', x + 204, y + 40, col, sh);
  }

  private dibujarPanelNivel(g: CanvasRenderingContext2D, s: SubidaDeNivel) {
    const x = 46;
    const y = 8;
    g.drawImage(ventana(148, 90), x, y);
    const sh = '#0a1450';
    escribir(g, nombreAmigo(s.q), x + 10, y + 8, '#ffe27a', sh);
    escribir(g, `${texto('estado.nivel')} ${s.nivel}`, x + 90, y + 8, '#ffffff', sh);
    const filas: Array<[string, keyof SubidaDeNivel['antes']]> = [
      [texto('etiqueta.pv'), 'pv'], [texto('etiqueta.ip'), 'ip'], [texto('etiqueta.atk'), 'atk'], [texto('etiqueta.def'), 'def'], [texto('etiqueta.agi'), 'agi'],
    ];
    filas.forEach(([l, k], i) => {
      const cy = y + 24 + i * 12;
      escribir(g, l, x + 10, cy, '#9ab4ff', sh);
      escribir(g, String(s.antes[k]), x + 64, cy, '#ffffff', sh);
      escribir(g, '+', x + 86, cy, '#8cf08c', sh);
      escribir(g, String(s.despues[k] - s.antes[k]), x + 93, cy, '#8cf08c', sh);
      escribir(g, String(s.despues[k]), x + 112, cy, '#ffe27a', sh);
    });
  }
}

/** Starts a fight. See the header for how the world's loop drives it. */
export function empezarCombate(o: OpcionesCombate): Combate {
  return new Combate(o);
}
