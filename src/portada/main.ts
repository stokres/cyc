// Cover page (portada.html): the cartel of the domain. Plain DOM and CSS, no game code: it only loads its texts
// (src/textos/portada.md), so it opens at once on a mid-range phone. The links are clean routes (`/capitulo1`, `/pokeusera`, `/pang`),
// which only exist on the server of the game (scripts/servir-pokeusera.mjs).
import './portada.css';
import raw from '../textos/portada.md?raw';
import { cargarTextos, texto } from '../juego/textos';
import { iniciarCuenta } from './cuenta';

cargarTextos(raw);
document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
  el.textContent = texto(el.dataset.t!);
});
document.querySelectorAll<HTMLElement>('[data-alt]').forEach((el) => {
  el.setAttribute('alt', texto(el.dataset.alt!));
});
document.querySelectorAll<HTMLElement>('[data-aria]').forEach((el) => {
  el.setAttribute('aria-label', texto(el.dataset.aria!));
});
// The big title is drawn letter by letter (each one a little up or down and tilted, see `.palabra span` in the CSS): `data-desde` is
// the phase of the first letter, so the second word does not repeat the wave of the first.
document.querySelectorAll<HTMLElement>('[data-letras]').forEach((el) => {
  const desde = Number(el.dataset.desde ?? 0);
  [...texto(el.dataset.letras!)].forEach((letra, i) => {
    const s = document.createElement('span');
    s.style.setProperty('--i', String(desde + i));
    s.textContent = letra;
    el.appendChild(s);
  });
});
document.getElementById('portada')!.classList.add('lista');
iniciarCuenta();
