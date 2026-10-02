// Writes every scene layer as a standalone SVG in art/escenas/, so it can be opened
// and redrawn by hand. Sign lettering is drawn by the game with its own fonts.
// Usage: node tools/escenas/exportar.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import * as piso from '../../src/arte/escenas/piso.mjs';
import * as calle from '../../src/arte/escenas/calle.mjs';

mkdirSync('art/escenas', { recursive: true });
let n = 0;
for (const S of [piso.escena(), calle.escena()]) {
  for (const L of S.layers) {
    const parts = L.pieces ?? [{ x0: L.x0, x1: L.x1, y0: L.y0, y1: L.y1, body: L.body }];
    const x0 = Math.min(...parts.map((p) => p.x0));
    const x1 = Math.max(...parts.map((p) => p.x1));
    const y0 = Math.min(...parts.map((p) => p.y0));
    const y1 = Math.max(...parts.map((p) => p.y1));
    const body = parts.map((p) => p.body).join('') + (L.emissive ?? '');
    writeFileSync(`art/escenas/${S.id}-${L.id}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><title>${S.name} · capa ${L.id}</title>${body}</svg>\n`);
    n++;
  }
  for (const Lw of S.laterals ?? []) {
    const w = Lw.len * S.M;
    const h = Lw.h * S.M;
    writeFileSync(`art/escenas/${S.id}-${Lw.id}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-h} ${w} ${h}"><title>${S.name} · pared lateral ${Lw.id}</title>${Lw.body}${Lw.emissive ?? ''}</svg>\n`);
    n++;
  }
}
console.log(`art/escenas · ${n} capas`);
