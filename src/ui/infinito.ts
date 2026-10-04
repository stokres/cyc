// The endless versions of the minigames, played from the minigames menu
// (src/main.ts): the same mechanics as in the story, but the difficulty keeps
// rising until you lose, and there is a score. Each minigame takes an
// `infinito` option; when the game is over it resolves 'hecho' and leaves the
// score in `infinito.puntos`. The local ranking is in src/juego/partida.ts.
import { h } from './hud';
import { texto } from '../juego/textos';

export interface Infinito {
  /** Best score so far on this phone, to beat (0 for none). */
  record: number;
  /** Filled in by the minigame as it goes: the score. */
  puntos?: number;
}

/** The score on screen, top centre: points, and the record to beat (gold once beaten). */
export function marcador(inf: Infinito) {
  const pts = h('b', { class: 'pts' }, '0');
  const el = h(
    'div',
    { class: 'marcador' },
    h('span', { class: 'etq' }, texto('infinito.puntos')),
    pts,
    ...(inf.record > 0 ? [h('span', { class: 'rec' }, texto('infinito.record', { n: inf.record }))] : []),
  );
  inf.puntos = 0;
  return {
    el,
    get puntos() {
      return inf.puntos ?? 0;
    },
    sumar(n = 1) {
      inf.puntos = (inf.puntos ?? 0) + n;
      pts.textContent = String(inf.puntos);
      pts.classList.remove('salta');
      void pts.offsetWidth;
      pts.classList.add('salta');
      if (inf.record > 0 && inf.puntos > inf.record) el.classList.add('batido');
    },
  };
}
