// Minigame: twist the lid of the olive jar by circling a finger around it.
// A cold jar gives up at a third of a turn and snaps back; a warm one opens.
import { h } from './hud';
import { OBJETOS } from '../arte/objetos.mjs';
import { texto } from '../juego/textos';

export type Resultado = 'abierto' | 'duro' | 'cancelado';

const VUELTAS = 1.6; // turns needed to open
const TOPE_FRIO = 0.34; // a cold jar never gets past this

export function jugarTarro(parent: HTMLElement, caliente: boolean): Promise<Resultado> {
  const svg = `<svg viewBox="0 0 200 200" class="frasco" aria-hidden="true">
    <circle cx="100" cy="100" r="92" class="pista-anillo"/>
    <circle cx="100" cy="100" r="92" class="progreso" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90 100 100)"/>
    <g transform="translate(20 40) scale(1.6)">${OBJETOS[caliente ? 'tarroCaliente' : 'tarro']()}</g>
    <g class="tapa"><circle cx="100" cy="92" r="40" fill="#c8433a" stroke="#6e1c17" stroke-width="3"/>
      <circle cx="100" cy="92" r="30" fill="#e06a5c"/>${Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return `<line x1="${100 + Math.cos(a) * 34}" y1="${92 + Math.sin(a) * 34}" x2="${100 + Math.cos(a) * 40}" y2="${92 + Math.sin(a) * 40}" stroke="#6e1c17" stroke-width="2.4"/>`;
      }).join('')}<path d="M86 92 a14 14 0 0 1 28 0" fill="none" stroke="#fff4e0" stroke-width="4" stroke-linecap="round" opacity="0.7"/></g>
  </svg>`;
  const zona = h('div', { class: 'zona-giro' });
  zona.innerHTML = svg;
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const capa = h('div', { class: 'cubierta minijuego' }, h('p', { class: 'instrucciones' }, texto('tarro.instrucciones')), zona, cerrar);
  parent.append(capa);
  const tapa = zona.querySelector('.tapa') as SVGGElement;
  const prog = zona.querySelector('.progreso') as SVGCircleElement;
  let total = 0;
  let giro = 0;
  let last: number | null = null;
  return new Promise((resolve) => {
    let hecho = false;
    const fin = (r: Resultado, ms = 0) => {
      if (hecho) return;
      hecho = true;
      setTimeout(() => {
        capa.remove();
        resolve(r);
      }, ms);
    };
    const angulo = (e: PointerEvent) => {
      const r = zona.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height * 0.46), e.clientX - (r.left + r.width / 2));
    };
    zona.addEventListener('pointerdown', (e) => {
      zona.setPointerCapture(e.pointerId);
      last = angulo(e);
    });
    zona.addEventListener('pointermove', (e) => {
      if (last === null || hecho) return;
      const a = angulo(e);
      let d = a - last;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      last = a;
      total += Math.abs(d);
      giro += d;
      const p = Math.min(1, total / (VUELTAS * Math.PI * 2));
      tapa.setAttribute('transform', `rotate(${((giro * 180) / Math.PI) * (caliente ? 1 : 0.25)} 100 92)`);
      prog.setAttribute('stroke-dasharray', `${(p * 100).toFixed(1)} 100`);
      if (!caliente && p >= TOPE_FRIO) {
        capa.classList.add('resbala');
        fin('duro', 500);
      } else if (caliente && p >= 1) {
        capa.classList.add('ploc');
        fin('abierto', 450);
      }
    });
    const suelta = () => (last = null);
    zona.addEventListener('pointerup', suelta);
    zona.addEventListener('pointercancel', suelta);
    cerrar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('cancelado');
    });
  });
}
