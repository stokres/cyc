// Cuentas de usuario de toda la web: las reglas puras (sin DOM, sin Node) que comparten el servidor (scripts/cuentas.mjs) y el móvil, para que
// ambos validen igual el nombre y el código (docs/POKEUSERA.md, «Cuentas»). JavaScript con tipos en reglas.d.mts porque el servidor no compila TypeScript.

export const NOMBRE_MAX = 12;
/** Sin 0/O/1/I, que se confunden al copiar. */
export const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODIGO_LARGO = 6;

/** Lo que la letra de píxeles del juego sabe dibujar: letras (con tilde y ñ), números, espacio, punto, guion y apóstrofo. */
const NOMBRE_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .'-]+$/;

/** El nombre limpio (espacios sobrantes fuera) o null si no vale: 1 a 12 caracteres de los permitidos y alguna letra o número. */
export function limpiarNombre(x) {
  if (typeof x !== 'string') return null;
  const n = x.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!n || Array.from(n).length > NOMBRE_MAX || !NOMBRE_RE.test(n) || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/.test(n)) return null;
  return n;
}

/** La clave con que se compara la unicidad: sin mayúsculas, sin tildes (la ñ y la ü cuentan como n y u) y sin espacios sobrantes. */
export function claveNombre(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** El código de recuperación tal como lo teclea la gente («k7mz-4q» vale), o null si no tiene la forma. */
export function limpiarCodigo(x) {
  if (typeof x !== 'string') return null;
  const c = x.toUpperCase().replace(/[\s-]+/g, '');
  if (c.length !== CODIGO_LARGO) return null;
  for (const ch of c) if (!ALFABETO_CODIGO.includes(ch)) return null;
  return c;
}
