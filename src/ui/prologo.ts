// The prologue: after the title, at the start of every new game (the first one,
// after «Empezar de nuevo» and when replaying a chapter), a few lines on a dark
// screen that say where we are and how it all starts; then you choose who to
// start with. Usera at night along the bottom, its windows lighting up and going
// out, the moon and a few stars.
//
// The lines are in src/textos/capitulo1.md (## prologo): each one is a screen.
// A narrator line (>) is just the text; a character's line (FRAN (contento): ...)
// shows their portrait with that face and their name above the text. Each line
// stays long enough to read and then the next comes in; a tap brings it sooner,
// and «Saltar» skips the lot.
//
// Performance (docs/ESTILO.md, T5): the night is drawn once on a canvas; a timer
// fades one of ten small elements (six windows going out, four stars) now and
// then, each on its own layer so nothing else is repainted; each line fades in
// once. The scene underneath is paused meanwhile (main.ts).
import { h } from './hud';
import { dialogo, texto } from '../juego/textos';
import { REPARTO, retrato, type PjId } from '../juego/reparto';

const CIELO = [
  [0, '#05070f'],
  [0.55, '#0b1030'],
  [0.82, '#1c1838'],
  [1, '#2e2238'],
] as const;
const EDIFICIO = '#090c1e';
const LUZ = '#ffc977';

/** Where a lit window or a star is, in CSS px, for the few that come alive. */
interface Punto {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The night drawn once: sky, stars, the moon top right (L1) with its glow, and
 * Usera along the bottom with its windows. Returns some lit windows and some
 * stars, for the elements that switch them on and off.
 */
function pintarNoche(lienzo: HTMLCanvasElement, W: number, H: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  lienzo.width = Math.max(2, Math.round(W * dpr));
  lienzo.height = Math.max(2, Math.round(H * dpr));
  const x = lienzo.getContext('2d')!;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  let semilla = 7;
  const r = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const cielo = x.createLinearGradient(0, 0, 0, H);
  for (const [o, c] of CIELO) cielo.addColorStop(o, c);
  x.fillStyle = cielo;
  x.fillRect(0, 0, W, H);
  const estrellas: Punto[] = [];
  for (let i = 0; i < 40; i++) {
    const p = { x: r() * W, y: r() * H * 0.6, w: 2 + r() * 1.6, h: 0 };
    p.h = p.w;
    x.globalAlpha = 0.25 + r() * 0.55;
    x.fillStyle = '#eef0ff';
    x.fillRect(p.x, p.y, p.w, p.h);
    if (i % 10 === 0) estrellas.push(p);
  }
  x.globalAlpha = 1;
  // The moon and its glow.
  const lx = W * 0.82;
  const ly = H * 0.25;
  const lr = H * 0.045;
  const halo = x.createRadialGradient(lx, ly, lr, lx, ly, lr * 4);
  halo.addColorStop(0, 'rgba(220,225,255,0.22)');
  halo.addColorStop(1, 'rgba(220,225,255,0)');
  x.fillStyle = halo;
  x.fillRect(lx - lr * 4, ly - lr * 4, lr * 8, lr * 8);
  const luna = x.createRadialGradient(lx - lr * 0.2, ly - lr * 0.2, 0, lx, ly, lr);
  luna.addColorStop(0, '#fbf6e4');
  luna.addColorStop(1, '#d8d2bc');
  x.fillStyle = luna;
  x.beginPath();
  x.arc(lx, ly, lr, 0, Math.PI * 2);
  x.fill();
  // Usera: flat silhouettes and their windows.
  const tira = H * 0.3;
  const ventanas: Punto[] = [];
  let bx = -W * 0.02;
  while (bx < W) {
    const bw = W * (0.04 + r() * 0.07);
    const alto = tira * (0.28 + r() * 0.62);
    x.fillStyle = EDIFICIO;
    x.fillRect(bx, H - alto, bw, alto);
    const filas = Math.floor((alto / tira) * 100 / 14);
    for (let f = 0; f < filas; f++) {
      for (let c = 0; c < 3; c++) {
        if (r() < 0.55) continue;
        const p = { x: bx + bw * (0.18 + c * 0.26), y: H - alto + alto * (0.08 + (f * 0.84) / filas), w: bw * 0.14, h: Math.max(3, alto * 0.045) };
        const encendida = r() >= 0.2;
        x.fillStyle = LUZ;
        x.globalAlpha = encendida ? 0.8 : 0.06;
        x.fillRect(p.x, p.y, p.w, p.h);
        if (encendida) ventanas.push(p);
      }
    }
    x.globalAlpha = 1;
    bx += bw + W * r() * 0.015;
  }
  return { ventanas, estrellas };
}

export function mostrarPrologo(parent: HTMLElement, rapido = false): Promise<void> {
  const lineas = dialogo('prologo');
  const cara = h('div', { class: 'cara', hidden: true });
  const nombre = h('div', { class: 'nombre', hidden: true });
  const frase = h('p', { class: 'frase' });
  const bloque = h('div', { class: 'bloque' }, cara, nombre, frase);
  const saltar = h('button', { class: 'btn fantasma saltar' }, texto('prologo.saltar'));
  const noche = h('canvas', { class: 'noche', 'aria-hidden': 'true' });
  const vivos = h('div', { class: 'vivos', 'aria-hidden': 'true' });
  const capa = h('div', { class: 'cubierta prologo' }, noche, vivos, bloque, h('div', { class: 'toca' }, texto('rotulo.toca')), saltar);
  parent.append(capa);
  // The night, drawn once (again if the screen changes size). A handful of windows
  // and stars come alive: small elements over them, each on its own layer, that
  // the GPU fades without painting anything else.
  let luces: HTMLElement[] = [];
  const dibujar = () => {
    const { width: W, height: H } = capa.getBoundingClientRect();
    const { ventanas, estrellas } = pintarNoche(noche, W, H);
    const vivo = (p: Punto, clase: string) => {
      const e = h('span', { class: clase });
      Object.assign(e.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${p.h}px` });
      return e;
    };
    const elegidas = ventanas.filter((_, i) => i % Math.max(1, Math.floor(ventanas.length / 6)) === 3).slice(0, 6);
    luces = [...elegidas.map((p) => vivo(p, 'apaga')), ...estrellas.map((p) => vivo(p, 'titila'))];
    vivos.replaceChildren(...luces);
  };
  dibujar();
  const ro = new ResizeObserver(dibujar);
  ro.observe(capa);
  const vida = window.setInterval(() => luces[Math.floor(Math.random() * luces.length)]?.classList.toggle('on'), 900);

  return new Promise((resolve) => {
    let i = -1;
    let reloj = 0;
    let acabado = false;
    let desde = 0;
    const fin = () => {
      if (acabado) return;
      acabado = true;
      clearTimeout(reloj);
      clearInterval(vida);
      ro.disconnect();
      capa.classList.add('sale');
      setTimeout(() => {
        capa.remove();
        resolve();
      }, rapido ? 0 : 700);
    };
    const siguiente = () => {
      clearTimeout(reloj);
      i++;
      if (i >= lineas.length) return fin();
      const l = lineas[i];
      const quien = l.quien && l.quien in REPARTO ? (l.quien as PjId) : null;
      cara.hidden = nombre.hidden = !quien;
      if (quien) {
        cara.style.setProperty('--color', REPARTO[quien].color);
        cara.innerHTML = retrato(quien, { mood: l.animo ?? REPARTO[quien].arte.INFO.defaultMood });
        nombre.textContent = REPARTO[quien].nombre;
      }
      frase.textContent = l.texto;
      // In again from the start: fade and rise.
      bloque.classList.remove('entra');
      void bloque.offsetWidth;
      bloque.classList.add('entra');
      desde = performance.now();
      // Long enough to read it, then the next one.
      reloj = window.setTimeout(siguiente, rapido ? 60 : Math.max(2800, 1500 + l.texto.length * 55));
    };
    capa.addEventListener('click', (e) => {
      e.stopPropagation();
      // A tap right as a line comes in (meant for the one before) does not skip it.
      if (performance.now() - desde > 400) siguiente();
    });
    saltar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin();
    });
    siguiente();
  });
}
