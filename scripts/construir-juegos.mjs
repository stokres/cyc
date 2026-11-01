// Builds the games that live in juegos/ into dist/ (the second half of `npm run build`: it runs after cyc's own `vite build`, which empties dist/).
//   juegos/fly/    own package.json and lockfile (Vite 8, TypeScript 7, Three.js) → built with base /fly/ into dist/fly/
//   juegos/trazo/  Voy colgao (it was Trazo): a single index.html with no build step → copied to dist/trazo/ (served at /voycolgao and /trazo)
// Fly's dependencies are installed with `npm ci` only when they are missing or its lockfile is newer than what is installed, so a rebuild with Fly already
// installed only pays for Fly's own typecheck and vite build. Railway runs just `npm ci` at the root and `npm run build`: this script does the rest.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const FLY = join(RAIZ, 'juegos', 'fly');
const TRAZO = join(RAIZ, 'juegos', 'trazo');
const DIST = join(RAIZ, 'dist');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function ejecutar(args, opciones = {}) {
  const r = spawnSync(NPM, args, { cwd: RAIZ, stdio: 'inherit', shell: process.platform === 'win32', ...opciones });
  if (r.status !== 0) {
    console.error(`construir-juegos: falló «npm ${args.join(' ')}»`);
    process.exit(r.status ?? 1);
  }
}

/** True if Fly's node_modules is missing or older than its package-lock.json. */
function flyNecesitaInstalar() {
  const instalado = join(FLY, 'node_modules', '.package-lock.json');
  if (!existsSync(instalado) || !existsSync(join(FLY, 'node_modules', '.bin', 'vite'))) return true;
  return statSync(join(FLY, 'package-lock.json')).mtimeMs > statSync(instalado).mtimeMs;
}

if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

// Fly: base /fly/ (absolute) so the .glb, .json and workers load from /fly/... whatever the page's URL. Fly's own `build` script runs its typecheck and then vite build.
if (flyNecesitaInstalar()) {
  console.log('construir-juegos: instalando las dependencias de Fly (npm ci)');
  ejecutar(['--prefix', FLY, 'ci', '--no-audit', '--no-fund']);
}
ejecutar(['--prefix', FLY, 'run', 'build', '--', '--base', '/fly/', '--outDir', join(DIST, 'fly'), '--emptyOutDir']);

// Voy colgao (folder trazo): a single page; only what the page loads (the README and the rest stay out of dist/).
mkdirSync(join(DIST, 'trazo'), { recursive: true });
for (const f of ['index.html', 'og.jpg']) cpSync(join(TRAZO, f), join(DIST, 'trazo', f));
console.log('construir-juegos: dist/fly y dist/trazo listos');
