// PokéUsera · Edición Jarra: entry point (pokeusera.html). Canvas, texts, input, sound, flow.
// Test shortcuts: ?combate (random team, straight to battle), ?draft, ?auto (a machine plays your
// seat, fast), ?rapido (fast animations only: for testing online play by hand), ?semilla=N, ?pj=fran|pablo|chuchi|guille,
// ?escenario=brio|terraza|rural|juan (the bar of the battle; otherwise AJUSTES' ESCENARIO, which is at random by default),
// ?barra (with ?combate: «La barra» is played too, instead of the machine choosing the objects).
import raw from '../textos/pokeusera.md?raw';
import rawCombate from '../textos/pokeusera-combate.md?raw';
import { cargarTextos } from '../juego/textos';
import { ENTRENADORES, ESCENARIOS, type EntrenadorId, type EscenarioId } from './tipos';
import { iniciarApp } from './aplicacion';
import { entrada } from './entrada';
import { ejecutar } from './flujo';
import { Pantalla } from './pantalla';
import { aplicarAjustes } from './pantallas/ajustes';
import { precalentar } from './pantallas/precalentar';
import { cfg } from './pantallas/ui';

cargarTextos(raw, rawCombate);

const raiz = document.getElementById('pokeusera')!;
const pantalla = new Pantalla(raiz);
entrada.iniciar(pantalla);
aplicarAjustes();
// Installable app: service worker (production only), the install prompt and the «new version» notice.
iniciarApp();

// The first tap asks for fullscreen where the browser allows it.
entrada.primerToque = () => {
  try {
    void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => undefined);
  } catch {
    /* not allowed */
  }
};

const q = new URLSearchParams(location.search);
const pj = q.get('pj') as EntrenadorId | null;
const semilla = q.get('semilla');
const escenario = q.get('escenario') as EscenarioId | null;
cfg.rapido = q.has('auto') || q.has('rapido');

// The art of the next screens is baked in the background while the first one is on (see pantallas/precalentar.ts).
precalentar();

void ejecutar({
  combate: q.has('combate'),
  draft: q.has('draft'),
  auto: q.has('auto'),
  semilla: semilla !== null && semilla !== '' && Number.isFinite(Number(semilla)) ? Math.floor(Number(semilla)) : undefined,
  pj: pj && ENTRENADORES.includes(pj) ? pj : undefined,
  escenario: escenario && ESCENARIOS.includes(escenario) ? escenario : undefined,
  barra: q.has('barra'),
}).catch((e) => {
  console.error(e);
});
