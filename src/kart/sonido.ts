// The sound of Impropios Kart: the race music (a loop made by tools/musica/kart.py) and the effects, all
// synthesised live through the game's Sound (its effects bus, so the menu's «efectos» volume applies), the
// same way as the Pang's (src/pang/sonido.ts). A sound without `tono` and `ruido` (a stand-in) stays silent,
// and a track that is not registered yet does nothing.
import type { SonidoMinijuego } from '../core/audio';
import { MUSICA, type Pista } from '../sonido/musica';

/** The race loop (musica.ts: `kartCarrera`). */
export const PISTA_CARRERA = 'kartCarrera' as unknown as Pista;

const hay = (id: Pista) => id in MUSICA;

export class SonidoKart {
  private readonly activo: boolean;
  private tMotor = 0;
  private tDerrape = 0;
  private tChoque = 0;

  constructor(private readonly s: SonidoMinijuego | undefined) {
    this.activo = !!s?.tono && !!s?.ruido;
  }

  private tono(f: number, dur: number, tipo: OscillatorType, vol: number, cuando = 0, desliza = 0) {
    if (this.activo) this.s?.tono?.(f, dur, tipo, vol, cuando, desliza);
  }

  private ruido(dur: number, vol: number, filtro: number) {
    if (this.activo) this.s?.ruido?.(dur, vol, filtro);
  }

  musica() {
    if (!hay(PISTA_CARRERA)) return;
    try {
      this.s?.musica(PISTA_CARRERA);
    } catch {
      /* no sound is not an error */
    }
  }

  parar(fundido?: number) {
    try {
      this.s?.pararMusica(fundido);
    } catch {
      /* ditto */
    }
  }

  /** Called every frame: the engine rises with the speed (0–1.5); a new short buzz every ~70 ms. */
  motor(dt: number, vel: number, turbo: boolean) {
    this.tMotor -= dt;
    if (this.tMotor > 0) return;
    this.tMotor = 0.07;
    const f = 62 + 150 * Math.min(1.5, vel);
    this.tono(f, 0.1, turbo ? 'square' : 'sawtooth', turbo ? 0.014 : 0.01);
    this.tono(f * 1.5, 0.08, 'triangle', 0.006);
  }

  /** The tyres squealing while drifting (every ~90 ms). */
  derrape(dt: number, nivel: number) {
    this.tDerrape -= dt;
    if (this.tDerrape > 0) return;
    this.tDerrape = 0.09;
    this.ruido(0.1, 0.018 + nivel * 0.008, 2600 + nivel * 1500);
  }

  semaforo(n: number) {
    this.tono(n < 3 ? 440 : 880, n < 3 ? 0.2 : 0.55, 'square', n < 3 ? 0.04 : 0.05);
  }

  turbo() {
    this.ruido(0.3, 0.05, 2500);
    this.tono(260, 0.38, 'sawtooth', 0.04, 0, 3.4);
  }

  caja() {
    [880, 1175, 1568].forEach((f, i) => this.tono(f, 0.1, 'triangle', 0.05, i * 0.05));
  }

  ruleta(i: number) {
    this.tono(900 + (i % 6) * 90, 0.04, 'square', 0.02);
  }

  lanzar() {
    this.ruido(0.1, 0.05, 2200);
    this.tono(520, 0.16, 'square', 0.035, 0, 2.4);
  }

  golpe() {
    this.ruido(0.28, 0.09, 1300);
    this.tono(190, 0.32, 'sawtooth', 0.06, 0, 0.35);
  }

  /** A kart or a wall: throttled. */
  choque() {
    const ahora = performance.now();
    if (ahora - this.tChoque < 120) return;
    this.tChoque = ahora;
    this.ruido(0.07, 0.05, 700);
    this.tono(130, 0.1, 'square', 0.03, 0, 0.5);
  }

  agua() {
    this.ruido(0.5, 0.07, 800);
    [420, 330, 260, 200].forEach((f, i) => this.tono(f, 0.16, 'sine', 0.05, i * 0.08, 0.7));
  }

  flotador() {
    [392, 523, 659].forEach((f, i) => this.tono(f, 0.14, 'triangle', 0.045, i * 0.09));
  }

  boa() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tono(f, 0.14, 'triangle', 0.045, i * 0.045));
  }

  luz() {
    this.ruido(0.4, 0.06, 500);
    [700, 520, 380, 260].forEach((f, i) => this.tono(f, 0.2, 'sawtooth', 0.04, i * 0.09, 0.6));
  }

  vuelta() {
    [660, 880].forEach((f, i) => this.tono(f, 0.12, 'square', 0.03, i * 0.08));
  }

  vueltaFinal() {
    [660, 880, 1320, 880, 1320, 1760].forEach((f, i) => this.tono(f, 0.12, 'square', 0.03, i * 0.07));
  }

  /** The chequered flag: a bright fanfare. */
  fanfarria() {
    [523, 523, 523, 659, 784, 659, 784, 1046, 1046, 1318].forEach((f, i) => this.tono(f, i > 6 ? 0.34 : 0.2, 'triangle', 0.07, i * 0.12));
    [262, 330, 392, 523].forEach((f, i) => this.tono(f, 0.7, 'square', 0.02, 0.5 + i * 0.12));
  }

  derrota() {
    [392, 330, 262, 196].forEach((f, i) => this.tono(f, 0.24, 'triangle', 0.07, i * 0.14));
  }
}
