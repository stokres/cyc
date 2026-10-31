// Cover page: the account badge and its panel (docs/POKEUSERA.md, «Cuentas»). The badge at the top shows the name of the account (or «¿Quién eres?»);
// touching it opens a panel: with an account, its code of 6 letters and the way to change the name; without one, «¿Quién eres?» (make one, or enter with a code).
// The first visit without an account opens the panel by itself, once: «Ahora no» keeps it shut on this device (the badge still asks, and opens it).
// Only src/cuenta/ is imported, no game (the cover stays DOM and CSS).
import './cuenta.css';
import { texto } from '../juego/textos';
import { CODIGO_LARGO, limpiarCodigo, limpiarNombre } from '../cuenta/reglas.mjs';
import { cambiarNombre, crearCuenta, cuentaLocal, recuperarCuenta, type Fallo, type Resultado } from '../cuenta/cuenta';
import { guardar, leer } from '../cuenta/base';

const CLAVE_AHORA_NO = 'cyc.cuenta.ahorano';
type Vista = 'quien' | 'codigo' | 'cuenta' | 'cambiar';

const chapa = document.getElementById('chapa') as HTMLButtonElement;
const chapaTexto = document.getElementById('chapa-texto')!;
const panel = document.getElementById('panel') as HTMLDialogElement;
const titulo = document.getElementById('panel-titulo')!;
const vistas = new Map<Vista, HTMLElement>();
panel.querySelectorAll<HTMLElement>('[data-vista]').forEach((s) => vistas.set(s.dataset.vista as Vista, s));

/** The badge says who the account is, or asks. */
function pintarChapa(): void {
  const c = cuentaLocal();
  chapa.classList.toggle('sin', !c);
  chapaTexto.textContent = c ? c.nombre : texto('cuenta.chapa.sin');
  chapa.setAttribute('aria-label', c ? texto('cuenta.chapa.aria', { nombre: c.nombre }) : texto('cuenta.chapa.aria.sin'));
}

/** The code in two groups of three, as it is easier to copy by eye. */
const codigoVisible = (c: string): string => `${c.slice(0, CODIGO_LARGO / 2)} ${c.slice(CODIGO_LARGO / 2)}`;

function mostrar(v: Vista, creada = false): void {
  const c = cuentaLocal();
  vistas.forEach((s, k) => (s.hidden = k !== v));
  titulo.textContent = texto(v === 'quien' ? 'cuenta.quien.titulo' : v === 'codigo' ? 'cuenta.codigo.titulo' : v === 'cambiar' ? 'cuenta.cambiar.titulo' : 'cuenta.mi.titulo', { nombre: c?.nombre ?? '' });
  panel.querySelectorAll<HTMLElement>('.aviso').forEach((a) => (a.hidden = true));
  if (v === 'cuenta' && c) {
    document.getElementById('cuenta-codigo-ver')!.textContent = codigoVisible(c.codigo);
    document.getElementById('cuenta-creada')!.hidden = !creada;
  }
  const campo = vistas.get(v)?.querySelector('input');
  if (campo) {
    if (v === 'cambiar') (campo as HTMLInputElement).value = c?.nombre ?? '';
    else (campo as HTMLInputElement).value = '';
    // On a phone the keyboard would cover the panel: the cursor goes to the field only with a mouse.
    if (matchMedia('(pointer: fine)').matches) campo.focus();
  }
}

function abrir(): void {
  mostrar(cuentaLocal() ? 'cuenta' : 'quien');
  if (!panel.open) panel.showModal();
  // showModal() puts the cursor in the first field, and on a phone the keyboard would cover the panel: there it goes to the title instead.
  if (!matchMedia('(pointer: fine)').matches) titulo.focus({ preventScroll: true });
}

function cerrar(): void {
  if (panel.open) panel.close();
}

function avisar(form: HTMLFormElement, clave: string | null): void {
  const a = form.querySelector<HTMLElement>('.aviso')!;
  a.hidden = clave === null;
  a.textContent = clave === null ? '' : texto(clave);
}

/** One form: validates what was typed (the same rules as the server), runs the action (`enviar`) and shows its failure, or goes on. */
function formulario(nombre: string, valida: (x: string) => string | null, enviar: (x: string) => Promise<Resultado>, alTerminar: () => void): void {
  const form = panel.querySelector<HTMLFormElement>(`[data-form="${nombre}"]`)!;
  const campo = form.querySelector('input')!;
  const boton = form.querySelector('button')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (boton.disabled) return;
    const valor = valida(campo.value);
    if (valor === null) return avisar(form, nombre === 'codigo' ? 'cuenta.error.codigo' : 'cuenta.error.nombre');
    avisar(form, null);
    const rotulo = boton.textContent;
    boton.disabled = true;
    boton.textContent = texto('cuenta.espera');
    const r = await enviar(valor);
    boton.disabled = false;
    boton.textContent = rotulo;
    if (r.ok) alTerminar();
    else avisar(form, `cuenta.error.${r.motivo satisfies Fallo}`);
  });
}

formulario('crear', (x) => limpiarNombre(x), crearCuenta, () => {
  pintarChapa();
  mostrar('cuenta', true);
});
formulario('codigo', (x) => limpiarCodigo(x), recuperarCuenta, () => {
  pintarChapa();
  mostrar('cuenta');
});
formulario('cambiar', (x) => limpiarNombre(x), cambiarNombre, () => {
  pintarChapa();
  mostrar('cuenta');
});

panel.querySelectorAll<HTMLElement>('[data-ir]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.ir as Vista)));
panel.querySelectorAll<HTMLElement>('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));
panel.querySelector('[data-ahora-no]')!.addEventListener('click', () => {
  guardar(CLAVE_AHORA_NO, '1');
  cerrar();
});
// A tap on the dark outside the sticker closes it.
panel.addEventListener('click', (e) => {
  if (e.target === panel) cerrar();
});
chapa.addEventListener('click', abrir);

/** Once the texts are loaded (main.ts): draws the badge and, on the first visit without an account, opens the panel by itself (once per device). */
export function iniciarCuenta(): void {
  pintarChapa();
  if (!cuentaLocal() && leer(CLAVE_AHORA_NO) === null) abrir();
}
