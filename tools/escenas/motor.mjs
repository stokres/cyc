// Scene runtime for the scene sheet (and, later, the game): bakes the SVG layers
// into canvases once (albedo x light map + emissive), then each frame draws them
// with parallax. The ground uses a shear so it behaves like a real floor in
// perspective. Characters live in an SVG between the back and front canvases.
import { Rig } from '../personajes/rig-runtime.mjs';
import * as fran from '../personajes/fran.mjs';
import * as aceituna from './aceituna.mjs';
import { VIVO } from './vivo.mjs';

const NS = 'http://www.w3.org/2000/svg';
const H = 1080;
const TILE = 1400;

const hexRGB = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const cssRGB = (c, k = 1, a = 1) => {
  const f = (v) => Math.round(Math.max(0, Math.min(1, v * k)) * 255);
  return a >= 1 ? `rgb(${f(c[0])},${f(c[1])},${f(c[2])})` : `rgba(${f(c[0])},${f(c[1])},${f(c[2])},${a})`;
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

async function raster(body, x, y, w, h, px) {
  const W = Math.max(1, Math.round(w * px));
  const Hh = Math.max(1, Math.round(h * px));
  const svg = `<svg xmlns="${NS}" width="${W}" height="${Hh}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none">${body}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = canvas(W, Hh);
    c.getContext('2d').drawImage(img, 0, 0, W, Hh);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pool(ctx, x, y, rx, ry, color, power) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, cssRGB(color, power));
  g.addColorStop(0.3, cssRGB(color, power * 0.83));
  g.addColorStop(0.55, cssRGB(color, power * 0.48));
  g.addColorStop(0.8, cssRGB(color, power * 0.13));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

function glow(ctx, x, y, r, color, a) {
  const c = hexRGB(color);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, cssRGB(c, 1, a));
  g.addColorStop(0.25, cssRGB(c, 1, a * 0.45));
  g.addColorStop(1, cssRGB(c, 1, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const FONTS = {
  display: "'Graduate', 'Rockwell', Georgia, serif",
  body: "'Alegreya Sans', 'Trebuchet MS', 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', 'DejaVu Serif', serif",
};

/** Sign lettering is drawn with the page fonts (SVG images cannot load web fonts). */
function drawTexts(ctx, texts, x0, y0, px, emissive) {
  ctx.save();
  ctx.setTransform(px, 0, 0, px, -x0 * px, -y0 * px);
  for (const t of texts) {
    if (!!t.emissive !== emissive) continue;
    ctx.save();
    ctx.translate(t.x, t.y);
    if (t.rot) ctx.rotate(t.rot);
    if (t.sx) ctx.scale(t.sx, 1);
    ctx.font = `${t.weight ?? 400} ${t.size}px ${FONTS[t.font ?? 'body']}`;
    ctx.textAlign = t.align ?? 'center';
    ctx.textBaseline = 'middle';
    if (t.spacing) ctx.letterSpacing = t.spacing + 'px';
    const w = ctx.measureText(t.s).width;
    if (t.maxW && w > t.maxW) ctx.scale(t.maxW / w, 1);
    if (t.glow) {
      ctx.shadowColor = t.glow;
      ctx.shadowBlur = t.blur ?? 14;
    }
    if (t.stroke) {
      ctx.lineWidth = t.strokeW ?? 4;
      ctx.strokeStyle = t.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(t.s, 0, 0);
    }
    ctx.fillStyle = t.color;
    ctx.fillText(t.s, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/** Walls that run away from the camera (side streets): textured, drawn in strips. */
async function bakeLateral(S, Lw, px) {
  const q = px * (Lw.res ?? 0.6);
  const w = Lw.len * S.M;
  const h = Lw.h * S.M;
  const c = await raster(Lw.body, 0, -h, w, h, q);
  const ctx = c.getContext('2d');
  if (Lw.texts) drawTexts(ctx, Lw.texts, 0, -h, q, false);
  // Night light: ambient, a little more towards the street mouth.
  const lm = canvas(c.width, c.height);
  const lx = lm.getContext('2d');
  const gr = lx.createLinearGradient(Lw.face > 0 ? 0 : c.width, 0, Lw.face > 0 ? c.width : 0, 0);
  gr.addColorStop(0, cssRGB(hexRGB(Lw.near ?? S.ambient)));
  gr.addColorStop(1, cssRGB(hexRGB(Lw.far ?? S.ambient)));
  lx.fillStyle = gr;
  lx.fillRect(0, 0, c.width, c.height);
  lx.setTransform(q, 0, 0, q, 0, h * q);
  lx.globalCompositeOperation = 'lighter';
  for (const l of Lw.lights ?? []) pool(lx, l.x, l.y, l.r, l.r * (l.flat ?? 1), hexRGB(l.color), l.power);
  const alpha = canvas(c.width, c.height);
  alpha.getContext('2d').drawImage(c, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lm, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(alpha, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  if (Lw.emissive) ctx.drawImage(await raster(Lw.emissive, 0, -h, w, h, q), 0, 0);
  if (Lw.texts) drawTexts(ctx, Lw.texts, 0, -h, q, true);
  return { ...Lw, body: undefined, emissive: undefined, c, q };
}

/** Scene geometry helpers shared by baking, drawing and characters. */
function geo(S) {
  const f = (y) => (y - S.HOR) / (S.BASE - S.HOR);
  return { f, yOf: (k) => S.HOR + (S.BASE - S.HOR) * k };
}

async function bakeScene(S, px, onProgress) {
  const G = geo(S);
  const out = [];
  const amb = hexRGB(S.ambient);
  const lights = S.lights.map((l) => ({ ...l, c: hexRGB(l.color) }));
  let done = 0;
  const total = S.layers.reduce((n, L) => n + (L.pieces ? L.pieces.length : Math.ceil((L.x1 - L.x0) / TILE)), 0) + (S.laterals?.length ?? 0);
  for (const L of S.layers) {
    const pieces = L.pieces
      ? L.pieces.map((p) => ({ ...p, body: p.body }))
      : Array.from({ length: Math.ceil((L.x1 - L.x0) / TILE) }, (_, i) => ({ x0: L.x0 + i * TILE - (i ? 6 : 0), x1: Math.min(L.x1, L.x0 + (i + 1) * TILE + 6), y0: L.y0, y1: L.y1, body: L.body }));
    const baked = [];
    for (const p of pieces) {
      const w = p.x1 - p.x0;
      const h = p.y1 - p.y0;
      const c = await raster(p.body, p.x0, p.y0, w, h, px);
      const ctx = c.getContext('2d');
      if (L.texts) drawTexts(ctx, L.texts, p.x0, p.y0, px, false);
      if (L.lit) {
        // Light map in this layer's own coordinates, multiplied over the albedo.
        const lm = canvas(c.width, c.height);
        const lx = lm.getContext('2d');
        lx.setTransform(px, 0, 0, px, -p.x0 * px, -p.y0 * px);
        lx.fillStyle = cssRGB(L.ambient ? hexRGB(L.ambient) : amb);
        lx.fillRect(p.x0, p.y0, w, h);
        lx.globalCompositeOperation = 'lighter';
        const use = L.lights === false ? [] : lights;
        for (const l of use) {
          if (L.floor) {
            const k = G.f(l.fy ?? Math.max(S.BASE + 20, l.y));
            pool(lx, S.CX + k * (l.X - S.CX), l.fy ?? S.BASE + 20, l.r * k, l.r * (l.flat ?? 0.42), l.c, l.power * 1.1);
          } else {
            const k = L.k ?? 1;
            pool(lx, S.CX + k * (l.X - S.CX), l.y, l.r * k, l.r * k, l.c, l.power);
          }
        }
        if (L.floor) {
          for (const s of S.shafts ?? []) {
            const gp = (X, k) => [S.CX + k * (X - S.CX), G.yOf(k)];
            const pts = [gp(s.X0, 1), gp(s.X1, 1), gp(s.X1 + s.dX, s.k1), gp(s.X0 + s.dX, s.k1)];
            const gr = lx.createLinearGradient(0, S.BASE, 0, G.yOf(s.k1));
            const sc = hexRGB(s.color);
            gr.addColorStop(0, cssRGB(sc, s.power));
            gr.addColorStop(1, cssRGB(sc, s.power * 0.15));
            lx.fillStyle = gr;
            lx.beginPath();
            pts.forEach(([x, y], i) => (i ? lx.lineTo(x, y) : lx.moveTo(x, y)));
            lx.closePath();
            lx.fill();
          }
        }
        const alpha = canvas(c.width, c.height);
        alpha.getContext('2d').drawImage(c, 0, 0);
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(lm, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(alpha, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
      const emissive = p.emissive ?? L.emissive;
      if (emissive) ctx.drawImage(await raster(emissive, p.x0, p.y0, w, h, px), 0, 0);
      if (L.texts) drawTexts(ctx, L.texts, p.x0, p.y0, px, true);
      if (L.glows) {
        ctx.save();
        ctx.setTransform(px, 0, 0, px, -p.x0 * px, -p.y0 * px);
        ctx.globalCompositeOperation = 'lighter';
        for (const gl of L.glows) glow(ctx, gl.x, gl.y, gl.r, gl.color, gl.a);
        ctx.restore();
      }
      baked.push({ c, x0: p.x0, y0: p.y0, w, h });
      onProgress?.(++done / total);
    }
    out.push({ ...L, body: undefined, pieces: baked });
  }
  out.laterals = [];
  for (const Lw of S.laterals ?? []) out.laterals.push(await bakeLateral(S, Lw, px));
  return out;
}

// ---------------------------------------------------------------- actors

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
}

class Actor {
  constructor(svg, defs, id, art, { shadow = [46, 9] } = {}) {
    this.id = id;
    this.wrap = el('g', {}, svg);
    this.shadow = el('ellipse', { cx: 0, cy: 0, rx: shadow[0], ry: shadow[1], fill: '#120c10', opacity: 0.32 }, this.wrap);
    const f = el('filter', { id: 'luz-' + id, 'color-interpolation-filters': 'sRGB', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    this.cm = el('feColorMatrix', { type: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0' }, f);
    this.flip = el('g', {}, this.wrap);
    this.inner = el('g', { filter: `url(#luz-${id})` }, this.flip);
    this.inner.innerHTML = art;
    this.X = 0;
    this.y = 900;
    this.face = 1;
    this.tint = [1, 1, 1];
    this.visible = true;
  }
  setTint(t) {
    if (Math.abs(t[0] - this.tint[0]) + Math.abs(t[1] - this.tint[1]) + Math.abs(t[2] - this.tint[2]) < 0.01) return;
    this.tint = t;
    this.cm.setAttribute('values', `${t[0].toFixed(3)} 0 0 0 0 0 ${t[1].toFixed(3)} 0 0 0 0 0 ${t[2].toFixed(3)} 0 0 0 0 0 1 0`);
  }
}

// ---------------------------------------------------------------- engine

export class Motor {
  constructor(root, scenes) {
    this.root = root;
    this.scenes = scenes;
    this.back = canvas(1, 1);
    this.back.className = 'capa';
    this.svg = el('svg', { class: 'capa', preserveAspectRatio: 'none' });
    this.defs = el('defs', {}, this.svg);
    this.world = el('g', {}, this.svg);
    this.front = canvas(1, 1);
    this.front.className = 'capa';
    this.fx = document.createElement('div');
    this.fx.className = 'fx';
    root.append(this.back, this.svg, this.front, this.fx);
    this.bctx = this.back.getContext('2d');
    this.fctx = this.front.getContext('2d');
    this.baked = {};
    this.hidden = new Set();
    this.cam = 0;
    this.t = 0;
    this.state = 'dormido';
    this.bubbles = [];
    this.quality = matchMedia('(pointer: coarse)').matches ? 0.75 : 1;
    this.listeners = {};
    // Actors.
    this.fran = new Actor(this.world, this.defs, 'fran', fran.body(), { shadow: [44, 9] });
    this.franRig = new Rig(this.fran.inner.querySelector('#personaje'), fran, { seed: 1 });
    this.perro = new Actor(this.world, this.defs, 'perro', aceituna.body(), { shadow: [44, 7] });
    this.perroRig = new aceituna.Perro(this.perro.inner.querySelector('#perro'));
    this.props = [];
    this.propCache = {};
    this.target = null;
    this.onArrive = null;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(root);
    this.bindInput();
  }

  on(ev, fn) {
    (this.listeners[ev] ??= []).push(fn);
  }
  emit(ev, ...a) {
    for (const fn of this.listeners[ev] ?? []) fn(...a);
  }

  resize() {
    const r = this.root.getBoundingClientRect();
    this.cssW = Math.max(1, r.width);
    this.cssH = Math.max(1, r.height);
    this.vw = (this.cssW / this.cssH) * H;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.min(this.cssH * dpr * this.quality, H) / H;
    for (const c of [this.back, this.front]) {
      c.width = Math.round(this.vw * px);
      c.height = Math.round(H * px);
    }
    this.svg.setAttribute('viewBox', `0 0 ${this.vw.toFixed(1)} ${H}`);
    if (this.px && Math.abs(px - this.px) / this.px > 0.2 && this.scene) {
      this.px = px;
      this.baked = {};
      this.load(this.scene.id, { keep: true });
    }
    this.px = px;
  }

  async load(id, { keep = false, onProgress } = {}) {
    const S = this.scenes[id];
    this.loading = true;
    if (!this.baked[id]) this.baked[id] = await bakeScene(S, this.px, onProgress);
    this.scene = S;
    this.layers = this.baked[id];
    this.G = geo(S);
    this.lights = S.lights.map((l) => ({ ...l, c: hexRGB(l.color) }));
    this.amb = hexRGB(S.ambient);
    const inPiso = id === 'piso';
    this.perro.wrap.style.display = inPiso ? '' : 'none';
    // Floor props (dog bed, terrace tables...) live among the characters, sorted by depth.
    for (const p of this.props) p.wrap.style.display = 'none';
    this.props = (this.propCache[id] ??= (S.props ?? []).map((d) => Object.assign(new Actor(this.world, this.defs, `${id}-${d.id}`, d.svg, { shadow: d.shadow ?? [0, 0] }), { X: d.X, y: d.y, z: d.z ?? 0, face: d.face ?? 1 })));
    for (const p of this.props) p.wrap.style.display = '';
    if (!keep) {
      if (inPiso) this.resetPiso();
      else {
        Object.assign(this.fran, { X: S.start.X, y: S.start.y, face: 1 });
        this.state = 'libre';
        this.cam = clamp(this.fran.X, this.vw / 2, S.W - this.vw / 2);
      }
    }
    this.loading = false;
    this.emit('scene', S);
  }

  resetPiso() {
    const S = this.scenes.piso;
    this.state = 'dormido';
    this.wakeT = 0;
    this.target = null;
    Object.assign(this.perro, { X: S.spots.cama.X + 4, y: S.spots.cama.y + 2, face: -1 });
    this.perroRig.mode = 'lie';
    this.perroState = 'durmiendo';
    Object.assign(this.fran, { X: S.start.X, y: S.start.y, face: 1 });
    this.cam = clamp(1880, this.vw / 2, S.W - this.vw / 2);
    this.emit('hint', 'Toca para despertar a Fran');
  }

  // -------------------------------------------------------------- input

  bindInput() {
    let down = null;
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.ui')) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    this.root.addEventListener('pointerup', (e) => {
      if (!down || e.target.closest('.ui')) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 14 || this.loading) return;
      const r = this.root.getBoundingClientRect();
      this.tap(((e.clientX - r.left) / this.cssW) * this.vw, ((e.clientY - r.top) / this.cssH) * H);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (this.state === 'dormido') return this.wake();
        const d = e.key === 'ArrowLeft' ? -1 : 1;
        this.walkTo(this.fran.X + d * 300, this.fran.y);
      }
    });
  }

  screenX(X, k) {
    return this.vw / 2 + k * (X - this.cam);
  }

  tap(sx, sy) {
    const S = this.scene;
    if (!S) return;
    if (this.state === 'dormido') return this.wake();
    if (this.state !== 'libre') return;
    // Exits and hotspots on the back plane.
    for (const [key, sp] of Object.entries(S.spots)) {
      if (!sp.label) continue;
      const x = this.screenX(sp.X, 1);
      if (Math.abs(sx - x) < (sp.w ?? 130) && sy > (sp.top ?? 230) && sy < 830) {
        this.walkTo(sp.X, sp.y, () => this.emit('spot', key, sp));
        return;
      }
    }
    const y = sy > S.BASE ? clamp(sy, S.walk.y0, S.walk.y1) : this.fran.y;
    const k = this.G.f(y);
    this.walkTo(this.cam + (sx - this.vw / 2) / k, y);
  }

  walkTo(X, y, then = null) {
    const S = this.scene;
    this.target = { X: clamp(X, S.walk.x0, S.walk.x1), y: clamp(y, S.walk.y0, S.walk.y1) };
    this.onArrive = then;
  }

  wake() {
    if (this.state !== 'dormido') return;
    this.state = 'despertando';
    this.wakeT = 0;
    this.emit('hint', '');
  }

  // -------------------------------------------------------------- frame

  tintAt(X, y) {
    let c = [...this.amb];
    for (const l of this.lights) {
      const dx = (X - l.X) / l.r;
      const dy = (y - l.y) / l.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= 1) continue;
      const f = (1 - d2) * (1 - d2) * l.power;
      c = [c[0] + l.c[0] * f, c[1] + l.c[1] * f, c[2] + l.c[2] * f];
    }
    const gr = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
    const m = c.map((v) => v + (gr - v) * 0.45);
    return [Math.min(1.3, m[0] * 1.1 + 0.06), Math.min(1.3, m[1] * 1.1 + 0.06), Math.min(1.3, m[2] * 1.1 + 0.07)];
  }

  update(dt) {
    const S = this.scene;
    if (!S) return;
    this.t += dt;
    const F = this.fran;
    const charS = (S.M * 1.75) / 270;
    // Fran.
    if (this.state === 'despertando') {
      this.wakeT += dt;
      if (this.wakeT > 1.1) {
        this.state = 'libre';
        this.emit('awake');
      }
    }
    let moving = false;
    if (this.target && this.state === 'libre') {
      const dx = this.target.X - F.X;
      const dy = this.target.y - F.y;
      const dist = Math.hypot(dx, dy * 2);
      if (dist < 6) {
        this.target = null;
        const cb = this.onArrive;
        this.onArrive = null;
        cb?.();
      } else {
        const sp = (S.speed ?? 250) * dt;
        const k = Math.min(1, sp / dist);
        F.X += dx * k;
        F.y += dy * k * 0.6;
        if (Math.abs(dx) > 2) F.face = dx > 0 ? 1 : -1;
        moving = true;
      }
    }
    this.franRig.mode = moving ? 'walk' : 'idle';
    this.franRig.eyesClosed = this.state === 'dormido';
    // Camera follows Fran (the sofa while he sleeps).
    const focus = this.state === 'dormido' ? 1880 : F.X + F.face * 120;
    const lo = Math.min(this.vw / 2, S.W / 2);
    const hi = Math.max(S.W - this.vw / 2, S.W / 2);
    const goal = clamp(focus, lo, hi);
    this.cam += (goal - this.cam) * (1 - Math.exp(-dt * 3));
    this.cam = clamp(this.cam, lo, hi);
    // Aceituna.
    if (S.id === 'piso') this.updateDog(dt, moving);
    this.franRig.update(this.t, dt);
    this.perroRig.update(this.t, dt);
    this.place(F, charS);
    for (const a of [this.perro, ...this.props]) this.place(a, charS);
    // Depth order.
    const order = [F, this.perro, ...this.props].filter((a) => a.wrap.style.display !== 'none').sort((a, b) => a.y + (a.z ?? 0) - (b.y + (b.z ?? 0)));
    let prev = null;
    for (const a of order) {
      if (prev ? prev.wrap.nextSibling !== a.wrap : this.world.firstChild !== a.wrap) this.world.insertBefore(a.wrap, prev ? prev.wrap.nextSibling : this.world.firstChild);
      prev = a;
    }
  }

  updateDog(dt, franMoving) {
    const D = this.perro;
    const F = this.fran;
    const R = this.perroRig;
    if (this.perroState === 'durmiendo') {
      if (this.state === 'libre') {
        this.perroState = 'despierta';
        this.dogT = 0.5;
        this.say('¡Guau!', D, 1.4);
      }
      return;
    }
    if (this.perroState === 'despierta') {
      this.dogT -= dt;
      R.mode = 'idle';
      if (this.dogT > 0) return;
      this.perroState = 'sigue';
    }
    // Follow Fran, a little behind and slightly in front of him in depth.
    const gx = F.X - F.face * 150;
    const gy = clamp(F.y + 30, this.scene.walk.y0, this.scene.walk.y1);
    const dx = gx - D.X;
    const dy = gy - D.y;
    const far = Math.hypot(dx, dy) > (R.mode === 'walk' ? 20 : 90);
    if (far) {
      const sp = (franMoving ? 270 : 220) * dt;
      const d = Math.hypot(dx, dy);
      D.X += (dx / d) * Math.min(sp, d);
      D.y += (dy / d) * Math.min(sp, d) * 0.6;
      D.face = dx > 0 ? 1 : -1;
      R.mode = 'walk';
    } else {
      R.mode = 'idle';
      D.face = F.X > D.X ? 1 : -1;
    }
    const near = Math.abs(F.X - D.X) < 260;
    R.excited += ((near && !franMoving ? 1 : 0.15) - R.excited) * Math.min(1, dt * 2);
    R.look = near && !franMoving ? -0.3 : 0;
  }

  place(a, charS) {
    const S = this.scene;
    let k = this.G.f(a.y);
    let sx = this.screenX(a.X, k);
    let y = a.y;
    let rot = '';
    const F = this.fran;
    if (a === F && S.id === 'piso' && this.state !== 'libre') {
      // Asleep on the sofa (feet over the armrest), then getting up behind it.
      const sp = S.spots.sofa;
      const off = this.vw / 2 - S.CX + sp.k * (S.CX - this.cam);
      if (this.state === 'dormido') {
        k = sp.k;
        sx = 2455 + off;
        y = 790;
        rot = ' rotate(-90)';
        a.shadow.style.display = 'none';
      } else {
        const u = Math.min(1, this.wakeT / 1.1);
        const e = u * u * (3 - 2 * u);
        y = a.y + (1 - e) * 360;
        a.shadow.style.display = u > 0.9 ? '' : 'none';
      }
    } else a.shadow.style.display = '';
    const s = charS * k;
    a.wrap.setAttribute('transform', `translate(${sx.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
    a.flip.setAttribute('transform', `scale(${a.face} 1)${rot}`);
    a.setTint(this.tintAt(a.X, a.y - 250));
    const b = this.bubbles.find((q) => q.who === a);
    if (b) {
      const top = y - (a === F ? 300 : 110) * s;
      b.el.style.left = `${(sx / this.vw) * 100}%`;
      b.el.style.top = `${(top / H) * 100}%`;
    }
  }

  say(textStr, who, secs = 2) {
    const e = document.createElement('div');
    e.className = 'bocadillo';
    e.textContent = textStr;
    this.fx.appendChild(e);
    const b = { el: e, who, t: secs };
    this.bubbles.push(b);
  }

  draw(dt) {
    const S = this.scene;
    if (!S || !this.layers) return;
    const px = this.px;
    const b = this.bctx;
    const f = this.fctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.fillStyle = '#0b0f1e';
    b.fillRect(0, 0, this.back.width, this.back.height);
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, this.front.width, this.front.height);
    for (const L of this.layers) {
      if (this.hidden.has(L.id)) continue;
      const ctx = L.z === 'front' ? f : b;
      if (L.floor) {
        // x_screen = u + a + sh*y: one shear makes every row move at its own depth.
        const sh = (S.CX - this.cam) / (S.BASE - S.HOR);
        const a = this.vw / 2 - S.CX - S.HOR * sh;
        ctx.setTransform(px, 0, px * sh, px, px * a, 0);
        for (const p of L.pieces) {
          const xa = p.x0 + a + sh * (sh > 0 ? p.y0 : p.y0 + p.h);
          const xb = p.x0 + p.w + a + sh * (sh > 0 ? p.y0 + p.h : p.y0);
          if (xa > this.vw || xb < 0) continue;
          ctx.drawImage(p.c, p.x0, p.y0, p.w, p.h);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        const off = this.vw / 2 - S.CX + L.k * (S.CX - this.cam);
        for (const p of L.pieces) {
          const x = p.x0 + off;
          if (x > this.vw || x + p.w < 0) continue;
          ctx.drawImage(p.c, Math.round(x * px), Math.round(p.y0 * px));
        }
      }
      for (const Lw of this.layers.laterals) if (Lw.after === L.id) this.drawLateral(ctx, Lw);
      this.live(ctx, L.id);
    }
    // Zzz while Fran naps behind the sofa.
    if (S.id === 'piso' && this.state === 'dormido') {
      const sp = S.spots.sofa;
      const off = this.vw / 2 - S.CX + sp.k * (S.CX - this.cam);
      f.save();
      f.setTransform(px, 0, 0, px, 0, 0);
      f.font = `400 46px ${FONTS.display}`;
      f.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const u = (this.t * 0.35 + i / 3) % 1;
        f.globalAlpha = Math.sin(u * Math.PI) * 0.9;
        f.fillStyle = '#f3ead6';
        f.strokeStyle = 'rgba(20,16,30,0.6)';
        f.lineWidth = 6;
        const x = sp.zx + off + u * 70 + Math.sin(u * 6) * 10;
        const y = sp.zy - u * 170;
        f.font = `400 ${Math.round(30 + u * 30)}px ${FONTS.display}`;
        f.strokeText('z', x, y);
        f.fillText('z', x, y);
      }
      f.restore();
    }
    // Bubbles fade out.
    for (const q of this.bubbles) {
      q.t -= dt;
      q.el.style.opacity = String(clamp(q.t * 2, 0, 1));
    }
    this.bubbles = this.bubbles.filter((q) => (q.t > 0 ? true : (q.el.remove(), false)));
  }

  drawLateral(ctx, Lw) {
    const S = this.scene;
    const px = this.px;
    const N = 36;
    const zw = S.ZW;
    const xs = (d) => {
      const k = zw / (zw + d);
      return [this.vw / 2 + k * (Lw.X - this.cam), k];
    };
    const [a0] = xs(0);
    const [a1] = xs(Lw.len);
    // Only the face that looks at the camera is drawn.
    if ((a1 - a0) * Lw.face <= 0) return;
    const tw = Lw.c.width;
    const th = Lw.c.height;
    const yb = (k) => S.HOR + (S.BASE - S.HOR) * k;
    ctx.save();
    for (let i = 0; i < N; i++) {
      // Strips are denser near the camera, where the wall is wider on screen.
      const u0 = i / N;
      const u1 = (i + 1) / N;
      const d0 = Lw.len * u0 * u0;
      const d1 = Lw.len * u1 * u1;
      const [x0, k0] = xs(d0);
      const [x1, k1] = xs(d1);
      if (Math.min(x0, x1) > this.vw || Math.max(x0, x1) < 0) continue;
      // Each strip is sheared so its foot follows the ground line exactly.
      const s0 = Lw.face > 0 ? (d0 / Lw.len) * tw : (1 - d1 / Lw.len) * tw;
      const sw = ((d1 - d0) / Lw.len) * tw;
      const [xl, yl, xr, yr] = Lw.face > 0 ? [x0, yb(k0), x1, yb(k1)] : [x1, yb(k1), x0, yb(k0)];
      const a = ((xr - xl) * px) / sw;
      const slope = (yr - yl) / (xr - xl);
      const d = (Lw.h * S.M * ((k0 + k1) / 2) * px) / th;
      const e = xl * px - s0 * a;
      const b = slope * a;
      const f = yl * px - b * s0 - d * th;
      // 4% wider around the strip centre so neighbouring strips overlap without seams.
      ctx.setTransform(a * 1.04, b, 0, d, e - 0.04 * a * (s0 + sw / 2), f);
      ctx.drawImage(Lw.c, s0, 0, sw, th, s0, 0, sw, th);
    }
    ctx.restore();
  }

  /** Animated light that cannot be baked: the fire, dust in the dusk light, neon. */
  live(ctx, where) {
    const S = this.scene;
    if (VIVO[S.id]) return VIVO[S.id].call(this, ctx, where, { glow, px: this.px, t: this.t });
    if (where !== 'pared' && where !== 'suelo') return;
    const px = this.px;
    const t = this.t;
    if (S.id !== 'piso') return;
    const off = this.vw / 2 - this.cam;
    ctx.save();
    ctx.setTransform(px, 0, 0, px, off * px, 0);
    ctx.globalCompositeOperation = 'lighter';
    if (where === 'pared') {
      // Low flames licking the logs, and a flicker on the surround.
      const fl = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3 + 1);
      for (let i = 0; i < 6; i++) {
        const x = 1750 + i * 26;
        const h = 26 + 22 * (0.5 + 0.5 * Math.sin(t * (6 + i) + i * 2.1));
        const sw = 4 * Math.sin(t * 9 + i);
        const g = ctx.createLinearGradient(0, 742, 0, 742 - h);
        g.addColorStop(0, 'rgba(255,170,70,0.85)');
        g.addColorStop(0.6, 'rgba(255,110,40,0.5)');
        g.addColorStop(1, 'rgba(255,80,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 10, 744);
        ctx.quadraticCurveTo(x - 9 + sw, 742 - h * 0.5, x + sw * 1.5, 742 - h);
        ctx.quadraticCurveTo(x + 9 + sw, 742 - h * 0.5, x + 10, 744);
        ctx.fill();
      }
      glow(ctx, 1816, 720, 260, '#ff8a3a', 0.12 * fl);
    } else {
      // Dust motes drifting in the light from the terrace.
      for (let i = 0; i < 14; i++) {
        const ph = i * 1.37;
        const u = (Math.sin(ph * 3.1) * 0.5 + 0.5);
        const x = 2160 + u * 420 + Math.sin(t * 0.3 + ph) * 30;
        const y = 300 + ((t * (8 + (i % 5) * 3) + i * 37) % 560);
        const a = 0.1 + 0.12 * Math.sin(t * 1.5 + ph);
        ctx.fillStyle = `rgba(255,236,220,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x - (y - 300) * 0.35, y, 1.1 + (i % 3) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  start() {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!window.__freeze) {
        this.update(dt);
        this.draw(dt);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
