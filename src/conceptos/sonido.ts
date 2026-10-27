// The sound of «Una más»: every effect is synthesised live through the game's Sound (its effects bus, so the menu's «efectos» volume applies),
// layered from a few tones and noise bursts so that a hit has a thump, a crack and a ring. The music has its hooks ready (`musicaZona`,
// `musicaJefe`): a track that is not registered in src/sonido/musica.ts yet simply does nothing, so adding one later is one line there.
import type { SonidoMinijuego } from '../core/audio';
import { MUSICA, type Pista } from '../sonido/musica';

/** The zone themes, the mini-boss, the final boss and the rescue theme (the music agent registers them in src/sonido/musica.ts): register them in musica.ts under these names (tools/musica makes the files). */
const PISTAS = { recibidor: 'unaMasExplora', bandeja: 'unaMasExplora', grifo: 'unaMasJardin', jardin: 'unaMasJardin', teatro: 'unaMasTeatro', miniboss: 'unaMasMiniboss', jefe: 'unaMasJefe', rescate: 'unaMasRescate' } as const;
export type PistaUnaMas = keyof typeof PISTAS;

const hay = (id: string) => id in MUSICA;

export class SonidoUnaMas {
  private readonly activo: boolean;
  private tPaso = 0;
  private actual: PistaUnaMas | null = null;

  constructor(private readonly s: SonidoMinijuego | undefined) {
    this.activo = !!s?.tono && !!s?.ruido;
  }

  private t(f: number, dur: number, tipo: OscillatorType, vol: number, cuando = 0, desliza = 0) {
    if (this.activo) this.s?.tono?.(f, dur, tipo, vol, cuando, desliza);
  }

  private r(dur: number, vol: number, filtro: number) {
    if (this.activo) this.s?.ruido?.(dur, vol, filtro);
  }

  // ---------------------------------------------------------------- music hooks

  /** The theme of a zone (or the boss's): fades the previous one out. Does nothing while the file does not exist. */
  musica(pista: PistaUnaMas) {
    if (this.actual === pista) return;
    this.actual = pista;
    const id = PISTAS[pista];
    if (!hay(id)) return;
    try {
      this.s?.musica(id as unknown as Pista);
    } catch {
      /* no sound is not an error */
    }
  }

  parar(fundido = 0.6) {
    this.actual = null;
    try {
      this.s?.pararMusica(fundido);
    } catch {
      /* ditto */
    }
  }

  // ---------------------------------------------------------------- movement

  salto() {
    this.t(300, 0.16, 'square', 0.025, 0, 2.6);
    this.t(480, 0.12, 'triangle', 0.04, 0.02, 2.2);
    this.r(0.06, 0.02, 3000);
  }

  /** Cierzo: a gust (filtered noise) and a bright rising chime. */
  cierzo() {
    this.r(0.35, 0.07, 1800);
    this.r(0.22, 0.05, 5200);
    this.t(520, 0.3, 'sine', 0.06, 0, 2.9);
    this.t(780, 0.26, 'triangle', 0.04, 0.05, 2.5);
    this.t(1560, 0.2, 'sine', 0.03, 0.12, 1.6);
  }

  aterriza(fuerte: number) {
    const v = 0.03 + 0.05 * Math.min(1, fuerte);
    this.t(120, 0.12, 'sine', v, 0, 0.45);
    this.r(0.08, v * 0.8, 900);
  }

  paso(dt: number) {
    this.tPaso -= dt;
    if (this.tPaso > 0) return;
    this.tPaso = 0.17;
    this.r(0.04, 0.012, 700);
  }

  mutis() {
    this.r(0.3, 0.07, 1200);
    this.t(180, 0.3, 'sawtooth', 0.04, 0, 3.4);
    this.t(90, 0.25, 'sine', 0.06, 0, 2);
  }

  // ---------------------------------------------------------------- combat

  /** The swing of the mug: a swoosh. */
  jarrazo() {
    this.r(0.16, 0.06, 2600);
    this.t(720, 0.14, 'triangle', 0.035, 0, 0.35);
    this.t(300, 0.12, 'sawtooth', 0.015, 0.02, 0.5);
  }

  teclazoCarga(k: number) {
    this.t(330 + 330 * k, 0.1, 'triangle', 0.03);
  }

  teclazo() {
    this.r(0.4, 0.12, 900);
    this.t(70, 0.4, 'sine', 0.14, 0, 0.4);
    this.t(220, 0.3, 'square', 0.05, 0, 0.3);
    for (let i = 0; i < 5; i++) this.t(1400 + i * 260, 0.07, 'square', 0.025, 0.03 * i);
  }

  /** The mug connects: a thump, a crack and a glassy ring. */
  golpe(fuerte = false) {
    this.t(fuerte ? 90 : 130, 0.2, 'sine', fuerte ? 0.16 : 0.11, 0, 0.35);
    this.r(0.12, fuerte ? 0.14 : 0.09, 2400);
    this.t(1900, 0.1, 'square', 0.03, 0, 0.5);
    this.t(2650, 0.28, 'sine', 0.028, 0.01, 0.97);
    this.t(3400, 0.2, 'sine', 0.02, 0.02, 0.97);
  }

  muerteEnemigo(grande = false) {
    this.r(grande ? 0.7 : 0.35, grande ? 0.16 : 0.1, 1600);
    this.t(grande ? 70 : 160, grande ? 0.6 : 0.3, 'sine', 0.13, 0, 0.3);
    this.t(520, 0.25, 'sawtooth', 0.04, 0, 0.3);
    [880, 1175, 1568, 2093].forEach((f, i) => this.t(f, 0.2, 'triangle', 0.035, 0.05 + i * 0.045));
    if (grande) for (let i = 0; i < 6; i++) this.t(300 + i * 90, 0.3, 'square', 0.03, 0.1 + i * 0.07, 0.5);
  }

  /** Fran is hurt: a dull blow and a falling buzz. */
  dano() {
    this.t(95, 0.28, 'sine', 0.18, 0, 0.4);
    this.r(0.2, 0.12, 1400);
    this.t(420, 0.34, 'sawtooth', 0.06, 0, 0.35);
    this.t(300, 0.34, 'square', 0.035, 0.03, 0.4);
  }

  pinchos() {
    this.r(0.1, 0.08, 4200);
    this.t(1100, 0.12, 'square', 0.04, 0, 0.5);
    this.dano();
  }

  muerte() {
    this.t(260, 1.0, 'sawtooth', 0.07, 0, 0.12);
    this.t(130, 1.1, 'sine', 0.1, 0, 0.2);
    this.r(0.6, 0.1, 500);
  }

  // ---------------------------------------------------------------- enemies

  /** The alarm clock rings: a quick alternation of two high notes. */
  riiing(largo = false) {
    const n = largo ? 14 : 9;
    for (let i = 0; i < n; i++) {
      this.t(i % 2 ? 2350 : 2800, 0.06, 'square', 0.022, i * 0.045);
      this.t(i % 2 ? 1175 : 1400, 0.06, 'triangle', 0.02, i * 0.045);
    }
  }

  embiste() {
    this.r(0.25, 0.07, 1000);
    this.t(110, 0.25, 'sawtooth', 0.04, 0, 0.7);
  }

  goteo() {
    this.t(880, 0.07, 'sine', 0.03, 0, 0.5);
    this.t(660, 0.1, 'sine', 0.02, 0.05, 0.6);
  }

  /** The Gran Despertador lands: a boom and the dust. */
  pisoton() {
    this.t(55, 0.5, 'sine', 0.2, 0, 0.4);
    this.r(0.4, 0.14, 700);
    this.t(130, 0.3, 'square', 0.05, 0, 0.4);
  }

  jefeEntra() {
    this.riiing(true);
    this.t(60, 1.0, 'sawtooth', 0.08, 0.1, 1.4);
    this.r(0.8, 0.08, 500);
  }

  // ---------------------------------------------------------------- the world

  /** A bar saves: a warm chord and some bubbles. */
  barra() {
    [392, 494, 587, 784].forEach((f, i) => {
      this.t(f, 0.7, 'triangle', 0.045, i * 0.07);
      this.t(f * 2, 0.5, 'sine', 0.018, i * 0.07 + 0.02);
    });
    for (let i = 0; i < 6; i++) this.t(900 + ((i * 337) % 700), 0.07, 'sine', 0.02, 0.1 + i * 0.09, 1.6);
  }

  sorbo() {
    [660, 880, 1320].forEach((f, i) => this.t(f, 0.2, 'triangle', 0.05, i * 0.07));
  }

  /** Guille is free: a rising fanfare with a shimmer on top. */
  rescate() {
    [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => {
      this.t(f, 0.42, 'triangle', 0.06, i * 0.085);
      this.t(f * 2, 0.34, 'sine', 0.025, i * 0.085 + 0.02);
    });
    [1568, 2093, 2637].forEach((f, i) => this.t(f, 0.5, 'sine', 0.025, 0.7 + i * 0.07));
    this.r(0.9, 0.03, 6000);
  }

  habilidad() {
    this.rescate();
    this.t(131, 1.0, 'sine', 0.08, 0.4, 1.5);
  }

  puerta() {
    this.t(200, 0.3, 'triangle', 0.05, 0, 1.8);
    this.r(0.25, 0.04, 1500);
  }

  texto() {
    this.t(620 + Math.random() * 140, 0.035, 'square', 0.012);
  }

  menu() {
    this.t(880, 0.06, 'triangle', 0.04);
  }

  cartel() {
    this.t(700, 0.07, 'sine', 0.025);
  }

  // ---------------------------------------------------------------- LA ÚLTIMA (jefe-ultima.ts)

  /** The final boss's theme; the third phase jumps to its faster stretch (the last 32 s of the loop, from 156 s of the file). */
  musicaJefe(fase: 1 | 3) {
    if (fase === 1) return this.musica('jefe');
    if (!hay('unaMasJefe')) return;
    this.actual = 'jefe';
    try {
      this.s?.musica('unaMasJefe' as unknown as Pista, 0.3, { desde: 156, inicio: 156, fin: 188 });
    } catch {
      /* no sound is not an error */
    }
  }

  /** A deep roar: three growling saws sliding down, a rumble of noise and a wobble on top. */
  rugido(largo = 1) {
    const d = 0.9 * largo;
    this.t(96, d, 'sawtooth', 0.09, 0, 0.5);
    this.t(71, d, 'square', 0.06, 0.02, 0.55);
    this.t(48, d * 1.1, 'sine', 0.16, 0, 0.7);
    for (let i = 0; i < 8; i++) this.t(130 - i * 5, 0.1, 'sawtooth', 0.03, 0.05 + i * 0.1 * largo, 0.8);
    this.r(d, 0.1, 700);
  }

  /** Glass: a crack and a shower of glints. */
  cristal(fuerte = false) {
    this.r(0.12, fuerte ? 0.14 : 0.08, 6000);
    const n = fuerte ? 9 : 5;
    for (let i = 0; i < n; i++) this.t(2200 + ((i * 733) % 3300), 0.12 + (i % 3) * 0.05, i % 2 ? 'sine' : 'triangle', 0.03, i * 0.035, 0.9);
    if (fuerte) this.t(70, 0.4, 'sine', 0.12, 0, 0.5);
  }

  /** A bottle cap: a bright little ting. */
  chapa() {
    this.t(2100, 0.07, 'triangle', 0.03, 0, 0.7);
    this.t(3100, 0.05, 'square', 0.012, 0.01, 0.7);
  }

  /** Beer pouring: a long soft hiss with bubbles. */
  chorro() {
    this.r(0.5, 0.045, 2200);
    for (let i = 0; i < 4; i++) this.t(700 + ((i * 411) % 600), 0.06, 'sine', 0.018, i * 0.1, 1.5);
  }

  /** The tap bursts: wood, brass and a gush. */
  barrilRoto() {
    this.r(0.5, 0.15, 1500);
    this.t(80, 0.4, 'sine', 0.16, 0, 0.5);
    this.t(300, 0.25, 'square', 0.05, 0, 0.4);
    this.cristal();
  }

  /** The hit that does not hurt it: a dull metallic clang. */
  clang() {
    this.t(220, 0.18, 'square', 0.04, 0, 0.8);
    this.t(1250, 0.2, 'triangle', 0.03, 0, 0.95);
    this.r(0.05, 0.05, 3000);
  }

  /** Wobbly belch of the drunk boss. */
  eructo() {
    this.t(120, 0.45, 'sawtooth', 0.07, 0, 0.5);
    this.t(150, 0.35, 'square', 0.03, 0.05, 0.6);
    this.r(0.3, 0.05, 900);
  }
}
