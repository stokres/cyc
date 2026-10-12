// Camiones y Caravanas · PANG: entry point (pang.html). See docs/PANG.md.
// For testing, pang.html?fase=N&pj=fran plays that stage straight away.
import '../ui/ui.css';
import textosPang from '../textos/pang.md?raw';
import { cargarTextos } from '../juego/textos';
import { Sound } from '../core/audio';
import { FASES } from './fases';
import { jugarFase } from './juego';
import { PJS, type PjId } from './tipos';

async function arrancar() {
  cargarTextos(textosPang);
  const raiz = document.getElementById('pang')!;
  const sonido = new Sound();
  const q = new URLSearchParams(location.search);
  const n = Number(q.get('fase') ?? 1);
  const pj = (PJS.includes(q.get('pj') as PjId) ? q.get('pj') : 'fran') as PjId;
  addEventListener('pointerdown', () => sonido.start(), { once: true });
  let puntos = 0;
  for (let i = n - 1; i < FASES.length; i++) {
    const r = await jugarFase({ padre: raiz, fase: FASES[i], pj, vidas: 3, puntos, sonido, pausa: async () => 'seguir', demo: q.has('demo') });
    if (r === 'salir' || !r.superada) break;
    puntos = r.puntos;
  }
}

void arrancar();
