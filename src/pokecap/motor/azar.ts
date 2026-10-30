// Seeded RNG (mulberry32). The state lives in `estado.semilla`, so the whole battle is a pure
// function of (initial seed, choices). Never use Math.random in the engine.

/** Anything that carries a seed: an EstadoCombate, or a plain `{ semilla }`. */
export interface ConSemilla {
  semilla: number;
}

/** Next number in [0, 1); advances `estado.semilla`. */
export function azar(estado: ConSemilla): number {
  let a = (estado.semilla + 0x6d2b79f5) | 0;
  estado.semilla = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [0, n). */
export function entero(estado: ConSemilla, n: number): number {
  return Math.floor(azar(estado) * n);
}

/** One element of a non-empty list. */
export function elegir<T>(estado: ConSemilla, lista: readonly T[]): T {
  return lista[entero(estado, lista.length)];
}

/** True with probability `pct` percent. */
export function probar(estado: ConSemilla, pct: number): boolean {
  return azar(estado) * 100 < pct;
}

/** A standalone `() => number` generator from a seed (for bots, tests and the host's timeouts). */
export function crearRnd(semilla: number): () => number {
  const s: ConSemilla = { semilla: semilla | 0 };
  return () => azar(s);
}

/** `n` different elements of `lista` picked at random (a partial Fisher-Yates shuffle of a copy), with a standalone generator. */
export function sacarAlAzar<T>(lista: readonly T[], n: number, rnd: () => number): T[] {
  const copia = [...lista];
  const fuera: T[] = [];
  for (let i = 0; i < n && copia.length; i++) fuera.push(copia.splice(Math.floor(rnd() * copia.length), 1)[0]);
  return fuera;
}
