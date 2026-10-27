// The juice of «Una más»: particles, the foam arc of the jarrazo, hit-stop, screen shake, flashes. Everything is drawn from a few baked glow
// sprites and plain fills (no SVG, no filters, no per-frame gradients); the particle pool is capped so a busy fight stays at 60 fps on a phone.

const T = { chispa: 0, espuma: 1, gota: 2, hoja: 3, tri: 4, polvo: 5, onda: 6, tecla: 7, estrella: 8, nota: 9, brasa: 10 } as const;
type Tipo = (typeof T)[keyof typeof T];

interface Part {
  tipo: Tipo;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Gravity (units/s²). */
  g: number;
  /** Air drag per second (0–1). */
  roza: number;
  rot: number;
  vrot: number;
  t: number;
  vida: number;
  tam: number;
  col: string;
  /** Grows (+) or shrinks (−) by this fraction per second. */
  crece: number;
  /** Additive blending. */
  luz: boolean;
}

interface Arco {
  x: number;
  y: number;
  dir: number;
  t: number;
  dur: number;
  esc: number;
  tipo: 'espuma' | 'teclazo';
}

interface Impacto {
  x: number;
  y: number;
  t: number;
  dur: number;
  esc: number;
  rot: number;
  col: 'oro' | 'blanco' | 'rojo' | 'turquesa';
}

const MAX = 320;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- baked sprites

export interface SpritesFx {
  arco: HTMLCanvasElement;
  arcoTeclazo: HTMLCanvasElement;
  impacto: Record<string, HTMLCanvasElement>;
  glow: Record<string, HTMLCanvasElement>;
}

function lienzo(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** The foam crescent: a fan of cream foam with a golden rim, thick in the middle and thin at the tips. 300 px wide, centred on its left edge. */
function bakeArco(cremas: [string, string, string], radio: number): HTMLCanvasElement {
  const W = Math.ceil(radio * 1.4);
  const H = Math.ceil(radio * 2.3);
  const c = lienzo(W, H);
  const x = c.getContext('2d')!;
  const cx = W * 0.12;
  const cy = H / 2;
  const a0 = -1.95;
  const a1 = 0.85;
  x.translate(cx, cy);
  // A crescent: the outer arc forward, the inner arc back, shifted, so the middle is thick.
  const lleno = (r0: number, r1: number, col: string | CanvasGradient) => {
    x.beginPath();
    x.arc(0, 0, r1, a0, a1);
    x.arc(-r1 * 0.34, 0, r0, a1 - 0.05, a0 + 0.05, true);
    x.closePath();
    x.fillStyle = col;
    x.fill();
  };
  const g = x.createRadialGradient(-radio * 0.2, 0, radio * 0.35, 0, 0, radio);
  g.addColorStop(0, cremas[0]);
  g.addColorStop(0.7, cremas[1]);
  g.addColorStop(1, cremas[2]);
  lleno(radio * 0.82, radio, cremas[2]);
  lleno(radio * 0.7, radio * 0.97, g);
  // Bubbles of foam along the edge.
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / 26;
    const r = radio * (0.9 + (i % 3) * 0.035);
    const b = 3 + ((i * 7) % 5) * 1.6;
    x.fillStyle = `rgba(255,250,230,${0.55 + (i % 4) * 0.1})`;
    x.beginPath();
    x.arc(Math.cos(a) * r, Math.sin(a) * r, b, 0, Math.PI * 2);
    x.fill();
  }
  // The golden rim.
  x.globalCompositeOperation = 'source-over';
  x.strokeStyle = cremas[2];
  x.lineWidth = 4;
  x.beginPath();
  x.arc(0, 0, radio * 0.98, a0 + 0.1, a1 - 0.1);
  x.stroke();
  return c;
}

/** A starburst: rays that taper, with a glow in the middle. 128 px. */
function bakeImpacto(col: string, rayos = 10): HTMLCanvasElement {
  const c = lienzo(128, 128);
  const x = c.getContext('2d')!;
  x.translate(64, 64);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 40);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, col);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.beginPath();
  x.arc(0, 0, 40, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#ffffff';
  for (let i = 0; i < rayos; i++) {
    const a = (i / rayos) * Math.PI * 2 + (i % 2) * 0.12;
    const l = i % 2 ? 40 : 62;
    x.save();
    x.rotate(a);
    x.beginPath();
    x.moveTo(6, -4);
    x.lineTo(l, 0);
    x.lineTo(6, 4);
    x.closePath();
    x.fillStyle = i % 2 ? col : '#ffffff';
    x.fill();
    x.restore();
  }
  return c;
}

function bakeGlow(col: string): HTMLCanvasElement {
  const c = lienzo(64, 64);
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return c;
}

let sprites: SpritesFx | null = null;
export function spritesFx(): SpritesFx {
  sprites ??= {
    arco: bakeArco(['#ffffff', '#fff3d0', '#f6c445'], 120),
    arcoTeclazo: bakeArco(['#ffffff', '#c8f6ff', '#46e0d0'], 190),
    impacto: { oro: bakeImpacto('#ffd24a'), blanco: bakeImpacto('#fff6e0'), rojo: bakeImpacto('#ff5a4a'), turquesa: bakeImpacto('#46e0d0') },
    glow: { oro: bakeGlow('#ffcf4a'), blanco: bakeGlow('#ffffff'), turquesa: bakeGlow('#46e0d0'), magenta: bakeGlow('#ff4fa8'), rojo: bakeGlow('#ff5a4a'), violeta: bakeGlow('#9a7cff') },
  };
  return sprites;
}

// ---------------------------------------------------------------- the effects

export class Efectos {
  parts: Part[] = [];
  arcos: Arco[] = [];
  impactos: Impacto[] = [];
  /** Seconds of hit-stop left (the world holds still). */
  paron = 0;
  /** Shake amplitude (logical px), decaying. */
  temblor = 0;
  /** A whole-screen flash: colour and strength. */
  flash = 0;
  flashCol = '#ffffff';
  /** A camera punch (zoom), 0–1. */
  zoom = 0;
  /** The red edge of the screen after a hit. */
  dano = 0;
  /** Slow motion factor (1 = normal) and for how long. */
  lento = 1;
  lentoT = 0;
  private sp = spritesFx();

  limpiar() {
    this.parts.length = 0;
    this.arcos.length = 0;
    this.impactos.length = 0;
  }

  private add(p: Partial<Part> & { tipo: Tipo; x: number; y: number }) {
    if (this.parts.length >= MAX) this.parts.shift();
    this.parts.push({ vx: 0, vy: 0, g: 0, roza: 0, rot: 0, vrot: 0, t: 0, vida: 0.6, tam: 4, col: '#fff', crece: 0, luz: false, ...p });
  }

  // ---- shake and stop
  sacudir(a: number) {
    this.temblor = Math.max(this.temblor, a);
  }
  parar(s: number) {
    this.paron = Math.max(this.paron, s);
  }
  destello(a: number, col = '#ffffff') {
    this.flash = Math.max(this.flash, a);
    this.flashCol = col;
  }
  camaraLenta(f: number, s: number) {
    this.lento = f;
    this.lentoT = s;
  }

  // ---- bursts
  chispas(x: number, y: number, n: number, dir: number, vel = 380, col = '#ffd24a', abanico = 1.9) {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(-0.35, dir) + rnd(-abanico / 2, abanico / 2);
      const v = rnd(vel * 0.35, vel);
      this.add({ tipo: T.chispa, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, roza: 1.6, vida: rnd(0.25, 0.6), tam: rnd(3, 6.5), col, luz: true, crece: -0.9 });
    }
  }

  espuma(x: number, y: number, n: number, dir: number, vel = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(-0.8, dir) + rnd(-1.1, 1.1);
      const v = rnd(vel * 0.3, vel);
      this.add({ tipo: T.espuma, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 500, roza: 1.2, vida: rnd(0.35, 0.8), tam: rnd(3, 8), col: '#fff6e0', crece: -0.5 });
    }
  }

  gotas(x: number, y: number, n: number, dir: number, vel = 340, col = '#f0a21e') {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(-1, dir * 0.6) + rnd(-1.0, 1.0);
      const v = rnd(vel * 0.4, vel);
      this.add({ tipo: T.gota, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1500, roza: 0.4, vida: rnd(0.5, 0.9), tam: rnd(3, 6), col });
    }
  }

  polvo(x: number, y: number, n: number, ancho = 20, col = 'rgba(220,190,255,0.5)') {
    for (let i = 0; i < n; i++) this.add({ tipo: T.polvo, x: x + rnd(-ancho, ancho), y: y - rnd(0, 4), vx: rnd(-70, 70), vy: rnd(-50, -8), roza: 2, vida: rnd(0.3, 0.55), tam: rnd(5, 10), col, crece: 1.4 });
  }

  onda(x: number, y: number, tam = 8, col = '#fff6e0', crece = 7, vida = 0.35) {
    this.add({ tipo: T.onda, x, y, vida, tam, col, crece, luz: true });
  }

  hojas(x: number, y: number, n: number, dir = 0, col = ['#46e0d0', '#a8ff4a', '#2fb89a']) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const v = rnd(80, 320);
      this.add({ tipo: Math.random() < 0.35 ? T.tri : T.hoja, x, y, vx: Math.cos(a) * v + dir * 120, vy: Math.sin(a) * v - 60, g: 160, roza: 1.3, rot: rnd(0, 6), vrot: rnd(-9, 9), vida: rnd(0.6, 1.2), tam: rnd(5, 10), col: col[(Math.random() * col.length) | 0] });
    }
  }

  estrellas(x: number, y: number, n: number, col = '#ffe9a8') {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const v = rnd(60, 260);
      this.add({ tipo: T.estrella, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 120, roza: 1.2, rot: rnd(0, 3), vrot: rnd(-4, 4), vida: rnd(0.5, 1.1), tam: rnd(5, 10), col, luz: true, crece: -0.5 });
    }
  }

  teclas(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = rnd(-Math.PI, 0);
      const v = rnd(140, 480);
      this.add({ tipo: T.tecla, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1300, roza: 0.3, rot: rnd(0, 6), vrot: rnd(-12, 12), vida: rnd(0.7, 1.3), tam: rnd(6, 10), col: '#f4f1ff' });
    }
  }

  brasas(x: number, y: number, ancho: number, col = '#ffd95a') {
    this.add({ tipo: T.brasa, x: x + rnd(-ancho, ancho), y, vx: rnd(-14, 14), vy: rnd(-90, -40), roza: 0.3, vida: rnd(0.8, 1.5), tam: rnd(2.5, 5), col, luz: true, crece: -0.4 });
  }

  // ---- the big moments
  /** The jarrazo lands: a starburst, golden sparks, foam and splash. */
  golpe(x: number, y: number, dir: number, fuerte = false) {
    this.impactos.push({ x, y, t: 0, dur: fuerte ? 0.26 : 0.18, esc: fuerte ? 1.7 : 1.05, rot: rnd(0, 3), col: 'oro' });
    this.chispas(x, y, fuerte ? 26 : 14, dir, fuerte ? 560 : 420);
    this.espuma(x, y, fuerte ? 12 : 7, dir);
    this.gotas(x, y, fuerte ? 12 : 6, dir);
    this.onda(x, y, 10, '#ffe9a8', fuerte ? 12 : 8, 0.28);
    this.sacudir(fuerte ? 9 : 4.5);
    this.parar(fuerte ? 0.12 : 0.065);
    this.zoom = Math.max(this.zoom, fuerte ? 0.9 : 0.4);
  }

  /** Fran is hurt: red flash, beer splash, a hard stop. */
  danoJugador(x: number, y: number, dir: number) {
    this.impactos.push({ x, y, t: 0, dur: 0.22, esc: 1.4, rot: rnd(0, 3), col: 'rojo' });
    this.gotas(x, y, 14, dir, 480);
    this.espuma(x, y, 8, dir, 320);
    this.chispas(x, y, 8, dir, 360, '#ff7a6a');
    this.sacudir(10);
    this.parar(0.11);
    this.destello(0.35, '#ff3a3a');
    this.dano = 1;
    this.zoom = Math.max(this.zoom, 0.7);
  }

  /** An enemy bursts: a ring, sparks of its own colour, bits flying. */
  muerteEnemigo(x: number, y: number, col: string, grande = false) {
    const k = grande ? 2.4 : 1;
    this.impactos.push({ x, y, t: 0, dur: 0.3 * Math.sqrt(k), esc: 1.5 * k, rot: rnd(0, 3), col: 'blanco' });
    this.onda(x, y, 12 * k, '#ffffff', 11 * k, 0.4);
    this.onda(x, y, 6 * k, col, 15 * k, 0.5);
    this.chispas(x, y, Math.round(26 * k), 0, 520 * Math.sqrt(k), col, Math.PI * 2);
    this.chispas(x, y, Math.round(16 * k), 0, 380 * Math.sqrt(k), '#ffe9a8', Math.PI * 2);
    this.estrellas(x, y, Math.round(8 * k), '#fff6d0');
    this.gotas(x, y, Math.round(10 * k), 0, 420, col);
    this.polvo(x, y + 4, 8, 20 * k);
    this.sacudir(8 * Math.sqrt(k));
    this.parar(0.1 * Math.sqrt(k));
    this.destello(0.18 * k, '#fff6e0');
  }

  /** Cierzo: a gust under the feet, leaves and triangles flying. */
  cierzo(x: number, y: number) {
    this.hojas(x, y, 18);
    this.onda(x, y + 6, 10, '#9ff0ec', 11, 0.38);
    this.onda(x, y + 14, 6, '#ffffff', 14, 0.3);
    this.polvo(x, y + 10, 6, 14, 'rgba(180,255,244,0.55)');
    this.zoom = Math.max(this.zoom, 0.25);
  }

  /** A bar saves the game: golden bubbles rise. */
  barra(x: number, y: number) {
    for (let i = 0; i < 26; i++) this.brasas(x, y - rnd(0, 40), 50, i % 3 ? '#ffd95a' : '#fff6e0');
    this.espuma(x, y - 70, 10, 0, 200);
    this.onda(x, y - 50, 8, '#ffd95a', 12, 0.6);
    this.destello(0.12, '#ffd95a');
  }

  /** Guille is free: petals, stars, a golden burst. */
  rescate(x: number, y: number) {
    this.hojas(x, y, 28, 0, ['#ff4fa8', '#ff7ab8', '#ffd23a', '#46e0d0']);
    this.estrellas(x, y, 22, '#fff2b8');
    this.chispas(x, y, 40, 0, 560, '#ffd24a', Math.PI * 2);
    this.onda(x, y, 14, '#ffd95a', 16, 0.8);
    this.onda(x, y, 8, '#ffffff', 22, 0.6);
    this.destello(0.5, '#fff2b8');
    this.sacudir(7);
  }

  // ---- the arc
  arco(x: number, y: number, dir: number, esc = 1, tipo: Arco['tipo'] = 'espuma') {
    this.arcos.push({ x, y, dir, t: 0, dur: tipo === 'teclazo' ? 0.3 : 0.22, esc, tipo });
  }

  // ---- update and draw
  actualizar(dt: number) {
    // Hit-stop is counted in real time and held by the caller; the rest of the effects keep going.
    this.temblor = Math.max(0, this.temblor - dt * 38);
    this.flash = Math.max(0, this.flash - dt * 3.2);
    this.zoom = Math.max(0, this.zoom - dt * 3.4);
    this.dano = Math.max(0, this.dano - dt * 1.8);
    if (this.lentoT > 0) {
      this.lentoT -= dt;
      if (this.lentoT <= 0) this.lento = 1;
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      if (p.t >= p.vida) {
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      const k = Math.max(0, 1 - p.roza * dt);
      p.vx *= k;
      p.vy *= p.tipo === T.gota ? 1 : k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
    for (let i = this.arcos.length - 1; i >= 0; i--) {
      const a = this.arcos[i];
      a.t += dt;
      if (a.t >= a.dur) this.arcos.splice(i, 1);
    }
    for (let i = this.impactos.length - 1; i >= 0; i--) {
      const a = this.impactos[i];
      a.t += dt;
      if (a.t >= a.dur) this.impactos.splice(i, 1);
    }
  }

  /** Where the sweep of the arc is now (for the sparks that ride along it). */
  puntoArco(a: { x: number; y: number; dir: number; t: number; dur: number; esc: number }, k: number): [number, number] {
    const r = 112 * a.esc;
    const ang = -1.95 + 2.8 * k;
    return [a.x + a.dir * (Math.cos(ang) * r - r * 0.17), a.y + Math.sin(ang) * r];
  }

  /** The world-space layer: arcs, impacts and particles. The context is already moved to the camera. */
  dibujar(ctx: CanvasRenderingContext2D, t: number) {
    const sp = this.sp;
    // Arcs
    for (const a of this.arcos) {
      const k = a.t / a.dur;
      const rev = Math.min(1, k * 2.4);
      const img = a.tipo === 'teclazo' ? sp.arcoTeclazo : sp.arco;
      const esc = a.esc * (a.tipo === 'teclazo' ? 0.55 : 0.7) * (0.88 + 0.22 * k);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.scale(a.dir, 1);
      // Reveal the crescent with a wedge that sweeps (the clip is a pie in the arc's own frame).
      const cx = img.width * 0.12 * esc;
      const R = img.width * esc * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -2.05, -2.05 + 2.95 * rev);
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = Math.min(0.78, (1 - k) * 2);
      ctx.drawImage(img, -cx, -img.height * 0.5 * esc, img.width * esc, img.height * esc);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= 0.2;
      ctx.drawImage(img, -cx, -img.height * 0.5 * esc, img.width * esc, img.height * esc);
      ctx.restore();
      // sparks along the edge
      if (Math.random() < 0.85 && rev < 1) {
        const [px, py] = this.puntoArco(a, rev);
        this.add({ tipo: T.chispa, x: px, y: py, vx: a.dir * rnd(-40, 160), vy: rnd(-120, 40), g: 500, roza: 2, vida: rnd(0.2, 0.4), tam: rnd(2.5, 5), col: a.tipo === 'teclazo' ? '#9ff0ec' : '#ffd24a', luz: true, crece: -1 });
      }
    }
    // Impacts
    ctx.globalCompositeOperation = 'lighter';
    for (const i of this.impactos) {
      const k = i.t / i.dur;
      const s = i.esc * (0.5 + 1.0 * Math.sqrt(k)) * 64;
      ctx.globalAlpha = (1 - k) * (1 - k) * 1.2;
      ctx.save();
      ctx.translate(i.x, i.y);
      ctx.rotate(i.rot + k * 0.5);
      ctx.drawImage(sp.impacto[i.col], -s, -s, s * 2, s * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Particles: ordinary ones first, additive ones after (one blend switch).
    for (let pass = 0; pass < 2; pass++) {
      const luz = pass === 1;
      if (luz) ctx.globalCompositeOperation = 'lighter';
      for (const p of this.parts) {
        if (p.luz !== luz) continue;
        const k = p.t / p.vida;
        const al = Math.min(1, (1 - k) * 2);
        const s = Math.max(0.5, p.tam * (1 + p.crece * p.t));
        ctx.globalAlpha = al;
        switch (p.tipo) {
          case T.chispa: {
            const gl = sp.glow.oro;
            const w = s * 3.2;
            ctx.drawImage(gl, p.x - w, p.y - w, w * 2, w * 2);
            ctx.fillStyle = p.col;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(p.vy, p.vx));
            ctx.fillRect(-s * 1.8, -s * 0.28, s * 3.6, s * 0.56);
            ctx.restore();
            break;
          }
          case T.espuma:
            ctx.fillStyle = p.col;
            ctx.beginPath();
            ctx.arc(p.x, p.y, s, 0, 6.3);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(p.x - s * 0.5, p.y - s * 0.55, s * 0.5, s * 0.4);
            break;
          case T.gota:
            ctx.fillStyle = p.col;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(p.vy, p.vx));
            ctx.beginPath();
            ctx.ellipse(0, 0, s * 1.5, s * 0.8, 0, 0, 6.3);
            ctx.fill();
            ctx.restore();
            break;
          case T.hoja:
          case T.tri: {
            ctx.fillStyle = p.col;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(1, Math.abs(Math.cos(p.rot * 1.7)) * 0.8 + 0.2);
            ctx.beginPath();
            if (p.tipo === T.hoja) {
              ctx.moveTo(-s * 1.4, 0);
              ctx.quadraticCurveTo(0, -s * 1.1, s * 1.4, 0);
              ctx.quadraticCurveTo(0, s * 1.1, -s * 1.4, 0);
            } else {
              ctx.moveTo(0, -s * 1.3);
              ctx.lineTo(s * 1.2, s);
              ctx.lineTo(-s * 1.2, s);
            }
            ctx.fill();
            ctx.restore();
            break;
          }
          case T.polvo:
            ctx.fillStyle = p.col;
            ctx.beginPath();
            ctx.arc(p.x, p.y, s, 0, 6.3);
            ctx.fill();
            break;
          case T.onda:
            ctx.strokeStyle = p.col;
            ctx.lineWidth = Math.max(1, 5 * (1 - k));
            ctx.beginPath();
            ctx.arc(p.x, p.y, s, 0, 6.3);
            ctx.stroke();
            break;
          case T.tecla:
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = '#2a1250';
            ctx.fillRect(-s * 0.55, -s * 0.5, s * 1.3, s * 1.3);
            ctx.fillStyle = p.col;
            ctx.fillRect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2);
            ctx.fillStyle = '#d4cdf0';
            ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
            ctx.restore();
            break;
          case T.estrella:
            ctx.fillStyle = p.col;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const r = i % 2 ? s * 0.35 : s;
              const a = (i / 8) * Math.PI * 2;
              ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;
          case T.brasa: {
            const w = s * 2.6;
            ctx.drawImage(sp.glow.oro, p.x - w, p.y - w, w * 2, w * 2);
            break;
          }
          default:
            break;
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    void t;
  }
}
