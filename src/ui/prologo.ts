// The prologue: after the title, at the start of every new game (the first one,
// after «Empezar de nuevo» and when replaying a chapter), a few lines on a dark
// screen that say where we are and how it all starts; then you choose who to
// start with. Usera at night along the bottom, its windows lighting up and going
// out, the moon, a few stars and the towers of Madrid far away.
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
  [0.5, '#0b1030'],
  [0.8, '#201a3c'],
  [1, '#3a2742'],
] as const;
const LEJOS = '#1c1a3a';
const MEDIO = '#11132c';
const EDIFICIO = '#090c1e';
/** Lit windows: mostly warm lamps, now and then the blue of a telly. */
const LUCES = ['#ffc977', '#ffc977', '#ffc977', '#ffb35c', '#bcd0ff'];

/** Where a lit window or a star is, in CSS px, for the few that come alive. */
interface Punto {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A soft blob of light or haze: a radial gradient squashed into an ellipse. */
function mancha(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, a: number) {
  x.save();
  x.translate(cx, cy);
  x.scale(1, ry / rx);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${color},${a})`);
  g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g;
  x.fillRect(-rx, -rx, rx * 2, rx * 2);
  x.restore();
}

/**
 * Madrid in the haze, far away: the four towers of the Castellana on the left
 * and Torrespaña («el Pirulí») on the right, with their red lights on top.
 */
function torres(x: CanvasRenderingContext2D, W: number, H: number) {
  const suelo = H * 0.86;
  const t = (cx: number, alto: number) => [W * cx, H - H * alto] as const;
  x.fillStyle = LEJOS;
  // Torre Cepsa: two legs and a lintel, a hole at the top.
  const [c1, y1] = t(0.06, 0.45);
  const w = W * 0.03;
  x.beginPath();
  x.rect(c1, y1, w, suelo - y1);
  x.rect(c1 + w * 0.25, y1 + H * 0.012, w * 0.5, H * 0.05);
  x.fill('evenodd');
  // Torre PwC: a rounded crown.
  const [c2, y2] = t(0.105, 0.43);
  x.beginPath();
  x.moveTo(c2, suelo);
  x.lineTo(c2, y2 + w * 0.4);
  x.quadraticCurveTo(c2 + w / 2, y2 - w * 0.3, c2 + w, y2 + w * 0.4);
  x.lineTo(c2 + w, suelo);
  x.fill();
  // Torre de Cristal: a slanted top with the lit garden in its crown.
  const [c3, y3] = t(0.15, 0.46);
  x.beginPath();
  x.moveTo(c3, suelo);
  x.lineTo(c3, y3 + H * 0.02);
  x.lineTo(c3 + w, y3);
  x.lineTo(c3 + w, suelo);
  x.fill();
  x.fillStyle = 'rgba(190,215,255,0.35)';
  x.fillRect(c3 + w * 0.12, y3 + H * 0.025, w * 0.76, H * 0.018);
  // Torre Espacio: the top curves up to one side.
  x.fillStyle = LEJOS;
  const [c4, y4] = t(0.195, 0.42);
  x.beginPath();
  x.moveTo(c4, suelo);
  x.lineTo(c4, y4 + H * 0.025);
  x.quadraticCurveTo(c4 + w * 0.7, y4 + H * 0.02, c4 + w, y4);
  x.lineTo(c4 + w, suelo);
  x.fill();
  // Torrespaña: a thin shaft, the bulge near the top and the mast.
  const [c5, y5] = t(0.905, 0.46);
  const fuste = W * 0.006;
  x.fillRect(c5 - fuste / 2, y5 + H * 0.06, fuste, suelo - y5);
  x.fillRect(c5 - fuste * 2.2, y5 + H * 0.06, fuste * 4.4, H * 0.035);
  x.fillRect(c5 - fuste * 1.6, y5 + H * 0.05, fuste * 3.2, H * 0.012);
  x.fillRect(c5 - 0.7, y5, 1.4, H * 0.06);
  // A few lit floors in the towers, and the red lights.
  x.fillStyle = 'rgba(200,215,255,0.22)';
  for (const [cx, top] of [[c1, y1], [c2, y2], [c3, y3], [c4, y4]]) for (let f = top + H * 0.07; f < suelo; f += H * 0.022) x.fillRect(cx + w * 0.15, f, w * 0.7, 1);
  x.fillStyle = '#ff4a4a';
  for (const [cx, cy] of [[c1 + w / 2, y1], [c2 + w / 2, y2 - 1], [c3 + w, y3], [c4 + w, y4], [c5, y5]]) {
    mancha(x, cx, cy, 6, 6, '255,74,74', 0.5);
    x.fillRect(cx - 1, cy - 1, 2, 2);
  }
}

/**
 * The night drawn once: sky with the glow of the city low down, stars, a few
 * clouds, the moon top right (L1), Madrid's towers in the haze and Usera along
 * the bottom with its windows, aerials and water tanks. Returns some lit windows
 * and some stars, for the elements that switch them on and off.
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
  // The orange glow of the city on the low sky.
  const brillo = x.createLinearGradient(0, H * 0.45, 0, H);
  brillo.addColorStop(0, 'rgba(255,140,90,0)');
  brillo.addColorStop(1, 'rgba(255,140,90,0.18)');
  x.fillStyle = brillo;
  x.fillRect(0, H * 0.45, W, H * 0.55);
  // Faint stars first, then the bright ones (some of those twinkle).
  x.fillStyle = '#eef0ff';
  for (let i = 0; i < 90; i++) {
    x.globalAlpha = 0.12 + r() * 0.2;
    x.fillRect(r() * W, r() * H * 0.62, 1.2, 1.2);
  }
  const estrellas: Punto[] = [];
  for (let i = 0; i < 40; i++) {
    const p = { x: r() * W, y: r() * H * 0.6, w: 2 + r() * 1.6, h: 0 };
    p.h = p.w;
    x.globalAlpha = 0.25 + r() * 0.55;
    x.fillRect(p.x, p.y, p.w, p.h);
    if (i % 7 === 3) {
      // A sparkle on the brightest.
      x.globalAlpha *= 0.5;
      x.fillRect(p.x + p.w / 2 - 0.5, p.y - p.w * 2, 1, p.w * 5);
      x.fillRect(p.x - p.w * 2, p.y + p.h / 2 - 0.5, p.w * 5, 1);
    }
    if (i % 10 === 0) estrellas.push(p);
  }
  x.globalAlpha = 1;
  // Long thin clouds, lit by the moon.
  for (const [cx, cy, rx, ry] of [[0.24, 0.2, 0.22, 0.03], [0.5, 0.1, 0.13, 0.018], [0.68, 0.36, 0.24, 0.032], [0.92, 0.5, 0.14, 0.02]]) {
    mancha(x, cx * W, cy * H, rx * W, ry * H, '150,150,205', 0.14);
    mancha(x, cx * W + rx * W * 0.25, (cy - 0.006) * H, rx * W * 0.5, ry * H * 0.6, '190,190,235', 0.1);
  }
  // The moon: a wide glow, the disc and its seas.
  const lx = W * 0.82;
  const ly = H * 0.25;
  const lr = H * 0.045;
  mancha(x, lx, ly, lr * 9, lr * 9, '200,205,255', 0.08);
  mancha(x, lx, ly, lr * 4, lr * 4, '220,225,255', 0.22);
  const luna = x.createRadialGradient(lx - lr * 0.3, ly - lr * 0.3, 0, lx, ly, lr);
  luna.addColorStop(0, '#fffaea');
  luna.addColorStop(1, '#d8d0b6');
  x.fillStyle = luna;
  x.beginPath();
  x.arc(lx, ly, lr, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = 'rgba(150,140,120,0.28)';
  for (const [dx, dy, rr] of [[-0.3, -0.2, 0.3], [0.25, 0.1, 0.22], [-0.05, 0.4, 0.18], [0.35, -0.35, 0.12]]) {
    x.beginPath();
    x.arc(lx + dx * lr, ly + dy * lr, rr * lr, 0, Math.PI * 2);
    x.fill();
  }
  // Madrid far away, then a row of blocks in between, both in the haze.
  torres(x, W, H);
  const tira = H * 0.3;
  x.fillStyle = LEJOS;
  for (let bx = -W * 0.02; bx < W; ) {
    const bw = W * (0.03 + r() * 0.05);
    x.fillRect(bx, H - tira * (0.5 + r() * 0.35), bw, tira);
    bx += bw;
  }
  for (let bx = -W * 0.02; bx < W; ) {
    const bw = W * (0.035 + r() * 0.06);
    const alto = tira * (0.45 + r() * 0.5);
    x.fillStyle = MEDIO;
    x.fillRect(bx, H - alto, bw, alto);
    x.fillStyle = 'rgba(255,201,119,0.45)';
    for (let f = H - alto + 6; f < H - 6; f += 9) for (let c = bx + 4; c < bx + bw - 6; c += 8) if (r() < 0.12) x.fillRect(c, f, 3, 3);
    bx += bw + W * r() * 0.01;
  }
  // Usera: blocks of flats with their windows, and on the roofs aerials, water
  // tanks and a dish or two.
  const ventanas: Punto[] = [];
  let bx = -W * 0.02;
  while (bx < W) {
    const bw = W * (0.04 + r() * 0.07);
    const alto = tira * (0.28 + r() * 0.62);
    const techo = H - alto;
    x.fillStyle = EDIFICIO;
    x.fillRect(bx, techo, bw, alto);
    x.fillRect(bx - 2, techo - 3, bw + 4, 4);
    const extra = r();
    if (extra < 0.35) {
      // A water tank on legs.
      const tx = bx + bw * (0.2 + r() * 0.4);
      x.fillRect(tx, techo - 14, 14, 9);
      x.fillRect(tx + 1, techo - 5, 2, 5);
      x.fillRect(tx + 11, techo - 5, 2, 5);
    } else if (extra < 0.6) {
      // A little hut over the stairs.
      x.fillRect(bx + bw * 0.55, techo - 10, bw * 0.3, 10);
    }
    for (let a = 0, n = 1 + Math.floor(r() * 3); a < n; a++) {
      // TV aerials: a mast and a couple of crossbars.
      const ax = bx + bw * (0.1 + r() * 0.8);
      const ah = 12 + r() * 14;
      x.fillRect(ax, techo - ah, 1.2, ah);
      x.fillRect(ax - 5, techo - ah + 2, 10, 1);
      x.fillRect(ax - 3.5, techo - ah + 6, 7, 1);
    }
    if (r() < 0.25) {
      x.beginPath();
      x.arc(bx + bw * 0.8, techo - 6, 5, Math.PI * 0.6, Math.PI * 1.6);
      x.fill();
    }
    const filas = Math.floor((alto / tira) * 100 / 14);
    for (let f = 0; f < filas; f++) {
      for (let c = 0; c < 3; c++) {
        if (r() < 0.55) continue;
        const p = { x: bx + bw * (0.18 + c * 0.26), y: techo + alto * (0.08 + (f * 0.84) / filas), w: bw * 0.14, h: Math.max(3, alto * 0.045) };
        const encendida = r() >= 0.2;
        x.fillStyle = encendida ? LUCES[Math.floor(r() * LUCES.length)] : LUCES[0];
        x.globalAlpha = encendida ? 0.85 : 0.06;
        x.fillRect(p.x, p.y, p.w, p.h);
        if (encendida) {
          // A curtain drawn on one side, and the sill under it.
          x.globalAlpha = 0.35;
          x.fillStyle = '#5a3a3a';
          x.fillRect(r() < 0.5 ? p.x : p.x + p.w * 0.6, p.y, p.w * 0.4, p.h);
          if (p.y + p.h < H * 0.94) ventanas.push(p);
        }
        x.globalAlpha = 0.5;
        x.fillStyle = '#1a1e36';
        x.fillRect(p.x - 1, p.y + p.h, p.w + 2, 1.5);
      }
    }
    x.globalAlpha = 1;
    bx += bw + W * r() * 0.015;
  }
  // The street lamps light the bottom of the buildings.
  const farolas = x.createLinearGradient(0, H * 0.9, 0, H);
  farolas.addColorStop(0, 'rgba(255,160,80,0)');
  farolas.addColorStop(1, 'rgba(255,160,80,0.22)');
  x.fillStyle = farolas;
  x.fillRect(0, H * 0.9, W, H * 0.1);
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
