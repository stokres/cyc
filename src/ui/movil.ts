// Fran's phone: the group chat, messages arriving one by one and his reply
// being typed and sent. Resolves when the player closes it.
import { h } from './hud';
import { REPARTO, retrato, type PjId } from '../juego/reparto';
import { texto, type Linea } from '../juego/textos';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function abrirMovil(parent: HTMLElement, mensajes: Linea[], respuesta: Linea[] = [], rapido = false): Promise<void> {
  const lista = h('div', { class: 'mensajes', role: 'log', 'aria-live': 'polite' });
  const campo = h('div', { class: 'campo' }, h('span', { class: 'escribe' }), h('span', { class: 'enviar' }, texto('movil.enviar')));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const telefono = h(
    'div',
    { class: 'telefono' },
    h('div', { class: 'cabecera' }, h('span', { class: 'avatar' }, 'J'), h('span', { class: 'grupo' }, h('b', {}, texto('movil.grupo')), h('small', {}, texto('movil.miembros'))), cerrar),
    lista,
    campo,
  );
  const capa = h('div', { class: 'cubierta movil' }, telefono);
  parent.append(capa);
  const t = rapido ? 0 : 1;
  const burbuja = (m: Linea, mio: boolean) => {
    const id = m.quien as PjId;
    const b = h('div', { class: `burbuja${mio ? ' mia' : ''}`, style: `--color:${REPARTO[id]?.color ?? '#ccc'}` });
    if (!mio) {
      const cara = h('span', { class: 'cara' });
      cara.innerHTML = retrato(id, { mood: REPARTO[id].arte.INFO.defaultMood });
      b.append(cara);
    }
    b.append(h('div', { class: 'globo' }, mio ? null : h('b', {}, REPARTO[id]?.nombre ?? ''), h('span', {}, m.texto), h('small', {}, m.hora ?? '')));
    lista.append(b);
    lista.scrollTop = lista.scrollHeight;
  };
  let saltar = false;
  telefono.addEventListener('click', () => (saltar = true));
  for (const m of mensajes) {
    burbuja(m, false);
    if (!saltar) await espera(650 * t);
  }
  // Fran types his answer.
  const escribe = campo.querySelector('.escribe') as HTMLElement;
  for (const r of respuesta) {
    for (let i = 1; i <= r.texto.length; i++) {
      escribe.textContent = r.texto.slice(0, i);
      if (!saltar) await espera(28 * t);
    }
    await espera(250 * t);
    escribe.textContent = '';
    burbuja(r, true);
  }
  campo.classList.add('listo');
  await new Promise<void>((resolve) => {
    const fin = (e: Event) => {
      e.stopPropagation();
      resolve();
    };
    cerrar.addEventListener('click', fin);
    capa.addEventListener('click', (e) => {
      if (e.target === capa) fin(e);
    });
    if (rapido) resolve();
  });
  capa.remove();
}
