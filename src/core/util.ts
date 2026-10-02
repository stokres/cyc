export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** Deterministic PRNG (mulberry32) so baked art looks the same every time. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Damped spring for secondary motion (hair, beard, collars). */
export class Spring {
  v = 0;
  constructor(public x = 0, public k = 60, public d = 7) {}
  step(target: number, dt: number) {
    const a = (target - this.x) * this.k - this.v * this.d;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

export function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage: the game still works without saving */
  }
}
