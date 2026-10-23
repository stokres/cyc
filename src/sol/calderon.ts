// «Calderón»: the great summon of «Alacant Sun», the long show-off sequence the original gives to its biggest
// summons, timed to its own music (`solCalderon`, whose closing blow lands at CALDERON_GOLPE seconds; sonido.ts).
//
//   0 – 17 % of the way to the blow   the stage darkens and the four prompters fly up out of the friends
//   9 – 30 %                          the ceiling of the theatre opens onto a golden sky, rays turning, clouds
//  30 – 52 %                          Calderón de la Barca comes down from the sky, huge, in his halo (name banner)
//  58 – 84 %                          his quill writes in the air, letter by letter, «Y entonces los cuatro ganaron»
//  84 – 100 %                         the light drops, the spell gathers in the quill, the quill is raised
//  100 %  THE BLOW                    the quill falls across the whole screen in one stroke, white flash, damage
//  after                              the stage again, a rain of pages and roses, Calderón fading out above
//
// Everything is a cached picture (calderonArte.ts); per frame only drawImage, a few rectangles and a bounded bag of
// particles. The music is played as an effect from its first sample at the same moment, so the sequence runs on its own clock.
import { texto } from '../juego/textos';
import { anillo, easeIn, easeOut, limitar, persona, Particulas, rosa } from './efectos';
import type { Donde, Escena } from './efectosPoderes';
import { puntaTexto, textoGrande } from './efectosJefe';
import { aura, calderon, CALDERON_H, CALDERON_W, cielo, manoPluma, nube, plumaGrande, rayos } from './calderonArte';
import { COLOR_ELEMENTO, type Elemento } from './grupo';
import { apuntador as imgApuntador, linea } from './iconos';
import { chispa } from './arte';
import { ventana } from './interfaz';
import { anchoTexto, escribir } from './fuente';
import { pagina } from './efectos';
import { paginaGrande } from './jefeArte';
import { CALDERON_COLA, CALDERON_GOLPE, EFECTO_APUNTADOR, EFECTO_GOLPE, EFECTO_PODER } from './sonido';

const pt = (d: Donde) => d();
/** The centre of the opening in the sky. */
const RC = { x: 120, y: 56 };
/** The scale of the written line. */
const K_FRASE = 2;

/** A thick pixel line of a flat colour. */
function trazo(g: CanvasRenderingContext2D, col: string, x0: number, y0: number, x1: number, y1: number, ancho: number) {
  const h = Math.abs(x1 - x0) > Math.abs(y1 - y0);
  for (let i = 0; i < ancho; i++) {
    const d = i - Math.floor(ancho / 2);
    if (h) linea(g, col, Math.round(x0), Math.round(y0 + d), Math.round(x1), Math.round(y1 + d));
    else linea(g, col, Math.round(x0 + d), Math.round(y0), Math.round(x1 + d), Math.round(y1));
  }
}

/** The quill with its hand and sleeve, the nib at (nx, ny) and the feather tilted by `ang` (negative = to the left). */
function dibujarPluma(g: CanvasRenderingContext2D, nx: number, ny: number, ang: number, hombro: { x: number; y: number }) {
  const sa = Math.sin(ang);
  const ca = Math.cos(ang);
  // the hand sits 26 px up the quill from its nib
  const hx = nx + sa * 26;
  const hy = ny - ca * 26;
  // the sleeve from the shoulder to the hand
  trazo(g, '#100e18', hombro.x, hombro.y, hx, hy + 6, 9);
  trazo(g, '#34304c', hombro.x - 2, hombro.y - 1, hx - 2, hy + 5, 2);
  g.save();
  g.translate(Math.round(nx), Math.round(ny));
  g.rotate(ang);
  g.drawImage(plumaGrande(), -10, -80);
  g.drawImage(manoPluma(), -10, -26 - 5);
  g.restore();
}

/**
 * The summon. `amigos` are the four friends (where they stand and the element of the prompter each one gives), so the
 * prompters fly up from them; `enemigos` are where the blow lands. Takes the whole screen (windows hidden).
 */
export async function fxCalderon(e: Escena, amigos: Array<{ donde: Donde; el: Elemento }>, enemigos: Donde[], impacto: (i: number) => void) {
  const TG = CALDERON_GOLPE;
  const DUR = TG + CALDERON_COLA;
  const frase = texto('calderon.frase');
  const nombre = texto('calderon.nombre.largo');
  const lluvia = new Particulas();
  const letras = [...frase].length;
  let golpeado = false;
  let tPrev = 0;
  let nib = { x: 40, y: 80 };
  const sacudidas = { t: 0 };
  /** The summon's clock: the music (played as an effect from its first sample) starts together with this animation. */
  const reloj = (t: number) => t;
  /** Progress (0..1) between two points of the way to the blow. */
  const f = (T: number, a: number, b: number) => limitar((T - a * TG) / ((b - a) * TG), 0, 1);
  const golpe = () => {
    if (golpeado) return;
    golpeado = true;
    enemigos.forEach((_, i) => impacto(i));
    e.sacudir(8, 0.9);
    e.destello('#ffffff', 1, 0.55);
    e.sonido.efecto(EFECTO_GOLPE, 1);
    for (const d of enemigos) {
      const p = pt(d);
      lluvia.estallido(p.x, p.y - 8, ['#ffffff', '#ffe27a', '#f0c040', '#ff8ad0'], 26, 150, 0.9);
    }
  };
  e.ocultarUI(true);
  e.sonido.efecto(EFECTO_PODER, 1);
  e.sonido.efecto(EFECTO_APUNTADOR, 0.8);
  await e.animar(DUR + 0.6, {
    capa: 'tope',
    tick: (t, dt) => {
      const T = reloj(t);
      lluvia.update(dt);
      const u = T / TG;
      // the prompters leave a trail
      if (u > 0.02 && u < 0.3) {
        amigos.forEach((a, i) => {
          const p = pos(a, i, T);
          lluvia.nueva({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 20, vy: 10, dura: 0.5, col: Math.random() > 0.5 ? COLOR_ELEMENTO[a.el].claro : '#ffffff', w: 2, h: 2 });
        });
      }
      // sparks while he writes
      if (u > 0.58 && u < 0.84) {
        for (let i = 0; i < 2; i++) lluvia.nueva({ x: nib.x + (Math.random() - 0.5) * 4, y: nib.y + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, ay: 60, dura: 0.7, col: Math.random() > 0.4 ? '#ffe27a' : '#ffffff', w: 1, h: 1 });
      }
      // the spell converges on the quill before the blow
      if (u > 0.86 && u < 1 && Math.random() > 0.3) {
        const a = Math.random() * Math.PI * 2;
        const x0 = nib.x + Math.cos(a) * 90;
        const y0 = nib.y + Math.sin(a) * 60;
        lluvia.nueva({ x: x0, y: y0, vx: (nib.x - x0) / 0.45, vy: (nib.y - y0) / 0.45, dura: 0.45, col: Math.random() > 0.5 ? '#fff0a0' : '#ffffff', w: 2, h: 2, parpadea: false });
      }
      // the screen trembles more and more
      if (u > 0.6 && u < 1 && T - sacudidas.t > 0.09) {
        sacudidas.t = T;
        e.sacudir(0.5 + (u - 0.6) * 4, 0.08);
      }
      // the blow, on the beat
      if (T >= TG) golpe();
      // after it: a rain of pages and roses over the enemies
      if (T > TG + 0.2 && T < TG + 3 && Math.floor(T * 14) !== Math.floor((tPrev) * 14)) {
        lluvia.nueva({ x: Math.random() * 240, y: -6, vx: (Math.random() - 0.5) * 30, vy: 50 + Math.random() * 50, dura: 2.2, img: Math.random() > 0.5 ? paginaGrande(2) : pagina(), parpadea: false });
        if (Math.random() > 0.5) lluvia.nueva({ x: Math.random() * 240, y: -6, vx: (Math.random() - 0.5) * 20, vy: 60 + Math.random() * 40, dura: 2.2, img: rosa(), parpadea: false });
      }
      tPrev = T;
    },
    draw: (g, t) => {
      const T = reloj(t);
      const u = T / TG;
      const pos0 = pos;
      // ---- 0: the stage darkens
      const oscuro = easeOut(f(T, 0, 0.07));
      const cubierto = u < 1 + 0.06; // the sky covers until the flash
      if (u < 1.04) {
        g.fillStyle = `rgba(4,2,22,${0.72 * oscuro})`;
        g.fillRect(0, 0, 240, 160);
      }
      // ---- the opening in the sky
      const abre = f(T, 0.08, 0.3);
      if (u >= 0.08 && cubierto) {
        const rx = 6 + 240 * easeIn(abre);
        const ry = 3 + 160 * easeIn(abre);
        g.save();
        g.beginPath();
        g.ellipse(RC.x, RC.y, rx, ry, 0, 0, Math.PI * 2);
        g.clip();
        g.drawImage(cielo(), 0, 0);
        // clouds drifting across the sky in three layers
        for (let i = 0; i < 9; i++) {
          const capa = i % 3;
          const x = ((i * 61 + T * (4 + capa * 5)) % 320) - 40;
          g.globalAlpha = 0.85;
          g.drawImage(nube(i), Math.round(x), 66 + capa * 26 + (i % 2) * 6);
        }
        g.globalAlpha = 1;
        g.restore();
        // the glowing rim of the opening
        if (abre < 1) {
          anillo(g, RC.x, RC.y, rx, ry, '#ffffff', 2);
          anillo(g, RC.x, RC.y, rx - 2, ry - 1.5, '#ffe27a', 1);
        }
      }
      // ---- rays turning (a GBA background rotating about a point)
      if (u >= 0.1 && cubierto) {
        const k = easeOut(f(T, 0.1, 0.32));
        g.save();
        g.translate(RC.x, RC.y);
        g.rotate(T * 0.32);
        g.scale(0.3 + 1.5 * k, 0.3 + 1.5 * k);
        g.globalAlpha = (0.55 + 0.25 * Math.sin(T * 5)) * (u > 0.86 ? 1 - f(T, 0.86, 0.97) * 0.6 : 1);
        g.drawImage(rayos(), -128, -128);
        g.restore();
        g.globalAlpha = 1;
      }
      // ---- the beam of light down onto the stage while the sky is opening (before it covers everything)
      if (u >= 0.12 && u < 0.3) {
        const w = 30 + Math.round(120 * abre);
        g.fillStyle = 'rgba(255,244,190,0.16)';
        g.beginPath();
        g.moveTo(RC.x - 10, RC.y);
        g.lineTo(RC.x + 10, RC.y);
        g.lineTo(RC.x + w, 160);
        g.lineTo(RC.x - w, 160);
        g.closePath();
        g.fill();
      }
      // ---- Calderón comes down, in his halo
      const baja = easeOut(f(T, 0.3, 0.52));
      const sube = u >= 1 ? easeIn(limitar((T - TG - 0.5) / 2.1, 0, 1)) : 0;
      // where his bust is (its top edge): coming down, then floating, then rising away after the blow
      const cy = Math.round(-CALDERON_H + (10 + CALDERON_H) * baja + Math.sin(T * 2.2) * (baja >= 1 ? 1.5 : 0) - sube * 50);
      if (u >= 0.3 && (cubierto || T < TG + 2.6)) {
        const alfa = u < 1 ? 1 : 0.85 * (1 - sube);
        g.globalAlpha = alfa;
        const pulso = 1 + Math.sin(T * 4) * 0.04;
        g.drawImage(aura(), Math.round(120 - 105 * pulso), Math.round(cy + 36 - 105 * pulso), Math.round(210 * pulso), Math.round(210 * pulso));
        g.drawImage(calderon(), 120 - CALDERON_W / 2, cy);
        g.globalAlpha = 1;
      }
      // ---- his name, in the window of the original's summons
      if (u >= 0.5 && u < 0.7) {
        const w = anchoTexto(nombre) + 26;
        g.drawImage(ventana(w, 17), Math.round(120 - w / 2), 3);
        escribir(g, nombre, Math.round(120 - anchoTexto(nombre) / 2), 6, '#ffe27a', '#0a1450');
      }
      // ---- the prompters flying up and gathering over the opening
      if (u > 0.02 && u < 0.3) {
        amigos.forEach((a, i) => {
          const p = pos0(a, i, T);
          const img = imgApuntador(a.el, Math.floor(T * 8));
          g.drawImage(img, Math.round(p.x - 6), Math.round(p.y - 8));
        });
      }
      if (u > 0.26 && u < 0.34) {
        // they fuse into a star at the opening
        const k = 1 - Math.abs((u - 0.3) / 0.04);
        g.drawImage(chispa('#ffffff'), RC.x - 2, RC.y - 2, 4 + Math.round(18 * limitar(k, 0, 1)), 4 + Math.round(18 * limitar(k, 0, 1)));
      }
      // ---- the quill: raised while he comes down, writing, gathering the spell, and falling
      const escribe = f(T, 0.58, 0.84);
      const hombro = { x: 120 - 30, y: cy + 84 };
      let ang = -0.3;
      if (u < 0.58) {
        // the quill goes down with him, held up at his side
        nib = { x: 52 + Math.sin(T * 1.8) * 2, y: cy + 60 + Math.sin(T * 1.3) * 3 };
        ang = -0.3;
      } else if (u < 0.84) {
        const n = Math.floor(escribe * letras);
        const p = puntaTexto(frase, n, 120, 124, K_FRASE);
        const tx = p.x + 2;
        const ty = p.y + 1 + Math.sin(T * 30) * 1.2;
        nib = { x: nib.x + (tx - nib.x) * 0.35, y: nib.y + (ty - nib.y) * 0.35 };
        ang = -0.5;
      } else if (u < 1) {
        const k = easeOut(f(T, 0.84, 0.96));
        const fin = puntaTexto(frase, letras, 120, 124, K_FRASE);
        nib = { x: fin.x + (40 - fin.x) * k + Math.sin(T * 40) * 0.8 * k, y: fin.y + (14 - fin.y) * k + Math.cos(T * 40) * 0.8 * k };
        ang = -0.5 + 0.35 * k;
      } else {
        // the fall: from the raised quill to the far corner in a tenth of a second
        const k = limitar((T - TG) / 0.12, 0, 1);
        nib = { x: 40 + (214 - 40) * k, y: 14 + (150 - 14) * k };
        ang = -0.15 - 0.85 * k;
      }
      // the line he has written (before the blow it is drawn lit; after it, it fades with the sky)
      if (u >= 0.58 && cubierto) {
        const n = u >= 0.84 ? letras : Math.floor(escribe * letras);
        // a band of night under the line, so that the gold letters read over his dark coat
        const banda = easeOut(f(T, 0.58, 0.64)) * (u < 1 ? 1 : 1 - limitar((T - TG) / 0.4, 0, 1));
        g.globalAlpha = 0.8 * banda;
        g.fillStyle = '#140626';
        g.fillRect(0, 99, 240, 51);
        g.globalAlpha = banda;
        g.fillStyle = '#ffe27a';
        g.fillRect(0, 99, 240, 1);
        g.fillRect(0, 149, 240, 1);
        textoGrande(g, frase, n, 120, 124, '#fff0a0', '#6a4208', K_FRASE);
        g.globalAlpha = 1;
      }
      if (u >= 0.3 && u < 1.0 + 0.55 / TG && T < TG + 0.45) dibujarPluma(g, nib.x, nib.y, ang, hombro);
      // ---- the held breath: the light drops just before the blow
      if (u > 0.88 && u < 1) {
        const k = limitar((u - 0.88) / 0.1, 0, 1);
        g.fillStyle = `rgba(6,2,24,${0.4 * Math.sin(k * Math.PI)})`;
        g.fillRect(0, 0, 240, 160);
      }
      lluvia.dibujar(g);
      // ---- THE BLOW: one stroke of gold across the whole screen, then a white flash
      if (T >= TG && T < TG + 1.1) {
        const k = limitar((T - TG) / 0.1, 0, 1);
        const x1 = -8 + 256 * k;
        const y1 = -8 + 176 * k;
        const fade = 1 - limitar((T - TG - 0.3) / 0.8, 0, 1);
        g.globalAlpha = fade;
        trazo(g, '#ffe27a', -8, -8, x1, y1, 13);
        trazo(g, '#ffffff', -8, -8, x1, y1, 7);
        trazo(g, '#fff0a0', -8, -8 + 8, x1, y1 + 8, 2);
        g.globalAlpha = 1;
        const blanco = 1 - limitar((T - TG - 0.05) / 0.45, 0, 1);
        g.fillStyle = `rgba(255,255,255,${blanco})`;
        g.fillRect(0, 0, 240, 160);
      }
      // ---- after it: rings of gold from every enemy
      if (T >= TG + 0.1 && T < TG + 1.2) {
        const r = (T - TG - 0.1) * 120;
        for (const d of enemigos) {
          const p = pt(d);
          anillo(g, p.x, p.y - 8, r, r * 0.6, '#ffe27a', 2);
          if (r > 10) anillo(g, p.x, p.y - 8, r - 9, (r - 9) * 0.6, '#ffffff', 1);
        }
      }
      // ---- a last bow of the audience: little people of the stalls clapping at the bottom
      if (T > TG + 1.2 && T < TG + 3.2) {
        const k = easeOut(limitar((T - TG - 1.2) / 0.5, 0, 1)) * (1 - easeIn(limitar((T - TG - 2.7) / 0.5, 0, 1)));
        for (let i = 0; i < 13; i++) {
          const p = persona(i * 5, Math.floor(T * 6 + i) % 2, 1.5, 0.2);
          g.drawImage(p, i * 19 - 4, Math.round(160 - p.height * k + (i % 2) * 2));
        }
      }
    },
  });
  golpe();
  e.ocultarUI(false);

  /** Where a prompter is at a given time: out of its friend, in a high arc to the opening, then circling it. */
  function pos(a: { donde: Donde; el: Elemento }, i: number, T: number): { x: number; y: number } {
    const p0 = a.donde();
    const k = easeOut(f(T, 0.03, 0.2));
    const ang = (i / 4) * Math.PI * 2 + T * 3;
    const dest = { x: RC.x + Math.cos(ang) * 26 * (1 - f(T, 0.22, 0.29)), y: RC.y + Math.sin(ang) * 11 * (1 - f(T, 0.22, 0.29)) };
    return { x: p0.x + (dest.x - p0.x) * k, y: p0.y - 6 + (dest.y - p0.y + 6) * k - Math.sin(k * Math.PI) * 34 };
  }
}
