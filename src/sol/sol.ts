// «Alacant Sun»: a short, affectionate parody of the first *Golden Sun* for Pablo (docs: the proposal in
// /capitulo2/golden-sun-pablo.md). This slice: the GBA screen and its console, Pablo's bedroom (the mother who
// will not take a «no»), the village in fiestas at night in a storm, one psynergy («Sí, y...», our Move) that
// pushes a crate of soft turrón with a hand of stage light, the plaza where the narrator (Pablo's shadow) steals
// the end of the play, the three friends who join him one by one (they follow him in a line along the path he
// walks), the peña's shop and the inn, the road to the theatre with its random fights, chests and a wild
// prompter, and the START menu. The slice ends at the theatre's door.
//
// A minigame of the story, like src/pang/capitulo.ts: it ends with 'hecho' (the plaza reached), 'saltado'
// or 'cancelado' (the × button). Everything is our own drawing and our own names.
//
// Performance (docs/ESTILO.md, T5/T6): sprites, tiles and windows are painted once into cached canvases; per
// frame only drawImage of cached pieces onto the 240×160 canvas and one scaled blit to the screen (an integer
// factor, no smoothing). The loop never runs faster than 60 fps. `window.__sol()` counts frames.
import type { SonidoMinijuego } from '../core/audio';
import { cargarTextos, hayTexto, texto } from '../juego/textos';
import textosSol from '../textos/sol.md?raw';
import { esVertical } from '../ui/orientacion';
import { caja as spriteCaja, chispa, destello, lluvia, manoLuz, puntito, T } from './arte';
import { chupitoSuelo, cofre as spriteCofre } from './artecampo';
import { spriteEnemigo } from './enemigos';
import { camino, type Cofre, type Escondite, type MundoCamino, type ZonaEncuentro } from './camino';
import { Combate, empezarCombate, type EstadoCombate, type ResultadoCombate } from './combate';
import { crearConsola, Mandos } from './consola';
import { empezarFinal, type Final } from './final';
import { ALTO_CUARTO, ANCHO_CUARTO, BASE_PARED, CUARTO_X, CUARTO_Y, cuarto } from './cuarto';
import { pagina } from './efectos';
import { type FondoCombate } from './fondo';
import { escribir, anchoTexto } from './fuente';
import { BONO_APUNTADOR, crearGrupo, darApuntador, descansar, expTotal, statsDe, unirAmigo, vivo, ajustar, type Grupo, type Miembro } from './grupo';
import { cartelito, contadorIP, Dialogo, dibujarEmocion, type Emocion, type Icono, type Linea, PANTALLA_H, PANTALLA_W } from './interfaz';
import { ENTRADA, fondoSala, frenteSala, TENDERO, type Sala } from './interior';
import { solidoBaldosa, pueblo, type Lectura, type Mundo, type MundoBase, type Rect } from './mapas';
import { dibujarCartas, dibujarCartel, dibujarDetalleApuntador, dibujarEstado, dibujarLista, dibujarMonedas, Teclas, type ItemLista } from './menus';
import { CICLO, dirDe, marco, PIES, sombraPies, vectorDe, type Amigo, type Dir, type Pose, type Quien } from './personajes';
import { ctx, girar, lienzo } from './pixel';
import { OBJETOS, poderesDe, poderPorId } from './poderes';
import { SonidoSol, EFECTO_APUNTADOR, EFECTO_CURA, EFECTO_MENU, EFECTO_PODER, EFECTO_PUERTA, PISTA_CAMINO, PISTA_PUEBLO } from './sonido';
import { dibujarLogo, portada } from './titulo';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

export interface OpcionesSol {
  sonido?: SonidoMinijuego;
  /** Skips the waiting (tests and the minigames menu's quick mode). */
  rapido?: boolean;
}

/** What the test hook (`window.__sol()`) tells and lets a script do. */
export interface EstadoSol {
  fotogramas: number;
  escena: string;
  /** 'libre' | 'dialogo' | 'poder' | 'fundido' | 'guion' */
  modo: string;
  pablo: { x: number; y: number; dir: Dir; ip: number };
  caja: { x: number; y: number; movida: boolean };
  aldeano: { x: number; y: number };
  mando: Mandos;
  /** Skips the title and the bedroom: Pablo outside his door, in the village. */
  irAlPueblo(): Promise<void>;
  /** Straight to the road to the theatre (Pablo at its start, the friends who have joined behind him). */
  irAlCamino(): Promise<void>;
  /** The three friends join the party now (no scenes) and the narrator's scene counts as seen. */
  unirTodos(): void;
  /** One friend joins the party now (no scene). */
  unirA(q: Amigo): void;
  /** Plays the narrator's scene on the plaza. */
  narrador(): Promise<void>;
  /** Opens the START menu. */
  abrirMenu(): Promise<void>;
  /** Walks into the peña (the shop) or the inn. */
  entrar(sala: Sala): Promise<void>;
  /** Starts a random fight now (a group of the zone Pablo is in, or the one given); the hook's answer is its result. */
  encuentro(grupo?: string[]): Promise<ResultadoCombate | null>;
  /** Turns the random fights of the road on or off (the steps counter still runs). */
  encuentros(si: boolean): void;
  /** Steps (pixels) left until the next random fight. */
  pasos(): number;
  /** The road's state: prompter beaten, chests opened, glints taken. */
  estadoCamino(): { chistVencido: boolean; cofres: string[]; escondites: string[]; seguidores: string[] };
  /** Where things are on the road, for a test script to walk to. */
  lugaresCamino(): { chist: { x: number; y: number }; cofres: Array<{ id: string; x: number; y: number }>; escondites: Array<{ id: string; x: number; y: number }>; puertaTeatro: Rect };
  /** The party's friends in the village and where they wait. */
  estadoPueblo(): { narradorHecho: boolean; unidos: string[]; amigos: Record<string, { x: number; y: number; visible: boolean }> };
  /** Closes the game as if the × button had been pressed. */
  cerrar(): void;
  /** Puts Pablo on this spot (feet), in the scene he is in. */
  poner(x: number, y: number): void;
  ip(n: number): void;
  /** The fight in progress (phase, round, health...), or null. See combate.ts. */
  combate: EstadoCombate | null;
  /** Gives an order to the friend who is choosing: 'atacar', 'poder:<id>', 'soltar', 'poner', 'invocar', 'objeto:<id>', 'defender', 'huir'. */
  elegir(orden: string, objetivo?: number): boolean;
  /** Beats all the enemies / knocks the whole party down. */
  ganar(): void;
  perder(): void;
  /** Starts a fight now (the test fight of `?sol&combate` is this with a mixed group). */
  luchar(enemigos: string[], fondo?: FondoCombate): Promise<ResultadoCombate>;
  /** The boss fight on the stage and, if it is won, the ending (what `?sol&jefe` runs); resolves with the fight's result. */
  jefe(): Promise<ResultadoCombate>;
  /** Where the boss fight is: 'jefe1' | 'jefe2' | 'guion' (Calderón on offer) | 'victoria' | 'final' | '' (none). */
  fase(): string;
  /** Puts the boss at the edge of his script moment (the next action triggers it); false without a boss fight. */
  guion(): boolean;
  grupo: Grupo;
}

// ---------------------------------------------------------------- constants

const WALK = 56;
const RUN = 100;
/** What «Sí, y...» costs in IP (the same number as in a fight). */
const IP_COSTE = poderPorId('siy').ip;
/** Pixels walked to recover one point of IP, for the whole party (slowly, as in the original). */
const PX_POR_IP = 52;
/** Pixels walked between two random fights on the road: the first is longer. */
const PASOS_ENCUENTRO: [number, number] = [260, 520];
/** Distance (pixels along Pablo's path) between two friends of the line. */
const SEPARACION = 15;
/** Coins the inn charges for the night. */
const PRECIO_POSADA = 10;
const ALCANCE = 56;
const SILENCIO: SonidoMinijuego = { musica() {}, pararMusica() {} };
/** The shadow, hit box (feet) of a character: 10 wide, 5 tall. */
const CAJA_PIES = { w: 10, h: 5 };

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const limitar = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const solapa = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

interface Pj {
  q: Quien;
  x: number;
  y: number;
  dir: Dir;
  /** Walk clock. */
  t: number;
  mov: boolean;
  pose: Pose;
  emocion: Emocion | null;
}

const nuevoPj = (q: Quien, x: number, y: number, dir: Dir): Pj => ({ q, x, y, dir, t: 0, mov: false, pose: 'normal', emocion: null });

interface Chispa {
  /** Orbit centre, radius, angle, speed; or a free particle (vx, vy). */
  cx: number;
  cy: number;
  r: number;
  a: number;
  va: number;
  vr: number;
  vx: number;
  vy: number;
  t: number;
  dura: number;
  col: string;
  grande: boolean;
}

export function jugarSol(root: HTMLElement, o: OpcionesSol = {}): Promise<Resultado> {
  cargarTextos(textosSol);
  const sonido = new SonidoSol(o.sonido ?? SILENCIO);
  const VEL = o.rapido ? 6 : 1;
  const corte = new AbortController();
  let motivo: Resultado = 'cancelado';
  let terminado = false;

  // ------------------------------------------------------------ screen and console
  const consola = crearConsola(root, {
    marca: texto('consola.marca'),
    modelo: texto('consola.modelo'),
    start: texto('consola.start'),
    cerrar: texto('boton.cerrar'),
    saltar: texto('minijuego.saltar'),
  });
  const mandos = consola.mandos;
  const pantalla = lienzo(PANTALLA_W, PANTALLA_H);
  const g = ctx(pantalla);
  const dialogo = new Dialogo(sonido, (q) => texto(`nombre.${q}`));

  consola.cerrar.addEventListener('click', (e) => {
    e.stopPropagation();
    motivo = 'cancelado';
    corte.abort();
  });
  consola.saltar.addEventListener('click', (e) => {
    e.stopPropagation();
    motivo = 'saltado';
    corte.abort();
  });
  // Tapping the screen presses A on the title (so a mouse can start it too).
  consola.lienzo.addEventListener('pointerdown', () => {
    if (escena === 'titulo') mandos.pulsar('a');
  });

  // ------------------------------------------------------------ state
  let escena: 'titulo' | 'cuarto' | 'pueblo' | 'camino' | 'interior' | 'fin' = 'titulo';
  let fotogramas = 0;
  let t = 0;
  let tPueblo = 0;
  const cuartoM = cuarto();
  /** The map Pablo walks in (the village or the road). */
  let mundo: MundoBase | null = null;
  /** The room he is in when `escena` is «interior». */
  let sala: Sala = 'tienda';
  // the party (combate.ts reads it) and its members' walking sprites
  const grupo = crearGrupo({ amigos: ['pablo'], nivel: 1, apuntadores: false });
  const mPablo = (): Miembro => grupo.miembros[0];
  const ipMax = () => statsDe(grupo, mPablo()).ip;

  const pablo = nuevoPj('pablo', 0, 0, 'S');
  const madre = nuevoPj('madre', cuartoM.madre.x, cuartoM.madre.y, 'W');
  const aldeano = nuevoPj('aldeano', 0, 0, 'S');
  const narrador = nuevoPj('narrador', 0, 0, 'S');
  const tendera = nuevoPj('tendera', TENDERO.x, TENDERO.y, 'S');
  const posadero = nuevoPj('posadero', TENDERO.x, TENDERO.y, 'S');
  const amigosM: Record<'fran' | 'guille' | 'chuchi', Pj> = { fran: nuevoPj('fran', 0, 0, 'N'), guille: nuevoPj('guille', 0, 0, 'W'), chuchi: nuevoPj('chuchi', 0, 0, 'S') };
  let ipPaso = 0;
  // the story's progress
  let narradorHecho = false;
  let narradorVisible = false;
  let paginasT = -1;
  let chuchiAndando = false;
  let narradorA = 1;
  let caminoVisto = false;
  let camSuave = false;
  /** Chuchi's walk into the village: waypoints, then Pablo. */
  let chuchiRuta: null | { pts: Array<{ x: number; y: number }>; res: () => void; t: number; atasco: number } = null;
  /** Walks of the cutscenes. */
  const marchas: Array<{ p: Pj; pts: Array<{ x: number; y: number }>; vel: number; res: () => void }> = [];
  /** A short note at the top and the little windows the menus keep open (the friends' cards, the coins). */
  let aviso: string | null = null;
  const cartasUI = { ver: false, sel: -1, mano: false };
  let monedasUI: null | { x: number; y: number } = null;
  /** The friends who follow Pablo, in order, and the path he has walked (they walk along it). */
  const seguidores: Pj[] = [];
  const rastro: Array<{ x: number; y: number }> = [];
  // the road
  let pasosEnc = PASOS_ENCUENTRO[1];
  let encuentrosOn = true;
  const estadoCaminoM = { chistVencido: false, chistArmado: true, chistT: 0, cofres: new Set<string>(), escondites: new Set<string>() };
  // the menus: layers drawn over the world, and the buttons as events
  const capas: Array<(g: CanvasRenderingContext2D) => void> = [];
  const teclas = new Teclas();
  let ipDestello = 0;
  let cama: 'dormido' | 'sentado' | 'vacia' = 'dormido';

  const caja = { x: 0, y: 0, movida: false, visto: false, moviendo: null as null | { t: number; dur: number; x0: number; y0: number; x1: number; y1: number } };
  const ia = { destino: null as null | { x: number; y: number }, espera: 1.5, hablando: false, saludado: false, hablado: 0, nota: 6 };
  let poder: null | { t: number; dir: Dir; objetivo: boolean; bloqueado: boolean; dx: number; dy: number; empuja: boolean } = null;
  let guion = 0; // scripts running: the player cannot move
  const esperas: Array<{ resta: number; res: () => void }> = [];
  let fade = { a: 1, desde: 1, hasta: 1, t: 0, dur: 0, res: null as null | (() => void) };
  const chispas: Chispa[] = [];
  let avisoNada = 0;
  let yaSaludoPablo = false;
  let abrio = false;
  // the fight in progress (combate.ts: the world only calls `luchar` and lets it run)
  let combate: Combate | null = null;
  // the ending (final.ts): another mode of the loop, after the boss
  let final: Final | null = null;

  // lightning: seconds until the next, and the flash being played
  const RAYO = [0.5, 0.08, 0.6, 0.3, 0.14, 0.07, 0.03];
  let rayoProx = 3;
  let rayoT = -1;
  let flash = 0;
  const cam = { x: 0, y: 0 };

  // ------------------------------------------------------------ helpers
  const espera = (s: number) =>
    new Promise<void>((res) => {
      esperas.push({ resta: s, res });
    });
  const fundirA = (hasta: number, dur = 0.5) =>
    new Promise<void>((res) => {
      fade = { a: fade.a, desde: fade.a, hasta, t: 0, dur: dur / VEL, res };
    });
  const bloquear = async <T2>(f: () => Promise<T2>): Promise<T2> => {
    guion++;
    try {
      return await f();
    } finally {
      guion--;
    }
  };

  /**
   * A line of the texts. At the start of the text: «@fran » makes that character speak (whoever the script
   * said), «@nadie » the narrator without a portrait; then «[contento] » makes the speaker smile.
   * `vars` fill the {holes} of the text.
   */
  const lineaDe = (quien: Quien | null, clave: string, vars: Record<string, string | number> = {}): Linea => {
    let s = texto(clave, vars);
    let q = quien;
    const a = s.match(/^@(\w+)\s+/);
    if (a) {
      q = a[1] === 'nadie' ? null : (a[1] as Quien);
      s = s.slice(a[0].length);
    }
    let animo: 'normal' | 'contento' = 'normal';
    const m = s.match(/^\[(\w+)\]\s*/);
    if (m) {
      if (m[1] === 'contento') animo = 'contento';
      s = s.slice(m[0].length);
    }
    return { quien: q, texto: s, animo };
  };
  const decir = (quien: Quien | null, clave: string, vars?: Record<string, string | number>) => dialogo.decir(lineaDe(quien, clave, vars));
  /** A conversation: clave.1, clave.2... one window each. */
  const serie = async (quien: Quien | null, clave: string, vars?: Record<string, string | number>) => {
    for (let i = 1; hayTexto(`${clave}.${i}`); i++) await decir(quien, `${clave}.${i}`, vars);
  };

  const emocionar = (p: Pj, tipo: Icono, dura = 1) => {
    p.emocion = { tipo, t: 0, dura };
  };

  const rectPj = (p: { x: number; y: number }): Rect => ({ x: p.x - CAJA_PIES.w / 2, y: p.y - CAJA_PIES.h, w: CAJA_PIES.w, h: CAJA_PIES.h });
  const rectCaja = (): Rect => ({ x: caja.x, y: caja.y, w: T, h: T });
  /** Has this friend joined the party? */
  const unido = (q: Amigo) => grupo.miembros.some((m) => m.q === q);
  /** A friend who has not joined is in the village once the narrator has gone (Chuchi only when he arrives). */
  const npcVisible = (q: 'fran' | 'guille' | 'chuchi') => escena === 'pueblo' && narradorHecho && !unido(q) && (q !== 'chuchi' || chuchiAndando);
  const puebloM = () => pueblo();
  const caminoM = () => camino(texto('letrero.teatro'));

  /** Does a box (feet of somebody) hit something solid in this scene? `yo` is not counted. */
  const choca = (r: Rect, yo?: Pj): boolean => {
    if (escena === 'cuarto') {
      // the bottom edge is a wall, except over the doormat
      const P = cuartoM.puerta;
      const enPuerta = r.x >= P.x && r.x + r.w <= P.x + P.w;
      if (r.x < 10 || r.x + r.w > ANCHO_CUARTO - 10 || r.y < BASE_PARED || r.y + r.h > (enPuerta ? ALTO_CUARTO : ALTO_CUARTO - 8)) return true;
      for (const q of cuartoM.rects) if (solapa(r, q)) return true;
      if (yo !== madre && cama !== null && solapa(r, rectPj(madre))) return true;
      return false;
    }
    const m = mundo!;
    const tx0 = Math.floor(r.x / T);
    const tx1 = Math.floor((r.x + r.w - 0.01) / T);
    const ty0 = Math.floor(r.y / T);
    const ty1 = Math.floor((r.y + r.h - 0.01) / T);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (solidoBaldosa(m.grid[ty]?.[tx])) return true;
    for (const q of m.rects) if (solapa(r, q)) return true;
    if (escena === 'camino') {
      for (const c of caminoM().cofres) if (solapa(r, rectCofre(c))) return true;
    }
    if (escena === 'pueblo') {
      if (solapa(r, rectCaja())) return true;
      if (yo !== pablo && solapa(r, rectPj(pablo))) return true;
      if (yo !== aldeano && solapa(r, rectPj(aldeano))) return true;
      for (const q of ['fran', 'guille', 'chuchi'] as const) if (npcVisible(q) && yo !== amigosM[q] && solapa(r, rectPj(amigosM[q]))) return true;
    }
    return false;
  };

  /** Moves a character by (dx, dy), sliding along walls. Returns the distance really moved. */
  const mover = (p: Pj, dx: number, dy: number): number => {
    let hecho = 0;
    if (dx) {
      const r = rectPj({ x: p.x + dx, y: p.y });
      if (!choca(r, p)) {
        p.x += dx;
        hecho += Math.abs(dx);
      }
    }
    if (dy) {
      const r = rectPj({ x: p.x, y: p.y + dy });
      if (!choca(r, p)) {
        p.y += dy;
        hecho += Math.abs(dy);
      }
    }
    return hecho;
  };

  // ------------------------------------------------------------ the psynergy
  /** The cardinal directions to try for a facing: the facing itself or its two components. */
  const cardinales = (d: Dir): Dir[] => {
    const [vx, vy] = vectorDe(d);
    if (!vx || !vy) return [d];
    return [vx > 0 ? 'E' : 'W', vy > 0 ? 'S' : 'N'];
  };

  /** The crate in front of Pablo within reach, and the way to push it. */
  const buscarObjetivo = (): { dir: Dir; bloqueado: boolean; dx: number; dy: number } | null => {
    if (escena !== 'pueblo' || !mundo) return null;
    const c = rectCaja();
    for (const d of cardinales(pablo.dir)) {
      const [vx, vy] = vectorDe(d);
      const pr = rectPj(pablo);
      // a strip in front of the feet, a bit wider than the hit box
      const franja: Rect = {
        x: vx > 0 ? pr.x + pr.w : vx < 0 ? pr.x - ALCANCE : pr.x - 3,
        y: vy > 0 ? pr.y + pr.h : vy < 0 ? pr.y - ALCANCE : pr.y - 5,
        w: vx ? ALCANCE : pr.w + 6,
        h: vy ? ALCANCE : pr.h + 8,
      };
      if (!solapa(franja, c)) continue;
      // the tile it would go to must be free
      const destino: Rect = { x: c.x + vx * T, y: c.y + vy * T, w: T, h: T };
      let bloq = false;
      const tx0 = Math.floor(destino.x / T);
      const ty0 = Math.floor(destino.y / T);
      if (solidoBaldosa(mundo.grid[ty0]?.[tx0])) bloq = true;
      for (const q of mundo.rects) if (solapa({ x: destino.x + 1, y: destino.y + 1, w: T - 2, h: T - 2 }, q)) bloq = true;
      if (solapa(destino, rectPj(aldeano))) bloq = true;
      if (solapa(destino, rectPj(pablo))) bloq = true;
      return { dir: d, bloqueado: bloq, dx: vx, dy: vy };
    }
    return null;
  };

  const lanzarPoder = () => {
    const ob = buscarObjetivo();
    if (!ob) {
      emocionar(pablo, 'puntos', 1);
      if (avisoNada++ === 0) void bloquear(() => decir('pablo', 'pablo.nada'));
      return;
    }
    if (mPablo().ip < IP_COSTE) {
      void bloquear(() => decir('pablo', 'pablo.sinip'));
      return;
    }
    mPablo().ip -= IP_COSTE;
    ipDestello = 1.2;
    pablo.dir = ob.dir;
    pablo.mov = false;
    poder = { t: 0, dir: ob.dir, objetivo: true, bloqueado: ob.bloqueado, dx: ob.dx, dy: ob.dy, empuja: false };
    sonido.efecto(EFECTO_PODER);
  };

  const chispaNueva = (c: Partial<Chispa>) => {
    chispas.push({ cx: 0, cy: 0, r: 0, a: 0, va: 0, vr: 0, vx: 0, vy: 0, t: 0, dura: 0.6, col: '#ffffff', grande: false, ...c });
    if (chispas.length > 60) chispas.shift();
  };
  const COLORES = ['#ffe14a', '#ff8ad0', '#6ad8ff', '#8cf06a', '#ffffff', '#ffb04a'];

  const actualizarPoder = (dt: number) => {
    const p = poder!;
    p.t += dt;
    pablo.pose = p.t < 1.45 ? 'poder' : 'normal';
    // sparkles circling Pablo
    if (p.t < 1.3) {
      for (let i = 0; i < 2; i++) {
        chispaNueva({ cx: pablo.x, cy: pablo.y - 12, r: 15, a: Math.random() * 6.28, va: 7 + Math.random() * 3, vr: -9, dura: 0.55, col: COLORES[Math.floor(Math.random() * COLORES.length)], grande: Math.random() > 0.6 });
      }
    }
    // the push: the crate slides one tile
    if (p.t >= 0.75 && !p.empuja) {
      p.empuja = true;
      if (!p.bloqueado) {
        caja.moviendo = { t: 0, dur: 0.5, x0: caja.x, y0: caja.y, x1: caja.x + p.dx * T, y1: caja.y + p.dy * T };
      }
    }
    if (p.t >= 1.55) {
      pablo.pose = 'normal';
      const quedaba = poder;
      poder = null;
      if (quedaba?.bloqueado) {
        emocionar(pablo, 'puntos', 1);
        void bloquear(() => decir('pablo', 'pablo.atasca'));
      }
    }
  };

  /** A fight: the loop hands the screen and the buttons to it until it ends (see combate.ts). */
  const luchar = async (enemigos: string[], fondo: FondoCombate = 'campo', sinHuida = false): Promise<ResultadoCombate> => {
    combate = empezarCombate({ grupo, enemigos, fondo, sonido, mandos, sinHuida, rapido: VEL > 1 });
    const r = await combate.resultado;
    combate = null;
    mandos.soltar();
    teclas.vaciar();
    // the fight ends in black: the world comes back out of it (after a defeat the script that follows decides)
    if (r !== 'derrota') {
      fade = { a: 1, desde: 1, hasta: 1, t: 0, dur: 0, res: null };
      void fundirA(0, 0.45);
    }
    return r;
  };

  /**
   * The boss on the stage and the ending. Fights the narrator (no running away; Calderón's music, the script moment...),
   * and if he is beaten the Sombra has already fallen into pages: the ending plays (final.ts) and the game closes with
   * `terminar('hecho')`. If the party loses it is rested and `alPerder` takes it back (the Teatro passes the stage entrance;
   * without it, the usual defeat of the world). Returns the result of the fight.
   */
  const jefeYFinal = async (alPerder?: () => Promise<void>): Promise<ResultadoCombate> => {
    const r = await luchar(['narrador'], 'escenario', true);
    if (r === 'victoria') {
      final = empezarFinal({ sonido, mandos, rapido: VEL > 1, encoger: (seg) => consola.encoger(seg) });
      await final.resultado;
      final = null;
      terminar('hecho');
    } else if (r === 'derrota') {
      if (alPerder) {
        descansar(grupo);
        await alPerder();
      } else await derrotado();
    }
    return r;
  };

  // ------------------------------------------------------------ the party in a line
  /** The point of Pablo's path `dist` pixels behind him (walking back along it). */
  const puntoDelRastro = (dist: number): { x: number; y: number } => {
    let resto = dist;
    let px = pablo.x;
    let py = pablo.y;
    for (let i = rastro.length - 1; i >= 0; i--) {
      const d = Math.hypot(rastro[i].x - px, rastro[i].y - py);
      if (d >= resto && d > 0) {
        const k = resto / d;
        return { x: px + (rastro[i].x - px) * k, y: py + (rastro[i].y - py) * k };
      }
      resto -= d;
      px = rastro[i].x;
      py = rastro[i].y;
    }
    return { x: px, y: py };
  };

  /** Pablo has moved: his path gets a new point (they are 2 pixels apart, and the oldest ones are forgotten). */
  const anotarRastro = () => {
    const u = rastro[rastro.length - 1];
    if (u && Math.hypot(pablo.x - u.x, pablo.y - u.y) < 2) return;
    rastro.push({ x: pablo.x, y: pablo.y });
    if (rastro.length > 80) rastro.shift();
  };

  /** Puts the friends in a line straight behind Pablo (away from where he faces): they come out of doors behind him. */
  const alinearSeguidores = () => {
    rastro.length = 0;
    const [vx, vy] = vectorDe(pablo.dir);
    const n = Math.hypot(vx, vy) || 1;
    for (let k = 40; k >= 1; k--) rastro.push({ x: pablo.x - (vx / n) * k * 2, y: pablo.y - (vy / n) * k * 2 });
    rastro.push({ x: pablo.x, y: pablo.y });
    seguidores.forEach((s, i) => {
      const p = puntoDelRastro(SEPARACION * (i + 1));
      s.x = p.x;
      s.y = p.y;
      s.dir = pablo.dir;
      s.mov = false;
    });
  };

  const actualizarSeguidores = (dt: number) => {
    if (escena !== 'pueblo' && escena !== 'camino') return;
    seguidores.forEach((s, i) => {
      const meta = puntoDelRastro(SEPARACION * (i + 1));
      const dx = meta.x - s.x;
      const dy = meta.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.4) {
        s.mov = false;
        return;
      }
      const paso = Math.min(d, Math.max(RUN * 1.1, d * 7) * dt);
      s.x += (dx / d) * paso;
      s.y += (dy / d) * paso;
      s.dir = dirDe(dx, dy, s.dir);
      s.mov = paso > 0.05;
      s.t += dt * (d > 18 ? 1.55 : 1);
    });
  };

  /** A friend joins the party: his data, and from now on he follows Pablo's path. */
  const incorporar = (q: 'fran' | 'guille' | 'chuchi') => {
    unirAmigo(grupo, q);
    if (!seguidores.includes(amigosM[q])) seguidores.push(amigosM[q]);
  };

  // ------------------------------------------------------------ scenes
  const moverCamara = (dt = 0) => {
    if (!mundo || (escena !== 'pueblo' && escena !== 'camino')) return;
    // the camera follows Pablo, or Chuchi while he walks in (then it glides)
    const foco = chuchiRuta && chuchiRuta.pts.length ? amigosM.chuchi : pablo;
    const tx = limitar(Math.round(foco.x - PANTALLA_W / 2), 0, mundo.w - PANTALLA_W);
    const ty = limitar(Math.round(foco.y - 14 - PANTALLA_H / 2), 0, mundo.h - PANTALLA_H);
    if (camSuave && dt > 0) {
      cam.x = Math.round(cam.x + (tx - cam.x) * Math.min(1, dt * 3.5));
      cam.y = Math.round(cam.y + (ty - cam.y) * Math.min(1, dt * 3.5));
      if (!chuchiRuta && Math.abs(tx - cam.x) < 2 && Math.abs(ty - cam.y) < 2) camSuave = false;
    } else {
      cam.x = tx;
      cam.y = ty;
    }
  };

  const preparaPueblo = () => {
    const m = puebloM();
    mundo = m;
    escena = 'pueblo';
    tPueblo = 0;
    // the first time only: afterwards the crate and the people stay where they were left
    if (!abrio) {
      caja.x = m.caja.x;
      caja.y = m.caja.y;
      aldeano.x = m.aldeano.x;
      aldeano.y = m.aldeano.y;
      for (const q of ['fran', 'guille', 'chuchi'] as const) {
        amigosM[q].x = m.amigos[q].x;
        amigosM[q].y = m.amigos[q].y;
      }
      narrador.x = m.narrador.x;
      narrador.y = m.narrador.y;
      abrio = true;
    }
  };
  const ponerEnPuerta = () => {
    pablo.x = (mundo as Mundo).salida.x;
    pablo.y = (mundo as Mundo).salida.y;
    pablo.dir = 'S';
    pablo.mov = false;
    alinearSeguidores();
    moverCamara();
  };

  const preparaCamino = () => {
    const m = caminoM();
    mundo = m;
    escena = 'camino';
    pablo.x = m.inicio.x;
    pablo.y = m.inicio.y;
    pablo.dir = 'E';
    pablo.mov = false;
    estadoCaminoM.chistArmado = true;
    alinearSeguidores();
    moverCamara();
    sonido.musica(PISTA_CAMINO);
  };

  /** Back in the village from the road: Pablo comes out of the opening in the east, facing the plaza. */
  const volverAlPueblo = () => {
    preparaPueblo();
    const m = mundo as Mundo;
    pablo.x = m.llegadaCamino.x;
    pablo.y = m.llegadaCamino.y;
    pablo.dir = 'W';
    pablo.mov = false;
    alinearSeguidores();
    moverCamara();
    sonido.musica(PISTA_PUEBLO);
  };

  const irACuartoDentro = async () => {
    await fundirA(1, 0.4);
    escena = 'cuarto';
    pablo.x = cuartoM.inicio.x;
    pablo.y = cuartoM.inicio.y;
    pablo.dir = 'N';
    pablo.mov = false;
    await fundirA(0, 0.4);
  };

  const salirDelCuarto = async () => {
    await bloquear(async () => {
      sonido.efecto(EFECTO_PUERTA);
      await fundirA(1, 0.45);
      preparaPueblo();
      ponerEnPuerta();
      if (sonido.actual !== PISTA_PUEBLO) sonido.musica(PISTA_PUEBLO);
      await espera(0.3);
      await fundirA(0, 0.6);
      if (!yaSaludoPablo) {
        yaSaludoPablo = true;
        await decir('pablo', 'pablo.pueblo');
        await decir(null, 'consejo.mover');
      }
    });
  };

  const entrarEnCasa = async () => {
    await bloquear(async () => {
      sonido.efecto(EFECTO_PUERTA);
      await irACuartoDentro();
    });
  };

  // ------------------------------------------------------------ scripts
  const empezarHistoria = async () => {
    await bloquear(async () => {
      sonido.musica();
      await fundirA(1, 0.35);
      escena = 'cuarto';
      cama = 'dormido';
      pablo.x = 36;
      pablo.y = 84;
      await espera(0.4);
      await fundirA(0, 1.2);
      await espera(1.4);
      await serie('madre', 'madre.despertar');
      let veces = 0;
      for (;;) {
        const i = await dialogo.preguntar(lineaDe('madre', 'madre.pregunta'), [texto('opcion.si'), texto('opcion.no')]);
        if (i === 0) break;
        // «No»: the mother says «sí, y...» and asks again, as the original's people do
        veces++;
        await decir('madre', `madre.no.${((veces - 1) % 4) + 1}`);
      }
      cama = 'sentado';
      emocionar(pablo, 'exclama', 0.9);
      await espera(0.7);
      await decir('pablo', 'pablo.si');
      await serie('madre', 'madre.si');
      grupo.monedas += 40;
      await decir('madre', 'madre.monedas');
      cama = 'vacia';
      pablo.dir = 'S';
      pablo.mov = false;
      madre.dir = dirDe(pablo.x - madre.x, pablo.y - madre.y, 'S');
    });
  };

  const hablarConMadre = async () => {
    madre.dir = dirDe(pablo.x - madre.x, pablo.y - madre.y, 'S');
    pablo.dir = dirDe(madre.x - pablo.x, madre.y - pablo.y, pablo.dir);
    ia.hablado += 0;
    await bloquear(async () => {
      const n = (madreVeces++ % 3) + 1;
      await decir('madre', `madre.fuera.${n}`);
    });
  };
  let madreVeces = 0;

  const hablarConAldeano = async () => {
    aldeano.dir = dirDe(pablo.x - aldeano.x, pablo.y - aldeano.y, 'S');
    pablo.dir = dirDe(aldeano.x - pablo.x, aldeano.y - pablo.y, pablo.dir);
    ia.hablando = true;
    ia.saludado = true;
    await bloquear(async () => {
      if (caja.movida) await decir('aldeano', 'aldeano.luego.1');
      else if (ia.hablado === 0) {
        await serie('aldeano', 'aldeano.hola');
        await decir('pablo', 'pablo.aldeano');
      } else await decir('aldeano', `aldeano.otra.${(ia.hablado % 2) + 1}`);
      ia.hablado++;
    });
    ia.hablando = false;
    ia.espera = 1.2;
  };

  const leer = async (l: Lectura) => {
    await bloquear(async () => {
      if (l.clave === 'lectura.caja') await decir(null, caja.movida ? 'lectura.caja.2' : 'lectura.caja.1');
      else await decir(l.quien, l.clave);
    });
  };

  const verLaCaja = async () => {
    caja.visto = true;
    await bloquear(async () => {
      emocionar(pablo, 'pregunta', 1);
      await espera(0.8);
      await decir('pablo', 'pablo.caja.1');
      await decir('pablo', 'pablo.caja.2');
      await decir(null, 'consejo.caja');
    });
  };

  // ------------------------------------------------------------ cutscene walks
  /** Walks a character along some points on his own (no collisions: for scenes, with the world locked). */
  const caminar = (p: Pj, pts: Array<{ x: number; y: number }>, vel = WALK) =>
    new Promise<void>((res) => {
      marchas.push({ p, pts: [...pts], vel, res });
    });

  const actualizarMarchas = (dt: number) => {
    for (let i = marchas.length - 1; i >= 0; i--) {
      const m = marchas[i];
      const meta = m.pts[0];
      const dx = meta.x - m.p.x;
      const dy = meta.y - m.p.y;
      const d = Math.hypot(dx, dy);
      const paso = m.vel * dt * VEL;
      if (d <= paso) {
        m.p.x = meta.x;
        m.p.y = meta.y;
        m.pts.shift();
        if (!m.pts.length) {
          m.p.mov = false;
          marchas.splice(i, 1);
          m.res();
        }
        continue;
      }
      m.p.x += (dx / d) * paso;
      m.p.y += (dy / d) * paso;
      m.p.dir = dirDe(dx, dy, m.p.dir);
      m.p.mov = true;
      m.p.t += dt * VEL;
    }
  };

  // ------------------------------------------------------------ small windows and menus
  /** A short note in a small window at the top, for `dura` seconds. */
  const avisar = async (txt: string, dura = 1.3) => {
    aviso = txt;
    await espera(dura);
    aviso = null;
    teclas.vaciar();
  };

  interface OpcionesLista {
    cursor?: number;
    anchoMin?: number;
    /** More to draw with the list (a detail window...). */
    extra?: (gg: CanvasRenderingContext2D, cursor: number) => void;
  }
  /** A list with the hand: the index chosen with A, or −1 with B or START. */
  const elegirLista = async (items: ItemLista[], x: number, y: number, o: OpcionesLista = {}): Promise<number> => {
    let c = limitar(o.cursor ?? 0, 0, items.length - 1);
    const capa = (gg: CanvasRenderingContext2D) => {
      dibujarLista(gg, items, c, x, y, t, o.anchoMin);
      o.extra?.(gg, c);
    };
    capas.push(capa);
    teclas.vaciar();
    try {
      for (;;) {
        const k = await teclas.siguiente();
        if (k === 'arriba' || k === 'abajo') {
          c = (c + (k === 'abajo' ? 1 : items.length - 1)) % items.length;
          sonido.efecto(EFECTO_MENU, 0.7);
        } else if (k === 'a') {
          sonido.efecto(EFECTO_MENU);
          return c;
        } else if (k === 'b' || k === 'start') return -1;
      }
    } finally {
      capas.splice(capas.indexOf(capa), 1);
    }
  };

  /** The hand over the friends' cards: the friend chosen, or −1. */
  const elegirAmigo = async (inicio = 0): Promise<number> => {
    let c = limitar(inicio, 0, grupo.miembros.length - 1);
    const antes = { ...cartasUI };
    cartasUI.ver = true;
    cartasUI.mano = true;
    cartasUI.sel = c;
    const capa = () => {};
    capas.push(capa);
    teclas.vaciar();
    try {
      for (;;) {
        const k = await teclas.siguiente();
        if (k === 'arriba' || k === 'abajo') {
          c = (c + (k === 'abajo' ? 1 : grupo.miembros.length - 1)) % grupo.miembros.length;
          cartasUI.sel = c;
          sonido.efecto(EFECTO_MENU, 0.7);
        } else if (k === 'a') {
          sonido.efecto(EFECTO_MENU);
          return c;
        } else if (k === 'b' || k === 'start') return -1;
      }
    } finally {
      capas.splice(capas.indexOf(capa), 1);
      Object.assign(cartasUI, antes);
    }
  };

  const nombreDe = (q: Amigo) => texto(`nombre.${q}`);
  const reajustar = () => {
    for (const m of grupo.miembros) ajustar(grupo, m);
  };

  /** What a prompter adds to its owner, one entry per number. */
  const bonosDe = (id: string): string[] => {
    const b = BONO_APUNTADOR[id] ?? {};
    return (['pv', 'ip', 'atk', 'def', 'agi'] as const).filter((k) => b[k]).map((k) => `+${b[k]} ${texto(`etiqueta.${k}`)}`);
  };

  // ------------------------------------------------------------ the START menu
  const menuImpronergia = async () => {
    let q = 0;
    for (;;) {
      q = await elegirAmigo(q);
      if (q < 0) return;
      const m = grupo.miembros[q];
      const ps = poderesDe(m.q, m.nivel);
      if (!ps.length) {
        await avisar(texto('combate.nada.poder'));
        continue;
      }
      let c = 0;
      for (;;) {
        const items: ItemLista[] = ps.map((p) => ({ txt: texto(`poder.${p.id}.nombre`), der: String(p.ip), gris: p.modo !== 'cura' }));
        c = await elegirLista(items, 6, 6, { cursor: c, anchoMin: 96 });
        if (c < 0) break;
        const p = ps[c];
        if (p.modo !== 'cura') {
          await avisar(texto(p.id === 'siy' ? 'menu.siy' : 'menu.soloCombate'));
          continue;
        }
        if (m.ip < p.ip) {
          await avisar(texto('combate.sin.ip'));
          continue;
        }
        const t2 = await elegirAmigo(q);
        if (t2 < 0) continue;
        const dest = grupo.miembros[t2];
        const max = statsDe(grupo, dest).pv;
        if (!vivo(dest) || dest.pv >= max) {
          await avisar(texto('menu.nohace'));
          continue;
        }
        m.ip -= p.ip;
        const antes = dest.pv;
        dest.pv = Math.min(max, dest.pv + Math.round(p.pot + statsDe(grupo, m).atk));
        sonido.efecto(EFECTO_CURA);
        await avisar(texto('menu.cura', { quien: nombreDe(dest.q), n: dest.pv - antes }), 1.5);
      }
    }
  };

  const menuApuntadores = async () => {
    if (!grupo.apuntadores.length) {
      await avisar(texto('menu.sinapuntadores'));
      return;
    }
    let c = 0;
    const antes = { ...cartasUI };
    cartasUI.ver = false;
    try {
      for (;;) {
        const items: ItemLista[] = grupo.apuntadores.map((a) => ({ txt: texto(`apuntador.${a.id}.nombre`), der: texto(`apuntador.estado.${a.estado}`) }));
        const detalle = (gg: CanvasRenderingContext2D, k: number) => {
          const a = grupo.apuntadores[k];
          dibujarDetalleApuntador(gg, a.id, a.dueno, a.estado, a.turnos, bonosDe(a.id), 6, 40, t);
        };
        c = await elegirLista(items, 6, 6, { cursor: c, anchoMin: 150, extra: detalle });
        if (c < 0) return;
        const a = grupo.apuntadores[c];
        const acciones: ItemLista[] = [
          { txt: texto('menu.poner'), gris: a.estado === 'recupera' },
          { txt: texto('menu.quitar'), gris: a.estado !== 'puesto' },
        ];
        const k = await elegirLista(acciones, 160, 6, { anchoMin: 70, extra: detalle ? (gg) => detalle(gg, c) : undefined });
        if (k < 0) continue;
        if (a.estado === 'recupera') {
          await avisar(texto('menu.recupera'));
          continue;
        }
        if (k === 0) {
          cartasUI.ver = true;
          const q = await elegirAmigo(Math.max(0, grupo.miembros.findIndex((m) => m.q === a.dueno)));
          cartasUI.ver = false;
          if (q < 0) continue;
          a.dueno = grupo.miembros[q].q;
          a.estado = 'puesto';
          reajustar();
          sonido.efecto(EFECTO_APUNTADOR);
          await avisar(texto('menu.puesto', { apuntador: texto(`apuntador.${a.id}.nombre`), quien: nombreDe(a.dueno) }), 1.5);
        } else if (a.estado === 'puesto') {
          a.estado = 'espera';
          reajustar();
          sonido.efecto(EFECTO_APUNTADOR);
          await avisar(texto('menu.quitado', { apuntador: texto(`apuntador.${a.id}.nombre`) }), 1.5);
        } else await avisar(texto('menu.nohace'));
      }
    } finally {
      Object.assign(cartasUI, antes);
    }
  };

  const menuObjetos = async () => {
    let c = 0;
    for (;;) {
      const lista = OBJETOS.filter((o) => (grupo.objetos[o.id] ?? 0) > 0);
      if (!lista.length) {
        await avisar(texto('combate.nada.objeto'));
        return;
      }
      const items: ItemLista[] = lista.map((o) => ({ txt: texto(`objeto.${o.id}.nombre`), der: `x${grupo.objetos[o.id]}` }));
      c = await elegirLista(items, 6, 6, { cursor: c, anchoMin: 96 });
      if (c < 0) return;
      const o = lista[c];
      const q = await elegirAmigo(0);
      if (q < 0) continue;
      const d = grupo.miembros[q];
      const s = statsDe(grupo, d);
      const sirve = vivo(d) && ((!!o.pv && d.pv < s.pv) || (!!o.ip && d.ip < s.ip));
      if (!sirve) {
        await avisar(texto('menu.nohace'));
        continue;
      }
      grupo.objetos[o.id]--;
      d.pv += o.pv ?? 0;
      d.ip += o.ip ?? 0;
      ajustar(grupo, d);
      sonido.efecto(EFECTO_CURA);
      await avisar(texto('menu.usa', { quien: nombreDe(d.q), objeto: texto(`objeto.${o.id}.nombre`) }), 1.4);
    }
  };

  const menuEstado = async () => {
    let idx = 0;
    const antes = { ...cartasUI };
    const monedas = monedasUI;
    cartasUI.ver = false;
    monedasUI = null;
    const capa = (gg: CanvasRenderingContext2D) => dibujarEstado(gg, grupo, idx, t);
    capas.push(capa);
    teclas.vaciar();
    try {
      for (;;) {
        const k = await teclas.siguiente();
        if (k === 'izq' || k === 'der') {
          idx = (idx + (k === 'der' ? 1 : grupo.miembros.length - 1)) % grupo.miembros.length;
          sonido.efecto(EFECTO_MENU, 0.7);
        } else if (k === 'b' || k === 'start') return;
      }
    } finally {
      capas.splice(capas.indexOf(capa), 1);
      Object.assign(cartasUI, antes);
      monedasUI = monedas;
    }
  };

  /** START: the four sections of the original (Impronergía, Apuntadores, Objetos, Estado), with the friends' cards. */
  const menuPrincipal = async () => {
    await bloquear(async () => {
      sonido.efecto(EFECTO_MENU);
      teclas.vaciar();
      cartasUI.ver = true;
      cartasUI.mano = false;
      monedasUI = { x: 6, y: 62 };
      let c = 0;
      try {
        for (;;) {
          const items: ItemLista[] = ['menu.impronergia', 'menu.apuntadores', 'menu.objetos', 'menu.estado'].map((k) => ({ txt: texto(k) }));
          c = await elegirLista(items, 6, 6, { cursor: c, anchoMin: 74 });
          if (c < 0) break;
          if (c === 0) await menuImpronergia();
          else if (c === 1) await menuApuntadores();
          else if (c === 2) await menuObjetos();
          else await menuEstado();
        }
      } finally {
        cartasUI.ver = false;
        cartasUI.mano = false;
        monedasUI = null;
        teclas.vaciar();
      }
    });
  };

  // ------------------------------------------------------------ the peña and the inn
  const comprar = async () => {
    let c = 0;
    for (;;) {
      const items: ItemLista[] = OBJETOS.map((o) => ({ txt: texto(`objeto.${o.id}.nombre`), der: String(o.precio), gris: grupo.monedas < o.precio }));
      c = await elegirLista(items, 6, 38, { cursor: c, anchoMin: 120 });
      if (c < 0) return;
      const o = OBJETOS[c];
      if (grupo.monedas < o.precio) {
        await avisar(texto('tienda.sinmonedas'));
        continue;
      }
      grupo.monedas -= o.precio;
      grupo.objetos[o.id] = (grupo.objetos[o.id] ?? 0) + 1;
      sonido.efecto(EFECTO_APUNTADOR, 0.8);
      await avisar(texto('tienda.gracias', { objeto: texto(`objeto.${o.id}.nombre`) }), 1.2);
    }
  };

  const tiendaMenu = async () => {
    await decir('tendera', 'tienda.hola');
    for (;;) {
      const i = await elegirLista([{ txt: texto('tienda.comprar') }, { txt: texto('tienda.salir') }], 6, 6, { anchoMin: 74 });
      if (i !== 0) break;
      await comprar();
    }
    await decir('tendera', 'tienda.adios');
  };

  const posadaMenu = async () => {
    const i = await dialogo.preguntar(lineaDe('posadero', 'posada.hola', { n: PRECIO_POSADA }), [texto('opcion.si'), texto('opcion.no')]);
    if (i !== 0) {
      await decir('posadero', 'posada.no');
      return;
    }
    if (grupo.monedas < PRECIO_POSADA) {
      await decir('posadero', 'posada.pobre');
      return;
    }
    grupo.monedas -= PRECIO_POSADA;
    await fundirA(1, 0.7);
    descansar(grupo);
    sonido.efecto(EFECTO_CURA);
    await espera(1.4);
    await fundirA(0, 0.9);
    await decir('posadero', 'posada.listo');
  };

  /** Walks into the peña or the inn: a still room, the keeper behind his counter, a menu. */
  const entrarSala = async (s: Sala) => {
    await bloquear(async () => {
      sonido.efecto(EFECTO_PUERTA);
      await fundirA(1, 0.35);
      escena = 'interior';
      sala = s;
      pablo.x = ENTRADA.x;
      pablo.y = ENTRADA.y;
      pablo.dir = 'N';
      pablo.mov = false;
      seguidores.forEach((f, i) => {
        f.x = ENTRADA.x + (i % 2 === 0 ? -1 : 1) * (Math.floor(i / 2) + 1) * 20;
        f.y = ENTRADA.y;
        f.dir = 'N';
        f.mov = false;
      });
      (s === 'tienda' ? tendera : posadero).dir = 'S';
      monedasUI = { x: PANTALLA_W - 80, y: 6 };
      await fundirA(0, 0.35);
      if (s === 'tienda') await tiendaMenu();
      else await posadaMenu();
      monedasUI = null;
      sonido.efecto(EFECTO_PUERTA);
      await fundirA(1, 0.35);
      escena = 'pueblo';
      const m = puebloM();
      const sal = s === 'tienda' ? m.salidaTienda : m.salidaPosada;
      pablo.x = sal.x;
      pablo.y = sal.y;
      pablo.dir = 'S';
      alinearSeguidores();
      moverCamara();
      await fundirA(0, 0.35);
    });
  };

  // ------------------------------------------------------------ the narrator steals the ending
  const escenaNarrador = async () => {
    await bloquear(async () => {
      const m = puebloM();
      pablo.mov = false;
      narrador.x = m.narrador.x;
      narrador.y = m.narrador.y;
      narrador.dir = dirDe(pablo.x - narrador.x, pablo.y - narrador.y, 'S');
      // a flash of lightning and the shadow is there
      rayoT = 0;
      rayoProx = 9;
      await espera(0.5);
      narradorVisible = true;
      narradorA = 0;
      sonido.efecto(EFECTO_PODER);
      await espera(1);
      pablo.dir = dirDe(narrador.x - pablo.x, narrador.y - pablo.y, pablo.dir);
      emocionar(pablo, 'exclama', 1);
      await espera(0.7);
      await serie('narrador', 'narrador.hola');
      // he takes the four acts: the pages fly round him
      paginasT = 0;
      sonido.efecto(EFECTO_APUNTADOR);
      await espera(1.6);
      await serie('narrador', 'narrador.obra');
      await decir('pablo', 'pablo.mias');
      await decir('narrador', 'narrador.final');
      // and off he goes, east, towards the theatre
      await caminar(narrador, [{ x: narrador.x + 70, y: narrador.y + 8 }, { x: m.salidaCamino.x + 40, y: narrador.y + 8 }], WALK * 1.3);
      narradorVisible = false;
      paginasT = -1;
      narradorHecho = true;
      pablo.dir = 'E';
      await espera(0.6);
      await serie('pablo', 'pablo.amigos');
    });
  };

  const alLlegarALaPlaza = async () => {
    await bloquear(async () => {
      pablo.mov = false;
      pablo.dir = 'N';
      emocionar(pablo, 'exclama', 1);
      await espera(0.8);
      await decir('pablo', 'fin.1');
      await escenaNarrador();
    });
  };

  // ------------------------------------------------------------ the friends join
  const unirseAlGrupo = async (q: 'fran' | 'guille' | 'chuchi') => {
    incorporar(q);
    sonido.efecto(EFECTO_APUNTADOR);
    emocionar(amigosM[q], 'exclama', 0.9);
    await decir(null, `une.${q}`);
    if (seguidores.length === 1) await decir(null, 'consejo.start');
  };

  /** Chuchi comes in at the gate, late, and walks to Pablo. */
  const llegaChuchi = async () => {
    await decir('pablo', 'pablo.chuchi');
    const c = amigosM.chuchi;
    const puerta = puebloM().amigos.chuchi;
    c.x = puerta.x;
    c.y = puerta.y;
    c.dir = 'E';
    chuchiAndando = true;
    camSuave = true;
    await new Promise<void>((res) => {
      chuchiRuta = { pts: [{ x: puerta.x + 16, y: puerta.y }, { x: puerta.x + 20, y: puerta.y - 80 }], res, t: 0, atasco: 0 };
    });
    chuchiRuta = null;
    c.mov = false;
    c.dir = dirDe(pablo.x - c.x, pablo.y - c.y, c.dir);
    pablo.dir = dirDe(c.x - pablo.x, c.y - pablo.y, pablo.dir);
    await serie('chuchi', 'charla.chuchi');
    await unirseAlGrupo('chuchi');
    await decir('pablo', 'pablo.todos');
  };

  const actualizarChuchi = (dt: number) => {
    const r = chuchiRuta;
    if (!r) return;
    const c = amigosM.chuchi;
    r.t += dt;
    const hacia = r.pts.length ? r.pts[0] : { x: pablo.x, y: pablo.y };
    const dx = hacia.x - c.x;
    const dy = hacia.y - c.y;
    const d = Math.hypot(dx, dy);
    if (r.pts.length ? d <= 3 : d <= 22) {
      if (r.pts.length) {
        r.pts.shift();
        return;
      }
      chuchiRuta = null;
      r.res();
      return;
    }
    const paso = Math.min(d, WALK * 1.25 * dt * VEL);
    const hecho = mover(c, (dx / d) * paso, (dy / d) * paso);
    c.mov = hecho > 0.01;
    c.dir = dirDe(dx, dy, c.dir);
    c.t += dt * VEL;
    r.atasco = hecho > 0.01 ? 0 : r.atasco + dt;
    // stuck behind a bench? he has been late enough: he steps beside Pablo
    if (r.atasco > 1.2 || r.t > 25) {
      c.x = pablo.x - 20;
      c.y = pablo.y + 6;
      chuchiRuta = null;
      r.res();
    }
  };

  const hablarConAmigo = async (q: 'fran' | 'guille') => {
    const a = amigosM[q];
    a.dir = dirDe(pablo.x - a.x, pablo.y - a.y, a.dir);
    pablo.dir = dirDe(a.x - pablo.x, a.y - pablo.y, pablo.dir);
    await bloquear(async () => {
      await serie(q, `charla.${q}`);
      await unirseAlGrupo(q);
      if (unido('fran') && unido('guille') && !unido('chuchi')) await llegaChuchi();
    });
  };

  // ------------------------------------------------------------ the road
  /** The zone of the road Pablo is in. */
  const zonaDe = (): ZonaEncuentro | undefined => {
    const c = Math.floor(pablo.x / T);
    const r = Math.floor((pablo.y - 1) / T);
    return caminoM().zonas.find((z) => c >= z.c0 && c <= z.c1 && (z.r0 === undefined || r >= z.r0) && (z.r1 === undefined || r <= z.r1));
  };

  const siguientePaso = () => PASOS_ENCUENTRO[0] + Math.random() * (PASOS_ENCUENTRO[1] - PASOS_ENCUENTRO[0]);

  /** Defeat: the party wakes up at home, rested, with half the coins lost and a line from the mother. */
  const derrotado = async () => {
    await bloquear(async () => {
      fade = { a: 1, desde: 1, hasta: 1, t: 0, dur: 0, res: null };
      const perdidas = Math.floor(grupo.monedas / 2);
      grupo.monedas -= perdidas;
      descansar(grupo);
      escena = 'cuarto';
      cama = 'dormido';
      pablo.x = 36;
      pablo.y = 84;
      pablo.mov = false;
      pasosEnc = siguientePaso();
      sonido.musica(PISTA_PUEBLO);
      await espera(0.6);
      await fundirA(0, 1.1);
      await espera(1);
      await serie('madre', 'madre.derrota');
      if (perdidas > 0) await decir(null, 'derrota.monedas', { n: perdidas });
      cama = 'sentado';
      emocionar(pablo, 'exclama', 0.8);
      await espera(0.8);
      await decir('pablo', 'pablo.derrota');
      cama = 'vacia';
      pablo.dir = 'S';
      madre.dir = dirDe(pablo.x - madre.x, pablo.y - madre.y, 'S');
    });
  };

  /** A wild group (the zone's, or the one given) now: the result of the fight, or null if this is no place for one. */
  const encuentroAleatorio = async (forzado?: string[]): Promise<ResultadoCombate | null> => {
    const z = zonaDe();
    let enemigos = forzado;
    if (!enemigos) {
      if (!z || z.seguro || !z.grupos.length) {
        pasosEnc = 90;
        return null;
      }
      enemigos = z.grupos[Math.floor(Math.random() * z.grupos.length)];
    }
    pasosEnc = siguientePaso();
    return bloquear(async () => {
      pablo.mov = false;
      emocionar(pablo, 'exclama', 0.7);
      await espera(0.7);
      const r = await luchar(enemigos!, 'campo');
      if (r === 'derrota') await derrotado();
      return r;
    });
  };

  const encontrarChist = async () => {
    const ch = caminoM().chist;
    estadoCaminoM.chistArmado = false;
    await bloquear(async () => {
      pablo.mov = false;
      pablo.dir = dirDe(ch.x - pablo.x, ch.y - pablo.y, pablo.dir);
      emocionar(pablo, 'exclama', 0.9);
      await espera(0.8);
      await decir(null, 'chist.aparece');
      const r = await luchar(['chist'], 'campo');
      if (r === 'victoria') {
        estadoCaminoM.chistVencido = true;
        await espera(0.6);
        darApuntador(grupo, 'chist', 'pablo');
        sonido.efecto(EFECTO_APUNTADOR);
        await decir(null, 'chist.unido');
        await decir(null, 'consejo.apuntador');
      } else if (r === 'derrota') await derrotado();
    });
  };

  const rectCofre = (c: Cofre): Rect => ({ x: c.x - 8, y: c.y - 6, w: 16, h: 6 });

  const abrirCofre = async (c: Cofre) => {
    await bloquear(async () => {
      pablo.mov = false;
      if (estadoCaminoM.cofres.has(c.id)) {
        await decir(null, 'cofre.vacio');
        return;
      }
      estadoCaminoM.cofres.add(c.id);
      sonido.efecto(EFECTO_APUNTADOR);
      for (let i = 0; i < 10; i++) chispaNueva({ cx: c.x + (Math.random() - 0.5) * 12, cy: c.y - 12, vx: (Math.random() - 0.5) * 20, vy: -14 - Math.random() * 14, dura: 0.7, col: COLORES[i % COLORES.length], grande: i % 3 === 0 });
      await espera(0.6);
      if (c.monedas) {
        grupo.monedas += c.monedas;
        await decir(null, 'cofre.monedas', { n: c.monedas });
      }
      if (c.objeto) {
        const n = c.cantidad ?? 1;
        grupo.objetos[c.objeto] = (grupo.objetos[c.objeto] ?? 0) + n;
        await decir(null, 'cofre.objeto', { n, objeto: texto(`objeto.${c.objeto}.nombre`) });
      }
    });
  };

  const recogerEscondite = async (e: Escondite) => {
    await bloquear(async () => {
      pablo.mov = false;
      estadoCaminoM.escondites.add(e.id);
      grupo.objetos[e.objeto] = (grupo.objetos[e.objeto] ?? 0) + 1;
      sonido.efecto(EFECTO_APUNTADOR);
      await decir(null, 'escondite.hallado', { objeto: texto(`objeto.${e.objeto}.nombre`) });
    });
  };

  const alCamino = async () => {
    await bloquear(async () => {
      pablo.mov = false;
      await fundirA(1, 0.45);
      preparaCamino();
      pasosEnc = PASOS_ENCUENTRO[1];
      await fundirA(0, 0.5);
      if (!caminoVisto) {
        caminoVisto = true;
        await decir('pablo', 'pablo.camino');
      }
    });
  };

  /** The opening in the east: out to the road once the three are in the party, otherwise Pablo turns back. */
  const salidaDelPueblo = async () => {
    if (unido('fran') && unido('guille') && unido('chuchi')) return alCamino();
    await bloquear(async () => {
      pablo.mov = false;
      await decir('pablo', narradorHecho ? 'pablo.falta' : 'pablo.antes');
      pablo.x = (mundo as Mundo).salidaCamino.x - 8;
      pablo.dir = 'W';
      alinearSeguidores();
    });
  };

  const alPueblo = async () => {
    await bloquear(async () => {
      pablo.mov = false;
      await fundirA(1, 0.45);
      volverAlPueblo();
      await fundirA(0, 0.5);
    });
  };

  const alTeatro = async () => {
    await bloquear(async () => {
      pablo.mov = false;
      pablo.dir = 'N';
      emocionar(pablo, 'exclama', 1);
      await espera(0.8);
      await serie('pablo', 'pablo.teatro');
      await fundirA(1, 0.8);
      escena = 'fin';
      await fundirA(0, 0.8);
      await espera(2.6);
      terminar('hecho');
    });
  };

  const comenzar = async () => {
    await bloquear(async () => {
      await fundirA(1, 0.3);
    });
    await empezarHistoria();
  };

  // ------------------------------------------------------------ update
  const hablandoCerca = () => {
    const d = Math.hypot(pablo.x - aldeano.x, pablo.y - aldeano.y);
    return d;
  };

  const actualizarAldeano = (dt: number) => {
    if (escena !== 'pueblo') return;
    const zona = (mundo as Mundo).aldeano.zona;
    ia.nota -= dt;
    if (ia.nota <= 0) {
      ia.nota = 9 + Math.random() * 6;
      if (!aldeano.emocion && !ia.hablando) emocionar(aldeano, 'nota', 1.6);
    }
    if (ia.hablando) {
      aldeano.mov = false;
      return;
    }
    const d = hablandoCerca();
    // He notices Pablo: a «!», and he waits for him
    if (d < 62 && !ia.saludado) {
      ia.saludado = true;
      emocionar(aldeano, 'exclama', 1.1);
    }
    if (d < 36) {
      aldeano.dir = dirDe(pablo.x - aldeano.x, pablo.y - aldeano.y, aldeano.dir);
      aldeano.mov = false;
      return;
    }
    if (d > 110) ia.saludado = false;
    if (ia.espera > 0) {
      ia.espera -= dt;
      aldeano.mov = false;
      if (ia.espera <= 0) {
        // a new place within the walking area, on foot, a few tiles away
        for (let i = 0; i < 8; i++) {
          const x = zona.x + 12 + Math.random() * (zona.w - 24);
          const y = zona.y + 12 + Math.random() * (zona.h - 24);
          if (Math.hypot(x - aldeano.x, y - aldeano.y) < 24) continue;
          if (!choca({ x: x - CAJA_PIES.w / 2, y: y - CAJA_PIES.h, w: CAJA_PIES.w, h: CAJA_PIES.h }, aldeano)) {
            ia.destino = { x, y };
            break;
          }
        }
        if (!ia.destino) ia.espera = 1;
      }
      return;
    }
    if (ia.destino) {
      const dx = ia.destino.x - aldeano.x;
      const dy = ia.destino.y - aldeano.y;
      // along one axis at a time, like a villager
      const horizontal = Math.abs(dx) > 2 && (Math.abs(dx) >= Math.abs(dy) || Math.abs(dy) <= 2);
      const paso = 22 * dt;
      const sx = horizontal ? Math.sign(dx) * Math.min(paso, Math.abs(dx)) : 0;
      const sy = !horizontal && Math.abs(dy) > 2 ? Math.sign(dy) * Math.min(paso, Math.abs(dy)) : 0;
      if (!sx && !sy) {
        ia.destino = null;
        ia.espera = 1.5 + Math.random() * 2.5;
        aldeano.mov = false;
        return;
      }
      const hecho = mover(aldeano, sx, sy);
      aldeano.mov = hecho > 0;
      aldeano.dir = dirDe(sx, sy, aldeano.dir);
      aldeano.t += dt;
      if (!hecho) {
        ia.destino = null;
        ia.espera = 0.8;
        aldeano.mov = false;
      }
    }
  };

  const actualizarJugador = (dt: number) => {
    let vx = mandos.x;
    let vy = mandos.y;
    if (vx || vy) {
      const norma = Math.hypot(vx, vy);
      vx /= norma;
      vy /= norma;
      const v = (mandos.b ? RUN : WALK) * dt;
      pablo.dir = dirDe(vx, vy, pablo.dir);
      const hecho = mover(pablo, vx * v, vy * v);
      pablo.mov = hecho > 0;
      pablo.t += dt * (mandos.b ? 1.55 : 1);
      if (hecho > 0) {
        anotarRastro();
        if (escena === 'camino') pasosEnc -= hecho;
      }
      // the IP comes back slowly while walking
      ipPaso += hecho;
      if (ipPaso >= PX_POR_IP) {
        ipPaso -= PX_POR_IP;
        // the whole party recovers IP as they walk
        for (const m of grupo.miembros) {
          if (m.pv > 0 && m.ip < statsDe(grupo, m).ip) {
            m.ip++;
            if (m === mPablo()) ipDestello = 0.8;
          }
        }
      }
    } else pablo.mov = false;
  };

  const interactuar = () => {
    // who or what is in front of Pablo
    const [vx, vy] = vectorDe(pablo.dir);
    const sonda: Rect = { x: pablo.x + vx * 11 - 7, y: pablo.y + vy * 9 - 8, w: 14, h: 12 };
    if (escena === 'cuarto') {
      if (solapa(sonda, { x: madre.x - 8, y: madre.y - 8, w: 16, h: 12 }) && cama === 'vacia') return void hablarConMadre();
      for (const l of cuartoM.lecturas) if (solapa({ x: pablo.x - 2, y: pablo.y - 5, w: 4, h: 5 }, l.rect) && vy <= 0) return void leer(l);
      return;
    }
    const apoyado = { x: pablo.x - 2, y: pablo.y - 5, w: 4, h: 5 };
    if (escena === 'camino') {
      const m = caminoM();
      for (const c of m.cofres) if (solapa(sonda, { x: c.x - 11, y: c.y - 12, w: 22, h: 16 })) return void abrirCofre(c);
      for (const e of m.escondites) if (!estadoCaminoM.escondites.has(e.id) && Math.hypot(pablo.x - e.x, pablo.y - e.y) < 22) return void recogerEscondite(e);
      for (const l of m.lecturas) if (solapa(apoyado, l.rect) && vy <= 0) return void leer(l);
      return;
    }
    if (solapa(sonda, { x: aldeano.x - 9, y: aldeano.y - 9, w: 18, h: 14 })) return void hablarConAldeano();
    for (const q of ['fran', 'guille'] as const) {
      const a = amigosM[q];
      if (npcVisible(q) && solapa(sonda, { x: a.x - 9, y: a.y - 9, w: 18, h: 14 })) return void hablarConAmigo(q);
    }
    const c = rectCaja();
    if (solapa(sonda, { x: c.x - 2, y: c.y - 2, w: c.w + 4, h: c.h + 4 })) return void leer({ rect: c, clave: 'lectura.caja', quien: null });
    for (const l of mundo!.lecturas) if (solapa(apoyado, l.rect) && vy <= 0) return void leer(l);
  };

  const actualizar = (dtReal: number) => {
    const dt = dtReal;
    t += dt;
    if (final) {
      final.update(dt);
      return;
    }
    if (combate) {
      combate.update(dt);
      return;
    }
    // timers of the scripts
    for (let i = esperas.length - 1; i >= 0; i--) {
      esperas[i].resta -= dt * VEL;
      if (esperas[i].resta <= 0) {
        const { res } = esperas.splice(i, 1)[0];
        res();
      }
    }
    // the fade
    if (fade.dur > 0) {
      fade.t += dt;
      const k = Math.min(1, fade.t / fade.dur);
      fade.a = fade.desde + (fade.hasta - fade.desde) * k;
      if (k >= 1) {
        fade.dur = 0;
        const res = fade.res;
        fade.res = null;
        res?.();
      }
    }
    // lightning: now and then, a flash over everything
    rayoProx -= dt;
    if (rayoProx <= 0 && rayoT < 0 && (escena === 'pueblo' || escena === 'cuarto')) {
      rayoT = 0;
      rayoProx = 5 + Math.random() * 9;
    }
    flash = 0;
    if (rayoT >= 0) {
      rayoT += dt;
      const i = Math.floor(rayoT * 20);
      if (i < RAYO.length) flash = RAYO[i];
      else rayoT = -1;
    }
    if (ipDestello > 0) ipDestello -= dt;

    // title
    if (escena === 'titulo') {
      if (mandos.tomarA() || mandos.tomarStart()) void comenzar();
      return;
    }

    dialogo.update(dt * VEL, mandos);
    // a menu open: the buttons become events for its script
    if (capas.length && !dialogo.activo) teclas.leer(dt, mandos);
    const libre = !dialogo.activo && fade.dur === 0 && !poder && guion === 0;

    if (libre) {
      if (mandos.tomarB()) {
        /* B cancels: nothing to cancel on the map, and held it makes him run */
      }
      actualizarJugador(dt);
      if (mandos.tomarA()) interactuar();
      else if (mandos.tomarR()) lanzarPoder();
      else if (mandos.tomarStart() && (escena === 'pueblo' || escena === 'camino')) void menuPrincipal();
      // places that react to Pablo
      if (escena === 'cuarto') {
        if (pablo.y >= ALTO_CUARTO - 6 && pablo.x > cuartoM.puerta.x && pablo.x < cuartoM.puerta.x + cuartoM.puerta.w && cama === 'vacia') void salirDelCuarto();
      } else if (escena === 'pueblo') {
        const m = mundo as Mundo;
        const pr = rectPj(pablo);
        const enPuerta = (r: Rect) => pablo.x > r.x && pablo.x < r.x + r.w && pablo.y <= r.y + 12 && pablo.y >= r.y;
        if (!caja.visto && Math.hypot(pablo.x - (caja.x + 8), pablo.y - (caja.y + 8)) < 44) void verLaCaja();
        else if (enPuerta(m.puerta)) void entrarEnCasa();
        else if (enPuerta(m.tienda)) void entrarSala('tienda');
        else if (enPuerta(m.posada)) void entrarSala('posada');
        else if (!narradorHecho && caja.movida && solapa(pr, m.plaza) && pablo.y < 13 * T) void alLlegarALaPlaza();
        else if (solapa(pr, m.salidaCamino)) void salidaDelPueblo();
      } else if (escena === 'camino') {
        const m = mundo as MundoCamino;
        const pr = rectPj(pablo);
        const ch = m.chist;
        if (!estadoCaminoM.chistVencido) {
          const d = Math.hypot(pablo.x - ch.x, pablo.y - ch.y);
          if (d > 80) estadoCaminoM.chistArmado = true;
          else if (d < 40 && estadoCaminoM.chistArmado) void encontrarChist();
        }
        if (solapa(pr, m.puertaTeatro)) void alTeatro();
        else if (solapa(pr, m.salidaOeste) && pablo.dir.includes('W')) void alPueblo();
        else if (encuentrosOn && pasosEnc <= 0) void encuentroAleatorio();
      }
    } else {
      mandos.tomarA();
      mandos.tomarB();
      mandos.tomarR();
      mandos.tomarStart();
      if (!poder) pablo.mov = pablo.mov && false;
    }
    if (poder) actualizarPoder(dt);

    // the crate, sliding
    if (caja.moviendo) {
      const c = caja.moviendo;
      c.t += dt;
      const k = Math.min(1, c.t / c.dur);
      caja.x = c.x0 + (c.x1 - c.x0) * easeOut(k);
      caja.y = c.y0 + (c.y1 - c.y0) * easeOut(k);
      if (k >= 1) {
        caja.x = c.x1;
        caja.y = c.y1;
        caja.moviendo = null;
        caja.movida = true;
      }
    }
    // the others
    if (escena === 'pueblo') actualizarAldeano(dt);
    if (escena === 'pueblo') tPueblo += dt;
    actualizarSeguidores(dt);
    actualizarMarchas(dt);
    actualizarChuchi(dt);
    if (narradorVisible && narradorA < 1) narradorA = Math.min(1, narradorA + dt / 0.8);
    if (paginasT >= 0) paginasT += dt;
    // emotions
    for (const p of [pablo, madre, aldeano, narrador, ...Object.values(amigosM)]) {
      if (p.emocion) {
        p.emocion.t += dt;
        if (p.emocion.t >= p.emocion.dura) p.emocion = null;
      }
    }
    // sparkles
    for (let i = chispas.length - 1; i >= 0; i--) {
      const c = chispas[i];
      c.t += dt;
      if (c.t >= c.dura) {
        chispas.splice(i, 1);
        continue;
      }
      if (c.r || c.va) {
        c.a += c.va * dt;
        c.r = Math.max(1, c.r + c.vr * dt);
      } else {
        c.cx += c.vx * dt;
        c.cy += c.vy * dt;
      }
    }
    // the camera follows Pablo (Chuchi, while he comes in)
    moverCamara(dt);
    // R lights up when the power can be used now
    consola.resaltarR(libre && escena === 'pueblo' && mPablo().ip >= IP_COSTE && !caja.movida && !!buscarObjetivo());
    // the shortcut for scripts of a hidden tab? nothing: the loop stops
    if (!libre && !poder) pablo.mov = false;
    if ((escena === 'pueblo' || escena === 'camino') && t > 40) consola.saltar.hidden = false;
  };

  // ------------------------------------------------------------ drawing
  const dibujarPj = (p: Pj, dx: number, dy: number) => {
    const paso = p.mov ? CICLO[Math.floor(p.t * 8) % 4] : 0;
    const img = marco(p.q, p.dir, paso, p.pose);
    const sombra = sombraPies();
    g.drawImage(sombra, Math.round(p.x - dx - 7), Math.round(p.y - dy - 4));
    g.drawImage(img, Math.round(p.x - dx - PIES.x), Math.round(p.y - dy - PIES.y));
  };

  /** Is somebody drawn now (so his emotion is too)? */
  const visible = (p: Pj): boolean => {
    if (p === pablo) return true;
    if (p === madre) return escena === 'cuarto';
    if (p === aldeano) return escena === 'pueblo';
    if (p === narrador) return escena === 'pueblo' && narradorVisible;
    if (escena !== 'pueblo' && escena !== 'camino') return false;
    return seguidores.includes(p) || (escena === 'pueblo' && (Object.keys(amigosM) as Array<'fran' | 'guille' | 'chuchi'>).some((q) => amigosM[q] === p && npcVisible(q)));
  };

  const dibujarEmociones = (dx: number, dy: number) => {
    for (const p of [pablo, madre, aldeano, narrador, ...Object.values(amigosM)]) {
      if (!p.emocion || !visible(p)) continue;
      dibujarEmocion(g, p.emocion, Math.round(p.x - dx), Math.round(p.y - dy - 22));
    }
  };

  const dibujarChispas = (dx: number, dy: number) => {
    for (const c of chispas) {
      const k = c.t / c.dura;
      let x: number;
      let y: number;
      if (c.r || c.va) {
        x = c.cx + Math.cos(c.a) * c.r;
        y = c.cy + Math.sin(c.a) * c.r * 0.75 - k * 6;
      } else {
        x = c.cx;
        y = c.cy;
      }
      if (k > 0.8 && Math.floor(c.t * 30) % 2) continue;
      if (c.grande) g.drawImage(chispa(c.col), Math.round(x - dx - 2), Math.round(y - dy - 2));
      else g.drawImage(puntito(c.col), Math.round(x - dx - 1), Math.round(y - dy - 1));
    }
  };

  const rayoEnPantalla = () => {
    if (flash > 0.01) {
      g.fillStyle = `rgba(222,234,255,${flash * 0.5})`;
      g.fillRect(0, 0, PANTALLA_W, PANTALLA_H);
    }
  };

  /** Two layers of rain, scrolling, over everything outdoors. */
  const dibujarLluvia = (intensidad = 1) => {
    const capa = (img: HTMLCanvasElement, vx: number, vy: number) => {
      const ox = (((t * vx) % 240) + 240) % 240;
      const oy = (((t * vy) % 160) + 160) % 160;
      g.drawImage(img, ox, oy);
      g.drawImage(img, ox - 240, oy);
      g.drawImage(img, ox, oy - 160);
      g.drawImage(img, ox - 240, oy - 160);
    };
    g.globalAlpha = intensidad * (flash > 0.1 ? 1 : 0.9);
    capa(lluvia(46, 11, 6, 'rgba(176,205,255,0.45)'), -80, 280);
    capa(lluvia(70, 12, 4, 'rgba(200,222,255,0.62)'), -120, 380);
    g.globalAlpha = 1;
  };

  const dibujarManoDeLuz = (dx: number, dy: number) => {
    const p = poder!;
    if (p.t < 0.3 || p.t > 1.5) return;
    const c = rectCaja();
    // where the hand is: behind the crate (as seen from Pablo) and it goes with it
    const cx = c.x + 8;
    const cy = c.y + 8;
    // when the crate has already moved (caja.x updated), the hand stays on its trailing side
    const hx = cx - p.dx * 4;
    const hy = cy - p.dy * 4;
    let alfa = limitar((p.t - 0.3) / 0.35, 0, 1);
    if (p.t > 1.2) alfa = limitar((1.5 - p.t) / 0.3, 0, 1);
    const cuartos = p.dir === 'N' ? 0 : p.dir === 'E' ? 1 : p.dir === 'S' ? 2 : 3;
    const img = una_mano(cuartos);
    const ox = Math.round(hx - dx - img.width / 2 - p.dx * 11);
    const oy = Math.round(hy - dy - img.height / 2 - p.dy * 11);
    // the stage light: a cone from above and a pool of light under the hand
    g.save();
    g.globalAlpha = alfa * 0.5;
    g.drawImage(conoFoco(), Math.round(hx - dx - 28), Math.round(hy - dy - 100));
    g.restore();
    for (let i = 0; i < 3; i++) {
      g.fillStyle = `rgba(255,226,120,${0.1 * alfa})`;
      const rx = 20 - i * 5;
      g.fillRect(Math.round(hx - dx - rx), Math.round(hy - dy + 6 - i * 3), rx * 2, 8 + i * 6);
    }
    g.globalAlpha = alfa * 0.82;
    g.drawImage(img, ox, oy);
    g.globalAlpha = 1;
    // sparkles trailing the hand while it pushes
    if (p.t > 0.7 && p.t < 1.25 && Math.random() > 0.3) {
      chispaNueva({ cx: hx + p.dx * 12 + (Math.random() - 0.5) * 14, cy: hy + p.dy * 12 + (Math.random() - 0.5) * 14, vx: -p.dx * 12, vy: -p.dy * 12 - 8, dura: 0.5, col: COLORES[Math.floor(Math.random() * COLORES.length)], grande: Math.random() > 0.5 });
    }
  };

  const manos: Record<number, HTMLCanvasElement> = {};
  const una_mano = (q: number) => (manos[q] ??= girar(manoLuz(), q));
  let cono: HTMLCanvasElement | null = null;
  const conoFoco = () => {
    if (cono) return cono;
    const c = lienzo(56, 110);
    const x = ctx(c);
    for (let y = 0; y < 108; y++) {
      const ancho = 14 + Math.round((y / 108) * 40);
      x.fillStyle = `rgba(255,240,170,${0.1 + (y / 108) * 0.2})`;
      x.fillRect(Math.round(28 - ancho / 2), y, ancho, 1);
    }
    cono = c;
    return c;
  };

  /** The four pages of the play flying round the narrator. */
  const dibujarPaginas = (dx: number, dy: number) => {
    const img = pagina();
    for (let i = 0; i < 4; i++) {
      const a = paginasT * 2.6 + (i * Math.PI) / 2;
      const r = 14 + Math.min(10, paginasT * 8);
      const px = narrador.x + Math.cos(a) * r - dx;
      const py = narrador.y - 16 + Math.sin(a) * r * 0.55 - dy;
      g.drawImage(img, Math.round(px - 6), Math.round(py - 7), 12, 14);
    }
  };

  /** The village and the road: ground, depth-sorted objects and people, fiesta lights or fireflies, rain or clear sky. */
  const dibujarMundo = () => {
    const m = mundo!;
    const enCamino = escena === 'camino';
    const dx = cam.x;
    const dy = cam.y;
    g.drawImage(m.suelo, dx, dy, PANTALLA_W, PANTALLA_H, 0, 0, PANTALLA_W, PANTALLA_H);
    g.drawImage(m.agua[Math.floor(t * 3) % m.agua.length], dx, dy, PANTALLA_W, PANTALLA_H, 0, 0, PANTALLA_W, PANTALLA_H);
    // sparkles on the water
    for (const [bx, by, fase] of m.brillos) {
      if (bx < dx - 5 || bx > dx + PANTALLA_W || by < dy - 5 || by > dy + PANTALLA_H) continue;
      const ph = (t * 0.55 + fase) % 1;
      if (ph > 0.26) continue;
      g.drawImage(destello(ph < 0.08 ? 2 : ph < 0.17 ? 1 : 0), Math.round(bx - dx - 2), Math.round(by - dy - 2));
    }
    // the objects in order of depth, with the characters among them
    const dinamicos: Array<{ base: number; f: () => void }> = [{ base: pablo.y, f: () => dibujarPj(pablo, dx, dy) }];
    for (const s of seguidores) dinamicos.push({ base: s.y, f: () => dibujarPj(s, dx, dy) });
    if (!enCamino) {
      dinamicos.push({ base: aldeano.y, f: () => dibujarPj(aldeano, dx, dy) });
      dinamicos.push({ base: caja.y + T, f: () => g.drawImage(spriteCaja(), Math.round(caja.x - dx), Math.round(caja.y + T - 20 - dy)) });
      for (const q of ['fran', 'guille', 'chuchi'] as const) {
        if (!npcVisible(q)) continue;
        const a = amigosM[q];
        // they turn to look at Pablo when he is near (the one who walks keeps his heading)
        if (!a.mov && Math.hypot(pablo.x - a.x, pablo.y - a.y) < 60) a.dir = dirDe(pablo.x - a.x, pablo.y - a.y, a.dir);
        dinamicos.push({ base: a.y, f: () => dibujarPj(a, dx, dy) });
      }
      if (narradorVisible) {
        dinamicos.push({
          base: narrador.y,
          f: () => {
            g.globalAlpha = narradorA;
            dibujarPj(narrador, dx, dy);
            g.globalAlpha = 1;
            if (paginasT >= 0) dibujarPaginas(dx, dy);
          },
        });
      }
    } else {
      const mc = m as MundoCamino;
      if (!estadoCaminoM.chistVencido) {
        dinamicos.push({
          base: mc.chist.y,
          f: () => {
            const salto = Math.abs(Math.sin(t * 3.2)) * 4;
            g.drawImage(sombraPies(), Math.round(mc.chist.x - dx - 7), Math.round(mc.chist.y - dy - 4));
            const img = spriteEnemigo('chist', Math.floor(t * 3));
            g.drawImage(img, Math.round(mc.chist.x - dx - img.width / 2), Math.round(mc.chist.y - dy - img.height + 2 - salto));
          },
        });
      }
      for (const c of mc.cofres) {
        const img = spriteCofre(estadoCaminoM.cofres.has(c.id));
        dinamicos.push({ base: c.y, f: () => g.drawImage(img, Math.round(c.x - dx - img.width / 2), Math.round(c.y - dy - img.height)) });
      }
      for (const e of mc.escondites) {
        if (estadoCaminoM.escondites.has(e.id)) continue;
        const d = Math.hypot(pablo.x - e.x, pablo.y - e.y);
        if (d > 90) continue;
        dinamicos.push({
          base: e.y,
          f: () => {
            g.drawImage(chupitoSuelo(), Math.round(e.x - dx - 3), Math.round(e.y - dy - 9));
            const k = Math.floor(t * 4) % 3;
            g.drawImage(destello(k as 0 | 1 | 2), Math.round(e.x - dx - 2 + (k === 1 ? 3 : 0)), Math.round(e.y - dy - 12));
          },
        });
      }
    }
    dinamicos.sort((a, b) => a.base - b.base);
    let di = 0;
    for (const o of m.objetos) {
      const img = o.frames[o.vel ? Math.floor(t * o.vel) % o.frames.length : 0];
      const sx = o.x - dx;
      const sy = o.y - dy;
      // the dynamic ones before its depth still have to be drawn in order, even if it is off screen
      while (di < dinamicos.length && dinamicos[di].base <= o.base) dinamicos[di++].f();
      if (sx > PANTALLA_W || sy > PANTALLA_H || sx + img.width < 0 || sy + img.height < 0) continue;
      g.drawImage(img, Math.round(sx), Math.round(sy));
    }
    while (di < dinamicos.length) dinamicos[di++].f();
    // the crate's hint: four little sparkles on its corners when the power would reach it
    if (!enCamino && !poder && !caja.movida && !dialogo.activo && guion === 0 && mPablo().ip >= IP_COSTE && buscarObjetivo()) {
      const f = Math.floor(t * 4) % 2;
      const cx = caja.x - dx;
      const cy = caja.y - dy - 4;
      for (const [ex, ey] of [[0, 0], [T, 0], [0, T + 4], [T, T + 4]]) g.drawImage(destello(f ? 2 : 1), Math.round(cx + ex - 2), Math.round(cy + ey - 2));
    }
    if (poder) dibujarManoDeLuz(dx, dy);
    dibujarChispas(dx, dy);
    if (!enCamino) {
      const mp = m as Mundo;
      // strings of fiesta lights
      g.drawImage(mp.cordones!, dx, dy, PANTALLA_W, PANTALLA_H, 0, 0, PANTALLA_W, PANTALLA_H);
      const cols = ['#ff5a5a', '#ffd84a', '#5ae08a', '#5ab4ff', '#ff7ad0'];
      const n = Math.floor(t * 2.2);
      mp.bombillas.forEach((b, i) => {
        const bx = b.x - dx;
        const by = b.y - dy;
        if (bx < -3 || bx > PANTALLA_W + 3 || by < -3 || by > PANTALLA_H + 3) return;
        const viva = (n + i) % 3 !== 0;
        g.fillStyle = viva ? cols[b.color] : '#3a2c4a';
        g.fillRect(Math.round(bx) - 1, Math.round(by), 3, 3);
        if (viva) {
          g.fillStyle = '#ffffff';
          g.fillRect(Math.round(bx), Math.round(by), 1, 1);
          g.fillStyle = 'rgba(255,230,160,0.16)';
          g.fillRect(Math.round(bx) - 2, Math.round(by) - 1, 5, 5);
        }
      });
    } else {
      // fireflies drifting over the fields
      for (const [fx, fy, fase] of (m as MundoCamino).luciernagas) {
        const x = fx + Math.sin(t * 0.7 + fase) * 7 - dx;
        const y = fy + Math.cos(t * 0.9 + fase * 2) * 5 - dy;
        if (x < -3 || x > PANTALLA_W + 3 || y < -3 || y > PANTALLA_H + 3) continue;
        const v = (Math.sin(t * 2.4 + fase * 3) + 1) / 2;
        if (v < 0.25) continue;
        g.fillStyle = `rgba(255,248,150,${0.18 * v})`;
        g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        g.fillStyle = `rgba(255,255,200,${0.4 + 0.6 * v})`;
        g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    dibujarEmociones(dx, dy);
    if (!enCamino) dibujarLluvia();
    rayoEnPantalla();
    // the IP counter, top left
    if (!dialogo.activo && !capas.length && guion === 0) g.drawImage(contadorIP(mPablo().ip, ipMax(), ipDestello > 0, texto('hud.ip')), 4, 4);
    if (poder && poder.t < 1.3) cartelito(g, texto('poder.nombre'), PANTALLA_W / 2, 6);
  };

  /** Inside the peña or the inn: the still room, the keeper behind his counter, Pablo and his friends at the door. */
  const dibujarInterior = () => {
    g.drawImage(fondoSala(sala), 0, 0);
    dibujarPj(sala === 'tienda' ? tendera : posadero, 0, 0);
    g.drawImage(frenteSala(sala), 0, 0);
    const fila = [pablo, ...seguidores].sort((a, b) => a.y - b.y);
    for (const p of fila) dibujarPj(p, 0, 0);
  };

  /** The menus' windows over the world. */
  const dibujarCapas = () => {
    if (cartasUI.ver) dibujarCartas(g, grupo, cartasUI.sel, cartasUI.mano, t);
    if (monedasUI) dibujarMonedas(g, grupo.monedas, monedasUI.x, monedasUI.y);
    for (const c of capas) c(g);
    if (aviso) dibujarCartel(g, aviso, Math.round((PANTALLA_W - anchoTexto(aviso) - 16) / 2), 6);
  };

  const dibujarCuarto = () => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, PANTALLA_W, PANTALLA_H);
    const dx = -CUARTO_X;
    const dy = -CUARTO_Y;
    g.save();
    g.translate(CUARTO_X, CUARTO_Y);
    g.drawImage(cuartoM.fondo, 0, 0);
    g.drawImage(flash > 0.12 ? cuartoM.ventana.clara : cuartoM.ventana.oscura, cuartoM.ventana.x, cuartoM.ventana.y);
    if (flash > 0.04) {
      g.globalAlpha = Math.min(1, flash * 0.9);
      g.drawImage(cuartoM.haz, 0, 0);
      g.globalAlpha = 1;
    }
    const C = cuartoM.cama;
    g.drawImage(C.base, C.x, C.y);
    if (cama === 'dormido') {
      g.drawImage(marco('pablo', 'S', 0, 'dormido'), C.almohada.x - 8, C.almohada.y - 8);
      // Zzz drifting up
      const z = (t * 0.8) % 1;
      for (let i = 0; i < 3; i++) {
        const k = (z + i / 3) % 1;
        g.globalAlpha = Math.min(1, (1 - k) * 1.6);
        escribir(g, i === 1 ? 'Z' : 'z', Math.round(C.almohada.x + 12 + k * 10 + i * 2), Math.round(C.almohada.y - 6 - k * 16), '#e8e6ff', '#14206a');
      }
      g.globalAlpha = 1;
      g.drawImage(C.manta, C.x, C.y);
    } else if (cama === 'sentado') {
      g.drawImage(marco('pablo', 'S', 0, 'sentado'), C.almohada.x - 8, C.almohada.y - 11);
      g.drawImage(C.manta, C.x, C.y);
    } else g.drawImage(C.mantaAbierta, C.x, C.y);
    // the candle's flame
    const fl = Math.floor(t * 9) % 3;
    g.fillStyle = '#ffd56a';
    g.fillRect(cuartoM.vela.x, cuartoM.vela.y + (fl === 0 ? 0 : 1), 1, fl === 0 ? 3 : 2);
    g.fillStyle = '#fff3b0';
    g.fillRect(cuartoM.vela.x, cuartoM.vela.y + 2, 1, 1);
    // the cajón and the characters, by depth
    // asleep or sitting up, Pablo is drawn in the bed above, not standing
    const sinPablo = cama === 'dormido' || cama === 'sentado';
    const lista: Array<{ base: number; f: () => void }> = [{ base: madre.y, f: () => dibujarPj(madre, dx, dy) }];
    if (!sinPablo) lista.push({ base: pablo.y, f: () => dibujarPj(pablo, dx, dy) });
    for (const o of cuartoM.objetos) lista.push({ base: o.base, f: () => g.drawImage(o.frames[0], o.x, o.y) });
    lista.sort((a, b) => a.base - b.base);
    for (const l of lista) l.f();
    g.restore();
    dibujarEmociones(dx, dy);
    if (flash > 0.01) {
      g.fillStyle = `rgba(222,234,255,${flash * 0.25})`;
      g.fillRect(CUARTO_X, CUARTO_Y, ANCHO_CUARTO, ALTO_CUARTO);
    }
  };

  const dibujarTitulo = () => {
    g.drawImage(portada(texto('titulo.pie')), 0, 0);
    dibujarLogo(g);
    dibujarLluvia(0.55);
    // twinkling over the sun
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.7 + i * 0.33) % 1;
      if (ph < 0.3) g.drawImage(destello(ph < 0.1 ? 2 : 1), 96 + ((i * 53) % 50), 92 + ((i * 29) % 16));
    }
    if (rayoT >= 0 || flash > 0) rayoEnPantalla();
    if (Math.floor(t * 1.6) % 2 === 0) {
      const s = texto('titulo.pulsa');
      escribir(g, s, Math.round((PANTALLA_W - anchoTexto(s)) / 2), 118, '#ffffff', '#1a0f3a');
    }
  };

  const dibujar = () => {
    if (final) {
      final.dibujar(g);
      consola.g.drawImage(pantalla, 0, 0, PANTALLA_W * consola.escala(), PANTALLA_H * consola.escala());
      return;
    }
    if (combate) {
      combate.dibujar(g);
      consola.g.drawImage(pantalla, 0, 0, PANTALLA_W * consola.escala(), PANTALLA_H * consola.escala());
      return;
    }
    if (escena === 'titulo') dibujarTitulo();
    else if (escena === 'cuarto') dibujarCuarto();
    else if (escena === 'pueblo' || escena === 'camino') dibujarMundo();
    else if (escena === 'interior') dibujarInterior();
    else {
      g.fillStyle = '#000';
      g.fillRect(0, 0, PANTALLA_W, PANTALLA_H);
      const s = texto('fin.continuara');
      escribir(g, s, Math.round((PANTALLA_W - anchoTexto(s)) / 2), 74, '#ffe27a', '#3a1a10');
    }
    dibujarCapas();
    dialogo.dibujar(g);
    if (fade.a > 0.001) {
      g.fillStyle = `rgba(0,0,0,${fade.a})`;
      g.fillRect(0, 0, PANTALLA_W, PANTALLA_H);
    }
    // one scaled blit to the screen
    consola.g.drawImage(pantalla, 0, 0, PANTALLA_W * consola.escala(), PANTALLA_H * consola.escala());
  };

  // ------------------------------------------------------------ the loop and the end
  const terminar = (r: Resultado) => {
    if (terminado) return;
    terminado = true;
    motivo = r;
    corte.abort();
  };

  const gancho = (): EstadoSol => ({
    fotogramas,
    escena,
    modo: dialogo.preguntando ? 'pregunta' : dialogo.activo ? 'dialogo' : fade.dur > 0 ? 'fundido' : poder ? 'poder' : guion > 0 ? 'guion' : 'libre',
    pablo: { x: pablo.x, y: pablo.y, dir: pablo.dir, ip: mPablo().ip },
    caja: { x: caja.x, y: caja.y, movida: caja.movida },
    aldeano: { x: aldeano.x, y: aldeano.y },
    mando: mandos,
    cerrar: () => terminar('cancelado'),
    irAlPueblo: async () => {
      preparaPueblo();
      ponerEnPuerta();
      fade = { a: 0, desde: 0, hasta: 0, t: 0, dur: 0, res: null };
      yaSaludoPablo = true;
      cama = 'vacia';
    },
    poner: (x, y) => {
      pablo.x = x;
      pablo.y = y;
    },
    ip: (n) => {
      mPablo().ip = n;
    },
    combate: combate?.estado() ?? null,
    elegir: (orden, objetivo) => combate?.elegir(orden, objetivo) ?? false,
    ganar: () => combate?.ganar(),
    perder: () => combate?.perder(),
    luchar: (enemigos, fondo) => luchar(enemigos, fondo),
    jefe: () => jefeYFinal(),
    fase: () => {
      if (final) return 'final';
      const j = combate?.estado().jefe;
      if (!j) return '';
      if (combate!.estado().fase === 'victoria') return 'victoria';
      return j.guion === 'abierto' ? 'guion' : j.fase === 2 ? 'jefe2' : 'jefe1';
    },
    guion: () => combate?.forzarGuion() ?? false,
    grupo,
    irAlCamino: async () => {
      preparaPueblo();
      yaSaludoPablo = true;
      cama = 'vacia';
      narradorHecho = true;
      caja.movida = true;
      caja.visto = true;
      for (const q of ['fran', 'guille', 'chuchi'] as const) incorporar(q);
      fade = { a: 0, desde: 0, hasta: 0, t: 0, dur: 0, res: null };
      preparaCamino();
      pasosEnc = PASOS_ENCUENTRO[1];
      caminoVisto = true;
    },
    unirTodos: () => {
      narradorHecho = true;
      for (const q of ['fran', 'guille', 'chuchi'] as const) incorporar(q);
      alinearSeguidores();
    },
    unirA: (q) => {
      if (q === 'pablo') return;
      incorporar(q);
      alinearSeguidores();
    },
    narrador: () => escenaNarrador(),
    abrirMenu: () => menuPrincipal(),
    entrar: (s) => entrarSala(s),
    encuentro: (enemigos) => encuentroAleatorio(enemigos),
    encuentros: (si) => {
      encuentrosOn = si;
    },
    pasos: () => pasosEnc,
    estadoCamino: () => ({ chistVencido: estadoCaminoM.chistVencido, cofres: [...estadoCaminoM.cofres], escondites: [...estadoCaminoM.escondites], seguidores: seguidores.map((x) => x.q) }),
    lugaresCamino: () => {
      const m = caminoM();
      return { chist: m.chist, cofres: m.cofres.map((c) => ({ id: c.id, x: c.x, y: c.y })), escondites: m.escondites.map((e) => ({ id: e.id, x: e.x, y: e.y })), puertaTeatro: m.puertaTeatro };
    },
    estadoPueblo: () => ({
      narradorHecho,
      unidos: grupo.miembros.filter((m) => m.q !== 'pablo').map((m) => m.q),
      amigos: Object.fromEntries((['fran', 'guille', 'chuchi'] as const).map((q) => [q, { x: amigosM[q].x, y: amigosM[q].y, visible: npcVisible(q) }])),
    }),
  });
  (window as unknown as { __sol?: () => EstadoSol }).__sol = gancho;

  const bucle = () =>
    new Promise<void>((fin) => {
      let ultimo = performance.now();
      const paso = (ahora: number) => {
        if (corte.signal.aborted) return fin();
        if (esVertical()) {
          ultimo = ahora;
          requestAnimationFrame(paso);
          return;
        }
        if (ahora - ultimo < 1000 / 60 - 4) {
          requestAnimationFrame(paso);
          return;
        }
        const dt = Math.min(0.05, (ahora - ultimo) / 1000);
        ultimo = ahora;
        actualizar(dt);
        dibujar();
        fotogramas++;
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });

  // `?sol&combate`: straight into a test fight (the four friends at level 2 against a mixed group)
  const pruebaCombate = new URLSearchParams(location.search).has('combate');
  if (pruebaCombate) {
    mPablo().nivel = 2;
    mPablo().exp = expTotal(2);
    for (const q of ['fran', 'guille', 'chuchi'] as const) incorporar(q);
    darApuntador(grupo, 'chist', 'pablo');
    for (const m of grupo.miembros) {
      m.nivel = 2;
      m.exp = expTotal(2);
      const st = statsDe(grupo, m);
      m.pv = st.pv;
      m.ip = st.ip;
    }
    narradorHecho = true;
    preparaPueblo();
    ponerEnPuerta();
    cama = 'vacia';
    yaSaludoPablo = true;
    fade = { a: 0, desde: 0, hasta: 0, t: 0, dur: 0, res: null };
    escena = 'pueblo';
    actualizar(0.016);
    dibujar();
    void luchar(['petardo', 'movil', 'critico', 'mosquito', 'spoiler']);
  }

  // `?sol&jefe`: straight into the boss fight on the stage with the four at level 6 and the four prompters set (`&sinap`:
  // only Chist, so that the script moment hands out the rest), and on to the ending
  const params = new URLSearchParams(location.search);
  const pruebaJefe = params.has('jefe');
  if (pruebaJefe) {
    for (const q of ['fran', 'guille', 'chuchi'] as const) incorporar(q);
    const todos: Array<[string, 'pablo' | 'fran' | 'guille' | 'chuchi']> = [['chist', 'pablo'], ['ejem', 'chuchi'], ['psst', 'fran'], ['shhh', 'guille']];
    for (const [id, dueno] of params.has('sinap') ? todos.slice(0, 1) : todos) darApuntador(grupo, id, dueno);
    for (const m of grupo.miembros) {
      m.nivel = 6;
      m.exp = expTotal(6);
      const st = statsDe(grupo, m);
      m.pv = st.pv;
      m.ip = st.ip;
    }
    grupo.objetos = { turron: 3, chupito: 2 };
    narradorHecho = true;
    preparaPueblo();
    ponerEnPuerta();
    cama = 'vacia';
    yaSaludoPablo = true;
    fade = { a: 0, desde: 0, hasta: 0, t: 0, dur: 0, res: null };
    escena = 'pueblo';
    actualizar(0.016);
    dibujar();
    void jefeYFinal();
  }

  return (async () => {
    if (!pruebaCombate && !pruebaJefe) void fundirA(0, 0.8);
    await bucle();
    // (a game started right after this one has already put its own hook there)
    if ((window as unknown as { __sol?: unknown }).__sol === gancho) delete (window as unknown as { __sol?: unknown }).__sol;
    sonido.parar();
    consola.destruir();
    return motivo;
  })();
}
