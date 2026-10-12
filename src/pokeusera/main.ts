// PokéUsera · Edición Jarra: entry point (pokeusera.html). Canvas, texts, input, sound, flow.
// Test shortcuts: ?combate (random team, straight to battle), ?draft, ?auto (a machine plays your
// seat, fast), ?semilla=N, ?pj=fran|pablo|chuchi|guille.
import raw from '../textos/pokeusera.md?raw';
import rawCombate from '../textos/pokeusera-combate.md?raw';
import { cargarTextos } from '../juego/textos';
import { ENTRENADORES, type EntrenadorId } from './tipos';
import { entrada } from './entrada';
import { ejecutar } from './flujo';
import { Pantalla } from './pantalla';
import { aplicarAjustes } from './pantallas/ajustes';
import { cfg } from './pantallas/ui';

cargarTextos(raw, rawCombate);

const raiz = document.getElementById('pokeusera')!;
const pantalla = new Pantalla(raiz);
entrada.iniciar(pantalla);
aplicarAjustes();

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
cfg.rapido = q.has('auto');

void ejecutar({
  combate: q.has('combate'),
  draft: q.has('draft'),
  auto: q.has('auto'),
  semilla: semilla !== null && semilla !== '' && Number.isFinite(Number(semilla)) ? Math.floor(Number(semilla)) : undefined,
  pj: pj && ENTRENADORES.includes(pj) ? pj : undefined,
}).catch((e) => {
  console.error(e);
});
