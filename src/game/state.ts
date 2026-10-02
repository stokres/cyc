// Saved game state. Small and serialisable so it survives reloads.
import { CrewId } from '../art/cast';
import { storageGet, storageSet } from '../core/util';

export type ItemId = 'movil' | 'monedas' | 'llaves' | 'rollo';

export interface SaveState {
  v: 1;
  active: CrewId;
  flags: Record<string, boolean | number>;
  inv: Record<CrewId, ItemId[]>;
  pos: Record<CrewId, [number, number]>;
  ronda: { fails: number; best: number };
}

const KEY = 'cyc.save.v1';

export function freshState(): SaveState {
  return {
    v: 1,
    active: 'fran',
    flags: {},
    inv: { fran: ['movil'], pablo: ['monedas'], chuchi: ['llaves'] },
    pos: { fran: [330, 880], pablo: [560, 905], chuchi: [800, 868] },
    ronda: { fails: 0, best: 0 },
  };
}

export function loadState(): SaveState | null {
  const raw = storageGet(KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as SaveState;
    return s.v === 1 ? s : null;
  } catch {
    return null;
  }
}

export function saveState(s: SaveState) {
  storageSet(KEY, JSON.stringify(s));
}

export function clearState() {
  storageSet(KEY, null);
}
