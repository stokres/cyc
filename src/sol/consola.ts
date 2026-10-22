// The console around the 240×160 screen: our own GBA-like shell (not Nintendo's) in the side bands of the
// landscape phone, with its D-pad on the left, A and B on the right, L and R on the shoulders and a small
// START. It is DOM and CSS, made once; touch (multi-touch) and keyboard write into the same `Mandos`, which
// the game reads on every frame. Like the Pang's (src/pang/entrada.ts) but with eight directions.
import { h } from '../ui/hud';

/** The buttons, held and pressed. Presses are taken (and cleared) once by whoever reads them. */
export class Mandos {
  /** The direction held, each axis −1, 0 or 1 (eight directions). */
  x = 0;
  y = 0;
  /** Held. */
  a = false;
  b = false;
  private pulsos = { a: false, b: false, r: false, l: false, start: false };
  private pulsoV = 0;

  /** A was pressed since the last time this was asked. */
  tomarA() {
    return this.tomar('a');
  }
  tomarB() {
    return this.tomar('b');
  }
  tomarR() {
    return this.tomar('r');
  }
  tomarStart() {
    return this.tomar('start');
  }
  /** Up (−1) or down (1) was pressed since the last time (for the choice window). */
  tomarArribaAbajo(): number {
    const v = this.pulsoV;
    this.pulsoV = 0;
    return v;
  }
  private tomar(k: 'a' | 'b' | 'r' | 'l' | 'start') {
    const v = this.pulsos[k];
    this.pulsos[k] = false;
    return v;
  }
  pulsar(k: 'a' | 'b' | 'r' | 'l' | 'start') {
    this.pulsos[k] = true;
  }
  fijarDir(x: number, y: number) {
    if (y !== this.y && y !== 0) this.pulsoV = y;
    this.x = x;
    this.y = y;
  }
  /** Lets go of everything. */
  soltar() {
    this.x = this.y = 0;
    this.a = this.b = false;
    this.pulsos = { a: false, b: false, r: false, l: false, start: false };
    this.pulsoV = 0;
  }
}

export interface Consola {
  capa: HTMLElement;
  lienzo: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  mandos: Mandos;
  /** Whole-number scale the screen is drawn at (device pixels per game pixel). */
  escala: () => number;
  /** R lights up (a hint that the power can be used now). */
  resaltarR(si: boolean): void;
  destruir(): void;
}

const CSS = `
.sol-capa{position:absolute;inset:0;z-index:10;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;
  background:linear-gradient(180deg,#5a49c8 0%,#3b2f9a 18%,#2d2483 62%,#241b6c 100%);padding:0;display:block;color:#fff}
.sol-capa *{box-sizing:border-box}
.sol-capa::before{content:'';position:absolute;inset:0;background:
  radial-gradient(ellipse at 50% -10%,rgba(255,255,255,.22),transparent 55%),
  linear-gradient(90deg,rgba(0,0,0,.28),transparent 22%,transparent 78%,rgba(0,0,0,.28));pointer-events:none}
.sol-bisel{position:absolute;background:#15131f;border-radius:14px;box-shadow:inset 0 0 0 2px #0b0a14,inset 0 3px 10px #000,0 2px 0 rgba(255,255,255,.12),0 0 0 3px rgba(10,8,40,.6)}
.sol-pantalla{position:absolute;display:block;image-rendering:pixelated;image-rendering:crisp-edges;background:#000;border-radius:2px}
.sol-led{position:absolute;width:6px;height:6px;border-radius:50%;background:#e8332c;box-shadow:0 0 6px #ff6a5a}
.sol-marca{position:absolute;font:400 clamp(7px,2.1vh,10px)/1.2 'Graduate',serif;letter-spacing:.14em;color:rgba(235,230,255,.75);text-align:center;text-shadow:0 1px 0 rgba(0,0,0,.5);white-space:nowrap}
.sol-marca b{display:block;font:italic 400 clamp(6px,1.8vh,8px)/1.2 sans-serif;letter-spacing:.3em;opacity:.7;margin-top:2px}
.sol-ctl{position:absolute;touch-action:none;pointer-events:auto;-webkit-tap-highlight-color:transparent}
.sol-cruceta{border-radius:50%;background:radial-gradient(circle at 50% 40%,#2a2750,#16143a);box-shadow:inset 0 0 0 2px #0b0a20,0 2px 0 rgba(255,255,255,.14),0 5px 10px rgba(0,0,0,.5)}
.sol-cruceta i{position:absolute;background:linear-gradient(180deg,#4a4a66,#2b2b40);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 2px 3px rgba(0,0,0,.5);pointer-events:none}
.sol-cruceta i.h{left:7%;right:7%;top:35%;bottom:35%;border-radius:10px}
.sol-cruceta i.v{top:7%;bottom:7%;left:35%;right:35%;border-radius:10px}
.sol-cruceta i.c{left:35%;right:35%;top:35%;bottom:35%;border-radius:0;box-shadow:none;background:#34344c}
.sol-cruceta u{position:absolute;width:0;height:0;border:solid transparent;pointer-events:none;opacity:.55}
.sol-cruceta u.U{left:calc(50% - 7px);top:12%;border-width:0 7px 9px;border-bottom-color:#c9c9e8}
.sol-cruceta u.D{left:calc(50% - 7px);bottom:12%;border-width:9px 7px 0;border-top-color:#c9c9e8}
.sol-cruceta u.L{top:calc(50% - 7px);left:12%;border-width:7px 9px 7px 0;border-right-color:#c9c9e8}
.sol-cruceta u.R{top:calc(50% - 7px);right:12%;border-width:7px 0 7px 9px;border-left-color:#c9c9e8}
.sol-cruceta.sol-u u.U,.sol-cruceta.sol-d u.D,.sol-cruceta.sol-l u.L,.sol-cruceta.sol-r u.R{opacity:1;border-color:transparent;filter:drop-shadow(0 0 3px #ffd84a)}
.sol-cruceta.sol-u u.U{border-bottom-color:#ffd84a}.sol-cruceta.sol-d u.D{border-top-color:#ffd84a}.sol-cruceta.sol-l u.L{border-right-color:#ffd84a}.sol-cruceta.sol-r u.R{border-left-color:#ffd84a}
.sol-boton{border-radius:50%;display:flex;align-items:center;justify-content:center;font:400 clamp(13px,4.4vh,20px)/1 'Press Start 2P','Courier New',monospace;color:#f3e9ff;text-shadow:0 2px 0 rgba(0,0,0,.45);
  background:radial-gradient(circle at 36% 30%,#d65a96,#a42a64 55%,#7a1c4a);box-shadow:inset 0 -3px 0 rgba(0,0,0,.28),inset 0 2px 0 rgba(255,255,255,.35),0 4px 0 #3c0f28,0 6px 10px rgba(0,0,0,.5)}
.sol-boton.sol-on{transform:translateY(3px);box-shadow:inset 0 -2px 0 rgba(0,0,0,.28),0 1px 0 #3c0f28,0 2px 4px rgba(0,0,0,.5);filter:brightness(1.18)}
.sol-hombro{border-radius:12px 12px 6px 6px;display:flex;align-items:center;justify-content:center;font:400 clamp(9px,3vh,13px)/1 'Press Start 2P','Courier New',monospace;color:#e3dcff;
  background:linear-gradient(180deg,#5a5aa8,#34347a);box-shadow:inset 0 2px 0 rgba(255,255,255,.3),0 3px 0 #17174a,0 5px 8px rgba(0,0,0,.45)}
.sol-hombro.sol-on{transform:translateY(2px);filter:brightness(1.2)}
.sol-hombro.sol-lista{animation:sol-late .8s ease-in-out infinite alternate;color:#fff2a8;background:linear-gradient(180deg,#a8892a,#6a5416)}
@keyframes sol-late{from{box-shadow:inset 0 2px 0 rgba(255,255,255,.3),0 3px 0 #17174a,0 0 0 rgba(255,216,74,0)}to{box-shadow:inset 0 2px 0 rgba(255,255,255,.3),0 3px 0 #17174a,0 0 14px rgba(255,216,74,.9)}}
.sol-start{border-radius:8px;display:flex;align-items:center;justify-content:center;font:400 clamp(6px,1.9vh,8px)/1 'Press Start 2P','Courier New',monospace;color:#d8d2f5;letter-spacing:.05em;
  background:linear-gradient(180deg,#3d3d70,#26264f);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 2px 0 #12123a;transform:rotate(-18deg)}
.sol-start.sol-on{filter:brightness(1.3)}
.sol-capa .cerrar{z-index:5}
.sol-capa .btn.saltar{position:absolute;left:var(--safe-l);top:var(--safe-t);right:auto;bottom:auto;z-index:5}
.sol-rej{position:absolute;display:flex;flex-direction:column;gap:3px}
.sol-rej i{display:block;height:2px;background:rgba(0,0,0,.35);border-radius:2px;box-shadow:0 1px 0 rgba(255,255,255,.12)}
`;

/** Makes an element a hold-to-press button (several fingers on several buttons work at once). */
function sostener(el: HTMLElement, clase: string, cambio: (pulsado: boolean) => void) {
  const dedos = new Set<number>();
  const poner = () => {
    el.classList.toggle(clase, dedos.size > 0);
    cambio(dedos.size > 0);
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers cannot be captured */
    }
    dedos.add(e.pointerId);
    poner();
  });
  const suelta = (e: PointerEvent) => {
    if (dedos.delete(e.pointerId)) poner();
  };
  el.addEventListener('pointerup', suelta);
  el.addEventListener('pointercancel', suelta);
  el.addEventListener('lostpointercapture', suelta);
  return () => {
    dedos.clear();
    poner();
  };
}

export function crearConsola(root: HTMLElement, textos: { marca: string; modelo: string; start: string; cerrar: string; saltar: string }): Consola & { cerrar: HTMLButtonElement; saltar: HTMLButtonElement } {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const mandos = new Mandos();

  const lienzo = h('canvas', { class: 'sol-pantalla' });
  const bisel = h('div', { class: 'sol-bisel' });
  const led = h('div', { class: 'sol-led' });
  const marca = h('div', { class: 'sol-marca' }, textos.marca, h('b', {}, textos.modelo));
  const cruceta = h('div', { class: 'sol-ctl sol-cruceta' }, h('i', { class: 'h' }), h('i', { class: 'v' }), h('i', { class: 'c' }), h('u', { class: 'U' }), h('u', { class: 'D' }), h('u', { class: 'L' }), h('u', { class: 'R' }));
  const bA = h('div', { class: 'sol-ctl sol-boton' }, 'A');
  const bB = h('div', { class: 'sol-ctl sol-boton' }, 'B');
  const bL = h('div', { class: 'sol-ctl sol-hombro' }, 'L');
  const bR = h('div', { class: 'sol-ctl sol-hombro' }, 'R');
  const bS = h('div', { class: 'sol-ctl sol-start' }, textos.start);
  const rejilla = h('div', { class: 'sol-rej' }, h('i'), h('i'), h('i'), h('i'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': textos.cerrar }, '×');
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, textos.saltar);
  const capa = h('div', { class: 'cubierta minijuego sol-capa' }, bisel, lienzo, led, marca, rejilla, cruceta, bA, bB, bL, bR, bS, cerrar, saltar);
  root.append(capa);
  const g = lienzo.getContext('2d', { alpha: false })!;
  g.imageSmoothingEnabled = false;

  let k = 1;
  const ajustar = () => {
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // The screen leaves each side band at least ~135 px for a D-pad big enough for a thumb.
    k = Math.max(1, Math.floor(Math.min(((W - 270) * dpr) / 240, ((H - 10) * dpr) / 160)));
    lienzo.width = 240 * k;
    lienzo.height = 160 * k;
    g.imageSmoothingEnabled = false;
    const cw = (240 * k) / dpr;
    const ch = (160 * k) / dpr;
    const cx = Math.round((W - cw) / 2);
    const cy = Math.round((H - ch) / 2);
    lienzo.style.cssText = `left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px`;
    bisel.style.cssText = `left:${cx - 12}px;top:${cy - 8}px;width:${cw + 24}px;height:${ch + 16}px`;
    const banda = cx - 12;
    const izq = banda / 2;
    const der = W - banda / 2;
    const pos = (el: HTMLElement, x: number, y: number, w: number, hh: number) => {
      el.style.cssText = `left:${Math.round(x - w / 2)}px;top:${Math.round(y - hh / 2)}px;width:${w}px;height:${hh}px`;
    };
    const dp = Math.max(84, Math.min(160, banda - 6, H * 0.42));
    pos(cruceta, izq, H * 0.6, dp, dp);
    const bt = Math.max(44, Math.min(60, (banda - 16) / 2.1, H * 0.15));
    pos(bA, der + bt * 0.55, H * 0.55 - bt * 0.42, bt, bt);
    pos(bB, der - bt * 0.55, H * 0.55 + bt * 0.42, bt, bt);
    const hw = Math.max(60, Math.min(96, banda - 16));
    const hy = Math.max(60, H * 0.2);
    pos(bL, izq, hy, hw, Math.max(24, H * 0.07));
    pos(bR, der, hy, hw, Math.max(24, H * 0.07));
    pos(bS, der, H * 0.88, Math.max(40, banda * 0.36), Math.max(14, H * 0.04));
    marca.style.cssText = `left:${Math.round(izq - banda / 2)}px;width:${Math.round(banda)}px;top:${Math.round(H * 0.31)}px`;
    led.style.cssText = `left:${Math.round(cx - 7 - 0)}px;top:${Math.round(cy + ch / 2 - 3)}px`;
    rejilla.style.cssText = `left:${Math.round(der - 24)}px;top:${Math.round(H * 0.74)}px;width:48px;transform:rotate(-18deg)`;
  };
  ajustar();
  addEventListener('resize', ajustar);

  // ---- touch: the D-pad (one finger anywhere on it; it can slide between directions)
  const dedosPad = new Map<number, { x: number; y: number }>();
  const leerPad = () => {
    let x = 0;
    let y = 0;
    for (const v of dedosPad.values()) {
      x = v.x || x;
      y = v.y || y;
    }
    mandos.fijarDir(x, y);
    cruceta.classList.toggle('sol-u', y < 0);
    cruceta.classList.toggle('sol-d', y > 0);
    cruceta.classList.toggle('sol-l', x < 0);
    cruceta.classList.toggle('sol-r', x > 0);
  };
  const dirDePad = (e: PointerEvent) => {
    const r = cruceta.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.12) return { x: 0, y: 0 };
    // Straight lines are easy: each of the four directions takes 66° and a diagonal only the 24°
    // around its own angle, so a thumb a little off the line still walks straight.
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const recta = Math.round(a / 90) * 90;
    const i = (((Math.abs(a - recta) <= 33 ? recta / 45 : Math.round(a / 45)) % 8) + 8) % 8; // 0 = east, clockwise
    return [
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 },
      { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    ][i];
  };
  cruceta.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      cruceta.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers cannot be captured */
    }
    dedosPad.set(e.pointerId, dirDePad(e));
    leerPad();
  });
  cruceta.addEventListener('pointermove', (e) => {
    if (!dedosPad.has(e.pointerId)) return;
    dedosPad.set(e.pointerId, dirDePad(e));
    leerPad();
  });
  const sueltaPad = (e: PointerEvent) => {
    if (dedosPad.delete(e.pointerId)) leerPad();
  };
  cruceta.addEventListener('pointerup', sueltaPad);
  cruceta.addEventListener('pointercancel', sueltaPad);
  cruceta.addEventListener('lostpointercapture', sueltaPad);

  const sueltas: Array<() => void> = [
    () => {
      dedosPad.clear();
      leerPad();
    },
    sostener(bA, 'sol-on', (p) => {
      mandos.a = p;
      if (p) mandos.pulsar('a');
    }),
    sostener(bB, 'sol-on', (p) => {
      mandos.b = p;
      if (p) mandos.pulsar('b');
    }),
    sostener(bR, 'sol-on', (p) => p && mandos.pulsar('r')),
    sostener(bL, 'sol-on', (p) => p && mandos.pulsar('l')),
    sostener(bS, 'sol-on', (p) => p && mandos.pulsar('start')),
  ];

  // ---- keyboard: arrows or WASD, Z/Enter/Space = A, X/Shift = B, R = the shortcut power
  const teclas = new Set<string>();
  const leerTeclas = () => {
    const x = (teclas.has('ArrowRight') || teclas.has('KeyD') ? 1 : 0) - (teclas.has('ArrowLeft') || teclas.has('KeyA') ? 1 : 0);
    const y = (teclas.has('ArrowDown') || teclas.has('KeyS') ? 1 : 0) - (teclas.has('ArrowUp') || teclas.has('KeyW') ? 1 : 0);
    if (!dedosPad.size) mandos.fijarDir(x, y);
    mandos.a = mandos.a || teclas.has('KeyZ') || teclas.has('Enter') || teclas.has('Space');
  };
  const MOVER = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS']);
  const abajo = (e: KeyboardEvent) => {
    const c = e.code;
    const conocida = MOVER.has(c) || ['KeyZ', 'Enter', 'Space', 'KeyX', 'ShiftLeft', 'ShiftRight', 'KeyR', 'KeyQ'].includes(c);
    if (!conocida) return;
    e.preventDefault();
    if (e.repeat) return;
    if (MOVER.has(c)) {
      teclas.add(c);
      leerTeclas();
    } else if (c === 'KeyZ' || c === 'Enter' || c === 'Space') {
      mandos.a = true;
      mandos.pulsar('a');
    } else if (c === 'KeyX' || c === 'ShiftLeft' || c === 'ShiftRight') {
      mandos.b = true;
      mandos.pulsar('b');
    } else if (c === 'KeyR') mandos.pulsar('r');
    else if (c === 'KeyQ') mandos.pulsar('l');
  };
  const arriba = (e: KeyboardEvent) => {
    const c = e.code;
    if (MOVER.has(c)) {
      teclas.delete(c);
      leerTeclas();
    } else if (c === 'KeyZ' || c === 'Enter' || c === 'Space') mandos.a = false;
    else if (c === 'KeyX' || c === 'ShiftLeft' || c === 'ShiftRight') mandos.b = false;
  };
  const soltarTodo = () => {
    teclas.clear();
    for (const f of sueltas) f();
    mandos.soltar();
  };
  const alOcultar = () => document.hidden && soltarTodo();
  addEventListener('keydown', abajo);
  addEventListener('keyup', arriba);
  addEventListener('blur', soltarTodo);
  document.addEventListener('visibilitychange', alOcultar);
  const sinMenu = (e: Event) => e.preventDefault();
  capa.addEventListener('contextmenu', sinMenu);
  capa.addEventListener('gesturestart', sinMenu);

  return {
    capa,
    lienzo,
    g,
    mandos,
    cerrar,
    saltar,
    escala: () => k,
    resaltarR: (si) => bR.classList.toggle('sol-lista', si),
    destruir() {
      removeEventListener('keydown', abajo);
      removeEventListener('keyup', arriba);
      removeEventListener('blur', soltarTodo);
      removeEventListener('resize', ajustar);
      document.removeEventListener('visibilitychange', alOcultar);
      estilo.remove();
      capa.remove();
    },
  };
}
