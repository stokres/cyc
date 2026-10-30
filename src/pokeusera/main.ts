// PokéUsera · Edición Jarra: entry point (pokeusera.html). Canvas, texts, input, sound, flow.
// Test shortcuts: ?combate (random team, straight to battle), ?draft, ?auto (a machine plays your
// seat, fast), ?rapido (fast animations only: for testing online play by hand), ?semilla=N, ?pj=fran|pablo|chuchi|guille|vinas|ari|fer,
// ?escenario=brio|terraza|rural|juan|feria (the bar of the battle; otherwise AJUSTES' ESCENARIO, which is at random by default),
// ?azar (no title or menu: a game in mode AL AZAR, where the game deals the teams and the object and you only choose who comes out first; with ?auto a machine plays your seat),
// ?barra (with ?combate: «La barra» is played too, instead of the machine choosing the objects),
// ?aventura (no title or menu: straight into AVENTURA, the one-player hunting mode; its saved adventure, or the trainer pick if there is none),
// ?aventura&demo (a test adventure in memory, never saved: the starter plus seven caught, bar 2 open; ?pj=... picks the trainer, Fran by default),
// ?aventura&demo=nueva[&pj=fran] (the beginning, never saved: the starter pick, or the trainer pick first when there is no ?pj).
// When AVENTURA is left the game goes on to the title, as always.
import raw from '../textos/pokeusera.md?raw';
import rawCombate from '../textos/pokeusera-combate.md?raw';
import { cargarTextos } from '../juego/textos';
import { ENTRENADORES, ESCENARIOS, type EntrenadorId, type EscenarioId } from './tipos';
import { iniciarApp } from './aplicacion';
import { entrada } from './entrada';
import { iniciarCuentas } from './cuentas/almacen';
import { iniciarEstadisticas } from './estadisticas/almacen';
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
// Accumulated statistics: sends the battle summaries that were waiting for the network.
iniciarEstadisticas();
// Accounts: copies the Aventura's progress to the profile when it changes.
iniciarCuentas();

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
  azar: q.has('azar'),
  aventura: q.has('aventura') ? { demo: q.has('demo') ? (q.get('demo') === 'nueva' ? 'nueva' : 'si') : undefined, pj: pj && ENTRENADORES.includes(pj) ? pj : undefined } : undefined,
}).catch((e) => {
  console.error(e);
});
