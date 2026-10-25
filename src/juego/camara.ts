// The wild camera of the long night (chapter 2, docs/CAPITULO2.md): the tools a script has to
// frame the bar the way a nervous director would. Dutch angle, a zoom that hits you in the face,
// low angle, a whip pan, a shake and a hard cut to another framing in the middle of a talk.
//
// Everything here only moves the baked scenery and the characters as they are: one CSS
// transform on `Motor.escenario` (the element that holds the canvases and the characters). No
// filters, nothing is drawn again and the interface (dialogue box, dock) stays upright. The
// transform is written only while something moves (a loop of its own, never past 60 fps) and
// removed altogether when the camera is back to a plain shot, so it costs nothing the rest of the time.
//
// From a script (src/capitulos/capitulo2.ts):  g.plano.holandes(10, 600)  /  await g.plano.barrido('pablo').
// From the texts (src/textos/capitulo2.md): a line starting with «@» in a dialogue block, between
// two lines of talk. It runs when the talk reaches it:
//
//   @holandes 10 600          Dutch angle: 10 degrees, taking 600 ms (the ms are optional)
//   @nivelar 400              back to straight
//   @zoom pablo 2.4           hard zoom onto Pablo's face (add ms to make it a slow push: @zoom pablo 2.4 900)
//   @zoom tragaperras 1.8     ... or onto an object (any zone of the scene)
//   @corte chuchi 2.6 -7      hard cut: framing on Chuchi, 2.6 times, tilted -7 degrees
//   @corte general            hard cut back to the whole bar, straight
//   @general 500              the whole bar again, taking 500 ms (the tilt stays)
//   @contrapicado 14 500      low angle (looking up): 14 degrees; @picado is the opposite
//   @barrido vero 1.8         whip pan to Vero (waits until it lands)
//   @temblor 14 700           shake: 14 px at first, dying out in 700 ms
//   @foco tragaperras         the real camera travels to a place or a person (the long bar is longer than the
//                             screen) and the talk waits until it lands; @foco libre lets it follow whoever plays
//   @espera 400               waits (the other line that makes the talk wait)
//   @girar 2 6000             the whole shot spins round 2 times in 6 s and ends straight (the chaos)
//   @manga pablo:ojos:suplica vero:boca chuchi:cara:sorpresa !gogogo
//                             the manga shot (src/juego/manga.ts): 1 to 3 tilted black-and-white panels that cut in
//                             while the talk goes on in its box. `personaje:tipo:expresion` (tipo: cara, ojos, boca,
//                             mano; the expression is optional; sombra is Pablo's shadow), `!gogogo` `!don` `!ha`
//                             `!zas` are the drawn onomatopoeias, `solo` takes it away after the next line.
//                             `@manga fin`, another @manga or any mark that changes the framing cuts back.
//
// Targets: fran, pablo, chuchi, guille, vero (their faces), `centro`, or the id of a zone of the
// scene (tragaperras, tele, barra, porra...).
import type { Aventura } from './aventura';
import { H } from '../motor/motor';
import { PlanoManga } from './manga';

/** Where the camera is looking: everything but `x`/`y` normalised to the screen (0 to 1). */
interface Encuadre {
  /** Zoom (1 = the whole shot). */
  z: number;
  /** Roll in degrees (the Dutch angle). */
  r: number;
  /** Tilt up/down in degrees (low angle / high angle), by perspective. */
  rx: number;
  /** Skew in degrees (only the whip pan uses it). */
  sk: number;
  /** The point of the scene that matters and where on screen it is kept. */
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  /** Extra pan, in screens (the whip pan). */
  ox: number;
}

const PLANO: Encuadre = { z: 1, r: 0, rx: 0, sk: 0, fx: 0.5, fy: 0.5, tx: 0.5, ty: 0.5, ox: 0 };
const CLAVES = Object.keys(PLANO) as Array<keyof Encuadre>;
const PERSPECTIVA = 560;

const suave = (u: number) => u * u * (3 - 2 * u);
const sale = (u: number) => 1 - (1 - u) ** 3;
const entra = (u: number) => u * u * u;

type Curva = (u: number) => number;

export class Camara {
  private e: Encuadre = { ...PLANO };
  private anim: null | { de: Encuadre; a: Encuadre; t0: number; ms: number; curva: Curva; fin: () => void } = null;
  private temblor: null | { amp: number; t0: number; ms: number } = null;
  private raf = 0;
  private ultimo = 0;
  private readonly rayas: HTMLDivElement;
  /** The manga shot (panels in black and white over the scene). */
  readonly manga: PlanoManga;
  private escrito = '';

  constructor(private readonly g: Aventura) {
    this.rayas = document.createElement('div');
    this.rayas.className = 'barrido';
    g.root.insertBefore(this.rayas, g.motor.escenario.nextSibling);
    this.manga = new PlanoManga(g, this.rayas.nextSibling);
  }

  /** Marks from the texts that are not the camera's (`@caos on`, `@caos off`): the chapter registers who runs them. */
  alMarca: ((palabras: string[]) => Promise<void> | void) | null = null;

  /** The camera is doing something other than a plain shot. */
  get activa() {
    return !!this.anim || !!this.temblor || CLAVES.some((k) => this.e[k] !== PLANO[k]);
  }

  /** For the tests: the framing now. */
  get encuadre(): Readonly<Encuadre> {
    return this.e;
  }

  // ------------------------------------------------------------ where things are

  /** A target as a point of the screen (0 to 1), or null if it is not there. `cara` aims at a head, not at the feet. */
  punto(objetivo: string): { x: number; y: number } | null {
    const g = this.g;
    const m = g.motor;
    if (objetivo === 'centro' || objetivo === 'general') return { x: 0.5, y: 0.5 };
    const a = g.pjs.get(objetivo as never) ?? g.npcs.get(objetivo as never);
    // Someone who is not on screen (the friends in the world of the concepts are figures: their zones) is a zone.
    if (a && a.visible) {
      const k = m.f(a.y);
      return { x: m.screenX(a.X, k) / m.vw, y: (a.y + m.alzada(a.X, k) - 235 * m.escala(k)) / H };
    }
    const z = g.S?.zonas[objetivo];
    if (z) {
      const r = m.zonaRect(z);
      return { x: (r.x + r.w / 2) / m.vw, y: (r.y + r.h / 2) / H };
    }
    return null;
  }

  /** A framing on a target: `z` times closer, keeping it in the upper middle of the screen where the dialogue box does not cover it. */
  enfocar(objetivo: string, z: number, r = this.e.r, rx = this.e.rx): Encuadre {
    const p = this.punto(objetivo) ?? { x: 0.5, y: 0.5 };
    if (objetivo === 'general' || z <= 1) return { ...PLANO, r, rx, z: 1 };
    // Put the target near the middle, but never so far that the picture runs out at an edge.
    const quiere = (v: number, centro: number) => {
      const ideal = v + (centro - v) * Math.min(1, (z - 1) / 0.9);
      return Math.max(1 - z * (1 - v), Math.min(z * v, ideal));
    };
    return { z, r, rx, sk: 0, fx: p.x, fy: p.y, tx: quiere(p.x, 0.5), ty: quiere(p.y, 0.42), ox: 0 };
  }

  // ------------------------------------------------------------ the tools

  /** Dutch angle: roll the shot `grados` degrees. */
  holandes(grados: number, ms = 500) {
    return this.ir({ ...this.e, r: grados }, ms, suave);
  }

  /** Straight again (roll and tilt back to zero). */
  nivelar(ms = 400) {
    return this.ir({ ...this.e, r: 0, rx: 0, sk: 0 }, ms, suave);
  }

  /** Low angle (the camera looks up) by `grados`; negative is a high angle. */
  contrapicado(grados = 14, ms = 500) {
    return this.ir({ ...this.e, rx: grados }, ms, suave);
  }

  picado(grados = 14, ms = 500) {
    return this.contrapicado(-grados, ms);
  }

  /** Zoom onto a face or an object. Without `ms` it is a cut: the shot is simply closer, with a little punch. */
  zoom(objetivo: string, z: number, ms = 0) {
    const a = this.enfocar(objetivo, z);
    if (ms > 0 || this.g.instantaneo) return this.ir(a, ms, suave);
    // The punch: it lands a bit too close and settles.
    this.e = { ...a, z: a.z * 1.07 };
    this.escribir();
    return this.ir(a, 170, sale);
  }

  /** Hard cut to another framing (no travelling), with an optional roll. */
  corte(objetivo: string, z = 1, r = this.e.r) {
    const a = this.enfocar(objetivo, z, r);
    this.parar();
    this.e = a;
    this.escribir();
    this.alCambiar();
    return Promise.resolve();
  }

  /**
   * The whole picture turns round `vueltas` times (negative: the other way) taking `ms`, and ends straight. The
   * end of the night (the total chaos) spins the camera like this, with the style cuts spinning with it.
   */
  async girar(vueltas = 1, ms = 3000) {
    await this.ir({ ...this.e, r: this.e.r + 360 * vueltas }, ms, (u) => u);
    // A whole number of turns is the same angle: keep it small so a later `nivelar` does not unwind them.
    this.e.r = ((((this.e.r + 180) % 360) + 360) % 360) - 180;
    this.escribir();
  }

  /** The whole shot again (roll and tilt stay: use `nivelar` for those). */
  general(ms = 500) {
    return this.ir({ ...this.e, z: 1, fx: 0.5, fy: 0.5, tx: 0.5, ty: 0.5, ox: 0 }, ms, suave);
  }

  /** Shake: `amp` pixels at first, dying out in `ms`. It does not wait. */
  sacudir(amp = 12, ms = 600) {
    if (this.g.instantaneo) return;
    this.temblor = { amp, t0: performance.now(), ms };
    this.arrancar();
  }

  /**
   * Whip pan: the shot slides away in a streak and comes back onto `objetivo` from the other side.
   * Resolves when it has landed.
   */
  async barrido(objetivo: string, z = 1.8, dir = 1) {
    const a = this.enfocar(objetivo, z);
    if (this.g.instantaneo) return void (await this.ir(a, 0, suave));
    this.rayas.style.opacity = '1';
    await this.ir({ ...this.e, ox: -0.55 * dir, sk: -16 * dir }, 150, entra);
    this.e = { ...a, ox: 0.55 * dir, sk: 16 * dir };
    this.escribir();
    this.rayas.style.opacity = '0';
    await this.ir(a, 260, sale);
  }

  /** The scene's own camera to a target (a person or a zone), waiting until it lands; `libre`: it follows whoever plays again. */
  async foco(objetivo: string) {
    const g = this.g;
    if (objetivo === 'libre') {
      g.foco = null;
      return;
    }
    const a = g.pjs.get(objetivo as never) ?? g.npcs.get(objetivo as never);
    const X = a ? a.X : g.S?.zonas[objetivo]?.X;
    if (X === undefined) return;
    g.foco = X;
    if (g.instantaneo) return void g.motor.seguir(X, true);
    const t0 = performance.now();
    await g.esperar(150);
    while (g.motor.camaraMoviendose && performance.now() - t0 < 5000) await g.esperar(100);
  }

  /** Back to a plain shot. */
  reset(ms = 0) {
    this.manga.ocultar();
    this.temblor = null;
    this.rayas.style.opacity = '0';
    return this.ir({ ...PLANO }, ms, suave);
  }

  /** Waits (no wait in the quick mode of the tests). */
  espera(ms: number) {
    return this.g.esperar(ms);
  }

  /**
   * One line of a script from the texts: `['zoom', 'pablo', '2.4']`. Returns when the line wants the
   * talk to wait (barrido, espera); the rest do not.
   */
  async marca(p: string[]) {
    const [que, ...a] = p;
    // Every mark that changes the framing cuts back from the manga shot (the waits and the shake do not).
    if (que === 'manga') return this.manga.mostrar(a);
    if (que !== 'espera' && que !== 'temblor') this.manga.ocultar();
    const n = (i: number, d: number) => (a[i] !== undefined && !Number.isNaN(Number(a[i])) ? Number(a[i]) : d);
    switch (que) {
      case 'holandes':
        void this.holandes(n(0, 8), n(1, 500));
        break;
      case 'nivelar':
        void this.nivelar(n(0, 400));
        break;
      case 'contrapicado':
        void this.contrapicado(n(0, 14), n(1, 500));
        break;
      case 'picado':
        void this.picado(n(0, 14), n(1, 500));
        break;
      case 'zoom':
        void this.zoom(a[0] ?? 'centro', n(1, 2), n(2, 0));
        break;
      case 'corte':
        void this.corte(a[0] ?? 'general', n(1, 1), n(2, this.e.r));
        break;
      case 'general':
        void this.general(n(0, 500));
        break;
      case 'temblor':
        this.sacudir(n(0, 12), n(1, 600));
        break;
      case 'barrido':
        await this.barrido(a[0] ?? 'centro', n(1, 1.8), n(2, 1));
        break;
      case 'espera':
        await this.espera(n(0, 300));
        break;
      case 'foco':
        await this.foco(a[0] ?? 'libre');
        break;
      case 'girar':
        void this.girar(n(0, 1), n(1, 3000));
        break;
      default:
        // A mark that is not the camera's own (the chaos asks for its style cuts): whoever registered it takes it.
        if (this.alMarca) await this.alMarca(p);
        else console.error(`[cámara] marca desconocida «@${p.join(' ')}»`);
    }
  }

  // ------------------------------------------------------------ the machinery

  /** Travel to a framing; resolves when it gets there (or at once, in the quick mode). */
  private ir(a: Encuadre, ms: number, curva: Curva): Promise<void> {
    this.parar();
    if (ms <= 0 || this.g.instantaneo) {
      this.e = { ...a };
      this.escribir();
      this.alCambiar();
      return Promise.resolve();
    }
    return new Promise((fin) => {
      this.anim = { de: { ...this.e }, a, t0: performance.now(), ms, curva, fin };
      this.arrancar();
    });
  }

  /** Stops the travelling one (its promise is kept: whoever waits for it goes on). */
  private parar() {
    const an = this.anim;
    this.anim = null;
    an?.fin();
  }

  private arrancar() {
    if (this.raf) return;
    this.ultimo = 0;
    this.g.motor.escenario.style.willChange = 'transform';
    this.raf = requestAnimationFrame(this.bucle);
  }

  private bucle = (ahora: number) => {
    this.raf = 0;
    if (!this.anim && !this.temblor) return this.alCambiar();
    this.raf = requestAnimationFrame(this.bucle);
    // 60 fps at most, also on 120 Hz screens.
    if (this.ultimo && ahora - this.ultimo < 1000 / 60 - 4) return;
    this.ultimo = ahora;
    const an = this.anim;
    if (an) {
      const u = Math.min(1, (performance.now() - an.t0) / an.ms);
      const k = an.curva(u);
      for (const c of CLAVES) this.e[c] = an.de[c] + (an.a[c] - an.de[c]) * k;
      if (u >= 1) {
        this.anim = null;
        this.e = { ...an.a };
        an.fin();
      }
    }
    const t = this.temblor;
    if (t && performance.now() - t.t0 >= t.ms) this.temblor = null;
    this.escribir();
  };

  private alCambiar() {
    if (!this.activa) this.g.motor.escenario.style.willChange = '';
  }

  /** Writes the CSS transform for the framing (and removes it when the shot is plain). */
  private escribir() {
    const el = this.g.motor.escenario;
    const e = this.e;
    const t = this.temblor;
    const W = this.g.motor.cssW;
    const Hh = this.g.motor.cssH;
    if (!t && CLAVES.every((k) => e[k] === PLANO[k])) {
      if (this.escrito) el.style.transform = this.escrito = '';
      return;
    }
    // Zoom enough that the roll and the tilt never show the edge of the picture.
    const ang = (Math.abs(e.r) * Math.PI) / 180;
    const cubre = Math.cos(ang) + Math.sin(ang) * Math.max(W / Hh, Hh / W) + Math.abs(e.rx) * 0.03 + Math.abs(e.sk) * 0.006;
    const z = Math.max(e.z, cubre);
    const r = (e.r * Math.PI) / 180;
    const sk = Math.tan((e.sk * Math.PI) / 180);
    // Where the target point lands with origin at the centre: c + T + R·K·S·(f − c); T puts it on (tx, ty).
    const vx = (e.fx - 0.5) * W * z;
    const vy = (e.fy - 0.5) * Hh * z;
    const kx = vx + sk * vy;
    const rx = kx * Math.cos(r) - vy * Math.sin(r);
    const ry = kx * Math.sin(r) + vy * Math.cos(r);
    let dx = (e.tx - 0.5) * W - rx + e.ox * W;
    let dy = (e.ty - 0.5) * Hh - ry;
    if (t) {
      const u = 1 - (performance.now() - t.t0) / t.ms;
      const f = t.amp * Math.max(0, u) * Math.max(0, u);
      const s = performance.now() / 1000;
      dx += f * (Math.sin(s * 71) + 0.6 * Math.sin(s * 113 + 1));
      dy += f * (Math.cos(s * 83) + 0.6 * Math.sin(s * 127 + 2));
    }
    const persp = e.rx ? `perspective(${PERSPECTIVA}px) rotateX(${(-e.rx).toFixed(2)}deg) ` : '';
    this.escrito = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) ${persp}rotate(${e.r.toFixed(2)}deg) skewX(${e.sk.toFixed(2)}deg) scale(${z.toFixed(4)})`;
    el.style.transform = this.escrito;
  }
}
