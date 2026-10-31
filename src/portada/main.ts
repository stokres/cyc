// Cover page (portada.html): the three games the domain announces. Plain DOM and CSS, no game code: it only loads its texts
// (src/textos/portada.md), so it opens at once on a mid-range phone. The links are clean routes (`/capitulo1`, `/pokeusera`, `/pang`),
// which only exist on the server of the game (scripts/servir-pokeusera.mjs): the page is not linked from GitHub Pages.
import './portada.css';
import raw from '../textos/portada.md?raw';
import { cargarTextos, texto } from '../juego/textos';

cargarTextos(raw);
document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
  el.textContent = texto(el.dataset.t!);
});
document.getElementById('portada')!.classList.add('lista');
