// Minigame: Pablo against his narrator. Words fall through the dreamlike space
// where Pablo builds his stories, thrown by his own shadow, huge on the
// cyclorama. Swipe to cut the negative ones (impro sense: «no», «sí, pero»,
// «bloquear»...) and let the positive ones through («sí, y», «aceptar»...).
//
// Three phases: a few words with honest colours (negative ones red and orange,
// positive ones green and blue); more and faster; then the colours mix, to
// trick you. Cutting a positive word or letting a negative one reach the bottom
// fills the block meter; full, the round starts again. After two lost rounds it
// can be skipped (docs/JUGABILIDAD.md). The word lists are in
// src/textos/capitulo1.md (palabras.negativas, palabras.positivas).
//
// Performance (docs/ESTILO.md, T5): the backdrop and the shadow are bitmaps made
// once per screen size, each word is a bitmap made when it appears, and the
// loop never runs faster than 60 fps.
import { h } from './hud';
import { texto } from '../juego/textos';
import { FONTS } from '../motor/escena';
import { silueta } from '../motor/sprites';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

const H = 1080;
const DURACION = 54; // seconds of falling words in a round
const BLOQUEO = 6; // mistakes that fill the meter
const ROJOS = ['#ff5a4a', '#ff7a3a', '#f0452e', '#ffa040'];
const VERDES = ['#5ad08a', '#3fc0b8', '#5aa8ff', '#86e070'];

interface Palabra {
  texto: string;
  negativa: boolean;
  img: HTMLCanvasElement;
  x: number;
  y: number;
  vy: number;
  vx: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  /** Once cut: the two halves fly apart. */
  cortada: null | { t: number; dx: number };
  fuera: boolean;
}

/** State the automatic playthrough reads (scripts/playthrough.mjs), positions in CSS pixels. */
export interface EstadoPalabras {
  palabras: Array<{ x: number; y: number; w: number; h: number; negativa: boolean; cortada: boolean }>;
  fase: number;
  bloqueo: number;
  rondasPerdidas: number;
  fotogramas: number;
}

const lista = (clave: string) =>
  texto(clave)
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

/** A word as a bitmap: bold letters with a dark outline, at the size it is drawn. */
function pintarPalabra(t: string, color: string, escala: number) {
  const tam = 64;
  const c = document.createElement('canvas');
  const x = c.getContext('2d')!;
  x.font = `800 ${tam * escala}px ${FONTS.body}`;
  const w = Math.ceil(x.measureText(t).width + 30 * escala);
  c.width = w;
  c.height = Math.ceil(tam * 1.5 * escala);
  x.font = `800 ${tam * escala}px ${FONTS.body}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  x.lineWidth = 10 * escala;
  x.strokeStyle = '#120e1c';
  x.strokeText(t, w / 2, c.height / 2);
  x.fillStyle = color;
  x.fillText(t, w / 2, c.height / 2);
  return c;
}

export function jugarPalabras(parent: HTMLElement, cuerpoPablo: string, rapido = false): Promise<Resultado> {
  const lienzo = h('canvas', { class: 'lienzo-palabras' });
  const bloqueoEl = h('div', { class: 'barra bloqueo' }, h('span', { class: 'etq' }, texto('palabras.bloqueo')), h('span', { class: 'lleno' }));
  const paginaEl = h('div', { class: 'barra pagina' }, h('span', { class: 'etq' }, texto('palabras.pagina')), h('span', { class: 'lleno' }));
  const aviso = h('div', { class: 'aviso-cerdos', hidden: true });
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const capa = h('div', { class: 'cubierta minijuego palabras' }, lienzo, h('p', { class: 'instrucciones' }, texto('palabras.instrucciones')), bloqueoEl, paginaEl, aviso, saltar, cerrar);
  parent.append(capa);
  const ctx = lienzo.getContext('2d')!;
  const negativas = lista('palabras.negativas');
  const positivas = lista('palabras.positivas');

  let vw = 1920;
  let escala = 1;
  let fondo: HTMLCanvasElement | null = null;
  let sombra: HTMLCanvasElement | null = null;
  const medir = () => {
    const r = capa.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.8;
    lienzo.width = Math.round(r.width * dpr);
    lienzo.height = Math.round(r.height * dpr);
    escala = lienzo.height / H;
    vw = lienzo.width / escala;
    fondo = null;
    void silueta(cuerpoPablo, 820 * escala).then((c) => (sombra = c)).catch(() => {});
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);

  /** The dreamlike space: deep indigo, a spot on the cyclorama, faint letters drifting. Drawn once. */
  const pintarFondo = () => {
    const c = document.createElement('canvas');
    c.width = lienzo.width;
    c.height = lienzo.height;
    const x = c.getContext('2d')!;
    x.setTransform(escala, 0, 0, escala, 0, 0);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e0a1e');
    g.addColorStop(1, '#241a3a');
    x.fillStyle = g;
    x.fillRect(0, 0, vw, H);
    const spot = x.createRadialGradient(vw / 2, 520, 40, vw / 2, 520, 520);
    spot.addColorStop(0, 'rgba(255,236,200,0.55)');
    spot.addColorStop(0.7, 'rgba(255,220,170,0.18)');
    spot.addColorStop(1, 'rgba(255,220,170,0)');
    x.fillStyle = spot;
    x.fillRect(0, 0, vw, H);
    x.font = `400 40px ${FONTS.serif}`;
    x.textAlign = 'center';
    let st = 7;
    const r = () => ((st = (st * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      x.globalAlpha = 0.05 + r() * 0.1;
      x.fillStyle = '#cfc4ff';
      x.fillText(String.fromCharCode(65 + Math.floor(r() * 26)), r() * vw, r() * H);
    }
    return c;
  };

  // ---------------------------------------------------------------- state
  let t = 0;
  let siguiente = 0.8;
  let palabras: Palabra[] = [];
  let bloqueo = 0;
  let rondasPerdidas = 0;
  let pausa = 0;
  let terminado: Resultado | null = null;
  let fotogramas = 0;
  let traza: Array<{ x: number; y: number; t: number }> = [];

  const fase = () => (t < 14 ? 1 : t < 32 ? 2 : 3);
  const mostrar = (clave: string, s = 1) => {
    aviso.textContent = texto(clave);
    aviso.hidden = false;
    aviso.classList.remove('salta');
    void aviso.offsetWidth;
    aviso.classList.add('salta');
    pausa = rapido ? 0.05 : s;
  };

  const nueva = () => {
    const f = fase();
    const negativa = Math.random() < 0.55;
    const t0 = (negativa ? negativas : positivas)[Math.floor(Math.random() * (negativa ? negativas : positivas).length)] ?? '';
    // Phase 3: half of the words wear the other side's colours.
    const engaña = f === 3 && Math.random() < 0.5;
    const tonos = negativa !== engaña ? ROJOS : VERDES;
    const img = pintarPalabra(t0, tonos[Math.floor(Math.random() * tonos.length)], escala);
    const w = img.width / escala;
    const hh = img.height / escala;
    palabras.push({
      texto: t0,
      negativa,
      img,
      w,
      h: hh,
      x: 120 + w / 2 + Math.random() * Math.max(10, vw - 240 - w),
      y: -hh,
      vy: (f === 1 ? 140 : f === 2 ? 185 : 205) * (0.9 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 30,
      rot: (Math.random() - 0.5) * 0.2,
      vr: (Math.random() - 0.5) * 0.12,
      cortada: null,
      fuera: false,
    });
  };

  const perderRonda = () => {
    rondasPerdidas++;
    mostrar('palabras.pierde', 1.8);
    palabras = [];
    bloqueo = 0;
    t = 0;
    siguiente = 1.2;
    if (rondasPerdidas >= 2) saltar.hidden = false;
  };

  const fallo = (clave: string) => {
    bloqueo++;
    capa.classList.remove('golpe');
    void capa.offsetWidth;
    capa.classList.add('golpe');
    if (bloqueo >= BLOQUEO) perderRonda();
    else mostrar(clave, 0.6);
  };

  /** Does the segment a–b cross the word's box? */
  const cruza = (p: Palabra, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const x0 = p.x - p.w / 2;
    const x1 = p.x + p.w / 2;
    const y0 = p.y - p.h * 0.35;
    const y1 = p.y + p.h * 0.35;
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const x = a.x + (b.x - a.x) * u;
      const y = a.y + (b.y - a.y) * u;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return true;
    }
    return false;
  };

  const cortar = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    if (Math.hypot(b.x - a.x, b.y - a.y) < 8) return;
    for (const p of palabras) {
      if (p.cortada || p.fuera || !cruza(p, a, b)) continue;
      p.cortada = { t: 0, dx: Math.sign(b.x - a.x || 1) };
      if (!p.negativa) fallo('palabras.malcorte');
    }
  };

  const logico = (e: PointerEvent) => {
    const r = lienzo.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * vw, y: ((e.clientY - r.top) / r.height) * H };
  };
  let arrastrando = false;
  lienzo.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    arrastrando = true;
    lienzo.setPointerCapture?.(e.pointerId);
    traza = [{ ...logico(e), t }];
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const p = { ...logico(e), t };
    const ult = traza[traza.length - 1];
    if (ult && pausa <= 0 && !terminado) cortar(ult, p);
    traza.push(p);
    if (traza.length > 14) traza.shift();
  });
  const suelta = () => (arrastrando = false);
  lienzo.addEventListener('pointerup', suelta);
  lienzo.addEventListener('pointercancel', suelta);

  (window as unknown as { __palabras?: () => EstadoPalabras }).__palabras = () => {
    const r = lienzo.getBoundingClientRect();
    const k = r.height / H;
    return {
      palabras: palabras.filter((p) => !p.fuera).map((p) => ({ x: r.left + p.x * k, y: r.top + p.y * k, w: p.w * k, h: p.h * k, negativa: p.negativa, cortada: !!p.cortada })),
      fase: fase(),
      bloqueo,
      rondasPerdidas,
      fotogramas,
    };
  };

  // ---------------------------------------------------------------- drawing
  const pintar = () => {
    if (!fondo) fondo = pintarFondo();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fondo, 0, 0);
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    // The narrator, huge, breathing: a little bigger as the round goes on.
    if (sombra) {
      const k = 1 + 0.015 * Math.sin(t * 1.3) + 0.04 * (fase() - 1);
      const w = (sombra.width / escala) * k;
      const hh = (sombra.height / escala) * k;
      ctx.drawImage(sombra, vw / 2 - w / 2, H - hh + 40, w, hh);
    }
    for (const p of palabras) {
      if (p.fuera) continue;
      const iw = p.img.width;
      const ih = p.img.height;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (!p.cortada) ctx.drawImage(p.img, -p.w / 2, -p.h / 2, p.w, p.h);
      else {
        // Two halves flying apart and fading.
        const d = p.cortada.t * 260;
        ctx.globalAlpha = Math.max(0, 1 - p.cortada.t * 1.6);
        ctx.drawImage(p.img, 0, 0, iw / 2, ih, -p.w / 2 - d, -p.h / 2 + d * 0.3, p.w / 2, p.h);
        ctx.drawImage(p.img, iw / 2, 0, iw / 2, ih, d * 0.6, -p.h / 2 - d * 0.2, p.w / 2, p.h);
      }
      ctx.restore();
    }
    // The finger's trail.
    if (traza.length > 1 && arrastrando) {
      ctx.lineCap = 'round';
      for (let i = 1; i < traza.length; i++) {
        ctx.strokeStyle = `rgba(255,248,230,${(i / traza.length) * 0.8})`;
        ctx.lineWidth = 3 + (i / traza.length) * 9;
        ctx.beginPath();
        ctx.moveTo(traza[i - 1].x, traza[i - 1].y);
        ctx.lineTo(traza[i].x, traza[i].y);
        ctx.stroke();
      }
    }
    (bloqueoEl.lastChild as HTMLElement).style.width = `${(bloqueo / BLOQUEO) * 100}%`;
    (paginaEl.lastChild as HTMLElement).style.width = `${Math.min(1, t / DURACION) * 100}%`;
  };

  // ---------------------------------------------------------------- loop
  return new Promise((resolve) => {
    let ultimo = performance.now();
    let vivo = true;
    const fin = (r: Resultado) => {
      if (!vivo) return;
      vivo = false;
      ro.disconnect();
      delete (window as unknown as { __palabras?: unknown }).__palabras;
      capa.remove();
      resolve(r);
    };
    const paso = (ahora: number) => {
      if (!vivo) return;
      // 60 fps at most, also on 120 Hz screens.
      if (ahora - ultimo < 1000 / 60 - 4) {
        requestAnimationFrame(paso);
        return;
      }
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      if (pausa > 0) {
        pausa -= dt;
        if (pausa <= 0) {
          aviso.hidden = true;
          if (terminado) return fin(terminado);
        }
      } else if (!terminado) {
        t += dt;
        siguiente -= dt;
        if (t < DURACION && siguiente <= 0) {
          nueva();
          const f = fase();
          siguiente = (f === 1 ? 1.5 : f === 2 ? 1.0 : 0.85) * (0.8 + Math.random() * 0.4);
        }
        if (t >= DURACION && palabras.every((p) => p.fuera || p.cortada)) {
          terminado = 'hecho';
          mostrar('palabras.gana', 2);
        }
      }
      for (const p of palabras) {
        if (p.cortada) {
          p.cortada.t += dt;
          if (p.cortada.t > 0.7) p.fuera = true;
          continue;
        }
        if (pausa > 0 && !terminado) continue;
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        p.rot += p.vr * dt;
        if (p.y - p.h / 2 > H) {
          p.fuera = true;
          if (p.negativa && !terminado) fallo('palabras.seescapa');
        }
      }
      palabras = palabras.filter((p) => !p.fuera);
      pintar();
      fotogramas++;
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
    saltar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('saltado');
    });
    cerrar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('cancelado');
    });
  });
}
