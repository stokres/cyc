// Every word the game says lives in src/textos/*.md, so it can be rewritten
// without touching code. Format (see the head of src/textos/capitulo1.md):
//
//   ## clave                      a block of dialogue lines
//   FRAN: texto                   a line said by Fran
//   FRAN (contento): texto        ...with a mood
//   PABLO [20:12]: texto          a chat message with its time
//   > texto                       narrator
//   ---                           next variant (each use plays the next one)
//   clave = texto                 a single string (names, objectives, hints, menus)
//   {hora}                        placeholders filled in by the game

export type Quien = 'fran' | 'pablo' | 'chuchi' | 'guille' | 'aceituna' | null;

export interface Linea {
  quien: Quien;
  animo?: string;
  hora?: string;
  texto: string;
}

const QUIEN: Record<string, Quien> = { FRAN: 'fran', PABLO: 'pablo', CHUCHI: 'chuchi', GUILLE: 'guille', ACEITUNA: 'aceituna', NARRADOR: null };
const ANIMO: Record<string, string> = {
  normal: 'neutral',
  contento: 'happy',
  sorprendido: 'surprised',
  nervioso: 'surprised',
  triste: 'sad',
  enfadado: 'angry',
  chulo: 'smug',
};

const bloques = new Map<string, Linea[][]>();
const cadenas = new Map<string, string>();
const uso = new Map<string, number>();

function fallo(msg: string) {
  console.error(`[textos] ${msg}`);
}

/** Parse one or more text files. Later files override earlier keys. */
export function cargarTextos(...fuentes: string[]) {
  for (const raw of fuentes) {
    let actual: Linea[][] | null = null;
    let enComentario = false;
    raw.split(/\r?\n/).forEach((l, i) => {
      const linea = l.trim();
      if (enComentario) {
        if (linea.includes('-->')) enComentario = false;
        return;
      }
      if (linea.startsWith('<!--')) {
        if (!linea.includes('-->')) enComentario = true;
        return;
      }
      if (!linea || linea.startsWith('//') || /^#(?!#)/.test(linea)) return;
      const cab = linea.match(/^##\s+(\S+)/);
      if (cab) {
        actual = [[]];
        bloques.set(cab[1], actual);
        return;
      }
      const def = linea.match(/^([a-z][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
      if (def) {
        cadenas.set(def[1], def[2]);
        return;
      }
      if (!actual) return;
      const variantes: Linea[][] = actual;
      if (linea === '---') {
        variantes.push([]);
        return;
      }
      const ultima = variantes[variantes.length - 1];
      if (linea.startsWith('>')) {
        ultima.push({ quien: null, texto: linea.slice(1).trim() });
        return;
      }
      const m = linea.match(/^([A-ZÁÉÍÓÚÑ]+)\s*(?:\(([^)]+)\))?\s*(?:\[([^\]]+)\])?\s*:\s*(.+)$/);
      if (m && m[1] in QUIEN) {
        const animo = m[2] ? ANIMO[m[2].trim().toLowerCase()] : undefined;
        if (m[2] && !animo) fallo(`línea ${i + 1}: ánimo desconocido «${m[2]}» (usa: ${Object.keys(ANIMO).join(', ')})`);
        ultima.push({ quien: QUIEN[m[1]], animo, hora: m[3], texto: m[4] });
        return;
      }
      fallo(`línea ${i + 1} no se entiende: «${linea}»`);
    });
  }
}

const rellenar = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));

/** The next variant of a dialogue block. */
export function dialogo(clave: string, vars: Record<string, string | number> = {}): Linea[] {
  const b = bloques.get(clave);
  if (!b) {
    fallo(`falta el bloque «## ${clave}»`);
    return [{ quien: null, texto: `[${clave}]` }];
  }
  const n = uso.get(clave) ?? 0;
  uso.set(clave, n + 1);
  return b[n % b.length].map((l) => ({ ...l, texto: rellenar(l.texto, vars), hora: l.hora && rellenar(l.hora, vars) }));
}

export function hayDialogo(clave: string) {
  return bloques.has(clave);
}

/** A single string. */
export function texto(clave: string, vars: Record<string, string | number> = {}): string {
  const s = cadenas.get(clave);
  if (s === undefined) {
    fallo(`falta «${clave} = …»`);
    return `[${clave}]`;
  }
  return rellenar(s, vars);
}

export function hayTexto(clave: string) {
  return cadenas.has(clave);
}

/** Variant counters are part of the save, so repeated lines keep cycling after a reload. */
export function usos() {
  return Object.fromEntries(uso);
}

export function restaurarUsos(u: Record<string, number> = {}) {
  uso.clear();
  for (const [k, v] of Object.entries(u)) uso.set(k, v);
}
