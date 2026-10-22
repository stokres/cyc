// «Alacant Sun»: a short, affectionate parody of the first *Golden Sun* for Pablo (docs: the proposal in
// /capitulo2/golden-sun-pablo.md). This slice: the GBA screen and its console, Pablo's bedroom (the mother who
// will not take a «no»), the village in fiestas at night in a storm, one psynergy («Sí, y...», our Move) that
// pushes a crate of soft turrón with a hand of stage light, and the plaza where the slice ends.
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
import { crearConsola, Mandos } from './consola';
import { ALTO_CUARTO, ANCHO_CUARTO, BASE_PARED, CUARTO_X, CUARTO_Y, cuarto } from './cuarto';
import { escribir, anchoTexto } from './fuente';
import { cartelito, contadorIP, Dialogo, dibujarEmocion, type Emocion, type Icono, type Linea, PANTALLA_H, PANTALLA_W } from './interfaz';
import { solidoBaldosa, pueblo, type Lectura, type Mundo, type Rect } from './mapas';
import { CICLO, dirDe, marco, PIES, sombraPies, vectorDe, type Dir, type Pose, type Quien } from './personajes';
import { ctx, girar, lienzo } from './pixel';
import { SonidoSol, EFECTO_PODER, EFECTO_PUERTA } from './sonido';
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
  /** Closes the game as if the × button had been pressed. */
  cerrar(): void;
  /** Puts Pablo on this spot (feet), in the scene he is in. */
  poner(x: number, y: number): void;
  ip(n: number): void;
}

// ---------------------------------------------------------------- constants

const WALK = 56;
const RUN = 100;
const IP_MAX = 12;
const IP_COSTE = 4;
/** Pixels walked to recover one point of IP (slowly, as in the original). */
const PX_POR_IP = 52;
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
  let escena: 'titulo' | 'cuarto' | 'pueblo' | 'fin' = 'titulo';
  let fotogramas = 0;
  let t = 0;
  let tPueblo = 0;
  const cuartoM = cuarto();
  let mundo: Mundo | null = null;

  const pablo = nuevoPj('pablo', 0, 0, 'S');
  const madre = nuevoPj('madre', cuartoM.madre.x, cuartoM.madre.y, 'W');
  const aldeano = nuevoPj('aldeano', 0, 0, 'S');
  let ip = IP_MAX;
  let ipPaso = 0;
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

  /** A line of the texts: «[contento] …» makes the speaker smile. */
  const lineaDe = (quien: Quien | null, clave: string): Linea => {
    let s = texto(clave);
    let animo: 'normal' | 'contento' = 'normal';
    const m = s.match(/^\[(\w+)\]\s*/);
    if (m) {
      if (m[1] === 'contento') animo = 'contento';
      s = s.slice(m[0].length);
    }
    return { quien, texto: s, animo };
  };
  const decir = (quien: Quien | null, clave: string) => dialogo.decir(lineaDe(quien, clave));
  /** A conversation: clave.1, clave.2... one window each. */
  const serie = async (quien: Quien | null, clave: string) => {
    for (let i = 1; hayTexto(`${clave}.${i}`); i++) await decir(quien, `${clave}.${i}`);
  };

  const emocionar = (p: Pj, tipo: Icono, dura = 1) => {
    p.emocion = { tipo, t: 0, dura };
  };

  const rectPj = (p: { x: number; y: number }): Rect => ({ x: p.x - CAJA_PIES.w / 2, y: p.y - CAJA_PIES.h, w: CAJA_PIES.w, h: CAJA_PIES.h });
  const rectCaja = (): Rect => ({ x: caja.x, y: caja.y, w: T, h: T });

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
    if (solapa(r, rectCaja())) return true;
    if (yo !== pablo && solapa(r, rectPj(pablo))) return true;
    if (yo !== aldeano && solapa(r, rectPj(aldeano))) return true;
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
    if (ip < IP_COSTE) {
      void bloquear(() => decir('pablo', 'pablo.sinip'));
      return;
    }
    ip -= IP_COSTE;
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

  // ------------------------------------------------------------ scenes
  const preparaPueblo = () => {
    mundo = pueblo();
    escena = 'pueblo';
    tPueblo = 0;
    caja.x = mundo.caja.x;
    caja.y = mundo.caja.y;
    if (!abrio) {
      aldeano.x = mundo.aldeano.x;
      aldeano.y = mundo.aldeano.y;
      abrio = true;
    }
  };
  const ponerEnPuerta = () => {
    pablo.x = mundo!.salida.x;
    pablo.y = mundo!.salida.y;
    pablo.dir = 'S';
    pablo.mov = false;
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

  const alLlegarALaPlaza = async () => {
    await bloquear(async () => {
      pablo.mov = false;
      pablo.dir = 'N';
      emocionar(pablo, 'exclama', 1);
      await espera(0.8);
      await decir('pablo', 'fin.1');
      await decir('pablo', 'fin.2');
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
    const zona = mundo!.aldeano.zona;
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
      // the IP comes back slowly while walking
      ipPaso += hecho;
      if (ipPaso >= PX_POR_IP) {
        ipPaso -= PX_POR_IP;
        if (ip < IP_MAX) {
          ip = Math.min(IP_MAX, ip + 1);
          ipDestello = 0.8;
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
    if (solapa(sonda, { x: aldeano.x - 9, y: aldeano.y - 9, w: 18, h: 14 })) return void hablarConAldeano();
    const c = rectCaja();
    if (solapa(sonda, { x: c.x - 2, y: c.y - 2, w: c.w + 4, h: c.h + 4 })) return void leer({ rect: c, clave: 'lectura.caja', quien: null });
    for (const l of mundo!.lecturas) if (solapa({ x: pablo.x - 2, y: pablo.y - 5, w: 4, h: 5 }, l.rect) && vy <= 0) return void leer(l);
  };

  const actualizar = (dtReal: number) => {
    const dt = dtReal;
    t += dt;
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
    if (rayoProx <= 0 && rayoT < 0 && escena !== 'titulo') {
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
    const libre = !dialogo.activo && fade.dur === 0 && !poder && guion === 0;

    if (libre) {
      if (mandos.tomarB()) {
        /* B cancels: nothing to cancel on the map, and held it makes him run */
      }
      actualizarJugador(dt);
      if (mandos.tomarA()) interactuar();
      else if (mandos.tomarR()) lanzarPoder();
      else if (mandos.tomarStart()) {
        /* START has nothing to open in this slice */
      }
      // places that react to Pablo
      if (escena === 'cuarto') {
        if (pablo.y >= ALTO_CUARTO - 6 && pablo.x > cuartoM.puerta.x && pablo.x < cuartoM.puerta.x + cuartoM.puerta.w && cama === 'vacia') void salirDelCuarto();
      } else if (escena === 'pueblo') {
        const m = mundo!;
        if (!caja.visto && Math.hypot(pablo.x - (caja.x + 8), pablo.y - (caja.y + 8)) < 44) void verLaCaja();
        const pu = m.puerta;
        if (pablo.x > pu.x && pablo.x < pu.x + pu.w && pablo.y <= pu.y + 12 && !caja.visto === false) void entrarEnCasa();
        else if (pablo.x > pu.x && pablo.x < pu.x + pu.w && pablo.y <= pu.y + 12) void entrarEnCasa();
        if (caja.movida && solapa(rectPj(pablo), m.plaza) && pablo.y < 13 * T) void alLlegarALaPlaza();
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
    // emotions
    for (const p of [pablo, madre, aldeano]) {
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
    // the camera follows Pablo
    if (escena === 'pueblo') {
      cam.x = limitar(Math.round(pablo.x - PANTALLA_W / 2), 0, mundo!.w - PANTALLA_W);
      cam.y = limitar(Math.round(pablo.y - 14 - PANTALLA_H / 2), 0, mundo!.h - PANTALLA_H);
    }
    // R lights up when the power can be used now
    consola.resaltarR(libre && escena === 'pueblo' && ip >= IP_COSTE && !caja.movida && !!buscarObjetivo());
    // the shortcut for scripts of a hidden tab? nothing: the loop stops
    if (!libre && !poder) pablo.mov = false;
    if (escena === 'pueblo' && tPueblo > 30) consola.saltar.hidden = false;
  };

  // ------------------------------------------------------------ drawing
  const dibujarPj = (p: Pj, dx: number, dy: number) => {
    const paso = p.mov ? CICLO[Math.floor(p.t * 8) % 4] : 0;
    const img = marco(p.q, p.dir, paso, p.pose);
    const sombra = sombraPies();
    g.drawImage(sombra, Math.round(p.x - dx - 7), Math.round(p.y - dy - 4));
    g.drawImage(img, Math.round(p.x - dx - PIES.x), Math.round(p.y - dy - PIES.y));
  };

  const dibujarEmociones = (dx: number, dy: number) => {
    for (const p of [pablo, madre, aldeano]) {
      if (!p.emocion) continue;
      if (p === madre && escena !== 'cuarto') continue;
      if (p === aldeano && escena !== 'pueblo') continue;
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
    const k = p.t < 0.75 ? 0 : p.bloqueado ? Math.sin(Math.min(1, (p.t - 0.75) / 0.5) * Math.PI) * 0.18 : easeOut(Math.min(1, (p.t - 0.75) / 0.5));
    const cx = c.x + 8 - (caja.moviendo ? 0 : 0);
    const cy = c.y + 8;
    // when the crate has already moved (caja.x updated), the hand stays on its trailing side
    const hx = cx - p.dx * 4;
    const hy = cy - p.dy * 4;
    void k;
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

  const dibujarPueblo = () => {
    const m = mundo!;
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
    const dinamicos: Array<{ base: number; f: () => void }> = [
      { base: pablo.y, f: () => dibujarPj(pablo, dx, dy) },
      { base: aldeano.y, f: () => dibujarPj(aldeano, dx, dy) },
      { base: caja.y + T, f: () => g.drawImage(spriteCaja(), Math.round(caja.x - dx), Math.round(caja.y + T - 20 - dy)) },
    ].sort((a, b) => a.base - b.base);
    let di = 0;
    for (const o of m.objetos) {
      const img = o.frames[o.vel ? Math.floor(t * o.vel) % o.frames.length : 0];
      const sx = o.x - dx;
      const sy = o.y - dy;
      if (sx > PANTALLA_W || sy > PANTALLA_H || sx + img.width < 0 || sy + img.height < 0) {
        // off screen, but the dynamic ones before its depth still have to be drawn in order
        while (di < dinamicos.length && dinamicos[di].base <= o.base) dinamicos[di++].f();
        continue;
      }
      while (di < dinamicos.length && dinamicos[di].base <= o.base) dinamicos[di++].f();
      g.drawImage(img, Math.round(sx), Math.round(sy));
    }
    while (di < dinamicos.length) dinamicos[di++].f();
    // the crate's hint: four little sparkles on its corners when the power would reach it
    if (!poder && !caja.movida && !dialogo.activo && guion === 0 && ip >= IP_COSTE && buscarObjetivo()) {
      const f = Math.floor(t * 4) % 2;
      const cx = caja.x - dx;
      const cy = caja.y - dy - 4;
      for (const [ex, ey] of [[0, 0], [T, 0], [0, T + 4], [T, T + 4]]) g.drawImage(destello(f ? 2 : 1), Math.round(cx + ex - 2), Math.round(cy + ey - 2));
    }
    if (poder) dibujarManoDeLuz(dx, dy);
    dibujarChispas(dx, dy);
    // strings of fiesta lights
    g.drawImage(m.cordones!, dx, dy, PANTALLA_W, PANTALLA_H, 0, 0, PANTALLA_W, PANTALLA_H);
    const cols = ['#ff5a5a', '#ffd84a', '#5ae08a', '#5ab4ff', '#ff7ad0'];
    const n = Math.floor(t * 2.2);
    m.bombillas.forEach((b, i) => {
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
    dibujarEmociones(dx, dy);
    dibujarLluvia();
    rayoEnPantalla();
    // the IP counter, top left
    if (!dialogo.activo) g.drawImage(contadorIP(ip, IP_MAX, ipDestello > 0, texto('hud.ip')), 4, 4);
    if (poder && poder.t < 1.3) cartelito(g, texto('poder.nombre'), PANTALLA_W / 2, 6);
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
    if (escena === 'titulo') dibujarTitulo();
    else if (escena === 'cuarto') dibujarCuarto();
    else if (escena === 'pueblo') dibujarPueblo();
    else {
      g.fillStyle = '#000';
      g.fillRect(0, 0, PANTALLA_W, PANTALLA_H);
      const s = texto('fin.continuara');
      escribir(g, s, Math.round((PANTALLA_W - anchoTexto(s)) / 2), 74, '#ffe27a', '#3a1a10');
    }
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

  (window as unknown as { __sol?: () => EstadoSol }).__sol = () => ({
    fotogramas,
    escena,
    modo: dialogo.preguntando ? 'pregunta' : dialogo.activo ? 'dialogo' : fade.dur > 0 ? 'fundido' : poder ? 'poder' : guion > 0 ? 'guion' : 'libre',
    pablo: { x: pablo.x, y: pablo.y, dir: pablo.dir, ip },
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
      ip = n;
    },
  });

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

  return (async () => {
    void fundirA(0, 0.8);
    await bucle();
    delete (window as unknown as { __sol?: unknown }).__sol;
    sonido.parar();
    consola.destruir();
    return motivo;
  })();
}
