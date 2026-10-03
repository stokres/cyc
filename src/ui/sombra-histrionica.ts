// Pablo's narrator in the word battle (src/ui/palabras.ts): his own shadow,
// huge, hamming it up. It is only a shadow, so it can do what a body cannot:
// stretch to the ceiling, melt, spin like a top, hang upside down, split into a
// chorus line. It throws the words, bursts out laughing (convulsing, with
// echoes) at every mistake and stamps its feet now and then when Pablo cuts a
// bad word.
//
// Poses: Pablo's own skeleton (the rig's bones, src/arte/personajes/rig-runtime.mjs)
// bent into new positions, then flattened into silhouettes with glowing eyes and
// a grin painted on. All of them are bitmaps made once per screen size; each
// frame only moves and deforms them (docs/ESTILO.md, T5).
import { silueta } from '../motor/sprites';

type Huesos = Record<string, number>;
type Gesto = 'malicia' | 'risa' | 'rabia';

const HUESOS: Array<[string, string]> = [
  ['torso', 'root'], ['cabeza', 'torso'],
  ['brazo_sup_detras', 'torso'], ['antebrazo_detras', 'brazo_sup_detras'], ['mano_detras', 'antebrazo_detras'],
  ['brazo_sup_delante', 'torso'], ['antebrazo_delante', 'brazo_sup_delante'], ['mano_delante', 'antebrazo_delante'],
  ['muslo_detras', 'root'], ['pierna_detras', 'muslo_detras'], ['pie_detras', 'pierna_detras'],
  ['muslo_delante', 'root'], ['pierna_delante', 'muslo_delante'], ['pie_delante', 'pierna_delante'],
];

/** Angles in degrees, positive = forward (he faces right), as in the rig. */
const POSES: Record<string, { h: Huesos; gesto: Gesto }> = {
  chulo: { gesto: 'malicia', h: { torso: 6, cabeza: 12, brazo_sup_delante: 18, antebrazo_delante: 105, brazo_sup_detras: 22, antebrazo_detras: 98 } },
  brazos: { gesto: 'malicia', h: { torso: 5, cabeza: 14, brazo_sup_delante: 150, antebrazo_delante: 18, brazo_sup_detras: -150, antebrazo_detras: -15, muslo_delante: 24, muslo_detras: -24, pie_delante: -10, pie_detras: 10 } },
  lanzar: { gesto: 'malicia', h: { torso: -16, cabeza: -6, brazo_sup_delante: 125, antebrazo_delante: -35, mano_delante: -20, brazo_sup_detras: -55, antebrazo_detras: 25, muslo_delante: 36, pierna_delante: -12, muslo_detras: -22, pierna_detras: -34 } },
  burla: { gesto: 'risa', h: { cabeza: -10, brazo_sup_delante: 105, antebrazo_delante: 65, mano_delante: 30, brazo_sup_detras: -105, antebrazo_detras: -65, mano_detras: -30, muslo_delante: 58, pierna_delante: -75, pie_delante: 20 } },
  baile: { gesto: 'malicia', h: { torso: -8, cabeza: 6, brazo_sup_delante: 160, antebrazo_delante: 8, brazo_sup_detras: -62, antebrazo_detras: 40, muslo_detras: -42, pierna_detras: -85, muslo_delante: 6 } },
  reverencia: { gesto: 'malicia', h: { torso: -52, cabeza: -24, brazo_sup_delante: 64, antebrazo_delante: 70, brazo_sup_detras: -78, antebrazo_detras: -15, muslo_delante: 22, pierna_delante: -22, muslo_detras: -16 } },
  carcajada: { gesto: 'risa', h: { torso: 20, cabeza: 24, brazo_sup_delante: 96, antebrazo_delante: 8, brazo_sup_detras: 32, antebrazo_detras: 102, muslo_delante: 20, pierna_delante: -8, muslo_detras: -14 } },
  doblado: { gesto: 'risa', h: { torso: -38, cabeza: -18, brazo_sup_delante: -25, antebrazo_delante: 30, brazo_sup_detras: -40, antebrazo_detras: 20, muslo_delante: 14, pierna_delante: -18, muslo_detras: -10 } },
  rabieta: { gesto: 'rabia', h: { torso: -6, cabeza: -8, brazo_sup_delante: 120, antebrazo_delante: 70, brazo_sup_detras: -120, antebrazo_detras: -70, muslo_delante: 44, pierna_delante: -64, pie_delante: 15 } },
  pisoton: { gesto: 'rabia', h: { torso: -10, cabeza: -4, brazo_sup_delante: 38, antebrazo_delante: -10, brazo_sup_detras: -38, antebrazo_detras: 10, muslo_detras: -8 } },
};
type NombrePose = keyof typeof POSES;

/** The body's space a pose bitmap covers: room for flung arms and kicks. */
const VB = { x: -200, y: -390, w: 400, h: 405 };
/** Logical pixels per body unit: the shadow stands about 820 px tall. */
const U = 820 / 310;
/** The pose bitmaps are made a little under screen size: soft edges, less memory. */
const RESOLUCION = 0.8;

type Acto = 'paseo' | 'gigante' | 'derrite' | 'peonza' | 'coro' | 'colgado' | 'reverencia';
const ACTOS: Acto[] = ['paseo', 'gigante', 'derrite', 'peonza', 'coro', 'colgado', 'reverencia'];

/** A shadow's limbs: long and spidery (and the arms clear that big head when raised). */
const LARGO: Record<string, number> = { brazo_sup_detras: 1.7, antebrazo_detras: 1.7, brazo_sup_delante: 1.7, antebrazo_delante: 1.7, mano_detras: 1.3, mano_delante: 1.3, muslo_detras: 1.12, pierna_detras: 1.12, muslo_delante: 1.12, pierna_delante: 1.12 };

/**
 * The skeleton bent into a pose: the body's SVG with every bone moved, and the
 * head's matrix. Each bone hangs from where its parent's stretched end lands,
 * turned by the sum of the angles above it and stretched along its length only
 * (so a long upper arm does not skew the forearm).
 */
function enPose(cuerpo: string, J: Record<string, number[]>, P: Huesos) {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${cuerpo}</svg>`, 'image/svg+xml');
  const M: Record<string, DOMMatrix> = { root: new DOMMatrix() };
  const A: Record<string, number> = { root: 0 };
  for (const [b, padre] of HUESOS) {
    const [px, py] = J[b];
    const w = M[padre].transformPoint(new DOMPoint(px, py));
    A[b] = A[padre] + (P[b] ?? 0);
    M[b] = new DOMMatrix().translate(w.x, w.y).rotate(-A[b]).scale(1, LARGO[b] ?? 1).translate(-px, -py);
    doc.querySelector(`[id="${b}"]`)?.setAttribute('transform', M[b].toString());
  }
  return { svg: doc.documentElement.innerHTML, cabeza: M.cabeza };
}

/** Eyes and mouth painted on the silhouette's face, in the head's own coordinates (it faces right). */
function pintarGesto(x: CanvasRenderingContext2D, gesto: Gesto) {
  const luz = gesto === 'rabia' ? '#ff6a3a' : '#fff1c4';
  x.fillStyle = luz;
  x.strokeStyle = luz;
  x.shadowColor = gesto === 'rabia' ? 'rgba(255,80,40,0.9)' : 'rgba(255,214,130,0.9)';
  x.shadowBlur = 10;
  x.lineCap = 'round';
  // Near eye (left, inner corner on its right) and far eye (right, inner corner on its left).
  const ojos: Array<[number, number, number]> = [[12, -3, 1], [38, -4, -1]];
  for (const [cx, cy, dentro] of ojos) {
    if (gesto === 'risa') {
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(cx - 9, cy + 3);
      x.quadraticCurveTo(cx, cy - 10, cx + 9, cy + 3);
      x.stroke();
      continue;
    }
    // A slanted slit, the inner corner lower: up to no good.
    const caida = gesto === 'rabia' ? 7 : 4.5;
    const izq = cy + (dentro < 0 ? caida : -caida * 0.4);
    const der = cy + (dentro > 0 ? caida : -caida * 0.4);
    x.beginPath();
    x.moveTo(cx - 10, izq);
    x.quadraticCurveTo(cx, cy - 7, cx + 10, der);
    x.quadraticCurveTo(cx, cy + 4, cx - 10, izq);
    x.fill();
  }
  x.beginPath();
  if (gesto === 'risa') {
    // A huge open grin, teeth and a dark throat.
    x.moveTo(4, 16);
    x.quadraticCurveTo(28, 24, 52, 12);
    x.quadraticCurveTo(34, 66, 4, 16);
    x.fill();
    x.shadowBlur = 0;
    x.fillStyle = '#2a0a14';
    x.beginPath();
    x.moveTo(10, 24);
    x.quadraticCurveTo(29, 30, 47, 21);
    x.quadraticCurveTo(33, 56, 10, 24);
    x.fill();
  } else if (gesto === 'rabia') {
    // Gritted teeth, jagged.
    x.moveTo(8, 20);
    for (let i = 0; i <= 8; i++) x.lineTo(8 + i * 5, 20 + (i % 2 ? 9 : 0) - i * 0.6);
    x.lineTo(46, 34);
    for (let i = 8; i >= 0; i--) x.lineTo(8 + i * 5, 34 + (i % 2 ? -8 : 0) - i * 0.3);
    x.fill();
  } else {
    // A sly half smile, up at the corner.
    x.moveTo(10, 24);
    x.quadraticCurveTo(30, 30, 50, 12);
    x.quadraticCurveTo(32, 38, 10, 24);
    x.fill();
  }
  x.shadowBlur = 0;
}

export class SombraHistrionica {
  private poses: Partial<Record<NombrePose, HTMLCanvasElement>> = {};
  private generacion = 0;
  private acto: Acto = 'paseo';
  private ta = 0;
  private dur = 3.5;
  private lanzando = 0;
  private reaccion: null | { tipo: 'risa' | 'rabieta'; t: number; dur: number } = null;

  constructor(
    private cuerpo: string,
    private joints: Record<string, number[]>,
    private headAt: { x: number; y: number; s: number },
  ) {}

  /** (Re)makes the pose bitmaps for this screen size; the old ones serve until then. */
  async preparar(escala: number) {
    const gen = ++this.generacion;
    const k = U * escala * RESOLUCION;
    for (const nombre of Object.keys(POSES) as NombrePose[]) {
      const { h, gesto } = POSES[nombre];
      const p = enPose(this.cuerpo, this.joints, h);
      const c = await silueta(p.svg, VB.h * k, '#0c0814', VB).catch(() => null);
      if (!c || gen !== this.generacion) return;
      const x = c.getContext('2d')!;
      // Painted on the silhouette only (silueta() leaves 'source-in' set, which would wipe it).
      x.globalCompositeOperation = 'source-atop';
      const m = p.cabeza;
      x.setTransform(k, 0, 0, k, -VB.x * k, -VB.y * k);
      x.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      x.translate(this.headAt.x, this.headAt.y);
      x.scale(this.headAt.s, this.headAt.s);
      pintarGesto(x, gesto);
      this.poses[nombre] = c;
    }
  }

  /** A word leaves its hand. */
  lanza() {
    this.lanzando = 0.3;
  }

  /** Pablo got one wrong: a fit of laughter. */
  rie() {
    this.reaccion = { tipo: 'risa', t: 0, dur: 1.5 };
  }

  /** Pablo cut a bad word: sometimes, a tantrum (never over a laugh). */
  rabia() {
    if (!this.reaccion && Math.random() < 0.4) this.reaccion = { tipo: 'rabieta', t: 0, dur: 0.8 };
  }

  /** What it is doing now, for the automatic checks. */
  get estado() {
    return this.reaccion?.tipo ?? this.acto;
  }

  avanzar(dt: number) {
    this.ta += dt;
    this.lanzando = Math.max(0, this.lanzando - dt);
    if (this.reaccion && (this.reaccion.t += dt) > this.reaccion.dur) this.reaccion = null;
    if (this.ta > this.dur) {
      const otros = ACTOS.filter((a) => a !== this.acto);
      this.acto = otros[Math.floor(Math.random() * otros.length)];
      this.ta = 0;
      this.dur = 3 + Math.random() * 1.4;
    }
  }

  /**
   * One figure: feet at (x, y) in logical pixels, turned `rot`, scaled (sx, sy)
   * (a negative sx faces left). `onda`: how far its top half ripples, melting.
   */
  private figura(ctx: CanvasRenderingContext2D, escala: number, pose: NombrePose, x: number, y: number, sx: number, sy: number, rot = 0, alfa = 1, onda = 0, reloj = 0) {
    const img = this.poses[pose] ?? this.poses.chulo;
    if (!img) return;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.globalAlpha = alfa;
    const X0 = VB.x * U;
    const Y0 = VB.y * U;
    const W = VB.w * U;
    const Hh = VB.h * U;
    if (!onda) ctx.drawImage(img, X0, Y0, W, Hh);
    else {
      const N = 24;
      const fs = img.height / N;
      const fd = Hh / N;
      for (let i = 0; i < N; i++) {
        const dx = onda * Math.sin(i * 0.55 - reloj * 7) * (1 - i / N);
        ctx.drawImage(img, 0, i * fs, img.width, fs + 1, X0 + dx, Y0 + i * fd, W, fd + 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Draws it over the backdrop. `vw`, `H`: the logical screen; `crece`: a little
   * bigger as the round goes on.
   */
  pintar(ctx: CanvasRenderingContext2D, escala: number, vw: number, H: number, reloj: number, crece: number) {
    const k0 = 1 + crece;
    const suelo = H + 40;
    const cx = vw / 2 + Math.sin(reloj * 0.45) * vw * 0.16;
    const r = this.reaccion;
    if (r) {
      const t = r.t;
      if (r.tipo === 'risa') {
        // Convulsing with laughter, leaning back, the laugh echoing out of it.
        const pose: NombrePose = Math.floor(t / 0.15) % 2 ? 'doblado' : 'carcajada';
        const k = k0 * (1.12 + 0.06 * Math.sin(t * 30));
        for (let j = 0; j < 2; j++) {
          const e = (t * 1.6 + j * 0.5) % 1;
          this.figura(ctx, escala, pose, cx, suelo, k * (1 + e * 0.7), k * (1 + e * 0.7), 0, (1 - e) * 0.3);
        }
        const sy = k * (1 + 0.16 * Math.abs(Math.sin(t * 14)));
        this.figura(ctx, escala, pose, cx + Math.sin(t * 50) * 10, suelo, k, sy, -0.06);
      } else {
        // Stamping its feet, squashing with every stamp.
        const pose: NombrePose = Math.floor(t / 0.11) % 2 ? 'pisoton' : 'rabieta';
        const golpe = Math.abs(Math.sin(t * 28));
        this.figura(ctx, escala, pose, cx + Math.sin(t * 60) * 8, suelo, k0 * (1 + 0.14 * golpe), k0 * (1 - 0.18 * golpe));
      }
      return;
    }
    const ta = this.ta;
    const e = Math.max(0, Math.min(1, ta / 0.5, (this.dur - ta) / 0.5));
    const sube = e * e * (3 - 2 * e);
    // Snapping into each new act like a puppet: squash and pop.
    const pop = Math.max(0, 1 - ta / 0.2);
    const px = 1 + 0.35 * pop;
    const py = 1 - 0.25 * pop;
    const tira: NombrePose | null = this.lanzando > 0 ? 'lanzar' : null;
    switch (this.acto) {
      case 'paseo': {
        // A jerky puppet dance, turning round at every step.
        const paso = Math.floor(reloj / 0.42);
        const pose: NombrePose = tira ?? (paso % 2 ? 'burla' : 'baile');
        const lado = paso % 4 < 2 ? 1 : -1;
        this.figura(ctx, escala, pose, cx + Math.sin(reloj * 2.4) * 60, suelo, k0 * px * lado, k0 * py * (1 + 0.06 * Math.sin(reloj * 15)), Math.sin(reloj * 4.8) * 0.12);
        break;
      }
      case 'gigante': {
        // Grows past the top of the screen and leans over the page.
        const k = k0 * (1 + 0.55 * sube) + 0.02 * Math.sin(reloj * 40) * sube;
        this.figura(ctx, escala, tira ?? 'brazos', cx, suelo + 140 * sube, k * px, k * py, 0.2 * sube);
        break;
      }
      case 'derrite': {
        // Melts, ripples like a flame and pulls itself back together.
        const baja = 0.28 * sube * (0.5 + 0.5 * Math.sin(reloj * 2.2));
        this.figura(ctx, escala, tira ?? 'chulo', cx, suelo, k0 * (1 + 0.25 * sube) * px, k0 * (1 - baja) * py, 0, 1, 80 * sube, reloj);
        break;
      }
      case 'peonza': {
        // Spins like a top, stretching up with every turn.
        const giro = Math.cos(reloj * 10);
        const sx = Math.sign(giro || 1) * Math.max(0.06, Math.abs(giro));
        const pose: NombrePose = giro > 0 ? 'brazos' : 'burla';
        this.figura(ctx, escala, pose, cx, suelo, k0 * (1 - sube + sube * sx) * px, k0 * (1 + 0.3 * sube * (1 - Math.abs(giro))) * py);
        break;
      }
      case 'coro': {
        // Splits into a chorus line of three, kicking out of step.
        const d = vw * 0.24 * sube;
        for (let i = 0; i < 3; i++) {
          const pose: NombrePose = (Math.floor(reloj * 2.6) + i) % 2 ? 'burla' : 'baile';
          const lado = i === 0 ? 1 : i === 2 ? -1 : Math.floor(reloj * 1.3) % 2 ? 1 : -1;
          const k = k0 * (1 - 0.3 * sube);
          this.figura(ctx, escala, pose, vw / 2 + (i - 1) * d, suelo - 30 * Math.abs(Math.sin(reloj * 8 + i * 2)) * sube, k * lado * px, k * py);
        }
        break;
      }
      case 'colgado': {
        // Hangs upside down from the flies, swinging, and drops back down.
        const pie = 30 - (1 - sube) * 1000;
        this.figura(ctx, escala, 'burla', cx, pie, k0 * 0.9 * px, k0 * 0.9 * py, Math.PI + 0.35 * Math.sin(reloj * 2.2));
        break;
      }
      case 'reverencia': {
        // A long, mocking bow, stretched sideways like taffy.
        const k = k0 * (1 + 0.04 * Math.sin(reloj * 6));
        this.figura(ctx, escala, tira ?? 'reverencia', cx, suelo, k * (1 + 0.45 * sube) * px * (Math.sin(reloj * 0.45) > 0 ? -1 : 1), k * (1 - 0.12 * sube) * py);
        break;
      }
    }
  }
}
