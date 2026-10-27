// Comprueba el mapa de «Una más»: la regla de las salidas (salir por la derecha = entrar por la izquierda de la siguiente, y al contrario; una abertura por lado;
// las segundas vías son puertas), que las puertas tengan vuelta y que se llegue siempre con suelo debajo. Falla (código 1) si algo no es coherente.
// Uso: node scripts/comprobar-salas.mjs
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'salas-'));
const fuera = join(dir, 'datos.mjs');
await build({ entryPoints: ['src/conceptos/datos.ts'], bundle: true, format: 'esm', outfile: fuera, logLevel: 'error' });
const { SALAS, erroresDeSalidas } = await import(pathToFileURL(fuera).href);
const errores = erroresDeSalidas();
for (const e of errores) console.error('MAL:', e);
console.log(`${Object.keys(SALAS).length} salas, ${errores.length} errores`);
process.exit(errores.length ? 1 : 0);
