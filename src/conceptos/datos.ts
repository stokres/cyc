// «Una más»: the map, as data. A zone is a handful of rooms; a room is a grid of tiles (TILE units each) plus what stands on it.
// Everything that is "level design" lives here (rooms, doors, enemies, bars, the signs), nothing else reads a room's shape except
// the physics (fisica.ts) and the tile painter (nivel.ts). Text never lives here: signs and dialogues are keys of textos/conceptos.md.
//
// Tile legend (the grid):
//   .  empty        #  solid        =  one-way platform (jump up through it, drop down with ↓)
//   ^  spikes       N  «NO» block (breaks with the Teclazo)       T  stage curtain (only the Mutis goes through)
//   X  gate (closed by a fight; the grid is changed live, never stored here)
// What stands on the ground is put with `Plano.pon(col, fila, tipo)` (the tile it stands IN; its feet are at the bottom of that tile).

export const TILE = 48;

export type TipoEnemigo = 'despertador' | 'reloj' | 'gran';
export type Habilidad = 'cierzo' | 'teclazo' | 'mutis';
export type Material = 'recibidor' | 'jardin';

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
  flor?: { col: number; fila: number };
  /** Where the player starts when the game begins in this room. */
  inicio: { col: number; fila: number };
}

export type Zona = 'recibidor' | 'jardin';

export const ZONAS: Record<Zona, { numero: number; material: Material }> = {
  recibidor: { numero: 1, material: 'recibidor' },
  jardin: { numero: 2, material: 'jardin' },
};

/** The skills, in the order they are earned (docs: conceptos-metroidvania.md). */
export const HABILIDADES: Habilidad[] = ['cierzo', 'teclazo', 'mutis'];

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
      inicio: this.inicio,
    };
  }
}

// ---------------------------------------------------------------- zone 1: El Recibidor (tutorial)

/** Walk, jump a pit, the first alarm clock. */
function recibidor1() {
  const p = new Plano('recibidor-1', 'recibidor', 36, 12, 10);
  p.inicio = { col: 3, fila: 9 };
  p.foso(15, 18);
  p.salida('der', 7, 9, 'recibidor-2', 2, 9);
  p.cartel(5, 9, 'cartel.andar').cartel(12, 9, 'cartel.saltar').cartel(21, 9, 'cartel.atacar');
  p.lista(29, 33, 7);
  p.enemigo('despertador', 27, 9);
  return p.hecho();
}

/** More alarm clocks, a pit, a ledge stair to a sip, and the first bar. */
function recibidor2() {
  const p = new Plano('recibidor-2', 'recibidor', 46, 12, 10);
  p.salida('izq', 7, 9, 'recibidor-1', 33, 9);
  p.salida('der', 7, 9, 'recibidor-3', 2, 12);
  p.lista(8, 12, 7);
  p.lista(17, 21, 8);
  p.foso(24, 26);
  p.enemigo('despertador', 15, 9);
  p.enemigo('despertador', 30, 9);
  p.enemigo('despertador', 20, 7);
  p.lista(33, 35, 8).lista(37, 40, 6);
  p.sorbo(38, 5);
  p.barra(43, 9);
  p.cartel(40, 9, 'cartel.barra');
  return p.hecho();
}

/** A climb, three alarm clocks, and the door to the garden at the top. */
function recibidor3() {
  const p = new Plano('recibidor-3', 'recibidor', 30, 15, 13);
  p.salida('izq', 10, 12, 'recibidor-2', 43, 9);
  p.lista(3, 8, 11).lista(11, 16, 9).lista(19, 24, 7).lista(11, 16, 5).lista(19, 28, 3);
  p.enemigo('despertador', 14, 8);
  p.enemigo('despertador', 22, 6);
  p.enemigo('despertador', 21, 12);
  p.puerta({ col: 26, fila: 2, sala: 'jardin-1', col2: 4, fila2: 9, zona: 'jardin' });
  return p.hecho();
}

// ---------------------------------------------------------------- zone 2: El Jardín del Cierzo

/** The way in: a bar right away, clocks of «las tantas» with their puddles. */
function jardin1() {
  const p = new Plano('jardin-1', 'jardin', 52, 12, 10);
  p.inicio = { col: 4, fila: 9 };
  p.puerta({ col: 1, fila: 9, sala: 'recibidor-3', col2: 25, fila2: 2 });
  p.salida('der', 7, 9, 'jardin-2', 2, 13);
  p.barra(7, 9);
  p.enemigo('reloj', 17, 9);
  p.foso(24, 27);
  p.lista(23, 28, 8);
  p.enemigo('reloj', 36, 9);
  p.lista(40, 44, 8);
  p.enemigo('despertador', 46, 9);
  return p.hecho();
}

/** A tall garden: ledges up through hanging clocks to the boss door. */
function jardin2() {
  const p = new Plano('jardin-2', 'jardin', 40, 16, 14);
  p.salida('izq', 11, 13, 'jardin-1', 49, 9);
  p.foso(13, 17);
  p.lista(4, 9, 12).lista(12, 17, 10).lista(20, 25, 8).lista(28, 33, 6);
  p.rect(34, 4, 6, 1, '#');
  p.salida('der', 1, 3, 'jardin-3', 2, 9);
  p.enemigo('reloj', 7, 11);
  p.enemigo('despertador', 15, 9);
  p.enemigo('reloj', 23, 7);
  p.enemigo('reloj', 30, 13);
  p.enemigo('despertador', 22, 13);
  p.barra(36, 3);
  return p.hecho();
}

/** The Gran Despertador's arena. */
function jardin3() {
  const p = new Plano('jardin-3', 'jardin', 26, 12, 10);
  p.salida('izq', 7, 9, 'jardin-2', 38, 3);
  p.salida('der', 7, 9, 'jardin-4', 2, 10);
  p.lista(4, 7, 7).lista(18, 21, 7);
  p.jefe = { col: 19, fila: 9, disparo: 5, puertas: [0, 25] };
  return p.hecho();
}

/** Guille's flower, and the exit that only the Cierzo reaches. */
function jardin4() {
  const p = new Plano('jardin-4', 'jardin', 30, 13, 11);
  p.salida('izq', 8, 10, 'jardin-3', 24, 9);
  p.rect(24, 6, 6, 7, '#');
  p.salida('der', 3, 5, 'jardin-5', 2, 5);
  p.flor = { col: 11, fila: 10 };
  p.cartel(19, 10, 'cartel.cierzo');
  return p.hecho();
}

/** The double jump gauntlet: islands six tiles apart over spikes. */
function jardin5() {
  const p = new Plano('jardin-5', 'jardin', 52, 14, 13);
  // The floor is a sea of spikes: no solid ground at all.
  p.rect(1, 13, 50, 1, '^');
  const isla = (c0: number, c1: number, top: number) => p.rect(c0, top, c1 - c0 + 1, 3, '#');
  isla(1, 5, 6);
  isla(12, 15, 5);
  isla(22, 26, 6);
  isla(33, 37, 5);
  isla(44, 50, 6);
  p.rect(0, 13, 1, 1, '#');
  p.inicio = { col: 3, fila: 5 };
  p.salida('izq', 3, 5, 'jardin-4', 27, 5);
  p.barra(24, 5);
  p.enemigo('reloj', 35, 4);
  p.puerta({ col: 48, fila: 5, sala: 'fin', col2: 0, fila2: 0 });
  return p.hecho();
}

export const SALAS: Record<string, Sala> = {};
for (const s of [recibidor1(), recibidor2(), recibidor3(), jardin1(), jardin2(), jardin3(), jardin4(), jardin5()]) {
  for (const f of s.filas) if (f.length !== s.cols) console.error(`[una más] ${s.id}: una fila mide ${f.length} y no ${s.cols}`);
  SALAS[s.id] = s;
}

/** The first room of each zone (`?unamas&zona=N`). */
export const PRIMERA_SALA: Record<number, string> = { 1: 'recibidor-1', 2: 'jardin-1' };
