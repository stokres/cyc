// Entry page (entrar.html): what the server (scripts/servir-pokeusera.mjs) answers, with a 401, to any page when the browser has no cookie of the group's key
// (scripts/pase.mjs). Plain DOM and CSS like the cover, no game code. The URL is the one that was asked: after the key the page reloads and that one opens.
import '../portada/portada.css';
import './entrar.css';
import raw from '../textos/entrar.md?raw';
import { cargarTextos, texto } from '../juego/textos';

cargarTextos(raw);
document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
  el.textContent = texto(el.dataset.t!);
});
document.querySelectorAll<HTMLElement>('[data-alt]').forEach((el) => {
  el.setAttribute('alt', texto(el.dataset.alt!));
});

const formulario = document.getElementById('formulario') as HTMLFormElement;
const campo = document.getElementById('clave') as HTMLInputElement;
const boton = document.getElementById('boton') as HTMLButtonElement;
const fallo = document.getElementById('fallo')!;

function avisar(clave: string | null): void {
  fallo.hidden = clave === null;
  fallo.textContent = clave === null ? '' : texto(clave);
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  const clave = campo.value.trim();
  if (!clave || boton.disabled) return;
  avisar(null);
  boton.disabled = true;
  boton.textContent = texto('entrando');
  let error: string | null = 'error.servidor';
  try {
    const res = await fetch('/api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }), cache: 'no-store' });
    if (res.ok) error = null;
    else if (res.status === 403) error = 'error.clave';
    else if (res.status === 429) error = 'error.limite';
  } catch {
    error = 'error.red';
  }
  if (error === null) {
    // The page of the entry itself (entrar.html asked by hand) has nowhere to go back to: the cover.
    if (location.pathname.endsWith('/entrar.html')) location.replace('/');
    else location.reload();
    return;
  }
  boton.disabled = false;
  boton.textContent = texto('boton');
  avisar(error);
  campo.select();
});

document.getElementById('portada')!.classList.add('lista');
// With a mouse the cursor goes straight to the field; on a phone the keyboard would cover the sticker.
if (matchMedia('(pointer: fine)').matches) campo.focus();
