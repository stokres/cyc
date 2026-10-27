// «Una más»: the map, as data. A zone is a handful of rooms; a room is a grid of tiles (TILE units each) plus what stands on it.
// Everything that is "level design" lives here (rooms, doors, enemies, bars, the signs), nothing else reads a room's shape except
// the physics (fisica.ts) and the tile painter (nivel.ts). Text never lives here: signs and dialogues are keys of textos/conceptos.md.
//
// Tile legend (the grid):
//   .  empty        #  solid        =  one-way platform (jump up through it, drop down with ↓)
//   ^  spikes       N  «NO» block (breaks with the jarrazo once Chuchi's skill is earned)       T  stage curtain
//   F  false wall: it looks like ground, but Fran walks through it (and finds a hidden chamber)
//   X  gate (closed by a fight; the grid is changed live, never stored here)
// What stands on the ground is put with `Plano.pon(col, fila, tipo)` (the tile it stands IN; its feet are at the bottom of that tile).

export const TILE = 48;

export type TipoEnemigo = 'despertador' | 'reloj' | 'gran';
/** The skills are automatic. Guille: Cierzo (double jump). Chuchi: Teclazo (the jarrazo breaks «NO» blocks). Pablo: wall jump (`pared`). */
export type Habilidad = 'cierzo' | 'teclazo' | 'pared';
export type Amigo = 'guille' | 'chuchi' | 'pablo';
export type Material = 'recibidor' | 'jardin' | 'bandeja' | 'teatro' | 'grifo';

export interface Salida {
  lado: 'izq' | 'der';
  /** Rows (inclusive) of the opening in that wall. */
  fila0: number;
  fila1: number;
  /** Where it leads: room and the tile the player arrives in (feet at its bottom). */
  sala: string;
  col: number;
  fila: number;
}

export interface Puerta {
  col: number;
  fila: number;
  /** Room and tile the player comes out in. `fin`: the end of this delivery. */
  sala: string | 'fin';
  col2: number;
  fila2: number;
  /** A zone title shows on arrival if it is a new zone. */
  zona?: Zona;
}

export interface Cartel {
  col: number;
  fila: number;
  /** Text key (`.pc` / `.tactil` is added when the key has both versions). */
  clave: string;
}

export interface Sala {
  id: string;
  zona: Zona;
  filas: string[];
  cols: number;
  rows: number;
  salidas: Salida[];
  puertas: Puerta[];
  carteles: Cartel[];
  enemigos: { tipo: TipoEnemigo; col: number; fila: number; id: string }[];
  barras: { col: number; fila: number; id: string }[];
  sorbos: { col: number; fila: number; id: string }[];
  /** The fight room: where the boss stands, the column that starts it and the gate columns (rows 7..9 are closed). */
  jefe?: { col: number; fila: number; disparo: number; puertas: number[] };
  flor?: { col: number; fila: number; quien: Amigo };
  /** Slabs that move or fall. */
  plataformas: PlataformaDef[];
  /** Where the room sits on the pause map (grid cells: x to the right, y down; the exits through the sides go to the neighbouring cell). */
  mapa: { x: number; y: number };
  /** Where the player starts when the game begins in this room. */
  inicio: { col: number; fila: number };
}

/**
 * A slab that is not part of the grid. `mueve`: slides `d` tiles to the right and back; `sube`: rises `d` tiles and back down; `cae`: falls shortly
 * after being stepped on and comes back. `col`, `fila`: its left end and its top surface; `per`: seconds for a whole trip.
 */
export interface PlataformaDef {
  id: string;
  tipo: 'mueve' | 'sube' | 'cae';
  col: number;
  fila: number;
  ancho: number;
  d: number;
  per: number;
}

export type Zona = 'recibidor' | 'jardin' | 'bandeja' | 'teatro' | 'grifo';

export const ZONAS: Record<Zona, { numero: number; material: Material }> = {
  recibidor: { numero: 1, material: 'recibidor' },
  jardin: { numero: 2, material: 'jardin' },
  bandeja: { numero: 3, material: 'bandeja' },
  teatro: { numero: 4, material: 'teatro' },
  grifo: { numero: 5, material: 'grifo' },
};

/** The skills, in the order they are earned (docs: conceptos-metroidvania.md). */
export const HABILIDADES: Habilidad[] = ['cierzo', 'teclazo', 'pared'];

/** Which friend gives which skill. */
export const DON: Record<Amigo, Habilidad> = { guille: 'cierzo', chuchi: 'teclazo', pablo: 'pared' };

// ---------------------------------------------------------------- the builder

class Plano {
  g: string[][];
  salidas: Salida[] = [];
  puertas: Puerta[] = [];
  carteles: Cartel[] = [];
  enemigos: Sala['enemigos'] = [];
  barras: Sala['barras'] = [];
  sorbos: Sala['sorbos'] = [];
  jefe?: Sala['jefe'];
  flor?: Sala['flor'];
  plataformas: PlataformaDef[] = [];
  mapaXY = { x: 0, y: 0 };
  inicio = { col: 3, fila: 9 };

  constructor(
    readonly id: string,
    readonly zona: Zona,
    readonly cols: number,
    readonly rows: number,
    /** First solid row of the floor. */
    readonly suelo: number,
  ) {
    this.g = Array.from({ length: rows }, () => Array<string>(cols).fill('.'));
    this.rect(0, 0, cols, 1, '#');
    this.rect(0, 0, 1, rows, '#');
    this.rect(cols - 1, 0, 1, rows, '#');
    this.rect(0, suelo, cols, rows - suelo, '#');
  }

  rect(c: number, f: number, w: number, h: number, ch: string) {
    for (let r = f; r < f + h; r++) for (let c2 = c; c2 < c + w; c2++) if (this.g[r]?.[c2] !== undefined) this.g[r][c2] = ch;
    return this;
  }

  /** Thin one-way ledge. */
  lista(c0: number, c1: number, fila: number) {
    return this.rect(c0, fila, c1 - c0 + 1, 1, '=');
  }

  /** A hole in the floor over `c0..c1`, with spikes at the bottom. */
  foso(c0: number, c1: number) {
    this.rect(c0, this.suelo, c1 - c0 + 1, this.rows - this.suelo, '.');
    this.rect(c0, this.rows - 1, c1 - c0 + 1, 1, '^');
    return this;
  }

  /** Opens the wall rows `f0..f1` on a side, and says where it leads. */
  salida(lado: 'izq' | 'der', f0: number, f1: number, sala: string, col: number, fila: number) {
    this.rect(lado === 'izq' ? 0 : this.cols - 1, f0, 1, f1 - f0 + 1, '.');
    this.salidas.push({ lado, fila0: f0, fila1: f1, sala, col, fila });
    return this;
  }

  enemigo(tipo: TipoEnemigo, col: number, fila: number) {
    this.enemigos.push({ tipo, col, fila, id: `${this.id}.${tipo}.${this.enemigos.length}` });
    return this;
  }

  barra(col: number, fila: number) {
    this.barras.push({ col, fila, id: `${this.id}.barra.${this.barras.length}` });
    return this;
  }

  sorbo(col: number, fila: number) {
    this.sorbos.push({ col, fila, id: `${this.id}.sorbo.${this.sorbos.length}` });
    return this;
  }

  cartel(col: number, fila: number, clave: string) {
    this.carteles.push({ col, fila, clave });
    return this;
  }

  /** A slab outside the grid (see `PlataformaDef`). */
  plat(tipo: PlataformaDef['tipo'], col: number, fila: number, ancho: number, d = 0, per = 4) {
    this.plataformas.push({ id: `${this.id}.plat.${this.plataformas.length}`, tipo, col, fila, ancho, d, per });
    return this;
  }

  /** A false wall over the tiles: looks like ground, can be walked through. */
  falso(c: number, f: number, w: number, h: number) {
    return this.rect(c, f, w, h, 'F');
  }

  mapa(x: number, y: number) {
    this.mapaXY = { x, y };
    return this;
  }

  puerta(p: Puerta) {
    this.puertas.push(p);
    return this;
  }

  hecho(): Sala {
    return {
      id: this.id,
      zona: this.zona,
      filas: this.g.map((r) => r.join('')),
      cols: this.cols,
      rows: this.rows,
      salidas: this.salidas,
      puertas: this.puertas,
      carteles: this.carteles,
      enemigos: this.enemigos,
      barras: this.barras,
      sorbos: this.sorbos,
      jefe: this.jefe,
      flor: this.flor,
      plataformas: this.plataformas,
      mapa: this.mapaXY,
      inicio: this.inicio,
    };
  }
}

// ---------------------------------------------------------------- zone 1: El Recibidor (tutorial, then a small loop)
//
//   recibidor-1 ── recibidor-2 ──(wall: right)── recibidor-3 ──(top door)── jardin-1
//                       └─(door, up on the ledges)── recibidor-4 ──(door)──┘ (a door of recibidor-3's floor)
// RULE of the exits through the walls: going out by the right you come in by the LEFT of the next room (and the other way round), always, and a room has
// at most one exit on each side. A second way between two rooms is a DOOR (an arch you walk into), never a second opening in the same wall.
// Two ways cross between the hall and the climb: the low one (pits and falling slabs) and the high one (ledges, then moving slabs over spikes).
// The high ledge of recibidor-1 is seen from the very start and cannot be reached until the Cierzo: coming back for it is the backtracking.

/** Walk, jump a pit, the first alarm clock, and a ledge too high to reach for now. */
function recibidor1() {
  const p = new Plano('recibidor-1', 'recibidor', 36, 12, 10);
  p.mapa(0, 0);
  p.inicio = { col: 3, fila: 9 };
  p.foso(15, 18);
  p.salida('der', 7, 9, 'recibidor-2', 2, 11);
  p.cartel(6, 9, 'cartel.andar').cartel(2, 9, 'cartel.alto').cartel(12, 9, 'cartel.saltar').cartel(21, 9, 'cartel.atacar');
  p.lista(29, 33, 7);
  p.enemigo('despertador', 27, 9);
  // Five tiles above the floor: only the double jump gets there.
  p.lista(1, 5, 5);
  p.sorbo(3, 4);
  return p.hecho();
}

/** The hall: a pit, a falling-slab bridge, and a stair of ledges to the high way. */
function recibidor2() {
  const p = new Plano('recibidor-2', 'recibidor', 48, 14, 12);
  p.mapa(1, 0);
  p.salida('izq', 9, 11, 'recibidor-1', 33, 9);
  p.salida('der', 9, 11, 'recibidor-3', 2, 12);
  p.foso(9, 11);
  p.enemigo('despertador', 6, 11);
  p.enemigo('despertador', 17, 11);
  // The high way: a stair of ledges, the way out at the far end.
  p.lista(13, 16, 10).lista(18, 21, 8).lista(23, 27, 6).lista(29, 32, 5).lista(34, 38, 4).lista(41, 46, 6);
  p.puerta({ col: 44, fila: 5, sala: 'recibidor-4', col2: 3, fila2: 9 });
  p.enemigo('despertador', 25, 5);
  // The low way: a six-tile pit crossed by two slabs that fall when stepped on.
  p.foso(24, 29);
  p.plat('cae', 25, 11, 2).plat('cae', 28, 11, 2);
  p.enemigo('despertador', 33, 11);
  p.enemigo('despertador', 39, 11);
  // The sip of the first lesson: ledges above the low way.
  p.lista(33, 35, 10).lista(37, 41, 8);
  p.sorbo(39, 7);
  p.barra(44, 11);
  p.cartel(42, 11, 'cartel.barra');
  return p.hecho();
}

/** A climb, three alarm clocks, and the door to the garden at the top. */
function recibidor3() {
  const p = new Plano('recibidor-3', 'recibidor', 30, 15, 13);
  p.mapa(2, 0);
  p.salida('izq', 10, 12, 'recibidor-2', 45, 11);
  p.puerta({ col: 27, fila: 12, sala: 'recibidor-4', col2: 35, fila2: 9 });
  p.lista(3, 8, 11).lista(11, 16, 9).lista(19, 24, 7).lista(11, 16, 5).lista(19, 28, 3);
  p.enemigo('despertador', 14, 8);
  p.enemigo('despertador', 22, 6);
  p.enemigo('despertador', 21, 12);
  p.puerta({ col: 26, fila: 2, sala: 'jardin-1', col2: 4, fila2: 9, zona: 'jardin' });
  return p.hecho();
}

/** The coat rack: moving slabs over a sea of spikes. */
function recibidor4() {
  const p = new Plano('recibidor-4', 'recibidor', 40, 12, 10);
  p.mapa(2, -1);
  p.puerta({ col: 1, fila: 9, sala: 'recibidor-2', col2: 42, fila2: 5 });
  p.puerta({ col: 37, fila: 9, sala: 'recibidor-3', col2: 25, fila2: 12 });
  p.foso(8, 31);
  p.enemigo('despertador', 4, 9);
  p.plat('mueve', 9, 9, 3, 6, 4.5);
  p.lista(19, 22, 8);
  p.enemigo('reloj', 20, 7);
  p.plat('sube', 24, 9, 3, 3, 4);
  p.lista(27, 30, 6);
  p.enemigo('despertador', 35, 9);
  p.barra(34, 9);
  return p.hecho();
}

// ---------------------------------------------------------------- zone 2: El Jardín del Cierzo
//
//   jardin-1 ── jardin-1b ── jardin-2 ── jardin-3 (boss) ── jardin-4 (Guille) ── jardin-5 (double-jump gauntlet)

/** The way in: a bar right away, clocks of «las tantas» with their puddles, and a chain of falling slabs to a sip. */
function jardin1() {
  const p = new Plano('jardin-1', 'jardin', 52, 12, 10);
  p.mapa(2, 1);
  p.inicio = { col: 4, fila: 9 };
  p.puerta({ col: 1, fila: 9, sala: 'recibidor-3', col2: 25, fila2: 2 });
  p.salida('der', 7, 9, 'jardin-1b', 2, 11);
  p.barra(7, 9);
  p.enemigo('reloj', 17, 9);
  p.foso(24, 27);
  p.lista(23, 28, 8);
  p.enemigo('reloj', 36, 9);
  p.lista(40, 44, 8);
  p.enemigo('despertador', 46, 9);
  // The sip up in the leaves: slabs that fall as soon as they are stepped on, a ledge at the top.
  p.plat('cae', 30, 8, 2).plat('cae', 33, 6, 2).plat('cae', 36, 4, 2);
  p.lista(39, 46, 3);
  p.sorbo(42, 2);
  return p.hecho();
}

/** The terraces: an elevator, ledges, falling and sliding slabs over a pit of spikes. */
function jardin1b() {
  const p = new Plano('jardin-1b', 'jardin', 48, 14, 12);
  p.mapa(3, 1);
  p.salida('izq', 9, 11, 'jardin-1', 49, 9);
  p.salida('der', 9, 11, 'jardin-2', 2, 13);
  p.foso(9, 43);
  p.enemigo('despertador', 5, 11);
  p.plat('sube', 9, 11, 3, 5, 5);
  p.lista(13, 17, 6);
  p.enemigo('reloj', 15, 5);
  p.plat('cae', 19, 6, 2).plat('cae', 22, 6, 2);
  p.plat('mueve', 25, 6, 3, 6, 5);
  p.lista(36, 40, 5);
  p.enemigo('despertador', 38, 4);
  p.lista(42, 44, 7);
  p.barra(45, 11);
  return p.hecho();
}

/** A tall garden: ledges up through hanging clocks to the boss door, and a hidden chamber behind a false wall. */
function jardin2() {
  const p = new Plano('jardin-2', 'jardin', 40, 16, 14);
  p.mapa(4, 1);
  p.salida('izq', 11, 13, 'jardin-1b', 45, 11);
  p.foso(13, 17);
  p.lista(4, 9, 12).lista(12, 17, 10).lista(20, 25, 8).lista(28, 33, 6);
  p.rect(34, 4, 6, 1, '#');
  p.salida('der', 1, 3, 'jardin-3', 2, 9);
  p.enemigo('reloj', 7, 11);
  p.enemigo('despertador', 15, 9);
  p.enemigo('reloj', 23, 7);
  p.enemigo('reloj', 27, 13);
  p.enemigo('despertador', 22, 13);
  p.barra(36, 3);
  // The hidden chamber: a block of ground whose first two columns are a false wall.
  p.rect(31, 10, 8, 4, '#');
  p.rect(33, 12, 5, 2, '.');
  p.falso(31, 12, 2, 2);
  p.sorbo(35, 13);
  return p.hecho();
}

/** The Gran Despertador's arena. */
function jardin3() {
  const p = new Plano('jardin-3', 'jardin', 26, 12, 10);
  p.mapa(5, 1);
  p.salida('izq', 7, 9, 'jardin-2', 38, 3);
  p.salida('der', 7, 9, 'jardin-4', 2, 10);
  p.lista(4, 7, 7).lista(18, 21, 7);
  p.jefe = { col: 19, fila: 9, disparo: 5, puertas: [0, 25] };
  return p.hecho();
}

/** Guille's flower, and the exit that only the Cierzo reaches. */
function jardin4() {
  const p = new Plano('jardin-4', 'jardin', 30, 13, 11);
  p.mapa(6, 1);
  p.salida('izq', 8, 10, 'jardin-3', 24, 9);
  p.rect(24, 6, 6, 7, '#');
  p.salida('der', 3, 5, 'jardin-5', 2, 5);
  p.flor = { col: 11, fila: 10, quien: 'guille' };
  p.cartel(19, 10, 'cartel.cierzo');
  return p.hecho();
}

/** The double jump gauntlet: islands five tiles apart over spikes. */
function jardin5() {
  const p = new Plano('jardin-5', 'jardin', 52, 14, 13);
  p.mapa(7, 1);
  // The floor is a sea of spikes: no solid ground at all.
  p.rect(1, 13, 50, 1, '^');
  const isla = (c0: number, c1: number, top: number) => p.rect(c0, top, c1 - c0 + 1, 3, '#');
  isla(1, 5, 6);
  isla(11, 14, 5);
  isla(20, 24, 6);
  isla(30, 34, 5);
  isla(40, 50, 6);
  p.rect(0, 13, 1, 1, '#');
  p.inicio = { col: 3, fila: 5 };
  p.salida('izq', 3, 5, 'jardin-4', 27, 5);
  p.barra(22, 5);
  p.enemigo('reloj', 32, 4);
  p.puerta({ col: 48, fila: 5, sala: 'fin', col2: 0, fila2: 0 });
  return p.hecho();
}

/** Rooms that other modules register (the final boss's arena). The exits towards them are not checked for reciprocity. */
export const SALAS_EXTERNAS = ['grifo-jefe'];

/**
 * The rule of the exits (Jesús: «si sales por la derecha entras por la izquierda de la siguiente, y al contrario»): a room has at most ONE opening per
 * side; it leads to a room that has an opening on the opposite side leading back; you arrive next to that opening, inside its rows, near that wall,
 * standing on something. Returns what is wrong (empty if all is right). `scripts/comprobar-salas.mjs` fails on it, and the game logs it on opening.
 */
export function erroresDeSalidas(salas: Record<string, Sala> = SALAS): string[] {
  const err: string[] = [];
  const opuesto = (l: 'izq' | 'der') => (l === 'izq' ? 'der' : 'izq');
  for (const s of Object.values(salas)) {
    for (const lado of ['izq', 'der'] as const) {
      if (s.salidas.filter((e) => e.lado === lado).length > 1) err.push(`${s.id}: dos salidas en el mismo lado (${lado})`);
    }
    for (const e of s.salidas) {
      const d = salas[e.sala];
      if (!d) {
        if (!SALAS_EXTERNAS.includes(e.sala)) err.push(`${s.id}: la salida ${e.lado} lleva a una sala que no existe (${e.sala})`);
        continue;
      }
      const vuelta = d.salidas.find((x) => x.lado === opuesto(e.lado));
      if (!vuelta) err.push(`${s.id}: sale por ${e.lado} a ${d.id}, que no tiene salida por ${opuesto(e.lado)}`);
      else {
        if (vuelta.sala !== s.id) err.push(`${s.id}: sale por ${e.lado} a ${d.id}, pero su salida ${opuesto(e.lado)} lleva a ${vuelta.sala}`);
        if (e.fila < vuelta.fila0 || e.fila > vuelta.fila1) err.push(`${s.id}: llega a ${d.id} en la fila ${e.fila}, fuera de su abertura (${vuelta.fila0}-${vuelta.fila1})`);
      }
      const cerca = e.lado === 'der' ? e.col <= 4 : e.col >= d.cols - 5;
      if (!cerca) err.push(`${s.id}: al salir por ${e.lado} llega a ${d.id} en la columna ${e.col}, lejos del lado ${opuesto(e.lado)}`);
      const pie = d.filas[e.fila + 1]?.[e.col];
      if (!pie || !'#=NX'.includes(pie)) err.push(`${s.id}: llega a ${d.id} (${e.col},${e.fila}) sin suelo debajo`);
      if (d.filas[e.fila]?.[e.col] !== '.') err.push(`${s.id}: llega a ${d.id} (${e.col},${e.fila}) dentro de un muro`);
    }
    for (const p of s.puertas) {
      if (p.sala === 'fin') continue;
      const d = salas[p.sala];
      if (!d) {
        if (!SALAS_EXTERNAS.includes(p.sala)) err.push(`${s.id}: la puerta lleva a una sala que no existe (${p.sala})`);
        continue;
      }
      if (!d.puertas.some((x) => x.sala === s.id)) err.push(`${s.id}: la puerta a ${d.id} no tiene puerta de vuelta`);
      const pie = d.filas[p.fila2 + 1]?.[p.col2];
      if (!pie || !'#=NX'.includes(pie)) err.push(`${s.id}: la puerta llega a ${d.id} (${p.col2},${p.fila2}) sin suelo debajo`);
    }
  }
  return err;
}

export const SALAS: Record<string, Sala> = {};
for (const s of [recibidor1(), recibidor2(), recibidor3(), recibidor4(), jardin1(), jardin1b(), jardin2(), jardin3(), jardin4(), jardin5()]) {
  for (const f of s.filas) if (f.length !== s.cols) console.error(`[una más] ${s.id}: una fila mide ${f.length} y no ${s.cols}`);
  SALAS[s.id] = s;
}

for (const e of erroresDeSalidas()) console.error(`[una más] salidas: ${e}`);

/** The first room of each zone (`?unamas&zona=N`). */
export const PRIMERA_SALA: Record<number, string> = { 1: 'recibidor-1', 2: 'jardin-1' };
