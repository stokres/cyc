// The Pang's sound effects, synthesised through the game's Sound (its effects bus, so the
// menu's «efectos» volume applies). Short and quiet. A sound without `tono` and `ruido`
// (a stand-in) just stays silent.
import type { SonidoMinijuego } from '../core/audio';
import type { Talla } from './tipos';

/** The two synthesis calls the effects use, always there. */
interface Sint {
  tono: NonNullable<SonidoMinijuego['tono']>;
  ruido: NonNullable<SonidoMinijuego['ruido']>;
}

/** What is recorded: the name alone, or the name and its arguments. */
export type EfectoGrabado = string | [string, ...number[]];

export class Efectos {
  private ultimoPop = 0;
  private readonly s: Sint;
  /**
   * Online host: every effect called is also pushed here (the snapshot sends them to the guests, who play them with `reproducir`).
   * null: nothing recorded.
   */
  grabadora: EfectoGrabado[] | null = null;

  constructor(
    sonido: SonidoMinijuego | undefined,
    /** false (a bot demo or no sound): every method does nothing. */
    private activo: boolean,
  ) {
    const { tono, ruido } = sonido ?? {};
    this.activo = activo && !!tono && !!ruido;
    this.s = { tono: (...a) => tono?.call(sonido, ...a), ruido: (...a) => ruido?.call(sonido, ...a) };
  }

  private graba(nombre: string, ...args: number[]) {
    if (this.grabadora && this.grabadora.length < 32) this.grabadora.push(args.length ? [nombre, ...args] : nombre);
  }

  /** Online guest: plays an effect the host recorded. Unknown names are ignored. */
  reproducir(e: EfectoGrabado) {
    const [nombre, ...args] = typeof e === 'string' ? [e] : e;
    if (!NOMBRES.has(nombre)) return;
    (this as unknown as Record<string, (...a: number[]) => void>)[nombre](...args.filter((x) => typeof x === 'number'));
  }

  /** Plays `f` unless the effects are off. */
  private con(f: (s: Sint) => void) {
    if (this.activo) f(this.s);
  }

  disparo() {
    this.graba('disparo');
    this.con((s) => s.tono(1300, 0.09, 'square', 0.018, 0, 0.35));
  }

  /** A bubble bursts: the smaller, the higher. Many at once are thinned out. */
  reventar(talla: Talla) {
    this.graba('reventar', talla);
    if (!this.activo) return;
    const ahora = performance.now();
    if (ahora - this.ultimoPop < 30) return;
    this.ultimoPop = ahora;
    const f = [190, 270, 380, 520][talla];
    this.s.ruido(0.07 + 0.02 * (3 - talla), 0.06, 1800);
    this.s.tono(f, 0.1, 'triangle', 0.05, 0, 1.9);
  }

  /** A shot bounces off Robi's party hat. */
  clonk() {
    this.graba('clonk');
    this.con((s) => {
      s.tono(330, 0.09, 'square', 0.035, 0, 0.5);
      s.tono(190, 0.14, 'triangle', 0.05, 0.02, 0.8);
    });
  }

  golpeJefe() {
    this.graba('golpeJefe');
    this.con((s) => {
      s.ruido(0.1, 0.06, 900);
      s.tono(150, 0.16, 'sawtooth', 0.04, 0, 0.5);
    });
  }

  /** The boss falls apart. */
  jefeDerrotado() {
    this.graba('jefeDerrotado');
    this.con((s) => {
      for (let i = 0; i < 6; i++) s.ruido(0.18, 0.07, 1400 - i * 150);
      [392, 523, 659, 784, 1046].forEach((f, i) => s.tono(f, 0.22, 'triangle', 0.06, 0.2 + i * 0.09));
    });
  }

  herido() {
    this.graba('herido');
    this.con((s) => [392, 330, 262, 196].forEach((f, i) => s.tono(f, 0.22, 'triangle', 0.07, i * 0.12)));
  }

  objeto() {
    this.graba('objeto');
    this.con((s) => [880, 1175].forEach((f, i) => s.tono(f, 0.1, 'square', 0.025, i * 0.06)));
  }

  /** A special is used: a rising arpeggio. */
  poder() {
    this.graba('poder');
    this.con((s) => [262, 330, 392, 523, 659, 784].forEach((f, i) => s.tono(f, 0.16, 'square', 0.03, i * 0.05)));
  }

  vidaExtra() {
    this.graba('vidaExtra');
    this.con((s) => [523, 659, 784, 1046, 1318].forEach((f, i) => s.tono(f, 0.14, 'triangle', 0.07, i * 0.07)));
  }

  fanfarria() {
    this.graba('fanfarria');
    this.con((s) => {
      [523, 523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => s.tono(f, 0.2, 'triangle', 0.07, i * 0.12));
    });
  }

  /** The clock is nearly out: one beep a second. */
  pitido() {
    this.graba('pitido');
    this.con((s) => s.tono(1000, 0.07, 'square', 0.02));
  }

  romper() {
    this.graba('romper');
    this.con((s) => {
      s.ruido(0.12, 0.07, 2500);
      s.tono(240, 0.08, 'square', 0.025, 0, 0.5);
    });
  }

  escudoRoto() {
    this.graba('escudoRoto');
    this.con((s) => {
      s.ruido(0.14, 0.06, 3500);
      s.tono(900, 0.18, 'triangle', 0.05, 0, 0.3);
    });
  }

  /** Time bonus counting up. */
  cuenta() {
    this.graba('cuenta');
    this.con((s) => s.tono(1500, 0.03, 'square', 0.012));
  }

  listo() {
    this.graba('listo');
    this.con((s) => s.tono(660, 0.12, 'triangle', 0.05));
  }

  ya() {
    this.graba('ya');
    this.con((s) => s.tono(990, 0.2, 'triangle', 0.06));
  }
}

/** The effects an online guest may be asked to play (the host's list is data from the network). */
const NOMBRES = new Set(['disparo', 'reventar', 'clonk', 'golpeJefe', 'jefeDerrotado', 'herido', 'objeto', 'poder', 'vidaExtra', 'fanfarria', 'pitido', 'romper', 'escudoRoto', 'cuenta', 'listo', 'ya']);
