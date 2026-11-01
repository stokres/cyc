// The band at the very top of the cover: when is the next Camiones y Caravanas (a live show, on a Thursday).
// The data (date, time, place, link) is in src/textos/proximo.md, made to be edited by hand; the phrases are in portada.md.
// No date, a badly written date or a date already gone: no band. The same day: «¡Hoy hay…!».
import { hayTexto, texto } from '../juego/textos';

const valor = (clave: string): string => (hayTexto(clave) ? texto(clave).trim() : '');

/** `AAAA-MM-DD` as a local date at noon, or null if it is not a real date. */
function leerFecha(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(a, mes - 1, d, 12);
  return f.getFullYear() === a && f.getMonth() === mes - 1 && f.getDate() === d ? f : null;
}

export function iniciarProximo() {
  const fecha = leerFecha(valor('fecha'));
  if (!fecha) return;
  const hoy = new Date();
  const dias = Math.round((Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000);
  if (dias < 0) return;

  const dia = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(fecha).replace(',', '');
  const partes = [dias === 0 ? texto('proximo.hoy') : texto('proximo.texto', { dia }), valor('hora'), valor('lugar')].filter(Boolean);

  const enlace = valor('enlace');
  const abre = /^https?:\/\//i.test(enlace);
  const banda = document.createElement(abre ? 'a' : 'p');
  banda.className = 'proximo';
  banda.textContent = partes.join(' · ');
  if (abre) {
    const a = banda as HTMLAnchorElement;
    a.href = enlace;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  document.getElementById('portada')!.prepend(banda);
}
