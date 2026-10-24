// PokéUsera en el capítulo 2: el marco. PokéUsera se juega de pie (240 × 384–520, como una Game Boy) y el resto del juego va en horizontal, así que el
// capítulo le monta un escenario propio encima de todo y se encarga del giro (docs/CAPITULO2.md, «PokéUsera»):
//
//  - En un móvil o una tableta (puntero grueso) la pantalla del capítulo gira de golpe (efecto del caos) y sale «Gira el móvil»: con el móvil en
//    horizontal se ve el juego tumbado de lado tras un velo con el rótulo (que tapa los toques), y al ponerlo de pie el velo se va y se juega.
//    Mientras dure, el aviso general de «gira el móvil para jugar» no sale (`permitirVertical`), y si el móvil vuelve a horizontal vuelve el velo.
//    Al acabar se devuelve el permiso: con el móvil de pie, el aviso general pide volver a horizontal y la historia sigue.
//  - En un ordenador (o cualquier pantalla sin giro: puntero fino) no sale ningún rótulo: la pantalla del capítulo gira de golpe como efecto y
//    PokéUsera aparece directamente en una columna vertical, centrada y tan alta como la ventana; al acabar la pantalla vuelve sin pedir nada.
//
// El escenario es un solo elemento con su propio tamaño: ni el juego toca los estilos de la página ni deja nada al salir (`cerrar`).
import { h } from '../ui/hud';
import { esTactil, permitirVertical } from '../ui/orientacion';
import { texto } from '../juego/textos';
import { altoParaTamano } from './pantalla';

export interface Marco {
  /** Donde va el lienzo del juego (`new Pantalla(marco.escena)`). */
  readonly escena: HTMLElement;
  /** El juego se ve de pie ahora (siempre en un ordenador; en un móvil, cuando está de pie). */
  dePie(): boolean;
  /** Se llama cuando el escenario cambia de tamaño (para que el lienzo se reajuste). */
  alColocar: (() => void) | null;
  /** Se llama cuando el móvil se pone de pie o vuelve a horizontal (para que el juego pare o siga). */
  alOrientar: ((dePie: boolean) => void) | null;
  /** Lo quita todo: el escenario, el velo y el permiso. En un ordenador, la pantalla del capítulo gira de vuelta. */
  cerrar(): Promise<void>;
}

/** Duración del giro de golpe de la pantalla del capítulo (ms). */
const GIRO_MS = 650;

/**
 * El tamaño que tendrá el escenario (en px CSS) en una ventana de `an` × `al`: en un móvil, el de la ventana vista de pie (da igual cómo esté
 * ahora, así se hornean los fondos para la altura buena antes de girar); en un ordenador, una columna tan alta como la ventana, con la anchura
 * justa para que el juego quede a buen tamaño (no más ancha que la ventana).
 */
export function tamanoEscena(an = innerWidth, al = innerHeight): { w: number; h: number } {
  if (esTactil()) return { w: Math.min(an, al), h: Math.max(an, al) };
  return { w: Math.min(an, Math.round(al * 0.5)), h: al };
}

/** La altura lógica que tendrá PokéUsera (para hornear los fondos antes de que exista el lienzo). */
export const altoPrevisto = (): number => {
  const { w, h } = tamanoEscena();
  return altoParaTamano(w, h);
};

/**
 * Abre el marco sobre `app` (el padre de #game). `juego` es la pantalla del capítulo (#game): se gira de golpe y, al cerrar, se vuelve a poner.
 * Devuelve cuando el giro ha terminado y el escenario está listo.
 */
export async function abrirMarco(app: HTMLElement, juego: HTMLElement, rapido = false): Promise<Marco> {
  const tactil = esTactil();
  const devolver = permitirVertical();
  const escena = h('div', { class: 'pk-escena' });
  const rotuloGira = h(
    'div',
    { class: 'pk-gira', hidden: true },
    h('div', { class: 'movil-icono pk-movil' }),
    h('p', { class: 'pk-gira-titulo' }, texto('pokecap.gira')),
    h('p', { class: 'pk-gira-sub' }, texto('pokecap.gira.sub')),
  );
  const capa = h('div', { class: 'cubierta minijuego pokeusera', hidden: true }, escena, rotuloGira);
  app.append(capa);

  let vivo = true;
  let pie = true;
  const marco: Marco = {
    escena,
    dePie: () => pie,
    alColocar: null,
    alOrientar: null,
    async cerrar() {
      if (!vivo) return;
      vivo = false;
      window.removeEventListener('resize', colocar);
      window.removeEventListener('orientationchange', tardio);
      capa.remove();
      devolver();
      // Un móvil de pie: el aviso general pide volver a horizontal y la pantalla del capítulo se queda como estaba, sin efecto; un ordenador la gira de vuelta.
      if (tactil) {
        for (const a of juego.getAnimations()) a.cancel();
      } else {
        const a = juego.animate([{ transform: 'rotate(-90deg) scale(0.7)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: rapido ? 1 : GIRO_MS, easing: 'cubic-bezier(.2,.7,.2,1)' });
        await a.finished.catch(() => undefined);
        for (const x of juego.getAnimations()) x.cancel();
      }
    },
  };

  /** Pone el escenario: de pie ocupa su sitio; con un móvil en horizontal se ve tumbado (girado un cuarto) tras el velo. */
  function colocar() {
    if (!vivo) return;
    const an = capa.clientWidth || innerWidth;
    const al = capa.clientHeight || innerHeight;
    const e = escena.style;
    const antes = pie;
    if (tactil && an > al) {
      // Móvil en horizontal: el escenario, con su forma de pie, girado un cuarto hacia la izquierda y metido en la ventana (solo se ve, el velo tapa los toques).
      pie = false;
      e.cssText = `position:absolute;left:50%;top:50%;width:${al}px;height:${an}px;margin:${-an / 2}px 0 0 ${-al / 2}px;transform:rotate(-90deg);opacity:0.55`;
    } else {
      pie = true;
      const t = tactil ? { w: an, h: al } : tamanoEscena(an, al);
      e.cssText = `position:absolute;left:50%;top:0;width:${t.w}px;height:${t.h}px;margin-left:${-t.w / 2}px`;
    }
    rotuloGira.hidden = pie;
    marco.alColocar?.();
    if (pie !== antes) marco.alOrientar?.(pie);
  }
  const tardio = () => setTimeout(colocar, 120);
  window.addEventListener('resize', colocar);
  window.addEventListener('orientationchange', tardio);

  // El giro de golpe de la pantalla del capítulo: se tumba y se encoge hacia un lado mientras se apaga, y entonces aparece el juego.
  capa.hidden = false;
  colocar();
  capa.style.opacity = '0';
  const giro = juego.animate([{ transform: 'none', opacity: 1 }, { transform: 'rotate(-90deg) scale(0.7)', opacity: 0 }], { duration: rapido ? 1 : GIRO_MS, easing: 'cubic-bezier(.7,0,.9,.4)', fill: 'forwards' });
  await giro.finished.catch(() => undefined);
  capa.style.transition = rapido ? 'none' : 'opacity 0.25s';
  capa.style.opacity = '1';
  return marco;
}
